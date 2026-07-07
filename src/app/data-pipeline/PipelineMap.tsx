"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ScrollText,
  Globe2,
  FolderKanban,
  History,
  Scale,
  Newspaper,
  ExternalLink,
  ChevronLeft,
  Database,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PIPELINE_NODES,
  PIPELINE_EDGES,
  LAYER_LABELS,
  DATA_PACKAGES,
  type PipelineLayer,
  type PipelineNode,
} from "./pipeline-data";

const ICON_MAP: Record<PipelineNode["icon"], LucideIcon> = {
  ScrollText,
  Globe2,
  FolderKanban,
  History,
  Scale,
  Newspaper,
};

const LAYERS: PipelineLayer[] = ["source", "storage", "consumer"];

const nodesByLayer = (layer: PipelineLayer) =>
  PIPELINE_NODES.filter((n) => n.layer === layer).sort((a, b) => a.col - b.col);

const nodeById = new Map(PIPELINE_NODES.map((n) => [n.id, n]));
const packageById = new Map(DATA_PACKAGES.map((p) => [p.id, p]));

const sameLayerNotes: Partial<Record<PipelineLayer, string>> = {};
for (const edge of PIPELINE_EDGES) {
  const from = nodeById.get(edge.from);
  const to = nodeById.get(edge.to);
  if (from && to && from.layer === to.layer && edge.label) {
    sameLayerNotes[from.layer] = edge.label;
  }
}

type VisualState = "neutral" | "active" | "dim";

interface EdgePath {
  key: string;
  d: string;
  labelX: number;
  labelY: number;
  label?: string;
}

export function PipelineMap() {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [edgePaths, setEdgePaths] = useState<EdgePath[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [activePackageId, setActivePackageId] = useState<string | null>(null);

  const setNodeRef = useCallback((id: string) => {
    return (el: HTMLElement | null) => {
      if (el) nodeRefs.current.set(id, el);
      else nodeRefs.current.delete(id);
    };
  }, []);

  const recomputePaths = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const containerRect = container.getBoundingClientRect();
    setBox({ width: containerRect.width, height: containerRect.height });

    const rectFor = (id: string) => {
      const el = nodeRefs.current.get(id);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        top: r.top - containerRect.top,
        bottom: r.bottom - containerRect.top,
        left: r.left - containerRect.left,
        right: r.right - containerRect.left,
        centerX: r.left - containerRect.left + r.width / 2,
        centerY: r.top - containerRect.top + r.height / 2,
      };
    };

    const paths: EdgePath[] = [];

    for (const edge of PIPELINE_EDGES) {
      const from = nodeById.get(edge.from);
      const to = nodeById.get(edge.to);
      const fromRect = rectFor(edge.from);
      const toRect = rectFor(edge.to);
      if (!from || !to || !fromRect || !toRect) continue;

      let d: string;
      let labelX: number;
      let labelY: number;
      const sameLayer = from.layer === to.layer;

      if (sameLayer) {
        // Same row — connect the facing sides with a gentle horizontal arc.
        // Label is intentionally omitted here (the gap between cards is too
        // narrow) and shown instead as a caption under the layer heading.
        const goingRight = toRect.centerX > fromRect.centerX;
        const sx = goingRight ? fromRect.right : fromRect.left;
        const tx = goingRight ? toRect.left : toRect.right;
        const sy = fromRect.centerY;
        const ty = toRect.centerY;
        const midY = (sy + ty) / 2 - 26;
        d = `M ${sx} ${sy} C ${(sx + tx) / 2} ${midY}, ${(sx + tx) / 2} ${midY}, ${tx} ${ty}`;
        labelX = (sx + tx) / 2;
        labelY = midY - 8;
      } else {
        // Cross-layer — connect bottom of source to top of target.
        const sx = fromRect.centerX;
        const sy = fromRect.bottom;
        const tx = toRect.centerX;
        const ty = toRect.top;
        const dy = Math.max(ty - sy, 1);
        d = `M ${sx} ${sy} C ${sx} ${sy + dy * 0.55}, ${tx} ${ty - dy * 0.55}, ${tx} ${ty}`;
        labelX = (sx + tx) / 2;
        labelY = sy + dy / 2;
      }

      paths.push({
        key: `${edge.from}->${edge.to}`,
        d,
        labelX,
        labelY,
        label: sameLayer ? undefined : edge.label,
      });
    }

    setEdgePaths(paths);
  }, []);

  useEffect(() => {
    recomputePaths();
    const raf = requestAnimationFrame(recomputePaths);

    const container = containerRef.current;
    const ro = new ResizeObserver(() => recomputePaths());
    if (container) ro.observe(container);
    window.addEventListener("resize", recomputePaths);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      window.removeEventListener("resize", recomputePaths);
    };
  }, [recomputePaths]);

  useEffect(() => {
    if (!activeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId]);

  const activeNode = useMemo(
    () => (activeId ? (nodeById.get(activeId) ?? null) : null),
    [activeId],
  );

  const activePackage = activePackageId ? packageById.get(activePackageId) : undefined;

  const { routeNodeIds, routeEdgeKeys } = useMemo(() => {
    if (!activePackage) {
      return { routeNodeIds: new Set<string>(), routeEdgeKeys: new Set<string>() };
    }
    const nodeIds = new Set<string>();
    const edgeKeys = new Set<string>();
    for (const [from, to] of activePackage.hops) {
      nodeIds.add(from);
      nodeIds.add(to);
      edgeKeys.add(`${from}->${to}`);
    }
    return { routeNodeIds: nodeIds, routeEdgeKeys: edgeKeys };
  }, [activePackage]);

  const nodeState = useCallback(
    (id: string): VisualState => {
      if (!activePackage) return "neutral";
      return routeNodeIds.has(id) ? "active" : "dim";
    },
    [activePackage, routeNodeIds],
  );

  const edgeState = useCallback(
    (key: string): VisualState => {
      if (!activePackage) return "neutral";
      return routeEdgeKeys.has(key) ? "active" : "dim";
    },
    [activePackage, routeEdgeKeys],
  );

  const routeGroups = useMemo(() => {
    if (!activePackage) return [];
    return LAYERS.map((layer) => ({
      layer,
      nodes: nodesByLayer(layer).filter((n) => routeNodeIds.has(n.id)),
    })).filter((g) => g.nodes.length > 0);
  }, [activePackage, routeNodeIds]);

  return (
    <div className="relative">
      {/* ── Data packages selector ── */}
      <div
        className={cn(
          "mb-10 rounded-2xl border border-primary/15 bg-primary-dark p-5 sm:p-6",
          "shadow-[0_0_40px_-20px_var(--primary)]",
        )}
      >
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-accent-light" aria-hidden="true" />
          <p className="font-mono text-xs font-semibold tracking-[0.15em] text-accent-light">
            חבילות נתונים — בחרו כדי לראות את המסלול
          </p>
        </div>

        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="חבילות נתונים">
          {DATA_PACKAGES.map((pkg) => {
            const isActive = pkg.id === activePackageId;
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => setActivePackageId(isActive ? null : pkg.id)}
                aria-pressed={isActive}
                title={pkg.subtitle}
                className={cn(
                  "rounded-full border px-3.5 py-1.5 font-mono text-xs font-medium transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark",
                  isActive
                    ? "border-accent bg-accent text-primary-dark shadow-[0_0_16px_-2px_var(--accent)]"
                    : "border-white/20 bg-white/[0.04] text-white/80 hover:border-accent/50 hover:bg-white/[0.08]",
                )}
              >
                {pkg.title}
              </button>
            );
          })}
        </div>

        {activePackage ? (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setActivePackageId(null)}
              aria-label="נקה בחירה"
              className={cn(
                "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                "border border-white/25 text-white/70 transition-colors hover:border-accent hover:text-accent",
              )}
            >
              <X className="h-3 w-3" aria-hidden="true" />
            </button>
            <div className="flex flex-wrap items-center gap-1.5">
              {routeGroups.map((group, i) => (
                <div key={group.layer} className="flex items-center gap-1.5">
                  {i > 0 ? (
                    <ChevronLeft className="h-3.5 w-3.5 text-accent-light" aria-hidden="true" />
                  ) : null}
                  <div className="flex flex-wrap items-center gap-1">
                    {group.nodes.map((n) => (
                      <span
                        key={n.id}
                        className="rounded-md bg-white/10 px-2 py-1 font-mono text-[11px] text-white"
                      >
                        {n.name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>

      <div ref={containerRef} className="relative">
        {/* Connector overlay */}
        <svg
          className="pointer-events-none absolute inset-0 -z-0"
          width={box.width || undefined}
          height={box.height || undefined}
          viewBox={`0 0 ${box.width || 1} ${box.height || 1}`}
          aria-hidden="true"
        >
          <defs>
            <linearGradient id="pipeline-grad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary-light)" />
              <stop offset="100%" stopColor="var(--accent)" />
            </linearGradient>
            <filter id="pipeline-glow" x="-60%" y="-60%" width="220%" height="220%">
              <feGaussianBlur stdDeviation="2.5" result="blur" />
              <feMerge>
                <feMergeNode in="blur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
            <marker
              id="pipeline-arrow"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="6.5"
              markerHeight="6.5"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent-text)" />
            </marker>
            <marker
              id="pipeline-arrow-active"
              viewBox="0 0 10 10"
              refX="8"
              refY="5"
              markerWidth="8"
              markerHeight="8"
              orient="auto-start-reverse"
            >
              <path d="M 0 0 L 10 5 L 0 10 z" fill="var(--accent)" />
            </marker>
          </defs>
          {edgePaths.map((p) => {
            const state = edgeState(p.key);
            return (
              <path
                key={p.key}
                d={p.d}
                fill="none"
                stroke={state === "active" ? "url(#pipeline-grad)" : "var(--accent-text)"}
                strokeOpacity={state === "dim" ? 0.12 : state === "active" ? 1 : 0.4}
                strokeWidth={state === "active" ? 3 : 2}
                strokeLinecap="round"
                strokeDasharray="7 6"
                markerEnd={`url(#pipeline-arrow${state === "active" ? "-active" : ""})`}
                filter={state === "active" ? "url(#pipeline-glow)" : undefined}
                className={cn("pipeline-edge", state === "dim" && "pipeline-edge--dim")}
                style={state === "active" ? { animationDuration: "0.7s" } : undefined}
              />
            );
          })}
        </svg>

        {/* Traveling data packets */}
        {edgePaths.map((p) => {
          const state = edgeState(p.key);
          if (state === "dim") return null;
          return (
            <div
              key={`packet-${p.key}`}
              aria-hidden="true"
              className="pipeline-packet pointer-events-none absolute start-0 top-0 z-10 rounded-full"
              style={{
                offsetPath: `path("${p.d}")`,
                width: state === "active" ? 7 : 4,
                height: state === "active" ? 7 : 4,
                background: state === "active" ? "var(--accent)" : "var(--accent-text)",
                boxShadow:
                  state === "active"
                    ? "0 0 10px 2px var(--accent)"
                    : "0 0 4px 0 var(--accent-text)",
                animationDuration: state === "active" ? "1.3s" : "2.6s",
              }}
            />
          );
        })}

        {edgePaths
          .filter((p) => p.label)
          .map((p) => (
            <div
              key={`label-${p.key}`}
              className={cn(
                "pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-1/2",
                "rounded-full border border-accent/40 bg-white px-2.5 py-0.5",
                "font-mono text-[11px] font-medium text-accent-text shadow-sm",
              )}
              style={{ left: p.labelX, top: p.labelY }}
            >
              {p.label}
            </div>
          ))}

        {/* Layers */}
        <div className="relative z-10 flex flex-col gap-16 sm:gap-20">
          {LAYERS.map((layer) => (
            <div key={layer}>
              <p className="text-center font-mono text-xs font-semibold tracking-[0.2em] text-accent-text">
                {LAYER_LABELS[layer]}
              </p>
              {sameLayerNotes[layer] ? (
                <p className="mx-auto mb-4 mt-1 max-w-md text-center text-xs text-muted">
                  {sameLayerNotes[layer]}
                </p>
              ) : (
                <div className="mb-4" />
              )}
              <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 sm:gap-8">
                {nodesByLayer(layer).map((node) => {
                  const Icon = ICON_MAP[node.icon];
                  const state = nodeState(node.id);
                  return (
                    <button
                      key={node.id}
                      type="button"
                      ref={setNodeRef(node.id)}
                      onClick={() => setActiveId(node.id)}
                      aria-haspopup="dialog"
                      className={cn(
                        "group relative flex w-full flex-col items-start gap-3 rounded-xl border bg-white p-5 text-start",
                        "shadow-sm shadow-primary/5 transition-all duration-300",
                        "hover:-translate-y-0.5 hover:border-accent/50 hover:shadow-lg hover:shadow-primary/10",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
                        state === "active" &&
                          "border-accent ring-2 ring-accent/60 ring-offset-2 shadow-lg shadow-accent/20",
                        state === "dim" && "border-border/40 opacity-35 saturate-50",
                        state === "neutral" && "border-border/60",
                      )}
                    >
                      {/* HUD-style corner brackets — decorative tech accent */}
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute start-2 top-2 h-3 w-3 rounded-ss-sm border-t-2 border-s-2 border-accent/40"
                      />
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute end-2 bottom-2 h-3 w-3 rounded-ee-sm border-b-2 border-e-2 border-accent/40"
                      />

                      <div
                        className={cn(
                          "relative flex h-11 w-11 items-center justify-center rounded-lg",
                          "bg-primary/5 text-primary transition-colors duration-200",
                          "group-hover:bg-accent/10 group-hover:text-accent",
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                        <span className="absolute -end-1 -top-1 flex h-2.5 w-2.5">
                          <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                          <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
                        </span>
                      </div>
                      <div>
                        <h3 className="text-lg font-bold leading-snug text-primary-dark">
                          {node.name}
                        </h3>
                        <p className="mt-0.5 text-sm font-medium text-accent-text">
                          {node.tagline}
                        </p>
                        <p className="mt-1.5 font-mono text-[10px] tracking-wide text-muted/70">
                          {"// "}
                          {node.id}
                        </p>
                      </div>
                      <span className="mt-1 text-xs font-semibold text-primary/70 underline-offset-2 group-hover:underline">
                        לפרטים
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Detail modal */}
      {activeNode ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-primary-dark/60 p-4 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="pipeline-modal-heading"
          onClick={(e) => {
            if (e.target === e.currentTarget) setActiveId(null);
          }}
        >
          <div className="relative w-full max-w-lg rounded-2xl border border-border/60 bg-white p-6 shadow-2xl sm:p-8">
            <button
              type="button"
              onClick={() => setActiveId(null)}
              aria-label="סגירה"
              className={cn(
                "absolute end-4 top-4 flex h-8 w-8 items-center justify-center rounded-full",
                "text-muted transition-colors hover:bg-muted-bg hover:text-foreground",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent",
              )}
            >
              <X className="h-4 w-4" aria-hidden="true" />
            </button>

            <div className="flex items-start gap-4">
              <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/5 text-primary">
                {(() => {
                  const Icon = ICON_MAP[activeNode.icon];
                  return <Icon className="h-6 w-6" aria-hidden="true" />;
                })()}
              </div>
              <div>
                <h2
                  id="pipeline-modal-heading"
                  className="text-xl font-bold leading-snug text-primary-dark"
                >
                  {activeNode.name}
                </h2>
                <p className="mt-0.5 text-sm font-medium text-accent-text">
                  {activeNode.tagline}
                  {activeNode.codeName ? (
                    <span className="text-muted"> · בקוד: {activeNode.codeName}</span>
                  ) : null}
                </p>
              </div>
            </div>

            <p className="mt-5 text-sm leading-relaxed text-foreground/80">
              {activeNode.description}
            </p>

            <div className="mt-5 flex flex-wrap gap-2" aria-label="תגיות">
              {activeNode.tags.map((tag) => (
                <span
                  key={tag}
                  className="inline-block rounded-full border border-primary/10 bg-primary/5 px-3 py-1 font-mono text-xs font-medium text-primary-dark"
                >
                  {tag}
                </span>
              ))}
            </div>

            {activeNode.href ? (
              <div className="mt-6">
                <Link
                  href={activeNode.href}
                  target={activeNode.href.startsWith("http") ? "_blank" : undefined}
                  rel={activeNode.href.startsWith("http") ? "noopener noreferrer" : undefined}
                  className={cn(
                    "inline-flex items-center gap-2 rounded-lg border border-accent/30 bg-accent/5 px-5 py-2.5",
                    "text-sm font-bold text-primary-dark transition-all duration-200",
                    "hover:border-accent hover:bg-accent",
                  )}
                >
                  <span>
                    {activeNode.href.startsWith("http") ? "לקוד המקור" : "לעמוד הפרויקט"}
                  </span>
                  <ExternalLink className="h-4 w-4" aria-hidden="true" />
                </Link>
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
