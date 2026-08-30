/*
  Der Speicher: Ladestand, Wächter, Entscheidung.

  Warum der Ladestand hier gefaltet wird und nicht als Feld irgendwo steht:
  Ein Sollwert ist „letztes Kommando gewinnt" — den bekommt man auch ohne
  Ereignisstrom. Ein Ladestand ist eine Akkumulation über den GESAMTEN Strom
  und zusätzlich über die Zeit zwischen den Kommandos. Man kann ihn nicht aus
  dem letzten Ereignis ablesen. Damit ist das append-only-Log in diesem
  Produkt tragend und nicht bloß ordentlich.
*/

import type { Command, GuardResult, SolarEvent, Storage, StorageMode, StorageState } from "./model";
import { OPERATORS, STORAGE } from "./seed";
import { store } from "./store";

/** Ab wann Preisdaten als veraltet gelten. Danach wird nicht gehandelt. */
export const MAX_PRICE_AGE_MS = 15 * 60_000;

const modeOf = (action: Command["action"]): StorageMode | null => {
  switch (action) {
    case "speicher_laden": return "laden";
    case "speicher_entladen": return "entladen";
    case "speicher_ruhe": return "ruhe";
    default: return null;
  }
};

/**
 * Ladestand nach `dtMs` Millisekunden in einem Modus.
 * Der Wirkungsgrad wird als Wurzel auf beide Richtungen aufgeteilt — die
 * übliche Konvention, damit Laden und Entladen je die Hälfte der Verluste
 * tragen und der Zyklus insgesamt auf `round_trip_efficiency` kommt.
 */
function integrate(s: Storage, soc: number, mode: StorageMode, dtMs: number): number {
  if (mode === "ruhe" || dtMs <= 0) return soc;
  const hours = dtMs / 3_600_000;
  const half = Math.sqrt(s.round_trip_efficiency);

  if (mode === "laden") {
    const intoCells = s.power_kw * half * hours;
    return Math.min(s.max_soc, soc + intoCells / s.capacity_kwh);
  }
  // Um power_kw ans Netz zu geben, müssen die Zellen mehr hergeben.
  const fromCells = (s.power_kw / half) * hours;
  return Math.max(s.reserve_soc, soc - fromCells / s.capacity_kwh);
}

/**
 * Die Faltung selbst — rein, ohne Speicherzugriff. So lässt sie sich gegen
 * einen erfundenen Ereignisstrom prüfen, ohne den echten anzufassen.
 */
export function foldStorage(
  events: readonly SolarEvent[],
  startedAt: number,
  at: number,
  s: Storage = STORAGE,
): StorageState {
  let soc = s.initial_soc;
  let mode: StorageMode = "ruhe";
  let t = startedAt;

  for (const e of events) {
    if (e.kind !== "kommando") continue;
    const c = e.command;
    if (c.storage_id !== s.id || c.status !== "ausgefuehrt") continue;
    const next = modeOf(c.action);
    if (next === null) continue;
    if (c.ts > at) break;

    soc = integrate(s, soc, mode, c.ts - t);
    t = c.ts;
    mode = next;
  }
  soc = integrate(s, soc, mode, at - t);

  // An den Grenzen läuft nichts mehr, egal was der Modus sagt.
  const atTop = soc >= s.max_soc - 1e-9;
  const atBottom = soc <= s.reserve_soc + 1e-9;
  const grid_kw =
    mode === "laden" && !atTop ? s.power_kw
    : mode === "entladen" && !atBottom ? -s.power_kw
    : 0;

  return {
    mode,
    soc,
    grid_kw,
    available_kwh: Math.max(0, (soc - s.reserve_soc) * s.capacity_kwh),
    headroom_kwh: Math.max(0, (s.max_soc - soc) * s.capacity_kwh),
  };
}

/** Zustand des Speichers zu einem Zeitpunkt, gefaltet aus dem echten Ereignisstrom. */
export function projectStorage(at: number, s: Storage = STORAGE): StorageState {
  const st = store();
  return foldStorage(st.events, st.startedAt, at, s);
}

/* ── Wächter ────────────────────────────────────────────────────────────── */

export interface StorageGuardContext {
  operatorId: string;
  /** Alter der Preisdaten in ms. null = noch nie abgerufen. */
  priceAgeMs: number | null;
  state: StorageState;
}

/**
 * fail-closed: alles außer „autorisiert" führt nicht zur Ausführung, sondern
 * in den sicheren Zustand — und der ist beim Speicher immer Ruhestellung.
 * Nicht Entladen, nicht Laden: nichts tun ist die einzige Handlung, die ohne
 * verlässliche Preisdaten nachweislich keinen Schaden anrichtet.
 */
export function storageGuard(
  action: Command["action"],
  ctx: StorageGuardContext,
  s: Storage = STORAGE,
): GuardResult {
  const mode = modeOf(action);
  if (mode === null) {
    return { ok: false, kind: "blockiert", reason: "Kein Speicher-Kommando.", safeDefault: "speicher_ruhe" };
  }

  const op = OPERATORS.find((o) => o.id === ctx.operatorId);
  if (!op || op.id !== s.operator_id) {
    return {
      ok: false,
      kind: "blockiert",
      reason: `Mandantentrennung: ${op?.name ?? "Unbekannter Operator"} betreibt diesen Speicher nicht.`,
      safeDefault: "speicher_ruhe",
    };
  }

  // Ruhestellung ist immer erlaubt — das ist der sichere Zustand selbst.
  if (mode === "ruhe") return { ok: true, kind: "autorisiert" };

  if (ctx.priceAgeMs === null || ctx.priceAgeMs > MAX_PRICE_AGE_MS) {
    const alter = ctx.priceAgeMs === null ? "nie abgerufen" : `${Math.round(ctx.priceAgeMs / 60_000)} min alt`;
    return {
      ok: false,
      kind: "blockiert",
      reason: `Preisdaten ${alter} — ohne frischen Preis wird nicht gehandelt.`,
      safeDefault: "speicher_ruhe",
    };
  }

  if (mode === "laden" && ctx.state.headroom_kwh <= 0) {
    return { ok: false, kind: "blockiert", reason: `Ladestand bei ${(s.max_soc * 100).toFixed(0)} % — voll.`, safeDefault: "speicher_ruhe" };
  }

  if (mode === "entladen" && ctx.state.available_kwh <= 0) {
    return { ok: false, kind: "blockiert", reason: `Reserve von ${(s.reserve_soc * 100).toFixed(0)} % erreicht — wird nicht weiter entladen.`, safeDefault: "speicher_ruhe" };
  }

  return { ok: true, kind: "autorisiert" };
}

/* ── Die Leiter ─────────────────────────────────────────────────────────── */

export interface LadderInput {
  price_eur_mwh: number;
  total_output_kw: number;
  grid_limit_kw: number;
  state: StorageState;
  /** Unter diesem Preis wird geladen. Vom Betreiber einstellbar. */
  charge_below: number;
  /** Über diesem Preis wird abgegeben. */
  discharge_above: number;
}

export interface LadderDecision {
  storage: StorageMode;
  /** Soll ein Park gedrosselt werden? Erst wenn der Speicher nicht mehr aufnimmt. */
  curtail: boolean;
  reason: string;
}

/**
 * Die Kreis-Regel als Leiter statt als Schalter.
 *
 * Der Brief sagt: über der Netzgrenze ODER Preis negativ → schwächsten Park
 * drosseln. Das heißt, Energie wegwerfen. Mit Speicher wird daraus eine
 * Reihenfolge: erst aufnehmen, drosseln nur wenn nichts mehr hineinpasst.
 * Abregelung ist damit das letzte Mittel und nicht die erste Reaktion.
 *
 * Wird in Schritt 7 verdrahtet, wenn aWATTar und die Alarme stehen. Hier steht
 * sie schon, weil sie der Grund ist, warum es den Speicher überhaupt gibt.
 */
export function ladder(i: LadderInput): LadderDecision {
  const surplus = i.total_output_kw > i.grid_limit_kw;
  const cheap = i.price_eur_mwh < i.charge_below;
  const canTake = i.state.headroom_kwh > 0;

  if (surplus || cheap) {
    if (canTake) {
      return {
        storage: "laden",
        curtail: false,
        reason: surplus
          ? `Über der Netzgrenze — Überschuss geht in den Speicher (${Math.round(i.state.headroom_kwh)} kWh frei).`
          : `Preis ${i.price_eur_mwh.toFixed(2)} €/MWh unter der Schwelle ${i.charge_below} — wird eingelagert.`,
      };
    }
    return {
      storage: "ruhe",
      curtail: true,
      reason: "Speicher voll — jetzt erst wird gedrosselt.",
    };
  }

  if (i.price_eur_mwh > i.discharge_above && i.state.available_kwh > 0) {
    return {
      storage: "entladen",
      curtail: false,
      reason: `Preis ${i.price_eur_mwh.toFixed(2)} €/MWh über der Schwelle ${i.discharge_above} — ${Math.round(i.state.available_kwh)} kWh werden abgegeben.`,
    };
  }

  return { storage: "ruhe", curtail: false, reason: "Kein Anlass zu handeln." };
}
