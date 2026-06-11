"use client";

import { useEffect, useRef, useCallback } from "react";
import { useMap } from "@vis.gl/react-google-maps";
import { getBBox, setBBox, subscribe, subscribeDraw } from "./mapStore";
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

function cornersToBounds(
  a: google.maps.LatLng,
  b: google.maps.LatLng
): google.maps.LatLngBoundsLiteral {
  return {
    north: Math.max(a.lat(), b.lat()),
    south: Math.min(a.lat(), b.lat()),
    east: Math.max(a.lng(), b.lng()),
    west: Math.min(a.lng(), b.lng()),
  };
}

export function useDrawingManager() {
  const map = useMap();

  const rectRef = useRef<google.maps.Rectangle | null>(null);
  const suppressStoreRef = useRef(false);
  // Cleanup callbacks for an in-progress draw interaction.
  const drawCleanupRef = useRef<Array<() => void>>([]);

  const clearDrawListeners = useCallback(() => {
    drawCleanupRef.current.forEach((fn) => fn());
    drawCleanupRef.current = [];
  }, []);

  // Sync rectangle bounds → mapStore
  const syncRectToStore = useCallback(() => {
    const rect = rectRef.current;
    if (!rect) return;
    const bounds = rect.getBounds();
    if (!bounds) return;
    setBBox(boundsToSelection(bounds), "map");
  }, []);

  // Sync the rectangle back to the store on user edits/drags
  const attachRectListeners = useCallback(
    (rect: google.maps.Rectangle) => {
      rect.addListener("bounds_changed", () => {
        if (!suppressStoreRef.current) syncRectToStore();
      });
    },
    [syncRectToStore]
  );

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
        attachRectListeners(rect);
      }

      if (fitMap) {
        map.fitBounds(bounds, 40);
      }
    },
    [map, attachRectListeners]
  );

  // Restore persisted bbox + subscribe to panel-driven bbox changes
  useEffect(() => {
    if (!map) return;

    const initial = getBBox();
    if (initial) applyBBoxToRect(initial);

    const unsub = subscribe((bbox, source) => {
      if (source === "panel") applyBBoxToRect(bbox);
    });

    return () => {
      unsub();
      clearDrawListeners();
      if (rectRef.current) {
        rectRef.current.setMap(null);
        rectRef.current = null;
      }
    };
  }, [map, applyBBoxToRect, clearDrawListeners]);

  // Manual rectangle drawing — google.maps.drawing.DrawingManager was removed
  // in Maps JS API v3.65, so we drive the interaction with map mouse events.
  const enableRectangleSelection = useCallback(() => {
    if (!map) return;

    // Cancel any in-progress draw before starting a new one.
    clearDrawListeners();

    // Enter drawing mode: crosshair cursor + disable panning so the drag
    // sketches a rectangle instead of moving the map.
    map.setOptions({ draggable: false, draggableCursor: "crosshair" });

    let startLatLng: google.maps.LatLng | null = null;
    let dragging = false;

    const finishDraw = () => {
      clearDrawListeners();
      map.setOptions({ draggable: true, draggableCursor: null });
    };

    const downListener = map.addListener(
      "mousedown",
      (e: google.maps.MapMouseEvent) => {
        if (!e.latLng) return;
        startLatLng = e.latLng;
        dragging = true;

        // Discard any existing rectangle and start fresh.
        if (rectRef.current) {
          rectRef.current.setMap(null);
          rectRef.current = null;
        }

        // clickable:false lets mousemove keep reaching the map while the
        // cursor is over the growing rectangle.
        rectRef.current = new google.maps.Rectangle({
          bounds: cornersToBounds(startLatLng, startLatLng),
          map,
          ...RECT_STYLE,
          editable: false,
          draggable: false,
          clickable: false,
        });
      }
    );

    const moveListener = map.addListener(
      "mousemove",
      (e: google.maps.MapMouseEvent) => {
        if (!dragging || !startLatLng || !e.latLng || !rectRef.current) return;
        suppressStoreRef.current = true;
        rectRef.current.setBounds(cornersToBounds(startLatLng, e.latLng));
        suppressStoreRef.current = false;
      }
    );

    // Finalize on document mouseup so releasing outside the map still ends
    // the draw (avoids getting stuck in crosshair / non-draggable mode).
    const onDocUp = () => {
      if (!dragging) return;
      dragging = false;

      const rect = rectRef.current;
      finishDraw();
      if (!rect) return;

      const bounds = rect.getBounds();
      // A click without a drag yields a degenerate rectangle — discard it.
      if (!bounds || bounds.getNorthEast().equals(bounds.getSouthWest())) {
        rect.setMap(null);
        rectRef.current = null;
        return;
      }

      // Now that drawing is done, make it editable/draggable + sync.
      rect.setOptions({ editable: true, draggable: true, clickable: true });
      attachRectListeners(rect);
      setBBox(boundsToSelection(bounds), "map");
      map.fitBounds(bounds, 40);
    };
    document.addEventListener("mouseup", onDocUp);

    drawCleanupRef.current = [
      () => downListener.remove(),
      () => moveListener.remove(),
      () => document.removeEventListener("mouseup", onDocUp),
    ];
  }, [map, attachRectListeners, clearDrawListeners]);

  // Let the (persistent) query bar trigger drawing via mapStore, replaying any
  // request that was latched while no map was mounted.
  useEffect(() => {
    if (!map) return;
    return subscribeDraw(() => enableRectangleSelection());
  }, [map, enableRectangleSelection]);

  return { enableRectangleSelection };
}
