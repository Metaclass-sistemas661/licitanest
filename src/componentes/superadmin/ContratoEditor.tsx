import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Underline from "@tiptap/extension-underline";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import Placeholder from "@tiptap/extension-placeholder";
import { TextStyle } from "@tiptap/extension-text-style";
import Color from "@tiptap/extension-color";
import FontFamily from "@tiptap/extension-font-family";
import { Table as TableExt } from "@tiptap/extension-table";
import { TableRow } from "@tiptap/extension-table-row";
import { TableCell } from "@tiptap/extension-table-cell";
import { TableHeader } from "@tiptap/extension-table-header";
import ImageExt from "@tiptap/extension-image";
import { useEffect, useCallback, useRef } from "react";
import { ContratoToolbar } from "./ContratoToolbar";

/* ── Font Size via TextStyle mark ─────────────────────────── */
const FontSize = TextStyle.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      fontSize: {
        default: null,
        parseHTML: (el: HTMLElement) => el.style.fontSize || null,
        renderHTML: (attrs: Record<string, string>) => {
          if (!attrs.fontSize) return {};
          return { style: `font-size: ${attrs.fontSize}` };
        },
      },
    };
  },
});

interface ContratoEditorProps {
  contentHtml?: string;
  contentJson?: Record<string, unknown> | null;
  onChange?: (html: string, json: Record<string, unknown>) => void;
  editable?: boolean;
}

export function ContratoEditor({
  contentHtml,
  contentJson,
  onChange,
  editable = true,
}: ContratoEditorProps) {
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;

  const editor = useEditor({
    editable,
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
      Underline,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      Highlight.configure({ multicolor: false }),
      Placeholder.configure({ placeholder: "Comece a escrever o conteúdo do contrato…" }),
      FontSize,
      Color,
      FontFamily,
      TableExt.configure({ resizable: true }),
      TableRow,
      TableCell,
      TableHeader,
      ImageExt.configure({ inline: true }),
    ],
    content: contentJson || contentHtml || "",
    onUpdate: ({ editor: ed }) => {
      onChangeRef.current?.(ed.getHTML(), ed.getJSON() as Record<string, unknown>);
    },
  });

  // Sync editable prop
  useEffect(() => {
    if (editor) editor.setEditable(editable);
  }, [editor, editable]);

  // Sync external content changes (e.g. loading from API)
  const setContentOnce = useCallback(
    (html: string | undefined, json: Record<string, unknown> | null | undefined) => {
      if (!editor) return;
      const curr = editor.getHTML();
      if (json && Object.keys(json).length > 0) {
        // avoid unnecessary re-rendering
        if (curr !== "<p></p>" && curr.length > 20) return;
        editor.commands.setContent(json);
      } else if (html && html !== curr) {
        editor.commands.setContent(html);
      }
    },
    [editor],
  );

  useEffect(() => {
    setContentOnce(contentHtml, contentJson);
  }, [contentHtml, contentJson, setContentOnce]);

  return (
    <div className="rounded-xl border bg-card overflow-hidden">
      {editable && <ContratoToolbar editor={editor} />}
      <EditorContent
        editor={editor}
        className="prose prose-sm dark:prose-invert max-w-none min-h-100 px-6 py-4 focus-within:outline-none
          [&_.ProseMirror]:min-h-95 [&_.ProseMirror]:outline-none
          [&_.ProseMirror_table]:border-collapse [&_.ProseMirror_td]:border [&_.ProseMirror_td]:px-3 [&_.ProseMirror_td]:py-1.5
          [&_.ProseMirror_th]:border [&_.ProseMirror_th]:px-3 [&_.ProseMirror_th]:py-1.5 [&_.ProseMirror_th]:bg-muted/50 [&_.ProseMirror_th]:font-semibold
          [&_.ProseMirror_p.is-editor-empty:first-child::before]:text-muted-foreground/50 [&_.ProseMirror_p.is-editor-empty:first-child::before]:content-[attr(data-placeholder)] [&_.ProseMirror_p.is-editor-empty:first-child::before]:float-left [&_.ProseMirror_p.is-editor-empty:first-child::before]:h-0 [&_.ProseMirror_p.is-editor-empty:first-child::before]:pointer-events-none"
      />
    </div>
  );
}
