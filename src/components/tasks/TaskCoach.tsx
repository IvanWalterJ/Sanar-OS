import React, { useState } from 'react';
import { MessageSquare, CheckCircle2, ExternalLink } from 'lucide-react';
import type { RoadmapMeta } from '../../lib/roadmapSeed';

interface TaskCoachProps {
  meta: RoadmapMeta;
  onComplete: () => void;
  isCompleted: boolean;
  onNavigateToCoach: () => void;
}

export default function TaskCoach({ meta, onComplete, isCompleted, onNavigateToCoach }: TaskCoachProps) {
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
          <span className="text-[9px] uppercase font-bold px-2 py-0.5 rounded-full bg-[#F0EAD8]/10 text-[#F0EAD8]/70 border border-[#F0EAD8]/15 tracking-wider">
            COACH
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

      {/* Coach instruction */}
      {meta.coach_instruccion && (
        <div className="card-panel p-5 border border-[#C8893A]/15 bg-[#C8893A]/[0.03]">
          <p className="text-[10px] text-[#C8893A] uppercase tracking-widest font-bold mb-3">
            Instrucción para tu sesión con el Coach
          </p>
          <p className="text-sm text-[#F0EAD8]/80 leading-relaxed whitespace-pre-wrap">
            {meta.coach_instruccion}
          </p>
        </div>
      )}

      {/* Open Coach button */}
      <button
        onClick={onNavigateToCoach}
        className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-[#C8893A]/10 border border-[#C8893A]/20 text-[#C8893A] font-medium hover:bg-[#C8893A]/15 transition-colors"
      >
        <MessageSquare className="w-5 h-5" />
        Abrir Coach IA
        <ExternalLink className="w-4 h-4 opacity-50" />
      </button>

      {/* Confirmation checkbox */}
      <div className="border-t border-[rgba(200,137,58,0.1)] pt-5">
        {checked ? (
          <div className="flex items-center gap-2 text-[#2DD4A0] text-sm font-medium">
            <CheckCircle2 className="w-5 h-5" />
            Sesión con el Coach completada
          </div>
        ) : (
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={checked}
              onChange={handleCheck}
              className="w-5 h-5 rounded border-[rgba(200,137,58,0.3)] bg-transparent accent-[#2DD4A0] cursor-pointer"
            />
            <span className="text-sm text-[#F0EAD8]/70 group-hover:text-[#F0EAD8] transition-colors">
              Hablé con mi Coach sobre esto
            </span>
          </label>
        )}
      </div>
    </div>
  );
}
