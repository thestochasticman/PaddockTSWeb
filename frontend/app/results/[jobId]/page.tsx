"use client";

import { useEffect, useState } from "react";

type Result = {
  status: string;
  plots: string[];
  videos: string[];
  meta: any;
};


const API: string = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

function resolveSrc(p: string | undefined | null): string {
  if (!p) return "";
  if (p.startsWith("http://") || p.startsWith("https://")) return p;
  // ensure exactly one slash between host and path
  const path = p.startsWith("/") ? p : `/${p}`;
  return `${API}${path}`;
}

export default function ResultsPage({ params }: { params: { jobId: string } }) {
  const { jobId } = params;
  const [data, setData] = useState<Result | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch(`http://localhost:8000/results/${jobId}`);
        if (!res.ok) throw new Error(await res.text());
        const d: Result = await res.json();
        setData(d);
      } catch (err:any) {
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
          <div className="grid sm:grid-cols-2 gap-4">
  {data.plots.map((p, i) => {
    const url = resolveSrc(p);
    return p.toLowerCase().endsWith(".tif") || p.toLowerCase().endsWith(".tiff") ? (
      <a key={i} href={url} target="_blank" rel="noreferrer" className="btn">
        Download TIFF ({p.split("/").pop()})
      </a>
    ) : (
      <img key={i} src={url} alt={`plot-${i}`} className="rounded-xl border border-neutral-800" />
    );
  })}
</div>
        </div>
      </section>

      <section className="card">
        <h3 className="text-lg font-medium mb-3">Videos</h3>
        <div className="grid gap-4">
          {data.videos.map((v, i) => (
  <div key={i} className="space-y-2">
    <video
      controls
      preload="metadata"
      className="w-full rounded-xl border border-neutral-800"
      crossOrigin="anonymous"
    >
      <source src={`http://localhost:8000/${v}`} type="video/mp4" />
      {/* Fallback text */}
      Your browser does not support HTML5 video.
    </video>
    {/* Quick open-in-new-tab link for debugging */}
    <a
      className="text-sm underline text-neutral-400"
      href={`http://localhost:8000${v}`}
      target="_blank"
      rel="noreferrer"
    >
      Open video directly
    </a>
  </div>
))}
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
