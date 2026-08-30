/*
  Die Introseite. Text und Aufbau aus dem Figma-Entwurf F.

  Der Hero ist die Komponente aus `components/Hero.tsx`. Der Prototyp
  `public/hero.html` bleibt als eine Datei liegen, damit man beide
  nebeneinander halten kann.
*/

import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { Hero } from "@/components/Hero";

export const metadata = {
  title: "SolarKreis — Monitoring-Simulation mit echten Inputs",
  description:
    "Drei simulierte Solarparks um eine Zentrale, gespeist mit echten Wetter-, Preis- und Feuerdaten. Read-only-Monitoring mit sicherem Schreibpfad.",
};

const PHASEN = [
  {
    n: "Phase 1",
    t: "Ideate & Scope",
    u: "Was gebaut wird — und vor allem, was nicht.",
    s: [
      ["01", "Ideen, Umfang, Technik und Infrastruktur durchsprechen, scopen, Ablauf festlegen"],
      ["02", "Zugänge besorgen: NASA-FIRMS-Schlüssel, Quellen prüfen"],
    ],
  },
  {
    n: "Phase 2",
    t: "Plan & Sketch",
    u: "Erst das Modell, dann das Bild.",
    s: [
      ["03", "Datenstruktur der Actors aufbauen und gegen echte Feeds rechnen"],
      ["04", "Figma-Wireframe und Design-System, mehrfach überarbeitet, a11y-Test"],
      ["05", "Doku- und Introseite in Figma, ebenfalls iteriert"],
    ],
  },
  {
    n: "Phase 3",
    t: "Build & Document",
    u: "Läuft es, und hält es der Prüfung stand?",
    s: [
      ["06", "Code, Tests, Prüfläufe lokal"],
      ["07", "Push auf GitHub"],
    ],
  },
] as const;

const RAUS = [
  ["Verkehrsmelder an der A9", "Schnittstelle frei nutzbar — führt aber zu keinem Kommando"],
  ["Blendungs-Alarm", "Gebaut, Jahr durchgerechnet: null Blendfenster"],
  ["Mehrtagesspeicher (Eisen-Luft)", "Richtige Technik, aber es gibt keine Verbraucher im Modell"],
  ["Verweis auf ein zweites Projekt", "Lenkt in einer Arbeitsprobe vom Gegenstand ab"],
  ["Roher Feuer-Feed ohne Schwelle", "Hätte in fünf Tagen 101-mal ausgelöst"],
  ["Batteriespeicher", "Blieb als einziges — der einzige Eingriff, der etwas herstellt"],
] as const;

export default function Startseite() {
  return (
    <>
      <TopNav aktiv="/" />
      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--sp-3xl) var(--gutter) var(--sp-4xl)" }}>
        <div className="sk-mono-eyebrow" style={{ color: "var(--color-accent)" }}>SolarKreis</div>
        <h1 className="sk-titel-schlagzeile" style={{ marginTop: "var(--sp-sm)", maxWidth: "16ch" }}>
          Monitoring-Simulation mit echten Inputs
        </h1>
        <p className="sk-text-vorspann" style={{ color: "var(--color-muted)", maxWidth: "52ch", marginTop: "var(--sp-md)" }}>
          Drei simulierte Solarparks um eine Zentrale, gespeist mit echten Wetter-, Preis- und
          Feuerdaten. Gebaut, um ein Muster zu zeigen: wie aus einer Anzeige, die nur liest,
          ein System wird, das kommuniziert und kontrolliert eingreifen kann.
        </p>

        <div style={{ marginTop: "var(--sp-xl)" }}>
          <Hero />
        </div>

        <div style={{ display: "flex", gap: "var(--sp-md)", marginTop: "var(--sp-lg)", flexWrap: "wrap" }}>
          <Link href="/simulation" className="wf-btn wf-btn-primary" style={{ padding: "10px 18px", borderRadius: "var(--radius-sm)" }}>
            Simulation ansehen
          </Link>
          <Link href="/doku" className="wf-btn wf-btn-secondary" style={{ padding: "10px 18px", borderRadius: "var(--radius-sm)" }}>
            Dokumentation lesen
          </Link>
        </div>

        <Abschnitt n="01" t="Die Idee">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--sp-lg)" }}>
            <Block t="Agri-PV an der Autobahn">
              Hier wird nicht nur die Sonne, sondern auch der Schatten genutzt. Das war mein
              Gedanke in den Sommerferien. Denn entlang der Autobahn stehen reihenweise
              Photovoltaik-Anlagen über Ackerflächen, teilweise mit Weidetieren.
            </Block>
            <Block t="Eine Stellenanzeige als Anlass">
              Gesucht war jemand, der einen Prototypen allein produktiv macht: Schreibzugriffe,
              ein Datenmodell über mehrere Herstellersysteme, automatisierte Abläufe. Genau
              diese drei sind der Bauplan hier.
            </Block>
            <Block t="Was noch einfloss">
              Die Idee einer Eisenbatterie stammt aus einem Fachartikel, das Thema Waldbrand
              aus meiner{" "}
              <a href="https://fireontheland.org">Graphic Novel</a> über Feuer in der borealen Zone.
            </Block>
          </div>
        </Abschnitt>

        <Abschnitt n="02" t="Wie ich arbeite">
          <blockquote
            className="sk-titel-zwischen"
            style={{ margin: 0, paddingLeft: "var(--sp-lg)", borderLeft: "3px solid var(--color-accent)", maxWidth: "34ch" }}
          >
            Ich bringe erst alles zusammen, was ich weiß. Dann messe ich, was davon trägt.
          </blockquote>
          <p className="sk-text-fliess" style={{ color: "var(--color-muted)", maxWidth: "62ch", marginTop: "var(--sp-md)" }}>
            Fünf von sechs Zusatzideen sind an einer Messung gescheitert, nicht an einer Meinung.
            Die Belege stehen jeweils daneben — auch dort, wo sie meiner eigenen Annahme
            widersprochen haben.
          </p>
        </Abschnitt>

        <Abschnitt n="03" t="Der Sprint">
          <p className="sk-text-fliess" style={{ color: "var(--color-muted)", maxWidth: "62ch" }}>
            Gebaut mit Claude Code und dem Figma-MCP. Entwürfe und Code entstehen im selben
            Werkzeug, deshalb sind Wireframe und Repo nie auseinandergelaufen.
          </p>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--sp-lg)", marginTop: "var(--sp-lg)" }}>
            {PHASEN.map((p, i) => (
              <div
                key={p.n}
                style={{
                  border: "1px solid var(--color-muted)",
                  borderRadius: "var(--radius-md)",
                  padding: "var(--sp-md)",
                  background: i === 2 ? "var(--color-text)" : "var(--sk-canvas-bg)",
                  color: i === 2 ? "var(--color-bg)" : "var(--color-text)",
                }}
              >
                <div className="sk-mono-eyebrow" style={{ color: i === 2 ? "var(--color-hazelnut)" : "var(--color-accent)" }}>{p.n}</div>
                <div className="sk-titel-phase" style={{ marginTop: 2 }}>{p.t}</div>
                <div className="sk-text-label" style={{ color: i === 2 ? "var(--color-hazelnut)" : "var(--color-muted)", marginTop: 2 }}>{p.u}</div>
                <ol style={{ listStyle: "none", padding: 0, margin: "var(--sp-md) 0 0", display: "grid", gap: "var(--sp-sm)" }}>
                  {p.s.map(([n, t]) => (
                    <li key={n} style={{ display: "grid", gridTemplateColumns: "22px 1fr", gap: "var(--sp-sm)" }}>
                      <span className="sk-mono-daten" style={{ color: i === 2 ? "var(--color-hazelnut)" : "var(--color-muted)" }}>{n}</span>
                      <span className="sk-text-kompakt">{t}</span>
                    </li>
                  ))}
                </ol>
              </div>
            ))}
          </div>
        </Abschnitt>

        <Abschnitt n="04" t="Was rausflog — und was blieb">
          <ul style={{ listStyle: "none", padding: 0, margin: 0, maxWidth: 900 }}>
            {RAUS.map(([t, g]) => (
              <li
                key={t}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(180px, 280px) 1fr",
                  gap: "var(--sp-md)",
                  padding: "var(--sp-sm) 0",
                  borderBottom: "1px solid var(--color-surface)",
                }}
              >
                <span className="sk-text-titel-klein">{t}</span>
                <span className="sk-text-kompakt" style={{ color: "var(--color-muted)" }}>{g}</span>
              </li>
            ))}
          </ul>
        </Abschnitt>

        <footer style={{ marginTop: "var(--sp-3xl)", display: "flex", gap: "var(--sp-2xl)", flexWrap: "wrap" }}>
          <Fuss t="Code auf GitHub ↗" u="github.com/AisuStudio/solarkreis" href="https://github.com/AisuStudio/solarkreis" />
          <Fuss t="Hero als eine Datei ↗" u="public/hero.html" href="/hero.html" />
          <Fuss t="Datenquellen ↗" u="was gerade wirklich antwortet" href="/datenquellen" />
        </footer>
      </main>
    </>
  );
}

function Abschnitt({ n, t, children }: { n: string; t: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: "var(--sp-3xl)" }}>
      <div className="sk-mono-eyebrow" style={{ color: "var(--color-accent)" }}>{n}</div>
      <h2 className="sk-titel-abschnitt" style={{ marginTop: 2, marginBottom: "var(--sp-lg)" }}>{t}</h2>
      {children}
    </section>
  );
}

function Block({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="sk-text-titel">{t}</h3>
      <p className="sk-text-fliess" style={{ color: "var(--color-muted)", marginTop: 2 }}>{children}</p>
    </div>
  );
}

function Fuss({ t, u, href }: { t: string; u: string; href: string }) {
  return (
    <div>
      <a className="sk-text-titel-klein" href={href}>{t}</a>
      <div className="sk-mono-daten" style={{ color: "var(--color-muted)" }}>{u}</div>
    </div>
  );
}
