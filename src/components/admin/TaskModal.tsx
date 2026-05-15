import { useState } from 'react';
import { X, Loader2, UserPlus } from 'lucide-react';
import type { AdminTarea, AdminTareaStatus, AdminTareaPrioridad } from '../../lib/supabase';
import { ADMIN_TAREA_STATUS_LABELS, ADMIN_TAREA_PRIORIDAD_LABELS, ADMIN_TAREA_STATUSES } from '../../lib/supabase';
import type { Profile } from '../../lib/supabase';
import CustomSelect from '../CustomSelect';
import TaskDescriptionEditor from '../editor/TaskDescriptionEditor';
import TaskComments from '../tasks/TaskComments';
import TaskAttachments from '../tasks/TaskAttachments';

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
  const [asignadoA, setAsignadoA] = useState<string>(tarea?.asignado_a ?? '');
  const [clienteId, setClienteId] = useState<string>(tarea?.cliente_id ?? '');
  const [prioridad, setPrioridad] = useState<AdminTareaPrioridad>(tarea?.prioridad ?? 'media');
  const [status, setStatus] = useState<AdminTareaStatus>(tarea?.status ?? 'por_hacer');
  const [fechaVencimiento, setFechaVencimiento] = useState(tarea?.fecha_vencimiento ?? '');
  const [saving, setSaving] = useState(false);

  const isEditing = !!tarea;

  const creadorId = tarea?.creado_por ?? currentAdminId;
  const creadorNombre =
    tarea?.creador_nombre
    ?? teamMembers.find(m => m.id === creadorId)?.nombre
    ?? 'Vos';

  const currentUserNombre =
    teamMembers.find(m => m.id === currentAdminId)?.nombre ?? 'Usuario';

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
      <div className="bg-[#141414] border border-[rgba(245,166,35,0.2)] rounded-2xl w-full max-w-2xl shadow-2xl flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="flex items-center justify-between p-5 border-b border-[rgba(245,166,35,0.1)] shrink-0">
          <h2 className="text-base font-semibold text-[#FFFFFF]">
            {isEditing ? 'Editar tarea' : 'Nueva tarea'}
          </h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center text-[#FFFFFF]/40 hover:text-[#FFFFFF] hover:bg-[#FFFFFF]/5 transition-all">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 space-y-4 overflow-y-auto flex-1">
          {/* Creado por (readonly) */}
          <div className="flex items-center gap-2 text-xs text-[#FFFFFF]/55 bg-[#F5A623]/5 border border-[#F5A623]/15 rounded-lg px-3 py-2">
            <UserPlus className="w-3.5 h-3.5 text-[#F5A623]/70 shrink-0" />
            <span>
              Creada por <span className="font-semibold text-[#F5A623]">{creadorNombre}</span>
              {' '}— {isEditing ? 'el creador siempre ve la tarea.' : 'la verás en tu panel aunque la asignes a otra persona.'}
            </span>
          </div>

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

          {/* Descripción (rich text + fullscreen) */}
          <TaskDescriptionEditor
            value={descripcion}
            onChange={setDescripcion}
            titulo={titulo}
            onTituloChange={setTitulo}
            placeholder='Contexto, links, checklist… probá escribir "/" para insertar bloques.'
          />

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

          {/* Adjuntos + Conversación: solo cuando la tarea ya existe */}
          {isEditing && tarea && (
            <>
              <div className="pt-2 border-t border-[rgba(255,255,255,0.05)]">
                <TaskAttachments
                  tareaId={tarea.id}
                  currentUserId={currentAdminId}
                />
              </div>

              <div className="pt-2 border-t border-[rgba(255,255,255,0.05)]">
                <TaskComments
                  tareaId={tarea.id}
                  tareaTitulo={tarea.titulo}
                  creadoPor={tarea.creado_por}
                  asignadoA={tarea.asignado_a}
                  currentUserId={currentAdminId}
                  currentUserNombre={currentUserNombre}
                />
              </div>
            </>
          )}

          {!isEditing && (
            <p className="text-[11px] text-[#FFFFFF]/30 italic">
              Podrás adjuntar archivos y responder al creador una vez que guardes la tarea.
            </p>
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 p-5 border-t border-[rgba(245,166,35,0.1)] shrink-0">
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
