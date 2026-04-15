/**
 * campanasImageGen.ts — Generador de imagenes con cascada de modelos Gemini
 *
 * Nano Banana 2: gemini-3.1-flash-image-preview (primario)
 * Nano Banana Pro: gemini-3-pro-image-preview (fallback 1)
 * Nano Banana: gemini-2.5-flash-image (fallback 2)
 */
import { GoogleGenAI } from '@google/genai';

// ─── Modelos en orden de prioridad ───────────────────────────────────────────

const IMAGE_MODELS = [
  { id: 'gemini-3.1-flash-image-preview', name: 'Nano Banana 2' },
  { id: 'gemini-3-pro-image-preview', name: 'Nano Banana Pro' },
  { id: 'gemini-2.5-flash-image', name: 'Nano Banana' },
] as const;

export type ImageModelName = (typeof IMAGE_MODELS)[number]['name'];

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

// ─── Tipo para imagenes de referencia ────────────────────────────────────────

export interface ReferenceImages {
  characterRefs?: { base64: string; mimeType: string }[];
  styleRefs?: { base64: string; mimeType: string }[];
}

// ─── Generador principal con cascada ─────────────────────────────────────────

export async function generateImageWithFallback(
  apiKey: string,
  prompt: string,
  onProgress?: (progress: ImageGenProgress) => void,
  referenceImages?: ReferenceImages,
): Promise<ImageGenResult> {
  const ai = new GoogleGenAI({ apiKey });
  let lastError: Error | null = null;

  // Build parts array: text + optional reference images
  const parts: { text?: string; inlineData?: { mimeType: string; data: string } }[] = [
    { text: prompt },
  ];
  for (const ref of referenceImages?.characterRefs ?? []) {
    parts.push({
      inlineData: { mimeType: ref.mimeType, data: ref.base64 },
    });
  }
  for (const ref of referenceImages?.styleRefs ?? []) {
    parts.push({
      inlineData: { mimeType: ref.mimeType, data: ref.base64 },
    });
  }

  for (let i = 0; i < IMAGE_MODELS.length; i++) {
    const model = IMAGE_MODELS[i];

    onProgress?.({
      modelName: model.name,
      attempt: i + 1,
      total: IMAGE_MODELS.length,
      status: 'trying',
    });

    try {
      const response = await ai.models.generateContent({
        model: model.id,
        contents: [{ role: 'user', parts: parts as never[] }],
        config: {
          responseModalities: ['TEXT', 'IMAGE'],
        },
      });

      // Buscar la parte de imagen en la respuesta
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
        attempt: i + 1,
        total: IMAGE_MODELS.length,
        status: 'success',
      });

      return {
        imageBase64: data,
        mimeType: mimeType || 'image/png',
        modelUsed: model.id,
        modelName: model.name,
      };
    } catch (err) {
      lastError = err instanceof Error ? err : new Error(String(err));

      onProgress?.({
        modelName: model.name,
        attempt: i + 1,
        total: IMAGE_MODELS.length,
        status: 'failed',
        error: lastError.message,
      });
    }
  }

  throw new Error(
    `Todos los modelos de imagen fallaron. Ultimo error: ${lastError?.message ?? 'desconocido'}`,
  );
}

// ─── Edicion sutil de imagen existente (Nano Banana edit mode) ───────────────

/**
 * Edita una imagen ya generada con instrucciones precisas.
 * La imagen original va como input + un prompt de edicion; el modelo devuelve
 * la misma imagen con SOLO los cambios pedidos (no rehace la imagen entera).
 */
export async function editImage(
  apiKey: string,
  baseImage: { base64: string; mimeType: string },
  editInstruction: string,
  onProgress?: (progress: ImageGenProgress) => void,
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
    apiKey,
    editPrompt,
    onProgress,
    { styleRefs: [{ base64: baseImage.base64, mimeType: baseImage.mimeType }] },
  );
}

// ─── Generar multiples imagenes para carrusel ────────────────────────────────

export async function generateCarouselImages(
  apiKey: string,
  prompts: string[],
  onProgress?: (slideIndex: number, progress: ImageGenProgress) => void,
  referenceImages?: ReferenceImages,
): Promise<ImageGenResult[]> {
  const results: ImageGenResult[] = [];

  for (let i = 0; i < prompts.length; i++) {
    const result = await generateImageWithFallback(
      apiKey,
      prompts[i],
      (progress) => onProgress?.(i, progress),
      referenceImages,
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
