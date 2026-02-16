"use client";

import { useEffect, useRef, useState } from "react";
import { BASE } from "../api";

export type OutputStatus = {
  sentinel2_video: boolean;
  sentinel2_paddocks_video: boolean;
  vegfrac_video: boolean;
  vegfrac_paddocks_video: boolean;
};

const EMPTY: OutputStatus = {
  sentinel2_video: false,
  sentinel2_paddocks_video: false,
  vegfrac_video: false,
  vegfrac_paddocks_video: false,
};

const POLL_MS = 4000;

export function useJobStatus(stub: string | null) {
  const [outputs, setOutputs] = useState<OutputStatus>(EMPTY);
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
      return;
    }

    setOutputs(EMPTY);

    const poll = async () => {
      try {
        const res = await fetch(`${BASE}/status/${stub}`);
        if (!res.ok) return;
        const data: OutputStatus = await res.json();
        setOutputs(data);

        const done =
          data.sentinel2_video &&
          data.sentinel2_paddocks_video &&
          data.vegfrac_video &&
          data.vegfrac_paddocks_video;

        if (done && intervalRef.current) {
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

  return { outputs, polling: !!stub && !allDone, allDone };
}
