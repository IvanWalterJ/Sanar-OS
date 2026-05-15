import { useEffect, useState } from 'react';
import { Maximize2, Minimize2, Check } from 'lucide-react';
import RichTextEditor from './RichTextEditor';

interface TaskDescriptionEditorProps {
  value: string;
  onChange: (html: string) => void;
  titulo: string;
  onTituloChange?: (titulo: string) => void;
  placeholder?: string;
}

/**
 * Wrapper de RichTextEditor con dos modos:
 *  - inline: editor compacto dentro del modal de tarea
 *  - fullscreen: overlay tipo Notion con el título + descripción en pantalla amplia
 *
 * En fullscreen el campo `titulo` también es editable para que sea una vista
 * de trabajo real (no solo lectura del contenido).
 */
export default function TaskDescriptionEditor({
  value, onChange, titulo, onTituloChange, placeholder,
}: TaskDescriptionEditorProps) {
  const [fullscreen, setFullscreen] = useState(false);

  // Cerrar fullscreen con Escape
  useEffect(() => {
    if (!fullscreen) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setFullscreen(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [fullscreen]);

  // Lock body scroll mientras está en fullscreen
  useEffect(() => {
    if (!fullscreen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = prev; };
  }, [fullscreen]);

  return (
    <>
      <div className="relative">
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-[10px] font-bold text-[#FFFFFF]/40 uppercase tracking-wider">
            Descripción
          </label>
          <button
            type="button"
            onClick={() => setFullscreen(true)}
            className="flex items-center gap-1.5 text-[10px] font-semibold text-[#FFFFFF]/45 hover:text-[#F5A623] transition-colors"
            title="Abrir en pantalla completa"
          >
            <Maximize2 className="w-3 h-3" />
            Expandir
          </button>
        </div>

        <div className="bg-[#0A0A0A] border border-[rgba(245,166,35,0.2)] rounded-xl px-3 py-2.5 focus-within:border-[#F5A623]/50 transition-colors">
          <RichTextEditor
            value={value}
            onChange={onChange}
            placeholder={placeholder}
            minHeight="120px"
          />
        </div>
      </div>

      {fullscreen && (
        <div className="fixed inset-0 z-[60] bg-[#0A0A0A] flex flex-col animate-in fade-in duration-150">
          <div className="flex items-center justify-between px-6 py-4 border-b border-[rgba(245,166,35,0.12)] shrink-0">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setFullscreen(false)}
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs text-[#FFFFFF]/60 hover:text-[#FFFFFF] hover:bg-[#FFFFFF]/5 transition-colors"
                title="Cerrar pantalla completa (Esc)"
              >
                <Minimize2 className="w-3.5 h-3.5" />
                Cerrar
              </button>
              <span className="text-[10px] text-[#FFFFFF]/30 uppercase tracking-widest font-bold">Editando tarea</span>
            </div>
            <button
              type="button"
              onClick={() => setFullscreen(false)}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[#F5A623] hover:bg-[#FFB94D] text-black text-xs font-bold transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Listo
            </button>
          </div>

          <div className="flex-1 overflow-y-auto">
            <div className="max-w-3xl mx-auto px-6 py-10 w-full">
              {/* Título grande tipo Notion */}
              {onTituloChange ? (
                <input
                  type="text"
                  value={titulo}
                  onChange={(e) => onTituloChange(e.target.value)}
                  placeholder="Título sin definir"
                  className="w-full bg-transparent text-4xl font-bold text-[#FFFFFF] placeholder-[#FFFFFF]/15 focus:outline-none mb-6"
                />
              ) : (
                <h1 className="text-4xl font-bold text-[#FFFFFF] mb-6">{titulo || 'Sin título'}</h1>
              )}

              <div className="bg-[#0F0F0F] border border-[rgba(245,166,35,0.12)] rounded-2xl px-6 py-5 min-h-[60vh]">
                <RichTextEditor
                  value={value}
                  onChange={onChange}
                  placeholder={placeholder ?? 'Escribí algo, o presioná "/" para opciones…'}
                  autoFocus
                  minHeight="60vh"
                />
              </div>

              <p className="text-[11px] text-[#FFFFFF]/30 mt-4 text-center">
                Tipeá <span className="font-mono text-[#F5A623]/70">/</span> para insertar títulos, listas, checklists y más. Los cambios se guardan al hacer clic en "Listo" y luego "Guardar cambios".
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
