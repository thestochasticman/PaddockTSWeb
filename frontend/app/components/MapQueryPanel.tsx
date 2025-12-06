

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

// Labels understated
const FIELD_LABEL_CLASS = "block text-[10px] text-neutral-400 tracking-wide uppercase";

// Inputs / main content slightly more prominent
const FIELD_INPUT_CLASS = "w-full bg-neutral-950 border border-neutral-700 px-2 py-[6px] text-[12px] text-neutral-100 focus:outline-none focus:ring-1 focus:ring-cyan-500";

export function MapQueryPanel() {
    const router = useRouter();
    const [selection, setSelection] = useState<Selection | null>(DEFAULT_BBOX);
    const [verticesText, setVerticesText] = useState(DEFAULT_VERTICES_TEXT);
    const [bufferKm, setBufferKm] = useState("1");
    const [startDate, setStartDate] = useState("2020-01-01");
    const [endDate, setEndDate] = useState("2020-12-31");
    const [openPicker, setOpenPicker] = useState<"start" | "end" | null>(null);

    const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
    const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
    const [loadedFromStorage, setLoadedFromStorage] = useState(false);

    const [queryName, setQueryName] = useState<string>("");

    const [status, setStatus] = useState<Status>("idle");
    const [jobId, setJobId] = useState<string | null>(null);
    const [error, setError] = useState<string | null>(null);

    const markQueryDirty = () => {
        setSelectedQueryId(null);
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
            setSelectedQueryId(null);
            markQueryDirty();
        }

        window.addEventListener("bbox-selected", handleBboxSelected as EventListener);
        return () => {
        window.removeEventListener(
            "bbox-selected",
            handleBboxSelected as EventListener
            );
        };
    }, []);

  // Vertices / buffer → selection
    useEffect(() => {
        if (!verticesText.trim()) return;
        const parsed = VerticesToBbox(verticesText, bufferKm);
        if (!parsed) return;
        setSelection(parsed);
        setSelectedQueryId(null);
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

    if (selectedQueryId) {
      // Update existing
      setSavedQueries((prev) =>
        prev.map((sq) =>
          sq.id === selectedQueryId
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
      const id =
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? (crypto as any).randomUUID()
          : Date.now().toString()) + Math.random().toString(16).slice(2);

      const newQuery: SavedQuery = {
        id,
        name: finalName,
        bbox,
        verticesText,
        startDate,
        endDate,
      };

      setSavedQueries((prev) => [newQuery, ...prev]);
      setSelectedQueryId(id);
    }

    setQueryName(finalName);
  };

  // Select a saved query from the list
  const handleSelectSavedQuery = (id: string) => {
    const q = savedQueries.find((sq) => sq.id === id);
    if (!q) return;

    setSelectedQueryId(id);
    setQueryName(q.name);
    setVerticesText(q.verticesText);
    setStartDate(q.startDate);
    setEndDate(q.endDate);
    setSelection(q.bbox);
    setOpenPicker(null);
  };

  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    setSelectedQueryId(null);
    markQueryDirty();
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    setSelectedQueryId(null);
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
    <div className="h-full w-full bg-neutral-900 border-r border-neutral-700 px-4 py-3 text-xs text-neutral-200 overflow-y-auto space-y-4">
      {/* Query name + Save button */}
      <div className="space-y-1">
        <label className={FIELD_LABEL_CLASS}>Query name</label>
        <div className="flex gap-2">
          <input
            type="text"
            className={`flex-1 ${FIELD_INPUT_CLASS}`}
            placeholder="Enter Query Name"
            value={queryName}
            onChange={(e) => {
              setQueryName(e.target.value);
              if (selectedQueryId) {
                setSelectedQueryId(null);
              }
            }}
          />
          <button
            type="button"
            className="border border-neutral-600 px-3 py-[6px] text-[12px] text-neutral-100 hover:bg-neutral-800 whitespace-nowrap"
            onClick={handleSaveCurrent}
          >
            Save
          </button>
        </div>
      </div>

      {/* Bounding box */}
      <div className="space-y-1">
        <div className={FIELD_LABEL_CLASS}>Bounding box</div>
        {selection ? (
          <ul className="space-y-1 font-mono text-[12px] text-neutral-100">
            <li className="flex justify-between">
              <span className="text-neutral-400">N</span>
              <span>{selection.north.toFixed(4)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-neutral-400">S</span>
              <span>{selection.south.toFixed(4)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-neutral-400">W</span>
              <span>{selection.west.toFixed(4)}</span>
            </li>
            <li className="flex justify-between">
              <span className="text-neutral-400">E</span>
              <span>{selection.east.toFixed(4)}</span>
            </li>
          </ul>
        ) : (
          <p className="text-[11px] text-neutral-500">
            Draw a rectangle or provide vertices to define a region.
          </p>
        )}
      </div>

      {/* Vertices */}
      <div className="space-y-1">
        <span className={FIELD_LABEL_CLASS}>Vertices (lat, lon)</span>
        <textarea
          rows={6}
          className={`${FIELD_INPUT_CLASS} font-mono resize-none`}
          placeholder={`lat, lon\nlat, lon\nlat, lon\nlat, lon`}
          value={verticesText}
          onChange={(e) => {
            setVerticesText(e.target.value);
            setSelectedQueryId(null);
            markQueryDirty();
          }}
        />
        <p className="text-[11px] text-neutral-500">
          Draw a rectangle to auto-fill these vertices, or paste your own list.
          If you enter a single coordinate, the buffer (km) is used to create a
          bounding box around it.
        </p>
      </div>

      {/* Time window */}
      <div className="space-y-2">
        <span className={FIELD_LABEL_CLASS}>Time window</span>
        <div className="grid grid-cols-2 gap-2">
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
        <label className={FIELD_LABEL_CLASS}>Buffer (km)</label>
        <input
          type="number"
          className={FIELD_INPUT_CLASS}
          value={bufferKm}
          onChange={(e) => {
            setBufferKm(e.target.value);
            setSelectedQueryId(null);
          }}
          min="0"
          step="0.1"
        />
      </div>

      {/* Buttons + status */}
      <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-neutral-800 mt-2">
        <div className="flex gap-2">
          <button
            type="button"
            className="border border-neutral-600 px-3 py-[6px] text-[12px] text-neutral-100 hover:bg-neutral-800"
            onClick={handleSelectClick}
          >
            Select area
          </button>
          <button
            type="button"
            disabled={status === "running"}
            className={`px-3 py-[6px] text-[12px] font-semibold border ${
              status === "running"
                ? "bg-neutral-700 border-neutral-600 cursor-not-allowed text-neutral-300"
                : "bg-cyan-500 border-cyan-400 text-neutral-950 hover:bg-cyan-400"
            }`}
            onClick={handleRun}
          >
            {status === "running" ? "Running…" : "Run"}
          </button>
        </div>

        <div className="text-[11px] min-h-[1.25rem]">
          {status === "running" && (
            <span className="text-yellow-400 animate-pulse">
              ⏳ Fetching…
            </span>
          )}
          {status === "done" && (
            <span className="text-green-400">✅ Completed</span>
          )}
          {status === "error" && (
            <span className="text-red-400">❌ {error}</span>
          )}
        </div>
      </div>

      {/* Saved queries – directly below buttons */}
      <div className="pt-2 border-t border-neutral-800">
        <div className="flex items-center justify-between mb-1">
          <span className={FIELD_LABEL_CLASS}>Saved queries</span>
          <span className="text-[10px] text-neutral-500">
            {savedQueries.length} total
          </span>
        </div>
        <div className="border border-neutral-700 bg-neutral-950 max-h-40 overflow-y-auto">
          {savedQueries.length === 0 ? (
            <div className="px-2 py-2 text-[11px] text-neutral-500">
              No saved queries yet. Configure a region and dates, give it a name,
              then press Save.
            </div>
          ) : (
            <ul className="divide-y divide-neutral-800 text-[12px]">
              {savedQueries.map((q) => (
                <li key={q.id}>
                  <button
                    type="button"
                    className={`w-full text-left px-2 py-1.5 hover:bg-neutral-800 ${
                      q.id === selectedQueryId ? "bg-neutral-800" : ""
                    }`}
                    onClick={() => handleSelectSavedQuery(q.id)}
                  >
                    <div className="truncate text-neutral-100 font-medium">
                      {q.name}
                    </div>
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
