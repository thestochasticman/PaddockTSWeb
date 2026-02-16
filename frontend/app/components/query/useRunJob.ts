"use client";

import { useCallback, useRef, useState } from "react";
import type { Selection } from "../types";
import { BASE } from "../api";

export type Status = "idle" | "submitting" | "polling" | "done" | "error";

export function useRunJob(
  selection: Selection | null,
  startDate: string,
  endDate: string,
  stub: string
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

    const body: Record<string, any> = {
      bbox: [selection.west, selection.south, selection.east, selection.north],
      start: startDate,
      end: endDate,
    };
    if (stub) body.stub = stub;

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
      setJobId(json.job_id ?? json.jobId ?? json.stub);
      setStatus("polling");
    } catch (err: any) {
      if (err?.name === "AbortError") return;
      console.error(err);
      setError(err?.message || "Run failed");
      setStatus("error");
    } finally {
      abortRef.current = null;
    }
  }

  const markDone = useCallback(() => setStatus("done"), []);

  return { handleRun, status, error, jobId, markDone };
}
