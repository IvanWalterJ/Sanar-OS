/**
 * aiProvider.ts — Centralized AI text generation
 *
 * Cadena de fallback (texto):
 *   1) Claude API via Vercel serverless function (`/api/ai/generate`).
 *      Reintenta en el cliente errores transientes (502/503/504/timeouts).
 *   2) Gemini via SDK cliente (VITE_GEMINI_API_KEY).
 *      Reintenta cuando Gemini devuelve UNAVAILABLE/503 ("alta demanda").
 *
 * Si ambos proveedores fallan, se lanza un Error con mensaje legible para el
 * usuario que indica que ambos servicios de IA están saturados y los detalles
 * de cada uno quedan disponibles vía `cause` para debugging.
 *
 * Image generation stays on Gemini (see campanasImageGen.ts).
 */

const API_BASE = '/api/ai';

const CLAUDE_RETRIES = 2;
const GEMINI_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1500;

export interface AIGenerateOptions {
  /** Single prompt (used when messages is not provided) */
  prompt?: string;
  /** System instruction / persona */
  systemInstruction?: string;
  /** Multi-turn conversation messages */
  messages?: Array<{ role: string; content: string }>;
}

// ─── Helpers ────────────────────────────────────────────────────────────────

function getGeminiKey(): string {
  return import.meta.env.VITE_GEMINI_API_KEY || '';
}

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function isOverloadError(err: unknown): boolean {
  if (!err) return false;
  const e = err as { status?: number; code?: number; message?: string };
  if (e.status === 429 || e.status === 502 || e.status === 503 || e.status === 504 || e.status === 529) {
    return true;
  }
  const msg = (e.message ?? '').toLowerCase();
  return (
    msg.includes('unavailable') ||
    msg.includes('overload') ||
    msg.includes('alta demanda') ||
    msg.includes('rate limit') ||
    msg.includes('timeout') ||
    msg.includes('etimedout') ||
    msg.includes('econnreset')
  );
}

function buildContents(options: AIGenerateOptions) {
  return options.messages
    ? options.messages.map((m) => ({
        role: m.role === 'assistant' ? 'model' : m.role,
        parts: [{ text: m.content }],
      }))
    : options.prompt;
}

// ─── Non-streaming text generation ──────────────────────────────────────────

export async function generateText(options: AIGenerateOptions): Promise<string> {
  let claudeError: unknown;
  try {
    return await generateWithClaude(options);
  } catch (e) {
    claudeError = e;
  }

  try {
    return await generateWithGemini(options);
  } catch (geminiError) {
    throw buildBothFailedError(claudeError, geminiError);
  }
}

// ─── Streaming text generation ──────────────────────────────────────────────

export async function* streamText(
  options: AIGenerateOptions,
): AsyncGenerator<string> {
  let claudeError: unknown;
  try {
    yield* streamWithClaude(options);
    return;
  } catch (e) {
    claudeError = e;
  }

  try {
    yield* streamWithGemini(options);
  } catch (geminiError) {
    throw buildBothFailedError(claudeError, geminiError);
  }
}

// ─── Claude (primary) ───────────────────────────────────────────────────────

async function generateWithClaude(options: AIGenerateOptions): Promise<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= CLAUDE_RETRIES; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('application/json')) {
        const detail = await safeReadError(res);
        const err = new Error(
          `Claude API error: ${res.status}${detail ? ` — ${detail}` : ''}`,
        ) as Error & { status?: number };
        err.status = res.status;
        throw err;
      }

      const data = await res.json();
      if (typeof data?.text !== 'string') {
        throw new Error('Claude API devolvió respuesta vacía');
      }
      return data.text;
    } catch (err) {
      lastError = err;
      if (!isOverloadError(err) || attempt === CLAUDE_RETRIES) break;
      await delay(RETRY_BASE_DELAY_MS * (attempt + 1));
    }
  }
  throw lastError;
}

async function* streamWithClaude(
  options: AIGenerateOptions,
): AsyncGenerator<string> {
  let lastError: unknown;
  for (let attempt = 0; attempt <= CLAUDE_RETRIES; attempt++) {
    try {
      const res = await fetch(`${API_BASE}/stream`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(options),
      });

      const contentType = res.headers.get('content-type') || '';
      if (!res.ok || !contentType.includes('text/event-stream')) {
        const detail = await safeReadError(res);
        const err = new Error(
          `Claude API error: ${res.status}${detail ? ` — ${detail}` : ''}`,
        ) as Error & { status?: number };
        err.status = res.status;
        throw err;
      }

      const reader = res.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) return;

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
    } catch (err) {
      lastError = err;
      if (!isOverloadError(err) || attempt === CLAUDE_RETRIES) break;
      await delay(RETRY_BASE_DELAY_MS * (attempt + 1));
    }
  }
  throw lastError;
}

async function safeReadError(res: Response): Promise<string> {
  try {
    const text = await res.text();
    if (!text) return '';
    try {
      const parsed = JSON.parse(text);
      return parsed?.details || parsed?.error || text.slice(0, 200);
    } catch {
      return text.slice(0, 200);
    }
  } catch {
    return '';
  }
}

// ─── Gemini (fallback) ──────────────────────────────────────────────────────

async function generateWithGemini(
  options: AIGenerateOptions,
): Promise<string> {
  const key = getGeminiKey();
  if (!key) throw new Error('No hay API key de Gemini configurada como fallback');

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: key });
  const contents = buildContents(options);

  let lastError: unknown;
  for (let attempt = 0; attempt <= GEMINI_RETRIES; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        ...(options.systemInstruction
          ? { config: { systemInstruction: options.systemInstruction } }
          : {}),
      });
      return response.text ?? '';
    } catch (err) {
      lastError = err;
      if (!isOverloadError(err) || attempt === GEMINI_RETRIES) break;
      await delay(RETRY_BASE_DELAY_MS * (attempt + 1));
    }
  }
  throw lastError;
}

async function* streamWithGemini(
  options: AIGenerateOptions,
): AsyncGenerator<string> {
  const key = getGeminiKey();
  if (!key) throw new Error('No hay API key de Gemini configurada como fallback');

  const { GoogleGenAI } = await import('@google/genai');
  const ai = new GoogleGenAI({ apiKey: key });
  const contents = buildContents(options);

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

// ─── Error formatting ───────────────────────────────────────────────────────

function describe(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === 'string') return err;
  return 'error desconocido';
}

function buildBothFailedError(
  claudeError: unknown,
  geminiError: unknown,
): Error {
  const msg =
    'Ambos proveedores de IA están saturados. Probá de nuevo en unos minutos.\n' +
    `· Claude: ${describe(claudeError)}\n` +
    `· Gemini: ${describe(geminiError)}`;
  const err = new Error(msg) as Error & { cause?: unknown };
  err.cause = { claude: claudeError, gemini: geminiError };
  return err;
}
