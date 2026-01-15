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
  onInitialized?: (figure: any, graphDiv: any) => void;
  onUpdate?: (figure: any, graphDiv: any) => void;
}>;

type DailyRow = {
  time: string; // "YYYY-MM-DD"
  radiation?: number | null;
  vp?: number | null;
  max_temp?: number | null;
  min_temp?: number | null;
  daily_rain?: number | null;
  et_morton_actual?: number | null;
  et_morton_potential?: number | null;
};

type SiloDailyPayload = {
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
  radiation: { label: "Solar Radiation", unit: "MJ/m²", color: "#f59e0b", description: "Solar exposure (direct + diffuse)" },
  max_temp: { label: "Max Temperature", unit: "°C", color: "#ef4444", description: "Maximum temperature" },
  min_temp: { label: "Min Temperature", unit: "°C", color: "#3b82f6", description: "Minimum temperature" },
  daily_rain: { label: "Daily Rainfall", unit: "mm", color: "#06b6d4", description: "Daily rainfall" },
  vp: { label: "Vapour Pressure", unit: "hPa", color: "#8b5cf6", description: "Vapour pressure" },
  et_morton_potential: { label: "Potential ET", unit: "mm", color: "#14b8a6", description: "Morton's point potential evapotranspiration" },
};

export default function SiloDailyPanel({ jobId, apiBase }: Props) {
  const [payload, setPayload] = useState<SiloDailyPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedVars, setSelectedVars] = useState<Set<string>>(
    new Set(["radiation", "max_temp", "min_temp", "daily_rain"])
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
      // Increment revision to trigger Plotly layout update
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

        // Fetch from environmental folder
        const url = `${apiBase}/static/${jobId}/environmental/${jobId}_silo_daily.json?v=${jobId}`;
        const res = await fetch(url, { cache: "no-store" });

        if (!res.ok) {
          throw new Error(`SILO Daily JSON not found (${res.status})`);
        }

        const json = (await res.json()) as SiloDailyPayload;
        if (!cancelled) setPayload(json);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load SILO Daily JSON");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [jobId, apiBase]);

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
      a.download = `${jobId}_silo_daily.csv`;
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
      a.download = `${jobId}_silo_daily.json`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setDownloading(false);
    }
  };

  // Variable groups
  const radiationVars = ["radiation"];
  const temperatureVars = ["max_temp", "min_temp"];
  const rainfallVars = ["daily_rain"];
  const vpVars = ["vp"];
  const etVars = ["et_morton_potential"];

  // Use a fixed minimum height to enable scrolling when panel is resized small
  const chartHeight = 250;

  const renderRadiationChart = () => {
    const visibleVars = radiationVars.filter((v) => selectedVars.has(v) && availableVars.includes(v));
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
            <h3 className="pv-card-title">Solar Radiation</h3>
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
                  title: "MJ/m²",
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
            <h3 className="pv-card-title">Rainfall</h3>
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

  const renderVPChart = () => {
    const visibleVars = vpVars.filter((v) => selectedVars.has(v) && availableVars.includes(v));
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
            <h3 className="pv-card-title">Vapour Pressure</h3>
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
                  title: "hPa",
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

  const renderETChart = () => {
    const visibleVars = etVars.filter((v) => selectedVars.has(v) && availableVars.includes(v));
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
            <h3 className="pv-card-title">Evapotranspiration</h3>
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

  return (
    <section className="pv-root" ref={containerRef}>
      <div className="border border-neutral-800 bg-neutral-950/30">
        {/* Header */}
        <div className="p-3 pb-2 border-b border-neutral-800/50">
          <div className="flex items-start justify-between gap-3 mb-2">
            <div className="text-[14px] uppercase tracking-wide text-neutral-300">
              SILO Daily Climate Data
            </div>

            {payload && (
              <div className="flex gap-2">
                <button
                  onClick={downloadCSV}
                  disabled={downloading}
                  className="text-[12px] px-2 py-1 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 disabled:opacity-50"
                >
                  {downloading ? "..." : "CSV"}
                </button>
                <button
                  onClick={downloadJSON}
                  disabled={downloading}
                  className="text-[12px] px-2 py-1 border border-neutral-700 hover:bg-neutral-800 text-neutral-300 disabled:opacity-50"
                >
                  {downloading ? "..." : "JSON"}
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
            <div className="text-sm text-red-400 py-4 text-center border border-red-900/50 bg-red-950/20">
              {error}
            </div>
          )}

          {payload && (
            <div className="space-y-2">
              {renderRadiationChart()}
              {renderTemperatureChart()}
              {renderRainfallChart()}
              {renderVPChart()}
              {renderETChart()}

              {selectedVars.size === 0 && (
                <div className="text-center text-neutral-500 text-sm py-8">
                  Select at least one variable to display charts
                </div>
              )}
            </div>
          )}

          {!payload && !error && (
            <div className="text-sm text-neutral-300 py-8 text-center">
              Loading SILO daily data...
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
