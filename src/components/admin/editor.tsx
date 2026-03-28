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
  BookOpen,
  Plus,
  Trash2,
  Download,
  Search,
  X,
  ChevronRight,
  ArrowRight,
  Check,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { useState, useCallback, useRef, useEffect } from "react";

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

/* ─── Law Block Node View (Editor rendering) ─── */

const DEFAULT_LAW_DISCLAIMER =
  "המידע המוצג אינו מהווה ייעוץ משפטי. רשימה זו אינה ממצה ונועדה לסייע בהתמצאות וחשיבה משפטית בלבד.";

interface LawItem {
  lawName: string;
  quote: string;
  url: string;
}

/* ─── Law Import Modal ─── */

interface LawSection {
  index: string;
  number: string;
  line: string;
  anchor: string;
  level: number;
}

function LawImportModal({
  isOpen,
  onClose,
  onImport,
}: {
  isOpen: boolean;
  onClose: () => void;
  onImport: (items: LawItem[]) => void;
}) {
  const [step, setStep] = useState<"search" | "sections" | "loading-content">("search");
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<{ title: string; url: string }[]>([]);
  const [searching, setSearching] = useState(false);
  const [selectedLaw, setSelectedLaw] = useState<{ title: string; url: string } | null>(null);
  const [sections, setSections] = useState<LawSection[]>([]);
  const [selectedSections, setSelectedSections] = useState<Set<string>>(new Set());
  const [loadingSections, setLoadingSections] = useState(false);
  const [loadingContent, setLoadingContent] = useState(false);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);
  const searchTimer = useRef<ReturnType<typeof setTimeout>>(null);

  // Close on outside click
  useEffect(() => {
    if (!isOpen) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as globalThis.Node)) {
        onClose();
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen, onClose]);

  // Reset on close
  useEffect(() => {
    if (!isOpen) {
      setStep("search");
      setQuery("");
      setSearchResults([]);
      setSelectedLaw(null);
      setSections([]);
      setSelectedSections(new Set());
      setError("");
    }
  }, [isOpen]);

  // Debounced search
  const handleSearch = useCallback((q: string) => {
    setQuery(q);
    setError("");
    if (searchTimer.current) clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults([]); return; }

    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await fetch(`/api/import/law?action=search&q=${encodeURIComponent(q)}`);
        const data = await res.json();
        setSearchResults(data.results || []);
      } catch {
        setError("שגיאה בחיפוש");
      } finally {
        setSearching(false);
      }
    }, 400);
  }, []);

  // Select a law → fetch its sections
  const handleSelectLaw = useCallback(async (law: { title: string; url: string }) => {
    setSelectedLaw(law);
    setLoadingSections(true);
    setError("");
    try {
      const res = await fetch(`/api/import/law?action=sections&page=${encodeURIComponent(law.title)}`);
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSections(data.sections || []);
      setStep("sections");
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בטעינת סעיפים");
    } finally {
      setLoadingSections(false);
    }
  }, []);

  // Toggle section selection
  const toggleSection = (index: string) => {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(index)) next.delete(index);
      else next.add(index);
      return next;
    });
  };

  // Import selected sections
  const handleImport = useCallback(async () => {
    if (!selectedLaw || selectedSections.size === 0) return;
    setLoadingContent(true);
    setStep("loading-content");
    setError("");

    const imported: LawItem[] = [];
    const selected = sections.filter((s) => selectedSections.has(s.index));

    for (const section of selected) {
      try {
        const res = await fetch(
          `/api/import/law?action=content&page=${encodeURIComponent(selectedLaw.title)}&section=${section.index}`,
        );
        const data = await res.json();
        imported.push({
          lawName: `${section.line} — ${selectedLaw.title}`,
          quote: data.text || "",
          url: `https://he.wikisource.org/wiki/${encodeURIComponent(selectedLaw.title.replace(/ /g, "_"))}#${encodeURIComponent(section.anchor)}`,
        });
      } catch {
        imported.push({
          lawName: `${section.line} — ${selectedLaw.title}`,
          quote: "(שגיאה בטעינת תוכן הסעיף)",
          url: `https://he.wikisource.org/wiki/${encodeURIComponent(selectedLaw.title.replace(/ /g, "_"))}`,
        });
      }
    }

    setLoadingContent(false);
    onImport(imported);
    onClose();
  }, [selectedLaw, selectedSections, sections, onImport, onClose]);

  if (!isOpen) return null;

  return (
    <div
      ref={panelRef}
      className="absolute top-full right-0 z-50 mt-1 w-[420px] max-h-[500px] overflow-hidden rounded-xl border border-border bg-card shadow-xl flex flex-col"
      dir="rtl"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border px-4 py-3">
        <div className="flex items-center gap-2">
          <Download size={16} className="text-indigo-500" />
          <span className="text-sm font-semibold">ייבוא מספר החוקים הפתוח</span>
        </div>
        <button type="button" onClick={onClose} className="text-muted hover:text-foreground transition-colors">
          <X size={16} />
        </button>
      </div>

      {/* Search step */}
      {step === "search" && (
        <div className="flex flex-col overflow-hidden">
          <div className="p-4 pb-2">
            <div className="relative">
              <input
                type="text"
                value={query}
                onChange={(e) => handleSearch(e.target.value)}
                placeholder="חפשו שם חוק (לדוגמה: חוק הגנת הפרטיות)..."
                dir="rtl"
                autoFocus
                className="w-full rounded-lg border border-border bg-background pr-9 pl-3 py-2 text-sm placeholder:text-muted focus-visible:outline-2 focus-visible:outline-indigo-400"
              />
              <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted" />
            </div>
          </div>

          <div className="overflow-y-auto px-4 pb-4 max-h-[350px]">
            {searching && (
              <div className="flex items-center justify-center py-6 text-muted">
                <Loader2 size={16} className="animate-spin" />
                <span className="mr-2 text-xs">מחפש...</span>
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <div className="space-y-1">
                {searchResults.map((r) => (
                  <button
                    key={r.title}
                    type="button"
                    onClick={() => handleSelectLaw(r)}
                    disabled={loadingSections}
                    className="flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm text-right hover:bg-indigo-50 transition-colors disabled:opacity-50"
                  >
                    <span className="font-medium">{r.title}</span>
                    <ChevronRight size={14} className="text-muted shrink-0 rotate-180" />
                  </button>
                ))}
              </div>
            )}

            {!searching && query && searchResults.length === 0 && (
              <p className="py-6 text-center text-xs text-muted">לא נמצאו תוצאות</p>
            )}

            {loadingSections && (
              <div className="flex items-center justify-center py-4 text-muted">
                <Loader2 size={16} className="animate-spin" />
                <span className="mr-2 text-xs">טוען סעיפים...</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Sections step */}
      {step === "sections" && selectedLaw && (
        <div className="flex flex-col overflow-hidden">
          <div className="px-4 py-2 border-b border-border bg-indigo-50/50">
            <button
              type="button"
              onClick={() => { setStep("search"); setSelectedLaw(null); setSections([]); setSelectedSections(new Set()); }}
              className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 transition-colors mb-1"
            >
              <ArrowRight size={12} />
              חזרה לחיפוש
            </button>
            <h4 className="text-sm font-bold text-primary-dark truncate">{selectedLaw.title}</h4>
            <p className="text-[10px] text-muted">בחרו סעיפים לייבוא ({selectedSections.size} נבחרו)</p>
          </div>

          <div className="overflow-y-auto px-4 py-2 max-h-[300px]">
            {sections.length === 0 && (
              <p className="py-6 text-center text-xs text-muted">לא נמצאו סעיפים</p>
            )}
            {sections.map((s) => (
              <label
                key={s.index}
                className={cn(
                  "flex items-center gap-2 rounded-lg px-2 py-1.5 text-sm cursor-pointer hover:bg-indigo-50 transition-colors",
                  s.level > 1 && "pr-6",
                  s.level > 2 && "pr-10",
                )}
              >
                <input
                  type="checkbox"
                  checked={selectedSections.has(s.index)}
                  onChange={() => toggleSection(s.index)}
                  className="rounded border-border accent-indigo-600"
                />
                <span className={s.level === 1 ? "font-semibold" : ""}>{s.line}</span>
              </label>
            ))}
          </div>

          <div className="border-t border-border px-4 py-3">
            <button
              type="button"
              onClick={handleImport}
              disabled={selectedSections.size === 0}
              className="flex w-full items-center justify-center gap-1.5 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50 transition-colors"
            >
              <Download size={14} />
              ייבוא {selectedSections.size} סעיפים
            </button>
          </div>
        </div>
      )}

      {/* Loading content step */}
      {step === "loading-content" && (
        <div className="flex flex-col items-center justify-center py-12 px-4">
          <Loader2 size={24} className="animate-spin text-indigo-500 mb-3" />
          <p className="text-sm text-muted">טוען תוכן סעיפים...</p>
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="mx-4 mb-4 rounded-lg bg-red-50 p-2.5 text-xs text-red-600">{error}</div>
      )}
    </div>
  );
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function LawBlockView(props: any) {
  const { node, updateAttributes } = props as {
    node: { attrs: { title: string; icon: string; disclaimer: string; items: string } };
    updateAttributes: (attrs: Record<string, unknown>) => void;
  };
  const [showImport, setShowImport] = useState(false);

  const items: LawItem[] = (() => {
    try {
      return JSON.parse(node.attrs.items || "[]");
    } catch {
      return [];
    }
  })();

  const updateItems = (newItems: LawItem[]) => {
    updateAttributes({ items: JSON.stringify(newItems) });
  };

  const updateItem = (index: number, field: keyof LawItem, value: string) => {
    const updated = [...items];
    updated[index] = { ...updated[index], [field]: value };
    updateItems(updated);
  };

  const addItem = () => {
    updateItems([...items, { lawName: "", quote: "", url: "" }]);
  };

  const removeItem = (index: number) => {
    updateItems(items.filter((_, i) => i !== index));
  };

  const handleImport = (imported: LawItem[]) => {
    updateItems([...items, ...imported]);
  };

  return (
    <NodeViewWrapper
      className="my-4 rounded-xl border-2 border-dashed border-indigo-300 bg-indigo-50/30 p-4"
      data-type="lawBlock"
    >
      {/* Header */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={node.attrs.title}
          onChange={(e) => updateAttributes({ title: e.target.value })}
          placeholder="כותרת הבלוק..."
          className="flex-1 min-w-[120px] rounded-lg border border-border bg-background px-3 py-1.5 text-sm font-bold text-primary-dark placeholder:text-muted focus-visible:outline-2 focus-visible:outline-indigo-400"
          contentEditable={false}
          dir="rtl"
        />

        {/* Import button */}
        <div className="relative" contentEditable={false}>
          <button
            type="button"
            onClick={() => setShowImport(!showImport)}
            className={cn(
              "flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium transition-colors",
              showImport
                ? "bg-indigo-100 text-indigo-700"
                : "bg-indigo-50 text-indigo-600 hover:bg-indigo-100",
            )}
          >
            <Download size={12} />
            ייבוא מחוק
          </button>
          <LawImportModal
            isOpen={showImport}
            onClose={() => setShowImport(false)}
            onImport={handleImport}
          />
        </div>

        <span
          className="text-[10px] text-indigo-500 font-medium whitespace-nowrap"
          contentEditable={false}
        >
          בלוק סעיפי חוק
        </span>
      </div>

      {/* Disclaimer */}
      <div className="mb-3" contentEditable={false}>
        <label className="mb-1 block text-[10px] text-muted font-medium">דיסקליימר (כותרת משנה)</label>
        <textarea
          value={node.attrs.disclaimer}
          onChange={(e) => updateAttributes({ disclaimer: e.target.value })}
          rows={2}
          dir="rtl"
          className="w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-xs text-muted placeholder:text-muted focus-visible:outline-2 focus-visible:outline-indigo-400"
        />
      </div>

      {/* Items */}
      <div className="space-y-3" contentEditable={false}>
        {items.map((item, i) => (
          <div
            key={i}
            className="rounded-lg border border-indigo-200 bg-white p-3 space-y-2"
          >
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-medium text-indigo-400">סעיף {i + 1}</span>
              <button
                type="button"
                onClick={() => removeItem(i)}
                className="rounded p-1 text-red-400 hover:bg-red-50 hover:text-red-600 transition-colors"
              >
                <Trash2 size={14} />
              </button>
            </div>
            <input
              type="text"
              value={item.lawName}
              onChange={(e) => updateItem(i, "lawName", e.target.value)}
              placeholder="שם החוק (לדוגמה: סעיף 2 לחוק הגנת הפרטיות)"
              dir="rtl"
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted focus-visible:outline-2 focus-visible:outline-indigo-400"
            />
            <textarea
              value={item.quote}
              onChange={(e) => updateItem(i, "quote", e.target.value)}
              placeholder="ציטוט הסעיף..."
              rows={3}
              dir="rtl"
              className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2 text-sm placeholder:text-muted focus-visible:outline-2 focus-visible:outline-indigo-400"
            />
            <input
              type="url"
              value={item.url}
              onChange={(e) => updateItem(i, "url", e.target.value)}
              placeholder="קישור לחוק המקורי (https://...)"
              dir="ltr"
              className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-sm placeholder:text-muted focus-visible:outline-2 focus-visible:outline-indigo-400"
            />
          </div>
        ))}

        <button
          type="button"
          onClick={addItem}
          className="flex w-full items-center justify-center gap-1.5 rounded-lg border-2 border-dashed border-indigo-200 py-2 text-xs font-medium text-indigo-500 hover:bg-indigo-50 transition-colors"
        >
          <Plus size={14} />
          הוסף סעיף חוק
        </button>
      </div>
    </NodeViewWrapper>
  );
}

/* ─── Law Block Extension ─── */

const LawBlock = Node.create({
  name: "lawBlock",
  group: "block",
  atom: true,

  addAttributes() {
    return {
      title: { default: "" },
      icon: { default: "BookOpen" },
      disclaimer: { default: DEFAULT_LAW_DISCLAIMER },
      items: { default: "[]" },
    };
  },

  parseHTML() {
    return [{ tag: 'div[data-type="lawBlock"]' }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "div",
      mergeAttributes(HTMLAttributes, { "data-type": "lawBlock" }),
      0,
    ];
  },

  addNodeView() {
    return ReactNodeViewRenderer(LawBlockView);
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
      LawBlock,
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

  // Sync content when initialContent changes after editor init
  useEffect(() => {
    if (editor && initialContent && editor.isEmpty) {
      editor.commands.setContent(initialContent);
    }
  }, [editor, initialContent]);

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

  const handleInsertLawBlock = () => {
    editor
      .chain()
      .focus()
      .insertContent({
        type: "lawBlock",
        attrs: {
          title: "סעיפי חוק רלוונטיים",
          icon: "BookOpen",
          disclaimer: DEFAULT_LAW_DISCLAIMER,
          items: JSON.stringify([{ lawName: "", quote: "", url: "" }]),
        },
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
          onClick={handleInsertLawBlock}
          ariaLabel="בלוק סעיפי חוק"
        >
          <BookOpen size={16} />
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
