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
    descripcion: 'Campana de retargeting para personas que ya interactuaron con la campana de trafico. Segundo contacto estrategico.',
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
