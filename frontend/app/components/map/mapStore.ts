import type { Selection } from "../types";

const LS_KEY = "PaddockTS:last_bbox";

type Listener = (bbox: Selection, source: "map" | "panel") => void;

let currentBBox: Selection | null = null;
const listeners = new Set<Listener>();

export function getBBox(): Selection | null {
  return currentBBox;
}

export function setBBox(bbox: Selection, source: "map" | "panel") {
  currentBBox = bbox;
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(bbox));
  } catch {}
  listeners.forEach((fn) => fn(bbox, source));
}

export function subscribe(fn: Listener): () => void {
  listeners.add(fn);
  return () => {
    listeners.delete(fn);
  };
}

export function loadInitialBBox(): Selection | null {
  if (currentBBox) return currentBBox;
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const n = Number(parsed.north);
    const s = Number(parsed.south);
    const e = Number(parsed.east);
    const w = Number(parsed.west);
    if (![n, s, e, w].every(Number.isFinite)) return null;
    currentBBox = {
      north: Math.max(n, s),
      south: Math.min(n, s),
      east: Math.max(e, w),
      west: Math.min(e, w),
    };
    return currentBBox;
  } catch {
    return null;
  }
}
