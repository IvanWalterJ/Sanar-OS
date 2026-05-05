/**
 * TaskKanbanView — Kanban de 4 columnas con drag-and-drop via @dnd-kit.
 * Cada columna tiene un header coloreado por status (gris / azul / ámbar / verde).
 */
import { useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { Circle, Loader2, Eye, CheckCircle2 } from 'lucide-react';
import type { AdminTarea, AdminTareaStatus } from '../../../lib/supabase';
import { ADMIN_TAREA_STATUSES, ADMIN_TAREA_STATUS_LABELS } from '../../../lib/supabase';
import { STATUS_COLORS } from '../../../lib/teamColors';
import TaskCard from './TaskCard';

interface TaskKanbanViewProps {
  tareas: AdminTarea[];
  currentUserId: string;
  onStatusChange: (id: string, status: AdminTareaStatus) => void;
  onEdit: (t: AdminTarea) => void;
  onDelete: (id: string) => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
}

const STATUS_ICONS: Record<AdminTareaStatus, React.ComponentType<{ className?: string }>> = {
  por_hacer: Circle,
  en_proceso: Loader2,
  en_revision: Eye,
  completadas: CheckCircle2,
};

function DraggableCard({
  tarea, currentUserId, onStatusChange, onEdit, onDelete, onArchive, onUnarchive,
}: {
  tarea: AdminTarea;
  currentUserId: string;
  onStatusChange: (id: string, status: AdminTareaStatus) => void;
  onEdit: (t: AdminTarea) => void;
  onDelete: (id: string) => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: tarea.id,
    data: { tarea },
  });

  return (
    <div ref={setNodeRef} {...attributes} {...listeners} className="touch-none">
      <TaskCard
        tarea={tarea}
        currentUserId={currentUserId}
        onStatusChange={onStatusChange}
        onEdit={onEdit}
        onDelete={onDelete}
        onArchive={onArchive}
        onUnarchive={onUnarchive}
        isDragging={isDragging}
      />
    </div>
  );
}

function DroppableColumn({
  status, tareas, currentUserId, onStatusChange, onEdit, onDelete, onArchive, onUnarchive,
}: {
  status: AdminTareaStatus;
  tareas: AdminTarea[];
  currentUserId: string;
  onStatusChange: (id: string, status: AdminTareaStatus) => void;
  onEdit: (t: AdminTarea) => void;
  onDelete: (id: string) => void;
  onArchive?: (id: string) => void;
  onUnarchive?: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });
  const color = STATUS_COLORS[status];
  const Icon = STATUS_ICONS[status];

  return (
    <div className="min-w-0 flex flex-col rounded-2xl">
      {/* Header coloreado por status */}
      <div
        className="flex items-center justify-between gap-3 px-3 py-3 rounded-t-2xl border-b border-[rgba(255,255,255,0.05)]"
        style={{ background: `linear-gradient(180deg, ${color.bg}, transparent 90%)` }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            style={{ backgroundColor: color.bg, borderColor: color.border, color: color.text }}
            className="w-9 h-9 rounded-lg flex items-center justify-center border-[1.5px] shrink-0"
          >
            <Icon className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold truncate" style={{ color: color.text }}>
              {ADMIN_TAREA_STATUS_LABELS[status]}
            </div>
            <div className="text-[11px] text-[#FFFFFF]/40">
              {tareas.length} {tareas.length === 1 ? 'tarea' : 'tareas'}
            </div>
          </div>
        </div>
      </div>

      {/* Drop zone */}
      <div
        ref={setNodeRef}
        className={`
          flex-1 min-h-[300px] rounded-b-2xl border border-t-0 p-2 space-y-2 transition-all
          ${isOver
            ? 'bg-[rgba(255,255,255,0.04)]'
            : 'bg-[#0F0F0F]/60'
          }
        `}
        style={{
          borderColor: isOver ? color.border : 'rgba(255,255,255,0.05)',
        }}
      >
        {tareas.map(t => (
          <DraggableCard
            key={t.id}
            tarea={t}
            currentUserId={currentUserId}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
            onDelete={onDelete}
            onArchive={onArchive}
            onUnarchive={onUnarchive}
          />
        ))}
        {tareas.length === 0 && (
          <div className="flex items-center justify-center h-32 text-[#FFFFFF]/15 text-xs">
            Arrastra tareas aquí
          </div>
        )}
      </div>
    </div>
  );
}

export default function TaskKanbanView({
  tareas, currentUserId, onStatusChange, onEdit, onDelete, onArchive, onUnarchive,
}: TaskKanbanViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  const byStatus = useMemo(() => {
    const map: Record<AdminTareaStatus, AdminTarea[]> = {
      por_hacer: [],
      en_proceso: [],
      en_revision: [],
      completadas: [],
    };
    for (const t of tareas) {
      if (map[t.status]) map[t.status].push(t);
    }
    return map;
  }, [tareas]);

  const activeTarea = activeId ? tareas.find(t => t.id === activeId) ?? null : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const overId = e.over?.id;
    if (!overId) return;
    const targetStatus = String(overId) as AdminTareaStatus;
    const dragId = String(e.active.id);
    const tarea = tareas.find(t => t.id === dragId);
    if (!tarea || tarea.status === targetStatus) return;
    onStatusChange(dragId, targetStatus);
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div
        className="grid gap-3 pb-4 w-full max-w-full"
        style={{ gridTemplateColumns: 'repeat(4, minmax(0, 1fr))' }}
      >
        {ADMIN_TAREA_STATUSES.map(col => (
          <DroppableColumn
            key={col}
            status={col}
            tareas={byStatus[col]}
            currentUserId={currentUserId}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
            onDelete={onDelete}
            onArchive={onArchive}
            onUnarchive={onUnarchive}
          />
        ))}
      </div>

      <DragOverlay dropAnimation={null}>
        {activeTarea ? (
          <div className="rotate-2 scale-105 shadow-2xl shadow-black/60 cursor-grabbing">
            <TaskCard
              tarea={activeTarea}
              currentUserId={currentUserId}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onDelete={onDelete}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
