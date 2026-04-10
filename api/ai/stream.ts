/**
 * Vercel Serverless Function — Claude text generation returned as SSE
 * Uses non-streaming Claude internally (avoids Node.js streaming compatibility issues).
 * Returns the full response as a single SSE event so the client handles it uniformly.
 */
import Anthropic from '@anthropic-ai/sdk';

interface AIMessage {
  role: string;
  content: string;
}

const MODEL = 'claude-sonnet-4-6';
const MAX_TOKENS = 16384;
const MAX_RETRIES = 2;

export const config = { maxDuration: 120 };

export default async function handler(req: any, res: any) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    const { prompt, systemInstruction, messages } = req.body;

    const client = new Anthropic({ apiKey });

    const claudeMessages: Anthropic.MessageParam[] = messages
      ? messages.map((m: AIMessage) => ({
          role: (m.role === 'model' ? 'assistant' : m.role) as 'user' | 'assistant',
          content: m.content,
        }))
      : [{ role: 'user' as const, content: prompt }];

    let lastError: unknown;
    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const response = await client.messages.create({
          model: MODEL,
          max_tokens: MAX_TOKENS,
          ...(systemInstruction ? { system: systemInstruction } : {}),
          messages: claudeMessages,
        });

        const text =
          response.content[0].type === 'text' ? response.content[0].text : '';

        res.setHeader('Content-Type', 'text/event-stream');
        res.setHeader('Cache-Control', 'no-cache');
        res.setHeader('Connection', 'keep-alive');
        res.write(`data: ${JSON.stringify({ text })}\n\n`);
        res.write('data: [DONE]\n\n');
        return res.end();
      } catch (err: any) {
        lastError = err;
        const isRetryable =
          err?.status === 429 ||
          err?.status === 500 ||
          err?.status === 503 ||
          err?.status === 529;
        if (!isRetryable || attempt === MAX_RETRIES) break;
        await new Promise((r) => setTimeout(r, (attempt + 1) * 2000));
      }
    }

    const errorMsg =
      lastError instanceof Error ? lastError.message : String(lastError);
    console.error('[api/ai/stream] Claude error:', errorMsg);
    return res.status(502).json({ error: 'Claude API error', details: errorMsg });
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : String(err);
    console.error('[api/ai/stream] Server error:', errorMsg);
    return res.status(500).json({ error: 'Server error', details: errorMsg });
  }
}
