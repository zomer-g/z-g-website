"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import {
  ScrollText,
  Globe2,
  Globe,
  DownloadCloud,
  FolderKanban,
  History,
  Scale,
  Newspaper,
  Calendar,
  Network,
  Puzzle,
  ExternalLink,
  Github,
  ChevronLeft,
  ArrowUpLeft,
  Database,
  Layers,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  PIPELINE_NODES,
  PIPELINE_EDGES,
  PIPELINE_SERIES,
  LAYER_LABELS,
  DATA_PACKAGES,
  type PipelineIcon,
  type PipelineLayer,
  type PipelineNode,
} from "./pipeline-data";

const ICON_MAP: Record<PipelineIcon, LucideIcon> = {
  ScrollText,
  Globe2,
  Globe,
  DownloadCloud,
  FolderKanban,
  History,
  Scale,
  Newspaper,
  Calendar,
  Network,
  Puzzle,
  Database,
};

const LAYERS: PipelineLayer[] = [
  "scrapers",
  "extensions",
  "seed",
  "platforms",
  "consumer",
];

const nodesByLayer = (layer: PipelineLayer) =>
  PIPELINE_NODES.filter((n) => n.layer === layer).sort((a, b) => a.order - b.order);

// Structural lookup (layer/edge geometry). Text is overlaid separately.
const nodeById = new Map(PIPELINE_NODES.map((n) => [n.id, n]));
const packageById = new Map(DATA_PACKAGES.map((p) => [p.id, p]));
const seriesById = new Map(PIPELINE_SERIES.map((s) => [s.id, s]));
const seriesByNode = new Map(
  PIPELINE_SERIES.flatMap((s) => s.nodeIds.map((id) => [id, s] as const)),
);

// One arrowhead marker per highlight color, so an active edge's arrowhead
// matches its stroke (gold for packages, the family color for a series).
const ARROW_MARKERS = [
  { id: "arrow-neutral", color: "var(--accent-text)", size: 6.5 },
  { id: "arrow-gold", color: "var(--accent)", size: 8 },
  ...PIPELINE_SERIES.map((s) => ({ id: `arrow-${s.id}`, color: s.color, size: 8 })),
];

const sameLayerNotes: Partial<Record<PipelineLayer, string>> = {};
for (const edge of PIPELINE_EDGES) {
  const from = nodeById.get(edge.from);
  const to = nodeById.get(edge.to);
  if (from && to && from.layer === to.layer && edge.label) {
    sameLayerNotes[from.layer] = edge.label;
  }
}

type VisualState = "neutral" | "active" | "dim";
type Selection = { kind: "package" | "series"; id: string } | null;

export interface NodeTextOverride {
  name?: string;
  tagline?: string;
  description?: string;
}

interface EdgePath {
  key: string;
  d: string;
  labelX: number;
  labelY: number;
  label?: string;
  bidirectional: boolean;
}

export function PipelineMap({
  nodeText,
}: {
  nodeText?: Record<string, NodeTextOverride>;
}) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const nodeRefs = useRef<Map<string, HTMLElement>>(new Map());
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [edgePaths, setEdgePaths] = useState<EdgePath[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [selection, setSelection] = useState<Selection>(null);

  // Resolve a node's display text: CMS override (trimmed, non-empty) wins.
  const disp = useCallback(
    (n: PipelineNode) => {
      const o = nodeText?.[n.id];
      return {
        name: o?.name?.trim() || n.name,
        tagline: o?.tagline?.trim() || n.tagline,
        description: o?.description?.trim() || n.description,
      };
    },
    [nodeText],
  );

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
        // Cross-layer — connect bottom of the upper node to top of the lower.
        const upper = fromRect.centerY <= toRect.centerY ? fromRect : toRect;
        const lower = fromRect.centerY <= toRect.centerY ? toRect : fromRect;
        const sx = upper.centerX;
        const sy = upper.bottom;
        const tx = lower.centerX;
        const ty = lower.top;
        const dy = Math.max(ty - sy, 1);
        const forward = fromRect.centerY <= toRect.centerY;
        if (forward) {
          d = `M ${sx} ${sy} C ${sx} ${sy + dy * 0.55}, ${tx} ${ty - dy * 0.55}, ${tx} ${ty}`;
        } else {
          d = `M ${tx} ${ty} C ${tx} ${ty - dy * 0.55}, ${sx} ${sy + dy * 0.55}, ${sx} ${sy}`;
        }
        labelX = (sx + tx) / 2;
        labelY = sy + dy / 2;
      }

      paths.push({
        key: `${edge.from}->${edge.to}`,
        d,
        labelX,
        labelY,
        label: sameLayer ? undefined : edge.label,
        bidirectional: !!edge.bidirectional,
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
    const raf = requestAnimationFrame(recomputePaths);
    return () => cancelAnimationFrame(raf);
  }, [nodeText, recomputePaths]);

  useEffect(() => {
    if (!activeId) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setActiveId(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeId]);

  // ── URL externalization ──────────────────────────────────────────────
  // Restore selection + open node from the query string on mount, and write
  // them back on change (without a navigation) so any state is linkable.
  const didInitUrl = useRef(false);
  const skipFirstWrite = useRef(true);

  useEffect(() => {
    const p = new URLSearchParams(window.location.search);
    const series = p.get("series");
    const pkg = p.get("package");
    const node = p.get("node");
    if (series && seriesById.has(series)) setSelection({ kind: "series", id: series });
    else if (pkg && packageById.has(pkg)) setSelection({ kind: "package", id: pkg });
    if (node && nodeById.has(node)) setActiveId(node);
    didInitUrl.current = true;
  }, []);

  useEffect(() => {
    if (skipFirstWrite.current) {
      skipFirstWrite.current = false;
      return;
    }
    const url = new URL(window.location.href);
    url.searchParams.delete("package");
    url.searchParams.delete("series");
    url.searchParams.delete("node");
    if (selection?.kind === "package") url.searchParams.set("package", selection.id);
    else if (selection?.kind === "series") url.searchParams.set("series", selection.id);
    if (activeId) url.searchParams.set("node", activeId);
    window.history.replaceState(null, "", url.toString());
  }, [selection, activeId]);

  const activeNode = useMemo(
    () => (activeId ? (nodeById.get(activeId) ?? null) : null),
    [activeId],
  );

  const activePackage =
    selection?.kind === "package" ? packageById.get(selection.id) : undefined;
  const activeSeries =
    selection?.kind === "series" ? seriesById.get(selection.id) : undefined;
  const hasSelection = !!(activePackage || activeSeries);

  // Color used to highlight the active route/family (CSS value).
  const highlightColor = activeSeries?.color ?? "var(--accent)";

  const { routeNodeIds, routeEdgeKeys } = useMemo(() => {
    const nodeIds = new Set<string>();
    const edgeKeys = new Set<string>();
    if (activePackage) {
      for (const [from, to] of activePackage.hops) {
        nodeIds.add(from);
        nodeIds.add(to);
        edgeKeys.add(`${from}->${to}`);
      }
    } else if (activeSeries) {
      for (const id of activeSeries.nodeIds) nodeIds.add(id);
      // Light only the edges LEAVING the family, so its reach is shown
      // without lighting up unrelated nodes that merely feed into it
      // (e.g. selecting לעם must not light לץ הלמ"ס, which queries OVER).
      for (const e of PIPELINE_EDGES) {
        if (activeSeries.nodeIds.includes(e.from)) {
          edgeKeys.add(`${e.from}->${e.to}`);
        }
      }
    }
    return { routeNodeIds: nodeIds, routeEdgeKeys: edgeKeys };
  }, [activePackage, activeSeries]);

  const nodeState = useCallback(
    (id: string): VisualState => {
      if (activeSeries) {
        return activeSeries.nodeIds.includes(id) ? "active" : "dim";
      }
      if (activePackage) return routeNodeIds.has(id) ? "active" : "dim";
      return "neutral";
    },
    [activePackage, activeSeries, routeNodeIds],
  );

  const edgeState = useCallback(
    (key: string): VisualState => {
      if (!hasSelection) return "neutral";
      return routeEdgeKeys.has(key) ? "active" : "dim";
    },
    [hasSelection, routeEdgeKeys],
  );

  const routeGroups = useMemo(() => {
    if (!hasSelection) return [];
    return LAYERS.map((layer) => ({
      layer,
      nodes: nodesByLayer(layer).filter((n) => routeNodeIds.has(n.id)),
    })).filter((g) => g.nodes.length > 0);
  }, [hasSelection, routeNodeIds]);

  const togglePackage = (id: string) =>
    setSelection((s) => (s?.kind === "package" && s.id === id ? null : { kind: "package", id }));
  const toggleSeries = (id: string) =>
    setSelection((s) => (s?.kind === "series" && s.id === id ? null : { kind: "series", id }));

  return (
    <div className="relative">
      {/* ── Selector panel ── */}
      <div
        className={cn(
          "mb-10 rounded-2xl border border-primary/15 bg-primary-dark p-5 sm:p-6",
          "shadow-[0_0_40px_-20px_var(--primary)]",
        )}
      >
        {/* Data packages */}
        <div className="flex items-center gap-2">
          <Database className="h-4 w-4 text-accent-light" aria-hidden="true" />
          <p className="font-mono text-xs font-semibold tracking-[0.15em] text-accent-light">
            חבילות נתונים — בחרו כדי לראות את המסלול
          </p>
        </div>
        <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="חבילות נתונים">
          {DATA_PACKAGES.map((pkg) => {
            const isActive = selection?.kind === "package" && selection.id === pkg.id;
            return (
              <button
                key={pkg.id}
                type="button"
                onClick={() => togglePackage(pkg.id)}
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

        {/* Project series */}
        <div className="mt-5 border-t border-white/10 pt-4">
          <div className="flex items-center gap-2">
            <Layers className="h-4 w-4 text-accent-light" aria-hidden="true" />
            <p className="font-mono text-xs font-semibold tracking-[0.15em] text-accent-light">
              סדרות פרויקטים — בחרו כדי להדליק סדרה
            </p>
          </div>
          <div className="mt-4 flex flex-wrap gap-2" role="group" aria-label="סדרות פרויקטים">
            {PIPELINE_SERIES.map((s) => {
              const isActive = selection?.kind === "series" && selection.id === s.id;
              return (
                <button
                  key={s.id}
                  type="button"
                  onClick={() => toggleSeries(s.id)}
                  aria-pressed={isActive}
                  style={
                    isActive
                      ? { backgroundColor: s.color, borderColor: s.color, color: "#fff" }
                      : { borderColor: `${s.color}66` }
                  }
                  className={cn(
                    "inline-flex items-center gap-1.5 rounded-full border px-3.5 py-1.5 font-mono text-xs font-medium transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white focus-visible:ring-offset-2 focus-visible:ring-offset-primary-dark",
                    !isActive && "bg-white/[0.04] text-white/85 hover:bg-white/[0.08]",
                  )}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: isActive ? "#fff" : s.color }}
                    aria-hidden="true"
                  />
                  {s.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Selection summary */}
        {hasSelection ? (
          <div className="mt-5 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
            <button
              type="button"
              onClick={() => setSelection(null)}
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
                        {disp(n).name}
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
            {activeSeries?.href ? (
              <Link
                href={activeSeries.href}
                target="_blank"
                rel="noopener noreferrer"
                className="ms-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold text-primary-dark transition-opacity hover:opacity-90"
                style={{ backgroundColor: activeSeries.color, color: "#fff" }}
              >
                <span>לאתר הסדרה</span>
                <ArrowUpLeft className="h-3.5 w-3.5" aria-hidden="true" />
              </Link>
            ) : null}
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
            {ARROW_MARKERS.map((m) => (
              <marker
                key={m.id}
                id={m.id}
                viewBox="0 0 10 10"
                refX="8"
                refY="5"
                markerWidth={m.size}
                markerHeight={m.size}
                orient="auto-start-reverse"
              >
                <path d="M 0 0 L 10 5 L 0 10 z" fill={m.color} />
              </marker>
            ))}
          </defs>
          {edgePaths.map((p) => {
            const state = edgeState(p.key);
            const active = state === "active";
            const markerId = active
              ? activeSeries
                ? `arrow-${activeSeries.id}`
                : "arrow-gold"
              : "arrow-neutral";
            const stroke = active ? highlightColor : "var(--accent-text)";
            return (
              <g key={p.key}>
                {/* Soft halo under active edges. */}
                {active ? (
                  <path
                    d={p.d}
                    fill="none"
                    stroke={highlightColor}
                    strokeOpacity={0.25}
                    strokeWidth={8}
                    strokeLinecap="round"
                  />
                ) : null}
                <path
                  d={p.d}
                  fill="none"
                  stroke={stroke}
                  strokeOpacity={state === "dim" ? 0.12 : active ? 1 : 0.42}
                  strokeWidth={active ? 3 : 2}
                  strokeLinecap="round"
                  strokeDasharray="7 6"
                  markerEnd={`url(#${markerId})`}
                  markerStart={p.bidirectional ? `url(#${markerId})` : undefined}
                  className={cn("pipeline-edge", state === "dim" && "pipeline-edge--dim")}
                  style={active ? { animationDuration: "0.7s" } : undefined}
                />
              </g>
            );
          })}
        </svg>

        {/* Traveling data packets */}
        {edgePaths.map((p) => {
          const state = edgeState(p.key);
          if (state === "dim") return null;
          const active = state === "active";
          return (
            <div
              key={`packet-${p.key}`}
              aria-hidden="true"
              className="pipeline-packet pointer-events-none absolute start-0 top-0 z-10 rounded-full"
              style={{
                offsetPath: `path("${p.d}")`,
                width: active ? 7 : 4,
                height: active ? 7 : 4,
                background: active ? highlightColor : "var(--accent-text)",
                boxShadow: active
                  ? `0 0 10px 2px ${highlightColor}`
                  : "0 0 4px 0 var(--accent-text)",
                animationDuration: active ? "1.3s" : "2.6s",
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
              <div
                className={cn(
                  "flex flex-wrap gap-y-6 gap-x-10 sm:gap-x-16 lg:gap-x-20",
                  // The lone external "seed" node (מידע לעם) is pushed to the
                  // end side (left in RTL), above the OCAL/OCOI cluster it
                  // feeds, so the scraper→platform arrows running down the
                  // centre/right don't cross over it.
                  layer === "seed" ? "justify-center sm:justify-end" : "justify-center",
                )}
              >
                {nodesByLayer(layer).map((node) => {
                  const Icon = ICON_MAP[node.icon];
                  const state = nodeState(node.id);
                  const text = disp(node);
                  const series = seriesByNode.get(node.id);
                  const external = node.external;
                  const glow = state === "active" ? highlightColor : null;
                  return (
                    <button
                      key={node.id}
                      type="button"
                      ref={setNodeRef(node.id)}
                      onClick={() => setActiveId(node.id)}
                      aria-haspopup="dialog"
                      style={{
                        borderColor: series ? series.color : undefined,
                        boxShadow: glow
                          ? `0 0 0 2px ${glow}, 0 12px 32px -10px ${glow}`
                          : undefined,
                      }}
                      className={cn(
                        "group relative flex w-full flex-col items-start gap-3 rounded-xl p-4 text-start sm:w-[184px] sm:p-5 lg:w-[200px]",
                        "shadow-sm shadow-primary/5 transition-all duration-300",
                        "hover:-translate-y-0.5 hover:shadow-lg hover:shadow-primary/10",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2",
                        external
                          ? "border border-dashed border-muted/50 bg-muted-bg/40"
                          : "bg-white",
                        !external && (series ? "border-2" : "border border-border/60"),
                        state === "dim" && "opacity-35 saturate-50",
                      )}
                    >
                      {/* Series top bar — persistent family frame */}
                      {series ? (
                        <span
                          aria-hidden="true"
                          className="pointer-events-none absolute inset-x-0 top-0 h-1 rounded-t-[10px]"
                          style={{ background: series.color }}
                        />
                      ) : null}
                      {/* HUD-style corner brackets — decorative tech accent */}
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none absolute start-2 top-2 h-3 w-3 rounded-ss-sm border-t-2 border-s-2",
                          external ? "border-muted/40" : "border-accent/40",
                        )}
                      />
                      <span
                        aria-hidden="true"
                        className={cn(
                          "pointer-events-none absolute end-2 bottom-2 h-3 w-3 rounded-ee-sm border-b-2 border-e-2",
                          external ? "border-muted/40" : "border-accent/40",
                        )}
                      />

                      <div
                        className={cn(
                          "relative flex h-11 w-11 items-center justify-center rounded-lg transition-colors duration-200",
                          external
                            ? "bg-muted/10 text-muted"
                            : "bg-primary/5 text-primary group-hover:bg-accent/10 group-hover:text-accent",
                        )}
                      >
                        <Icon className="h-5 w-5" aria-hidden="true" />
                        {external ? null : (
                          <span className="absolute -end-1 -top-1 flex h-2.5 w-2.5">
                            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-accent opacity-75" />
                            <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-accent" />
                          </span>
                        )}
                      </div>
                      <div className="w-full">
                        <h3
                          className={cn(
                            "text-base font-bold leading-snug",
                            external ? "text-muted" : "text-primary-dark",
                          )}
                        >
                          {text.name}
                        </h3>
                        <p
                          className={cn(
                            "mt-0.5 text-sm font-medium",
                            external ? "text-muted/80" : "text-accent-text",
                          )}
                        >
                          {text.tagline}
                        </p>
                        {node.badges?.length ? (
                          <div className="mt-2 flex flex-wrap gap-1">
                            {node.badges.map((b) => (
                              <span
                                key={b}
                                className="rounded border border-primary/20 bg-primary/5 px-1.5 py-0.5 font-mono text-[10px] font-semibold text-primary-dark"
                              >
                                {b}
                              </span>
                            ))}
                          </div>
                        ) : null}
                        <div className="mt-1.5 flex items-center gap-1.5">
                          {series ? (
                            <span
                              className="inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 text-[10px] font-semibold"
                              style={{
                                color: series.color,
                                borderColor: series.color,
                                backgroundColor: `${series.color}14`,
                              }}
                            >
                              {series.short}
                            </span>
                          ) : null}
                          <span className="font-mono text-[10px] tracking-wide text-muted/70">
                            {"// "}
                            {node.id}
                          </span>
                        </div>
                      </div>
                      <span
                        className={cn(
                          "mt-1 text-xs font-semibold underline-offset-2 group-hover:underline",
                          external ? "text-muted/80" : "text-primary/70",
                        )}
                      >
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
                  {disp(activeNode).name}
                </h2>
                <p className="mt-0.5 text-sm font-medium text-accent-text">
                  {disp(activeNode).tagline}
                  {activeNode.codeName ? (
                    <span className="text-muted"> · בקוד: {activeNode.codeName}</span>
                  ) : null}
                </p>
              </div>
            </div>

            {(() => {
              const series = seriesByNode.get(activeNode.id);
              if (!series) return null;
              return (
                <div
                  className="mt-4 inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-semibold"
                  style={{
                    color: series.color,
                    borderColor: series.color,
                    backgroundColor: `${series.color}14`,
                  }}
                >
                  <span
                    className="inline-block h-2 w-2 rounded-full"
                    style={{ background: series.color }}
                    aria-hidden="true"
                  />
                  {series.label}
                </div>
              );
            })()}

            <p className="mt-5 text-sm leading-relaxed text-foreground/80">
              {disp(activeNode).description}
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

            {activeNode.links?.length ? (
              <div className="mt-6 flex flex-wrap gap-2">
                {activeNode.links.map((lnk) => {
                  const isGithub = lnk.kind === "github";
                  const LinkIcon = isGithub ? Github : ExternalLink;
                  const label =
                    lnk.label ??
                    (isGithub
                      ? "GitHub"
                      : lnk.kind === "page"
                        ? "לעמוד באתר"
                        : "לאתר הפרויקט");
                  return (
                    <Link
                      key={lnk.url}
                      href={lnk.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={cn(
                        "inline-flex items-center gap-2 rounded-lg border px-4 py-2 text-sm font-bold transition-all duration-200",
                        isGithub
                          ? "border-primary/20 bg-primary/5 text-primary-dark hover:border-primary hover:bg-primary hover:text-white"
                          : "border-accent/30 bg-accent/5 text-primary-dark hover:border-accent hover:bg-accent",
                      )}
                    >
                      <LinkIcon className="h-4 w-4" aria-hidden="true" />
                      <span>{label}</span>
                    </Link>
                  );
                })}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
