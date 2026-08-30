/*
  Stammdaten. Die Parks sind erfunden, die Koordinaten nicht — sie liegen an
  Orten in Brandenburg, an denen tatsächlich Solarparks stehen. Grund: das
  Wetter muss echt sein können. Open-Meteo liefert ab Schritt 3 die Einstrahlung
  für genau diese Punkte; an einer Fantasiekoordinate wäre der Feed sinnlos.

  Leistungen und Geräte sind frei gewählt. Der Brief sagt „ein kleines Netz" —
  das hier sind 54 MW über drei Felder, nicht die 128 MW, die in Templin
  wirklich stehen. Wo etwas simuliert ist, sagt die Oberfläche es.
*/

import type { Device, Operator, Park, Storage } from "./model";

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
    module_azimuth: 180,
    module_tilt: 30,
  },
  {
    id: "ost",
    name: "Feld Ost",
    place: "Neuhardenberg, Brandenburg",
    lat: 52.6017,
    lon: 14.2408,
    capacity_kw: 24_000,
    operator_id: "op-kreis",
    module_azimuth: 180,
    module_tilt: 28,
  },
  {
    /*
      Liegt als einziges Feld an einer Autobahn. Der Standort ist eine reale
      Ackerfläche, 221 m von der A9 — gemessen gegen die OSM-Geometrie, also
      innerhalb des 500-m-Korridors, den das EEG für Freiflächen-PV entlang von
      Autobahnen privilegiert. Genau deshalb stehen dort so viele Parks.
      Die Peilung 309° und der Fahrbahnverlauf 51°/231° stammen aus derselben
      Messung und tragen den Blendungsfall in lib/glare.ts.
    */
    id: "sued",
    name: "Feld Süd",
    place: "Deutsch Bork, Brandenburg — an der A9",
    lat: 52.1752,
    lon: 12.8374,
    capacity_kw: 12_000,
    operator_id: "op-kreis",
    module_azimuth: 180,
    module_tilt: 25,
    motorway: { ref: "A 9", distance_m: 221, bearing_deg: 309 },
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

/*
  Der Speicher. Steht am HQ, nicht in einem Park — damit wird das HQ vom
  Beschriftungspunkt zum handelnden Actor.

  Zur Chemie: Eisen-Redox-Flow, kein Lithium, wässriger und nicht brennbarer
  Elektrolyt. Bewusst NICHT Eisen-Luft ("Rostbatterie"): die ist eine
  100-Stunden-Technologie für mehrtägige Überbrückung, mit absichtlich
  niedrigem Leistungs-zu-Energie-Verhältnis und rund 50 % Wirkungsgrad. Für
  einen Tageszyklus ist sie das falsche Werkzeug. Gerechnet an 30 Tagen echter
  Spotpreise (31.07.–30.08.2026, Median-Tagesspanne 181 €/MWh) bringt dieselbe
  Anlage bei 80 % rund 2.290 €/Tag und war an 29 von 29 Tagen im Plus, bei 50 %
  rund 1.115 €/Tag und an 24 von 29.

  Ungefährlich heißt hier: kein thermisches Durchgehen, keine kritischen
  Rohstoffe. Nicht: harmlos. Der Elektrolyt ist ätzend. Die Oberfläche schreibt
  das so, statt "keine Gefahr für die Umwelt" zu behaupten.

  Größe: 20 MWh bei 5 MW, also vier Stunden. Rund 9 % der Spitzenleistung des
  Kreises — genug, um die Kreis-Regel zu einer Leiter zu machen, zu klein, um
  Abregelung ganz zu ersetzen. Das ist Absicht: sonst wäre die Drosselung nie
  zu sehen.
*/
export const STORAGE: Storage = {
  id: "hq-speicher",
  name: "Speicher HQ",
  operator_id: "op-kreis",
  chemistry: "Eisen-Redox-Flow (simuliert)",
  capacity_kwh: 20_000,
  power_kw: 5_000,
  round_trip_efficiency: 0.8,
  reserve_soc: 0.1,
  max_soc: 0.95,
  initial_soc: 0.5,
};
