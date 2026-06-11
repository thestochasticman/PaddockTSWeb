"use client";

import { APIProvider } from "@vis.gl/react-google-maps";
import { apiKey } from "../components/api";
import ReactMap from "../components/map/ReactMap";

// Map view. The query controls live in the shared (app) layout; the map and
// the bar communicate through mapStore (bbox sync + draw requests), so no
// props/refs cross between them.
export default function HomePage() {
  return (
    <APIProvider apiKey={apiKey}>
      <div className="crt-map-container">
        <ReactMap />
      </div>
    </APIProvider>
  );
}
