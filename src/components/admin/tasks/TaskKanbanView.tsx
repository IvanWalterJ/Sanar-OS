/**
 * TaskKanbanView — Kanban de 4 columnas con drag-and-drop via @dnd-kit.
 */
import { useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import type { AdminTarea, AdminTareaStatus } from '../../../lib/supabase';
import { ADMIN_TAREA_STATUSES, ADMIN_TAREA_STATUS_LABELS } from '../../../lib/supabase';
import TaskCard from './TaskCard';

interface TaskKanbanViewProps {
  tareas: AdminTarea[];
  currentUserId: string;
  onStatusChange: (id: string, status: AdminTareaStatus) => void;
  onEdit: (t: AdminTarea) => void;
  onDelete: (id: string) => void;
}

function DraggableCard({
  tarea, currentUserId, onStatusChange, onEdit, onDelete,
}: {
  tarea: AdminTarea;
  currentUserId: string;
  onStatusChange: (id: string, status: AdminTareaStatus) => void;
  onEdit: (t: AdminTarea) => void;
  onDelete: (id: string) => void;
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
        isDragging={isDragging}
      />
    </div>
  );
}

function DroppableColumn({
  status, tareas, currentUserId, onStatusChange, onEdit, onDelete,
}: {
  status: AdminTareaStatus;
  tareas: AdminTarea[];
  currentUserId: string;
  onStatusChange: (id: string, status: AdminTareaStatus) => void;
  onEdit: (t: AdminTarea) => void;
  onDelete: (id: string) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: status });

  return (
    <div className="min-w-0 flex flex-col">
      <div className={`flex items-center justify-between gap-2 mb-3 px-1 transition-colors ${isOver ? 'text-[#F5A623]' : ''}`}>
        <span className="text-xs font-bold text-[#FFFFFF]/70 uppercase tracking-wider truncate">
          {ADMIN_TAREA_STATUS_LABELS[status]}
        </span>
        <span className="shrink-0 text-[10px] bg-[#FFFFFF]/5 text-[#FFFFFF]/40 px-2 py-0.5 rounded-full font-bold">
          {tareas.length}
        </span>
      </div>
      <div
        ref={setNodeRef}
        className={`
          min-h-[300px] rounded-xl border-2 p-2 space-y-2 transition-all flex-1
          ${isOver
            ? 'border-[#F5A623]/50 bg-[#F5A623]/5'
            : 'border-dashed border-[rgba(245,166,35,0.12)] bg-[#0A0A0A]/30'
          }
        `}
      >
        {tareas.map(t => (
          <DraggableCard
            key={t.id}
            tarea={t}
            currentUserId={currentUserId}
            onStatusChange={onStatusChange}
            onEdit={onEdit}
            onDelete={onDelete}
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
  tareas, currentUserId, onStatusChange, onEdit, onDelete,
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
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
