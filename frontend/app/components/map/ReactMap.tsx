"use client";

import { Map } from "@vis.gl/react-google-maps";
import { useDrawingManager } from "./useDrawingManager";

// Must be a child of <Map> so useMap() works. Drawing is triggered through
// mapStore.requestDraw() (see useDrawingManager), so no ref plumbing is needed.
function DrawingLayer() {
  useDrawingManager();
  return null;
}

export default function ReactMap() {
  return (
    <Map
      defaultCenter={{ lat: -33.5, lng: 148.5 }}
      defaultZoom={5}
      mapTypeId="hybrid"
      gestureHandling="greedy"
      className="w-full h-full"
      disableDefaultUI={false}
      mapTypeControl
      zoomControl
    >
      <DrawingLayer />
    </Map>
  );
}
