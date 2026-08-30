import Link from "next/link";

export default function Home() {
  return (
    <main style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "var(--sp-4xl) var(--gutter)" }}>
      <div className="wf-eyebrow" style={{ marginBottom: "var(--sp-sm)" }}>Schritt 1 von 10</div>
      <h1>SolarKreis</h1>
      <p style={{ color: "var(--color-muted)", maxWidth: "62ch", marginTop: "var(--sp-md)" }}>
        Gerüst und Designebene stehen. Simulation und Dokumentation kommen als Nächstes.
      </p>
      <p style={{ marginTop: "var(--sp-lg)" }}>
        <Link href="/ds">Designebene ansehen →</Link>
      </p>
    </main>
  );
}
