import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Map as RoadmapIcon, MessageSquare, TrendingUp, Users, Settings, LogOut, Hexagon, BookOpen, Library, Bot, ChevronLeft, ChevronRight } from 'lucide-react';
import { SEED_ROADMAP_V2 } from '../lib/roadmapSeed';

interface SidebarProps {
  currentPage: string;
  setCurrentPage: (page: string) => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
  messageBadge?: number;
  collapsed: boolean;
  onToggleCollapse: () => void;
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
    const saved = localStorage.getItem('tcd_hoja_ruta_v2');
    const completadasSet = new Set<string>(saved ? JSON.parse(saved) : []);
    let total = 0;
    let comp = 0;
    for (const pil of SEED_ROADMAP_V2) {
      for (const meta of pil.metas ?? []) {
        total++;
        if (completadasSet.has(`${pil.numero}-${meta.codigo}`)) comp++;
        else hasPending = true;
      }
    }
    progress = total === 0 ? 0 : Math.round((comp / total) * 100);
  } catch { /* noop */ }

  const diff = Math.floor((new Date().getTime() - new Date(profile.fecha_inicio).getTime()) / (1000 * 60 * 60 * 24));
  const semana = Math.max(1, Math.min(12, Math.floor(diff / 7) + 1));

  return { profile, progress, hasPending, semana };
}

export default function Sidebar({ currentPage, setCurrentPage, onOpenSettings, onSignOut, messageBadge = 0, collapsed, onToggleCollapse }: SidebarProps) {
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
        { id: 'mensajes', icon: Users, label: 'Mensajes', badge: messageBadge > 0 },
        { id: 'biblioteca', icon: Library, label: 'Biblioteca' },
        { id: 'agentes', icon: Bot, label: 'Agentes IA' },
      ]
    },
    {
      title: 'CUENTA',
      items: [
        { id: 'ajustes', icon: Settings, label: 'Ajustes', action: onOpenSettings },
        { id: 'salir', icon: LogOut, label: 'Salir', action: () => {
          if (window.confirm('¿Estás seguro de que querés salir?')) {
            onSignOut();
          }
        }},
      ]
    }
  ];

  const initial = data.profile.nombre.charAt(0).toUpperCase();

  return (
    <aside
      className={`${collapsed ? 'w-16' : 'w-64'} h-full glass-panel flex flex-col py-6 transition-all duration-300 z-20 shrink-0 overflow-y-auto overflow-x-hidden scrollbar-hide border-r border-white/5 bg-[#0A0A0B]/80 backdrop-blur-xl relative`}
    >
      {/* Logo */}
      <div className={`flex items-center mb-8 ${collapsed ? 'justify-center px-0' : 'px-6'}`}>
        <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center border border-indigo-500/30 shrink-0">
          <Hexagon className="w-4 h-4 text-indigo-400 fill-indigo-400/20" />
        </div>
        {!collapsed && (
          <span className="ml-3 font-semibold text-sm tracking-wide text-white truncate">
            Tu Clínica Digital
          </span>
        )}
      </div>

      {/* User profile */}
      {!collapsed && (
        <div className="px-5 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center shrink-0 text-xs font-bold text-indigo-300">
              {initial}
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
      )}

      {/* Collapsed avatar */}
      {collapsed && (
        <div className="flex justify-center mb-6">
          <div className="w-8 h-8 rounded-full bg-indigo-500/20 border border-indigo-500/30 flex items-center justify-center text-xs font-bold text-indigo-300">
            {initial}
          </div>
        </div>
      )}

      {/* Nav */}
      <div className="flex-1 w-full space-y-6">
        {sections.map((section, sidx) => (
          <div key={sidx} className="w-full">
            {!collapsed && (
              <h3 className="px-6 text-[9px] font-bold text-white/30 uppercase tracking-[0.1em] mb-2">
                {section.title}
              </h3>
            )}
            {collapsed && sidx > 0 && <div className="mx-3 border-t border-white/5 mb-2" />}
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
                    title={collapsed ? item.label : undefined}
                    className={`w-full flex items-center transition-all relative group ${
                      collapsed ? 'justify-center px-0 py-2.5' : 'px-6 py-2.5'
                    } ${isActive ? 'bg-indigo-500/15' : 'bg-transparent hover:bg-white/[0.02]'}`}
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
                    {!collapsed && (
                      <span className={`ml-3 text-[13px] tracking-wide ${
                        isActive ? 'text-white font-semibold' : 'text-white/60 font-medium group-hover:text-white/80'
                      }`}>
                        {item.label}
                      </span>
                    )}
                    {/* Tooltip on collapse */}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[#1A1A1C] border border-white/10 text-xs text-white rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
                        {item.label}
                      </div>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Toggle collapse button */}
      <button
        onClick={onToggleCollapse}
        className={`mt-6 flex items-center justify-center gap-2 text-gray-500 hover:text-white transition-colors py-2 ${collapsed ? 'px-0' : 'px-6'}`}
        title={collapsed ? 'Expandir menú' : 'Contraer menú'}
      >
        {collapsed
          ? <ChevronRight className="w-4 h-4" />
          : <><ChevronLeft className="w-4 h-4" /><span className="text-[11px]">Contraer</span></>
        }
      </button>
    </aside>
  );
}
