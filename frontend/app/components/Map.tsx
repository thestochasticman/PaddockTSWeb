"use client";
import { useEffect } from "react";
import Script from "next/script";
import { apiKey } from "./API";

export default function Map() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    const w = window as any;

    if (w.google && w.google.maps && typeof w.initMap === "function") {
      w.initMap();
    }
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
      {/* 1. custom Google Maps init script */}
      <Script src="/gmap_init.js" strategy="afterInteractive" />

      {/* 2. Load Google Maps JS API – will call window.initMap when ready */}
      <Script
        src={`https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=drawing&callback=initMap`}
        strategy="afterInteractive"
      />

      {/* 3. Map only – parent layout decides where this sits */}
      <div id="map" className="w-full h-full" />
    </>
  );
}

