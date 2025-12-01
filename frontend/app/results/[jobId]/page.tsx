
"use client";

import { useEffect, useState } from "react";

// layout chrome
import SearchResultsToggle from "../../components/SearchResultsToggle";

// data / types / utilities
import { API, STORAGE_KEY } from "../../components/API";
import type { SavedQuery } from "../../components/SavedQuery";
import type { Selection } from "../../components/Selection";
import { BboxToVertices } from "../../components/BboxToVertices";

// paddock visual summary component
import PaddockVisualSummary, {
  VisualItem,
} from "../../components/PaddockVisualSummary";

type MediaTriple = [string, number, string]; // [title, aspectRatio, path]

type Result = {
  status: string;
  photos: MediaTriple[];
  videos: MediaTriple[];
  meta: Record<string, any>;
};

// backend meta.bbox is [south, west, north, east]
type BboxArray = [number, number, number, number];

// ---------- helpers ----------

function selectionFromBboxArray(bbox: BboxArray): Selection {
  return {
    south: bbox[0],
    west: bbox[1],
    north: bbox[2],
    east: bbox[3],
  };
}

function bboxArrayFromSelection(sel: Selection): BboxArray {
  return [sel.south, sel.west, sel.north, sel.east];
}

function normalizeBbox(raw: any): BboxArray | null {
  if (!Array.isArray(raw) || raw.length !== 4) return null;
  const vals = raw.map((x) => Number(x));
  if (vals.some((x) => Number.isNaN(x) || !Number.isFinite(x))) return null;
  // round so tiny float differences don't break matching
  return [
    Number(vals[0].toFixed(6)),
    Number(vals[1].toFixed(6)),
    Number(vals[2].toFixed(6)),
    Number(vals[3].toFixed(6)),
  ] as BboxArray;
}

function bboxEqual(a: BboxArray, b: BboxArray, eps = 1e-5): boolean {
  return (
    Math.abs(a[0] - b[0]) < eps &&
    Math.abs(a[1] - b[1]) < eps &&
    Math.abs(a[2] - b[2]) < eps &&
    Math.abs(a[3] - b[3]) < eps
  );
}

function normalizeDateString(v: unknown): string | null {
  if (!v) return null;
  const s = String(v);
  // just keep yyyy-mm-dd
  return s.length >= 10 ? s.slice(0, 10) : s;
}

function toAssetUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  const clean = path.replace(/^\/+/, "");
  return `${API}/${clean}`;
}

// ---------- page ----------

export default function ResultsPage({ params }: { params: { jobId: string } }) {
  const { jobId } = params;

  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);

  // 1) Load saved queries written by MapPanel (READ-ONLY here)
  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        setSavedQueries(parsed as SavedQuery[]);
      }
    } catch {
      // ignore parse errors
    }
  }, []);

  // 2) Fetch results for this jobId
  useEffect(() => {
    let cancelled = false;

    async function fetchResults() {
      try {
        setLoading(true);
        setError(null);

        const res = await fetch(`${API}/results/${jobId}`);
        if (!res.ok) {
          const text = await res.text();
          throw new Error(text || `HTTP ${res.status}`);
        }

        const json = (await res.json()) as Result;
        if (!cancelled) setData(json);
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message ?? "Failed to fetch results");
          setData(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    fetchResults();
    return () => {
      cancelled = true;
    };
  }, [jobId]);

  // 3) Compute matching saved query (bbox + dates) – read-only
  let matchedQuery: SavedQuery | undefined;
  let metaBbox: BboxArray | null = null;
  let metaStart: string | null = null;
  let metaEnd: string | null = null;

  if (data) {
    const meta = data.meta || {};
    metaBbox = normalizeBbox(meta.bbox);
    metaStart = normalizeDateString(meta.start_date);
    metaEnd = normalizeDateString(meta.end_date);

    if (metaBbox && metaStart && metaEnd) {
      for (const q of savedQueries) {
        const qStart = normalizeDateString(q.startDate);
        const qEnd = normalizeDateString(q.endDate);
        if (qStart !== metaStart || qEnd !== metaEnd) continue;

        const qBboxArr = bboxArrayFromSelection(q.bbox);
        const qBboxNorm = normalizeBbox(qBboxArr);
        if (!qBboxNorm) continue;
        if (!bboxEqual(metaBbox, qBboxNorm)) continue;

        matchedQuery = q;
        break;
      }
    }
  }

  // ---------- UI states ----------

  if (loading && !data && !error) {
    return (
      <div className="fixed inset-0 flex flex-col bg-neutral-950 text-white">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2 text-xs">
          <div className="font-semibold text-neutral-400">PaddockTS</div>
          <SearchResultsToggle />
        </div>
        <div className="flex flex-1 min-h-0 items-center justify-center text-xs text-neutral-400">
          Fetching results…
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="fixed inset-0 flex flex-col bg-neutral-950 text-white">
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2 text-xs">
          <div className="font-semibold text-neutral-400">PaddockTS</div>
          <SearchResultsToggle />
        </div>
        <div className="flex flex-1 min-h-0 items-center justify-center">
          <div className="max-w-md text-center space-y-3 text-xs">
            <h1 className="text-sm font-semibold text-red-400">
              Result error
            </h1>
            <p className="text-neutral-400">
              {error ?? "No result payload found."}
            </p>
          </div>
        </div>
      </div>
    );
  }

  const { status, photos, videos, meta } = data;

  const visualItems: VisualItem[] = [
    ...photos.map(([title, aspect, path], idx) => ({
      id: `photo-${idx}`,
      title,
      type: "image" as const,
      src: toAssetUrl(path),
      aspectRatio: aspect,
    })),
    ...videos.map(([title, aspect, path], idx) => ({
      id: `video-${idx}`,
      title,
      type: "video" as const,
      src: toAssetUrl(path),
      aspectRatio: aspect,
    })),
  ];

  const bboxStr =
    metaBbox && !metaBbox.some((v) => Number.isNaN(v))
      ? `[${metaBbox.map((v) => v.toString()).join(", ")}]`
      : "—";

  const periodStr =
    metaStart || metaEnd ? `${metaStart ?? "?"}  ${metaEnd ?? "?"}` : "—";

  const queryName = matchedQuery?.name ?? "Unnamed query";

  return (
    <div className="fixed inset-0 flex flex-col bg-neutral-950 text-white">
      {/* Top bar with title + toggle (same as HomePage) */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2 text-xs">
        <div className="font-semibold text-neutral-400">PaddockTS</div>
        <SearchResultsToggle />
      </div>

      {/* Main content: single-panel results, minimal & classy */}
      <div className="flex flex-1 min-h-0">
        <div className="flex-1 relative">
          <div className="absolute inset-0 flex flex-col">
            {/* Minimal header for this result */}
            <div className="border-b border-neutral-800 px-4 py-3 text-xs flex flex-col gap-1">
              <div className="flex items-baseline justify-between gap-2">
                <div className="text-sm font-semibold text-neutral-100 truncate">
                  {queryName}
                </div>
                {/* <span
                  className={`px-2 py-0.5 rounded-full border text-[10px] ${
                    status === "done"
                      ? "border-emerald-500/50 bg-emerald-900/40 text-emerald-200"
                      : status === "error"
                      ? "border-red-500/50 bg-red-900/40 text-red-200"
                      : "border-neutral-600 bg-neutral-900 text-neutral-200"
                  }`}
                >
                  {status}
                </span> */}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-400">
                <div>
                  <span className="uppercase tracking-wide text-neutral-500 mr-1">
                    Period
                  </span>
                  <span className="font-mono">{periodStr}</span>
                </div>
                <div>
                  <span className="uppercase tracking-wide text-neutral-500 mr-1">
                    BBox [S,W,N,E]
                  </span>
                  <span className="font-mono">{bboxStr}</span>
                </div>
              </div>
            </div>

            {/* Scrollable visual summary */}
            <div className="flex-1 overflow-auto px-4 py-4">
              <PaddockVisualSummary items={visualItems} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
