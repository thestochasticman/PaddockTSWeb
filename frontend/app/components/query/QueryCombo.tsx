"use client";

import { useEffect, useRef, useState } from "react";
import type { SavedQuery } from "../types";

type Props = {
  queries: SavedQuery[];
  queryName: string;
  selected: string | null;
  onNameChange: (val: string) => void;
  onSelect: (name: string) => void;
  onDelete: (name: string) => void;
  disabled?: boolean;
};

// Combined query-name input + saved-query picker. Typing names the query (for
// Save); the ▾ opens the saved list, and picking one loads it (and resets the
// results view to that query's run).
export default function QueryCombo({
  queries,
  queryName,
  selected,
  onNameChange,
  onSelect,
  onDelete,
  disabled,
}: Props) {
  const rootRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const hasQueries = queries.length > 0;

  useEffect(() => {
    if (!open) return;
    const handle = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [open]);

  return (
    <div ref={rootRef} className="date-root">
      <label className="crt-label">Query</label>
      <div className="date-input-wrapper">
        <input
          type="text"
          className="crt-input"
          style={hasQueries ? { paddingRight: "1.4rem" } : undefined}
          placeholder="name / pick saved"
          value={queryName}
          onChange={(e) => onNameChange(e.target.value)}
          onClick={() => { if (hasQueries) setOpen(true); }}
          disabled={disabled}
        />
        {hasQueries && (
          <button
            type="button"
            className="date-icon-button"
            onClick={() => setOpen((o) => !o)}
            disabled={disabled}
            aria-label="Saved queries"
          >
            ▾
          </button>
        )}
      </div>

      {open && hasQueries && (
        <div className="date-popup crt-combo-popup left-0">
          {queries.map((q) => (
            <div
              key={q.name}
              className={`crt-combo-item ${q.name === selected ? "crt-combo-item--active" : ""}`}
            >
              <button
                type="button"
                className="crt-combo-item-name"
                onClick={() => { onSelect(q.name); setOpen(false); }}
              >
                {q.name}
              </button>
              <button
                type="button"
                className="crt-combo-item-del"
                onClick={() => onDelete(q.name)}
                aria-label={`Delete ${q.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
