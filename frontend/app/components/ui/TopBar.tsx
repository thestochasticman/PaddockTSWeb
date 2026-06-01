import Link from "next/link";

type Props = {
  /** Optional content shown centered in the top bar (e.g. the stub on the
   *  results page). */
  center?: React.ReactNode;
  /** Optional content shown on the right, before the Features link. */
  right?: React.ReactNode;
};

export default function TopBar({ center, right }: Props) {
  return (
    <div
      className="crt-topbar"
      style={{
        display: "grid",
        gridTemplateColumns: "1fr auto 1fr",
        alignItems: "center",
        gap: "1rem",
      }}
    >
      <Link
        href="/"
        className="crt-logo"
        style={{ textDecoration: "none", color: "var(--text-primary)", justifySelf: "start" }}
      >
        PaddockTS
      </Link>
      <div
        style={{
          textAlign: "center",
          fontFamily: "monospace",
          fontSize: "0.9rem",
          color: "var(--text-primary)",
        }}
      >
        {center}
      </div>
      <nav
        style={{
          display: "flex",
          gap: "1rem",
          alignItems: "center",
          justifySelf: "end",
        }}
      >
        {right}
        <Link
          href="/features"
          style={{
            fontSize: "0.8rem",
            color: "var(--text-secondary)",
            textDecoration: "none",
            border: "1px solid var(--border)",
            padding: "0.3rem 0.75rem",
          }}
        >
          Features
        </Link>
      </nav>
    </div>
  );
}
