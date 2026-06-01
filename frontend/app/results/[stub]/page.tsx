"use client";

import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "next/navigation";
import Link from "next/link";
import { BASE } from "../../components/api";
import { useEnvironmentalData } from "../../components/charts/useEnvironmentalData";
import { SILO_GROUPS, OZWALD_DAILY_GROUPS } from "../../components/charts/plotGroups";
import EnvSection from "../../components/charts/EnvSection";
import CalendarPanel from "../../components/calendar/CalendarPanel";
import PhenologyPanel from "../../components/phenology/PhenologyPanel";
import Workspace from "../../components/workspace/Workspace";

type OutputStatus = {
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
  ozwald_daily_ready: boolean;
  ozwald_8day_ready: boolean;
};

type VideoEntry = {
  key: keyof OutputStatus;
  file: (stub: string) => string;
  label: string;
};

const VIDEOS: VideoEntry[] = [
  { key: "sentinel2_video",          file: (s) => `${s}_sentinel2.mp4`,                          label: "Sentinel-2" },
  { key: "sentinel2_paddocks_video", file: ()  => `sam_paddocks_sentinel2_paddocks.mp4`,         label: "Sentinel-2 + Paddocks" },
  { key: "vegfrac_video",            file: (s) => `${s}_fractional_cover.mp4`,                   label: "Vegetation Fraction" },
  { key: "vegfrac_paddocks_video",   file: ()  => `sam_paddocks_fractional_cover_paddocks.mp4`,  label: "Veg. Fraction + Paddocks" },
];

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
  ozwald_daily_ready: false,
  ozwald_8day_ready: false,
};

const POLL_MS = 4000;

export default function ResultsPage() {
  const { stub } = useParams<{ stub: string }>();
  const searchParams = useSearchParams();
  // Workspace is the default view; the old long-scroll page is opt-in
  // via ?ui=legacy.
  const useWorkspace = searchParams.get("ui") !== "legacy";

  const [outputs, setOutputs] = useState<OutputStatus>(EMPTY);
  const [videoScale, setVideoScale] = useState(100);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const videoDone =
    outputs.sentinel2_video &&
    outputs.sentinel2_paddocks_video &&
    outputs.vegfrac_video &&
    outputs.vegfrac_paddocks_video;

  const envDone = outputs.silo_ready && outputs.ozwald_daily_ready;
  const allDone = videoDone && envDone;

  const silo = useEnvironmentalData(stub, "silo", outputs.silo_ready);
  const ozwald = useEnvironmentalData(stub, "ozwald_daily", outputs.ozwald_daily_ready);

  useEffect(() => {
    if (!stub || useWorkspace) return;

    const poll = async () => {
      try {
        const res = await fetch(`${BASE}/status/${stub}`);
        if (!res.ok) return;
        const data: OutputStatus = await res.json();
        setOutputs(data);

        const vDone =
          data.sentinel2_video &&
          data.sentinel2_paddocks_video &&
          data.vegfrac_video &&
          data.vegfrac_paddocks_video;
        const eDone = data.silo_ready && data.ozwald_daily_ready;

        if (vDone && eDone) {
          if (intervalRef.current) {
            clearInterval(intervalRef.current);
            intervalRef.current = null;
          }
        }
      } catch {}
    };

    poll();
    intervalRef.current = setInterval(poll, POLL_MS);
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [stub, useWorkspace]);

  if (useWorkspace) {
    return <Workspace stub={stub} />;
  }

  const totalReady = Object.values(outputs).filter(Boolean).length;
  const totalItems = Object.keys(outputs).length;

  return (
    <div style={{
      background: "var(--bg)",
      color: "var(--text-primary)",
      minHeight: "100vh",
      padding: "1.5rem",
    }}>
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: "1.5rem",
      }}>
        <h1 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>{stub}</h1>
        <Link href="/" style={{
          color: "var(--text-secondary)",
          fontSize: "0.75rem",
          textDecoration: "none",
          border: "1px solid var(--border)",
          padding: "0.35rem 0.75rem",
        }}>
          Back
        </Link>
      </div>

      {!allDone && (
        <div style={{
          fontSize: "0.7rem",
          color: "var(--text-secondary)",
          marginBottom: "1rem",
          fontFamily: "monospace",
        }}>
          Processing... ({totalReady}/{totalItems} ready)
        </div>
      )}

      <div style={{
        display: "flex",
        alignItems: "center",
        gap: "0.5rem",
        marginBottom: "0.5rem",
        fontSize: "0.65rem",
        fontFamily: "monospace",
        color: "var(--text-secondary)",
      }}>
        <span>Video size</span>
        <input
          type="range"
          min={30}
          max={100}
          value={videoScale}
          onChange={(e) => setVideoScale(Number(e.target.value))}
          style={{ width: "120px", accentColor: "var(--text-secondary)" }}
        />
        <span>{videoScale}%</span>
      </div>

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "0.75rem",
        maxWidth: `${videoScale}%`,
        margin: "0 auto",
      }}>
        {VIDEOS.map(({ key, file, label }) => (
          <div key={key}>
            <label style={{
              display: "block",
              fontSize: "0.7rem",
              fontWeight: 500,
              letterSpacing: "0.03em",
              textTransform: "uppercase",
              color: outputs[key] ? "var(--text-secondary)" : "var(--text-muted)",
              marginBottom: "0.35rem",
            }}>
              {label}
            </label>
            {outputs[key] ? (
              <video
                controls
                onLoadedMetadata={(e) => {
                  const v = e.currentTarget;
                  v.playbackRate = 0.25;
                  v.defaultPlaybackRate = 0.25;
                }}
                style={{
                  width: "100%",
                  background: "#000",
                  border: "1px solid var(--border)",
                }}
                src={`${BASE}/static/${stub}/${file(stub)}`}
              />
            ) : (
              <div style={{
                width: "100%",
                aspectRatio: "16 / 9",
                background: "var(--bg-panel)",
                border: "1px solid var(--border)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "0.75rem",
                fontFamily: "monospace",
                color: "var(--text-muted)",
              }}>
                pending...
              </div>
            )}
          </div>
        ))}
      </div>

      <CalendarPanel
        stub={stub}
        ready={outputs.paddock_segment && outputs.sentinel2_clean}
      />

      <PhenologyPanel
        stub={stub}
        ready={outputs.paddockTS_ready}
      />

      <EnvSection
        title="SILO Climate Data"
        groups={SILO_GROUPS}
        data={silo.data}
        loading={silo.loading}
        error={silo.error}
        ready={outputs.silo_ready}
      />

      <EnvSection
        title="OzWALD Daily Data"
        groups={OZWALD_DAILY_GROUPS}
        data={ozwald.data}
        loading={ozwald.loading}
        error={ozwald.error}
        ready={outputs.ozwald_daily_ready}
      />
    </div>
  );
}
