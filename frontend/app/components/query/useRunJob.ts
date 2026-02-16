"use client";

import { useRef, useState } from "react";
import type { Selection } from "../types";
import { BASE } from "../api";
import { verticesStringToVertexList } from "../geo";

type Status = "idle" | "submitting" | "done" | "error";

export function useRunJob(
  selection: Selection | null,
  verticesText: string,
  bufferKm: string,
  startDate: string,
  endDate: string
) {
  const abortRef = useRef<AbortController | null>(null);
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [jobId, setJobId] = useState<string | null>(null);

  async function handleRun() {
    if (!selection) { alert("Please define a region first."); return; }
    if (status === "submitting") return;

    setStatus("submitting");
    setError(null);

    const body = {
      vertices: verticesStringToVertexList(verticesText),
      bbox: [selection.south, selection.west, selection.north, selection.east],
      buffer_km: Number(bufferKm),
      start_date: startDate,
      end_date: endDate,
    };

    const ac = new AbortController();
    abortRef.current = ac;

    try {
      const res = await fetch(`${BASE}/run`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
        signal: ac.signal,
      });
      if (!res.ok) throw new Error(await res.text());
      const json = await res.json();
      setJobId(json.job_id ?? json.jobId);
      setStatus("done");
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error(err);
      setError(err?.message || "Run failed");
      setStatus("error");
    } finally {
      abortRef.current = null;
    }
  }

  return { handleRun, status, error, jobId };
}
