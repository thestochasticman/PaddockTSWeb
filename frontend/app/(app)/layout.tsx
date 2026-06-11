"use client";

import QueryBar from "../components/query/QueryBar";

// Shared layout for the map view (/) and the results view (/results/[stub]).
// In the App Router a layout persists across navigation between its child
// routes, so the QueryBar mounted here keeps its state across that move.
// The bar doubles as the top bar (logo + nav live inside it).
export default function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="crt-root">
      <QueryBar />
      <div className="crt-main">{children}</div>
    </div>
  );
}
