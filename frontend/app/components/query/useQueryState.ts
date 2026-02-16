"use client";

import { useEffect, useRef, useState } from "react";
import type { Selection, SavedQuery } from "../types";
import { STORAGE_KEY } from "../api";
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

export function useQueryState() {
  const [selection, setSelection] = useState<Selection | null>(null);
  const [verticesText, setVerticesText] = useState("");
  const [bufferKm, setBufferKm] = useState("1");
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState("2020-12-31");
  const [openPicker, setOpenPicker] = useState<"start" | "end" | null>(null);

  const [savedQueries, setSavedQueries] = useState<SavedQuery[]>([]);
  const [selectedQueryName, setSelectedQueryName] = useState<string | null>(null);
  const [loadedFromStorage, setLoadedFromStorage] = useState(false);
  const [queryName, setQueryName] = useState("");

  const programmaticVerticesRef = useRef(false);

  const markQueryDirty = () => {
    setSelectedQueryName(null);
    setQueryName("");
  };

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) setSavedQueries(parsed as SavedQuery[]);
      }
    } catch {}
    setLoadedFromStorage(true);
  }, []);

  useEffect(() => {
    if (!loadedFromStorage) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(savedQueries)); } catch {}
  }, [savedQueries, loadedFromStorage]);

  useEffect(() => {
    const initial = loadInitialBBox() || DEFAULT_BBOX;
    programmaticVerticesRef.current = true;
    setSelection(initial);
    setVerticesText(bboxToVertices(initial));
  }, []);

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

  useEffect(() => {
    if (!selection) return;
    const current = getBBox();
    if (current && sameBbox(current, selection)) return;
    setBBox(selection, "panel");
  }, [selection]);

  const handleStartDateChange = (value: string) => { setStartDate(value); setOpenPicker(null); markQueryDirty(); };
  const handleEndDateChange = (value: string) => { setEndDate(value); setOpenPicker(null); markQueryDirty(); };

  const handleSaveCurrent = () => {
    const bbox = selection ?? verticesToBbox(verticesText, bufferKm);
    if (!bbox) { alert("Please provide at least one valid coordinate before saving."); return; }
    const trimmedName = queryName.trim();
    if (!trimmedName) { alert("Please enter a name for the query before saving."); return; }
    const existing = savedQueries.find((sq) => sq.name === trimmedName);
    if (!selectedQueryName && existing) { alert("A query with this name already exists."); return; }
    if (selectedQueryName && trimmedName !== selectedQueryName && existing) { alert("Another query with this name already exists."); return; }

    if (selectedQueryName) {
      setSavedQueries((prev) => prev.map((sq) => sq.name === selectedQueryName ? { ...sq, name: trimmedName, bbox, verticesText, startDate, endDate } : sq));
    } else {
      setSavedQueries((prev) => [{ name: trimmedName, bbox, verticesText, startDate, endDate }, ...prev]);
    }
    setSelectedQueryName(trimmedName);
    setQueryName(trimmedName);
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

  const handleDeleteSavedQuery = (name: string) => {
    setSavedQueries((prev) => prev.filter((sq) => sq.name !== name));
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
