import React, { useState } from 'react';
import { Bot, CheckCircle2, ExternalLink } from 'lucide-react';
import type { RoadmapMeta } from '../../lib/roadmapSeed';

interface TaskAgenteProps {
  meta: RoadmapMeta;
  onComplete: () => void;
  isCompleted: boolean;
  onNavigateToAgentes: () => void;
}

export default function TaskAgente({ meta, onComplete, isCompleted, onNavigateToAgentes }: TaskAgenteProps) {
  const [checked, setChecked] = useState(isCompleted);

  const handleCheck = () => {
    setChecked(true);
    onComplete();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-purple-500/15 text-purple-400 border border-purple-500/25 tracking-wider">
            AGENTE
          </span>
          {checked && (
            <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#2DD4A0]/15 text-[#2DD4A0] border border-[#2DD4A0]/25 tracking-wider flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3" /> Completado
            </span>
          )}
        </div>
        <h3 className="text-lg font-medium text-[#F0EAD8]" style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }}>
          {meta.titulo}
        </h3>
        <p className="text-sm text-[#F0EAD8]/60 mt-1">{meta.descripcion}</p>
      </div>

      {/* Instruction */}
      <div className="card-panel p-5 border border-purple-500/15 bg-purple-500/[0.03]">
        <p className="text-[10px] text-purple-400 uppercase tracking-widest font-bold mb-3">
          Instrucción
        </p>
        <p className="text-sm text-[#F0EAD8]/80 leading-relaxed">
          {meta.descripcion}
        </p>
      </div>

      {/* Open Agentes button */}
      <button
        onClick={onNavigateToAgentes}
        className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 font-medium hover:bg-purple-500/15 transition-colors"
      >
        <Bot className="w-5 h-5" />
        Abrir Agente IA
        <ExternalLink className="w-4 h-4 opacity-50" />
      </button>

      {/* Confirmation checkbox */}
      <div className="border-t border-[rgba(200,137,58,0.1)] pt-5">
        {checked ? (
          <div className="flex items-center gap-2 text-[#2DD4A0] text-sm font-medium">
            <CheckCircle2 className="w-5 h-5" />
            Sesión con el Agente completada
          </div>
        ) : (
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={checked}
              onChange={handleCheck}
              className="w-5 h-5 rounded border-purple-500/30 bg-transparent accent-[#2DD4A0] cursor-pointer"
            />
            <span className="text-sm text-[#F0EAD8]/70 group-hover:text-[#F0EAD8] transition-colors">
              Completé la sesión con el Agente
            </span>
          </label>
        )}
      </div>
    </div>
  );
}
