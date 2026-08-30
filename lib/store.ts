/*
  Der Speicher. Append-only, im Arbeitsspeicher.

  Zwei Entscheidungen, die zusammengehören:

  1. Der Zustand wird nicht überschrieben, sondern gefaltet. Ein Sollwert ist
     kein Feld, das man setzt, sondern das Ergebnis aller Kommandos, die je
     ausgeführt wurden. Deshalb ist das Audit-Log nicht nachträglich
     angeklebt — es IST der Zustand, und ein Kommando ohne Eintrag im Log kann
     es gar nicht geben.

  2. Messwerte liegen NICHT im Log. Sie werden aus (Gerät, Zeitpunkt, Wetter)
     berechnet, wenn jemand fragt. Ein Solarpark erzeugt sonst je Gerät und
     Sekunde einen Eintrag; nach einer Stunde wären das 25.000 Ereignisse für
     null Erkenntnis. Ins Log kommt eine Messung nur, wenn sie etwas ausgelöst
     hat — eine Auffälligkeit oder ein Kommando.

  Grenze, die v1 bewusst hat: bei einem Kaltstart auf Vercel ist das Log leer.
  Kommandos und Auffälligkeiten überleben keinen Neustart der Instanz. Das ist
  für ein Demonstrationsstück vertretbar und steht so in der Dokumentation;
  der Weg nach draußen wäre Supabase mit derselben append-only-Tabelle.
*/

import type { Device, SolarEvent } from "./model";
import { DEVICES } from "./seed";

interface Clock {
  /** Zeitraffer. 1 = Echtzeit. */
  speed: number;
  /** Simulationszeit zum Zeitpunkt realEpoch. */
  simEpoch: number;
  realEpoch: number;
}

interface Store {
  events: SolarEvent[];
  clock: Clock;
  /** Wer gerade angemeldet ist. Stub, kein Auth-System. */
  operatorId: string;
  startedAt: number;
}

/*
  Ein Modul-Singleton reicht in Produktion, überlebt aber kein Hot Reload:
  Next lädt das Modul neu, die Referenz ist weg, das Log leer. Deshalb hängt
  er in der Entwicklung an globalThis.
*/
const globalRef = globalThis as unknown as { __solarkreis?: Store };

function create(): Store {
  const now = Date.now();
  return {
    events: [],
    clock: { speed: 1, simEpoch: now, realEpoch: now },
    operatorId: "op-kreis",
    startedAt: now,
  };
}

export function store(): Store {
  if (!globalRef.__solarkreis) globalRef.__solarkreis = create();
  return globalRef.__solarkreis;
}

/* ── Ereignisse ─────────────────────────────────────────────────────────── */

export function append(event: SolarEvent): void {
  store().events.push(event);
}

export function events(): readonly SolarEvent[] {
  return store().events;
}

/* ── Uhr ────────────────────────────────────────────────────────────────── */

/** Aktuelle Simulationszeit. Bei speed = 1 identisch mit der echten Uhr. */
export function simNow(): number {
  const { speed, simEpoch, realEpoch } = store().clock;
  return simEpoch + (Date.now() - realEpoch) * speed;
}

/** Zeitraffer ändern, ohne dass die Simulationszeit springt. */
export function setSpeed(speed: number): void {
  const s = store();
  s.clock = { speed, simEpoch: simNow(), realEpoch: Date.now() };
}

/* ── Projektion ─────────────────────────────────────────────────────────── */

/**
 * Der Gerätezustand, gefaltet aus dem Ereignisstrom. Ausgangspunkt sind die
 * Stammdaten, darauf laufen alle ausgeführten Kommandos in ihrer Reihenfolge.
 * Nicht ausgeführte Kommandos ändern nichts — sie stehen trotzdem im Log,
 * mitsamt der Begründung des Wächters.
 */
export function projectDevices(): Device[] {
  const state = DEVICES.map((d) => ({ ...d }));

  for (const e of store().events) {
    if (e.kind !== "kommando") continue;
    const c = e.command;
    if (c.status !== "ausgefuehrt") continue;

    const targets = state.filter(
      (d) => d.park_id === c.park_id && (c.device_id === null || d.id === c.device_id),
    );

    for (const d of targets) {
      switch (c.action) {
        case "setpoint_setzen":
          if (c.value !== null) d.setpoint = clamp01(c.value);
          break;
        case "drosseln":
          d.setpoint = clamp01(c.value ?? 0.5);
          break;
        case "not_aus":
          d.setpoint = 0;
          d.status = "offline";
          break;
        case "freigeben":
          d.setpoint = 1;
          if (d.status === "offline") d.status = "ok";
          break;
      }
    }
  }

  return state;
}

export function deviceById(id: string): Device | undefined {
  return projectDevices().find((d) => d.id === id);
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/** Nur für Tests und die Prüfseite. */
export function reset(): void {
  globalRef.__solarkreis = create();
}
