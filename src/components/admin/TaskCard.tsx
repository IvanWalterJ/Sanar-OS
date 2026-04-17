import { useState } from 'react';
import { MoreVertical, Calendar, User, AlertCircle } from 'lucide-react';
import type { AdminTarea, AdminTareaStatus, AdminTareaStatus as S } from '../../lib/supabase';
import { ADMIN_TAREA_STATUSES, ADMIN_TAREA_STATUS_LABELS, ADMIN_TAREA_PRIORIDAD_LABELS } from '../../lib/supabase';

interface TaskCardProps {
  tarea: AdminTarea;
  onStatusChange: (id: string, status: AdminTareaStatus) => void;
  onEdit: (tarea: AdminTarea) => void;
  onDelete: (id: string) => void;
  onDragStart: (e: React.DragEvent, id: string) => void;
}

const PRIORIDAD_COLORS: Record<string, string> = {
  baja: 'bg-[#22C55E]/15 text-[#22C55E]',
  media: 'bg-[#F5A623]/15 text-[#F5A623]',
  alta: 'bg-orange-500/15 text-orange-400',
  urgente: 'bg-red-500/15 text-red-400',
};

export default function TaskCard({ tarea, onStatusChange, onEdit, onDelete, onDragStart }: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const isOverdue = tarea.fecha_vencimiento
    && new Date(tarea.fecha_vencimiento) < new Date()
    && !['completadas', 'aprobadas'].includes(tarea.status);

  const fechaLabel = tarea.fecha_vencimiento
    ? new Date(tarea.fecha_vencimiento).toLocaleDateString('es-AR', { day: 'numeric', month: 'short' })
    : null;

  const initials = (name?: string) => {
    if (!name) return '?';
    return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
  };

  return (
    <div
      draggable
      onDragStart={e => onDragStart(e, tarea.id)}
      className="bg-[#1A1A1A] border border-[rgba(245,166,35,0.15)] rounded-xl p-3 cursor-grab active:cursor-grabbing hover:border-[rgba(245,166,35,0.3)] transition-all group relative"
    >
      {/* Prioridad + menú */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${PRIORIDAD_COLORS[tarea.prioridad]}`}>
          {ADMIN_TAREA_PRIORIDAD_LABELS[tarea.prioridad]}
        </span>
        <div className="relative">
          <button
            onClick={() => setShowMenu(v => !v)}
            className="w-6 h-6 rounded-lg flex items-center justify-center text-[#FFFFFF]/30 hover:text-[#FFFFFF]/70 hover:bg-[#FFFFFF]/5 transition-all"
          >
            <MoreVertical className="w-3.5 h-3.5" />
          </button>

          {showMenu && (
            <div
              className="absolute right-0 top-7 z-20 bg-[#1E1E1E] border border-[rgba(245,166,35,0.2)] rounded-xl shadow-xl min-w-[160px] py-1"
              onMouseLeave={() => setShowMenu(false)}
            >
              <div className="px-3 py-1.5 text-[10px] font-bold text-[#FFFFFF]/30 uppercase tracking-wider">Mover a</div>
              {ADMIN_TAREA_STATUSES.filter(s => s !== tarea.status).map(s => (
                <button
                  key={s}
                  onClick={() => { onStatusChange(tarea.id, s); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-xs text-[#FFFFFF]/70 hover:bg-[#F5A623]/10 hover:text-[#F5A623] transition-colors"
                >
                  {ADMIN_TAREA_STATUS_LABELS[s]}
                </button>
              ))}
              <div className="border-t border-[rgba(245,166,35,0.1)] my-1" />
              <button
                onClick={() => { onEdit(tarea); setShowMenu(false); }}
                className="w-full text-left px-3 py-2 text-xs text-[#FFFFFF]/70 hover:bg-[#FFFFFF]/5 transition-colors"
              >
                Editar
              </button>
              <button
                onClick={() => { onDelete(tarea.id); setShowMenu(false); }}
                className="w-full text-left px-3 py-2 text-xs text-red-400 hover:bg-red-500/10 transition-colors"
              >
                Eliminar
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Título */}
      <p className="text-sm font-medium text-[#FFFFFF] leading-snug mb-2">{tarea.titulo}</p>

      {/* Descripción (truncada) */}
      {tarea.descripcion && (
        <p className="text-[11px] text-[#FFFFFF]/40 leading-relaxed mb-3 line-clamp-2">{tarea.descripcion}</p>
      )}

      {/* Cliente */}
      {tarea.cliente_nombre && (
        <div className="flex items-center gap-1.5 mb-2">
          <User className="w-3 h-3 text-[#F5A623]/60" />
          <span className="text-[10px] text-[#F5A623]/70">{tarea.cliente_nombre}</span>
        </div>
      )}

      {/* Footer: vencimiento + asignado */}
      <div className="flex items-center justify-between mt-2 pt-2 border-t border-[rgba(245,166,35,0.08)]">
        {fechaLabel ? (
          <div className={`flex items-center gap-1 text-[10px] ${isOverdue ? 'text-red-400' : 'text-[#FFFFFF]/40'}`}>
            {isOverdue && <AlertCircle className="w-3 h-3" />}
            {!isOverdue && <Calendar className="w-3 h-3" />}
            {fechaLabel}
          </div>
        ) : <div />}

        {tarea.asignado_nombre && (
          <div className="w-6 h-6 rounded-full bg-[#F5A623]/20 flex items-center justify-center text-[9px] font-bold text-[#F5A623]">
            {initials(tarea.asignado_nombre)}
          </div>
        )}
      </div>
    </div>
  );
}
