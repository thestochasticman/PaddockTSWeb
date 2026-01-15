"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type CalendarImage = {
  date: string;
  week: number;
  image: string;
};

type PaddockData = {
  [year: string]: {
    [month: string]: CalendarImage[];
  };
};

type CalendarPayload = {
  meta: {
    stub: string;
    start_date: string;
    end_date: string;
    thumbnail_size: [number, number];
    total_weeks: number;
  };
  paddocks: {
    [paddockId: string]: PaddockData;
  };
};

type Props = {
  jobId: string;
  apiBase: string;
};

const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

const MONTH_SLOTS = 6;

function fitToSlots(images: CalendarImage[], slots: number): (CalendarImage | null)[] {
  const n = Math.max(1, slots);

  if (images.length === 0) {
    // no data: keep structure constant
    return Array.from({ length: n }, () => null);
  }

  // undersample: pick evenly spaced indices INCLUDING endpoints
  if (images.length >= n) {
    if (n === 1) return [images[0]];
    const last = images.length - 1;

    return Array.from({ length: n }, (_, i) => {
      const t = i / (n - 1); // 0..1
      const idx = Math.round(t * last);
      return images[idx];
    });
  }

  // oversample: repeat cyclically
  return Array.from({ length: n }, (_, i) => images[i % images.length]);
}

export default function CalendarPanel({ jobId, apiBase }: Props) {
  const [payload, setPayload] = useState<CalendarPayload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selectedPaddock, setSelectedPaddock] = useState<string>("");
  const [hoveredImage, setHoveredImage] = useState<CalendarImage | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(null);
  const sectionRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setError(null);
        const url = `${apiBase}/static/${jobId}/${jobId}_calendar.json?v=${jobId}`;
        const res = await fetch(url, { cache: "no-store" });

        if (!res.ok) {
          throw new Error(`Calendar JSON not found (${res.status})`);
        }

        const json = (await res.json()) as CalendarPayload;

        if (!cancelled) {
          setPayload(json);

          const paddockIds = Object.keys(json.paddocks);
          if (paddockIds.length > 0 && !selectedPaddock) {
            setSelectedPaddock(paddockIds[0]);
          }
        }
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? "Failed to load calendar data");
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [jobId, apiBase]);

  const paddockIds = useMemo(() => {
    if (!payload) return [];
    return Object.keys(payload.paddocks).sort((a, b) => {
      const numA = parseInt(a, 10);
      const numB = parseInt(b, 10);
      if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
      return a.localeCompare(b);
    });
  }, [payload]);

  const paddockData = useMemo(() => {
    if (!payload || !selectedPaddock) return null;
    return payload.paddocks[selectedPaddock];
  }, [payload, selectedPaddock]);

  const years = useMemo(() => {
    if (!paddockData) return [];
    // Filter out years that have no images at all
    return Object.keys(paddockData)
      .filter((year) => {
        const yearData = paddockData[year];
        // Check if any month in this year has images
        return Object.values(yearData).some((monthImages) => monthImages.length > 0);
      })
      .sort();
  }, [paddockData]);

  const getImageUrl = (imagePath: string) => `${apiBase}/static/${jobId}/${imagePath}`;

  return (
    <section className="pv-root relative" ref={sectionRef}>
      <div className="border border-neutral-800 bg-neutral-950/30">
        {/* Header */}
        <div className="flex items-start justify-between gap-3 p-3 pb-2 border-b border-neutral-800/50">
          <div className="text-[14px] uppercase tracking-wide text-neutral-300">
            Paddock Calendar View
          </div>

          {payload && paddockIds.length > 0 && (
            <div className="flex items-center gap-2">
              <label className="text-[12px] text-neutral-300">Paddock:</label>
              <select
                value={selectedPaddock}
                onChange={(e) => setSelectedPaddock(e.target.value)}
                className="text-[13px] px-2 py-1 border border-neutral-700 bg-neutral-900 text-neutral-200"
              >
                {paddockIds.map((id) => (
                  <option key={id} value={id}>
                    Paddock {id}
                  </option>
                ))}
              </select>
            </div>
          )}
        </div>

        {/* Content - auto height */}
        <div className="p-3 pt-2">
          {error && (
            <div className="text-sm text-red-400 py-4 text-center border border-red-900/50 bg-red-950/20">
              {error}
            </div>
          )}

          {payload && paddockData && years.length > 0 && (
            <div className="w-full">
              <div className="grid grid-cols-[auto_repeat(12,1fr)] gap-0">
                {/* Header row */}
                <div className="text-neutral-300 text-[13px] px-1" />
                {MONTH_NAMES.map((month) => (
                  <div key={month} className="text-left text-neutral-300 text-[13px]">
                    {month}
                  </div>
                ))}

                {/* Data rows */}
                {years.map((year) => (
                  <div key={year} className="contents">
                    <div className="text-neutral-300 text-[13px] px-1 flex items-center">
                      {year}
                    </div>

                    {Array.from({ length: 12 }, (_, i) => i + 1).map((month) => {
                      const monthKey = String(month).padStart(2, "0");
                      const images = paddockData[year]?.[monthKey] || [];
                      const shown = fitToSlots(images, MONTH_SLOTS);

                      return (
                        <div key={`${year}-${monthKey}`} className="grid grid-cols-6 gap-px">
                          {shown.map((img, idx) => {
                            if (!img) {
                              return (
                                <div
                                  key={`${year}-${monthKey}-empty-${idx}`}
                                  className="aspect-square w-full bg-neutral-950/20 border border-neutral-900/40"
                                />
                              );
                            }

                            return (
                              <div
                                key={`${year}-${monthKey}-${idx}`}
                                className="relative group aspect-square w-full"
                                onMouseEnter={(e) => {
                                  setHoveredImage(img);
                                  setMousePos({ x: e.clientX, y: e.clientY });
                                }}
                                onMouseMove={(e) => {
                                  setMousePos({ x: e.clientX, y: e.clientY });
                                }}
                                onMouseLeave={() => {
                                  setHoveredImage(null);
                                  setMousePos(null);
                                }}
                              >
                                <img
                                  src={getImageUrl(img.image)}
                                  alt={img.date}
                                  className="w-full h-full object-cover hover:opacity-80 transition-opacity cursor-pointer"
                                  loading="lazy"
                                />
                                <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-1.5 py-0.5 bg-neutral-800 text-neutral-200 text-[12px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-20">
                                  {img.date}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      );
                    })}
                  </div>
                ))}
              </div>
            </div>
          )}

          {payload && years.length === 0 && (
            <div className="text-sm text-neutral-500 py-4 text-center">
              No calendar data available for this paddock
            </div>
          )}

          {!payload && !error && (
            <div className="text-sm text-neutral-300 py-8 text-center">
              Loading calendar data...
            </div>
          )}
        </div>
      </div>

      {/* Enlarged preview on hover - positioned near cursor */}
      {hoveredImage && mousePos && (
        <div
          className="fixed p-3 bg-neutral-900 border border-neutral-600 shadow-2xl pointer-events-none"
          style={{
            zIndex: 9999,
            left: mousePos.x + 20,
            top: mousePos.y - 140,
            transform: "translateY(-50%)",
          }}
        >
          <img
            src={getImageUrl(hoveredImage.image)}
            alt={hoveredImage.date}
            className="w-48 h-48 object-contain"
          />
          <div className="text-center text-[12px] text-neutral-200 mt-2 font-medium">
            {hoveredImage.date} (Week {hoveredImage.week})
          </div>
        </div>
      )}
    </section>
  );
}
