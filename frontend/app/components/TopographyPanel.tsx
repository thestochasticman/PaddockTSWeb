
"use client";

import { useEffect, useMemo, useState } from "react";
import { Responsive, WidthProvider, Layout, Layouts } from "react-grid-layout";

const ResponsiveGridLayout = WidthProvider(Responsive);

export type TopographyItem = {
  id: string;
  title: string;

  // map + colorbar images (saved separately from Python)
  mapSrc: string;
  cbarSrc: string;

  // optional layout hints
  w?: number; // grid width in columns
  h?: number; // grid height in rows (optional)

  // OPTIONAL: treat this as MAP aspect (map height / map width)
  // You can omit it; we compute from mapSrc in-browser.
  aspectRatio?: number;
};

type Props = {
  items: TopographyItem[];
};

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 } as const;
const COLS = { lg: 12, md: 12, sm: 8, xs: 4, xxs: 1 } as const;

const ROW_HEIGHT = 60;
const MARGIN: [number, number] = [6, 6];
const CONTAINER_PADDING: [number, number] = [4, 4];

// Keep the colorbar readable in the frontend
const CBAR_FRAC = 0.18; // used only for layout math (approx)
const CBAR_MIN_PX = 120;
const CBAR_MAX_PX = 180;

function bottomRows(layout: Layout[]): number {
  let b = 0;
  for (const it of layout) b = Math.max(b, (it.y ?? 0) + (it.h ?? 0));
  return b;
}

function rowsToPx(rows: number): number {
  if (rows <= 0) return 0;
  const [, my] = MARGIN;
  const [, py] = CONTAINER_PADDING;
  return rows * ROW_HEIGHT + (rows - 1) * my + 2 * py;
}

type MediaMetrics = {
  mapAspect: number; // map height / map width
};

function buildPackedLayout(
  items: TopographyItem[],
  cols: number,
  metricsById: Record<string, MediaMetrics | undefined>
): Layout[] {
  const DEFAULT_W = 6;

  let x = 0;
  let y = 0;
  let rowH = 0;

  return items.map((item) => {
    const rawW = item.w ?? DEFAULT_W;
    const w = Math.max(1, Math.min(rawW, cols));

    // Use MAP aspect only so cards don't change height because a colorbar image has different pixel bbox.
    const mapAspect = metricsById[item.id]?.mapAspect ?? item.aspectRatio ?? 1.0;

    // Convert MAP aspect into CARD aspect, approximating that map uses (1 - CBAR_FRAC) of the width.
    // This keeps card heights roughly consistent with the combined map+cbar rendering.
    const cardAspect = mapAspect * (1 - CBAR_FRAC);

    const h = item.h ?? Math.max(2, Math.round(w * cardAspect));

    if (x + w > cols) {
      x = 0;
      y += rowH;
      rowH = 0;
    }

    const out: Layout = {
      i: item.id,
      x,
      y,
      w,
      h,
      minW: Math.min(3, cols),
      minH: 2,
    };

    x += w;
    rowH = Math.max(rowH, h);

    return out;
  });
}

function loadImageSize(src: string): Promise<{ w: number; h: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () =>
      resolve({
        w: img.naturalWidth || img.width,
        h: img.naturalHeight || img.height,
      });
    img.onerror = () => reject(new Error(`Failed to load image: ${src}`));
    img.src = src;
  });
}

export default function TopographyPanel({ items }: Props) {
  const [bp, setBp] = useState<keyof typeof COLS>("lg");
  const [metricsById, setMetricsById] = useState<Record<string, MediaMetrics>>(
    {}
  );

  // Compute map aspect from the MAP image only (ignore cbar dims to avoid the "aspect" layer bug)
  useEffect(() => {
    let cancelled = false;

    async function run() {
      const entries = await Promise.all(
        items.map(async (it) => {
          try {
            const m = await loadImageSize(it.mapSrc);
            const mapAspect =
              Math.max(1e-6, m.h) / Math.max(1e-6, m.w);
            return [it.id, { mapAspect } satisfies MediaMetrics] as const;
          } catch {
            return null;
          }
        })
      );

      if (cancelled) return;

      const next: Record<string, MediaMetrics> = {};
      for (const e of entries) {
        if (!e) continue;
        const [id, mm] = e;
        next[id] = mm;
      }
      setMetricsById(next);
    }

    if (items.length) run();

    return () => {
      cancelled = true;
    };
  }, [items]);

  const initialLayouts: Layouts = useMemo(() => {
    return {
      lg: buildPackedLayout(items, COLS.lg, metricsById),
      md: buildPackedLayout(items, COLS.md, metricsById),
      sm: buildPackedLayout(items, COLS.sm, metricsById),
      xs: buildPackedLayout(items, COLS.xs, metricsById),
      xxs: buildPackedLayout(items, COLS.xxs, metricsById),
    };
  }, [items, metricsById]);

  const [layouts, setLayouts] = useState<Layouts>(initialLayouts);

  useEffect(() => {
    setLayouts(initialLayouts);
  }, [initialLayouts]);

  const spacerHeight = useMemo(() => {
    const l = (layouts[bp] ?? []) as Layout[];
    return rowsToPx(bottomRows(l));
  }, [layouts, bp]);

  return (
    <section className="pv-root h-full overflow-y-auto">
      <div className="border border-neutral-800 bg-neutral-950/30 p-3">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-2">
            <div className="drag-handle cursor-move px-1 py-1 hover:bg-neutral-800 transition-colors" title="Drag to reorder">
              <svg className="w-3 h-3 text-neutral-600" fill="currentColor" viewBox="0 0 16 16">
                <path d="M3 2h2v2H3V2zm0 5h2v2H3V7zm0 5h2v2H3v-2zm5-10h2v2H8V2zm0 5h2v2H8V7zm0 5h2v2H8v-2z"/>
              </svg>
            </div>
            <div className="text-[11px] uppercase tracking-wide text-neutral-500">
              Topography
            </div>
          </div>
          {/* <div className="text-[11px] text-neutral-500">{bp.toUpperCase()}</div> */}
        </div>

        <div className="mt-3">
          <div className="pv-grid-wrap" style={{ height: spacerHeight || 0 }}>
            <ResponsiveGridLayout
              className="pv-grid"
              layouts={layouts}
              breakpoints={BREAKPOINTS}
              cols={COLS}
              rowHeight={ROW_HEIGHT}
              margin={MARGIN}
              containerPadding={CONTAINER_PADDING}
              compactType={null}
              autoSize={false}
              isDraggable={false}
              isResizable={false}
              draggableHandle=".pv-card-handle"
              onBreakpointChange={(next) =>
                setBp(next as keyof typeof COLS)
              }
              onLayoutChange={(_currentLayout, allLayouts) => {
                setLayouts(allLayouts);
              }}
            >
              {items.map((item) => (
                <div key={item.id} className="pv-grid-item">
                  <TopographyCard item={item} />
                </div>
              ))}
            </ResponsiveGridLayout>
          </div>
        </div>
      </div>
    </section>
  );
}

function TopographyCard({ item }: { item: TopographyItem }) {
  return (
    <div className="pv-card">
      <div className="pv-card-handle">
        <div className="pv-card-left">
          <span className="pv-dot" />
          <h3 className="pv-card-title">{item.title}</h3>
        </div>
        <span className="pv-card-kind">Raster</span>
      </div>

      <div className="pv-media">
        <div
          style={{
            display: "flex",
            gap: 0,
            alignItems: "stretch",
            height: "100%",
            width: "100%",
            overflow: "visible", // don't clip tick labels
            padding: 4,
            boxSizing: "border-box",
          }}
        >
          <div style={{ flex: "1 1 auto", minWidth: 0 }}>
            <img
              src={item.mapSrc}
              alt={`${item.title} map`}
              style={{
                display: "block",
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </div>

          <div
            style={{
              flex: `0 0 clamp(${CBAR_MIN_PX}px, ${CBAR_FRAC * 100}%, ${CBAR_MAX_PX}px)`,
              minWidth: CBAR_MIN_PX,
            }}
          >
            <img
              src={item.cbarSrc}
              alt={`${item.title} colorbar`}
              style={{
                display: "block",
                width: "100%",
                height: "100%",
                objectFit: "contain",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}