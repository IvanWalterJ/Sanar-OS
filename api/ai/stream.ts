/**
 * Vercel Serverless Function — Streaming Claude text generation via SSE
 * Claude is the primary AI provider; frontend falls back to Gemini if this fails.
 */
import Anthropic from '@anthropic-ai/sdk';

interface AIMessage {
  role: string;
  content: string;
}

const MODEL = 'claude-sonnet-4-5-20250514';
const MAX_TOKENS = 16384;

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

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    const stream = await client.messages.create({
      model: MODEL,
      max_tokens: MAX_TOKENS,
      ...(systemInstruction ? { system: systemInstruction } : {}),
      messages: claudeMessages,
      stream: true,
    });

    for await (const event of stream) {
      if (
        event.type === 'content_block_delta' &&
        event.delta.type === 'text_delta'
      ) {
        res.write(`data: ${JSON.stringify({ text: event.delta.text })}\n\n`);
      }
    }

    res.write('data: [DONE]\n\n');
    res.end();
  } catch (err) {
    if (!res.headersSent) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      return res.status(500).json({ error: 'Stream error', details: errorMsg });
    }
    res.end();
  }
}
