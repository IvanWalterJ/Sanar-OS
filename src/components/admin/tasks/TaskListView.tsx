/**
 * TaskListView — vista tabla compacta sortable.
 * Columnas: Título / Asignado / Prioridad / Vence / Estado / Acciones
 */
import { useMemo, useState } from 'react';
import {
  ArrowUpDown, ChevronDown, ChevronUp, AlertCircle, Trash2, Pencil, UserPlus,
} from 'lucide-react';
import type { AdminTarea, AdminTareaStatus, AdminTareaPrioridad } from '../../../lib/supabase';
import {
  ADMIN_TAREA_STATUSES,
  ADMIN_TAREA_STATUS_LABELS,
  ADMIN_TAREA_PRIORIDAD_LABELS,
} from '../../../lib/supabase';
import CustomSelect from '../../CustomSelect';

interface TaskListViewProps {
  tareas: AdminTarea[];
  currentUserId: string;
  onStatusChange: (id: string, status: AdminTareaStatus) => void;
  onEdit: (t: AdminTarea) => void;
  onDelete: (id: string) => void;
}

type SortKey = 'titulo' | 'asignado' | 'prioridad' | 'fecha' | 'status';
type SortDir = 'asc' | 'desc';

const PRIORIDAD_RANK: Record<AdminTareaPrioridad, number> = {
  urgente: 4, alta: 3, media: 2, baja: 1,
};

const PRIORIDAD_PILL: Record<AdminTareaPrioridad, string> = {
  urgente: 'bg-red-500/15 text-red-400',
  alta: 'bg-orange-500/15 text-orange-400',
  media: 'bg-[#F5A623]/15 text-[#F5A623]',
  baja: 'bg-[#22C55E]/15 text-[#22C55E]',
};

function initials(name?: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

function compareStrings(a?: string | null, b?: string | null): number {
  return (a ?? '').localeCompare(b ?? '');
}

export default function TaskListView({
  tareas, currentUserId, onStatusChange, onEdit, onDelete,
}: TaskListViewProps) {
  const [sortKey, setSortKey] = useState<SortKey>('fecha');
  const [sortDir, setSortDir] = useState<SortDir>('asc');

  const sorted = useMemo(() => {
    const arr = [...tareas];
    arr.sort((a, b) => {
      let r = 0;
      switch (sortKey) {
        case 'titulo':    r = compareStrings(a.titulo, b.titulo); break;
        case 'asignado':  r = compareStrings(a.asignado_nombre, b.asignado_nombre); break;
        case 'prioridad': r = PRIORIDAD_RANK[a.prioridad] - PRIORIDAD_RANK[b.prioridad]; break;
        case 'status':    r = ADMIN_TAREA_STATUSES.indexOf(a.status) - ADMIN_TAREA_STATUSES.indexOf(b.status); break;
        case 'fecha': {
          const av = a.fecha_vencimiento ? new Date(a.fecha_vencimiento).getTime() : Infinity;
          const bv = b.fecha_vencimiento ? new Date(b.fecha_vencimiento).getTime() : Infinity;
          r = av - bv;
          break;
        }
      }
      return sortDir === 'asc' ? r : -r;
    });
    return arr;
  }, [tareas, sortKey, sortDir]);

  function toggleSort(k: SortKey) {
    if (sortKey === k) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(k);
      setSortDir('asc');
    }
  }

  function SortHeader({ k, label, className = '' }: { k: SortKey; label: string; className?: string }) {
    const active = sortKey === k;
    return (
      <button
        onClick={() => toggleSort(k)}
        className={`
          flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider
          ${active ? 'text-[#F5A623]' : 'text-[#FFFFFF]/40 hover:text-[#FFFFFF]/70'}
          transition-colors ${className}
        `}
      >
        {label}
        {active
          ? (sortDir === 'asc' ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />)
          : <ArrowUpDown className="w-3 h-3 opacity-50" />
        }
      </button>
    );
  }

  if (sorted.length === 0) {
    return (
      <div className="bg-[#0F0F0F] border border-[rgba(245,166,35,0.1)] rounded-2xl p-12 text-center text-[#FFFFFF]/40 text-sm">
        No hay tareas que coincidan con los filtros.
      </div>
    );
  }

  return (
    <div className="bg-[#0F0F0F] border border-[rgba(245,166,35,0.1)] rounded-2xl overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-[#0A0A0A] border-b border-[rgba(245,166,35,0.1)]">
            <tr>
              <th className="text-left px-4 py-3 w-[36%]"><SortHeader k="titulo"    label="Tarea" /></th>
              <th className="text-left px-3 py-3"><SortHeader k="asignado"  label="Asignado" /></th>
              <th className="text-left px-3 py-3"><SortHeader k="prioridad" label="Prioridad" /></th>
              <th className="text-left px-3 py-3"><SortHeader k="fecha"     label="Vence" /></th>
              <th className="text-left px-3 py-3"><SortHeader k="status"    label="Estado" /></th>
              <th className="px-3 py-3 w-20"></th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(t => {
              const isOverdue = t.fecha_vencimiento
                && new Date(t.fecha_vencimiento) < new Date()
                && t.status !== 'completadas';
              const fecha = t.fecha_vencimiento
                ? new Date(t.fecha_vencimiento).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
                : null;
              const yoSoyCreadorYNoAsignado =
                t.creado_por === currentUserId && t.asignado_a !== currentUserId && !!t.asignado_a;

              return (
                <tr
                  key={t.id}
                  onClick={() => onEdit(t)}
                  className="border-b border-[rgba(245,166,35,0.05)] hover:bg-[#F5A623]/5 transition-colors cursor-pointer group"
                >
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-2">
                      <span className="text-base text-[#FFFFFF] font-medium leading-snug">
                        {t.titulo}
                      </span>
                      {yoSoyCreadorYNoAsignado && (
                        <span title="Creada por mí" className="shrink-0 flex items-center gap-1 text-[10px] font-bold text-[#F5A623]/80 bg-[#F5A623]/10 px-1.5 py-0.5 rounded-full">
                          <UserPlus className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                    {t.cliente_nombre && (
                      <div className="text-xs text-[#F5A623]/70 mt-0.5">{t.cliente_nombre}</div>
                    )}
                  </td>

                  <td className="px-3 py-3">
                    {t.asignado_nombre ? (
                      <div className="flex items-center gap-2 min-w-0">
                        <div className="w-7 h-7 rounded-full bg-[#F5A623]/20 flex items-center justify-center text-[10px] font-bold text-[#F5A623] border border-[#F5A623]/30 shrink-0">
                          {initials(t.asignado_nombre)}
                        </div>
                        <span className="text-sm text-[#FFFFFF]/80 truncate">{t.asignado_nombre}</span>
                      </div>
                    ) : (
                      <span className="text-xs text-[#FFFFFF]/30">Sin asignar</span>
                    )}
                  </td>

                  <td className="px-3 py-3">
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PRIORIDAD_PILL[t.prioridad]}`}>
                      {ADMIN_TAREA_PRIORIDAD_LABELS[t.prioridad]}
                    </span>
                  </td>

                  <td className="px-3 py-3">
                    {fecha ? (
                      <div className={`flex items-center gap-1.5 text-xs font-medium ${isOverdue ? 'text-red-400' : 'text-[#FFFFFF]/55'}`}>
                        {isOverdue && <AlertCircle className="w-3.5 h-3.5" />}
                        {fecha}
                      </div>
                    ) : (
                      <span className="text-xs text-[#FFFFFF]/25">—</span>
                    )}
                  </td>

                  <td className="px-3 py-3 min-w-[140px]" onClick={e => e.stopPropagation()}>
                    <CustomSelect
                      value={t.status}
                      onChange={v => onStatusChange(t.id, v as AdminTareaStatus)}
                      options={ADMIN_TAREA_STATUSES.map(s => ({ value: s, label: ADMIN_TAREA_STATUS_LABELS[s] }))}
                    />
                  </td>

                  <td className="px-3 py-3">
                    <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={e => { e.stopPropagation(); onEdit(t); }}
                        title="Editar"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#FFFFFF]/40 hover:text-[#F5A623] hover:bg-[#F5A623]/10 transition-all"
                      >
                        <Pencil className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={e => { e.stopPropagation(); onDelete(t.id); }}
                        title="Eliminar"
                        className="w-7 h-7 rounded-lg flex items-center justify-center text-[#FFFFFF]/40 hover:text-red-400 hover:bg-red-500/10 transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
