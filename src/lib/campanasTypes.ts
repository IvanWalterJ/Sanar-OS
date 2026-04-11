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

export type TipoCreativo = 'imagen_single' | 'carrusel';
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
};

// ─── Estilos visuales y modos de imagen ─────────────────────────────────────

export type EstiloVisual =
  | 'fotografico_profesional'
  | 'grafico_bold'
  | 'minimalista'
  | 'lifestyle'
  | 'testimonio'
  | 'educativo'
  | 'antes_despues'
  | 'urgencia';

export type ImageMode = 'completa' | 'fondo';

export const ESTILO_VISUAL_OPTIONS: Record<EstiloVisual, { titulo: string; descripcion: string; prompt: string }> = {
  fotografico_profesional: {
    titulo: 'Fotografico profesional',
    descripcion: 'Foto realista premium, persona en consultorio o clinica',
    prompt: 'Fotografia profesional de alta calidad tipo stock premium. Persona real en entorno de consultorio o clinica moderna. Iluminacion profesional de estudio, profundidad de campo. Estetica editorial de revista de salud. Colores calidos y naturales.',
  },
  grafico_bold: {
    titulo: 'Grafico bold',
    descripcion: 'Diseño impactante, colores fuertes, tipografia grande',
    prompt: 'Diseño grafico BOLD e impactante. Colores vibrantes y contrastantes. Composicion asimetrica y dinamica. Elementos graficos geometricos. Estilo de agencia de publicidad premium. La imagen debe GRITAR y detener el scroll inmediatamente. Alto contraste, formas llamativas.',
  },
  minimalista: {
    titulo: 'Minimalista',
    descripcion: 'Fondo limpio, espacio negativo, elegante',
    prompt: 'Diseño minimalista y elegante. Mucho espacio negativo. Fondo solido o gradiente suave. Un solo elemento visual central. Sensacion de premium y exclusividad. Tipografia fina y moderna. Menos es mas.',
  },
  lifestyle: {
    titulo: 'Lifestyle',
    descripcion: 'Persona en situacion cotidiana, natural, relatable',
    prompt: 'Fotografia lifestyle natural y autentica. Persona en situacion cotidiana, sonriendo, en su elemento. Luz natural, ambiente calido. El espectador debe sentirse identificado. No parece publicidad, parece un momento real capturado. Estetica de Instagram organica.',
  },
  testimonio: {
    titulo: 'Testimonio',
    descripcion: 'Formato quote con foto, prueba social',
    prompt: 'Formato de testimonio o caso de exito. Incluir comillas visuales grandes. Foto de persona satisfecha o resultado visible. Diseño que transmite confianza y credibilidad. Elementos de prueba social: estrellas, check marks, numeros. Fondo oscuro profesional.',
  },
  educativo: {
    titulo: 'Educativo',
    descripcion: 'Infografia, datos, formato didactico',
    prompt: 'Infografia educativa limpia y profesional. Datos presentados visualmente con iconos, numeros destacados, listas visuales. Formato de "sabias que" o "X datos sobre...". Diseño que aporta valor inmediato. Colores institucionales y profesionales.',
  },
  antes_despues: {
    titulo: 'Antes / Despues',
    descripcion: 'Contraste visual problema vs solucion',
    prompt: 'Composicion dividida en dos: lado izquierdo oscuro/gris representando el PROBLEMA (frustracion, dolor, confusion), lado derecho luminoso/colorido representando la SOLUCION (alivio, claridad, resultado). Transicion visual clara entre ambos estados. Flecha o elemento de transformacion en el centro.',
  },
  urgencia: {
    titulo: 'Urgencia / FOMO',
    descripcion: 'Colores de alerta, escasez, accion inmediata',
    prompt: 'Diseño con sensacion de URGENCIA y escasez. Colores rojos/naranjas de alerta. Elementos de countdown, plazas limitadas, "ultima oportunidad". Contraste alto negro/rojo/dorado. Stickers de "AHORA", flechas, elementos que empujan a la accion inmediata. Energia alta.',
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
