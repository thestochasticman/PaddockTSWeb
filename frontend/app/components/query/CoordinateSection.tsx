"use client";

import type { Selection } from "../types";

type Props = {
  verticesText: string;
  onVerticesChange: (text: string) => void;
  bufferKm: string;
  onBufferChange: (val: string) => void;
  selection: Selection | null;
};

export default function CoordinateSection({
  verticesText,
  onVerticesChange,
  bufferKm,
  onBufferChange,
  selection,
}: Props) {
  return (
    <div className="flex flex-col gap-2">
      <div>
        <label className="crt-label">Coordinates (lat, lon)</label>
        <textarea
          rows={5}
          className="crt-textarea font-mono"
          placeholder={"lat, lon\nlat, lon\nlat, lon\nlat, lon"}
          value={verticesText}
          onChange={(e) => onVerticesChange(e.target.value)}
        />
        <p className="crt-help mt-1">
          Draw a rectangle on the map or paste coordinates. Single point uses buffer to create bbox.
        </p>
      </div>

      <div className="flex gap-3 items-end">
        <div className="flex-1">
          <label className="crt-label">Buffer (km)</label>
          <input
            type="number"
            className="crt-input"
            value={bufferKm}
            onChange={(e) => onBufferChange(e.target.value)}
            min="0"
            step="0.1"
          />
        </div>
        {selection && (
          <div className="flex-1 font-mono text-[0.65rem]" style={{ color: "var(--text-secondary)" }}>
            <div>N {selection.north.toFixed(4)}</div>
            <div>S {selection.south.toFixed(4)}</div>
            <div>E {selection.east.toFixed(4)}</div>
            <div>W {selection.west.toFixed(4)}</div>
          </div>
        )}
      </div>
    </div>
  );
}
