import React from 'react';
import { LayoutDashboard, Map, MessageSquare, Target, TrendingUp, Users, Settings, LogOut, Hexagon, UserCircle, Calculator, FileText, BookOpen } from 'lucide-react';
import { motion } from 'motion/react';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onOpenSettings: () => void;
}

export default function Sidebar({ currentPage, setCurrentPage, onOpenSettings }: SidebarProps) {
  const navItems = [
    { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { id: 'onboarding', icon: UserCircle, label: 'Diagnóstico' },
    { id: 'roadmap', icon: Map, label: 'Hoja de Ruta' },
    { id: 'coach', icon: MessageSquare, label: 'Coach' },
    { id: 'oferta', icon: Target, label: 'Oferta' },
    { id: 'phr', icon: Calculator, label: 'PHR' },
    { id: 'contenido', icon: FileText, label: 'Contenido' },
    { id: 'diario', icon: BookOpen, label: 'Diario' },
    { id: 'metrics', icon: TrendingUp, label: 'Métricas' },
    { id: 'mensajes', icon: Users, label: 'Mensajes' },
  ];

  return (
    <aside className="w-20 lg:w-64 h-full glass-panel flex flex-col items-center lg:items-start py-6 transition-all duration-300 z-20">
      <div className="flex items-center justify-center lg:justify-start w-full px-0 lg:px-6 mb-10">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Hexagon className="w-6 h-6 text-white fill-white/20" />
        </div>
        <span className="hidden lg:block ml-3 font-bold text-xl tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-white to-white/60">
          Sanare OS
        </span>
      </div>

      <nav className="flex-1 w-full px-3 space-y-2">
        {navItems.map((item) => {
          const isActive = currentPage === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentPage(item.id)}
              className={`w-full flex items-center justify-center lg:justify-start px-3 py-3 rounded-xl transition-all duration-300 group relative active:scale-95 ${
                isActive 
                  ? 'text-blue-400 border border-blue-500/30 shadow-[0_0_15px_rgba(59,130,246,0.1)]' 
                  : 'text-gray-400 hover:bg-white/5 hover:text-gray-200 border border-transparent'
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="active-nav-bg"
                  className="absolute inset-0 bg-blue-500/10 rounded-xl"
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              {isActive && (
                <motion.div 
                  layoutId="active-nav-indicator"
                  className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-blue-500 rounded-r-full shadow-[0_0_10px_rgba(59,130,246,0.5)]" 
                  initial={false}
                  transition={{ type: "spring", stiffness: 300, damping: 30 }}
                />
              )}
              <item.icon className={`w-5 h-5 relative z-10 transition-transform duration-300 ${isActive ? 'drop-shadow-[0_0_8px_rgba(59,130,246,0.5)] scale-110' : 'group-hover:scale-110'}`} />
              <span className="hidden lg:block ml-3 font-medium text-sm tracking-wide relative z-10">
                {item.label}
              </span>
            </button>
          );
        })}
      </nav>

      <div className="w-full px-3 mt-auto space-y-2">
        <button 
          onClick={onOpenSettings}
          className="w-full flex items-center justify-center lg:justify-start px-3 py-3 rounded-xl text-gray-400 hover:bg-white/5 hover:text-gray-200 transition-all"
        >
          <Settings className="w-5 h-5" />
          <span className="hidden lg:block ml-3 font-medium text-sm">Ajustes</span>
        </button>
        <button
          onClick={() => {
            if (window.confirm('¿Estás segura de que querés salir?')) {
              setCurrentPage('dashboard');
              window.location.reload();
            }
          }}
          className="w-full flex items-center justify-center lg:justify-start px-3 py-3 rounded-xl text-gray-400 hover:bg-red-500/10 hover:text-red-400 transition-all"
        >
          <LogOut className="w-5 h-5" />
          <span className="hidden lg:block ml-3 font-medium text-sm">Salir</span>
        </button>
      </div>
    </aside>
  );
}
