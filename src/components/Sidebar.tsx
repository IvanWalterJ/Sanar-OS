import React, { useState, useEffect } from 'react';
import { LayoutDashboard, Map as RoadmapIcon, MessageSquare, TrendingUp, Users, Settings, LogOut, Hexagon, BookOpen, Library, Bot, ChevronLeft, ChevronRight, Dna } from 'lucide-react';
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
  const semana = Math.max(1, Math.min(13, Math.floor(diff / 7) + 1));

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
        { id: 'adn', icon: Dna, label: 'ADN del Negocio' },
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
      className={`${collapsed ? 'w-16' : 'w-64'} h-full flex flex-col py-6 transition-all duration-300 z-20 shrink-0 overflow-x-hidden border-r border-[rgba(245,166,35,0.15)] bg-[#0A0A0A]/90 backdrop-blur-xl relative`}
    >
      {/* Logo */}
      <div className={`flex items-center mb-8 ${collapsed ? 'justify-center px-0' : 'px-6'}`}>
        <div className="w-8 h-8 rounded-lg bg-[#F5A623]/20 flex items-center justify-center border border-[#F5A623]/30 shrink-0">
          <Hexagon className="w-4 h-4 text-[#F5A623] fill-[#F5A623]/20" />
        </div>
        {!collapsed && (
          <span className="ml-3 font-semibold text-sm tracking-wide text-[#FFFFFF] truncate">
            Tu Clínica Digital
          </span>
        )}
      </div>

      {/* User profile */}
      {!collapsed && (
        <div className="px-5 mb-8">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-full bg-[#F5A623]/20 border border-[#F5A623]/30 flex items-center justify-center shrink-0 text-xs font-bold text-[#F5A623]">
              {initial}
            </div>
            <div className="min-w-0">
              <p className="text-[#FFFFFF] text-sm font-medium truncate">{data.profile.nombre}</p>
              <p className="text-[10px] text-[#FFFFFF]/40 uppercase tracking-wider truncate">Prog: {data.profile.plan}</p>
            </div>
          </div>

          <div className="bg-[#1C1C1C]/60 border border-[rgba(245,166,35,0.15)] rounded-xl p-3 relative group">
            <div className="flex justify-between items-center mb-2">
              <span className="text-[10px] text-[#FFFFFF]/50 font-medium tracking-wide">Semana {data.semana} de 13</span>
              <span className="text-[10px] text-[#FFFFFF] font-medium">{data.progress}%</span>
            </div>
            <div className="h-1 bg-[#FFFFFF]/10 rounded-full overflow-hidden">
              <div className="h-full bg-[#F5A623] rounded-full transition-all duration-1000" style={{ width: `${data.progress}%` }} />
            </div>
            <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute top-full left-0 mt-2 w-full bg-[#1C1C1C] border border-[rgba(245,166,35,0.2)] text-[10px] text-[#FFFFFF]/70 p-2 rounded-lg shadow-xl pointer-events-none z-50">
              ADN del Negocio: {data.progress}% completado
            </div>
          </div>
        </div>
      )}

      {/* Collapsed avatar */}
      {collapsed && (
        <div className="flex justify-center mb-6">
          <div className="w-8 h-8 rounded-full bg-[#F5A623]/20 border border-[#F5A623]/30 flex items-center justify-center text-xs font-bold text-[#F5A623]">
            {initial}
          </div>
        </div>
      )}

      {/* Nav */}
      <div className="flex-1 w-full space-y-6 overflow-y-auto scrollbar-hide">
        {sections.map((section, sidx) => (
          <div key={sidx} className="w-full">
            {!collapsed && (
              <h3 className="px-6 text-[9px] font-bold text-[#FFFFFF]/25 uppercase tracking-[0.1em] mb-2">
                {section.title}
              </h3>
            )}
            {collapsed && sidx > 0 && <div className="mx-3 border-t border-[rgba(245,166,35,0.1)] mb-2" />}
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
                    } ${isActive ? 'bg-[#F5A623]/15' : 'bg-transparent hover:bg-[#F5A623]/5'}`}
                  >
                    {isActive && (
                      <div className="absolute left-0 top-0 bottom-0 w-[3px] bg-[#F5A623] rounded-r-full shadow-[0_0_10px_rgba(245,166,35,0.5)]" />
                    )}
                    <div className="relative">
                      <item.icon className={`w-[18px] h-[18px] transition-colors ${
                        isActive ? 'text-[#F5A623]' : 'text-[#FFFFFF]/40 group-hover:text-[#FFFFFF]/60'
                      }`} />
                      {item.badge && (
                        <div className="absolute -top-1 -right-1 w-2 h-2 bg-[#EF4444] rounded-full shadow-[0_0_8px_rgba(232,85,85,0.8)] border border-[#0A0A0A]" />
                      )}
                    </div>
                    {!collapsed && (
                      <span className={`ml-3 text-[13px] tracking-wide ${
                        isActive ? 'text-[#FFFFFF] font-semibold' : 'text-[#FFFFFF]/60 font-medium group-hover:text-[#FFFFFF]/80'
                      }`}>
                        {item.label}
                      </span>
                    )}
                    {/* Tooltip on collapse */}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-2.5 py-1.5 bg-[#1C1C1C] border border-[rgba(245,166,35,0.2)] text-xs text-[#FFFFFF] rounded-lg shadow-xl opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-50">
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
        className={`mt-6 flex items-center justify-center gap-2 text-[#FFFFFF]/40 hover:text-[#FFFFFF] transition-colors py-2 ${collapsed ? 'px-0' : 'px-6'}`}
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
