import React, { useState, useEffect, useRef } from 'react';
import { Search, Bell, X, CheckCircle2, MessageSquare, LayoutDashboard, Map, TrendingUp, Users, BookOpen, Library } from 'lucide-react';

interface TopbarProps {
  setCurrentPage: (page: string) => void;
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

export default function Topbar({ setCurrentPage }: TopbarProps) {
  const [showNotifications, setShowNotifications] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [notifications, setNotifications] = useState([
    { id: 1, title: 'Hoja de Ruta lista', desc: 'Tu programa de 90 días está listo. Empezá con el Día 1.', time: 'Hoy', icon: CheckCircle2, color: 'text-[#2DD4A0]', bg: 'bg-[#2DD4A0]/10', read: false, page: 'roadmap' },
    { id: 2, title: 'Mensaje del equipo', desc: '¡Bienvenida al programa! Estamos acá para acompañarte.', time: 'Hoy', icon: MessageSquare, color: 'text-[#C8893A]', bg: 'bg-[#C8893A]/10', read: false, page: 'mensajes' },
    { id: 3, title: 'Recordatorio', desc: 'No olvides completar tu entrada del Diario de hoy.', time: 'Hoy', icon: Bell, color: 'text-[#C8893A]', bg: 'bg-[#C8893A]/10', read: false, page: 'diario' },
  ]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const unreadCount = notifications.filter(n => !n.read).length;

  const profile = (() => {
    try {
      const saved = localStorage.getItem('tcd_profile');
      return saved ? JSON.parse(saved) : { nombre: 'Profesional', especialidad: '' };
    } catch { return { nombre: 'Profesional', especialidad: '' }; }
  })();

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

  const markAllRead = () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
  };

  const handleNotificationClick = (notif: typeof notifications[0]) => {
    setNotifications(prev => prev.map(n => n.id === notif.id ? { ...n, read: true } : n));
    setCurrentPage(notif.page);
    setShowNotifications(false);
  };

  return (
    <>
      <header className="h-20 px-8 flex items-center justify-between z-20 relative">
        <div
          onClick={() => setShowSearch(true)}
          className="flex items-center w-96 card-panel px-4 py-2 cursor-pointer hover:bg-[#241A0C] transition-colors"
        >
          <Search className="w-4 h-4 text-[#F0EAD8]/40" />
          <span className="bg-transparent text-sm text-[#F0EAD8]/40 ml-3">Buscar secciones, tareas...</span>
          <div className="flex items-center justify-center w-8 h-5 rounded bg-[#F0EAD8]/10 text-[10px] text-[#F0EAD8]/50 font-mono ml-auto">
            ⌘K
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative">
            <button
              onClick={() => setShowNotifications(!showNotifications)}
              className={`w-10 h-10 rounded-full card-panel flex items-center justify-center transition-all duration-300 active:scale-95 relative ${showNotifications ? 'text-[#F0EAD8] bg-[#241A0C] shadow-[0_0_15px_rgba(200,137,58,0.15)]' : 'text-[#F0EAD8]/40 hover:text-[#F0EAD8]'}`}
            >
              <Bell className={`w-5 h-5 transition-transform duration-300 ${showNotifications ? 'scale-110' : 'hover:scale-110'}`} />
              {unreadCount > 0 && (
                <span className="absolute top-2 right-2 w-2 h-2 bg-[#C8893A] rounded-full shadow-[0_0_8px_rgba(200,137,58,0.8)]" />
              )}
            </button>

            {showNotifications && (
              <div className="absolute right-0 mt-3 w-80 card-panel border border-[rgba(200,137,58,0.2)] rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200 z-50">
                <div className="p-4 border-b border-[rgba(200,137,58,0.15)] flex items-center justify-between bg-[#241A0C]/50">
                  <h3 className="font-medium text-[#F0EAD8]">Notificaciones</h3>
                  <span onClick={markAllRead} className="text-xs text-[#C8893A] cursor-pointer hover:text-[#D9A04E]">Marcar leídas</span>
                </div>
                <div className="max-h-[400px] overflow-y-auto">
                  {notifications.map(notif => (
                    <div
                      key={notif.id}
                      onClick={() => handleNotificationClick(notif)}
                      className={`p-4 border-b border-[rgba(200,137,58,0.08)] hover:bg-[#241A0C]/50 transition-colors cursor-pointer flex gap-3 ${notif.read ? 'opacity-60' : ''}`}
                    >
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notif.bg}`}>
                        <notif.icon className={`w-4 h-4 ${notif.color}`} />
                      </div>
                      <div>
                        <p className="text-sm font-medium text-[#F0EAD8]/90 mb-0.5">{notif.title}</p>
                        <p className="text-xs text-[#F0EAD8]/50 line-clamp-2">{notif.desc}</p>
                        <p className="text-[10px] text-[#F0EAD8]/30 mt-2">{notif.time}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="p-3 text-center border-t border-[rgba(200,137,58,0.15)] bg-[#241A0C]/50">
                  <button onClick={() => setShowNotifications(false)} className="text-xs text-[#F0EAD8]/50 hover:text-[#F0EAD8] transition-colors">
                    Cerrar
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center gap-2 pl-4 border-l border-[rgba(200,137,58,0.15)]">
            {(() => {
              const avatarUrl = localStorage.getItem('tcd_avatar');
              const initial = (profile.nombre || 'P').charAt(0).toUpperCase();
              return avatarUrl ? (
                <img src={avatarUrl} alt="Profile" className="w-9 h-9 rounded-full border border-[rgba(200,137,58,0.3)] object-cover" />
              ) : (
                <div className="w-9 h-9 rounded-full bg-[#C8893A]/20 border border-[#C8893A]/30 flex items-center justify-center text-sm font-bold text-[#C8893A]">
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
          <div className="w-full max-w-lg bg-[#1A1410] border border-[rgba(200,137,58,0.2)] rounded-2xl shadow-2xl overflow-hidden" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 p-4 border-b border-[rgba(200,137,58,0.15)]">
              <Search className="w-5 h-5 text-[#F0EAD8]/40" />
              <input
                ref={searchInputRef}
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder="¿A dónde querés ir?"
                className="bg-transparent border-none outline-none text-[#F0EAD8] text-sm w-full placeholder-[#F0EAD8]/40"
              />
              <button onClick={() => setShowSearch(false)} className="text-[#F0EAD8]/40 hover:text-[#F0EAD8]">
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
                  className="w-full flex items-center gap-3 px-4 py-3 rounded-xl text-left hover:bg-[#C8893A]/10 transition-colors"
                >
                  <page.icon className="w-5 h-5 text-[#F0EAD8]/40" />
                  <div>
                    <p className="text-sm font-medium text-[#F0EAD8]/90">{page.label}</p>
                    <p className="text-xs text-[#F0EAD8]/40">{page.desc}</p>
                  </div>
                </button>
              ))}
              {filteredPages.length === 0 && (
                <p className="text-sm text-[#F0EAD8]/40 text-center py-8">No se encontraron resultados</p>
              )}
            </div>
            <div className="p-3 border-t border-[rgba(200,137,58,0.15)] flex items-center gap-4 text-[10px] text-[#F0EAD8]/40">
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
