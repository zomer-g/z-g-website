"use client";

import { useEditor, EditorContent, NodeViewWrapper, NodeViewContent, ReactNodeViewRenderer } from "@tiptap/react";
import { Node, mergeAttributes } from "@tiptap/core";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import {
  Bold,
  Italic,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  Link2,
  ImageIcon,
  Undo2,
  Redo2,
  LayoutList,
  Sparkles,
  Loader2,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useCallback } from "react";

/* ─── Icon names available for info blocks ─── */

const AVAILABLE_ICONS = [
  "Scale", "Building2", "Gavel", "FileText", "Shield", "Briefcase",
  "Award", "Heart", "ShieldCheck", "Lightbulb", "GraduationCap", "BookOpen",
  "Users", "Phone", "Mail", "MapPin", "Clock",
  "CheckCircle", "AlertTriangle", "Info", "XCircle", "CircleDot",
  "Star", "Zap", "Target", "ThumbsUp", "ThumbsDown",
] as const;

/* ─── Color variants for info blocks ─── */

const VARIANT_OPTIONS = [
  { value: "default", label: "רגיל", dot: "bg-gray-400" },
  { value: "success", label: "ירוק", dot: "bg-green-500" },
  { value: "error", label: "אדום", dot: "bg-red-500" },
  { value: "warning", label: "כתום", dot: "bg-amber-500" },
  { value: "info", label: "כחול", dot: "bg-blue-500" },
] as const;

const VARIANT_EDITOR_BORDER: Record<string, string> = {
  default: "border-gray-300 bg-gray-50/50",
  success: "border-green-300 bg-green-50/30",
  error: "border-red-300 bg-red-50/30",
  warning: "border-amber-300 bg-amber-50/30",
  info: "border-blue-300 bg-blue-50/30",
};

/* ─── Info Block Node View (Editor rendering) ─── */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function InfoBlockView(props: any) {
  const { node, updateAttributes } = props as {
    node: { attrs: { icon: string; title: string; variant: string } };
    updateAttributes: (attrs: Record<string, unknown>) => void;
  };
  const [showIconPicker, setShowIconPicker] = useState(false);
  const [showVariantPicker, setShowVariantPicker] = useState(false);

  const variant = node.attrs.variant || "default";
  const borderStyle = VARIANT_EDITOR_BORDER[variant] || VARIANT_EDITOR_BORDER.default;
  const currentVariant = VARIANT_OPTIONS.find((v) => v.value === variant) ?? VARIANT_OPTIONS[0];

  return (
    <NodeViewWrapper
      className={`my-4 rounded-xl border-2 border-dashed p-4 ${borderStyle}`}
      data-type="infoBlock"
    >
      {/* Header row */}
      <div className="mb-2 flex flex-wrap items-center gap-2">
        {/* Variant (color) picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowVariantPicker(!showVariantPicker); setShowIconPicker(false); }}
            className="flex items-center gap-1.5 rounded-lg bg-white px-2 py-1.5 text-xs font-medium border border-border hover:bg-gray-50 transition-colors"
            contentEditable={false}
          >
            <span className={`h-3 w-3 rounded-full ${currentVariant.dot}`} />
            {currentVariant.label}
            <ChevronDown size={12} />
          </button>
          {showVariantPicker && (
            <div
              className="absolute top-full right-0 z-10 mt-1 w-32 rounded-lg border border-border bg-card p-1.5 shadow-lg"
              contentEditable={false}
            >
              {VARIANT_OPTIONS.map((v) => (
                <button
                  key={v.value}
                  type="button"
                  onClick={() => { updateAttributes({ variant: v.value }); setShowVariantPicker(false); }}
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-1.5 text-xs transition-colors",
                    variant === v.value ? "bg-primary/10 font-bold" : "hover:bg-gray-100",
                  )}
                >
                  <span className={`h-3 w-3 rounded-full ${v.dot}`} />
                  {v.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Icon picker */}
        <div className="relative">
          <button
            type="button"
            onClick={() => { setShowIconPicker(!showIconPicker); setShowVariantPicker(false); }}
            className="flex items-center gap-1 rounded-lg bg-primary/10 px-2 py-1.5 text-xs font-medium text-primary hover:bg-primary/20 transition-colors"
            contentEditable={false}
          >
            🎨 {node.attrs.icon}
            <ChevronDown size={12} />
          </button>
          {showIconPicker && (
            <div
              className="absolute top-full right-0 z-10 mt-1 grid max-h-48 w-64 grid-cols-3 gap-1 overflow-auto rounded-lg border border-border bg-card p-2 shadow-lg"
              contentEditable={false}
            >
              {AVAILABLE_ICONS.map((iconName) => (
                <button
                  key={iconName}
                  type="button"
                  onClick={() => { updateAttributes({ icon: iconName }); setShowIconPicker(false); }}
                  className={cn(
                    "rounded px-2 py-1 text-xs transition-colors",
                    node.attrs.icon === iconName
                      ? "bg-primary text-white"
                      : "hover:bg-gray-100",
                  )}
                >
                  {iconName}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Title input */}
        <input
          type="text"
          value={node.attrs.title}
          onChange={(e) => updateAttributes({ title: e.target.value })}
          placeholder="כותרת הבלוק..."
          className="flex-1 min-w-[120px] rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-bold text-primary-dark placeholder:text-muted focus-visible:outline-2 focus-visible:outline-purple-400"
          contentEditable={false}
          dir="rtl"
        />

        <span
          className="text-[10px] text-purple-400 font-medium whitespace-nowrap"
          contentEditable={false}
        >
          בלוק מידע
        </span>
      </div>

      {/* Content area (editable) */}
      <div className="rounded-lg border border-border bg-background p-3 min-h-[60px]">
        <NodeViewContent className="prose prose-sm max-w-none" />
      </div>
    </NodeViewWrapper>
  );
}

/* ─── Info Block Extension ─── */

const InfoBlock = Node.create({
  name: "infoBlock",
  group: "block",
  content: "block+",

  addAttributes() {
    return {
      icon: {
        default: "Briefcase",
      },
      title: {
        default: "",
      },
      variant: {
        default: "default",
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="infoBlock"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "infoBlock" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(InfoBlockView);
  },
});

/* ─── Types ─── */

interface EditorProps {
  initialContent?: Record<string, unknown> | null;
  onChange?: (json: Record<string, unknown>) => void;
}

/* ─── Toolbar Button ─── */

function ToolbarButton({
  onClick,
  isActive = false,
  ariaLabel,
  children,
}: {
  onClick: () => void;
  isActive?: boolean;
  ariaLabel: string;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className={cn(
        "flex h-8 w-8 items-center justify-center rounded transition-colors duration-150",
        "hover:bg-gray-200 focus-visible:outline-2 focus-visible:outline-primary focus-visible:outline-offset-1",
        isActive && "bg-primary/10 text-primary",
      )}
    >
      {children}
    </button>
  );
}

/* ─── AI Writer Modal for Editor ─── */

function EditorAiWriter({
  isOpen,
  onClose,
  onInsert,
}: {
  isOpen: boolean;
  onClose: () => void;
  onInsert: (text: string) => void;
}) {
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError("");
    setResult("");

    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt,
          fieldLabel: "תוכן מאמר",
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || `שגיאה (${res.status})`);
      }

      const data = await res.json();
      setResult(data.result || data.content || "");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה ביצירת הטקסט");
    } finally {
      setLoading(false);
    }
  }, [prompt]);

  const handleInsert = () => {
    onInsert(result);
    setPrompt("");
    setResult("");
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="absolute top-full left-0 z-50 mt-1 w-80 rounded-xl border border-border bg-card p-4 shadow-xl" dir="rtl">
      <div className="mb-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Sparkles size={16} className="text-purple-500" />
          <span className="text-sm font-semibold">AI כתיבה</span>
        </div>
        <button type="button" onClick={onClose} className="text-muted hover:text-foreground">
          ✕
        </button>
      </div>

      {!result ? (
        <>
          <textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="תאר מה לכתוב..."
            rows={3}
            dir="rtl"
            className="mb-3 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-2 focus-visible:outline-purple-400"
          />
          <button
            type="button"
            onClick={handleGenerate}
            disabled={loading || !prompt}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-purple-600 px-4 py-2 text-sm font-medium text-white hover:bg-purple-700 disabled:opacity-50 transition-colors"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <Sparkles size={14} />}
            {loading ? "יוצר..." : "צור טקסט"}
          </button>
        </>
      ) : (
        <>
          <textarea
            value={result}
            onChange={(e) => setResult(e.target.value)}
            rows={5}
            dir="rtl"
            className="mb-3 w-full resize-y rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm focus-visible:outline-2 focus-visible:outline-green-400"
          />
          <div className="flex gap-2">
            <button
              type="button"
              onClick={handleInsert}
              className="flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-green-600 px-3 py-2 text-sm font-medium text-white hover:bg-green-700 transition-colors"
            >
              הוסף לעורך
            </button>
            <button
              type="button"
              onClick={() => { setResult(""); }}
              className="rounded-lg border border-border px-3 py-2 text-sm text-muted hover:bg-gray-50 transition-colors"
            >
              נסה שוב
            </button>
          </div>
        </>
      )}

      {error && (
        <div className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-600">{error}</div>
      )}
    </div>
  );
}

/* ─── Editor Component ─── */

export function Editor({ initialContent, onChange }: EditorProps) {
  const [showAiWriter, setShowAiWriter] = useState(false);

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
      }),
      Link.configure({
        openOnClick: false,
        HTMLAttributes: { rel: "noopener noreferrer", target: "_blank" },
      }),
      Image.configure({
        HTMLAttributes: { class: "max-w-full rounded-lg" },
      }),
      Placeholder.configure({
        placeholder: "התחל לכתוב...",
      }),
      InfoBlock,
    ],
    content: initialContent ?? undefined,
    editorProps: {
      attributes: {
        class:
          "prose prose-lg max-w-none min-h-[300px] px-4 py-3 focus:outline-none",
        dir: "rtl",
      },
    },
    onUpdate: ({ editor: ed }) => {
      onChange?.(ed.getJSON() as Record<string, unknown>);
    },
  });

  if (!editor) {
    return (
      <div className="rounded-lg border border-border bg-background p-4">
        <div className="h-[300px] animate-pulse rounded bg-gray-100" />
      </div>
    );
  }

  /* ── Toolbar Actions ── */

  const handleLink = () => {
    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("הזינו כתובת קישור:", previousUrl ?? "https://");

    if (url === null) return;

    if (url === "") {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url }).run();
  };

  const handleImage = () => {
    const url = window.prompt("הזינו כתובת תמונה:", "https://");

    if (!url) return;

    editor.chain().focus().setImage({ src: url }).run();
  };

  const handleInsertInfoBlock = () => {
    editor
      .chain()
      .focus()
      .insertContent({
        type: "infoBlock",
        attrs: { icon: "Briefcase", title: "" },
        content: [
          {
            type: "bulletList",
            content: [
              {
                type: "listItem",
                content: [{ type: "paragraph", content: [{ type: "text", text: "נקודה ראשונה" }] }],
              },
            ],
          },
        ],
      })
      .run();
  };

  const handleAiInsert = (text: string) => {
    editor.chain().focus().insertContent(text).run();
  };

  return (
    <div className="overflow-hidden rounded-lg border border-border bg-background">
      {/* ── Toolbar ── */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-border bg-gray-50 px-2 py-1.5">
        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBold().run()}
          isActive={editor.isActive("bold")}
          ariaLabel="מודגש"
        >
          <Bold size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleItalic().run()}
          isActive={editor.isActive("italic")}
          ariaLabel="נטוי"
        >
          <Italic size={16} />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 2 }).run()
          }
          isActive={editor.isActive("heading", { level: 2 })}
          ariaLabel="כותרת 2"
        >
          <Heading2 size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() =>
            editor.chain().focus().toggleHeading({ level: 3 }).run()
          }
          isActive={editor.isActive("heading", { level: 3 })}
          ariaLabel="כותרת 3"
        >
          <Heading3 size={16} />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          isActive={editor.isActive("bulletList")}
          ariaLabel="רשימת תבליטים"
        >
          <List size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          isActive={editor.isActive("orderedList")}
          ariaLabel="רשימה ממוספרת"
        >
          <ListOrdered size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          isActive={editor.isActive("blockquote")}
          ariaLabel="ציטוט"
        >
          <Quote size={16} />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

        <ToolbarButton
          onClick={handleInsertInfoBlock}
          ariaLabel="בלוק מידע"
        >
          <LayoutList size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={handleLink}
          isActive={editor.isActive("link")}
          ariaLabel="קישור"
        >
          <Link2 size={16} />
        </ToolbarButton>

        <ToolbarButton onClick={handleImage} ariaLabel="תמונה">
          <ImageIcon size={16} />
        </ToolbarButton>

        <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

        {/* AI Writer */}
        <div className="relative">
          <ToolbarButton
            onClick={() => setShowAiWriter(!showAiWriter)}
            isActive={showAiWriter}
            ariaLabel="AI כתיבה"
          >
            <Sparkles size={16} className="text-purple-500" />
          </ToolbarButton>
          <EditorAiWriter
            isOpen={showAiWriter}
            onClose={() => setShowAiWriter(false)}
            onInsert={handleAiInsert}
          />
        </div>

        <div className="mx-1 h-5 w-px bg-border" aria-hidden="true" />

        <ToolbarButton
          onClick={() => editor.chain().focus().undo().run()}
          ariaLabel="ביטול"
        >
          <Undo2 size={16} />
        </ToolbarButton>

        <ToolbarButton
          onClick={() => editor.chain().focus().redo().run()}
          ariaLabel="שחזור"
        >
          <Redo2 size={16} />
        </ToolbarButton>
      </div>

      {/* ── Content Area ── */}
      <EditorContent editor={editor} dir="rtl" />
    </div>
  );
}
