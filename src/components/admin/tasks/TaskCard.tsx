/**
 * TaskCard — versión rediseñada estilo Trello/ClickUp.
 * - Tipografía 16px en título.
 * - Avatar del asignado + badge "creado por X" si difiere del asignado.
 * - Fecha relativa ("vence en 2 días", "vencida hace 1 día").
 * - Chip de prioridad con color claro.
 */
import { useState } from 'react';
import {
  MoreVertical, Calendar, User, AlertCircle, Trash2, UserPlus,
} from 'lucide-react';
import type { AdminTarea, AdminTareaStatus } from '../../../lib/supabase';
import {
  ADMIN_TAREA_STATUSES,
  ADMIN_TAREA_STATUS_LABELS,
  ADMIN_TAREA_PRIORIDAD_LABELS,
} from '../../../lib/supabase';

interface TaskCardProps {
  tarea: AdminTarea;
  currentUserId: string;
  onStatusChange: (id: string, status: AdminTareaStatus) => void;
  onEdit: (tarea: AdminTarea) => void;
  onDelete: (id: string) => void;
  /** Cuando se renderiza dentro de un sortable de dnd-kit, el wrapper provee drag handles. */
  isDragging?: boolean;
  /** Render compacto (vista lista). */
  compact?: boolean;
}

const PRIORIDAD_COLORS: Record<string, string> = {
  baja: 'bg-[#22C55E]/15 text-[#22C55E]',
  media: 'bg-[#F5A623]/15 text-[#F5A623]',
  alta: 'bg-orange-500/15 text-orange-400',
  urgente: 'bg-red-500/15 text-red-400',
};

function initials(name?: string | null): string {
  if (!name) return '?';
  return name.split(' ').map(p => p[0]).slice(0, 2).join('').toUpperCase();
}

function formatRelative(date: string): { label: string; overdue: boolean } {
  const target = new Date(date);
  const now = new Date();
  target.setHours(0, 0, 0, 0);
  now.setHours(0, 0, 0, 0);
  const diffMs = target.getTime() - now.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return { label: 'Vence hoy', overdue: false };
  if (diffDays === 1) return { label: 'Vence mañana', overdue: false };
  if (diffDays === -1) return { label: 'Vencida ayer', overdue: true };
  if (diffDays > 1 && diffDays <= 7) return { label: `Vence en ${diffDays} días`, overdue: false };
  if (diffDays < -1 && diffDays >= -7) return { label: `Vencida hace ${Math.abs(diffDays)} días`, overdue: true };
  const fmt = target.toLocaleDateString('es-AR', { day: 'numeric', month: 'short' });
  return { label: fmt, overdue: diffDays < 0 };
}

export default function TaskCard({
  tarea, currentUserId, onStatusChange, onEdit, onDelete, isDragging, compact,
}: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const fechaInfo = tarea.fecha_vencimiento ? formatRelative(tarea.fecha_vencimiento) : null;
  const isOverdue = !!fechaInfo?.overdue && tarea.status !== 'completadas';

  const creadorDifiere =
    !!tarea.creado_por &&
    tarea.creado_por !== tarea.asignado_a &&
    tarea.creado_por !== currentUserId;

  const yoSoyCreadorYNoAsignado =
    tarea.creado_por === currentUserId && tarea.asignado_a !== currentUserId && !!tarea.asignado_a;

  function handleCardClick(e: React.MouseEvent) {
    if ((e.target as HTMLElement).closest('[data-card-action]')) return;
    onEdit(tarea);
  }

  return (
    <div
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onEdit(tarea); } }}
      className={`
        bg-[#1A1A1A] border rounded-xl cursor-pointer
        hover:border-[rgba(245,166,35,0.4)] hover:bg-[#1F1F1F]
        transition-all group relative
        focus:outline-none focus:border-[#F5A623]/50 focus:ring-2 focus:ring-[#F5A623]/20
        ${isDragging ? 'opacity-50 scale-95 border-[#F5A623]/60 shadow-2xl' : 'border-[rgba(245,166,35,0.15)]'}
        ${compact ? 'p-3' : 'p-4'}
      `}
      title="Click para ver detalle"
    >
      {/* Header: prioridad + acciones */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PRIORIDAD_COLORS[tarea.prioridad]}`}>
          {ADMIN_TAREA_PRIORIDAD_LABELS[tarea.prioridad]}
        </span>

        <div className="flex items-center gap-1" data-card-action>
          {yoSoyCreadorYNoAsignado && (
            <span
              title="Vos creaste esta tarea"
              className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-[#F5A623]/80 bg-[#F5A623]/10 px-2 py-0.5 rounded-full"
            >
              <UserPlus className="w-3 h-3" /> Creada por mí
            </span>
          )}

          <button
            onClick={(e) => { e.stopPropagation(); onDelete(tarea.id); }}
            title="Eliminar tarea"
            className="w-7 h-7 rounded-lg flex items-center justify-center text-[#FFFFFF]/30 hover:text-red-400 hover:bg-red-500/10 transition-all opacity-0 group-hover:opacity-100"
          >
            <Trash2 className="w-4 h-4" />
          </button>

          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setShowMenu(v => !v); }}
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#FFFFFF]/30 hover:text-[#FFFFFF]/70 hover:bg-[#FFFFFF]/5 transition-all"
            >
              <MoreVertical className="w-4 h-4" />
            </button>

            {showMenu && (
              <div
                className="absolute right-0 top-8 z-20 bg-[#1E1E1E] border border-[rgba(245,166,35,0.2)] rounded-xl shadow-xl min-w-[180px] py-1"
                onMouseLeave={() => setShowMenu(false)}
                onClick={(e) => e.stopPropagation()}
              >
                <div className="px-3 py-1.5 text-[10px] font-bold text-[#FFFFFF]/30 uppercase tracking-wider">
                  Mover a
                </div>
                {ADMIN_TAREA_STATUSES.filter(s => s !== tarea.status).map(s => (
                  <button
                    key={s}
                    onClick={() => { onStatusChange(tarea.id, s); setShowMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-[#FFFFFF]/70 hover:bg-[#F5A623]/10 hover:text-[#F5A623] transition-colors"
                  >
                    {ADMIN_TAREA_STATUS_LABELS[s]}
                  </button>
                ))}
                <div className="border-t border-[rgba(245,166,35,0.1)] my-1" />
                <button
                  onClick={() => { onEdit(tarea); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-[#FFFFFF]/70 hover:bg-[#FFFFFF]/5 transition-colors"
                >
                  Ver / Editar
                </button>
                <button
                  onClick={() => { onDelete(tarea.id); setShowMenu(false); }}
                  className="w-full text-left px-3 py-2 text-sm text-red-400 hover:bg-red-500/10 transition-colors"
                >
                  Eliminar
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Título */}
      <p className="text-base font-semibold text-[#FFFFFF] leading-snug mb-1.5">
        {tarea.titulo}
      </p>

      {/* Descripción */}
      {tarea.descripcion && !compact && (
        <p className="text-sm text-[#FFFFFF]/55 leading-relaxed mb-3 line-clamp-2">
          {tarea.descripcion}
        </p>
      )}

      {/* Cliente */}
      {tarea.cliente_nombre && (
        <div className="flex items-center gap-1.5 mb-2">
          <User className="w-3.5 h-3.5 text-[#F5A623]/70" />
          <span className="text-xs text-[#F5A623]/80 font-medium">{tarea.cliente_nombre}</span>
        </div>
      )}

      {/* Footer */}
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgba(245,166,35,0.08)]">
        <div className="flex items-center gap-2 min-w-0">
          {fechaInfo ? (
            <div className={`flex items-center gap-1.5 text-xs font-medium truncate ${isOverdue ? 'text-red-400' : 'text-[#FFFFFF]/55'}`}>
              {isOverdue ? <AlertCircle className="w-3.5 h-3.5 shrink-0" /> : <Calendar className="w-3.5 h-3.5 shrink-0" />}
              <span className="truncate">{fechaInfo.label}</span>
            </div>
          ) : <span className="text-xs text-[#FFFFFF]/25">Sin vencimiento</span>}
        </div>

        <div className="flex items-center gap-1.5 shrink-0">
          {creadorDifiere && tarea.creador_nombre && (
            <div
              title={`Creada por ${tarea.creador_nombre}`}
              className="w-6 h-6 rounded-full bg-[#FFFFFF]/8 flex items-center justify-center text-[10px] font-bold text-[#FFFFFF]/50 border border-[#FFFFFF]/10"
            >
              {initials(tarea.creador_nombre)}
            </div>
          )}
          {tarea.asignado_nombre ? (
            <div
              title={`Asignada a ${tarea.asignado_nombre}`}
              className="w-7 h-7 rounded-full bg-[#F5A623]/20 flex items-center justify-center text-[11px] font-bold text-[#F5A623] border border-[#F5A623]/30"
            >
              {initials(tarea.asignado_nombre)}
            </div>
          ) : (
            <div
              title="Sin asignar"
              className="w-7 h-7 rounded-full bg-[#FFFFFF]/5 flex items-center justify-center text-[#FFFFFF]/30 border border-dashed border-[#FFFFFF]/15"
            >
              <User className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
