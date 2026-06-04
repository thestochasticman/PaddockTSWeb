import Link from "next/link";
import TopBar from "../components/ui/TopBar";

const SECTION: React.CSSProperties = {
  marginBottom: "1.75rem",
};
const H2: React.CSSProperties = {
  fontSize: "0.9rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.08em",
  color: "var(--text-secondary)",
  borderBottom: "1px solid var(--border)",
  paddingBottom: "0.4rem",
  marginBottom: "0.75rem",
};
const H3: React.CSSProperties = {
  fontSize: "0.95rem",
  fontWeight: 500,
  color: "var(--text-primary)",
  marginTop: "1rem",
  marginBottom: "0.35rem",
};
const P: React.CSSProperties = {
  fontSize: "0.85rem",
  lineHeight: 1.6,
  color: "var(--text-primary)",
  margin: "0 0 0.5rem 0",
};
const MUTED: React.CSSProperties = {
  fontSize: "0.78rem",
  color: "var(--text-secondary)",
  fontFamily: "monospace",
};

export default function FeaturesPage() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--bg)", color: "var(--text-primary)" }}>
      <TopBar center="Features" />
      <main style={{ padding: "2rem 1.5rem" }}>
        <div style={{ maxWidth: 780, margin: "0 auto" }}>

        <p style={{ ...P, color: "var(--text-secondary)", marginBottom: "2rem" }}>
          PaddockTS Web turns a bounding-box + date range into a paddock-level
          biophysical dashboard. Below is what you can do once a query is run.
        </p>

        {/* --- Query ----------------------------------------------------- */}
        <section style={SECTION}>
          <h2 style={H2}>Query</h2>
          <h3 style={H3}>Map-driven AOI selection</h3>
          <p style={P}>
            Draw a rectangle on the map (or paste lat/lon coordinates) to set
            the area of interest. Pick a date range and submit. Behind the
            scenes the query is hashed against a registry so re-running the
            same AOI and dates reuses the cached intermediate files.
          </p>
          <h3 style={H3}>Saved queries</h3>
          <p style={P}>
            Saved bounding box + date range presets, retrievable from the
            home page dropdown. Useful for revisiting the same paddocks.
          </p>
        </section>

        {/* --- Pipeline outputs ----------------------------------------- */}
        <section style={SECTION}>
          <h2 style={H2}>Pipeline outputs</h2>

          <h3 style={H3}>Sentinel-2 imagery videos</h3>
          <p style={P}>
            Each query produces an MP4 of the Sentinel-2 RGB imagery over
            time, plus a paddock-overlay version that draws SAM-derived
            paddock polygons on top of every frame.
          </p>

          <h3 style={H3}>Fractional cover videos</h3>
          <p style={P}>
            Green / dry / bare fractional cover animated over the same time
            range, with and without paddock outlines.
          </p>

          <h3 style={H3}>Paddock segmentation (SAM)</h3>
          <p style={P}>
            Segment Anything Model auto-derives paddock polygons from a
            clean Sentinel-2 composite. Polygons land as a GeoPackage and
            are used downstream for per-paddock time series, calendars, and
            phenology.
          </p>
        </section>

        {/* --- Interactive panes ---------------------------------------- */}
        <section style={SECTION}>
          <h2 style={H2}>Interactive panes</h2>

          <h3 style={H3}>Calendar</h3>
          <p style={P}>
            A 48-slot per-year grid of cloud-free RGB thumbnails for a
            selected paddock. Hover any cell to see a larger preview with
            its observation date. Picks the closest acquisition to each
            slot's day-of-year centre.
          </p>

          <h3 style={H3}>Phenology</h3>
          <p style={P}>
            Per-paddock × per-year NDVI scatter with start-of-season,
            peak-of-season, and end-of-season markers from the vendored
            <code style={MUTED}> phenolopy</code> library
            (seasonal-amplitude method, 5%/two-sided). Metrics are computed
            once per pipeline run and cached as CSV; subsequent paddock
            switches are a file lookup.
          </p>

          <h3 style={H3}>Paddock pane</h3>
          <p style={P}>
            Combined Calendar (top) + Phenology (bottom) with a single
            paddock + year selector. The hover preview sits to the right
            and stays in sync with the calendar cells.
          </p>
        </section>

        {/* --- Environmental -------------------------------------------- */}
        <section style={SECTION}>
          <h2 style={H2}>Environmental data</h2>

          <h3 style={H3}>SILO</h3>
          <p style={P}>
            Daily temperature, rainfall, solar radiation,
            evapotranspiration, and vapour pressure for the AOI centroid.
          </p>
        </section>

        {/* --- Workspace UI --------------------------------------------- */}
        <section style={SECTION}>
          <h2 style={H2}>Workspace UI</h2>

          <h3 style={H3}>Draggable, resizable panes</h3>
          <p style={P}>
            Every pane has a draggable title bar, a close button, and eight
            resize handles around its perimeter (all four corners, all
            four edges). Layouts persist per-query in
            <code style={MUTED}> localStorage</code>.
          </p>

          <h3 style={H3}>Sidebar drag &amp; drop</h3>
          <p style={P}>
            Sidebar entries can be clicked to open at the bottom of the
            layout, or dragged onto a specific position in the grid.
          </p>

          <h3 style={H3}>Year filter</h3>
          <p style={P}>
            All multi-year plots have a Full / per-year / Custom toggle
            above the chart. Custom mode exposes two date inputs.
            Pressing the menu button resets filters and pane selections.
          </p>

          <h3 style={H3}>No internal scroll</h3>
          <p style={P}>
            Each pane measures its own content height on mount and grows
            its minimum size so that the content always fits without an
            internal scrollbar.
          </p>

          <h3 style={H3}>Reset</h3>
          <p style={P}>
            The ↺ button in the activity bar clears the saved layout and
            rebuilds the default arrangement (videos on the left, plots on
            the right).
          </p>
        </section>

        {/* --- Footer -------------------------------------------------- */}
        <p style={{ ...MUTED, marginTop: "2rem" }}>
          Visit <Link href="/" style={{ color: "var(--text-primary)" }}>Home</Link> to
          start a new query, or jump to a results URL directly:
          <code style={MUTED}> /results/&lt;stub&gt;</code>.
        </p>
        </div>
      </main>
    </div>
  );
}
