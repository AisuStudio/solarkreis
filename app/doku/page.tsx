/*
  Schritt 10: die Dokumentationsseite.

  Der Text stammt aus dem Figma-Entwurf, ist hier aber an mehreren Stellen
  nachgezogen — der Entwurf entstand, bevor die Quellen wirklich hingen, und
  behauptete Dinge, die sich beim Anschließen als falsch herausgestellt haben
  (FIRMS liefert nicht zehn, sondern höchstens fünf Tage; über Brandenburg
  liegen nicht null Detektionen, sondern 153 in fünf Tagen). Wo Entwurf und
  Messung auseinandergehen, gilt die Messung.
*/

import Link from "next/link";
import { TopNav } from "@/components/TopNav";

export const metadata = {
  title: "Dokumentation — SolarKreis",
  description: "Wie SolarKreis gebaut ist, und was dabei gegen was abgewogen wurde.",
};

const ABSCHNITTE = [
  ["01", "Was SolarKreis ist"],
  ["02", "Datenquellen"],
  ["03", "Datenmodell"],
  ["04", "Read, Write, R&W"],
  ["05", "Schreibpfad und Sicherheit"],
  ["06", "Automatisierte Abläufe"],
  ["07", "Event Sourcing"],
  ["08", "Entscheidungen und Abwägungen"],
  ["09", "Bewusst nicht gebaut"],
] as const;

export default function DokuSeite() {
  return (
    <>
      <TopNav aktiv="/doku" />
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 240px) minmax(0, 1fr)",
          gap: "var(--sp-2xl)",
          maxWidth: 1200,
          margin: "0 auto",
          padding: "var(--sp-2xl) var(--gutter) var(--sp-4xl)",
          /* Kein alignItems: "start". Das machte den Kasten der Seitenspalte
             genau so hoch wie ihren Inhalt — und `position: sticky` wird von
             diesem Kasten begrenzt. Die Spalte hatte damit null Weg zum
             Kleben und rutschte mit hoch. Gestreckt reicht ihr Kasten über
             die ganze Zeile, und das Kleben hat Platz. */
        }}
      >
        <Seitenspalte />
        <main style={{ minWidth: 0, maxWidth: 720 }}>
          <div className="sk-mono-eyebrow" style={{ color: "var(--color-muted)" }}>
            SolarKreis · Dokumentation
          </div>
          <h1 className="sk-titel-seite" style={{ marginTop: "var(--sp-sm)" }}>
            Wie das gebaut ist, und warum so
          </h1>
          <p className="sk-text-lead" style={{ color: "var(--color-muted)", marginTop: "var(--sp-md)" }}>
            Gemessenes steht hier getrennt von Angenommenem. Und zu jeder Entscheidung
            steht die Alternative, die verworfen wurde.
          </p>

          <A n="01" t="Was SolarKreis ist">
            <H t="Das Set-Up">Drei simulierte Solarparks um eine Zentrale, gespeist mit echten Daten.</H>
            <H t="Echt und simuliert">
              Echt sind Wetter, Strompreis und aktive Feuer. Simuliert sind Parks und Geräte.
              Ihre Messwerte rechnet die Simulation aus der echten Einstrahlung.
            </H>
            <H t="Kennzeichnung">
              Jeder Wert trägt seine Herkunft mit. Die Oberfläche liest sie aus. Welche Quelle
              wann zuletzt geantwortet hat, steht auf der{" "}
              <Link href="/datenquellen">Datenquellen-Seite</Link>.
            </H>
          </A>

          <A n="02" t="Datenquellen">
            <H t="Drei, alle nur lesend">
              <Q href="https://open-meteo.com/en/docs">Open-Meteo</Q> für Einstrahlung,
              Temperatur und Niederschlag. <Q href="https://www.awattar.de/services/api">aWATTar</Q>{" "}
              für den Strompreis, der am Vortag je Stunde festgelegt wird.{" "}
              <Q href="https://firms.modaps.eosdis.nasa.gov/api/area/">NASA FIRMS</Q> für
              aktive Feuer.
            </H>
            <H t="Satellit läuft aus">
              Suomi NPP wird zum 1.11.2026 abgeschaltet. SolarKreis fragt deshalb NOAA-21 und
              NOAA-20 ab.
            </H>
            <H t="Ein roher Feed ist kein Alarm">
              FIRMS lieferte am 30.08. für fünf Tage 153 Detektionen, 101 davon im 50-km-Umkreis
              der Felder. Ein Alarm darauf hätte 101-mal ausgelöst. Es gilt deshalb eine
              gemessene Schwelle: Hinweis ab 5 MW in 10 km, kritisch ab 10 MW in 5 km.
            </H>
          </A>

          <A n="03" t="Datenmodell">
            <H t="Drei Formate, ein Reading">
              Drei Hersteller senden dasselbe in drei Formaten. SolarKreis vereinheitlicht sie
              beim Eingang, nicht erst in der Anzeige.
            </H>
            <Tabelle />
            <H t="Warum der Umweg">
              Die Geräte melden ganze Grad. Wer die Rohform überspringt, zeigt 38,6 °C an.
              Diese Zahl hat nie ein Gerät gesendet. <code className="sk-mono-kompakt">scripts/pruefen.mjs</code>{" "}
              prüft genau das gegen die laufende Instanz.
            </H>
          </A>

          <A n="04" t="Read, Write, R&W">
            <H t="Wer liest, wer schreibt">
              Die externen Quellen geben nur Daten ab (read). Der Mensch gibt nur Befehle
              (write). Feld und Zentrale tauschen beides (r&amp;w).
            </H>
            <H t="Farbe ist nie das einzige Signal">
              Die Richtung steht in der Pfeilspitze, nicht im Farbton. Wer Farben nicht
              unterscheidet, liest die Bahn trotzdem.
            </H>
            <H t="Warum jede Bahn eine Fassung hat">
              Auf dem dunklen Grund des Lageplans trägt jede Farbe ihren Kontrast selbst —
              zwischen 5,8:1 und 6,9:1, gefordert sind 3:1 für Nicht-Text. Die dunkle Fassung
              hat deshalb eine andere Aufgabe: wo zwei Bahnen sich kreuzen, tritt die untere
              zurück, und man kann einer einzelnen mit dem Auge folgen.
            </H>
          </A>

          <A n="05" t="Schreibpfad und Sicherheit">
            <H t="Im Zweifel abschalten">
              Fail-closed heißt: im Zweifel nicht ausführen. Geschaltet wird nur bei gesundem
              Gerät, frischen Daten und berechtigtem Bediener. Fehlt eines davon, geht die
              Anlage in den sicheren Zustand.
            </H>
            <H t="Sicher heißt Ruhe">Beim Speicher heißt sicher: Ruhe. Nicht laden, nicht entladen.</H>
            <H t="Mensch an der kritischen Grenze">
              Kritische Aktionen verlangen eine Bestätigung. Der Not-Aus ist das einzige
              Bedienelement mit einer Datenfarbe.
            </H>
            <H t="Auch Absagen stehen im Log">
              Ein abgelehntes Kommando wird genauso angehängt wie ein ausgeführtes. Ein
              Wächter, dessen Absagen spurlos verschwinden, ist nicht prüfbar.
            </H>
          </A>

          <A n="06" t="Automatisierte Abläufe">
            <H t="Die Kreis-Regel ist eine Leiter">
              Die Netzgrenze ist das, was der Netzanschluss aufnehmen darf: 38,9 von 54 MW.
              Reißt der Kreis sie, oder wird der Preis negativ, geht der Überschuss in den
              Speicher. Erst wenn der voll ist, wird gedrosselt.
            </H>
            <H t="Abregelung als letztes Mittel">
              Drosseln heißt: Strom wegwerfen, der schon da ist. Der Speicher fasst bewusst nur
              20 MWh. Wäre er größer, käme der Fall nie vor.
            </H>
            <H t="Die Automatik hat keine Abkürzung">
              Sie geht durch denselben Wächter wie ein Mensch und kann nichts, was ein Bediener
              nicht auch dürfte. Sonst hieße fail-closed nur {"„fail-closed für Menschen“"}.
            </H>
            <H t="Feuer meldet, aber schaltet nicht">
              Der Not-Aus bleibt beim Menschen. Eine Anlage stillzulegen, weil ein Satellit
              Wärme gesehen hat, wäre die falsche Richtung von fail-closed.
            </H>
          </A>

          <A n="07" t="Event Sourcing">
            <H t="Nichts wird überschrieben">
              Jede Änderung wird angehängt, nichts überschrieben. Den Sollwert rechnet
              SolarKreis aus allen Kommandos zusammen. Ein Kommando ohne Eintrag kann es
              deshalb nicht geben.
            </H>
            <H t="Der Ladestand als Prüfstein">
              Der Ladestand summiert sich über alle Ereignisse und über die Zeit dazwischen.
              Aus dem letzten Eintrag allein lässt er sich nicht ablesen. Genau deshalb zeigt
              er, ob das Log trägt.
            </H>
            <H t="Bewusste Grenze">
              Der Store liegt im Speicher, nicht in einer Datenbank. Nach einem Kaltstart ist
              das Log leer. Für ein Portfoliostück ist das die richtige Grenze; für den Betrieb
              wäre es die erste Baustelle.
            </H>
          </A>

          <A n="08" t="Entscheidungen und Abwägungen">
            <H t="Jede nennt ihre Alternative">
              Ohne die verworfene Möglichkeit ist eine Entscheidung nur eine Behauptung.
            </H>
            <E
              titel="Ereignisstrom statt Überschreiben"
              e="Der Zustand wird aus allen Ereignissen errechnet, nicht in Feldern gespeichert."
              w="Das Log ist damit der Zustand, nicht ein Protokoll daneben."
              v="Überschreiben und daneben protokollieren. Dann kann das Protokoll lügen, ohne dass es auffällt."
            />
            <E
              titel="Messwerte berechnen statt speichern"
              e="Readings werden deterministisch gerechnet. Im Log stehen nur Kommandos und Auffälligkeiten."
              w="Sieben Geräte im Sekundentakt wären 25.000 Einträge pro Stunde für null Erkenntnis."
              v="Jede Messung schreiben. Nach einem Tag wäre das Log unlesbar."
            />
            <E
              titel="Fail-closed als Standard"
              e="Bei Zweifel sicherer Zustand, mit protokolliertem Grund."
              w="Ein falsches Kommando kostet mehr als ein ausgelassenes."
              v="Den letzten bekannten Zustand halten — Weiterfahren im Blindflug."
            />
            <E
              titel="Gefilterte Feuermeldung statt rohem Feed"
              e="Alarm erst ab gemessener Schwelle: 5 MW in 10 km, kritisch 10 MW in 5 km."
              w="Roh wären es 101 Treffer in fünf Tagen. Ein Alarm, den man wegklickt, schützt nichts."
              v="Jede Detektion melden. Ende August ist in Brandenburg Erntezeit, das wären Stoppelfeuer."
            />
            <E
              titel="Drei echte Quellen statt vieler"
              e="Weitere Feeds nur, wenn sie zu einem Kommando führen."
              w="Ein Strom, der nichts auslöst, ist das Muster, gegen das dieses Stück argumentiert."
              v="Die offene Autobahn-Schnittstelle. Frei nutzbar, wirkt aber auf nichts."
            />
          </A>

          <A n="09" t="Bewusst nicht gebaut">
            <H t="Jeder Eintrag nennt seine Messung">
              {"Ein „passt nicht ins Scope“ ohne Beleg ist eine Behauptung, keine Entscheidung."}
              Die Langfassung steht in <code className="sk-mono-kompakt">docs/scope-out.md</code>.
            </H>
            <E
              titel="Blendungs-Alarm"
              e="Wäre aus dem Sonnenstand berechenbar gewesen, ohne neuen Feed. Die Geometrie ist gebaut."
              w="Ganzes Jahr im 5-Minuten-Raster: null Blendfenster. Die A9 verläuft dort 51°/231°, die Blendkeulen liegen bei 75–120° und 240–285°."
              v="Nach einer passenden A9-Strecke suchen — das hieße, die Welt ans Feature anzupassen."
            />
            <E
              titel="Verkehrsmelder"
              e="Feld Süd liegt 221 m von der A9. Lag nahe."
              w="Schnittstelle frei nutzbar, sieben Live-Meldungen. Eine Baustelle fünf Kilometer weiter ändert nichts an Leistung oder Sicherheit."
              v="Den Feed trotzdem anzeigen. Ein Strom ohne Wirkung ist Dekoration."
            />
            <E
              titel="Mehrtagesspeicher"
              e="Eisen-Luft wäre für einen Blackout-Rückfall die richtige Technik."
              w="SolarKreis kennt keine Verbraucher. Ein Notfallspeicher braucht eine Last."
              v="Die 10-%-Reserve zur Inselreserve umwidmen. Ohne Last wäre das eine Zahl ohne Bezugsgröße."
            />
          </A>
        </main>
      </div>
    </>
  );
}

/*
  Ein Verweis auf die Quelle selbst. Der Pfeil sitzt direkt am Namen, nicht
  als Liste darunter: wer wissen will, wo eine Zahl herkommt, fragt beim
  Namen und nicht am Ende des Absatzes.

  Ziel ist die Dokumentationsseite der jeweiligen Schnittstelle, nicht die
  Startseite des Anbieters — dort steht, was SolarKreis tatsächlich abruft.
  rel="noreferrer", damit der Klick nicht mitteilt, von wo aus er kam.
*/
function Q({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <a href={href} target="_blank" rel="noreferrer">
      {children}
      <span aria-hidden="true"> ↗</span>
    </a>
  );
}

/* ── Bausteine ───────────────────────────────────────────────────────── */

function Seitenspalte() {
  return (
    <aside aria-label="Inhalt">
      {/* Das Kleben sitzt eine Ebene tiefer: die Spalte selbst füllt die
          Zeile, dieser Kasten wandert darin mit.
          top rechnet die Höhe der Hauptnavigation ein (56 px) — sonst
          verschwindet die Überschrift „Inhalt" darunter, weil die Leiste
          deckend ist und darüber liegt. */}
      <div style={{ position: "sticky", top: "calc(56px + var(--sp-md))" }}>
      <div className="sk-mono-eyebrow" style={{ color: "var(--color-muted)" }}>Inhalt</div>
      <ol style={{ listStyle: "none", padding: 0, margin: "var(--sp-sm) 0 0", display: "grid", gap: 2 }}>
        {ABSCHNITTE.map(([n, t]) => (
          <li key={n} style={{ display: "flex", gap: "var(--sp-sm)" }}>
            {/* cortado, nicht hazelnut: auf hellem Grund misst hazelnut 2,24:1. */}
            <span className="sk-mono-kompakt" style={{ color: "var(--color-muted)" }}>{n}</span>
            <a href={`#a${n}`} className="sk-text-kompakt" style={{ textDecoration: "none" }}>{t}</a>
          </li>
        ))}
      </ol>

      <div className="sk-mono-eyebrow" style={{ color: "var(--color-muted)", marginTop: "var(--sp-lg)" }}>Quellen</div>
      <div style={{ display: "grid", gap: "var(--sp-sm)", marginTop: "var(--sp-sm)" }}>
        <a className="sk-text-kompakt" href="https://github.com/AisuStudio/solarkreis">Code auf GitHub ↗</a>
        <Link className="sk-text-kompakt" href="/datenquellen">Datenquellen ↗</Link>
        <Link className="sk-text-kompakt" href="/ds">Designebene ↗</Link>
      </div>

      <div className="sk-mono-eyebrow" style={{ color: "var(--color-muted)", marginTop: "var(--sp-lg)" }}>Werkzeug</div>
      <div className="sk-mono-kompakt" style={{ color: "var(--color-muted)", marginTop: 2 }}>
        Claude Code · Figma-MCP
      </div>
    </div>
    </aside>
  );
}

function A({ n, t, children }: { n: string; t: string; children: React.ReactNode }) {
  return (
    <section id={`a${n}`} style={{ marginTop: "var(--sp-2xl)", scrollMarginTop: "var(--sp-lg)" }}>
      <div className="sk-mono-eyebrow" style={{ color: "var(--color-accent)" }}>{n}</div>
      <h2 className="sk-titel-abschnitt" style={{ marginTop: 2 }}>{t}</h2>
      <div style={{ display: "grid", gap: "var(--sp-md)", marginTop: "var(--sp-md)" }}>{children}</div>
    </section>
  );
}

function H({ t, children }: { t: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="sk-text-titel">{t}</h3>
      <p className="sk-text-fliess" style={{ color: "var(--color-muted)", marginTop: 2 }}>{children}</p>
    </div>
  );
}

/** Entscheidung, Warum, Verworfen — die drei Zeilen, um die es geht. */
function E({ titel, e, w, v }: { titel: string; e: string; w: string; v: string }) {
  return (
    <div
      style={{
        border: "1px solid var(--color-muted)",
        borderRadius: "var(--radius-md)",
        padding: "var(--sp-md)",
        background: "var(--sk-canvas-bg)",
      }}
    >
      <div className="sk-text-titel">{titel}</div>
      <dl style={{ display: "grid", gridTemplateColumns: "auto 1fr", gap: "var(--sp-xs) var(--sp-md)", margin: "var(--sp-sm) 0 0" }}>
        {([["Entscheidung", e], ["Warum", w], ["Verworfen", v]] as const).map(([k, val]) => (
          <div key={k} style={{ display: "contents" }}>
            <dt className="sk-mono-eyebrow" style={{ color: "var(--color-muted)" }}>{k}</dt>
            <dd className="sk-text-kompakt" style={{ margin: 0, color: "var(--color-muted)" }}>{val}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}

function Tabelle() {
  const zeilen = [
    ["A", `{ "outputKw": 5845.4, "tempC": 39 }`, "5845,4 kW · 39 °C"],
    ["B", `{ "power_w": 4815000, "temperature": 39 }`, "4815,0 kW · 39 °C"],
    ["C", `{ "payload": { "p": 3597.6, "t": 41 } }`, "3597,6 kW · 41 °C"],
  ];
  return (
    <div style={{ overflowX: "auto" }}>
      <table className="sk-mono-kompakt" style={{ borderCollapse: "collapse", width: "100%", minWidth: 520 }}>
        <thead>
          <tr>
            {["FMT", "Rohform", "Normalisiert"].map((h) => (
              <th key={h} className="sk-mono-eyebrow" style={{ textAlign: "left", padding: "var(--sp-xs) var(--sp-sm)", color: "var(--color-muted)", borderBottom: "1px solid var(--color-muted)" }}>
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {zeilen.map(([f, roh, norm]) => (
            <tr key={f}>
              <td style={{ padding: "var(--sp-xs) var(--sp-sm)", borderBottom: "1px solid var(--color-surface)" }}>{f}</td>
              <td style={{ padding: "var(--sp-xs) var(--sp-sm)", borderBottom: "1px solid var(--color-surface)", color: "var(--color-muted)" }}>{roh}</td>
              <td style={{ padding: "var(--sp-xs) var(--sp-sm)", borderBottom: "1px solid var(--color-surface)" }}>{norm}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
