import { useState, useEffect, useCallback, useMemo } from 'react';
import { Plus, AlertCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import TaskModal from './TaskModal';
import ConfirmDialog from './ConfirmDialog';
import TaskCard from './tasks/TaskCard';
import TaskFiltersBar, { EMPTY_FILTERS, type TaskFilters } from './tasks/TaskFiltersBar';
import TaskViewToggle, { type TaskView } from './tasks/TaskViewToggle';
import TaskKanbanView from './tasks/TaskKanbanView';
import TaskListView from './tasks/TaskListView';
import type { AdminTarea, AdminTareaStatus, Profile } from '../../lib/supabase';
import {
  fetchAdminTareas,
  fetchTareasHoy,
  createAdminTarea,
  updateAdminTarea,
  updateAdminTareaStatus,
  deleteAdminTarea,
} from '../../lib/adminTasks';
import { notificarTareaAsignada } from '../../lib/notifications';

interface TasksPipelineProps {
  currentAdminId: string;
  adminRol: string;
  teamMembers: Profile[];
  clientes: Profile[];
}

function startOfWeek(d: Date): Date {
  const out = new Date(d);
  const day = out.getDay();
  const diff = (day === 0 ? -6 : 1) - day; // lunes
  out.setDate(out.getDate() + diff);
  out.setHours(0, 0, 0, 0);
  return out;
}

function endOfWeek(d: Date): Date {
  const out = startOfWeek(d);
  out.setDate(out.getDate() + 6);
  out.setHours(23, 59, 59, 999);
  return out;
}

export default function TasksPipeline({ currentAdminId, teamMembers, clientes }: TasksPipelineProps) {
  const [tareas, setTareas] = useState<AdminTarea[]>([]);
  const [tareasHoy, setTareasHoy] = useState<AdminTarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTarea, setEditingTarea] = useState<AdminTarea | null>(null);
  const [showHoy, setShowHoy] = useState(true);
  const [deletingTarea, setDeletingTarea] = useState<AdminTarea | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  const [view, setView] = useState<TaskView>('kanban');
  const [filters, setFilters] = useState<TaskFilters>({
    ...EMPTY_FILTERS,
    prioridades: new Set(),
    asignados: new Set(),
  });

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [all, hoy] = await Promise.all([
        fetchAdminTareas(),
        fetchTareasHoy(currentAdminId),
      ]);
      setTareas(all);
      setTareasHoy(hoy);
    } catch (err) {
      console.error('Error cargando tareas:', err);
      toast.error('Error cargando tareas');
    } finally {
      setLoading(false);
    }
  }, [currentAdminId]);

  useEffect(() => { cargar(); }, [cargar]);

  // Filtrado client-side. Las tareas ya vienen enriquecidas con asignado_nombre,
  // creador_nombre y cliente_nombre desde el RPC get_admin_tareas_with_users.
  const filtered = useMemo(() => {
    const now = new Date();
    const wkStart = startOfWeek(now);
    const wkEnd = endOfWeek(now);

    return tareas.filter(t => {
      // Vista "Mis tareas" → asignadas a mí O creadas por mí.
      if (view === 'mine') {
        if (t.asignado_a !== currentAdminId && t.creado_por !== currentAdminId) return false;
      }

      if (filters.asignadasAMi && t.asignado_a !== currentAdminId) return false;
      if (filters.creadasPorMi && t.creado_por !== currentAdminId) return false;

      if (filters.vencidas) {
        if (!t.fecha_vencimiento) return false;
        if (new Date(t.fecha_vencimiento) >= now) return false;
        if (t.status === 'completadas') return false;
      }

      if (filters.estaSemana) {
        if (!t.fecha_vencimiento) return false;
        const fv = new Date(t.fecha_vencimiento);
        if (fv < wkStart || fv > wkEnd) return false;
      }

      if (filters.prioridades.size > 0 && !filters.prioridades.has(t.prioridad)) return false;
      if (filters.asignados.size > 0 && (!t.asignado_a || !filters.asignados.has(t.asignado_a))) return false;

      return true;
    });
  }, [tareas, view, filters, currentAdminId]);

  const myCount = useMemo(
    () => tareas.filter(t => t.asignado_a === currentAdminId || t.creado_por === currentAdminId).length,
    [tareas, currentAdminId],
  );

  async function handleStatusChange(id: string, status: AdminTareaStatus) {
    setTareas(prev => prev.map(t => t.id === id ? { ...t, status } : t));
    try {
      await updateAdminTareaStatus(id, status);
      await cargar();
    } catch {
      toast.error('Error al mover la tarea');
      await cargar();
    }
  }

  async function handleSave(data: Parameters<typeof createAdminTarea>[0] & { status: AdminTareaStatus }) {
    const adminNombre = teamMembers.find(m => m.id === currentAdminId)?.nombre ?? 'El equipo';
    if (editingTarea) {
      await updateAdminTarea(editingTarea.id, data);
      toast.success('Tarea actualizada');
      if (data.asignado_a && data.asignado_a !== editingTarea.asignado_a && data.asignado_a !== currentAdminId) {
        notificarTareaAsignada(data.asignado_a, data.titulo, adminNombre).catch(() => null);
      }
    } else {
      await createAdminTarea({ ...data, creado_por: currentAdminId });
      toast.success('Tarea creada');
      if (data.asignado_a && data.asignado_a !== currentAdminId) {
        notificarTareaAsignada(data.asignado_a, data.titulo, adminNombre).catch(() => null);
      }
    }
    await cargar();
    setEditingTarea(null);
  }

  function handleDelete(id: string) {
    const tarea = tareas.find(t => t.id === id);
    if (!tarea) return;
    setDeletingTarea(tarea);
  }

  async function confirmDelete() {
    if (!deletingTarea) return;
    const id = deletingTarea.id;
    const snapshot = tareas;
    setDeleteLoading(true);
    setTareas(prev => prev.filter(t => t.id !== id));
    setTareasHoy(prev => prev.filter(t => t.id !== id));
    try {
      await deleteAdminTarea(id);
      toast.success('Tarea eliminada');
      setDeletingTarea(null);
      cargar().catch(() => null);
    } catch (err) {
      setTareas(snapshot);
      const msg = err instanceof Error ? err.message : 'No se pudo eliminar la tarea';
      toast.error(msg);
    } finally {
      setDeleteLoading(false);
    }
  }

  const overdueCount = tareasHoy.filter(t => t.fecha_vencimiento && new Date(t.fecha_vencimiento) < new Date()).length;

  return (
    <div className="space-y-5 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-semibold text-[#FFFFFF]">Tareas</h2>
          <p className="text-xs text-[#FFFFFF]/40 mt-1">Gestión interna del equipo</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <TaskViewToggle value={view} onChange={setView} myCount={myCount} />
          <button
            onClick={cargar}
            title="Refrescar"
            className="w-9 h-9 rounded-lg flex items-center justify-center text-[#FFFFFF]/40 hover:text-[#FFFFFF] hover:bg-[#FFFFFF]/5 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setEditingTarea(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#F5A623] hover:bg-[#FFB94D] text-black text-sm font-bold transition-all"
          >
            <Plus className="w-4 h-4" /> Nueva tarea
          </button>
        </div>
      </div>

      {/* Vista Hoy (banner colapsable) */}
      {tareasHoy.length > 0 && (
        <div className="bg-[#141414] border border-[rgba(245,166,35,0.2)] rounded-2xl overflow-hidden">
          <button
            onClick={() => setShowHoy(v => !v)}
            className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-[#FFFFFF]/5 transition-colors"
          >
            <div className="flex items-center gap-3">
              {overdueCount > 0 && <AlertCircle className="w-4 h-4 text-red-400" />}
              <span className="text-sm font-semibold text-[#FFFFFF]">
                Mis tareas de hoy
              </span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-bold ${overdueCount > 0 ? 'bg-red-500/20 text-red-400' : 'bg-[#F5A623]/20 text-[#F5A623]'}`}>
                {tareasHoy.length}
              </span>
            </div>
            {showHoy ? <ChevronUp className="w-4 h-4 text-[#FFFFFF]/40" /> : <ChevronDown className="w-4 h-4 text-[#FFFFFF]/40" />}
          </button>

          {showHoy && (
            <div className="px-5 pb-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 border-t border-[rgba(245,166,35,0.1)]" style={{ paddingTop: '16px' }}>
              {tareasHoy.map(t => (
                <TaskCard
                  key={t.id}
                  tarea={t}
                  currentUserId={currentAdminId}
                  onStatusChange={handleStatusChange}
                  onEdit={tarea => { setEditingTarea(tarea); setShowModal(true); }}
                  onDelete={handleDelete}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Filtros */}
      <TaskFiltersBar
        filters={filters}
        onChange={setFilters}
        teamMembers={teamMembers}
      />

      {/* Body — vista activa */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-[#FFFFFF]/30 text-sm">
          Cargando tareas...
        </div>
      ) : view === 'list' ? (
        <TaskListView
          tareas={filtered}
          currentUserId={currentAdminId}
          onStatusChange={handleStatusChange}
          onEdit={t => { setEditingTarea(t); setShowModal(true); }}
          onDelete={handleDelete}
        />
      ) : (
        <TaskKanbanView
          tareas={filtered}
          currentUserId={currentAdminId}
          onStatusChange={handleStatusChange}
          onEdit={t => { setEditingTarea(t); setShowModal(true); }}
          onDelete={handleDelete}
        />
      )}

      {/* Modal crear/editar */}
      {showModal && (
        <TaskModal
          tarea={editingTarea}
          teamMembers={teamMembers}
          clientes={clientes}
          currentAdminId={currentAdminId}
          onSave={handleSave as Parameters<typeof TaskModal>[0]['onSave']}
          onClose={() => { setShowModal(false); setEditingTarea(null); }}
        />
      )}

      <ConfirmDialog
        open={deletingTarea !== null}
        variant="danger"
        title="Eliminar tarea"
        message={deletingTarea ? `¿Seguro que querés eliminar «${deletingTarea.titulo}»? Esta acción no se puede deshacer.` : ''}
        confirmLabel="Eliminar"
        cancelLabel="Cancelar"
        loading={deleteLoading}
        onConfirm={confirmDelete}
        onCancel={() => { if (!deleteLoading) setDeletingTarea(null); }}
      />
    </div>
  );
}
