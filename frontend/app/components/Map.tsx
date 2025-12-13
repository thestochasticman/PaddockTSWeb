"use client";

import { useEffect } from "react";
import Script from "next/script";
import { apiKey } from "./API";

export default function Map() {
  useEffect(() => {
    if (typeof window === "undefined") return;

    let cancelled = false;

    const tryInit = () => {
      if (cancelled) return;

      const w = window as any;

      if (w.google?.maps && typeof w.initMap === "function") {
        w.initMap(); // idempotent (we’ll fix gmap_init.js below)
        w.forceMapResize?.(); // optional helper we’ll add
        return;
      }

      setTimeout(tryInit, 50);
    };

    tryInit();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!apiKey) {
    return (
      <div className="flex h-full w-full items-center justify-center text-sm text-neutral-400">
        Set NEXT_PUBLIC_GOOGLE_MAPS_API_KEY in .env.local
      </div>
    );
  }

  return (
    <>
      <Script id="gmap-init" src="/PaddockTS/gmap_init.js" strategy="afterInteractive" />
      <Script
        id="gmaps-api"
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing`}
        strategy="afterInteractive"
      />

      {/* fill parent reliably */}
      <div id="map" className="absolute inset-0" />
    </>
  );
}

