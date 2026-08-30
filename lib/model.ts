/*
  Das Datenmodell. Eine Datei, damit man es an einem Stück lesen kann.

  Ehrlichkeitsregel des Projekts: jeder Typ sagt, ob er echte oder simulierte
  Daten trägt. `origin` ist kein Schmuck — die Oberfläche liest es aus, um
  „echt" von „simuliert" zu unterscheiden, statt sich auf Kommentare zu verlassen.
*/

export type Origin = "echt" | "simuliert";

/** Woher ein Wert stammt. Wird bis in die Oberfläche durchgereicht. */
export interface Source {
  origin: Origin;
  /** Anzeigename, z. B. "Open-Meteo" oder "Sim (Solargeometrie + Rauschen)". */
  label: string;
  /** Wann zuletzt erfolgreich abgerufen. null = noch nie. */
  fetchedAt: number | null;
}

/* ── Stammdaten ─────────────────────────────────────────────────────────── */

export type OperatorId = string;

/** Ein Solarpark. Simuliert — aber an echten Koordinaten, damit das Wetter stimmt. */
export interface Park {
  id: string;
  name: string;
  /** Ortsangabe für die Oberfläche, z. B. "Templin, Brandenburg". */
  place: string;
  lat: number;
  lon: number;
  capacity_kw: number;
  operator_id: OperatorId;
}

/** Die drei Geräteformate aus dem Brief. Der Kernbeleg der Normalisierung. */
export type VendorFormat = "A" | "B" | "C";

export type DeviceStatus = "ok" | "degradiert" | "offline";

/** Ein Wechselrichter. */
export interface Device {
  id: string;
  park_id: string;
  vendor_format: VendorFormat;
  status: DeviceStatus;
  /** Anteil der Parkleistung, den dieses Gerät trägt. Summe je Park = 1. */
  share: number;
  /**
   * Sollwert 0..1, gesetzt über den Schreibpfad. 1 = volle Leistung.
   * Der einzige Wert am Gerät, den ein Mensch verändern kann.
   */
  setpoint: number;
}

/* ── Messwerte ──────────────────────────────────────────────────────────── */

/** Ein normalisierter Messwert. Egal welches Format hereinkam — hier steht dies. */
export interface Reading {
  device_id: string;
  ts: number;
  output_kw: number;
  panel_temp: number;
  irradiance: number;
}

/** Day-Ahead-Spotpreis. Echt, von aWATTar. */
export interface MarketPrice {
  ts: number;
  price_eur_mwh: number;
}

/* ── Auffälligkeiten ────────────────────────────────────────────────────── */

export type AlertType =
  | "trockenstress"
  | "ueberhitzung"
  | "ueberlast"
  | "waldbrand"
  | "daten_veraltet";

export type Severity = "hinweis" | "warnung" | "kritisch";

export interface Alert {
  id: string;
  park_id: string | null;
  type: AlertType;
  severity: Severity;
  ts: number;
  message: string;
  /** Woher der Auslöser kam — inklusive echt/simuliert. */
  source: Source;
}

/* ── Schreibpfad ────────────────────────────────────────────────────────── */

export type CommandAction =
  | "setpoint_setzen"
  | "drosseln"
  | "not_aus"
  | "freigeben";

/**
 * Das Ergebnis des Wächters. fail-closed heißt: alles außer "autorisiert"
 * führt nicht zur Ausführung, sondern in den sicheren Zustand.
 */
export type GuardResult =
  | { ok: true; kind: "autorisiert" }
  | { ok: false; kind: "bestaetigung_noetig"; reason: string }
  | { ok: false; kind: "blockiert"; reason: string; safeDefault: CommandAction };

export type CommandStatus = "angefordert" | "ausgefuehrt" | "abgelehnt";

export interface Command {
  id: string;
  park_id: string;
  device_id: string | null;
  action: CommandAction;
  /** Zielwert bei setpoint_setzen, 0..1. Sonst null. */
  value: number | null;
  requested_by: OperatorId;
  guard_result: GuardResult;
  status: CommandStatus;
  ts: number;
}

/* ── Event Sourcing ─────────────────────────────────────────────────────── */

/**
 * Der Ereignisstrom. Append-only: nichts wird überschrieben, der Zustand ist
 * immer die Faltung über diese Liste. Das ist die Grundlage für das Audit-Log
 * und der Grund, warum der Schreibpfad nachvollziehbar ist.
 */
export type SolarEvent =
  | { kind: "messung"; ts: number; reading: Reading }
  | { kind: "kommando"; ts: number; command: Command }
  | { kind: "auffaelligkeit"; ts: number; alert: Alert }
  | { kind: "abruf"; ts: number; source: Source; note: string };

export interface Operator {
  id: OperatorId;
  name: string;
  /** Mandantentrennung: nur diese Parks darf der Operator schreiben. */
  parks: string[];
}
