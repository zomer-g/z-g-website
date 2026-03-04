"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { Sparkles, Loader2, X, RotateCcw, Check } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

/* ─── Props ─── */

interface AiWriterButtonProps {
  /** Current text value of the field */
  value: string;
  /** Callback to apply the AI-generated text */
  onResult: (text: string) => void;
  /** Label for context (e.g., "תיאור", "ביוגרפיה") */
  fieldLabel?: string;
  /** Additional class for positioning */
  className?: string;
}

/* ─── Component ─── */

export function AiWriterButton({
  value,
  onResult,
  fieldLabel,
  className,
}: AiWriterButtonProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState("");
  const [result, setResult] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const panelRef = useRef<HTMLDivElement>(null);

  /* ── Close on outside click ── */
  useEffect(() => {
    if (!isOpen) return;

    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        handleClose();
      }
    }

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const handleClose = () => {
    setIsOpen(false);
    setPrompt("");
    setResult("");
    setError("");
    setLoading(false);
  };

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setError("");
    setResult("");

    try {
      const res = await fetch("/api/ai/draft", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          prompt: prompt || (value ? "שפר את הטקסט הזה" : ""),
          existingText: value || undefined,
          fieldLabel: fieldLabel || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(
          data.error || `שגיאה מהשרת (${res.status})`,
        );
      }

      const data = await res.json();
      setResult(data.result || data.content || "");
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "שגיאה ביצירת הטקסט",
      );
    } finally {
      setLoading(false);
    }
  }, [prompt, value, fieldLabel]);

  const handleApply = () => {
    onResult(result);
    handleClose();
  };

  const handleRetry = () => {
    setResult("");
    setError("");
    handleGenerate();
  };

  return (
    <div className={cn("relative inline-block", className)}>
      {/* ── Trigger Button ── */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          "flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium transition-colors duration-150",
          "text-purple-600 hover:bg-purple-50 hover:text-purple-700",
          "focus-visible:outline-2 focus-visible:outline-purple-400 focus-visible:outline-offset-1",
          isOpen && "bg-purple-50 text-purple-700",
        )}
        title="עזרת AI לכתיבה"
      >
        <Sparkles size={14} />
        <span>AI</span>
      </button>

      {/* ── Panel ── */}
      {isOpen && (
        <div
          ref={panelRef}
          className="absolute top-full left-0 z-50 mt-1 w-80 rounded-xl border border-border bg-card p-4 shadow-xl"
          dir="rtl"
        >
          {/* Header */}
          <div className="mb-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles size={16} className="text-purple-500" />
              <span className="text-sm font-semibold text-foreground">
                עזרת AI לכתיבה
              </span>
            </div>
            <button
              type="button"
              onClick={handleClose}
              className="text-muted hover:text-foreground transition-colors"
            >
              <X size={16} />
            </button>
          </div>

          {/* Current text indicator */}
          {value && !result && (
            <div className="mb-3 rounded-lg bg-blue-50 p-2.5 text-xs text-blue-700">
              <span className="font-medium">טקסט קיים:</span>{" "}
              {value.length > 100 ? `${value.slice(0, 100)}...` : value}
            </div>
          )}

          {/* Prompt Input (shown when no result yet) */}
          {!result && (
            <>
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={
                  value
                    ? "תאר איך לשפר את הטקסט (או השאר ריק לשיפור אוטומטי)..."
                    : "תאר מה לכתוב..."
                }
                rows={3}
                dir="rtl"
                className="mb-3 w-full resize-none rounded-lg border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus-visible:outline-2 focus-visible:outline-purple-400"
              />

              {/* Quick actions */}
              {value && (
                <div className="mb-3 flex flex-wrap gap-1.5">
                  {[
                    "שפר ניסוח",
                    "קצר את הטקסט",
                    "הרחב את הטקסט",
                    "הפוך לרשמי יותר",
                  ].map((suggestion) => (
                    <button
                      key={suggestion}
                      type="button"
                      onClick={() => setPrompt(suggestion)}
                      className="rounded-full border border-purple-200 bg-purple-50 px-2.5 py-1 text-xs text-purple-600 hover:bg-purple-100 transition-colors"
                    >
                      {suggestion}
                    </button>
                  ))}
                </div>
              )}

              <Button
                onClick={handleGenerate}
                disabled={loading || (!prompt && !value)}
                className="w-full bg-purple-600 hover:bg-purple-700 text-white"
              >
                {loading ? (
                  <>
                    <Loader2 size={14} className="animate-spin" />
                    יוצר...
                  </>
                ) : (
                  <>
                    <Sparkles size={14} />
                    {value ? "שפר טקסט" : "צור טקסט"}
                  </>
                )}
              </Button>
            </>
          )}

          {/* Error */}
          {error && (
            <div className="mt-2 rounded-lg bg-red-50 p-2.5 text-xs text-red-600">
              {error}
            </div>
          )}

          {/* Result (editable) */}
          {result && (
            <>
              <div className="mb-2 text-xs font-medium text-muted">
                תוצאה (ניתן לערוך):
              </div>
              <textarea
                value={result}
                onChange={(e) => setResult(e.target.value)}
                rows={5}
                dir="rtl"
                className="mb-3 w-full resize-y rounded-lg border border-green-200 bg-green-50 px-3 py-2 text-sm text-foreground focus-visible:outline-2 focus-visible:outline-green-400"
              />
              <div className="flex gap-2">
                <Button
                  onClick={handleApply}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white"
                >
                  <Check size={14} />
                  השתמש בטקסט
                </Button>
                <Button
                  onClick={handleRetry}
                  variant="ghost"
                  className="border border-border"
                  disabled={loading}
                >
                  {loading ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <RotateCcw size={14} />
                  )}
                  נסה שוב
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}
