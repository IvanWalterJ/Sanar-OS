import React, { useState, useEffect, useRef } from 'react';
import CustomSelect from '../components/CustomSelect';
import {
  Users, Send, ChevronRight, X, Plus, Loader2,
  Stethoscope, CheckCircle2, Circle, LogOut,
  MessageSquare, BookOpen, BarChart2, Calendar,
  TrendingUp, TrendingDown, Sparkles, Bot,
  Hash, Trophy, Lock, Shield,
  CheckCheck, AlertTriangle, Image, Mic, Settings, Camera,
  Video, Trash2, Youtube, Play
} from 'lucide-react';
import { supabase, type Profile, type Mensaje, type AdminNote, type UserStatus, isSupabaseReady } from '../lib/supabase';
import { SEED_ROADMAP_V2 } from '../lib/roadmapSeed';
import { GoogleGenAI } from '@google/genai';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';

// ─── TIPOS Y CONSTANTES ─────────────────────────────────────────────────────────

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
  tareas_por_pilar: Record<number, number>; // pilar_numero -> completadas reales
  ultima_entrada_diario?: string;
  // v2.0
  racha_diario: number;
  ventas_count: number;
  estado_garantia: 'en_camino' | 'en_riesgo' | 'activada';
  progreso_porcentaje: number;
}

type MainTab = 'dashboard' | 'comunidad' | 'victorias' | 'consultas' | 'metricas_globales' | 'mensajes_privados' | 'videos';
type DetalleTab = 'resumen' | 'diario' | 'metricas' | 'mensajes' | 'notas';

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ONBOARDING: { label: 'Onboarding', color: 'text-blue-400', bg: 'bg-blue-500/10', border: 'border-blue-500/20' },
  ACTIVE:     { label: 'Activo',     color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20' },
  PAUSED:     { label: 'Pausado',    color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20' },
  COMPLETED:  { label: 'Completado', color: 'text-purple-400', bg: 'bg-purple-500/10', border: 'border-purple-500/20' },
  CHURNED:    { label: 'Inactivo',   color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20' },
};

interface AdminVideo {
  id: string;
  grupo: 'A' | 'B' | 'C' | 'D' | 'E';
  titulo: string;
  descripcion: string;
  youtubeUrl: string;
  duracion?: string;
}

const PILARES: { id: AdminVideo['grupo']; label: string }[] = [
  { id: 'A', label: 'A — Identidad y Mentalidad' },
  { id: 'B', label: 'B — Claridad y Oferta' },
  { id: 'C', label: 'C — Contenido y Captación' },
  { id: 'D', label: 'D — Infraestructura Digital' },
  { id: 'E', label: 'E — Conversión y Ventas' },
];

function getYoutubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

const SEMAFORO_CONFIG = {
  verde: { class: 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]', label: 'En ritmo', text: 'text-emerald-400' },
  amarillo: { class: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]', label: 'Atención', text: 'text-amber-400' },
  rojo: { class: 'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.4)]', label: 'Necesita ayuda', text: 'text-red-400' },
  gris: { class: 'bg-gray-600', label: 'Sin datos', text: 'text-gray-400' },
};

function calcDias(fecha_inicio: string): { dia: number; semana: number } {
  const diff = Math.floor((new Date().getTime() - new Date(fecha_inicio).getTime()) / (1000 * 60 * 60 * 24));
  const dia = Math.max(1, Math.min(90, diff + 1));
  return { dia, semana: Math.max(1, Math.min(12, Math.floor(diff / 7) + 1)) };
}

// ─── COMPONENTE CHAT GLOBAL ADMIN ────────────────────────────────────────────────

function GlobalChat({ canal, adminProfile }: { canal: string, adminProfile: Profile }) {
  const [messages, setMessages] = useState<Mensaje[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(true);
  const [enviando, setEnviando] = useState(false);
  const [uploading, setUploading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const adminAvatarUrl = localStorage.getItem(`tcd_admin_avatar_${adminProfile.id}`) || '';

  useEffect(() => {
    if (!supabase) return;
    setLoading(true);
    supabase
      .from('mensajes')
      .select('*, emisor:profiles!emisor_id(nombre, rol)')
      .eq('canal', canal)
      .order('created_at')
      .then(({ data }) => {
        if (data) setMessages(data as Mensaje[]);
        setLoading(false);
      });

    const channel = supabase
      .channel(`admin-global-${canal}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `canal=eq.${canal}` },
        async (payload) => {
          const { data } = await supabase!.from('mensajes').select('*, emisor:profiles!emisor_id(nombre, rol)').eq('id', payload.new.id).single();
          if (data) setMessages(prev => [...prev, data as Mensaje]);
        }
      ).subscribe();
    return () => { supabase!.removeChannel(channel); };
  }, [canal]);

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  async function send() {
    if (!supabase || !input.trim()) return;
    setEnviando(true);
    try {
      const { error } = await supabase.from('mensajes').insert({
        canal, emisor_id: adminProfile.id, contenido: input.trim()
      });
      if (error) throw error;
      setInput('');
    } catch {
      toast.error('Error enviando mensaje al canal');
    } finally {
      setEnviando(false);
    }
  }

  async function handleUploadFile(file: File, tipo: 'imagen' | 'audio') {
    if (!supabase) return;
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? (tipo === 'imagen' ? 'jpg' : 'mp3');
      const path = `admin/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage.from('mensajes-archivos').upload(path, file);
      if (error) throw error;
      const { data: { publicUrl } } = supabase.storage.from('mensajes-archivos').getPublicUrl(data.path);
      const { error: msgErr } = await supabase.from('mensajes').insert({
        canal, emisor_id: adminProfile.id, contenido: '', tipo_archivo: tipo, archivo_url: publicUrl
      });
      if (msgErr) throw msgErr;
    } catch {
      toast.error('Error subiendo archivo. Verificá que el bucket exista en Supabase.');
    } finally {
      setUploading(false);
    }
  }

  const getTitle = () => {
    switch (canal) {
      case 'comunidad': return { t: 'Comunidad TCD', d: 'Chat general entre todos los clientes de la academia.', i: Users };
      case 'victorias': return { t: 'Victorias Semanales', d: 'Espacio para celebrar las ventas y progresos.', i: Trophy };
      case 'consultas': return { t: 'Consultas Grupales', d: 'Canal para dudas técnicas y de negocio compartidas.', i: Hash };
      default: return { t: canal, d: '', i: Hash };
    }
  };
  const titleInfo = getTitle();

  return (
    <div className="flex flex-col h-full min-h-0 bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadFile(f, 'imagen'); e.target.value = ''; }} />
      <input ref={audioInputRef} type="file" accept="audio/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadFile(f, 'audio'); e.target.value = ''; }} />

      <div className="p-6 border-b border-white/[0.06] shrink-0 bg-white/[0.01]">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl bg-purple-500/20 border border-purple-500/30 flex items-center justify-center">
            <titleInfo.i className="w-5 h-5 text-purple-400" />
          </div>
          <div>
            <h2 className="text-xl font-medium text-white tracking-tight">{titleInfo.t}</h2>
            <p className="text-sm text-gray-500">{titleInfo.d}</p>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-4">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-purple-400 animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <titleInfo.i className="w-12 h-12 text-gray-800 mb-4" />
            <p className="text-gray-500">Este canal aún está vacío.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.emisor_id === adminProfile.id;
            const isAdmin = m.emisor?.rol === 'admin';
            const senderName = m.emisor?.nombre ?? (isMe ? adminProfile.nombre : '?');
            const initial = senderName.charAt(0).toUpperCase();
            return (
              <div key={m.id} className={`flex gap-2.5 items-end max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                {/* Avatar */}
                {isMe && adminAvatarUrl ? (
                  <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden border border-indigo-500/30">
                    <img src={adminAvatarUrl} alt={senderName} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${
                    isAdmin ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300'
                             : 'bg-white/10 border-white/10 text-white'
                  }`}>
                    {isAdmin ? <Shield className="w-3.5 h-3.5" /> : initial}
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <span className={`text-[10px] font-semibold px-1 ${isAdmin ? 'text-indigo-400' : 'text-gray-500'} ${isMe ? 'text-right' : ''}`}>
                    {senderName}{isAdmin ? ' · Coach' : ''}
                  </span>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    isMe ? 'bg-indigo-600/25 text-indigo-50 border border-indigo-500/20 rounded-tr-sm'
                         : isAdmin ? 'bg-purple-600/20 text-purple-100 border border-purple-500/20 rounded-tl-sm'
                         : 'bg-white/[0.04] text-gray-200 border border-white/[0.06] rounded-tl-sm'
                  }`}>
                    {m.tipo_archivo === 'imagen' && m.archivo_url && (
                      <img src={m.archivo_url} alt="imagen" className="max-w-xs rounded-xl mb-2 cursor-pointer hover:opacity-90"
                           onClick={() => window.open(m.archivo_url)} />
                    )}
                    {m.tipo_archivo === 'audio' && m.archivo_url && (
                      <audio controls src={m.archivo_url} className="w-full mb-2 rounded-lg" />
                    )}
                    {m.contenido && <p>{m.contenido}</p>}
                    <p className={`text-[10px] mt-1.5 opacity-40 ${isMe ? 'text-right' : ''}`}>
                      {new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                    </p>
                  </div>
                </div>
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="p-4 border-t border-white/[0.06] shrink-0 bg-white/[0.01]">
        <div className="flex gap-2 items-end">
          {/* Attach buttons */}
          <div className="flex flex-col gap-1 shrink-0">
            <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploading}
              title="Subir imagen"
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors disabled:opacity-50">
              <Image className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => audioInputRef.current?.click()} disabled={uploading}
              title="Subir audio"
              className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors disabled:opacity-50">
              <Mic className="w-4 h-4" />
            </button>
          </div>
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && send()}
            placeholder={uploading ? 'Subiendo archivo...' : 'Enviar mensaje al canal...'}
            disabled={enviando || uploading}
            className="flex-1 bg-black/40 border border-white/10 rounded-xl py-3 px-5 text-sm text-white focus:outline-none focus:border-purple-500/50 transition-all disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!input.trim() || enviando || uploading}
            className="w-12 h-12 rounded-xl bg-purple-600 hover:bg-purple-500 flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
          >
            {enviando || uploading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── COMPONENTE PRINCIPAL ───────────────────────────────────────────────────────

export default function Admin({ adminProfile, onSignOut }: AdminProps) {
  const [mainTab, setMainTab] = useState<MainTab>('dashboard');
  const [channelUnread, setChannelUnread] = useState<Record<string, number>>({});
  
  // Clientes Dashboard
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

  // Métricas globales
  const [metricasGlobales, setMetricasGlobales] = useState<any>(null);
  const [metricasLoading, setMetricasLoading] = useState(false);
  const [filtroMetricasId, setFiltroMetricasId] = useState<string | null>(null); // null = global

  // Formulario nuevo cliente con contraseña local
  const [nuevoForm, setNuevoForm] = useState({
    nombre: '', email: '', password: '', especialidad: '', plan: 'DWY' as 'DWY' | 'DFY' | 'IMPLEMENTACION',
    fecha_inicio: new Date().toISOString().split('T')[0],
    status: 'ONBOARDING' as UserStatus,
  });
  const [creando, setCreando] = useState(false);

  // Notas internas
  const [detalleNotas, setDetalleNotas] = useState<AdminNote[]>([]);
  const [notaInput, setNotaInput] = useState('');
  const [notaLoading, setNotaLoading] = useState(false);

  // Filtro por status en lista de clientes
  const [filtroStatus, setFiltroStatus] = useState<UserStatus | 'ALL'>('ALL');

  // Cambio de status de cliente
  const [statusCambiando, setStatusCambiando] = useState(false);

  // Mensajes privados (WhatsApp-style inbox)
  const [chatCliente, setChatCliente] = useState<ClienteConEstado | null>(null);
  const [chatMessages, setChatMessages] = useState<Mensaje[]>([]);
  const [chatInput, setChatInput] = useState('');
  const [chatEnviando, setChatEnviando] = useState(false);
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  // Videos admin
  const [adminVideos, setAdminVideos] = useState<AdminVideo[]>([]);
  const [videosLoading, setVideosLoading] = useState(false);
  const [showAddVideo, setShowAddVideo] = useState(false);
  const [videoForm, setVideoForm] = useState<{ id?: string; grupo: AdminVideo['grupo']; titulo: string; descripcion: string; youtubeUrl: string; duracion: string }>({
    grupo: 'A', titulo: '', descripcion: '', youtubeUrl: '', duracion: ''
  });

  // Admin settings
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [adminDraft, setAdminDraft] = useState({ nombre: adminProfile.nombre, cargo: adminProfile.especialidad || 'Director' });
  const [adminAvatar, setAdminAvatar] = useState<string>(() => localStorage.getItem(`tcd_admin_avatar_${adminProfile.id}`) || '');
  const [guardandoAdmin, setGuardandoAdmin] = useState(false);
  const adminAvatarInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { cargarClientes(); }, []);

  useEffect(() => {
    if (mainTab === 'metricas_globales' && !metricasGlobales) cargarMetricasGlobales();
    if (mainTab === 'videos') cargarAdminVideos();
    if (mainTab !== 'metricas_globales') setFiltroMetricasId(null);
  }, [mainTab]);

  // ─── Notificaciones de canales de chat (admin) ────────────────────────────
  useEffect(() => {
    if (!supabase) return;
    const chatChannels = ['comunidad', 'victorias', 'consultas'] as const;
    const ICONS = { comunidad: Users, victorias: Trophy, consultas: Hash } as const;

    const subs = chatChannels.map(ch =>
      supabase!.channel(`admin-notif-${ch}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `canal=eq.${ch}` },
          async (payload) => {
            if (ch === mainTab) return;
            if (payload.new.emisor_id === adminProfile.id) return;

            const { data: m } = await supabase!.from('mensajes')
              .select('*, emisor:profiles!emisor_id(nombre, rol)')
              .eq('id', payload.new.id).single();

            const nombre = (m?.emisor as { nombre?: string } | undefined)?.nombre ?? 'Alguien';
            const preview = (payload.new.contenido ?? '').slice(0, 60);
            const ChIcon = ICONS[ch];

            toast(nombre, {
              description: preview || '📎 Archivo adjunto',
              action: { label: 'Ver →', onClick: () => setMainTab(ch) },
              icon: React.createElement(ChIcon, { className: 'w-4 h-4 text-purple-400' }),
              duration: 6000,
            });

            setChannelUnread(prev => ({ ...prev, [ch]: (prev[ch] ?? 0) + 1 }));
          }
        ).subscribe()
    );
    return () => { subs.forEach(s => supabase!.removeChannel(s)); };
  }, [mainTab, adminProfile.id]);

  // Realtime chat for mensajes_privados tab
  useEffect(() => {
    if (!supabase || !chatCliente || mainTab !== 'mensajes_privados') return;
    const channel = supabase
      .channel(`admin-inbox-${chatCliente.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes' },
        async (payload) => {
          if (!supabase) return;
          const { data } = await supabase.from('mensajes').select('*, emisor:profiles!emisor_id(nombre, rol)').eq('id', payload.new.id).single();
          if (data && data.canal === 'privado' && (data.emisor_id === chatCliente.id || data.receptor_id === chatCliente.id)) {
            setChatMessages(prev => {
              if (prev.find(m => m.id === data.id)) return prev;
              return [...prev, data as Mensaje];
            });
          }
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [chatCliente, mainTab]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Realtime Privado Chat Subscription para Admin
  useEffect(() => {
    if (!supabase || !selectedCliente || mainTab !== 'dashboard') return;
    const channel = supabase
      .channel(`admin-private-${selectedCliente.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes' },
        async (payload) => {
          // Solo filtramos del lado del cliente si involucra a selectedCliente
          const { data } = await supabase.from('mensajes').select('*, emisor:profiles!emisor_id(nombre, rol)').eq('id', payload.new.id).single();
          if (data && data.canal === 'privado' && (data.emisor_id === selectedCliente.id || data.receptor_id === selectedCliente.id)) {
            setDetalleMensajes(prev => {
              // evitar duplicados si fuimos nosotros quienes enviamos el msj
              if (prev.find(m => m.id === data.id)) return prev;
              return [...prev, data as Mensaje];
            });
          }
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedCliente, mainTab]);

  useEffect(() => {
    if (selectedCliente && mainTab === 'dashboard') cargarDetalleCliente(selectedCliente.id);
  }, [selectedCliente, detalleTab, mainTab]);
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detalleMensajes]);

  async function cargarMetricasGlobales() {
    if (!supabase) return;
    setMetricasLoading(true);
    try {
      const { data } = await supabase.rpc('get_metricas_globales');
      setMetricasGlobales(data ?? {});
    } catch {
      toast.error('Error cargando métricas globales');
    } finally {
      setMetricasLoading(false);
    }
  }

  async function cargarClientes() {
    if (!supabase) return;
    setLoading(true);
    try {
      const { data: profiles, error } = await supabase.rpc('get_all_profiles');
      if (error || !profiles) { setLoading(false); return; }

      const clientesConEstado = await Promise.all(profiles.map(async (p: Profile) => {
        const { dia, semana } = calcDias(p.fecha_inicio);
        const [tareasRes, metricasRes, diarioRes] = await Promise.all([
          supabase.rpc('get_user_tasks', { target_user_id: p.id }),
          supabase.rpc('get_user_metrics', { target_user_id: p.id }),
          supabase.rpc('get_user_diary', { target_user_id: p.id }),
        ]);

        // Fallback: if RPC returns no tasks, query hoja_de_ruta directly
        let tareas = tareasRes.data ?? [];
        if (tareas.length === 0) {
          const { data: hrRows } = await supabase
            .from('hoja_de_ruta')
            .select('pilar_numero, meta_codigo, completada, es_estrella')
            .eq('usuario_id', p.id);
          if (hrRows && hrRows.length > 0) {
            tareas = hrRows.map((r: any) => ({
              ...r,
              status: r.completada ? 'completada' : 'pendiente',
            }));
          }
        }
        // Calculate total from seed when RPC doesn't provide it
        const totalFromSeed = SEED_ROADMAP_V2.reduce((acc, pil) => acc + pil.metas.length, 0);
        const metricas = metricasRes.data ?? [];
        const ultimaDiario = diarioRes.data?.[0]?.fecha;

        let semaforo: ClienteConEstado['semaforo'] = 'gris';
        if (metricas.length >= 2) {
          const cur = metricas[metricas.length - 1];
          const prev = metricas[metricas.length - 2];
          const delta = (cur.leads + cur.ventas) - (prev.leads + prev.ventas);
          semaforo = delta > 0 ? 'verde' : delta === 0 ? 'amarillo' : 'rojo';
        } else if (tareas.some((t: any) => t.status === 'completada')) {
          semaforo = 'verde';
        }

        // v2.0: calcular racha de diario, ventas y garantía
        const entradas = diarioRes.data ?? [];
        let rachaActual = 0;
        const hoy = new Date();
        for (let i = 0; i < 30; i++) {
          const d = new Date(hoy); d.setDate(hoy.getDate() - i);
          const dStr = d.toISOString().split('T')[0];
          if (entradas.some((e: any) => e.fecha === dStr)) rachaActual++;
          else if (i > 0) break;
        }

        const ventasRes = await supabase.rpc('get_user_ventas', { target_user_id: p.id }).then(r => r, () => ({ data: [] }));
        const ventas_count = (ventasRes.data ?? []).length;

        const tareasEstrella = tareas.filter((t: any) => t.es_estrella && t.completada).length;
        const diarioCount = entradas.length;
        const metricasCount = metricas.length;
        let estado_garantia: ClienteConEstado['estado_garantia'] = 'en_camino';
        if (ventas_count === 0 && dia >= 60) {
          if (tareasEstrella >= 10 && diarioCount >= 60 && metricasCount >= 8) estado_garantia = 'activada';
          else if (dia >= 75) estado_garantia = 'en_riesgo';
        }

        const tareasCompletadas = tareas.filter((t: any) => t.status === 'completada' || t.completada).length;
        // Fallback: derive from progreso_porcentaje on profile when task data is unavailable
        const progPct = (p as any).progreso_porcentaje ?? 0;
        const tareasCompletadasFallback = tareasCompletadas === 0 && progPct > 0
          ? Math.round((progPct / 100) * totalFromSeed)
          : tareasCompletadas;

        // Calcular progreso real por pilar desde hoja_de_ruta
        const tareasPorPilar: Record<number, number> = {};
        for (const t of tareas) {
          if (t.completada || t.status === 'completada') {
            const pilarNum = t.pilar_numero ?? t.pilarNumero;
            if (pilarNum !== undefined) {
              tareasPorPilar[pilarNum] = (tareasPorPilar[pilarNum] ?? 0) + 1;
            }
          }
        }

        return {
          ...p,
          dia_programa: dia,
          semana_programa: semana,
          semaforo,
          tareas_completadas: tareasCompletadasFallback,
          tareas_total: tareas.length > 0 ? tareas.length : totalFromSeed,
          tareas_por_pilar: tareasPorPilar,
          ultima_entrada_diario: ultimaDiario,
          racha_diario: rachaActual,
          ventas_count,
          estado_garantia,
          progreso_porcentaje: (p as any).progreso_porcentaje ?? 0,
        } as ClienteConEstado;
      }));
      setClientes(clientesConEstado);
    } catch {
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
        // Fallback: if RPC returns no tasks, query hoja_de_ruta directly
        let tareasDetalle = t.data ?? [];
        if (tareasDetalle.length === 0) {
          const { data: hrRows } = await supabase
            .from('hoja_de_ruta')
            .select('pilar_numero, meta_codigo, completada, es_estrella')
            .eq('usuario_id', userId);
          if (hrRows && hrRows.length > 0) {
            tareasDetalle = hrRows.map((r: any) => ({
              ...r,
              status: r.completada ? 'completada' : 'pendiente',
            }));
          }
        }
        setDetalleTareas(tareasDetalle);
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
      } else if (detalleTab === 'notas') {
        await cargarNotas(userId);
      }
    } catch {
      // ignore
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

      const diarioResumen = lastDiary
        ? `Cómo se sintió: "${lastDiary.q1 || '—'}". Lo que lo frenó: "${lastDiary.q2 || '—'}". Energía: ${lastDiary.q3 || '—'}/10. Acción tomada: "${lastDiary.q4 || '—'}". Plan para mañana: "${lastDiary.q7 || '—'}".`
        : 'Sin entradas de diario recientes.';

      const prompt = `Sos el sistema de inteligencia de coaching del programa "Sanar OS" para profesionales de la salud. Tu rol es asistir al DIRECTOR/COACH humano dándole un briefing claro sobre el estado de un cliente específico y recomendaciones accionables para su próxima intervención.

CLIENTE: ${selectedCliente.nombre} (${selectedCliente.especialidad || 'especialidad no indicada'})
PLAN: ${selectedCliente.plan} · Día ${selectedCliente.dia_programa} de 90 · Semana ${selectedCliente.semana_programa} de 12
PROGRESO: ${selectedCliente.tareas_completadas} de ${selectedCliente.tareas_total} tareas completadas (${selectedCliente.tareas_total > 0 ? Math.round((selectedCliente.tareas_completadas / selectedCliente.tareas_total) * 100) : 0}%)
RACHA DIARIO: ${selectedCliente.racha_diario} días consecutivos
VENTAS REALES: ${selectedCliente.ventas_count}
ÚLTIMO DIARIO: ${diarioResumen}
MÉTRICAS NEGOCIO: ${lastMetric ? `${lastMetric.leads} leads, ${lastMetric.conversaciones ?? 0} llamadas, ${lastMetric.ventas} ventas en la última semana` : 'sin datos de métricas aún'}

Generá un briefing para el coach en 3 partes:
1. ESTADO ACTUAL (1-2 oraciones sobre dónde está el cliente y su ritmo real)
2. RIESGO O PUNTO CRÍTICO (qué puede frenar el avance si no se interviene)
3. ACCIÓN SUGERIDA PARA EL COACH (qué decirle o hacer en la próxima interacción — específico y directo)

Tono: profesional, directo, orientado a resultados. Sin emojis. En español.`;

      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });
      const result = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: [{ role: 'user', parts: [{ text: prompt }] }] });
      setIaRecomendacion(result.text ?? '');
    } catch {
      toast.error('Error generando recomendación IA');
    } finally {
      setIaLoading(false);
    }
  }

  async function enviarMensajePrivado() {
    if (!supabase || !selectedCliente || !mensajeInput.trim()) return;
    setEnviando(true);
    const texto = mensajeInput.trim();
    const tempId = crypto.randomUUID();
    // Optimistic insert — show immediately before DB confirms
    const optimisticMsg: Mensaje = {
      id: tempId,
      canal: 'privado',
      emisor_id: adminProfile.id,
      receptor_id: selectedCliente.id,
      contenido: texto,
      created_at: new Date().toISOString(),
    } as Mensaje;
    setDetalleMensajes(prev => [...prev, optimisticMsg]);
    setMensajeInput('');
    try {
      const { error } = await supabase.from('mensajes').insert({
        canal: 'privado', emisor_id: adminProfile.id, receptor_id: selectedCliente.id, contenido: texto
      });
      if (error) throw error;
    } catch {
      // Roll back optimistic insert
      setDetalleMensajes(prev => prev.filter(m => m.id !== tempId));
      setMensajeInput(texto);
      toast.error('Error enviando mensaje');
    } finally {
      setEnviando(false);
    }
  }

  async function cargarChatMessages(clienteId: string) {
    if (!supabase) return;
    setChatLoading(true);
    try {
      const { data } = await supabase
        .from('mensajes')
        .select('*, emisor:profiles!emisor_id(nombre, rol)')
        .or(`emisor_id.eq.${clienteId},receptor_id.eq.${clienteId}`)
        .eq('canal', 'privado')
        .order('created_at');
      setChatMessages((data as Mensaje[]) ?? []);
    } finally {
      setChatLoading(false);
    }
  }

  async function enviarChatMsg() {
    if (!supabase || !chatCliente || !chatInput.trim()) return;
    setChatEnviando(true);
    const texto = chatInput.trim();
    const tempId = crypto.randomUUID();
    const optimistic: Mensaje = {
      id: tempId, canal: 'privado', emisor_id: adminProfile.id,
      receptor_id: chatCliente.id, contenido: texto, created_at: new Date().toISOString(),
    } as Mensaje;
    setChatMessages(prev => [...prev, optimistic]);
    setChatInput('');
    try {
      const { error } = await supabase.from('mensajes').insert({
        canal: 'privado', emisor_id: adminProfile.id, receptor_id: chatCliente.id, contenido: texto
      });
      if (error) throw error;
    } catch {
      setChatMessages(prev => prev.filter(m => m.id !== tempId));
      setChatInput(texto);
      toast.error('Error enviando mensaje');
    } finally {
      setChatEnviando(false);
    }
  }

  async function cargarAdminVideos() {
    if (!supabase) return;
    setVideosLoading(true);
    try {
      const { data, error } = await supabase
        .from('programa_videos')
        .select('*')
        .order('created_at', { ascending: true });
      if (error) throw error;
      setAdminVideos(data.map((v: any) => ({
        id: v.id,
        grupo: v.grupo,
        titulo: v.titulo,
        descripcion: v.descripcion,
        youtubeUrl: v.youtube_url,
        duracion: v.duracion
      })));
    } catch {
      toast.error('Error cargando videos');
    } finally {
      setVideosLoading(false);
    }
  }

  async function saveAdminVideo(v: Omit<AdminVideo, 'id'> & { id?: string }) {
    if (!supabase) return;
    try {
      if (v.id) {
        // UPDATE
        const { error } = await supabase
          .from('programa_videos')
          .update({
            grupo: v.grupo,
            titulo: v.titulo,
            descripcion: v.descripcion,
            youtube_url: v.youtubeUrl,
            duracion: v.duracion
          })
          .eq('id', v.id);
        if (error) throw error;
        setAdminVideos(prev => prev.map(old => old.id === v.id ? { ...old, ...v, id: v.id! } : old));
        toast.success('Video actualizado');
      } else {
        // INSERT
        const { data, error } = await supabase
          .from('programa_videos')
          .insert({
            grupo: v.grupo,
            titulo: v.titulo,
            descripcion: v.descripcion,
            youtube_url: v.youtubeUrl,
            duracion: v.duracion
          })
          .select()
          .single();
        if (error) throw error;
        setAdminVideos(prev => [...prev, {
          id: data.id,
          grupo: data.grupo,
          titulo: data.titulo,
          descripcion: data.descripcion,
          youtubeUrl: data.youtube_url,
          duracion: data.duracion
        }]);
        toast.success('Video guardado en la nube');
      }
    } catch {
      toast.error('Error al guardar video');
    }
  }

  async function deleteAdminVideo(id: string) {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('programa_videos')
        .delete()
        .eq('id', id);
      if (error) throw error;
      setAdminVideos(prev => prev.filter(v => v.id !== id));
      toast.success('Video eliminado');
    } catch {
      toast.error('Error al eliminar video');
    }
  }

  async function cargarNotas(clientId: string) {
    if (!supabase) return;
    setNotaLoading(true);
    try {
      const { data } = await supabase.rpc('get_client_notes', { target_client_id: clientId });
      setDetalleNotas((data ?? []) as AdminNote[]);
    } catch {
      // RPC puede no existir todavía — silencioso
    } finally {
      setNotaLoading(false);
    }
  }

  async function agregarNota() {
    if (!supabase || !selectedCliente || !notaInput.trim()) return;
    const texto = notaInput.trim();
    setNotaInput('');
    try {
      const { error } = await supabase.from('admin_notes').insert({
        client_id: selectedCliente.id,
        author_id: adminProfile.id,
        content: texto,
      });
      if (error) throw error;
      await cargarNotas(selectedCliente.id);
    } catch {
      setNotaInput(texto);
      toast.error('Error guardando nota');
    }
  }

  async function cambiarStatusCliente(nuevoStatus: UserStatus) {
    if (!supabase || !selectedCliente) return;
    setStatusCambiando(true);
    try {
      await supabase.rpc('update_client_status', {
        target_user_id: selectedCliente.id,
        new_status: nuevoStatus,
      });
      setClientes(prev => prev.map(c =>
        c.id === selectedCliente.id ? { ...c, status: nuevoStatus } : c
      ));
      setSelectedCliente(prev => prev ? { ...prev, status: nuevoStatus } : prev);
      toast.success(`Estado actualizado a ${STATUS_CONFIG[nuevoStatus]?.label ?? nuevoStatus}`);
    } catch {
      toast.error('Error cambiando estado');
    } finally {
      setStatusCambiando(false);
    }
  }

  async function guardarConfigAdmin() {
    setGuardandoAdmin(true);
    try {
      if (supabase) {
        await supabase.from('profiles').update({
          nombre: adminDraft.nombre,
          especialidad: adminDraft.cargo,
        }).eq('id', adminProfile.id);
      }
      // Persist locally so sidebar reflects change immediately
      adminProfile.nombre = adminDraft.nombre;
      adminProfile.especialidad = adminDraft.cargo;
      toast.success('Perfil actualizado.');
      setShowAdminSettings(false);
    } catch {
      toast.error('Error al guardar. Intentá de nuevo.');
    } finally {
      setGuardandoAdmin(false);
    }
  }

  function handleAdminAvatarUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      localStorage.setItem(`tcd_admin_avatar_${adminProfile.id}`, dataUrl);
      setAdminAvatar(dataUrl);
    };
    reader.readAsDataURL(file);
  }

  async function crearClienteLocal() {
    if (!nuevoForm.email || !nuevoForm.nombre || !nuevoForm.password) return;
    setCreando(true);
    try {
      const url = import.meta.env.VITE_SUPABASE_URL;
      const key = import.meta.env.VITE_SUPABASE_ANON_KEY;
      
      // Creamos un cliente local descartable (sin persistir sesión) para no desloguear al admin
      const tempClient = createClient(url, key, {
        auth: {
          persistSession: false,
          storageKey: 'temp_auth',
          storage: { getItem: () => null, setItem: () => null, removeItem: () => null }
        }
      });

      const { data: signUpData, error } = await tempClient.auth.signUp({
        email: nuevoForm.email.trim(),
        password: nuevoForm.password.trim(),
        options: {
          data: { nombre: nuevoForm.nombre.trim() } // Esto dispara el trigger para crear en profiles!
        }
      });
      if (error) throw error;

      // Actualizar perfil con datos extra (el trigger de Supabase crea el perfil base)
      if (signUpData.user && supabase) {
        // Pequeño delay para que el trigger termine
        await new Promise(r => setTimeout(r, 1500));
        await supabase.from('profiles').update({
          especialidad: nuevoForm.especialidad.trim() || null,
          plan: nuevoForm.plan,
          fecha_inicio: nuevoForm.fecha_inicio,
          status: nuevoForm.status,
          onboarding_completed: nuevoForm.status !== 'ONBOARDING',
        }).eq('id', signUpData.user.id);
      }

      toast.success(`Cuenta creada para ${nuevoForm.nombre}. Ya puede iniciar sesión.`);
      setShowNuevoCliente(false);
      setNuevoForm({ nombre: '', email: '', password: '', especialidad: '', plan: 'DWY', fecha_inicio: new Date().toISOString().split('T')[0], status: 'ONBOARDING' });
      await cargarClientes();
    } catch (e: any) {
      toast.error(`Error creando cuenta: ${e.message}`);
    } finally {
      setCreando(false);
    }
  }

  const detailTabs: { id: DetalleTab; label: string; icon: React.ElementType }[] = [
    { id: 'resumen', label: 'Resumen', icon: TrendingUp },
    { id: 'diario', label: 'Diario', icon: Calendar },
    { id: 'metricas', label: 'Métricas', icon: BarChart2 },
    { id: 'mensajes', label: 'Chat', icon: MessageSquare },
    { id: 'notas', label: 'Notas', icon: BookOpen },
  ];

  return (
    <div className="flex h-screen bg-[#060608] text-white font-sans overflow-hidden selection:bg-indigo-500/30">
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-indigo-600/10 rounded-full blur-[150px] pointer-events-none" />
      
      {/* ─── SIDEBAR DEL ADMIN ─────────────────────────────────────────────────────────── */}
      <aside className="w-[280px] shrink-0 border-r border-white/[0.05] bg-black/40 backdrop-blur-3xl flex flex-col z-20">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-[0_0_20px_rgba(99,102,241,0.3)]">
              <Stethoscope className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-white tracking-wide">Sanar OS</h1>
              <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold">Director</p>
            </div>
          </div>

          <nav className="space-y-1">
            {[
              { id: 'dashboard', label: 'Clientes', icon: Users },
              { id: 'metricas_globales', label: 'Métricas Globales', icon: BarChart2 },
              { id: 'mensajes_privados', label: 'Mensajes', icon: MessageSquare },
              { id: 'comunidad', label: 'Comunidad', icon: Users },
              { id: 'victorias', label: 'Victorias', icon: Trophy },
              { id: 'consultas', label: 'Consultas', icon: Hash },
              { id: 'videos', label: 'Videos', icon: Video },
            ].map(item => {
              const unread = channelUnread[item.id] ?? 0;
              return (
                <button
                  key={item.id}
                  onClick={() => {
                    setMainTab(item.id as MainTab);
                    setChannelUnread(prev => ({ ...prev, [item.id]: 0 }));
                  }}
                  className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group ${
                    mainTab === item.id
                      ? 'bg-indigo-500/10 text-indigo-400'
                      : 'text-gray-400 hover:bg-white/[0.04] hover:text-white'
                  }`}
                >
                  <item.icon className="w-4 h-4" />
                  {item.label}
                  {unread > 0 && (
                    <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-purple-500 text-white text-[10px] font-bold flex items-center justify-center">
                      {unread}
                    </span>
                  )}
                </button>
              );
            })}
          </nav>
        </div>

        <div className="mt-auto p-6 border-t border-white/[0.05]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-white/10 flex items-center justify-center text-sm font-bold border border-white/20 shrink-0">
              {adminAvatar
                ? <img src={adminAvatar} alt="Admin" className="w-full h-full object-cover" />
                : adminProfile.nombre.charAt(0).toUpperCase()
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{adminProfile.nombre}</p>
              <p className="text-[10px] text-gray-500 truncate">{adminProfile.especialidad || 'Director'}</p>
            </div>
            <button
              onClick={() => { setAdminDraft({ nombre: adminProfile.nombre, cargo: adminProfile.especialidad || 'Director' }); setShowAdminSettings(true); }}
              className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-500 hover:text-white transition-colors shrink-0"
              title="Ajustes de perfil"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={onSignOut} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-gray-400 hover:bg-white/[0.05] hover:text-white transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Salir del sistema
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ──────────────────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-opacity-50">
        <header className="h-16 border-b border-white/[0.05] flex items-center px-6 shrink-0 bg-black/20 backdrop-blur-md">
          <h2 className="text-sm font-semibold text-gray-200 capitalize tracking-wide">
            {mainTab === 'dashboard' ? 'Panel de Control - Clientes'
              : mainTab === 'metricas_globales' ? 'Métricas Globales del Programa'
              : mainTab === 'mensajes_privados' ? 'Mensajes Privados'
              : mainTab === 'videos' ? 'Gestión de Videos'
              : `Canal: ${mainTab}`}
          </h2>
        </header>

        <div className={`flex-1 scrollbar-hide ${['comunidad','victorias','consultas','mensajes_privados'].includes(mainTab) ? 'overflow-hidden flex flex-col' : 'overflow-y-auto p-6'}`}>
          {mainTab === 'metricas_globales' ? (
            <div className="max-w-6xl mx-auto space-y-6">
              {/* ── Filtro de cliente ── */}
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  onClick={() => setFiltroMetricasId(null)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                    filtroMetricasId === null
                      ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                      : 'bg-white/[0.03] border-white/[0.07] text-gray-400 hover:text-white hover:bg-white/[0.06]'
                  }`}
                >
                  🌐 Global ({clientes.length})
                </button>
                {clientes.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setFiltroMetricasId(c.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                      filtroMetricasId === c.id
                        ? 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300'
                        : 'bg-white/[0.03] border-white/[0.07] text-gray-400 hover:text-white hover:bg-white/[0.06]'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${SEMAFORO_CONFIG[c.semaforo].class}`} />
                    {c.nombre.split(' ')[0]}
                  </button>
                ))}
                <button
                  onClick={() => { setMetricasGlobales(null); cargarMetricasGlobales(); cargarClientes(); }}
                  className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.07] text-xs text-gray-500 hover:text-white transition-colors"
                >
                  <Loader2 className="w-3.5 h-3.5" /> Actualizar
                </button>
              </div>

              {filtroMetricasId === null ? (
                /* ── VISTA GLOBAL ── */
                <>
                  {/* KPIs */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      {
                        label: 'Profesionales activos', value: clientes.length,
                        icon: Users, color: 'text-indigo-400', glow: 'shadow-indigo-500/20',
                        bg: 'from-indigo-600/15 to-indigo-600/5', border: 'border-indigo-500/20',
                      },
                      {
                        label: 'En ritmo 🟢', value: clientes.filter(c => c.semaforo === 'verde').length,
                        icon: CheckCheck, color: 'text-emerald-400', glow: 'shadow-emerald-500/20',
                        bg: 'from-emerald-600/15 to-emerald-600/5', border: 'border-emerald-500/20',
                      },
                      {
                        label: 'Necesitan atención', value: clientes.filter(c => c.semaforo === 'rojo' || c.semaforo === 'amarillo').length,
                        icon: AlertTriangle, color: 'text-amber-400', glow: 'shadow-amber-500/20',
                        bg: 'from-amber-600/15 to-amber-600/5', border: 'border-amber-500/20',
                      },
                      {
                        label: 'Progreso promedio',
                        value: clientes.length
                          ? `${Math.round(clientes.reduce((a, c) => a + (c.tareas_total > 0 ? (c.tareas_completadas / c.tareas_total) * 100 : (c.progreso_porcentaje ?? 0)), 0) / clientes.length)}%`
                          : '—',
                        icon: TrendingUp, color: 'text-violet-400', glow: 'shadow-violet-500/20',
                        bg: 'from-violet-600/15 to-violet-600/5', border: 'border-violet-500/20',
                      },
                    ].map((s, i) => (
                      <div key={i} className={`bg-gradient-to-b ${s.bg} border ${s.border} rounded-2xl p-5 shadow-lg ${s.glow}`}>
                        <s.icon className={`w-5 h-5 ${s.color} mb-3`} />
                        <p className={`text-3xl font-light ${s.color} mb-1`}>{s.value}</p>
                        <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Tabla de progreso por cliente */}
                  <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-white/[0.05] flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 flex items-center gap-2">
                        <BarChart2 className="w-3.5 h-3.5 text-indigo-400" /> Progreso individual
                      </h3>
                      <span className="text-[10px] text-gray-600 uppercase tracking-wider">Click en una fila para ver detalle</span>
                    </div>
                    <div className="divide-y divide-white/[0.04]">
                      {clientes.length === 0 ? (
                        <p className="text-gray-600 text-sm text-center py-10">Sin datos de clientes</p>
                      ) : clientes.map(c => {
                        const pct = c.tareas_total > 0
                          ? Math.round((c.tareas_completadas / c.tareas_total) * 100)
                          : (c.progreso_porcentaje ?? 0);
                        const pilarActual = SEED_ROADMAP_V2.findIndex((p, idx) => {
                          const completadasPilar = SEED_ROADMAP_V2.slice(0, idx + 1).reduce((a, p2) => a + p2.metas.length, 0);
                          return completadasPilar > c.tareas_completadas;
                        });
                        return (
                          <button
                            key={c.id}
                            onClick={() => setFiltroMetricasId(c.id)}
                            className="w-full flex items-center gap-4 px-6 py-4 hover:bg-white/[0.03] transition-colors text-left group"
                          >
                            <div className={`w-2 h-2 rounded-full shrink-0 ${SEMAFORO_CONFIG[c.semaforo].class}`} />
                            <div className="w-32 shrink-0">
                              <p className="text-sm font-semibold text-white group-hover:text-indigo-300 transition-colors truncate">{c.nombre}</p>
                              <p className="text-[10px] text-gray-500">Día {c.dia_programa}/90</p>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-gray-500">Pilar {Math.max(0, pilarActual)}</span>
                                <span className="text-xs font-bold text-white">{pct}%</span>
                              </div>
                              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                <div
                                  className="h-full rounded-full transition-all"
                                  style={{
                                    width: `${pct}%`,
                                    background: pct >= 70 ? 'linear-gradient(to right, #10b981, #34d399)' :
                                      pct >= 40 ? 'linear-gradient(to right, #6366f1, #8b5cf6)' :
                                      'linear-gradient(to right, #3b82f6, #6366f1)',
                                  }}
                                />
                              </div>
                            </div>
                            <div className="flex items-center gap-5 shrink-0">
                              {c.racha_diario > 0 && <div className="text-center"><p className="text-sm font-bold text-amber-400">🔥 {c.racha_diario}</p><p className="text-[9px] text-gray-600 uppercase">Racha</p></div>}
                              <div className="text-center"><p className={`text-sm font-bold ${c.ventas_count > 0 ? 'text-emerald-400' : 'text-gray-600'}`}>{c.ventas_count}</p><p className="text-[9px] text-gray-600 uppercase">Ventas</p></div>
                              <div className="text-center"><p className="text-sm font-semibold text-gray-300">{c.tareas_completadas}<span className="text-gray-600 font-normal">/{c.tareas_total}</span></p><p className="text-[9px] text-gray-600 uppercase">Tareas</p></div>
                              <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-indigo-400 transition-colors" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Estado garantía */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'En camino al resultado', icon: '✅', count: clientes.filter(c => c.estado_garantia === 'en_camino').length, color: 'text-emerald-400', border: 'border-emerald-500/20', bg: 'bg-emerald-500/5' },
                      { label: 'En riesgo de garantía', icon: '⚠️', count: clientes.filter(c => c.estado_garantia === 'en_riesgo').length, color: 'text-amber-400', border: 'border-amber-500/20', bg: 'bg-amber-500/5' },
                      { label: 'Garantía activada', icon: '🛡️', count: clientes.filter(c => c.estado_garantia === 'activada').length, color: 'text-red-400', border: 'border-red-500/20', bg: 'bg-red-500/5' },
                    ].map((s, i) => (
                      <div key={i} className={`${s.bg} border ${s.border} rounded-2xl p-5 flex items-center gap-4`}>
                        <span className="text-3xl">{s.icon}</span>
                        <div>
                          <p className={`text-3xl font-light ${s.color} mb-0.5`}>{s.count}</p>
                          <p className="text-xs text-gray-400 font-medium">{s.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* ── VISTA INDIVIDUAL ── */
                (() => {
                  const c = clientes.find(x => x.id === filtroMetricasId);
                  if (!c) return null;
                  const pct = c.tareas_total > 0
                    ? Math.round((c.tareas_completadas / c.tareas_total) * 100)
                    : (c.progreso_porcentaje ?? 0);
                  return (
                    <div className="space-y-5">
                      {/* Header del cliente */}
                      <div className="flex items-center gap-4 bg-gradient-to-r from-indigo-600/10 to-transparent border border-indigo-500/20 rounded-2xl p-5">
                        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-indigo-500/30 to-violet-500/30 border border-indigo-500/30 flex items-center justify-center text-xl font-bold text-white">
                          {c.nombre.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-white">{c.nombre}</h3>
                          <p className="text-sm text-gray-400">{c.especialidad || 'Profesional de la salud'} · {c.email}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`w-2.5 h-2.5 rounded-full ${SEMAFORO_CONFIG[c.semaforo].class}`} />
                          <span className={`text-sm font-semibold ${SEMAFORO_CONFIG[c.semaforo].text}`}>{SEMAFORO_CONFIG[c.semaforo].label}</span>
                        </div>
                      </div>

                      {/* KPIs individuales */}
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: 'Día del programa', value: `${c.dia_programa}/90`, color: 'text-indigo-400', icon: Calendar },
                          { label: 'Tareas completadas', value: `${c.tareas_completadas}/${c.tareas_total}`, color: 'text-violet-400', icon: CheckCircle2 },
                          { label: 'Racha diario', value: c.racha_diario > 0 ? `🔥 ${c.racha_diario} días` : '—', color: 'text-amber-400', icon: TrendingUp },
                          { label: 'Ventas registradas', value: c.ventas_count, color: 'text-emerald-400', icon: TrendingUp },
                        ].map((s, i) => (
                          <div key={i} className="bg-white/[0.03] border border-white/[0.07] rounded-2xl p-4">
                            <p className={`text-2xl font-light ${s.color} mb-1`}>{s.value}</p>
                            <p className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      {/* Barra de progreso total */}
                      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-bold uppercase tracking-widest text-gray-400">Progreso en el programa</p>
                          <p className="text-2xl font-light text-white">{pct}%</p>
                        </div>
                        <div className="h-3 bg-white/5 rounded-full overflow-hidden mb-2">
                          <div
                            className="h-full rounded-full transition-all duration-700"
                            style={{
                              width: `${pct}%`,
                              background: pct >= 70 ? 'linear-gradient(to right, #10b981, #34d399)' : 'linear-gradient(to right, #6366f1, #8b5cf6)',
                            }}
                          />
                        </div>
                        <div className="flex justify-between text-[10px] text-gray-600">
                          <span>Inicio</span>
                          <span>{c.tareas_completadas} de {c.tareas_total} tareas · Día {c.dia_programa} de 90</span>
                          <span>Meta</span>
                        </div>
                      </div>

                      {/* Progreso por pilar */}
                      <div className="bg-white/[0.02] border border-white/[0.06] rounded-2xl p-5">
                        <h3 className="text-xs font-bold uppercase tracking-widest text-gray-400 mb-5 flex items-center gap-2">
                          <BarChart2 className="w-3.5 h-3.5 text-indigo-400" /> Estimación por pilar
                        </h3>
                        <div className="space-y-3">
                          {SEED_ROADMAP_V2.map(pilar => {
                            const metasPilar = pilar.metas.length;
                            // Contar tareas completadas reales por pilar desde hoja_de_ruta
                            const completadasReales = (c as any).tareas_por_pilar
                              ? ((c as any).tareas_por_pilar[pilar.numero] ?? 0)
                              : Math.min(
                                  metasPilar,
                                  Math.max(0, c.tareas_completadas - SEED_ROADMAP_V2.slice(0, pilar.numero).reduce((a, p) => a + p.metas.length, 0))
                                );
                            const pctPilar = metasPilar > 0 ? Math.round((completadasReales / metasPilar) * 100) : 0;
                            const colors = ['indigo','violet','blue','cyan','emerald','amber','orange','rose','pink'];
                            const col = colors[pilar.numero % colors.length];
                            return (
                              <div key={pilar.numero} className="flex items-center gap-3">
                                <span className="text-base w-7 text-center shrink-0">{pilar.emoji}</span>
                                <span className="text-xs text-gray-400 w-32 truncate shrink-0">{pilar.titulo}</span>
                                <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                  <div
                                    className={`h-full bg-${col}-500 rounded-full transition-all`}
                                    style={{ width: `${pctPilar}%` }}
                                  />
                                </div>
                                <span className="text-xs text-gray-400 w-10 text-right shrink-0">{completadasReales}/{metasPilar}</span>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        onClick={() => { setSelectedCliente(c); setMainTab('dashboard'); setDetalleTab('resumen'); }}
                        className="w-full py-3 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 text-sm font-semibold hover:bg-indigo-500/20 transition-colors"
                      >
                        Ver perfil completo con diario, métricas y mensajes →
                      </button>
                    </div>
                  );
                })()
              )}
            </div>
          ) : mainTab === 'mensajes_privados' ? (
            /* ── MENSAJES PRIVADOS (WhatsApp style) ── */
            <div className="flex flex-1 min-h-0 overflow-hidden">
              {/* Left: client list */}
              <div className="w-[300px] shrink-0 border-r border-white/[0.06] flex flex-col bg-black/20">
                <div className="p-4 border-b border-white/[0.06]">
                  <p className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Conversaciones ({clientes.length})</p>
                </div>
                <div className="flex-1 overflow-y-auto scrollbar-hide">
                  {loading ? (
                    <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-indigo-400 animate-spin" /></div>
                  ) : clientes.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setChatCliente(c); cargarChatMessages(c.id); }}
                      className={`w-full text-left px-4 py-3.5 border-b border-white/[0.04] transition-all flex items-center gap-3 ${
                        chatCliente?.id === c.id ? 'bg-indigo-500/10' : 'hover:bg-white/[0.03]'
                      }`}
                    >
                      <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-sm font-bold border ${
                        chatCliente?.id === c.id ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-white/5 border-white/10 text-white'
                      }`}>
                        {c.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-white truncate">{c.nombre}</p>
                        <p className="text-[10px] text-gray-500 truncate">{c.especialidad || 'Sin especialidad'}</p>
                      </div>
                      <div className={`w-2 h-2 rounded-full shrink-0 ${SEMAFORO_CONFIG[c.semaforo].class}`} />
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: conversation */}
              {chatCliente ? (
                <div className="flex-1 flex flex-col min-w-0 bg-[#0a0a10]">
                  {/* Chat header */}
                  <div className="h-16 border-b border-white/[0.06] flex items-center gap-3 px-6 shrink-0 bg-black/20">
                    <div className="w-9 h-9 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-sm font-bold text-indigo-300">
                      {chatCliente.nombre.charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="text-sm font-semibold text-white">{chatCliente.nombre}</p>
                      <p className="text-[10px] text-gray-500">{chatCliente.especialidad || 'Día ' + chatCliente.dia_programa + '/90'}</p>
                    </div>
                  </div>
                  {/* Messages */}
                  <div className="flex-1 overflow-y-auto p-5 scrollbar-hide space-y-3">
                    {chatLoading ? (
                      <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
                    ) : chatMessages.length === 0 ? (
                      <div className="flex flex-col items-center justify-center h-full text-center">
                        <MessageSquare className="w-10 h-10 text-gray-800 mb-4" />
                        <p className="text-gray-500 text-sm">Comenzá la conversación con {chatCliente.nombre}</p>
                      </div>
                    ) : chatMessages.map(m => {
                      const isMe = m.emisor_id === adminProfile.id;
                      const senderName = isMe ? adminProfile.nombre : chatCliente.nombre;
                      return (
                        <div key={m.id} className={`flex gap-2.5 items-end max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                          <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold border overflow-hidden ${isMe ? 'bg-indigo-500/20 border-indigo-500/30' : 'bg-white/10 border-white/10'}`}>
                            {isMe
                              ? (adminAvatar ? <img src={adminAvatar} alt="" className="w-full h-full object-cover" /> : <Shield className="w-3.5 h-3.5 text-indigo-300" />)
                              : senderName.charAt(0).toUpperCase()
                            }
                          </div>
                          <div className="flex flex-col gap-1">
                            <span className={`text-[10px] font-semibold text-gray-500 px-1 ${isMe ? 'text-right' : ''}`}>{senderName}</span>
                            <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                              isMe ? 'bg-indigo-600/25 text-indigo-50 border border-indigo-500/20 rounded-tr-sm'
                                   : 'bg-white/[0.04] text-gray-200 border border-white/[0.06] rounded-tl-sm'
                            }`}>
                              <p>{m.contenido}</p>
                              <p className={`text-[10px] mt-1.5 opacity-40 ${isMe ? 'text-right' : ''}`}>
                                {new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                              </p>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                    <div ref={chatEndRef} />
                  </div>
                  {/* Input */}
                  <div className="p-4 border-t border-white/[0.06] shrink-0 bg-white/[0.01]">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={e => setChatInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarChatMsg()}
                        placeholder={`Mensaje a ${chatCliente.nombre}...`}
                        disabled={chatEnviando}
                        className="flex-1 bg-black/40 border border-white/10 rounded-xl py-3 px-5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                      />
                      <button
                        onClick={enviarChatMsg}
                        disabled={!chatInput.trim() || chatEnviando}
                        className="w-12 h-12 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 flex items-center justify-center transition-colors shadow-lg shadow-indigo-500/20"
                      >
                        {chatEnviando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex items-center justify-center text-center">
                  <div>
                    <MessageSquare className="w-12 h-12 text-gray-800 mx-auto mb-4" />
                    <p className="text-gray-500 text-sm">Seleccioná un cliente para chatear</p>
                  </div>
                </div>
              )}
            </div>
          ) : mainTab === 'videos' ? (
            /* ── GESTIÓN DE VIDEOS ── */
            <div className="max-w-5xl mx-auto space-y-6">
              {/* Header */}
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-light text-white tracking-tight">Videos del Programa</h2>
                  <p className="text-sm text-gray-500 mt-1">Agregá videos de YouTube por pilar. Se muestran automáticamente en la Biblioteca de tus clientes.</p>
                </div>
                <button
                  onClick={() => { setVideoForm({ grupo: 'A', titulo: '', descripcion: '', youtubeUrl: '', duracion: '' }); setShowAddVideo(true); }}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white text-sm font-semibold transition-all shadow-lg shadow-red-500/20"
                >
                  <Plus className="w-4 h-4" /> Agregar Video
                </button>
              </div>

              {/* Videos por pilar */}
              {PILARES.map(p => {
                const vids = adminVideos.filter(v => v.grupo === p.id);
                return (
                  <div key={p.id} className="bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-white/[0.06] flex items-center justify-between">
                      <p className="text-sm font-semibold text-white">{p.label}</p>
                      <span className="text-[10px] bg-white/5 px-2 py-0.5 rounded-full text-gray-500">{vids.length} videos</span>
                    </div>
                    {videosLoading ? (
                      <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-red-400 animate-spin" /></div>
                    ) : vids.length === 0 ? (
                      <div className="px-5 py-4 text-sm text-gray-600">Sin videos en este pilar todavía.</div>
                    ) : (
                      <div className="divide-y divide-white/[0.04]">
                        {vids.map(v => {
                          const vidId = getYoutubeId(v.youtubeUrl);
                          return (
                            <div key={v.id} className="flex items-center gap-4 px-5 py-3">
                              <div className="w-16 h-10 rounded-lg overflow-hidden bg-black/40 shrink-0">
                                {vidId ? (
                                  <img src={`https://img.youtube.com/vi/${vidId}/mqdefault.jpg`} alt={v.titulo} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center"><Youtube className="w-4 h-4 text-red-500/40" /></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-white truncate">{v.titulo}</p>
                                <p className="text-xs text-gray-500 truncate">{v.descripcion}</p>
                              </div>
                              {v.duracion && <span className="text-[10px] text-gray-500 shrink-0">{v.duracion}</span>}
                                <div className="flex items-center gap-2">
                                  <button
                                    onClick={() => {
                                      setVideoForm({
                                        id: v.id,
                                        grupo: v.grupo,
                                        titulo: v.titulo,
                                        descripcion: v.descripcion,
                                        youtubeUrl: v.youtubeUrl,
                                        duracion: v.duracion || ''
                                      });
                                      setShowAddVideo(true);
                                    }}
                                    className="w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 flex items-center justify-center text-gray-400 hover:text-white transition-colors shrink-0"
                                    title="Editar video"
                                  >
                                    <Settings className="w-3.5 h-3.5" />
                                  </button>
                                  <button
                                    onClick={() => deleteAdminVideo(v.id)}
                                    className="w-7 h-7 rounded-lg bg-red-500/10 hover:bg-red-500/20 flex items-center justify-center text-red-400 transition-colors shrink-0"
                                    title="Eliminar video"
                                  >
                                    <Trash2 className="w-3.5 h-3.5" />
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  );
                })}
  
                {/* Modal agregar/editar video */}
                {showAddVideo && (
                  <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
                    <div className="w-full max-w-md bg-[#0d0d12] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
                      <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-red-500 to-orange-500" />
                      <div className="flex items-center justify-between mb-6">
                        <h3 className="text-xl font-semibold text-white">{videoForm.id ? 'Editar Video' : 'Nuevo Video'}</h3>
                        <button onClick={() => setShowAddVideo(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                          <X className="w-4 h-4" />
                        </button>
                      </div>
                      <div className="space-y-4">
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">URL de YouTube *</label>
                          <input
                            type="text"
                            value={videoForm.youtubeUrl}
                            onChange={e => setVideoForm({ ...videoForm, youtubeUrl: e.target.value })}
                            placeholder="https://youtu.be/... o https://youtube.com/watch?v=..."
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                          />
                          {videoForm.youtubeUrl && getYoutubeId(videoForm.youtubeUrl) && (
                            <img
                              src={`https://img.youtube.com/vi/${getYoutubeId(videoForm.youtubeUrl)}/mqdefault.jpg`}
                              alt="preview"
                              className="mt-2 w-full rounded-xl object-cover aspect-video"
                            />
                          )}
                        </div>
                        <div>
                          <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Pilar *</label>
                          <select
                            value={videoForm.grupo}
                            onChange={e => setVideoForm({ ...videoForm, grupo: e.target.value as AdminVideo['grupo'] })}
                            className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                          >
                            {PILARES.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Título *</label>
                        <input
                          type="text"
                          value={videoForm.titulo}
                          onChange={e => setVideoForm({ ...videoForm, titulo: e.target.value })}
                          placeholder="Ej: Módulo 1 — Identidad del Fundador"
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Descripción</label>
                        <input
                          type="text"
                          value={videoForm.descripcion}
                          onChange={e => setVideoForm({ ...videoForm, descripcion: e.target.value })}
                          placeholder="Breve descripción del contenido"
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Duración (opcional)</label>
                        <input
                          type="text"
                          value={videoForm.duracion}
                          onChange={e => setVideoForm({ ...videoForm, duracion: e.target.value })}
                          placeholder="Ej: 15:30"
                          className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-red-500/50 transition-colors"
                        />
                      </div>
                    </div>
                    <div className="flex gap-3 mt-6">
                      <button onClick={() => setShowAddVideo(false)} className="flex-1 py-3 rounded-xl bg-white/5 text-gray-400 hover:text-white text-sm font-semibold transition-colors">
                        Cancelar
                      </button>
                      <button
                        disabled={!videoForm.youtubeUrl.trim() || !videoForm.titulo.trim()}
                        onClick={() => {
                          if (!videoForm.youtubeUrl.trim() || !videoForm.titulo.trim()) return;
                          saveAdminVideo({
                            id: videoForm.id,
                            grupo: videoForm.grupo,
                            titulo: videoForm.titulo.trim(),
                            descripcion: videoForm.descripcion.trim(),
                            youtubeUrl: videoForm.youtubeUrl.trim(),
                            duracion: videoForm.duracion.trim() || undefined,
                          });
                          setShowAddVideo(false);
                        }}
                        className="flex-1 py-3 rounded-xl bg-red-600 hover:bg-red-500 disabled:opacity-50 text-white text-sm font-bold transition-all flex items-center justify-center gap-2"
                      >
                        {videoForm.id ? 'Guardar Cambios' : <><Plus className="w-4 h-4" /> Agregar Video</>}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </div>
          ) : ['comunidad', 'victorias', 'consultas'].includes(mainTab) ? (
            <div className="flex-1 min-h-0 p-4">
              <GlobalChat canal={mainTab} adminProfile={adminProfile} />
            </div>
          ) : (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-4 gap-4 mb-6">
                {[
                  { label: 'Clientes activos', value: clientes.length, icon: Users, color: 'text-indigo-300', border: 'border-indigo-500/25', bg: 'from-indigo-600/20 to-indigo-600/5' },
                  { label: 'En ritmo 🟢', value: clientes.filter(c => c.semaforo === 'verde').length, icon: CheckCheck, color: 'text-emerald-300', border: 'border-emerald-500/25', bg: 'from-emerald-600/20 to-emerald-600/5' },
                  { label: 'Necesitan atención', value: clientes.filter(c => c.semaforo === 'rojo' || c.semaforo === 'amarillo').length, icon: AlertTriangle, color: 'text-amber-300', border: 'border-amber-500/25', bg: 'from-amber-600/20 to-amber-600/5' },
                  { label: 'Progreso promedio', value: clientes.length ? `${Math.round(clientes.reduce((acc, c) => acc + (c.tareas_total > 0 ? (c.tareas_completadas / c.tareas_total) * 100 : (c.progreso_porcentaje ?? 0)), 0) / clientes.length)}%` : '—', icon: TrendingUp, color: 'text-violet-300', border: 'border-violet-500/25', bg: 'from-violet-600/20 to-violet-600/5' },
                ].map((stat, i) => (
                  <div key={i} className={`bg-gradient-to-b ${stat.bg} border ${stat.border} rounded-2xl p-5 relative overflow-hidden`}>
                    <stat.icon className={`w-5 h-5 ${stat.color} mb-3 opacity-70`} />
                    <p className={`text-3xl font-light ${stat.color} mb-1 tracking-tight`}>{stat.value}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Main layout Dashboard */}
              <div className="flex gap-6" style={{ height: 'calc(100vh - 220px)', minHeight: 540 }}>
                {/* Lista de clientes */}
                <div className={`shrink-0 flex flex-col transition-all duration-300 ${selectedCliente ? 'w-[280px]' : 'w-full max-w-2xl mx-auto'}`}>
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">
                      Directorio ({filtroStatus === 'ALL' ? clientes.length : clientes.filter(c => c.status === filtroStatus || (!c.status && filtroStatus === 'ACTIVE')).length})
                    </h2>
                    <button
                      onClick={() => setShowNuevoCliente(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Nuevo
                    </button>
                  </div>
                  {/* Filtro por estado */}
                  <div className="flex gap-1 flex-wrap mb-3">
                    {(['ALL', 'ACTIVE', 'ONBOARDING', 'PAUSED', 'CHURNED'] as const).map(s => (
                      <button
                        key={s}
                        onClick={() => setFiltroStatus(s)}
                        className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-colors ${
                          filtroStatus === s
                            ? s === 'ALL' ? 'bg-white/10 text-white' : `${STATUS_CONFIG[s]?.bg} ${STATUS_CONFIG[s]?.color} border ${STATUS_CONFIG[s]?.border}`
                            : 'bg-white/5 text-gray-500 hover:text-gray-300'
                        }`}
                      >
                        {s === 'ALL' ? 'Todos' : STATUS_CONFIG[s]?.label}
                      </button>
                    ))}
                  </div>

                  {loading ? (
                    <div className="flex items-center justify-center py-16"><Loader2 className="w-5 h-5 text-indigo-400 animate-spin" /></div>
                  ) : clientes.length === 0 ? (
                    <div className="text-center py-16 bg-white/[0.02] rounded-3xl border border-white/[0.05] border-dashed">
                      <Users className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                      <p className="text-gray-500 text-sm">Sin clientes aún</p>
                    </div>
                  ) : (
                    <div className="space-y-2 overflow-y-auto scrollbar-hide pr-2">
                      {clientes.filter(c => filtroStatus === 'ALL' || c.status === filtroStatus || (!c.status && filtroStatus === 'ACTIVE')).map(cliente => (
                        <button
                          key={cliente.id}
                          onClick={() => { setSelectedCliente(cliente); setDetalleTab('resumen'); setIaRecomendacion(''); }}
                          className={`w-full text-left p-4 rounded-2xl border transition-all relative overflow-hidden ${
                            selectedCliente?.id === cliente.id
                              ? 'bg-indigo-500/10 border-indigo-500/30'
                              : 'bg-white/[0.02] border-white/[0.05] hover:bg-white/[0.05] hover:border-white/10'
                          }`}
                        >
                          <div className={`absolute left-0 top-0 bottom-0 w-1 ${SEMAFORO_CONFIG[cliente.semaforo].class} opacity-80`} />
                          <div className="flex items-center gap-3 pl-2">
                            <div className="w-10 h-10 rounded-full bg-white/5 border border-white/10 flex items-center justify-center text-xs font-bold text-white shrink-0">
                              {cliente.nombre.charAt(0).toUpperCase()}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-0.5">
                                <h3 className="text-sm font-semibold text-white truncate">{cliente.nombre}</h3>
                                {cliente.plan === 'DFY' && (
                                  <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400 border border-purple-500/20 shrink-0">DFY</span>
                                )}
                              </div>
                              <p className="text-[10px] text-gray-400">
                                Día {cliente.dia_programa}/90 · <span className={SEMAFORO_CONFIG[cliente.semaforo].text}>{SEMAFORO_CONFIG[cliente.semaforo].label}</span>
                              </p>
                              <div className="flex items-center gap-2 mt-1">
                                {cliente.racha_diario > 0 && (
                                  <span className="text-[9px] text-amber-400/80 font-medium">🔥 {cliente.racha_diario}d</span>
                                )}
                                {cliente.ventas_count > 0 && (
                                  <span className="text-[9px] text-emerald-400/80 font-medium">💰 {cliente.ventas_count} venta{cliente.ventas_count !== 1 ? 's' : ''}</span>
                                )}
                                {cliente.estado_garantia === 'activada' && (
                                  <span className="text-[9px] text-red-400/80 font-bold">⚠ Garantía</span>
                                )}
                                {cliente.estado_garantia === 'en_riesgo' && (
                                  <span className="text-[9px] text-amber-400/80 font-bold">⚠ En riesgo</span>
                                )}
                              </div>
                            </div>
                            <ChevronRight className="w-4 h-4 text-gray-600 shrink-0" />
                          </div>
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                {/* Panel de detalle */}
                {selectedCliente ? (
                  <div className="flex-1 bg-[#0a0a10] border border-white/[0.08] rounded-2xl overflow-hidden flex flex-col shadow-2xl relative">
                    {/* Header Pestaña Detalle */}
                    <div className="absolute top-0 right-0 p-4">
                      <button onClick={() => setSelectedCliente(null)} className="p-2 rounded-full bg-black/40 text-gray-400 hover:text-white hover:bg-white/10 transition-colors backdrop-blur-md">
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                    
                    <div className="p-8 border-b border-white/[0.05] flex items-center gap-5 shrink-0 bg-gradient-to-b from-white/[0.03] to-transparent">
                      <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-purple-500/20 border border-indigo-500/30 flex items-center justify-center text-xl font-bold text-indigo-300 shadow-inner">
                        {selectedCliente.nombre.charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                          <h3 className="text-2xl font-light text-white tracking-tight">{selectedCliente.nombre}</h3>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${selectedCliente.plan === 'DFY' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : selectedCliente.plan === 'IMPLEMENTACION' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'}`}>
                            {selectedCliente.plan}
                          </span>
                          {/* Status badge + quick change */}
                          <div className="flex items-center gap-1.5 relative group">
                            {(() => {
                              const st = selectedCliente.status ?? 'ACTIVE';
                              const cfg = STATUS_CONFIG[st];
                              return (
                                <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${cfg?.bg} ${cfg?.color} border ${cfg?.border}`}>
                                  {cfg?.label ?? st}
                                </span>
                              );
                            })()}
                            <select
                              disabled={statusCambiando}
                              value={selectedCliente.status ?? 'ACTIVE'}
                              onChange={e => cambiarStatusCliente(e.target.value as UserStatus)}
                              className="opacity-0 absolute inset-0 w-full cursor-pointer"
                              title="Cambiar estado"
                            >
                              {Object.entries(STATUS_CONFIG).map(([val, cfg]) => (
                                <option key={val} value={val}>{cfg.label}</option>
                              ))}
                            </select>
                            <span className="text-[9px] text-gray-600 group-hover:text-gray-400 transition-colors" title="Click en el badge para cambiar">✎</span>
                          </div>
                        </div>
                        <p className="text-xs text-gray-400 flex items-center gap-2">
                          <Lock className="w-3 h-3 text-gray-600" /> {selectedCliente.email}
                          {selectedCliente.especialidad && <><span>·</span> {selectedCliente.especialidad}</>}
                        </p>
                      </div>
                    </div>

                    {/* Tabs nav */}
                    <div className="flex border-b border-white/[0.05] px-6 shrink-0 bg-black/20">
                      {detailTabs.map(tab => (
                        <button
                          key={tab.id}
                          onClick={() => setDetalleTab(tab.id)}
                          className={`flex items-center gap-2 px-4 py-4 text-xs font-semibold uppercase tracking-wider transition-all relative ${
                            detalleTab === tab.id
                              ? 'text-indigo-400'
                              : 'text-gray-500 hover:text-gray-300'
                          }`}
                        >
                          <tab.icon className="w-3.5 h-3.5" />
                          {tab.label}
                          {detalleTab === tab.id && (
                            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-indigo-500 rounded-t-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                          )}
                        </button>
                      ))}
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-black/10">
                      {detalleLoading ? (
                        <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 text-indigo-400 animate-spin" /></div>
                      ) : (
                        <>
                          {/* ── RESUMEN ── */}
                          {detalleTab === 'resumen' && (
                            <div className="space-y-6">
                              {/* v2.0 Status Bar */}
                              <div className="grid grid-cols-4 gap-3">
                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 text-center">
                                  <p className="text-2xl font-light text-white">{selectedCliente.dia_programa}</p>
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Día / 90</p>
                                </div>
                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 text-center">
                                  <p className="text-2xl font-light text-amber-400">🔥 {selectedCliente.racha_diario}</p>
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Racha diario</p>
                                </div>
                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-4 text-center">
                                  <p className="text-2xl font-light text-emerald-400">{selectedCliente.ventas_count}</p>
                                  <p className="text-[10px] text-gray-500 uppercase tracking-wider mt-1">Ventas reales</p>
                                </div>
                                <div className={`rounded-2xl p-4 text-center border ${
                                  selectedCliente.estado_garantia === 'activada' ? 'bg-red-500/10 border-red-500/30' :
                                  selectedCliente.estado_garantia === 'en_riesgo' ? 'bg-amber-500/10 border-amber-500/30' :
                                  'bg-white/[0.02] border-white/[0.05]'
                                }`}>
                                  <Shield className={`w-6 h-6 mx-auto mb-1 ${
                                    selectedCliente.estado_garantia === 'activada' ? 'text-red-400' :
                                    selectedCliente.estado_garantia === 'en_riesgo' ? 'text-amber-400' : 'text-gray-600'
                                  }`} />
                                  <p className={`text-[10px] uppercase tracking-wider font-bold ${
                                    selectedCliente.estado_garantia === 'activada' ? 'text-red-400' :
                                    selectedCliente.estado_garantia === 'en_riesgo' ? 'text-amber-400' : 'text-gray-500'
                                  }`}>{selectedCliente.estado_garantia === 'activada' ? 'Garantía' : selectedCliente.estado_garantia === 'en_riesgo' ? 'En riesgo' : 'En camino'}</p>
                                </div>
                              </div>

                              <div className="grid grid-cols-2 gap-4">
                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5">
                                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-1 font-bold">Progreso de Tareas</p>
                                  <div className="flex items-end gap-2 mb-3">
                                    <p className="text-3xl font-light text-white">{selectedCliente.tareas_completadas}</p>
                                    <p className="text-sm text-gray-500 mb-1">/ {selectedCliente.tareas_total}</p>
                                  </div>
                                  <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                                    <div className="h-full bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full" style={{ width: `${selectedCliente.tareas_total > 0 ? Math.round((selectedCliente.tareas_completadas / selectedCliente.tareas_total) * 100) : 0}%` }} />
                                  </div>
                                </div>
                                <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5">
                                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Último Diario</p>
                                  {detalleDiario[0] ? (
                                    <>
                                      <p className="text-xs text-gray-500 mb-2">{new Date(detalleDiario[0].fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                      {detalleDiario[0].respuestas?.q3 && (
                                        <div className="flex items-center gap-1.5 mb-2">
                                          <span className="text-[10px] text-gray-500 uppercase font-bold">Energía</span>
                                          <div className="flex gap-0.5">
                                            {Array.from({ length: 10 }).map((_, i) => (
                                              <div key={i} className={`w-2 h-2 rounded-sm ${i < Number(detalleDiario[0].respuestas.q3) ? 'bg-amber-400' : 'bg-white/10'}`} />
                                            ))}
                                          </div>
                                          <span className="text-[10px] text-amber-400 font-bold">{detalleDiario[0].respuestas.q3}/10</span>
                                        </div>
                                      )}
                                      {detalleDiario[0].respuestas?.q4 && (
                                        <p className="text-xs text-gray-300 line-clamp-2"><span className="text-emerald-400 font-bold">Acción: </span>{detalleDiario[0].respuestas.q4}</p>
                                      )}
                                      {detalleDiario[0].respuestas?.q2 && (
                                        <p className="text-xs text-gray-400 mt-1 line-clamp-1"><span className="text-amber-400 font-bold">Freno: </span>{detalleDiario[0].respuestas.q2}</p>
                                      )}
                                    </>
                                  ) : <p className="text-xs text-gray-600">Sin entradas de diario aún</p>}
                                </div>
                              </div>

                              <div className="bg-indigo-500/[0.05] border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden">
                                <Bot className="absolute -right-6 -bottom-6 w-32 h-32 text-indigo-500/10" />
                                <div className="relative z-10">
                                  <div className="flex items-center justify-between mb-4">
                                    <div className="flex items-center gap-2">
                                      <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center">
                                        <Bot className="w-4 h-4 text-indigo-400" />
                                      </div>
                                      <p className="text-xs font-bold uppercase tracking-widest text-indigo-400">Coach AI Assistant</p>
                                    </div>
                                    <button
                                      onClick={generarRecomendacion} disabled={iaLoading}
                                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-500 text-white text-xs font-bold transition-all hover:bg-indigo-400 disabled:opacity-50 shadow-lg shadow-indigo-500/20"
                                    >
                                      {iaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                      Analizar y Sugerir
                                    </button>
                                  </div>
                                  {iaRecomendacion ? (
                                    <div className="bg-black/20 rounded-xl p-4 border border-indigo-500/20">
                                      <p className="text-sm text-indigo-100 leading-relaxed whitespace-pre-line">{iaRecomendacion}</p>
                                    </div>
                                  ) : (
                                    <p className="text-xs text-gray-500">Haz clic en Analizar para que la IA escanee el perfil, métricas diarias y tareas pendientes de este cliente para crear recomendaciones proactivas de coaching.</p>
                                  )}
                                </div>
                              </div>
                            </div>
                          )}

                          {/* ── DIARIO ── */}
                          {detalleTab === 'diario' && (
                            <div className="space-y-4">
                              {detalleDiario.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-12">Sin entradas de diario</p>
                              ) : detalleDiario.map((entrada: any, i: number) => {
                                const r = entrada.respuestas ?? {};
                                return (
                                  <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                                    <div className="flex items-center justify-between mb-4">
                                      <p className="text-sm font-semibold text-white tracking-wide">
                                        {new Date(entrada.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                      </p>
                                      {r.q3 && (
                                        <div className="flex items-center gap-1.5">
                                          <span className="text-[10px] text-gray-500 uppercase font-bold">Energía</span>
                                          <div className="flex gap-0.5">
                                            {Array.from({ length: 10 }).map((_, idx) => (
                                              <div key={idx} className={`w-2 h-2 rounded-sm ${idx < Number(r.q3) ? 'bg-amber-400' : 'bg-white/10'}`} />
                                            ))}
                                          </div>
                                          <span className="text-[10px] text-amber-400 font-bold">{r.q3}/10</span>
                                        </div>
                                      )}
                                    </div>
                                    <div className="grid grid-cols-2 gap-4">
                                      {r.q1 && <div className="col-span-2"><p className="text-[10px] uppercase font-bold text-blue-400/70 mb-1">Cómo se sintió</p><p className="text-xs text-gray-300">{r.q1}</p></div>}
                                      {r.q4 && <div><p className="text-[10px] uppercase font-bold text-emerald-500/70 mb-1">Acción tomada</p><p className="text-xs text-gray-300">{r.q4}</p></div>}
                                      {r.q5 && <div><p className="text-[10px] uppercase font-bold text-purple-500/70 mb-1">Pensamiento dominante</p><p className="text-xs text-gray-300">{r.q5}</p></div>}
                                      {r.q2 && <div className="col-span-2"><p className="text-[10px] uppercase font-bold text-amber-500/70 mb-1">Lo que lo frenó</p><p className="text-xs text-gray-300">{r.q2}</p></div>}
                                      {r.q6 && <div><p className="text-[10px] uppercase font-bold text-pink-500/70 mb-1">Emoción predominante</p><p className="text-xs text-gray-300">{r.q6}</p></div>}
                                      {r.q7 && <div><p className="text-[10px] uppercase font-bold text-indigo-400/70 mb-1">Plan para mañana</p><p className="text-xs text-gray-300">{r.q7}</p></div>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}

                          {/* ── MÉTRICAS ── */}
                          {detalleTab === 'metricas' && (
                            <div className="space-y-5">
                              {/* Progreso por pilar — siempre visible */}
                              <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-5">
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-4">Progreso por Pilar</h3>
                                <div className="space-y-3">
                                  {SEED_ROADMAP_V2.map(pilar => {
                                    const metasPilar = pilar.metas.length;
                                    const completadas = selectedCliente.tareas_por_pilar?.[pilar.numero] ?? 0;
                                    const pct = metasPilar > 0 ? Math.round((completadas / metasPilar) * 100) : 0;
                                    const colors = ['indigo','violet','blue','cyan','emerald','amber','orange','rose','pink'];
                                    const col = colors[pilar.numero % colors.length];
                                    return (
                                      <div key={pilar.numero} className="flex items-center gap-3">
                                        <span className="text-base w-7 text-center shrink-0">{pilar.emoji}</span>
                                        <span className="text-xs text-gray-400 w-36 truncate shrink-0">{pilar.titulo}</span>
                                        <div className="flex-1 h-2 bg-white/5 rounded-full overflow-hidden">
                                          <div className={`h-full bg-${col}-500 rounded-full transition-all`} style={{ width: `${pct}%` }} />
                                        </div>
                                        <span className="text-xs text-gray-400 w-10 text-right shrink-0">{completadas}/{metasPilar}</span>
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>

                              {/* Métricas de negocio semanales */}
                              <div>
                                <h3 className="text-[10px] font-bold uppercase tracking-widest text-gray-400 mb-3">Métricas de Negocio Semanales</h3>
                                {detalleMetricas.length === 0 ? (
                                  <div className="bg-white/[0.02] border border-white/[0.05] rounded-2xl p-6 text-center">
                                    <p className="text-sm text-gray-500">El cliente aún no cargó métricas semanales.</p>
                                    <p className="text-xs text-gray-600 mt-1">Se completan desde la sección Métricas del cliente.</p>
                                  </div>
                                ) : detalleMetricas.slice().reverse().map((m: any, i: number) => (
                                  <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between mb-3">
                                    <span className="text-xs font-semibold text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg">{m.semana}</span>
                                    <div className="flex gap-8">
                                      <div className="text-center"><p className="text-white text-lg font-light">{m.leads}</p><p className="text-[10px] text-gray-500 font-bold uppercase">leads</p></div>
                                      <div className="text-center"><p className="text-white text-lg font-light">{m.conversaciones ?? 0}</p><p className="text-[10px] text-gray-500 font-bold uppercase">llamadas</p></div>
                                      <div className="text-center"><p className="text-emerald-400 text-lg font-bold">{m.ventas}</p><p className="text-[10px] text-emerald-500/50 font-bold uppercase">ventas</p></div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* ── NOTAS INTERNAS ── */}
                          {detalleTab === 'notas' && (
                            <div className="space-y-4">
                              <p className="text-[10px] text-gray-600 uppercase tracking-wider font-bold">Solo visible para admins · No la ve el cliente</p>
                              {/* Input nueva nota */}
                              <div className="flex gap-2">
                                <textarea
                                  value={notaInput}
                                  onChange={e => setNotaInput(e.target.value)}
                                  onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) agregarNota(); }}
                                  placeholder="Escribí una nota interna... (Ctrl+Enter para guardar)"
                                  rows={3}
                                  className="flex-1 bg-black/40 border border-white/10 rounded-xl py-3 px-4 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all resize-none"
                                />
                                <button
                                  onClick={agregarNota}
                                  disabled={!notaInput.trim()}
                                  className="w-12 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 flex items-center justify-center transition-colors shadow-lg shadow-indigo-500/20 shrink-0"
                                >
                                  <Send className="w-4 h-4" />
                                </button>
                              </div>
                              {/* Lista de notas */}
                              {notaLoading ? (
                                <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-indigo-400 animate-spin" /></div>
                              ) : detalleNotas.length === 0 ? (
                                <div className="text-center py-12">
                                  <BookOpen className="w-8 h-8 text-gray-800 mx-auto mb-3" />
                                  <p className="text-gray-500 text-sm">Sin notas aún. Usá esto para documentar contexto importante del cliente.</p>
                                </div>
                              ) : detalleNotas.map(nota => (
                                <div key={nota.id} className="bg-white/[0.02] border border-white/[0.06] rounded-xl p-4">
                                  <p className="text-sm text-gray-200 leading-relaxed whitespace-pre-wrap">{nota.content}</p>
                                  <p className="text-[10px] text-gray-600 mt-2">
                                    {new Date(nota.created_at).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                                  </p>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* ── MENSAJES ── */}
                          {detalleTab === 'mensajes' && (
                            <div className="space-y-3">
                              {detalleMensajes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                  <MessageSquare className="w-10 h-10 text-gray-800 mb-4" />
                                  <p className="text-gray-500 text-sm">Comenzá la conversación con {selectedCliente.nombre}</p>
                                </div>
                              ) : detalleMensajes.map(m => {
                                const isMe = m.emisor_id === adminProfile.id;
                                const senderName = isMe ? adminProfile.nombre : selectedCliente.nombre;
                                const initial = senderName.charAt(0).toUpperCase();
                                return (
                                  <div key={m.id} className={`flex gap-2.5 items-end max-w-[88%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                                    {/* Avatar */}
                                    <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold border overflow-hidden ${isMe ? 'bg-indigo-500/20 border-indigo-500/30 text-indigo-300' : 'bg-white/10 border-white/10 text-white'}`}>
                                      {isMe
                                        ? (adminAvatar ? <img src={adminAvatar} alt="" className="w-full h-full object-cover" /> : <Shield className="w-3.5 h-3.5" />)
                                        : initial}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <span className={`text-[10px] font-semibold text-gray-500 px-1 ${isMe ? 'text-right' : ''}`}>{senderName}</span>
                                      <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                                        isMe ? 'bg-indigo-600/25 text-indigo-50 border border-indigo-500/20 rounded-tr-sm'
                                             : 'bg-white/[0.04] text-gray-200 border border-white/[0.06] rounded-tl-sm'
                                      }`}>
                                        {m.contenido && <p>{m.contenido}</p>}
                                        <p className={`text-[10px] mt-1.5 opacity-40 ${isMe ? 'text-right' : ''}`}>
                                          {new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                );
                              })}
                              <div ref={messagesEndRef} />
                            </div>
                          )}
                        </>
                      )}
                    </div>

                    {/* Chat input for private messages */}
                    {detalleTab === 'mensajes' && (
                      <div className="p-4 border-t border-white/[0.05] shrink-0 bg-white/[0.01]">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={mensajeInput}
                            onChange={e => setMensajeInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensajePrivado()}
                            placeholder="Escribe un mensaje privado..."
                            disabled={enviando}
                            className="flex-1 bg-black/40 border border-white/10 rounded-xl py-3 px-5 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-all"
                          />
                          <button
                            onClick={enviarMensajePrivado}
                            disabled={!mensajeInput.trim() || enviando}
                            className="w-12 h-12 rounded-xl bg-indigo-500 hover:bg-indigo-400 disabled:opacity-50 flex items-center justify-center transition-colors shadow-lg shadow-indigo-500/20"
                          >
                            {enviando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                ) : null}
              </div>
            </>
          )}
        </div>
      </main>

      {/* ─── MODAL AJUSTES ADMIN ────────────────────────────────────────────────────── */}
      {showAdminSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#0d0d12] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-white">Ajustes de Perfil Admin</h3>
              <button onClick={() => setShowAdminSettings(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Avatar */}
            <div className="flex flex-col items-center gap-3 mb-6">
              <input ref={adminAvatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAdminAvatarUpload} />
              <button
                onClick={() => adminAvatarInputRef.current?.click()}
                className="relative group w-20 h-20 rounded-full border-2 border-dashed border-white/20 hover:border-indigo-500/50 transition-colors overflow-hidden"
              >
                {adminAvatar ? (
                  <img src={adminAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-indigo-500/10 flex items-center justify-center text-2xl font-bold text-indigo-300">
                    {(adminDraft.nombre || 'A').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </button>
              <p className="text-xs text-gray-500">Clic para cambiar foto</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Nombre completo</label>
                <input
                  type="text"
                  value={adminDraft.nombre}
                  onChange={e => setAdminDraft({ ...adminDraft, nombre: e.target.value })}
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Cargo / Título</label>
                <input
                  type="text"
                  value={adminDraft.cargo}
                  onChange={e => setAdminDraft({ ...adminDraft, cargo: e.target.value })}
                  placeholder="Ej: Coach Principal, Soporte Técnico..."
                  className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowAdminSettings(false)} className="flex-1 py-3 rounded-xl bg-white/5 text-gray-400 hover:text-white text-sm font-semibold transition-colors">
                Cancelar
              </button>
              <button
                onClick={guardarConfigAdmin}
                disabled={guardandoAdmin || !adminDraft.nombre.trim()}
                className="flex-1 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold transition-all flex items-center justify-center gap-2"
              >
                {guardandoAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL NUEVO CLIENTE (CON CONTRASEÑA DIRECTA) ────────────────────────── */}
      {showNuevoCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#0d0d12] border border-white/10 rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-indigo-500 to-purple-500" />
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-semibold text-white tracking-tight">Nuevo Estudiante</h3>
                <p className="text-xs text-gray-500 mt-1">Ingresa sus datos para la academia</p>
              </div>
              <button onClick={() => setShowNuevoCliente(false)} className="w-8 h-8 rounded-full bg-white/5 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Nombre completo *</label>
                <input type="text" value={nuevoForm.nombre} onChange={e => setNuevoForm({ ...nuevoForm, nombre: e.target.value })} placeholder="Ej: Dra. María González" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Email *</label>
                <input type="email" value={nuevoForm.email} onChange={e => setNuevoForm({ ...nuevoForm, email: e.target.value })} placeholder="maria@ejemplo.com" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-emerald-400/80 mb-2">Contraseña inicial *</label>
                <input type="text" value={nuevoForm.password} onChange={e => setNuevoForm({ ...nuevoForm, password: e.target.value })} placeholder="Ej: Maria123!" className="w-full bg-emerald-500/5 border border-emerald-500/20 rounded-xl px-4 py-3 text-sm text-emerald-100 placeholder-emerald-900/50 focus:outline-none focus:border-emerald-500/50 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Especialidad</label>
                <input type="text" value={nuevoForm.especialidad} onChange={e => setNuevoForm({ ...nuevoForm, especialidad: e.target.value })} placeholder="Ej: Nutricionista" className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Plan</label>
                  <CustomSelect
                    value={nuevoForm.plan}
                    onChange={(val) => setNuevoForm({ ...nuevoForm, plan: val as 'DWY' | 'DFY' | 'IMPLEMENTACION' })}
                    options={[
                      { value: 'DWY', label: 'DWY — Solo App' },
                      { value: 'DFY', label: 'DFY — Con Paolis' },
                      { value: 'IMPLEMENTACION', label: 'Implementación' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Inicio</label>
                  <input type="date" value={nuevoForm.fecha_inicio} onChange={e => setNuevoForm({ ...nuevoForm, fecha_inicio: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Estado inicial</label>
                <CustomSelect
                  value={nuevoForm.status}
                  onChange={(val) => setNuevoForm({ ...nuevoForm, status: val as UserStatus })}
                  options={[
                    { value: 'ONBOARDING', label: 'Onboarding (cliente nuevo)' },
                    { value: 'ACTIVE', label: 'Activo (ya conoce la app)' },
                  ]}
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={crearClienteLocal} disabled={creando || !nuevoForm.email || !nuevoForm.nombre || !nuevoForm.password} className="flex-1 py-3.5 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-sm font-bold shadow-xl shadow-indigo-500/20 transition-all flex items-center justify-center gap-2">
                {creando ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando cuenta...</> : 'Crear Cuenta Activa'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
