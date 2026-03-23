import React, { useState } from 'react';
import { Search, Bell, X, CheckCircle2, MessageSquare } from 'lucide-react';

export default function Topbar() {
  const [showNotifications, setShowNotifications] = useState(false);

  const notifications = [
    { id: 1, title: 'Fase 2 Desbloqueada', desc: 'Ya puedes comenzar con el diseño de tu oferta premium.', time: 'Hace 2 horas', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { id: 2, title: 'Nuevo mensaje de Paolis', desc: '¡Excelente Marcela! Vi tus métricas...', time: 'Hace 5 horas', icon: MessageSquare, color: 'text-blue-400', bg: 'bg-blue-400/10' },
    { id: 3, title: 'Recordatorio', desc: 'No olvides cargar tus métricas de esta semana.', time: 'Ayer', icon: Bell, color: 'text-amber-400', bg: 'bg-amber-400/10' },
  ];

  return (
    <header className="h-20 px-8 flex items-center justify-between z-20 relative">
      <div className="flex items-center w-96 glass-panel rounded-full px-4 py-2">
        <Search className="w-4 h-4 text-gray-400" />
        <input 
          type="text" 
          placeholder="Buscar pacientes, tareas, métricas..." 
          className="bg-transparent border-none outline-none text-sm text-gray-200 ml-3 w-full placeholder-gray-500"
        />
        <div className="flex items-center justify-center w-8 h-5 rounded bg-white/10 text-[10px] text-gray-400 font-mono">
          ⌘K
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="relative">
          <button 
            onClick={() => setShowNotifications(!showNotifications)}
            className={`w-10 h-10 rounded-full glass-panel flex items-center justify-center transition-all duration-300 active:scale-95 relative ${showNotifications ? 'text-white bg-white/10 shadow-[0_0_15px_rgba(255,255,255,0.1)]' : 'text-gray-400 hover:text-white'}`}
          >
            <Bell className={`w-5 h-5 transition-transform duration-300 ${showNotifications ? 'scale-110' : 'hover:scale-110'}`} />
            <span className="absolute top-2 right-2 w-2 h-2 bg-blue-500 rounded-full shadow-[0_0_8px_rgba(59,130,246,0.8)]" />
          </button>

          {/* Notifications Dropdown */}
          {showNotifications && (
            <div className="absolute right-0 mt-3 w-80 glass-panel border border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-top-2 fade-in duration-200 z-50">
              <div className="p-4 border-b border-white/10 flex items-center justify-between bg-white/[0.02]">
                <h3 className="font-medium text-white">Notificaciones</h3>
                <span className="text-xs text-blue-400 cursor-pointer hover:text-blue-300">Marcar leídas</span>
              </div>
              <div className="max-h-[400px] overflow-y-auto">
                {notifications.map(notif => (
                  <div key={notif.id} className="p-4 border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer flex gap-3">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${notif.bg}`}>
                      <notif.icon className={`w-4 h-4 ${notif.color}`} />
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-200 mb-0.5">{notif.title}</p>
                      <p className="text-xs text-gray-400 line-clamp-2">{notif.desc}</p>
                      <p className="text-[10px] text-gray-500 mt-2">{notif.time}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="p-3 text-center border-t border-white/10 bg-white/[0.02]">
                <button className="text-xs text-gray-400 hover:text-white transition-colors">
                  Ver todas las notificaciones
                </button>
              </div>
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 pl-4 border-l border-white/10">
          <div className="text-right hidden md:block">
            <p className="text-sm font-medium text-gray-200">Dra. Marcela S.</p>
            <p className="text-xs text-blue-400">Nutricionista</p>
          </div>
          <img 
            src="https://i.pravatar.cc/150?img=32" 
            alt="Profile" 
            className="w-10 h-10 rounded-full border border-white/20 object-cover"
          />
        </div>
      </div>
    </header>
  );
}
