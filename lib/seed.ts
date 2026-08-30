/*
  Stammdaten. Die Parks sind erfunden, die Koordinaten nicht — sie liegen an
  Orten in Brandenburg, an denen tatsächlich Solarparks stehen. Grund: das
  Wetter muss echt sein können. Open-Meteo liefert ab Schritt 3 die Einstrahlung
  für genau diese Punkte; an einer Fantasiekoordinate wäre der Feed sinnlos.

  Leistungen und Geräte sind frei gewählt. Der Brief sagt „ein kleines Netz" —
  das hier sind 54 MW über drei Felder, nicht die 128 MW, die in Templin
  wirklich stehen. Wo etwas simuliert ist, sagt die Oberfläche es.
*/

import type { Device, Operator, Park } from "./model";

/** Die Zentrale. Kein Park — der Knoten in der Mitte des Kreises. */
export const HQ = {
  id: "hq",
  name: "HQ",
  place: "Berlin",
  lat: 52.52,
  lon: 13.405,
} as const;

export const PARKS: Park[] = [
  {
    id: "nord",
    name: "Feld Nord",
    place: "Templin, Brandenburg",
    lat: 53.1225,
    lon: 13.5017,
    capacity_kw: 18_000,
    operator_id: "op-kreis",
  },
  {
    id: "ost",
    name: "Feld Ost",
    place: "Neuhardenberg, Brandenburg",
    lat: 52.6017,
    lon: 14.2408,
    capacity_kw: 24_000,
    operator_id: "op-kreis",
  },
  {
    id: "sued",
    name: "Feld Süd",
    place: "Jüterbog, Brandenburg",
    lat: 51.9958,
    lon: 13.0764,
    capacity_kw: 12_000,
    operator_id: "op-kreis",
  },
];

/**
 * Wechselrichter. Die Formate A/B/C sind über die Felder gemischt, damit die
 * Normalisierung überall sichtbar wird und nicht nur an einem Park.
 * share summiert je Park auf 1.
 */
export const DEVICES: Device[] = [
  { id: "nord-wr1", park_id: "nord", vendor_format: "A", status: "ok", share: 0.55, setpoint: 1 },
  { id: "nord-wr2", park_id: "nord", vendor_format: "B", status: "ok", share: 0.45, setpoint: 1 },

  { id: "ost-wr1", park_id: "ost", vendor_format: "A", status: "ok", share: 0.4, setpoint: 1 },
  { id: "ost-wr2", park_id: "ost", vendor_format: "B", status: "ok", share: 0.35, setpoint: 1 },
  { id: "ost-wr3", park_id: "ost", vendor_format: "C", status: "ok", share: 0.25, setpoint: 1 },

  { id: "sued-wr1", park_id: "sued", vendor_format: "B", status: "ok", share: 0.6, setpoint: 1 },
  { id: "sued-wr2", park_id: "sued", vendor_format: "C", status: "ok", share: 0.4, setpoint: 1 },
];

/**
 * Mandantentrennung. op-kreis betreibt alle drei Felder, op-nachbar keines —
 * die Oberfläche kann zwischen beiden umschalten, und dann blockiert der
 * Wächter jeden Schreibversuch mit Begründung. Ein echtes Auth-System ist
 * bewusst nicht Teil von v1; das hier ist ein Stub, und er sagt das auch.
 */
export const OPERATORS: Operator[] = [
  { id: "op-kreis", name: "SolarKreis Betrieb", parks: ["nord", "ost", "sued"] },
  { id: "op-nachbar", name: "Nachbarbetrieb (fremder Mandant)", parks: [] },
];

export const parkById = (id: string) => PARKS.find((p) => p.id === id);
export const devicesOfPark = (parkId: string) => DEVICES.filter((d) => d.park_id === parkId);
export const operatorById = (id: string) => OPERATORS.find((o) => o.id === id);

/** Gesamte installierte Leistung des Kreises in kW. */
export const TOTAL_CAPACITY_KW = PARKS.reduce((s, p) => s + p.capacity_kw, 0);

/**
 * Netzgrenze des Kreises in kW. Über diesem Wert greift die Kreis-Regel und
 * das HQ drosselt. Bewusst unter der Summe der Kapazitäten, sonst wäre die
 * Regel nie zu sehen — an einem klaren Junimittag liegt der Kreis darüber.
 */
export const GRID_LIMIT_KW = Math.round(TOTAL_CAPACITY_KW * 0.72);
