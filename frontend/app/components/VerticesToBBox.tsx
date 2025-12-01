import { Selection } from "./Selection";

export function VerticesToBbox(text: string, bufferKmStr: string): Selection | null {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length === 0) return null;

  const lats: number[] = [];
  const lons: number[] = [];

  for (const line of lines) {
    // split on comma or whitespace
    const parts = line.split(/[,\s]+/).filter((p) => p.length > 0);
    if (parts.length < 2) continue;
    const lat = Number(parts[0]);
    const lon = Number(parts[1]);
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
    lats.push(lat);
    lons.push(lon);
  }

  if (lats.length === 0) return null;

  // If we only have one point, use buffer to build bbox
  if (lats.length === 1) {
    const lat0 = lats[0];
    const lon0 = lons[0];

    const bufferKm = Number(bufferKmStr);
    if (!Number.isFinite(bufferKm) || bufferKm <= 0) {
      // Degenerate bbox at the point if buffer invalid / zero
      return {
        north: lat0,
        south: lat0,
        east: lon0,
        west: lon0,
      };
    }

    // Approximate conversions: 1 deg latitude ≈ 111 km
    const kmPerDegLat = 111.0;
    const dLat = bufferKm / kmPerDegLat;

    // Longitude depends on latitude
    const latRad = (lat0 * Math.PI) / 180.0;
    const kmPerDegLon = Math.max(kmPerDegLat * Math.cos(latRad), 1e-6); // avoid divide by zero
    const dLon = bufferKm / kmPerDegLon;

    return {
      north: lat0 + dLat,
      south: lat0 - dLat,
      east: lon0 + dLon,
      west: lon0 - dLon,
    };
  }

//   // Otherwise, use min/max lat/lon
  const north = Math.max(...lats);
  const south = Math.min(...lats);
  const east = Math.max(...lons);
  const west = Math.min(...lons);

  return { north, south, east, west };
}
