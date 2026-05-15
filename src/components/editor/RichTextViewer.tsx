import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Link from '@tiptap/extension-link';
import { useEffect } from 'react';

interface RichTextViewerProps {
  html: string;
  className?: string;
}

/**
 * Render-only Tiptap. Reusa el mismo schema/extensions del editor para
 * que el output sea pixel-equivalente y, de paso, sanitiza HTML extraño
 * (Tiptap descarta nodos/atributos fuera de su schema).
 */
export default function RichTextViewer({ html, className = '' }: RichTextViewerProps) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Link.configure({
        openOnClick: true,
        autolink: true,
        HTMLAttributes: {
          class: 'text-[#F5A623] underline underline-offset-2 hover:text-[#FFB94D]',
          target: '_blank',
          rel: 'noopener noreferrer',
        },
      }),
    ],
    content: html || '',
    editable: false,
    editorProps: {
      attributes: {
        class: `prose prose-invert prose-sm max-w-none text-[#FFFFFF]/85 leading-relaxed ${className}`,
      },
    },
  });

  useEffect(() => {
    if (!editor) return;
    if (editor.getHTML() !== html) {
      editor.commands.setContent(html || '', { emitUpdate: false });
    }
  }, [html, editor]);

  if (!editor) return null;
  return <EditorContent editor={editor} />;
}
