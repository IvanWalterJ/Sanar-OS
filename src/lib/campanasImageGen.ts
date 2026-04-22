/**
 * campanasImageGen.ts — Orquestador de generacion de imagenes con cascada.
 *
 * Prioridad:
 *   1. OpenAI gpt-image-2 (server-side via /api/ai/image) — PRIMARIO
 *   2. Gemini Nano Banana 2  (gemini-3.1-flash-image-preview)
 *   3. Gemini Nano Banana Pro (gemini-3-pro-image-preview)
 *   4. Gemini Nano Banana     (gemini-2.5-flash-image)
 *
 * Si OpenAI falla, degradamos a la cascada Gemini existente. El consumidor
 * no se entera de que cambio el proveedor — solo ve modelName en progress.
 */
import { GoogleGenAI } from '@google/genai';
import type { ImageFormat, ImageQuality } from './campanasTypes';
import { OPENAI_IMAGE_SIZE, IMAGE_QUALITY_DEFAULT } from './campanasTypes';

// ─── Modelos Gemini (cascada de fallback) ────────────────────────────────────

const GEMINI_MODELS = [
  { id: 'gemini-3.1-flash-image-preview', name: 'Nano Banana 2' },
  { id: 'gemini-3-pro-image-preview', name: 'Nano Banana Pro' },
  { id: 'gemini-2.5-flash-image', name: 'Nano Banana' },
] as const;

// Timeout por intento. Si cuelga, avanzamos al siguiente en vez de esperar.
const MODEL_TIMEOUT_MS = 90_000;
const OPENAI_TIMEOUT_MS = 120_000; // gpt-image-2 en high puede ser lento

function withTimeout<T>(promise: Promise<T>, ms: number, label: string): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error(`Timeout: ${label} no respondio en ${Math.round(ms / 1000)}s`)),
      ms,
    );
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (err) => { clearTimeout(timer); reject(err); },
    );
  });
}

// ─── Tipos publicos ──────────────────────────────────────────────────────────

export type ImageModelName =
  | 'OpenAI gpt-image-2'
  | 'Nano Banana 2'
  | 'Nano Banana Pro'
  | 'Nano Banana';

export interface ImageGenResult {
  imageBase64: string;
  mimeType: string;
  modelUsed: string;
  modelName: ImageModelName;
}

export interface ImageGenProgress {
  modelName: string;
  attempt: number;
  total: number;
  status: 'trying' | 'failed' | 'success';
  error?: string;
}

export interface ReferenceImages {
  characterRefs?: { base64: string; mimeType: string }[];
  styleRefs?: { base64: string; mimeType: string }[];
}

export interface ImageGenOptions {
  geminiKey?: string;
  format?: ImageFormat;
  quality?: ImageQuality;
}

// Total de modelos que puede intentar la cascada (1 OpenAI + 3 Gemini).
const TOTAL_MODELS = 1 + GEMINI_MODELS.length;

// ─── OpenAI (primario) ───────────────────────────────────────────────────────

interface OpenAIImageResponse {
  imageBase64?: string;
  mimeType?: string;
  modelUsed?: string;
  error?: string;
}

async function tryOpenAI(
  prompt: string,
  referenceImages: ReferenceImages | undefined,
  format: ImageFormat,
  quality: ImageQuality,
): Promise<ImageGenResult> {
  const size = OPENAI_IMAGE_SIZE[format] ?? '1024x1024';

  // Aplanamos character + style refs en una sola lista para la API /edits.
  const refs = [
    ...(referenceImages?.characterRefs ?? []),
    ...(referenceImages?.styleRefs ?? []),
  ];

  const payload = {
    prompt,
    size,
    quality,
    referenceImages: refs.length > 0 ? refs : undefined,
  };

  const resp = await withTimeout(
    fetch('/api/ai/image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    }),
    OPENAI_TIMEOUT_MS,
    'OpenAI gpt-image-2',
  );

  if (!resp.ok) {
    const text = await resp.text().catch(() => '');
    let parsed: OpenAIImageResponse | null = null;
    try { parsed = JSON.parse(text) as OpenAIImageResponse; } catch { /* noop */ }
    throw new Error(parsed?.error || `HTTP ${resp.status}: ${text.slice(0, 200)}`);
  }

  const data = await resp.json() as OpenAIImageResponse;
  if (!data.imageBase64) {
    throw new Error(data.error || 'OpenAI response missing imageBase64');
  }

  return {
    imageBase64: data.imageBase64,
    mimeType: data.mimeType || 'image/png',
    modelUsed: data.modelUsed || 'gpt-image-2',
    modelName: 'OpenAI gpt-image-2',
  };
}

// ─── Gemini (fallback cascada) ───────────────────────────────────────────────

async function tryGemini(
  apiKey: string,
  prompt: string,
  referenceImages: ReferenceImages | undefined,
  onProgress: ((progress: ImageGenProgress) => void) | undefined,
  modelAttemptOffset: number, // para numerar attempts correctamente (2, 3, 4)
): Promise<ImageGenResult> {
  const ai = new GoogleGenAI({ apiKey });

  const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [
    { text: prompt },
  ];
  for (const ref of referenceImages?.characterRefs ?? []) {
    parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.base64 } });
  }
  for (const ref of referenceImages?.styleRefs ?? []) {
    parts.push({ inlineData: { mimeType: ref.mimeType, data: ref.base64 } });
  }

  let lastError: Error | null = null;

  for (let i = 0; i < GEMINI_MODELS.length; i++) {
    const model = GEMINI_MODELS[i];
    const attempt = modelAttemptOffset + i;

    onProgress?.({
      modelName: model.name,
      attempt,
      total: TOTAL_MODELS,
      status: 'trying',
    });

    try {
      const response = await withTimeout(
        ai.models.generateContent({
          model: model.id,
          contents: [{ role: 'user', parts: parts as never[] }],
          config: { responseModalities: ['TEXT', 'IMAGE'] },
        }),
        MODEL_TIMEOUT_MS,
        model.name,
      );

      const responseParts = response.candidates?.[0]?.content?.parts;
      if (!responseParts) throw new Error('No response parts');

      const imagePart = responseParts.find(
        (p: Record<string, unknown>) => p.inlineData && typeof p.inlineData === 'object',
      );

      if (!imagePart || !imagePart.inlineData) {
        throw new Error('No image in response');
      }

      const { data, mimeType } = imagePart.inlineData as { data: string; mimeType: string };

      onProgress?.({
        modelName: model.name,
        attempt,
        total: TOTAL_MODELS,
        status: 'success',
      });

      return {
        imageBase64: data,
        mimeType: mimeType || 'image/png',
        modelUsed: model.id,
        modelName: model.name as ImageModelName,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));
      onProgress?.({
        modelName: model.name,
        attempt,
        total: TOTAL_MODELS,
        status: 'failed',
        error: lastError.message,
      });
    }
  }

  throw lastError ?? new Error('Todos los modelos Gemini fallaron');
}

// ─── Generador principal con cascada ─────────────────────────────────────────

/**
 * Intenta OpenAI gpt-image-2 primero; si falla, cae a la cascada Gemini.
 *
 * @param options - format (para mapear size de OpenAI), quality (low/med/high/auto),
 *                  geminiKey (fallback). Si ambos proveedores fallan, tira error.
 */
export async function generateImageWithFallback(
  prompt: string,
  onProgress?: (progress: ImageGenProgress) => void,
  referenceImages?: ReferenceImages,
  options: ImageGenOptions = {},
): Promise<ImageGenResult> {
  const format: ImageFormat = options.format ?? '1:1';
  const quality: ImageQuality = options.quality ?? IMAGE_QUALITY_DEFAULT;

  let openaiError: Error | null = null;

  // ── 1) OpenAI primario ─────────────────────────────────────────────────────
  onProgress?.({
    modelName: 'OpenAI gpt-image-2',
    attempt: 1,
    total: TOTAL_MODELS,
    status: 'trying',
  });

  try {
    const result = await tryOpenAI(prompt, referenceImages, format, quality);
    onProgress?.({
      modelName: 'OpenAI gpt-image-2',
      attempt: 1,
      total: TOTAL_MODELS,
      status: 'success',
    });
    return result;
  } catch (err) {
    openaiError = err instanceof Error ? err : new Error(String(err));
    onProgress?.({
      modelName: 'OpenAI gpt-image-2',
      attempt: 1,
      total: TOTAL_MODELS,
      status: 'failed',
      error: openaiError.message,
    });
  }

  // ── 2) Cascada Gemini ──────────────────────────────────────────────────────
  if (!options.geminiKey) {
    throw new Error(
      `OpenAI fallo y no hay Gemini key configurada como fallback. Error: ${openaiError.message}`,
    );
  }

  try {
    return await tryGemini(
      options.geminiKey,
      prompt,
      referenceImages,
      onProgress,
      /* attemptOffset */ 2,
    );
  } catch (geminiError) {
    const gMsg = geminiError instanceof Error ? geminiError.message : String(geminiError);
    throw new Error(
      `Todos los modelos de imagen fallaron. OpenAI: ${openaiError.message} | Gemini: ${gMsg}`,
    );
  }
}

// ─── Edicion sutil de imagen existente ───────────────────────────────────────

/**
 * Edita una imagen ya generada con instrucciones precisas.
 * La imagen original va como input + un prompt de edicion; el modelo devuelve
 * la misma imagen con SOLO los cambios pedidos (no rehace la imagen entera).
 */
export async function editImage(
  baseImage: { base64: string; mimeType: string },
  editInstruction: string,
  onProgress?: (progress: ImageGenProgress) => void,
  options: ImageGenOptions = {},
): Promise<ImageGenResult> {
  const editPrompt = `EDICION SUTIL DE IMAGEN — modo edit/inpainting.

INSTRUCCION DE EDICION DEL USUARIO:
"${editInstruction.trim()}"

REGLAS CRITICAS:
- La imagen base esta adjunta como referencia obligatoria.
- Devolver la MISMA imagen con SOLO el cambio pedido aplicado.
- Mantener IDENTICOS: composicion, encuadre, iluminacion, paleta, personajes, tipografia, textos que no se hayan pedido cambiar, fondo, todos los demas elementos.
- NO rehacer la imagen desde cero. NO cambiar el estilo. NO mover elementos que no se hayan pedido mover.
- Si la instruccion pide quitar algo (logo, icono, elemento), borrarlo limpiamente respetando el fondo que estaba debajo.
- Si pide cambiar un color, cambiar SOLO ese color, todo lo demas igual.
- Si pide agregar algo, integrarlo respetando la estetica y la iluminacion existentes.
- Resultado: la imagen debe verse como si alguien hubiera retocado un detalle en Photoshop, no como una nueva generacion.`;

  return generateImageWithFallback(
    editPrompt,
    onProgress,
    { styleRefs: [{ base64: baseImage.base64, mimeType: baseImage.mimeType }] },
    options,
  );
}

// ─── Generar multiples imagenes para carrusel ────────────────────────────────

export async function generateCarouselImages(
  prompts: string[],
  onProgress?: (slideIndex: number, progress: ImageGenProgress) => void,
  referenceImages?: ReferenceImages,
  options: ImageGenOptions = {},
): Promise<ImageGenResult[]> {
  const results: ImageGenResult[] = [];

  for (let i = 0; i < prompts.length; i++) {
    const result = await generateImageWithFallback(
      prompts[i],
      (progress) => onProgress?.(i, progress),
      referenceImages,
      options,
    );
    results.push(result);
  }

  return results;
}

// ─── Utilidad: base64 a Blob ─────────────────────────────────────────────────

export function base64ToBlob(base64: string, mimeType: string = 'image/png'): Blob {
  const byteString = atob(base64);
  const ab = new ArrayBuffer(byteString.length);
  const ia = new Uint8Array(ab);
  for (let i = 0; i < byteString.length; i++) {
    ia[i] = byteString.charCodeAt(i);
  }
  return new Blob([ab], { type: mimeType });
}

// ─── Utilidad: base64 a data URL ─────────────────────────────────────────────

export function base64ToDataUrl(base64: string, mimeType: string = 'image/png'): string {
  return `data:${mimeType};base64,${base64}`;
}
