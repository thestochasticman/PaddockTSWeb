// "use client";

// import { useEffect, useState } from "react";
// import { useRouter } from "next/navigation";

// import MiniDatePicker from "./MiniDatePicker";
// import { Selection } from "./Selection";
// import { SavedQuery } from "./SavedQuery";
// import {
//     BASE,
//     API,
//     STORAGE_KEY,
//     LATEST_JOB_STORAGE_KEY,
// } from "./API";
// import { BboxToVertices } from "./BboxToVertices";
// import { VerticesToBbox } from "./VerticesToBBox";
// import { VerticesStringToVertexList } from "./VerticesStringToVertexList";

// type Status = "idle" | "running" | "done" | "error";

// const DEFAULT_BBOX: Selection = {
//     north: -33.0,
//     south: -34.0,
//     east: 149.0,
//     west: 148.0,
// };

// const DEFAULT_VERTICES_TEXT = BboxToVertices(DEFAULT_BBOX);

// export function MapQueryPanel() {
//     const router = useRouter();
//     const [selection, setSelection] = useState<Selection | null>(DEFAULT_BBOX);
//     const [verticesText, setVerticesText] = useState(DEFAULT_VERTICES_TEXT);
//     const [bufferKm, setBufferKm] = useState("1");
//     const [startDate, setStartDate] = useState("2020-01-01");
//     const [endDate, setEndDate] = useState("2020-12-31");
//     const [openPicker, setOpenPicker] = useState<"start" | "end" | null>(null);
    
//     const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
//     const [selectedQueryName, setSelectedQueryName] = useState<string | null>(null);
//     const [loadedFromStorage, setLoadedFromStorage] = useState(false);
    
//     const [queryName, setQueryName] = useState<string>("");
    
//     const [status, setStatus] = useState<Status>("idle");
//     const [jobId, setJobId] = useState<string | null>(null);
//     const [error, setError] = useState<string | null>(null);
    
//     const markQueryDirty = () => {
//         setSelectedQueryName(null);
//         setQueryName("");
//     };
    
//     // --- Load saved queries ---
//     useEffect(() => {
//         if (typeof window === "undefined") return;
        
//         try {
//             const raw = window.localStorage.getItem(STORAGE_KEY);
//             if (!raw) {
//                 setLoadedFromStorage(true);
//                 return;
//             }
            
//             const parsed = JSON.parse(raw);
//             if (Array.isArray(parsed)) {
//                 setSavedQueries(parsed as SavedQuery[]);
//             } else {
//                 console.warn("[MapQueryPanel] STORAGE_KEY value is not an array:", parsed);
//             }
//         } catch (e) {
//             console.error("[MapQueryPanel] failed to parse saved queries:", e);
//         } finally {
//             setLoadedFromStorage(true);
//         }
//     }, []);
    
//     // --- Persist saved queries ---
//     useEffect(() => {
//         if (typeof window === "undefined") return;
//         if (!loadedFromStorage) return;
        
//         try {
//             window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedQueries));
//         } catch (e) {
//             console.error("[MapQueryPanel] failed to write saved queries:", e);
//         }
//     }, [savedQueries, loadedFromStorage]);
    
//     // Map → React (bbox-selected)
//     useEffect(() => {
//         function handleBboxSelected(event: Event) {
//             const e = event as CustomEvent<Selection>;
//             const bbox = e.detail;
//             setSelection(bbox);
//             setVerticesText(BboxToVertices(bbox));
//             setSelectedQueryName(null);
//             markQueryDirty();
//         }
        
//         window.addEventListener("bbox-selected", handleBboxSelected as EventListener);
//         return () => {
//             window.removeEventListener("bbox-selected", handleBboxSelected as EventListener);
//         };
//     }, []);
    
//     // Vertices / buffer → selection
//     useEffect(() => {
//         if (!verticesText.trim()) return;
//         const parsed = VerticesToBbox(verticesText, bufferKm);
//         if (!parsed) return;
//         setSelection(parsed);
//         setSelectedQueryName(null);
//     }, [verticesText, bufferKm]);
    
//     // selection → Map
//     useEffect(() => {
//         if (!selection) return;
//         const w = window as any;
//         if (typeof w.setBoundingBoxFromReact === "function") {
//             w.setBoundingBoxFromReact(
//                 selection.north,
//                 selection.south,
//                 selection.east,
//                 selection.west
//             );
//         }
//     }, [selection]);
    
//     // Poll job status
//     useEffect(() => {
//         if (status !== "running" || !jobId) return;
//         const interval = setInterval(async () => {
//             try {
//                 const res = await fetch(`${API}/results/${jobId}`);
//                 if (res.ok) {
//                     const data = await res.json();
//                     if (data.status === "done") {
//                         setStatus("done");
//                         if (typeof window !== "undefined") {
//                             window.localStorage.setItem(LATEST_JOB_STORAGE_KEY, jobId);
//                         }
//                         router.push(`/results/${jobId}`);
//                     }
//                 }
//             } catch {
//                 // ignore
//             }
//         }, 4000);
//         return () => clearInterval(interval);
//     }, [status, jobId, router]);
    
//     const handleSelectClick = () => {
//         const w = window as any;
//         if (w.enableRectangleSelection) {
//             w.enableRectangleSelection();
//         }
//     };
    
//     // --- Save current setup as a named query ---
// //     const handleSaveCurrent = () => {
// //         const bbox = selection ?? VerticesToBbox(verticesText, bufferKm);
// //         if (!bbox) {
// //             window.alert("Please provide at least one valid coordinate before saving.");
// //             return;
// //         }
        
// //         const trimmedName = queryName.trim();
// //         if (!trimmedName) {
// //             window.alert("Please enter a name for the query before saving.");
// //             return;
// //         }
        
// //         const finalName = trimmedName;
        
// //         if (selectedQueryName) {
// //             // Update existing (by previously selected name)
// //             setSavedQueries((prev) =>
// //                 prev.map((sq) =>
// //                     sq.name === selectedQueryName
// //             ? {
// //                 ...sq,
// //                 name: finalName,
// //                 bbox,
// //                 verticesText,
// //                 startDate,
// //                 endDate,
// //             }
// //             : sq
// //         )
// //     );
// // } else {
// //     // Create new
// //     const newQuery: SavedQuery = {
// //         name: finalName,
// //         bbox,
// //         verticesText,
// //         startDate,
// //         endDate,
// //     };
    
// //     setSavedQueries((prev) => [newQuery, ...prev]);
// // }

// // setSelectedQueryName(finalName);
// // setQueryName(finalName);
// // };

// const handleSaveCurrent = () => {
//   const bbox = selection ?? VerticesToBbox(verticesText, bufferKm);
//   if (!bbox) {
//     window.alert("Please provide at least one valid coordinate before saving.");
//     return;
//   }

//   const trimmedName = queryName.trim();
//   if (!trimmedName) {
//     window.alert("Please enter a name for the query before saving.");
//     return;
//   }

//   const finalName = trimmedName;

//   // Disallow duplicate names
//   const existing = savedQueries.find((sq) => sq.name === finalName);

//   if (!selectedQueryName) {
//     // Creating a NEW query – block if name already exists
//     if (existing) {
//       window.alert("A query with this name already exists. Please choose a different name.");
//       return;
//     }
//   } else {
//     // Updating an EXISTING query – block if renaming to another existing name
//     if (finalName !== selectedQueryName && existing) {
//       window.alert("Another query with this name already exists. Please choose a different name.");
//       return;
//     }
//   }

//   if (selectedQueryName) {
//     // Update existing (by previously selected name)
//     setSavedQueries((prev) =>
//       prev.map((sq) =>
//         sq.name === selectedQueryName
//           ? {
//               ...sq,
//               name: finalName,
//               bbox,
//               verticesText,
//               startDate,
//               endDate,
//             }
//           : sq
//       )
//     );
//   } else {
//     // Create new
//     const newQuery: SavedQuery = {
//       name: finalName,
//       bbox,
//       verticesText,
//       startDate,
//       endDate,
//     };

//     setSavedQueries((prev) => [newQuery, ...prev]);
//   }

//   setSelectedQueryName(finalName);
//   setQueryName(finalName);
// };

// // Select a saved query from the list (by name)
// const handleSelectSavedQuery = (name: string) => {
//     const q = savedQueries.find((sq) => sq.name === name);
//     if (!q) return;
    
//     setSelectedQueryName(q.name);
//     setQueryName(q.name);
//     setVerticesText(q.verticesText);
//     setStartDate(q.startDate);
//     setEndDate(q.endDate);
//     setSelection(q.bbox);
//     setOpenPicker(null);
// };

// // delete a saved query
// const handleDeleteSavedQuery = (name: string) => {
//     setSavedQueries((prev) => prev.filter((sq) => sq.name !== name));
//     if (selectedQueryName === name) {
//         setSelectedQueryName(null);
//         setQueryName("");
//     }
// };

// const handleStartDateChange = (value: string) => {
//     setStartDate(value);
//     setSelectedQueryName(null);
//     markQueryDirty();
// };

// const handleEndDateChange = (value: string) => {
//     setEndDate(value);
//     setSelectedQueryName(null);
//     markQueryDirty();
// };

// async function handleRun() {
//     if (!selection) {
//         window.alert("Please define a region first.");
//         return;
//     }
    
//     setStatus("running");
//     setError(null);
    
//     const vertexList = VerticesStringToVertexList(verticesText);
    
//     let bboxArray: [number, number, number, number] | null = null;
//     if (selection) {
//         bboxArray = [
//             selection.south,
//             selection.west,
//             selection.north,
//             selection.east,
//         ];
//     } else {
//         const bbox = VerticesToBbox(verticesText, bufferKm);
//         if (bbox) {
//             bboxArray = [bbox.south, bbox.west, bbox.north, bbox.east];
//         }
//     }
    
//     if (!bboxArray) {
//         window.alert("Could not infer a bounding box from the vertices.");
//         return;
//     }
    
//     try {
//         const body = {
//             vertices: vertexList,
//             bbox: bboxArray,
//             buffer_km: Number(bufferKm),
//             start_date: startDate,
//             end_date: endDate,
//         };
        
//         const res = await fetch(`${BASE}/run`, {
//             method: "POST",
//             headers: { "Content-Type": "application/json" },
//             body: JSON.stringify(body),
//         });
        
//         if (!res.ok) throw new Error(await res.text());
//         const json = await res.json();
//         const newJobId = json.job_id ?? json.jobId;
        
//         if (!newJobId) {
//             throw new Error("Backend did not return a job id");
//         }
        
//         setJobId(newJobId);
//         setStatus("running");
        
//         if (typeof window !== "undefined") {
//             window.localStorage.setItem(LATEST_JOB_STORAGE_KEY, newJobId);
//         }
//     } catch (err: any) {
//         console.error(err);
//         setError(err.message || "Run failed");
//         setStatus("error");
//     }
// }

// return (
//     <div className="map-panel-root">
    
//     {/* Bounding box
//     <div className="space-y-1">
//     <div className="map-field-label">Bounding box
//     <button
//             type="button"
//             className="map-select-area-button"
//             onClick={handleSelectClick}
//           >
//             Select area
//           </button>
//     </div>
//     {selection ? (
//         <ul className="map-bbox-list">
//         <li className="map-bbox-row">
//         <span className="map-bbox-label">N</span>
//         <span>{selection.north.toFixed(4)}</span>
//         </li>
//         <li className="map-bbox-row">
//         <span className="map-bbox-label">S</span>
//         <span>{selection.south.toFixed(4)}</span>
//         </li>
//         <li className="map-bbox-row">
//         <span className="map-bbox-label">W</span>
//         <span>{selection.west.toFixed(4)}</span>
//         </li>
//         <li className="map-bbox-row">
//         <span className="map-bbox-label">E</span>
//         <span>{selection.east.toFixed(4)}</span>
//         </li>
//         </ul>
//     ) : (
//         <p className="map-bbox-empty">
//         Draw a rectangle or provide vertices to define a region.
//         </p>
//     )}
//     </div> */}

//           {/* Bounding box
//       <div className="space-y-1">
//         <div className="flex items-center justify-between">
//           <div className="map-field-label">Bounding box</div>
//           <button
//             type="button"
//             className="map-select-area-button"
//             onClick={handleSelectClick}
//           >
//             Select area
//           </button>
//         </div>
//         {selection ? (
//           <ul className="map-bbox-list">
//             <li className="map-bbox-row">
//               <span className="map-bbox-label">N</span>
//               <span>{selection.north.toFixed(4)}</span>
//             </li>
//             <li className="map-bbox-row">
//               <span className="map-bbox-label">S</span>
//               <span>{selection.south.toFixed(4)}</span>
//             </li>
//             <li className="map-bbox-row">
//               <span className="map-bbox-label">W</span>
//               <span>{selection.west.toFixed(4)}</span>
//             </li>
//             <li className="map-bbox-row">
//               <span className="map-bbox-label">E</span>
//               <span>{selection.east.toFixed(4)}</span>
//             </li>
//           </ul>
//         ) : (
//           <p className="map-bbox-empty">
//             Draw a rectangle or provide vertices to define a region.
//           </p>
//         )}
//       </div> */}
    
//     {/* Vertices */}
//     <div className="space-y-1">
//     <span className="map-field-label">Coordinates (lat, lon)</span>
//     <textarea
//     rows={6}
//     className="map-vertices-textarea"
//     placeholder={`lat, lon\nlat, lon\nlat, lon\nlat, lon`}
//     value={verticesText}
//     onChange={(e) => {
//         setVerticesText(e.target.value);
//         setSelectedQueryName(null);
//         markQueryDirty();
//     }}
//     />
//     <p className="map-vertices-help">
//     Draw a rectangle to auto-fill these vertices, or paste your own list.
//     If you enter a single coordinate, the buffer (km) is used to create a
//     bounding box around it.
//     </p>
//     </div>

//     {/* Buffer */}
//     <div className="space-y-1">
//     <label className="map-field-label">Buffer (km)</label>
//     <input
//     type="number"
//     className="map-field-input"
//     value={bufferKm}
//     onChange={(e) => {
//         setBufferKm(e.target.value);
//         setSelectedQueryName(null);
//     }}
//     min="0"
//     step="0.1"
//     />
//     </div>
    
//     {/* Time window */}
//     <div className="space-y-2">
//     {/* <span className="map-field-label">Time window</span> */}
    
//     <div className="map-time-window-grid">

//     <MiniDatePicker
//     label="Start"
//     value={startDate}
//     onChange={handleStartDateChange}
//     isOpen={openPicker === "start"}
//     onToggle={() =>
//         setOpenPicker((prev) => (prev === "start" ? null : "start"))
//     }
//     align="left"
//     />
//     <MiniDatePicker
//     label="End"
//     value={endDate}
//     onChange={handleEndDateChange}
//     isOpen={openPicker === "end"}
//     onToggle={() =>
//         setOpenPicker((prev) => (prev === "end" ? null : "end"))
//     }
//     align="right"
//     />
//              <button
//             type="button"
//             className="map-select-area-button"
//             onClick={handleSelectClick}
//           >
//             Select area
//           </button>
    
//     </div>

//     </div>
    
    


//     {/* Query name + Save button */}
//     <div className="space-y-2">
//     <label className="map-field-label">Query Name(Optional)</label>
//     <div className="map-query-name-row">
//     <input
//     type="text"
//     className="map-query-name-input"
//     placeholder="Enter Query Name"
//     value={queryName}
//     onChange={(e) => {
//         setQueryName(e.target.value);
//         if (selectedQueryName) {
//             setSelectedQueryName(null);
//         }
//     }}
//     />
    
    
//     <button
//     type="button"
//     className="map-query-save-button"
//     onClick={handleSaveCurrent}
//     >
//     Save
//     </button>

//      <button
//     type="button"
//     disabled={status === "running"}
//     className={[
//         "map-run-button",
//         status === "running"
//         ? "map-run-button--running"
//         : "map-run-button--idle",
//     ].join(" ")}
//     onClick={handleRun}
//     >
//     {status === "running" ? "Running…" : "Run"}
//     </button>
    
//     </div>
//     </div>

    
//     {/* Saved queries – directly below buttons */}
//     <div className="map-saved-queries-section">
//     <div className="map-saved-queries-header">
//     <span className="map-field-label">Saved queries</span>
//     <span className="map-saved-queries-count">
//     {savedQueries.length} total
//     </span>
//     </div>
//     <div className="map-saved-queries-container">
//     {savedQueries.length === 0 ? (
//         <div className="map-saved-queries-empty">
//         No saved queries yet. Configure a region and dates, give it a name,
//         then press Save.
//         </div>
//     ) : (
//         <ul className="map-saved-queries-list">
//         {savedQueries.map((q) => (
//             <li key={q.name} className="map-saved-query-row">
//             <button
//             type="button"
//             className={[
//                 "map-saved-query-button",
//                 q.name === selectedQueryName
//                 ? "map-saved-query-button--selected"
//                 : "",
//             ].join(" ")}
//             onClick={() => handleSelectSavedQuery(q.name)}
//             >
//             <div className="map-saved-query-name">{q.name}</div>
//             </button>
//             <button
//             type="button"
//             className="map-saved-query-delete"
//             onClick={(e) => {
//                 e.stopPropagation();
//                 handleDeleteSavedQuery(q.name);
//             }}
//             aria-label="Delete saved query"
//             title="Delete"
//             >
//             ×
//             </button>
//             </li>
//         ))}
//         </ul>
//     )}
//     </div>
//     </div>
//     </div>
// );
// }

// "use client";

// import { useEffect, useRef, useState } from "react";
// import { useRouter } from "next/navigation";

// import MiniDatePicker from "./MiniDatePicker";
// import type { Selection } from "./Selection";
// import type { SavedQuery } from "./SavedQuery";
// import {
//     BASE,
//     STORAGE_KEY,
//     LATEST_JOB_STORAGE_KEY,
// } from "./API";
// import { BboxToVertices } from "./BboxToVertices";
// import { VerticesToBbox } from "./VerticesToBBox";
// import { VerticesStringToVertexList } from "./VerticesStringToVertexList";

// type Status = "idle" | "submitting" | "running" | "error";

// const DEFAULT_BBOX: Selection = {
//     north: -33.0,
//     south: -34.0,
//     east: 149.0,
//     west: 148.0,
// };

// const DEFAULT_VERTICES_TEXT = BboxToVertices(DEFAULT_BBOX);

// function sameBbox(a: Selection | null, b: Selection | null, eps = 1e-12): boolean {
//     if (!a || !b) return false;
//     return (
//         Math.abs(a.north - b.north) < eps &&
//         Math.abs(a.south - b.south) < eps &&
//         Math.abs(a.east - b.east) < eps &&
//         Math.abs(a.west - b.west) < eps
//     );
// }

// export function MapQueryPanel() {
//     const router = useRouter();
//     const abortRef = useRef<AbortController | null>(null);

//     const [selection, setSelection] = useState<Selection | null>(DEFAULT_BBOX);
//     const [verticesText, setVerticesText] = useState(DEFAULT_VERTICES_TEXT);
//     const [bufferKm, setBufferKm] = useState("1");
//     const [startDate, setStartDate] = useState("2020-01-01");
//     const [endDate, setEndDate] = useState("2020-12-31");
//     const [openPicker, setOpenPicker] = useState<"start" | "end" | null>(null);

//     const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
//     const [selectedQueryName, setSelectedQueryName] = useState<string | null>(null);
//     const [loadedFromStorage, setLoadedFromStorage] = useState(false);

//     const [queryName, setQueryName] = useState<string>("");

//     const [status, setStatus] = useState<Status>("idle");
//     const [error, setError] = useState<string | null>(null);

//     const markQueryDirty = () => {
//         setSelectedQueryName(null);
//         setQueryName("");
//     };

//     // --- Load saved queries ---
//     useEffect(() => {
//         if (typeof window === "undefined") return;

//         try {
//             const raw = window.localStorage.getItem(STORAGE_KEY);
//             if (!raw) {
//                 setLoadedFromStorage(true);
//                 return;
//             }

//             const parsed = JSON.parse(raw);
//             if (Array.isArray(parsed)) {
//                 setSavedQueries(parsed as SavedQuery[]);
//             } else {
//                 console.warn("[MapQueryPanel] STORAGE_KEY value is not an array:", parsed);
//             }
//         } catch (e) {
//             console.error("[MapQueryPanel] failed to parse saved queries:", e);
//         } finally {
//             setLoadedFromStorage(true);
//         }
//     }, []);

//     // --- Persist saved queries ---
//     useEffect(() => {
//         if (typeof window === "undefined") return;
//         if (!loadedFromStorage) return;

//         try {
//             window.localStorage.setItem(STORAGE_KEY, JSON.stringify(savedQueries));
//         } catch (e) {
//             console.error("[MapQueryPanel] failed to write saved queries:", e);
//         }
//     }, [savedQueries, loadedFromStorage]);

//     // Map → React (bbox-selected)
//     useEffect(() => {
//         function handleBboxSelected(event: Event) {
//             const e = event as CustomEvent<Selection>;
//             const bbox = e.detail;

//             setSelection(bbox);
//             setVerticesText(BboxToVertices(bbox));
//             setOpenPicker(null);
//             markQueryDirty();
//         }

//         window.addEventListener("bbox-selected", handleBboxSelected as EventListener);
//         return () => {
//             window.removeEventListener("bbox-selected", handleBboxSelected as EventListener);
//         };
//     }, []);

//     // Vertices / buffer → selection (do NOT clear selectedQueryName here; only clear on user input handlers)
//     useEffect(() => {
//         if (!verticesText.trim()) return;

//         const parsed = VerticesToBbox(verticesText, bufferKm);
//         if (!parsed) return;

//         setSelection((prev) => (sameBbox(prev, parsed) ? prev : parsed));
//     }, [verticesText, bufferKm]);

//     // selection → Map
//     useEffect(() => {
//         if (!selection) return;
//         const w = window as any;
//         if (typeof w.setBoundingBoxFromReact === "function") {
//             w.setBoundingBoxFromReact(
//                 selection.north,
//                 selection.south,
//                 selection.east,
//                 selection.west
//             );
//         }
//     }, [selection]);

//     // Abort in-flight run on unmount
//     useEffect(() => {
//         return () => {
//             if (abortRef.current) abortRef.current.abort();
//             abortRef.current = null;
//         };
//     }, []);

//     const handleSelectClick = () => {
//         const w = window as any;
//         if (typeof w.enableRectangleSelection === "function") {
//             w.enableRectangleSelection();
//         }
//     };

//     const handleSaveCurrent = () => {
//         const bbox = selection ?? VerticesToBbox(verticesText, bufferKm);
//         if (!bbox) {
//             window.alert("Please provide at least one valid coordinate before saving.");
//             return;
//         }

//         const trimmedName = queryName.trim();
//         if (!trimmedName) {
//             window.alert("Please enter a name for the query before saving.");
//             return;
//         }

//         const finalName = trimmedName;

//         // Disallow duplicate names
//         const existing = savedQueries.find((sq) => sq.name === finalName);

//         if (!selectedQueryName) {
//             // Creating a NEW query – block if name already exists
//             if (existing) {
//                 window.alert("A query with this name already exists. Please choose a different name.");
//                 return;
//             }
//         } else {
//             // Updating an EXISTING query – block if renaming to another existing name
//             if (finalName !== selectedQueryName && existing) {
//                 window.alert("Another query with this name already exists. Please choose a different name.");
//                 return;
//             }
//         }

//         if (selectedQueryName) {
//             // Update existing (by previously selected name)
//             setSavedQueries((prev) =>
//                 prev.map((sq) =>
//                     sq.name === selectedQueryName
//                         ? {
//                               ...sq,
//                               name: finalName,
//                               bbox,
//                               verticesText,
//                               startDate,
//                               endDate,
//                           }
//                         : sq
//                 )
//             );
//         } else {
//             // Create new
//             const newQuery: SavedQuery = {
//                 name: finalName,
//                 bbox,
//                 verticesText,
//                 startDate,
//                 endDate,
//             };
//             setSavedQueries((prev) => [newQuery, ...prev]);
//         }

//         setSelectedQueryName(finalName);
//         setQueryName(finalName);
//     };

//     // Select a saved query from the list (by name)
//     const handleSelectSavedQuery = (name: string) => {
//         const q = savedQueries.find((sq) => sq.name === name);
//         if (!q) return;

//         setSelectedQueryName(q.name);
//         setQueryName(q.name);

//         setVerticesText(q.verticesText);
//         setStartDate(q.startDate);
//         setEndDate(q.endDate);
//         setSelection(q.bbox);

//         setOpenPicker(null);
//     };

//     // Delete a saved query
//     const handleDeleteSavedQuery = (name: string) => {
//         setSavedQueries((prev) => prev.filter((sq) => sq.name !== name));
//         if (selectedQueryName === name) {
//             setSelectedQueryName(null);
//             setQueryName("");
//         }
//     };

//     const handleStartDateChange = (value: string) => {
//         setStartDate(value);
//         setOpenPicker(null);
//         markQueryDirty();
//     };

//     const handleEndDateChange = (value: string) => {
//         setEndDate(value);
//         setOpenPicker(null);
//         markQueryDirty();
//     };

//     async function handleRun() {
//         if (!selection) {
//             window.alert("Please define a region first.");
//             return;
//         }

//         if (status === "submitting") return;

//         setStatus("submitting");
//         setError(null);

//         const vertexList = VerticesStringToVertexList(verticesText);

//         const bboxArray: [number, number, number, number] = [
//             selection.south,
//             selection.west,
//             selection.north,
//             selection.east,
//         ];

//         const body = {
//             vertices: vertexList,
//             bbox: bboxArray,
//             buffer_km: Number(bufferKm),
//             start_date: startDate,
//             end_date: endDate,
//         };

//         const ac = new AbortController();
//         abortRef.current = ac;

//         try {
//             const res = await fetch(`${BASE}/run`, {
//                 method: "POST",
//                 headers: { "Content-Type": "application/json" },
//                 body: JSON.stringify(body),
//                 signal: ac.signal,
//             });

//             if (!res.ok) throw new Error(await res.text());

//             const json = await res.json();
//             const newJobId = json.job_id ?? json.jobId;

//             if (!newJobId) {
//                 throw new Error("Backend did not return a job id");
//             }

//             if (typeof window !== "undefined") {
//                 window.localStorage.setItem(LATEST_JOB_STORAGE_KEY, newJobId);
//             }

//             setStatus("running");
//             router.push(`/results/${newJobId}`);
//         } catch (err: any) {
//             if (err?.name === "AbortError") return;
//             console.error(err);
//             setError(err?.message || "Run failed");
//             setStatus("error");
//         } finally {
//             abortRef.current = null;
//         }
//     }

//     return (
//         <div className="map-panel-root">
//             {/* Vertices */}
//             <div className="space-y-1">
//                 <span className="map-field-label">Coordinates (lat, lon)</span>
//                 <textarea
//                     rows={6}
//                     className="map-vertices-textarea"
//                     placeholder={`lat, lon\nlat, lon\nlat, lon\nlat, lon`}
//                     value={verticesText}
//                     onChange={(e) => {
//                         setVerticesText(e.target.value);
//                         markQueryDirty();
//                     }}
//                 />
//                 <p className="map-vertices-help">
//                     Draw a rectangle to auto-fill these vertices, or paste your own list. If you enter
//                     a single coordinate, the buffer (km) is used to create a bounding box around it.
//                 </p>
//             </div>

//             {/* Buffer */}
//             <div className="space-y-1">
//                 <label className="map-field-label">Buffer (km)</label>
//                 <input
//                     type="number"
//                     className="map-field-input"
//                     value={bufferKm}
//                     onChange={(e) => {
//                         setBufferKm(e.target.value);
//                         markQueryDirty();
//                     }}
//                     min="0"
//                     step="0.1"
//                 />
//             </div>

//             {/* Time window */}
//             <div className="space-y-2">
//                 <div className="map-time-window-grid">
//                     <MiniDatePicker
//                         label="Start"
//                         value={startDate}
//                         onChange={handleStartDateChange}
//                         isOpen={openPicker === "start"}
//                         onToggle={() => setOpenPicker((prev) => (prev === "start" ? null : "start"))}
//                         align="left"
//                     />
//                     <MiniDatePicker
//                         label="End"
//                         value={endDate}
//                         onChange={handleEndDateChange}
//                         isOpen={openPicker === "end"}
//                         onToggle={() => setOpenPicker((prev) => (prev === "end" ? null : "end"))}
//                         align="right"
//                     />
//                     <button
//                         type="button"
//                         className="map-select-area-button"
//                         onClick={handleSelectClick}
//                         disabled={status === "submitting"}
//                     >
//                         Select area
//                     </button>
//                 </div>
//             </div>

//             {/* Query name + Save + Run */}
//             <div className="space-y-2">
//                 <label className="map-field-label">Query Name(Optional)</label>
//                 <div className="map-query-name-row">
//                     <input
//                         type="text"
//                         className="map-query-name-input"
//                         placeholder="Enter Query Name"
//                         value={queryName}
//                         onChange={(e) => {
//                             setQueryName(e.target.value);
//                             if (selectedQueryName) setSelectedQueryName(null);
//                         }}
//                     />

//                     <button
//                         type="button"
//                         className="map-query-save-button"
//                         onClick={handleSaveCurrent}
//                         disabled={status === "submitting"}
//                     >
//                         Save
//                     </button>

//                     <button
//                         type="button"
//                         disabled={status === "submitting"}
//                         className={[
//                             "map-run-button",
//                             status === "submitting" ? "map-run-button--running" : "map-run-button--idle",
//                         ].join(" ")}
//                         onClick={handleRun}
//                     >
//                         {status === "submitting" ? "Running…" : "Run"}
//                     </button>
//                 </div>

//                 {error ? <div className="map-error-text">{error}</div> : null}
//             </div>

//             {/* Saved queries */}
//             <div className="map-saved-queries-section">
//                 <div className="map-saved-queries-header">
//                     <span className="map-field-label">Saved queries</span>
//                     <span className="map-saved-queries-count">{savedQueries.length} total</span>
//                 </div>

//                 <div className="map-saved-queries-container">
//                     {savedQueries.length === 0 ? (
//                         <div className="map-saved-queries-empty">
//                             No saved queries yet. Configure a region and dates, give it a name, then press Save.
//                         </div>
//                     ) : (
//                         <ul className="map-saved-queries-list">
//                             {savedQueries.map((q) => (
//                                 <li key={q.name} className="map-saved-query-row">
//                                     <button
//                                         type="button"
//                                         className={[
//                                             "map-saved-query-button",
//                                             q.name === selectedQueryName ? "map-saved-query-button--selected" : "",
//                                         ].join(" ")}
//                                         onClick={() => handleSelectSavedQuery(q.name)}
//                                         disabled={status === "submitting"}
//                                     >
//                                         <div className="map-saved-query-name">{q.name}</div>
//                                     </button>

//                                     <button
//                                         type="button"
//                                         className="map-saved-query-delete"
//                                         onClick={(e) => {
//                                             e.stopPropagation();
//                                             handleDeleteSavedQuery(q.name);
//                                         }}
//                                         aria-label="Delete saved query"
//                                         title="Delete"
//                                         disabled={status === "submitting"}
//                                     >
//                                         ×
//                                     </button>
//                                 </li>
//                             ))}
//                         </ul>
//                     )}
//                 </div>
//             </div>
//         </div>
//     );
// }


"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import MiniDatePicker from "./MiniDatePicker";
import type { Selection } from "./Selection";
import type { SavedQuery } from "./SavedQuery";
import { BASE, STORAGE_KEY, LATEST_JOB_STORAGE_KEY } from "./API";
import { BboxToVertices } from "./BboxToVertices";
import { VerticesToBbox } from "./VerticesToBBox";
import { VerticesStringToVertexList } from "./VerticesStringToVertexList";

type Status = "idle" | "submitting" | "running" | "error";

const DEFAULT_BBOX: Selection = {
    north: -33.0,
    south: -34.0,
    east: 149.0,
    west: 148.0,
};

const DEFAULT_VERTICES_TEXT = BboxToVertices(DEFAULT_BBOX);

// MUST match gmap_init.js if you persist bbox there
const MAP_BBOX_LS_KEY = "PaddockTS:last_bbox";

function sameBbox(a: Selection | null, b: Selection | null, eps = 1e-8): boolean {
    if (!a || !b) return false;
    return (
        Math.abs(a.north - b.north) < eps &&
        Math.abs(a.south - b.south) < eps &&
        Math.abs(a.east - b.east) < eps &&
        Math.abs(a.west - b.west) < eps
    );
}

function readBboxFromLocalStorage(): Selection | null {
    try {
        const raw = window.localStorage.getItem(MAP_BBOX_LS_KEY);
        if (!raw) return null;
        const parsed = JSON.parse(raw);
        if (!parsed) return null;

        const n = Number(parsed.north);
        const s = Number(parsed.south);
        const e = Number(parsed.east);
        const w = Number(parsed.west);

        if (![n, s, e, w].every(Number.isFinite)) return null;

        return {
            north: Math.max(n, s),
            south: Math.min(n, s),
            east: Math.max(e, w),
            west: Math.min(e, w),
        };
    } catch {
        return null;
    }
}

function readBboxFromMap(): Selection | null {
    const w = window as any;
    const getter = w.getBoundingBox;
    if (typeof getter !== "function") return null;

    try {
        const b = getter();
        if (!b) return null;

        const n = Number(b.north);
        const s = Number(b.south);
        const e = Number(b.east);
        const ww = Number(b.west);

        if (![n, s, e, ww].every(Number.isFinite)) return null;

        return {
            north: Math.max(n, s),
            south: Math.min(n, s),
            east: Math.max(e, ww),
            west: Math.min(e, ww),
        };
    } catch {
        return null;
    }
}

export function MapQueryPanel() {
    const router = useRouter();
    const abortRef = useRef<AbortController | null>(null);

    // Key behaviour change:
    // Start "unset" and hydrate from map/localStorage on mount.
    const [selection, setSelection] = useState<Selection | null>(null);
    const [verticesText, setVerticesText] = useState<string>("");

    const [bufferKm, setBufferKm] = useState("1");
    const [startDate, setStartDate] = useState("2020-01-01");
    const [endDate, setEndDate] = useState("2020-12-31");
    const [openPicker, setOpenPicker] = useState<"start" | "end" | null>(null);

    const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
    const [selectedQueryName, setSelectedQueryName] = useState<string | null>(null);
    const [loadedFromStorage, setLoadedFromStorage] = useState(false);

    const [queryName, setQueryName] = useState<string>("");

    const [status, setStatus] = useState<Status>("idle");
    const [error, setError] = useState<string | null>(null);

    // Prevent React->Map updates during initial hydration
    const hydratedRef = useRef(false);

    // Prevent bbox-selected from echoing back into React when *we* set bbox
    const ignoreNextBboxEventRef = useRef(false);

    // Prevent vertices->selection parsing when verticesText was set programmatically
    const programmaticVerticesSetRef = useRef(false);

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

    // --- Hydrate selection from Map (or localStorage) on mount ---
    useEffect(() => {
        if (typeof window === "undefined") return;

        // Prefer live map state if available; fallback to persisted bbox; fallback to default.
        const fromMap = readBboxFromMap();
        const fromLs = fromMap ? null : readBboxFromLocalStorage();
        const initial = fromMap || fromLs || DEFAULT_BBOX;

        programmaticVerticesSetRef.current = true;
        setSelection(initial);
        setVerticesText(BboxToVertices(initial));

        hydratedRef.current = true;
    }, []);

    // Map → React (bbox-selected)
    useEffect(() => {
        function handleBboxSelected(event: Event) {
            if (ignoreNextBboxEventRef.current) {
                ignoreNextBboxEventRef.current = false;
                return;
            }

            const e = event as CustomEvent<Selection>;
            const bbox = e.detail;

            programmaticVerticesSetRef.current = true;
            setSelection(bbox);
            setVerticesText(BboxToVertices(bbox));
            setOpenPicker(null);
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

        // If we just set verticesText from map/saved-query, do not re-parse and re-emit selection.
        if (programmaticVerticesSetRef.current) {
            programmaticVerticesSetRef.current = false;
            return;
        }

        const parsed = VerticesToBbox(verticesText, bufferKm);
        if (!parsed) return;

        setSelection((prev) => (sameBbox(prev, parsed) ? prev : parsed));
        setSelectedQueryName(null);
    }, [verticesText, bufferKm]);

    // selection → Map
    useEffect(() => {
        if (!hydratedRef.current) return;
        if (!selection) return;

        const w = window as any;

        // If map already has this bbox, do nothing (prevents jump on Results → Search).
        const mapBbox = readBboxFromMap();
        if (mapBbox && sameBbox(mapBbox, selection)) return;

        if (typeof w.setBoundingBoxFromReact === "function") {
            ignoreNextBboxEventRef.current = true;
            w.setBoundingBoxFromReact(
                selection.north,
                selection.south,
                selection.east,
                selection.west
            );
        }
    }, [selection]);

    // Abort in-flight run on unmount
    useEffect(() => {
        return () => {
            if (abortRef.current) abortRef.current.abort();
            abortRef.current = null;
        };
    }, []);

    const handleSelectClick = () => {
        const w = window as any;
        if (typeof w.enableRectangleSelection === "function") {
            w.enableRectangleSelection();
        }
    };

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

        // Disallow duplicate names
        const existing = savedQueries.find((sq) => sq.name === finalName);

        if (!selectedQueryName) {
            if (existing) {
                window.alert("A query with this name already exists. Please choose a different name.");
                return;
            }
        } else {
            if (finalName !== selectedQueryName && existing) {
                window.alert("Another query with this name already exists. Please choose a different name.");
                return;
            }
        }

        if (selectedQueryName) {
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

    const handleSelectSavedQuery = (name: string) => {
        const q = savedQueries.find((sq) => sq.name === name);
        if (!q) return;

        setSelectedQueryName(q.name);
        setQueryName(q.name);

        programmaticVerticesSetRef.current = true;
        setVerticesText(q.verticesText);

        setStartDate(q.startDate);
        setEndDate(q.endDate);

        setSelection(q.bbox);
        setOpenPicker(null);
    };

    const handleDeleteSavedQuery = (name: string) => {
        setSavedQueries((prev) => prev.filter((sq) => sq.name !== name));
        if (selectedQueryName === name) {
            setSelectedQueryName(null);
            setQueryName("");
        }
    };

    const handleStartDateChange = (value: string) => {
        setStartDate(value);
        setOpenPicker(null);
        markQueryDirty();
    };

    const handleEndDateChange = (value: string) => {
        setEndDate(value);
        setOpenPicker(null);
        markQueryDirty();
    };

    async function handleRun() {
        if (!selection) {
            window.alert("Please define a region first.");
            return;
        }

        if (status === "submitting") return;

        setStatus("submitting");
        setError(null);

        const vertexList = VerticesStringToVertexList(verticesText);

        const bboxArray: [number, number, number, number] = [
            selection.south,
            selection.west,
            selection.north,
            selection.east,
        ];

        const body = {
            vertices: vertexList,
            bbox: bboxArray,
            buffer_km: Number(bufferKm),
            start_date: startDate,
            end_date: endDate,
        };

        const ac = new AbortController();
        abortRef.current = ac;

        try {
            const res = await fetch(`${BASE}/run`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(body),
                signal: ac.signal,
            });

            if (!res.ok) throw new Error(await res.text());

            const json = await res.json();
            const newJobId = json.job_id ?? json.jobId;

            if (!newJobId) throw new Error("Backend did not return a job id");

            window.localStorage.setItem(LATEST_JOB_STORAGE_KEY, newJobId);

            setStatus("running");
            router.push(`/results/${newJobId}`);
        } catch (err: any) {
            if (err?.name === "AbortError") return;
            console.error(err);
            setError(err?.message || "Run failed");
            setStatus("error");
        } finally {
            abortRef.current = null;
        }
    }

    return (
        <div className="map-panel-root">
            {/* Vertices */}
            <div className="space-y-1">
                <span className="map-field-label">Coordinates (lat, lon)</span>
                <textarea
                    rows={6}
                    className="map-vertices-textarea"
                    placeholder={`lat, lon\nlat, lon\nlat, lon\nlat, lon`}
                    value={verticesText}
                    onChange={(e) => {
                        programmaticVerticesSetRef.current = false;
                        setVerticesText(e.target.value);
                        markQueryDirty();
                    }}
                />
                <p className="map-vertices-help">
                    Draw a rectangle to auto-fill these vertices, or paste your own list. If you enter
                    a single coordinate, the buffer (km) is used to create a bounding box around it.
                </p>
            </div>

            {/* Buffer */}
            <div className="space-y-1">
                <label className="map-field-label">Buffer (km)</label>
                <input
                    type="number"
                    className="map-field-input"
                    value={bufferKm}
                    onChange={(e) => {
                        setBufferKm(e.target.value);
                        markQueryDirty();
                    }}
                    min="0"
                    step="0.1"
                />
            </div>

            {/* Time window */}
            <div className="space-y-2">
                <div className="map-time-window-grid">
                    <MiniDatePicker
                        label="Start"
                        value={startDate}
                        onChange={handleStartDateChange}
                        isOpen={openPicker === "start"}
                        onToggle={() => setOpenPicker((prev) => (prev === "start" ? null : "start"))}
                        align="left"
                    />
                    <MiniDatePicker
                        label="End"
                        value={endDate}
                        onChange={handleEndDateChange}
                        isOpen={openPicker === "end"}
                        onToggle={() => setOpenPicker((prev) => (prev === "end" ? null : "end"))}
                        align="right"
                    />
                    <button
                        type="button"
                        className="map-select-area-button"
                        onClick={handleSelectClick}
                        disabled={status === "submitting"}
                    >
                        Select area
                    </button>
                </div>
            </div>

            {/* Query name + Save + Run */}
            <div className="space-y-2">
                <label className="map-field-label">Query Name(Optional)</label>
                <div className="map-query-name-row">
                    <input
                        type="text"
                        className="map-query-name-input"
                        placeholder="Enter Query Name"
                        value={queryName}
                        onChange={(e) => {
                            setQueryName(e.target.value);
                            if (selectedQueryName) setSelectedQueryName(null);
                        }}
                    />

                    <button
                        type="button"
                        className="map-query-save-button"
                        onClick={handleSaveCurrent}
                        disabled={status === "submitting"}
                    >
                        Save
                    </button>

                    <button
                        type="button"
                        disabled={status === "submitting"}
                        className={[
                            "map-run-button",
                            status === "submitting"
                                ? "map-run-button--running"
                                : "map-run-button--idle",
                        ].join(" ")}
                        onClick={handleRun}
                    >
                        {status === "submitting" ? "Running…" : "Run"}
                    </button>
                </div>

                {error ? <div className="map-error-text">{error}</div> : null}
            </div>

            {/* Saved queries */}
            <div className="map-saved-queries-section">
                <div className="map-saved-queries-header">
                    <span className="map-field-label">Saved queries</span>
                    <span className="map-saved-queries-count">{savedQueries.length} total</span>
                </div>

                <div className="map-saved-queries-container">
                    {savedQueries.length === 0 ? (
                        <div className="map-saved-queries-empty">
                            No saved queries yet. Configure a region and dates, give it a name, then press Save.
                        </div>
                    ) : (
                        <ul className="map-saved-queries-list">
                            {savedQueries.map((q) => (
                                <li key={q.name} className="map-saved-query-row">
                                    <button
                                        type="button"
                                        className={[
                                            "map-saved-query-button",
                                            q.name === selectedQueryName ? "map-saved-query-button--selected" : "",
                                        ].join(" ")}
                                        onClick={() => handleSelectSavedQuery(q.name)}
                                        disabled={status === "submitting"}
                                    >
                                        <div className="map-saved-query-name">{q.name}</div>
                                    </button>

                                    <button
                                        type="button"
                                        className="map-saved-query-delete"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            handleDeleteSavedQuery(q.name);
                                        }}
                                        aria-label="Delete saved query"
                                        title="Delete"
                                        disabled={status === "submitting"}
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
