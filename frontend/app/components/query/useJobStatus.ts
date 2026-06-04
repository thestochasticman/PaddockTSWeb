"use client";

import { useEffect, useRef, useState } from "react";
import { BASE } from "../api";

export type OutputStatus = {
  sentinel2_download: boolean;
  sentinel2_clean: boolean;
  vegfrac_compute: boolean;
  paddock_segment: boolean;
  paddockTS_ready: boolean;
  sentinel2_video: boolean;
  sentinel2_paddocks_video: boolean;
  vegfrac_video: boolean;
  vegfrac_paddocks_video: boolean;
  calendar_ready: boolean;
  phenology_plot_ready: boolean;
  silo_ready: boolean;
};

const EMPTY: OutputStatus = {
  sentinel2_download: false,
  sentinel2_clean: false,
  vegfrac_compute: false,
  paddock_segment: false,
  paddockTS_ready: false,
  sentinel2_video: false,
  sentinel2_paddocks_video: false,
  vegfrac_video: false,
  vegfrac_paddocks_video: false,
  calendar_ready: false,
  phenology_plot_ready: false,
  silo_ready: false,
};

const POLL_MS = 4000;

export function useJobStatus(stub: string | null) {
  const [outputs, setOutputs] = useState<OutputStatus>(EMPTY);
  // Set when the backend recorded a pipeline failure for this stub; kept
  // separate from `outputs` so checklists that enumerate its keys are
  // unaffected.
  const [pipelineError, setPipelineError] = useState<string | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allDone =
    outputs.sentinel2_video &&
    outputs.sentinel2_paddocks_video &&
    outputs.vegfrac_video &&
    outputs.vegfrac_paddocks_video;

  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (!stub) {
      setOutputs(EMPTY);
      setPipelineError(null);
      return;
    }

    setOutputs(EMPTY);
    setPipelineError(null);

    const poll = async () => {
      try {
        const res = await fetch(`${BASE}/status/${stub}`);
        if (!res.ok) return;
        const raw = await res.json();
        // Pick only the keys we display — the backend may report extra
        // outputs (e.g. OzWALD) that the UI doesn't surface.
        const data = Object.fromEntries(
          Object.keys(EMPTY).map((k) => [k, !!raw[k]])
        ) as OutputStatus;
        setOutputs(data);
        setPipelineError(raw.pipeline_error ?? null);

        const done =
          data.sentinel2_video &&
          data.sentinel2_paddocks_video &&
          data.vegfrac_video &&
          data.vegfrac_paddocks_video;

        // Stop polling on completion or recorded failure — neither state
        // changes until the user re-runs the query.
        if ((done || raw.pipeline_error) && intervalRef.current) {
          clearInterval(intervalRef.current);
          intervalRef.current = null;
        }
      } catch {
        // retry on next interval
      }
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_MS);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [stub]);

  return { outputs, polling: !!stub && !allDone, allDone, pipelineError };
}
