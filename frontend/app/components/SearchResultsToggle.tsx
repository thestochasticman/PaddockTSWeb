"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";

const LATEST_JOB_STORAGE_KEY = "daesim_latest_job_id";

export default function SearchResultsToggle() {
  const router = useRouter();
  const pathname = usePathname();

  const [latestJobId, setLatestJobId] = useState<string | null>(null);

  const readLatestJobId = (): string | null => {
    if (typeof window === "undefined") return null;
    try {
      return window.localStorage.getItem(LATEST_JOB_STORAGE_KEY);
    } catch {
      return null;
    }
  };

  // Load latest jobId + keep it fresh (storage only updates across tabs)
  useEffect(() => {
    const refresh = () => setLatestJobId(readLatestJobId());

    refresh();

    // Fires for changes from OTHER tabs/windows
    const onStorage = (e: StorageEvent) => {
      if (e.key === LATEST_JOB_STORAGE_KEY) {
        setLatestJobId(e.newValue);
      }
    };

    // Fires when user returns to the tab (covers same-tab updates)
    const onFocus = () => refresh();
    const onVis = () => {
      if (!document.hidden) refresh();
    };

    window.addEventListener("storage", onStorage);
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVis);

    return () => {
      window.removeEventListener("storage", onStorage);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, []);

  // If this toggle sits in a persistent layout, pathname changes won’t remount it.
  // Refresh on route change so button state stays correct.
  useEffect(() => {
    setLatestJobId(readLatestJobId());
  }, [pathname]);

  const isOnSearch = pathname === "/" || pathname === "/search";
  const isOnResults = pathname.startsWith("/results");

  const handleGoSearch = () => {
    router.push("/");
  };

  const handleGoResults = () => {
    // Always read at click time (source of truth)
    const id = readLatestJobId();
    if (!id) return;

    // keep state in sync so button doesn’t look disabled afterward
    setLatestJobId(id);

    router.push(`/results/${id}`);
  };

  // Use state if available, but fall back to localStorage so it never goes stale
  const hasResult = Boolean(latestJobId ?? readLatestJobId());

  return (
    <div className="toggle-root">
      <button
        type="button"
        onClick={handleGoSearch}
        className={[
          "toggle-button",
          isOnSearch ? "toggle-button--active" : "toggle-button--inactive",
        ].join(" ")}
      >
        Search
      </button>

      <button
        type="button"
        onClick={handleGoResults}
        disabled={!hasResult}
        className={[
          "toggle-button",
          "toggle-button--spaced",
          isOnResults
            ? "toggle-button--active"
            : hasResult
            ? "toggle-button--inactive"
            : "toggle-button--disabled",
        ].join(" ")}
        title={hasResult ? "Go to latest result" : "Run a simulation first"}
      >
        Results
      </button>
    </div>
  );
}
