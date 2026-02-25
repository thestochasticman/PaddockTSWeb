"use client";

import EnvChart from "./EnvChart";
import type { PlotGroupConfig } from "./plotGroups";
import type { EnvDataset } from "./useEnvironmentalData";

type Props = {
  title: string;
  groups: Record<string, PlotGroupConfig>;
  data: EnvDataset;
  loading: boolean;
  error: string | null;
  ready: boolean;
};

export default function EnvSection({
  title,
  groups,
  data,
  loading,
  error,
  ready,
}: Props) {
  return (
    <div style={{ marginTop: "2rem" }}>
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
        {title}
      </h2>

      {!ready && (
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
          downloading...
        </div>
      )}

      {ready && loading && (
        <div
          style={{
            fontSize: "0.75rem",
            fontFamily: "monospace",
            color: "var(--text-muted)",
          }}
        >
          loading charts...
        </div>
      )}

      {error && (
        <div
          style={{
            fontSize: "0.75rem",
            color: "var(--red)",
            fontFamily: "monospace",
          }}
        >
          Error: {error}
        </div>
      )}

      {ready && !loading && !error && (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "1rem",
          }}
        >
          {Object.entries(groups).map(([key, group]) => (
            <div
              key={key}
              style={{
                border: "1px solid var(--border)",
                background: "var(--bg-panel)",
                padding: "0.5rem",
              }}
            >
              <EnvChart data={data} group={group} />
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
