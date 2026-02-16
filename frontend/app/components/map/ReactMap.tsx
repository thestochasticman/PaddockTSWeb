"use client";

import { forwardRef, useImperativeHandle } from "react";
import { Map } from "@vis.gl/react-google-maps";
import { useDrawingManager } from "./useDrawingManager";

export type ReactMapHandle = {
  enableRectangleSelection: () => void;
};

// Must be a child of <Map> so useMap() works
const DrawingLayer = forwardRef<ReactMapHandle>(function DrawingLayer(
  _props,
  ref
) {
  const { enableRectangleSelection } = useDrawingManager();

  useImperativeHandle(
    ref,
    () => ({ enableRectangleSelection }),
    [enableRectangleSelection]
  );

  return null;
});

const ReactMap = forwardRef<ReactMapHandle>(function ReactMap(_props, ref) {
  return (
    <Map
      defaultCenter={{ lat: -33.5, lng: 148.5 }}
      defaultZoom={5}
      mapTypeId="terrain"
      gestureHandling="greedy"
      className="w-full h-full"
      disableDefaultUI={false}
      mapTypeControl
      zoomControl
    >
      <DrawingLayer ref={ref} />
    </Map>
  );
});

export default ReactMap;
