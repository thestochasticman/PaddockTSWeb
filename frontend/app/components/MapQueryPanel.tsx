"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import MiniDatePicker from "./MiniDatePicker";
import { Selection } from "./Selection";
import { SavedQuery } from "./SavedQuery";
import {
  BASE,
  API,
  STORAGE_KEY,
  LATEST_JOB_STORAGE_KEY,
} from "./API";
import { BboxToVertices } from "./BboxToVertices";
import { VerticesToBbox } from "./VerticesToBBox";
import { VerticesStringToVertexList } from "./VerticesStringToVertexList";

type Status = "idle" | "running" | "done" | "error";

const DEFAULT_BBOX: Selection = {
  north: -33.0,
  south: -34.0,
  east: 149.0,
  west: 148.0,
};

const DEFAULT_VERTICES_TEXT = BboxToVertices(DEFAULT_BBOX);

export function MapQueryPanel() {
  const router = useRouter();
  const [selection, setSelection] = useState<Selection | null>(DEFAULT_BBOX);
  const [verticesText, setVerticesText] = useState(DEFAULT_VERTICES_TEXT);
  const [bufferKm, setBufferKm] = useState("1");
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState("2020-12-31");
  const [openPicker, setOpenPicker] = useState<"start" | "end" | null>(null);

  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [selectedQueryName, setSelectedQueryName] = useState<string | null>(null);
  const [loadedFromStorage, setLoadedFromStorage] = useState(false);

  const [queryName, setQueryName] = useState<string>("");

  const [status, setStatus] = useState<Status>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const markQueryDirty = () => {
    setSelectedQueryName(null);
    setQueryName("");
  };

  // --- Load saved queries ---
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        setLoadedFromStorage(true);
        return;
      }

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setSavedQueries(parsed as SavedQuery[]);
      } else {
        console.warn("[MapQueryPanel] STORAGE_KEY value is not an array:", parsed);
      }
    } catch (e) {
      console.error("[MapQueryPanel] failed to parse saved queries:", e);
    } finally {
      setLoadedFromStorage(true);
    }
  }, []);

  // --- Persist saved queries ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!loadedFromStorage) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedQueries));
    } catch (e) {
      console.error("[MapQueryPanel] failed to write saved queries:", e);
    }
  }, [savedQueries, loadedFromStorage]);

  // Map → React (bbox-selected)
  useEffect(() => {
    function handleBboxSelected(event: Event) {
      const e = event as CustomEvent<Selection>;
      const bbox = e.detail;
      setSelection(bbox);
      setVerticesText(BboxToVertices(bbox));
      setSelectedQueryName(null);
      markQueryDirty();
    }

    window.addEventListener("bbox-selected", handleBboxSelected as EventListener);
    return () => {
      window.removeEventListener("bbox-selected", handleBboxSelected as EventListener);
    };
  }, []);

  // Vertices / buffer → selection
  useEffect(() => {
    if (!verticesText.trim()) return;
    const parsed = VerticesToBbox(verticesText, bufferKm);
    if (!parsed) return;
    setSelection(parsed);
    setSelectedQueryName(null);
  }, [verticesText, bufferKm]);

  // selection → Map
  useEffect(() => {
    if (!selection) return;
    const w = window as any;
    if (typeof w.setBoundingBoxFromReact === "function") {
      w.setBoundingBoxFromReact(
        selection.north,
        selection.south,
        selection.east,
        selection.west
      );
    }
  }, [selection]);

  // Poll job status
  useEffect(() => {
    if (status !== "running" || !jobId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/results/${jobId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "done") {
            setStatus("done");
            if (typeof window !== "undefined") {
              window.localStorage.setItem(LATEST_JOB_STORAGE_KEY, jobId);
            }
            router.push(`/results/${jobId}`);
          }
        }
      } catch {
        // ignore
      }
    }, 4000);
    return () => clearInterval(interval);
  }, [status, jobId, router]);

  const handleSelectClick = () => {
    const w = window as any;
    if (w.enableRectangleSelection) {
      w.enableRectangleSelection();
    }
  };

  // --- Save current setup as a named query ---
  const handleSaveCurrent = () => {
    const bbox = selection ?? VerticesToBbox(verticesText, bufferKm);
    if (!bbox) {
      window.alert("Please provide at least one valid coordinate before saving.");
      return;
    }

    const trimmedName = queryName.trim();
    if (!trimmedName) {
      window.alert("Please enter a name for the query before saving.");
      return;
    }

    const finalName = trimmedName;

    if (selectedQueryName) {
      // Update existing (by previously selected name)
      setSavedQueries((prev) =>
        prev.map((sq) =>
          sq.name === selectedQueryName
            ? {
                ...sq,
                name: finalName,
                bbox,
                verticesText,
                startDate,
                endDate,
              }
            : sq
        )
      );
    } else {
      // Create new
      const newQuery: SavedQuery = {
        name: finalName,
        bbox,
        verticesText,
        startDate,
        endDate,
      };

      setSavedQueries((prev) => [newQuery, ...prev]);
    }

    setSelectedQueryName(finalName);
    setQueryName(finalName);
  };

  // Select a saved query from the list (by name)
  const handleSelectSavedQuery = (name: string) => {
    const q = savedQueries.find((sq) => sq.name === name);
    if (!q) return;

    setSelectedQueryName(q.name);
    setQueryName(q.name);
    setVerticesText(q.verticesText);
    setStartDate(q.startDate);
    setEndDate(q.endDate);
    setSelection(q.bbox);
    setOpenPicker(null);
  };

  // NEW: delete a saved query
  const handleDeleteSavedQuery = (name: string) => {
    setSavedQueries((prev) => prev.filter((sq) => sq.name !== name));
    if (selectedQueryName === name) {
      setSelectedQueryName(null);
      setQueryName("");
    }
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    setSelectedQueryName(null);
    markQueryDirty();
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    setSelectedQueryName(null);
    markQueryDirty();
  };

  async function handleRun() {
    if (!selection) {
      window.alert("Please define a region first.");
      return;
    }

    setStatus("running");
    setError(null);

    const vertexList = VerticesStringToVertexList(verticesText);

    let bboxArray: [number, number, number, number] | null = null;
    if (selection) {
      bboxArray = [
        selection.south,
        selection.west,
        selection.north,
        selection.east,
      ];
    } else {
      const bbox = VerticesToBbox(verticesText, bufferKm);
      if (bbox) {
        bboxArray = [bbox.south, bbox.west, bbox.north, bbox.east];
      }
    }

    if (!bboxArray) {
      window.alert("Could not infer a bounding box from the vertices.");
      return;
    }

    try {
      const body = {
        vertices: vertexList,
        bbox: bboxArray,
        buffer_km: Number(bufferKm),
        start_date: startDate,
        end_date: endDate,
      };

      const res = await fetch(`${BASE}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      const newJobId = json.job_id ?? json.jobId;

      if (!newJobId) {
        throw new Error("Backend did not return a job id");
      }

      setJobId(newJobId);
      setStatus("running");

      if (typeof window !== "undefined") {
        window.localStorage.setItem(LATEST_JOB_STORAGE_KEY, newJobId);
      }
    } catch (err: any) {
      console.error(err);
      setError(err.message || "Run failed");
      setStatus("error");
    }
  }

  return (
    <div className="map-panel-root">
      {/* Query name + Save button */}
      <div className="space-y-1">
        <label className="field-label">Query name</label>
        <div className="query-name-row">
          <input
            type="text"
            className="query-name-input"
            placeholder="Enter Query Name"
            value={queryName}
            onChange={(e) => {
              setQueryName(e.target.value);
              if (selectedQueryName) {
                setSelectedQueryName(null);
              }
            }}
          />
          <button
            type="button"
            className="query-save-button"
            onClick={handleSaveCurrent}
          >
            Save
          </button>
        </div>
      </div>

      {/* Bounding box */}
      <div className="space-y-1">
        <div className="field-label">Bounding box</div>
        {selection ? (
          <ul className="bbox-list">
            <li className="bbox-row">
              <span className="bbox-label">N</span>
              <span>{selection.north.toFixed(4)}</span>
            </li>
            <li className="bbox-row">
              <span className="bbox-label">S</span>
              <span>{selection.south.toFixed(4)}</span>
            </li>
            <li className="bbox-row">
              <span className="bbox-label">W</span>
              <span>{selection.west.toFixed(4)}</span>
            </li>
            <li className="bbox-row">
              <span className="bbox-label">E</span>
              <span>{selection.east.toFixed(4)}</span>
            </li>
          </ul>
        ) : (
          <p className="bbox-empty">
            Draw a rectangle or provide vertices to define a region.
          </p>
        )}
      </div>

      {/* Vertices */}
      <div className="space-y-1">
        <span className="field-label">Vertices (lat, lon)</span>
        <textarea
          rows={6}
          className="vertices-textarea"
          placeholder={`lat, lon\nlat, lon\nlat, lon\nlat, lon`}
          value={verticesText}
          onChange={(e) => {
            setVerticesText(e.target.value);
            setSelectedQueryName(null);
            markQueryDirty();
          }}
        />
        <p className="vertices-help">
          Draw a rectangle to auto-fill these vertices, or paste your own list.
          If you enter a single coordinate, the buffer (km) is used to create a
          bounding box around it.
        </p>
      </div>

      {/* Time window */}
      <div className="space-y-2">
        <span className="field-label">Time window</span>
        <div className="time-window-grid">
          <MiniDatePicker
            label="Start"
            value={startDate}
            onChange={handleStartDateChange}
            isOpen={openPicker === "start"}
            onToggle={() =>
              setOpenPicker((prev) => (prev === "start" ? null : "start"))
            }
            align="left"
          />
          <MiniDatePicker
            label="End"
            value={endDate}
            onChange={handleEndDateChange}
            isOpen={openPicker === "end"}
            onToggle={() =>
              setOpenPicker((prev) => (prev === "end" ? null : "end"))
            }
            align="right"
          />
        </div>
      </div>

      {/* Buffer */}
      <div className="space-y-1">
        <label className="field-label">Buffer (km)</label>
        <input
          type="number"
          className="field-input"
          value={bufferKm}
          onChange={(e) => {
            setBufferKm(e.target.value);
            setSelectedQueryName(null);
          }}
          min="0"
          step="0.1"
        />
      </div>

      {/* Buttons + status */}
      <div className="panel-footer">
        <div className="flex gap-2">
          <button
            type="button"
            className="select-area-button"
            onClick={handleSelectClick}
          >
            Select area
          </button>
          <button
            type="button"
            disabled={status === "running"}
            className={[
              "run-button",
              status === "running" ? "run-button--running" : "run-button--idle",
            ].join(" ")}
            onClick={handleRun}
          >
            {status === "running" ? "Running…" : "Run"}
          </button>
        </div>

        <div className="status-text">
          {status === "running" && (
            <span className="status-text--running">⏳ Fetching…</span>
          )}
          {status === "done" && (
            <span className="status-text--done"> Completed</span>
          )}
          {status === "error" && (
            <span className="status-text--error">{error}</span>
          )}
        </div>
      </div>

      {/* Saved queries – directly below buttons */}
      <div className="saved-queries-section">
        <div className="saved-queries-header">
          <span className="field-label">Saved queries</span>
          <span className="saved-queries-count">
            {savedQueries.length} total
          </span>
        </div>
        <div className="saved-queries-container">
          {savedQueries.length === 0 ? (
            <div className="saved-queries-empty">
              No saved queries yet. Configure a region and dates, give it a name,
              then press Save.
            </div>
          ) : (
            <ul className="saved-queries-list">
              {savedQueries.map((q) => (
                <li key={q.name} className="flex items-center">
                  <button
                    type="button"
                    className={[
                      "saved-query-button",
                      q.name === selectedQueryName
                        ? "saved-query-button--selected"
                        : "",
                    ].join(" ")}
                    onClick={() => handleSelectSavedQuery(q.name)}
                  >
                    <div className="saved-query-name">{q.name}</div>
                  </button>
                  <button
                    type="button"
                    className="px-2 text-[11px] text-neutral-500 hover:text-red-400"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleDeleteSavedQuery(q.name);
                    }}
                    aria-label="Delete saved query"
                    title="Delete"
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
