import { Selection } from "./Selection";

export function BboxToVertices(b: Selection): string {
    // Order: SW, SE, NE, NW
    const sw = `${b.south.toFixed(5)}, ${b.west.toFixed(5)}`;
    const se = `${b.south.toFixed(5)}, ${b.east.toFixed(5)}`;
    const ne = `${b.north.toFixed(5)}, ${b.east.toFixed(5)}`;
    const nw = `${b.north.toFixed(5)}, ${b.west.toFixed(5)}`;
    return [sw, se, ne, nw].join("\n");
}
