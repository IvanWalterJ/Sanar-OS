/**
 * campanasTypes.ts — Tipos para el modulo de Campanas & Creativos
 */

// ─── Campanas ────────────────────────────────────────────────────────────────

export type ObjetivoCampana = 'trafico_perfil' | 'mensajes_retargeting' | 'clientes_potenciales';
export type EstadoCampana = 'borrador' | 'configurada' | 'activa' | 'pausada' | 'completada';

export interface Campana {
  id: string;
  usuario_id: string;
  nombre: string;
  objetivo: ObjetivoCampana;
  nicho?: string;
  ubicacion?: string;
  edad_min: number;
  edad_max: number;
  genero: 'todos' | 'mujeres' | 'hombres';
  intereses?: string[];
  presupuesto_diario?: number;
  duracion_dias: number;
  monto_inversion_filtro?: number;
  url_landing?: string;
  url_vsl?: string;
  guia_configuracion?: string;
  estado: EstadoCampana;
  created_at: string;
  updated_at: string;
}

/** Estado del formulario del wizard (antes de guardar) */
export interface CampanaFormState {
  nombre: string;
  objetivo: ObjetivoCampana;
  nicho: string;
  ubicacion: string;
  edad_min: number;
  edad_max: number;
  genero: 'todos' | 'mujeres' | 'hombres';
  intereses: string[];
  presupuesto_diario: string;
  duracion_dias: number;
  monto_inversion_filtro: string;
  url_landing: string;
  url_vsl: string;
}

export const CAMPANA_FORM_INITIAL: CampanaFormState = {
  nombre: '',
  objetivo: 'trafico_perfil',
  nicho: '',
  ubicacion: '',
  edad_min: 25,
  edad_max: 55,
  genero: 'todos',
  intereses: [],
  presupuesto_diario: '',
  duracion_dias: 7,
  monto_inversion_filtro: '500',
  url_landing: '',
  url_vsl: '',
};

export const OBJETIVO_LABELS: Record<ObjetivoCampana, { titulo: string; descripcion: string }> = {
  trafico_perfil: {
    titulo: 'Trafico al Perfil',
    descripcion: 'CTA con palabra clave para activar automatizacion en ManyChat y GHL. Envio de recursos automatico y generacion de conversacion.',
  },
  mensajes_retargeting: {
    titulo: 'Mensajes (Retargeting)',
    descripcion: 'Campaña de retargeting para personas que ya interactuaron con la campaña de trafico. Segundo contacto estrategico.',
  },
  clientes_potenciales: {
    titulo: 'Clientes Potenciales',
    descripcion: 'Directo a landing page con VSL. Objetivo: agendar llamada via formulario y calendario de GHL. Filtro API de inversion.',
  },
};

export const ESTADO_COLORS: Record<EstadoCampana, string> = {
  borrador: '#F5A623',
  configurada: '#3B82F6',
  activa: '#22C55E',
  pausada: '#EAB308',
  completada: '#8B5CF6',
};

// ─── Creativos ───────────────────────────────────────────────────────────────

export type TipoCreativo = 'imagen_single' | 'carrusel' | 'yt_thumbnail';
export type AnguloCreativo = 'contraintuitivo' | 'directo' | 'emocional' | 'curiosidad' | 'autoridad' | 'dolor' | 'deseo';
export type EstadoCreativo = 'generado' | 'aprobado' | 'descartado';

export interface Creativo {
  id: string;
  usuario_id: string;
  campana_id?: string;
  tipo: TipoCreativo;
  angulo: AnguloCreativo;
  texto_principal: string;
  titulo: string;
  descripcion?: string;
  cta_texto?: string;
  nombre?: string;
  estado: EstadoCreativo;
  prompt_imagen?: string;
  created_at: string;
  // Joined
  assets?: CreativoAsset[];
}

export interface CreativoAsset {
  id: string;
  creativo_id: string;
  usuario_id: string;
  slide_orden: number;
  storage_path: string;
  public_url: string;
  width?: number;
  height?: number;
  mime_type: string;
  created_at: string;
}

export interface CopyGenerado {
  texto_principal: string;
  titulo: string;
  descripcion: string;
  cta_texto: string;
}

/** Para carruseles: un CopyGenerado por slide */
export interface CarouselCopyGenerado {
  slides: CopyGenerado[];
}

export const ANGULO_LABELS: Record<AnguloCreativo, { titulo: string; descripcion: string }> = {
  contraintuitivo: {
    titulo: 'Contraintuitivo',
    descripcion: 'Hook impactante que contradice una creencia comun del nicho',
  },
  directo: {
    titulo: 'Directo',
    descripcion: 'Beneficio claro y CTA sin rodeos',
  },
  emocional: {
    titulo: 'Emocional',
    descripcion: 'Conecta con el dolor o deseo mas profundo del avatar',
  },
  curiosidad: {
    titulo: 'Curiosidad',
    descripcion: 'Open loop que genera necesidad irresistible de hacer clic',
  },
  autoridad: {
    titulo: 'Autoridad',
    descripcion: 'Posicionamiento como experto, metodo propio y prueba social',
  },
  dolor: {
    titulo: 'Desde el Dolor',
    descripcion: 'Apunta al punto de dolor especifico del avatar',
  },
  deseo: {
    titulo: 'Desde el Deseo',
    descripcion: 'Vision aspiracional del resultado que el avatar quiere',
  },
};

export const TIPO_LABELS: Record<TipoCreativo, string> = {
  imagen_single: 'Imagen Unica',
  carrusel: 'Carrusel',
  yt_thumbnail: 'YouTube Thumbnail',
};

// ─── Estilos visuales y modos de imagen ─────────────────────────────────────

export type EstiloVisual =
  | 'foto_real'
  | 'bold'
  | 'pixar'
  | 'caricatura'
  | 'comic'
  | 'plasticina'
  | 'noticias'
  | 'twitter';

// Maps legacy keys (stored in old prompt_imagen strings or passed externally) to current keys
export const LEGACY_ESTILO_MAP: Record<string, EstiloVisual> = {
  fotografico_profesional: 'foto_real',
  grafico_bold: 'bold',
  minimalista: 'foto_real',
  lifestyle: 'foto_real',
  testimonio: 'foto_real',
  educativo: 'bold',
  antes_despues: 'bold',
  urgencia: 'bold',
};

export function normalizeEstilo(value: string): EstiloVisual {
  const valid: EstiloVisual[] = ['foto_real', 'bold', 'pixar', 'caricatura', 'comic', 'plasticina', 'noticias', 'twitter'];
  if (valid.includes(value as EstiloVisual)) return value as EstiloVisual;
  return LEGACY_ESTILO_MAP[value] ?? 'foto_real';
}

export type ImageMode = 'completa' | 'fondo';

export const ESTILO_VISUAL_OPTIONS: Record<EstiloVisual, { titulo: string; descripcion: string; prompt: string }> = {
  foto_real: {
    titulo: 'Estilo Foto Real',
    descripcion: 'Fotografia profesional, naturalista, editorial',
    prompt: 'High-end editorial photography. Full-frame DSLR look, natural key light, shallow depth of field with smooth bokeh. Photorealistic skin tones and materials. Magazine-cover commercial quality. Premium stock photo aesthetic. No illustration, no CGI — pure photographic realism.',
  },
  bold: {
    titulo: 'Estilo Bold',
    descripcion: 'Grafico de alto contraste, colores fuertes, scroll-stopping',
    prompt: 'Bold graphic design, maximum contrast, oversized sans-serif typography treatment area, flat vector shapes, asymmetric dynamic layout, limited aggressive color palette (black + one saturated accent). Scroll-stopping poster aesthetic. Behance editorial design quality. Clean geometric composition.',
  },
  pixar: {
    titulo: 'Estilo PIXAR',
    descripcion: '3D animado cinematografico, personajes expresivos',
    prompt: 'Pixar-Disney 3D animated style. Cinematic soft lighting with subsurface scattering on skin. Expressive stylized characters with large eyes and smooth skin. Rich saturated color palette. Depth of field, volumetric light. Polished render quality matching Toy Story or Up. Warm, friendly, family-safe aesthetic.',
  },
  caricatura: {
    titulo: 'Estilo Caricatura',
    descripcion: 'Ilustracion 2D cartoon, contornos marcados, colores planos',
    prompt: '2D cartoon illustration style. Bold clean black outlines. Flat cel-shaded colors with minimal shadow. Exaggerated expressive features. Vibrant Saturday-morning animation palette. Hand-drawn feel with high readability. Similar to modern animated series. No photorealism, pure 2D illustration.',
  },
  comic: {
    titulo: 'Estilo Comic',
    descripcion: 'Comic book americano, halftone dots, contornos gruesos',
    prompt: 'American comic book style. Thick bold ink outlines. Halftone dot shading (Ben-Day dots). Limited saturated primary palette. Dynamic action-style composition. Marvel or DC aesthetic quality. Strong dramatic shadows with cross-hatching details. Panel-ready framing. Pure comic art, no photography.',
  },
  plasticina: {
    titulo: 'Estilo Plasticina',
    descripcion: 'Claymation 3D, texturas de arcilla, estilo artesanal',
    prompt: 'Handmade claymation stop-motion aesthetic. Visible fingerprint and tool-mark textures on clay surfaces. Imperfect charming organic shapes. Warm studio lighting with shallow depth of field. Aardman Studios quality (Wallace and Gromit). Tactile plasticine 3D feel. Soft colors, handmade charm.',
  },
  noticias: {
    titulo: 'Estilo Noticias',
    descripcion: 'Captura tipo medio viral: foto real + titular bold + badge urgente + dato/estadistica',
    prompt: 'Viral news/media post style — looks like an authentic screenshot of a viral news outlet post on Instagram (in the vein of El Kilombo, Infobae viral, FilterNews). Real photographic image as background (a person reacting, a relevant scene, candid documentary photo — NOT a TV anchor in a studio). Bold uppercase sans-serif headline overlaid at the bottom over a subtle dark gradient — headline includes a SHOCKING DATA POINT, percentage, statistic, or surprising claim (ej: "EL 67% DE LOS USUARIOS...", "ESPANA ES EL PAIS CON MAS..."). Small colored rectangular badge at the top-left of the headline area saying "VIRAL", "ULTIMO MOMENTO", "URGENTE" or similar in red/yellow. Optional small fake media logo bottom-left and small swipe arrow ">>" bottom-right. Vertical 4:5 or 9:16 framing. The vibe is tabloid digital, scroll-stopping, data-driven shock value — NOT a TV news broadcast, NOT a studio, NOT an anchor with chyron.',
  },
  twitter: {
    titulo: 'Estilo Twitter/X',
    descripcion: 'Screenshot organico de un post real en X — texto a tamano normal, no titular gigante',
    prompt: 'AUTHENTIC X (Twitter) post screenshot — must look like a real screenshot taken from the X mobile or desktop app. Pixel-perfect replica of the platform UI: profile avatar circle (40-48px), display name in bold sans-serif at NORMAL size (~15-17px equivalent), verified blue checkmark next to name, gray @handle and timestamp on the same row, post body text rendered at 15-16px equivalent (NORMAL reading size — NOT giant headline-size text, NOT poster typography, NOT bold display). The post body uses regular weight sans-serif (system font: Segoe UI / SF Pro / Helvetica), left-aligned, with normal line-height. Below the text: small action row (reply, retweet, like, view counts) in muted gray. Dark mode (#15202B background, #FFFFFF text) or light mode (white background, #0F1419 text). The post should occupy a card with subtle border. ABSOLUTE RULES: text in the body must be the same size as a real tweet — small enough that you could fit 280 characters. No oversized typography, no poster design, no decorative effects, no gradients, no extra graphics. Just a clean, organic, believable Twitter/X post screenshot.',
  },
};

// ─── Formatos de imagen ─────────────────────────────────────────────────────

export type ImageFormat =
  | '1:1'
  | '4:5'
  | '9:16'
  | '16:9'
  | 'yt_thumbnail';

export const IMAGE_FORMAT_OPTIONS: Record<ImageFormat, { label: string; descripcion: string; width: number; height: number }> = {
  '1:1':          { label: 'Cuadrado 1:1',      descripcion: 'Feed de Instagram',           width: 1080, height: 1080 },
  '4:5':          { label: 'Vertical 4:5',       descripcion: 'Feed de Instagram (vertical)', width: 1080, height: 1350 },
  '9:16':         { label: 'Story / Reel 9:16',  descripcion: 'Stories, Reels, TikTok',       width: 1080, height: 1920 },
  '16:9':         { label: 'Horizontal 16:9',     descripcion: 'Facebook, LinkedIn',            width: 1920, height: 1080 },
  'yt_thumbnail': { label: 'YouTube Thumbnail',   descripcion: 'Portada de video (1280x720)',   width: 1280, height: 720 },
};

// ─── Referencias, texto custom y control de slides ──────────────────────────

export interface ReferenceImage {
  base64: string;
  mimeType: string;
  fileName: string;
}

export type TextSource = 'ia' | 'personalizado';

export type ImageGenerationMode = 'ia_completa' | 'texto_personalizado' | 'solo_fondo';

export interface CustomText {
  h1: string;
  h2: string;
  h3?: string;
  cta: string;
}

export interface SlideConfig {
  textSource: TextSource;
  customText?: CustomText;
}

// ─── Vistas internas de la pagina ────────────────────────────────────────────

export type CampanasView =
  | 'home'
  | 'nueva'
  | 'copies'
  | 'diagnostico'
  | 'montaje'
  | 'historial'
  | 'ganadores'
  | 'creativos'
  | 'studio'
  | 'detail';

// ─── Chat KAI (wizard conversacional) ──────────────────────────────────────

export type WizardPhase = 'cliente' | 'estrategia' | 'audiencias' | 'copies' | 'creativos' | 'montaje';

export interface KaiMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  phase?: WizardPhase;
}

export const WIZARD_PHASES: { id: WizardPhase; label: string; numero: number }[] = [
  { id: 'cliente', label: 'Cliente', numero: 1 },
  { id: 'estrategia', label: 'Estrategia', numero: 2 },
  { id: 'audiencias', label: 'Audiencias', numero: 3 },
  { id: 'copies', label: 'Copies', numero: 4 },
  { id: 'creativos', label: 'Creativos', numero: 5 },
  { id: 'montaje', label: 'Montaje', numero: 6 },
];

// ─── Diagnostico de campana ────────────────────────────────────────────────

export interface DiagnosticoInput {
  nombre_campana: string;
  rubro: string;
  gasto: number;
  clicks: number;
  leads: number;
  ctr: number;
  impresiones: number;
  dias: number;
  problema_observado?: string;
}

// ─── Montaje paso a paso ───────────────────────────────────────────────────

export type MontajeStepStatus = 'done' | 'active' | 'locked';

export interface MontajeStep {
  id: number;
  label: string;
  description: string;
  status: MontajeStepStatus;
}
