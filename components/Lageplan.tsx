"use client";

/*
  Der Lageplan. Das Kernstück: wer liest, wer schreibt, und wohin.

  Die Positionen der Felder sind NICHT gesetzt, sondern gerechnet — aus den
  echten Koordinaten gegen das HQ in Berlin. Die Doku behauptet „der Lageplan
  ordnet nicht an, er bildet ab"; das hier ist die Stelle, an der die Behauptung
  stimmen muss. Ergebnis: Templin 67 km bei 5°, Neuhardenberg 57 km bei 81°,
  Deutsch Bork 54 km bei 225° — Nord, Ost, Südwest, ein fast gleichseitiges
  Dreieck, das sich von selbst ergibt.

  Jede Flusslinie trägt eine Ink-Fassung. Grund steht in tokens.solarkreis.css:
  mango-5 misst gegen den Grund nur 2,65:1 und verfehlt die 3:1 aus WCAG
  1.4.11. Die Fassung trägt den Kontrast, der Farbton die Bedeutung.

  Zustände: ohne Zeiger liegen alle vier Quellbahnen auf 50 %. Zeigt oder
  fokussiert man eine Quelle, geht ihre Bahn auf 100 % und die anderen
  verschwinden — „inaktiv zeigt keine Bahn", weil eine Bahn bei 30 % auch mit
  Fassung nur 1,89:1 misst und damit nicht mehr wahrnehmbar ist.
  Fokus zählt wie Zeiger: die Karten sind Knöpfe, nicht Divs.
*/

import { useState } from "react";
import type { Zustand } from "@/lib/zustand";
import { HQ } from "@/lib/seed";

/* ── Geografie → Bildschirm ──────────────────────────────────────────────
   Äquirektangular um das HQ. Auf 70 km Abstand ist der Fehler gegenüber der
   Großkreisdistanz kleiner als ein Pixel — für einen Lageplan genug. */
const KM_PRO_GRAD_LAT = 110.574;
const kmProGradLon = (lat: number) => 111.32 * Math.cos((lat * Math.PI) / 180);

function versatzKm(lat: number, lon: number) {
  const mittelLat = (lat + HQ.lat) / 2;
  return {
    ost: (lon - HQ.lon) * kmProGradLon(mittelLat),
    nord: (lat - HQ.lat) * KM_PRO_GRAD_LAT,
  };
}

const BREITE = 1120;
const HOEHE = 720;
const MITTE = { x: 545, y: 300 };
const RADIUS_PX = 250;
/* Der Speicher steht am HQ, aber rechts unter ihm statt direkt darunter:
   direkt darunter lag er auf Feld Süd, weil Süd geografisch nach Südwesten
   fällt. Ein kurzer Stich verbindet ihn mit der Zentrale. */
const SPEICHER = { x: MITTE.x + 185, y: MITTE.y + 95 };

/* ── Farbrollen der Bahnen ───────────────────────────────────────────────── */
type Fluss = "read" | "write" | "rw";
const FLUSS_FARBE: Record<Fluss, string> = {
  read: "var(--sk-read)",
  write: "var(--sk-write)",
  rw: "var(--sk-rw)",
};

/* ── Quellen in der Seitenspalte ─────────────────────────────────────────── */
interface Quelle {
  id: string;
  name: string;
  zeile: string;
  fluss: Fluss;
  /** „echt" sobald der Feed hängt, „simuliert" beim Rückfall, „offen" davor. */
  stand: "echt" | "simuliert" | "offen";
  hinweis?: string;
}

export function Lageplan({
  z,
  feldAktiv,
  onFeld,
}: {
  z: Zustand;
  feldAktiv: string | null;
  onFeld: (id: string | null) => void;
}) {
  const [aktiv, setAktiv] = useState<string | null>(null);

  const wetter = z.parks[0]?.weather.source;

  const quellen: Quelle[] = [
    {
      id: "open-meteo",
      name: "Open-Meteo",
      zeile: "Einstrahlung, Temperatur, Regen",
      fluss: "read",
      stand: wetter?.origin ?? "offen",
      hinweis: wetter?.label,
    },
    {
      id: "awattar",
      name: "aWATTar",
      zeile: "Day-Ahead-Spotpreis",
      fluss: "read",
      stand: z.preis.source?.origin ?? "offen",
      hinweis: z.preis.source?.label ?? "kein Preis für diese Stunde",
    },
    {
      id: "firms",
      name: "NASA FIRMS",
      zeile: `aktive Feuer · ${z.feuer.umkreis_km} km, ${z.feuer.tage} Tage`, fluss: "read",
      stand: z.feuer.source.origin,
      hinweis: z.feuer.demoAn
        ? "Demo-Szenario an"
        : `${z.feuer.imUmkreis.length} Hotspots im Umkreis`,
    },
    { id: "operator", name: "Operator", zeile: `${z.operatorId} · schreibt, liest nicht`, fluss: "write", stand: "simuliert", hinweis: "Stub, kein Auth" },
  ];

  /* Die Bahnen treten am linken Rand auf Höhe ihrer Karte ein und laufen
     rechtwinklig — wie im Wireframe. Jede bekommt eine eigene Steigleitung
     und einen eigenen Anschlusspunkt am HQ, sonst kleben sie aneinander und
     man sieht nicht mehr, welche zu welcher Karte gehört. Doms Vorgabe aus
     dem Entwurf waren rund 20 px Abstand. */
  const eintritt = (i: number) => 118 + i * 132;
  const steigleitung = (i: number) => 150 + i * 20;
  const anschluss = (i: number) => MITTE.y - 27 + i * 18;

  const felder = z.parks.map((p) => {
    const v = versatzKm(p.park.lat, p.park.lon);
    const maxKm = Math.max(
      ...z.parks.map((q) => {
        const w = versatzKm(q.park.lat, q.park.lon);
        return Math.hypot(w.ost, w.nord);
      }),
    );
    const skala = RADIUS_PX / maxKm;
    return {
      ...p,
      x: MITTE.x + v.ost * skala,
      y: MITTE.y - v.nord * skala,
      km: Math.hypot(v.ost, v.nord),
      peilung: (((Math.atan2(v.ost, v.nord) * 180) / Math.PI) + 360) % 360,
    };
  });

  const bahnOpacity = (id: string) => {
    if (aktiv === null) return "var(--sk-op-hover)";
    return aktiv === id ? 1 : 0;
  };

  return (
    <div className="sk-lageplan">
      {/* ── Seitenspalte ────────────────────────────────────────────────── */}
      <aside
        className="sk-lageplan__spalte"
        style={{ padding: "20px 24px" }}
        aria-label="Externe Quellen und Akteure"
      >
        <div className="sk-mono-eyebrow" style={{ color: "var(--leise)" }}>
          Externe Quellen
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 18, marginTop: 12 }}>
          {quellen.map((q, i) => (
            <QuellKarte
              key={q.id}
              q={q}
              aktiv={aktiv === q.id}
              gedimmt={aktiv !== null && aktiv !== q.id}
              onAn={() => setAktiv(q.id)}
              onAus={() => setAktiv(null)}
              eyebrowDavor={q.fluss === "write" ? "Akteur" : undefined}
              nr={i}
            />
          ))}
        </div>
      </aside>

      {/* ── Canvas ──────────────────────────────────────────────────────── */}
      <div className="sk-lageplan__canvas">
        <svg
          viewBox={`0 0 ${BREITE} ${HOEHE}`}
          width="100%"
          role="img"
          aria-label={
            `Lageplan: drei Solarparks um eine Zentrale in Berlin. ` +
            felder.map((f) => `${f.park.name} bei ${f.park.place}, ${Math.round(f.km)} Kilometer, ${Math.round(f.peilung)} Grad, ${fmt(f.output_kw / 1000)} von ${fmt(f.park.capacity_kw / 1000)} Megawatt`).join(". ") +
            `. Zusammen ${fmt(z.total_kw / 1000)} von ${fmt(z.grid_limit_kw / 1000)} Megawatt Netzgrenze.`
          }
          style={{ display: "block" }}
        >
          <defs>
            <marker id="pfeil-ink" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse">
              <path d="M0,1 L9,5 L0,9 z" fill="var(--leise)" />
            </marker>
          </defs>

          {/* Der Ring zwischen den Feldern ist raus.

             Er war gestrichelt in der rw-Farbe gezeichnet und behauptete
             damit, dass die Felder untereinander lesen und schreiben. Das
             Modell kennt keine einzige Beziehung zwischen zwei Parks —
             jeder Fluss läuft Feld <-> HQ.

             Gekoppelt sind die Felder sehr wohl: über eine gemeinsame
             Netzgrenze und einen gemeinsamen Speicher. Diese Kopplung läuft
             aber durch die Zentrale und steht in den Radialbahnen darunter
             schon da. Der Ring war die dritte Darstellung derselben Sache,
             und die einzige falsche. */}

          {/* HQ ↔ Feld, Pfeil an beiden Enden */}
          {felder.map((f) => (
            <Bahn
              key={`radial-${f.park.id}`}
              d={`M ${MITTE.x} ${MITTE.y} L ${f.x} ${f.y}`}
              fluss="rw"
              beidseitig
              opacity={aktiv === null ? 1 : 0.15}
            />
          ))}

          {/* Quelle → HQ */}
          {quellen.map((q, i) => (
            <Bahn
              key={`quelle-${q.id}`}
              d={`M 0 ${eintritt(i)} H ${steigleitung(i)} V ${anschluss(i)} H ${MITTE.x - 82}`}
              fluss={q.fluss}
              gerichtet
              opacity={bahnOpacity(q.id)}
            />
          ))}

          {/* Zentrale */}
          <Knoten
            x={MITTE.x}
            y={MITTE.y}
            w={172}
            h={92}
            dunkel
            eyebrow="Zentrale"
            titel={`HQ ${HQ.place}`}
            zeilen={[
              `${fmt(z.total_kw / 1000)} / ${fmt(z.grid_limit_kw / 1000)} MW`,
              "Netzgrenze",
            ]}
          />

          {/* Kurzer Stich HQ → Speicher. Keine Flussbahn, deshalb schlicht. */}
          <path
            d={`M ${MITTE.x + 40} ${MITTE.y + 40} L ${SPEICHER.x - 40} ${SPEICHER.y - 20}`}
            fill="none"
            stroke="var(--leise)"
            strokeWidth="1.5"
            strokeDasharray="4 4"
          />
          <Knoten
            x={SPEICHER.x}
            y={SPEICHER.y}
            w={170}
            h={76}
            eyebrow="Speicher"
            titel={`${z.speicher.stamm.capacity_kwh / 1000} MWh · ${z.speicher.stamm.power_kw / 1000} MW`}
            zeilen={[`${Math.round(z.speicher.soc * 100)} % · ${z.speicher.mode}`]}
          />

          {/* Die drei Felder. Sie melden ihren Zeiger nach oben, damit die
              zugehörige Karte unter „Eingreifen" mitleuchtet — Ansehen und
              Anfassen sind zwei Orte, aber dasselbe Feld. */}
          {felder.map((f) => (
            <Knoten
              key={f.park.id}
              x={f.x}
              y={f.y}
              w={182}
              h={88}
              hervor={feldAktiv === f.park.id}
              onZeiger={(an) => onFeld(an ? f.park.id : null)}
              titel={f.park.name}
              eyebrow={undefined}
              zeilen={[
                f.park.place.split(/[,—]/)[0].trim(),
                `${fmt(f.output_kw / 1000)} von ${fmt(f.park.capacity_kw / 1000)} MW`,
              ]}
            />
          ))}
        </svg>

        <Legende />
      </div>
    </div>
  );
}

/* ── Bausteine ───────────────────────────────────────────────────────────── */

/* Ohne den Ring gibt es keine gestrichelte Bahn mehr. Der Schalter dafür ist
   deshalb weg — ein Parameter, den niemand setzt, sieht wie eine Möglichkeit
   aus und ist keine. */
function Bahn({
  d,
  fluss,
  gerichtet,
  beidseitig,
  opacity,
}: {
  d: string;
  fluss: Fluss;
  gerichtet?: boolean;
  beidseitig?: boolean;
  opacity: number | string;
}) {
  return (
    <g opacity={opacity} style={{ transition: "opacity 160ms" }}>
      {/* Fassung zuerst — sie muss unter der Farblinie liegen. */}
      <path
        d={d}
        fill="none"
        stroke="var(--sk-line-casing)"
        strokeWidth="var(--sk-line-casing-w)"
        strokeLinecap="round"
        markerEnd={gerichtet || beidseitig ? "url(#pfeil-ink)" : undefined}
        markerStart={beidseitig ? "url(#pfeil-ink)" : undefined}
      />
      <path
        d={d}
        fill="none"
        stroke={FLUSS_FARBE[fluss]}
        strokeWidth="var(--sk-line-w)"
        strokeLinecap="round"
      />
    </g>
  );
}

function Knoten({
  x,
  y,
  w,
  h,
  titel,
  eyebrow,
  zeilen,
  dunkel,
  hervor,
  onZeiger,
}: {
  x: number;
  y: number;
  w: number;
  h: number;
  titel: string;
  eyebrow?: string;
  zeilen: string[];
  dunkel?: boolean;
  hervor?: boolean;
  onZeiger?: (an: boolean) => void;
}) {
  /* „dunkel" hieß früher: dieser eine Knoten ist anders als die anderen.
     Auf der dunklen Insel sind alle Knoten gleich gebaut — die Marke
     unterscheidet jetzt nur noch die Zentrale von den Feldern, und zwar
     über die Fläche, nicht über eine eigene Farbwelt. */
  const vordergrund = "var(--text)";
  const sekundaer = "var(--leise)";
  return (
    <g
      transform={`translate(${x - w / 2} ${y - h / 2})`}
      onMouseEnter={onZeiger ? () => onZeiger(true) : undefined}
      onMouseLeave={onZeiger ? () => onZeiger(false) : undefined}
    >
      {/* Hervorhebung im Rahmen, nicht in der Fläche: eine hellere Füllung
          würde den Knoten nach vorn holen und die Karte selbst verändern.
          Der Rahmen sagt „dieser hier" und lässt den Inhalt in Ruhe. */}
      <rect
        width={w}
        height={h}
        rx="var(--radius-md)"
        fill={dunkel ? "var(--flaeche2)" : "var(--flaeche)"}
        stroke={hervor ? "var(--text)" : dunkel ? "var(--leise)" : "var(--rahmen)"}
        strokeWidth={hervor ? 2 : 1}
      />
      <foreignObject x="0" y="0" width={w} height={h}>
        <div style={{ padding: "10px 12px", color: vordergrund }}>
          {eyebrow && (
            <div className="sk-mono-eyebrow" style={{ color: sekundaer }}>
              {eyebrow}
            </div>
          )}
          <div className="sk-text-titel">{titel}</div>
          {zeilen.map((zl, i) => (
            <div key={i} className={i === 0 ? "sk-mono-daten" : "sk-mono-daten"} style={{ color: sekundaer }}>
              {zl}
            </div>
          ))}
        </div>
      </foreignObject>
    </g>
  );
}

function QuellKarte({
  q,
  aktiv,
  gedimmt,
  onAn,
  onAus,
  eyebrowDavor,
}: {
  q: Quelle;
  aktiv: boolean;
  gedimmt: boolean;
  onAn: () => void;
  onAus: () => void;
  eyebrowDavor?: string;
  nr: number;
}) {
  /* Zurücktreten, ohne unlesbar zu werden.

     Auf hellem Grund war das ein Problem: der Sekundärton cortado stand dort
     bei 5,17:1 und fiel schon bei 85 % Deckkraft durch. Ich hatte deshalb
     einen Farbwechsel eingebaut — beim Dimmen von cortado auf Ink.

     Auf der dunklen Insel ist der Trick überflüssig. Gemessen auf der
     Kartenfläche #221c33 über dem Grund #14101f steht --leise bei 7,62:1 und
     hält das Dimmen bis 75 % (4,87:1), --text bis 55 %. Eine Zeile Code
     weniger, weil der Untergrund die Arbeit macht.

     75 % ist damit keine Vorliebe, sondern die gemessene Grenze. */
  const DIMM = 0.75;
  const chip =
    q.stand === "echt"
      ? { text: `echt · ${q.fluss}`, bg: q.fluss === "write" ? "var(--sk-write-fill)" : "var(--sk-read-fill)" }
      : q.stand === "simuliert"
        ? { text: `simuliert · ${q.fluss}`, bg: q.fluss === "write" ? "var(--sk-write-fill)" : "var(--sk-read-fill)" }
        : { text: `offen · ${q.fluss}`, bg: "var(--color-surface)" };

  return (
    <div>
      {eyebrowDavor && (
        <div className="sk-mono-eyebrow" style={{ color: "var(--leise)", marginBottom: 12 }}>
          {eyebrowDavor}
        </div>
      )}
      <button
        type="button"
        onMouseEnter={onAn}
        onMouseLeave={onAus}
        onFocus={onAn}
        onBlur={onAus}
        aria-pressed={aktiv}
        style={{
          display: "block",
          width: "100%",
          textAlign: "left",
          background: "var(--flaeche)",
          /* Der ausgewählte Zustand steht weiterhin im Rahmen, nicht in der
             Deckkraft — ein Rahmen ist eindeutig, eine Helligkeit nicht. Die
             Deckkraft trägt die andere Aussage: „nicht dieser hier". */
          border: aktiv ? "2px solid var(--text)" : "1px solid var(--rahmen)",
          padding: aktiv ? 11 : 12,
          borderRadius: "var(--radius-md)",
          cursor: "pointer",
          font: "inherit",
          opacity: gedimmt ? DIMM : 1,
          transition: "opacity .18s ease",
        }}
      >
        <span
          className="sk-mono-eyebrow"
          style={{
            display: "inline-block",
            background: chip.bg,
            color: "var(--sk-on-fill)",
            padding: "3px 8px",
            borderRadius: "var(--radius-full)",
          }}
        >
          {chip.text}
        </span>
        <span className="sk-text-titel" style={{ display: "block", marginTop: 8, color: "var(--text)" }}>
          {q.name}
        </span>
        <span className="sk-text-label" style={{ display: "block", color: "var(--leise)" }}>
          {q.zeile}
        </span>
        {q.hinweis && (
          <span className="sk-text-label" style={{ display: "block", color: "var(--leise)", marginTop: 2 }}>
            {q.hinweis}
          </span>
        )}
      </button>
    </div>
  );
}

function Legende() {
  const eintraege: [Fluss | "krit", string, string][] = [
    ["read", "read", "liest nur"],
    ["write", "write", "schreibt nur"],
    ["rw", "r&w", "beides, Pfeil an beiden Enden"],
    ["krit", "kritisch", "Not-Aus, Alarm"],
  ];
  const fuellung: Record<string, string> = {
    read: "var(--sk-read-fill)",
    write: "var(--sk-write-fill)",
    rw: "var(--sk-rw-fill)",
    krit: "var(--sk-crit-fill)",
  };
  const punkt: Record<string, string> = {
    read: "var(--read)",
    write: "var(--write)",
    rw: "var(--rw)",
    krit: "var(--sk-crit)",
  };
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 20,
        flexWrap: "wrap",
        margin: "0 40px 32px",
        padding: "12px 16px",
        background: "var(--flaeche)",
        border: "1px solid var(--rahmen)",
        borderRadius: "var(--radius-md)",
      }}
    >
      {eintraege.map(([k, name, text]) => (
        <span key={k} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
          <span
            className="sk-mono-daten"
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 6,
              background: fuellung[k],
              color: "var(--sk-on-fill)",
              padding: "3px 9px",
              borderRadius: "var(--radius-full)",
            }}
          >
            {/* Punkt in voller Sättigung mit Ink-Ring — dieselbe Bauart wie die
                Linie, für die er steht. Ohne Ring misst er gegen seine eigene
                Füllung nur 2,02 bis 2,87:1. */}
            <span
              style={{
                width: 9,
                height: 9,
                borderRadius: "50%",
                background: punkt[k],
                border: "1px solid var(--grund)",
              }}
            />
            {name}
          </span>
          <span className="sk-text-label" style={{ color: "var(--leise)" }}>
            {text}
          </span>
        </span>
      ))}
    </div>
  );
}

const fmt = (v: number) => v.toLocaleString("de-DE", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
