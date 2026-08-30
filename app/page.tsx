/*
  Die Introseite.

  Umbau gegenüber dem Figma-Entwurf F, auf Doms Kritik an der ausgelieferten
  Fassung: zu laut, zu viel, zu klein, zu verschachtelt.

  Drei Eingriffe:

  1. Der Hero sitzt jetzt direkt unter der Navigation und bildet mit ihr
     zusammen den Kopfbereich. Titel und Vorspann stehen darunter. Vorher
     kam erst eine halbe Bildschirmhöhe Text, dann die Animation — wer die
     Seite öffnete, sah als Erstes eine Wand.

  2. Der Text ist von 581 auf rund 230 Wörter gekürzt. Weggefallen sind die
     sieben nummerierten Sprint-Schritte: sie stehen in der Dokumentation,
     wo jemand sie sucht, und nicht auf einer Seite, die in neunzig Sekunden
     überflogen wird.

  3. Kein Satz über 20 Wörter, keine Doppelpunkt-Verschachtelung.

  Die Schriftgrößen kommen aus der neubewerteten Skala in
  `type.solarkreis.css` — Fließtext 17 statt 14, Knöpfe 15 statt 12.
*/

import Link from "next/link";
import { TopNav } from "@/components/TopNav";
import { Hero } from "@/components/Hero";

export const metadata = {
  title: "SolarKreis — Monitoring-Simulation mit echten Inputs",
  description:
    "Drei simulierte Solarparks um eine Zentrale, gespeist mit echten Wetter-, Preis- und Feuerdaten. Read-only-Monitoring mit sicherem Schreibpfad.",
};

/* Die drei Phasen, nur noch als Namen. Die Schritte darunter standen vorher
   ausgeschrieben auf der Seite — 22 Zeilen in 13px, die niemand liest. */
const PHASEN = ["Ideate & Scope", "Plan & Sketch", "Build & Document"] as const;

const RAUS = [
  ["Verkehrsmelder an der A9", "Frei nutzbar — führt zu keinem Kommando"],
  ["Blendungs-Alarm", "Jahr durchgerechnet: null Blendfenster"],
  ["Mehrtagesspeicher", "Keine Verbraucher im Modell"],
  ["Verweis auf ein zweites Projekt", "Lenkt vom Gegenstand ab"],
  ["Roher Feuer-Feed ohne Schwelle", "Hätte in fünf Tagen 101-mal ausgelöst"],
  ["Batteriespeicher", "Blieb. Der einzige Eingriff, der etwas herstellt."],
] as const;

export default function Startseite() {
  return (
    <>
      <TopNav aktiv="/" />
      <Hero kopf />

      <main style={{ maxWidth: 1200, margin: "0 auto", padding: "var(--sp-2xl) var(--gutter) var(--sp-4xl)" }}>
        <h1 className="sk-titel-schlagzeile" style={{ margin: 0, maxWidth: "16ch" }}>
          Monitoring-Simulation mit echten Inputs
        </h1>
        <p className="sk-text-vorspann" style={{ color: "var(--color-muted)", maxWidth: "46ch", marginTop: "var(--sp-md)" }}>
          Drei simulierte Solarparks, gespeist mit echten Wetter-, Preis- und Feuerdaten.
          Aus einer Anzeige, die nur liest, wird ein System, das eingreifen darf.
        </p>

        <div style={{ display: "flex", gap: "var(--sp-md)", marginTop: "var(--sp-lg)", flexWrap: "wrap" }}>
          <Link href="/simulation" className="wf-btn wf-btn-primary sk-text-titel-klein" style={{ padding: "12px 20px", borderRadius: "var(--radius-sm)" }}>
            Simulation ansehen
          </Link>
          <Link href="/doku" className="wf-btn wf-btn-secondary sk-text-titel-klein" style={{ padding: "12px 20px", borderRadius: "var(--radius-sm)" }}>
            Dokumentation lesen
          </Link>
        </div>

        <Abschnitt n="01" t="Die Idee">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--sp-xl)" }}>
            <Block t="Agri-PV an der Autobahn">
              An der A9 stehen Module über Ackerflächen, teils mit Weidetieren. Genutzt
              wird nicht nur die Sonne, sondern auch der Schatten.
            </Block>
            <Block t="Eine Stellenanzeige als Anlass">
              Gesucht war jemand, der einen Prototypen allein produktiv macht.
              Schreibzugriffe, ein Datenmodell über mehrere Herstellersysteme,
              automatisierte Abläufe. Genau das ist hier der Bauplan.
            </Block>
            <Block t="Was noch einfloss">
              Die{" "}
              <a href="https://t3n.de/news/guenstiger-als-lithium-batterie-rost-1667301/">
                Rost-Batterie aus einem Fachartikel
              </a>
              . Das Waldbrandthema aus meiner{" "}
              <a href="https://fireontheland.org">Graphic Novel</a> über die boreale Zone.
            </Block>
          </div>
        </Abschnitt>

        <Abschnitt n="02" t="Wie ich arbeite">
          {/* Gewichte getauscht. Vorher stand hier ein Motto groß im Zitatrahmen
              („Ich bringe erst alles zusammen…") und der Beleg klein und grau
              darunter. Das Motto könnte jeder sagen — ein Koch, ein Trainer,
              ein Berater. Der Beleg nennt eine Quote und eine Entscheidungs-
              regel, also führt er.

              Kein blockquote mehr: das ist kein Zitat, sondern eine Aussage
              über diese Arbeit. Die optische Fassung bleibt, das Element
              wechselt auf p. */}
          <p
            className="sk-titel-zwischen"
            style={{
              margin: 0,
              paddingLeft: "var(--sp-lg)",
              borderLeft: "3px solid var(--color-accent)",
              maxWidth: "34ch",
              /* balance verteilt die Zeilen gleichmäßig statt die letzte
                 auslaufen zu lassen — bei drei Zeilen ist das der Unterschied
                 zwischen einem Satz und einem Absatz. */
              textWrap: "balance",
            }}
          >
            {/* Geschützte Leerzeichen zwischen „an" und „einer": ohne sie endeten
                zwei Zeilen auf „an" und zwei begannen mit „einer" — dasselbe
                Wortpaar zweimal untereinander, das liest sich als Fehler. Die
                Bindung hält bei jeder Fensterbreite, eine Breitenkorrektur
                nicht. */}
            Fünf von sechs Zusatzideen sind an&nbsp;einer Messung gescheitert, nicht
            an&nbsp;einer Meinung.
          </p>
          <p className="sk-text-fliess" style={{ color: "var(--color-muted)", maxWidth: "56ch", marginTop: "var(--sp-md)" }}>
            Ich baue eine Idee weit genug, um sie messen zu können. Der Blendungs-Alarm
            lief fertig, bevor ein durchgerechnetes Jahr ihn erledigt hat.
          </p>
        </Abschnitt>

        <Abschnitt n="03" t="Der Sprint">
          <p className="sk-text-fliess" style={{ color: "var(--color-muted)", maxWidth: "56ch" }}>
            Gebaut mit Claude Code und dem Figma-MCP. Entwurf und Code entstehen im selben
            Werkzeug, deshalb sind Wireframe und Repo nie auseinandergelaufen.
          </p>
          <ol
            style={{
              listStyle: "none",
              padding: 0,
              margin: "var(--sp-lg) 0 0",
              display: "flex",
              gap: "var(--sp-lg)",
              flexWrap: "wrap",
              alignItems: "baseline",
            }}
          >
            {/* Ohne Nummern. Die Abschnitte der Seite zählen bereits 01 bis 04
                in derselben Akzentfarbe — ein zweiter Zähler daneben, der
                wieder bei 01 beginnt, liest sich als Widerspruch. Die
                Reihenfolge trägt die Leserichtung, dafür braucht es keine
                Ziffern. */}
            {PHASEN.map((t) => (
              <li key={t} className="sk-titel-phase">{t}</li>
            ))}
          </ol>
          {/* Brutto ist gemessen, nicht geschätzt: erster Commit 09:34, letzter
              20:31 am selben Tag. Netto ist Doms Abschlag von 40 % für
              Unterbrechungen — eine Selbstauskunft, keine Messung, und die
              Zeile sagt das auch.
              Wichtig für die Ehrlichkeit der Zahl: die Figma-Phasen liegen vor
              dem ersten Commit und stecken in der Spanne nicht drin. */}
          <dl
            style={{
              display: "flex",
              gap: "var(--sp-xl)",
              margin: "var(--sp-lg) 0 0",
              flexWrap: "wrap",
            }}
          >
            <Zeit t="Brutto" v="10,9 h" u="erster bis letzter Commit" />
            <Zeit t="Netto" v="6,5 h" u="abzüglich 40 % Unterbrechung" />
          </dl>
          <p className="sk-text-kompakt" style={{ color: "var(--color-muted)", marginTop: "var(--sp-md)" }}>
            Die einzelnen Schritte stehen in der{" "}
            <Link href="/doku">Dokumentation</Link>.
          </p>
        </Abschnitt>

        <Abschnitt n="04" t="Was rausflog — und was blieb">
          <ul style={{ listStyle: "none", padding: 0, margin: 0, maxWidth: 860 }}>
            {RAUS.map(([t, g]) => (
              <li
                key={t}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(200px, 300px) 1fr",
                  gap: "var(--sp-lg)",
                  padding: "var(--sp-md) 0",
                  borderBottom: "1px solid var(--color-surface)",
                }}
              >
                <span className="sk-text-titel">{t}</span>
                <span className="sk-text-fliess" style={{ color: "var(--color-muted)" }}>{g}</span>
              </li>
            ))}
          </ul>
        </Abschnitt>
      </main>
    </>
  );
}

function Abschnitt({ n, t, children }: { n: string; t: string; children: React.ReactNode }) {
  return (
    <section style={{ marginTop: "var(--sp-3xl)" }}>
      <div className="sk-mono-eyebrow" style={{ color: "var(--color-accent)" }}>{n}</div>
      <h2 className="sk-titel-abschnitt" style={{ marginTop: 4, marginBottom: "var(--sp-lg)" }}>{t}</h2>
      {children}
    </section>
  );
}

function Zeit({ t, v, u }: { t: string; v: string; u: string }) {
  return (
    <div>
      <dt className="sk-mono-eyebrow" style={{ color: "var(--color-muted)" }}>{t}</dt>
      <dd className="sk-mono-zahl" style={{ margin: "2px 0 0" }}>{v}</dd>
      <dd className="sk-text-kompakt" style={{ color: "var(--color-muted)", margin: 0 }}>{u}</dd>
    </div>
  );
}

function Block({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="sk-text-titel">{t}</h3>
      <p className="sk-text-fliess" style={{ color: "var(--color-muted)", marginTop: 4 }}>{children}</p>
    </div>
  );
}
