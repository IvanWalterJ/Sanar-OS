import { useState } from 'react';
import { X, Loader2 } from 'lucide-react';
import type { AdminTarea, AdminTareaStatus, AdminTareaPrioridad } from '../../lib/supabase';
import { ADMIN_TAREA_STATUS_LABELS, ADMIN_TAREA_PRIORIDAD_LABELS, ADMIN_TAREA_STATUSES } from '../../lib/supabase';
import type { Profile } from '../../lib/supabase';
import CustomSelect from '../CustomSelect';

interface TaskModalProps {
  tarea?: AdminTarea | null;
  teamMembers: Profile[];
  clientes: Profile[];
  currentAdminId: string;
  onSave: (data: {
    titulo: string;
    descripcion: string;
    asignado_a: string | null;
    cliente_id: string | null;
    prioridad: AdminTareaPrioridad;
    fecha_vencimiento: string | null;
    status: AdminTareaStatus;
  }) => Promise<void>;
  onClose: () => void;
}

const PRIORIDADES: AdminTareaPrioridad[] = ['baja', 'media', 'alta', 'urgente'];

export default function TaskModal({ tarea, teamMembers, clientes, currentAdminId, onSave, onClose }: TaskModalProps) {
  const [titulo, setTitulo] = useState(tarea?.titulo ?? '');
  const [descripcion, setDescripcion] = useState(tarea?.descripcion ?? '');
  const [asignadoA, setAsignadoA] = useState<string>(tarea?.asignado_a ?? currentAdminId);
  const [clienteId, setClienteId] = useState<string>(tarea?.cliente_id ?? '');
  const [prioridad, setPrioridad] = useState<AdminTareaPrioridad>(tarea?.prioridad ?? 'media');
  const [status, setStatus] = useState<AdminTareaStatus>(tarea?.status ?? 'por_hacer');
  const [fechaVencimiento, setFechaVencimiento] = useState(tarea?.fecha_vencimiento ?? '');
  const [saving, setSaving] = useState(false);

  const isEditing = !!tarea;

  async function handleSubmit() {
    if (!titulo.trim()) return;
    setSaving(true);
    try {
      await onSave({
        titulo: titulo.trim(),
        descripcion: descripcion.trim(),
        asignado_a: asignadoA || null,
        cliente_id: clienteId || null,
        prioridad,
        fecha_vencimiento: fechaVencimiento || null,
        status,
      });
      onClose();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-[#141414] border border-[rgba(245,166,35,0.2)] rounded-2xl w-full max-w-lg shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[rgba(245,166,35,0.1)]">
          <h2 className="text-base font-semibold text-[#FFFFFF]">
            {isEditing ? 'Editar tarea' : 'Nueva tarea'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#FFFFFF]/40 hover:text-[#FFFFFF] hover:bg-[#FFFFFF]/5 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4">
          {/* Título */}
          <div>
            <label className="block text-[10px] font-bold text-[#FFFFFF]/40 uppercase tracking-wider mb-1.5">Título *</label>
            <input
              type="text"
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="¿Qué hay que hacer?"
              className="w-full bg-[#0A0A0A] border border-[rgba(245,166,35,0.2)] rounded-xl px-4 py-2.5 text-sm text-[#FFFFFF] placeholder-[#FFFFFF]/20 focus:outline-none focus:border-[#F5A623]/50 transition-colors"
            />
          </div>

          {/* Descripción */}
          <div>
            <label className="block text-[10px] font-bold text-[#FFFFFF]/40 uppercase tracking-wider mb-1.5">Descripción</label>
            <textarea
              value={descripcion}
              onChange={e => setDescripcion(e.target.value)}
              placeholder="Contexto o detalles adicionales..."
              rows={3}
              className="w-full bg-[#0A0A0A] border border-[rgba(245,166,35,0.2)] rounded-xl px-4 py-2.5 text-sm text-[#FFFFFF] placeholder-[#FFFFFF]/20 focus:outline-none focus:border-[#F5A623]/50 transition-colors resize-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Asignado a */}
            <div>
              <label className="block text-[10px] font-bold text-[#FFFFFF]/40 uppercase tracking-wider mb-1.5">Asignar a</label>
              <CustomSelect
                value={asignadoA}
                onChange={setAsignadoA}
                placeholder="Sin asignar"
                options={[
                  { value: '', label: 'Sin asignar' },
                  ...teamMembers.map(m => ({ value: m.id, label: m.nombre ?? m.email })),
                ]}
              />
            </div>

            {/* Prioridad */}
            <div>
              <label className="block text-[10px] font-bold text-[#FFFFFF]/40 uppercase tracking-wider mb-1.5">Prioridad</label>
              <CustomSelect
                value={prioridad}
                onChange={v => setPrioridad(v as AdminTareaPrioridad)}
                options={PRIORIDADES.map(p => ({ value: p, label: ADMIN_TAREA_PRIORIDAD_LABELS[p] }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Estado */}
            <div>
              <label className="block text-[10px] font-bold text-[#FFFFFF]/40 uppercase tracking-wider mb-1.5">Estado</label>
              <CustomSelect
                value={status}
                onChange={v => setStatus(v as AdminTareaStatus)}
                options={ADMIN_TAREA_STATUSES.map(s => ({ value: s, label: ADMIN_TAREA_STATUS_LABELS[s] }))}
              />
            </div>

            {/* Fecha vencimiento */}
            <div>
              <label className="block text-[10px] font-bold text-[#FFFFFF]/40 uppercase tracking-wider mb-1.5">Vence el</label>
              <input
                type="date"
                value={fechaVencimiento}
                onChange={e => setFechaVencimiento(e.target.value)}
                className="w-full bg-[#0A0A0A] border border-[rgba(245,166,35,0.2)] rounded-xl px-3 py-2.5 text-sm text-[#FFFFFF] focus:outline-none focus:border-[#F5A623]/50 transition-colors"
              />
            </div>
          </div>

          {/* Cliente (opcional) */}
          <div>
            <label className="block text-[10px] font-bold text-[#FFFFFF]/40 uppercase tracking-wider mb-1.5">Cliente relacionado <span className="normal-case font-normal">(opcional)</span></label>
            <CustomSelect
              value={clienteId}
              onChange={setClienteId}
              placeholder="Sin cliente"
              options={[
                { value: '', label: 'Sin cliente' },
                ...clientes.map(c => ({ value: c.id, label: c.nombre ?? c.email })),
              ]}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-[rgba(245,166,35,0.1)]">
          <button onClick={onClose} className="px-4 py-2.5 rounded-xl text-sm text-[#FFFFFF]/40 hover:text-[#FFFFFF] transition-colors">
            Cancelar
          </button>
          <button
            onClick={handleSubmit}
            disabled={!titulo.trim() || saving}
            className="px-6 py-2.5 rounded-xl bg-[#F5A623] hover:bg-[#FFB94D] disabled:opacity-50 text-black text-sm font-bold transition-all flex items-center gap-2"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
            {isEditing ? 'Guardar cambios' : 'Crear tarea'}
          </button>
        </div>
      </div>
    </div>
  );
}
