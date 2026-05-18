/**
 * chatAttachments.ts — Soporte compartido de adjuntos (imagenes + archivos) para
 * los chats con IA (Coach IA y Entrenadores IA).
 *
 * Estrategia:
 *  - Imagenes (png/jpeg/webp/gif): se mandan a `/api/ai/describe-image` para
 *    obtener una descripcion textual via Claude vision · esa descripcion se
 *    inyecta en el contexto del prompt antes del mensaje del usuario.
 *  - Archivos de texto (.txt, .md, .csv, .json, .log, etc): se leen como UTF-8
 *    en el cliente y se incluyen en el contexto (truncados a ~30k chars).
 *  - Otros archivos: se incluye solo el nombre y tamano como referencia para
 *    que el usuario pueda mencionarlos en su pregunta.
 *
 * Asi reutilizamos el provider de texto existente (Claude → Gemini fallback)
 * sin cambiar el contrato de `generateText` / `streamText`.
 */
import {
  compressImageBase64,
  fileToBase64,
  MAX_UPLOAD_BYTES,
  formatBytes,
} from './imageUploadUtils';

const VISION_INSTRUCTION = `Describi en detalle lo que ves en esta imagen o captura de pantalla. Si es una captura de pantalla incluye: la pantalla/herramienta que se ve, textos visibles (transcribi literalmente todo lo legible), botones, metricas o numeros, layout general y cualquier dato relevante. Si es una foto incluye personas, objetos, contexto y detalles visuales. Devolve la respuesta como texto plano en espanol, sin saltos de linea innecesarios, lo mas completo posible (max 500 palabras).`;

const TEXT_FILE_MAX_BYTES = 200 * 1024; // 200KB
const TEXT_CONTEXT_MAX_CHARS = 30_000;

const TEXT_EXTENSIONS = new Set([
  'txt', 'md', 'markdown', 'csv', 'tsv', 'json', 'jsonl', 'log',
  'yaml', 'yml', 'html', 'htm', 'xml', 'js', 'ts', 'tsx', 'jsx',
  'css', 'scss', 'py', 'rb', 'go', 'java', 'kt', 'rs', 'php',
  'sh', 'sql', 'env', 'ini', 'toml', 'conf',
]);

export type AttachmentKind = 'image' | 'text' | 'other';

export interface ChatAttachment {
  id: string;
  kind: AttachmentKind;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  /** preview base64 dataURL (solo para imagenes) */
  previewDataUrl?: string;
  /** base64 raw (solo imagenes · sin prefijo data:) */
  imageBase64?: string;
  /** contenido textual ya leido (solo archivos de texto) */
  textContent?: string;
}

function randomId(): string {
  return `att_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

function getExtension(name: string): string {
  const idx = name.lastIndexOf('.');
  return idx >= 0 ? name.slice(idx + 1).toLowerCase() : '';
}

function isImage(file: File): boolean {
  return file.type.startsWith('image/');
}

function isTextLike(file: File): boolean {
  if (file.type.startsWith('text/')) return true;
  if (file.type === 'application/json') return true;
  if (file.type === 'application/xml') return true;
  return TEXT_EXTENSIONS.has(getExtension(file.name));
}

async function readAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ''));
    reader.onerror = () => reject(reader.error ?? new Error('FileReader error'));
    reader.readAsText(file, 'utf-8');
  });
}

/**
 * Convierte un File del browser (input file o paste) en un ChatAttachment.
 * Comprime imagenes para que entren al backend sin saturar el payload.
 */
export async function buildAttachmentFromFile(file: File): Promise<ChatAttachment> {
  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error(
      `${file.name}: supera el limite de ${formatBytes(MAX_UPLOAD_BYTES)}`,
    );
  }

  if (isImage(file)) {
    const raw = await fileToBase64(file);
    const compressed = await compressImageBase64(raw.base64, raw.mimeType);
    return {
      id: randomId(),
      kind: 'image',
      fileName: file.name || 'imagen.png',
      mimeType: compressed.mimeType,
      sizeBytes: Math.round(compressed.base64.length * 0.75),
      previewDataUrl: `data:${compressed.mimeType};base64,${compressed.base64}`,
      imageBase64: compressed.base64,
    };
  }

  if (isTextLike(file)) {
    if (file.size > TEXT_FILE_MAX_BYTES) {
      throw new Error(
        `${file.name}: archivo de texto muy grande (max ${formatBytes(TEXT_FILE_MAX_BYTES)})`,
      );
    }
    const text = await readAsText(file);
    return {
      id: randomId(),
      kind: 'text',
      fileName: file.name,
      mimeType: file.type || 'text/plain',
      sizeBytes: file.size,
      textContent: text,
    };
  }

  return {
    id: randomId(),
    kind: 'other',
    fileName: file.name,
    mimeType: file.type || 'application/octet-stream',
    sizeBytes: file.size,
  };
}

/**
 * Extrae los `File` de un DataTransfer (clipboard o drag) y los procesa en
 * paralelo. Tolera errores individuales: archivos fallidos se omiten y se
 * reportan via `onError`.
 */
export async function buildAttachmentsFromDataTransfer(
  dt: DataTransfer | null,
  onError?: (message: string) => void,
): Promise<ChatAttachment[]> {
  if (!dt) return [];
  const files: File[] = [];

  if (dt.items && dt.items.length > 0) {
    for (let i = 0; i < dt.items.length; i++) {
      const item = dt.items[i];
      if (item.kind === 'file') {
        const f = item.getAsFile();
        if (f) files.push(f);
      }
    }
  }

  if (files.length === 0 && dt.files && dt.files.length > 0) {
    for (let i = 0; i < dt.files.length; i++) files.push(dt.files[i]);
  }

  if (files.length === 0) return [];

  const results = await Promise.allSettled(files.map(buildAttachmentFromFile));
  const ok: ChatAttachment[] = [];
  for (const r of results) {
    if (r.status === 'fulfilled') ok.push(r.value);
    else onError?.(r.reason instanceof Error ? r.reason.message : String(r.reason));
  }
  return ok;
}

async function describeImage(att: ChatAttachment): Promise<string> {
  if (!att.imageBase64) return '';
  try {
    const resp = await fetch('/api/ai/describe-image', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        imageBase64: att.imageBase64,
        mimeType: att.mimeType,
        instruction: VISION_INSTRUCTION,
      }),
    });
    if (!resp.ok) return '';
    const data = (await resp.json()) as { description?: string };
    return data.description?.trim() ?? '';
  } catch {
    return '';
  }
}

/**
 * Convierte un set de adjuntos en un bloque de texto que se inyecta al
 * mensaje del usuario antes de mandarlo a la IA. Las imagenes se describen
 * en paralelo via vision API.
 *
 * Retorna `''` si no hay adjuntos · asi se puede concatenar sin condicionales.
 */
export async function attachmentsToContext(
  attachments: ChatAttachment[],
): Promise<string> {
  if (attachments.length === 0) return '';

  const imagePromises = attachments
    .filter((a) => a.kind === 'image')
    .map(async (a) => ({ att: a, desc: await describeImage(a) }));
  const imageDescriptions = await Promise.all(imagePromises);

  const sections: string[] = [];

  for (const a of attachments) {
    if (a.kind === 'image') {
      const found = imageDescriptions.find((d) => d.att.id === a.id);
      const desc = found?.desc || '(no se pudo describir la imagen)';
      sections.push(
        `[IMAGEN ADJUNTA · ${a.fileName}]\n${desc}`,
      );
    } else if (a.kind === 'text') {
      const body = (a.textContent ?? '').slice(0, TEXT_CONTEXT_MAX_CHARS);
      const truncatedFlag =
        (a.textContent ?? '').length > TEXT_CONTEXT_MAX_CHARS
          ? '\n[... truncado ...]'
          : '';
      sections.push(
        `[ARCHIVO ADJUNTO · ${a.fileName} (${formatBytes(a.sizeBytes)})]\n${body}${truncatedFlag}`,
      );
    } else {
      sections.push(
        `[ARCHIVO ADJUNTO · ${a.fileName} (${formatBytes(a.sizeBytes)}, ${a.mimeType}) — formato no soportado para lectura directa, mencionalo en tu pregunta]`,
      );
    }
  }

  return `=== ADJUNTOS DEL USUARIO ===\n${sections.join('\n\n')}\n=== FIN DE ADJUNTOS ===\n\n`;
}

export const ATTACHMENTS_ACCEPT_ATTR =
  'image/*,.txt,.md,.csv,.tsv,.json,.log,.yaml,.yml,.html,.xml,.js,.ts,.tsx,.jsx,.css,.py,.sql';
