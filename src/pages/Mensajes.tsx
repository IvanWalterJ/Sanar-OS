import React, { useState, useRef, useEffect } from 'react';
import { Hash, Lock, Send, Trophy, Users, Search, MoreVertical } from 'lucide-react';

// ─── SUPABASE REALTIME (activar cuando Supabase esté configurado) ──────────────
// import { createClient } from '@supabase/supabase-js'
// const supabase = createClient(import.meta.env.VITE_SUPABASE_URL, import.meta.env.VITE_SUPABASE_ANON_KEY)
//
// Dentro del componente, reemplazar el estado de mensajes por:
// const userId = 'UUID_DEL_USUARIO_AUTENTICADO'
// useEffect(() => {
//   const channel = supabase
//     .channel('mensajes-room')
//     .on('postgres_changes', {
//       event: 'INSERT',
//       schema: 'public',
//       table: 'mensajes',
//       filter: `receptor_id=eq.${userId}`
//     }, (payload) => {
//       setMessages(prev => [...prev, payload.new])
//     })
//     .subscribe()
//   return () => supabase.removeChannel(channel)
// }, [userId])
// ─────────────────────────────────────────────────────────────────────────────────

export default function Mensajes() {
  const [activeChannel, setActiveChannel] = useState('privado');
  const [input, setInput] = useState('');
  const [channelSearch, setChannelSearch] = useState('');
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const channels = [
    { id: 'privado', name: 'Mi Canal Privado', icon: Lock, unread: 0, type: 'private' },
    { id: 'victorias', name: 'Victorias de la Semana', icon: Trophy, unread: 0, type: 'public' },
    { id: 'comunidad', name: 'Comunidad TCD', icon: Users, unread: 5, type: 'public' },
    { id: 'consultas', name: 'Consultas Generales', icon: Hash, unread: 0, type: 'public' },
  ];

  const [messages, setMessages] = useState([
    { id: 1, author: 'Tu Clínica Digital', role: 'bot', content: '¡Bienvenida a tu programa de 90 días! Tu canal privado está listo. Podés escribirle al equipo aquí.', time: 'Lun 09:00', isMe: false, channelId: 'privado' },
    { id: 2, author: 'Dra. Marcela S.', role: 'user', content: 'Hola equipo, ya completé la fase 1. ¿Cómo seguimos?', time: 'Mar 14:30', isMe: true, channelId: 'privado' },
    { id: 3, author: 'Paolis', role: 'admin', content: '¡Excelente Marcela! Vi tus métricas. El PHR quedó súper bien. Te acabo de desbloquear la Fase 2 para que empieces con el diseño de la oferta.', time: 'Mar 15:45', isMe: false, channelId: 'privado' },
    { id: 4, author: 'Tu Clínica Digital', role: 'bot', content: '📋 Recordatorio: Esta semana es clave para avanzar en tu Hoja de Ruta. ¿Cómo va tu tarea activa?', time: 'Hoy 09:00', isMe: false, channelId: 'privado' },
    { id: 5, author: 'Tu Clínica Digital', role: 'bot', content: '¡Compartí tus victorias de la semana aquí! 🎉', time: 'Lun 09:00', isMe: false, channelId: 'victorias' },
  ]);

  const activeMessages = messages.filter(m => m.channelId === activeChannel);

  useEffect(() => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight;
    }
  }, [activeMessages]);

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const newMessage = {
      id: Date.now(),
      author: 'Dra. Marcela S.',
      role: 'user',
      content: input,
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      isMe: true,
      channelId: activeChannel
    };

    setMessages(prev => [...prev, newMessage]);
    setInput('');

    // Simulate bot reply in private channel
    if (activeChannel === 'privado') {
      setTimeout(() => {
        const botReply = {
          id: Date.now() + 1,
          author: 'Paolis',
          role: 'admin',
          content: '¡Recibido! Lo reviso y te comento en breve.',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          isMe: false,
          channelId: 'privado'
        };
        setMessages(prev => [...prev, botReply]);
      }, 1500);
    }
  };

  return (
    <div className="max-w-6xl mx-auto h-[calc(100vh-8rem)] flex glass-panel rounded-2xl overflow-hidden animate-in fade-in duration-500">
      {/* Sidebar Channels */}
      <div className="w-72 border-r border-white/10 bg-black/20 flex flex-col">
        <div className="p-4 border-b border-white/10">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={channelSearch}
              onChange={e => setChannelSearch(e.target.value)}
              placeholder="Buscar canales..."
              className="w-full bg-white/5 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 transition-colors"
            />
          </div>
        </div>

        <div className="flex-1 overflow-y-auto py-4">
          <div className="px-4 mb-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wider">Canales</p>
          </div>
          <div className="space-y-1 px-2">
            {channels.filter(c => c.name.toLowerCase().includes(channelSearch.toLowerCase())).map(channel => (
              <button
                key={channel.id}
                onClick={() => setActiveChannel(channel.id)}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-colors ${
                  activeChannel === channel.id ? 'bg-blue-500/20 text-blue-400' : 'text-gray-300 hover:bg-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <channel.icon className={`w-4 h-4 ${activeChannel === channel.id ? 'text-blue-400' : 'text-gray-500'}`} />
                  <span className="text-sm font-medium truncate">{channel.name}</span>
                </div>
                {channel.unread > 0 && (
                  <span className="w-5 h-5 rounded-full bg-blue-500 text-white text-[10px] font-bold flex items-center justify-center">
                    {channel.unread}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>
        
        <div className="p-4 border-t border-white/10">
          <div className="flex items-center gap-3">
            <img src="https://i.pravatar.cc/150?img=32" alt="Profile" className="w-8 h-8 rounded-full border border-white/20" />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium text-white truncate">Dra. Marcela S.</p>
              <p className="text-xs text-emerald-400">En línea</p>
            </div>
          </div>
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 flex flex-col bg-black/10">
        <div className="h-16 border-b border-white/10 flex items-center justify-between px-6 bg-white/5">
          <div className="flex items-center gap-3">
            {channels.find(c => c.id === activeChannel)?.icon && React.createElement(channels.find(c => c.id === activeChannel)!.icon, { className: "w-5 h-5 text-gray-400" })}
            <div>
              <h2 className="text-white font-medium">{channels.find(c => c.id === activeChannel)?.name}</h2>
              <p className="text-xs text-gray-500">
                {activeChannel === 'privado' ? 'Solo visible para vos y el equipo' : 'Canal público de la comunidad'}
              </p>
            </div>
          </div>
          <button className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center text-gray-400 transition-colors">
            <MoreVertical className="w-5 h-5" />
          </button>
        </div>

        <div ref={messagesContainerRef} className="flex-1 overflow-y-auto p-6 space-y-6">
          {activeMessages.map((msg) => (
            <div key={msg.id} className={`flex gap-4 ${msg.isMe ? 'flex-row-reverse' : ''}`}>
              {!msg.isMe && (
                <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                  msg.role === 'bot' ? 'bg-gradient-to-br from-blue-500 to-purple-600 text-white' : 'bg-amber-500 text-black'
                }`}>
                  {msg.author.charAt(0)}
                </div>
              )}
              
              <div className={`flex flex-col ${msg.isMe ? 'items-end' : 'items-start'} max-w-[75%]`}>
                <div className="flex items-baseline gap-2 mb-1 mx-1">
                  <span className="text-xs font-medium text-gray-300">{msg.author}</span>
                  {msg.role === 'admin' && <span className="text-[9px] uppercase tracking-wider text-amber-400 bg-amber-400/10 px-1.5 py-0.5 rounded">Equipo</span>}
                  {msg.role === 'bot' && <span className="text-[9px] uppercase tracking-wider text-blue-400 bg-blue-400/10 px-1.5 py-0.5 rounded">Sistema</span>}
                  <span className="text-[10px] text-gray-600">{msg.time}</span>
                </div>
                
                <div className={`rounded-2xl p-4 ${
                  msg.isMe 
                    ? 'bg-blue-600 text-white rounded-tr-sm' 
                    : msg.role === 'bot' 
                      ? 'bg-white/5 border border-white/10 text-gray-300 rounded-tl-sm'
                      : 'bg-white/10 text-white rounded-tl-sm'
                }`}>
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{msg.content}</p>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="p-4 bg-white/5 border-t border-white/10">
          <form className="relative flex items-end gap-2" onSubmit={handleSend}>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSend(e);
                }
              }}
              placeholder="Escribí un mensaje al equipo..."
              className="flex-1 max-h-32 min-h-[52px] bg-black/20 border border-white/10 rounded-xl py-3.5 px-4 text-sm text-white placeholder-gray-500 focus:outline-none focus:border-blue-500/50 focus:ring-1 focus:ring-blue-500/50 transition-all resize-none scrollbar-hide"
              rows={1}
            />
            <button 
              type="submit"
              disabled={!input.trim()}
              className="w-[52px] h-[52px] shrink-0 rounded-xl bg-blue-500 hover:bg-blue-600 disabled:opacity-50 disabled:hover:bg-blue-500 flex items-center justify-center text-white transition-colors shadow-lg shadow-blue-500/20"
            >
              <Send className="w-5 h-5 ml-1" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
