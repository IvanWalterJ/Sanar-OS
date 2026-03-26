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

export interface Profile {
  id: string;
  nombre: string;
  email: string;
  especialidad?: string;
  fecha_inicio: string; // date as string YYYY-MM-DD
  plan: 'DWY' | 'DFY';
  rol: 'cliente' | 'admin';
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
