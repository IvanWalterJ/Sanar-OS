import React, { useState, useEffect, useRef } from 'react';
import CustomSelect from '../components/CustomSelect';
import {
  Users, Send, ChevronRight, X, Plus, Loader2,
  Stethoscope, CheckCircle2, Circle, LogOut,
  MessageSquare, BookOpen, BarChart2, Calendar,
  TrendingUp, TrendingDown, Sparkles, Bot,
  Hash, Trophy, Lock, Shield,
  CheckCheck, AlertTriangle, Image, Mic, Settings, Camera,
  Video, Trash2, Youtube, Play, ChevronDown, FileText,
  Globe, Flame, Star, DollarSign, Pencil,
  Sprout, Target, Sunrise, UserCircle, Lightbulb, Triangle,
  Cog, Building2, Megaphone, Phone, Handshake, Palette, BarChart3,
  Search, UsersRound, Check, ClipboardList,
} from 'lucide-react';

const ADMIN_PILAR_ICON_MAP: Record<string, React.ComponentType<{ className?: string }>> = {
  Sprout, BookOpen, Target, Sunrise, UserCircle, Lightbulb, Triangle, Cog,
  Building2, Megaphone, Phone, Handshake, Palette, BarChart3,
};
import { supabase, type Profile, type Mensaje, type AdminNote, type UserStatus, type PilarId, isSupabaseReady, PILAR_ORDER } from '../lib/supabase';
import { SEED_ROADMAP_V3, SEED_ROADMAP_V2 } from '../lib/roadmapSeed';
import { GoogleGenAI } from '@google/genai';
import { toast } from 'sonner';
import { createClient } from '@supabase/supabase-js';
import Markdown from 'react-markdown';

// ─── TIPOS Y CONSTANTES ─────────────────────────────────────────────────────────

type AdminRol = 'owner' | 'manager' | 'staff';
type MainTab = 'clientes' | 'mensajes' | 'metricas' | 'videos' | 'equipo';
type DetalleTab = 'resumen' | 'diario' | 'metricas' | 'mensajes' | 'notas';
type MensajesChannel = 'comunidad' | 'victorias' | 'consultas' | 'privados';

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
  tareas_por_pilar: Record<number, number>;
  ultima_entrada_diario?: string;
  racha_diario: number;
  ventas_count: number;
  estado_garantia: 'en_camino' | 'en_riesgo' | 'activada';
  progreso_porcentaje: number;
}

interface AdminVideo {
  id: string;
  grupo: string;
  pilar_id?: PilarId;
  titulo: string;
  descripcion: string;
  youtubeUrl: string;
  duracion?: string;
}

interface AdminChecklistItem {
  id: string;
  admin_id: string;
  titulo: string;
  categoria: 'diaria' | 'semanal' | 'mensual';
  completada: boolean;
  fecha_completada?: string;
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; border: string }> = {
  ONBOARDING: { label: 'Onboarding', color: 'text-[#F5F0E1]/50',  bg: 'bg-[#F5F0E1]/5',  border: 'border-[#F5F0E1]/10' },
  ACTIVE:     { label: 'Activo',     color: 'text-[#2DD4A0]',      bg: 'bg-[#2DD4A0]/10', border: 'border-[#2DD4A0]/20' },
  PAUSED:     { label: 'Pausado',    color: 'text-[#D4A24E]',      bg: 'bg-[#D4A24E]/10', border: 'border-[#D4A24E]/20' },
  COMPLETED:  { label: 'Completado', color: 'text-[#2DD4A0]',      bg: 'bg-[#2DD4A0]/10', border: 'border-[#2DD4A0]/20' },
  CHURNED:    { label: 'Inactivo',   color: 'text-[#E85555]',      bg: 'bg-[#E85555]/10', border: 'border-[#E85555]/20' },
};

const STATUS_BADGE_COLOR: Record<string, string> = {
  ACTIVE:     '#2DD4A0',
  PAUSED:     '#D4A24E',
  ONBOARDING: 'rgba(245,240,225,0.5)',
  CHURNED:    '#E85555',
  COMPLETED:  '#2DD4A0',
};

const SEMAFORO_CONFIG = {
  verde:    { class: 'bg-[#2DD4A0] shadow-[0_0_8px_rgba(16,185,129,0.4)]', label: 'En ritmo',        text: 'text-[#2DD4A0]' },
  amarillo: { class: 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]', label: 'Atenci\u00f3n',   text: 'text-[#D4A24E]' },
  rojo:     { class: 'bg-[#E85555] shadow-[0_0_8px_rgba(239,68,68,0.4)]',  label: 'Necesita ayuda',  text: 'text-[#E85555]' },
  gris:     { class: 'bg-gray-600',                                         label: 'Sin datos',       text: 'text-[#F5F0E1]/60' },
};

// Build pilar options from SEED_ROADMAP_V3
const PILAR_OPTIONS: { id: PilarId; label: string }[] = SEED_ROADMAP_V3.map(p => ({
  id: p.id,
  label: `${p.id} \u2014 ${p.titulo}`,
}));

function getYoutubeId(url: string): string | null {
  const m = url.match(/(?:v=|youtu\.be\/|embed\/)([a-zA-Z0-9_-]{11})/);
  return m ? m[1] : null;
}

function calcDias(fecha_inicio: string): { dia: number; semana: number } {
  const diff = Math.floor((new Date().getTime() - new Date(fecha_inicio).getTime()) / (1000 * 60 * 60 * 24));
  const dia = Math.max(1, Math.min(90, diff + 1));
  return { dia, semana: Math.max(1, Math.min(12, Math.floor(diff / 7) + 1)) };
}

function derivePilarFromProgress(tareas_completadas: number): PilarId {
  let acum = 0;
  for (const pilar of SEED_ROADMAP_V3) {
    acum += pilar.metas.length;
    if (acum > tareas_completadas) return pilar.id;
  }
  return 'P11';
}

// ─── COMPONENTE CHAT GLOBAL ADMIN ────────────────────────────────────────────────

function GlobalChat({ canal, adminProfile }: { canal: string; adminProfile: Profile }) {
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
      toast.error('Error subiendo archivo. Verific\u00e1 que el bucket exista en Supabase.');
    } finally {
      setUploading(false);
    }
  }

  return (
    <div className="flex flex-col h-full min-h-0 bg-[#241A0C]/30 border border-[rgba(212,162,78,0.12)] rounded-2xl overflow-hidden">
      {/* Hidden file inputs */}
      <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadFile(f, 'imagen'); e.target.value = ''; }} />
      <input ref={audioInputRef} type="file" accept="audio/*" className="hidden"
        onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadFile(f, 'audio'); e.target.value = ''; }} />

      <div className="flex-1 overflow-y-auto p-6 scrollbar-hide space-y-4">
        {loading ? (
          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-[#D4A24E] animate-spin" /></div>
        ) : messages.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <MessageSquare className="w-12 h-12 text-gray-800 mb-4" />
            <p className="text-[#F5F0E1]/40">Este canal a\u00fan est\u00e1 vac\u00edo.</p>
          </div>
        ) : (
          messages.map((m) => {
            const isMe = m.emisor_id === adminProfile.id;
            const isAdmin = m.emisor?.rol === 'admin';
            const senderName = m.emisor?.nombre ?? (isMe ? adminProfile.nombre : '?');
            const initial = senderName.charAt(0).toUpperCase();
            return (
              <div key={m.id} className={`flex gap-2.5 items-end max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                {isMe && adminAvatarUrl ? (
                  <div className="w-8 h-8 rounded-full shrink-0 overflow-hidden border border-[#D4A24E]/30">
                    <img src={adminAvatarUrl} alt={senderName} className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 border ${
                    isAdmin ? 'bg-[#D4A24E]/20 border-[#D4A24E]/30 text-[#D4A24E]'
                             : 'bg-[#D4A24E]/10 border-[rgba(212,162,78,0.2)] text-[#F5F0E1]'
                  }`}>
                    {isAdmin ? <Shield className="w-3.5 h-3.5" /> : initial}
                  </div>
                )}
                <div className="flex flex-col gap-1">
                  <span className={`text-[10px] font-semibold px-1 ${isAdmin ? 'text-[#D4A24E]' : 'text-[#F5F0E1]/40'} ${isMe ? 'text-right' : ''}`}>
                    {senderName}{isAdmin ? ' \u00b7 Coach' : ''}
                  </span>
                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    isMe ? 'bg-[#D4A24E]/25 text-[#F5F0E1] border border-[#D4A24E]/20 rounded-tr-sm'
                         : isAdmin ? 'bg-[#D4A24E]/20 text-[#D4A24E] border border-[#D4A24E]/20 rounded-tl-sm'
                         : 'bg-[#241A0C]/60 text-[#F5F0E1]/90 border border-[rgba(212,162,78,0.12)] rounded-tl-sm'
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

      <div className="p-4 border-t border-[rgba(212,162,78,0.12)] shrink-0 bg-[#241A0C]/20">
        <div className="flex gap-2 items-end">
          <div className="flex flex-col gap-1 shrink-0">
            <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploading}
              title="Subir imagen"
              className="w-10 h-10 rounded-xl bg-[#D4A24E]/5 border border-[rgba(212,162,78,0.2)] hover:bg-[#D4A24E]/10 flex items-center justify-center text-[#F5F0E1]/60 hover:text-[#F5F0E1] transition-colors disabled:opacity-50">
              <Image className="w-4 h-4" />
            </button>
            <button type="button" onClick={() => audioInputRef.current?.click()} disabled={uploading}
              title="Subir audio"
              className="w-10 h-10 rounded-xl bg-[#D4A24E]/5 border border-[rgba(212,162,78,0.2)] hover:bg-[#D4A24E]/10 flex items-center justify-center text-[#F5F0E1]/60 hover:text-[#F5F0E1] transition-colors disabled:opacity-50">
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
            className="flex-1 bg-black/20 border border-[rgba(212,162,78,0.2)] rounded-lg py-3 px-5 text-sm text-[#F5F0E1] focus:outline-none focus:border-[#D4A24E]/50 transition-all disabled:opacity-50"
          />
          <button
            onClick={send}
            disabled={!input.trim() || enviando || uploading}
            className="btn-primary w-12 h-12 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 shrink-0"
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
  const adminRol: AdminRol = (adminProfile as any).admin_rol ?? 'owner';
  const [mainTab, setMainTab] = useState<MainTab>('clientes');
  const [channelUnread, setChannelUnread] = useState<Record<string, number>>({});

  // Clientes
  const [clientes, setClientes] = useState<ClienteConEstado[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedCliente, setSelectedCliente] = useState<ClienteConEstado | null>(null);
  const [detalleTab, setDetalleTab] = useState<DetalleTab>('resumen');
  const [showNuevoCliente, setShowNuevoCliente] = useState(false);
  const [clientSearch, setClientSearch] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<UserStatus | 'ALL'>('ALL');

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

  // Metricas globales
  const [metricasGlobales, setMetricasGlobales] = useState<any>(null);
  const [metricasLoading, setMetricasLoading] = useState(false);
  const [filtroMetricasId, setFiltroMetricasId] = useState<string | null>(null);
  const [metricasTareas, setMetricasTareas] = useState<any[]>([]);
  const [metricasOutputs, setMetricasOutputs] = useState<any[]>([]);
  const [metricasTareasLoading, setMetricasTareasLoading] = useState(false);
  const [pilarExpandido, setPilarExpandido] = useState<Record<number, boolean>>({});
  const [tareaModal, setTareaModal] = useState<{ meta: any; tareaData: any; output: string; clienteNombre: string } | null>(null);
  const [tareaResumen, setTareaResumen] = useState('');
  const [tareaResumenLoading, setTareaResumenLoading] = useState(false);

  // Formulario nuevo cliente
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

  // Status change
  const [statusCambiando, setStatusCambiando] = useState(false);

  // Mensajes unified
  const [mensajesChannel, setMensajesChannel] = useState<MensajesChannel>('comunidad');
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
  const [videoForm, setVideoForm] = useState<{ id?: string; pilar_id: PilarId; titulo: string; descripcion: string; youtubeUrl: string; duracion: string }>({
    pilar_id: 'P0', titulo: '', descripcion: '', youtubeUrl: '', duracion: ''
  });

  // Admin settings
  const [showAdminSettings, setShowAdminSettings] = useState(false);
  const [adminDraft, setAdminDraft] = useState({ nombre: adminProfile.nombre, cargo: adminProfile.especialidad || 'Director' });
  const [adminAvatar, setAdminAvatar] = useState<string>(() => localStorage.getItem(`tcd_admin_avatar_${adminProfile.id}`) || '');
  const [guardandoAdmin, setGuardandoAdmin] = useState(false);
  const adminAvatarInputRef = useRef<HTMLInputElement>(null);

  // Equipo
  const [teamMembers, setTeamMembers] = useState<any[]>([]);
  const [teamLoading, setTeamLoading] = useState(false);

  // Manager checklist
  const [checklistItems, setChecklistItems] = useState<AdminChecklistItem[]>([]);
  const [checklistLoading, setChecklistLoading] = useState(false);

  // ─── EFFECTS ──────────────────────────────────────────────────────────────────

  useEffect(() => { cargarClientes(); }, []);

  useEffect(() => {
    if (mainTab === 'metricas' && !metricasGlobales) cargarMetricasGlobales();
    if (mainTab === 'videos') cargarAdminVideos();
    if (mainTab === 'equipo') cargarEquipo();
    if (mainTab !== 'metricas') setFiltroMetricasId(null);
  }, [mainTab]);

  useEffect(() => {
    if (filtroMetricasId) {
      setPilarExpandido({});
      cargarTareasClienteMetricas(filtroMetricasId);
    } else {
      setMetricasTareas([]);
      setMetricasOutputs([]);
    }
  }, [filtroMetricasId]);

  // Manager checklist load
  useEffect(() => {
    if (adminRol === 'manager') cargarChecklist();
  }, [adminRol]);

  // Channel notifications
  useEffect(() => {
    if (!supabase) return;
    const chatChannels = ['comunidad', 'victorias', 'consultas'] as const;
    const ICONS = { comunidad: Users, victorias: Trophy, consultas: Hash } as const;

    const subs = chatChannels.map(ch =>
      supabase!.channel(`admin-notif-${ch}`)
        .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes', filter: `canal=eq.${ch}` },
          async (payload) => {
            if (mainTab === 'mensajes' && mensajesChannel === ch) return;
            if (payload.new.emisor_id === adminProfile.id) return;

            const { data: m } = await supabase!.from('mensajes')
              .select('*, emisor:profiles!emisor_id(nombre, rol)')
              .eq('id', payload.new.id).single();

            const nombre = (m?.emisor as { nombre?: string } | undefined)?.nombre ?? 'Alguien';
            const preview = (payload.new.contenido ?? '').slice(0, 60);
            const ChIcon = ICONS[ch];

            toast(nombre, {
              description: preview || 'Archivo adjunto',
              action: { label: 'Ver', onClick: () => { setMainTab('mensajes'); setMensajesChannel(ch); } },
              icon: React.createElement(ChIcon, { className: 'w-4 h-4 text-[#D4A24E]' }),
              duration: 6000,
            });

            setChannelUnread(prev => ({ ...prev, [ch]: (prev[ch] ?? 0) + 1 }));
          }
        ).subscribe()
    );
    return () => { subs.forEach(s => supabase!.removeChannel(s)); };
  }, [mainTab, mensajesChannel, adminProfile.id]);

  // Realtime for privados DM
  useEffect(() => {
    if (!supabase || !chatCliente || mainTab !== 'mensajes' || mensajesChannel !== 'privados') return;
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
  }, [chatCliente, mainTab, mensajesChannel]);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatMessages]);

  // Realtime for client detail private messages
  useEffect(() => {
    if (!supabase || !selectedCliente || mainTab !== 'clientes') return;
    const channel = supabase
      .channel(`admin-private-${selectedCliente.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'mensajes' },
        async (payload) => {
          const { data } = await supabase.from('mensajes').select('*, emisor:profiles!emisor_id(nombre, rol)').eq('id', payload.new.id).single();
          if (data && data.canal === 'privado' && (data.emisor_id === selectedCliente.id || data.receptor_id === selectedCliente.id)) {
            setDetalleMensajes(prev => {
              if (prev.find(m => m.id === data.id)) return prev;
              return [...prev, data as Mensaje];
            });
          }
        }
      ).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [selectedCliente, mainTab]);

  useEffect(() => {
    if (selectedCliente && mainTab === 'clientes') cargarDetalleCliente(selectedCliente.id);
  }, [selectedCliente, detalleTab, mainTab]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [detalleMensajes]);

  // ─── DATA FUNCTIONS ───────────────────────────────────────────────────────────

  function extractOutputText(output: unknown): string {
    if (!output) return '';
    if (typeof output === 'string') {
      try {
        const parsed = JSON.parse(output);
        return extractOutputText(parsed);
      } catch { return output; }
    }
    if (typeof output === 'object') {
      const obj = output as Record<string, unknown>;
      for (const key of ['texto', 'resultado', 'output', 'content', 'respuesta', 'text']) {
        if (typeof obj[key] === 'string' && (obj[key] as string).length > 10) {
          return (obj[key] as string).replace(/\\n/g, '\n').replace(/\\t/g, '  ');
        }
      }
      const parts = Object.entries(obj)
        .filter(([, v]) => typeof v === 'string' && (v as string).length > 5)
        .map(([k, v]) => `**${k}:** ${(v as string).replace(/\\n/g, '\n')}`);
      return parts.join('\n\n');
    }
    return String(output);
  }

  async function abrirTareaModal(meta: any, tareaData: any, rawOutput: unknown, clienteNombre: string) {
    const outputText = extractOutputText(rawOutput);
    setTareaModal({ meta, tareaData, output: outputText, clienteNombre });
    setTareaResumen('');
    if (!outputText || outputText.length < 20) return;
    setTareaResumenLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });
      const prompt = `Sos asistente de Paolis, una coach que acompa\u00f1a a profesionales de la salud.
El cliente "${clienteNombre}" complet\u00f3 la tarea "${meta.titulo}" del programa Tu Cl\u00ednica Digital.

Este es el output que gener\u00f3 con la IA:
---
${outputText.slice(0, 2000)}
---

Escrib\u00ed un resumen de 2-3 oraciones en espa\u00f1ol para Paolis que explique:
1. Qu\u00e9 defini\u00f3 o produjo el cliente en esta tarea
2. Una observaci\u00f3n relevante para que Paolis lo gu\u00ede mejor en la pr\u00f3xima sesi\u00f3n

S\u00e9 directa, emp\u00e1tica y concisa. Sin bullet points, solo texto corrido. Sin emojis.`;
      const result = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
      });
      setTareaResumen(result.text ?? '');
    } catch {
      // resumen is optional
    } finally {
      setTareaResumenLoading(false);
    }
  }

  async function cargarTareasClienteMetricas(clientId: string) {
    if (!supabase) return;
    setMetricasTareasLoading(true);
    try {
      const [tareasRes, outputsRes] = await Promise.all([
        supabase.from('hoja_de_ruta').select('*').eq('usuario_id', clientId).eq('completada', true),
        supabase.from('herramienta_outputs').select('*').eq('usuario_id', clientId),
      ]);
      setMetricasTareas(tareasRes.data ?? []);
      setMetricasOutputs(outputsRes.data ?? []);
    } catch {
      // tables may not exist yet
    } finally {
      setMetricasTareasLoading(false);
    }
  }

  async function cargarMetricasGlobales() {
    if (!supabase) return;
    setMetricasLoading(true);
    try {
      const { data } = await supabase.rpc('get_metricas_globales');
      setMetricasGlobales(data ?? {});
    } catch {
      toast.error('Error cargando m\u00e9tricas globales');
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
        const progPct = (p as any).progreso_porcentaje ?? 0;
        const tareasCompletadasFallback = tareasCompletadas === 0 && progPct > 0
          ? Math.round((progPct / 100) * totalFromSeed)
          : tareasCompletadas;

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
        ? `C\u00f3mo se sinti\u00f3: "${lastDiary.q1 || '\u2014'}". Lo que lo fren\u00f3: "${lastDiary.q2 || '\u2014'}". Energ\u00eda: ${lastDiary.q3 || '\u2014'}/10. Acci\u00f3n tomada: "${lastDiary.q4 || '\u2014'}". Plan para ma\u00f1ana: "${lastDiary.q7 || '\u2014'}".`
        : 'Sin entradas de diario recientes.';

      const prompt = `Sos el sistema de inteligencia de coaching del programa "Sanar OS" para profesionales de la salud. Tu rol es asistir al DIRECTOR/COACH humano d\u00e1ndole un briefing claro sobre el estado de un cliente espec\u00edfico y recomendaciones accionables para su pr\u00f3xima intervenci\u00f3n.

CLIENTE: ${selectedCliente.nombre} (${selectedCliente.especialidad || 'especialidad no indicada'})
PLAN: ${selectedCliente.plan} \u00b7 D\u00eda ${selectedCliente.dia_programa} de 90 \u00b7 Semana ${selectedCliente.semana_programa} de 12
PROGRESO: ${selectedCliente.tareas_completadas} de ${selectedCliente.tareas_total} tareas completadas (${selectedCliente.tareas_total > 0 ? Math.round((selectedCliente.tareas_completadas / selectedCliente.tareas_total) * 100) : 0}%)
RACHA DIARIO: ${selectedCliente.racha_diario} d\u00edas consecutivos
VENTAS REALES: ${selectedCliente.ventas_count}
\u00daLTIMO DIARIO: ${diarioResumen}
M\u00c9TRICAS NEGOCIO: ${lastMetric ? `${lastMetric.leads} leads, ${lastMetric.conversaciones ?? 0} llamadas, ${lastMetric.ventas} ventas en la \u00faltima semana` : 'sin datos de m\u00e9tricas a\u00fan'}

Gener\u00e1 un briefing para el coach en 3 partes:
1. ESTADO ACTUAL (1-2 oraciones sobre d\u00f3nde est\u00e1 el cliente y su ritmo real)
2. RIESGO O PUNTO CR\u00cdTICO (qu\u00e9 puede frenar el avance si no se interviene)
3. ACCI\u00d3N SUGERIDA PARA EL COACH (qu\u00e9 decirle o hacer en la pr\u00f3xima interacci\u00f3n \u2014 espec\u00edfico y directo)

Tono: profesional, directo, orientado a resultados. Sin emojis. En espa\u00f1ol.`;

      const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY || '' });
      const result = await ai.models.generateContent({ model: 'gemini-2.5-flash', contents: [{ role: 'user', parts: [{ text: prompt }] }] });
      setIaRecomendacion(result.text ?? '');
    } catch {
      toast.error('Error generando recomendaci\u00f3n IA');
    } finally {
      setIaLoading(false);
    }
  }

  async function enviarMensajePrivado() {
    if (!supabase || !selectedCliente || !mensajeInput.trim()) return;
    setEnviando(true);
    const texto = mensajeInput.trim();
    const tempId = crypto.randomUUID();
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
        pilar_id: v.pilar_id ?? undefined,
        titulo: v.titulo,
        descripcion: v.descripcion,
        youtubeUrl: v.youtube_url,
        duracion: v.duracion,
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
        const { error } = await supabase
          .from('programa_videos')
          .update({
            grupo: v.grupo,
            pilar_id: v.pilar_id ?? null,
            titulo: v.titulo,
            descripcion: v.descripcion,
            youtube_url: v.youtubeUrl,
            duracion: v.duracion,
          })
          .eq('id', v.id);
        if (error) throw error;
        setAdminVideos(prev => prev.map(old => old.id === v.id ? { ...old, ...v, id: v.id! } : old));
        toast.success('Video actualizado');
      } else {
        const { data, error } = await supabase
          .from('programa_videos')
          .insert({
            grupo: v.grupo,
            pilar_id: v.pilar_id ?? null,
            titulo: v.titulo,
            descripcion: v.descripcion,
            youtube_url: v.youtubeUrl,
            duracion: v.duracion,
          })
          .select()
          .single();
        if (error) throw error;
        setAdminVideos(prev => [...prev, {
          id: data.id,
          grupo: data.grupo,
          pilar_id: data.pilar_id ?? undefined,
          titulo: data.titulo,
          descripcion: data.descripcion,
          youtubeUrl: data.youtube_url,
          duracion: data.duracion,
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
      const { data, error } = await supabase
        .from('admin_notes')
        .select('*')
        .eq('client_id', clientId)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setDetalleNotas((data ?? []) as AdminNote[]);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Error cargando notas');
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
    } catch (err: unknown) {
      setNotaInput(texto);
      toast.error(err instanceof Error ? err.message : 'Error guardando nota');
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
      adminProfile.nombre = adminDraft.nombre;
      adminProfile.especialidad = adminDraft.cargo;
      toast.success('Perfil actualizado.');
      setShowAdminSettings(false);
    } catch {
      toast.error('Error al guardar. Intent\u00e1 de nuevo.');
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
          data: { nombre: nuevoForm.nombre.trim() }
        }
      });
      if (error) throw error;

      if (signUpData.user && supabase) {
        await new Promise(r => setTimeout(r, 1500));
        await supabase.from('profiles').update({
          especialidad: nuevoForm.especialidad.trim() || null,
          plan: nuevoForm.plan,
          fecha_inicio: nuevoForm.fecha_inicio,
          status: nuevoForm.status,
          onboarding_completed: nuevoForm.status !== 'ONBOARDING',
        }).eq('id', signUpData.user.id);
      }

      toast.success(`Cuenta creada para ${nuevoForm.nombre}. Ya puede iniciar sesi\u00f3n.`);
      setShowNuevoCliente(false);
      setNuevoForm({ nombre: '', email: '', password: '', especialidad: '', plan: 'DWY', fecha_inicio: new Date().toISOString().split('T')[0], status: 'ONBOARDING' });
      await cargarClientes();
    } catch (e: any) {
      toast.error(`Error creando cuenta: ${e.message}`);
    } finally {
      setCreando(false);
    }
  }

  async function cargarEquipo() {
    if (!supabase) return;
    setTeamLoading(true);
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('rol', 'admin');
      if (error) throw error;
      setTeamMembers(data ?? []);
    } catch {
      toast.error('Error cargando equipo');
    } finally {
      setTeamLoading(false);
    }
  }

  async function cambiarRolAdmin(targetId: string, newRol: AdminRol) {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('profiles')
        .update({ admin_rol: newRol })
        .eq('id', targetId);
      if (error) throw error;
      setTeamMembers(prev => prev.map(m => m.id === targetId ? { ...m, admin_rol: newRol } : m));
      toast.success('Rol actualizado');
    } catch {
      toast.error('Error actualizando rol');
    }
  }

  async function cargarChecklist() {
    if (!supabase) return;
    setChecklistLoading(true);
    try {
      const { data, error } = await supabase
        .from('admin_tareas_checklist')
        .select('*')
        .eq('admin_id', adminProfile.id)
        .order('created_at');
      if (error) throw error;
      setChecklistItems((data ?? []) as AdminChecklistItem[]);
    } catch {
      // table may not exist yet
    } finally {
      setChecklistLoading(false);
    }
  }

  async function toggleChecklistItem(itemId: string, completada: boolean) {
    if (!supabase) return;
    try {
      const { error } = await supabase
        .from('admin_tareas_checklist')
        .update({ completada, fecha_completada: completada ? new Date().toISOString() : null })
        .eq('id', itemId);
      if (error) throw error;
      setChecklistItems(prev => prev.map(item =>
        item.id === itemId ? { ...item, completada, fecha_completada: completada ? new Date().toISOString() : undefined } : item
      ));
    } catch {
      toast.error('Error actualizando tarea');
    }
  }

  const detailTabs: { id: DetalleTab; label: string; icon: React.ElementType }[] = [
    { id: 'resumen', label: 'Resumen', icon: TrendingUp },
    { id: 'diario', label: 'Diario', icon: Calendar },
    { id: 'metricas', label: 'M\u00e9tricas', icon: BarChart2 },
    { id: 'mensajes', label: 'Chat', icon: MessageSquare },
    { id: 'notas', label: 'Notas', icon: BookOpen },
  ];

  // Filter clients
  const filteredClientes = clientes.filter(c => {
    const matchSearch = !clientSearch || c.nombre.toLowerCase().includes(clientSearch.toLowerCase());
    const matchStatus = filtroStatus === 'ALL' || c.status === filtroStatus || (!c.status && filtroStatus === 'ACTIVE');
    return matchSearch && matchStatus;
  });

  // ─── SIDEBAR NAV CONFIG ───────────────────────────────────────────────────────

  const sidebarItems: { id: MainTab; label: string; icon: React.ElementType; ownerOnly?: boolean }[] = [
    { id: 'clientes', label: 'Clientes', icon: Users },
    { id: 'mensajes', label: 'Mensajes', icon: MessageSquare },
    { id: 'metricas', label: 'M\u00e9tricas', icon: BarChart2 },
    { id: 'videos', label: 'Videos', icon: Video },
    { id: 'equipo', label: 'Equipo', icon: UsersRound, ownerOnly: true },
  ];

  const headerTitles: Record<MainTab, string> = {
    clientes: 'Panel de Control \u2014 Clientes',
    mensajes: 'Centro de Mensajes',
    metricas: 'M\u00e9tricas Globales del Programa',
    videos: 'Gesti\u00f3n de Videos',
    equipo: 'Gesti\u00f3n de Equipo',
  };

  // ─── RENDER ───────────────────────────────────────────────────────────────────

  return (
    <div className="flex h-screen bg-[#080808] text-[#F5F0E1] font-sans overflow-hidden selection:bg-[#D4A24E]/30">
      <div className="fixed top-[-10%] left-[-10%] w-[500px] h-[500px] bg-[#D4A24E]/10 rounded-full blur-[150px] pointer-events-none" />

      {/* ─── SIDEBAR ─────────────────────────────────────────────────────────── */}
      <aside className="w-[220px] shrink-0 border-r border-[rgba(212,162,78,0.1)] bg-[#0E0B07] flex flex-col z-20">
        <div className="p-5">
          <div className="flex items-center gap-3 mb-8">
            <div className="w-10 h-10 rounded-xl bg-[#D4A24E] flex items-center justify-center shadow-[0_0_20px_rgba(212,162,78,0.3)]">
              <Stethoscope className="w-5 h-5 text-[#F5F0E1]" />
            </div>
            <div>
              <h1 className="text-sm font-semibold text-[#F5F0E1] tracking-wide">Sanar OS</h1>
              <p className="text-[10px] text-[#D4A24E] uppercase tracking-widest font-bold">Admin</p>
            </div>
          </div>

          <nav className="space-y-0.5">
            {sidebarItems
              .filter(item => !item.ownerOnly || adminRol === 'owner' || !adminRol)
              .map(item => {
                const totalUnread = item.id === 'mensajes'
                  ? (channelUnread['comunidad'] ?? 0) + (channelUnread['victorias'] ?? 0) + (channelUnread['consultas'] ?? 0)
                  : 0;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      setMainTab(item.id);
                      if (item.id === 'mensajes') {
                        setChannelUnread(prev => ({ ...prev, comunidad: 0, victorias: 0, consultas: 0 }));
                      }
                    }}
                    className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-medium transition-all group relative ${
                      mainTab === item.id
                        ? 'bg-[#D4A24E]/10 text-[#D4A24E]'
                        : 'text-[#F5F0E1]/60 hover:bg-[#D4A24E]/10 hover:text-[#F5F0E1]'
                    }`}
                  >
                    {mainTab === item.id && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#D4A24E] rounded-r-full" />
                    )}
                    <item.icon className="w-4 h-4" />
                    {item.label}
                    {totalUnread > 0 && (
                      <span className="ml-auto min-w-[18px] h-[18px] px-1 rounded-full bg-[#D4A24E] text-[#F5F0E1] text-[10px] font-bold flex items-center justify-center">
                        {totalUnread}
                      </span>
                    )}
                  </button>
                );
              })}
          </nav>
        </div>

        <div className="mt-auto p-5 border-t border-[rgba(212,162,78,0.1)]">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-9 h-9 rounded-full overflow-hidden bg-[#D4A24E]/10 flex items-center justify-center text-sm font-bold border border-[rgba(212,162,78,0.3)] shrink-0">
              {adminAvatar
                ? <img src={adminAvatar} alt="Admin" className="w-full h-full object-cover" />
                : adminProfile.nombre.charAt(0).toUpperCase()
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#F5F0E1] truncate">{adminProfile.nombre}</p>
              <p className="text-[10px] text-[#F5F0E1]/40 truncate">{adminProfile.especialidad || 'Director'}</p>
            </div>
            <button
              onClick={() => { setAdminDraft({ nombre: adminProfile.nombre, cargo: adminProfile.especialidad || 'Director' }); setShowAdminSettings(true); }}
              className="w-7 h-7 rounded-lg bg-[#D4A24E]/5 hover:bg-[#D4A24E]/10 flex items-center justify-center text-[#F5F0E1]/40 hover:text-[#F5F0E1] transition-colors shrink-0"
              title="Ajustes de perfil"
            >
              <Settings className="w-3.5 h-3.5" />
            </button>
          </div>
          <button onClick={onSignOut} className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-semibold text-[#F5F0E1]/60 hover:bg-[#D4A24E]/5 hover:text-[#F5F0E1] transition-colors">
            <LogOut className="w-3.5 h-3.5" /> Salir del sistema
          </button>
        </div>
      </aside>

      {/* ─── MAIN CONTENT ──────────────────────────────────────────────────── */}
      <main className="flex-1 flex flex-col relative z-10 overflow-hidden">
        <header className="h-16 border-b border-[rgba(212,162,78,0.1)] flex items-center px-6 shrink-0 bg-black/20 backdrop-blur-md">
          <h2 className="text-lg font-medium tracking-tight" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic', color: '#F5F0E1' }}>
            {headerTitles[mainTab]}
          </h2>
        </header>

        <div className={`flex-1 scrollbar-hide ${mainTab === 'mensajes' ? 'overflow-hidden flex flex-col' : 'overflow-y-auto p-6'}`}>

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB: CLIENTES
              ═══════════════════════════════════════════════════════════════════════ */}
          {mainTab === 'clientes' && !selectedCliente && (
            <div className="max-w-6xl mx-auto space-y-5">
              {/* Header row */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3 flex-1">
                  <div className="relative flex-1 max-w-sm">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F5F0E1]/30" />
                    <input
                      type="text"
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                      placeholder="Buscar por nombre..."
                      className="w-full bg-black/20 border border-[rgba(212,162,78,0.2)] rounded-lg py-2.5 pl-10 pr-4 text-sm text-[#F5F0E1] focus:outline-none focus:border-[#D4A24E]/50 transition-all"
                    />
                  </div>
                  <CustomSelect
                    value={filtroStatus}
                    onChange={(val) => setFiltroStatus(val as UserStatus | 'ALL')}
                    options={[
                      { value: 'ALL', label: 'Todos los estados' },
                      { value: 'ACTIVE', label: 'Activos' },
                      { value: 'ONBOARDING', label: 'Onboarding' },
                      { value: 'PAUSED', label: 'Pausados' },
                      { value: 'CHURNED', label: 'Inactivos' },
                      { value: 'COMPLETED', label: 'Completados' },
                    ]}
                    className="w-48"
                  />
                </div>
                <button
                  onClick={() => setShowNuevoCliente(true)}
                  className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-[#D4A24E]/20"
                >
                  <Plus className="w-4 h-4" /> Nuevo Cliente
                </button>
              </div>

              {/* Client table */}
              <div className="card-panel border border-[rgba(212,162,78,0.2)] rounded-2xl overflow-hidden">
                {loading ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-[#D4A24E] animate-spin" /></div>
                ) : filteredClientes.length === 0 ? (
                  <div className="text-center py-16">
                    <Users className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                    <p className="text-[#F5F0E1]/40 text-sm">Sin clientes que coincidan</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[rgba(212,162,78,0.1)]">
                        {['Nombre', 'Email', 'Plan', 'Inicio', 'D\u00edas', 'Pilar', 'Estado', 'Progreso'].map(h => (
                          <th key={h} className="text-left px-4 py-3 text-[10px] font-bold uppercase tracking-widest text-[#F5F0E1]/40">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {filteredClientes.map(c => {
                        const pct = c.tareas_total > 0
                          ? Math.round((c.tareas_completadas / c.tareas_total) * 100)
                          : (c.progreso_porcentaje ?? 0);
                        const pilar = (c as any).pilar_actual
                          ? `P${(c as any).pilar_actual}`
                          : derivePilarFromProgress(c.tareas_completadas);
                        const st = c.status ?? 'ACTIVE';
                        const stCfg = STATUS_CONFIG[st];
                        return (
                          <tr
                            key={c.id}
                            onClick={() => { setSelectedCliente(c); setDetalleTab('resumen'); setIaRecomendacion(''); }}
                            className="bg-[#1A1410] hover:bg-[#241A0C] border-b border-[rgba(212,162,78,0.1)] cursor-pointer transition-colors group"
                          >
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-3">
                                <div className="w-8 h-8 rounded-full bg-[#D4A24E]/10 border border-[rgba(212,162,78,0.2)] flex items-center justify-center text-xs font-bold text-[#F5F0E1] shrink-0">
                                  {c.nombre.charAt(0).toUpperCase()}
                                </div>
                                <span className="text-sm font-medium text-[#F5F0E1] group-hover:text-[#D4A24E] transition-colors truncate max-w-[140px]">{c.nombre}</span>
                              </div>
                            </td>
                            <td className="px-4 py-3 text-xs text-[#F5F0E1]/50 truncate max-w-[160px]">{c.email}</td>
                            <td className="px-4 py-3">
                              <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[#D4A24E]/10 text-[#D4A24E] border border-[#D4A24E]/20">{c.plan}</span>
                            </td>
                            <td className="px-4 py-3 text-xs text-[#F5F0E1]/50">{c.fecha_inicio}</td>
                            <td className="px-4 py-3 text-xs text-[#F5F0E1]/60 font-medium">{c.dia_programa}</td>
                            <td className="px-4 py-3 text-xs text-[#D4A24E] font-medium">{pilar}</td>
                            <td className="px-4 py-3">
                              <span
                                className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider"
                                style={{
                                  color: STATUS_BADGE_COLOR[st] ?? '#F5F0E1',
                                  backgroundColor: `${STATUS_BADGE_COLOR[st] ?? '#F5F0E1'}15`,
                                  border: `1px solid ${STATUS_BADGE_COLOR[st] ?? '#F5F0E1'}30`,
                                }}
                              >
                                {stCfg?.label ?? st}
                              </span>
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex items-center gap-2">
                                <div className="flex-1 h-1.5 bg-[#D4A24E]/5 rounded-full overflow-hidden w-20">
                                  <div
                                    className="h-full rounded-full bg-[#D4A24E]"
                                    style={{ width: `${pct}%` }}
                                  />
                                </div>
                                <span className="text-[10px] text-[#F5F0E1]/50 w-8 text-right">{pct}%</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

          {/* ── Client detail view ── */}
          {mainTab === 'clientes' && selectedCliente && (
            <div className="flex gap-6" style={{ height: 'calc(100vh - 120px)' }}>
              {/* Left: client list narrow */}
              <div className="w-[240px] shrink-0 flex flex-col">
                <button
                  onClick={() => setSelectedCliente(null)}
                  className="flex items-center gap-2 text-xs text-[#F5F0E1]/40 hover:text-[#F5F0E1] transition-colors mb-3"
                >
                  <ChevronRight className="w-3 h-3 rotate-180" /> Volver a la tabla
                </button>
                <div className="space-y-1.5 overflow-y-auto scrollbar-hide flex-1">
                  {clientes.map(c => (
                    <button
                      key={c.id}
                      onClick={() => { setSelectedCliente(c); setDetalleTab('resumen'); setIaRecomendacion(''); }}
                      className={`w-full text-left p-3 rounded-xl border transition-all ${
                        selectedCliente?.id === c.id
                          ? 'bg-[#D4A24E]/10 border-[#D4A24E]/30'
                          : 'bg-[#1A1410] border-[rgba(212,162,78,0.1)] hover:bg-[#D4A24E]/5'
                      }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <div className={`w-2 h-2 rounded-full shrink-0 ${SEMAFORO_CONFIG[c.semaforo].class}`} />
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-[#F5F0E1] truncate">{c.nombre}</p>
                          <p className="text-[10px] text-[#F5F0E1]/40">D\u00eda {c.dia_programa}/90</p>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>

              {/* Right: detail panel */}
              <div className="flex-1 card-panel border border-[rgba(212,162,78,0.2)] rounded-2xl overflow-hidden flex flex-col shadow-2xl relative">
                {/* Header */}
                <div className="absolute top-0 right-0 p-4 z-10">
                  <button onClick={() => setSelectedCliente(null)} className="p-2 rounded-full bg-black/40 text-[#F5F0E1]/60 hover:text-[#F5F0E1] hover:bg-[#D4A24E]/10 transition-colors backdrop-blur-md">
                    <X className="w-4 h-4" />
                  </button>
                </div>

                <div className="p-8 border-b border-[rgba(212,162,78,0.1)] flex items-center gap-5 shrink-0 bg-[#241A0C]/30">
                  <div className="w-16 h-16 rounded-2xl bg-[#D4A24E]/20 border border-[#D4A24E]/30 flex items-center justify-center text-xl font-bold text-[#D4A24E] shadow-inner">
                    {selectedCliente.nombre.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <div className="flex items-center gap-3 mb-1.5 flex-wrap">
                      <h3 className="text-2xl font-light text-[#F5F0E1] tracking-tight">{selectedCliente.nombre}</h3>
                      <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${selectedCliente.plan === 'DFY' ? 'bg-[#D4A24E]/20 text-[#D4A24E] border border-[#D4A24E]/30' : selectedCliente.plan === 'IMPLEMENTACION' ? 'bg-[#2DD4A0]/20 text-[#2DD4A0] border border-[#2DD4A0]/30' : 'bg-[#D4A24E]/20 text-[#D4A24E] border border-[#D4A24E]/30'}`}>
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
                        <span title="Click en el badge para cambiar"><Pencil className="w-3 h-3 text-[#F5F0E1]/30 group-hover:text-[#F5F0E1]/60 transition-colors" /></span>
                      </div>
                    </div>
                    <p className="text-xs text-[#F5F0E1]/60 flex items-center gap-2">
                      <Lock className="w-3 h-3 text-[#F5F0E1]/30" /> {selectedCliente.email}
                      {selectedCliente.especialidad && <><span>\u00b7</span> {selectedCliente.especialidad}</>}
                    </p>
                  </div>
                </div>

                {/* Tabs nav */}
                <div className="flex border-b border-[rgba(212,162,78,0.1)] px-6 shrink-0 bg-black/20">
                  {detailTabs.map(tab => (
                    <button
                      key={tab.id}
                      onClick={() => setDetalleTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-4 text-xs font-semibold uppercase tracking-wider transition-all relative ${
                        detalleTab === tab.id
                          ? 'text-[#D4A24E]'
                          : 'text-[#F5F0E1]/40 hover:text-[#F5F0E1]/80'
                      }`}
                    >
                      <tab.icon className="w-3.5 h-3.5" />
                      {tab.label}
                      {detalleTab === tab.id && (
                        <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4A24E] rounded-t-full shadow-[0_0_10px_rgba(212,162,78,0.5)]" />
                      )}
                    </button>
                  ))}
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 scrollbar-hide bg-black/10">
                  {detalleLoading ? (
                    <div className="flex items-center justify-center h-full"><Loader2 className="w-6 h-6 text-[#D4A24E] animate-spin" /></div>
                  ) : (
                    <>
                      {/* ── RESUMEN ── */}
                      {detalleTab === 'resumen' && (
                        <div className="space-y-6">
                          <div className="grid grid-cols-4 gap-3">
                            <div className="bg-[#1A1410] border border-[rgba(212,162,78,0.1)] rounded-2xl p-4 text-center">
                              <p className="text-2xl font-light text-[#F5F0E1]">{selectedCliente.dia_programa}</p>
                              <p className="text-[10px] text-[#F5F0E1]/40 uppercase tracking-wider mt-1">D\u00eda / 90</p>
                            </div>
                            <div className="bg-[#1A1410] border border-[rgba(212,162,78,0.1)] rounded-2xl p-4 text-center">
                              <p className="text-2xl font-light text-[#D4A24E] flex items-center justify-center gap-1"><Flame className="w-5 h-5" /> {selectedCliente.racha_diario}</p>
                              <p className="text-[10px] text-[#F5F0E1]/40 uppercase tracking-wider mt-1">Racha diario</p>
                            </div>
                            <div className="bg-[#1A1410] border border-[rgba(212,162,78,0.1)] rounded-2xl p-4 text-center">
                              <p className="text-2xl font-light text-[#2DD4A0]">{selectedCliente.ventas_count}</p>
                              <p className="text-[10px] text-[#F5F0E1]/40 uppercase tracking-wider mt-1">Ventas reales</p>
                            </div>
                            <div className={`rounded-2xl p-4 text-center border ${
                              selectedCliente.estado_garantia === 'activada' ? 'bg-[#E85555]/10 border-[#E85555]/30' :
                              selectedCliente.estado_garantia === 'en_riesgo' ? 'bg-[#D4A24E]/10 border-[#D4A24E]/30' :
                              'bg-[#1A1410] border-[rgba(212,162,78,0.1)]'
                            }`}>
                              <Shield className={`w-6 h-6 mx-auto mb-1 ${
                                selectedCliente.estado_garantia === 'activada' ? 'text-[#E85555]' :
                                selectedCliente.estado_garantia === 'en_riesgo' ? 'text-[#D4A24E]' : 'text-[#F5F0E1]/30'
                              }`} />
                              <p className={`text-[10px] uppercase tracking-wider font-bold ${
                                selectedCliente.estado_garantia === 'activada' ? 'text-[#E85555]' :
                                selectedCliente.estado_garantia === 'en_riesgo' ? 'text-[#D4A24E]' : 'text-[#F5F0E1]/40'
                              }`}>{selectedCliente.estado_garantia === 'activada' ? 'Garant\u00eda' : selectedCliente.estado_garantia === 'en_riesgo' ? 'En riesgo' : 'En camino'}</p>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-4">
                            <div className="bg-[#1A1410] border border-[rgba(212,162,78,0.1)] rounded-2xl p-5">
                              <p className="text-[10px] text-[#F5F0E1]/40 uppercase tracking-widest mb-1 font-bold">Progreso de Tareas</p>
                              <div className="flex items-end gap-2 mb-3">
                                <p className="text-3xl font-light text-[#F5F0E1]">{selectedCliente.tareas_completadas}</p>
                                <p className="text-sm text-[#F5F0E1]/40 mb-1">/ {selectedCliente.tareas_total}</p>
                              </div>
                              <div className="h-2 bg-[#D4A24E]/5 rounded-full overflow-hidden">
                                <div className="h-full bg-[#D4A24E] rounded-full" style={{ width: `${selectedCliente.tareas_total > 0 ? Math.round((selectedCliente.tareas_completadas / selectedCliente.tareas_total) * 100) : 0}%` }} />
                              </div>
                            </div>
                            <div className="bg-[#1A1410] border border-[rgba(212,162,78,0.1)] rounded-2xl p-5">
                              <p className="text-[10px] text-[#F5F0E1]/40 uppercase tracking-widest mb-2 font-bold">\u00daltimo Diario</p>
                              {detalleDiario[0] ? (
                                <>
                                  <p className="text-xs text-[#F5F0E1]/40 mb-2">{new Date(detalleDiario[0].fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long' })}</p>
                                  {detalleDiario[0].respuestas?.q3 && (
                                    <div className="flex items-center gap-1.5 mb-2">
                                      <span className="text-[10px] text-[#F5F0E1]/40 uppercase font-bold">Energ\u00eda</span>
                                      <div className="flex gap-0.5">
                                        {Array.from({ length: 10 }).map((_, i) => (
                                          <div key={i} className={`w-2 h-2 rounded-sm ${i < Number(detalleDiario[0].respuestas.q3) ? 'bg-[#D4A24E]' : 'bg-[#D4A24E]/10'}`} />
                                        ))}
                                      </div>
                                      <span className="text-[10px] text-[#D4A24E] font-bold">{detalleDiario[0].respuestas.q3}/10</span>
                                    </div>
                                  )}
                                  {detalleDiario[0].respuestas?.q4 && (
                                    <p className="text-xs text-[#F5F0E1]/80 line-clamp-2"><span className="text-[#2DD4A0] font-bold">Acci\u00f3n: </span>{detalleDiario[0].respuestas.q4}</p>
                                  )}
                                  {detalleDiario[0].respuestas?.q2 && (
                                    <p className="text-xs text-[#F5F0E1]/60 mt-1 line-clamp-1"><span className="text-[#D4A24E] font-bold">Freno: </span>{detalleDiario[0].respuestas.q2}</p>
                                  )}
                                </>
                              ) : <p className="text-xs text-[#F5F0E1]/30">Sin entradas de diario a\u00fan</p>}
                            </div>
                          </div>

                          <div className="bg-[#D4A24E]/5 border border-[#D4A24E]/20 rounded-2xl p-6 relative overflow-hidden">
                            <Bot className="absolute -right-6 -bottom-6 w-32 h-32 text-[#F5F0E1]/5" />
                            <div className="relative z-10">
                              <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                  <div className="w-8 h-8 rounded-lg bg-[#D4A24E]/20 flex items-center justify-center">
                                    <Bot className="w-4 h-4 text-[#D4A24E]" />
                                  </div>
                                  <p className="text-xs font-bold uppercase tracking-widest text-[#D4A24E]">Coach AI Assistant</p>
                                </div>
                                <button
                                  onClick={generarRecomendacion} disabled={iaLoading}
                                  className="btn-primary flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:opacity-50 shadow-lg shadow-[#D4A24E]/20"
                                >
                                  {iaLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                                  Analizar y Sugerir
                                </button>
                              </div>
                              {iaRecomendacion ? (
                                <div className="bg-black/20 rounded-xl p-4 border border-[#D4A24E]/20">
                                  <p className="text-sm text-[#D4A24E] leading-relaxed whitespace-pre-line">{iaRecomendacion}</p>
                                </div>
                              ) : (
                                <p className="text-xs text-[#F5F0E1]/40">Haz clic en Analizar para que la IA escanee el perfil, m\u00e9tricas diarias y tareas pendientes de este cliente para crear recomendaciones proactivas de coaching.</p>
                              )}
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ── DIARIO ── */}
                      {detalleTab === 'diario' && (
                        <div className="space-y-4">
                          {detalleDiario.length === 0 ? (
                            <p className="text-[#F5F0E1]/40 text-sm text-center py-12">Sin entradas de diario</p>
                          ) : detalleDiario.map((entrada: any, i: number) => {
                            const r = entrada.respuestas ?? {};
                            return (
                              <div key={i} className="p-6 rounded-2xl bg-[#1A1410] border border-[rgba(212,162,78,0.1)]">
                                <div className="flex items-center justify-between mb-4">
                                  <p className="text-sm font-semibold text-[#F5F0E1] tracking-wide">
                                    {new Date(entrada.fecha + 'T12:00:00').toLocaleDateString('es-AR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}
                                  </p>
                                  {r.q3 && (
                                    <div className="flex items-center gap-1.5">
                                      <span className="text-[10px] text-[#F5F0E1]/40 uppercase font-bold">Energ\u00eda</span>
                                      <div className="flex gap-0.5">
                                        {Array.from({ length: 10 }).map((_, idx) => (
                                          <div key={idx} className={`w-2 h-2 rounded-sm ${idx < Number(r.q3) ? 'bg-[#D4A24E]' : 'bg-[#D4A24E]/10'}`} />
                                        ))}
                                      </div>
                                      <span className="text-[10px] text-[#D4A24E] font-bold">{r.q3}/10</span>
                                    </div>
                                  )}
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                  {r.q1 && <div className="col-span-2"><p className="text-[10px] uppercase font-bold text-[#D4A24E]/70 mb-1">C\u00f3mo se sinti\u00f3</p><p className="text-xs text-[#F5F0E1]/80">{r.q1}</p></div>}
                                  {r.q4 && <div><p className="text-[10px] uppercase font-bold text-[#2DD4A0]/70 mb-1">Acci\u00f3n tomada</p><p className="text-xs text-[#F5F0E1]/80">{r.q4}</p></div>}
                                  {r.q5 && <div><p className="text-[10px] uppercase font-bold text-[#D4A24E]/70 mb-1">Pensamiento dominante</p><p className="text-xs text-[#F5F0E1]/80">{r.q5}</p></div>}
                                  {r.q2 && <div className="col-span-2"><p className="text-[10px] uppercase font-bold text-[#D4A24E]/70 mb-1">Lo que lo fren\u00f3</p><p className="text-xs text-[#F5F0E1]/80">{r.q2}</p></div>}
                                  {r.q6 && <div><p className="text-[10px] uppercase font-bold text-[#D4A24E]/70 mb-1">Emoci\u00f3n predominante</p><p className="text-xs text-[#F5F0E1]/80">{r.q6}</p></div>}
                                  {r.q7 && <div><p className="text-[10px] uppercase font-bold text-[#D4A24E]/70 mb-1">Plan para ma\u00f1ana</p><p className="text-xs text-[#F5F0E1]/80">{r.q7}</p></div>}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* ── METRICAS ── */}
                      {detalleTab === 'metricas' && (
                        <div className="space-y-5">
                          <div className="bg-[#1A1410] border border-[rgba(212,162,78,0.1)] rounded-2xl p-5">
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#F5F0E1]/60 mb-4">Progreso por Pilar</h3>
                            <div className="space-y-3">
                              {SEED_ROADMAP_V2.map(pilar => {
                                const metasPilar = pilar.metas.length;
                                const completadas = selectedCliente.tareas_por_pilar?.[pilar.numero] ?? 0;
                                const pct = metasPilar > 0 ? Math.round((completadas / metasPilar) * 100) : 0;
                                return (
                                  <div key={pilar.numero} className="flex items-center gap-3">
                                    {(() => { const IC = ADMIN_PILAR_ICON_MAP[pilar.icon]; return IC ? <IC className="w-5 h-5 text-[#D4A24E] shrink-0" /> : <span className="w-5 h-5 shrink-0" />; })()}
                                    <span className="text-xs text-[#F5F0E1]/60 w-36 truncate shrink-0">{pilar.titulo}</span>
                                    <div className="flex-1 h-2 bg-[#D4A24E]/5 rounded-full overflow-hidden">
                                      <div className="h-full bg-[#D4A24E] rounded-full transition-all" style={{ width: `${pct}%` }} />
                                    </div>
                                    <span className="text-xs text-[#F5F0E1]/60 w-10 text-right shrink-0">{completadas}/{metasPilar}</span>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                          <div>
                            <h3 className="text-[10px] font-bold uppercase tracking-widest text-[#F5F0E1]/60 mb-3">M\u00e9tricas de Negocio Semanales</h3>
                            {detalleMetricas.length === 0 ? (
                              <div className="bg-[#1A1410] border border-[rgba(212,162,78,0.1)] rounded-2xl p-6 text-center">
                                <p className="text-sm text-[#F5F0E1]/40">El cliente a\u00fan no carg\u00f3 m\u00e9tricas semanales.</p>
                              </div>
                            ) : detalleMetricas.slice().reverse().map((m: any, i: number) => (
                              <div key={i} className="p-5 rounded-2xl bg-[#1A1410] border border-[rgba(212,162,78,0.1)] flex items-center justify-between mb-3">
                                <span className="text-xs font-semibold text-[#F5F0E1]/60 bg-[#D4A24E]/5 px-2.5 py-1 rounded-lg">{m.semana}</span>
                                <div className="flex gap-8">
                                  <div className="text-center"><p className="text-[#F5F0E1] text-lg font-light">{m.leads}</p><p className="text-[10px] text-[#F5F0E1]/40 font-bold uppercase">leads</p></div>
                                  <div className="text-center"><p className="text-[#F5F0E1] text-lg font-light">{m.conversaciones ?? 0}</p><p className="text-[10px] text-[#F5F0E1]/40 font-bold uppercase">llamadas</p></div>
                                  <div className="text-center"><p className="text-[#2DD4A0] text-lg font-bold">{m.ventas}</p><p className="text-[10px] text-[#2DD4A0]/50 font-bold uppercase">ventas</p></div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ── NOTAS INTERNAS ── */}
                      {detalleTab === 'notas' && (
                        <div className="space-y-4">
                          <p className="text-[10px] text-[#F5F0E1]/30 uppercase tracking-wider font-bold">Solo visible para admins -- No la ve el cliente</p>
                          <div className="flex gap-2">
                            <textarea
                              value={notaInput}
                              onChange={e => setNotaInput(e.target.value)}
                              onKeyDown={e => { if (e.key === 'Enter' && e.ctrlKey) agregarNota(); }}
                              placeholder="Escrib\u00ed una nota interna... (Ctrl+Enter para guardar)"
                              rows={3}
                              className="flex-1 bg-black/20 border border-[rgba(212,162,78,0.2)] rounded-lg py-3 px-4 text-sm text-[#F5F0E1] focus:outline-none focus:border-[#D4A24E]/50 transition-all resize-none"
                            />
                            <button
                              onClick={agregarNota}
                              disabled={!notaInput.trim()}
                              className="btn-primary w-12 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 shadow-lg shadow-[#D4A24E]/20 shrink-0"
                            >
                              <Send className="w-4 h-4" />
                            </button>
                          </div>
                          {notaLoading ? (
                            <div className="flex justify-center py-8"><Loader2 className="w-5 h-5 text-[#D4A24E] animate-spin" /></div>
                          ) : detalleNotas.length === 0 ? (
                            <div className="text-center py-12">
                              <BookOpen className="w-8 h-8 text-gray-800 mx-auto mb-3" />
                              <p className="text-[#F5F0E1]/40 text-sm">Sin notas a\u00fan. Us\u00e1 esto para documentar contexto importante del cliente.</p>
                            </div>
                          ) : detalleNotas.map(nota => (
                            <div key={nota.id} className="bg-[#1A1410] border border-[rgba(212,162,78,0.12)] rounded-xl p-4">
                              <p className="text-sm text-[#F5F0E1]/90 leading-relaxed whitespace-pre-wrap">{nota.content}</p>
                              <p className="text-[10px] text-[#F5F0E1]/30 mt-2">
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
                              <p className="text-[#F5F0E1]/40 text-sm">Comenz\u00e1 la conversaci\u00f3n con {selectedCliente.nombre}</p>
                            </div>
                          ) : detalleMensajes.map(m => {
                            const isMe = m.emisor_id === adminProfile.id;
                            const senderName = isMe ? adminProfile.nombre : selectedCliente.nombre;
                            const initial = senderName.charAt(0).toUpperCase();
                            return (
                              <div key={m.id} className={`flex gap-2.5 items-end max-w-[88%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                                <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold border overflow-hidden ${isMe ? 'bg-[#D4A24E]/20 border-[#D4A24E]/30 text-[#D4A24E]' : 'bg-[#D4A24E]/10 border-[rgba(212,162,78,0.2)] text-[#F5F0E1]'}`}>
                                  {isMe
                                    ? (adminAvatar ? <img src={adminAvatar} alt="" className="w-full h-full object-cover" /> : <Shield className="w-3.5 h-3.5" />)
                                    : initial}
                                </div>
                                <div className="flex flex-col gap-1">
                                  <span className={`text-[10px] font-semibold text-[#F5F0E1]/40 px-1 ${isMe ? 'text-right' : ''}`}>{senderName}</span>
                                  <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                                    isMe ? 'bg-[#D4A24E]/25 text-[#F5F0E1] border border-[#D4A24E]/20 rounded-tr-sm'
                                         : 'bg-[#241A0C]/60 text-[#F5F0E1]/90 border border-[rgba(212,162,78,0.12)] rounded-tl-sm'
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
                  <div className="p-4 border-t border-[rgba(212,162,78,0.1)] shrink-0 bg-[#241A0C]/20">
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={mensajeInput}
                        onChange={e => setMensajeInput(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarMensajePrivado()}
                        placeholder="Escribe un mensaje privado..."
                        disabled={enviando}
                        className="flex-1 bg-black/20 border border-[rgba(212,162,78,0.2)] rounded-lg py-3 px-5 text-sm text-[#F5F0E1] focus:outline-none focus:border-[#D4A24E]/50 transition-all"
                      />
                      <button
                        onClick={enviarMensajePrivado}
                        disabled={!mensajeInput.trim() || enviando}
                        className="btn-primary w-12 h-12 rounded-xl flex items-center justify-center transition-colors disabled:opacity-50 shadow-lg shadow-[#D4A24E]/20"
                      >
                        {enviando ? <Loader2 className="w-5 h-5 animate-spin" /> : <Send className="w-5 h-5" />}
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Manager checklist floating panel */}
              {adminRol === 'manager' && checklistItems.length > 0 && (
                <div className="w-[260px] shrink-0">
                  <ManagerChecklist
                    items={checklistItems}
                    onToggle={toggleChecklistItem}
                    loading={checklistLoading}
                  />
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB: MENSAJES (unified)
              ═══════════════════════════════════════════════════════════════════════ */}
          {mainTab === 'mensajes' && (
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
              {/* Channel tabs */}
              <div className="flex border-b border-[rgba(212,162,78,0.1)] px-6 shrink-0 bg-black/20">
                {([
                  { id: 'comunidad' as MensajesChannel, label: 'Comunidad', icon: Users },
                  { id: 'victorias' as MensajesChannel, label: 'Victorias', icon: Trophy },
                  { id: 'consultas' as MensajesChannel, label: 'Consultas', icon: Hash },
                  { id: 'privados' as MensajesChannel, label: 'Privados', icon: MessageSquare },
                ]).map(ch => (
                  <button
                    key={ch.id}
                    onClick={() => { setMensajesChannel(ch.id); setChatCliente(null); }}
                    className={`flex items-center gap-2 px-5 py-4 text-sm font-medium transition-all relative ${
                      mensajesChannel === ch.id
                        ? 'text-[#D4A24E]'
                        : 'text-[#F5F0E1]/40 hover:text-[#F5F0E1]/80'
                    }`}
                  >
                    <ch.icon className="w-4 h-4" />
                    {ch.label}
                    {(channelUnread[ch.id] ?? 0) > 0 && (
                      <span className="min-w-[16px] h-[16px] px-1 rounded-full bg-[#D4A24E] text-[#F5F0E1] text-[9px] font-bold flex items-center justify-center">
                        {channelUnread[ch.id]}
                      </span>
                    )}
                    {mensajesChannel === ch.id && (
                      <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#D4A24E] rounded-t-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* Channel content */}
              {mensajesChannel !== 'privados' ? (
                <div className="flex-1 min-h-0 p-4">
                  <GlobalChat canal={mensajesChannel} adminProfile={adminProfile} />
                </div>
              ) : (
                /* Privados: WhatsApp-style */
                <div className="flex flex-1 min-h-0 overflow-hidden">
                  {/* Left: client list */}
                  <div className="w-[280px] shrink-0 border-r border-[rgba(212,162,78,0.12)] flex flex-col bg-black/20">
                    <div className="p-4 border-b border-[rgba(212,162,78,0.12)]">
                      <p className="text-[11px] font-bold uppercase tracking-widest text-[#F5F0E1]/40">Conversaciones ({clientes.length})</p>
                    </div>
                    <div className="flex-1 overflow-y-auto scrollbar-hide">
                      {loading ? (
                        <div className="flex justify-center py-10"><Loader2 className="w-5 h-5 text-[#D4A24E] animate-spin" /></div>
                      ) : clientes.map(c => (
                        <button
                          key={c.id}
                          onClick={() => { setChatCliente(c); cargarChatMessages(c.id); }}
                          className={`w-full text-left px-4 py-3.5 border-b border-[rgba(212,162,78,0.08)] transition-all flex items-center gap-3 ${
                            chatCliente?.id === c.id ? 'bg-[#D4A24E]/10' : 'hover:bg-[#241A0C]/50'
                          }`}
                        >
                          <div className={`w-10 h-10 rounded-full shrink-0 flex items-center justify-center text-sm font-bold border ${
                            chatCliente?.id === c.id ? 'bg-[#D4A24E]/20 border-[#D4A24E]/30 text-[#D4A24E]' : 'bg-[#D4A24E]/5 border-[rgba(212,162,78,0.2)] text-[#F5F0E1]'
                          }`}>
                            {c.nombre.charAt(0).toUpperCase()}
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-[#F5F0E1] truncate">{c.nombre}</p>
                            <p className="text-[10px] text-[#F5F0E1]/40 truncate">{c.especialidad || 'Sin especialidad'}</p>
                          </div>
                          <div className={`w-2 h-2 rounded-full shrink-0 ${SEMAFORO_CONFIG[c.semaforo].class}`} />
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Right: conversation */}
                  {chatCliente ? (
                    <div className="flex-1 flex flex-col min-w-0 bg-[#080808]">
                      <div className="h-16 border-b border-[rgba(212,162,78,0.12)] flex items-center gap-3 px-6 shrink-0 bg-black/20">
                        <div className="w-9 h-9 rounded-full bg-[#D4A24E]/20 border border-[#D4A24E]/30 flex items-center justify-center text-sm font-bold text-[#D4A24E]">
                          {chatCliente.nombre.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-[#F5F0E1]">{chatCliente.nombre}</p>
                          <p className="text-[10px] text-[#F5F0E1]/40">{chatCliente.especialidad || 'D\u00eda ' + chatCliente.dia_programa + '/90'}</p>
                        </div>
                      </div>
                      <div className="flex-1 overflow-y-auto p-5 scrollbar-hide space-y-3">
                        {chatLoading ? (
                          <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-[#D4A24E] animate-spin" /></div>
                        ) : chatMessages.length === 0 ? (
                          <div className="flex flex-col items-center justify-center h-full text-center">
                            <MessageSquare className="w-10 h-10 text-gray-800 mb-4" />
                            <p className="text-[#F5F0E1]/40 text-sm">Comenz\u00e1 la conversaci\u00f3n con {chatCliente.nombre}</p>
                          </div>
                        ) : chatMessages.map(m => {
                          const isMe = m.emisor_id === adminProfile.id;
                          const senderName = isMe ? adminProfile.nombre : chatCliente.nombre;
                          return (
                            <div key={m.id} className={`flex gap-2.5 items-end max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                              <div className={`w-7 h-7 rounded-full shrink-0 flex items-center justify-center text-xs font-bold border overflow-hidden ${isMe ? 'bg-[#D4A24E]/20 border-[#D4A24E]/30' : 'bg-[#D4A24E]/10 border-[rgba(212,162,78,0.2)]'}`}>
                                {isMe
                                  ? (adminAvatar ? <img src={adminAvatar} alt="" className="w-full h-full object-cover" /> : <Shield className="w-3.5 h-3.5 text-[#D4A24E]" />)
                                  : senderName.charAt(0).toUpperCase()
                                }
                              </div>
                              <div className="flex flex-col gap-1">
                                <span className={`text-[10px] font-semibold text-[#F5F0E1]/40 px-1 ${isMe ? 'text-right' : ''}`}>{senderName}</span>
                                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                                  isMe ? 'bg-[#D4A24E]/25 text-[#F5F0E1] border border-[#D4A24E]/20 rounded-tr-sm'
                                       : 'bg-[#241A0C]/60 text-[#F5F0E1]/90 border border-[rgba(212,162,78,0.12)] rounded-tl-sm'
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
                      <div className="p-4 border-t border-[rgba(212,162,78,0.12)] shrink-0 bg-[#241A0C]/20">
                        <div className="flex gap-2">
                          <input
                            type="text"
                            value={chatInput}
                            onChange={e => setChatInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && enviarChatMsg()}
                            placeholder={`Mensaje a ${chatCliente.nombre}...`}
                            disabled={chatEnviando}
                            className="flex-1 bg-black/20 border border-[rgba(212,162,78,0.2)] rounded-lg py-3 px-5 text-sm text-[#F5F0E1] focus:outline-none focus:border-[#D4A24E]/50 transition-all"
                          />
                          <button
                            onClick={enviarChatMsg}
                            disabled={!chatInput.trim() || chatEnviando}
                            className="btn-primary w-12 h-12 rounded-xl flex items-center justify-center disabled:opacity-50 transition-colors shadow-lg shadow-[#D4A24E]/20"
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
                        <p className="text-[#F5F0E1]/40 text-sm">Seleccion\u00e1 un cliente para chatear</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB: METRICAS
              ═══════════════════════════════════════════════════════════════════════ */}
          {mainTab === 'metricas' && (
            <div className="max-w-6xl mx-auto space-y-6">
              {/* Client filter */}
              <div className="flex flex-wrap gap-2 items-center">
                <button
                  onClick={() => setFiltroMetricasId(null)}
                  className={`px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                    filtroMetricasId === null
                      ? 'bg-[#D4A24E]/20 border-[#D4A24E]/50 text-[#D4A24E]'
                      : 'bg-[#241A0C]/50 border-[rgba(212,162,78,0.14)] text-[#F5F0E1]/60 hover:text-[#F5F0E1] hover:bg-[#D4A24E]/6'
                  }`}
                >
                  <Globe className="w-4 h-4 inline" /> Global ({clientes.length})
                </button>
                {clientes.map(c => (
                  <button
                    key={c.id}
                    onClick={() => setFiltroMetricasId(c.id)}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all border ${
                      filtroMetricasId === c.id
                        ? 'bg-[#D4A24E]/20 border-[#D4A24E]/50 text-[#D4A24E]'
                        : 'bg-[#241A0C]/50 border-[rgba(212,162,78,0.14)] text-[#F5F0E1]/60 hover:text-[#F5F0E1] hover:bg-[#D4A24E]/6'
                    }`}
                  >
                    <span className={`w-2 h-2 rounded-full ${SEMAFORO_CONFIG[c.semaforo].class}`} />
                    {c.nombre.split(' ')[0]}
                  </button>
                ))}
                <button
                  onClick={() => { setMetricasGlobales(null); cargarMetricasGlobales(); cargarClientes(); }}
                  className="ml-auto flex items-center gap-1.5 px-3 py-2 rounded-xl bg-[#241A0C]/50 border border-[rgba(212,162,78,0.14)] text-xs text-[#F5F0E1]/40 hover:text-[#F5F0E1] transition-colors"
                >
                  <Loader2 className="w-3.5 h-3.5" /> Actualizar
                </button>
              </div>

              {filtroMetricasId === null ? (
                <>
                  {/* KPIs */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { label: 'Profesionales activos', value: clientes.length, icon: Users, color: 'text-[#D4A24E]', border: 'border-[#D4A24E]/20', bg: 'bg-[#D4A24E]/5' },
                      { label: 'En ritmo', value: clientes.filter(c => c.semaforo === 'verde').length, icon: CheckCheck, color: 'text-[#2DD4A0]', border: 'border-[#2DD4A0]/20', bg: 'bg-[#2DD4A0]/5' },
                      { label: 'Necesitan atenci\u00f3n', value: clientes.filter(c => c.semaforo === 'rojo' || c.semaforo === 'amarillo').length, icon: AlertTriangle, color: 'text-[#D4A24E]', border: 'border-[#D4A24E]/20', bg: 'bg-[#D4A24E]/5' },
                      { label: 'Progreso promedio', value: clientes.length ? `${Math.round(clientes.reduce((a, c) => a + (c.tareas_total > 0 ? (c.tareas_completadas / c.tareas_total) * 100 : (c.progreso_porcentaje ?? 0)), 0) / clientes.length)}%` : '\u2014', icon: TrendingUp, color: 'text-[#D4A24E]', border: 'border-[#D4A24E]/20', bg: 'bg-[#D4A24E]/5' },
                    ].map((s, i) => (
                      <div key={i} className={`${s.bg} border ${s.border} rounded-2xl p-5`}>
                        <s.icon className={`w-5 h-5 ${s.color} mb-3`} />
                        <p className={`text-3xl font-light ${s.color} mb-1`}>{s.value}</p>
                        <p className="text-xs text-[#F5F0E1]/40 font-semibold uppercase tracking-wider">{s.label}</p>
                      </div>
                    ))}
                  </div>

                  {/* Progress table */}
                  <div className="card-panel border border-[rgba(212,162,78,0.2)] rounded-2xl overflow-hidden">
                    <div className="px-6 py-4 border-b border-[rgba(212,162,78,0.1)] flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-widest text-[#F5F0E1]/60 flex items-center gap-2">
                        <BarChart2 className="w-3.5 h-3.5 text-[#D4A24E]" /> Progreso individual
                      </h3>
                    </div>
                    <div className="divide-y divide-[rgba(212,162,78,0.1)]">
                      {clientes.length === 0 ? (
                        <p className="text-[#F5F0E1]/30 text-sm text-center py-10">Sin datos de clientes</p>
                      ) : clientes.map(c => {
                        const pct = c.tareas_total > 0
                          ? Math.round((c.tareas_completadas / c.tareas_total) * 100)
                          : (c.progreso_porcentaje ?? 0);
                        return (
                          <button
                            key={c.id}
                            onClick={() => setFiltroMetricasId(c.id)}
                            className="w-full flex items-center gap-4 px-6 py-4 bg-[#1A1410] hover:bg-[#241A0C] transition-colors text-left group"
                          >
                            <div className={`w-2 h-2 rounded-full shrink-0 ${SEMAFORO_CONFIG[c.semaforo].class}`} />
                            <div className="w-32 shrink-0">
                              <p className="text-sm font-semibold text-[#F5F0E1] group-hover:text-[#D4A24E] transition-colors truncate">{c.nombre}</p>
                              <p className="text-[10px] text-[#F5F0E1]/40">D\u00eda {c.dia_programa}/90</p>
                            </div>
                            <div className="flex-1">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-[10px] text-[#F5F0E1]/40">Pilar {derivePilarFromProgress(c.tareas_completadas)}</span>
                                <span className="text-xs font-bold text-[#F5F0E1]">{pct}%</span>
                              </div>
                              <div className="h-2 bg-[#D4A24E]/5 rounded-full overflow-hidden">
                                <div className="h-full rounded-full bg-[#D4A24E] transition-all" style={{ width: `${pct}%` }} />
                              </div>
                            </div>
                            <div className="flex items-center gap-5 shrink-0">
                              {c.racha_diario > 0 && <div className="text-center"><p className="text-sm font-bold text-[#D4A24E] flex items-center gap-0.5"><Flame className="w-3.5 h-3.5" /> {c.racha_diario}</p><p className="text-[9px] text-[#F5F0E1]/30 uppercase">Racha</p></div>}
                              <div className="text-center"><p className={`text-sm font-bold ${c.ventas_count > 0 ? 'text-[#2DD4A0]' : 'text-[#F5F0E1]/30'}`}>{c.ventas_count}</p><p className="text-[9px] text-[#F5F0E1]/30 uppercase">Ventas</p></div>
                              <ChevronRight className="w-4 h-4 text-gray-700 group-hover:text-[#D4A24E] transition-colors" />
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* Guarantee status */}
                  <div className="grid grid-cols-3 gap-4">
                    {[
                      { label: 'En camino al resultado', IconComp: CheckCircle2, count: clientes.filter(c => c.estado_garantia === 'en_camino').length, color: 'text-[#2DD4A0]', border: 'border-[#2DD4A0]/20', bg: 'bg-[#2DD4A0]/5' },
                      { label: 'En riesgo de garant\u00eda', IconComp: AlertTriangle, count: clientes.filter(c => c.estado_garantia === 'en_riesgo').length, color: 'text-[#D4A24E]', border: 'border-[#D4A24E]/20', bg: 'bg-[#D4A24E]/5' },
                      { label: 'Garant\u00eda activada', IconComp: Shield, count: clientes.filter(c => c.estado_garantia === 'activada').length, color: 'text-[#E85555]', border: 'border-[#E85555]/20', bg: 'bg-[#E85555]/5' },
                    ].map((s, i) => (
                      <div key={i} className={`${s.bg} border ${s.border} rounded-2xl p-5 flex items-center gap-4`}>
                        <s.IconComp className={`w-8 h-8 ${s.color}`} />
                        <div>
                          <p className={`text-3xl font-light ${s.color} mb-0.5`}>{s.count}</p>
                          <p className="text-xs text-[#F5F0E1]/60 font-medium">{s.label}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                /* Individual view */
                (() => {
                  const c = clientes.find(x => x.id === filtroMetricasId);
                  if (!c) return null;
                  const pct = c.tareas_total > 0
                    ? Math.round((c.tareas_completadas / c.tareas_total) * 100)
                    : (c.progreso_porcentaje ?? 0);
                  return (
                    <div className="space-y-5">
                      <div className="flex items-center gap-4 bg-[#D4A24E]/10 border border-[#D4A24E]/20 rounded-2xl p-5">
                        <div className="w-14 h-14 rounded-2xl bg-[#D4A24E]/30 border border-[#D4A24E]/30 flex items-center justify-center text-xl font-bold text-[#F5F0E1]">
                          {c.nombre.charAt(0)}
                        </div>
                        <div className="flex-1">
                          <h3 className="text-xl font-semibold text-[#F5F0E1]">{c.nombre}</h3>
                          <p className="text-sm text-[#F5F0E1]/60">{c.especialidad || 'Profesional de la salud'} \u00b7 {c.email}</p>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <span className={`w-2.5 h-2.5 rounded-full ${SEMAFORO_CONFIG[c.semaforo].class}`} />
                          <span className={`text-sm font-semibold ${SEMAFORO_CONFIG[c.semaforo].text}`}>{SEMAFORO_CONFIG[c.semaforo].label}</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {[
                          { label: 'D\u00eda del programa', value: `${c.dia_programa}/90`, color: 'text-[#D4A24E]' },
                          { label: 'Tareas completadas', value: `${c.tareas_completadas}/${c.tareas_total}`, color: 'text-[#D4A24E]' },
                          { label: 'Racha diario', value: c.racha_diario > 0 ? `${c.racha_diario} d\u00edas` : '\u2014', color: 'text-[#D4A24E]' },
                          { label: 'Ventas registradas', value: c.ventas_count, color: 'text-[#2DD4A0]' },
                        ].map((s, i) => (
                          <div key={i} className="bg-[#1A1410] border border-[rgba(212,162,78,0.14)] rounded-2xl p-4">
                            <p className={`text-2xl font-light ${s.color} mb-1`}>{s.value}</p>
                            <p className="text-[10px] text-[#F5F0E1]/40 uppercase tracking-wider font-semibold">{s.label}</p>
                          </div>
                        ))}
                      </div>

                      <div className="bg-[#1A1410] border border-[rgba(212,162,78,0.12)] rounded-2xl p-5">
                        <div className="flex items-center justify-between mb-3">
                          <p className="text-xs font-bold uppercase tracking-widest text-[#F5F0E1]/60">Progreso en el programa</p>
                          <p className="text-2xl font-light text-[#F5F0E1]">{pct}%</p>
                        </div>
                        <div className="h-3 bg-[#D4A24E]/5 rounded-full overflow-hidden mb-2">
                          <div className="h-full rounded-full bg-[#D4A24E] transition-all duration-700" style={{ width: `${pct}%` }} />
                        </div>
                      </div>

                      {/* Pilar accordion */}
                      <div className="card-panel border border-[rgba(212,162,78,0.2)] rounded-2xl overflow-hidden">
                        <div className="px-5 pt-5 pb-3 flex items-center justify-between">
                          <h3 className="text-xs font-bold uppercase tracking-widest text-[#F5F0E1]/60 flex items-center gap-2">
                            <BarChart2 className="w-3.5 h-3.5 text-[#D4A24E]" /> Estimaci\u00f3n por pilar
                          </h3>
                          {metricasTareasLoading && <Loader2 className="w-3.5 h-3.5 text-[#D4A24E] animate-spin" />}
                        </div>
                        <div className="divide-y divide-[rgba(212,162,78,0.1)]">
                          {SEED_ROADMAP_V2.map(pilar => {
                            const metasPilar = pilar.metas.length;
                            const completadasReales = (c as any).tareas_por_pilar
                              ? ((c as any).tareas_por_pilar[pilar.numero] ?? 0)
                              : Math.min(metasPilar, Math.max(0, c.tareas_completadas - SEED_ROADMAP_V2.slice(0, pilar.numero).reduce((a, p) => a + p.metas.length, 0)));
                            const pctPilar = metasPilar > 0 ? Math.round((completadasReales / metasPilar) * 100) : 0;
                            const expandido = pilarExpandido[pilar.numero] ?? false;
                            const tareasCompletadasPilar = metricasTareas.filter((t: any) => (t.pilar_numero ?? t.pilarNumero) === pilar.numero);
                            return (
                              <div key={pilar.numero}>
                                <button
                                  type="button"
                                  onClick={() => completadasReales > 0 && setPilarExpandido(prev => ({ ...prev, [pilar.numero]: !expandido }))}
                                  className={`w-full flex items-center gap-3 px-5 py-3.5 transition-colors text-left bg-[#1A1410] ${
                                    completadasReales > 0 ? 'hover:bg-[#241A0C] cursor-pointer' : 'cursor-default'
                                  }`}
                                >
                                  {(() => { const IC = ADMIN_PILAR_ICON_MAP[pilar.icon]; return IC ? <IC className="w-5 h-5 text-[#D4A24E] shrink-0" /> : <span className="w-5 h-5 shrink-0" />; })()}
                                  <span className="text-xs text-[#F5F0E1]/80 w-36 truncate shrink-0 font-medium">{pilar.titulo}</span>
                                  <div className="flex-1 h-1.5 bg-[#D4A24E]/5 rounded-full overflow-hidden">
                                    <div className="h-full rounded-full bg-[#D4A24E] transition-all duration-500" style={{ width: `${pctPilar}%` }} />
                                  </div>
                                  <span className="text-xs text-[#F5F0E1]/40 w-10 text-right shrink-0">{completadasReales}/{metasPilar}</span>
                                  {completadasReales > 0 && (
                                    <ChevronDown className={`w-3.5 h-3.5 shrink-0 transition-transform text-[#D4A24E] ${expandido ? 'rotate-180' : ''}`} />
                                  )}
                                </button>

                                {expandido && (
                                  <div className="px-5 pb-4 space-y-2 bg-[#D4A24E]/5">
                                    {pilar.metas.map(meta => {
                                      const tareaData = tareasCompletadasPilar.find((t: any) => t.meta_codigo === meta.codigo);
                                      if (!tareaData) return null;
                                      const herramientaOutput = meta.herramienta_id
                                        ? metricasOutputs.find((o: any) => o.herramienta_id === meta.herramienta_id)
                                        : null;
                                      const rawOutput = tareaData.output_generado ?? herramientaOutput?.output ?? null;
                                      const hasOutput = !!rawOutput;
                                      return (
                                        <button
                                          key={meta.codigo}
                                          type="button"
                                          onClick={() => abrirTareaModal(meta, tareaData, rawOutput, c.nombre)}
                                          className="w-full text-left bg-black/20 border border-[rgba(212,162,78,0.12)] rounded-xl overflow-hidden hover:border-[rgba(212,162,78,0.3)] hover:bg-[#241A0C]/50 transition-all group"
                                        >
                                          <div className="flex items-center gap-3 p-3.5">
                                            <CheckCircle2 className="w-4 h-4 shrink-0 text-[#D4A24E]" />
                                            <div className="flex-1 min-w-0">
                                              <div className="flex items-center gap-2 flex-wrap">
                                                <span className="text-[10px] font-bold uppercase tracking-wider px-1.5 py-0.5 rounded bg-[#D4A24E]/10 text-[#D4A24E]">{meta.codigo}</span>
                                                {meta.es_estrella && <Star className="w-3 h-3 text-[#D4A24E] fill-[#D4A24E]" />}
                                                {tareaData.fecha_completada && (
                                                  <span className="text-[10px] text-[#F5F0E1]/30">
                                                    {new Date(tareaData.fecha_completada).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })}
                                                  </span>
                                                )}
                                              </div>
                                              <p className="text-sm font-semibold text-[#F5F0E1] mt-0.5 truncate">{meta.titulo}</p>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                              {hasOutput && (
                                                <span className="text-[10px] text-[#D4A24E] bg-[#D4A24E]/10 px-2 py-0.5 rounded-full">Con output</span>
                                              )}
                                              <ChevronRight className="w-3.5 h-3.5 text-[#F5F0E1]/30 group-hover:text-[#F5F0E1]/60 transition-colors" />
                                            </div>
                                          </div>
                                        </button>
                                      );
                                    })}
                                    {tareasCompletadasPilar.length === 0 && (
                                      <p className="text-xs text-[#F5F0E1]/30 py-2">Sin datos detallados disponibles a\u00fan.</p>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      <button
                        onClick={() => { setSelectedCliente(c); setMainTab('clientes'); setDetalleTab('resumen'); }}
                        className="w-full py-3 rounded-xl bg-[#D4A24E]/10 border border-[#D4A24E]/20 text-[#D4A24E] text-sm font-semibold hover:bg-[#D4A24E]/20 transition-colors"
                      >
                        Ver perfil completo con diario, m\u00e9tricas y mensajes
                      </button>
                    </div>
                  );
                })()
              )}
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB: VIDEOS (pilar-based)
              ═══════════════════════════════════════════════════════════════════════ */}
          {mainTab === 'videos' && (
            <div className="max-w-5xl mx-auto space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-light text-[#F5F0E1] tracking-tight" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>Videos del Programa</h2>
                  <p className="text-sm text-[#F5F0E1]/40 mt-1">Agreg\u00e1 videos de YouTube por pilar. Se muestran autom\u00e1ticamente en la Biblioteca de tus clientes.</p>
                </div>
                <button
                  onClick={() => { setVideoForm({ pilar_id: 'P0', titulo: '', descripcion: '', youtubeUrl: '', duracion: '' }); setShowAddVideo(true); }}
                  className="btn-primary flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold shadow-lg shadow-[#D4A24E]/20"
                >
                  <Plus className="w-4 h-4" /> Agregar Video
                </button>
              </div>

              {/* Videos grouped by pilar */}
              {SEED_ROADMAP_V3.map(pilar => {
                // Find videos for this pilar: match by pilar_id or fallback grupo mapping
                const vids = adminVideos.filter(v => v.pilar_id === pilar.id);
                // Also find VIDEO tasks in the roadmap for this pilar
                const videoTask = pilar.metas.find(m => m.tipo === 'VIDEO');
                return (
                  <div key={pilar.id} className="card-panel border border-[rgba(212,162,78,0.2)] rounded-2xl overflow-hidden">
                    <div className="px-5 py-3 border-b border-[rgba(212,162,78,0.12)] flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {(() => { const IC = ADMIN_PILAR_ICON_MAP[pilar.icon]; return IC ? <IC className="w-4 h-4 text-[#D4A24E]" /> : null; })()}
                        <p className="text-sm font-semibold text-[#F5F0E1]">{pilar.id} \u2014 {pilar.titulo}</p>
                        {videoTask && <span className="text-[10px] text-[#F5F0E1]/30 ml-2 truncate max-w-[200px]">{videoTask.titulo}</span>}
                      </div>
                      <span className="text-[10px] bg-[#D4A24E]/5 px-2 py-0.5 rounded-full text-[#F5F0E1]/40">{vids.length} videos</span>
                    </div>
                    {videosLoading ? (
                      <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 text-[#D4A24E] animate-spin" /></div>
                    ) : vids.length === 0 ? (
                      <div className="px-5 py-4 text-sm text-[#F5F0E1]/30">Sin videos en este pilar todav\u00eda.</div>
                    ) : (
                      <div className="divide-y divide-[rgba(212,162,78,0.1)]">
                        {vids.map(v => {
                          const vidId = getYoutubeId(v.youtubeUrl);
                          return (
                            <div key={v.id} className="flex items-center gap-4 px-5 py-3 bg-[#1A1410] hover:bg-[#241A0C] transition-colors">
                              <div className="w-16 h-10 rounded-lg overflow-hidden bg-black/40 shrink-0">
                                {vidId ? (
                                  <img src={`https://img.youtube.com/vi/${vidId}/mqdefault.jpg`} alt={v.titulo} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center"><Youtube className="w-4 h-4 text-[#E85555]/40" /></div>
                                )}
                              </div>
                              <div className="flex-1 min-w-0">
                                <p className="text-sm font-medium text-[#F5F0E1] truncate">{v.titulo}</p>
                                <p className="text-xs text-[#F5F0E1]/40 truncate">{v.descripcion}</p>
                              </div>
                              <span className="text-[10px] text-[#D4A24E] font-medium shrink-0">{v.pilar_id ?? v.grupo}</span>
                              {v.duracion && <span className="text-[10px] text-[#F5F0E1]/40 shrink-0">{v.duracion}</span>}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setVideoForm({
                                      id: v.id,
                                      pilar_id: (v.pilar_id ?? 'P0') as PilarId,
                                      titulo: v.titulo,
                                      descripcion: v.descripcion,
                                      youtubeUrl: v.youtubeUrl,
                                      duracion: v.duracion || '',
                                    });
                                    setShowAddVideo(true);
                                  }}
                                  className="w-7 h-7 rounded-lg bg-[#D4A24E]/5 hover:bg-[#D4A24E]/10 flex items-center justify-center text-[#F5F0E1]/60 hover:text-[#F5F0E1] transition-colors shrink-0"
                                  title="Editar video"
                                >
                                  <Settings className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => deleteAdminVideo(v.id)}
                                  className="w-7 h-7 rounded-lg bg-[#E85555]/10 hover:bg-[#E85555]/20 flex items-center justify-center text-[#E85555] transition-colors shrink-0"
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
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════════════
              TAB: EQUIPO (owner only)
              ═══════════════════════════════════════════════════════════════════════ */}
          {mainTab === 'equipo' && (adminRol === 'owner' || !adminRol) && (
            <div className="max-w-4xl mx-auto space-y-6">
              <div>
                <h2 className="text-2xl font-light text-[#F5F0E1] tracking-tight" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>Gesti\u00f3n de Equipo</h2>
                <p className="text-sm text-[#F5F0E1]/40 mt-1">Administr\u00e1 roles y permisos de los miembros del equipo.</p>
              </div>

              <div className="card-panel border border-[rgba(212,162,78,0.2)] rounded-2xl overflow-hidden">
                {teamLoading ? (
                  <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-[#D4A24E] animate-spin" /></div>
                ) : teamMembers.length === 0 ? (
                  <div className="text-center py-16">
                    <UsersRound className="w-8 h-8 text-gray-700 mx-auto mb-3" />
                    <p className="text-[#F5F0E1]/40 text-sm">No hay miembros del equipo</p>
                  </div>
                ) : (
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[rgba(212,162,78,0.1)]">
                        {['Nombre', 'Rol', 'Estado'].map(h => (
                          <th key={h} className="text-left px-5 py-3 text-[10px] font-bold uppercase tracking-widest text-[#F5F0E1]/40">{h}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {teamMembers.map(member => {
                        const memberRol: AdminRol = member.admin_rol ?? 'owner';
                        return (
                          <tr key={member.id} className="bg-[#1A1410] hover:bg-[#241A0C] border-b border-[rgba(212,162,78,0.1)] transition-colors">
                            <td className="px-5 py-4">
                              <div className="flex items-center gap-3">
                                <div className="w-9 h-9 rounded-full bg-[#D4A24E]/10 border border-[rgba(212,162,78,0.2)] flex items-center justify-center text-sm font-bold text-[#F5F0E1]">
                                  {member.nombre?.charAt(0)?.toUpperCase() ?? '?'}
                                </div>
                                <div>
                                  <p className="text-sm font-medium text-[#F5F0E1]">{member.nombre}</p>
                                  <p className="text-[10px] text-[#F5F0E1]/40">{member.email}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-5 py-4">
                              {member.id === adminProfile.id ? (
                                <span className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider bg-[#D4A24E]/20 text-[#D4A24E] border border-[#D4A24E]/30">
                                  {memberRol}
                                </span>
                              ) : (
                                <CustomSelect
                                  value={memberRol}
                                  onChange={(val) => cambiarRolAdmin(member.id, val as AdminRol)}
                                  options={[
                                    { value: 'owner', label: 'Owner' },
                                    { value: 'manager', label: 'Manager' },
                                    { value: 'staff', label: 'Staff' },
                                  ]}
                                  className="w-32"
                                />
                              )}
                            </td>
                            <td className="px-5 py-4">
                              <span className="text-[10px] font-bold px-2 py-1 rounded-md uppercase tracking-wider bg-[#2DD4A0]/10 text-[#2DD4A0] border border-[#2DD4A0]/20">
                                Activo
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                )}
              </div>
            </div>
          )}

        </div>
      </main>

      {/* ─── MODAL AJUSTES ADMIN ────────────────────────────────────────────────── */}
      {showAdminSettings && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="w-full max-w-md bg-[#1A1410] border border-[rgba(212,162,78,0.2)] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#D4A24E]" />
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-[#F5F0E1]">Ajustes de Perfil Admin</h3>
              <button onClick={() => setShowAdminSettings(false)} className="w-8 h-8 rounded-full bg-[#D4A24E]/5 flex items-center justify-center text-[#F5F0E1]/60 hover:text-[#F5F0E1] hover:bg-[#D4A24E]/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center gap-3 mb-6">
              <input ref={adminAvatarInputRef} type="file" accept="image/*" className="hidden" onChange={handleAdminAvatarUpload} />
              <button
                onClick={() => adminAvatarInputRef.current?.click()}
                className="relative group w-20 h-20 rounded-full border-2 border-dashed border-[rgba(212,162,78,0.3)] hover:border-[#D4A24E]/50 transition-colors overflow-hidden"
              >
                {adminAvatar ? (
                  <img src={adminAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-[#D4A24E]/10 flex items-center justify-center text-2xl font-bold text-[#D4A24E]">
                    {(adminDraft.nombre || 'A').charAt(0).toUpperCase()}
                  </div>
                )}
                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                  <Camera className="w-6 h-6 text-[#F5F0E1]" />
                </div>
              </button>
              <p className="text-xs text-[#F5F0E1]/40">Clic para cambiar foto</p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F5F0E1]/60 mb-2">Nombre completo</label>
                <input
                  type="text"
                  value={adminDraft.nombre}
                  onChange={e => setAdminDraft({ ...adminDraft, nombre: e.target.value })}
                  className="w-full bg-black/20 border border-[rgba(212,162,78,0.2)] rounded-lg px-4 py-3 text-sm text-[#F5F0E1] focus:outline-none focus:border-[#D4A24E]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F5F0E1]/60 mb-2">Cargo / T\u00edtulo</label>
                <input
                  type="text"
                  value={adminDraft.cargo}
                  onChange={e => setAdminDraft({ ...adminDraft, cargo: e.target.value })}
                  placeholder="Ej: Coach Principal, Soporte T\u00e9cnico..."
                  className="w-full bg-black/20 border border-[rgba(212,162,78,0.2)] rounded-lg px-4 py-3 text-sm text-[#F5F0E1] focus:outline-none focus:border-[#D4A24E]/50 transition-colors"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-8">
              <button onClick={() => setShowAdminSettings(false)} className="btn-secondary flex-1 py-3 rounded-xl text-sm font-semibold transition-colors">
                Cancelar
              </button>
              <button
                onClick={guardarConfigAdmin}
                disabled={guardandoAdmin || !adminDraft.nombre.trim()}
                className="btn-primary flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {guardandoAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Guardar Cambios'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL NUEVO CLIENTE ────────────────────────────────────────────────── */}
      {showNuevoCliente && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#1A1410] border border-[rgba(212,162,78,0.2)] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#D4A24E]" />
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-xl font-semibold text-[#F5F0E1] tracking-tight">Nuevo Estudiante</h3>
                <p className="text-xs text-[#F5F0E1]/40 mt-1">Ingresa sus datos para la academia</p>
              </div>
              <button onClick={() => setShowNuevoCliente(false)} className="w-8 h-8 rounded-full bg-[#D4A24E]/5 flex items-center justify-center text-[#F5F0E1]/60 hover:text-[#F5F0E1] hover:bg-[#D4A24E]/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F5F0E1]/60 mb-2">Nombre completo *</label>
                <input type="text" value={nuevoForm.nombre} onChange={e => setNuevoForm({ ...nuevoForm, nombre: e.target.value })} placeholder="Ej: Dra. Mar\u00eda Gonz\u00e1lez" className="w-full bg-black/20 border border-[rgba(212,162,78,0.2)] rounded-lg px-4 py-3 text-sm text-[#F5F0E1] focus:outline-none focus:border-[#D4A24E]/50 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F5F0E1]/60 mb-2">Email *</label>
                <input type="email" value={nuevoForm.email} onChange={e => setNuevoForm({ ...nuevoForm, email: e.target.value })} placeholder="maria@ejemplo.com" className="w-full bg-black/20 border border-[rgba(212,162,78,0.2)] rounded-lg px-4 py-3 text-sm text-[#F5F0E1] focus:outline-none focus:border-[#D4A24E]/50 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#2DD4A0]/80 mb-2">Contrase\u00f1a inicial *</label>
                <input type="text" value={nuevoForm.password} onChange={e => setNuevoForm({ ...nuevoForm, password: e.target.value })} placeholder="Ej: Maria123!" className="w-full bg-[#2DD4A0]/5 border border-[#2DD4A0]/20 rounded-lg px-4 py-3 text-sm text-[#2DD4A0] placeholder-[#2DD4A0]/30 focus:outline-none focus:border-[#2DD4A0]/50 transition-colors" />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F5F0E1]/60 mb-2">Especialidad</label>
                <input type="text" value={nuevoForm.especialidad} onChange={e => setNuevoForm({ ...nuevoForm, especialidad: e.target.value })} placeholder="Ej: Nutricionista" className="w-full bg-black/20 border border-[rgba(212,162,78,0.2)] rounded-lg px-4 py-3 text-sm text-[#F5F0E1] focus:outline-none focus:border-[#D4A24E]/50 transition-colors" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F5F0E1]/60 mb-2">Plan</label>
                  <CustomSelect
                    value={nuevoForm.plan}
                    onChange={(val) => setNuevoForm({ ...nuevoForm, plan: val as 'DWY' | 'DFY' | 'IMPLEMENTACION' })}
                    options={[
                      { value: 'DWY', label: 'DWY \u2014 Solo App' },
                      { value: 'DFY', label: 'DFY \u2014 Con Paolis' },
                      { value: 'IMPLEMENTACION', label: 'Implementaci\u00f3n' },
                    ]}
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F5F0E1]/60 mb-2">Inicio</label>
                  <input type="date" value={nuevoForm.fecha_inicio} onChange={e => setNuevoForm({ ...nuevoForm, fecha_inicio: e.target.value })} className="w-full bg-black/20 border border-[rgba(212,162,78,0.2)] rounded-lg px-4 py-3 text-sm text-[#F5F0E1] focus:outline-none focus:border-[#D4A24E]/50 transition-colors" />
                </div>
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F5F0E1]/60 mb-2">Estado inicial</label>
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
              <button onClick={crearClienteLocal} disabled={creando || !nuevoForm.email || !nuevoForm.nombre || !nuevoForm.password} className="btn-primary flex-1 py-3.5 rounded-xl text-sm font-bold shadow-xl shadow-[#D4A24E]/20 transition-all flex items-center justify-center gap-2 disabled:opacity-50">
                {creando ? <><Loader2 className="w-4 h-4 animate-spin" /> Creando cuenta...</> : 'Crear Cuenta Activa'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL ADD/EDIT VIDEO ──────────────────────────────────────────────── */}
      {showAddVideo && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#1A1410] border border-[rgba(212,162,78,0.2)] rounded-3xl p-8 shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-[#D4A24E]" />
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-xl font-semibold text-[#F5F0E1]">{videoForm.id ? 'Editar Video' : 'Nuevo Video'}</h3>
              <button onClick={() => setShowAddVideo(false)} className="w-8 h-8 rounded-full bg-[#D4A24E]/5 flex items-center justify-center text-[#F5F0E1]/60 hover:text-[#F5F0E1] hover:bg-[#D4A24E]/10 transition-colors">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F5F0E1]/60 mb-2">URL de YouTube *</label>
                <input
                  type="text"
                  value={videoForm.youtubeUrl}
                  onChange={e => setVideoForm({ ...videoForm, youtubeUrl: e.target.value })}
                  placeholder="https://youtu.be/... o https://youtube.com/watch?v=..."
                  className="w-full bg-black/20 border border-[rgba(212,162,78,0.2)] rounded-lg px-4 py-3 text-sm text-[#F5F0E1] focus:outline-none focus:border-[#D4A24E]/50 transition-colors"
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
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F5F0E1]/60 mb-2">Pilar *</label>
                <CustomSelect
                  value={videoForm.pilar_id}
                  onChange={(val) => setVideoForm({ ...videoForm, pilar_id: val as PilarId })}
                  options={PILAR_OPTIONS.map(p => ({ value: p.id, label: p.label }))}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F5F0E1]/60 mb-2">T\u00edtulo *</label>
                <input
                  type="text"
                  value={videoForm.titulo}
                  onChange={e => setVideoForm({ ...videoForm, titulo: e.target.value })}
                  placeholder="Ej: M\u00f3dulo 1 \u2014 Identidad del Fundador"
                  className="w-full bg-black/20 border border-[rgba(212,162,78,0.2)] rounded-lg px-4 py-3 text-sm text-[#F5F0E1] focus:outline-none focus:border-[#D4A24E]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F5F0E1]/60 mb-2">Descripci\u00f3n</label>
                <input
                  type="text"
                  value={videoForm.descripcion}
                  onChange={e => setVideoForm({ ...videoForm, descripcion: e.target.value })}
                  placeholder="Breve descripci\u00f3n del contenido"
                  className="w-full bg-black/20 border border-[rgba(212,162,78,0.2)] rounded-lg px-4 py-3 text-sm text-[#F5F0E1] focus:outline-none focus:border-[#D4A24E]/50 transition-colors"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold uppercase tracking-wider text-[#F5F0E1]/60 mb-2">Duraci\u00f3n (opcional)</label>
                <input
                  type="text"
                  value={videoForm.duracion}
                  onChange={e => setVideoForm({ ...videoForm, duracion: e.target.value })}
                  placeholder="Ej: 15:30"
                  className="w-full bg-black/20 border border-[rgba(212,162,78,0.2)] rounded-lg px-4 py-3 text-sm text-[#F5F0E1] focus:outline-none focus:border-[#D4A24E]/50 transition-colors"
                />
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => setShowAddVideo(false)} className="btn-secondary flex-1 py-3 rounded-xl text-sm font-semibold transition-colors">
                Cancelar
              </button>
              <button
                disabled={!videoForm.youtubeUrl.trim() || !videoForm.titulo.trim()}
                onClick={() => {
                  if (!videoForm.youtubeUrl.trim() || !videoForm.titulo.trim()) return;
                  saveAdminVideo({
                    id: videoForm.id,
                    grupo: videoForm.pilar_id,
                    pilar_id: videoForm.pilar_id,
                    titulo: videoForm.titulo.trim(),
                    descripcion: videoForm.descripcion.trim(),
                    youtubeUrl: videoForm.youtubeUrl.trim(),
                    duracion: videoForm.duracion.trim() || undefined,
                  });
                  setShowAddVideo(false);
                }}
                className="btn-primary flex-1 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {videoForm.id ? 'Guardar Cambios' : <><Plus className="w-4 h-4" /> Agregar Video</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── MODAL DETALLE TAREA ──────────────────────────────────────────────────── */}
      {tareaModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-md p-4"
          onClick={() => setTareaModal(null)}
        >
          <div
            className="w-full max-w-2xl max-h-[90vh] bg-[#1A1410] border border-[rgba(212,162,78,0.2)] rounded-3xl shadow-2xl flex flex-col overflow-hidden"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-start gap-4 p-6 border-b border-[rgba(212,162,78,0.12)]">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap mb-1">
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded bg-[#D4A24E]/15 text-[#D4A24E] border border-[#D4A24E]/20">
                    {tareaModal.meta.codigo}
                  </span>
                  {tareaModal.meta.es_estrella && <span className="text-[#D4A24E] text-sm flex items-center gap-1"><Star className="w-3.5 h-3.5 fill-[#D4A24E]" /> Tarea estrella</span>}
                  {tareaModal.tareaData?.fecha_completada && (
                    <span className="text-[11px] text-[#F5F0E1]/40">
                      Completada el {new Date(tareaModal.tareaData.fecha_completada).toLocaleDateString('es-AR', { day: 'numeric', month: 'long', year: 'numeric' })}
                    </span>
                  )}
                </div>
                <h2 className="text-lg font-semibold text-[#F5F0E1]">{tareaModal.meta.titulo}</h2>
                <p className="text-xs text-[#F5F0E1]/40 mt-1 leading-relaxed">{tareaModal.meta.descripcion}</p>
              </div>
              <button
                onClick={() => setTareaModal(null)}
                className="p-2 rounded-xl hover:bg-[#D4A24E]/10 text-[#F5F0E1]/40 hover:text-[#F5F0E1] transition-colors shrink-0"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto scrollbar-hide p-6 space-y-4">
              <div className="bg-[#D4A24E]/5 border border-[#D4A24E]/20 rounded-2xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <Bot className="w-4 h-4 text-[#D4A24E]" />
                  <span className="text-[11px] font-bold uppercase tracking-wider text-[#D4A24E]">Resumen para Paolis</span>
                </div>
                {tareaResumenLoading ? (
                  <div className="flex items-center gap-2 py-2">
                    <Loader2 className="w-4 h-4 text-[#D4A24E] animate-spin" />
                    <span className="text-sm text-[#F5F0E1]/60">Analizando el output de {tareaModal.clienteNombre}...</span>
                  </div>
                ) : tareaResumen ? (
                  <p className="text-sm text-[#F5F0E1]/90 leading-relaxed">{tareaResumen}</p>
                ) : (
                  <p className="text-sm text-[#F5F0E1]/40 italic">
                    {tareaModal.output ? 'No se pudo generar el resumen autom\u00e1tico.' : 'Esta tarea no tiene output guardado \u2014 fue marcada como completada manualmente.'}
                  </p>
                )}
              </div>

              {tareaModal.output ? (
                <div>
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="w-3.5 h-3.5 text-[#F5F0E1]/40" />
                    <span className="text-[11px] font-bold uppercase tracking-wider text-[#F5F0E1]/40">Output generado por el cliente</span>
                  </div>
                  <div className="bg-black/30 border border-[rgba(212,162,78,0.12)] rounded-2xl p-5">
                    <div className="prose prose-invert prose-sm max-w-none prose-p:my-2 prose-headings:text-[#F5F0E1] prose-headings:font-semibold prose-strong:text-[#D4A24E] prose-li:text-[#F5F0E1]/80">
                      <Markdown>{tareaModal.output}</Markdown>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-8 text-center">
                  <Circle className="w-8 h-8 text-gray-700 mb-3" />
                  <p className="text-sm text-[#F5F0E1]/40">Sin output guardado</p>
                  <p className="text-xs text-gray-700 mt-1">El cliente complet\u00f3 esta tarea pero no hay contenido generado por IA asociado.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── MANAGER CHECKLIST COMPONENT ────────────────────────────────────────────────

function ManagerChecklist({
  items,
  onToggle,
  loading,
}: {
  items: AdminChecklistItem[];
  onToggle: (id: string, completada: boolean) => void;
  loading: boolean;
}) {
  const categorias: { key: AdminChecklistItem['categoria']; label: string }[] = [
    { key: 'diaria', label: 'Tareas del d\u00eda' },
    { key: 'semanal', label: 'Semanales' },
    { key: 'mensual', label: 'Mensuales' },
  ];

  const diarias = items.filter(i => i.categoria === 'diaria');
  const completadasDiarias = diarias.filter(i => i.completada).length;

  return (
    <div className="card-panel border border-[rgba(212,162,78,0.2)] rounded-2xl p-5 space-y-4">
      <div className="flex items-center gap-2">
        <ClipboardList className="w-4 h-4 text-[#D4A24E]" />
        <h3 className="text-xs font-bold uppercase tracking-widest text-[#D4A24E]">Checklist</h3>
      </div>
      {diarias.length > 0 && (
        <p className="text-[10px] text-[#F5F0E1]/40 font-medium">
          {completadasDiarias}/{diarias.length} tareas del d\u00eda
        </p>
      )}

      {loading ? (
        <div className="flex justify-center py-4"><Loader2 className="w-4 h-4 text-[#D4A24E] animate-spin" /></div>
      ) : items.length === 0 ? (
        <p className="text-xs text-[#F5F0E1]/30">Sin tareas asignadas</p>
      ) : (
        categorias.map(cat => {
          const catItems = items.filter(i => i.categoria === cat.key);
          if (catItems.length === 0) return null;
          return (
            <div key={cat.key}>
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#F5F0E1]/40 mb-2">{cat.label}</p>
              <div className="space-y-1.5">
                {catItems.map(item => (
                  <label
                    key={item.id}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg hover:bg-[#D4A24E]/5 cursor-pointer transition-colors"
                  >
                    <button
                      type="button"
                      onClick={() => onToggle(item.id, !item.completada)}
                      className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 transition-colors ${
                        item.completada
                          ? 'bg-[#2DD4A0] border-[#2DD4A0] text-[#F5F0E1]'
                          : 'border-[rgba(212,162,78,0.3)] text-transparent hover:border-[#D4A24E]/50'
                      }`}
                    >
                      <Check className="w-3 h-3" />
                    </button>
                    <span className={`text-xs ${item.completada ? 'text-[#F5F0E1]/30 line-through' : 'text-[#F5F0E1]/80'}`}>
                      {item.titulo}
                    </span>
                  </label>
                ))}
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
