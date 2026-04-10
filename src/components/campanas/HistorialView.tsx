/**
 * HistorialView.tsx — Lista de campanas guardadas con metadata
 */
import { FolderOpen, Calendar, DollarSign, Clock } from 'lucide-react';
import type { Campana } from '../../lib/campanasTypes';
import { OBJETIVO_LABELS, ESTADO_COLORS } from '../../lib/campanasTypes';

interface Props {
  campanas: Campana[];
  onSelectCampana: (campana: Campana) => void;
  onRefresh: () => void;
}

export default function HistorialView({ campanas, onSelectCampana }: Props) {
  return (
    <div className="animate-in fade-in duration-500 max-w-5xl mx-auto">
      <div className="mb-5">
        <p className="text-[10px] font-bold tracking-[0.2em] uppercase text-[#F5A623] mb-1">
          Registro
        </p>
        <h2 className="text-xl font-light text-[#FFFFFF]">
          <span style={{ fontFamily: 'var(--font-display)', fontStyle: 'italic' }} className="text-[#F5A623]">
            Historial
          </span>{' '}
          de campañas
        </h2>
      </div>

      {campanas.length === 0 ? (
        <div className="card-panel p-12 text-center">
          <FolderOpen className="w-10 h-10 text-[#FFFFFF]/15 mx-auto mb-3" />
          <p className="text-sm text-[#FFFFFF]/40 mb-1">Todavia no hay campañas guardadas.</p>
          <p className="text-xs text-[#FFFFFF]/25">Crea tu primera campaña desde el flujo completo o un modulo directo.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {campanas.map((c) => (
            <button
              key={c.id}
              onClick={() => onSelectCampana(c)}
              className="w-full card-panel p-4 text-left hover:border-[#F5A623]/40 transition-all relative overflow-hidden"
            >
              <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-gradient-to-r from-transparent via-[#F5A623]/20 to-transparent" />

              <div className="flex items-start justify-between mb-2">
                <div className="text-sm font-semibold text-[#FFFFFF]">{c.nombre}</div>
                <span className="text-[10px] text-[#FFFFFF]/20">
                  {new Date(c.created_at).toLocaleDateString('es-AR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </span>
              </div>

              <span
                className="inline-block text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border mb-3"
                style={{
                  color: ESTADO_COLORS[c.estado],
                  backgroundColor: `${ESTADO_COLORS[c.estado]}15`,
                  borderColor: `${ESTADO_COLORS[c.estado]}30`,
                }}
              >
                {c.estado}
              </span>

              <div className="flex flex-wrap gap-4 text-[10px] text-[#FFFFFF]/30">
                <span className="flex items-center gap-1">
                  <Calendar className="w-3 h-3" />
                  {OBJETIVO_LABELS[c.objetivo].titulo}
                </span>
                {c.presupuesto_diario && (
                  <span className="flex items-center gap-1">
                    <DollarSign className="w-3 h-3" />
                    ${c.presupuesto_diario}/dia
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {c.duracion_dias} dias
                </span>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
