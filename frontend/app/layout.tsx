import "./globals.css";
import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "PaddockTS Web",
  description: "Black / Red / Green theme",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="container py-8">
          <header className="mb-8 flex items-center justify-between">
            <h1 className="text-2xl gradient-title">PaddockTS Web</h1>
            <nav className="space-x-2">
              <Link className="btn btn-red" href="/">Home</Link>
              <Link className="btn btn-green" href="/about">About</Link>
            </nav>
          </header>
          {children}
          <footer className="mt-12 text-sm" style={{color: "var(--muted)"}}>
            Prototype • Next.js + FastAPI
          </footer>
        </div>
      </body>
    </html>
  );
}