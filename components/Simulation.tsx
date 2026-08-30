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
import type { Zustand } from "@/lib/zustand";
import { StatusBar } from "./StatusBar";
import { Lageplan } from "./Lageplan";
import { Schreibpfad } from "./Schreibpfad";

const TAKT_MS = 2000;

export function Simulation({ initial }: { initial: Zustand }) {
  const [z, setZ] = useState(initial);
  const [fehler, setFehler] = useState<string | null>(null);

  /* Nach einem Kommando sofort neu holen statt auf den Takt zu warten —
     sonst sieht der Bediener seine eigene Wirkung erst zwei Sekunden später. */
  const [anstoss, setAnstoss] = useState(0);

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
      <Lageplan z={z} />
      <Schreibpfad z={z} nachKommando={() => setAnstoss((n) => n + 1)} />
    </>
  );
}
