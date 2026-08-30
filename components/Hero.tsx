"use client";

/*
  Der Hero der Introseite: nicht das Dashboard, sondern das Nervensystem
  darunter — wer liest, wer schreibt, und was der Wächter durchlässt.

  Aus `public/hero.html` übernommen. Der Prototyp bleibt als eine Datei liegen,
  damit man beide nebeneinander halten kann; die Stile liegen jetzt in
  `app/hero.solarkreis.css` und sind unter `.sk-hero` gescoped.

  Warum die Zahlen stimmen müssen: der Hero darf nichts zeigen, was die
  Simulation nicht kann. Die Ereignisarten im Log heißen wie im Modell
  (abruf, messung, kommando, auffaelligkeit). Die Netzgrenze ist 38,88 MW,
  weil sie im Code 38,88 MW ist. „Voll" heißt beim Speicher 95 %, weil
  max_soc auf 0,95 steht.

  Bewegung: nur transform und opacity. Das Skript setzt ausschließlich
  `data-beat` und ein paar Textknoten; die Bewegung macht CSS. Pausiert bei
  `document.hidden` und außerhalb des Sichtfelds. Bei
  `prefers-reduced-motion: reduce` steht ein ruhiger Endzustand, in dem alle
  sechs Schritte gleichzeitig ablesbar sind.
*/

import { useEffect, useRef, useState } from "react";

const BEATS = [
  { bahnen: ["p-om", "p-parks"],           knoten: ["k-om", "k-nord", "k-ost", "k-sued", "k-norm"], fuell: 0.593, soc: 0.5,  summe: "32,0 MW", na: "bereit" },
  { bahnen: ["p-om", "p-parks", "p-awa"],  knoten: ["k-norm", "k-awa"],                             fuell: 0.737, soc: 0.5,  summe: "39,8 MW", na: "bereit" },
  { bahnen: ["p-awa", "p-rw"],             knoten: ["k-regel"],                                     fuell: 0.737, soc: 0.5,  summe: "39,8 MW", na: "bereit" },
  { bahnen: ["p-rw", "p-lade"],            knoten: ["k-wacht", "k-spei"],                           fuell: 0.737, soc: 0.95, summe: "39,8 MW", na: "bereit" },
  { bahnen: ["p-dros", "p-firms", "p-na"], knoten: ["k-sued", "k-firms", "k-na"],                   fuell: 0.719, soc: 0.95, summe: "38,8 MW", na: "Bestätigung nötig" },
  { bahnen: ["p-log", "p-parks"],          knoten: ["k-wacht"],                                     fuell: 0.719, soc: 0.95, summe: "38,8 MW", na: "Bestätigung nötig" },
] as const;

const BEAT_MS = 3000;

const SCHRITTE: [string, string, string][] = [
  ["read", "Lesen.", "Drei echte Feeds kommen herein. Sieben Geräte melden in drei Formaten."],
  ["read", "Mittag.", "Die Summe klettert von 32,0 auf 39,8 MW."],
  ["rw", "Grenze.", "38,88 MW sind erlaubt. Die Kreis-Regel schlägt an."],
  ["write", "Schreiben.", "Der Wächter lässt ein Kommando durch: laden. Nicht drosseln."],
  ["krit", "Voll.", "Erst jetzt wird gedrosselt. FIRMS meldet Feuer, der Not-Aus wartet."],
  ["write", "Log.", "Jedes Kommando steht als Zeile drin. Nichts wird überschrieben."],
];

const LOG: [string, string][] = [
  ["abruf", "Open-Meteo"],
  ["messung", "7 Geräte"],
  ["auffaelligkeit", "Grenze"],
  ["kommando", "laden"],
  ["kommando", "drosseln"],
  ["auffaelligkeit", "Feuer"],
];

export function Hero({ kopf = false }: { kopf?: boolean } = {}) {
  const wurzel = useRef<HTMLElement>(null);
  const [beat, setBeat] = useState(0);
  const [ruhe, setRuhe] = useState(false);

  /* Impulse holen ihre Bahn aus dem Pfad selbst — so kann die Geometrie
     zwischen Linie und Laufpunkt nicht auseinanderlaufen. */
  useEffect(() => {
    const el = wurzel.current;
    if (!el) return;
    for (const i of el.querySelectorAll<SVGCircleElement>(".impuls")) {
      const p = el.querySelector(`#${i.dataset.bahn}`);
      if (p) i.style.offsetPath = `path('${p.getAttribute("d")}')`;
    }
  }, []);

  useEffect(() => {
    const el = wurzel.current;
    if (!el) return;

    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    let takt: ReturnType<typeof setInterval> | null = null;
    let sichtbar = true;

    const stop = () => { if (takt) { clearInterval(takt); takt = null; } };
    const start = () => {
      if (takt || mq.matches || !sichtbar || document.hidden) return;
      takt = setInterval(() => setBeat((n) => (n + 1) % BEATS.length), BEAT_MS);
    };
    const anwenden = () => { setRuhe(mq.matches); if (mq.matches) stop(); else start(); };

    const beobachter = new IntersectionObserver(
      ([e]) => { sichtbar = e.isIntersecting; if (sichtbar) start(); else stop(); },
      { threshold: 0.2 },
    );
    beobachter.observe(el);

    const sicht = () => (document.hidden ? stop() : start());
    document.addEventListener("visibilitychange", sicht);
    mq.addEventListener("change", anwenden);
    anwenden();

    return () => {
      stop();
      beobachter.disconnect();
      document.removeEventListener("visibilitychange", sicht);
      mq.removeEventListener("change", anwenden);
    };
  }, []);

  const b = BEATS[beat];
  const an = (id: string) => (ruhe ? true : (b.bahnen as readonly string[]).includes(id));
  const knotenAn = (id: string) => !ruhe && (b.knoten as readonly string[]).includes(id);
  const fuell = ruhe ? 0.719 : b.fuell;
  const soc = ruhe ? 0.95 : b.soc;
  const summe = ruhe ? "38,8 MW" : b.summe;
  const na = ruhe ? "Bestätigung nötig" : b.na;

  const bahn = (id: string, art: string, d: string, extra = "") =>
    <path id={id} className={`bahn bahn--${art} ${extra} ${an(id) ? "an" : ""}`} d={d} />;

  return (
    <section
      ref={wurzel}
      className={kopf ? "sk-hero sk-hero--kopf" : "sk-hero"}
      data-beat={ruhe ? "ruhe" : beat + 1}
      aria-labelledby="hero-bu"
      aria-describedby="hero-lang"
    >
      <div className="sk-hero__stage" aria-hidden="true">
        <svg viewBox="0 0 1200 500" role="presentation" focusable="false">
          <text className="gruppe-label" x="32" y="72">Außen · echte Feeds</text>
          <text className="gruppe-label" x="262" y="72">Parks · simuliert</text>
          <text className="gruppe-label" x="512" y="72">Kern</text>
          <text className="gruppe-label" x="966" y="72">Event-Log</text>

          <g id="bahnen">
            {bahn("p-om", "read", "M202 124 H232 M232 124 V284 M232 124 H262 M232 204 H262 M232 284 H262")}
            {bahn("p-parks", "rw", "M442 124 H482 M442 204 H482 M442 284 H482 M482 284 V124 H512")}
            {bahn("p-awa", "read", "M202 204 H222 V344 H496 V204 H512")}
            {bahn("p-firms", "krit", "M202 284 H212 V376 H742 V284 H752")}
            {bahn("p-nr", "read", "M602 152 V176")}
            {bahn("p-rw", "read", "M602 232 V256")}
            {bahn("p-lade", "write", "M692 284 H712 V140 H752")}
            {bahn("p-dros", "write", "M512 300 H492 V416 H352 V312")}
            {bahn("p-log", "write", "M692 296 H732 V400 H1067 V312")}
            {bahn("p-na", "krit", "M922 284 H966")}
          </g>

          <g id="impulse">
            {([["p-om", "read"], ["p-parks", "rw"], ["p-awa", "read"], ["p-firms", "krit"],
               ["p-lade", "write"], ["p-dros", "write"], ["p-log", "write"]] as const).map(([id, art]) => (
              <circle key={id} className={`impuls ${!ruhe && an(id) ? "an" : ""}`} r="4"
                      fill={`var(--${art})`} data-bahn={id} />
            ))}
          </g>

          <Knoten id="k-om" an={knotenAn("k-om")} x={32} y={96} w={170} h={56} titel="Open-Meteo" zeile="Einstrahlung, Temp." />
          <Knoten id="k-awa" an={knotenAn("k-awa")} x={32} y={176} w={170} h={56} titel="aWATTar" zeile="Day-Ahead-Preis" />
          <Knoten id="k-firms" an={knotenAn("k-firms")} x={32} y={256} w={170} h={56} titel="NASA FIRMS" zeile="aktive Feuer" />
          <Knoten id="k-nord" an={knotenAn("k-nord")} x={262} y={96} w={180} h={56} titel="Feld Nord" zeile="18 MW · 2 WR · A/B" />
          <Knoten id="k-ost" an={knotenAn("k-ost")} x={262} y={176} w={180} h={56} titel="Feld Ost" zeile="24 MW · 3 WR · A/B/C" />
          <Knoten id="k-sued" an={knotenAn("k-sued")} x={262} y={256} w={180} h={56} titel="Feld Süd" zeile="12 MW · 2 WR · B/C" />
          <Knoten id="k-norm" an={knotenAn("k-norm")} x={512} y={96} w={180} h={56} titel="Normalisierung" zeile="A/B/C → ein Format" />
          <Knoten id="k-regel" an={knotenAn("k-regel")} x={512} y={176} w={180} h={56} titel="Kreis-Regel" zeile="Grenze 38,88 MW" />
          <Knoten id="k-wacht" an={knotenAn("k-wacht")} x={512} y={256} w={180} h={56} titel="Wächter" zeile="fail-closed" />

          <g className={`knoten ${knotenAn("k-spei") ? "an" : ""}`} id="k-spei">
            <rect x="752" y="96" width="170" height="88" rx="8" />
            <text className="titel" x="766" y="120">Speicher HQ</text>
            <text className="zeile" x="766" y="138">20 MWh · 5 MW</text>
            <rect className="soc-grund" x="766" y="150" width="142" height="8" rx="4" />
            <rect className="soc-fuell" x="766" y="150" width="142" height="8" rx="4"
                  style={{ "--soc": String(soc) } as React.CSSProperties} />
            <text className="zeile" x="766" y="174">{soc >= 0.95 ? "95 % · voll" : "50 % · Ruhe"}</text>
          </g>

          <Knoten id="k-na" an={knotenAn("k-na")} x={752} y={256} w={170} h={56} titel="Not-Aus" zeile={na} />

          <rect className="log-rahmen" x="966" y="88" width="202" height="232" rx="8" />
          <g id="log">
            {LOG.map(([art, was], i) => (
              <text key={art + i} className={`log-zeile ${ruhe || i <= beat ? "an" : ""}`} x="980" y={116 + i * 34}>
                <tspan className="art">{art}</tspan> · {was}
              </text>
            ))}
          </g>

          <text className="gruppe-label" x="32" y="442">Summe des Kreises</text>
          <rect className="band-grund" x="32" y="454" width="900" height="14" rx="7" />
          <rect className="band-fuell" x="32" y="454" width="900" height="14" rx="7"
                style={{ "--fuell": String(fuell) } as React.CSSProperties} />
          <line className={`band-grenze ${!ruhe && beat === 2 ? "an" : ""}`} x1="680" y1="446" x2="680" y2="476" />
          <text className="zeile" x="692" y="438"
                style={{ fill: "var(--signal)", fontFamily: "var(--font-zahl)", fontSize: 12 }}>
            38,88 MW Netzgrenze
          </text>
          <text x="960" y="468" style={{ fill: "var(--text)", fontFamily: "var(--font-zahl)", fontSize: 20 }}>
            {summe}
          </text>
        </svg>
      </div>

      <div className="sk-hero__kompakt" aria-hidden="true">
        <ol>
          {SCHRITTE.map(([art, fett, rest], i) => (
            <li key={fett} className={ruhe || i === beat ? "an" : ""}>
              <span className="marke" style={{ background: `var(--${art})` }} />
              <span><b>{fett}</b> {rest}</span>
            </li>
          ))}
        </ol>
      </div>

      <div className="sk-hero__unten">
        <p className="sk-hero__bu" id="hero-bu">
          Kein Dashboard, sondern das Nervensystem darunter: wer liest, wer schreibt,
          und was der Wächter durchlässt.
        </p>
        <p className="sk-hero__takt">
          {ruhe ? "Alle sechs Schritte, ohne Bewegung" : `Beat ${beat + 1} von 6`}
        </p>
      </div>

      <p className="sr-only" id="hero-lang">
        Schema in sechs Schritten. Erstens: Open-Meteo, aWATTar und NASA FIRMS liefern echte
        Daten. Drei simulierte Parks melden über sieben Wechselrichter in den Herstellerformaten
        A, B und C. Die Normalisierung macht daraus ein Format. Zweitens: zur Mittagszeit steigt
        die Summe des Kreises von 32,0 auf 39,8 Megawatt. Drittens: die Netzgrenze liegt bei
        38,88 Megawatt, die Kreis-Regel schlägt an. Viertens: der Wächter prüft und lässt ein
        einziges Kommando durch, den Speicher zu laden. Gedrosselt wird noch nicht. Fünftens:
        der Speicher erreicht 95 Prozent, seinen erlaubten Höchststand. Erst jetzt wird
        gedrosselt. Gleichzeitig meldet FIRMS ein Feuer, der Not-Aus wartet auf eine Bestätigung
        und löst nicht von selbst aus. Sechstens: jedes Kommando liegt als Zeile im
        Ereignisstrom, der nur wächst und nie überschrieben wird.
      </p>
    </section>
  );
}

function Knoten({
  id, an, x, y, w, h, titel, zeile,
}: { id: string; an: boolean; x: number; y: number; w: number; h: number; titel: string; zeile: string }) {
  return (
    <g className={`knoten ${an ? "an" : ""}`} id={id}>
      <rect x={x} y={y} width={w} height={h} rx="8" />
      <text className="titel" x={x + 14} y={y + 24}>{titel}</text>
      <text className="zeile" x={x + 14} y={y + 42}>{zeile}</text>
    </g>
  );
}
