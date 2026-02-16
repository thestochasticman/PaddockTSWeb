"use client";

import type { OutputStatus } from "./useJobStatus";
import type { Status } from "./useRunJob";

const OUTPUT_LABELS: [keyof OutputStatus, string][] = [
  ["sentinel2_video", "Sentinel-2"],
  ["sentinel2_paddocks_video", "Sentinel-2 + Paddocks"],
  ["vegfrac_video", "Vegetation Fraction"],
  ["vegfrac_paddocks_video", "Veg. Fraction + Paddocks"],
];

type Props = {
  queryName: string;
  onQueryNameChange: (val: string) => void;
  onSave: () => void;
  onSelectArea: () => void;
  onRun: () => void;
  status: Status;
  error: string | null;
  outputs?: OutputStatus | null;
};

export default function ActionBar({
  queryName,
  onQueryNameChange,
  onSave,
  onSelectArea,
  onRun,
  status,
  error,
  outputs,
}: Props) {
  const isBusy = status === "submitting" || status === "polling";

  return (
    <div className="flex flex-col gap-2">
      {/* Query name + save */}
      <div>
        <label className="crt-label">Query Name (optional)</label>
        <div className="flex gap-2">
          <input
            type="text"
            className="crt-input flex-1"
            placeholder="Enter query name"
            value={queryName}
            onChange={(e) => onQueryNameChange(e.target.value)}
          />
          <button
            type="button"
            className="crt-btn-ghost"
            onClick={onSave}
            disabled={isBusy}
          >
            Save
          </button>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex gap-2">
        <button
          type="button"
          className="crt-btn-ghost flex-1"
          onClick={onSelectArea}
          disabled={isBusy}
        >
          Select Area
        </button>
        <button
          type="button"
          className={isBusy ? "crt-btn-running flex-1" : "crt-btn-primary flex-1"}
          onClick={onRun}
          disabled={isBusy}
        >
          {status === "submitting"
            ? "Submitting..."
            : status === "polling"
              ? "Processing..."
              : "Run"}
        </button>
      </div>

      {/* Status */}
      {error && <div className="crt-status crt-status--error">{error}</div>}

      {/* Output checklist */}
      {outputs && (
        <div className="flex flex-col gap-1" style={{ marginTop: "0.25rem" }}>
          <label className="crt-label">Outputs</label>
          {OUTPUT_LABELS.map(([key, label]) => (
            <div
              key={key}
              style={{
                display: "flex",
                alignItems: "center",
                gap: "0.5rem",
                fontSize: "0.75rem",
                fontFamily: "monospace",
              }}
            >
              <span
                style={{
                  color: outputs[key] ? "var(--green)" : "var(--text-muted)",
                }}
              >
                {outputs[key] ? "[done]" : "[    ]"}
              </span>
              <span
                style={{
                  color: outputs[key]
                    ? "var(--text-primary)"
                    : "var(--text-secondary)",
                }}
              >
                {label}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
