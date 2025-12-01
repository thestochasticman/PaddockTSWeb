// "use client";

// import { useEffect, useState } from "react";
// import Script from "next/script";
// import { useRouter } from "next/navigation";
// import MiniDatePicker from "./MiniDatePicker";
// import {Selection} from "./Selection"
// import { SavedQuery } from "./SavedQuery";
// import {BASE, API, apiKey, STORAGE_KEY, LATEST_JOB_STORAGE_KEY} from "./API"
// import { BboxToVertices } from "./BboxToVertices";
// import { VerticesToBbox } from "./VerticesToBBox";
// import { VerticesStringToVertexList } from "./VerticesStringToVertexList";


// type Status = "idle" | "running" | "done" | "error";

// // Parse vertices text into bbox.
// // - If >= 2 valid points: bbox = min/max lat/lon.
// // - If exactly 1 point: use buffer (km) to build a square bbox around the point.



// // --- default bbox / vertices to start with ---
// const DEFAULT_BBOX: Selection = {
//   north: -33.0,
//   south: -34.0,
//   east: 149.0,
//   west: 148.0,
// };

// const DEFAULT_VERTICES_TEXT = BboxToVertices(DEFAULT_BBOX);

// export default function MapPanel() {
//   const router = useRouter();

//   // selection always reflects current bbox (from map OR from vertices text + buffer)
//   const [selection, setSelection] = useState<Selection | null>(DEFAULT_BBOX);

//   // vertices that user sees/edits; start with default vertices
//   const [verticesText, setVerticesText] = useState(DEFAULT_VERTICES_TEXT);

//   const [bufferKm, setBufferKm] = useState("5");
//   const [startDate, setStartDate] = useState("2020-01-01");
//   const [endDate, setEndDate] = useState("2020-12-31");

//   // Which date picker is open: "start", "end", or null
//   const [openPicker, setOpenPicker] = useState<"start" | "end" | null>(null);

//   // Saved queries
//   const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
//   const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);

//   // Run status (like QueryPanel)
//   const [status, setStatus] = useState<Status>("idle");
//   const [jobId, setJobId] = useState<string | null>(null);
//   const [error, setError] = useState<string | null>(null);

//   // --- Load saved queries from localStorage on mount ---
//   useEffect(() => {
//     if (typeof window === "undefined") return;
//     try {
//       const raw = window.localStorage.getItem(STORAGE_KEY);
//       if (!raw) return;
//       const parsed = JSON.parse(raw) as SavedQuery[];
//       if (Array.isArray(parsed)) {
//         setSavedQueries(parsed);
//       }
//     } catch {
//       // ignore parse errors
//     }
//   }, []);

//   // --- Persist saved queries whenever they change ---
//   useEffect(() => {
//     if (typeof window === "undefined") return;
//     try {
//       window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedQueries));
//     } catch {
//       // ignore write errors
//     }
//   }, [savedQueries]);

//   // 1) Map → React: when user draws a rectangle, update selection + overwrite vertices
//   useEffect(() => {
//     function handleBboxSelected(event: Event) {
//       const e = event as CustomEvent<Selection>;
//       const bbox = e.detail;
//       setSelection(bbox);
//       // selection from map always overwrites vertices list
//       setVerticesText(BboxToVertices(bbox));
//       setSelectedQueryId(null); // now it's a custom, unsaved state
//     }

//     window.addEventListener("bbox-selected", handleBboxSelected as EventListener);
//     return () => {
//       window.removeEventListener(
//         "bbox-selected",
//         handleBboxSelected as EventListener
//       );
//     };
//   }, []);

//   // 2) Text/buffer → React: when user edits vertices or buffer, recompute selection from it
//   useEffect(() => {
//     if (!verticesText.trim()) return;
//     const parsed = VerticesToBbox(verticesText, bufferKm);
//     if (!parsed) return;
//     setSelection(parsed);
//     setSelectedQueryId(null); // custom again
//   }, [verticesText, bufferKm]);

//   // 3) React → Map: whenever selection changes, ask Maps to update the rectangle
//   useEffect(() => {
//     if (!selection) return;
//     const w = window as any;
//     if (typeof w.setBoundingBoxFromReact === "function") {
//       w.setBoundingBoxFromReact(
//         selection.north,
//         selection.south,
//         selection.east,
//         selection.west
//       );
//     }
//   }, [selection]);

//   // --- Poll job status (like QueryPanel) ---
//   useEffect(() => {
//     if (status !== "running" || !jobId) return;
//     const interval = setInterval(async () => {
//       try {
//         const res = await fetch(`${API}/results/${jobId}`);
//         if (res.ok) {
//           const data = await res.json();
//           if (data.status === "done") {
//             setStatus("done");

//             // remember "latest job" for the Search/Results toggle
//             if (typeof window !== "undefined") {
//               window.localStorage.setItem(LATEST_JOB_STORAGE_KEY, jobId);
//             }

//             router.push(`/results/${jobId}`);
//           }
//         }
//       } catch {
//         // ignore transient errors
//       }
//     }, 4000);
//     return () => clearInterval(interval);
//   }, [status, jobId, router]);

//   const handleSelectClick = () => {
//     const w = window as any;
//     if (w.enableRectangleSelection) {
//       w.enableRectangleSelection();
//     }
//   };

//   // --- Save current setup as a named query ---
//   const handleSaveCurrent = () => {
//     const bbox = selection ?? VerticesToBbox(verticesText, bufferKm);
//     if (!bbox) {
//       window.alert("Please provide at least one valid coordinate before saving.");
//       return;
//     }

//     const defaultName =
//       verticesText.split(/\n+/)[0]?.slice(0, 40) ||
//       `Preset ${savedQueries.length + 1}`;

//     const name = window.prompt("Name this query:", defaultName);
//     if (!name) return;

//     const now = new Date().toISOString();
//     const id =
//       (typeof crypto !== "undefined" && "randomUUID" in crypto
//         ? (crypto as any).randomUUID()
//         : Date.now().toString()) + Math.random().toString(16).slice(2);

//     const newQuery: SavedQuery = {
//       id,
//       name: name.trim(),
//       bbox,
//       verticesText,
//       startDate,
//       endDate,
//     };

//     setSavedQueries((prev) => [newQuery, ...prev]);
//     setSelectedQueryId(id);
//   };

//   // --- When user selects a saved query from dropdown ---
//   const handleSelectSavedQuery = (id: string) => {
//     if (!id) {
//       setSelectedQueryId(null);
//       return;
//     }
//     const q = savedQueries.find((sq) => sq.id === id);
//     if (!q) return;

//     setSelectedQueryId(id);
//     setVerticesText(q.verticesText);
//     setStartDate(q.startDate);
//     setEndDate(q.endDate);
//     setSelection(q.bbox);
//     setOpenPicker(null);

//     // update lastUsedAt (optional)
//     const now = new Date().toISOString();
//     setSavedQueries((prev) =>
//       prev.map((sq) =>
//         sq.id === id ? { ...sq, lastUsedAt: now } : sq
//       )
//     );
//   };

//   // --- mark query as custom when dates change ---
//   const handleStartDateChange = (value: string) => {
//     setStartDate(value);
//     setSelectedQueryId(null);
//   };

//   const handleEndDateChange = (value: string) => {
//     setEndDate(value);
//     setSelectedQueryId(null);
//   };

//   // --- Run simulation from MapPanel (like QueryPanel.handleRun) ---
//   async function handleRun() {
//     if (!selection) {
//       window.alert("Please define a region first.");
//       return;
//     }

//     setStatus("running");
//     setError(null);
//     const vertexList = VerticesStringToVertexList(verticesText);
//     let bboxArray: [number, number, number, number] | null = null;
//     if (selection) {
//     bboxArray = [
//       selection.south, // lat_min
//       selection.west,  // lon_min
//       selection.north, // lat_max
//       selection.east,  // lon_max
//     ];
//     } else {
//     const bbox = VerticesToBbox(verticesText, bufferKm);
//     if (bbox) {
//       bboxArray = [
//         bbox.south,
//         bbox.west,
//         bbox.north,
//         bbox.east,
//       ];
//     }
//     }
//       if (!bboxArray) {
//     window.alert("Could not infer a bounding box from the vertices.");
//     return;
//   }

//   setStatus("running");
//   setError(null);
//     try {
//       const body = {
//         // geometry
//         vertices: vertexList,
//         bbox: bboxArray,
//         buffer_km: Number(bufferKm),
//         // time window
//         start_date: startDate, // already yyyy-mm-dd
//         end_date: endDate,
      
//         // you can add more fields here (crop, xsite, etc.) if you want to
//       };

//       const res = await fetch(`${BASE}/run`, {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify(body),
//       });

//       if (!res.ok) throw new Error(await res.text());
//       const json = await res.json();
//       const newJobId = json.job_id ?? json.jobId;

//       if (!newJobId) {
//         throw new Error("Backend did not return a job id");
//       }

//       setJobId(newJobId);
//       setStatus("running");

//       // store as latest immediately (optional, polling will also do it once done)
//       if (typeof window !== "undefined") {
//         window.localStorage.setItem(LATEST_JOB_STORAGE_KEY, newJobId);
//       }
//     } catch (err: any) {
//       console.error(err);
//       setError(err.message || "Run failed");
//       setStatus("error");
//     }
//   }

//   if (!apiKey) {
//     return (
//       <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
//         Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local
//       </div>
//     );
//   }

//   return (
//     <>
//       {/* 1) initMap + drawing manager; dispatch bbox-selected when rectangle drawn.
//             Also expose setBoundingBoxFromReact so React can control the rectangle. */}
//       <Script id="gmaps-init" strategy="afterInteractive">
//         {`
//           let map;
//           let drawingManager;
//           let currentRectangle = null;

//           // shared rectangle style
//           const rectangleStyle = {
//             strokeColor: "#00FFFF",
//             strokeOpacity: 0.9,
//             strokeWeight: 2,
//             fillColor: "#00FFFF",
//             fillOpacity: 0.15,
//           };

//           function initMap() {
//             const mapDiv = document.getElementById("map");
//             if (!mapDiv) return;

//             map = new google.maps.Map(mapDiv, {
//               zoom: 6,
//               center: { lat: -33.5, lng: 148.5 }, // tweak for your region
//               mapTypeId: "terrain",
//             });

//             drawingManager = new google.maps.drawing.DrawingManager({
//               drawingMode: null, // pan mode by default
//               drawingControl: false, // we control via our own button
//               rectangleOptions: rectangleStyle,
//             });

//             drawingManager.setMap(map);

//             google.maps.event.addListener(
//               drawingManager,
//               "overlaycomplete",
//               function(e) {
//                 if (e.type === google.maps.drawing.OverlayType.RECTANGLE) {
//                   if (currentRectangle) {
//                     currentRectangle.setMap(null);
//                   }
//                   currentRectangle = e.overlay;

//                   // stop drawing more rectangles after selection
//                   drawingManager.setDrawingMode(null);

//                   const bounds = currentRectangle.getBounds();
//                   const north = bounds.getNorthEast().lat();
//                   const east = bounds.getNorthEast().lng();
//                   const south = bounds.getSouthWest().lat();
//                   const west = bounds.getSouthWest().lng();

//                   window.dispatchEvent(
//                     new CustomEvent("bbox-selected", {
//                       detail: { north, south, east, west },
//                     })
//                   );
//                 }
//               }
//             );
//           }

//           // Expose to global so Google callback can call it
//           window.initMap = initMap;

//           // Expose for React to trigger drawing mode
//           window.enableRectangleSelection = function() {
//             if (drawingManager) {
//               drawingManager.setDrawingMode(google.maps.drawing.OverlayType.RECTANGLE);
//             }
//           };

//           // Expose for React to directly set/update the rectangle from a bbox
//           window.setBoundingBoxFromReact = function(north, south, east, west) {
//             if (!map) return;

//             if (currentRectangle) {
//               currentRectangle.setMap(null);
//             }

//             const bounds = new google.maps.LatLngBounds(
//               new google.maps.LatLng(south, west),
//               new google.maps.LatLng(north, east)
//             );

//             currentRectangle = new google.maps.Rectangle({
//               ...rectangleStyle,
//               map,
//               bounds,
//             });

//             map.fitBounds(bounds);
//           };
//         `}
//       </Script>

//       {/* 2) Load Maps JS API with drawing library + initMap callback */}
//       <Script
//         src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing&callback=initMap`}
//         strategy="afterInteractive"
//       />

//       {/* 3) Map + right-hand control card */}
//       <div className="relative w-full h-full">
//         {/* Map layer */}
//         <div id="map" className="w-full h-full z-0" />

//         {/* Single card on the right */}
//         <div className="absolute top-4 right-4 z-50 max-w-xs">
//           <div className="rounded-lg bg-neutral-900/90 border border-neutral-700 px-4 py-3 text-xs text-neutral-200 shadow-lg space-y-3">
//             {/* Saved query selector */}
//             <div className="space-y-1">
//               <div className="flex items-end gap-2">
//                 <div className="flex-1">
//                   <label className="block text-[10px] text-neutral-500 mb-0.5">
//                     Saved query
//                   </label>
//                   <select
//                     className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-2 py-[3px] text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500"
//                     value={selectedQueryId ?? ""}
//                     onChange={(e) => handleSelectSavedQuery(e.target.value)}
//                   >
//                     <option value="">Custom (unsaved)</option>
//                     {savedQueries.map((q) => (
//                       <option key={q.id} value={q.id}>
//                         {q.name}
//                       </option>
//                     ))}
//                   </select>
//                 </div>
//                 <button
//                   type="button"
//                   className="rounded-md bg-neutral-800 border border-neutral-600 px-2 py-[5px] text-[11px] hover:bg-neutral-700 whitespace-nowrap"
//                   onClick={handleSaveCurrent}
//                 >
//                   Save
//                 </button>
//               </div>
//             </div>

//             {/* BBOX info (derived from selection) */}
//             {selection && (
//               <>
//                 <div className="font-semibold text-cyan-400 text-xs">
//                   Bounding box
//                 </div>
//                 <ul className="space-y-1 font-mono text-[11px]">
//                   <li>
//                     <b>N:</b> {selection.north.toFixed(4)}
//                   </li>
//                   <li>
//                     <b>S:</b> {selection.south.toFixed(4)}
//                   </li>
//                   <li>
//                     <b>W:</b> {selection.west.toFixed(4)}
//                   </li>
//                   <li>
//                     <b>E:</b> {selection.east.toFixed(4)}
//                   </li>
//                 </ul>
//               </>
//             )}

//             {/* Vertices list */}
//             <div className="space-y-1">
//               <span className="text-[11px] uppercase tracking-wide text-neutral-400">
//                 Vertices (lat, lon)
//               </span>
//               <textarea
//                 rows={4}
//                 className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono resize-none"
//                 placeholder={`lat, lon\nlat, lon\nlat, lon\nlat, lon`}
//                 value={verticesText}
//                 onChange={(e) => setVerticesText(e.target.value)}
//               />
//               <p className="text-[10px] text-neutral-500">
//                 Draw a rectangle to auto-fill these vertices, or paste your own
//                 list. If you enter a single coordinate, the buffer (km) is used
//                 to create a bounding box around it.
//               </p>
//             </div>

//             {/* Time window */}
//             <div className="space-y-1">
//               <span className="text-[11px] uppercase tracking-wide text-neutral-400">
//                 Time window
//               </span>
//               <div className="grid grid-cols-2 gap-2">
//                 <MiniDatePicker
//                   label="Start"
//                   value={startDate}
//                   onChange={handleStartDateChange}
//                   isOpen={openPicker === "start"}
//                   onToggle={() =>
//                     setOpenPicker((prev) => (prev === "start" ? null : "start"))
//                   }
//                   align="left"
//                 />
//                 <MiniDatePicker
//                   label="End"
//                   value={endDate}
//                   onChange={handleEndDateChange}
//                   isOpen={openPicker === "end"}
//                   onToggle={() =>
//                     setOpenPicker((prev) => (prev === "end" ? null : "end"))
//                   }
//                   align="right"
//                 />
//               </div>
//             </div>

//             {/* Buffer */}
//             <div className="space-y-1">
//               <label className="block text-[10px] text-neutral-500 mb-0.5">
//                 Buffer (km)
//               </label>
//               <input
//                 type="number"
//                 className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-2 py-[3px] text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500"
//                 value={bufferKm}
//                 onChange={(e) => setBufferKm(e.target.value)}
//                 min="0"
//                 step="0.1"
//               />
//             </div>

//             {/* Buttons + status */}
//             <div className="flex flex-col gap-2 pt-1">
//               <div className="flex justify-end gap-2">
//                 <button
//                   type="button"
//                   className="rounded-md border border-neutral-600 px-2 py-1 text-[11px] hover:bg-neutral-800"
//                   onClick={handleSelectClick}
//                 >
//                   Select area
//                 </button>
//                 <button
//                   type="button"
//                   disabled={status === "running"}
//                   className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
//                     status === "running"
//                       ? "bg-neutral-700 cursor-not-allowed text-neutral-300"
//                       : "bg-cyan-500 text-neutral-950 hover:bg-cyan-400"
//                   }`}
//                   onClick={handleRun}
//                 >
//                   {status === "running" ? "Running…" : "Run"}
//                 </button>
//               </div>

//               <div className="text-[11px] min-h-[1.25rem]">
//                 {status === "running" && (
//                   <span className="text-yellow-400 animate-pulse">
//                     ⏳ Simulation running…
//                   </span>
//                 )}
//                 {status === "done" && (
//                   <span className="text-green-400">✅ Completed</span>
//                 )}
//                 {status === "error" && (
//                   <span className="text-red-400">❌ {error}</span>
//                 )}
//               </div>
//             </div>
//           </div>
//         </div>
//       </div>
//     </>
//   );
// }


"use client";

import { useEffect, useState } from "react";
import Script from "next/script";
import { useRouter } from "next/navigation";

import MiniDatePicker from "./MiniDatePicker";
import { Selection } from "./Selection";
import { SavedQuery } from "./SavedQuery";
import {
  BASE,
  API,
  apiKey,
  STORAGE_KEY,
  LATEST_JOB_STORAGE_KEY,
} from "./API";
import { BboxToVertices } from "./BboxToVertices";
import { VerticesToBbox } from "./VerticesToBBox";
import { VerticesStringToVertexList } from "./VerticesStringToVertexList";

type Status = "idle" | "running" | "done" | "error";

// --- default bbox / vertices to start with ---
const DEFAULT_BBOX: Selection = {
  north: -33.0,
  south: -34.0,
  east: 149.0,
  west: 148.0,
};

const DEFAULT_VERTICES_TEXT = BboxToVertices(DEFAULT_BBOX);

export default function MapPanel() {
  const router = useRouter();

  // selection always reflects current bbox (from map OR from vertices text + buffer)
  const [selection, setSelection] = useState<Selection | null>(DEFAULT_BBOX);

  // vertices that user sees/edits; start with default vertices
  const [verticesText, setVerticesText] = useState(DEFAULT_VERTICES_TEXT);

  const [bufferKm, setBufferKm] = useState("5");
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState("2020-12-31");

  // Which date picker is open: "start", "end", or null
  const [openPicker, setOpenPicker] = useState<"start" | "end" | null>(null);

  // Saved queries
  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);

  // Have we loaded from localStorage yet?
  const [loadedFromStorage, setLoadedFromStorage] = useState(false);

  // Run status (like QueryPanel)
  const [status, setStatus] = useState<Status>("idle");
  const [jobId, setJobId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // --- after state declarations, before other effects ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as any;

    // If Google Maps JS is already loaded, initialise the map explicitly
    if (w.google && w.google.maps && typeof w.initMap === "function") {
      w.initMap();
    }
  }, []);


  // --- Load saved queries from localStorage on mount ---
  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        console.log("[MapPanel] no saved queries in localStorage");
        setLoadedFromStorage(true);
        return;
      }

      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) {
        console.log("[MapPanel] loaded saved queries:", parsed);
        setSavedQueries(parsed as SavedQuery[]);
      } else {
        console.warn(
          "[MapPanel] value under STORAGE_KEY is not an array, ignoring:",
          parsed
        );
      }
    } catch (e) {
      console.error("[MapPanel] failed to parse saved queries:", e);
    } finally {
      setLoadedFromStorage(true);
    }
  }, []);

  // --- Persist saved queries whenever they change (after initial load) ---
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!loadedFromStorage) return;

    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedQueries));
      console.log("[MapPanel] wrote saved queries:", savedQueries);
    } catch (e) {
      console.error("[MapPanel] failed to write saved queries:", e);
    }
  }, [savedQueries, loadedFromStorage]);

  // 1) Map → React: when user draws a rectangle, update selection + overwrite vertices
  useEffect(() => {
    function handleBboxSelected(event: Event) {
      const e = event as CustomEvent<Selection>;
      const bbox = e.detail;
      setSelection(bbox);
      // selection from map always overwrites vertices list
      setVerticesText(BboxToVertices(bbox));
      setSelectedQueryId(null); // now it's a custom, unsaved state
    }

    window.addEventListener("bbox-selected", handleBboxSelected as EventListener);
    return () => {
      window.removeEventListener(
        "bbox-selected",
        handleBboxSelected as EventListener
      );
    };
  }, []);

  // 2) Text/buffer → React: when user edits vertices or buffer, recompute selection from it
  useEffect(() => {
    if (!verticesText.trim()) return;
    const parsed = VerticesToBbox(verticesText, bufferKm);
    if (!parsed) return;
    setSelection(parsed);
    setSelectedQueryId(null); // custom again
  }, [verticesText, bufferKm]);

  // 3) React → Map: whenever selection changes, ask Maps to update the rectangle
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

  // --- Poll job status (like QueryPanel) ---
  useEffect(() => {
    if (status !== "running" || !jobId) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`${API}/results/${jobId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.status === "done") {
            setStatus("done");

            // remember "latest job" for the Search/Results toggle
            if (typeof window !== "undefined") {
              window.localStorage.setItem(LATEST_JOB_STORAGE_KEY, jobId);
            }

            router.push(`/results/${jobId}`);
          }
        }
      } catch {
        // ignore transient errors
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

    const defaultName =
      verticesText.split(/\n+/)[0]?.slice(0, 40) ||
      `Preset ${savedQueries.length + 1}`;

    const name = window.prompt("Name this query:", defaultName);
    if (!name) return;

    const newQuery: SavedQuery = {
      id:
        (typeof crypto !== "undefined" && "randomUUID" in crypto
          ? (crypto as any).randomUUID()
          : Date.now().toString()) + Math.random().toString(16).slice(2),
      name: name.trim(),
      bbox,
      verticesText,
      startDate,
      endDate,
    };

    setSavedQueries((prev) => [newQuery, ...prev]);
    setSelectedQueryId(newQuery.id);
  };

  // --- When user selects a saved query from dropdown ---
  const handleSelectSavedQuery = (id: string) => {
    if (!id) {
      setSelectedQueryId(null);
      return;
    }
    const q = savedQueries.find((sq) => sq.id === id);
    if (!q) return;

    setSelectedQueryId(id);
    setVerticesText(q.verticesText);
    setStartDate(q.startDate);
    setEndDate(q.endDate);
    setSelection(q.bbox);
    setOpenPicker(null);
  };

  // --- mark query as custom when dates change ---
  const handleStartDateChange = (value: string) => {
    setStartDate(value);
    setSelectedQueryId(null);
  };

  const handleEndDateChange = (value: string) => {
    setEndDate(value);
    setSelectedQueryId(null);
  };

  // --- Run simulation from MapPanel (like QueryPanel.handleRun) ---
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
        selection.south, // lat_min
        selection.west, // lon_min
        selection.north, // lat_max
        selection.east, // lon_max
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

    setStatus("running");
    setError(null);
    try {
      const body = {
        // geometry
        vertices: vertexList,
        bbox: bboxArray,
        buffer_km: Number(bufferKm),
        // time window
        start_date: startDate, // already yyyy-mm-dd
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

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
        Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local
      </div>
    );
  }

  return (
    <>
      {/* 1) initMap + drawing manager; dispatch bbox-selected when rectangle drawn.
            Also expose setBoundingBoxFromReact so React can control the rectangle. */}
      <Script id="gmaps-init" strategy="afterInteractive">
        {`
          let map;
          let drawingManager;
          let currentRectangle = null;

          // shared rectangle style
          const rectangleStyle = {
            strokeColor: "#00FFFF",
            strokeOpacity: 0.9,
            strokeWeight: 2,
            fillColor: "#00FFFF",
            fillOpacity: 0.15,
          };

          function initMap() {
            const mapDiv = document.getElementById("map");
            if (!mapDiv) return;

            map = new google.maps.Map(mapDiv, {
              zoom: 6,
              center: { lat: -33.5, lng: 148.5 },
              mapTypeId: "terrain",
            });

            drawingManager = new google.maps.drawing.DrawingManager({
              drawingMode: null,
              drawingControl: false,
              rectangleOptions: rectangleStyle,
            });

            drawingManager.setMap(map);

            google.maps.event.addListener(
              drawingManager,
              "overlaycomplete",
              function(e) {
                if (e.type === google.maps.drawing.OverlayType.RECTANGLE) {
                  if (currentRectangle) {
                    currentRectangle.setMap(null);
                  }
                  currentRectangle = e.overlay;

                  drawingManager.setDrawingMode(null);

                  const bounds = currentRectangle.getBounds();
                  const north = bounds.getNorthEast().lat();
                  const east = bounds.getNorthEast().lng();
                  const south = bounds.getSouthWest().lat();
                  const west = bounds.getSouthWest().lng();

                  window.dispatchEvent(
                    new CustomEvent("bbox-selected", {
                      detail: { north, south, east, west },
                    })
                  );
                }
              }
            );
          }

          window.initMap = initMap;

          window.enableRectangleSelection = function() {
            if (drawingManager) {
              drawingManager.setDrawingMode(google.maps.drawing.OverlayType.RECTANGLE);
            }
          };

          window.setBoundingBoxFromReact = function(north, south, east, west) {
            if (!map) return;

            if (currentRectangle) {
              currentRectangle.setMap(null);
            }

            const bounds = new google.maps.LatLngBounds(
              new google.maps.LatLng(south, west),
              new google.maps.LatLng(north, east)
            );

            currentRectangle = new google.maps.Rectangle({
              ...rectangleStyle,
              map,
              bounds,
            });

            map.fitBounds(bounds);
          };
        `}
      </Script>

      {/* 2) Load Maps JS API with drawing library + initMap callback */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing&callback=initMap`}
        strategy="afterInteractive"
      />

      {/* 3) Map + right-hand control card */}
      <div className="relative w-full h-full">
        {/* Map layer */}
        <div id="map" className="w-full h-full z-0" />

        {/* Single card on the right */}
        <div className="absolute top-4 right-4 z-50 max-w-xs">
          <div className="rounded-lg bg-neutral-900/90 border border-neutral-700 px-4 py-3 text-xs text-neutral-200 shadow-lg space-y-3">
            {/* Saved query selector */}
            <div className="space-y-1">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label className="block text-[10px] text-neutral-500 mb-0.5">
                    Saved query
                  </label>
                  <select
                    className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-2 py-[3px] text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500"
                    value={selectedQueryId ?? ""}
                    onChange={(e) => handleSelectSavedQuery(e.target.value)}
                  >
                    <option value="">Custom (unsaved)</option>
                    {savedQueries.map((q) => (
                      <option key={q.id} value={q.id}>
                        {q.name}
                      </option>
                    ))}
                  </select>
                </div>
                <button
                  type="button"
                  className="rounded-md bg-neutral-800 border border-neutral-600 px-2 py-[5px] text-[11px] hover:bg-neutral-700 whitespace-nowrap"
                  onClick={handleSaveCurrent}
                >
                  Save
                </button>
              </div>
            </div>

            {/* BBOX info (derived from selection) */}
            {selection && (
              <>
                <div className="font-semibold text-cyan-400 text-xs">
                  Bounding box
                </div>
                <ul className="space-y-1 font-mono text-[11px]">
                  <li>
                    <b>N:</b> {selection.north.toFixed(4)}
                  </li>
                  <li>
                    <b>S:</b> {selection.south.toFixed(4)}
                  </li>
                  <li>
                    <b>W:</b> {selection.west.toFixed(4)}
                  </li>
                  <li>
                    <b>E:</b> {selection.east.toFixed(4)}
                  </li>
                </ul>
              </>
            )}

            {/* Vertices list */}
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-neutral-400">
                Vertices (lat, lon)
              </span>
              <textarea
                rows={4}
                className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-2 py-1 text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500 font-mono resize-none"
                placeholder={`lat, lon\nlat, lon\nlat, lon\nlat, lon`}
                value={verticesText}
                onChange={(e) => setVerticesText(e.target.value)}
              />
              <p className="text-[10px] text-neutral-500">
                Draw a rectangle to auto-fill these vertices, or paste your own
                list. If you enter a single coordinate, the buffer (km) is used
                to create a bounding box around it.
              </p>
            </div>

            {/* Time window */}
            <div className="space-y-1">
              <span className="text-[11px] uppercase tracking-wide text-neutral-400">
                Time window
              </span>
              <div className="grid grid-cols-2 gap-2">
                <MiniDatePicker
                  label="Start"
                  value={startDate}
                  onChange={handleStartDateChange}
                  isOpen={openPicker === "start"}
                  onToggle={() =>
                    setOpenPicker((prev) =>
                      prev === "start" ? null : "start"
                    )
                  }
                  align="left"
                />
                <MiniDatePicker
                  label="End"
                  value={endDate}
                  onChange={handleEndDateChange}
                  isOpen={openPicker === "end"}
                  onToggle={() =>
                    setOpenPicker((prev) =>
                      prev === "end" ? null : "end"
                    )
                  }
                  align="right"
                />
              </div>
            </div>

            {/* Buffer */}
            <div className="space-y-1">
              <label className="block text-[10px] text-neutral-500 mb-0.5">
                Buffer (km)
              </label>
              <input
                type="number"
                className="w-full rounded-md bg-neutral-950 border border-neutral-700 px-2 py-[3px] text-[11px] focus:outline-none focus:ring-1 focus:ring-cyan-500"
                value={bufferKm}
                onChange={(e) => setBufferKm(e.target.value)}
                min="0"
                step="0.1"
              />
            </div>

            {/* Buttons + status */}
            <div className="flex flex-col gap-2 pt-1">
              <div className="flex justify-end gap-2">
                <button
                  type="button"
                  className="rounded-md border border-neutral-600 px-2 py-1 text-[11px] hover:bg-neutral-800"
                  onClick={handleSelectClick}
                >
                  Select area
                </button>
                <button
                  type="button"
                  disabled={status === "running"}
                  className={`rounded-md px-2 py-1 text-[11px] font-semibold ${
                    status === "running"
                      ? "bg-neutral-700 cursor-not-allowed text-neutral-300"
                      : "bg-cyan-500 text-neutral-950 hover:bg-cyan-400"
                  }`}
                  onClick={handleRun}
                >
                  {status === "running" ? "Running…" : "Run"}
                </button>
              </div>

              <div className="text-[11px] min-h-[1.25rem]">
                {status === "running" && (
                  <span className="text-yellow-400 animate-pulse">
                    ⏳ Simulation running…
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
          </div>
        </div>
      </div>
    </>
  );
}
