/**
 * imageUploadUtils.ts — Helpers reusables para uploads de imagenes desde el browser.
 *
 * Compartido entre ImagenGenerator (subida de refs de personaje/estilo) y
 * CreativoEdicion (subida de imagen base + ref de personaje a reemplazar).
 */
import type { ImageFormat } from './campanasTypes';
import { IMAGE_FORMAT_OPTIONS } from './campanasTypes';

export const MAX_UPLOAD_BYTES = 10 * 1024 * 1024;

export const ACCEPTED_IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const;

export const ACCEPT_ATTR = ACCEPTED_IMAGE_TYPES.join(',');

export interface UploadedImage {
  base64: string;
  mimeType: string;
  fileName: string;
}

export interface UploadedImageWithDimensions extends UploadedImage {
  width: number;
  height: number;
}

export function fileToBase64(file: File): Promise<UploadedImage> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1] ?? '';
      resolve({ base64, mimeType: file.type, fileName: file.name });
    };
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsDataURL(file);
  });
}

export function loadImageDimensions(
  base64: string,
  mimeType: string,
): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = () => reject(new Error('No se pudo leer las dimensiones de la imagen'));
    img.src = `data:${mimeType};base64,${base64}`;
  });
}

/**
 * Devuelve el ImageFormat soportado por el backend cuya proporcion mas se
 * acerca al aspect ratio de la imagen original. Asi pasamos un format al modelo
 * para que respete el formato del usuario en vez de usar el default 1:1.
 */
export function detectClosestFormat(width: number, height: number): ImageFormat {
  if (width <= 0 || height <= 0) return '1:1';
  const ratio = width / height;
  let best: ImageFormat = '1:1';
  let bestDiff = Number.POSITIVE_INFINITY;
  for (const key of Object.keys(IMAGE_FORMAT_OPTIONS) as ImageFormat[]) {
    const opt = IMAGE_FORMAT_OPTIONS[key];
    const candidateRatio = opt.width / opt.height;
    const diff = Math.abs(Math.log(ratio) - Math.log(candidateRatio));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = key;
    }
  }
  return best;
}

/**
 * Resize/crop client-side para llevar una imagen a las dimensiones EXACTAS
 * de un objetivo (ej: 1080x1080). Usa cover-fit (recorta si hace falta para no
 * dejar bandas) preservando el centro.
 */
export async function resizeBase64ToExact(
  base64: string,
  mimeType: string,
  targetWidth: number,
  targetHeight: number,
): Promise<{ base64: string; mimeType: string }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('No se pudo cargar la imagen para resize'));
    el.src = `data:${mimeType};base64,${base64}`;
  });

  const canvas = document.createElement('canvas');
  canvas.width = targetWidth;
  canvas.height = targetHeight;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D no disponible');

  const srcRatio = img.naturalWidth / img.naturalHeight;
  const dstRatio = targetWidth / targetHeight;

  let sx = 0;
  let sy = 0;
  let sw = img.naturalWidth;
  let sh = img.naturalHeight;
  if (srcRatio > dstRatio) {
    sw = img.naturalHeight * dstRatio;
    sx = (img.naturalWidth - sw) / 2;
  } else if (srcRatio < dstRatio) {
    sh = img.naturalWidth / dstRatio;
    sy = (img.naturalHeight - sh) / 2;
  }

  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, targetWidth, targetHeight);

  const outMime = mimeType === 'image/jpeg' ? 'image/jpeg' : 'image/png';
  const dataUrl = canvas.toDataURL(outMime, outMime === 'image/jpeg' ? 0.95 : undefined);
  const out64 = dataUrl.split(',')[1] ?? '';
  return { base64: out64, mimeType: outMime };
}

/**
 * Comprime una imagen base64 para que entre en el payload del backend.
 * Reescala manteniendo aspect ratio (lado mayor = maxSide) y reencodea como JPEG
 * con calidad configurable. Imagenes grandes del usuario (3-4MB PNG) caen a
 * ~200-500KB JPEG sin perdida visual notable.
 *
 * No tocar imagenes que ya esten dentro del limite — devuelve la original.
 */
export async function compressImageBase64(
  base64: string,
  mimeType: string,
  maxSide: number = 1536,
  quality: number = 0.92,
): Promise<{ base64: string; mimeType: string; width: number; height: number }> {
  const img = await new Promise<HTMLImageElement>((resolve, reject) => {
    const el = new Image();
    el.onload = () => resolve(el);
    el.onerror = () => reject(new Error('No se pudo cargar la imagen para compresion'));
    el.src = `data:${mimeType};base64,${base64}`;
  });

  const srcW = img.naturalWidth;
  const srcH = img.naturalHeight;
  const longest = Math.max(srcW, srcH);
  const scale = longest > maxSide ? maxSide / longest : 1;
  const dstW = Math.round(srcW * scale);
  const dstH = Math.round(srcH * scale);

  const canvas = document.createElement('canvas');
  canvas.width = dstW;
  canvas.height = dstH;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D no disponible');
  ctx.drawImage(img, 0, 0, dstW, dstH);

  const dataUrl = canvas.toDataURL('image/jpeg', quality);
  const out64 = dataUrl.split(',')[1] ?? '';
  return { base64: out64, mimeType: 'image/jpeg', width: dstW, height: dstH };
}

export function validateImageFile(file: File): string | null {
  if (!file.type.startsWith('image/')) {
    return `${file.name}: solo se admiten imagenes`;
  }
  if (file.size > MAX_UPLOAD_BYTES) {
    return `${file.name}: maximo 10MB`;
  }
  return null;
}
