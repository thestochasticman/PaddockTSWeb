"use client";

type Props = {
  queryName: string;
  onQueryNameChange: (val: string) => void;
  onSave: () => void;
  onSelectArea: () => void;
  onRun: () => void;
  status: "idle" | "submitting" | "done" | "error";
  error: string | null;
  disabled?: boolean;
};

export default function ActionBar({
  queryName,
  onQueryNameChange,
  onSave,
  onSelectArea,
  onRun,
  status,
  error,
}: Props) {
  const isSubmitting = status === "submitting";

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
            disabled={isSubmitting}
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
          disabled={isSubmitting}
        >
          Select Area
        </button>
        <button
          type="button"
          className={isSubmitting ? "crt-btn-running flex-1" : "crt-btn-primary flex-1"}
          onClick={onRun}
          disabled={isSubmitting}
        >
          {isSubmitting ? "Running..." : "Run"}
        </button>
      </div>

      {/* Status */}
      {error && <div className="crt-status crt-status--error">{error}</div>}
    </div>
  );
}
