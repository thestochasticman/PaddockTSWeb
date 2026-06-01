"use client";

import { useMemo } from "react";

export type YearFilterValue =
  | { kind: "full" }
  | { kind: "year"; year: number }
  | { kind: "custom"; start: string; end: string };

type Props = {
  /** All ISO date strings from any of the data sources in this chart. */
  dates: (string | null)[];
  value: YearFilterValue;
  onChange: (value: YearFilterValue) => void;
};

const BTN_STYLE_BASE: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--border)",
  color: "var(--text-secondary)",
  padding: "0.15rem 0.5rem",
  fontFamily: "monospace",
  fontSize: "0.7rem",
  cursor: "pointer",
  lineHeight: 1.4,
};
const BTN_STYLE_ACTIVE: React.CSSProperties = {
  ...BTN_STYLE_BASE,
  background: "#fff",
  color: "#000",
};
const INPUT_STYLE: React.CSSProperties = {
  background: "var(--bg-panel)",
  color: "var(--text-primary)",
  border: "1px solid var(--border)",
  padding: "0.15rem 0.3rem",
  fontFamily: "monospace",
  fontSize: "0.7rem",
};

export function extractYears(dates: (string | null)[]): number[] {
  const set = new Set<number>();
  for (const d of dates) {
    if (!d) continue;
    const yr = Number.parseInt(d.slice(0, 4), 10);
    if (Number.isFinite(yr)) set.add(yr);
  }
  return Array.from(set).sort((a, b) => a - b);
}

/** Convert the current filter value to a Plotly-friendly x-axis range, or
 *  null when no restriction is active. */
export function filterToRange(value: YearFilterValue): [string, string] | null {
  if (value.kind === "full") return null;
  if (value.kind === "year") return [`${value.year}-01-01`, `${value.year}-12-31`];
  if (value.kind === "custom") return [value.start, value.end];
  return null;
}

export default function YearFilter({ dates, value, onChange }: Props) {
  const years = useMemo(() => extractYears(dates), [dates]);
  if (years.length === 0) return null;

  const isActive = (yr: number) => value.kind === "year" && value.year === yr;
  const customDefaults = (): { start: string; end: string } => {
    if (value.kind === "custom") return { start: value.start, end: value.end };
    const first = `${years[0]}-01-01`;
    const last = `${years[years.length - 1]}-12-31`;
    return { start: first, end: last };
  };

  return (
    <div
      style={{
        display: "flex",
        flexWrap: "wrap",
        alignItems: "center",
        gap: "0.3rem",
        marginBottom: "0.3rem",
        fontFamily: "monospace",
      }}
    >
      <button
        type="button"
        style={value.kind === "full" ? BTN_STYLE_ACTIVE : BTN_STYLE_BASE}
        onClick={() => onChange({ kind: "full" })}
      >
        Full
      </button>
      {years.map((yr) => (
        <button
          key={yr}
          type="button"
          style={isActive(yr) ? BTN_STYLE_ACTIVE : BTN_STYLE_BASE}
          onClick={() => onChange({ kind: "year", year: yr })}
        >
          {yr}
        </button>
      ))}
      <button
        type="button"
        style={value.kind === "custom" ? BTN_STYLE_ACTIVE : BTN_STYLE_BASE}
        onClick={() => onChange({ kind: "custom", ...customDefaults() })}
      >
        Custom
      </button>
      {value.kind === "custom" && (
        <span style={{ display: "inline-flex", alignItems: "center", gap: "0.3rem" }}>
          <input
            type="date"
            value={value.start}
            onChange={(e) => onChange({ ...value, start: e.target.value })}
            style={INPUT_STYLE}
          />
          <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>→</span>
          <input
            type="date"
            value={value.end}
            onChange={(e) => onChange({ ...value, end: e.target.value })}
            style={INPUT_STYLE}
          />
        </span>
      )}
    </div>
  );
}
