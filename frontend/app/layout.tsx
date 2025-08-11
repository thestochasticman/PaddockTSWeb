import "./globals.css";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "PaddocKTS",
  description: "Prototype",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container py-8">
          <header className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl font-semibold">PaddockTS</h1>
            <nav className="space-x-2">
              <a className="btn" href="/">Home</a>
              <a className="btn" href="/about">About</a>
            </nav>
          </header>
          {children}
          <footer className="mt-12 text-sm text-neutral-400">Prototype • Next.js + FastAPI</footer>
        </div>
      </body>
    </html>
  );
}
