import { useEffect, useState } from 'react';
import { MessageSquare, Send, Loader2, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import RichTextEditor from '../editor/RichTextEditor';
import RichTextViewer from '../editor/RichTextViewer';
import {
  fetchTareaComentarios,
  createTareaComentario,
  deleteTareaComentario,
  type TareaComentario,
} from '../../lib/adminTasks';
import { notificarComentarioTarea } from '../../lib/notifications';

interface TaskCommentsProps {
  tareaId?: string;
  tareaTitulo: string;
  creadoPor?: string;
  asignadoA: string | null;
  currentUserId: string;
  currentUserNombre: string;
  /**
   * Modo "pendiente": cuando no hay tareaId todavía (creación), los borradores
   * se guardan en memoria y el padre los envía tras crear la tarea.
   */
  pendingComments?: string[];
  onPendingCommentsChange?: (drafts: string[]) => void;
}

function formatRelative(iso: string): string {
  const d = new Date(iso);
  const diff = Date.now() - d.getTime();
  const min = Math.floor(diff / 60000);
  if (min < 1) return 'ahora mismo';
  if (min < 60) return `hace ${min} min`;
  const hr = Math.floor(min / 60);
  if (hr < 24) return `hace ${hr} h`;
  const days = Math.floor(hr / 24);
  if (days < 7) return `hace ${days} d`;
  return d.toLocaleDateString('es-AR', { day: '2-digit', month: 'short' });
}

function isEmpty(html: string): boolean {
  const stripped = html.replace(/<[^>]*>/g, '').trim();
  return stripped.length === 0;
}

export default function TaskComments({
  tareaId, tareaTitulo, creadoPor, asignadoA, currentUserId, currentUserNombre,
  pendingComments, onPendingCommentsChange,
}: TaskCommentsProps) {
  const isPending = !tareaId;
  const [comments, setComments] = useState<TareaComentario[]>([]);
  const [loading, setLoading] = useState(!isPending);
  const [draft, setDraft] = useState('');
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    if (!tareaId) {
      setLoading(false);
      return;
    }
    let alive = true;
    setLoading(true);
    fetchTareaComentarios(tareaId)
      .then(rows => { if (alive) setComments(rows); })
      .catch(err => {
        console.error('Error cargando comentarios:', err);
        if (alive) toast.error('No se pudieron cargar los comentarios');
      })
      .finally(() => { if (alive) setLoading(false); });
    return () => { alive = false; };
  }, [tareaId]);

  async function handleSend() {
    if (isEmpty(draft) || sending) return;

    if (isPending) {
      if (onPendingCommentsChange) {
        onPendingCommentsChange([...(pendingComments ?? []), draft]);
      }
      setDraft('');
      return;
    }

    setSending(true);
    try {
      const nuevo = await createTareaComentario({
        tarea_id: tareaId!,
        autor_id: currentUserId,
        contenido: draft,
      });
      // Optimistic: añadir con nombre actual ya resuelto
      setComments(prev => [...prev, { ...nuevo, autor_nombre: currentUserNombre }]);
      setDraft('');

      // Notificar a las contrapartes (creador + asignado), excluyendo a uno mismo
      const destinos = new Set<string>();
      if (creadoPor && creadoPor !== currentUserId) destinos.add(creadoPor);
      if (asignadoA && asignadoA !== currentUserId) destinos.add(asignadoA);
      destinos.forEach(uid => {
        notificarComentarioTarea(uid, currentUserNombre, tareaTitulo, tareaId).catch((err) => {
          console.error('[notif] falló notificarComentarioTarea:', err);
        });
      });
    } catch (err) {
      console.error('Error enviando comentario:', err);
      toast.error('No se pudo enviar el comentario');
    } finally {
      setSending(false);
    }
  }

  function handleRemovePending(index: number) {
    if (!onPendingCommentsChange) return;
    const next = [...(pendingComments ?? [])];
    next.splice(index, 1);
    onPendingCommentsChange(next);
  }

  async function handleDelete(c: TareaComentario) {
    if (c.autor_id !== currentUserId) return;
    if (deletingId) return;
    setDeletingId(c.id);
    const snapshot = comments;
    setComments(prev => prev.filter(x => x.id !== c.id));
    try {
      await deleteTareaComentario(c.id);
    } catch {
      setComments(snapshot);
      toast.error('No se pudo eliminar el comentario');
    } finally {
      setDeletingId(null);
    }
  }

  const pendingList = pendingComments ?? [];
  const totalCount = isPending ? pendingList.length : comments.length;

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-[10px] font-bold text-[#FFFFFF]/40 uppercase tracking-wider">
        <MessageSquare className="w-3.5 h-3.5" />
        Conversación
        {totalCount > 0 && (
          <span className="text-[10px] bg-[#F5A623]/15 text-[#F5A623] px-1.5 py-0.5 rounded-full normal-case tracking-normal font-semibold">
            {totalCount}
          </span>
        )}
      </div>

      {/* Hilo */}
      {isPending ? (
        pendingList.length === 0 ? (
          <div className="text-xs text-[#FFFFFF]/30 italic px-1">
            Aún no hay comentarios. Escribí debajo para iniciar la conversación.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
            {pendingList.map((html, idx) => (
              <div
                key={idx}
                className="rounded-xl px-3.5 py-2.5 border bg-[#F5A623]/8 border-[#F5A623]/20"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-xs font-bold truncate text-[#F5A623]">
                      {currentUserNombre}
                    </span>
                    <span className="text-[10px] text-[#F5A623]/70">se enviará al crear la tarea</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemovePending(idx)}
                    className="p-1 rounded-md text-[#FFFFFF]/30 hover:text-red-400 hover:bg-red-500/10 transition-colors"
                    title="Quitar comentario"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <RichTextViewer html={html} className="text-xs" />
              </div>
            ))}
          </div>
        )
      ) : loading ? (
        <div className="text-xs text-[#FFFFFF]/30 italic px-1">Cargando…</div>
      ) : comments.length === 0 ? (
        <div className="text-xs text-[#FFFFFF]/30 italic px-1">
          Aún no hay comentarios. Escribí debajo para iniciar la conversación.
        </div>
      ) : (
        <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
          {comments.map(c => {
            const isMine = c.autor_id === currentUserId;
            return (
              <div
                key={c.id}
                className={`rounded-xl px-3.5 py-2.5 border ${
                  isMine
                    ? 'bg-[#F5A623]/8 border-[#F5A623]/20'
                    : 'bg-[#0F0F0F] border-[rgba(255,255,255,0.06)]'
                }`}
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className={`text-xs font-bold truncate ${isMine ? 'text-[#F5A623]' : 'text-[#FFFFFF]/85'}`}>
                      {c.autor_nombre ?? 'Usuario'}
                    </span>
                    <span className="text-[10px] text-[#FFFFFF]/35">{formatRelative(c.created_at)}</span>
                  </div>
                  {isMine && (
                    <button
                      type="button"
                      onClick={() => handleDelete(c)}
                      disabled={deletingId === c.id}
                      className="p-1 rounded-md text-[#FFFFFF]/30 hover:text-red-400 hover:bg-red-500/10 transition-colors disabled:opacity-40"
                      title="Eliminar comentario"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  )}
                </div>
                <RichTextViewer html={c.contenido} className="text-xs" />
              </div>
            );
          })}
        </div>
      )}

      {/* Composer */}
      <div className="bg-[#0A0A0A] border border-[rgba(245,166,35,0.2)] rounded-xl px-3 py-2.5 focus-within:border-[#F5A623]/50 transition-colors">
        <RichTextEditor
          value={draft}
          onChange={setDraft}
          placeholder="Escribí una respuesta… (Enter agrega línea, usá el botón para enviar)"
          minHeight="60px"
        />
        <div className="flex justify-end mt-2">
          <button
            type="button"
            onClick={handleSend}
            disabled={isEmpty(draft) || sending}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#F5A623] hover:bg-[#FFB94D] disabled:opacity-40 disabled:cursor-not-allowed text-black text-xs font-bold transition-all"
          >
            {sending ? <Loader2 className="w-3 h-3 animate-spin" /> : <Send className="w-3 h-3" />}
            Enviar
          </button>
        </div>
      </div>
    </div>
  );
}
