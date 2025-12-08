"use client";

import Map from "./components/Map";
import { MapQueryPanel } from "./components/MapQueryPanel";
import SearchResultsToggle from "./components/SearchResultsToggle";

export default function HomePage() {
  return (
    <div className="app-root">
      {/* Top bar with title + toggle */}
      <div className="app-topbar">
        <div className="app-title">PaddockTS</div>
        <SearchResultsToggle />
      </div>

      {/* Main content: search (left) + map (right) */}
      <div className="app-main">
        {/* LEFT: fixed-width query panel */}
        <div className="app-left">
          <MapQueryPanel />
        </div>

        {/* RIGHT: map */}
        <div className="app-main-right">
          <Map />
        </div>
      </div>
    </div>
  );
}
