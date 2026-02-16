"use client";

import { useEffect, useRef, useState } from "react";
import type { Selection, SavedQuery } from "../types";
import { BASE } from "../api";
import { bboxToVertices, verticesToBbox } from "../geo";
import { getBBox, setBBox, subscribe, loadInitialBBox } from "../map/mapStore";

const DEFAULT_BBOX: Selection = {
  north: -33.995,
  south: -34.01236,
  east: 147.98153,
  west: 147.96265,
};

function sameBbox(a: Selection | null, b: Selection | null, eps = 1e-8): boolean {
  if (!a || !b) return false;
  return (
    Math.abs(a.north - b.north) < eps &&
    Math.abs(a.south - b.south) < eps &&
    Math.abs(a.east - b.east) < eps &&
    Math.abs(a.west - b.west) < eps
  );
}

// Backend uses snake_case, frontend uses camelCase
function fromApi(raw: any): SavedQuery {
  return {
    name: raw.name,
    bbox: raw.bbox,
    verticesText: raw.vertices_text,
    startDate: raw.start_date,
    endDate: raw.end_date,
    stub: raw.stub ?? null,
  };
}

function toApi(q: SavedQuery) {
  return {
    name: q.name,
    bbox: q.bbox,
    vertices_text: q.verticesText,
    start_date: q.startDate,
    end_date: q.endDate,
    stub: q.stub,
  };
}

export function useQueryState() {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [verticesText, setVerticesText] = useState("");
  const [bufferKm, setBufferKm] = useState("1");
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState("2020-12-31");
  const [openPicker, setOpenPicker] = useState<"start" | "end" | null>(null);

  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [selectedQueryName, setSelectedQueryName] = useState<string | null>(null);
  const [queryName, setQueryName] = useState("");

  const programmaticVerticesRef = useRef(false);

  const markQueryDirty = () => {
    setSelectedQueryName(null);
    setQueryName("");
  };

  // Load saved queries from API on mount
  useEffect(() => {
    fetch(`${BASE}/queries`)
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setSavedQueries(data.map(fromApi));
      })
      .catch(() => {});
  }, []);

  // Init bbox from localStorage or default
  useEffect(() => {
    const initial = loadInitialBBox() || DEFAULT_BBOX;
    programmaticVerticesRef.current = true;
    setSelection(initial);
    setVerticesText(bboxToVertices(initial));
  }, []);

  // Subscribe to map-driven bbox changes
  useEffect(() => {
    const unsub = subscribe((bbox, source) => {
      if (source !== "map") return;
      programmaticVerticesRef.current = true;
      setSelection(bbox);
      setVerticesText(bboxToVertices(bbox));
      setOpenPicker(null);
      markQueryDirty();
    });
    return unsub;
  }, []);

  // Parse vertices text → selection
  useEffect(() => {
    if (!verticesText.trim()) return;
    if (programmaticVerticesRef.current) {
      programmaticVerticesRef.current = false;
      return;
    }
    const parsed = verticesToBbox(verticesText, bufferKm);
    if (!parsed) return;
    setSelection((prev) => (sameBbox(prev, parsed) ? prev : parsed));
    setSelectedQueryName(null);
  }, [verticesText, bufferKm]);

  // Push selection → mapStore
  useEffect(() => {
    if (!selection) return;
    const current = getBBox();
    if (current && sameBbox(current, selection)) return;
    setBBox(selection, "panel");
  }, [selection]);

  const handleStartDateChange = (value: string) => { setStartDate(value); setOpenPicker(null); markQueryDirty(); };
  const handleEndDateChange = (value: string) => { setEndDate(value); setOpenPicker(null); markQueryDirty(); };

  const handleSaveCurrent = async (stub?: string | null) => {
    const bbox = selection ?? verticesToBbox(verticesText, bufferKm);
    if (!bbox) { alert("Please provide at least one valid coordinate before saving."); return; }
    const name = queryName.trim() || stub;
    if (!name) { alert("Run a job first or enter a name."); return; }

    const query: SavedQuery = { name, bbox, verticesText, startDate, endDate, stub: stub ?? null };
    try {
      const res = await fetch(`${BASE}/queries`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(toApi(query)),
      });
      const data = await res.json();
      if (Array.isArray(data)) setSavedQueries(data.map(fromApi));
    } catch {}
    setSelectedQueryName(name);
    setQueryName(name);
  };

  const handleSelectSavedQuery = (name: string) => {
    const q = savedQueries.find((sq) => sq.name === name);
    if (!q) return;
    setSelectedQueryName(q.name);
    setQueryName(q.name);
    programmaticVerticesRef.current = true;
    setVerticesText(q.verticesText);
    setStartDate(q.startDate);
    setEndDate(q.endDate);
    setSelection(q.bbox);
    setOpenPicker(null);
  };

  const handleDeleteSavedQuery = async (name: string) => {
    try {
      const res = await fetch(`${BASE}/queries/${encodeURIComponent(name)}`, { method: "DELETE" });
      const data = await res.json();
      if (Array.isArray(data)) setSavedQueries(data.map(fromApi));
    } catch {}
    if (selectedQueryName === name) { setSelectedQueryName(null); setQueryName(""); }
  };

  const handleVerticesChange = (text: string) => { programmaticVerticesRef.current = false; setVerticesText(text); markQueryDirty(); };
  const handleBufferChange = (val: string) => { setBufferKm(val); markQueryDirty(); };

  return {
    selection, verticesText, handleVerticesChange, bufferKm, handleBufferChange,
    startDate, endDate, handleStartDateChange, handleEndDateChange,
    openPicker, setOpenPicker, savedQueries, selectedQueryName,
    queryName, setQueryName, setSelectedQueryName,
    handleSaveCurrent, handleSelectSavedQuery, handleDeleteSavedQuery,
  };
}
