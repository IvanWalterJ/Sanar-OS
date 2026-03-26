import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Map as RoadmapIcon, MessageSquare, TrendingUp, Users, Settings, LogOut, Hexagon, BookOpen, Library } from 'lucide-react';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onOpenSettings: () => void;
}

function getSidebarData() {
  let profile = { nombre: 'Profesional', plan: 'Implementación', fecha_inicio: new Date().toISOString() };
  try {
    const p = JSON.parse(localStorage.getItem('tcd_profile') || '{}');
    if (p.nombre) profile.nombre = p.nombre;
    if (p.fecha_inicio) profile.fecha_inicio = p.fecha_inicio;
  } catch { /* noop */ }

  let progress = 0;
  let hasPending = false;
  try {
    const rm = JSON.parse(localStorage.getItem('tcd_roadmap_v2') || '[]');
    let total = 0;
    let comp = 0;
    rm.forEach((p: any) => p.semanas.forEach((s: any) => s.tareas.forEach((t: any) => {
      total++;
      if (t.status === 'completada') comp++;
      if (t.status === 'activa' || t.status === 'pendiente') hasPending = true;
    })));
    progress = total === 0 ? 0 : Math.round((comp / total) * 100);
  } catch { /* noop */ }

  const diff = Math.floor((new Date().getTime() - new Date(profile.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24));
  const semana = Math.max(1, Math.min(12, Math.floor(diff / 7) + 1));

  return { profile, progress, hasPending, semana };
}

export default function Sidebar({ currentPage, setCurrentPage, onOpenSettings }: SidebarProps) {
  const [data, setData] = useState(getSidebarData());

  useEffect(() => {
    const interval = setInterval(() => {
      setData(getSidebarData());
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  const sections = [
    {
      title: 'PRINCIPAL',
      items: [
        { id: 'dashboard', icon: LayoutDashboard, label: 'Dashboard' },
        { id: 'roadmap', icon: RoadmapIcon, label: 'Hoja de Ruta', badge: data.hasPending },
        { id: 'metrics', icon: TrendingUp, label: 'Métricas' },
      ]
    },
    {
      title: 'HERRAMIENTAS',
      items: [
        { id: 'coach', icon: MessageSquare, label: 'Coach IA' },
        { id: 'diario', icon: BookOpen, label: 'Diario del Fundador' },
        { id: 'mensajes', icon: Users, label: 'Mensajes' },
        { id: 'biblioteca', icon: Library, label: 'Biblioteca' },
      ]
    },
    {
      title: 'CUENTA',
      items: [
        { id: 'ajustes', icon: Settings, label: 'Ajustes', action: onOpenSettings },
        { id: 'salir', icon: LogOut, label: 'Salir', action: () => {
          if (window.confirm('¿Estás segura de que querés salir?')) {
            setCurrentPage('dashboard');
            window.location.reload();
          }
        }},
      ]
    }
  ];

  return (
    <aside className="w-64 h-full glass-panel flex flex-col py-6 transition-all duration-300 z-20 shrink-0 overflow-y-auto overflow-x-hidden scrollbar-hide border-r border-white/5 bg-[#0A0A0B]/80 backdrop-blur-xl">
      <div className="flex items-center px-6 mb-8">
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30">
          <Hexagon className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />
        </div>
        <span className="ml-3 font-semibold text-sm tracking-wide text-white">
          Tu Clínica Digital
        </span>
      </div>

      <div className="px-5 mb-8">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 rounded-full bg-white/5 border border-white/10 flex items-center justify-center shrink-0">
            <div className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
          </div>
          <div className="min-w-0">
            <p className="text-white text-sm font-medium truncate">{data.profile.nombre}</p>
            <p className="text-[10px] text-gray-500 uppercase tracking-wider truncate">Prog: {data.profile.plan}</p>
          </div>
        </div>

        <div className="bg-white/[0.03] border border-white/[0.05] rounded-xl p-3 relative group">
          <div className="flex justify-between items-center mb-2">
            <span className="text-[10px] text-gray-400 font-medium tracking-wide">Semana {data.semana} de 12</span>
            <span className="text-[10px] text-white font-medium">{data.progress}%</span>
          </div>
          <div className="h-1 bg-white/10 rounded-full overflow-hidden">
            <div className="h-full bg-indigo-500 rounded-full transition-all duration-1000" style={{ width: `${data.progress}%` }} />
          </div>
          
          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-full left-0 mt-2 w-full bg-[#1A1A1C] border border-white/10 text-[10px] text-gray-300 p-2 rounded-lg shadow-xl pointer-events-none z-50">
            Siguiente hito: Automatización (Sem {Math.min(12, data.semana + 2)})
          </div>
        </div>
      </div>

      <div className="flex-1 w-full space-y-6">
        {sections.map((section, sidx) => (
          <div key={sidx} className="w-full">
            <h3 className="px-6 text-[9px] font-bold text-white/30 uppercase tracking-[0.1em] mb-2">
              {section.title}
            </h3>
            <nav className="space-y-0.5">
              {section.items.map((item) => {
                const isActive = currentPage === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      if (item.action) item.action();
                      else setCurrentPage(item.id);
                    }}
                    className={`w-full flex items-center px-6 py-2.5 transition-all relative group ${
                      isActive 
                        ? 'bg-indigo-500/15' 
                        : 'bg-transparent hover:bg-white/[0.02]'
                    }`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-indigo-500 rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.5)]" />
                    )}
                    
                    <div className="relative">
                      <item.icon className={`w-[18px] h-[18px] transition-colors ${
                        isActive ? 'text-indigo-400' : 'text-white/40 group-hover:text-white/60'
                      }`} />
                      {item.badge && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full shadow-[0_0_8px_rgba(239,68,68,0.8)] border border-[#0A0A0B]" />
                      )}
                    </div>
                    
                    <span className={`ml-3 text-[13px] tracking-wide ${
                      isActive ? 'text-white font-semibold' : 'text-white/60 font-medium group-hover:text-white/80'
                    }`}>
                      {item.label}
                    </span>
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>
    </aside>
  );
}
