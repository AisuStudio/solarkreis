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

import { useEffect, useRef, useState } from "react";
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

/* Dieselben vier Stufen wie in der Geräteliste des Nachweises. Sie stehen
   dort ein zweites Mal; ein Import quer zwischen zwei Bausteinen wäre die
   schlechtere Kopplung als zwei kurze Listen mit demselben Inhalt. Falls
   daraus je drei Listen werden, gehören sie nach lib/. */
const STUFEN: [number, string][] = [
  [1, "100 %"],
  [0.75, "75 %"],
  [0.5, "50 %"],
  [0, "0 %"],
];

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

/* Die dunkle Palette, nicht die helle.

   Hier standen bis zum 31.08. --sk-read/-write/-rw, also die Tokens für
   hellen Grund. Auf der dunklen Insel sahen sie brauchbar aus, waren aber
   die falsche Reihe: pistachio-5 misst dort 3,66:1 und lag damit knapp über
   der Schwelle für Nicht-Text, statt komfortabel darüber.

   „krit" ist keine Bahnart — es gibt keine kritische Leitung im Plan. Der
   Eintrag steht hier trotzdem, weil Legende und Pfeilspitzen dieselbe
   Zuordnung brauchen und zwei Tabellen für dieselbe Sache auseinanderlaufen. */
const FLUSS_FARBE: Record<Fluss | "krit", string> = {
  read: "var(--read)",
  write: "var(--write)",
  rw: "var(--rw)",
  krit: "var(--krit)",
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
  senden,
  laeuft,
}: {
  z: Zustand;
  feldAktiv: string | null;
  onFeld: (id: string | null) => void;
  senden: (body: Record<string, unknown>) => void;
  laeuft: boolean;
}) {
  const [aktiv, setAktiv] = useState<string | null>(null);
  /* Die Not-Aus-Rückfrage der Schaltwarte. Zweistufig, weil eine kritische
     Aktion eine zweite Hand braucht — die Regel stand vor der Oberfläche
     fest und ist nicht verhandelbar. */
  const [notAus, setNotAus] = useState<string | null>(null);
  /* Festgehalten heißt: die Warte bleibt offen, auch wenn der Zeiger geht.
     Das ist der Weg für alle, die nicht mit der Maus arbeiten — antippen,
     antabben, Eingabetaste. Ohne ihn wäre die Bedienung nach dem Entfernen
     der Knöpfe unten für Touch und Tastatur schlicht verschwunden. */
  const [gepinnt, setGepinnt] = useState<string | null>(null);
  const offenesFeld = gepinnt ?? feldAktiv;

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
            {/* Eine Pfeilspitze je Flussart.

                Vorher trugen alle denselben grauen Marker — die Spitze sagte
                damit nichts darüber, welcher Fluss dort ankommt, obwohl die
                Linie davor es sagt. Ein Marker erbt die Farbe seines Pfades
                nicht von allein; `context-stroke` könnte das, ist aber nicht
                überall verlässlich. Vier Marker sind billiger als eine
                Abhängigkeit, die in manchen Browsern still versagt. */}
            {(["read", "write", "rw", "krit"] as const).map((art) => (
              <marker
                key={art}
                id={`pfeil-${art}`}
                viewBox="0 0 10 10"
                refX="9"
                refY="5"
                markerWidth="5"
                markerHeight="5"
                orient="auto-start-reverse"
              >
                <path d="M0,1 L9,5 L0,9 z" fill={FLUSS_FARBE[art]} />
              </marker>
            ))}
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
              d={ecke([
                [0, eintritt(i)],
                [steigleitung(i), eintritt(i)],
                [steigleitung(i), anschluss(i)],
                [MITTE.x - 82, anschluss(i)],
              ])}
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
          {/* Kapazität und Leistung standen als ein Titel nebeneinander:
              „20 MWh · 5 MW". Nach der Vergrößerung der Schrift passte das
              nicht mehr in eine Zeile und brach hinter dem Wert um — „5"
              oben, „MW" unten. Ein Umbruch mitten in einer Einheit liest
              sich als Fehler.
              Jetzt trägt jede Zeile eine Größe: oben, was der Speicher fasst,
              darunter, wie schnell er sie abgibt. */}
          <Knoten
            x={SPEICHER.x}
            y={SPEICHER.y}
            w={170}
            h={106}
            eyebrow="Speicher"
            titel={`${z.speicher.stamm.capacity_kwh / 1000} MWh`}
            zeilen={[
              `${z.speicher.stamm.power_kw / 1000} MW`,
              `${Math.round(z.speicher.soc * 100)} % · ${z.speicher.mode}`,
            ]}
          />

          {/* Die drei Felder. Sie melden ihren Zeiger nach oben, damit die
              zugehörige Karte im Nachweis darunter mitleuchtet — geschaltet
              wird hier, nachgelesen wird dort, aber es ist dasselbe Feld. */}
          {/* Das angefasste Feld wird zuletzt gezeichnet. SVG kennt kein
              z-index — was später im Dokument steht, liegt oben. Ohne diese
              Sortierung verschwände die Schaltwarte unter dem nächsten
              Knoten. */}
          {[...felder]
            .sort((a, b) => (a.park.id === offenesFeld ? 1 : b.park.id === offenesFeld ? -1 : 0))
            .map((f) => (
              <Knoten
                key={f.park.id}
                x={f.x}
                y={f.y}
                w={182}
                h={88}
                hervor={offenesFeld === f.park.id}
                bedienbar
                gepinnt={gepinnt === f.park.id}
                onZeiger={(an) => {
                  if (gepinnt) return;
                  onFeld(an ? f.park.id : null);
                  if (!an) setNotAus(null);
                }}
                onSchalten={() => {
                  const zu = gepinnt === f.park.id;
                  setGepinnt(zu ? null : f.park.id);
                  onFeld(zu ? null : f.park.id);
                  if (zu) setNotAus(null);
                }}
                onSchliessen={() => {
                  setGepinnt(null);
                  onFeld(null);
                  setNotAus(null);
                }}
                panel={
                  offenesFeld === f.park.id ? (
                    <Schaltwarte
                      park={f}
                      laeuft={laeuft}
                      notAusOffen={notAus === f.park.id}
                      /* Beim Öffnen der Rückfrage wird das Feld festgehalten.

                     Eine offene Sicherheitsabfrage darf nicht verschwinden,
                     weil sich der Zeiger bewegt hat — das ist die Regel, und
                     sie gilt unabhängig von der Geometrie.

                     Der Auslöser war hier trotzdem Geometrie: die Rückfrage
                     hat weniger Inhalt als die Stufenansicht, 120 statt 157
                     Pixel. Der Zeiger stand auf dem Not-Aus-Knopf am unteren
                     Rand und lag nach dem Klick über Leere — mouseleave, und
                     die halb gestellte Frage war weg. */
                  oeffneNotAus={() => {
                    setNotAus(f.park.id);
                    setGepinnt(f.park.id);
                  }}
                      schliesseNotAus={() => setNotAus(null)}
                      senden={(body: Record<string, unknown>) => {
                        senden(body);
                        setNotAus(null);
                      }}
                    />
                  ) : null
                }
                titel={f.park.name}
                eyebrow={undefined}
                zeilen={[
                  f.park.place.split(/[,—]/)[0].trim(),
                  `${fmt(f.output_kw / 1000)} von ${fmt(f.park.capacity_kw / 1000)} MW${grundFuer(f)}`,
                ]}
              />
            ))}
        </svg>

        <Legende />
      </div>
    </div>
  );
}

/*
  Die Schaltwarte über der Feldkarte.

  Doms Vorschlag, und er hat recht behalten: der Weg von „Feld Süd steht auf
  0" zum Knopf, der das ändert, war zwei Bildschirme lang. Jetzt geht die
  Bedienung dort auf, wo man hinsieht.

  Meine drei Einwände von vorhin — kein Hover auf Touch, versteckte
  Bedienelemente werden nicht gefunden, der Not-Aus gehört nicht hinter eine
  Mausbewegung — sind nicht ausgeräumt, sondern beantwortet: die Feldkarte
  ist kein reines Hover-Ziel mehr. Sie ist ein Knopf mit tabIndex und
  aria-expanded, reagiert auf Klick und Eingabetaste und schließt auf
  Escape. Erst dadurch durften die doppelten Knöpfe darunter weichen.

  Der Not-Aus bleibt auch hier zweistufig. Dieselbe Regel an einem zweiten
  Ort — eine Sicherung, die je nach Bedienort anders greift, ist keine.
*/
function Schaltwarte({
  park,
  laeuft,
  notAusOffen,
  oeffneNotAus,
  schliesseNotAus,
  senden,
}: {
  park: Zustand["parks"][number];
  laeuft: boolean;
  notAusOffen: boolean;
  oeffneNotAus: () => void;
  schliesseNotAus: () => void;
  senden: (body: Record<string, unknown>) => void;
}) {
  const sollwerte = park.devices.map((d) => d.device.setpoint);
  const einig = sollwerte.every((v) => Math.abs(v - sollwerte[0]) < 0.001);
  const sollwert = einig ? sollwerte[0] : null;

  return (
    <div
      style={{
        background: "var(--flaeche2)",
        border: "1px solid var(--leise)",
        borderRadius: "var(--radius-md)",
        padding: 10,
      }}
    >
      {notAusOffen ? (
        <>
          <div className="sk-mono-daten" style={{ color: "var(--leise)" }}>
            {park.park.name} stilllegen?
          </div>
          <div style={{ display: "flex", gap: 6, marginTop: 8, flexWrap: "wrap" }}>
            <Taste
              disabled={laeuft}
              betont
              onClick={() => senden({ action: "not_aus", park_id: park.park.id, bestaetigt: true })}
            >
              Wirklich stilllegen
            </Taste>
            <Taste disabled={laeuft} onClick={schliesseNotAus}>
              Abbrechen
            </Taste>
          </div>
        </>
      ) : (
        <>
          <div className="sk-mono-daten" style={{ color: "var(--leise)" }}>
            Sollwert setzen
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
            {STUFEN.map(([v, label]) => (
              <Taste
                key={v}
                aktiv={sollwert !== null && Math.abs(sollwert - v) < 0.001}
                disabled={laeuft}
                onClick={() => senden({ action: "setpoint_setzen", park_id: park.park.id, value: v })}
              >
                {label}
              </Taste>
            ))}
          </div>
          <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
            <Taste disabled={laeuft} onClick={() => senden({ action: "freigeben", park_id: park.park.id })}>
              Freigeben
            </Taste>
            <Taste disabled={laeuft} kritisch onClick={oeffneNotAus}>
              Not-Aus
            </Taste>
          </div>
        </>
      )}
    </div>
  );
}

/*
  Die Hülle der Schaltwarte im SVG.

  foreignObject wächst nicht mit seinem Inhalt — es schneidet ab, was nicht
  in die angegebene Höhe passt. Zuerst stand hier eine feste 128, und genau
  das ist passiert: bei 190 px Breite umbrechen die vier Stufen in zwei
  Reihen, „Freigeben" und „Not-Aus" waren halbiert.

  Eine größere feste Zahl wäre derselbe Fehler mit anderem Wert gewesen. Die
  Höhe wird deshalb am gerenderten Inhalt gemessen. Das hält auch, wenn sich
  die Schriftgröße wieder ändert — heute ist das schon einmal passiert.

  Bis zur ersten Messung steht eine Schätzung, sonst blitzt beim Aufgehen
  eine Höhe von 0 auf.
*/
function Warte({
  y,
  h,
  w,
  children,
}: {
  y: number;
  h: number;
  w: number;
  children: React.ReactNode;
}) {
  const [hoehe, setHoehe] = useState(150);
  const box = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const messen = () => setHoehe(Math.ceil(el.getBoundingClientRect().height) + 2);
    messen();
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(el);
    return () => beobachter.disconnect();
  }, []);

  /* Nach unten, solange dort Platz ist — sonst nach oben. Die Lage der
     Knoten kommt aus echten Koordinaten, ein Park weiter südlich schöbe die
     Warte über den Rand, und dort ist sie abgeschnitten. */
  const unten = y + h / 2 + 6 + hoehe <= HOEHE - 8;

  return (
    <foreignObject
      x={-4}
      y={unten ? h + 6 : -(hoehe + 6)}
      width={w + 8}
      height={hoehe}
      style={{ overflow: "visible" }}
    >
      {/* Der Knoten darüber ist selbst ein Knopf. Ohne diesen Riegel liefe
          jeder Klick auf „50 %" anschließend auch auf den Knoten und klappte
          die Warte wieder zu. Die Escape-Taste darf dagegen weiter nach oben
          durch — sie soll auch aus der Warte heraus schließen. */}
      <div ref={box} onClick={(e) => e.stopPropagation()}>
        {children}
      </div>
    </foreignObject>
  );
}

/** Knopf der Schaltwarte. Dunkler Grund, sonst dieselbe Bauart wie unten. */
function Taste({
  children,
  onClick,
  disabled,
  aktiv,
  kritisch,
  betont,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  aktiv?: boolean;
  kritisch?: boolean;
  betont?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={aktiv}
      className="sk-mono-daten"
      style={{
        background: betont ? "var(--sk-estop-bg)" : aktiv ? "var(--text)" : "transparent",
        color: betont ? "var(--sk-estop-label)" : aktiv ? "var(--grund)" : "var(--text)",
        border: `1px solid ${kritisch ? "var(--krit)" : betont ? "var(--text)" : "var(--leise)"}`,
        borderRadius: "var(--radius-sm)",
        padding: "5px 8px",
        minHeight: 24,
        cursor: disabled ? "wait" : "pointer",
        font: "inherit",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

/*
  Warum das Feld liefert, was es liefert.

  „Sollwert 100 % · 0,0 von 18,0 MW" liest sich beim ersten Mal wie ein
  Fehler. Ist es nicht: der Sollwert ist eine Obergrenze, kein Ziel. Nachts
  ist die Einstrahlung null, und null mal irgendetwas bleibt null.

  Die Karte wusste das und sagte es nicht. Jetzt steht der bindende Grund
  hinter der Zahl. Reihenfolge: erst was jemand entschieden hat, dann was
  die Anlage meldet, dann was die Sonne vorgibt — vom Behebbaren zum
  Gegebenen.
*/
function grundFuer(f: Zustand["parks"][number]): string {
  const sollwerte = f.devices.map((d) => d.device.setpoint);
  const alleAus = f.devices.every((d) => d.device.status === "offline");
  const hoechster = Math.max(...sollwerte, 0);

  if (alleAus) return " · offline";
  if (hoechster === 0) return " · stillgelegt";

  /* Über der Nachweisgrenze braucht es keine Erklärung — man sieht ja,
     dass etwas kommt. Nur die Drosselung bleibt erwähnenswert, weil sie
     eine Entscheidung ist und keine Wetterlage. */
  if (f.output_kw > 0.05) {
    return hoechster < 1 ? ` · gedrosselt auf ${Math.round(hoechster * 100)} %` : "";
  }

  if (!f.daylight) return " · Nacht";
  if (f.weather.irradiance < 1) return " · keine Einstrahlung";
  return "";
}

/*
  Rechtwinkliger Pfad mit ausgerundeten Ecken.

  Die Zuleitungen liefen als `M … H … V … H …` mit scharfen 90°-Knicken. Ein
  Radius lässt sich darauf nicht setzen — SVG kennt keine Eckenrundung für
  Pfade, nur für Rechtecke. Also wird die Ecke selbst ersetzt: ein Stück vor
  dem Knick abbrechen, mit einer quadratischen Kurve über den Scheitel und
  ein Stück dahinter weiter.

  Der Radius wird an kurzen Abschnitten gekappt (`min` mit der halben
  Segmentlänge). Ohne das würden zwei nah beieinander liegende Ecken sich
  gegenseitig überholen, und der Pfad schlüge einen Haken.

  Fassung und Farblinie teilen sich denselben String, deshalb runden beide
  gemeinsam.
*/
function ecke(punkte: [number, number][], r = 10): string {
  if (punkte.length < 2) return "";
  let d = `M ${punkte[0][0]} ${punkte[0][1]}`;
  for (let i = 1; i < punkte.length - 1; i++) {
    const [px, py] = punkte[i - 1];
    const [x, y] = punkte[i];
    const [nx, ny] = punkte[i + 1];
    const l1 = Math.hypot(x - px, y - py);
    const l2 = Math.hypot(nx - x, ny - y);
    if (l1 === 0 || l2 === 0) continue;
    const rr = Math.min(r, l1 / 2, l2 / 2);
    const ax = x - ((x - px) / l1) * rr;
    const ay = y - ((y - py) / l1) * rr;
    const bx = x + ((nx - x) / l2) * rr;
    const by = y + ((ny - y) / l2) * rr;
    d += ` L ${ax} ${ay} Q ${x} ${y} ${bx} ${by}`;
  }
  const [ex, ey] = punkte[punkte.length - 1];
  return `${d} L ${ex} ${ey}`;
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
        /* Die Fassung trennt kreuzende Bahnen voneinander. Sie stand auf
           --sk-line-casing (blueberry, für hellen Grund gedacht) und liegt
           damit heller als die dunkle Insel — was aussieht, als hätte jede
           Linie einen Schimmer. Der Grund selbst ist das Richtige: dort, wo
           zwei Bahnen sich kreuzen, tritt die untere zurück, sonst sieht man
           die Fassung gar nicht. */
        stroke="var(--grund)"
        strokeWidth="var(--sk-line-casing-w)"
        strokeLinecap="round"
        markerEnd={gerichtet || beidseitig ? `url(#pfeil-${fluss})` : undefined}
        markerStart={beidseitig ? `url(#pfeil-${fluss})` : undefined}
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
  bedienbar,
  gepinnt,
  onSchalten,
  onSchliessen,
  panel,
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
  /* Ein bedienbarer Knoten ist ein Knopf, kein Bild: fokussierbar, mit
     Namen, mit aria-expanded für die Warte darunter. Die Zentrale und der
     Speicher bleiben Bilder — dort gibt es nichts zu schalten. */
  bedienbar?: boolean;
  gepinnt?: boolean;
  onSchalten?: () => void;
  onSchliessen?: () => void;
  /* Wird innerhalb derselben Gruppe gezeichnet und schließt bündig an den
     Knoten an. Beides ist nötig: außerhalb der Gruppe würde der Zeiger sie
     beim Hinüberfahren verlieren, mit Lücke ebenso. */
  panel?: React.ReactNode | null;
}) {
  /* „dunkel" hieß früher: dieser eine Knoten ist anders als die anderen.
     Auf der dunklen Insel sind alle Knoten gleich gebaut — die Marke
     unterscheidet jetzt nur noch die Zentrale von den Feldern, und zwar
     über die Fläche, nicht über eine eigene Farbwelt. */
  const vordergrund = "var(--text)";
  const sekundaer = "var(--leise)";

  /* Die Höhe kommt aus dem Inhalt, nicht aus einer Zahl im Aufruf.

     Vorher stand sie fest: 92 für die Zentrale, 88 für ein Feld, 76 für den
     Speicher. Solange die Schrift gleich blieb, ging das auf. Nach der
     Neubewertung der Skala lagen drei von fünf Knoten über ihrem Kasten —
     die Zentrale um 7 Pixel, Feld Ost um 11, der Speicher um so viel, dass
     Dom es gemeldet hat.

     Die übergebene Höhe bleibt als Untergrenze: sie hält die Kästen gleich
     groß, solange der Inhalt kleiner ist, und wächst nur, wo er es verlangt.
     Ohne Untergrenze wäre jedes Feld anders hoch, je nach Ortsnamen. */
  const [gemessen, setGemessen] = useState(h);
  const inhalt = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = inhalt.current;
    if (!el) return;
    const svg = el.closest("svg");
    const messen = () => {
      const skala = svg ? svg.getBoundingClientRect().width / BREITE : 1;
      if (!skala || !isFinite(skala)) return;
      /* Zwei Pixel Zugabe: die Messung läuft über einen skalierten
         SVG-Maßstab, und ein Rundungsrest von einem halben Pixel würde
         die letzte Zeile wieder anschneiden. */
      setGemessen(Math.ceil(el.getBoundingClientRect().height / skala) + 2);
    };
    messen();
    const beobachter = new ResizeObserver(messen);
    beobachter.observe(el);
    return () => beobachter.disconnect();
  });
  const hh = Math.max(h, gemessen);

  return (
    <g
      transform={`translate(${x - w / 2} ${y - hh / 2})`}
      onMouseEnter={onZeiger ? () => onZeiger(true) : undefined}
      onMouseLeave={onZeiger ? () => onZeiger(false) : undefined}
      {...(bedienbar
        ? {
            tabIndex: 0,
            role: "button" as const,
            "aria-expanded": !!gepinnt,
            "aria-label": `${titel} bedienen`,
            style: { cursor: "pointer", outlineOffset: 3 },
            onClick: onSchalten,
            onFocus: () => onZeiger?.(true),
            onKeyDown: (e: React.KeyboardEvent) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                onSchalten?.();
              }
              if (e.key === "Escape") onSchliessen?.();
            },
          }
        : {})}
    >
      {/* Hervorhebung im Rahmen, nicht in der Fläche: eine hellere Füllung
          würde den Knoten nach vorn holen und die Karte selbst verändern.
          Der Rahmen sagt „dieser hier" und lässt den Inhalt in Ruhe. */}
      <rect
        width={w}
        height={hh}
        rx="var(--radius-md)"
        fill={dunkel ? "var(--flaeche2)" : "var(--flaeche)"}
        stroke={hervor ? "var(--text)" : dunkel ? "var(--leise)" : "var(--rahmen)"}
        strokeWidth={hervor ? 2 : 1}
      />
      {panel && <Warte y={y} h={hh} w={w}>{panel}</Warte>}
      <foreignObject x="0" y="0" width={w} height={hh}>
        <div ref={inhalt} style={{ padding: "10px 12px", color: vordergrund }}>
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
