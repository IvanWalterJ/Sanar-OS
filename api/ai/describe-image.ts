/**
 * Vercel Serverless Function — Claude vision para describir imagenes.
 *
 * Caso de uso primario: en la edicion de creativos, cuando el usuario sube una
 * imagen de personaje de referencia, pedimos a Claude que la describa en texto
 * detallado para luego inyectarlo en el prompt de gpt-image-2. Asi evitamos
 * mandar 2 imagenes al endpoint /edits (que las combina en vez de tratar una
 * como base y otra como ref auxiliar).
 *
 * Request body:
 *   {
 *     imageBase64: string,        // required
 *     mimeType: string,           // image/png|jpeg|webp|gif
 *     instruction?: string,       // override del prompt default
 *   }
 *
 * Response body:
 *   { description: string } o { error: string }
 */
import Anthropic from '@anthropic-ai/sdk';

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 1500;
const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/gif']);

const DEFAULT_INSTRUCTION = `Describi en detalle al personaje principal de esta imagen para que un modelo de imagen generativa pueda recrearlo: genero, edad aproximada, rasgos faciales (forma de cara, ojos, nariz, boca, menton), color y estilo de pelo, color de ojos, vello facial (barba, bigote) si tiene, tono de piel, vestuario completo (parte de arriba, parte de abajo, accesorios visibles), postura general y expresion. Devolve UN solo parrafo en espanol, maximo 200 palabras, sin saltos de linea ni listas. No describas el fondo ni la composicion — solo al personaje.`;

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  const body = (req.body ?? {}) as {
    imageBase64?: unknown;
    mimeType?: unknown;
    instruction?: unknown;
  };

  const imageBase64 = typeof body.imageBase64 === 'string' ? body.imageBase64 : '';
  if (!imageBase64) {
    return res.status(400).json({ error: 'imageBase64 is required' });
  }

  const rawMime = typeof body.mimeType === 'string' ? body.mimeType : 'image/png';
  const mediaType = (ALLOWED_MIME.has(rawMime) ? rawMime : 'image/png') as
    | 'image/png' | 'image/jpeg' | 'image/webp' | 'image/gif';

  const instruction = typeof body.instruction === 'string' && body.instruction.trim()
    ? body.instruction.trim()
    : DEFAULT_INSTRUCTION;

  try {
    const client = new Anthropic({ apiKey });

    const response = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      messages: [{
        role: 'user',
        content: [
          {
            type: 'image',
            source: { type: 'base64', media_type: mediaType, data: imageBase64 },
          },
          { type: 'text', text: instruction },
        ],
      }],
    });

    const description = response.content[0].type === 'text' ? response.content[0].text : '';
    if (!description.trim()) {
      return res.status(502).json({ error: 'Empty description from Claude' });
    }

    return res.status(200).json({ description: description.trim() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return res.status(500).json({ error: `Describe failed: ${msg}` });
  }
}
