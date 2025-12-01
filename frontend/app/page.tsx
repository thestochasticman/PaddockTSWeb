
"use client";

import MapPanel from "./components/MapPanel";
import SearchResultsToggle from "./components/SearchResultsToggle";

export default function HomePage() {
  return (
    <div className="fixed inset-0 flex flex-col bg-neutral-950 text-white">
      {/* Top bar with title + toggle */}
      <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-2 text-xs">
        <div className="font-semibold text-neutral-400">
          PaddockTS
        </div>
        <SearchResultsToggle />
      </div>

      {/* Main content: search (left) + map (right) */}
      <div className="flex flex-1 min-h-0">
        {/* LEFT: fixed-width query panel */}
        {/* <div className="w-[340px] border-r border-neutral-800">
          <QueryPanel />
        </div> */}

        {/* RIGHT: map + bbox/time UI */}
        <div className="flex-1 relative">
          <MapPanel />
        </div>
      </div>
    </div>
  );
}
