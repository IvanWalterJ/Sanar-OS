/**
 * aiProvider.ts — Centralized AI text generation
 *
 * Primary:  Claude API via Vercel serverless functions (server-side, key secure)
 * Fallback: Gemini via client-side SDK (uses VITE_GEMINI_API_KEY)
 *
 * Image generation stays on Gemini (see campanasImageGen.ts).
 */

const API_BASE = '/api/ai';

export interface AIGenerateOptions {
  /** Single prompt (used when messages is not provided) */
  prompt?: string;
  /** System instruction / persona */
  systemInstruction?: string;
  /** Multi-turn conversation messages */
  messages?: Array<{ role: string; content: string }>;
}

// ─── Gemini fallback key ────────────────────────────────────────────────────

function getGeminiKey(): string {
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

// ─── Non-streaming text generation ──────────────────────────────────────────

export async function generateText(options: AIGenerateOptions): Promise<string> {
  try {
    const res = await fetch(`${API_BASE}/generate`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('application/json')) {
      throw new Error(`API error: ${res.status}`);
    }

    const data = await res.json();
    return data.text;
  } catch {
    return generateWithGemini(options);
  }
}

// ─── Streaming text generation ──────────────────────────────────────────────

export async function* streamText(
  options: AIGenerateOptions,
): AsyncGenerator<string> {
  try {
    const res = await fetch(`${API_BASE}/stream`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(options),
    });

    const contentType = res.headers.get('content-type') || '';
    if (!res.ok || !contentType.includes('text/event-stream')) {
      throw new Error(`API error: ${res.status}`);
    }

    const reader = res.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const raw = line.slice(6).trim();
          if (raw === '[DONE]') return;
          try {
            const parsed = JSON.parse(raw);
            if (parsed.text) yield parsed.text;
            if (parsed.error) throw new Error(parsed.error);
          } catch (e) {
            if (e instanceof SyntaxError) continue;
            throw e;
          }
        }
      }
    }
  } catch {
    yield* streamWithGemini(options);
  }
}

// ─── Gemini fallback helpers ────────────────────────────────────────────────

async function generateWithGemini(
  options: AIGenerateOptions,
): Promise<string> {
  const key = getGeminiKey();
  if (!key) throw new Error('No hay API key de IA disponible');

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: key });

  const contents = options.messages
    ? options.messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : m.role,
        parts: [{ text: m.content }],
      }))
    : options.prompt;

  const response = await ai.models.generateContent({
    model: 'gemini-2.5-flash',
    contents,
    ...(options.systemInstruction
      ? { config: { systemInstruction: options.systemInstruction } }
      : {}),
  });

  return response.text ?? '';
}

async function* streamWithGemini(
  options: AIGenerateOptions,
): AsyncGenerator<string> {
  const key = getGeminiKey();
  if (!key) throw new Error('No hay API key de IA disponible');

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: key });

  const contents = options.messages
    ? options.messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : m.role,
        parts: [{ text: m.content }],
      }))
    : options.prompt;

  const stream = await ai.models.generateContentStream({
    model: 'gemini-2.5-flash',
    contents,
    ...(options.systemInstruction
      ? { config: { systemInstruction: options.systemInstruction } }
      : {}),
  });

  for await (const chunk of stream) {
    if (chunk.text) yield chunk.text;
  }
}
