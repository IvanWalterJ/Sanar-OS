import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Hash, Lock, Send, Trophy, Users, Search, MoreVertical, Image, Mic, Shield } from 'lucide-react';
import { supabase, isSupabaseReady, type Mensaje } from '../lib/supabase';
import { toast } from 'sonner';

interface MensajesProps {
  userId?: string;
  onUnreadChange?: (n: number) => void;
}

interface MsgLocal {
  id: string | number;
  author: string;
  authorId?: string;
  rol: 'bot' | 'admin' | 'user';
  content: string;
  time: string;
  isMe: boolean;
  channelId: string;
  archivoUrl?: string;
  tipoArchivo?: 'imagen' | 'audio';
}

const MOCK_MESSAGES: MsgLocal[] = [
  { id: 1, author: 'Tu Clínica Digital', rol: 'bot', content: '¡Bienvenida a tu programa de 90 días! Tu canal privado está listo. Podés escribirle al equipo aquí.', time: 'Lun 09:00', isMe: false, channelId: 'privado' },
];

function supabaseMsgToLocal(m: Mensaje, myUserId: string, myName?: string): MsgLocal {
  const isMe = m.emisor_id === myUserId;
  const profile = m.emisor as { nombre?: string; rol?: string } | undefined;
  const rol: MsgLocal['rol'] = profile?.rol === 'admin' ? 'admin' : isMe ? 'user' : 'bot';
  const fallbackMyName = myName ?? (() => { try { return JSON.parse(localStorage.getItem('tcd_profile') || '{}').nombre || 'Yo'; } catch { return 'Yo'; } })();
  return {
    id: m.id,
    authorId: m.emisor_id,
    author: isMe ? fallbackMyName : (profile?.nombre ?? 'Equipo'),
    rol,
    content: m.contenido,
    time: new Date(m.created_at).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
    isMe,
    channelId: m.canal,
    archivoUrl: m.archivo_url,
    tipoArchivo: m.tipo_archivo,
  };
}

const CHANNELS = [
  { id: 'privado',   name: 'Mi Canal Privado',      icon: Lock,   type: 'private' },
  { id: 'victorias', name: 'Victorias de la Semana', icon: Trophy, type: 'public'  },
  { id: 'comunidad', name: 'Comunidad TCD',           icon: Users,  type: 'public'  },
  { id: 'consultas', name: 'Consultas Generales',     icon: Hash,   type: 'public'  },
] as const;

// Colores de avatar deterministas por nombre
function avatarColor(name: string): string {
  const colors = [
    'bg-[#C8893A]/30 text-[#C8893A]',
    'bg-violet-500/30 text-violet-200',
    'bg-[#2DD4A0]/30 text-emerald-200',
    'bg-amber-500/30 text-amber-200',
    'bg-pink-500/30 text-pink-200',
    'bg-cyan-500/30 text-cyan-200',
    'bg-orange-500/30 text-orange-200',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash += name.charCodeAt(i);
  return colors[hash % colors.length];
}

export default function Mensajes({ userId, onUnreadChange }: MensajesProps) {
  const myName = (() => { try { return JSON.parse(localStorage.getItem('tcd_profile') || '{}').nombre || 'Yo'; } catch { return 'Yo'; } })();
  const myAvatarUrl = localStorage.getItem('tcd_avatar') || '';

  const [activeChannel, setActiveChannel] = useState('privado');
  const [input, setInput] = useState('');
  const [channelSearch, setChannelSearch] = useState('');
  const [messages, setMessages] = useState<MsgLocal[]>(MOCK_MESSAGES);
  const [loadingMsgs, setLoadingMsgs] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [unreadMap, setUnreadMap] = useState<Record<string, number>>({});
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const total = Object.values(unreadMap).reduce((a, b) => a + b, 0);
    onUnreadChange?.(total);
  }, [unreadMap, onUnreadChange]);

  const handleChannelSwitch = useCallback((ch: string) => {
    setActiveChannel(ch);
    setUnreadMap(prev => ({ ...prev, [ch]: 0 }));
  }, []);

  // ─── Cargar mensajes desde Supabase ─────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseReady() || !supabase || !userId) return;

    setLoadingMsgs(true);
    supabase
      .from('mensajes')
      .select('*, emisor:profiles!emisor_id(nombre, rol)')
      .or(
        activeChannel === 'privado'
          ? `emisor_id.eq.${userId},receptor_id.eq.${userId}`
          : `canal.eq.${activeChannel}`
      )
      .eq('canal', activeChannel)
      .order('created_at')
      .then(({ data }) => {
        if (data) {
          setMessages((data as Mensaje[]).map(m => supabaseMsgToLocal(m, userId, myName)));
        }
        setLoadingMsgs(false);
      });
  }, [userId, activeChannel]);

  // ─── Supabase Realtime — canal activo ────────────────────────────────────────
  // Para canales públicos: el insert propio lo manejamos con optimistic, NO escuchar propio
  // Para canal privado: escuchar solo mensajes RECIBIDOS (del admin), el propio es optimistic
  useEffect(() => {
    if (!isSupabaseReady() || !supabase || !userId) return;

    const channel = supabase
      .channel(`mensajes-${activeChannel}-${userId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'mensajes',
          filter: activeChannel === 'privado'
            ? `receptor_id=eq.${userId}`
            : `canal=eq.${activeChannel}`,
        },
        async (payload) => {
          // Para canales públicos: ignorar propios mensajes (ya están por optimistic)
          if (activeChannel !== 'privado' && payload.new.emisor_id === userId) return;

          if (!supabase) return;
          const { data } = await supabase
            .from('mensajes')
            .select('*, emisor:profiles!emisor_id(nombre, rol)')
            .eq('id', payload.new.id)
            .single();

          if (data) {
            setMessages(prev => [...prev, supabaseMsgToLocal(data as Mensaje, userId, myName)]);
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [userId, activeChannel]);

  // ─── Notificaciones de otros canales ─────────────────────────────────────────
  useEffect(() => {
    if (!isSupabaseReady() || !supabase || !userId) return;

    const subs = CHANNELS.map(ch =>
      supabase!
        .channel(`notif-${ch.id}-${userId}`)
        .on(
          'postgres_changes',
          {
            event: 'INSERT',
            schema: 'public',
            table: 'mensajes',
            filter: ch.id === 'privado'
              ? `receptor_id=eq.${userId}`
              : `canal=eq.${ch.id}`,
          },
          async (payload) => {
            if (ch.id === activeChannel) return;
            if (payload.new.emisor_id === userId) return;

            const { data: m } = await supabase!
              .from('mensajes')
              .select('*, emisor:profiles!emisor_id(nombre, rol)')
              .eq('id', payload.new.id)
              .single();

            const nombre = (m?.emisor as { nombre?: string } | undefined)?.nombre ?? 'Alguien';
            const preview = (payload.new.contenido ?? '').slice(0, 60);
            const ChIcon = ch.icon;

            toast(nombre, {
              description: preview || '📎 Archivo adjunto',
              action: { label: 'Ver →', onClick: () => handleChannelSwitch(ch.id) },
              icon: React.createElement(ChIcon, { className: 'w-4 h-4 text-[#C8893A]' }),
              duration: 6000,
            });

            setUnreadMap(prev => ({ ...prev, [ch.id]: (prev[ch.id] ?? 0) + 1 }));
          }
        )
        .subscribe()
    );

    return () => { subs.forEach(s => supabase!.removeChannel(s)); };
  }, [userId, activeChannel, handleChannelSwitch]);

  // ─── Auto-scroll ─────────────────────────────────────────────────────────────
  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [messages]);

  const activeMessages = messages.filter(m => m.channelId === activeChannel);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;
    const text = input.trim();
    setInput('');

    if (isSupabaseReady() && supabase && userId) {
      // Optimistic insert inmediato
      const optimistic: MsgLocal = {
        id: `opt-${Date.now()}`,
        authorId: userId,
        author: myName,
        rol: 'user',
        content: text,
        time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        isMe: true,
        channelId: activeChannel,
      };
      setMessages(prev => [...prev, optimistic]);

      await supabase.from('mensajes').insert({
        canal: activeChannel,
        emisor_id: userId,
        receptor_id: null,
        contenido: text,
      });
    } else {
      const newMessage: MsgLocal = {
        id: Date.now(),
        author: myName,
        rol: 'user',
        content: text,
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        isMe: true,
        channelId: activeChannel,
      };
      setMessages(prev => [...prev, newMessage]);

      if (activeChannel === 'privado') {
        setTimeout(() => {
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            author: 'Equipo',
            rol: 'admin',
            content: '¡Recibido! Lo reviso y te comento en breve.',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            isMe: false,
            channelId: 'privado',
          }]);
        }, 1500);
      }
    }
  };

  const handleUploadFile = async (file: File, tipo: 'imagen' | 'audio') => {
    if (!isSupabaseReady() || !supabase || !userId) {
      toast.error('Conectá Supabase para subir archivos');
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split('.').pop() ?? (tipo === 'imagen' ? 'jpg' : 'mp3');
      const path = `${userId}/${Date.now()}.${ext}`;
      const { data, error } = await supabase.storage
        .from('mensajes-archivos')
        .upload(path, file);
      if (error) throw error;

      const { data: { publicUrl } } = supabase.storage
        .from('mensajes-archivos')
        .getPublicUrl(data.path);

      // Optimistic insert para archivos también
      const optimistic: MsgLocal = {
        id: `opt-${Date.now()}`,
        authorId: userId,
        author: myName,
        rol: 'user',
        content: '',
        time: new Date().toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit' }),
        isMe: true,
        channelId: activeChannel,
        archivoUrl: publicUrl,
        tipoArchivo: tipo,
      };
      setMessages(prev => [...prev, optimistic]);

      await supabase.from('mensajes').insert({
        canal: activeChannel,
        emisor_id: userId,
        receptor_id: null,
        contenido: '',
        tipo_archivo: tipo,
        archivo_url: publicUrl,
      });
    } catch {
      toast.error('Error subiendo archivo. Verificá que el bucket exista en Supabase.');
    } finally {
      setUploading(false);
    }
  };

  const userNombre = myName;

  return (
    <div className="h-[calc(100vh-5rem)] flex card-panel overflow-hidden animate-in fade-in duration-500">
      {/* Sidebar Channels */}
      <div className="w-72 border-r border-[rgba(200,137,58,0.2)] bg-black/20 flex flex-col shrink-0">
        <div className="p-4 border-b border-[rgba(200,137,58,0.2)]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#F0EAD8]/40" />
            <input
              type="text"
              value={channelSearch}
              onChange={e => setChannelSearch(e.target.value)}
              placeholder="Buscar canales..."
              className="w-full bg-[#C8893A]/5 border border-[rgba(200,137,58,0.2)] rounded-lg py-2 pl-9 pr-4 text-sm text-[#F0EAD8] placeholder-[#F0EAD8]/30 focus:outline-none focus:border-[#C8893A]/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-2">
            <p className="text-xs font-medium text-[#F0EAD8]/40 uppercase tracking-wider">Canales</p>
          </div>
          <div className="space-y-1 px-2">
            {CHANNELS.filter(c => c.name.toLowerCase().includes(channelSearch.toLowerCase())).map(channel => (
              <button
                key={channel.id}
                onClick={() => handleChannelSwitch(channel.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${
                  activeChannel === channel.id ? 'bg-[#C8893A]/20 text-[#C8893A]' : 'text-[#F0EAD8]/80 hover:bg-[#C8893A]/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <channel.icon className={`w-4 h-4 ${activeChannel === channel.id ? 'text-[#C8893A]' : 'text-[#F0EAD8]/40'}`} />
                  <span className="text-sm font-medium truncate">{channel.name}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  {(unreadMap[channel.id] ?? 0) > 0 && (
                    <span className="min-w-[18px] h-[18px] px-1 rounded-full bg-[#C8893A] text-[#F0EAD8] text-[10px] font-bold flex items-center justify-center">
                      {unreadMap[channel.id]}
                    </span>
                  )}
                  {isSupabaseReady() && (unreadMap[channel.id] ?? 0) === 0 && (
                    <span className="w-2 h-2 rounded-full bg-[#2DD4A0]" title="Realtime activo" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Current user info */}
        <div className="p-4 border-t border-[rgba(200,137,58,0.2)]">
          <div className="flex items-center gap-3">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold shrink-0 overflow-hidden ${myAvatarUrl ? '' : avatarColor(userNombre)}`}>
              {myAvatarUrl
                ? <img src={myAvatarUrl} alt="" className="w-full h-full object-cover" />
                : userNombre.charAt(0).toUpperCase()
              }
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-[#F0EAD8] truncate">{userNombre}</p>
              <p className="text-xs text-[#2DD4A0]">En línea</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-black/10 min-w-0">
        {/* Header */}
        <div className="h-16 border-b border-[rgba(200,137,58,0.2)] flex items-center justify-between px-6 bg-[#C8893A]/5 shrink-0">
          <div className="flex items-center gap-3">
            {CHANNELS.find(c => c.id === activeChannel) && React.createElement(CHANNELS.find(c => c.id === activeChannel)!.icon, { className: "w-5 h-5 text-[#F0EAD8]/60" })}
            <div>
              <h2 className="text-[#F0EAD8] font-medium">{CHANNELS.find(c => c.id === activeChannel)?.name}</h2>
              <p className="text-xs text-[#F0EAD8]/40">
                {activeChannel === 'privado' ? 'Solo visible para vos y el equipo' : 'Canal público de la comunidad'}
              </p>
            </div>
          </div>
          <button className="w-8 h-8 rounded-lg hover:bg-[#C8893A]/10 flex items-center justify-center text-[#F0EAD8]/60 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        {/* Messages */}
        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-4">
          {loadingMsgs ? (
            <div className="flex items-center justify-center py-10">
              <div className="w-5 h-5 border-2 border-[#C8893A]/30 border-t-[#C8893A] rounded-full animate-spin" />
            </div>
          ) : activeMessages.length === 0 ? (
            <div className="text-center py-10">
              <p className="text-[#F0EAD8]/40 text-sm">Sin mensajes en este canal todavía</p>
              <p className="text-[#F0EAD8]/30 text-xs mt-1">Sé el primero en escribir</p>
            </div>
          ) : (
            activeMessages.map((msg) => (
              <div key={msg.id} className={`flex gap-3 items-end max-w-[80%] ${msg.isMe ? 'ml-auto flex-row-reverse' : ''}`}>
                {/* Avatar */}
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold border overflow-hidden ${
                  msg.isMe
                    ? (myAvatarUrl ? 'border-transparent' : `${avatarColor(msg.author)} border-transparent`)
                    : msg.rol === 'admin'
                    ? 'bg-[#C8893A]/20 border-[#C8893A]/30 text-[#C8893A]'
                    : msg.rol === 'bot'
                    ? 'bg-[#C8893A]/30 border-[#C8893A]/30 text-[#F0EAD8]'
                    : `${avatarColor(msg.author)} border-transparent`
                }`}>
                  {msg.isMe && myAvatarUrl
                    ? <img src={myAvatarUrl} alt="" className="w-full h-full object-cover" />
                    : msg.rol === 'admin'
                    ? <Shield className="w-3.5 h-3.5" />
                    : msg.author.charAt(0).toUpperCase()
                  }
                </div>

                <div className={`flex flex-col gap-1 ${msg.isMe ? 'items-end' : 'items-start'}`}>
                  {/* Name + badge + time */}
                  <div className={`flex items-baseline gap-2 px-1 ${msg.isMe ? 'flex-row-reverse' : ''}`}>
                    <span className="text-xs font-medium text-[#F0EAD8]/80">{msg.author}</span>
                    {msg.rol === 'admin' && <span className="text-[9px] uppercase tracking-wider text-[#C8893A] bg-[#C8893A]/10 px-1.5 py-0.5 rounded">Coach</span>}
                    {msg.rol === 'bot' && <span className="text-[9px] uppercase tracking-wider text-[#C8893A] bg-[#C8893A]/10 px-1.5 py-0.5 rounded">Sistema</span>}
                    <span className="text-[10px] text-[#F0EAD8]/30">{msg.time}</span>
                  </div>

                  {/* Bubble */}
                  <div className={`rounded-2xl px-4 py-3 ${
                    msg.isMe
                      ? 'bg-[#C8893A] text-[#F0EAD8] rounded-tr-sm'
                      : msg.rol === 'bot'
                      ? 'bg-[#C8893A]/5 border border-[rgba(200,137,58,0.2)] text-[#F0EAD8]/80 rounded-tl-sm'
                      : msg.rol === 'admin'
                      ? 'bg-[#C8893A]/20 border border-[#C8893A]/20 text-[#C8893A] rounded-tl-sm'
                      : 'bg-[#C8893A]/10 text-[#F0EAD8] rounded-tl-sm'
                  }`}>
                    {msg.tipoArchivo === 'imagen' && msg.archivoUrl && (
                      <img
                        src={msg.archivoUrl}
                        alt="imagen"
                        className="max-w-xs rounded-xl mb-2 cursor-pointer hover:opacity-90 transition-opacity"
                        onClick={() => window.open(msg.archivoUrl)}
                      />
                    )}
                    {msg.tipoArchivo === 'audio' && msg.archivoUrl && (
                      <audio controls src={msg.archivoUrl} className="w-full mb-2 rounded-lg" />
                    )}
                    {msg.content && (
                      <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Input area */}
        <div className="p-4 bg-[#C8893A]/5 border-t border-[rgba(200,137,58,0.2)] shrink-0">
          <input ref={imageInputRef} type="file" accept="image/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadFile(f, 'imagen'); e.target.value = ''; }} />
          <input ref={audioInputRef} type="file" accept="audio/*" className="hidden"
            onChange={e => { const f = e.target.files?.[0]; if (f) handleUploadFile(f, 'audio'); e.target.value = ''; }} />

          <form className="flex items-end gap-2" onSubmit={handleSend}>
            <div className="flex flex-col gap-1 shrink-0">
              <button type="button" onClick={() => imageInputRef.current?.click()} disabled={uploading} title="Subir imagen"
                className="w-10 h-10 rounded-xl bg-[#C8893A]/5 border border-[rgba(200,137,58,0.2)] hover:bg-[#C8893A]/10 flex items-center justify-center text-[#F0EAD8]/60 hover:text-[#F0EAD8] transition-colors disabled:opacity-50">
                <Image className="w-4 h-4" />
              </button>
              <button type="button" onClick={() => audioInputRef.current?.click()} disabled={uploading} title="Subir audio"
                className="w-10 h-10 rounded-xl bg-[#C8893A]/5 border border-[rgba(200,137,58,0.2)] hover:bg-[#C8893A]/10 flex items-center justify-center text-[#F0EAD8]/60 hover:text-[#F0EAD8] transition-colors disabled:opacity-50">
                <Mic className="w-4 h-4" />
              </button>
            </div>

            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e as unknown as React.FormEvent);
                }
              }}
              placeholder={uploading ? 'Subiendo archivo...' : 'Escribí un mensaje al equipo...'}
              disabled={uploading}
              className="flex-1 max-h-32 min-h-[52px] bg-black/20 border border-[rgba(200,137,58,0.2)] rounded-xl py-3.5 px-4 text-sm text-[#F0EAD8] placeholder-[#F0EAD8]/30 focus:outline-none focus:border-[#C8893A]/50 focus:ring-1 focus:ring-[#C8893A]/50 transition-all resize-none scrollbar-hide disabled:opacity-50"
              rows={1}
            />
            <button type="submit" disabled={!input.trim() || uploading}
              className="w-[52px] h-[52px] shrink-0 rounded-xl bg-[#C8893A] hover:bg-[#C8893A] disabled:opacity-50 flex items-center justify-center text-[#F0EAD8] transition-colors shadow-lg shadow-[#C8893A]/20">
              {uploading
                ? <div className="w-4 h-4 border-2 border-[rgba(200,137,58,0.3)] border-t-white rounded-full animate-spin" />
                : <Send className="w-5 h-5 ml-1" />
              }
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
