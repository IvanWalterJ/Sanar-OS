import { supabase } from './supabase';
import type { AdminTarea, AdminTareaStatus, AdminTareaPrioridad } from './supabase';

interface CreateTareaDto {
  titulo: string;
  descripcion?: string;
  asignado_a?: string | null;
  creado_por: string;
  cliente_id?: string | null;
  prioridad?: AdminTareaPrioridad;
  fecha_vencimiento?: string | null;
  status?: AdminTareaStatus;
}

interface UpdateTareaDto {
  titulo?: string;
  descripcion?: string | null;
  asignado_a?: string | null;
  cliente_id?: string | null;
  prioridad?: AdminTareaPrioridad;
  fecha_vencimiento?: string | null;
  status?: AdminTareaStatus;
}

export type TareaScope = 'all' | 'mine' | 'assigned_to_me' | 'created_by_me';

export interface TareaFilters {
  status?: AdminTareaStatus;
  asignado_a?: string;
  creado_por?: string;
  cliente_id?: string;
  /** 'mine' = asignado_a OR creado_por = currentUserId. Requiere currentUserId. */
  scope?: TareaScope;
  currentUserId?: string;
  /** Si true, también devuelve tareas archivadas. Default: false. */
  incluirArchivadas?: boolean;
}

/**
 * Trae tareas con joins a profiles (asignado_nombre, creador_nombre, cliente_nombre)
 * via RPC `get_admin_tareas_with_users`. Aplica filtros en cliente sobre el resultado.
 */
export async function fetchAdminTareas(filters?: TareaFilters): Promise<AdminTarea[]> {
  if (!supabase) return [];

  const { data, error } = await supabase.rpc('get_admin_tareas_with_users', {
    incluir_archivadas: filters?.incluirArchivadas ?? false,
  });
  if (error) throw error;

  let rows = (data ?? []) as AdminTarea[];

  if (filters?.status) {
    rows = rows.filter(t => t.status === filters.status);
  }
  if (filters?.cliente_id) {
    rows = rows.filter(t => t.cliente_id === filters.cliente_id);
  }
  if (filters?.asignado_a) {
    rows = rows.filter(t => t.asignado_a === filters.asignado_a);
  }
  if (filters?.creado_por) {
    rows = rows.filter(t => t.creado_por === filters.creado_por);
  }

  const uid = filters?.currentUserId;
  if (uid) {
    if (filters?.scope === 'mine') {
      rows = rows.filter(t => t.asignado_a === uid || t.creado_por === uid);
    } else if (filters?.scope === 'assigned_to_me') {
      rows = rows.filter(t => t.asignado_a === uid);
    } else if (filters?.scope === 'created_by_me') {
      rows = rows.filter(t => t.creado_por === uid);
    }
  }

  return rows;
}

/**
 * Tareas con vencimiento ≤ hoy donde el usuario es asignado O creador.
 * Excluye tareas completadas.
 */
export async function fetchTareasHoy(adminId: string): Promise<AdminTarea[]> {
  if (!supabase) return [];
  const hoy = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('admin_tareas')
    .select('*')
    .or(`asignado_a.eq.${adminId},creado_por.eq.${adminId}`)
    .lte('fecha_vencimiento', hoy)
    .neq('status', 'completadas')
    .order('fecha_vencimiento', { ascending: true });
  if (error) throw error;
  return (data ?? []) as AdminTarea[];
}

export async function createAdminTarea(dto: CreateTareaDto): Promise<AdminTarea> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('admin_tareas')
    .insert({
      titulo: dto.titulo,
      descripcion: dto.descripcion ?? null,
      asignado_a: dto.asignado_a ?? null,
      creado_por: dto.creado_por,
      cliente_id: dto.cliente_id ?? null,
      prioridad: dto.prioridad ?? 'media',
      fecha_vencimiento: dto.fecha_vencimiento ?? null,
      status: dto.status ?? 'por_hacer',
    })
    .select()
    .single();
  if (error) throw error;
  return data as AdminTarea;
}

export async function updateAdminTarea(id: string, dto: UpdateTareaDto): Promise<AdminTarea> {
  if (!supabase) throw new Error('Supabase not configured');
  const { data, error } = await supabase
    .from('admin_tareas')
    .update({ ...dto })
    .eq('id', id)
    .select()
    .single();
  if (error) throw error;
  return data as AdminTarea;
}

export async function updateAdminTareaStatus(id: string, status: AdminTareaStatus): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const patch: Record<string, unknown> = { status };
  if (status === 'completadas') patch.completada_at = new Date().toISOString();
  const { error } = await supabase.from('admin_tareas').update(patch).eq('id', id);
  if (error) throw error;
}

export async function deleteAdminTarea(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase.from('admin_tareas').delete().eq('id', id);
  if (error) throw error;
}

/** Archiva una tarea — la oculta de las vistas por defecto sin borrarla. */
export async function archivarAdminTarea(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('admin_tareas')
    .update({ archivada_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw error;
}

/** Desarchiva una tarea — vuelve a aparecer en vistas activas. */
export async function desarchivarAdminTarea(id: string): Promise<void> {
  if (!supabase) throw new Error('Supabase not configured');
  const { error } = await supabase
    .from('admin_tareas')
    .update({ archivada_at: null })
    .eq('id', id);
  if (error) throw error;
}

/**
 * Archiva en bulk todas las tareas con status 'completadas' que no estén ya archivadas.
 * Devuelve la cantidad archivada.
 */
export async function archivarTodasCompletadas(): Promise<number> {
  if (!supabase) throw new Error('Supabase not configured');
  const now = new Date().toISOString();
  const { data, error } = await supabase
    .from('admin_tareas')
    .update({ archivada_at: now })
    .eq('status', 'completadas')
    .is('archivada_at', null)
    .select('id');
  if (error) throw error;
  return (data ?? []).length;
}
