import { useState, useEffect, useCallback } from 'react';
import { Plus, AlertCircle, ChevronDown, ChevronUp, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';
import TaskCard from './TaskCard';
import TaskModal from './TaskModal';
import type { AdminTarea, AdminTareaStatus, Profile } from '../../lib/supabase';
import { ADMIN_TAREA_STATUSES, ADMIN_TAREA_STATUS_LABELS } from '../../lib/supabase';
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

export default function TasksPipeline({ currentAdminId, adminRol, teamMembers, clientes }: TasksPipelineProps) {
  const [tareas, setTareas] = useState<AdminTarea[]>([]);
  const [tareasHoy, setTareasHoy] = useState<AdminTarea[]>([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTarea, setEditingTarea] = useState<AdminTarea | null>(null);
  const [showHoy, setShowHoy] = useState(true);
  const [dragOverColumn, setDragOverColumn] = useState<AdminTareaStatus | null>(null);
  const [draggingId, setDraggingId] = useState<string | null>(null);

  const cargar = useCallback(async () => {
    setLoading(true);
    try {
      const [all, hoy] = await Promise.all([
        fetchAdminTareas(),
        fetchTareasHoy(currentAdminId),
      ]);
      setTareas(all);
      setTareasHoy(hoy);
    } catch {
      toast.error('Error cargando tareas');
    } finally {
      setLoading(false);
    }
  }, [currentAdminId]);

  useEffect(() => { cargar(); }, [cargar]);

  // Enrich tareas with names from teamMembers/clientes
  const enriched = tareas.map(t => ({
    ...t,
    asignado_nombre: teamMembers.find(m => m.id === t.asignado_a)?.nombre,
    cliente_nombre: clientes.find(c => c.id === t.cliente_id)?.nombre,
  }));

  const byStatus = (status: AdminTareaStatus) =>
    enriched.filter(t => t.status === status);

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

  async function handleDelete(id: string) {
    if (!window.confirm('¿Eliminar esta tarea?')) return;
    await deleteAdminTarea(id);
    await cargar();
    toast.success('Tarea eliminada');
  }

  // Drag and drop
  function handleDragStart(e: React.DragEvent, id: string) {
    setDraggingId(id);
    e.dataTransfer.effectAllowed = 'move';
  }

  function handleDragOver(e: React.DragEvent, col: AdminTareaStatus) {
    e.preventDefault();
    setDragOverColumn(col);
  }

  function handleDrop(e: React.DragEvent, col: AdminTareaStatus) {
    e.preventDefault();
    setDragOverColumn(null);
    if (draggingId) handleStatusChange(draggingId, col);
    setDraggingId(null);
  }

  const overdueCount = tareasHoy.filter(t => t.fecha_vencimiento && new Date(t.fecha_vencimiento) < new Date()).length;

  return (
    <div className="space-y-6 w-full max-w-full overflow-x-hidden">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-[#FFFFFF]">Pipeline de Tareas</h2>
          <p className="text-xs text-[#FFFFFF]/40 mt-1">Gestión interna del equipo</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={cargar}
            className="w-8 h-8 rounded-lg flex items-center justify-center text-[#FFFFFF]/40 hover:text-[#FFFFFF] hover:bg-[#FFFFFF]/5 transition-all"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={() => { setEditingTarea(null); setShowModal(true); }}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F5A623] hover:bg-[#FFB94D] text-black text-sm font-bold transition-all"
          >
            <Plus className="w-4 h-4" /> Nueva tarea
          </button>
        </div>
      </div>

      {/* Vista Hoy */}
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
                  tarea={{ ...t, asignado_nombre: teamMembers.find(m => m.id === t.asignado_a)?.nombre }}
                  onStatusChange={handleStatusChange}
                  onEdit={tarea => { setEditingTarea(tarea); setShowModal(true); }}
                  onDelete={handleDelete}
                  onDragStart={handleDragStart}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {/* Kanban */}
      {loading ? (
        <div className="flex items-center justify-center h-48 text-[#FFFFFF]/30 text-sm">Cargando...</div>
      ) : (
        <div
          className="grid gap-2 pb-4 w-full max-w-full"
          style={{ gridTemplateColumns: 'repeat(6, minmax(0, 1fr))' }}
        >
          {ADMIN_TAREA_STATUSES.map(col => {
            const colTareas = byStatus(col);
            const isDragOver = dragOverColumn === col;

            return (
              <div
                key={col}
                className="min-w-0"
                onDragOver={e => handleDragOver(e, col)}
                onDragLeave={() => setDragOverColumn(null)}
                onDrop={e => handleDrop(e, col)}
              >
                {/* Column header */}
                <div className={`flex items-center justify-between gap-1 mb-3 px-1 transition-colors ${isDragOver ? 'text-[#F5A623]' : ''}`}>
                  <span className="text-[11px] font-bold text-[#FFFFFF]/60 uppercase tracking-wider truncate">
                    {ADMIN_TAREA_STATUS_LABELS[col]}
                  </span>
                  <span className="shrink-0 text-[10px] bg-[#FFFFFF]/5 text-[#FFFFFF]/30 px-2 py-0.5 rounded-full font-bold">
                    {colTareas.length}
                  </span>
                </div>

                {/* Drop zone */}
                <div
                  className={`min-h-[200px] rounded-xl border-2 transition-all p-2 space-y-2 ${
                    isDragOver
                      ? 'border-[#F5A623]/50 bg-[#F5A623]/5'
                      : 'border-dashed border-[rgba(245,166,35,0.1)] bg-[#0A0A0A]/30'
                  }`}
                >
                  {colTareas.map(t => (
                    <TaskCard
                      key={t.id}
                      tarea={t}
                      onStatusChange={handleStatusChange}
                      onEdit={tarea => { setEditingTarea(tarea); setShowModal(true); }}
                      onDelete={handleDelete}
                      onDragStart={handleDragStart}
                    />
                  ))}

                  {colTareas.length === 0 && !isDragOver && (
                    <div className="flex items-center justify-center h-24 text-[#FFFFFF]/15 text-xs">
                      Sin tareas
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
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
    </div>
  );
}
