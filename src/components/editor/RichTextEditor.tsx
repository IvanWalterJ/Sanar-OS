import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useEditor, EditorContent, type Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import Placeholder from '@tiptap/extension-placeholder';
import {
  Heading1, Heading2, Heading3, List, ListOrdered, CheckSquare,
  Quote, Code, Minus, Type, Bold, Italic, Strikethrough, Link2,
} from 'lucide-react';

export interface SlashOption {
  id: string;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  keywords: string[];
  run: (editor: Editor) => void;
}

const SLASH_OPTIONS: SlashOption[] = [
  {
    id: 'paragraph',
    label: 'Texto',
    description: 'Párrafo normal',
    icon: Type,
    keywords: ['texto', 'parrafo', 'parrafo', 'text', 'p'],
    run: (e) => e.chain().focus().setParagraph().run(),
  },
  {
    id: 'h1',
    label: 'Título 1',
    description: 'Encabezado grande',
    icon: Heading1,
    keywords: ['h1', 'titulo', 'heading'],
    run: (e) => e.chain().focus().toggleHeading({ level: 1 }).run(),
  },
  {
    id: 'h2',
    label: 'Título 2',
    description: 'Encabezado medio',
    icon: Heading2,
    keywords: ['h2', 'titulo', 'heading', 'subtitulo'],
    run: (e) => e.chain().focus().toggleHeading({ level: 2 }).run(),
  },
  {
    id: 'h3',
    label: 'Título 3',
    description: 'Encabezado chico',
    icon: Heading3,
    keywords: ['h3', 'titulo', 'heading'],
    run: (e) => e.chain().focus().toggleHeading({ level: 3 }).run(),
  },
  {
    id: 'bulletList',
    label: 'Lista',
    description: 'Puntos sin orden',
    icon: List,
    keywords: ['lista', 'bullet', 'puntos', 'ul'],
    run: (e) => e.chain().focus().toggleBulletList().run(),
  },
  {
    id: 'orderedList',
    label: 'Lista numerada',
    description: '1. 2. 3.',
    icon: ListOrdered,
    keywords: ['numerada', 'ordered', 'numero', 'ol'],
    run: (e) => e.chain().focus().toggleOrderedList().run(),
  },
  {
    id: 'taskList',
    label: 'Checklist',
    description: 'Lista con casillas',
    icon: CheckSquare,
    keywords: ['check', 'tarea', 'casilla', 'todo', 'pendiente'],
    run: (e) => e.chain().focus().toggleTaskList().run(),
  },
  {
    id: 'blockquote',
    label: 'Cita',
    description: 'Bloque citado',
    icon: Quote,
    keywords: ['cita', 'quote', 'frase'],
    run: (e) => e.chain().focus().toggleBlockquote().run(),
  },
  {
    id: 'codeBlock',
    label: 'Código',
    description: 'Bloque de código',
    icon: Code,
    keywords: ['code', 'codigo', 'pre'],
    run: (e) => e.chain().focus().toggleCodeBlock().run(),
  },
  {
    id: 'hr',
    label: 'Línea divisoria',
    description: 'Separador horizontal',
    icon: Minus,
    keywords: ['divider', 'hr', 'linea', 'separador'],
    run: (e) => e.chain().focus().setHorizontalRule().run(),
  },
];

function filterSlashOptions(query: string): SlashOption[] {
  const q = query.trim().toLowerCase();
  if (!q) return SLASH_OPTIONS;
  return SLASH_OPTIONS.filter(opt =>
    opt.label.toLowerCase().includes(q)
    || opt.keywords.some(k => k.includes(q))
  );
}

interface RichTextEditorProps {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  autoFocus?: boolean;
  minHeight?: string;
  /** When true the editor area grows to fill its parent (fullscreen mode). */
  fillParent?: boolean;
}

export default function RichTextEditor({
  value,
  onChange,
  placeholder = 'Escribí algo o presioná "/" para opciones…',
  autoFocus = false,
  minHeight = '140px',
  fillParent = false,
}: RichTextEditorProps) {
  const [slash, setSlash] = useState<{ open: boolean; query: string; top: number; left: number; from: number; selected: number }>({
    open: false, query: '', top: 0, left: 0, from: 0, selected: 0,
  });

  const containerRef = useRef<HTMLDivElement | null>(null);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({
        openOnClick: false,
        autolink: true,
        HTMLAttributes: { class: 'text-[#F5A623] underline underline-offset-2 hover:text-[#FFB94D]' },
      }),
      Placeholder.configure({ placeholder }),
    ],
    content: value || '',
    autofocus: autoFocus,
    editorProps: {
      attributes: {
        class: [
          'prose prose-invert prose-sm max-w-none',
          'focus:outline-none',
          'text-[#FFFFFF]/85',
          'leading-relaxed',
          fillParent ? 'flex-1 overflow-y-auto px-1' : 'px-1',
        ].join(' '),
        style: fillParent ? '' : `min-height:${minHeight};`,
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange(ed.getHTML());
      updateSlashState(ed);
    },
    onSelectionUpdate: ({ editor: ed }) => {
      updateSlashState(ed);
    },
  });

  // Sync external value changes (e.g. when modal reopens with new task)
  useEffect(() => {
    if (!editor) return;
    const current = editor.getHTML();
    if (value !== current) {
      editor.commands.setContent(value || '', { emitUpdate: false });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, editor]);

  const updateSlashState = useCallback((ed: Editor) => {
    const { from, empty } = ed.state.selection;
    if (!empty) {
      setSlash(s => (s.open ? { ...s, open: false } : s));
      return;
    }
    const $from = ed.state.selection.$from;
    const blockStart = $from.start($from.depth);
    const textBefore = ed.state.doc.textBetween(blockStart, from, '\n', '\0');
    const match = /(?:^|\s)\/([\p{L}\d]*)$/u.exec(textBefore);

    if (!match) {
      setSlash(s => (s.open ? { ...s, open: false } : s));
      return;
    }

    const query = match[1] ?? '';
    const slashStart = from - query.length - 1; // position of the "/"

    try {
      const coords = ed.view.coordsAtPos(from);
      const containerRect = containerRef.current?.getBoundingClientRect();
      const top = containerRect ? coords.bottom - containerRect.top + 6 : coords.bottom + 6;
      const left = containerRect ? coords.left - containerRect.left : coords.left;
      setSlash({ open: true, query, top, left, from: slashStart, selected: 0 });
    } catch {
      // ignore — selection may be detached
    }
  }, []);

  const filteredOptions = useMemo(() => filterSlashOptions(slash.query), [slash.query]);

  // Clamp selected when query changes
  useEffect(() => {
    if (slash.open && slash.selected >= filteredOptions.length) {
      setSlash(s => ({ ...s, selected: 0 }));
    }
  }, [filteredOptions.length, slash.open, slash.selected]);

  const applyOption = useCallback((opt: SlashOption) => {
    if (!editor) return;
    // Remove the "/query"
    editor
      .chain()
      .focus()
      .deleteRange({ from: slash.from, to: editor.state.selection.from })
      .run();
    opt.run(editor);
    setSlash(s => ({ ...s, open: false }));
  }, [editor, slash.from]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (!slash.open) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSlash(s => ({ ...s, selected: (s.selected + 1) % Math.max(filteredOptions.length, 1) }));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSlash(s => ({ ...s, selected: (s.selected - 1 + filteredOptions.length) % Math.max(filteredOptions.length, 1) }));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      const opt = filteredOptions[slash.selected];
      if (opt) applyOption(opt);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setSlash(s => ({ ...s, open: false }));
    }
  }, [slash.open, slash.selected, filteredOptions, applyOption]);

  if (!editor) {
    return (
      <div
        className="text-xs text-[#FFFFFF]/30 px-1"
        style={{ minHeight }}
      >
        Cargando editor…
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`relative ${fillParent ? 'flex flex-col h-full' : ''}`}
      onKeyDown={handleKeyDown}
    >
      {/* Toolbar */}
      <Toolbar editor={editor} />

      <div className={fillParent ? 'flex-1 overflow-hidden flex flex-col' : ''}>
        <EditorContent editor={editor} />
      </div>

      {slash.open && filteredOptions.length > 0 && (
        <div
          className="absolute z-50 w-64 max-h-72 overflow-y-auto bg-[#1A1A1A] border border-[rgba(245,166,35,0.25)] rounded-xl shadow-2xl py-1.5"
          style={{ top: slash.top, left: slash.left }}
        >
          {filteredOptions.map((opt, i) => {
            const Icon = opt.icon;
            const active = i === slash.selected;
            return (
              <button
                key={opt.id}
                type="button"
                onMouseDown={(e) => { e.preventDefault(); applyOption(opt); }}
                onMouseEnter={() => setSlash(s => ({ ...s, selected: i }))}
                className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors ${
                  active ? 'bg-[#F5A623]/12' : 'hover:bg-[#FFFFFF]/5'
                }`}
              >
                <div className={`w-8 h-8 shrink-0 rounded-md flex items-center justify-center ${active ? 'bg-[#F5A623]/20 text-[#F5A623]' : 'bg-[#FFFFFF]/5 text-[#FFFFFF]/55'}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-xs font-semibold text-[#FFFFFF]">{opt.label}</div>
                  <div className="text-[10px] text-[#FFFFFF]/40 truncate">{opt.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

// ─── Toolbar ──────────────────────────────────────────────────────────────

function Toolbar({ editor }: { editor: Editor }) {
  const btn = (active: boolean) =>
    `w-7 h-7 rounded-md flex items-center justify-center text-xs transition-colors ${
      active
        ? 'bg-[#F5A623]/20 text-[#F5A623]'
        : 'text-[#FFFFFF]/55 hover:text-[#FFFFFF] hover:bg-[#FFFFFF]/5'
    }`;

  function setLink() {
    const prev = editor.getAttributes('link').href as string | undefined;
    const url = window.prompt('Enlace (URL):', prev ?? 'https://');
    if (url === null) return;
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run();
      return;
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run();
  }

  return (
    <div className="flex items-center gap-0.5 mb-1.5 pb-1.5 border-b border-[rgba(255,255,255,0.05)] flex-wrap">
      <button type="button" onClick={() => editor.chain().focus().toggleBold().run()} className={btn(editor.isActive('bold'))} title="Negrita (Ctrl+B)"><Bold className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleItalic().run()} className={btn(editor.isActive('italic'))} title="Itálica (Ctrl+I)"><Italic className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleStrike().run()} className={btn(editor.isActive('strike'))} title="Tachado"><Strikethrough className="w-3.5 h-3.5" /></button>
      <span className="w-px h-4 bg-[#FFFFFF]/8 mx-1" />
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()} className={btn(editor.isActive('heading', { level: 1 }))} title="Título 1"><Heading1 className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()} className={btn(editor.isActive('heading', { level: 2 }))} title="Título 2"><Heading2 className="w-3.5 h-3.5" /></button>
      <span className="w-px h-4 bg-[#FFFFFF]/8 mx-1" />
      <button type="button" onClick={() => editor.chain().focus().toggleBulletList().run()} className={btn(editor.isActive('bulletList'))} title="Lista"><List className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleOrderedList().run()} className={btn(editor.isActive('orderedList'))} title="Lista numerada"><ListOrdered className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleTaskList().run()} className={btn(editor.isActive('taskList'))} title="Checklist"><CheckSquare className="w-3.5 h-3.5" /></button>
      <span className="w-px h-4 bg-[#FFFFFF]/8 mx-1" />
      <button type="button" onClick={() => editor.chain().focus().toggleBlockquote().run()} className={btn(editor.isActive('blockquote'))} title="Cita"><Quote className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={() => editor.chain().focus().toggleCode().run()} className={btn(editor.isActive('code'))} title="Código en línea"><Code className="w-3.5 h-3.5" /></button>
      <button type="button" onClick={setLink} className={btn(editor.isActive('link'))} title="Enlace"><Link2 className="w-3.5 h-3.5" /></button>
      <span className="ml-auto text-[10px] text-[#FFFFFF]/30 hidden sm:inline">Tip: tipeá "/" para más opciones</span>
    </div>
  );
}
