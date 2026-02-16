"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap, useMapsLibrary } from "@vis.gl/react-google-maps";
import { getBBox, setBBox, subscribe } from "./mapStore";
import type { Selection } from "../types";

const RECT_STYLE = {
  strokeColor: "#00FFFF",
  strokeOpacity: 0.9,
  strokeWeight: 2,
  fillColor: "#00FFFF",
  fillOpacity: 0.08,
  editable: true,
  draggable: true,
};

function boundsToSelection(bounds: google.maps.LatLngBounds): Selection {
  const ne = bounds.getNorthEast();
  const sw = bounds.getSouthWest();
  return {
    north: ne.lat(),
    south: sw.lat(),
    east: ne.lng(),
    west: sw.lng(),
  };
}

function selectionToBounds(sel: Selection): google.maps.LatLngBoundsLiteral {
  return {
    north: sel.north,
    south: sel.south,
    east: sel.east,
    west: sel.west,
  };
}

export function useDrawingManager() {
  const map = useMap();
  const drawing = useMapsLibrary("drawing");

  const managerRef = useRef<google.maps.drawing.DrawingManager | null>(null);
  const rectRef = useRef<google.maps.Rectangle | null>(null);
  const suppressStoreRef = useRef(false);

  // Sync rectangle bounds → mapStore
  const syncRectToStore = useCallback(() => {
    const rect = rectRef.current;
    if (!rect) return;
    const bounds = rect.getBounds();
    if (!bounds) return;
    setBBox(boundsToSelection(bounds), "map");
  }, []);

  // Apply a Selection to the current rectangle (or create one), then fit map
  const applyBBoxToRect = useCallback(
    (sel: Selection, fitMap = true) => {
      if (!map) return;
      const bounds = selectionToBounds(sel);

      if (rectRef.current) {
        suppressStoreRef.current = true;
        rectRef.current.setBounds(bounds);
        suppressStoreRef.current = false;
      } else {
        const rect = new google.maps.Rectangle({
          bounds,
          map,
          ...RECT_STYLE,
        });
        rectRef.current = rect;
        rect.addListener("bounds_changed", () => {
          if (!suppressStoreRef.current) syncRectToStore();
        });
      }

      if (fitMap) {
        map.fitBounds(bounds, 40);
      }
    },
    [map, syncRectToStore]
  );

  // Initialize DrawingManager + restore persisted bbox
  useEffect(() => {
    if (!map || !drawing) return;

    const dm = new drawing.DrawingManager({
      drawingMode: null,
      drawingControl: false,
      rectangleOptions: RECT_STYLE,
    });
    dm.setMap(map);
    managerRef.current = dm;

    // When user finishes drawing a rectangle
    const listener = dm.addListener(
      "overlaycomplete",
      (e: google.maps.drawing.OverlayCompleteEvent) => {
        if (e.type !== google.maps.drawing.OverlayType.RECTANGLE) return;

        // Remove old rectangle
        if (rectRef.current) rectRef.current.setMap(null);

        const rect = e.overlay as google.maps.Rectangle;
        rectRef.current = rect;

        // Sync on draw complete + fit map
        const bounds = rect.getBounds();
        if (bounds) {
          setBBox(boundsToSelection(bounds), "map");
          map.fitBounds(bounds, 40);
        }

        // Sync on subsequent edits/drags
        rect.addListener("bounds_changed", () => {
          if (!suppressStoreRef.current) syncRectToStore();
        });

        dm.setDrawingMode(null);
      }
    );

    // Restore persisted bbox
    const initial = getBBox();
    if (initial) applyBBoxToRect(initial);

    // Subscribe to panel-driven bbox changes
    const unsub = subscribe((bbox, source) => {
      if (source === "panel") applyBBoxToRect(bbox);
    });

    return () => {
      listener.remove();
      unsub();
      dm.setMap(null);
      if (rectRef.current) {
        rectRef.current.setMap(null);
        rectRef.current = null;
      }
      managerRef.current = null;
    };
  }, [map, drawing, applyBBoxToRect, syncRectToStore]);

  const enableRectangleSelection = useCallback(() => {
    if (!managerRef.current) return;
    managerRef.current.setDrawingMode(
      google.maps.drawing.OverlayType.RECTANGLE
    );
  }, []);

  return { enableRectangleSelection };
}
