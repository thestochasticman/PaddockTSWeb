"use client";

import { useMemo } from "react";
import { Responsive, WidthProvider, Layout, Layouts } from "react-grid-layout";

const ResponsiveGridLayout = WidthProvider(Responsive);

export type VisualItemType = "image" | "video";

export type VisualItem = {
  id: string;
  title: string;
  type: VisualItemType;
  src: string;
  w?: number;           // grid width in columns
  h?: number;           // grid height in rows (optional)
  aspectRatio?: number; // height / width
};

type Props = {
  items: VisualItem[];
};

export default function PaddockVisualSummary({ items }: Props) {
  const layouts: Layouts = useMemo(() => {
    const DEFAULT_W = 6; // same base width for everything

    const base: Layout[] = items.map((item, idx) => {
      const w = item.w ?? DEFAULT_W;
      const aspect = item.aspectRatio ?? 3 / 4; // fallback

      // If two items have same w and same aspectRatio, they get same h
      const h = item.h ?? Math.max(2, Math.round(w * aspect));

      return {
        i: item.id,
        x: (idx * w) % 12,
        y: 0, // compactType="vertical" will pack them
        w,
        h,
        minW: 3,
        minH: 2,
      };
    });

    return { lg: base, md: base, sm: base, xs: base, xxs: base };
  }, [items]);

  return (
    <section className="w-full space-y-3">
      {/* Header matches overall app typography */}
      <header className="flex items-center justify-between gap-2">
        <div>
          <h2 className="text-sm font-semibold text-neutral-100">
            Visual Summary
          </h2>
          <p className="text-[11px] text-neutral-500">
            {/* Drag cards by the header, resize from the bottom-right corner. */}
          </p>
        </div>
      </header>

      <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-2">
        <ResponsiveGridLayout
          className="layout"
          layouts={layouts}
          breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
          cols={{ lg: 12, md: 12, sm: 8, xs: 4, xxs: 1 }}
          rowHeight={60}
          margin={[6, 6]}
          containerPadding={[4, 4]}
          compactType="vertical"
          isDraggable
          isResizable
          draggableHandle=".pv-card-handle"
        >
          {items.map((item) => (
            <div key={item.id} className="overflow-hidden">
              <VisualCard item={item} />
            </div>
          ))}
        </ResponsiveGridLayout>
      </div>
    </section>
  );
}

function VisualCard({ item }: { item: VisualItem }) {
  return (
    <div className="h-full w-full rounded-xl border border-neutral-800 bg-neutral-950 flex flex-col overflow-hidden shadow-sm">
      {/* Drag handle + title */}
      <div className="pv-card-handle cursor-move select-none px-3 py-2 border-b border-neutral-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
          <h3 className="text-[11px] font-semibold text-neutral-100 truncate">
            {item.title}
          </h3>
        </div>
        <span className="text-[10px] uppercase tracking-wide text-neutral-500">
          {item.type === "image" ? "Image" : "Video"}
        </span>
      </div>

      {/* Media area: keep aspect ratio, no cropping, same dark background */}
      <div className="flex-1 min-h-0 relative bg-black">
        {item.type === "image" ? (
          <img
            src={item.src}
            alt={item.title}
            className="absolute inset-0 w-full h-full object-contain"
          />
        ) : (
          <video
            src={item.src}
            className="absolute inset-0 w-full h-full object-contain"
            controls
          />
        )}
      </div>
    </div>
  );
}
