"use client";

import { useEffect, useState } from "react";
import { BASE } from "../api";

export type EnvDataset = {
  dates: string[];
  columns: Record<string, (number | null)[]>;
};

const EMPTY: EnvDataset = { dates: [], columns: {} };

export function useEnvironmentalData(
  stub: string | null,
  source: "silo" | "ozwald_daily",
  ready: boolean
) {
  const [data, setData] = useState<EnvDataset>(EMPTY);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!stub || !ready) {
      setData(EMPTY);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    fetch(`${BASE}/data/${stub}/${source}`)
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json: EnvDataset) => {
        if (!cancelled) {
          setData(json);
          setLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err.message);
          setLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [stub, source, ready]);

  return { data, loading, error };
}
