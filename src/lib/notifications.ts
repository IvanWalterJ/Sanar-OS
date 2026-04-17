import { supabase, isSupabaseReady } from './supabase';

// ─── Tipos ──────────────────────────────────────────────────────────────────────

export type TipoNotificacion = 'hito' | 'tarea' | 'mensaje' | 'sistema' | 'admin';

export interface NotificacionDB {
  id: string;
  usuario_id: string;
  tipo: TipoNotificacion;
  titulo: string;
  descripcion?: string;
  leida: boolean;
  accion_url?: string;
  created_at: string;
}

export interface CrearNotificacionInput {
  usuario_id: string;
  tipo: TipoNotificacion;
  titulo: string;
  descripcion?: string;
  accion_url?: string;
}

const QUEUE_KEY = 'tcd_notif_queue';

// ─── Cola offline (localStorage) ────────────────────────────────────────────────

function leerColaOffline(): CrearNotificacionInput[] {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CrearNotificacionInput[];
  } catch {
    return [];
  }
}

function guardarEnCola(input: CrearNotificacionInput): void {
  const cola = leerColaOffline();
  localStorage.setItem(QUEUE_KEY, JSON.stringify([...cola, input]));
}

function limpiarCola(): void {
  localStorage.removeItem(QUEUE_KEY);
}

// ─── Función core ───────────────────────────────────────────────────────────────

export async function crearNotificacion(input: CrearNotificacionInput): Promise<void> {
  if (!isSupabaseReady() || !supabase) {
    guardarEnCola(input);
    return;
  }

  // Flush any queued notifications first
  const cola = leerColaOffline();
  if (cola.length > 0) {
    const inserciones = cola.map((item) => ({
      usuario_id: item.usuario_id,
      tipo: item.tipo,
      titulo: item.titulo,
      descripcion: item.descripcion ?? null,
      accion_url: item.accion_url ?? null,
      leida: false,
    }));

    await supabase.from('notificaciones').insert(inserciones);
    limpiarCola();
  }

  const { error } = await supabase.from('notificaciones').insert({
    usuario_id: input.usuario_id,
    tipo: input.tipo,
    titulo: input.titulo,
    descripcion: input.descripcion ?? null,
    accion_url: input.accion_url ?? null,
    leida: false,
  });

  if (error) {
    guardarEnCola(input);
  }
}

// ─── Notificaciones de equipo ───────────────────────────────────────────────────

export async function notificarTareaAsignada(
  assignedToId: string,
  tituloTarea: string,
  asignadoPorNombre: string,
): Promise<void> {
  await crearNotificacion({
    usuario_id: assignedToId,
    tipo: 'tarea',
    titulo: 'Nueva tarea asignada',
    descripcion: `${asignadoPorNombre} te asignó: "${tituloTarea}"`,
    accion_url: '/admin?tab=tareas',
  });
}

// ─── Notificaciones de cliente ──────────────────────────────────────────────────

export async function notificarPilarCompletado(
  userId: string,
  pilarTitulo: string,
  pilarNumero: number,
): Promise<void> {
  await crearNotificacion({
    usuario_id: userId,
    tipo: 'hito',
    titulo: `Pilar ${pilarNumero} completado`,
    descripcion: `Felicidades, completaste "${pilarTitulo}". Sigue avanzando en tu transformacion.`,
    accion_url: '/hoja-de-ruta',
  });
}

export async function notificarPilarDesbloqueado(
  userId: string,
  pilarTitulo: string,
): Promise<void> {
  await crearNotificacion({
    usuario_id: userId,
    tipo: 'hito',
    titulo: 'Nuevo pilar desbloqueado',
    descripcion: `Ya puedes comenzar "${pilarTitulo}". Revisa tu hoja de ruta.`,
    accion_url: '/hoja-de-ruta',
  });
}

export async function notificarRecordatorioDiario(userId: string): Promise<void> {
  await crearNotificacion({
    usuario_id: userId,
    tipo: 'tarea',
    titulo: 'Completa tu diario de hoy',
    descripcion: 'Registrar tu dia te ayuda a mantener el ritmo y la claridad.',
    accion_url: '/diario',
  });
}

export async function notificarMetricasSemanal(userId: string): Promise<void> {
  await crearNotificacion({
    usuario_id: userId,
    tipo: 'tarea',
    titulo: 'Registra tus metricas semanales',
    descripcion: 'Es domingo. Actualiza tus numeros para ver tu progreso real.',
    accion_url: '/metricas',
  });
}

export async function notificarAlertaDia45(userId: string): Promise<void> {
  await crearNotificacion({
    usuario_id: userId,
    tipo: 'sistema',
    titulo: 'Dia 45: Mitad de camino',
    descripcion: 'Llevas la mitad del programa. Es momento de revisar tu avance y acelerar.',
    accion_url: '/hoja-de-ruta',
  });
}

export async function notificarMensajeAdmin(
  userId: string,
  adminNombre: string,
): Promise<void> {
  await crearNotificacion({
    usuario_id: userId,
    tipo: 'mensaje',
    titulo: `Nuevo mensaje de ${adminNombre}`,
    descripcion: 'Tienes un mensaje nuevo en tu bandeja privada.',
    accion_url: '/mensajes',
  });
}

export async function notificarEnergiBaja(
  userId: string,
  promedio: number,
): Promise<void> {
  await crearNotificacion({
    usuario_id: userId,
    tipo: 'sistema',
    titulo: 'Tu energia ha estado baja',
    descripcion: `Tu promedio de energia en los ultimos 7 dias es ${promedio.toFixed(1)}/10. Revisa tu modulo energetico.`,
    accion_url: '/diario',
  });
}

// ─── Notificaciones de admin ────────────────────────────────────────────────────

export async function notificarNuevoCliente(
  adminId: string,
  clienteNombre: string,
): Promise<void> {
  await crearNotificacion({
    usuario_id: adminId,
    tipo: 'admin',
    titulo: 'Nuevo cliente registrado',
    descripcion: `${clienteNombre} se ha unido al programa.`,
    accion_url: '/admin/clientes',
  });
}

export async function notificarClienteInactivo(
  adminId: string,
  clienteNombre: string,
  diasInactivo: number,
): Promise<void> {
  await crearNotificacion({
    usuario_id: adminId,
    tipo: 'admin',
    titulo: 'Cliente inactivo',
    descripcion: `${clienteNombre} lleva ${diasInactivo} dias sin actividad.`,
    accion_url: '/admin/clientes',
  });
}

export async function notificarProgresoCliente(
  adminId: string,
  clienteNombre: string,
  pilarTitulo: string,
): Promise<void> {
  await crearNotificacion({
    usuario_id: adminId,
    tipo: 'admin',
    titulo: 'Progreso de cliente',
    descripcion: `${clienteNombre} completo el pilar "${pilarTitulo}".`,
    accion_url: '/admin/clientes',
  });
}

export async function notificarMensajeCliente(
  adminId: string,
  clienteNombre: string,
): Promise<void> {
  await crearNotificacion({
    usuario_id: adminId,
    tipo: 'mensaje',
    titulo: `Mensaje de ${clienteNombre}`,
    descripcion: `${clienteNombre} te ha enviado un mensaje.`,
    accion_url: '/admin/mensajes',
  });
}

// ─── Consultas ──────────────────────────────────────────────────────────────────

export async function obtenerNotificaciones(
  userId: string,
  limit: number = 20,
): Promise<NotificacionDB[]> {
  if (!isSupabaseReady() || !supabase) {
    return [];
  }

  const { data, error } = await supabase
    .from('notificaciones')
    .select('*')
    .eq('usuario_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !data) {
    return [];
  }

  return data as NotificacionDB[];
}

export async function marcarLeida(notifId: string): Promise<void> {
  if (!isSupabaseReady() || !supabase) {
    return;
  }

  await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('id', notifId);
}

export async function marcarTodasLeidas(userId: string): Promise<void> {
  if (!isSupabaseReady() || !supabase) {
    return;
  }

  await supabase
    .from('notificaciones')
    .update({ leida: true })
    .eq('usuario_id', userId)
    .eq('leida', false);
}

export async function contarNoLeidas(userId: string): Promise<number> {
  if (!isSupabaseReady() || !supabase) {
    return 0;
  }

  const { count, error } = await supabase
    .from('notificaciones')
    .select('*', { count: 'exact', head: true })
    .eq('usuario_id', userId)
    .eq('leida', false);

  if (error || count === null) {
    return 0;
  }

  return count;
}
