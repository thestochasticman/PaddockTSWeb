"use client";

import { useEffect, useState } from "react";
import { TransformWrapper, TransformComponent } from "react-zoom-pan-pinch";

type Result = {
  status: string;
  plots: string[];
  videos: string[];
  meta: any;
};

// Base API URL (configure via .env.local: NEXT_PUBLIC_API_URL=http://localhost:8000)
// const API_RAW = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";
const API_RAW = process.env.NEXT_PUBLIC_API_URL ?? "/api";
const API = API_RAW.replace(/\/+$/, ""); // strip trailing slash(es)

function resolveSrc(p: string | undefined | null): string {
  if (!p) return "";
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  const path = p.startsWith("/") ? p : `/${p}`;
  return `${API}${path}`;
}

/* ---------- Image lightbox with zoom + pan ---------- */
function ImageLightbox({
  src,
  alt,
  onClose,
}: {
  src: string;
  alt: string;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="max-w-[90vw] max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        <TransformWrapper>
          <TransformComponent>
            <img
              src={src}
              alt={alt}
              className="max-w-[90vw] max-h-[90vh] object-contain rounded-xl"
            />
          </TransformComponent>
        </TransformWrapper>
        <div className="mt-2 flex gap-3 justify-end">
          <button className="btn" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  );
}

function ZoomableThumb({ src, alt }: { src: string; alt: string }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <img
        src={src}
        alt={alt}
        className="w-full h-auto rounded-xl border border-neutral-800 cursor-zoom-in"
        onClick={() => setOpen(true)}
      />
      {open && <ImageLightbox src={src} alt={alt} onClose={() => setOpen(false)} />}
    </>
  );
}

/* ---------- Simple resizable video (slider) ---------- */
function ResizableVideo({ src }: { src: string }) {
  const [w, setW] = useState(800); // px
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <input
          type="range"
          min={360}
          max={1920}
          value={w}
          onChange={(e) => setW(parseInt(e.target.value, 10))}
          className="w-full"
        />
        <span className="text-sm w-16 text-right">{w}px</span>
        <button className="btn" onClick={() => setW(800)}>Fit</button>
        <button className="btn" onClick={() => setW(Math.round(w * 1.25))}>+25%</button>
        <button className="btn" onClick={() => setW(Math.round(w * 0.8))}>-20%</button>
      </div>
      <video
        controls
        preload="metadata"
        style={{ width: w, height: "auto" }}
        className="rounded-xl border border-neutral-800"
        crossOrigin="anonymous"
      >
        <source src={src} type="video/mp4" />
      </video>
    </div>
  );
}

export default function ResultsPage({ params }: { params: { jobId: string } }) {
  const { jobId } = params;
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`${API}/results/${jobId}`);
        if (!res.ok) throw new Error(await res.text());
        const d: Result = await res.json();
        setData(d);
      } catch (err: any) {
        setError(err.message || "Failed to load");
      }
    }
    fetchData();
  }, [jobId]);

  if (error) return <div className="card"><p className="text-red-400">{error}</p></div>;
  if (!data) return <div className="card"><p>Loading…</p></div>;

  return (
    <main className="space-y-6">
      <section className="card">
        <h2 className="text-xl font-medium">Job {jobId}</h2>
        <p className="text-sm text-neutral-400">Status: {data.status}</p>
      </section>

      <section className="card">
        <h3 className="text-lg font-medium mb-3">Plots</h3>
        <div className="grid sm:grid-cols-2 gap-4">
          {data.plots.map((p, i) => {
            const url = resolveSrc(p);
            if (!url) return null;
            const isTiff =
              p.toLowerCase().endsWith(".tif") || p.toLowerCase().endsWith(".tiff");
            return isTiff ? (
              <a key={i} href={url} target="_blank" rel="noreferrer" className="btn">
                Download TIFF ({p.split("/").pop()})
              </a>
            ) : (
              <ZoomableThumb key={i} src={url} alt={`plot-${i}`} />
            );
          })}
        </div>
      </section>

      <section className="card">
        <h3 className="text-lg font-medium mb-3">Videos</h3>
        <div className="grid gap-4">
          {data.videos.map((v, i) => {
            const url = resolveSrc(v);
            if (!url) return null;
            return <ResizableVideo key={i} src={url} />;
          })}
        </div>
      </section>

      <section className="card">
        <h3 className="text-lg font-medium mb-2">Meta</h3>
        <pre className="text-xs whitespace-pre-wrap break-words bg-neutral-950/50 p-4 rounded-xl border border-neutral-800 overflow-x-auto">
{JSON.stringify(data.meta, null, 2)}
        </pre>
      </section>
    </main>
  );
}
