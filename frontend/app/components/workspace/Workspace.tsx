"use client";

import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import GridLayout, { Layout } from "react-grid-layout";
import { useJobStatus } from "../query/useJobStatus";
import { useEnvironmentalData } from "../charts/useEnvironmentalData";
import { WorkspaceProvider } from "./WorkspaceContext";
import { PANES, PaneCard, findPane } from "./panes";
import Sidebar from "./Sidebar";

type Props = { stub: string };

const COLS = 12;
const ROW_HEIGHT = 30;

// ---------------- default layout ----------------

// 4 videos stacked vertically on the left; rainfall, evapotranspiration,
// soil moisture, and the combined paddock (calendar + phenology) block on
// the right.
const ROW_H = 14;
const DEFAULT_LAYOUT: Layout[] = [
  { i: "video.sentinel2",                  x: 0, y: 0 * ROW_H, w: 5, h: ROW_H },
  { i: "video.sentinel2_paddocks",         x: 0, y: 1 * ROW_H, w: 5, h: ROW_H },
  { i: "video.fractional_cover",           x: 0, y: 2 * ROW_H, w: 5, h: ROW_H },
  { i: "video.fractional_cover_paddocks",  x: 0, y: 3 * ROW_H, w: 5, h: ROW_H },
  { i: "silo.temperature",                 x: 5, y: 0 * ROW_H, w: 7, h: ROW_H },
  { i: "rain_soil",                        x: 5, y: 1 * ROW_H, w: 7, h: ROW_H },
  { i: "silo.evapotranspiration",          x: 5, y: 2 * ROW_H, w: 7, h: ROW_H },
  { i: "paddock",                          x: 5, y: 3 * ROW_H, w: 7, h: ROW_H },
];

// ---------------- activity bar ----------------

type ActivityIconId = "outputs";

function ActivityBar({
  active,
  onSelect,
  onResetLayout,
}: {
  active: ActivityIconId | null;
  onSelect: (id: ActivityIconId | null) => void;
  onResetLayout: () => void;
}) {
  const btn = (id: ActivityIconId, label: string, icon: string) => (
    <button
      key={id}
      type="button"
      title={label}
      onClick={() => onSelect(active === id ? null : id)}
      style={{
        width: 48,
        height: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "transparent",
        border: "none",
        borderLeft: active === id ? "2px solid var(--text-primary)" : "2px solid transparent",
        cursor: "pointer",
        color: active === id ? "var(--text-primary)" : "var(--text-secondary)",
        fontSize: "1.1rem",
      }}
    >
      {icon}
    </button>
  );

  return (
    <div
      style={{
        width: 48,
        background: "var(--bg)",
        borderRight: "1px solid var(--border)",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        padding: "0.25rem 0",
        flexShrink: 0,
      }}
    >
      {btn("outputs", "Outputs", "▦")}
      <Link
        href="/"
        title="Back to home"
        style={{
          width: 48,
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-secondary)",
          textDecoration: "none",
          fontSize: "1.1rem",
        }}
      >
        ←
      </Link>
      <button
        type="button"
        title="Reset layout to default"
        onClick={onResetLayout}
        style={{
          width: 48,
          height: 48,
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "transparent",
          border: "none",
          cursor: "pointer",
          color: "var(--text-secondary)",
          fontSize: "1rem",
        }}
      >
        ↺
      </button>
      <div style={{ flex: 1 }} />
    </div>
  );
}

// ---------------- root ----------------

export default function Workspace({ stub }: Props) {
  const { outputs } = useJobStatus(stub);
  const silo = useEnvironmentalData(stub, "silo", outputs.silo_ready);
  const ozwald = useEnvironmentalData(stub, "ozwald_daily", outputs.ozwald_daily_ready);
  const ozwald8day = useEnvironmentalData(stub, "ozwald_8day", outputs.ozwald_8day_ready);

  const [activePanel, setActivePanel] = useState<ActivityIconId | null>("outputs");
  const [layout, setLayout] = useState<Layout[]>(DEFAULT_LAYOUT);
  const [containerWidth, setContainerWidth] = useState<number>(1200);
  const [draggingSpecId, setDraggingSpecId] = useState<string | null>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);

  const layoutKey = `workspace-grid:${stub}`;

  // Load saved layout on mount.
  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(layoutKey);
      if (saved) {
        const parsed = JSON.parse(saved) as Layout[];
        if (Array.isArray(parsed) && parsed.every((p) => p && typeof p.i === "string")) {
          setLayout(parsed);
        }
      }
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stub]);

  // Track grid container width for react-grid-layout (needs an explicit width).
  useEffect(() => {
    if (!gridContainerRef.current) return;
    const el = gridContainerRef.current;
    const update = () => setContainerWidth(el.clientWidth);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [activePanel]);

  const handleLayoutChange = (newLayout: Layout[]) => {
    setLayout(newLayout);
    try {
      window.localStorage.setItem(layoutKey, JSON.stringify(newLayout));
    } catch {}
  };

  // Pane reported its content is taller than its body (would scroll).
  // Grow that item's h and minH just enough to clear the overflow. Stable
  // identity (useCallback) keeps PaneCard's ResizeObserver effect from
  // re-arming on every Workspace render.
  const handleOverflow = useCallback((id: string, deficitPx: number) => {
    const deficitRows = Math.ceil(deficitPx / (ROW_HEIGHT + 8));
    if (deficitRows <= 0) return;
    setLayout((cur) => {
      const idx = cur.findIndex((l) => l.i === id);
      if (idx === -1) return cur;
      const item = cur[idx];
      const newH = item.h + deficitRows;
      const newMinH = Math.max(item.minH ?? 1, newH);
      if (newH === item.h && newMinH === (item.minH ?? 1)) return cur;
      const next = [...cur];
      next[idx] = { ...item, h: newH, minH: newMinH };
      try {
        window.localStorage.setItem(layoutKey, JSON.stringify(next));
      } catch {}
      return next;
    });
  }, [layoutKey]);

  const openPane = (id: string) => {
    if (layout.find((l) => l.i === id)) return; // already open
    const spec = findPane(id);
    if (!spec) return;
    // Append at the bottom of the grid; vertical-compact will close any gaps.
    const maxY = layout.reduce((m, l) => Math.max(m, l.y + l.h), 0);
    handleLayoutChange([
      ...layout,
      { i: id, x: 0, y: maxY, w: spec.defaultW, h: spec.defaultH },
    ]);
  };

  const closePane = (id: string) => {
    handleLayoutChange(layout.filter((l) => l.i !== id));
  };

  const resetLayout = () => {
    try {
      window.localStorage.removeItem(layoutKey);
    } catch {}
    setLayout(DEFAULT_LAYOUT);
  };

  // Drop-from-sidebar handler. RGL's onDrop fires with the layout (already
  // containing the placeholder), the placeholder layoutItem, and the native
  // event. We replace the placeholder id with the actual pane spec id and
  // size to the spec's defaults.
  const DROP_PLACEHOLDER_ID = "__dropping__";
  const handleDrop = (_newLayout: Layout[], item: Layout) => {
    const specId = draggingSpecId;
    setDraggingSpecId(null);
    if (!specId) return;
    if (layout.find((l) => l.i === specId)) return; // already open
    const spec = findPane(specId);
    if (!spec) return;
    const next = layout
      .filter((l) => l.i !== DROP_PLACEHOLDER_ID)
      .concat({
        i: specId,
        x: item.x,
        y: item.y,
        w: spec.defaultW,
        h: spec.defaultH,
      });
    handleLayoutChange(next);
  };

  const droppingItem = draggingSpecId
    ? (() => {
        const spec = findPane(draggingSpecId);
        return {
          i: DROP_PLACEHOLDER_ID,
          w: spec?.defaultW ?? 6,
          h: spec?.defaultH ?? 8,
        };
      })()
    : undefined;

  const readyCount = Object.values(outputs).filter(Boolean).length;
  const totalCount = Object.keys(outputs).length;
  const openIds = layout.map((l) => l.i);

  return (
    <WorkspaceProvider value={{ stub, outputs, silo, ozwald, ozwald8day }}>
      <div
        style={{
          width: "100%",
          background: "var(--bg)",
          display: "flex",
          flexDirection: "column",
          minHeight: "100vh",
        }}
      >
        <div
          style={{
            height: 48,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "0 0.75rem",
            borderBottom: "1px solid var(--border)",
            fontFamily: "monospace",
            fontSize: "0.85rem",
            color: "var(--text-primary)",
            flexShrink: 0,
          }}
        >
          <div>{stub}</div>
          <div style={{ color: "var(--text-secondary)" }}>
            {readyCount}/{totalCount} outputs ready
          </div>
        </div>

        <div style={{ display: "flex", flex: 1, minHeight: 0 }}>
          <ActivityBar
            active={activePanel}
            onSelect={setActivePanel}
            onResetLayout={resetLayout}
          />
          {activePanel === "outputs" && (
            <div style={{ width: 240, flexShrink: 0 }}>
              <Sidebar
                openIds={openIds}
                onOpen={openPane}
                onDragStart={setDraggingSpecId}
                onDragEnd={() => setDraggingSpecId(null)}
              />
            </div>
          )}
          <div ref={gridContainerRef} style={{ flex: 1, minWidth: 0, padding: "0.5rem" }}>
            <GridLayout
              layout={layout}
              cols={COLS}
              rowHeight={ROW_HEIGHT}
              width={containerWidth}
              draggableHandle=".pane-drag-handle"
              compactType="vertical"
              isResizable
              isDraggable
              isDroppable={!!draggingSpecId}
              droppingItem={droppingItem}
              onDrop={handleDrop}
              resizeHandles={["s", "w", "e", "n", "sw", "se", "nw", "ne"]}
              margin={[8, 8]}
              containerPadding={[0, 0]}
              onLayoutChange={handleLayoutChange}
            >
              {layout.map((item) => (
                <div key={item.i}>
                  <PaneCard
                    id={item.i}
                    onClose={() => closePane(item.i)}
                    onOverflow={handleOverflow}
                  />
                </div>
              ))}
            </GridLayout>
          </div>
        </div>

        <div
          style={{
            height: 32,
            borderTop: "1px solid var(--border)",
            padding: "0 1rem",
            fontFamily: "monospace",
            fontSize: "0.7rem",
            color: "var(--text-secondary)",
            display: "flex",
            alignItems: "center",
            gap: "1rem",
            overflowX: "auto",
            whiteSpace: "nowrap",
            flexShrink: 0,
          }}
        >
          {Object.entries(outputs).map(([k, v]) => (
            <div key={k} style={{ color: v ? "var(--green)" : "var(--text-muted)" }}>
              {v ? "✓" : "·"} {k}
            </div>
          ))}
        </div>
      </div>
    </WorkspaceProvider>
  );
}
