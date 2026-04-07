import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, X, CheckCircle2, MessageSquare, LayoutDashboard, Map, TrendingUp, Users, BookOpen, Library, Trophy, Shield } from 'lucide-react';
import { obtenerNotificaciones, marcarLeida, marcarTodasLeidas, contarNoLeidas, type NotificacionDB, type TipoNotificacion } from '../lib/notifications';
import { supabase, isSupabaseReady } from '../lib/supabase';

interface TopbarProps {
  setCurrentPage: (page: string) => void;
  userId?: string;
}

const searchablePages = [
  { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, desc: 'Panel principal del programa' },
  { id: 'roadmap', label: 'Hoja de Ruta', icon: Map, desc: 'Tu progreso en los 90 días' },
  { id: 'coach', label: 'Coach IA', icon: MessageSquare, desc: 'Asistente IA con contexto de tu programa' },
  { id: 'mensajes', label: 'Mensajes', icon: Users, desc: 'Comunicación con el equipo' },
  { id: 'metrics', label: 'Métricas', icon: TrendingUp, desc: 'Seguimiento de tu embudo de ventas' },
  { id: 'diario', label: 'Diario', icon: BookOpen, desc: 'Reflexión diaria' },
  { id: 'biblioteca', label: 'Biblioteca', icon: Library, desc: 'Videos, herramientas, recursos' },
];

const ICON_MAP: Record<TipoNotificacion, React.ElementType> = {
  hito: Trophy,
  tarea: CheckCircle2,
  mensaje: MessageSquare,
  sistema: Bell,
  admin: Shield,
};

const COLOR_MAP: Record<TipoNotificacion, { text: string; bg: string }> = {
  hito: { text: 'text-[#D4A24E]', bg: 'bg-[#D4A24E]/10' },
  tarea: { text: 'text-[#2DD4A0]', bg: 'bg-[#2DD4A0]/10' },
  mensaje: { text: 'text-[#D4A24E]', bg: 'bg-[#D4A24E]/10' },
  sistema: { text: 'text-[#D4A24E]', bg: 'bg-[#D4A24E]/10' },
  admin: { text: 'text-[#D4A24E]', bg: 'bg-[#D4A24E]/10' },
};

const URL_TO_PAGE: Record<string, string> = {
  '/hoja-de-ruta': 'roadmap',
  '/diario': 'diario',
  '/mensajes': 'mensajes',
  '/metricas': 'metrics',
  '/admin/clientes': 'admin-clientes',
  '/admin/mensajes': 'admin-mensajes',
};

function tiempoRelativo(fechaISO: string): string {
  const ahora = Date.now();
  const fecha = new Date(fechaISO).getTime();
  const diffMs = ahora - fecha;
  const minutos = Math.floor(diffMs / 60_000);

  if (minutos < 1) return 'ahora';
  if (minutos < 60) return `hace ${minutos} min`;

  const horas = Math.floor(minutos / 60);
  if (horas < 24) return `hace ${horas} h`;

  const dias = Math.floor(horas / 24);
  if (dias < 30) return `hace ${dias} d`;

  const meses = Math.floor(dias / 30);
  return `hace ${meses} mes${meses > 1 ? 'es' : ''}`;
}

export default function Topbar({ setCurrentPage, userId }: TopbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState<NotificacionDB[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  const searchInputRef = useRef<HTMLInputElement>(null);

  const profile = (() => {
    try {
      const saved = localStorage.getItem('tcd_profile');
      return saved ? JSON.parse(saved) : { nombre: 'Profesional', especialidad: '' };
    } catch { return { nombre: 'Profesional', especialidad: '' }; }
  })();

  // Load notifications + real-time subscription
  useEffect(() => {
    async function load() {
      if (!userId) return;
      const notifs = await obtenerNotificaciones(userId, 20);
      setNotifications(notifs);
      const count = await contarNoLeidas(userId);
      setUnreadCount(count);
    }
    load();

    if (isSupabaseReady() && supabase && userId) {
      const channel = supabase.channel('notif-realtime')
        .on('postgres_changes', {
          event: 'INSERT',
          schema: 'public',
          table: 'notificaciones',
          filter: `usuario_id=eq.${userId}`,
        }, (payload) => {
          setNotifications(prev => [payload.new as NotificacionDB, ...prev].slice(0, 20));
          setUnreadCount(prev => prev + 1);
        })
        .subscribe();

      return () => { supabase!.removeChannel(channel); };
    }
  }, [userId]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(prev => !prev);
      }
      if (e.key === 'Escape') {
        setShowSearch(false);
        setShowNotifications(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (showSearch) {
      setTimeout(() => searchInputRef.current?.focus(), 100);
    } else {
      setSearchQuery('');
    }
  }, [showSearch]);

  const filteredPages = searchablePages.filter(p =>
    p.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.desc.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const markAllRead = async () => {
    if (!userId) return;
    await marcarTodasLeidas(userId);
    setNotifications(prev => prev.map(n => ({ ...n, leida: true })));
    setUnreadCount(0);
  };

  const handleNotificationClick = async (notif: NotificacionDB) => {
    if (!notif.leida) {
      await marcarLeida(notif.id);
      setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, leida: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    }

    if (notif.accion_url) {
      const page = URL_TO_PAGE[notif.accion_url];
      if (page) {
        setCurrentPage(page);
      }
    }

    setShowNotifications(false);
  };

  return (
    <>
      <header className="h-20 px-8 flex items-center justify-between z-20 relative">
        <div
          onClick={() => setShowSearch(true)}
          className="flex items-center w-96 card-panel px-4 py-2 cursor-pointer hover:bg-[#241A0C] transition-colors"
        >
          <Search className="w-4 h-4 text-[#F5F0E1]/40" />
          <span className="bg-transparent text-sm text-[#F5F0E1]/40 ml-3">Buscar secciones, tareas...</span>
          <div className="flex items-center justify-center w-8 h-5 rounded bg-[#F5F0E1]/10 text-[10px] text-[#F5F0E1]/50 font-mono ml-auto">
            ⌘K
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`w-10 h-10 rounded-full card-panel flex items-center justify-center transition-all duration-300 active:scale-95 relative ${showNotifications ? 'text-[#F5F0E1] bg-[#241A0C] shadow-[0_0_15px_rgba(212,162,78,0.15)]' : 'text-[#F5F0E1]/40 hover:text-[#F5F0E1]'}`}
            >
              <Bell className={`w-5 h-5 transition-transform duration-300 ${showNotifications ? 'scale-110' : 'hover:scale-110'}`} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-[#D4A24E] rounded-full shadow-[0_0_8px_rgba(212,162,78,0.8)]" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 card-panel border border-[rgba(212,162,78,0.2)] rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200 z-50">
                <div className="p-4 border-b border-[rgba(212,162,78,0.15)] flex items-center justify-between bg-[#241A0C]/50">
                  <h3 className="font-medium text-[#F5F0E1]">Notificaciones</h3>
                  {unreadCount > 0 && (
                    <span onClick={markAllRead} className="text-xs text-[#D4A24E] cursor-pointer hover:text-[#E2B865]">Marcar todas como leidas</span>
                  )}
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.length === 0 && (
                    <div className="py-12 text-center">
                      <Bell className="w-8 h-8 text-[#F5F0E1]/20 mx-auto mb-3" />
                      <p className="text-sm text-[#F5F0E1]/40">Sin notificaciones</p>
                    </div>
                  )}
                  {notifications.map(notif => {
                    const IconComponent = ICON_MAP[notif.tipo] ?? Bell;
                    const colors = COLOR_MAP[notif.tipo] ?? COLOR_MAP.sistema;

                    return (
                      <div
                        key={notif.id}
                        onClick={() => handleNotificationClick(notif)}
                        className={`p-4 border-b border-[rgba(212,162,78,0.08)] hover:bg-[#241A0C]/50 transition-colors cursor-pointer flex gap-3 ${notif.leida ? 'opacity-60' : ''}`}
                      >
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${colors.bg}`}>
                          <IconComponent className={`w-4 h-4 ${colors.text}`} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start gap-2">
                            <p className="text-sm font-medium text-[#F5F0E1]/90 mb-0.5">{notif.titulo}</p>
                            {!notif.leida && (
                              <span className="w-2 h-2 rounded-full bg-[#E85555] shrink-0 mt-1.5" />
                            )}
                          </div>
                          {notif.descripcion && (
                            <p className="text-xs text-[#F5F0E1]/50 line-clamp-2">{notif.descripcion}</p>
                          )}
                          <p className="text-[10px] text-[#F5F0E1]/30 mt-2">{tiempoRelativo(notif.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="p-3 text-center border-t border-[rgba(212,162,78,0.15)] bg-[#241A0C]/50">
                  <button onClick={() => setShowNotifications(false)} className="text-xs text-[#F5F0E1]/50 hover:text-[#F5F0E1] transition-colors">
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pl-4 border-l border-[rgba(212,162,78,0.15)]">
            {(() => {
              const avatarUrl = localStorage.getItem('tcd_avatar');
              const initial = (profile.nombre || 'P').charAt(0).toUpperCase();
              return avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-9 h-9 rounded-full border border-[rgba(212,162,78,0.3)] object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#D4A24E]/20 border border-[#D4A24E]/30 flex items-center justify-center text-sm font-bold text-[#D4A24E]">
                  {initial}
                </div>
              );
            })()}
          </div>
        </div>
      </header>

      {/* Search Modal ⌘K */}
      {showSearch && (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm animate-in fade-in duration-150" onClick={() => setShowSearch(false)}>
          <div className="w-full max-w-lg bg-[#1A1410] border border-[rgba(212,162,78,0.2)] rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 p-4 border-b border-[rgba(212,162,78,0.15)]">
              <Search className="w-5 h-5 text-[#F5F0E1]/40" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="¿A dónde querés ir?"
                className="bg-transparent border-none outline-none text-[#F5F0E1] text-sm w-full placeholder-[#F5F0E1]/40"
              />
              <button onClick={() => setShowSearch(false)} className="text-[#F5F0E1]/40 hover:text-[#F5F0E1]">
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="max-h-[300px] overflow-y-auto p-2">
              {filteredPages.map(page => (
                <button
                  key={page.id}
                  onClick={() => {
                    setCurrentPage(page.id);
                    setShowSearch(false);
                  }}
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-[#D4A24E]/10 transition-colors"
                >
                  <page.icon className="w-5 h-5 text-[#F5F0E1]/40" />
                  <div>
                    <p className="text-sm font-medium text-[#F5F0E1]/90">{page.label}</p>
                    <p className="text-xs text-[#F5F0E1]/40">{page.desc}</p>
                  </div>
                </button>
              ))}
              {filteredPages.length === 0 && (
                <p className="text-sm text-[#F5F0E1]/40 text-center py-8">No se encontraron resultados</p>
              )}
            </div>
            <div className="p-3 border-t border-[rgba(212,162,78,0.15)] flex items-center gap-4 text-[10px] text-[#F5F0E1]/40">
              <span>↑↓ Navegar</span>
              <span>↵ Abrir</span>
              <span>esc Cerrar</span>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
