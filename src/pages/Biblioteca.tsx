import { useState } from 'react';
import { ArrowLeft, Sparkles, Lock } from 'lucide-react';
import { HERRAMIENTAS_POR_GRUPO, GRUPOS_INFO } from '../lib/herramientas';
import HerramientaDetalle from './HerramientaDetalle';

type GrupoId = 'A' | 'B' | 'C' | 'D' | 'E';

interface BibliotecaProps {
  userId?: string;
}

export default function Biblioteca({ userId }: BibliotecaProps) {
  const [grupoActivo, setGrupoActivo] = useState<GrupoId>('A');
  const [herramientaActivaId, setHerramientaActivaId] = useState<string | null>(null);

  const geminiKey = import.meta.env.VITE_GEMINI_API_KEY || '';

  if (herramientaActivaId) {
    return (
      <div className="max-w-4xl mx-auto space-y-4 animate-in fade-in duration-300 pb-12">
        <button
          onClick={() => setHerramientaActivaId(null)}
          className="flex items-center gap-2 text-sm text-gray-400 hover:text-white transition-colors uppercase tracking-wider font-bold mb-4 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl w-max"
        >
          <ArrowLeft className="w-4 h-4" /> Volver a Biblioteca
        </button>
        <HerramientaDetalle
          herramientaId={herramientaActivaId}
          userId={userId}
          geminiKey={geminiKey}
          onVolver={() => setHerramientaActivaId(null)}
        />
      </div>
    );
  }

  const grupoInfo = GRUPOS_INFO[grupoActivo];
  const herramientas = HERRAMIENTAS_POR_GRUPO[grupoActivo] ?? [];

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-12 animate-in fade-in duration-500">
      <div>
        <h1 className="text-3xl font-light tracking-tight text-white mb-2">Biblioteca de Herramientas IA</h1>
        <p className="text-gray-400 text-sm">40+ herramientas especializadas para implementar el Método CLÍNICA v2.0.</p>
      </div>

      {/* Grupos A–E */}
      <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
        {(Object.keys(GRUPOS_INFO) as GrupoId[]).map(gId => {
          const g = GRUPOS_INFO[gId];
          const isActive = grupoActivo === gId;
          return (
            <button
              key={gId}
              onClick={() => setGrupoActivo(gId)}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold whitespace-nowrap transition-all border ${
                isActive
                  ? `bg-${g.color}-500/15 border-${g.color}-500/40 text-${g.color}-300`
                  : 'bg-white/[0.02] border-white/[0.06] text-gray-400 hover:text-white hover:bg-white/[0.05]'
              }`}
            >
              <span>{g.emoji}</span>
              <span>{g.titulo}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${isActive ? `bg-${g.color}-500/20` : 'bg-white/5'}`}>
                {(HERRAMIENTAS_POR_GRUPO[gId] ?? []).length}
              </span>
            </button>
          );
        })}
      </div>

      {/* Descripción del grupo */}
      <div className={`bg-${grupoInfo.color}-500/5 border border-${grupoInfo.color}-500/20 rounded-2xl px-5 py-4`}>
        <p className="text-sm text-gray-300">
          <span className="font-semibold text-white">{grupoInfo.emoji} {grupoInfo.titulo}:</span>{' '}
          {grupoInfo.descripcion}
        </p>
      </div>

      {/* Grid de herramientas */}
      {!geminiKey && (
        <div className="flex items-center gap-3 bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-4">
          <Lock className="w-4 h-4 text-amber-400 shrink-0" />
          <p className="text-sm text-amber-300">Configurá la variable <code className="bg-amber-500/20 px-1.5 py-0.5 rounded text-amber-200 font-mono text-xs">VITE_GEMINI_API_KEY</code> para activar las herramientas IA.</p>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {herramientas.map(h => (
          <div
            key={h.id}
            className="glass-panel rounded-2xl p-5 border border-white/[0.06] hover:border-white/10 hover:bg-white/[0.03] transition-all group flex flex-col"
          >
            <div className="flex items-start gap-3 mb-3">
              <span className="text-2xl shrink-0">{h.emoji}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className={`text-[9px] font-bold uppercase tracking-widest px-1.5 py-0.5 rounded bg-${grupoInfo.color}-500/15 text-${grupoInfo.color}-400 border border-${grupoInfo.color}-500/20`}>
                    {h.id}
                  </span>
                </div>
                <h3 className="text-sm font-semibold text-white leading-snug">{h.titulo}</h3>
              </div>
            </div>

            <p className="text-xs text-gray-400 leading-relaxed mb-4 flex-1">{h.descripcion}</p>

            <button
              onClick={() => setHerramientaActivaId(h.id)}
              disabled={!geminiKey}
              className={`w-full py-2.5 rounded-xl text-[11px] font-bold uppercase tracking-widest transition-all flex items-center justify-center gap-2 ${
                geminiKey
                  ? 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg shadow-indigo-500/20'
                  : 'bg-white/5 text-gray-600 cursor-not-allowed border border-white/5'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {geminiKey ? 'Abrir Herramienta' : 'Sin API Key'}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
