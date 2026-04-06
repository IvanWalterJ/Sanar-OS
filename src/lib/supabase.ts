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
}

export interface AdminNote {
  id: string;
  client_id: string;
  author_id: string;
  content: string;
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

export interface MetricaSemana {
  id: string;
  user_id: string;
  semana: string;
  leads: number;
  conversaciones: number;
  ventas: number;
  created_at: string;
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
}

export type MetaCodigo =
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
  pilar_numero: 0 | 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;
  meta_codigo: MetaCodigo;
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
    q1: string;  // ¿Cómo te sentiste hoy? (texto libre)
    q2: string;  // ¿Qué te frenó hoy?
    q3: number;  // energía 1-10 (legacy, usar energia_nivel)
    q4: string;  // ¿Qué acción tomaste?
    q5: string;  // ¿Qué pensamiento dominante?
    q6?: string; // ¿Qué emoción fue predominante?
    q7?: string; // ¿Qué vas a hacer mañana?
  };
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
  | 'El Sanador Despierto'
  | 'El Especialista Claro'
  | 'El Creador de Presencia'
  | 'El Arquitecto de Ventas'
  | 'El Emprendedor Libre';

export const NIVEL_NOMBRES: Record<1 | 2 | 3 | 4 | 5, NivelNombre> = {
  1: 'El Sanador Despierto',
  2: 'El Especialista Claro',
  3: 'El Creador de Presencia',
  4: 'El Arquitecto de Ventas',
  5: 'El Emprendedor Libre',
};

export const NIVEL_UMBRALES: Record<1 | 2 | 3 | 4 | 5, number[]> = {
  1: [0, 1],        // Onboarding + Historia
  2: [2, 3, 4],     // Propósito + Legado + Avatar
  3: [5, 6, 7],     // Nicho/USP + Matriz A→B→C + Método
  4: [8, 9],        // Escalera de Ofertas + Sistemas
  5: [10],          // Identidad Visual
};
