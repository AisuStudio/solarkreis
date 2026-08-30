/*
  Die Leiste über allem. Dunkel, damit der Canvas darunter als Fläche liest.

  Zur Farbe: auf Ink misst der Sekundärton cortado nur 2,88:1 und fällt durch.
  Der inaktive Punkt trägt deshalb hazelnut — 6,13:1 auf Ink, obwohl derselbe
  Ton auf hellem Grund nur 2,24:1 hätte und dort nie Text tragen dürfte.
  Ein Token, zwei Gründe, je nach Untergrund.

  Klickfläche: der Text allein wäre 14px hoch. 2.5.8 verlangt 24×24, deshalb
  sitzt das Padding am Link, nicht am Container.
*/

import Link from "next/link";

const PUNKTE = [
  { href: "/simulation", label: "Simulation" },
  { href: "/doku", label: "Dokumentation" },
];

export function TopNav({ aktiv }: { aktiv?: string }) {
  return (
    <nav
      aria-label="Hauptnavigation"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 28,
        height: 56,
        padding: "0 40px",
        background: "var(--color-text)",
      }}
    >
      <Link
        href="/"
        className="sk-mono-wortmarke"
        style={{ color: "var(--color-bg)", textDecoration: "none", marginRight: 28 }}
      >
        SolarKreis
      </Link>

      {PUNKTE.map((p) => {
        const ist = aktiv === p.href;
        return (
          <Link
            key={p.href}
            href={p.href}
            aria-current={ist ? "page" : undefined}
            className="sk-text-label"
            style={{
              color: ist ? "var(--color-bg)" : "var(--color-hazelnut)",
              textDecoration: "none",
              padding: "6px 4px",
              minHeight: 24,
              display: "inline-flex",
              alignItems: "center",
            }}
          >
            {p.label}
          </Link>
        );
      })}
    </nav>
  );
}
