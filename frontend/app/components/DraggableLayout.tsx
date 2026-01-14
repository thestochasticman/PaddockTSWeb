"use client";

import { useState, useEffect, ReactNode } from "react";
import { Responsive, WidthProvider, Layout } from "react-grid-layout";
import "react-grid-layout/css/styles.css";
import "react-resizable/css/styles.css";

const ResponsiveGridLayout = WidthProvider(Responsive);

export type LayoutItem = {
  i: string;
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
};

type Props = {
  children: ReactNode[];
  itemKeys: string[];
  onLayoutChange?: (layout: Layout[]) => void;
  isEditable?: boolean;
};

const STORAGE_KEY = "paddock-results-layout";

// Default layout configuration
const getDefaultLayout = (itemKeys: string[]): LayoutItem[] => {
  // Different heights for different panel types
  const getHeightForKey = (key: string): number => {
    if (key === "visual-summary") return 8;
    if (key === "topography") return 6;
    if (key.includes("ozwald") || key.includes("silo")) return 12; // Climate panels need more space
    return 8;
  };

  let currentY = 0;
  return itemKeys.map((key) => {
    const h = getHeightForKey(key);
    const layout = {
      i: key,
      x: 0,
      y: currentY,
      w: 12,
      h: h,
      minW: 6,
      minH: 2,
    };
    currentY += h + 1; // Add 1 row gap between items
    return layout;
  });
};

export default function DraggableLayout({
  children,
  itemKeys,
  onLayoutChange,
  isEditable = true,
}: Props) {
  const [layout, setLayout] = useState<LayoutItem[]>(() => {
    if (typeof window === "undefined") return getDefaultLayout(itemKeys);

    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Validate that all current items are in the saved layout
        const savedKeys = new Set(parsed.map((item: LayoutItem) => item.i));
        const allKeysPresent = itemKeys.every((key) => savedKeys.has(key));

        if (allKeysPresent && parsed.length === itemKeys.length) {
          // Check for overlapping items
          const hasOverlaps = parsed.some((item: LayoutItem, i: number) => {
            return parsed.some((other: LayoutItem, j: number) => {
              if (i >= j) return false;
              // Check if items overlap
              const horizontalOverlap = item.x < other.x + other.w && item.x + item.w > other.x;
              const verticalOverlap = item.y < other.y + other.h && item.y + item.h > other.y;
              return horizontalOverlap && verticalOverlap;
            });
          });

          // If no overlaps, use saved layout
          if (!hasOverlaps) {
            return parsed;
          }

          // If overlaps detected, clear localStorage and use default
          console.warn("Overlapping panels detected, resetting to default layout");
          localStorage.removeItem(STORAGE_KEY);
        }
      } catch (e) {
        console.error("Failed to parse saved layout:", e);
      }
    }

    return getDefaultLayout(itemKeys);
  });

  const handleLayoutChange = (newLayout: Layout[]) => {
    const updatedLayout = newLayout.map((item) => ({
      i: item.i,
      x: item.x,
      y: item.y,
      w: item.w,
      h: item.h,
      minW: 6,
      minH: 2,
    }));

    setLayout(updatedLayout);

    if (typeof window !== "undefined") {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updatedLayout));
    }

    if (onLayoutChange) {
      onLayoutChange(newLayout);
    }
  };

  const resetLayout = () => {
    const defaultLayout = getDefaultLayout(itemKeys);
    setLayout(defaultLayout);
    if (typeof window !== "undefined") {
      localStorage.removeItem(STORAGE_KEY);
    }
  };

  // Update layout when itemKeys change
  useEffect(() => {
    const currentKeys = new Set(layout.map((item) => item.i));
    const newKeys = itemKeys.filter((key) => !currentKeys.has(key));

    if (newKeys.length > 0) {
      const maxY = Math.max(...layout.map((item) => item.y + item.h), 0);
      const newItems = newKeys.map((key, index) => ({
        i: key,
        x: 0,
        y: maxY + index * 4,
        w: 12,
        h: 4,
        minW: 6,
        minH: 3,
      }));

      setLayout([...layout, ...newItems]);
    }
  }, [itemKeys]);

  return (
    <div className="relative">
      {isEditable && (
        <div className="mb-4 flex items-center gap-3">
          <div className="text-[10px] text-neutral-500 uppercase tracking-wide">
            Layout Mode
          </div>
          <button
            onClick={resetLayout}
            className="text-[10px] px-2 py-1 border border-neutral-700 hover:bg-neutral-800 text-neutral-300"
          >
            Reset Layout
          </button>
          <div className="text-[9px] text-neutral-600">
            Drag panels to reorder • Drag corners to resize
          </div>
        </div>
      )}

      <ResponsiveGridLayout
        className="layout"
        layouts={{ lg: layout }}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 10, sm: 6, xs: 4, xxs: 2 }}
        rowHeight={100}
        onLayoutChange={handleLayoutChange}
        isDraggable={isEditable}
        isResizable={isEditable}
        compactType={null}
        preventCollision={true}
        allowOverlap={false}
        margin={[16, 16]}
        containerPadding={[0, 0]}
        draggableHandle=".drag-handle"
      >
        {children.map((child, index) => (
          <div key={itemKeys[index]}>
            {child}
          </div>
        ))}
      </ResponsiveGridLayout>

      <style jsx global>{`
        .react-grid-layout {
          position: relative;
        }

        .react-grid-item {
          transition: all 200ms ease;
          transition-property: left, top, width, height;
          position: absolute;
        }

        .react-grid-item > div {
          width: 100%;
          height: 100%;
        }

        .react-grid-item.react-grid-placeholder {
          background: rgba(100, 100, 100, 0.2);
          border: 2px dashed #555;
          border-radius: 4px;
          transition-duration: 100ms;
          z-index: 2;
        }

        .react-grid-item > .react-resizable-handle {
          position: absolute;
          width: 24px;
          height: 24px;
          bottom: 0;
          right: 0;
          cursor: se-resize;
          z-index: 10;
          background: linear-gradient(135deg, transparent 50%, rgba(38, 38, 38, 0.9) 50%);
          border-bottom-right-radius: 4px;
        }

        .react-grid-item > .react-resizable-handle::after {
          content: "";
          position: absolute;
          right: 4px;
          bottom: 4px;
          width: 10px;
          height: 10px;
          border-right: 2px solid rgba(115, 115, 115, 0.8);
          border-bottom: 2px solid rgba(115, 115, 115, 0.8);
        }

        .react-grid-item:hover > .react-resizable-handle {
          background: linear-gradient(135deg, transparent 50%, rgba(64, 64, 64, 0.95) 50%);
        }

        .react-grid-item:hover > .react-resizable-handle::after {
          border-color: rgba(180, 180, 180, 0.9);
        }

        .react-grid-item.resizing {
          transition: none;
          z-index: 100;
          opacity: 0.9;
        }

        .react-grid-item.react-draggable-dragging {
          transition: none;
          z-index: 100;
          opacity: 0.9;
        }

        .react-grid-item.static {
          cursor: default;
        }
      `}</style>
    </div>
  );
}
