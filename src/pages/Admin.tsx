import React, { useState, useEffect, useRef } from 'react';
import {
  Users, Send, ChevronRight, X, Plus, Loader2,
  Stethoscope, CheckCircle2, Circle, LogOut,
  MessageSquare, BookOpen, BarChart2, Calendar,
  TrendingUp, TrendingDown, Sparkles, Bot,
  Hash, Trophy, Lock, Shield,
  CheckCheck, AlertTriangle, Image, Mic
} from 'lucide-react';
import { supabase, type Profile, type Mensaje, isSupabaseReady } from '../lib/supabase';
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
  ultima_entrada_diario?: string;
}

type MainTab = 'dashboard' | 'comunidad' | 'victorias' | 'consultas';
type DetalleTab = 'resumen' | 'diario' | 'metricas' | 'mensajes';

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
    <div className="flex flex-col h-full bg-white/[0.02] border border-white/[0.06] rounded-2xl overflow-hidden">
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
            const isBot = m.emisor?.rol === 'admin';
            return (
              <div key={m.id} className={`flex gap-3 max-w-[85%] ${isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                  isBot ? 'bg-indigo-500/20 text-indigo-400' : 'bg-white/10 text-white'
                }`}>
                  {isBot ? <Shield className="w-4 h-4" /> : (m.emisor?.nombre ?? '?').charAt(0).toUpperCase()}
                </div>
                <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                  isMe ? 'bg-purple-600/30 text-purple-100 border border-purple-500/20 rounded-tr-sm'
                       : isBot ? 'bg-indigo-600/20 text-indigo-100 border border-indigo-500/20 rounded-tl-sm'
                       : 'bg-white/[0.04] text-gray-200 border border-white/[0.05] rounded-tl-sm'
                }`}>
                  {!isMe && <p className="text-[10px] font-bold uppercase tracking-wider mb-1 opacity-60 text-indigo-300">{m.emisor?.nombre}</p>}
                  {m.tipo_archivo === 'imagen' && m.archivo_url && (
                    <img src={m.archivo_url} alt="imagen" className="max-w-xs rounded-xl mb-2 cursor-pointer hover:opacity-90"
                         onClick={() => window.open(m.archivo_url)} />
                  )}
                  {m.tipo_archivo === 'audio' && m.archivo_url && (
                    <audio controls src={m.archivo_url} className="w-full mb-2 rounded-lg" />
                  )}
                  {m.contenido && <p>{m.contenido}</p>}
                  <p className="text-[10px] mt-2 opacity-40 text-right">
                    {new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                  </p>
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

  // Formulario nuevo cliente con contraseña local
  const [nuevoForm, setNuevoForm] = useState({
    nombre: '', email: '', password: '', especialidad: '', plan: 'DWY' as 'DWY' | 'DFY',
    fecha_inicio: new Date().toISOString().split('T')[0]
  });
  const [creando, setCreando] = useState(false);

  useEffect(() => { cargarClientes(); }, []);

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

        const tareas = tareasRes.data ?? [];
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

      const prompt = `Sos un coach de alto rendimiento para profesionales de la salud del programa "Los Sanadores Libres". Analizá brevemente la situación de ${selectedCliente.nombre} y dá 3 recomendaciones de próximos pasos concretas. Sé directo y ultra específico.
CONTEXTO:
- Semana ${selectedCliente.semana_programa} de 12 del programa
- Tareas completadas: ${selectedCliente.tareas_completadas} de ${selectedCliente.tareas_total}
- Último check-in: estado="${lastDiary?.estado || 'sin datos'}", foco="${lastDiary?.foco || 'sin datos'}", cuello de botella="${lastDiary?.cuello || 'sin datos'}"
- Tareas pendientes: ${pendingTasks.map((t: any) => t.tarea_id).join(', ') || 'ninguna'}
- Última métrica: ${lastMetric ? `${lastMetric.leads} leads, ${lastMetric.ventas} ventas` : 'sin métricas aún'}

Respondé solo con las 3 recomendaciones en formato lista, sin introducción. Máximo 5 líneas total. En español.`;

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
    try {
      // Add optimistic insert
      const newMsg = {
        id: crypto.randomUUID(),
        canal: 'privado',
        emisor_id: adminProfile.id,
        receptor_id: selectedCliente.id,
        contenido: mensajeInput.trim(),
        created_at: new Date().toISOString(),
      };
      // No we rely on realtime, just send to DB
      const { error } = await supabase.from('mensajes').insert({
        canal: 'privado', emisor_id: adminProfile.id, receptor_id: selectedCliente.id, contenido: mensajeInput.trim()
      });
      if (error) throw error;
      setMensajeInput('');
      toast.success('Mensaje enviado ✓');
      // Realtime takes care of updating UI
    } catch {
      toast.error('Error enviando mensaje');
    } finally {
      setEnviando(false);
    }
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

      const { data, error } = await tempClient.auth.signUp({
        email: nuevoForm.email.trim(),
        password: nuevoForm.password.trim(),
        options: {
          data: { nombre: nuevoForm.nombre.trim() } // Esto dispara el trigger para crear en profiles!
        }
      });
      if (error) throw error;
      
      toast.success(`Cuenta creada para ${nuevoForm.nombre}. Ya puede iniciar sesión.`);
      setShowNuevoCliente(false);
      setNuevoForm({ nombre: '', email: '', password: '', especialidad: '', plan: 'DWY', fecha_inicio: new Date().toISOString().split('T')[0] });
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
              { id: 'comunidad', label: 'Comunidad', icon: Users },
              { id: 'victorias', label: 'Victorias', icon: Trophy },
              { id: 'consultas', label: 'Consultas', icon: Hash },
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
            <div className="w-9 h-9 rounded-full bg-white/10 flex items-center justify-center text-sm font-bold border border-white/20">
              {adminProfile.nombre.charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">{adminProfile.nombre}</p>
              <p className="text-[10px] text-gray-500 truncate">Soporte Técnico</p>
            </div>
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
            {mainTab === 'dashboard' ? 'Panel de Control - Clientes' : `Canal: ${mainTab}`}
          </h2>
        </header>

        <div className="flex-1 overflow-auto p-6 scrollbar-hide">
          {mainTab !== 'dashboard' ? (
            <div className="max-w-4xl mx-auto h-full">
              <GlobalChat canal={mainTab} adminProfile={adminProfile} />
            </div>
          ) : (
            <>
              {/* Stats row */}
              <div className="grid grid-cols-4 gap-4 mb-8">
                {[
                  { label: 'Clientes activos', value: clientes.length, icon: Users, color: 'text-indigo-400', bg: 'from-indigo-500/10 to-transparent' },
                  { label: 'En ritmo', value: clientes.filter(c => c.semaforo === 'verde').length, icon: CheckCheck, color: 'text-emerald-400', bg: 'from-emerald-500/10 to-transparent' },
                  { label: 'Necesitan atención', value: clientes.filter(c => c.semaforo === 'rojo').length, icon: AlertTriangle, color: 'text-red-400', bg: 'from-red-500/10 to-transparent' },
                  { label: 'Progreso', value: clientes.length ? `${Math.round(clientes.reduce((acc, c) => acc + (c.tareas_total > 0 ? (c.tareas_completadas / c.tareas_total) * 100 : 0), 0) / clientes.length)}%` : '—', icon: TrendingUp, color: 'text-amber-400', bg: 'from-amber-500/10 to-transparent' },
                ].map((stat, i) => (
                  <div key={i} className={`bg-gradient-to-b ${stat.bg} bg-white/[0.02] border border-white/[0.05] rounded-3xl p-6 relative overflow-hidden group hover:border-white/10 transition-colors`}>
                    <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:opacity-40 transition-opacity">
                      <stat.icon className={`w-16 h-16 ${stat.color} -rotate-12 transform scale-125`} />
                    </div>
                    <stat.icon className={`w-5 h-5 ${stat.color} mb-4`} />
                    <p className="text-3xl font-light text-white mb-1 tracking-tight">{stat.value}</p>
                    <p className="text-xs text-gray-500 uppercase tracking-wider font-semibold">{stat.label}</p>
                  </div>
                ))}
              </div>

              {/* Main layout Dashboard */}
              <div className="flex gap-6 h-[calc(100vh-280px)] min-h-[500px]">
                {/* Lista de clientes */}
                <div className="w-[320px] shrink-0 flex flex-col">
                  <div className="flex items-center justify-between mb-4">
                    <h2 className="text-[11px] font-bold uppercase tracking-widest text-gray-500">Directorio ({clientes.length})</h2>
                    <button
                      onClick={() => setShowNuevoCliente(true)}
                      className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-indigo-500 hover:bg-indigo-400 text-white text-xs font-semibold shadow-lg shadow-indigo-500/20 transition-all"
                    >
                      <Plus className="w-3.5 h-3.5" /> Nuevo
                    </button>
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
                      {clientes.map(cliente => (
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
                              <h3 className="text-sm font-semibold text-white truncate mb-0.5">{cliente.nombre}</h3>
                              <p className="text-[10px] text-gray-400">
                                Sem {cliente.semana_programa}/12 · <span className={SEMAFORO_CONFIG[cliente.semaforo].text}>{SEMAFORO_CONFIG[cliente.semaforo].label}</span>
                              </p>
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
                  <div className="flex-1 bg-white/[0.02] border border-white/[0.05] rounded-3xl overflow-hidden flex flex-col shadow-2xl relative">
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
                        <div className="flex items-center gap-3 mb-1.5">
                          <h3 className="text-2xl font-light text-white tracking-tight">{selectedCliente.nombre}</h3>
                          <span className={`px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${selectedCliente.plan === 'DFY' ? 'bg-purple-500/20 text-purple-400 border border-purple-500/30' : 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30'}`}>
                            {selectedCliente.plan}
                          </span>
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
                                  <p className="text-[10px] text-gray-500 uppercase tracking-widest mb-2 font-bold">Último Check-in</p>
                                  {detalleDiario[0] ? (
                                    <>
                                      <p className="text-sm text-white font-medium mb-1">{detalleDiario[0].fecha}</p>
                                      <p className="text-xs text-gray-400 mb-1">Estado: <span className="text-indigo-300 font-medium">{detalleDiario[0].respuestas?.estado || '—'}</span></p>
                                      <p className="text-xs text-gray-400 truncate">Foco: <span className="text-white">{detalleDiario[0].respuestas?.foco || '—'}</span></p>
                                    </>
                                  ) : <p className="text-xs text-gray-600">Sin entradas</p>}
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
                              ) : detalleDiario.map((entrada: any, i: number) => (
                                <div key={i} className="p-6 rounded-2xl bg-white/[0.02] border border-white/[0.05]">
                                  <div className="flex items-center justify-between mb-4">
                                    <p className="text-sm font-semibold text-white tracking-wide">{entrada.fecha}</p>
                                    {entrada.respuestas?.estado && (
                                      <span className="text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-white/5 text-gray-300 border border-white/10">{entrada.respuestas.estado}</span>
                                    )}
                                  </div>
                                  <div className="grid grid-cols-2 gap-4">
                                    {entrada.respuestas?.victoria && <div><p className="text-[10px] uppercase font-bold text-emerald-500/70 mb-1">Victoria</p><p className="text-xs text-gray-300">{entrada.respuestas.victoria}</p></div>}
                                    {entrada.respuestas?.foco && <div><p className="text-[10px] uppercase font-bold text-blue-500/70 mb-1">Foco</p><p className="text-xs text-gray-300">{entrada.respuestas.foco}</p></div>}
                                    {entrada.respuestas?.cuello && <div className="col-span-2"><p className="text-[10px] uppercase font-bold text-amber-500/70 mb-1">Cuello de Botella</p><p className="text-xs text-gray-300">{entrada.respuestas.cuello}</p></div>}
                                    {entrada.respuestas?.aprendizaje && <div className="col-span-2"><p className="text-[10px] uppercase font-bold text-purple-500/70 mb-1">Aprendizaje</p><p className="text-xs text-gray-300">{entrada.respuestas.aprendizaje}</p></div>}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* ── MÉTRICAS ── */}
                          {detalleTab === 'metricas' && (
                            <div className="space-y-3">
                              {detalleMetricas.length === 0 ? (
                                <p className="text-gray-500 text-sm text-center py-12">Sin métricas aún</p>
                              ) : detalleMetricas.slice().reverse().map((m: any, i: number) => (
                                <div key={i} className="p-5 rounded-2xl bg-white/[0.02] border border-white/[0.05] flex items-center justify-between">
                                  <span className="text-xs font-semibold text-gray-400 bg-white/5 px-2.5 py-1 rounded-lg">{m.semana}</span>
                                  <div className="flex gap-8">
                                    <div className="text-center"><p className="text-white text-lg font-light">{m.leads}</p><p className="text-[10px] text-gray-500 font-bold uppercase">leads</p></div>
                                    <div className="text-center"><p className="text-white text-lg font-light">{m.conversaciones ?? 0}</p><p className="text-[10px] text-gray-500 font-bold uppercase">llamadas</p></div>
                                    <div className="text-center"><p className="text-emerald-400 text-lg font-bold">{m.ventas}</p><p className="text-[10px] text-emerald-500/50 font-bold uppercase">ventas</p></div>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* ── MENSAJES ── */}
                          {detalleTab === 'mensajes' && (
                            <div className="space-y-4">
                              {detalleMensajes.length === 0 ? (
                                <div className="flex flex-col items-center justify-center py-16 text-center">
                                  <MessageSquare className="w-10 h-10 text-gray-800 mb-4" />
                                  <p className="text-gray-500 text-sm">Comienza la conversación con {selectedCliente.nombre}</p>
                                </div>
                              ) : detalleMensajes.map(m => {
                                const isMe = m.emisor_id === adminProfile.id;
                                return (
                                  <div key={m.id} className={`flex max-w-[85%] ${isMe ? 'ml-auto' : ''}`}>
                                    <div className={`p-4 rounded-2xl text-sm leading-relaxed ${
                                      isMe ? 'bg-indigo-600/30 text-indigo-50 border border-indigo-500/20 rounded-tr-sm' 
                                           : 'bg-white/[0.03] text-gray-300 border border-white/[0.05] rounded-tl-sm'
                                    }`}>
                                      <p>{m.contenido}</p>
                                      <p className={`text-[10px] mt-2 font-medium ${isMe ? 'text-indigo-400/50 text-right' : 'text-gray-500'}`}>
                                        {new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' })}
                                      </p>
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
                  <select value={nuevoForm.plan} onChange={e => setNuevoForm({ ...nuevoForm, plan: e.target.value as 'DWY' | 'DFY' })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors appearance-none">
                    <option value="DWY">DWY</option>
                    <option value="DFY">DFY</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[11px] font-bold uppercase tracking-wider text-gray-400 mb-2">Inicio</label>
                  <input type="date" value={nuevoForm.fecha_inicio} onChange={e => setNuevoForm({ ...nuevoForm, fecha_inicio: e.target.value })} className="w-full bg-black/50 border border-white/10 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-indigo-500/50 transition-colors" />
                </div>
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
