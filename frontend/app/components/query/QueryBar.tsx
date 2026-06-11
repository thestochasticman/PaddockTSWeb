"use client";

import { useEffect } from "react";
import { useRouter, usePathname, useParams } from "next/navigation";
import Link from "next/link";
import { useQueryState } from "./useQueryState";
import { useRunJob } from "./useRunJob";
import DateRangeSection from "./DateRangeSection";
import QueryCombo from "./QueryCombo";
import { requestDraw } from "../map/mapStore";

// Horizontal query strip. Lives in the shared (app) layout so it persists
// (keeps its state) across the map view (/) and the results view
// (/results/[stub]).
export default function QueryBar() {
  const router = useRouter();
  const pathname = usePathname();
  const params = useParams<{ stub?: string }>();
  const stub = pathname?.startsWith("/results/") ? params?.stub : undefined;
  const state = useQueryState();
  const { handleRun, status, error, jobId, reset } = useRunJob(
    state.selection,
    state.startDate,
    state.endDate,
    state.queryName
  );

  const isBusy = status === "submitting" || status === "polling";

  // Once a job is submitted, jump to its results page and hand progress
  // display off to the workspace, returning the bar to idle.
  useEffect(() => {
    if (status === "polling" && jobId) {
      router.push(`/results/${jobId}`);
      reset();
    }
  }, [status, jobId, router, reset]);

  // On a results page, surface the loaded query's name in the combo itself: a
  // saved query's friendly name if its run matches the stub, otherwise the
  // stub. (Only fires on stub / saved-list changes, so it never clobbers a
  // name the user is typing.)
  useEffect(() => {
    if (!stub) return;
    const match = state.savedQueries.find((q) => q.stub === stub);
    if (match) {
      state.setSelectedQueryName(match.name);
      state.setQueryName(match.name);
    } else {
      state.setSelectedQueryName(null);
      state.setQueryName(stub);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stub, state.savedQueries]);

  // Drawing needs the map; if we're on the results view, go home first — the
  // request is latched in mapStore and replayed once the map mounts.
  const handleSelectArea = () => {
    if (pathname !== "/") router.push("/");
    requestDraw();
  };

  // Selecting an existing query loads it into the bar and, when it has a
  // completed run, resets the results view to that query's stub.
  const handleSelectSaved = (name: string) => {
    state.handleSelectSavedQuery(name);
    const q = state.savedQueries.find((sq) => sq.name === name);
    if (q?.stub) router.push(`/results/${q.stub}`);
  };

  return (
    <div className="crt-querybar">
      <Link
        href="/"
        className="crt-logo"
        style={{ justifySelf: "start", alignSelf: "center", textDecoration: "none" }}
      >
        PaddockTS
      </Link>

      <div className="crt-querybar-center">
        <div className="crt-querybar-cell" style={{ width: 170 }}>
          <QueryCombo
            queries={state.savedQueries}
            queryName={state.queryName}
            selected={state.selectedQueryName}
            onNameChange={(val) => {
              state.setQueryName(val);
              if (state.selectedQueryName) state.setSelectedQueryName(null);
            }}
            onSelect={handleSelectSaved}
            onDelete={state.handleDeleteSavedQuery}
            disabled={isBusy}
          />
        </div>

        <div className="crt-querybar-cell" style={{ width: 210 }}>
          <label className="crt-label">Coordinates (lat, lon)</label>
          <textarea
            className="crt-textarea"
            rows={1}
            placeholder={"lat, lon"}
            value={state.verticesText}
            onChange={(e) => state.handleVerticesChange(e.target.value)}
          />
        </div>

        <div className="crt-querybar-cell" style={{ width: 78 }}>
          <label className="crt-label">Buffer (km)</label>
          <input
            type="number"
            className="crt-input"
            value={state.bufferKm}
            onChange={(e) => state.handleBufferChange(e.target.value)}
            min="0"
            step="0.1"
          />
        </div>

        <div className="crt-querybar-cell" style={{ width: 220 }}>
          <DateRangeSection
            startDate={state.startDate}
            endDate={state.endDate}
            onStartChange={state.handleStartDateChange}
            onEndChange={state.handleEndDateChange}
            openPicker={state.openPicker}
            onTogglePicker={(which) =>
              state.setOpenPicker((prev) => (prev === which ? null : which))
            }
          />
        </div>

        <div className="crt-querybar-actions">
          <button
            type="button"
            className="crt-btn-ghost"
            onClick={() => state.handleSaveCurrent(jobId)}
            disabled={isBusy}
          >
            Save
          </button>
          <button
            type="button"
            className="crt-btn-ghost"
            onClick={handleSelectArea}
            disabled={isBusy}
          >
            Select Area
          </button>
          <button
            type="button"
            className={isBusy ? "crt-btn-running" : "crt-btn-primary"}
            onClick={handleRun}
            disabled={isBusy}
          >
            {status === "submitting" ? "Submitting..." : "Run"}
          </button>
        </div>
      </div>

      <div className="crt-querybar-right">
        <Link href="/features" className="crt-querybar-features">
          Features
        </Link>
      </div>

      {error && (
        <div className="crt-status crt-status--error crt-querybar-error">
          {error}
        </div>
      )}
    </div>
  );
}
