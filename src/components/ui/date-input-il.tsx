"use client";

import { useEffect, useState } from "react";

// `<input type="date">` always displays in the browser's locale, which we
// can't override (long-standing browser behavior). For a Hebrew site we want
// DD/MM/YYYY consistently, so this is a plain text input that parses /
// renders the Israeli format and reports back ISO YYYY-MM-DD to its parent.

interface Props {
  value: string; // ISO YYYY-MM-DD, "" for empty
  onChange: (iso: string) => void;
  className?: string;
  id?: string;
  ariaLabel?: string;
}

function isoToDmy(iso: string): string {
  const m = iso.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return "";
  return `${m[3]}/${m[2]}/${m[1]}`;
}

function dmyToIso(s: string): string | null {
  const cleaned = s.replace(/\s/g, "");
  const m = cleaned.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (!m) return null;
  const dd = m[1].padStart(2, "0");
  const mm = m[2].padStart(2, "0");
  const yyyy = m[3];
  const day = Number(dd);
  const month = Number(mm);
  const year = Number(yyyy);
  if (month < 1 || month > 12) return null;
  if (day < 1 || day > 31) return null;
  // Roundtrip via Date to catch invalid combos like 31/02.
  const d = new Date(`${yyyy}-${mm}-${dd}T00:00:00Z`);
  if (Number.isNaN(d.getTime()) || d.getUTCFullYear() !== year || d.getUTCMonth() + 1 !== month || d.getUTCDate() !== day) {
    return null;
  }
  return `${yyyy}-${mm}-${dd}`;
}

export function DateInputIL({ value, onChange, className, id, ariaLabel }: Props) {
  const [draft, setDraft] = useState(() => isoToDmy(value));

  // Keep local draft in sync if the parent resets / changes the value.
  useEffect(() => {
    setDraft(isoToDmy(value));
  }, [value]);

  return (
    <input
      id={id}
      aria-label={ariaLabel}
      type="text"
      inputMode="numeric"
      placeholder="DD/MM/YYYY"
      maxLength={10}
      value={draft}
      onChange={(e) => {
        const next = e.target.value;
        setDraft(next);
        if (next === "") {
          if (value !== "") onChange("");
          return;
        }
        const iso = dmyToIso(next);
        if (iso && iso !== value) onChange(iso);
      }}
      onBlur={(e) => {
        const v = e.target.value;
        if (v === "") return;
        const iso = dmyToIso(v);
        if (!iso) setDraft(isoToDmy(value));
      }}
      className={className}
      dir="ltr"
    />
  );
}
