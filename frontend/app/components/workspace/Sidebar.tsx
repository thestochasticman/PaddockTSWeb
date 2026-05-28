"use client";

import { useState } from "react";
import { PANES, PaneSpec } from "./panes";

type Props = {
  openIds: string[];
  onOpen: (id: string) => void;
};

const CATEGORY_ORDER: PaneSpec["category"][] = [
  "Videos",
  "Interactive",
  "SILO",
  "OzWALD",
  "Info",
];

export default function Sidebar({ openIds, onOpen }: Props) {
  const [collapsed, setCollapsed] = useState<Set<PaneSpec["category"]>>(new Set());
  const openSet = new Set(openIds);

  const toggleCategory = (c: PaneSpec["category"]) =>
    setCollapsed((prev) => {
      const next = new Set(prev);
      next.has(c) ? next.delete(c) : next.add(c);
      return next;
    });

  return (
    <div
      style={{
        height: "100%",
        width: "100%",
        background: "var(--bg-panel)",
        borderRight: "1px solid var(--border)",
        overflowY: "auto",
        fontFamily: "monospace",
        fontSize: "0.8rem",
        color: "var(--text-primary)",
      }}
    >
      <div
        style={{
          padding: "0.6rem 0.75rem",
          borderBottom: "1px solid var(--border)",
          textTransform: "uppercase",
          letterSpacing: "0.06em",
          fontSize: "0.7rem",
          color: "var(--text-secondary)",
        }}
      >
        Outputs
      </div>

      {CATEGORY_ORDER.map((cat) => {
        const items = PANES.filter((p) => p.category === cat);
        if (items.length === 0) return null;
        const isCollapsed = collapsed.has(cat);
        return (
          <div key={cat}>
            <button
              type="button"
              onClick={() => toggleCategory(cat)}
              style={{
                width: "100%",
                background: "transparent",
                border: "none",
                color: "var(--text-secondary)",
                textAlign: "left",
                padding: "0.4rem 0.75rem",
                fontFamily: "inherit",
                fontSize: "0.75rem",
                textTransform: "uppercase",
                letterSpacing: "0.05em",
                cursor: "pointer",
                display: "flex",
                alignItems: "center",
                gap: "0.4rem",
              }}
            >
              <span style={{ width: "0.6rem", display: "inline-block" }}>
                {isCollapsed ? "▸" : "▾"}
              </span>
              {cat}
            </button>
            {!isCollapsed && (
              <div>
                {items.map((p) => {
                  const open = openSet.has(p.id);
                  return (
                    <div
                      key={p.id}
                      onClick={() => onOpen(p.id)}
                      title={open ? "already open" : "click to add to layout"}
                      style={{
                        color: open ? "var(--text-muted)" : "var(--text-primary)",
                        padding: "0.3rem 1.5rem",
                        fontFamily: "inherit",
                        fontSize: "0.8rem",
                        cursor: open ? "default" : "pointer",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        gap: "0.5rem",
                        userSelect: "none",
                      }}
                      onMouseEnter={(e) => {
                        if (!open) e.currentTarget.style.background = "rgba(255,255,255,0.04)";
                      }}
                      onMouseLeave={(e) => (e.currentTarget.style.background = "transparent")}
                    >
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {p.title}
                      </span>
                      {open && <span style={{ color: "var(--green)", fontSize: "0.7rem" }}>●</span>}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
