/**
 * TaskCard — versión rediseñada estilo Trello/ClickUp.
 * - Tipografía 16px en título.
 * - Borde izquierdo de color por persona asignada (diferenciación visual).
 * - Avatar grande con la inicial del asignado, coloreado.
 * - Badge "creado por X" si el creador difiere del asignado.
 * - Fecha relativa ("vence en 2 días", "vencida hace 1 día").
 * - Chip de prioridad con color claro.
 * - Botón "Archivar" para tareas completadas.
 */
import { useState } from 'react';
import {
  MoreVertical, Calendar, User, AlertCircle, Trash2, UserPlus, Archive, ArchiveRestore,
} from 'lucide-react';
import type { AdminTarea, AdminTareaStatus } from '../../../lib/supabase';
import {
  ADMIN_TAREA_STATUSES,
  ADMIN_TAREA_STATUS_LABELS,
  ADMIN_TAREA_PRIORIDAD_LABELS,
} from '../../../lib/supabase';
import { getTeamColor, getInitials, UNASSIGNED_COLOR, PRIORITY_BG } from '../../../lib/teamColors';

interface TaskCardProps {
  tarea: AdminTarea;
  currentUserId: string;
  onStatusChange: (id: string, status: AdminTareaStatus) => void;
  onEdit: (tarea: AdminTarea) => void;
  onDelete: (id: string) => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
  /** Cuando se renderiza dentro de un sortable de dnd-kit, el wrapper provee drag handles. */
  isDragging?: boolean;
  /** Render compacto (vista lista). */
  compact?: boolean;
}

const PRIORIDAD_COLORS: Record<string, string> = {
  baja: 'bg-[#22C55E]/15 text-[#22C55E]',
  media: 'bg-[#F5A623]/15 text-[#F5A623]',
  alta: 'bg-orange-500/20 text-orange-400',
  urgente: 'bg-red-500/20 text-red-400',
};

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
  tarea, currentUserId, onStatusChange, onEdit, onDelete, onArchive, onUnarchive, isDragging, compact,
}: TaskCardProps) {
  const [showMenu, setShowMenu] = useState(false);

  const fechaInfo = tarea.fecha_vencimiento ? formatRelative(tarea.fecha_vencimiento) : null;
  const isOverdue = !!fechaInfo?.overdue && tarea.status !== 'completadas';
  const isArchivada = !!tarea.archivada_at;
  const isCompletada = tarea.status === 'completadas';

  const creadorDifiere =
    !!tarea.creado_por &&
    tarea.creado_por !== tarea.asignado_a &&
    tarea.creado_por !== currentUserId;

  const yoSoyCreadorYNoAsignado =
    tarea.creado_por === currentUserId && tarea.asignado_a !== currentUserId && !!tarea.asignado_a;

  const asignadoColor = getTeamColor(tarea.asignado_a, currentUserId);
  const creadorColor = getTeamColor(tarea.creado_por, currentUserId);

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
      style={{
        borderLeftColor: asignadoColor.solid,
        borderLeftWidth: 4,
        backgroundImage: PRIORITY_BG[tarea.prioridad].image,
      }}
      className={`
        bg-[#1A1A1A] border rounded-xl cursor-pointer
        hover:bg-[#1F1F1F]
        transition-all group relative overflow-hidden
        focus:outline-none focus:ring-2 focus:ring-[#F5A623]/20
        ${isDragging ? 'opacity-50 scale-95 shadow-2xl' : ''}
        ${isArchivada ? 'opacity-60' : ''}
        border-[rgba(255,255,255,0.08)] hover:border-[rgba(255,255,255,0.18)]
        ${compact ? 'p-3 pl-4' : 'p-4 pl-5'}
      `}
      title="Click para ver detalle"
    >
      {/* Header: prioridad + acciones */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <span className={`text-xs font-bold px-2.5 py-1 rounded-full shrink-0 ${PRIORIDAD_COLORS[tarea.prioridad]}`}>
            {ADMIN_TAREA_PRIORIDAD_LABELS[tarea.prioridad]}
          </span>
          {isArchivada && (
            <span
              title="Tarea archivada"
              className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-[#FFFFFF]/8 text-[#FFFFFF]/45 border border-[#FFFFFF]/10 flex items-center gap-1 shrink-0"
            >
              <Archive className="w-3 h-3" /> Archivada
            </span>
          )}
        </div>

        <div className="flex items-center gap-1" data-card-action>
          {yoSoyCreadorYNoAsignado && !isArchivada && (
            <span
              title="Vos creaste esta tarea"
              className="hidden sm:flex items-center gap-1 text-[10px] font-bold text-[#F5A623]/80 bg-[#F5A623]/10 px-2 py-0.5 rounded-full"
            >
              <UserPlus className="w-3 h-3" /> Creada por mí
            </span>
          )}

          {/* Quick archive/unarchive */}
          {isCompletada && onArchive && !isArchivada && (
            <button
              onClick={(e) => { e.stopPropagation(); onArchive(tarea.id); }}
              title="Archivar tarea"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#FFFFFF]/30 hover:text-[#F5A623] hover:bg-[#F5A623]/10 transition-all opacity-0 group-hover:opacity-100"
            >
              <Archive className="w-4 h-4" />
            </button>
          )}
          {isArchivada && onUnarchive && (
            <button
              onClick={(e) => { e.stopPropagation(); onUnarchive(tarea.id); }}
              title="Desarchivar tarea"
              className="w-7 h-7 rounded-lg flex items-center justify-center text-[#FFFFFF]/30 hover:text-[#F5A623] hover:bg-[#F5A623]/10 transition-all"
            >
              <ArchiveRestore className="w-4 h-4" />
            </button>
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
                {isCompletada && onArchive && !isArchivada && (
                  <button
                    onClick={() => { onArchive(tarea.id); setShowMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-[#FFFFFF]/70 hover:bg-[#F5A623]/10 hover:text-[#F5A623] transition-colors flex items-center gap-2"
                  >
                    <Archive className="w-3.5 h-3.5" /> Archivar
                  </button>
                )}
                {isArchivada && onUnarchive && (
                  <button
                    onClick={() => { onUnarchive(tarea.id); setShowMenu(false); }}
                    className="w-full text-left px-3 py-2 text-sm text-[#FFFFFF]/70 hover:bg-[#F5A623]/10 hover:text-[#F5A623] transition-colors flex items-center gap-2"
                  >
                    <ArchiveRestore className="w-3.5 h-3.5" /> Desarchivar
                  </button>
                )}
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
      <p className={`text-base font-semibold leading-snug mb-1.5 ${isCompletada ? 'text-[#FFFFFF]/50 line-through' : 'text-[#FFFFFF]'}`}>
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
      <div className="flex items-center justify-between mt-3 pt-3 border-t border-[rgba(255,255,255,0.06)]">
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
              style={{ backgroundColor: creadorColor.bg, borderColor: creadorColor.border, color: creadorColor.text }}
              className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold border"
            >
              {getInitials(tarea.creador_nombre)}
            </div>
          )}
          {tarea.asignado_a ? (
            <div
              title={`Asignada a ${tarea.asignado_nombre ?? 'sin nombre'}`}
              style={{ backgroundColor: asignadoColor.bg, borderColor: asignadoColor.border, color: asignadoColor.text }}
              className="w-8 h-8 rounded-full flex items-center justify-center text-[12px] font-bold border-[1.5px]"
            >
              {getInitials(tarea.asignado_nombre)}
            </div>
          ) : (
            <div
              title="Sin asignar"
              style={{ borderColor: UNASSIGNED_COLOR.border, color: UNASSIGNED_COLOR.text }}
              className="w-8 h-8 rounded-full bg-[#FFFFFF]/3 flex items-center justify-center border-2 border-dashed"
            >
              <User className="w-3.5 h-3.5" />
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
