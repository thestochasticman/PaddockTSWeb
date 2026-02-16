"use client";

import type { SavedQuery } from "../types";

type Props = {
  queries: SavedQuery[];
  selected: string | null;
  onSelect: (name: string) => void;
  onDelete: (name: string) => void;
  disabled?: boolean;
};

export default function SavedQueryDropdown({
  queries,
  selected,
  onSelect,
  onDelete,
  disabled,
}: Props) {
  if (queries.length === 0) return null;

  return (
    <div>
      <label className="crt-label">Saved Queries</label>
      <div className="flex gap-2">
        <select
          className="crt-select flex-1"
          value={selected ?? ""}
          onChange={(e) => {
            if (e.target.value) onSelect(e.target.value);
          }}
          disabled={disabled}
        >
          <option value="">-- select --</option>
          {queries.map((q) => (
            <option key={q.name} value={q.name}>
              {q.name}
            </option>
          ))}
        </select>
        {selected && (
          <button
            type="button"
            className="crt-btn-danger"
            onClick={() => onDelete(selected)}
            disabled={disabled}
          >
            Del
          </button>
        )}
      </div>
    </div>
  );
}
