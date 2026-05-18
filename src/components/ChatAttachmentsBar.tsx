/**
 * ChatAttachmentsBar — UI reusable para gestionar adjuntos (imagenes + archivos)
 * en los chats con IA (Coach y Entrenadores).
 *
 * Expone 2 piezas independientes:
 *   - `<AttachButton />` boton clip inline que abre el file picker · va al lado
 *     del input / textarea.
 *   - `<AttachmentsPreviewStrip />` tira de previews · solo se renderiza si hay
 *     adjuntos o un upload en curso · va arriba del input.
 *
 * El paste (Ctrl+V) se maneja en el componente padre via onPaste en el input,
 * porque solo el input/textarea con foco recibe el evento del teclado.
 */
import React, { useRef } from 'react';
import { Paperclip, X, FileText, Loader2, Image as ImageIcon } from 'lucide-react';
import {
  ATTACHMENTS_ACCEPT_ATTR,
  buildAttachmentFromFile,
  type ChatAttachment,
} from '../lib/chatAttachments';
import { formatBytes } from '../lib/imageUploadUtils';

interface AttachButtonProps {
  attachments: ChatAttachment[];
  onChange: (next: ChatAttachment[]) => void;
  disabled?: boolean;
  onError?: (msg: string) => void;
  onUploadingChange?: (uploading: boolean) => void;
  className?: string;
}

export function AttachButton({
  attachments,
  onChange,
  disabled,
  onError,
  onUploadingChange,
  className,
}: AttachButtonProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    onUploadingChange?.(true);
    try {
      const next: ChatAttachment[] = [...attachments];
      const results = await Promise.allSettled(
        Array.from(files).map(buildAttachmentFromFile),
      );
      for (const r of results) {
        if (r.status === 'fulfilled') next.push(r.value);
        else
          onError?.(
            r.reason instanceof Error ? r.reason.message : String(r.reason),
          );
      }
      onChange(next);
    } finally {
      onUploadingChange?.(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept={ATTACHMENTS_ACCEPT_ATTR}
        multiple
        className="hidden"
        onChange={(e) => void handleFiles(e.target.files)}
      />
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        title="Adjuntar archivo, foto o captura (también podés pegar con Ctrl+V)"
        className={
          className ??
          'shrink-0 w-10 h-10 rounded-xl bg-[#F5A623]/10 hover:bg-[#F5A623]/20 border border-[rgba(245,166,35,0.2)] disabled:opacity-40 flex items-center justify-center text-[#F5A623] transition-colors'
        }
      >
        <Paperclip className="w-4 h-4" />
      </button>
    </>
  );
}

interface AttachmentsPreviewStripProps {
  attachments: ChatAttachment[];
  onChange: (next: ChatAttachment[]) => void;
  uploading?: boolean;
}

export function AttachmentsPreviewStrip({
  attachments,
  onChange,
  uploading,
}: AttachmentsPreviewStripProps) {
  if (attachments.length === 0 && !uploading) return null;

  const removeAttachment = (id: string) => {
    onChange(attachments.filter((a) => a.id !== id));
  };

  return (
    <div className="w-full mb-3 flex items-start gap-2 flex-wrap">
      {attachments.map((a) => (
        <AttachmentChip
          key={a.id}
          attachment={a}
          onRemove={() => removeAttachment(a.id)}
        />
      ))}
      {uploading && (
        <div className="h-16 px-3 rounded-xl bg-[#F5A623]/5 border border-dashed border-[rgba(245,166,35,0.25)] flex items-center gap-2 text-xs text-white/60">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-[#F5A623]" />
          Procesando...
        </div>
      )}
    </div>
  );
}

interface AttachmentChipProps {
  attachment: ChatAttachment;
  onRemove: () => void;
}

function AttachmentChip({ attachment, onRemove }: AttachmentChipProps) {
  if (attachment.kind === 'image' && attachment.previewDataUrl) {
    return (
      <div className="relative h-16 w-16 rounded-xl overflow-hidden border border-[rgba(245,166,35,0.3)] group">
        <img
          src={attachment.previewDataUrl}
          alt={attachment.fileName}
          className="w-full h-full object-cover"
        />
        <button
          type="button"
          onClick={onRemove}
          className="absolute top-0.5 right-0.5 w-5 h-5 rounded-full bg-black/70 hover:bg-red-600 flex items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity"
          title="Quitar"
        >
          <X className="w-3 h-3" />
        </button>
        <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-1.5 py-0.5">
          <div className="flex items-center gap-1 text-[9px] text-white/80 truncate">
            <ImageIcon className="w-2.5 h-2.5 shrink-0" />
            <span className="truncate">{attachment.fileName}</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="relative h-16 max-w-[220px] px-3 rounded-xl border border-[rgba(245,166,35,0.3)] bg-[#F5A623]/10 flex items-center gap-2 group">
      <FileText className="w-4 h-4 text-[#F5A623] shrink-0" />
      <div className="flex-1 min-w-0">
        <div className="text-xs text-white truncate font-medium">
          {attachment.fileName}
        </div>
        <div className="text-[10px] text-white/50 uppercase tracking-wider">
          {formatBytes(attachment.sizeBytes)}
          {attachment.kind === 'other' ? ' · formato no leible' : ''}
        </div>
      </div>
      <button
        type="button"
        onClick={onRemove}
        className="w-5 h-5 rounded-full bg-black/40 hover:bg-red-600 flex items-center justify-center text-white shrink-0 transition-colors"
        title="Quitar"
      >
        <X className="w-3 h-3" />
      </button>
    </div>
  );
}
