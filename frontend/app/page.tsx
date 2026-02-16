"use client";

import { useRef } from "react";
import { APIProvider } from "@vis.gl/react-google-maps";
import { apiKey } from "./components/api";
import TopBar from "./components/ui/TopBar";
import QueryPanel from "./components/query/QueryPanel";
import ReactMap, { type ReactMapHandle } from "./components/map/ReactMap";

export default function HomePage() {
  const mapRef = useRef<ReactMapHandle>(null);

  return (
    <APIProvider apiKey={apiKey} libraries={["drawing"]}>
      <div className="crt-root">
        <TopBar />
        <div className="crt-main">
          <QueryPanel
            onSelectArea={() => mapRef.current?.enableRectangleSelection()}
          />
          <div className="crt-map-container">
            <ReactMap ref={mapRef} />
          </div>
        </div>
      </div>
    </APIProvider>
  );
}
