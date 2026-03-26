import React, { useState, useEffect, useRef } from 'react';
import {
  Users, Send, ChevronRight, X, Plus, Loader2,
  Stethoscope, CheckCircle2, Circle, LogOut,
  MessageSquare, BookOpen, BarChart2, Calendar,
  TrendingUp, TrendingDown, Sparkles, Bot, RefreshCw,
  Flame, AlertTriangle, CheckCheck
} from 'lucide-react';
import { supabase, type Profile, type Mensaje } from '../lib/supabase';
import { GoogleGenAI } from '@google/genai';
import { toast } from 'sonner';

interface AdminProps {
  adminProfile: Profile;
  onSignOut: () => void;
}

interface ClienteConEstado extends Profile {
  dia_programa: number;
  semana_programa: number;
  semaforo: 'verde' | 'amarillo' | 'rojo' | 'gris';
  tareas_completadas: number;
  tareas_total: number;
  ultima_entrada_diario?: string;
}

type DetalleTab = 'resumen' | 'diario' | 'metricas' | 'mensajes';

const SEMAFORO_CONFIG = {
  verde: { class: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]', label: 'En ritmo', text: 'text-emerald-400' },
  amarillo: { class: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]', label: 'Atencion', text: 'text-amber-400' },
  rojo: { class: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]', label: 'Necesita ayuda', text: 'text-red-400' },
  gris: { class: 'bg-gray-600', label: 'Sin datos', text: 'text-gray-400' },
};

function calcDias(fecha_inicio: string): { dia: number; semana: number } {
  const diff = Math.floor((new Date().getTime() - new Date(fecha_inicio).getTime()) / (1000 * 60 * 60 * 24));
  const dia = Math.max(1, Math.min(90, diff + 1));
  return { dia, semana: Math.max(1, Math.min(12, Math.floor(diff / 7) + 1)) };
}

export default function Admin({ adminProfile, onSignOut }: AdminProps) {
  const [clientes, setClientes] = useState<ClienteConEstado[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCliente, setSelectedCliente] = useState<ClienteConEstado | null>(null);
  const [detalleTab, setDetalleTab] = useState<DetalleTab>('resumen');
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);

  // Detalle state
  const [detalleTareas, setDetalleTareas] = useState<any[]>([]);
  const [detalleDiario, setDetalleDiario] = useState<any[]>([]);
  const [detalleMetricas, setDetalleMetricas] = useState<any[]>([]);
  const [detalleMensajes, setDetalleMensajes] = useState<Mensaje[]>([]);
  const [mensajeInput, setMensajeInput] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [detalleLoading, setDetalleLoading] = useState(false);
  const [iaRecomendacion, setIaRecomendacion] = useState('');
  const [iaLoading, setIaLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Nuevo cliente form
  const [nuevoForm, setNuevoForm] = useState({
    nombre: '', email: '', especialidad: '', plan: 'DWY' as 'DWY' | 'DFY',
    fecha_inicio: new Date().toISOString().split('T')[0]
  });
  const [creando, setCreando] = useState(false);

  useEffect(() => { cargarClientes(); }, []);
  useEffect(() => {
    if (selectedCliente) cargarDetalleCliente(selectedCliente.id);
  }, [selectedCliente, detalleTab]);
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detalleMensajes]);

  async function cargarClientes() {
    if (!supabase) return;
    setLoading(true);
    try {
      // Use RPC to bypass RLS as admin
      const { data: profiles, error } = await supabase.rpc('get_all_profiles');
      if (error || !profiles) { 
        console.error('Error loading clients:', error);
        setLoading(false); 
        return; 
      }

      const clientesConEstado = await Promise.all(profiles.map(async (p: Profile) => {
        const { dia, semana } = calcDias(p.fecha_inicio);
        
        const [tareasRes, metricasRes, diarioRes] = await Promise.all([
          supabase.rpc('get_user_tasks', { target_user_id: p.id }),
          supabase.rpc('get_user_metrics', { target_user_id: p.id }),
          supabase.rpc('get_user_diary', { target_user_id: p.id }),
        ]);

        const tareas = tareasRes.data ?? [];
        const metricas = metricasRes.data ?? [];
        const ultimaDiario = diarioRes.data?.[0]?.fecha;

        // Compute semaforo
        let semaforo: ClienteConEstado['semaforo'] = 'gris';
        if (metricas.length >= 2) {
          const cur = metricas[metricas.length - 1];
          const prev = metricas[metricas.length - 2];
          const delta = (cur.leads + cur.ventas) - (prev.leads + prev.ventas);
          semaforo = delta > 0 ? 'verde' : delta === 0 ? 'amarillo' : 'rojo';
        } else if (tareas.some((t: any) => t.status === 'completada')) {
          semaforo = 'verde';
        }

        return {
          ...p,
          dia_programa: dia,
          semana_programa: semana,
          semaforo,
          tareas_completadas: tareas.filter((t: any) => t.status === 'completada').length,
          tareas_total: tareas.length,
          ultima_entrada_diario: ultimaDiario,
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
      if (detalleTab === 'resumen') {
        const [t, d, m] = await Promise.all([
          supabase.rpc('get_user_tasks', { target_user_id: userId }),
          supabase.rpc('get_user_diary', { target_user_id: userId }),
          supabase.rpc('get_user_metrics', { target_user_id: userId }),
        ]);
        setDetalleTareas(t.data ?? []);
        setDetalleDiario((d.data ?? []).slice(0, 3));
        setDetalleMetricas(m.data ?? []);
      } else if (detalleTab === 'diario') {
        const { data } = await supabase.rpc('get_user_diary', { target_user_id: userId });
        setDetalleDiario(data ?? []);
      } else if (detalleTab === 'metricas') {
        const { data } = await supabase.rpc('get_user_metrics', { target_user_id: userId });
        setDetalleMetricas(data ?? []);
      } else if (detalleTab === 'mensajes') {
        const { data } = await supabase
          .from('mensajes')
          .select('*, emisor:profiles!emisor_id(nombre, rol)')
          .or(`emisor_id.eq.${userId},receptor_id.eq.${userId}`)
          .eq('canal', 'privado')
          .order('created_at');
        setDetalleMensajes((data as Mensaje[]) ?? []);
      }
    } catch (e) {
      console.error('Error loading detail:', e);
    } finally {
      setDetalleLoading(false);
    }
  }

  async function generarRecomendacion() {
    if (!selectedCliente) return;
    setIaLoading(true);
    setIaRecomendacion('');
    try {
      const lastDiary = detalleDiario[0]?.respuestas;
      const pendingTasks = detalleTareas.filter((t: any) => t.status !== 'completada').slice(0, 3);
      const lastMetric = detalleMetricas[detalleMetricas.length - 1];

      const prompt = `Sos un coach de alto rendimiento para profesionales de la salud del programa "Los Sanadores Libres". Analizá brevemente la situación de ${selectedCliente.nombre} y dá 3 recomendaciones de próximos pasos concretas. Sé directo y ultra específico.

CONTEXTO:
- Semana ${selectedCliente.semana_programa} de 12 del programa
- Tareas completadas: ${selectedCliente.tareas_completadas} de ${selectedCliente.tareas_total}
- Último check-in: estado="${lastDiary?.estado || 'sin datos'}", foco="${lastDiary?.foco || 'sin datos'}", cuello de botella="${lastDiary?.cuello || 'sin datos'}"
- Tareas pendientes: ${pendingTasks.map((t: any) => t.tarea_id).join(', ') || 'ninguna'}
- Última métrica: ${lastMetric ? `${lastMetric.leads} leads, ${lastMetric.ventas} ventas` : 'sin métricas aún'}

Respondé solo con las 3 recomendaciones en formato lista, sin introducción. Máximo 5 líneas total. En español.`;

      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
      const result = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: [{ role: 'user', parts: [{ text: prompt }] }] });
      setIaRecomendacion(result.text ?? '');
    } catch (e) {
      toast.error('Error generando recomendación IA');
    } finally {
      setIaLoading(false);
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
      toast.success('Mensaje enviado ✓');
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
      const { error } = await supabase.functions.invoke('invite-user', { body: nuevoForm });
      if (error) throw error;
      toast.success(`Invitación enviada a ${nuevoForm.email}`);
      setShowNuevoCliente(false);
      setNuevoForm({ nombre: '', email: '', especialidad: '', plan: 'DWY', fecha_inicio: new Date().toISOString().split('T')[0] });
      await cargarClientes();
    } catch (e: unknown) {
      toast.error(`Error: ${e instanceof Error ? e.message : 'desconocido'}`);
    } finally {
      setCreando(false);
    }
  }

  const tabs: { id: DetalleTab; label: string; icon: React.ElementType }[] = [
    { id: 'resumen', label: 'Resumen', icon: TrendingUp },
    { id: 'diario', label: 'Diario', icon: Calendar },
    { id: 'metricas', label: 'Métricas', icon: BarChart2 },
    { id: 'mensajes', label: 'Chat', icon: MessageSquare },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0B] text-white font-sans">
      <div className="fixed top-0 left-0 w-[600px] h-[600px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none" />
      <div className="fixed bottom-0 right-0 w-[400px] h-[400px] bg-purple-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <header className="relative z-10 border-b border-white/[0.06] bg-black/40 backdrop-blur-xl sticky top-0">
        <div className="max-w-7xl mx-auto px-6 py-3.5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center">
              <Stethoscope className="w-4 h-4 text-indigo-400" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white">Tu Clínica Digital</h1>
              <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">Panel Admin</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-xs text-gray-500">{adminProfile.nombre}</span>
            <button onClick={onSignOut} className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs text-gray-400 hover:bg-white/5 hover:text-white transition-colors">
              <LogOut className="w-3.5 h-3.5" /> Salir
            </button>
          </div>
        </div>
      </header>

      <div className="relative z-10 max-w-7xl mx-auto px-6 py-8">
        {/* Stats row */}
        <div className="grid grid-cols-4 gap-4 mb-8">
          {[
            { label: 'Clientes activos', value: clientes.length, icon: Users, color: 'text-indigo-400', bg: 'from-indigo-500/10 to-indigo-500/5' },
            { label: 'En ritmo', value: clientes.filter(c => c.semaforo === 'verde').length, icon: CheckCheck, color: 'text-emerald-400', bg: 'from-emerald-500/10 to-emerald-500/5' },
            { label: 'Necesitan atención', value: clientes.filter(c => c.semaforo === 'rojo').length, icon: AlertTriangle, color: 'text-red-400', bg: 'from-red-500/10 to-red-500/5' },
            { label: 'Progreso promedio', value: clientes.length ? `${Math.round(clientes.reduce((acc, c) => acc + (c.tareas_total > 0 ? (c.tareas_completadas / c.tareas_total) * 100 : 0), 0) / clientes.length)}%` : '—', icon: TrendingUp, color: 'text-amber-400', bg: 'from-amber-500/10 to-amber-500/5' },
          ].map(stat => (
            <div key={stat.label} className={`bg-gradient-to-br ${stat.bg} border border-white/[0.06] rounded-2xl p-5`}>
              <stat.icon className={`w-5 h-5 ${stat.color} mb-3`} />
              <p className="text-2xl font-light text-white mb-0.5">{stat.value}</p>
              <p className="text-xs text-gray-500">{stat.label}</p>
            </div>
          ))}
        </div>

        {/* Main layout */}
        <div className="flex gap-6">
          {/* Lista de clientes */}
          <div className="w-72 shrink-0">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xs font-bold uppercase tracking-widest text-gray-400">Clientes ({clientes.length})</h2>
              <button
                onClick={() => setShowNuevoCliente(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-400 text-xs font-medium border border-indigo-500/25 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Nuevo
              </button>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
              </div>
            ) : clientes.length === 0 ? (
              <div className="text-center py-16">
                <Users className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                <p className="text-gray-500 text-sm">Sin clientes aún</p>
                <button onClick={() => setShowNuevoCliente(true)} className="mt-3 text-indigo-400 text-xs hover:text-indigo-300">
                  Agregar el primero →
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                {clientes.map(cliente => (
                  <button
                    key={cliente.id}
                    onClick={() => { setSelectedCliente(cliente); setDetalleTab('resumen'); setIaRecomendacion(''); }}
                    className={`w-full text-left p-4 rounded-xl border transition-all ${
                      selectedCliente?.id === cliente.id
                        ? 'bg-indigo-500/10 border-indigo-500/30'
                        : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] hover:border-white/10'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-br from-indigo-500/30 to-purple-500/30 flex items-center justify-center text-xs font-bold text-white shrink-0">
                        {cliente.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-0.5">
                          <span className="text-sm font-medium text-white truncate">{cliente.nombre}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] text-gray-500">Sem {cliente.semana_programa}/12</span>
                          {cliente.especialidad && <span className="text-[10px] text-gray-600 truncate">{cliente.especialidad}</span>}
                        </div>
                      </div>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${SEMAFORO_CONFIG[cliente.semaforo].class}`} />
                    </div>
                    {cliente.tareas_total > 0 && (
                      <div className="mt-2.5 h-0.5 bg-white/[0.05] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-indigo-500 rounded-full transition-all"
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
          {selectedCliente ? (
            <div className="flex-1 bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden flex flex-col" style={{ height: 'calc(100vh - 240px)' }}>
              {/* Header */}
              <div className="p-5 border-b border-white/[0.06] flex items-start justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <div className={`w-2 h-2 rounded-full ${SEMAFORO_CONFIG[selectedCliente.semaforo].class}`} />
                    <h3 className="text-base font-semibold text-white">{selectedCliente.nombre}</h3>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${selectedCliente.plan === 'DFY' ? 'bg-purple-500/20 text-purple-400' : 'bg-indigo-500/20 text-indigo-400'}`}>
                      {selectedCliente.plan}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500">{selectedCliente.email}</p>
                  <p className="text-xs text-gray-600 mt-0.5">
                    Semana {selectedCliente.semana_programa} · Día {selectedCliente.dia_programa}
                    {selectedCliente.especialidad ? ` · ${selectedCliente.especialidad}` : ''}
                    {' · '}<span className={SEMAFORO_CONFIG[selectedCliente.semaforo].text}>{SEMAFORO_CONFIG[selectedCliente.semaforo].label}</span>
                  </p>
                </div>
                <button onClick={() => setSelectedCliente(null)} className="text-gray-600 hover:text-white transition-colors">
                  <X className="w-4 h-4" />
                </button>
              </div>

              {/* Tabs */}
              <div className="flex border-b border-white/[0.06] px-5 shrink-0">
                {tabs.map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setDetalleTab(tab.id)}
                    className={`flex items-center gap-1.5 px-3 py-3 text-[11px] font-bold uppercase tracking-wider border-b-2 transition-colors ${
                      detalleTab === tab.id
                        ? 'border-indigo-400 text-indigo-400'
                        : 'border-transparent text-gray-600 hover:text-gray-300'
                    }`}
                  >
                    <tab.icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Content */}
              <div className="flex-1 overflow-y-auto p-5 scrollbar-hide">
                {detalleLoading ? (
                  <div className="flex items-center justify-center py-12">
                    <Loader2 className="w-5 h-5 text-indigo-400 animate-spin" />
                  </div>
                ) : (
                  <>
                    {/* ── RESUMEN ── */}
                    {detalleTab === 'resumen' && (
                      <div className="space-y-6">
                        {/* Progress + IA */}
                        <div className="grid grid-cols-2 gap-4">
                          <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4">
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 font-bold">Progreso de Tareas</p>
                            <p className="text-2xl font-light text-white mb-2">
                              {selectedCliente.tareas_completadas}/{selectedCliente.tareas_total}
                            </p>
                            <div className="h-1.5 bg-white/[0.05] rounded-full overflow-hidden">
                              <div
                                className="h-full bg-indigo-500 rounded-full"
                                style={{ width: `${selectedCliente.tareas_total > 0 ? Math.round((selectedCliente.tareas_completadas / selectedCliente.tareas_total) * 100) : 0}%` }}
                              />
                            </div>
                          </div>
                          <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-4">
                            <p className="text-[10px] text-gray-400 uppercase tracking-widest mb-2 font-bold">Último Check-in</p>
                            {detalleDiario[0] ? (
                              <>
                                <p className="text-sm text-white font-medium mb-1">{detalleDiario[0].fecha}</p>
                                <p className="text-xs text-gray-400">Estado: <span className="text-white">{detalleDiario[0].respuestas?.estado || '—'}</span></p>
                                <p className="text-xs text-gray-400 mt-0.5 truncate">Foco: <span className="text-white">{detalleDiario[0].respuestas?.foco || '—'}</span></p>
                              </>
                            ) : (
                              <p className="text-sm text-gray-600">Sin entradas aún</p>
                            )}
                          </div>
                        </div>

                        {/* IA Coach Recomendación */}
                        <div className="bg-indigo-500/[0.05] border border-indigo-500/20 rounded-xl p-5">
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-2">
                              <Bot className="w-4 h-4 text-indigo-400" />
                              <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Recomendación IA para este cliente</p>
                            </div>
                            <button
                              onClick={generarRecomendacion}
                              disabled={iaLoading}
                              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-400 text-xs font-medium transition-colors disabled:opacity-50"
                            >
                              {iaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                              Generar
                            </button>
                          </div>
                          {iaRecomendacion ? (
                            <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-line">{iaRecomendacion}</p>
                          ) : (
                            <p className="text-xs text-gray-600">Hacé clic en "Generar" para que la IA analice el perfil completo de {selectedCliente.nombre} y te sugiera qué acciones tomar en la próxima sesión.</p>
                          )}
                        </div>

                        {/* Tareas recientes */}
                        <div>
                          <p className="text-[10px] text-gray-400 uppercase tracking-widest font-bold mb-3">Últimas tareas</p>
                          <div className="space-y-2">
                            {detalleTareas.slice(0, 5).map((t: any, i: number) => (
                              <div key={i} className="flex items-center gap-3 p-3 rounded-xl bg-white/[0.02]">
                                {t.status === 'completada' ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                ) : (
                                  <Circle className="w-4 h-4 text-gray-600 shrink-0" />
                                )}
                                <span className={`text-xs ${t.status === 'completada' ? 'text-gray-500 line-through' : 'text-gray-200'}`}>
                                  {t.tarea_id}
                                </span>
                                <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${
                                  t.status === 'completada' ? 'text-emerald-600' : 'text-gray-600'
                                }`}>{t.status}</span>
                              </div>
                            ))}
                            {detalleTareas.length === 0 && <p className="text-sm text-gray-600 text-center py-4">Sin tareas aún</p>}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* ── DIARIO ── */}
                    {detalleTab === 'diario' && (
                      <div className="space-y-4">
                        {detalleDiario.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-12">Sin entradas de diario</p>
                        ) : detalleDiario.map((entrada: any, i: number) => (
                          <div key={i} className="p-5 rounded-xl bg-white/[0.02] border border-white/[0.05]">
                            <div className="flex items-center justify-between mb-3">
                              <p className="text-sm font-semibold text-white">{entrada.fecha}</p>
                              {entrada.respuestas?.estado && (
                                <span className="text-xs px-2 py-0.5 rounded-full bg-white/5 text-gray-400">{entrada.respuestas.estado}</span>
                              )}
                            </div>
                            <div className="space-y-2">
                              {entrada.respuestas?.victoria && <p className="text-xs text-gray-300"><span className="text-gray-500">Victoria:</span> {entrada.respuestas.victoria}</p>}
                              {entrada.respuestas?.cuello && <p className="text-xs text-gray-300"><span className="text-gray-500">Cuello de botella:</span> {entrada.respuestas.cuello}</p>}
                              {entrada.respuestas?.foco && <p className="text-xs text-gray-300"><span className="text-gray-500">Foco:</span> {entrada.respuestas.foco}</p>}
                              {entrada.respuestas?.aprendizaje && <p className="text-xs text-gray-300"><span className="text-gray-500">Aprendizaje:</span> {entrada.respuestas.aprendizaje}</p>}
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── MÉTRICAS ── */}
                    {detalleTab === 'metricas' && (
                      <div className="space-y-3">
                        {detalleMetricas.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-12">Sin métricas</p>
                        ) : detalleMetricas.slice().reverse().map((m: any, i: number) => (
                          <div key={i} className="p-4 rounded-xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                            <span className="text-xs text-gray-400">{m.semana}</span>
                            <div className="flex items-center gap-6">
                              <div className="text-center">
                                <p className="text-white text-sm font-medium">{m.leads}</p>
                                <p className="text-[10px] text-gray-500">leads</p>
                              </div>
                              <div className="text-center">
                                <p className="text-white text-sm font-medium">{m.conversaciones ?? 0}</p>
                                <p className="text-[10px] text-gray-500">llamadas/conv.</p>
                              </div>
                              <div className="text-center">
                                <p className="text-emerald-400 text-sm font-medium">{m.ventas}</p>
                                <p className="text-[10px] text-gray-500">ventas</p>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* ── MENSAJES ── */}
                    {detalleTab === 'mensajes' && (
                      <div className="space-y-3">
                        {detalleMensajes.length === 0 ? (
                          <p className="text-gray-500 text-sm text-center py-12">Sin mensajes privados aún</p>
                        ) : detalleMensajes.map(m => (
                          <div
                            key={m.id}
                            className={`p-3.5 rounded-xl text-xs max-w-[85%] ${
                              m.emisor_id === adminProfile.id
                                ? 'ml-auto bg-indigo-600/25 text-indigo-100 border border-indigo-500/20'
                                : 'bg-white/[0.04] text-gray-300 border border-white/[0.05]'
                            }`}
                          >
                            <p className="leading-relaxed">{m.contenido}</p>
                            <p className="text-[10px] mt-1.5 opacity-50">
                              {m.emisor_id === adminProfile.id ? 'Tú' : selectedCliente.nombre} · {new Date(m.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}
                            </p>
                          </div>
                        ))}
                        <div ref={messagesEndRef} />
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* Message input (only in chat tab) */}
              {detalleTab === 'mensajes' && (
                <div className="p-4 border-t border-white/[0.06] shrink-0">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={mensajeInput}
                      onChange={e => setMensajeInput(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensaje()}
                      placeholder={`Mensaje a ${selectedCliente.nombre}...`}
                      disabled={enviando}
                      className="flex-1 bg-black/20 border border-white/10 rounded-xl py-2.5 px-4 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50 transition-all"
                    />
                    <button
                      onClick={enviarMensaje}
                      disabled={!mensajeInput.trim() || enviando}
                      className="w-10 h-10 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 flex items-center justify-center transition-colors"
                    >
                      {enviando ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center">
              <div className="text-center">
                <Users className="w-12 h-12 text-gray-700 mx-auto mb-4" />
                <p className="text-gray-500 text-sm">Seleccioná un cliente para ver su detalle</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modal: Nuevo Cliente */}
      {showNuevoCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm">
          <div className="w-full max-w-md bg-[#111116] border border-white/10 rounded-2xl p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Nuevo Cliente</h3>
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
                  <label className="block text-xs text-gray-400 mb-1.5">{field.label}</label>
                  <input
                    type={field.type}
                    value={nuevoForm[field.key as keyof typeof nuevoForm]}
                    onChange={e => setNuevoForm({ ...nuevoForm, [field.key]: e.target.value })}
                    placeholder={field.placeholder}
                    className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white placeholder-gray-600 focus:outline-none focus:border-indigo-500/50"
                  />
                </div>
              ))}
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Plan</label>
                <select
                  value={nuevoForm.plan}
                  onChange={e => setNuevoForm({ ...nuevoForm, plan: e.target.value as 'DWY' | 'DFY' })}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                >
                  <option value="DWY">DWY — Do it With You</option>
                  <option value="DFY">DFY — Done For You</option>
                </select>
              </div>
              <div>
                <label className="block text-xs text-gray-400 mb-1.5">Fecha de inicio del programa</label>
                <input
                  type="date"
                  value={nuevoForm.fecha_inicio}
                  onChange={e => setNuevoForm({ ...nuevoForm, fecha_inicio: e.target.value })}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-white focus:outline-none focus:border-indigo-500/50"
                />
              </div>
            </div>
            <p className="text-xs text-gray-600 mt-4">Se enviará un email al cliente para que configure su contraseña.</p>
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
                className="flex-1 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 text-white text-sm font-medium transition-colors flex items-center justify-center gap-2"
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
