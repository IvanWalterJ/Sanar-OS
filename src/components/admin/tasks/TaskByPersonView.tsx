/**
 * TaskByPersonView — vista en columnas, una por miembro del equipo.
 * Cada columna agrupa internamente las tareas de la persona por horizonte temporal:
 * Vencidas, Hoy, Esta semana, Después, Sin fecha.
 *
 * Drag-and-drop reasigna la tarea al dropear sobre otra columna.
 */
import { useMemo, useState } from 'react';
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from '@dnd-kit/core';
import { useDroppable, useDraggable } from '@dnd-kit/core';
import { Users } from 'lucide-react';
import type { AdminTarea, AdminTareaStatus, Profile } from '../../../lib/supabase';
import { updateAdminTarea } from '../../../lib/adminTasks';
import { toast } from 'sonner';
import TaskCard from './TaskCard';
import { getTeamColor, getInitials, UNASSIGNED_COLOR } from '../../../lib/teamColors';

interface TaskByPersonViewProps {
  tareas: AdminTarea[];
  teamMembers: Profile[];
  currentUserId: string;
  onStatusChange: (id: string, status: AdminTareaStatus) => void;
  onEdit: (t: AdminTarea) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
  onReassign: () => void; // refresh callback
}

type Bucket = 'vencidas' | 'hoy' | 'semana' | 'despues' | 'sinfecha';

const BUCKET_LABELS: Record<Bucket, string> = {
  vencidas: 'Vencidas',
  hoy: 'Hoy',
  semana: 'Esta semana',
  despues: 'Después',
  sinfecha: 'Sin fecha',
};

const BUCKET_ORDER: Bucket[] = ['vencidas', 'hoy', 'semana', 'despues', 'sinfecha'];

function startOfDay(d: Date): Date {
  const out = new Date(d);
  out.setHours(0, 0, 0, 0);
  return out;
}

function getBucket(t: AdminTarea): Bucket {
  if (!t.fecha_vencimiento) return 'sinfecha';
  const fv = startOfDay(new Date(t.fecha_vencimiento));
  const today = startOfDay(new Date());
  const diff = Math.round((fv.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  if (diff < 0) return t.status === 'completadas' ? 'sinfecha' : 'vencidas';
  if (diff === 0) return 'hoy';
  if (diff <= 7) return 'semana';
  return 'despues';
}

function DraggableCard({
  tarea, currentUserId, onStatusChange, onEdit, onDelete, onArchive, onUnarchive,
}: {
  tarea: AdminTarea;
  currentUserId: string;
  onStatusChange: (id: string, status: AdminTareaStatus) => void;
  onEdit: (t: AdminTarea) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
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
        compact
      />
    </div>
  );
}

interface PersonColumnProps {
  personId: string | null;
  personName: string;
  tareas: AdminTarea[];
  currentUserId: string;
  onStatusChange: (id: string, status: AdminTareaStatus) => void;
  onEdit: (t: AdminTarea) => void;
  onDelete: (id: string) => void;
  onArchive: (id: string) => void;
  onUnarchive: (id: string) => void;
}

function PersonColumn({
  personId, personName, tareas, currentUserId,
  onStatusChange, onEdit, onDelete, onArchive, onUnarchive,
}: PersonColumnProps) {
  const dropId = personId ?? '__unassigned__';
  const { setNodeRef, isOver } = useDroppable({ id: dropId, data: { personId } });

  const color = personId ? getTeamColor(personId, currentUserId) : UNASSIGNED_COLOR;

  const grouped = useMemo(() => {
    const map: Record<Bucket, AdminTarea[]> = {
      vencidas: [], hoy: [], semana: [], despues: [], sinfecha: [],
    };
    for (const t of tareas) {
      map[getBucket(t)].push(t);
    }
    // Cada bucket: ordenar por fecha asc
    for (const k of BUCKET_ORDER) {
      map[k].sort((a, b) => {
        const av = a.fecha_vencimiento ? new Date(a.fecha_vencimiento).getTime() : Infinity;
        const bv = b.fecha_vencimiento ? new Date(b.fecha_vencimiento).getTime() : Infinity;
        return av - bv;
      });
    }
    return map;
  }, [tareas]);

  const activeCount = tareas.filter(t => t.status !== 'completadas').length;

  return (
    <div
      className={`min-w-0 flex flex-col rounded-2xl transition-all ${isOver ? 'ring-2 ring-offset-2 ring-offset-[#0A0A0A]' : ''}`}
      style={isOver ? { boxShadow: `0 0 0 2px ${color.solid}` } : undefined}
    >
      {/* Column header */}
      <div
        className="flex items-center justify-between gap-3 px-3 py-3 rounded-t-2xl border-b border-[rgba(255,255,255,0.05)]"
        style={{ background: `linear-gradient(180deg, ${color.bg}, transparent 90%)` }}
      >
        <div className="flex items-center gap-2.5 min-w-0">
          <div
            style={{ backgroundColor: color.bg, borderColor: color.border, color: color.text }}
            className="w-9 h-9 rounded-lg flex items-center justify-center text-sm font-bold border-[1.5px] shrink-0"
          >
            {personId ? getInitials(personName) : <Users className="w-4 h-4" />}
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-[#FFFFFF] truncate" style={{ color: color.text }}>
              {personName}
            </div>
            <div className="text-[11px] text-[#FFFFFF]/40">
              {activeCount} activa{activeCount === 1 ? '' : 's'}
              {tareas.length !== activeCount && ` · ${tareas.length - activeCount} compl.`}
            </div>
          </div>
        </div>
      </div>

      {/* Drop zone con buckets */}
      <div
        ref={setNodeRef}
        className="flex-1 min-h-[300px] rounded-b-2xl bg-[#0F0F0F]/60 border border-t-0 border-[rgba(255,255,255,0.05)] p-2 space-y-3"
      >
        {tareas.length === 0 ? (
          <div className="flex items-center justify-center h-32 text-[#FFFFFF]/15 text-xs px-3 text-center">
            Sin tareas asignadas. Arrastrá una acá para reasignar.
          </div>
        ) : (
          BUCKET_ORDER.map(bucket => {
            const items = grouped[bucket];
            if (items.length === 0) return null;
            const isVencidas = bucket === 'vencidas';
            return (
              <div key={bucket} className="space-y-2">
                <div className="flex items-center justify-between px-2">
                  <span className={`text-[10px] font-bold uppercase tracking-wider ${isVencidas ? 'text-red-400' : 'text-[#FFFFFF]/40'}`}>
                    {BUCKET_LABELS[bucket]}
                  </span>
                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${isVencidas ? 'bg-red-500/15 text-red-400' : 'bg-[#FFFFFF]/5 text-[#FFFFFF]/40'}`}>
                    {items.length}
                  </span>
                </div>
                <div className="space-y-2">
                  {items.map(t => (
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
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

export default function TaskByPersonView({
  tareas, teamMembers, currentUserId, onStatusChange, onEdit, onDelete,
  onArchive, onUnarchive, onReassign,
}: TaskByPersonViewProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
  );

  // Ordenar miembros: el currentUser primero
  const orderedMembers = useMemo(() => {
    const me = teamMembers.find(m => m.id === currentUserId);
    const others = teamMembers
      .filter(m => m.id !== currentUserId)
      .sort((a, b) => (a.nombre ?? '').localeCompare(b.nombre ?? ''));
    return me ? [me, ...others] : teamMembers;
  }, [teamMembers, currentUserId]);

  const byPerson = useMemo(() => {
    const map = new Map<string | null, AdminTarea[]>();
    map.set(null, []); // sin asignar
    for (const m of orderedMembers) map.set(m.id, []);
    for (const t of tareas) {
      const key = t.asignado_a;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(t);
    }
    return map;
  }, [tareas, orderedMembers]);

  const sinAsignar = byPerson.get(null) ?? [];

  const activeTarea = activeId ? tareas.find(t => t.id === activeId) ?? null : null;

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  async function handleDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const overId = e.over?.id;
    if (!overId) return;
    const dragId = String(e.active.id);
    const tarea = tareas.find(t => t.id === dragId);
    if (!tarea) return;
    const targetPersonId = overId === '__unassigned__' ? null : String(overId);
    if (tarea.asignado_a === targetPersonId) return;
    try {
      await updateAdminTarea(tarea.id, { asignado_a: targetPersonId });
      const targetName = targetPersonId
        ? orderedMembers.find(m => m.id === targetPersonId)?.nombre ?? 'el equipo'
        : 'sin asignar';
      toast.success(`Reasignada a ${targetName}`);
      onReassign();
    } catch {
      toast.error('No se pudo reasignar la tarea');
    }
  }

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      onDragCancel={() => setActiveId(null)}
    >
      <div className="overflow-x-auto pb-4">
        <div
          className="grid gap-3 min-w-fit"
          style={{
            gridTemplateColumns: `repeat(${orderedMembers.length + (sinAsignar.length > 0 ? 1 : 0)}, minmax(280px, 1fr))`,
          }}
        >
          {orderedMembers.map(m => (
            <PersonColumn
              key={m.id}
              personId={m.id}
              personName={m.id === currentUserId ? `${m.nombre ?? 'Yo'} (vos)` : m.nombre ?? 'Sin nombre'}
              tareas={byPerson.get(m.id) ?? []}
              currentUserId={currentUserId}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onDelete={onDelete}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
            />
          ))}
          {sinAsignar.length > 0 && (
            <PersonColumn
              key="__unassigned__"
              personId={null}
              personName="Sin asignar"
              tareas={sinAsignar}
              currentUserId={currentUserId}
              onStatusChange={onStatusChange}
              onEdit={onEdit}
              onDelete={onDelete}
              onArchive={onArchive}
              onUnarchive={onUnarchive}
            />
          )}
        </div>
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
              compact
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
