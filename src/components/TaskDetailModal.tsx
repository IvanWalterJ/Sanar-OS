import React, { useEffect, useState } from 'react';
import { X, Clock, ArrowRight, Star, Wrench, Bot, FileText, CheckCircle2 } from 'lucide-react';
import type { RoadmapMeta } from '../lib/roadmapSeed';
import type { ProfileV2 } from '../lib/supabase';
import TaskWorkModal, { type TareaConContexto } from './TaskWorkModal';

interface TareaDetalle extends RoadmapMeta {
  pilarNumero?: number;
  pilarTitulo?: string;
}

interface TaskDetailModalProps {
  tarea: TareaDetalle;
  onClose: () => void;
  onNavigate: (page: string) => void;
  // Props opcionales para activar el modo de trabajo inline (desde Roadmap)
  userId?: string;
  perfil?: Partial<ProfileV2>;
  geminiKey?: string;
  outputExistente?: string;
  onApprove?: (outputTexto: string) => void;
}

export default function TaskDetailModal({
  tarea, onClose, onNavigate,
  userId, perfil, geminiKey, outputExistente, onApprove,
}: TaskDetailModalProps) {
  const [showWorkModal, setShowWorkModal] = useState(false);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  // Modo inline: tiene herramienta + contexto completo para ejecutar
  const canUseToolInline = !!(tarea.herramienta_id && userId && geminiKey && onApprove && tarea.pilarNumero !== undefined);
  const tieneOutputGuardado = !!outputExistente;

  // Navegación fallback (Dashboard sin contexto completo)
  const destinoPage = tarea.herramienta_id ? 'roadmap' : tarea.agente_id ? 'agentes' : null;

  if (showWorkModal && canUseToolInline) {
    return (
      <TaskWorkModal
        tarea={tarea as TareaConContexto}
        pilarEstado="en_progreso"
        userId={userId}
        perfil={perfil}
        geminiKey={geminiKey}
        outputExistente={outputExistente}
        onClose={() => { setShowWorkModal(false); onClose(); }}
        onApprove={(texto) => { onApprove!(texto); setShowWorkModal(false); onClose(); }}
      />
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />

      <div className="relative z-10 w-full max-w-lg bg-[#0d1117] border border-white/10 rounded-2xl shadow-2xl animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-start justify-between p-6 border-b border-white/5">
          <div className="flex-1 pr-4">
            {tarea.pilarTitulo && (
              <p className="text-[10px] text-indigo-400 uppercase tracking-widest font-bold mb-2">
                Pilar {tarea.pilarNumero} — {tarea.pilarTitulo}
              </p>
            )}
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-semibold text-white leading-snug">{tarea.titulo}</h2>
              {tieneOutputGuardado && (
                <span title="Documento guardado">
                  <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                </span>
              )}
            </div>
          </div>
          <button onClick={onClose} className="shrink-0 p-1.5 rounded-lg text-gray-500 hover:text-white hover:bg-white/5 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5">
          <p className="text-sm text-gray-300 leading-relaxed">{tarea.descripcion}</p>

          {/* Preview del output guardado */}
          {tieneOutputGuardado && (
            <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-4">
              <p className="text-[10px] text-emerald-400 uppercase tracking-widest font-bold mb-2 flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5" /> Documento guardado
              </p>
              <p className="text-xs text-gray-400 line-clamp-3 leading-relaxed whitespace-pre-wrap font-mono">
                {outputExistente}
              </p>
            </div>
          )}

          {/* Chips de info */}
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center gap-1.5 text-[11px] text-gray-400 bg-white/5 rounded-lg px-3 py-1.5">
              <Clock className="w-3.5 h-3.5" />
              <span>{tarea.tiempo_estimado || '15–30 min'}</span>
            </div>
            {tarea.es_estrella && (
              <div className="flex items-center gap-1.5 text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/20 rounded-lg px-3 py-1.5">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                <span>Tarea estrella</span>
              </div>
            )}
            {tarea.herramienta_id && (
              <div className="flex items-center gap-1.5 text-[11px] text-blue-400 bg-blue-500/10 border border-blue-500/20 rounded-lg px-3 py-1.5">
                <Wrench className="w-3.5 h-3.5" />
                <span>Herramienta {tarea.herramienta_id}</span>
              </div>
            )}
            {tarea.agente_id && (
              <div className="flex items-center gap-1.5 text-[11px] text-violet-400 bg-violet-500/10 border border-violet-500/20 rounded-lg px-3 py-1.5">
                <Bot className="w-3.5 h-3.5" />
                <span>Agente IA</span>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between p-6 border-t border-white/5 gap-3">
          <button onClick={onClose} className="px-4 py-2 text-sm text-gray-400 hover:text-white transition-colors">
            Cerrar
          </button>

          {canUseToolInline ? (
            <button
              onClick={() => setShowWorkModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
            >
              {tieneOutputGuardado ? (
                <><FileText className="w-4 h-4" /> Ver / Editar documento</>
              ) : (
                <><Wrench className="w-4 h-4" /> Usar Herramienta IA</>
              )}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : destinoPage ? (
            <button
              onClick={() => onNavigate(destinoPage)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-indigo-500 hover:bg-indigo-600 text-white text-sm font-medium transition-colors shadow-lg shadow-indigo-500/20"
            >
              {tarea.agente_id ? 'Ir a Agentes IA' : 'Ver en Hoja de Ruta'}
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              onClick={() => onNavigate('roadmap')}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-white/10 hover:bg-white/15 text-white text-sm font-medium transition-colors"
            >
              Ver en Hoja de Ruta <ArrowRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
