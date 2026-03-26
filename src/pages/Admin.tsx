import React, { useState, useEffect } from 'react';
import {
  Users, Send, ChevronRight, X, Plus, Loader2,
  Stethoscope, CheckCircle2, Circle, LogOut,
  MessageSquare, BookOpen, BarChart2, Calendar,
  Flame, TrendingUp, TrendingDown, Minus
} from 'lucide-react';
import { supabase, type Profile, type TareaUsuario, type DiarioEntrada, type MetricaSemana, type Mensaje } from '../lib/supabase';
import { toast } from 'sonner';

interface AdminProps {
  adminProfile: Profile;
  onSignOut: () => void;
}

interface ClienteConEstado extends Profile {
  ultima_actividad?: string;
  dia_programa: number;
  semaforo: 'verde' | 'amarillo' | 'rojo' | 'gris';
  tareas_completadas: number;
  tareas_total: number;
}

type DetalleTab = 'roadmap' | 'diario' | 'metricas' | 'mensajes';

function calcDiaPrograma(fecha_inicio: string): number {
  const inicio = new Date(fecha_inicio);
  const hoy = new Date();
  const diff = Math.floor((hoy.getTime() - inicio.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(1, Math.min(90, diff + 1));
}

function calcSemaforo(metricas: MetricaSemana[]): 'verde' | 'amarillo' | 'rojo' | 'gris' {
  if (metricas.length < 2) return 'gris';
  const cur = metricas[metricas.length - 1];
  const prev = metricas[metricas.length - 2];
  const totalCur = cur.leads + cur.conversaciones + cur.ventas;
  const totalPrev = prev.leads + prev.conversaciones + prev.ventas;
  if (totalPrev === 0) return totalCur > 0 ? 'verde' : 'gris';
  const pct = ((totalCur - totalPrev) / totalPrev) * 100;
  if (pct > 5) return 'verde';
  if (pct >= -5) return 'amarillo';
  return 'rojo';
}

const SEMAFORO_STYLES: Record<string, string> = {
  verde: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]',
  amarillo: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]',
  rojo: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]',
  gris: 'bg-gray-600',
};

export default function Admin({ adminProfile, onSignOut }: AdminProps) {
  const [clientes, setClientes] = useState<ClienteConEstado[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCliente, setSelectedCliente] = useState<ClienteConEstado | null>(null);
  const [detalleTab, setDetalleTab] = useState<DetalleTab>('roadmap');
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);

  // Detalle data
  const [detalleTareas, setDetalleTareas] = useState<TareaUsuario[]>([]);
  const [detalleDiario, setDetalleDiario] = useState<DiarioEntrada[]>([]);
  const [detalleMetricas, setDetalleMetricas] = useState<MetricaSemana[]>([]);
  const [detalleMensajes, setDetalleMensajes] = useState<Mensaje[]>([]);
  const [mensajeInput, setMensajeInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);

  // Nuevo cliente form
  const [nuevoForm, setNuevoForm] = useState({
    nombre: '', email: '', especialidad: '', plan: 'DWY' as 'DWY' | 'DFY',
    fecha_inicio: new Date().toISOString().split('T')[0]
  });
  const [creando, setCreando] = useState(false);

  useEffect(() => {
    cargarClientes();
  }, []);

  useEffect(() => {
    if (selectedCliente) {
      cargarDetalleCliente(selectedCliente.id);
    }
  }, [selectedCliente, detalleTab]);

  async function cargarClientes() {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: profiles } = await supabase
        .from('profiles')
        .select('*')
        .eq('rol', 'cliente')
        .order('created_at', { ascending: false });

      if (!profiles) { setLoading(false); return; }

      // Para cada cliente, cargar sus métricas y tareas para el semáforo
      const clientesConEstado = await Promise.all(profiles.map(async (p) => {
        const [tareasRes, metricasRes, diarioRes] = await Promise.all([
          supabase.from('tareas_usuario').select('estado').eq('user_id', p.id),
          supabase.from('metricas').select('*').eq('user_id', p.id).order('semana'),
          supabase.from('diario_entradas').select('fecha').eq('user_id', p.id).order('fecha', { ascending: false }).limit(1),
        ]);

        const tareas = tareasRes.data ?? [];
        const metricas = metricasRes.data ?? [];
        const ultimaEntrada = diarioRes.data?.[0]?.fecha;

        return {
          ...p,
          dia_programa: calcDiaPrograma(p.fecha_inicio),
          semaforo: calcSemaforo(metricas as MetricaSemana[]),
          tareas_completadas: tareas.filter(t => t.estado === 'completada').length,
          tareas_total: tareas.length,
          ultima_actividad: ultimaEntrada,
        } as ClienteConEstado;
      }));

      setClientes(clientesConEstado);
    } catch (e) {
      toast.error('Error cargando clientes');
    } finally {
      setLoading(false);
    }
  }

  async function cargarDetalleCliente(userId: string) {
    if (!supabase) return;
    setDetalleLoading(true);
    try {
      if (detalleTab === 'roadmap') {
        const { data } = await supabase
          .from('tareas_usuario')
          .select('*, tarea:tareas_template(*)')
          .eq('user_id', userId)
          .order('tarea(orden)');
        setDetalleTareas((data as TareaUsuario[]) ?? []);
      } else if (detalleTab === 'diario') {
        const { data } = await supabase
          .from('diario_entradas')
          .select('*')
          .eq('user_id', userId)
          .order('fecha', { ascending: false })
          .limit(10);
        setDetalleDiario((data as DiarioEntrada[]) ?? []);
      } else if (detalleTab === 'metricas') {
        const { data } = await supabase
          .from('metricas')
          .select('*')
          .eq('user_id', userId)
          .order('semana');
        setDetalleMetricas((data as MetricaSemana[]) ?? []);
      } else if (detalleTab === 'mensajes') {
        const { data } = await supabase
          .from('mensajes')
          .select('*, emisor:profiles!emisor_id(nombre, rol)')
          .or(`emisor_id.eq.${userId},receptor_id.eq.${userId}`)
          .eq('canal', 'privado')
          .order('created_at');
        setDetalleMensajes((data as Mensaje[]) ?? []);
      }
    } catch {
      /* noop */
    } finally {
      setDetalleLoading(false);
    }
  }

  async function enviarMensaje() {
    if (!supabase || !selectedCliente || !mensajeInput.trim()) return;
    setEnviando(true);
    try {
      const { error } = await supabase.from('mensajes').insert({
        canal: 'privado',
        emisor_id: adminProfile.id,
        receptor_id: selectedCliente.id,
        contenido: mensajeInput.trim(),
      });
      if (error) throw error;
      setMensajeInput('');
      toast.success('Mensaje enviado');
      await cargarDetalleCliente(selectedCliente.id);
    } catch {
      toast.error('Error enviando mensaje');
    } finally {
      setEnviando(false);
    }
  }

  async function crearCliente() {
    if (!supabase || !nuevoForm.email || !nuevoForm.nombre) return;
    setCreando(true);
    try {
      // Llamar a Edge Function que usa service_role para crear el usuario y enviar el invite
      const { error } = await supabase.functions.invoke('invite-user', {
        body: nuevoForm
      });
      if (error) throw error;
      toast.success(`Invitación enviada a ${nuevoForm.email}`);
      setShowNuevoCliente(false);
      setNuevoForm({ nombre: '', email: '', especialidad: '', plan: 'DWY', fecha_inicio: new Date().toISOString().split('T')[0] });
      await cargarClientes();
    } catch (e: unknown) {
      const message = e instanceof Error ? e.message : 'Error desconocido';
      toast.error(`Error: ${message}`);
    } finally {
      setCreando(false);
    }
  }

  return (
    <div className="min-h-screen bg-[#0B0F19] text-white font-sans">
      {/* Background */}
      <div className="fixed top-[-20%] left-[-10%] w-[50%] h-[50%] rounded-full bg-blue-600/15 blur-[120px] pointer-events-none" />
      <div className="fixed bottom-[-20%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-600/15 blur-[120px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/10 bg-white/[0.02] backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">Tu Clínica Digital</h1>
              <p className="text-xs text-blue-400">Panel de Administración</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-gray-500">Hola, {adminProfile.nombre}</span>
            <button
              onClick={onSignOut}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:text-white hover:bg-white/5 transition-colors"
            >
              <LogOut className="w-3.5 h-3.5" /> Salir
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { label: 'Clientes activos', value: clientes.length, icon: Users, color: 'text-blue-400' },
            { label: 'En buen progreso', value: clientes.filter(c => c.semaforo === 'verde').length, icon: TrendingUp, color: 'text-emerald-400' },
            { label: 'Necesitan atención', value: clientes.filter(c => c.semaforo === 'rojo').length, icon: TrendingDown, color: 'text-red-400' },
          ].map(stat => (
            <div key={stat.label} className="bg-white/[0.04] border border-white/10 rounded-2xl p-5">
              <div className="flex items-center gap-3">
                <stat.icon className={`w-5 h-5 ${stat.color}`} />
                <div>
                  <p className="text-2xl font-light text-white">{stat.value}</p>
                  <p className="text-xs text-gray-500">{stat.label}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Main content: lista + detalle */}
        <div className="flex gap-6">
          {/* Lista de clientes */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-sm font-medium text-gray-300">Clientes ({clientes.length})</h2>
              <button
                onClick={() => setShowNuevoCliente(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-500/20 hover:bg-blue-500/30 text-blue-400 text-xs font-medium transition-colors border border-blue-500/30"
              >
                <Plus className="w-3.5 h-3.5" /> Nuevo cliente
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-6 h-6 text-blue-400 animate-spin" />
              </div>
            ) : clientes.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-10 h-10 text-gray-600 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Sin clientes aún</p>
                <button
                  onClick={() => setShowNuevoCliente(true)}
                  className="mt-3 text-blue-400 text-xs hover:text-blue-300 transition-colors"
                >
                  Agregar el primero →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {clientes.map(cliente => (
                  <button
                    key={cliente.id}
                    onClick={() => { setSelectedCliente(cliente); setDetalleTab('roadmap'); }}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedCliente?.id === cliente.id
                        ? 'bg-blue-500/10 border-blue-500/30'
                        : 'bg-white/[0.03] border-white/8 hover:bg-white/[0.06] hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-9 h-9 rounded-full bg-gradient-to-br from-blue-500/30 to-purple-500/30 flex items-center justify-center text-sm font-medium text-white shrink-0">
                        {cliente.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-white truncate">{cliente.nombre}</span>
                          <span className="text-xs text-gray-500 shrink-0">{cliente.plan}</span>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-gray-500">Día {cliente.dia_programa}/90</span>
                          {cliente.especialidad && (
                            <span className="text-xs text-gray-600 truncate">{cliente.especialidad}</span>
                          )}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full ${SEMAFORO_STYLES[cliente.semaforo]}`} />
                        <ChevronRight className="w-3.5 h-3.5 text-gray-600" />
                      </div>
                    </div>
                    {/* Progress bar */}
                    {cliente.tareas_total > 0 && (
                      <div className="mt-2.5 h-1 bg-white/10 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full"
                          style={{ width: `${Math.round((cliente.tareas_completadas / cliente.tareas_total) * 100)}%` }}
                        />
                      </div>
                    )}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Panel de detalle */}
          {selectedCliente && (
            <div className="w-[480px] shrink-0 bg-white/[0.03] border border-white/10 rounded-2xl overflow-hidden flex flex-col" style={{ maxHeight: 'calc(100vh - 220px)' }}>
              {/* Header detalle */}
              <div className="p-5 border-b border-white/10 flex items-start justify-between">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="text-base font-medium text-white">{selectedCliente.nombre}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${selectedCliente.plan === 'DFY' ? 'bg-purple-500/20 text-purple-400' : 'bg-blue-500/20 text-blue-400'}`}>
                      {selectedCliente.plan}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{selectedCliente.email}</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Día {selectedCliente.dia_programa} de 90
                    {selectedCliente.especialidad ? ` · ${selectedCliente.especialidad}` : ''}
                  </p>
                </div>
                <button onClick={() => setSelectedCliente(null)} className="text-gray-500 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/10 px-5">
                {([
                  { id: 'roadmap' as DetalleTab, label: 'Hoja de Ruta', icon: BookOpen },
                  { id: 'diario' as DetalleTab, label: 'Diario', icon: Calendar },
                  { id: 'metricas' as DetalleTab, label: 'Métricas', icon: BarChart2 },
                  { id: 'mensajes' as DetalleTab, label: 'Mensajes', icon: MessageSquare },
                ]).map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDetalleTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-3 text-xs font-medium border-b-2 transition-colors ${
                      detalleTab === tab.id
                        ? 'border-blue-400 text-blue-400'
                        : 'border-transparent text-gray-500 hover:text-gray-300'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Tab content */}
              <div className="flex-1 overflow-y-auto p-5">
                {detalleLoading ? (
                  <div className="flex items-center justify-center py-10">
                    <Loader2 className="w-5 h-5 text-blue-400 animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* Roadmap tab */}
                    {detalleTab === 'roadmap' && (
                      <div className="space-y-2">
                        {detalleTareas.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-8">Sin tareas registradas</p>
                        ) : (
                          detalleTareas.map(t => (
                            <div key={t.id} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.03]">
                              {t.estado === 'completada' ? (
                                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                              ) : t.estado === 'activa' ? (
                                <Circle className="w-4 h-4 text-blue-400 fill-blue-400/20 shrink-0" />
                              ) : (
                                <Circle className="w-4 h-4 text-gray-600 shrink-0" />
                              )}
                              <div className="flex-1 min-w-0">
                                <p className={`text-xs font-medium ${t.estado === 'completada' ? 'text-gray-500 line-through' : 'text-white'}`}>
                                  {t.tarea?.titulo ?? 'Tarea'}
                                </p>
                                {t.tarea?.descripcion && (
                                  <p className="text-xs text-gray-600 mt-0.5 truncate">{t.tarea.descripcion}</p>
                                )}
                              </div>
                              <span className={`text-xs shrink-0 px-1.5 py-0.5 rounded ${
                                t.estado === 'completada' ? 'text-emerald-600' :
                                t.estado === 'activa' ? 'text-blue-400 bg-blue-500/10' :
                                'text-gray-600'
                              }`}>
                                {t.estado}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Diario tab */}
                    {detalleTab === 'diario' && (
                      <div className="space-y-3">
                        {detalleDiario.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-8">Sin entradas de diario</p>
                        ) : (
                          detalleDiario.map(entrada => (
                            <div key={entrada.id} className="p-4 rounded-xl bg-white/[0.03] border border-white/8">
                              <div className="flex items-center justify-between mb-2">
                                <p className="text-xs font-medium text-white">{entrada.fecha}</p>
                                <div className="flex items-center gap-1">
                                  <Flame className={`w-3 h-3 ${entrada.respuestas.q3 >= 7 ? 'text-amber-400' : 'text-gray-600'}`} />
                                  <span className="text-xs text-gray-500">{entrada.respuestas.q3}/10</span>
                                </div>
                              </div>
                              <p className="text-xs text-gray-400 mb-1"><span className="text-gray-500">Hizo:</span> {entrada.respuestas.q1}</p>
                              {entrada.respuestas.q2 && (
                                <p className="text-xs text-gray-400 mb-1"><span className="text-gray-500">Bloqueó:</span> {entrada.respuestas.q2}</p>
                              )}
                              {entrada.respuestas.q5 && (
                                <p className="text-xs text-gray-400"><span className="text-gray-500">Mañana:</span> {entrada.respuestas.q5}</p>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}

                    {/* Métricas tab */}
                    {detalleTab === 'metricas' && (
                      <div className="space-y-3">
                        {detalleMetricas.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-8">Sin métricas registradas</p>
                        ) : (
                          <>
                            <div className="space-y-2">
                              {detalleMetricas.slice().reverse().map(m => (
                                <div key={m.id} className="flex items-center justify-between p-3 rounded-xl bg-white/[0.03]">
                                  <span className="text-xs text-gray-500">{m.semana}</span>
                                  <div className="flex items-center gap-4">
                                    <span className="text-xs text-gray-300">{m.leads} leads</span>
                                    <span className="text-xs text-gray-300">{m.conversaciones} conv.</span>
                                    <span className="text-xs text-emerald-400 font-medium">{m.ventas} ventas</span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </>
                        )}
                      </div>
                    )}

                    {/* Mensajes tab */}
                    {detalleTab === 'mensajes' && (
                      <div className="space-y-3">
                        {detalleMensajes.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-4">Sin mensajes privados aún</p>
                        ) : (
                          detalleMensajes.map(m => (
                            <div
                              key={m.id}
                              className={`p-3 rounded-xl text-xs max-w-[85%] ${
                                m.emisor_id === adminProfile.id
                                  ? 'ml-auto bg-blue-600/30 text-blue-100'
                                  : 'bg-white/[0.05] text-gray-300'
                              }`}
                            >
                              <p className="leading-relaxed">{m.contenido}</p>
                              <p className="text-[10px] mt-1 opacity-50">
                                {m.emisor_id === adminProfile.id ? 'Tú' : selectedCliente.nombre} · {new Date(m.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Enviar mensaje (siempre visible en la pestaña mensajes) */}
              {detalleTab === 'mensajes' && (
                <div className="p-4 border-t border-white/10">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={mensajeInput}
                      onChange={e => setMensajeInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensaje()}
                      placeholder={`Mensaje a ${selectedCliente.nombre}...`}
                      disabled={enviando}
                      className="flex-1 bg-black/20 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50 transition-all"
                    />
                    <button
                      onClick={enviarMensaje}
                      disabled={!mensajeInput.trim() || enviando}
                      className="w-10 h-10 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 flex items-center justify-center transition-colors"
                    >
                      {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Modal: Nuevo Cliente */}
      {showNuevoCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111827] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-medium text-white">Nuevo Cliente</h3>
              <button onClick={() => setShowNuevoCliente(false)} className="text-gray-500 hover:text-white transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              {[
                { label: 'Nombre completo *', key: 'nombre', type: 'text', placeholder: 'Ej: María González' },
                { label: 'Email *', key: 'email', type: 'email', placeholder: 'maria@ejemplo.com' },
                { label: 'Especialidad', key: 'especialidad', type: 'text', placeholder: 'Ej: Nutricionista' },
              ].map(field => (
                <div key={field.key}>
                  <label className="block text-xs text-gray-400 mb-1">{field.label}</label>
                  <input
                    type={field.type}
                    value={nuevoForm[field.key as keyof typeof nuevoForm]}
                    onChange={e => setNuevoForm({ ...nuevoForm, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-blue-500/50"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs text-gray-400 mb-1">Plan</label>
                <select
                  value={nuevoForm.plan}
                  onChange={e => setNuevoForm({ ...nuevoForm, plan: e.target.value as 'DWY' | 'DFY' })}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                >
                  <option value="DWY">DWY — Do it With You</option>
                  <option value="DFY">DFY — Done For You</option>
                </select>
              </div>

              <div>
                <label className="block text-xs text-gray-400 mb-1">Fecha de inicio del programa</label>
                <input
                  type="date"
                  value={nuevoForm.fecha_inicio}
                  onChange={e => setNuevoForm({ ...nuevoForm, fecha_inicio: e.target.value })}
                  className="w-full bg-black/20 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-blue-500/50"
                />
              </div>
            </div>

            <p className="text-xs text-gray-500 mt-4">
              Se enviará un email al cliente para que configure su contraseña y acceda al programa.
            </p>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowNuevoCliente(false)}
                className="flex-1 py-2.5 rounded-xl border border-white/10 text-sm text-gray-400 hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={crearCliente}
                disabled={creando || !nuevoForm.email || !nuevoForm.nombre}
                className="flex-1 py-2.5 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                {creando ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando...</> : 'Crear y enviar invitación'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
