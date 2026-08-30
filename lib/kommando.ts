/*
  Schritt 6: der Schreibpfad.

  Bis hierher konnte das System nur lesen. Das hier ist die Stelle, an der es
  eingreift — und der Grund, warum es davor einen Wächter gibt.

  Die Reihenfolge ist die ganze Aussage:

      Anforderung → Wächter → Ereignis → Faltung → Zustand

  Ein Kommando ändert NIE direkt einen Wert. Es wird angehängt, und der
  Zustand ergibt sich aus der Faltung über alle angehängten Kommandos. Damit
  kann es kein Kommando ohne Eintrag geben — das Log ist nicht das Protokoll
  neben dem Zustand, es IST der Zustand.

  Auch abgelehnte Kommandos werden angehängt. Ein Wächter, dessen Absagen
  spurlos verschwinden, ist nicht prüfbar.

  fail-closed heißt hier wörtlich: alles außer „autorisiert" führt nicht zur
  Ausführung, sondern in den sicheren Zustand. Der sichere Zustand ist nie
  „weitermachen wie bisher".
*/

import type {
  Command,
  CommandAction,
  GuardResult,
  OperatorId,
  SolarEvent,
} from "./model";
import { STORAGE, operatorById, parkById } from "./seed";
import { append, projectDevices, simNow, store } from "./store";
import { projectStorage, storageGuard } from "./storage";
import { preisStand } from "./awattar";

/** Aktionen, die eine ganze Anlage stilllegen. Nie ohne zweite Bestätigung. */
const KRITISCH: CommandAction[] = ["not_aus"];

/** Aktionen am Speicher statt an einem Gerät. */
const SPEICHER: CommandAction[] = ["speicher_laden", "speicher_entladen", "speicher_ruhe"];

export interface KommandoAnfrage {
  action: CommandAction;
  park_id?: string | null;
  device_id?: string | null;
  storage_id?: string | null;
  value?: number | null;
  requested_by?: OperatorId;
  /** Zweite Hand bei kritischen Aktionen. Ohne sie kommt „bestaetigung_noetig". */
  bestaetigt?: boolean;
}

/**
 * Der Wächter. Prüft in der Reihenfolge, in der die Gründe wiegen:
 * Zuständigkeit, dann Zustand der Anlage, dann Frische der Daten, zuletzt
 * die zweite Hand. Der erste Treffer entscheidet — so steht in der Absage
 * immer der eigentliche Grund und nicht der zufällig zuletzt geprüfte.
 */
export function guard(a: KommandoAnfrage, ts: number = simNow()): GuardResult {
  const operatorId = a.requested_by ?? store().operatorId;
  const operator = operatorById(operatorId);

  if (!operator) {
    return { ok: false, kind: "blockiert", reason: `Unbekannter Bediener: ${operatorId}.`, safeDefault: "freigeben" };
  }

  /* ── Speicher-Aktionen haben ihren eigenen, schon geprüften Wächter ── */
  if (SPEICHER.includes(a.action)) {
    return storageGuard(a.action, {
      operatorId,
      priceAgeMs: preisStand(ts).alterMs,
      state: projectStorage(ts),
    });
  }

  /* ── Zuständigkeit. Mandantentrennung ist kein Komfort, sondern die
        Grenze, hinter der ein Bediener fremde Anlagen schaltet. ── */
  const park = a.park_id ? parkById(a.park_id) : undefined;
  if (!park) {
    return { ok: false, kind: "blockiert", reason: `Unbekanntes Feld: ${a.park_id ?? "keins"}.`, safeDefault: "freigeben" };
  }
  if (!operator.parks.includes(park.id)) {
    return {
      ok: false,
      kind: "blockiert",
      reason: `${operator.name} ist für ${park.name} nicht schreibberechtigt.`,
      safeDefault: "freigeben",
    };
  }

  /* ── Zustand der Anlage ── */
  const geraete = projectDevices().filter(
    (d) => d.park_id === park.id && (!a.device_id || d.id === a.device_id),
  );
  if (geraete.length === 0) {
    return { ok: false, kind: "blockiert", reason: `Kein Gerät gefunden: ${a.device_id ?? park.id}.`, safeDefault: "freigeben" };
  }
  if (a.action !== "freigeben" && geraete.every((d) => d.status === "offline")) {
    return {
      ok: false,
      kind: "blockiert",
      reason: "Gerät ist offline. Erst freigeben, dann schalten.",
      safeDefault: "freigeben",
    };
  }

  /* ── Frische der Daten. Ein Sollwert, der auf veralteten Messwerten
        beruht, ist geraten. Hier zählt das Wetter, weil die Leistung
        daraus gerechnet wird. ── */
  if (a.action === "drosseln" || a.action === "setpoint_setzen") {
    if (letzterEchterAbrufAlterMs() === null) {
      return {
        ok: false,
        kind: "blockiert",
        reason: "Keine Wetterdaten. Ohne Einstrahlung ist jeder Sollwert geraten.",
        safeDefault: "freigeben",
      };
    }
  }

  /* ── Wertebereich ── */
  if (a.action === "setpoint_setzen" && (a.value === null || a.value === undefined || a.value < 0 || a.value > 1)) {
    return { ok: false, kind: "blockiert", reason: "Sollwert muss zwischen 0 und 1 liegen.", safeDefault: "freigeben" };
  }

  /* ── Die zweite Hand, zuletzt ── */
  if (KRITISCH.includes(a.action) && !a.bestaetigt) {
    return {
      ok: false,
      kind: "bestaetigung_noetig",
      reason: `Not-Aus legt ${a.device_id ?? park.name} still. Bitte bestätigen.`,
    };
  }

  return { ok: true, kind: "autorisiert" };
}

/**
 * Alter des letzten erfolgreichen echten Abrufs in ms, null wenn es keinen gab.
 * Läuft über den Ereignisstrom und nicht über den Zwischenspeicher der Quelle:
 * was der Wächter prüft, muss dasselbe sein, was später im Log nachlesbar ist.
 */
function letzterEchterAbrufAlterMs(): number | null {
  const events = store().events;
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.kind !== "abruf") continue;
    if (e.source.origin !== "echt") continue;
    return e.source.fetchedAt === null ? null : Date.now() - e.source.fetchedAt;
  }
  return null;
}

let laufendeNummer = 0;

/**
 * Führt aus — oder eben nicht. In beiden Fällen entsteht genau ein Ereignis.
 * Der Rückgabewert ist das, was angehängt wurde, nicht das, was gewünscht war.
 */
export function ausfuehren(a: KommandoAnfrage, ts: number = simNow()): Command {
  const ergebnis = guard(a, ts);

  const command: Command = {
    id: `cmd-${ts}-${++laufendeNummer}`,
    park_id: a.park_id ?? null,
    device_id: a.device_id ?? null,
    storage_id: SPEICHER.includes(a.action) ? (a.storage_id ?? STORAGE.id) : null,
    action: a.action,
    value: a.value ?? null,
    requested_by: a.requested_by ?? store().operatorId,
    guard_result: ergebnis,
    status: ergebnis.ok ? "ausgefuehrt" : "abgelehnt",
    ts,
  };

  const ereignis: SolarEvent = { kind: "kommando", ts, command };
  append(ereignis);
  return command;
}
