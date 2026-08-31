"use client";

/*
  Der lebende Teil. Der Server rendert den ersten Zustand, danach holt die
  Seite ihn im Takt nach — eine Abfrage für alles, damit die Anzeige nicht aus
  drei verschiedenen Zeitpunkten zusammengesetzt ist.

  Bewusst Polling und kein Stream: der Zustand ist eine Faltung über den
  Ereignisstrom und jederzeit für einen beliebigen Zeitpunkt berechenbar. Ein
  Push-Kanal wäre mehr Technik für dieselbe Aussage.
*/

import { useEffect, useState } from "react";
import { useKommando } from "./useKommando";
import type { Zustand } from "@/lib/zustand";
import { StatusBar } from "./StatusBar";
import { Lageplan } from "./Lageplan";
import { Schreibpfad } from "./Schreibpfad";

const TAKT_MS = 2000;

/*
  Der Alarmstreifen. Zeigt, was die Kreis-Regel entschieden hat — auch dann,
  wenn sie nichts tut. Eine Automatik, die nur bei Eingriffen sichtbar wird,
  lässt offen, ob sie überhaupt läuft.

  Farbe ist nie das einzige Signal: jede Zeile trägt ihr Wort (Hinweis,
  Warnung, Kritisch) im Text.
*/
function Alarmstreifen({ z, onFeld }: { z: Zustand; onFeld: (id: string) => void }) {
  /* Der Streifen war ein gelber Block über die volle Breite — 80px
     leuchtende Fläche zwischen dunkler Statusleiste und dunkler Insel. Er
     hat die Kopfzone in vier Bänder zerlegt und war lauter als der Alarm,
     den er meldet.

     Jetzt trägt er denselben Grund wie der Rest der Kopfzone; die Schwere
     steht in einer Kante links und im Wort. Farbe war hier ohnehin nie das
     einzige Signal — jede Zeile nennt ihre Stufe ausgeschrieben. */
  const schwere = z.alarme[0]?.severity;
  const kante =
    schwere === "kritisch" ? "var(--krit)"
    : schwere === "warnung" ? "var(--write)"
    : "var(--read)";

  return (
    <div
      role="status"
      style={{
        padding: "10px 40px",
        background: "var(--grund)",
        color: "var(--text)",
        borderLeft: `4px solid ${z.alarme.length ? kante : "var(--rahmen)"}`,
        display: "flex",
        gap: 16,
        alignItems: "baseline",
        flexWrap: "wrap",
      }}
    >
      <span className="sk-mono-eyebrow" style={{ color: "var(--leise)" }}>
        Kreis-Regel {z.regel.ausgewertet ? "aktiv" : "wartet"}
      </span>
      <span className="sk-text-kompakt">
        {z.alarme.length ? `${z.alarme[0].severity} · ${z.alarme[0].message}` : z.regel.grund}
      </span>
      {/* Der Weg zum Schalter. Ein Alarm, der ein Feld nennt, muss sagen, wo
          man für dieses Feld eingreift — sonst steht der Satz da und die
          Frage „und wo?" bleibt offen. Der Verweis erscheint bei jedem Alarm
          mit Feldbezug, nicht nur beim kritischen: er sagt „hier entlang",
          nicht „handle jetzt". */}
      {/* Der Verweis zeigte auf den Abschnitt unten, solange dort die Knöpfe
          standen. Sie sitzen jetzt an der Feldkarte im Lageplan — also führt
          er dorthin: er hebt das betroffene Feld hervor und klappt seine
          Schaltwarte auf. Ein Sprung nach unten wäre jetzt der Weg weg von
          der Bedienung. */}
      {z.alarme[0]?.park_id && (
        <button
          type="button"
          className="sk-text-titel-klein"
          onClick={() => onFeld(z.alarme[0].park_id!)}
          style={{
            background: "none",
            border: 0,
            padding: "4px 0",
            minHeight: 24,
            color: "var(--akzent)",
            textDecoration: "underline",
            cursor: "pointer",
            font: "inherit",
          }}
        >
          Betroffenes Feld zeigen →
        </button>
      )}
      {z.regel.gehandelt.length > 0 && (
        <span className="sk-mono-daten">{z.regel.gehandelt.join(" · ")}</span>
      )}
    </div>
  );
}

export function Simulation({ initial }: { initial: Zustand }) {
  const [z, setZ] = useState(initial);
  const [fehler, setFehler] = useState<string | null>(null);

  /* Nach einem Kommando sofort neu holen statt auf den Takt zu warten —
     sonst sieht der Bediener seine eigene Wirkung erst zwei Sekunden später. */
  const [anstoss, setAnstoss] = useState(0);

  /* Welches Feld gerade angesehen wird. Der Zustand liegt hier, weil ihn
     zwei Geschwister brauchen: der Lageplan zeigt das Feld, „Eingreifen"
     bedient es. Wer im Plan darüberfährt, sieht unten die zugehörige Karte
     aufleuchten — und wer unten eine Karte anfasst oder antabbt, sieht oben
     das Feld. Der Weg bleibt zwei Blicke lang, aber man verliert das Feld
     dabei nicht. */
  const [feldAktiv, setFeldAktiv] = useState<string | null>(null);

  /* Ein Weg zum Wächter, zwei Bedienorte: die Schaltwarte über der Feldkarte
     im Lageplan und der Abschnitt „Eingreifen" darunter. */
  const { senden, laeuft, antwort } = useKommando(z.operatorId, () =>
    setAnstoss((n) => n + 1),
  );

  useEffect(() => {
    let lebt = true;
    const hol = async () => {
      try {
        const r = await fetch("/api/state", { cache: "no-store" });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const neu = (await r.json()) as Zustand;
        if (lebt) {
          setZ(neu);
          setFehler(null);
        }
      } catch (e) {
        /* Der Fehler wird angezeigt, nicht verschluckt. Eine Oberfläche, die
           bei totem Feed die letzten Werte weiterzeigt, behauptet etwas. */
        if (lebt) setFehler(e instanceof Error ? e.message : "unbekannt");
      }
    };
    hol();
    const id = setInterval(hol, TAKT_MS);
    return () => {
      lebt = false;
      clearInterval(id);
    };
  }, [anstoss]);

  return (
    <>
      {/* Die Kopfzone: Statusleiste, Alarmstreifen und Lageplan teilen sich
          einen Grund und liegen deshalb in einem Element. Die dunkle Palette
          hängt an dieser Klasse — ohne den gemeinsamen Rahmen löst
          var(--grund) in der Statusleiste nicht auf.
          „Eingreifen" darunter bleibt hell: eine dunkle Insel in hellem
          Umfeld, dieselbe Aufteilung wie auf der Introseite. */}
      <div className="sk-dunkelzone">
        <StatusBar z={z} />
        {fehler && (
        <div
          role="status"
          className="sk-text-kompakt"
          style={{
            padding: "10px 40px",
            background: "var(--sk-crit-fill)",
            color: "var(--sk-on-fill)",
          }}
        >
          Zustand nicht aktualisiert ({fehler}). Angezeigt wird der letzte
          erfolgreiche Abruf von {new Date(z.ts).toLocaleTimeString("de-DE")}.
        </div>
      )}
        <Alarmstreifen z={z} onFeld={setFeldAktiv} />
        <Lageplan
          z={z}
          feldAktiv={feldAktiv}
          onFeld={setFeldAktiv}
          senden={senden}
          laeuft={laeuft}
        />
      </div>

      {/* Die Einordnung, direkt unter der Insel.

          Kein pauschales „kann Fehler enthalten" — das sagt nichts darüber,
          welcher Teil wackelt, und würde die Kennzeichnungen entwerten, die
          überall sonst genau dafür da sind: echt gegen simuliert an jeder
          Quelle, „Stub, kein Auth" an der Mandantenzeile.

          Dieser Satz sagt stattdessen, was das Ding ist, und zieht die
          Grenze an der einzigen Stelle, an der sie im Bild verläuft. */}
      <p
        className="sk-text-kompakt"
        style={{
          margin: 0,
          padding: "12px var(--gutter)",
          color: "var(--color-muted)",
          borderBottom: "1px solid var(--color-surface)",
        }}
      >
        Arbeitsprobe, keine Betriebssoftware: die Parks sind simuliert, die
        Eingangsdaten nicht.
      </p>

      <Schreibpfad
        z={z}
        feldAktiv={feldAktiv}
        onFeld={setFeldAktiv}
        senden={senden}
        laeuft={laeuft}
        antwort={antwort}
      />
    </>
  );
}
