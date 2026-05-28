"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { BASE } from "../api";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

// ---------- shared types ----------

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

type PhenologyMetrics = {
  sos_time: number | null;
  sos_value: number | null;
  pos_time: number | null;
  pos_value: number | null;
  eos_time: number | null;
  eos_value: number | null;
  num_peaks: number | null;
};

type PhenologyResponse = {
  paddock_id: string;
  year: number;
  variable: string;
  observations: { doy: number; value: number }[];
  metrics: PhenologyMetrics | null;
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

const SOS_COLOR = "#4ad65b";
const POS_COLOR = "#5aa8ff";
const EOS_COLOR = "#ff6e6e";

type Props = {
  stub: string;
  calendarReady: boolean;
  phenologyReady: boolean;
};

export default function PaddockPanel({ stub, calendarReady, phenologyReady }: Props) {
  const [paddocks, setPaddocks] = useState<Paddock[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [paddockId, setPaddockId] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);

  // Calendar fetch
  const [calendar, setCalendar] = useState<CalendarResponse | null>(null);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  // Phenology fetch
  const [phenology, setPhenology] = useState<PhenologyResponse | null>(null);
  const [phenologyLoading, setPhenologyLoading] = useState(false);
  const [phenologyError, setPhenologyError] = useState<string | null>(null);

  // Load paddocks + years once either part is ready.
  useEffect(() => {
    if (!stub || (!calendarReady && !phenologyReady)) return;
    let cancelled = false;
    fetch(`${BASE}/paddocks/${stub}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((d: PaddocksResponse | null) => {
        if (cancelled || !d) return;
        setPaddocks(d.paddocks);
        setYears(d.years);
        if (d.paddocks.length > 0) setPaddockId((cur) => cur ?? d.paddocks[0].id);
        if (d.years.length > 0) setYear((cur) => cur ?? d.years[d.years.length - 1]);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [stub, calendarReady, phenologyReady]);

  // Calendar fetch when paddock/year changes
  useEffect(() => {
    if (!stub || !paddockId || year === null || !calendarReady) return;
    let cancelled = false;
    setCalendarLoading(true);
    setCalendar(null);
    setHoverIdx(null);
    fetch(`${BASE}/calendar/${stub}/${encodeURIComponent(paddockId)}/${year}`)
      .then((r) => (r.ok ? r.json() : null))
      .then((data: CalendarResponse | null) => {
        if (cancelled) return;
        setCalendar(data);
        setCalendarLoading(false);
      })
      .catch(() => {
        if (!cancelled) setCalendarLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stub, paddockId, year, calendarReady]);

  // Phenology fetch when paddock/year changes
  useEffect(() => {
    if (!stub || !paddockId || year === null || !phenologyReady) return;
    let cancelled = false;
    setPhenologyLoading(true);
    setPhenology(null);
    setPhenologyError(null);
    fetch(`${BASE}/phenology/${stub}/${encodeURIComponent(paddockId)}/${year}`)
      .then(async (r) => {
        if (!r.ok) {
          const detail = await r.json().catch(() => ({}));
          throw new Error(detail?.detail ?? `HTTP ${r.status}`);
        }
        return r.json();
      })
      .then((d: PhenologyResponse) => {
        if (cancelled) return;
        setPhenology(d);
        setPhenologyLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setPhenologyError(e instanceof Error ? e.message : String(e));
        setPhenologyLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stub, paddockId, year, phenologyReady]);

  // ---------- gating ----------

  if (!calendarReady && !phenologyReady) {
    return (
      <Notice>
        Waiting for paddock segmentation and time series...
      </Notice>
    );
  }

  if (paddocks.length === 0) {
    return <Notice>loading paddocks...</Notice>;
  }

  const selectedPaddock = paddocks.find((p) => p.id === paddockId);
  const hoverThumb = hoverIdx !== null && calendar ? calendar.thumbnails[hoverIdx] : null;
  const hoverDate = hoverIdx !== null && calendar ? calendar.dates[hoverIdx] : null;

  // ---------- phenology chart traces / shapes ----------

  const phenoTraces: any[] = [];
  if (phenology && phenology.observations.length > 0) {
    phenoTraces.push({
      x: phenology.observations.map((o) => o.doy),
      y: phenology.observations.map((o) => o.value),
      type: "scatter",
      mode: "markers",
      name: phenology.variable,
      marker: { color: POS_COLOR, size: 7 },
    });
  }

  const phenoShapes: any[] = [];
  const phenoAnnotations: any[] = [];
  const metrics = phenology?.metrics;
  if (metrics) {
    const addLine = (x: number | null, color: string, dash: string, label: string) => {
      if (x == null) return;
      phenoShapes.push({
        type: "line",
        xref: "x",
        yref: "paper",
        x0: x,
        x1: x,
        y0: 0,
        y1: 1,
        line: { color, dash, width: 1.5 },
      });
      phenoAnnotations.push({
        x,
        y: 1.04,
        xref: "x",
        yref: "paper",
        text: label,
        showarrow: false,
        font: { color, size: 12 },
      });
    };
    addLine(metrics.sos_time, SOS_COLOR, "dash", "SoS");
    addLine(metrics.pos_time, POS_COLOR, "dashdot", "PoS");
    addLine(metrics.eos_time, EOS_COLOR, "dot", "EoS");
  }

  const phenoLayout: any = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "#111",
    font: { color: "#ddd", size: 12 },
    margin: { l: 55, r: 20, t: 40, b: 40 },
    xaxis: { title: { text: "Day of year" }, gridcolor: "#222", linecolor: "#444", range: [0, 366] },
    yaxis: { title: { text: phenology?.variable ?? "NDVI" }, gridcolor: "#222", linecolor: "#444", range: [0, 1] },
    showlegend: false,
    shapes: phenoShapes,
    annotations: phenoAnnotations,
    autosize: true,
  };

  const legendItem = (color: string, label: string) => (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.35rem" }}>
      <span style={{ display: "inline-block", width: 10, height: 2, background: color }} />
      <span style={{ color: "var(--text-secondary)" }}>{label}</span>
    </span>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", height: "100%" }}>
      {/* shared controls */}
      <div
        style={{
          display: "flex",
          gap: "1.25rem",
          flexWrap: "wrap",
          alignItems: "center",
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
        <span style={{ marginLeft: "auto", display: "inline-flex", gap: "0.85rem", fontSize: "0.75rem" }}>
          {legendItem(SOS_COLOR, "Start of Season")}
          {legendItem(POS_COLOR, "Peak of Season")}
          {legendItem(EOS_COLOR, "End of Season")}
        </span>
      </div>

      {/* calendar + phenology stacked on the left, single hover side panel on the right */}
      <div style={{ display: "flex", gap: "1rem", alignItems: "stretch", flex: 1, minHeight: 0 }}>
        <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          {/* calendar block */}
          {calendarReady && (
            <div>
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(12, 1fr)",
                  marginBottom: "0.35rem",
                  fontSize: "0.75rem",
                  color: "var(--text-primary)",
                  fontFamily: "monospace",
                  letterSpacing: "0.05em",
                }}
              >
                {MONTHS.map((m) => <div key={m}>{m}</div>)}
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
              {calendarLoading && (
                <div style={{ marginTop: "0.4rem", fontSize: "0.75rem", color: "var(--text-secondary)", fontFamily: "monospace" }}>
                  loading thumbnails...
                </div>
              )}
            </div>
          )}

          {/* phenology block (sits directly below the calendar) */}
          <div style={{ flex: 1, minHeight: 0 }}>
            {!phenologyReady && (
              <Notice>waiting for paddock time series...</Notice>
            )}
            {phenologyReady && phenologyLoading && (
              <Notice>computing phenology...</Notice>
            )}
            {phenologyReady && !phenologyLoading && phenologyError && (
              <Notice>{phenologyError}</Notice>
            )}
            {phenologyReady && !phenologyLoading && !phenologyError && phenology && phenoTraces.length > 0 && (
              <Plot
                data={phenoTraces}
                layout={phenoLayout}
                config={{ responsive: true, displayModeBar: false }}
                style={{ width: "100%", height: "100%" }}
                useResizeHandler
              />
            )}
            {phenologyReady && !phenologyLoading && !phenologyError && phenology && phenoTraces.length === 0 && (
              <Notice>no observations for this paddock × year</Notice>
            )}
            {phenologyReady && phenology && !metrics && !phenologyLoading && !phenologyError && (
              <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", fontFamily: "monospace", marginTop: "0.3rem" }}>
                phenology metrics unavailable (paddock had too few observations)
              </div>
            )}
          </div>
        </div>

        {/* hover preview side panel: spans the full height of calendar + phenology */}
        <div
          style={{
            width: 220,
            flexShrink: 0,
            border: "1px solid var(--border)",
            background: "var(--bg-panel)",
            padding: "0.5rem",
            display: "flex",
            flexDirection: "column",
            gap: "0.4rem",
            alignSelf: "stretch",
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
              flexShrink: 0,
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
              <div style={{ fontSize: "0.75rem", fontFamily: "monospace", color: "var(--text-secondary)", textAlign: "center", padding: "0.5rem" }}>
                hover a cell
              </div>
            )}
          </div>
          <div style={{ fontSize: "0.8rem", fontFamily: "monospace", color: "var(--text-primary)", lineHeight: 1.5 }}>
            <div>date: {hoverDate ?? "—"}</div>
            <div>
              paddock: {selectedPaddock?.label ?? "—"}
              {selectedPaddock?.area_ha != null ? ` · ${selectedPaddock.area_ha.toFixed(1)} ha` : ""}
            </div>
            <div>year: {year ?? "—"}</div>
          </div>
        </div>
      </div>
    </div>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        padding: "0.75rem 1rem",
        fontSize: "0.8rem",
        fontFamily: "monospace",
        color: "var(--text-secondary)",
        border: "1px solid var(--border)",
        background: "var(--bg-panel)",
      }}
    >
      {children}
    </div>
  );
}
