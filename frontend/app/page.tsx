"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
const BASE = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/+$/, "");

function splitCSV(s: string): string[] {
  return s.split(",").map(v => v.trim()).filter(Boolean);
}

export default function HomePage() {
  const router = useRouter();
  const [lat, setLat] = useState(-33.5040);
  const [lon, setLon] = useState(148.4);
  const [buffer, setBuffer] = useState(0.01);
  const [startDate, setStartDate] = useState("2020-01-01");
  const [endDate, setEndDate] = useState("2020-06-01");
  // const [filterExpr, setFilterExpr] = useState("eo:cloud_cover < 10");
  const [stub, setStub] = useState(""); // optional
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const body: any = {
        lat, lon, buffer,
        start_time: startDate,
        end_time: endDate,
      };
      if (stub.trim()) body.stub = stub.trim();

      // const res = await fetch("http://localhost:8000/run", {
      const res = await fetch(`${BASE}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error(await res.text());
      const data = await res.json();
      router.push(`/results/${data.job_id}`);
    } catch (err:any) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="grid md:grid-cols-2 gap-6">
      <section className="card">
        <h2 className="text-xl font-medium mb-4">Enter Query</h2>
        <form className="space-y-3" onSubmit={onSubmit}>
          <div>
            <label className="label">Latitude</label>
            <input className="input" type="number" step="any" value={lat} onChange={e=>setLat(parseFloat(e.target.value))} />
          </div>
          <div>
            <label className="label">Longitude</label>
            <input className="input" type="number" step="any" value={lon} onChange={e=>setLon(parseFloat(e.target.value))} />
          </div>
          <div>
            <label className="label">Buffer (degrees)</label>
            <input className="input" type="number" step="any" value={buffer} onChange={e=>setBuffer(parseFloat(e.target.value))} />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="label">Start date</label>
              <input className="input" type="date" value={startDate} onChange={e=>setStartDate(e.target.value)} />
            </div>
            <div>
              <label className="label">End date</label>
              <input className="input" type="date" value={endDate} onChange={e=>setEndDate(e.target.value)} />
            </div>
          </div>

          <div>
            {/* <label className="label">Filter (expr)</label> */}
            {/* <input className="input" value={filterExpr} onChange={e=>setFilterExpr(e.target.value)} placeholder="eo:cloud_cover < 10" /> */}
          </div>
          <div>
            <label className="label">Stub (optional)</label>
            <input className="input" value={stub} onChange={e=>setStub(e.target.value)} placeholder="leave empty to auto-generate" />
          </div>
          <button className="btn" type="submit" disabled={loading}>
            {loading ? "Running..." : "Run"}
          </button>
          {error && <p className="text-red-400 text-sm">{error}</p>}
        </form>
      </section>
      <section className="card">
        <h2 className="text-xl font-medium mb-2">What is PaddockTS</h2>
        <p className="text-neutral-300">
          PaddockTS captures how your paddock changes over time, tracking vegetation, soil, and weather using satellite images and climate data.
        </p>
        <ul className="list-disc ml-6 mt-3 text-neutral-400 text-sm">
          <li>Dates are ISO (YYYY-MM-DD)</li>
          <li>Provide <code>stub</code> or it auto-generates one from a hash</li>
        </ul>
      </section>
    </main>
  );
}
