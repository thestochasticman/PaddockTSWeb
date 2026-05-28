"use client";

import dynamic from "next/dynamic";
import type { PlotGroupConfig } from "./plotGroups";
import type { EnvDataset } from "./useEnvironmentalData";

const Plot = dynamic(() => import("react-plotly.js"), { ssr: false });

const DEFAULT_COLORS = ["#6a2", "#c44", "#47a", "#c90", "#a5d", "#2aa"];

type Props = {
  data: EnvDataset;
  group: PlotGroupConfig;
};

export default function EnvChart({ data, group }: Props) {
  if (!data.dates.length) return null;

  const isBar = group.kind === "bar";
  const colors = group.colors ?? DEFAULT_COLORS;

  const traces = group.vars
    .filter((v) => v in data.columns)
    .map((varName, i) => {
      if (isBar) {
        return {
          x: data.dates,
          y: data.columns[varName],
          type: "bar" as const,
          name: varName,
          marker: { color: colors[i % colors.length] },
        };
      }
      return {
        x: data.dates,
        y: data.columns[varName],
        type: "scatter" as const,
        mode: "lines" as const,
        name: varName,
        line: { width: 1, color: colors[i % colors.length] },
      };
    });

  const layout = {
    title: { text: group.title, font: { size: 13, color: "#ddd" } },
    paper_bgcolor: "transparent",
    plot_bgcolor: "#111",
    font: { color: "#777", size: 11 },
    margin: { l: 50, r: 20, t: 35, b: 40 },
    xaxis: {
      gridcolor: "#222",
      linecolor: "#222",
    },
    yaxis: {
      title: { text: group.ylabel },
      gridcolor: "#222",
      linecolor: "#222",
    },
    legend: { orientation: "h" as const, y: -0.15, font: { size: 10 } },
    autosize: true,
  };

  return (
    <Plot
      data={traces}
      layout={layout}
      config={{ responsive: true, displayModeBar: false }}
      style={{ width: "100%", height: "280px" }}
    />
  );
}
