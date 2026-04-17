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

interface TareaFilters {
  status?: AdminTareaStatus;
  asignado_a?: string;
  cliente_id?: string;
}

export async function fetchAdminTareas(filters?: TareaFilters): Promise<AdminTarea[]> {
  if (!supabase) return [];
  let query = supabase
    .from('admin_tareas')
    .select('*')
    .order('created_at', { ascending: false });

  if (filters?.status) query = query.eq('status', filters.status);
  if (filters?.asignado_a) query = query.eq('asignado_a', filters.asignado_a);
  if (filters?.cliente_id) query = query.eq('cliente_id', filters.cliente_id);

  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []) as AdminTarea[];
}

export async function fetchTareasHoy(adminId: string): Promise<AdminTarea[]> {
  if (!supabase) return [];
  const hoy = new Date().toISOString().split('T')[0];
  const { data, error } = await supabase
    .from('admin_tareas')
    .select('*')
    .eq('asignado_a', adminId)
    .lte('fecha_vencimiento', hoy)
    .not('status', 'in', '("completadas","aprobadas")')
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
