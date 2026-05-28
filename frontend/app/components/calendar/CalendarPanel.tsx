"use client";

import { useEffect, useState } from "react";
import { BASE } from "../api";

type Paddock = { id: string; label: string; area_ha: number | null };
type PaddocksResponse = { paddocks: Paddock[]; years: number[] };
type CalendarResponse = {
  paddock_id: string;
  label: string;
  area_ha: number | null;
  year: number;
  thumb_size: number;
  n_slots: number;
  dates: (string | null)[];
  thumbnails: string[];
};

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

const SELECT_STYLE: React.CSSProperties = {
  background: "var(--bg-panel)",
  color: "var(--text-primary)",
  border: "1px solid var(--border)",
  padding: "0.3rem 0.5rem",
  fontFamily: "monospace",
  fontSize: "0.85rem",
};

type Props = { stub: string; ready: boolean };

export default function CalendarPanel({ stub, ready }: Props) {
  const [paddocks, setPaddocks] = useState<Paddock[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [paddockId, setPaddockId] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  useEffect(() => {
    if (!stub || !ready) return;
    let cancelled = false;
    fetch(`${BASE}/paddocks/${stub}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: PaddocksResponse | null) => {
        if (cancelled || !data) return;
        setPaddocks(data.paddocks);
        setYears(data.years);
        if (data.paddocks.length > 0) setPaddockId((cur) => cur ?? data.paddocks[0].id);
        if (data.years.length > 0) setYear((cur) => cur ?? data.years[data.years.length - 1]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [stub, ready]);

  useEffect(() => {
    if (!stub || !paddockId || year === null) return;
    let cancelled = false;
    setLoading(true);
    setCalendar(null);
    setHoverIdx(null);
    fetch(`${BASE}/calendar/${stub}/${encodeURIComponent(paddockId)}/${year}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CalendarResponse | null) => {
        if (cancelled) return;
        setCalendar(data);
        setLoading(false);
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stub, paddockId, year]);

  if (!ready) {
    return (
      <section style={{ marginTop: "2rem" }}>
        <h2
          style={{
            fontSize: "0.85rem",
            fontWeight: 600,
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            color: "var(--text-secondary)",
            borderBottom: "1px solid var(--border)",
            paddingBottom: "0.5rem",
            marginBottom: "1rem",
          }}
        >
          Calendar
        </h2>
        <div
          style={{
            fontSize: "0.75rem",
            fontFamily: "monospace",
            color: "var(--text-muted)",
            padding: "1rem",
            border: "1px solid var(--border)",
            background: "var(--bg-panel)",
          }}
        >
          Waiting for paddock segmentation...
        </div>
      </section>
    );
  }

  if (paddocks.length === 0) return null;

  const hoverThumb = hoverIdx !== null && calendar ? calendar.thumbnails[hoverIdx] : null;
  const hoverDate = hoverIdx !== null && calendar ? calendar.dates[hoverIdx] : null;
  const selectedPaddock = paddocks.find((p) => p.id === paddockId);

  return (
    <section style={{ marginTop: "2rem" }}>
      <h2
        style={{
          fontSize: "0.85rem",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          color: "var(--text-secondary)",
          borderBottom: "1px solid var(--border)",
          paddingBottom: "0.5rem",
          marginBottom: "1rem",
        }}
      >
        Calendar
      </h2>

      <div
        style={{
          display: "flex",
          gap: "1.25rem",
          marginBottom: "0.75rem",
          fontSize: "0.85rem",
          color: "var(--text-primary)",
          fontFamily: "monospace",
        }}
      >
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          Paddock
          <select
            value={paddockId ?? ""}
            onChange={(e) => setPaddockId(e.target.value)}
            style={SELECT_STYLE}
          >
            {paddocks.map((p) => (
              <option key={p.id} value={p.id}>
                {p.label}
                {p.area_ha != null ? ` (${p.area_ha.toFixed(1)} ha)` : ""}
              </option>
            ))}
          </select>
        </label>
        <label style={{ display: "flex", alignItems: "center", gap: "0.4rem" }}>
          Year
          <select
            value={year ?? ""}
            onChange={(e) => setYear(Number(e.target.value))}
            style={SELECT_STYLE}
          >
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "flex-start",
        }}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(12, 1fr)",
              marginBottom: "0.35rem",
              fontSize: "0.8rem",
              color: "var(--text-primary)",
              fontFamily: "monospace",
              letterSpacing: "0.05em",
            }}
          >
            {MONTHS.map((m) => (
              <div key={m}>{m}</div>
            ))}
          </div>
          <div
            onMouseLeave={() => setHoverIdx(null)}
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(48, 1fr)",
              gap: "1px",
              background: "var(--border)",
              padding: "1px",
            }}
          >
            {Array.from({ length: 48 }).map((_, i) => {
              const t = calendar?.thumbnails[i];
              const active = hoverIdx === i;
              return (
                <div
                  key={i}
                  onMouseEnter={() => setHoverIdx(i)}
                  style={{
                    aspectRatio: "1",
                    background: t ? `url(${t}) center/cover` : "var(--bg-panel)",
                    outline: active ? "1px solid var(--text-secondary)" : "none",
                    outlineOffset: "0px",
                    cursor: "crosshair",
                    imageRendering: "pixelated",
                  }}
                />
              );
            })}
          </div>
          {loading && (
            <div
              style={{
                marginTop: "0.5rem",
                fontSize: "0.8rem",
                fontFamily: "monospace",
                color: "var(--text-secondary)",
              }}
            >
              loading thumbnails...
            </div>
          )}
        </div>

        <div
          style={{
            width: "260px",
            border: "1px solid var(--border)",
            background: "var(--bg-panel)",
            padding: "0.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
          }}
        >
          <div
            style={{
              aspectRatio: "1",
              background: "#000",
              border: "1px solid var(--border)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {hoverThumb ? (
              <img
                src={hoverThumb}
                alt=""
                style={{
                  width: "100%",
                  height: "100%",
                  objectFit: "cover",
                  imageRendering: "pixelated",
                  display: "block",
                }}
              />
            ) : (
              <div
                style={{
                  fontSize: "0.8rem",
                  fontFamily: "monospace",
                  color: "var(--text-secondary)",
                }}
              >
                hover a cell
              </div>
            )}
          </div>
          <div style={{ fontSize: "0.85rem", fontFamily: "monospace", color: "var(--text-primary)", lineHeight: 1.5 }}>
            <div>date: {hoverDate ?? "—"}</div>
            <div>
              paddock: {selectedPaddock?.label ?? "—"}
              {selectedPaddock?.area_ha != null ? ` · ${selectedPaddock.area_ha.toFixed(1)} ha` : ""}
            </div>
            <div>year: {year ?? "—"}</div>
          </div>
        </div>
      </div>
    </section>
  );
}
