

// "use client";

// import { useEffect, useMemo, useRef, useState } from "react";

// // layout chrome
// import SearchResultsToggle from "../../components/SearchResultsToggle";

// // data / types / utilities
// import { API, STORAGE_KEY, LATEST_JOB_STORAGE_KEY } from "../../components/API";
// import type { SavedQuery } from "../../components/SavedQuery";
// import type { Selection } from "../../components/Selection";

// // paddock visual summary component
// import PaddockVisualSummary, {
//   VisualItem,
// } from "../../components/PaddockVisualSummary";

// type MediaTriple = [string, number, string]; // [title, aspectRatio, path]

// type Result = {
//   status: string;
//   photos: MediaTriple[];
//   videos: MediaTriple[];
//   meta: Record<string, any>;
// };

// // backend meta.bbox is [south, west, north, east]
// type BboxArray = [number, number, number, number];

// // ---------- helpers ----------

// function selectionFromBboxArray(bbox: BboxArray): Selection {
//   return {
//     south: bbox[0],
//     west: bbox[1],
//     north: bbox[2],
//     east: bbox[3],
//   };
// }

// function bboxArrayFromSelection(sel: Selection): BboxArray {
//   return [sel.south, sel.west, sel.north, sel.east];
// }

// function normalizeBbox(raw: any): BboxArray | null {
//   if (!Array.isArray(raw) || raw.length !== 4) return null;
//   const vals = raw.map((x) => Number(x));
//   if (vals.some((x) => Number.isNaN(x) || !Number.isFinite(x))) return null;

//   // round so tiny float differences don't break matching
//   return [
//     Number(vals[0].toFixed(6)),
//     Number(vals[1].toFixed(6)),
//     Number(vals[2].toFixed(6)),
//     Number(vals[3].toFixed(6)),
//   ] as BboxArray;
// }

// function bboxEqual(a: BboxArray, b: BboxArray, eps = 1e-5): boolean {
//   return (
//     Math.abs(a[0] - b[0]) < eps &&
//     Math.abs(a[1] - b[1]) < eps &&
//     Math.abs(a[2] - b[2]) < eps &&
//     Math.abs(a[3] - b[3]) < eps
//   );
// }

// function normalizeDateString(v: unknown): string | null {
//   if (!v) return null;
//   const s = String(v);
//   return s.length >= 10 ? s.slice(0, 10) : s;
// }

// function toAssetUrl(path: string): string {
//   if (path.startsWith("http://") || path.startsWith("https://")) return path;
//   const clean = path.replace(/^\/+/, "");
//   return `${API}/${clean}`;
// }

// function isTerminalStatus(status: string | undefined | null): boolean {
//   const s = String(status || "").toLowerCase();
//   return s === "done" || s === "error" || s === "failed";
// }

// function isErrorStatus(status: string | undefined | null): boolean {
//   const s = String(status || "").toLowerCase();
//   return s === "error" || s === "failed";
// }

// function statusLabel(status: string | undefined | null): string {
//   const s = String(status || "").toLowerCase();
//   if (!s) return "unknown";
//   return s;
// }

// // ---------- page ----------

// export default function ResultsPage({ params }: { params: { jobId: string } }) {
//   const { jobId } = params;

//   const [data, setData] = useState<Result | null>(null);
//   const [loading, setLoading] = useState(true);
//   const [polling, setPolling] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
//   const [retryNonce, setRetryNonce] = useState(0);

//   const timerRef = useRef<number | null>(null);
//   const attemptRef = useRef(0);

//   // 1) Load saved queries written by MapPanel (READ-ONLY here)
//   useEffect(() => {
//     if (typeof window === "undefined") return;
//     try {
//       const raw = window.localStorage.getItem(STORAGE_KEY);
//       if (!raw) return;
//       const parsed = JSON.parse(raw);
//       if (Array.isArray(parsed)) setSavedQueries(parsed as SavedQuery[]);
//     } catch {
//       // ignore
//     }
//   }, []);

//   // 2) Poll results until done/error (results page owns lifecycle)
//   useEffect(() => {
//     let cancelled = false;

//     if (typeof window !== "undefined") {
//       try {
//         window.localStorage.setItem(LATEST_JOB_STORAGE_KEY, jobId);
//       } catch {
//         // ignore
//       }
//     }

//     const clearTimer = () => {
//       if (timerRef.current) {
//         window.clearTimeout(timerRef.current);
//         timerRef.current = null;
//       }
//     };

//     const scheduleNext = (ms: number) => {
//       clearTimer();
//       timerRef.current = window.setTimeout(() => {
//         void tick();
//       }, ms);
//     };

//     const computeDelayMs = () => {
//       // backoff + jitter, capped
//       const attempt = attemptRef.current;
//       const base = 900; // start ~0.9s
//       const growth = 1.55;
//       const cap = 15000; // 15s max
//       const raw = Math.min(cap, base * Math.pow(growth, attempt));
//       const jitter = 0.8 + Math.random() * 0.4; // 0.8..1.2
//       return Math.floor(raw * jitter);
//     };

//     async function tick() {
//       if (cancelled) return;

//       try {
//         setLoading(true);
//         setError(null);

//         const res = await fetch(`${API}/results/${jobId}`, {
//           cache: "no-store",
//         });

//         // If your backend returns 404 until ready, treat as pending.
//         if (!res.ok) {
//           if (res.status === 404 || res.status === 202) {
//             // pending
//             attemptRef.current += 1;
//             setPolling(true);
//             scheduleNext(computeDelayMs());
//             return;
//           }

//           const text = await res.text();
//           throw new Error(text || `HTTP ${res.status}`);
//         }

//         const json = (await res.json()) as Result;

//         if (cancelled) return;
//         setData(json);

//         const st = String(json.status || "").toLowerCase();

//         // On successful responses, reset backoff a bit so we stay responsive.
//         attemptRef.current = Math.max(0, attemptRef.current - 1);

//         if (isTerminalStatus(st)) {
//           setPolling(false);
//           setLoading(false);
//           clearTimer();
//           return;
//         }

//         setPolling(true);
//         scheduleNext(computeDelayMs());
//       } catch (err: any) {
//         if (cancelled) return;

//         // Keep whatever last good data we had, but show error state.
//         setError(err?.message ?? "Failed to fetch results");

//         attemptRef.current += 1;
//         setPolling(true);
//         scheduleNext(computeDelayMs());
//       } finally {
//         if (!cancelled) setLoading(false);
//       }
//     }

//     // reset poll attempt on new jobId / retry
//     attemptRef.current = 0;
//     setPolling(true);
//     void tick();

//     return () => {
//       cancelled = true;
//       clearTimer();
//     };
//   }, [jobId, retryNonce]);

//   // 3) Compute matching saved query (bbox + dates) – read-only
//   const match = useMemo(() => {
//     if (!data) return { matchedQuery: undefined as SavedQuery | undefined, metaBbox: null as BboxArray | null, metaStart: null as string | null, metaEnd: null as string | null };

//     const meta = data.meta || {};
//     const metaBbox = normalizeBbox(meta.bbox);
//     const metaStart = normalizeDateString(meta.start_date);
//     const metaEnd = normalizeDateString(meta.end_date);

//     let matchedQuery: SavedQuery | undefined;

//     if (metaBbox && metaStart && metaEnd) {
//       for (const q of savedQueries) {
//         const qStart = normalizeDateString(q.startDate);
//         const qEnd = normalizeDateString(q.endDate);
//         if (qStart !== metaStart || qEnd !== metaEnd) continue;

//         const qBboxArr = bboxArrayFromSelection(q.bbox);
//         const qBboxNorm = normalizeBbox(qBboxArr);
//         if (!qBboxNorm) continue;
//         if (!bboxEqual(metaBbox, qBboxNorm)) continue;

//         matchedQuery = q;
//         break;
//       }
//     }

//     return { matchedQuery, metaBbox, metaStart, metaEnd };
//   }, [data, savedQueries]);

//   const metaBbox = match.metaBbox;
//   const metaStart = match.metaStart;
//   const metaEnd = match.metaEnd;
//   const matchedQuery = match.matchedQuery;

//   const status = data?.status ?? "";
//   const terminal = isTerminalStatus(status);
//   const failed = isErrorStatus(status);

//   const visualItems: VisualItem[] = useMemo(() => {
//     const photos = data?.photos || [];
//     const videos = data?.videos || [];
//     return [
//       ...photos.map(([title, aspect, path], idx) => ({
//         id: `photo-${idx}`,
//         title,
//         type: "image" as const,
//         src: toAssetUrl(path),
//         aspectRatio: aspect,
//       })),
//       ...videos.map(([title, aspect, path], idx) => ({
//         id: `video-${idx}`,
//         title,
//         type: "video" as const,
//         src: toAssetUrl(path),
//         aspectRatio: aspect,
//       })),
//     ];
//   }, [data]);

//   const bboxStr =
//     metaBbox && !metaBbox.some((v) => Number.isNaN(v))
//       ? `[${metaBbox.map((v) => v.toString()).join(", ")}]`
//       : "—";

//   const periodStr =
//     metaStart || metaEnd ? `${metaStart ?? "?"}  ${metaEnd ?? "?"}` : "—";

//   // const queryName =
//   //   matchedQuery?.name ??
//   //   (jobId ? `Job ${jobId.slice(0, 8)}` : "Unnamed query");
//   const queryName = matchedQuery?.name ?? "";

//   // ---------- UI ----------

//   const StatusPill = () => {
//     const s = statusLabel(status);
//     const isRunning = !terminal && !failed;
//     const cls =
//       "inline-flex items-center gap-2 px-2 py-[2px] text-[11px] border border-neutral-700 text-neutral-200";

//     return (
//       <span className={cls}>
//         <span className="uppercase tracking-wide text-neutral-400">{s}</span>
//         {isRunning ? (
//           <span className="text-neutral-400">{polling ? "•" : ""}</span>
//         ) : null}
//       </span>
//     );
//   };

//   // Show "waiting" any time we have no payload but we are still polling (404/202 pending is normal)
//   if (!data && polling && !error) {
//     return (
//       <div className="app-root">
//         <div className="app-topbar">
//           <div className="app-title">PaddockTS</div>
//           <SearchResultsToggle />
//         </div>
//         <div className="app-main">
//           <div className="app-main-right flex items-center justify-center text-xs text-neutral-400">
//             Fetching results…
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Initial loading shell is fine too, but optional once you have the polling block above
//   if (loading && !data && !error) {
//     return (
//       <div className="app-root">
//         <div className="app-topbar">
//           <div className="app-title">PaddockTS</div>
//           <SearchResultsToggle />
//         </div>
//         <div className="app-main">
//           <div className="app-main-right flex items-center justify-center text-xs text-neutral-400">
//             Fetching results…
//           </div>
//         </div>
//       </div>
//     );
//   }

//   // Only show hard error if polling has stopped (or you choose to stop)
//   if (!data && error && !polling) {
//     return (
//       <div className="app-root">
//         <div className="app-topbar">
//           <div className="app-title">PaddockTS</div>
//           <SearchResultsToggle />
//         </div>
//         <div className="app-main">
//           <div className="app-main-right flex items-center justify-center">
//             <div className="max-w-md text-center space-y-3 text-xs">
//               <h1 className="text-sm font-semibold text-red-400">Result error</h1>
//               <p className="text-neutral-400">{error}</p>
//               <div className="flex items-center justify-center gap-2">
//                 <button
//                   type="button"
//                   className="border border-neutral-700 px-3 py-2 text-xs text-neutral-200"
//                   onClick={() => setRetryNonce((n) => n + 1)}
//                 >
//                   Retry
//                 </button>
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     );
// }

//   const meta = data?.meta || {};

//   // return (
//   //   <div className="app-root">
//   //     <div className="app-topbar">
//   //       <div className="app-title">PaddockTS</div>
//   //       <SearchResultsToggle />
//   //     </div>

//   //     <div className="app-main">
//   //       <div className="app-main-right relative">
//   //         <div className="absolute inset-0 flex flex-col min-h-0 min-w-0">
//   //           {/* Header */}
//   //           <div className="shrink-0 border-b border-neutral-800 px-4 py-3 text-xs flex flex-col gap-1">
//   //             <div className="flex items-baseline justify-between gap-3">
//   //               <div className="text-sm font-semibold text-neutral-100 truncate">
//   //                 {queryName}
//   //               </div>
//   //               <div className="flex items-center gap-2">
//   //                 <StatusPill />
//   //                 {error ? (
//   //                   <button
//   //                     type="button"
//   //                     className="border border-neutral-700 px-2 py-[2px] text-[11px] text-neutral-200"
//   //                     onClick={() => setRetryNonce((n) => n + 1)}
//   //                     title="Retry polling"
//   //                   >
//   //                     Retry
//   //                   </button>
//   //                 ) : null}
//   //               </div>
//   //             </div>

//   //             <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-400">
//   //               <div>
//   //                 <span className="uppercase tracking-wide text-neutral-500 mr-1">
//   //                   Period
//   //                 </span>
//   //                 <span className="font-mono">{periodStr}</span>
//   //               </div>
//   //               <div>
//   //                 <span className="uppercase tracking-wide text-neutral-500 mr-1">
//   //                   BBox [S,W,N,E]
//   //                 </span>
//   //                 <span className="font-mono">{bboxStr}</span>
//   //               </div>
//   //             </div>

//   //             {/* Non-blocking warning while still showing last good payload */}
//   //             {error ? (
//   //               <div className="text-[11px] text-red-400">
//   //                 Polling warning: {error}
//   //               </div>
//   //             ) : null}

//   //             {/* Optional hint while processing */}
//   //             {!terminal && !failed ? (
//   //               <div className="text-[11px] text-neutral-500">
//   //                 Processing… this page will update automatically.
//   //               </div>
//   //             ) : null}

//   //             {failed ? (
//   //               <div className="text-[11px] text-red-400">
//   //                 Job failed. Check backend logs for jobId {jobId}.
//   //               </div>
//   //             ) : null}
//   //           </div>

//   //           {/* Body */}
//   //           <div className="flex-1 min-h-0 overflow-auto px-4 py-4">
//   //             {visualItems.length === 0 && !terminal && !failed ? (
//   //               <div className="flex items-center justify-center py-12 text-xs text-neutral-400">
//   //                 No media yet. Still running…
//   //               </div>
//   //             ) : visualItems.length === 0 && terminal ? (
//   //               <div className="flex items-center justify-center py-12 text-xs text-neutral-400">
//   //                 No media returned for this job.
//   //               </div>
//   //             ) : (
//   //               <PaddockVisualSummary items={visualItems} />
//   //             )}
//   //           </div>
//   //         </div>
//   //       </div>
//   //     </div>
//   //   </div>
//   // );

//   return (
//   <div className="app-root">
//     <div className="app-topbar">
//       <div className="app-title">PaddockTS</div>
//       <SearchResultsToggle />
//     </div>

//     {/* IMPORTANT: no absolute inset wrapper; make this a real flex column */}
//     <div className="results-main">
//       <div className="results-pane">
//         {/* Header */}
//         <div className="results-header">
//           <div className="results-title-row">
//             <div className="results-title">{queryName}</div>

//             <div className="results-header-right">
//               <StatusPill />
//               {error ? (
//                 <button
//                   type="button"
//                   className="border border-neutral-700 px-2 py-[2px] text-[11px] text-neutral-200"
//                   onClick={() => setRetryNonce((n) => n + 1)}
//                   title="Retry polling"
//                 >
//                   Retry
//                 </button>
//               ) : null}
//             </div>
//           </div>

//           <div className="results-meta-row">
//             <div>
//               <span className="results-meta-label">Period</span>
//               <span className="results-meta-mono">{periodStr}</span>
//             </div>
//             <div>
//               <span className="results-meta-label">BBox [S,W,N,E]</span>
//               <span className="results-meta-mono">{bboxStr}</span>
//             </div>
//           </div>

//           {/* Non-blocking warning while still showing last good payload */}
//           {error ? (
//             <div className="text-[11px] text-red-400">Polling warning: {error}</div>
//           ) : null}

//           {/* Optional hint while processing */}
//           {!terminal && !failed ? (
//             <div className="text-[11px] text-neutral-500">
//               Processing… this page will update automatically.
//             </div>
//           ) : null}

//           {failed ? (
//             <div className="text-[11px] text-red-400">
//               Job failed. Check backend logs for jobId {jobId}.
//             </div>
//           ) : null}
//         </div>

//         {/* Body (single scrollbar lives here) */}
//         <div className="results-body">
//           {visualItems.length === 0 && !terminal && !failed ? (
//             <div className="flex items-center justify-center py-12 text-xs text-neutral-400">
//               No media yet. Still running…
//             </div>
//           ) : visualItems.length === 0 && terminal ? (
//             <div className="flex items-center justify-center py-12 text-xs text-neutral-400">
//               No media returned for this job.
//             </div>
//           ) : (
//             <PaddockVisualSummary items={visualItems} />
//           )}
//         </div>
//       </div>
//     </div>
//   </div>
// );

// }



  "use client";

  import { useEffect, useMemo, useRef, useState } from "react";

  // layout chrome
  import SearchResultsToggle from "../../components/SearchResultsToggle";

  // data / types / utilities
  import { API, STORAGE_KEY, LATEST_JOB_STORAGE_KEY } from "../../components/API";
  import type { SavedQuery } from "../../components/SavedQuery";
  import type { Selection } from "../../components/Selection";
  import TopographyPanel from "../../components/TopographyPanel";
  import { TopographyItem } from "../../components/TopographyPanel";
  import OzwaldDailyPanel from "../../components/OzwaldDailyPanel";
  import Ozwald8DayPanel from "../../components/Ozwald8DayPanel";

  // paddock visual summary component
  import PaddockVisualSummary, {
    VisualItem,
  } from "../../components/PaddockVisualSummary";

  type MediaTriple = [string, number, string]; // [title, aspectRatio, path]

  type PaddockSummary = {
    photos: MediaTriple[];
    videos: MediaTriple[];
  };

// type Result = {
//     status: string;
//     paddock_visual_summary: PaddockSummary;
//     meta: Record<string, any>;
//   };

// type Result = {
//   status: string;
//   paddock_visual_summary: PaddockSummary;
//   topography?: Record<string, any> | null;
//   meta: Record<string, any>;
// };

function assetUrl(p: string) {
  return `/${p.replace(/^\/+/, "")}`;
}

  type TopographyLayerPayload = {
    id: string;
    title: string;
    map: string;
    cbar: string;
    w?: number;
    h?: number;
    aspectRatio?: number;
  };

  

  type Result = {
    status: string;
    paddock_visual_summary?: any;
    topography?: { layers: TopographyLayerPayload[] };
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
    return s.length >= 10 ? s.slice(0, 10) : s;
  }

  function toAssetUrl(path: string): string {
    if (path.startsWith("http://") || path.startsWith("https://")) return path;
    const clean = path.replace(/^\/+/, "");
    return `${API}/${clean}`;
  }

  function isTerminalStatus(status: string | undefined | null): boolean {
    const s = String(status || "").toLowerCase();
    return s === "done" || s === "error" || s === "failed";
  }

  function isErrorStatus(status: string | undefined | null): boolean {
    const s = String(status || "").toLowerCase();
    return s === "error" || s === "failed";
  }

  function statusLabel(status: string | undefined | null): string {
    const s = String(status || "").toLowerCase();
    if (!s) return "unknown";
    return s;
  }

  // ---------- page ----------

  export default function ResultsPage({ params }: { params: { jobId: string } }) {
    const { jobId } = params;

    const [data, setData] = useState<Result | null>(null);
    const [loading, setLoading] = useState(true);
    const [polling, setPolling] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
    const [retryNonce, setRetryNonce] = useState(0);

    const timerRef = useRef<number | null>(null);
    const attemptRef = useRef(0);

    // 1) Load saved queries written by MapPanel (READ-ONLY here)
    useEffect(() => {
      if (typeof window === "undefined") return;
      try {
        const raw = window.localStorage.getItem(STORAGE_KEY);
        if (!raw) return;
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSavedQueries(parsed as SavedQuery[]);
      } catch {
        // ignore
      }
    }, []);

    // 2) Poll results until done/error (results page owns lifecycle)
    useEffect(() => {
      let cancelled = false;

      if (typeof window !== "undefined") {
        try {
          window.localStorage.setItem(LATEST_JOB_STORAGE_KEY, jobId);
        } catch {
          // ignore
        }
      }

      const clearTimer = () => {
        if (timerRef.current) {
          window.clearTimeout(timerRef.current);
          timerRef.current = null;
        }
      };

      const scheduleNext = (ms: number) => {
        clearTimer();
        timerRef.current = window.setTimeout(() => {
          void tick();
        }, ms);
      };

      const computeDelayMs = () => {
        // backoff + jitter, capped
        const attempt = attemptRef.current;
        const base = 900; // start ~0.9s
        const growth = 1.55;
        const cap = 15000; // 15s max
        const raw = Math.min(cap, base * Math.pow(growth, attempt));
        const jitter = 0.8 + Math.random() * 0.4; // 0.8..1.2
        return Math.floor(raw * jitter);
      };

      async function tick() {
        if (cancelled) return;

        try {
          setLoading(true);
          setError(null);

          const res = await fetch(`${API}/results/${jobId}`, {
            cache: "no-store",
          });

          // If your backend returns 404 until ready, treat as pending.
          if (!res.ok) {
            if (res.status === 404 || res.status === 202) {
              // pending
              attemptRef.current += 1;
              setPolling(true);
              scheduleNext(computeDelayMs());
              return;
            }

            const text = await res.text();
            throw new Error(text || `HTTP ${res.status}`);
          }

          const json = (await res.json()) as Result;

          if (cancelled) return;
          setData(json);

          const st = String(json.status || "").toLowerCase();

          // On successful responses, reset backoff a bit so we stay responsive.
          attemptRef.current = Math.max(0, attemptRef.current - 1);

          if (isTerminalStatus(st)) {
            setPolling(false);
            setLoading(false);
            clearTimer();
            return;
          }

          setPolling(true);
          scheduleNext(computeDelayMs());
        } catch (err: any) {
          if (cancelled) return;

          // Keep whatever last good data we had, but show error state.
          setError(err?.message ?? "Failed to fetch results");

          attemptRef.current += 1;
          setPolling(true);
          scheduleNext(computeDelayMs());
        } finally {
          if (!cancelled) setLoading(false);
        }
      }

      // reset poll attempt on new jobId / retry
      attemptRef.current = 0;
      setPolling(true);
      void tick();

      return () => {
        cancelled = true;
        clearTimer();
      };
    }, [jobId, retryNonce]);

    // 3) Compute matching saved query (bbox + dates) – read-only
    const match = useMemo(() => {
      if (!data) return { matchedQuery: undefined as SavedQuery | undefined, metaBbox: null as BboxArray | null, metaStart: null as string | null, metaEnd: null as string | null };

      const meta = data.meta || {};
      const metaBbox = normalizeBbox(meta.bbox);
      const metaStart = normalizeDateString(meta.start_date);
      const metaEnd = normalizeDateString(meta.end_date);

      let matchedQuery: SavedQuery | undefined;

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

      return { matchedQuery, metaBbox, metaStart, metaEnd };
    }, [data, savedQueries]);

    

    const metaBbox = match.metaBbox;
    const metaStart = match.metaStart;
    const metaEnd = match.metaEnd;
    const matchedQuery = match.matchedQuery;

    const status = data?.status ?? "";
    const terminal = isTerminalStatus(status);
    const failed = isErrorStatus(status);

    const topoItems: TopographyItem[] = useMemo(() => {
      const layers = data?.topography?.layers ?? [];
      return layers.map((l) => ({
        id: `topo-${l.id}`,
        title: l.title,
        mapSrc: toAssetUrl(l.map),
        cbarSrc: toAssetUrl(l.cbar),
        w: l.w,
        h: l.h,
        aspectRatio: l.aspectRatio,
      }));
    }, [data]);

    const visualItems: VisualItem[] = useMemo(() => {
      // const photos = data?.photos || [];
      // const videos = data?.videos || [];
      const photos = data?.paddock_visual_summary?.photos ?? [];
      const videos = data?.paddock_visual_summary?.videos ?? [];
      return [
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
    }, [data]);

    const bboxStr =
      metaBbox && !metaBbox.some((v) => Number.isNaN(v))
        ? `[${metaBbox.map((v) => v.toString()).join(", ")}]`
        : "—";

    const periodStr =
      metaStart || metaEnd ? `${metaStart ?? "?"}  ${metaEnd ?? "?"}` : "—";

    // const queryName =
    //   matchedQuery?.name ??
    //   (jobId ? `Job ${jobId.slice(0, 8)}` : "Unnamed query");
    const queryName = matchedQuery?.name ?? "";

    // ---------- UI ----------

    const StatusPill = () => {
      const s = statusLabel(status);
      const isRunning = !terminal && !failed;
      const cls =
        "inline-flex items-center gap-2 px-2 py-[2px] text-[11px] border border-neutral-700 text-neutral-200";

      return (
        <span className={cls}>
          <span className="uppercase tracking-wide text-neutral-400">{s}</span>
          {isRunning ? (
            <span className="text-neutral-400">{polling ? "•" : ""}</span>
          ) : null}
        </span>
      );
    };

    // Show "waiting" any time we have no payload but we are still polling (404/202 pending is normal)
    if (!data && polling && !error) {
      return (
        <div className="app-root">
          <div className="app-topbar">
            <div className="app-title">PaddockTS</div>
            <SearchResultsToggle />
          </div>
          <div className="app-main">
            <div className="app-main-right flex items-center justify-center text-xs text-neutral-400">
              Fetching results…
            </div>
          </div>
        </div>
      );
    }

    // Initial loading shell is fine too, but optional once you have the polling block above
    if (loading && !data && !error) {
      return (
        <div className="app-root">
          <div className="app-topbar">
            <div className="app-title">PaddockTS</div>
            <SearchResultsToggle />
          </div>
          <div className="app-main">
            <div className="app-main-right flex items-center justify-center text-xs text-neutral-400">
              Fetching results…
            </div>
          </div>
        </div>
      );
    }

    // Only show hard error if polling has stopped (or you choose to stop)
    if (!data && error && !polling) {
      return (
        <div className="app-root">
          <div className="app-topbar">
            <div className="app-title">PaddockTS</div>
            <SearchResultsToggle />
          </div>
          <div className="app-main">
            <div className="app-main-right flex items-center justify-center">
              <div className="max-w-md text-center space-y-3 text-xs">
                <h1 className="text-sm font-semibold text-red-400">Result error</h1>
                <p className="text-neutral-400">{error}</p>
                <div className="flex items-center justify-center gap-2">
                  <button
                    type="button"
                    className="border border-neutral-700 px-3 py-2 text-xs text-neutral-200"
                    onClick={() => setRetryNonce((n) => n + 1)}
                  >
                    Retry
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
  }

    const meta = data?.meta || {};

    // return (
    //   <div className="app-root">
    //     <div className="app-topbar">
    //       <div className="app-title">PaddockTS</div>
    //       <SearchResultsToggle />
    //     </div>

    //     <div className="app-main">
    //       <div className="app-main-right relative">
    //         <div className="absolute inset-0 flex flex-col min-h-0 min-w-0">
    //           {/* Header */}
    //           <div className="shrink-0 border-b border-neutral-800 px-4 py-3 text-xs flex flex-col gap-1">
    //             <div className="flex items-baseline justify-between gap-3">
    //               <div className="text-sm font-semibold text-neutral-100 truncate">
    //                 {queryName}
    //               </div>
    //               <div className="flex items-center gap-2">
    //                 <StatusPill />
    //                 {error ? (
    //                   <button
    //                     type="button"
    //                     className="border border-neutral-700 px-2 py-[2px] text-[11px] text-neutral-200"
    //                     onClick={() => setRetryNonce((n) => n + 1)}
    //                     title="Retry polling"
    //                   >
    //                     Retry
    //                   </button>
    //                 ) : null}
    //               </div>
    //             </div>

    //             <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-neutral-400">
    //               <div>
    //                 <span className="uppercase tracking-wide text-neutral-500 mr-1">
    //                   Period
    //                 </span>
    //                 <span className="font-mono">{periodStr}</span>
    //               </div>
    //               <div>
    //                 <span className="uppercase tracking-wide text-neutral-500 mr-1">
    //                   BBox [S,W,N,E]
    //                 </span>
    //                 <span className="font-mono">{bboxStr}</span>
    //               </div>
    //             </div>

    //             {/* Non-blocking warning while still showing last good payload */}
    //             {error ? (
    //               <div className="text-[11px] text-red-400">
    //                 Polling warning: {error}
    //               </div>
    //             ) : null}

    //             {/* Optional hint while processing */}
    //             {!terminal && !failed ? (
    //               <div className="text-[11px] text-neutral-500">
    //                 Processing… this page will update automatically.
    //               </div>
    //             ) : null}

    //             {failed ? (
    //               <div className="text-[11px] text-red-400">
    //                 Job failed. Check backend logs for jobId {jobId}.
    //               </div>
    //             ) : null}
    //           </div>

    //           {/* Body */}
    //           <div className="flex-1 min-h-0 overflow-auto px-4 py-4">
    //             {visualItems.length === 0 && !terminal && !failed ? (
    //               <div className="flex items-center justify-center py-12 text-xs text-neutral-400">
    //                 No media yet. Still running…
    //               </div>
    //             ) : visualItems.length === 0 && terminal ? (
    //               <div className="flex items-center justify-center py-12 text-xs text-neutral-400">
    //                 No media returned for this job.
    //               </div>
    //             ) : (
    //               <PaddockVisualSummary items={visualItems} />
    //             )}
    //           </div>
    //         </div>
    //       </div>
    //     </div>
    //   </div>
    // );

    return (
    <div className="app-root">
      <div className="app-topbar">
        <div className="app-title">PaddockTS</div>
        <SearchResultsToggle />
      </div>

      {/* IMPORTANT: no absolute inset wrapper; make this a real flex column */}
      <div className="results-main">
        <div className="results-pane">
          {/* Header */}
          <div className="results-header">
            <div className="results-title-row">
              <div className="results-title">{queryName}</div>

              <div className="results-header-right">
                <StatusPill />
                {error ? (
                  <button
                    type="button"
                    className="border border-neutral-700 px-2 py-[2px] text-[11px] text-neutral-200"
                    onClick={() => setRetryNonce((n) => n + 1)}
                    title="Retry polling"
                  >
                    Retry
                  </button>
                ) : null}
              </div>
            </div>

            <div className="results-meta-row">
              <div>
                <span className="results-meta-label">Period</span>
                <span className="results-meta-mono">{periodStr}</span>
              </div>
              <div>
                <span className="results-meta-label">BBox [S,W,N,E]</span>
                <span className="results-meta-mono">{bboxStr}</span>
              </div>
            </div>

            {/* Non-blocking warning while still showing last good payload */}
            {error ? (
              <div className="text-[11px] text-red-400">Polling warning: {error}</div>
            ) : null}

            {/* Optional hint while processing */}
            {!terminal && !failed ? (
              <div className="text-[11px] text-neutral-500">
                Processing… this page will update automatically.
              </div>
            ) : null}

            {failed ? (
              <div className="text-[11px] text-red-400">
                Job failed. Check backend logs for jobId {jobId}.
              </div>
            ) : null}
          </div>

          {/* Body (single scrollbar lives here)
          <div className="results-body">
            {visualItems.length === 0 && !terminal && !failed ? (
              <div className="flex items-center justify-center py-12 text-xs text-neutral-400">
                No media yet. Still running…
              </div>
            ) : visualItems.length === 0 && terminal ? (
              <div className="flex items-center justify-center py-12 text-xs text-neutral-400">
                No media returned for this job.
              </div>
            ) : (
              <PaddockVisualSummary items={visualItems} />
              
              
            )}
          </div> */}
          {/* Body (single scrollbar lives here) */}
<div className="results-body">
  {visualItems.length === 0 && !terminal && !failed ? (
    <div className="flex items-center justify-center py-12 text-xs text-neutral-400">
      No media yet. Still running…
    </div>
  ) : visualItems.length === 0 && terminal ? (
    <div className="flex items-center justify-center py-12 text-xs text-neutral-400">
      No media returned for this job.
    </div>
  ) : (
    <div className="flex flex-col gap-4">
      <PaddockVisualSummary items={visualItems} />

      {topoItems.length ? <TopographyPanel items={topoItems} /> : null}

      <OzwaldDailyPanel jobId={jobId} apiBase={API} />

      <Ozwald8DayPanel jobId={jobId} apiBase={API} />
    </div>
  )}
</div>
        </div>
      </div>
    </div>
  );

  }
