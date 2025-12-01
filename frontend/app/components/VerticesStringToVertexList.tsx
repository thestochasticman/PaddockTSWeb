export function VerticesStringToVertexList(text: string): [number, number][] {
  const lines = text
    .split(/\n+/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  const vertices: [number, number][] = [];

  for (const line of lines) {
    const parts = line.split(/[,\s]+/).filter((p) => p.length > 0);
    if (parts.length < 2) continue;
    const lat = Number(parts[0]);
    const lon = Number(parts[1]);
    if (Number.isNaN(lat) || Number.isNaN(lon)) continue;
    vertices.push([lat, lon]);
  }

  return vertices;
}
