// "use client";

// import { useMemo } from "react";
// import { Responsive, WidthProvider, Layout, Layouts } from "react-grid-layout";

// const ResponsiveGridLayout = WidthProvider(Responsive);

// export type VisualItemType = "image" | "video";

// export type VisualItem = {
//   id: string;
//   title: string;
//   type: VisualItemType;
//   src: string;
//   w?: number;           // grid width in columns
//   h?: number;           // grid height in rows (optional)
//   aspectRatio?: number; // height / width
// };

// type Props = {
//   items: VisualItem[];
// };

// export default function PaddockVisualSummary({ items }: Props) {
//   const layouts: Layouts = useMemo(() => {
//     const DEFAULT_W = 6; // same base width for everything

//     const base: Layout[] = items.map((item, idx) => {
//       const w = item.w ?? DEFAULT_W;
//       const aspect = item.aspectRatio ?? 3 / 4; // fallback

//       // If two items have same w and same aspectRatio, they get same h
//       const h = item.h ?? Math.max(2, Math.round(w * aspect));

//       return {
//         i: item.id,
//         x: (idx * w) % 12,
//         y: 0, // compactType="vertical" will pack them
//         w,
//         h,
//         minW: 3,
//         minH: 2,
//       };
//     });

//     return { lg: base, md: base, sm: base, xs: base, xxs: base };
//   }, [items]);

//   return (
//     <section className="w-full space-y-3">
//       {/* Header matches overall app typography */}
//       <header className="flex items-center justify-between gap-2">
//         <div>
//           <h2 className="text-sm font-semibold text-neutral-100">
//             Visual Summary
//           </h2>
//           <p className="text-[11px] text-neutral-500">
//             {/* Drag cards by the header, resize from the bottom-right corner. */}
//           </p>
//         </div>
//       </header>

//       <div className="rounded-xl border border-neutral-800 bg-neutral-950/80 p-2">
//         <ResponsiveGridLayout
//           className="layout"
//           layouts={layouts}
//           breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
//           cols={{ lg: 12, md: 12, sm: 8, xs: 4, xxs: 1 }}
//           rowHeight={60}
//           margin={[6, 6]}
//           containerPadding={[4, 4]}
//           compactType="vertical"
//           isDraggable
//           isResizable
//           draggableHandle=".pv-card-handle"
//         >
//           {items.map((item) => (
//             <div key={item.id} className="overflow-hidden">
//               <VisualCard item={item} />
//             </div>
//           ))}
//         </ResponsiveGridLayout>
//       </div>
//     </section>
//   );
// }

// function VisualCard({ item }: { item: VisualItem }) {
//   return (
//     <div className="h-full w-full rounded-xl border border-neutral-800 bg-neutral-950 flex flex-col overflow-hidden shadow-sm">
//       {/* Drag handle + title */}
//       <div className="pv-card-handle cursor-move select-none px-3 py-2 border-b border-neutral-800 flex items-center justify-between">
//         <div className="flex items-center gap-2">
//           <span className="inline-flex h-2 w-2 rounded-full bg-emerald-400" />
//           <h3 className="text-[11px] font-semibold text-neutral-100 truncate">
//             {item.title}
//           </h3>
//         </div>
//         <span className="text-[10px] uppercase tracking-wide text-neutral-500">
//           {item.type === "image" ? "Image" : "Video"}
//         </span>
//       </div>

//       {/* Media area: keep aspect ratio, no cropping, same dark background */}
//       <div className="flex-1 min-h-0 relative bg-black">
//         {item.type === "image" ? (
//           <img
//             src={item.src}
//             alt={item.title}
//             className="absolute inset-0 w-full h-full object-contain"
//           />
//         ) : (
//           <video
//             src={item.src}
//             className="absolute inset-0 w-full h-full object-contain"
//             controls
//           />
//         )}
//       </div>
//     </div>
//   );
// }

// "use client";

// import { useEffect, useMemo, useState } from "react";
// import { Responsive, WidthProvider, Layout, Layouts } from "react-grid-layout";

// const ResponsiveGridLayout = WidthProvider(Responsive);

// export type VisualItemType = "image" | "video";

// export type VisualItem = {
//   id: string;
//   title: string;
//   type: VisualItemType;
//   src: string;
//   w?: number;           // grid width in columns
//   h?: number;           // grid height in rows (optional)
//   aspectRatio?: number; // height / width
// };

// type Props = {
//   items: VisualItem[];
// };

// const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 } as const;
// const COLS = { lg: 12, md: 12, sm: 8, xs: 4, xxs: 1 } as const;

// const ROW_HEIGHT = 60;
// const MARGIN: [number, number] = [6, 6];
// const CONTAINER_PADDING: [number, number] = [4, 4];

// function bottomRows(layout: Layout[]): number {
//   let b = 0;
//   for (const it of layout) b = Math.max(b, (it.y ?? 0) + (it.h ?? 0));
//   return b;
// }

// function rowsToPx(rows: number): number {
//   if (rows <= 0) return 0;
//   const [, my] = MARGIN;
//   const [, py] = CONTAINER_PADDING;
//   // Each row adds ROW_HEIGHT, plus vertical margin between rows, plus top/bottom padding
//   return rows * ROW_HEIGHT + (rows - 1) * my + 2 * py;
// }

// function buildPackedLayout(items: VisualItem[], cols: number): Layout[] {
//   const DEFAULT_W = 6;

//   let x = 0;
//   let y = 0;
//   let rowH = 0;

//   return items.map((item) => {
//     const rawW = item.w ?? DEFAULT_W;
//     const w = Math.max(1, Math.min(rawW, cols));

//     const aspect = item.aspectRatio ?? 3 / 4; // height/width
//     const h = item.h ?? Math.max(2, Math.round(w * aspect));

//     // wrap to next row
//     if (x + w > cols) {
//       x = 0;
//       y += rowH;
//       rowH = 0;
//     }

//     const out: Layout = {
//       i: item.id,
//       x,
//       y,
//       w,
//       h,
//       minW: Math.min(3, cols),
//       minH: 2,
//     };

//     x += w;
//     rowH = Math.max(rowH, h);

//     return out;
//   });
// }

// export default function PaddockVisualSummary({ items }: Props) {
//   const initialLayouts: Layouts = useMemo(() => {
//     return {
//       lg: buildPackedLayout(items, COLS.lg),
//       md: buildPackedLayout(items, COLS.md),
//       sm: buildPackedLayout(items, COLS.sm),
//       xs: buildPackedLayout(items, COLS.xs),
//       xxs: buildPackedLayout(items, COLS.xxs),
//     };
//   }, [items]);

//   const [bp, setBp] = useState<keyof typeof COLS>("lg");
//   const [layouts, setLayouts] = useState<Layouts>(initialLayouts);

//   // Reset layouts when items change
//   useEffect(() => {
//     setLayouts(initialLayouts);
//   }, [initialLayouts]);

//   // Spacer height (in-flow height so the outer scroll container can scroll)
//   const spacerHeight = useMemo(() => {
//     const l = (layouts[bp] ?? []) as Layout[];
//     return rowsToPx(bottomRows(l));
//   }, [layouts, bp]);

//   return (
//     <section className="pv-root">
//       <header className="pv-header">
//         <div>
//           <h2 className="pv-title">Visual Summary</h2>
//           <p className="pv-subtitle"></p>
//         </div>
//       </header>

//       <div className="pv-shell">
//         {/* This spacer is the key: it creates real scroll height in normal flow */}
//         <div className="pv-grid-wrap" style={{ height: spacerHeight || 0 }}>
//           <ResponsiveGridLayout
//             className="pv-grid"
//             layouts={layouts}
//             breakpoints={BREAKPOINTS}
//             cols={COLS}
//             rowHeight={ROW_HEIGHT}
//             margin={MARGIN}
//             containerPadding={CONTAINER_PADDING}
//             compactType={null}
//             autoSize={false} // we control the scroll height via spacer (more reliable)
//             isDraggable
//             isResizable
//             draggableHandle=".pv-card-handle"
//             onBreakpointChange={(next) => setBp(next as keyof typeof COLS)}
//             onLayoutChange={(_currentLayout, allLayouts) => {
//               // allLayouts includes the updated layout for the active breakpoint
//               setLayouts(allLayouts);
//             }}
//           >
//             {items.map((item) => (
//               <div key={item.id} className="pv-grid-item">
//                 <VisualCard item={item} />
//               </div>
//             ))}
//           </ResponsiveGridLayout>
//         </div>
//       </div>
//     </section>
//   );
// }

// function VisualCard({ item }: { item: VisualItem }) {
//   return (
//     <div className="pv-card">
//       <div className="pv-card-handle">
//         <div className="pv-card-left">
//           <span className="pv-dot" />
//           <h3 className="pv-card-title">{item.title}</h3>
//         </div>
//         <span className="pv-card-kind">{item.type === "image" ? "Image" : "Video"}</span>
//       </div>

//       <div className="pv-media">
//         {item.type === "image" ? (
//           <img src={item.src} alt={item.title} className="pv-media-fill" />
//         ) : (
//           <video src={item.src} className="pv-media-fill" controls />
//         )}
//       </div>
//     </div>
//   );
// }



"use client";

import { useEffect, useMemo, useState } from "react";
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

const BREAKPOINTS = { lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 } as const;
const COLS = { lg: 12, md: 12, sm: 8, xs: 4, xxs: 1 } as const;

const ROW_HEIGHT = 80;
const MARGIN: [number, number] = [8, 8];
const CONTAINER_PADDING: [number, number] = [4, 4];

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

function buildPackedLayout(items: VisualItem[], cols: number): Layout[] {
  const DEFAULT_W = 6;

  let x = 0;
  let y = 0;
  let rowH = 0;

  return items.map((item) => {
    const rawW = item.w ?? DEFAULT_W;
    const w = Math.max(1, Math.min(rawW, cols));

    const aspect = item.aspectRatio ?? 0.75; // height/width
    // Calculate height: multiply by 1.5 to make items taller
    const h = item.h ?? Math.max(4, Math.round(w * aspect * 1.5));

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
      minH: 3,
    };

    x += w;
    rowH = Math.max(rowH, h);

    return out;
  });
}

export default function PaddockVisualSummary({ items }: Props) {
  const initialLayouts: Layouts = useMemo(() => {
    return {
      lg: buildPackedLayout(items, COLS.lg),
      md: buildPackedLayout(items, COLS.md),
      sm: buildPackedLayout(items, COLS.sm),
      xs: buildPackedLayout(items, COLS.xs),
      xxs: buildPackedLayout(items, COLS.xxs),
    };
  }, [items]);

  const [bp, setBp] = useState<keyof typeof COLS>("lg");
  const [layouts, setLayouts] = useState<Layouts>(initialLayouts);

  useEffect(() => {
    setLayouts(initialLayouts);
  }, [initialLayouts]);

  const spacerHeight = useMemo(() => {
    const l = (layouts[bp] ?? []) as Layout[];
    return rowsToPx(bottomRows(l));
  }, [layouts, bp]);

  return (
    <section className="pv-root">
      {/* Outer "box" like TopographyPanel */}
      <div className="border border-neutral-800 bg-neutral-950/30">
        {/* Header */}
        <div className="p-3 pb-2 border-b border-neutral-800/50">
          <div className="text-[14px] uppercase tracking-wide text-neutral-300">
            Visual Summary
          </div>
        </div>

        {/* Content - auto height */}
        <div className="p-3 pt-2">
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
              onBreakpointChange={(next) => setBp(next as keyof typeof COLS)}
              onLayoutChange={(_currentLayout, allLayouts) => {
                setLayouts(allLayouts);
              }}
            >
              {items.map((item) => (
                <div key={item.id} className="pv-grid-item">
                  <VisualCard item={item} />
                </div>
              ))}
            </ResponsiveGridLayout>
          </div>
        </div>
      </div>
    </section>
  );
}

function VisualCard({ item }: { item: VisualItem }) {
  return (
    <div className="pv-card">
      <div className="pv-card-handle">
        <div className="pv-card-left">
          <span className="pv-dot" />
          <h3 className="pv-card-title">{item.title}</h3>
        </div>
        <span className="pv-card-kind">
          {item.type === "image" ? "Image" : "Video"}
        </span>
      </div>

      <div className="pv-media">
        {item.type === "image" ? (
          <img src={item.src} alt={item.title} className="pv-media-fill" />
        ) : (
          <video src={item.src} className="pv-media-fill" controls />
        )}
      </div>
    </div>
  );
}
