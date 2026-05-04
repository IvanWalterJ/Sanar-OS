import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  console.warn('[Supabase] Variables de entorno VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY no configuradas. El modo offline (localStorage) está activo.');
}

export const supabase = (supabaseUrl && supabaseAnonKey)
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

export const isSupabaseReady = () => supabase !== null;

// ─── Tipos de base de datos ──────────────────────────────────────────────────

export type UserStatus = 'ONBOARDING' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CHURNED';

export interface Profile {
  id: string;
  nombre: string;
  email: string;
  especialidad?: string;
  fecha_inicio: string; // date as string YYYY-MM-DD
  plan: 'DWY' | 'DFY' | 'IMPLEMENTACION';
  rol: 'cliente' | 'admin';
  created_at: string;
  status?: UserStatus;
  onboarding_completed?: boolean;
  full_agent_access?: boolean;
}

export interface AdminNote {
  id: string;
  client_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

export interface PilarSatisfactionRating {
  id: string;
  usuario_id: string;
  pilar_numero: number;
  pilar_titulo?: string;
  rating: 1 | 2 | 3 | 4 | 5;
  comentario?: string;
  created_at: string;
}

export interface TareaTemplate {
  id: string;
  fase: number;
  dia: number;
  orden: number;
  titulo: string;
  descripcion?: string;
  recurso_url?: string;
  es_tecnica: boolean;
}

export interface TareaUsuario {
  id: string;
  user_id: string;
  tarea_template_id: string;
  estado: 'pendiente' | 'activa' | 'completada';
  updated_at: string;
  tarea?: TareaTemplate;
}

export interface Mensaje {
  id: string;
  canal: 'privado' | 'comunidad' | 'victorias' | 'consultas';
  emisor_id?: string;
  receptor_id?: string;
  contenido: string;
  tipo_archivo?: 'imagen' | 'audio';
  archivo_url?: string;
  created_at: string;
  emisor?: Profile;
}

export interface DiarioEntrada {
  id: string;
  user_id: string;
  fecha: string;
  respuestas: {
    q1: string;
    q2: string;
    q3: number;
    q4: string;
    q5: string;
  };
  created_at: string;
}

export interface DiarioResumen {
  id: string;
  user_id: string;
  semana_inicio: string;
  resumen_texto: string;
  created_at: string;
}

/** @deprecated Usar MetricaSemanaV2. */
export interface MetricaSemana {
  id: string;
  user_id: string;
  semana: string;
  leads: number;
  conversaciones: number;
  ventas: number;
  created_at: string;
}

export interface MetricaSemanaV2 {
  id?: string;
  user_id: string;
  semana: string;
  // 9 campos manuales del embudo
  gasto_ads: number;
  mensajes_recibidos: number;
  formularios_completados: number;
  agendados: number;
  shows: number;
  llamadas_tomadas: number;
  ventas_cerradas: number;
  ingresos_cobrados: number;
  horas_trabajadas_semana: number;
  created_at?: string;
}

export interface BibliotecaVideo {
  id: string;
  fase: number;
  orden: number;
  titulo: string;
  descripcion?: string;
  url_embed?: string;
  duracion_minutos?: number;
}

export interface BibliotecaRecurso {
  id: string;
  categoria: string;
  titulo: string;
  descripcion?: string;
  url_archivo?: string;
}

// ─── Tipos v2.0 ──────────────────────────────────────────────────────────────

export interface ProfileV2 extends Profile {
  nivel_avatar: 1 | 2 | 3 | 4 | 5;
  nicho?: string;
  avatar_cliente?: string;
  posicionamiento?: string;
  historia_origen?: string;
  creencias_reformuladas?: { original: string; reformulada: string }[];
  programas_inconscientes?: { programa: string; reformulacion: string }[];
  carta_dia91?: string;
  por_que_oficial?: string;
  progreso_porcentaje: number;
  pilar_actual: number;
  suscripcion_activa: boolean;
  dia_programa: number; // 1-90
  // ── ADN del Negocio — Método CLÍNICA ─────────────────────────────────────
  historia_300?: string;
  historia_150?: string;
  historia_50?: string;
  proposito?: string;
  legado?: string;
  matriz_a?: string;           // "El infierno" — dolores actuales del paciente
  matriz_b?: string;           // "Los obstáculos" — por qué no avanzan solos
  matriz_c?: string;           // "El cielo" — visión positiva del resultado
  metodo_nombre?: string;
  metodo_pasos?: string;       // JSON array de 3-7 pasos como texto
  oferta_high?: string;
  oferta_mid?: string;
  oferta_low?: string;
  lead_magnet?: string;
  embudo_activo?: boolean;
  script_venta?: string;
  agenda_configurada?: boolean;
  automatizacion_activa?: boolean;
  identidad_colores?: string;
  identidad_tipografia?: string;
  identidad_logo?: string;
  identidad_tono?: string;
  // Manual de Marca — reglas de uso innegociables (free-text) que se inyectan
  // en prompts de generacion de IMAGEN con prioridad sobre estilo y referencia.
  identidad_reglas_uso?: string;
  // ── ADN V3 — Campos nuevos del PDF definitivo ────────────────────────────
  adn_formulario_bienvenida?: Record<string, string>; // P0.2
  adn_linea_tiempo?: string;           // P1.2 — escritura pura, sin IA
  adn_cinco_por_que?: string[];        // P2.2 — 5 respuestas encadenadas
  adn_carta_futuro?: string;           // P3.2 — escritura pura, sin IA
  adn_pacientes_reales?: string;       // P4.2 — 3 análisis de pacientes
  adn_avatar?: {                       // P4.3 — avatar estructurado
    nombre_ficticio: string;
    edad: number;
    profesion: string;
    situacion: string;
    dolores: string[];
    suenos: string[];
    objeciones: string[];
    lenguaje: string[];
  };
  adn_nicho?: string;                  // P5.2
  adn_usp?: string;                    // P5.2
  adn_transformaciones?: string;       // P6.2 — 10 bloques de transformaciones
  adn_proceso_actual?: string;         // P7.2 — proceso documentado
  adn_landing_copy?: string;           // P9A.2
  adn_anuncios?: string;               // P9A.3 — 3 versiones de anuncios
  adn_protocolo_servicio?: string;     // P9C.2
  adn_identidad_sistema?: string;      // P10.2 — sistema completo de identidad
  // ── ADN v7 — Campos nuevos del documento maestro (migración pendiente) ───
  adn_avatar_journey?: string;            // P4.3 · IRR
  adn_micronicho?: string;                // P5.2 · IRR
  adn_escenarios_roas?: string;           // P8.6 · NEG
  adn_vsl_script?: string;                // P9A.2 · INF
  adn_meta_config?: Record<string, unknown>;     // P9A.4 · INF
  adn_skool_setup?: Record<string, unknown>;     // P9A.5 · INF
  adn_templates_canva?: string;           // P10.3 · INF
  adn_creativos_v2?: string;              // P10.4 · INF
  adn_triage_audios?: string;             // P9B.2 · CAP
  adn_masterclass_estructura?: string;    // P9B.4 · CAP
  adn_emails_nurture?: string;            // P9C.2 · CAP
  adn_plan_contenido_semanal?: string;    // P9C.3 · CAP
  adn_retargeting_config?: Record<string, unknown>;  // P9C.4 · CAP
  adn_tablero_cierre?: string;            // P11.1 · MET
  adn_retrospectiva?: string;             // P11.2 · MET
  adn_plan_ciclo_2?: string;              // P11.3 · MET
  adn_masterclass_analytics?: string;     // P11.4 · MET
}

// ─── Tipos V3 — Versión Final Definitiva ─────────────────────────────────────

export type PilarId =
  | 'P0' | 'P1' | 'P2' | 'P3' | 'P4' | 'P5' | 'P6' | 'P7' | 'P8'
  | 'P9A' | 'P9B' | 'P9C' | 'P10' | 'P11';

/** Tipos de tarea permitidos en el roadmap (v7 Regla #2: solo 3 tipos, en este orden). */
export type TipoTarea = 'VIDEO' | 'HERRAMIENTA' | 'COACH';

export type MetaCodigo =
  | 'P0.1' | 'P0.2'
  | 'P1.1' | 'P1.2' | 'P1.3' | 'P1.4'
  | 'P2.1' | 'P2.2' | 'P2.3' | 'P2.4'
  | 'P3.1' | 'P3.2' | 'P3.3' | 'P3.4'
  | 'P4.1' | 'P4.2' | 'P4.3' | 'P4.4'
  | 'P5.1' | 'P5.2' | 'P5.3'
  | 'P6.1' | 'P6.2' | 'P6.3' | 'P6.4'
  | 'P7.1' | 'P7.2' | 'P7.3' | 'P7.4'
  | 'P8.1' | 'P8.2' | 'P8.3' | 'P8.4'
  | 'P9A.1' | 'P9A.2' | 'P9A.3' | 'P9A.4' | 'P9A.5'
  | 'P9B.1' | 'P9B.2' | 'P9B.3' | 'P9B.4'
  | 'P9C.1' | 'P9C.2' | 'P9C.3'
  | 'P10.1' | 'P10.2' | 'P10.3'
  | 'P11.1' | 'P11.2';

/** @deprecated Usar MetaCodigo (V3). Mantener para migración de datos existentes. */
export type MetaCodigoV2 =
  | 'O.A'
  | '1.A' | '1.B' | '1.C'
  | '2.A' | '2.B' | '2.C'
  | '3.A' | '3.B' | '3.C'
  | '4.A' | '4.B' | '4.C'
  | '5.A' | '5.B' | '5.C'
  | '6.A' | '6.B' | '6.C'
  | '7.A' | '7.B' | '7.C'
  | '8.A' | '8.B' | '8.C' | '8.D'
  | '9.A' | '9.B' | '9.C' | '9.D'
  | '10.A' | '10.B' | '10.C' | '10.D';

export interface HojaDeRutaItem {
  id: string;
  usuario_id: string;
  pilar_id: PilarId;
  meta_codigo: MetaCodigo;
  completada: boolean;
  es_estrella: boolean;
  output_generado?: Record<string, unknown>;
  fecha_completada?: string;
  created_at: string;
  /** @deprecated Usar pilar_id */
  pilar_numero?: number;
}

/** @deprecated Usar HojaDeRutaItem (V3). Mantener para migración. */
export interface HojaDeRutaItemV2 {
  id: string;
  usuario_id: string;
  pilar_numero: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  meta_codigo: MetaCodigoV2;
  completada: boolean;
  es_estrella: boolean;
  output_generado?: Record<string, unknown>;
  fecha_completada?: string;
  created_at: string;
}

export interface VentaRegistrada {
  id: string;
  usuario_id: string;
  fecha: string;
  monto?: number;
  canal?: 'DM' | 'email' | 'llamada' | 'referido';
  protocolo_cierre_generado?: string;
  created_at: string;
}

export interface HerramientaOutput {
  id: string;
  usuario_id: string;
  herramienta_id: string; // 'A1', 'A2', 'B1', etc.
  output: Record<string, unknown>;
  version: number;
  created_at: string;
  updated_at: string;
}

/** @deprecated Usar DiarioEntradaV3. */
export interface DiarioEntradaV2 extends DiarioEntrada {
  energia_nivel?: number; // 1-10
  emocion?: string;
  pensamiento_dominante?: string;
  aprendizaje?: string;
  accion_manana?: string;
  modulo_energetico?: {
    durmio_bien: boolean;
    comio_bien: boolean;
    movio_cuerpo: boolean;
    aire_libre: boolean;
  };
  respuestas: {
    q1: string;
    q2: string;
    q3: number;
    q4: string;
    q5: string;
    q6?: string;
    q7?: string;
  };
}

export interface DiarioEntradaV3 {
  id: string;
  user_id: string;
  fecha: string;
  // Preguntas base (siempre)
  tarea_completada: boolean;
  energia_nivel: number; // 1-10
  bloqueo?: string;
  momento_importante: string;
  // Preguntas condicionales (día 45+)
  tomo_llamadas?: boolean;
  cantidad_llamadas?: number;
  cerro_alguna?: boolean;
  objecion_inesperada?: string;
  created_at?: string;
}

export interface ProgramaVideo {
  id: string;
  grupo: 'A' | 'B' | 'C' | 'D' | 'E';
  titulo: string;
  descripcion: string;
  youtube_url: string;
  duracion?: string;
  created_at: string;
}

export type SemaforoColor = 'verde' | 'amarillo' | 'rojo' | 'gris';

export type NivelNombre =
  | 'Sanador Despierto'
  | 'Sanador Narrado'
  | 'Sanador Posicionado'
  | 'Sanador Activo'
  | 'Sanador Libre';

export const NIVEL_NOMBRES: Record<1 | 2 | 3 | 4 | 5, NivelNombre> = {
  1: 'Sanador Despierto',
  2: 'Sanador Narrado',
  3: 'Sanador Posicionado',
  4: 'Sanador Activo',
  5: 'Sanador Libre',
};

export interface NivelMeta {
  nombre: NivelNombre;
  triggerPilar: PilarId;
  descripcion: string;
  requiere10K?: boolean;
}

/** Metadata v7 de cada nivel: trigger de desbloqueo + descripción. */
export const NIVEL_METADATA: Record<1 | 2 | 3 | 4 | 5, NivelMeta> = {
  1: {
    nombre: 'Sanador Despierto',
    triggerPilar: 'P0',
    descripcion: 'Completó el onboarding. Tiene el ADN iniciado y sabe que hay un camino.',
  },
  2: {
    nombre: 'Sanador Narrado',
    triggerPilar: 'P3',
    descripcion: 'Tiene historia, propósito y legado documentados. Puede responder "¿por qué vos?" en 30 segundos.',
  },
  3: {
    nombre: 'Sanador Posicionado',
    triggerPilar: 'P8',
    descripcion: 'ADN completo. Micronicho, PUV, método propio y escalera de ofertas armada.',
  },
  4: {
    nombre: 'Sanador Activo',
    triggerPilar: 'P9A',
    descripcion: 'Infraestructura corriendo: landing, Skool, Meta Ads. El embudo empieza a respirar.',
  },
  5: {
    nombre: 'Sanador Libre',
    triggerPilar: 'P11',
    descripcion: 'Cerró el primer ciclo de $10K. Sistema funcionando sin depender 100% de él.',
    requiere10K: true,
  },
};

/** @deprecated Usar NIVEL_UMBRALES_V3. */
export const NIVEL_UMBRALES: Record<1 | 2 | 3 | 4 | 5, number[]> = {
  1: [0, 1],
  2: [2, 3, 4],
  3: [5, 6, 7],
  4: [8, 9],
  5: [10],
};

export const NIVEL_UMBRALES_V3: Record<1 | 2 | 3 | 4 | 5, PilarId[]> = {
  1: ['P0'],                               // post P0 · Onboarding
  2: ['P1', 'P2', 'P3'],                   // post P3 · Historia + Propósito + Legado
  3: ['P4', 'P5', 'P6', 'P7', 'P8'],       // post P8 · Avatar + Nicho + Matriz + Método + Ofertas
  4: ['P9A'],                              // post P9A · Infraestructura
  5: ['P9B', 'P9C', 'P10', 'P11'],         // post P11 + $10K · Captación + Seguimiento + Identidad + Análisis
};

export const PILAR_ORDER: PilarId[] = [
  'P0', 'P1', 'P2', 'P3', 'P4', 'P5', 'P6', 'P7', 'P8',
  'P9A', 'P9B', 'P9C', 'P10', 'P11',
];

/** Mapeo de MetaCodigo V2 → V3 para migración de datos existentes */
export const MIGRATION_MAP_V2_TO_V3: Record<string, MetaCodigo> = {
  'O.A': 'P0.2',
  '1.A': 'P1.1',  '1.B': 'P1.3',  '1.C': 'P1.4',
  '2.A': 'P2.1',  '2.B': 'P2.3',  '2.C': 'P2.4',
  '3.A': 'P3.1',  '3.B': 'P3.3',  '3.C': 'P3.4',
  '4.A': 'P4.1',  '4.B': 'P4.3',  '4.C': 'P4.4',
  '5.A': 'P5.1',  '5.B': 'P5.2',  '5.C': 'P5.3',
  '6.A': 'P6.1',  '6.B': 'P6.3',  '6.C': 'P6.4',
  '7.A': 'P7.1',  '7.B': 'P7.3',  '7.C': 'P7.4',
  '8.A': 'P8.1',  '8.B': 'P8.2',  '8.C': 'P8.3',  '8.D': 'P8.4',
  '9.A': 'P9A.2', '9.B': 'P9B.2', '9.C': 'P9B.4', '9.D': 'P9C.2',
  '10.A': 'P10.1', '10.B': 'P10.2', '10.C': 'P10.2', '10.D': 'P10.3',
};

/** Mapeo de PilarNumero V2 → PilarId V3 para migración */
export const PILAR_MIGRATION_MAP: Record<number, PilarId> = {
  0: 'P0', 1: 'P1', 2: 'P2', 3: 'P3', 4: 'P4', 5: 'P5',
  6: 'P6', 7: 'P7', 8: 'P8', 9: 'P9A', 10: 'P10',
};

// ─── Admin Task Pipeline ─────────────────────────────────────────────────────

export type AdminTareaStatus =
  | 'por_hacer'
  | 'en_proceso'
  | 'en_revision'
  | 'completadas';

export type AdminTareaPrioridad = 'baja' | 'media' | 'alta' | 'urgente';

export interface AdminTarea {
  id: string;
  titulo: string;
  descripcion: string | null;
  asignado_a: string | null;
  creado_por: string;
  cliente_id: string | null;
  prioridad: AdminTareaPrioridad;
  fecha_vencimiento: string | null;
  status: AdminTareaStatus;
  completada_at: string | null;
  created_at: string;
  updated_at: string;
  // Joined fields (optional, populated by RPC get_admin_tareas_with_users)
  asignado_nombre?: string | null;
  cliente_nombre?: string | null;
  creador_nombre?: string | null;
}

export const ADMIN_TAREA_STATUSES: AdminTareaStatus[] = [
  'por_hacer', 'en_proceso', 'en_revision', 'completadas',
];

export const ADMIN_TAREA_STATUS_LABELS: Record<AdminTareaStatus, string> = {
  por_hacer: 'Por hacer',
  en_proceso: 'En proceso',
  en_revision: 'En revisión',
  completadas: 'Completadas',
};

export const ADMIN_TAREA_PRIORIDAD_LABELS: Record<AdminTareaPrioridad, string> = {
  baja: 'Baja',
  media: 'Media',
  alta: 'Alta',
  urgente: 'Urgente',
};

// ─── Re-export tipos de Campañas & Creativos ─────────────────────────────────
export type {
  Campana,
  Creativo,
  CreativoAsset,
  ObjetivoCampana,
  AnguloCreativo,
  TipoCreativo,
  EstadoCampana,
  EstadoCreativo,
  CopyGenerado,
} from './campanasTypes';

// ─── Fetch ProfileV2 completo ────────────────────────────────────────────────

export async function fetchProfileV2(userId: string): Promise<ProfileV2 | null> {
  if (!supabase) return null;
  // Use RPC to bypass RLS (admin reading other users' profiles)
  const { data, error } = await supabase.rpc('get_all_profiles');
  if (error || !data) return null;
  const profile = (data as ProfileV2[]).find((p) => p.id === userId);
  return profile ?? null;
}
