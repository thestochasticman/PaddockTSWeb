import type { Selection } from "../types";

const LS_KEY = "PaddockTS:last_bbox";

type Listener = (bbox: Selection, source: "map" | "panel") => void;
type DrawListener = () => void;

let currentBBox: Selection | null = null;
const listeners = new Set<Listener>();

// Draw-request channel — lets the (persistent) query bar ask the map to start
// rectangle drawing without holding a React ref to it. If no map is currently
// mounted (e.g. the request fires from the results page), the request is
// latched and replayed when a map next subscribes.
const drawListeners = new Set<DrawListener>();
let pendingDraw = false;

export function requestDraw() {
  if (drawListeners.size === 0) {
    pendingDraw = true;
    return;
  }
  drawListeners.forEach((fn) => fn());
}

export function subscribeDraw(fn: DrawListener): () => void {
  drawListeners.add(fn);
  if (pendingDraw) {
    pendingDraw = false;
    fn();
  }
  return () => {
    drawListeners.delete(fn);
  };
}

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
