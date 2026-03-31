/**
 * videos.ts — Catálogo de módulos de video del Método CLÍNICA
 *
 * Para agregar un video:
 * 1. Copiá la URL del video de YouTube (ej: https://youtu.be/dQw4w9WgXcQ)
 *    o el código de embed que da YouTube (iframe src="...embed/VIDEO_ID...")
 * 2. Agregá un nuevo objeto al array VIDEOS con el grupo correspondiente
 *
 * Grupos:
 *   A = Identidad y Mentalidad
 *   B = Claridad y Oferta
 *   C = Contenido y Captación
 *   D = Infraestructura Digital
 *   E = Conversión y Ventas
 */

export interface VideoModulo {
  id: string;
  grupo: 'A' | 'B' | 'C' | 'D' | 'E';
  titulo: string;
  descripcion: string;
  youtubeUrl: string; // URL completa de YouTube o código embed
  duracion?: string;  // Ej: "12:30"
}

/**
 * Extrae el video ID de cualquier formato de URL de YouTube
 * y devuelve la URL de embed lista para usar en un iframe.
 */
export function getYoutubeEmbedUrl(url: string): string {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? `https://www.youtube.com/embed/${match[1]}?rel=0` : url;
}

/**
 * Extrae el video ID de una URL de YouTube.
 */
export function getYoutubeVideoId(url: string): string | null {
  const match = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return match ? match[1] : null;
}

/**
 * Catálogo de videos — agregá los tuyos acá.
 * El array empieza vacío. Cuando tengas los links, completalo.
 */
export const VIDEOS: VideoModulo[] = [
  // Ejemplo (borrarlo cuando agregues los reales):
  // {
  //   id: 'v-a1',
  //   grupo: 'A',
  //   titulo: 'Módulo 1 — Identidad del Fundador',
  //   descripcion: 'Definí quién sos como emprendedor/a de la salud antes de empezar a vender.',
  //   youtubeUrl: 'https://youtu.be/REEMPLAZAR_CON_TU_ID',
  //   duracion: '18:45',
  // },
];
