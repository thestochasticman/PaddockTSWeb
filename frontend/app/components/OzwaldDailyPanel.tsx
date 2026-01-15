"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState, useRef } from "react";

// Dynamic import with proper typing for react-plotly.js
const Plot = dynamic(() => import("react-plotly.js"), { ssr: false }) as React.ComponentType<{
  data: any[];
  layout: any;
  config?: any;
  style?: React.CSSProperties;
  revision?: number;
}>;

type DailyRow = {
  time: string; // "YYYY-MM-DD"
  Tmax?: number | null;
  Tmin?: number | null;
  Pg?: number | null;
  Uavg?: number | null;
  Ueff?: number | null;
  VPeff?: number | null;
  kTavg?: number | null;
  kTeff?: number | null;
};

type OzwaldDailyPayload = {
  meta?: {
    start_year?: string;
    end_year?: string;
    buffer?: number;
    reducer?: string;
    variables?: string[];
  };
  data: DailyRow[];
};

type Props = {
  jobId: string;
  apiBase: string;
};

// Variable metadata for display
const VARIABLE_INFO: Record<string, { label: string; unit: string; color: string; description: string }> = {
  Tmax: { label: "Max Temperature", unit: "°C", color: "#ef4444", description: "Maximum daily temperature" },
  Tmin: { label: "Min Temperature", unit: "°C", color: "#3b82f6", description: "Minimum daily temperature" },
  Pg: { label: "Precipitation", unit: "mm/day", color: "#06b6d4", description: "Gross precipitation" },
  Uavg: { label: "Avg Wind Speed", unit: "m/s", color: "#8b5cf6", description: "Average 24h windspeed" },
  VPeff: { label: "Eff Rainfall", unit: "mm", color: "#0ea5e9", description: "Volume of effective rainfall" },
};

function fmtMeta(meta?: Record<string, any>) {
  if (!meta) return "";
  const sy = meta.start_year ?? meta.startYear;
  const ey = meta.end_year ?? meta.endYear;
  const b = meta.buffer;
  const reducer = meta.reducer;
  const bits = [
    sy && ey ? `${sy}-${ey}` : null,
    typeof b === "number" ? `buffer ${b}°` : null,
    reducer ? `${reducer}` : null,
  ].filter(Boolean);
  return bits.join(" • ");
}

export default function OzwaldDailyPanel({ jobId, apiBase }: Props) {
  const [payload, setPayload] = useState<OzwaldDailyPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedVars, setSelectedVars] = useState<Set<string>>(
    new Set(["Tmax", "Tmin", "Pg", "VPeff", "Uavg"])
  );
  const [downloading, setDownloading] = useState(false);
  const [revision, setRevision] = useState(0);
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Track container size changes and trigger chart re-render
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const gridItem = container.parentElement;
    if (!gridItem) return;

    const resizeObserver = new ResizeObserver(() => {
      setRevision((r) => r + 1);
    });

    resizeObserver.observe(gridItem);
    return () => resizeObserver.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError(null);

        // Fetch from environmental folder instead
        const url = `${apiBase}/static/${jobId}/environmental/${jobId}_ozwald_daily.json?v=${jobId}`;
        const res = await fetch(url, { cache: "no-store" });

        if (!res.ok) {
          throw new Error(`OzWALD daily JSON not found (${res.status})`);
        }

        const json = (await res.json()) as OzwaldDailyPayload;
        if (!cancelled) setPayload(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load OzWALD daily JSON");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [jobId, apiBase]);

  const metaText = useMemo(() => fmtMeta(payload?.meta), [payload?.meta]);

  const availableVars = useMemo(() => {
    return payload?.meta?.variables ?? [];
  }, [payload]);

  const chartData = useMemo(() => {
    const rows = payload?.data ?? [];
    const x = rows.map((r) => r.time);

    const datasets: Record<string, (number | null)[]> = {};
    for (const v of availableVars) {
      datasets[v] = rows.map((r) => (r as any)[v] ?? null);
    }

    return { x, datasets };
  }, [payload, availableVars]);

  const toggleVariable = (varName: string) => {
    setSelectedVars((prev) => {
      const next = new Set(prev);
      if (next.has(varName)) {
        next.delete(varName);
      } else {
        next.add(varName);
      }
      return next;
    });
  };

  const downloadCSV = () => {
    if (!payload?.data) return;

    setDownloading(true);
    try {
      // Create CSV content
      const headers = ["date", ...availableVars];
      const csvRows = [headers.join(",")];

      for (const row of payload.data) {
        const values = [row.time];
        for (const v of availableVars) {
          const val = (row as any)[v];
          values.push(val !== null && val !== undefined ? val.toString() : "");
        }
        csvRows.push(values.join(","));
      }

      const csvContent = csvRows.join("\n");
      const blob = new Blob([csvContent], { type: "text/csv" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${jobId}_ozwald_daily.csv`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  const downloadJSON = () => {
    if (!payload) return;

    setDownloading(true);
    try {
      const jsonStr = JSON.stringify(payload, null, 2);
      const blob = new Blob([jsonStr], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${jobId}_ozwald_daily.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  // Variable groups
  const temperatureVars = ["Tmax", "Tmin"];
  const precipitationVars = ["Pg"];
  const rainfallVars = ["VPeff"];
  const windVars = ["Uavg"];

  // Use a fixed minimum height to enable scrolling when panel is resized small
  const chartHeight = 250;

  const renderTemperatureChart = () => {
    const visibleVars = temperatureVars.filter((v) => selectedVars.has(v) && availableVars.includes(v));
    if (visibleVars.length === 0) return null;

    const traces = visibleVars.map((v) => ({
      x: chartData.x,
      y: chartData.datasets[v],
      type: "scatter" as any,
      mode: "lines",
      name: VARIABLE_INFO[v]?.label || v,
      line: { color: VARIABLE_INFO[v]?.color },
    }));

    return (
      <div className="pv-card">
        <div className="pv-card-handle">
          <div className="pv-card-left">
            <span className="pv-dot" />
            <h3 className="pv-card-title">Temperature</h3>
          </div>
          <span className="pv-card-kind">{visibleVars.map(v => VARIABLE_INFO[v]?.label).join(", ")}</span>
        </div>

        <div className="pv-media">
          <Plot
            revision={revision}
            data={traces}
            layout={{
              autosize: true,
              height: chartHeight,
              margin: { l: 50, r: 10, t: 10, b: 40 },
                paper_bgcolor: "rgba(0,0,0,0)",
                plot_bgcolor: "rgba(0,0,0,0)",
                hovermode: "x unified",
                legend: { orientation: "h", x: 0, y: 1.15 },
                xaxis: {
                  type: "date",
                  showgrid: false,
                },
                yaxis: {
                  title: "°C",
                  zeroline: false,
                  gridcolor: "#404040",
                  showgrid: true,
                },
                font: { color: "#d4d4d4" },
              }}
              config={{
                responsive: true,
                displayModeBar: "hover",
                modeBarButtonsToRemove: ["lasso2d", "select2d"],
              }}
              style={{ width: "100%" }}
            />
        </div>
      </div>
    );
  };

  const renderPrecipitationChart = () => {
    const visibleVars = precipitationVars.filter((v) => selectedVars.has(v) && availableVars.includes(v));
    if (visibleVars.length === 0) return null;

    const traces = visibleVars.map((v) => ({
      x: chartData.x,
      y: chartData.datasets[v],
      type: "bar" as any,
      name: VARIABLE_INFO[v]?.label || v,
      marker: { color: VARIABLE_INFO[v]?.color },
    }));

    return (
      <div className="pv-card">
        <div className="pv-card-handle">
          <div className="pv-card-left">
            <span className="pv-dot" />
            <h3 className="pv-card-title">Precipitation</h3>
          </div>
          <span className="pv-card-kind">{visibleVars.map(v => VARIABLE_INFO[v]?.label).join(", ")}</span>
        </div>

        <div className="pv-media">
          <Plot
            revision={revision}
            data={traces}
            layout={{
              autosize: true,
              height: chartHeight,
              margin: { l: 50, r: 10, t: 10, b: 40 },
                paper_bgcolor: "rgba(0,0,0,0)",
                plot_bgcolor: "rgba(0,0,0,0)",
                hovermode: "x unified",
                legend: { orientation: "h", x: 0, y: 1.15 },
                xaxis: {
                  type: "date",
                  showgrid: false,
                },
                yaxis: {
                  title: "mm/day",
                  zeroline: false,
                  gridcolor: "#404040",
                  showgrid: true,
                },
                font: { color: "#d4d4d4" },
              }}
              config={{
                responsive: true,
                displayModeBar: "hover",
                modeBarButtonsToRemove: ["lasso2d", "select2d"],
              }}
              style={{ width: "100%" }}
            />
        </div>
      </div>
    );
  };

  const renderRainfallChart = () => {
    const visibleVars = rainfallVars.filter((v) => selectedVars.has(v) && availableVars.includes(v));
    if (visibleVars.length === 0) return null;

    const traces = visibleVars.map((v) => ({
      x: chartData.x,
      y: chartData.datasets[v],
      type: "bar" as any,
      name: VARIABLE_INFO[v]?.label || v,
      marker: { color: VARIABLE_INFO[v]?.color },
    }));

    return (
      <div className="pv-card">
        <div className="pv-card-handle">
          <div className="pv-card-left">
            <span className="pv-dot" />
            <h3 className="pv-card-title">Effective Rainfall</h3>
          </div>
          <span className="pv-card-kind">{visibleVars.map(v => VARIABLE_INFO[v]?.label).join(", ")}</span>
        </div>

        <div className="pv-media">
          <Plot
            revision={revision}
            data={traces}
            layout={{
              autosize: true,
              height: chartHeight,
              margin: { l: 50, r: 10, t: 10, b: 40 },
                paper_bgcolor: "rgba(0,0,0,0)",
                plot_bgcolor: "rgba(0,0,0,0)",
                hovermode: "x unified",
                legend: { orientation: "h", x: 0, y: 1.15 },
                xaxis: {
                  type: "date",
                  showgrid: false,
                },
                yaxis: {
                  title: "mm",
                  zeroline: false,
                  gridcolor: "#404040",
                  showgrid: true,
                },
                font: { color: "#d4d4d4" },
              }}
              config={{
                responsive: true,
                displayModeBar: "hover",
                modeBarButtonsToRemove: ["lasso2d", "select2d"],
              }}
              style={{ width: "100%" }}
            />
        </div>
      </div>
    );
  };

  const renderWindChart = () => {
    const visibleVars = windVars.filter((v) => selectedVars.has(v) && availableVars.includes(v));
    if (visibleVars.length === 0) return null;

    const traces = visibleVars.map((v) => ({
      x: chartData.x,
      y: chartData.datasets[v],
      type: "scatter" as any,
      mode: "lines",
      name: VARIABLE_INFO[v]?.label || v,
      line: { color: VARIABLE_INFO[v]?.color },
    }));

    return (
      <div className="pv-card">
        <div className="pv-card-handle">
          <div className="pv-card-left">
            <span className="pv-dot" />
            <h3 className="pv-card-title">Wind Speed</h3>
          </div>
          <span className="pv-card-kind">{visibleVars.map(v => VARIABLE_INFO[v]?.label).join(", ")}</span>
        </div>

        <div className="pv-media">
          <Plot
            revision={revision}
            data={traces}
            layout={{
              autosize: true,
              height: chartHeight,
              margin: { l: 50, r: 10, t: 10, b: 40 },
                paper_bgcolor: "rgba(0,0,0,0)",
                plot_bgcolor: "rgba(0,0,0,0)",
                hovermode: "x unified",
                legend: { orientation: "h", x: 0, y: 1.15 },
                xaxis: {
                  type: "date",
                  showgrid: false,
                },
                yaxis: {
                  title: "m/s",
                  zeroline: false,
                  gridcolor: "#404040",
                  showgrid: true,
                },
                font: { color: "#d4d4d4" },
              }}
              config={{
                responsive: true,
                displayModeBar: "hover",
                modeBarButtonsToRemove: ["lasso2d", "select2d"],
              }}
              style={{ width: "100%" }}
            />
        </div>
      </div>
    );
  };

  return (
    <section className="pv-root" ref={containerRef}>
      <div className="border border-neutral-800 bg-neutral-950/30">
        {/* Header */}
        <div className="p-3 pb-2 border-b border-neutral-800/50">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="text-[14px] uppercase tracking-wide text-neutral-300">
              OzWALD Daily Climate Data
            </div>

            {payload && (
              <div className="flex gap-2">
                <button
                  onClick={downloadCSV}
                  disabled={downloading}
                  className="text-[12px] px-2 py-1 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 disabled:opacity-50"
                  title="Download as CSV"
                >
                  CSV
                </button>
                <button
                  onClick={downloadJSON}
                  disabled={downloading}
                  className="text-[12px] px-2 py-1 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 disabled:opacity-50"
                  title="Download as JSON"
                >
                  JSON
                </button>
              </div>
            )}
          </div>

          {/* Variable toggles in header */}
          {payload && (
            <div className="flex flex-wrap items-center gap-1">
              {availableVars.filter(v => VARIABLE_INFO[v]).map((varName) => {
                const info = VARIABLE_INFO[varName];
                const isSelected = selectedVars.has(varName);
                return (
                  <button
                    key={varName}
                    onClick={() => toggleVariable(varName)}
                    className={`px-2 py-1 border text-[12px] transition-colors ${
                      isSelected
                        ? "border-neutral-600 bg-neutral-800 text-neutral-100"
                        : "border-neutral-800 bg-neutral-950 text-neutral-400 hover:bg-neutral-900"
                    }`}
                    title={info?.description}
                  >
                    <div className="flex items-center gap-1.5">
                      <span
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: info?.color }}
                      />
                      <span className="whitespace-nowrap">{info?.label || varName}</span>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>

        {/* Content - auto height */}
        <div className="p-3 pt-2">
          {error && (
            <div className="text-sm text-red-300 mb-3">{error}</div>
          )}

          {payload && (
            <div className="space-y-2">
              {renderTemperatureChart()}
              {renderPrecipitationChart()}
              {renderRainfallChart()}
              {renderWindChart()}

              {selectedVars.size === 0 && (
                <div className="text-center text-neutral-500 text-sm py-8">
                  Select at least one variable to display charts
                </div>
              )}
            </div>
          )}

          {!payload && !error && (
            <div className="text-sm text-neutral-300 py-8 text-center">
              Loading OzWALD daily data...
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
