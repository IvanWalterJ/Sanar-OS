/**
 * TaskFiltersBar — chips clickeables multi-select.
 * Filtros: Asignadas a mí | Creadas por mí | Vencidas | Esta semana | prioridades | asignado.
 */
import { useMemo } from 'react';
import { Filter, X } from 'lucide-react';
import type { AdminTareaPrioridad, Profile } from '../../../lib/supabase';
import { ADMIN_TAREA_PRIORIDAD_LABELS } from '../../../lib/supabase';

export interface TaskFilters {
  asignadasAMi: boolean;
  creadasPorMi: boolean;
  vencidas: boolean;
  estaSemana: boolean;
  prioridades: Set<AdminTareaPrioridad>;
  asignados: Set<string>; // ids de teamMembers
}

export const EMPTY_FILTERS: TaskFilters = {
  asignadasAMi: false,
  creadasPorMi: false,
  vencidas: false,
  estaSemana: false,
  prioridades: new Set<AdminTareaPrioridad>(),
  asignados: new Set<string>(),
};

interface TaskFiltersBarProps {
  filters: TaskFilters;
  onChange: (filters: TaskFilters) => void;
  teamMembers: Profile[];
}

const PRIORIDADES: AdminTareaPrioridad[] = ['urgente', 'alta', 'media', 'baja'];

const PRIORIDAD_CHIP_COLORS: Record<AdminTareaPrioridad, { active: string; idle: string }> = {
  urgente: {
    active: 'bg-red-500/20 text-red-400 border-red-500/40',
    idle: 'border-[#FFFFFF]/10 text-[#FFFFFF]/50 hover:border-red-500/30 hover:text-red-400',
  },
  alta: {
    active: 'bg-orange-500/20 text-orange-400 border-orange-500/40',
    idle: 'border-[#FFFFFF]/10 text-[#FFFFFF]/50 hover:border-orange-500/30 hover:text-orange-400',
  },
  media: {
    active: 'bg-[#F5A623]/20 text-[#F5A623] border-[#F5A623]/40',
    idle: 'border-[#FFFFFF]/10 text-[#FFFFFF]/50 hover:border-[#F5A623]/30 hover:text-[#F5A623]',
  },
  baja: {
    active: 'bg-[#22C55E]/20 text-[#22C55E] border-[#22C55E]/40',
    idle: 'border-[#FFFFFF]/10 text-[#FFFFFF]/50 hover:border-[#22C55E]/30 hover:text-[#22C55E]',
  },
};

function Chip({
  active, onClick, children,
}: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      className={`
        text-xs font-semibold px-3 py-1.5 rounded-full border transition-all
        ${active
          ? 'bg-[#F5A623]/20 text-[#F5A623] border-[#F5A623]/50'
          : 'border-[#FFFFFF]/10 text-[#FFFFFF]/55 hover:border-[#F5A623]/30 hover:text-[#FFFFFF]/85'
        }
      `}
    >
      {children}
    </button>
  );
}

export default function TaskFiltersBar({ filters, onChange, teamMembers }: TaskFiltersBarProps) {
  const activeCount = useMemo(() => {
    let n = 0;
    if (filters.asignadasAMi) n++;
    if (filters.creadasPorMi) n++;
    if (filters.vencidas) n++;
    if (filters.estaSemana) n++;
    n += filters.prioridades.size;
    n += filters.asignados.size;
    return n;
  }, [filters]);

  function togglePrioridad(p: AdminTareaPrioridad) {
    const next = new Set(filters.prioridades);
    if (next.has(p)) next.delete(p); else next.add(p);
    onChange({ ...filters, prioridades: next });
  }

  function toggleAsignado(id: string) {
    const next = new Set(filters.asignados);
    if (next.has(id)) next.delete(id); else next.add(id);
    onChange({ ...filters, asignados: next });
  }

  function reset() {
    onChange({ ...EMPTY_FILTERS, prioridades: new Set(), asignados: new Set() });
  }

  return (
    <div className="bg-[#0F0F0F] border border-[rgba(245,166,35,0.1)] rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-xs font-bold text-[#FFFFFF]/60 uppercase tracking-wider">
          <Filter className="w-3.5 h-3.5" />
          Filtros
          {activeCount > 0 && (
            <span className="text-[10px] bg-[#F5A623]/20 text-[#F5A623] px-2 py-0.5 rounded-full">
              {activeCount}
            </span>
          )}
        </div>
        {activeCount > 0 && (
          <button
            onClick={reset}
            className="flex items-center gap-1 text-xs text-[#FFFFFF]/40 hover:text-[#F5A623] transition-colors"
          >
            <X className="w-3.5 h-3.5" />
            Limpiar
          </button>
        )}
      </div>

      {/* Scope chips */}
      <div className="flex flex-wrap gap-2">
        <Chip
          active={filters.asignadasAMi}
          onClick={() => onChange({ ...filters, asignadasAMi: !filters.asignadasAMi })}
        >
          Asignadas a mí
        </Chip>
        <Chip
          active={filters.creadasPorMi}
          onClick={() => onChange({ ...filters, creadasPorMi: !filters.creadasPorMi })}
        >
          Creadas por mí
        </Chip>
        <Chip
          active={filters.vencidas}
          onClick={() => onChange({ ...filters, vencidas: !filters.vencidas })}
        >
          Vencidas
        </Chip>
        <Chip
          active={filters.estaSemana}
          onClick={() => onChange({ ...filters, estaSemana: !filters.estaSemana })}
        >
          Esta semana
        </Chip>
      </div>

      {/* Prioridad chips */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-[10px] font-bold text-[#FFFFFF]/30 uppercase tracking-wider mr-1">
          Prioridad:
        </span>
        {PRIORIDADES.map(p => {
          const active = filters.prioridades.has(p);
          const colors = PRIORIDAD_CHIP_COLORS[p];
          return (
            <button
              key={p}
              onClick={() => togglePrioridad(p)}
              className={`text-xs font-semibold px-3 py-1.5 rounded-full border transition-all ${active ? colors.active : colors.idle}`}
            >
              {ADMIN_TAREA_PRIORIDAD_LABELS[p]}
            </button>
          );
        })}
      </div>

      {/* Asignado chips */}
      {teamMembers.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[10px] font-bold text-[#FFFFFF]/30 uppercase tracking-wider mr-1">
            Asignado:
          </span>
          {teamMembers.map(m => {
            const active = filters.asignados.has(m.id);
            const name = m.nombre ?? m.email ?? '?';
            return (
              <button
                key={m.id}
                onClick={() => toggleAsignado(m.id)}
                className={`
                  text-xs font-semibold px-3 py-1.5 rounded-full border transition-all
                  ${active
                    ? 'bg-[#F5A623]/20 text-[#F5A623] border-[#F5A623]/50'
                    : 'border-[#FFFFFF]/10 text-[#FFFFFF]/55 hover:border-[#F5A623]/30 hover:text-[#FFFFFF]/85'
                  }
                `}
              >
                {name.split(' ')[0]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
