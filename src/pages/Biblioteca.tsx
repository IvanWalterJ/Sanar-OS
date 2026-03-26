import React, { useState } from 'react';
import { Play, Download, Wrench, FileText, FolderOpen, ArrowLeft, ExternalLink, Sparkles } from 'lucide-react';
import Oferta from './Oferta';
import PHRCalculator from './PHRCalculator';
import ContentGenerator from './ContentGenerator';
import Onboarding from './Onboarding';

type ToolId = 'oferta' | 'phr' | 'contenido' | 'diagnostico' | null;
type CategoriaId = 'identidad' | 'sistema' | 'contenido' | 'mentalidad' | 'all';

const CATEGORIAS = [
  { id: 'identidad', nombre: 'Identidad y Oferta', color: 'from-purple-500/20 to-indigo-500/20', border: 'border-purple-500/30', text: 'text-purple-400' },
  { id: 'sistema', nombre: 'Sistema y Automat.', color: 'from-blue-500/20 to-cyan-500/20', border: 'border-blue-500/30', text: 'text-blue-400' },
  { id: 'contenido', nombre: 'Contenido y Captación', color: 'from-pink-500/20 to-rose-500/20', border: 'border-pink-500/30', text: 'text-pink-400' },
  { id: 'mentalidad', nombre: 'Mentalidad y Proceso', color: 'from-emerald-500/20 to-teal-500/20', border: 'border-emerald-500/30', text: 'text-emerald-400' },
];

const RECURSOS_DB = [
  // Identidad
  { cat: 'identidad', tipo: 'doc', icon: FileText, titulo: 'Biblia del Negocio', desc: 'Documento madre con tu avatar, oferta y promesa estructurada.', tag: 'Plantilla Notion', link: '#' },
  { cat: 'identidad', tipo: 'tool', toolId: 'oferta', icon: Sparkles, titulo: 'Generador de Oferta Premium', desc: 'IA para redactar tu promesa y estructurar precios.', tag: 'Herramienta Integrada' },
  { cat: 'identidad', tipo: 'video', icon: Play, titulo: 'Masterclass: Nicho Hiper-Rentable', desc: 'Cómo elegir un nicho que pague high-ticket.', tag: 'Clase (45m)' },
  
  // Sistema
  { cat: 'sistema', tipo: 'tool', toolId: 'phr', icon: Wrench, titulo: 'Calculadora de Precio Hora Real (PHR)', desc: 'Calculá exactamente cuánto vale tu tiempo clínico vs tu tiempo CEO.', tag: 'Herramienta Integrada' },
  { cat: 'sistema', tipo: 'doc', icon: Download, titulo: 'Plantilla de Landing Page H-T', desc: 'Estructura visual y copy para alta conversión.', tag: 'Template Figma' },
  { cat: 'sistema', tipo: 'video', icon: Play, titulo: 'Setup Técnico: CRM y Calendario', desc: 'Tutorial paso a paso para automatizar el agendamiento.', tag: 'Tutorial (22m)' },

  // Contenido
  { cat: 'contenido', tipo: 'tool', toolId: 'contenido', icon: Sparkles, titulo: 'Generador de Contenido IA', desc: 'Creación de guiones y posts alineados a tu oferta.', tag: 'Herramienta Integrada' },
  { cat: 'contenido', tipo: 'doc', icon: FileText, titulo: 'Guion de Venta por DM', desc: 'Cómo transicionar una conversación normal a una cita de ventas.', tag: 'Guion Copy/Paste', link: '#' },
  { cat: 'contenido', tipo: 'video', icon: Play, titulo: 'Estrategia de Captación Orgánica', desc: 'Funnel de Reels hacia tu agenda.', tag: 'Clase (35m)' },

  // Mentalidad
  { cat: 'mentalidad', tipo: 'tool', toolId: 'diagnostico', icon: Wrench, titulo: 'Auditoría Digital de Marca', desc: 'Evaluá tu estado actual antes de escalar tu sistema.', tag: 'Herramienta Integrada' },
  { cat: 'mentalidad', tipo: 'doc', icon: Download, titulo: 'Tracker de Hábitos del Fundador', desc: 'Matriz de control semanal de foco y energía.', tag: 'Descargable PDF', link: '#' },
  { cat: 'mentalidad', tipo: 'video', icon: Play, titulo: 'Síndrome del Impostor y Precios', desc: 'Cómo cobrar +$1000 sin sentir culpa profesional.', tag: 'Clase (28m)' },
];

export default function Biblioteca({ userId }: { userId?: string }) {
  const [activeCat, setActiveCat] = useState<CategoriaId>('all');
  const [activeTool, setActiveTool] = useState<ToolId>(null);

  if (activeTool) {
    return (
      <div className="max-w-5xl mx-auto space-y-4 animate-in fade-in duration-300 pb-12">
        <button
          onClick={() => setActiveTool(null)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors uppercase tracking-wider font-bold mb-4 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl w-max"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Biblioteca
        </button>
        {activeTool === 'oferta' && <Oferta />}
        {activeTool === 'phr' && <PHRCalculator />}
        {activeTool === 'contenido' && <ContentGenerator />}
        {activeTool === 'diagnostico' && <Onboarding />}
      </div>
    );
  }

  const items = activeCat === 'all' ? RECURSOS_DB : RECURSOS_DB.filter(r => r.cat === activeCat);

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-light tracking-tight text-white mb-2">Recursos</h1>
        <p className="text-gray-400 text-sm">Todo lo que necesitás para implementar el sistema, organizado en 4 pilares.</p>
      </div>

      {/* Carpetas (Filtros) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveCat('all')}
          className={`glass-panel p-5 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all ${
            activeCat === 'all' ? 'bg-white/10 border-white/20 scale-105' : 'hover:bg-white/5 opacity-60 hover:opacity-100'
          }`}
        >
          <FolderOpen className={`w-8 h-8 ${activeCat === 'all' ? 'text-white' : 'text-gray-400'}`} />
          <span className="text-[11px] font-bold text-center uppercase tracking-widest text-white">Todos</span>
        </button>

        {CATEGORIAS.map(cat => (
          <button
            key={cat.id}
            onClick={() => setActiveCat(cat.id as CategoriaId)}
            className={`glass-panel p-4 rounded-2xl flex flex-col items-center justify-center gap-3 transition-all border ${
              activeCat === cat.id ? `bg-gradient-to-br ${cat.color} ${cat.border} scale-105 shadow-[0_0_20px_rgba(0,0,0,0.2)]` : 'border-transparent hover:bg-white/5 opacity-60 hover:opacity-100'
            }`}
          >
            <FolderOpen className={`w-8 h-8 ${cat.text}`} />
            <span className={`text-[10px] font-bold text-center uppercase tracking-widest ${cat.text}`}>{cat.nombre}</span>
          </button>
        ))}
      </div>

      {/* Grid de Contenido */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 pt-4 border-t border-white/5">
        {items.map((item, idx) => {
          const catDef = CATEGORIAS.find(c => c.id === item.cat);
          
          return (
            <div key={idx} className="glass-panel rounded-2xl p-6 hover:bg-white/[0.03] transition-all group flex flex-col justify-between h-full border border-white/5 hover:border-white/10">
              <div>
                <div className="flex justify-between items-start mb-4">
                  <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${catDef?.color} flex items-center justify-center border ${catDef?.border}`}>
                    <item.icon className={`w-5 h-5 ${catDef?.text}`} />
                  </div>
                  <span className="text-[9px] font-bold bg-white/5 px-2 py-1 rounded text-gray-400 uppercase tracking-widest">
                    {item.tag}
                  </span>
                </div>
                <h3 className="text-base font-medium text-white mb-2 line-clamp-2">{item.titulo}</h3>
                <p className="text-sm text-gray-400 leading-relaxed mb-6">{item.desc}</p>
              </div>
              
              <div className="mt-auto">
                {item.tipo === 'tool' ? (
                  <button
                    onClick={() => setActiveTool(item.toolId as ToolId)}
                    className="w-full py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-[11px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2"
                  >
                    <Sparkles className="w-3.5 h-3.5" /> Abrir Herramienta IA
                  </button>
                ) : item.tipo === 'video' ? (
                  <button className="w-full py-3 rounded-xl bg-white/10 hover:bg-white/20 text-white text-[11px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2">
                    <Play className="w-3.5 h-3.5" /> Ver Clase
                  </button>
                ) : (
                  <a
                    href={item.link || '#'}
                    className="w-full py-3 rounded-xl border border-white/20 hover:bg-white/10 text-white text-[11px] font-bold uppercase tracking-widest transition-colors flex items-center justify-center gap-2 group-hover:border-white/30"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Acceder al recurso
                  </a>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
