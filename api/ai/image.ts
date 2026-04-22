/**
 * Vercel Serverless Function — OpenAI gpt-image-2 image generation.
 *
 * Primary image generator. Keeps the OpenAI key server-side (never exposed
 * to the browser). Frontend cascades to Gemini if this endpoint fails.
 *
 * Endpoints used:
 *   - POST https://api.openai.com/v1/images/generations  (text-only prompt)
 *   - POST https://api.openai.com/v1/images/edits        (prompt + reference images)
 *
 * Request body:
 *   {
 *     prompt: string,                         // required
 *     size?: '1024x1024' | '1024x1536' | '1536x1024' | 'auto',
 *     quality?: 'low' | 'medium' | 'high' | 'auto',
 *     referenceImages?: { base64: string; mimeType: string }[],  // optional, triggers /edits
 *   }
 *
 * Response body:
 *   { imageBase64: string, mimeType: 'image/png', modelUsed: 'gpt-image-2' }
 *   or { error: string } on failure.
 */

interface ReferenceImage {
  base64: string;
  mimeType: string;
}

interface ImageRequestBody {
  prompt?: unknown;
  size?: unknown;
  quality?: unknown;
  referenceImages?: unknown;
}

const MODEL = 'gpt-image-2';
const DEFAULT_SIZE = '1024x1024';
const DEFAULT_QUALITY = 'medium';
const ALLOWED_SIZES = new Set(['1024x1024', '1024x1536', '1536x1024', 'auto']);
const ALLOWED_QUALITIES = new Set(['low', 'medium', 'high', 'auto']);
const MAX_REF_IMAGES = 10;
const MAX_PROMPT_CHARS = 32000;

function base64ToBuffer(base64: string): Buffer {
  return Buffer.from(base64, 'base64');
}

function mimeToExt(mime: string): string {
  if (mime === 'image/jpeg' || mime === 'image/jpg') return 'jpg';
  if (mime === 'image/webp') return 'webp';
  return 'png';
}

function isReferenceImage(v: unknown): v is ReferenceImage {
  return (
    typeof v === 'object' &&
    v !== null &&
    typeof (v as Record<string, unknown>).base64 === 'string' &&
    typeof (v as Record<string, unknown>).mimeType === 'string'
  );
}

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'OPENAI_API_KEY not configured' });
  }

  const body = (req.body ?? {}) as ImageRequestBody;

  const prompt = typeof body.prompt === 'string' ? body.prompt.trim() : '';
  if (!prompt) {
    return res.status(400).json({ error: 'prompt is required' });
  }
  if (prompt.length > MAX_PROMPT_CHARS) {
    return res.status(400).json({ error: `prompt exceeds ${MAX_PROMPT_CHARS} chars` });
  }

  const size = typeof body.size === 'string' && ALLOWED_SIZES.has(body.size)
    ? body.size
    : DEFAULT_SIZE;
  const quality = typeof body.quality === 'string' && ALLOWED_QUALITIES.has(body.quality)
    ? body.quality
    : DEFAULT_QUALITY;

  const rawRefs = Array.isArray(body.referenceImages) ? body.referenceImages : [];
  const refs = rawRefs.filter(isReferenceImage).slice(0, MAX_REF_IMAGES);
  const hasRefs = refs.length > 0;

  try {
    let openaiRes: Response;

    if (hasRefs) {
      // /v1/images/edits — multipart/form-data with image[] fields.
      const form = new FormData();
      form.append('model', MODEL);
      form.append('prompt', prompt);
      form.append('size', size);
      form.append('quality', quality);
      form.append('n', '1');

      refs.forEach((ref, idx) => {
        const buffer = base64ToBuffer(ref.base64);
        const ext = mimeToExt(ref.mimeType);
        const blob = new Blob([buffer], { type: ref.mimeType || 'image/png' });
        form.append('image[]', blob, `ref-${idx}.${ext}`);
      });

      openaiRes = await fetch('https://api.openai.com/v1/images/edits', {
        method: 'POST',
        headers: { Authorization: `Bearer ${apiKey}` },
        body: form,
      });
    } else {
      // /v1/images/generations — JSON body.
      openaiRes = await fetch('https://api.openai.com/v1/images/generations', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: MODEL,
          prompt,
          size,
          quality,
          n: 1,
        }),
      });
    }

    if (!openaiRes.ok) {
      const text = await openaiRes.text();
      return res
        .status(openaiRes.status)
        .json({ error: `OpenAI error (${openaiRes.status}): ${text.slice(0, 500)}` });
    }

    const data = await openaiRes.json() as {
      data?: { b64_json?: string }[];
    };
    const b64 = data?.data?.[0]?.b64_json;
    if (!b64) {
      return res.status(502).json({ error: 'OpenAI response missing b64_json' });
    }

    return res.status(200).json({
      imageBase64: b64,
      mimeType: 'image/png',
      modelUsed: MODEL,
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Image generation failed: ${msg}` });
  }
}
