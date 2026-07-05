"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Search, ChevronRight, ChevronLeft, BookOpen, X, Link2, Check } from "lucide-react";

/* ─── Types ─── */

interface Definition {
  text: string;
  label?: string;
}

export interface MilonEntryRow {
  id: string;
  slug: string;
  term: string;
  vocalized: string;
  partOfSpeech: string;
  etymology: string | null;
  inflections: string | null;
  domains: string[];
  definitions: Definition[];
  example: string;
  order: number;
}

/* ─── Helpers ─── */

// Strip niqqud so the search matches whether or not the user types vowels.
function stripNiqqud(s: string): string {
  return s.replace(/[֑-ׇ]/g, "");
}

function matches(entry: MilonEntryRow, q: string): boolean {
  if (!q) return true;
  const needle = stripNiqqud(q).trim().toLowerCase();
  const hay = stripNiqqud(
    [
      entry.term,
      entry.vocalized,
      entry.partOfSpeech,
      entry.domains.join(" "),
      entry.definitions.map((d) => `${d.label ?? ""} ${d.text}`).join(" "),
    ].join(" "),
  ).toLowerCase();
  return hay.includes(needle);
}

/* ─── Component ─── */

export default function DictionaryBrowser({
  entries,
}: {
  entries: MilonEntryRow[];
}) {
  const [selectedId, setSelectedId] = useState<string>(entries[0]?.id ?? "");
  const [query, setQuery] = useState("");
  const [animKey, setAnimKey] = useState(0);
  const [copied, setCopied] = useState(false);
  const paneRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => entries.filter((e) => matches(e, query)),
    [entries, query],
  );

  // The selected entry always comes from the full list (so a filter that
  // hides it doesn't blank the reading pane).
  const selectedIndex = entries.findIndex((e) => e.id === selectedId);
  const selected = entries[selectedIndex] ?? entries[0];

  const goTo = useCallback(
    (id: string, updateHash = true) => {
      setSelectedId(id);
      setAnimKey((k) => k + 1);
      // Reflect the selection in the URL so the current entry is shareable
      // (/dictionary#<slug>). replaceState (not push) keeps the browser Back
      // button leaving the page instead of stepping through every entry.
      if (updateHash) {
        const slug = entries.find((e) => e.id === id)?.slug;
        if (slug) {
          window.history.replaceState(null, "", `#${slug}`);
        }
      }
    },
    [entries],
  );

  // Deep-linking: on mount (and on manual hash edits / back-forward), select
  // the entry named in the URL hash, e.g. /dictionary#mistatagreed.
  useEffect(() => {
    function selectFromHash() {
      const slug = decodeURIComponent(window.location.hash.replace(/^#/, ""));
      if (!slug) return;
      const match = entries.find((e) => e.slug === slug);
      if (match && match.id !== selectedId) goTo(match.id, false);
    }
    selectFromHash();
    window.addEventListener("hashchange", selectFromHash);
    return () => window.removeEventListener("hashchange", selectFromHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [entries]);

  const copyLink = useCallback(() => {
    const url = `${window.location.origin}${window.location.pathname}#${selected.slug}`;
    void navigator.clipboard?.writeText(url).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }, [selected]);

  const step = useCallback(
    (dir: 1 | -1) => {
      const next = (selectedIndex + dir + entries.length) % entries.length;
      goTo(entries[next].id);
    },
    [selectedIndex, entries, goTo],
  );

  // Arrow-key page flipping (ignored while typing in the search box).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === "INPUT" || tag === "TEXTAREA") return;
      // RTL: ArrowRight = previous, ArrowLeft = next.
      if (e.key === "ArrowLeft") step(1);
      else if (e.key === "ArrowRight") step(-1);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [step]);

  if (!selected) return null;

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-[290px_1fr] lg:gap-10">
      {/* ── Index / Thumb tabs ── */}
      <aside className="lg:sticky lg:top-24 lg:self-start">
        {/* Search */}
        <div className="relative mb-4">
          <Search
            className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="חיפוש בערכים…"
            aria-label="חיפוש בערכי המילון"
            className="w-full rounded-lg border border-border bg-white py-2.5 pr-10 pl-9 text-sm text-foreground shadow-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/30"
            dir="rtl"
          />
          {query && (
            <button
              type="button"
              onClick={() => setQuery("")}
              className="absolute left-2.5 top-1/2 -translate-y-1/2 rounded p-0.5 text-muted hover:text-foreground"
              aria-label="נקה חיפוש"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Term list */}
        <div className="milon-index-scroll flex gap-2 overflow-x-auto pb-2 lg:max-h-[70vh] lg:flex-col lg:gap-1 lg:overflow-y-auto lg:pb-0">
          {filtered.length === 0 ? (
            <p className="px-1 py-4 text-sm text-muted">לא נמצאו ערכים.</p>
          ) : (
            filtered.map((e) => {
              const active = e.id === selected.id;
              return (
                <button
                  key={e.id}
                  type="button"
                  onClick={() => goTo(e.id)}
                  aria-current={active ? "true" : undefined}
                  className={[
                    "group shrink-0 rounded-lg border px-3 py-2.5 text-right transition-all lg:w-full",
                    active
                      ? "border-accent bg-accent/10 shadow-sm"
                      : "border-transparent hover:border-border hover:bg-white",
                  ].join(" ")}
                >
                  <span
                    className={[
                      "block font-serif text-lg leading-tight",
                      active ? "text-primary" : "text-foreground group-hover:text-primary",
                    ].join(" ")}
                  >
                    {e.vocalized}
                  </span>
                  <span className="mt-0.5 block text-[11px] text-muted">
                    {e.partOfSpeech}
                  </span>
                </button>
              );
            })
          )}
        </div>
      </aside>

      {/* ── Open dictionary page ── */}
      <div className="relative">
        <article
          ref={paneRef}
          key={animKey}
          className="milon-flip milon-paper relative overflow-hidden rounded-2xl border border-border shadow-xl shadow-primary/5"
          style={{ perspective: "1000px" }}
        >
          {/* Gold spine on the binding edge (right, in RTL) */}
          <div
            className="absolute inset-y-0 right-0 w-1.5 bg-gradient-to-b from-accent via-accent-light to-accent"
            aria-hidden="true"
          />

          <div className="p-6 sm:p-10">
            {/* Running head */}
            <div className="mb-6 flex items-center justify-between border-b border-border/70 pb-3 text-xs tracking-wide text-muted">
              <span className="inline-flex items-center gap-1.5 font-medium">
                <BookOpen className="h-3.5 w-3.5 text-accent" aria-hidden="true" />
                מילון · עו״ד גיא זומר
              </span>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={copyLink}
                  className="inline-flex items-center gap-1 rounded px-1.5 py-0.5 font-medium text-muted transition-colors hover:bg-accent/10 hover:text-accent-text focus-visible:outline-2 focus-visible:outline-accent"
                  aria-label="העתקת קישור ישיר לערך זה"
                  title="העתקת קישור ישיר לערך"
                >
                  {copied ? (
                    <>
                      <Check className="h-3.5 w-3.5" aria-hidden="true" />
                      הועתק
                    </>
                  ) : (
                    <>
                      <Link2 className="h-3.5 w-3.5" aria-hidden="true" />
                      קישור
                    </>
                  )}
                </button>
                <span className="tabular-nums">
                  ערך {selectedIndex + 1} מתוך {entries.length}
                </span>
              </div>
            </div>

            {/* Watermark first letter */}
            <span
              className="pointer-events-none absolute left-6 top-16 select-none font-serif text-[10rem] leading-none text-primary/[0.04] sm:text-[14rem]"
              aria-hidden="true"
            >
              {selected.term.charAt(0)}
            </span>

            {/* Headword */}
            <header className="relative">
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <h2 className="font-serif text-4xl font-bold leading-tight text-primary sm:text-5xl">
                  {selected.vocalized}
                </h2>
                <span className="rounded-full border border-accent/40 bg-accent/5 px-3 py-0.5 text-sm font-medium text-accent-text">
                  {selected.partOfSpeech}
                </span>
              </div>

              {(selected.etymology || selected.inflections) && (
                <div className="mt-3 space-y-0.5">
                  {selected.etymology && (
                    <p className="text-sm leading-relaxed text-muted">
                      {selected.etymology}
                    </p>
                  )}
                  {selected.inflections && (
                    <p className="text-sm leading-relaxed text-muted">
                      {selected.inflections}
                    </p>
                  )}
                </div>
              )}

              {selected.domains.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1.5">
                  {selected.domains.map((d) => (
                    <span
                      key={d}
                      className="rounded border border-primary/15 bg-primary/[0.03] px-2 py-0.5 text-xs font-medium text-primary"
                    >
                      {d}
                    </span>
                  ))}
                </div>
              )}
            </header>

            {/* Definitions */}
            <ol className="relative mt-7 space-y-4">
              {selected.definitions.map((def, i) => (
                <li key={i} className="flex gap-3">
                  <span
                    className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-primary/5 font-serif text-sm font-bold text-primary"
                    aria-hidden="true"
                  >
                    {i + 1}
                  </span>
                  <p className="text-lg leading-relaxed text-foreground">
                    {def.label && (
                      <span className="ml-1.5 font-semibold text-accent-text">
                        [{def.label}]
                      </span>
                    )}
                    {def.text}
                  </p>
                </li>
              ))}
            </ol>

            {/* Example quote */}
            {selected.example && (
              <blockquote className="relative mt-8 rounded-lg border-r-4 border-accent bg-accent/[0.04] p-4 pr-5">
                <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-accent-text">
                  ציטוט מהשטח
                </span>
                <p className="text-base italic leading-relaxed text-foreground/80">
                  {selected.example}
                </p>
              </blockquote>
            )}
          </div>
        </article>

        {/* Flip controls */}
        <div className="mt-5 flex items-center justify-between">
          <button
            type="button"
            onClick={() => step(-1)}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-primary shadow-sm transition-colors hover:border-accent hover:bg-accent/5"
          >
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
            הקודם
          </button>

          {/* Progress dots */}
          <div className="hidden items-center gap-1.5 sm:flex" aria-hidden="true">
            {entries.map((e, i) => (
              <button
                key={e.id}
                type="button"
                onClick={() => goTo(e.id)}
                aria-label={`מעבר לערך ${i + 1}`}
                className={[
                  "h-2 rounded-full transition-all",
                  i === selectedIndex
                    ? "w-6 bg-accent"
                    : "w-2 bg-border hover:bg-muted",
                ].join(" ")}
              />
            ))}
          </div>

          <button
            type="button"
            onClick={() => step(1)}
            className="inline-flex items-center gap-1 rounded-lg border border-border bg-white px-4 py-2 text-sm font-medium text-primary shadow-sm transition-colors hover:border-accent hover:bg-accent/5"
          >
            הבא
            <ChevronLeft className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
}
