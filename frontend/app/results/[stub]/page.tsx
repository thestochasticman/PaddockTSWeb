"use client";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { BASE } from "../../components/api";

type OutputStatus = {
  sentinel2_video: boolean;
  sentinel2_paddocks_video: boolean;
  vegfrac_video: boolean;
  vegfrac_paddocks_video: boolean;
};

const VIDEOS: [keyof OutputStatus, string, string][] = [
  ["sentinel2_video", "sentinel2", "Sentinel-2"],
  ["sentinel2_paddocks_video", "sentinel2_paddocks", "Sentinel-2 + Paddocks"],
  ["vegfrac_video", "vegfrac", "Vegetation Fraction"],
  ["vegfrac_paddocks_video", "vegfrac_paddocks", "Veg. Fraction + Paddocks"],
];

const EMPTY: OutputStatus = {
  sentinel2_video: false,
  sentinel2_paddocks_video: false,
  vegfrac_video: false,
  vegfrac_paddocks_video: false,
};

const POLL_MS = 4000;

export default function ResultsPage() {
  const { stub } = useParams<{ stub: string }>();
  const [outputs, setOutputs] = useState<OutputStatus>(EMPTY);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const allDone = outputs.sentinel2_video && outputs.sentinel2_paddocks_video
    && outputs.vegfrac_video && outputs.vegfrac_paddocks_video;

  useEffect(() => {
    if (!stub) return;

    const poll = async () => {
      try {
        const res = await fetch(`${BASE}/status/${stub}`);
        if (!res.ok) return;
        const data: OutputStatus = await res.json();
        setOutputs(data);
        if (data.sentinel2_video && data.sentinel2_paddocks_video
          && data.vegfrac_video && data.vegfrac_paddocks_video) {
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
  }, [stub]);

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
          Processing... ({Object.values(outputs).filter(Boolean).length}/4 ready)
        </div>
      )}

      <div style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: "1rem",
      }}>
        {VIDEOS.map(([key, suffix, label]) => (
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
                style={{
                  width: "100%",
                  background: "#000",
                  border: "1px solid var(--border)",
                }}
                src={`${BASE}/static/${stub}/${stub}_${suffix}.mp4`}
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
    </div>
  );
}
