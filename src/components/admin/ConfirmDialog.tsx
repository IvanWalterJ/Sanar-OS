import { useEffect } from 'react';
import { AlertTriangle, X } from 'lucide-react';

interface ConfirmDialogProps {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'default';
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export default function ConfirmDialog({
  open,
  title,
  message,
  confirmLabel = 'Confirmar',
  cancelLabel = 'Cancelar',
  variant = 'default',
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !loading) onCancel();
      if (e.key === 'Enter' && !loading) onConfirm();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, loading, onCancel, onConfirm]);

  if (!open) return null;

  const isDanger = variant === 'danger';
  const accent = isDanger ? '#EF4444' : '#F5A623';
  const accentBg = isDanger ? 'rgba(239,68,68,0.15)' : 'rgba(245,166,35,0.15)';
  const accentBorder = isDanger ? 'rgba(239,68,68,0.3)' : 'rgba(245,166,35,0.3)';

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/70 backdrop-blur-sm animate-in fade-in duration-200 p-4"
      onClick={loading ? undefined : onCancel}
    >
      <div
        onClick={e => e.stopPropagation()}
        className="w-full max-w-sm bg-[#141414] rounded-3xl shadow-2xl relative overflow-hidden animate-in zoom-in-95 duration-200"
        style={{ border: `1px solid ${accentBorder}` }}
      >
        <div className="absolute top-0 left-0 right-0 h-1" style={{ background: accent }} />

        <button
          onClick={onCancel}
          disabled={loading}
          className="absolute top-4 right-4 w-8 h-8 rounded-full bg-[#FFFFFF]/5 flex items-center justify-center text-[#FFFFFF]/60 hover:text-[#FFFFFF] hover:bg-[#FFFFFF]/10 transition-colors disabled:opacity-40"
          aria-label="Cerrar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="p-8 pt-10">
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5 mx-auto"
            style={{ background: accentBg, border: `1.5px solid ${accentBorder}` }}
          >
            <AlertTriangle className="w-6 h-6" style={{ color: accent }} />
          </div>

          <h3 className="text-xl font-semibold text-[#FFFFFF] text-center mb-2">{title}</h3>
          <p className="text-sm text-[#FFFFFF]/60 text-center leading-relaxed mb-7">{message}</p>

          <div className="flex items-center gap-3">
            <button
              onClick={onCancel}
              disabled={loading}
              className="flex-1 py-3 rounded-xl bg-[#FFFFFF]/5 hover:bg-[#FFFFFF]/10 text-[#FFFFFF]/80 text-sm font-semibold transition-colors disabled:opacity-40"
            >
              {cancelLabel}
            </button>
            <button
              onClick={onConfirm}
              disabled={loading}
              className="flex-1 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-60 disabled:cursor-not-allowed"
              style={{
                background: isDanger
                  ? 'linear-gradient(135deg, #EF4444, #DC2626)'
                  : 'linear-gradient(135deg, #F5A623, #FFB94D)',
                color: isDanger ? '#FFFFFF' : '#000000',
                boxShadow: `0 8px 24px ${isDanger ? 'rgba(239,68,68,0.3)' : 'rgba(245,166,35,0.3)'}`,
              }}
            >
              {loading ? 'Procesando…' : confirmLabel}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
