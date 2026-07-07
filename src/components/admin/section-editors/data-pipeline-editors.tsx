"use client";

import { FileText } from "lucide-react";
import { Input, Textarea } from "@/components/ui/input";
import { SectionCard } from "./section-card";
import { PIPELINE_NODES } from "@/app/data-pipeline/pipeline-data";
import type {
  DataPipelinePageContent,
  DataPipelineNodeText,
} from "@/types/content";

/**
 * Per-project text editor for the /data-pipeline map. The graph structure
 * (which blocks exist, how they connect) is fixed in code; this only edits
 * the display text — the name, tagline, and the description that shows when
 * a visitor clicks a block. Rendered alongside DashboardPageEditor, which
 * handles the hero banner and the public/private toggle.
 */
export function DataPipelineNodesEditor({
  content,
  onChange,
}: {
  content: DataPipelinePageContent;
  onChange: (content: DataPipelinePageContent) => void;
}) {
  const nodes = content.nodes ?? {};

  const update = (id: string, patch: Partial<DataPipelineNodeText>) => {
    const prev = nodes[id] ?? { name: "", tagline: "", description: "" };
    onChange({ ...content, nodes: { ...nodes, [id]: { ...prev, ...patch } } });
  };

  return (
    <SectionCard title="טקסטים של הפרויקטים" icon={FileText}>
      <div className="space-y-4">
        <p className="text-xs text-muted leading-relaxed">
          עריכת השם, תת-הכותרת והתיאור (הפרטים שמופיעים בלחיצה על כל בלוק במפה).
          מבנה המפה והקשרים בין הבלוקים קבועים בקוד ואינם נערכים כאן.
        </p>

        {PIPELINE_NODES.map((n) => {
          const v = nodes[n.id] ?? { name: "", tagline: "", description: "" };
          return (
            <div
              key={n.id}
              className="rounded-lg border border-border bg-muted-bg/20 p-3 space-y-2"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-muted">
                  {n.name}
                </span>
                <span className="font-mono text-[10px] text-muted/60">
                  {n.id}
                </span>
              </div>
              <Input
                label="שם"
                value={v.name}
                onChange={(e) => update(n.id, { name: e.target.value })}
                dir="rtl"
              />
              <Input
                label="תת-כותרת"
                value={v.tagline}
                onChange={(e) => update(n.id, { tagline: e.target.value })}
                dir="rtl"
              />
              <Textarea
                label="תיאור (הפרטים)"
                value={v.description}
                onChange={(e) => update(n.id, { description: e.target.value })}
                dir="rtl"
                rows={4}
              />
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}
