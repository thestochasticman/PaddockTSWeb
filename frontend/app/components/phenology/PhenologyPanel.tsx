"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import { BASE } from "../api";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

type Paddock = { id: string; label: string; area_ha: number | null };
type PaddocksResponse = { paddocks: Paddock[]; years: number[] };

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

const SELECT_STYLE: React.CSSProperties = {
  background: "var(--bg-panel)",
  color: "var(--text-primary)",
  border: "1px solid var(--border)",
  padding: "0.3rem 0.5rem",
  fontFamily: "monospace",
  fontSize: "0.85rem",
};

const SECTION_HEADER_STYLE: React.CSSProperties = {
  fontSize: "0.85rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  color: "var(--text-secondary)",
  borderBottom: "1px solid var(--border)",
  paddingBottom: "0.5rem",
  marginBottom: "1rem",
};

const SOS_COLOR = "#4ad65b";
const POS_COLOR = "#5aa8ff";
const EOS_COLOR = "#ff6e6e";

type Props = { stub: string; ready: boolean };

export default function PhenologyPanel({ stub, ready }: Props) {
  const [paddocks, setPaddocks] = useState<Paddock[]>([]);
  const [years, setYears] = useState<number[]>([]);
  const [paddockId, setPaddockId] = useState<string | null>(null);
  const [year, setYear] = useState<number | null>(null);
  const [data, setData] = useState<PhenologyResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stub || !ready) return;
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
  }, [stub, ready]);

  useEffect(() => {
    if (!stub || !paddockId || year === null) return;
    let cancelled = false;
    setLoading(true);
    setData(null);
    setError(null);
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
        setData(d);
        setLoading(false);
      })
      .catch((e) => {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [stub, paddockId, year]);

  if (!ready) {
    return (
      <section style={{ marginTop: "2rem" }}>
        <h2 style={SECTION_HEADER_STYLE}>Phenology</h2>
        <div
          style={{
            fontSize: "0.85rem",
            fontFamily: "monospace",
            color: "var(--text-secondary)",
            padding: "1rem",
            border: "1px solid var(--border)",
            background: "var(--bg-panel)",
          }}
        >
          Waiting for paddock time series...
        </div>
      </section>
    );
  }

  if (paddocks.length === 0) return null;

  const selectedPaddock = paddocks.find((p) => p.id === paddockId);
  const metrics = data?.metrics;

  const traces: any[] = [];
  if (data && data.observations.length > 0) {
    traces.push({
      x: data.observations.map((o) => o.doy),
      y: data.observations.map((o) => o.value),
      type: "scatter",
      mode: "markers",
      name: data.variable,
      marker: { color: POS_COLOR, size: 7 },
    });
  }

  const shapes: any[] = [];
  const annotations: any[] = [];
  if (metrics) {
    const addLine = (x: number | null, color: string, dash: string, label: string) => {
      if (x == null) return;
      shapes.push({
        type: "line",
        xref: "x",
        yref: "paper",
        x0: x,
        x1: x,
        y0: 0,
        y1: 1,
        line: { color, dash, width: 1.5 },
      });
      annotations.push({
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

  const layout: any = {
    paper_bgcolor: "transparent",
    plot_bgcolor: "#111",
    font: { color: "#ddd", size: 12 },
    margin: { l: 55, r: 20, t: 40, b: 40 },
    xaxis: {
      title: { text: "Day of year" },
      gridcolor: "#222",
      linecolor: "#444",
      range: [0, 366],
    },
    yaxis: {
      title: { text: data?.variable ?? "NDVI" },
      gridcolor: "#222",
      linecolor: "#444",
      range: [0, 1],
    },
    showlegend: false,
    shapes,
    annotations,
    autosize: true,
  };

  return (
    <section style={{ marginTop: "2rem" }}>
      <h2 style={SECTION_HEADER_STYLE}>Phenology</h2>

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

      <div style={{ display: "flex", gap: "1rem", alignItems: "flex-start" }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {loading && (
            <div
              style={{
                padding: "1rem",
                fontSize: "0.8rem",
                fontFamily: "monospace",
                color: "var(--text-secondary)",
              }}
            >
              computing phenology...
            </div>
          )}
          {!loading && error && (
            <div
              style={{
                padding: "1rem",
                fontSize: "0.8rem",
                fontFamily: "monospace",
                color: "var(--text-secondary)",
                border: "1px solid var(--border)",
                background: "var(--bg-panel)",
              }}
            >
              {error}
            </div>
          )}
          {!loading && !error && data && traces.length > 0 && (
            <Plot
              data={traces}
              layout={layout}
              config={{ responsive: true, displayModeBar: false }}
              style={{ width: "100%", height: "360px" }}
              useResizeHandler
            />
          )}
          {!loading && !error && data && traces.length === 0 && (
            <div
              style={{
                padding: "1rem",
                fontSize: "0.8rem",
                fontFamily: "monospace",
                color: "var(--text-secondary)",
              }}
            >
              no observations for this paddock × year
            </div>
          )}
        </div>

        <div
          style={{
            width: "260px",
            border: "1px solid var(--border)",
            background: "var(--bg-panel)",
            padding: "0.75rem",
            fontSize: "0.85rem",
            fontFamily: "monospace",
            color: "var(--text-primary)",
            lineHeight: 1.6,
          }}
        >
          <div>
            paddock: {selectedPaddock?.label ?? "—"}
            {selectedPaddock?.area_ha != null
              ? ` · ${selectedPaddock.area_ha.toFixed(1)} ha`
              : ""}
          </div>
          <div>year: {year ?? "—"}</div>
          <hr
            style={{
              border: "none",
              borderTop: "1px solid var(--border)",
              margin: "0.5rem 0",
            }}
          />
          {metrics ? (
            <>
              <div style={{ color: SOS_COLOR }}>
                SoS: doy {fmt(metrics.sos_time, 0)} · {fmt(metrics.sos_value, 2)}
              </div>
              <div style={{ color: POS_COLOR }}>
                PoS: doy {fmt(metrics.pos_time, 0)} · {fmt(metrics.pos_value, 2)}
              </div>
              <div style={{ color: EOS_COLOR }}>
                EoS: doy {fmt(metrics.eos_time, 0)} · {fmt(metrics.eos_value, 2)}
              </div>
              <div>peaks: {metrics.num_peaks ?? "—"}</div>
            </>
          ) : (
            <div style={{ color: "var(--text-secondary)" }}>metrics unavailable</div>
          )}
        </div>
      </div>
    </section>
  );
}

function fmt(v: number | null | undefined, digits: number): string {
  if (v == null) return "—";
  return v.toFixed(digits);
}
