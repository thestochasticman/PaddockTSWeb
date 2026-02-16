import type { Selection } from "./types";

export function bboxToVertices(b: Selection): string {
  const sw = `${b.south.toFixed(5)}, ${b.west.toFixed(5)}`;
  const se = `${b.south.toFixed(5)}, ${b.east.toFixed(5)}`;
  const ne = `${b.north.toFixed(5)}, ${b.east.toFixed(5)}`;
  const nw = `${b.north.toFixed(5)}, ${b.west.toFixed(5)}`;
  return [sw, se, ne, nw].join("\n");
}

export function verticesToBbox(text: string, bufferKmStr: string): Selection | null {
  const lines = text.split(/\n+/).map((l) => l.trim()).filter((l) => l.length > 0);
  if (lines.length === 0) return null;

  const lats: number[] = [];
  const lons: number[] = [];

  for (const line of lines) {
    const parts = line.split(/[,\s]+/).filter((p) => p.length > 0);
    if (parts.length < 2) continue;
    const lat = Number(parts[0]);
    const lon = Number(parts[1]);
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
    lats.push(lat);
    lons.push(lon);
  }

  if (lats.length === 0) return null;

  if (lats.length === 1) {
    const lat0 = lats[0];
    const lon0 = lons[0];
    const bufferKm = Number(bufferKmStr);
    if (!Number.isFinite(bufferKm) || bufferKm <= 0) {
      return { north: lat0, south: lat0, east: lon0, west: lon0 };
    }
    const kmPerDegLat = 111.0;
    const dLat = bufferKm / kmPerDegLat;
    const latRad = (lat0 * Math.PI) / 180.0;
    const kmPerDegLon = Math.max(kmPerDegLat * Math.cos(latRad), 1e-6);
    const dLon = bufferKm / kmPerDegLon;
    return { north: lat0 + dLat, south: lat0 - dLat, east: lon0 + dLon, west: lon0 - dLon };
  }

  return {
    north: Math.max(...lats),
    south: Math.min(...lats),
    east: Math.max(...lons),
    west: Math.min(...lons),
  };
}