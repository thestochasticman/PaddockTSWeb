"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const LATEST_JOB_STORAGE_KEY = "daesim_latest_job_id";

export default function SearchResultsToggle() {
  const router = useRouter();
  const pathname = usePathname();

  const [latestJobId, setLatestJobId] = useState<string | null>(null);

  // Load latest jobId from localStorage on mount
  useEffect(() => {
    if (typeof window === "undefined") return;
    const stored = window.localStorage.getItem(LATEST_JOB_STORAGE_KEY);
    if (stored) setLatestJobId(stored);

    // Listen to storage changes (in case other components update it)
    const handler = (e: StorageEvent) => {
      if (e.key === LATEST_JOB_STORAGE_KEY) {
        setLatestJobId(e.newValue);
      }
    };
    window.addEventListener("storage", handler);
    return () => window.removeEventListener("storage", handler);
  }, []);

  const isOnSearch = pathname === "/" || pathname === "/search"; // adjust if needed
  const isOnResults = pathname.startsWith("/results");

  const handleGoSearch = () => {
    router.push("/");
  };

  const handleGoResults = () => {
    if (!latestJobId) return;
    router.push(`/results/${latestJobId}`);
  };

  const hasResult = Boolean(latestJobId);

  return (
    <div className="inline-flex items-center bg-neutral-900 border border-neutral-700 p-1 text-[11px]">
      <button
        type="button"
        onClick={handleGoSearch}
        className={[
          "px-3 py-1 transition",
          isOnSearch
            ? "bg-cyan-500 text-neutral-950"
            : "text-neutral-300 hover:bg-neutral-800",
        ].join(" ")}
      >
        Search
      </button>
      <button
        type="button"
        onClick={handleGoResults}
        disabled={!hasResult}
        className={[
          "ml-1 px-3 py-1 transition",
          isOnResults
            ? "bg-cyan-500 text-neutral-950"
            : hasResult
            ? "text-neutral-300 hover:bg-neutral-800"
            : "text-neutral-500 cursor-not-allowed",
        ].join(" ")}
        title={hasResult ? "Go to latest result" : "Run a simulation first"}
      >
        Results
      </button>
    </div>
  );
}
