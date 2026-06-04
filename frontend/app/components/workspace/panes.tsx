"use client";

import { useEffect, useRef, useState } from "react";
import { BASE } from "../api";
import { useWorkspace } from "./WorkspaceContext";
import { SILO_GROUPS, PlotGroupConfig } from "../charts/plotGroups";
import EnvChart from "../charts/EnvChart";
import YearFilter, { YearFilterValue, filterToRange } from "../charts/YearFilter";
import PaddockPanel from "../paddock/PaddockPanel";
import PhenologyPanel from "../phenology/PhenologyPanel";

// MIME marker for sidebar → grid drags (phase 2 will use it).
export const SIDEBAR_DRAG_MIME = "application/x-paddockts-pane-spec";

// ---------- shared placeholder ----------

function Pending({ label }: { label: string }) {
  return (
    <div
      style={{
        height: "100%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: "0.85rem",
        fontFamily: "monospace",
        color: "var(--text-muted)",
        padding: "1rem",
        textAlign: "center",
      }}
    >
      {label}
    </div>
  );
}

// ---------- video panes ----------

type VideoKey =
  | "sentinel2"
  | "sentinel2_paddocks"
  | "fractional_cover"
  | "fractional_cover_paddocks";

const VIDEO_FILE: Record<VideoKey, (stub: string) => string> = {
  sentinel2: (s) => `${s}_sentinel2.mp4`,
  sentinel2_paddocks: () => `sam_paddocks_sentinel2_paddocks.mp4`,
  fractional_cover: (s) => `${s}_fractional_cover.mp4`,
  fractional_cover_paddocks: () => `sam_paddocks_fractional_cover_paddocks.mp4`,
};

const VIDEO_READY_KEY: Record<VideoKey, keyof import("../query/useJobStatus").OutputStatus> = {
  sentinel2: "sentinel2_video",
  sentinel2_paddocks: "sentinel2_paddocks_video",
  fractional_cover: "vegfrac_video",
  fractional_cover_paddocks: "vegfrac_paddocks_video",
};

function VideoContent({ videoKey }: { videoKey: VideoKey }) {
  const { stub, outputs } = useWorkspace();
  const ready = outputs[VIDEO_READY_KEY[videoKey]];

  if (!ready) return <Pending label="video rendering..." />;

  const src = `${BASE}/static/${stub}/${VIDEO_FILE[videoKey](stub)}`;
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        background: "#000",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <video
        controls
        onLoadedMetadata={(e) => {
          const v = e.currentTarget;
          v.playbackRate = 0.25;
          v.defaultPlaybackRate = 0.25;
        }}
        style={{ maxWidth: "100%", maxHeight: "100%", display: "block" }}
        src={src}
      />
    </div>
  );
}

// ---------- env chart pane ----------

type EnvSource = "silo";

function EnvChartContent({ source, groupKey }: { source: EnvSource; groupKey: string }) {
  const { silo, outputs, paneResetKey } = useWorkspace();
  const [filter, setFilter] = useState<YearFilterValue>({ kind: "full" });
  useEffect(() => {
    setFilter({ kind: "full" });
  }, [paneResetKey]);

  const groups: Record<string, PlotGroupConfig> = SILO_GROUPS;
  const group = groups[groupKey];

  if (!group) return <Pending label={`unknown chart: ${source}/${groupKey}`} />;

  const ready = outputs.silo_ready;
  if (!ready) return <Pending label={`${source.toUpperCase()} download pending...`} />;

  const fetchState = silo;
  if (fetchState.loading) return <Pending label="loading..." />;
  if (fetchState.error) return <Pending label={fetchState.error} />;
  if (!fetchState.data.dates.length) return <Pending label="no data" />;

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
      <YearFilter dates={fetchState.data.dates} value={filter} onChange={setFilter} />
      <div style={{ flex: 1, minHeight: 0 }}>
        <EnvChart data={fetchState.data} group={group} xRange={filterToRange(filter)} />
      </div>
    </div>
  );
}

// ---------- paddock (combined calendar + phenology) + info ----------

function PaddockContent() {
  const { stub, outputs, paneResetKey } = useWorkspace();
  const calendarReady = outputs.paddock_segment && outputs.sentinel2_clean;
  const phenologyReady = outputs.paddockTS_ready;
  // key={paneResetKey} remounts the panel on reset, clearing paddock + year
  // selections and any hover/preview state.
  return (
    <PaddockPanel
      key={paneResetKey}
      stub={stub}
      calendarReady={calendarReady}
      phenologyReady={phenologyReady}
    />
  );
}

function PhenologyContent() {
  const { stub, outputs, paneResetKey } = useWorkspace();
  return (
    <PhenologyPanel
      key={paneResetKey}
      stub={stub}
      ready={outputs.paddockTS_ready}
    />
  );
}

function InfoContent() {
  const { stub, outputs } = useWorkspace();
  const ready = Object.values(outputs).filter(Boolean).length;
  const total = Object.keys(outputs).length;
  return (
    <div
      style={{
        fontSize: "0.85rem",
        fontFamily: "monospace",
        color: "var(--text-primary)",
        lineHeight: 1.6,
        padding: "0.5rem 0.75rem",
      }}
    >
      <div>stub: {stub}</div>
      <div>progress: {ready}/{total} outputs ready</div>
      <hr
        style={{
          border: "none",
          borderTop: "1px solid var(--border)",
          margin: "0.5rem 0",
        }}
      />
      {Object.entries(outputs).map(([k, v]) => (
        <div key={k} style={{ color: v ? "var(--green)" : "var(--text-muted)" }}>
          {v ? "✓" : "·"} {k}
        </div>
      ))}
    </div>
  );
}

// ---------- pane catalogue ----------

export type PaneSpec = {
  id: string;
  title: string;
  category: "Videos" | "Interactive" | "SILO" | "Info";
  /** Default grid columns (out of 12). */
  defaultW: number;
  /** Default grid rows (each row = 30 px by default rowHeight). */
  defaultH: number;
  render: () => React.ReactNode;
};

const W_HALF = 6;
const W_FULL = 12;
// Compact defaults — each row = 30 px. User can resize from the edges.
const H_VIDEO = 12; // 360 px
const H_PADDOCK = 14; // 420 px — controls + calendar row + ~240 px plot
const H_ENV = 10; // 300 px — Plotly chart 280 + chrome
const H_INFO = 6; // 180 px

export const PANES: PaneSpec[] = [
  { id: "video.sentinel2", title: "Sentinel-2", category: "Videos", defaultW: W_HALF, defaultH: H_VIDEO, render: () => <VideoContent videoKey="sentinel2" /> },
  { id: "video.sentinel2_paddocks", title: "S2 + Paddocks", category: "Videos", defaultW: W_HALF, defaultH: H_VIDEO, render: () => <VideoContent videoKey="sentinel2_paddocks" /> },
  { id: "video.fractional_cover", title: "Fractional Cover", category: "Videos", defaultW: W_HALF, defaultH: H_VIDEO, render: () => <VideoContent videoKey="fractional_cover" /> },
  { id: "video.fractional_cover_paddocks", title: "FC + Paddocks", category: "Videos", defaultW: W_HALF, defaultH: H_VIDEO, render: () => <VideoContent videoKey="fractional_cover_paddocks" /> },

  { id: "paddock", title: "Paddock · Calendar & Phenology", category: "Interactive", defaultW: W_FULL, defaultH: H_PADDOCK, render: () => <PaddockContent /> },
  { id: "phenology", title: "Phenology", category: "Interactive", defaultW: W_HALF, defaultH: H_ENV, render: () => <PhenologyContent /> },

  ...Object.entries(SILO_GROUPS).map(([key, g]) => ({
    id: `silo.${key}`,
    title: g.title.replace(/^SILO\s+/i, ""),
    category: "SILO" as const,
    defaultW: W_HALF,
    defaultH: H_ENV,
    render: () => <EnvChartContent source="silo" groupKey={key} />,
  })),

  { id: "info", title: "Info", category: "Info", defaultW: W_HALF, defaultH: H_INFO, render: () => <InfoContent /> },
];

export function findPane(id: string): PaneSpec | undefined {
  return PANES.find((p) => p.id === id);
}

// ---------- PaneCard: header + body wrapper for a grid item ----------

export function PaneCard({
  id,
  onClose,
  onOverflow,
}: {
  id: string;
  onClose: () => void;
  onOverflow?: (id: string, deficitPx: number) => void;
}) {
  const spec = findPane(id);
  const bodyRef = useRef<HTMLDivElement>(null);
  // `fired` lives in a ref so it survives effect re-runs (e.g. if a parent
  // re-renders and breaks our deps memoisation, we still don't refire).
  const firedRef = useRef(false);

  // Observe the body's scroll vs. client height once after mount. If content
  // overflows, fire onOverflow exactly once and disconnect — that's enough
  // to set the measured floor (minH) for this pane. Further firings would
  // be feedback noise (Plotly redraws + scrollbar visibility cycles).
  useEffect(() => {
    const el = bodyRef.current;
    if (!el || !onOverflow) return;
    if (firedRef.current) return;
    let debounceT: ReturnType<typeof setTimeout> | null = null;
    const ro = new ResizeObserver(() => {
      if (firedRef.current) return;
      if (debounceT) clearTimeout(debounceT);
      debounceT = setTimeout(() => {
        if (firedRef.current) return;
        const deficit = el.scrollHeight - el.clientHeight;
        if (deficit > 4) {
          firedRef.current = true;
          onOverflow(id, deficit);
          ro.disconnect();
        }
      }, 250);
    });
    ro.observe(el);
    if (el.firstElementChild) ro.observe(el.firstElementChild);
    return () => {
      if (debounceT) clearTimeout(debounceT);
      ro.disconnect();
    };
  }, [id, onOverflow]);

  if (!spec) return null;
  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg)",
        border: "1px solid var(--border)",
        boxSizing: "border-box",
        overflow: "hidden",
      }}
    >
      <div
        className="pane-drag-handle"
        style={{
          height: 28,
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 0.5rem 0 0.75rem",
          background: "rgba(255,255,255,0.04)",
          borderBottom: "1px solid var(--border)",
          cursor: "move",
          fontFamily: "monospace",
          fontSize: "0.8rem",
          color: "var(--text-primary)",
          userSelect: "none",
        }}
      >
        <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
          {spec.title}
        </span>
        <button
          type="button"
          onClick={onClose}
          onMouseDown={(e) => e.stopPropagation()}
          title="Close pane"
          style={{
            background: "transparent",
            border: "none",
            color: "var(--text-secondary)",
            cursor: "pointer",
            fontSize: "1rem",
            padding: "0 0.25rem",
          }}
        >
          ×
        </button>
      </div>
      <div
        ref={bodyRef}
        style={{
          flex: 1,
          minHeight: 0,
          overflow: "hidden",
          padding: "0.5rem 0.75rem",
          boxSizing: "border-box",
        }}
      >
        {spec.render()}
      </div>
    </div>
  );
}
