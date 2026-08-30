/*
  Schritt 8: NASA FIRMS, die dritte echte Quelle.

  Satellitengestützte Wärmedetektionen (VIIRS). Abgefragt werden NOAA-21 und
  NOAA-20 — NICHT Suomi NPP: das Instrument wird zum 1.11.2026 abgeschaltet,
  ein Feed darauf wäre zwei Monate nach dem Bau tot.

  KORREKTUR ZU EINER FRÜHEREN ANNAHME
  Beim ersten Scoping hieß es „über Deutschland null Feuer in zehn Tagen".
  Das stimmt so nicht: am 30.08.2026 liefert der Feed für das Rechteck um die
  drei Felder zwölf Detektionen aus drei Tagen. Alle mit niedriger
  Strahlungsleistung (0,6 bis 1,2 MW), nachts, Konfidenz „nominal" — das sind
  eher Industriewärme oder Feldarbeit als Waldbrand. Die Entscheidung für ein
  gekennzeichnetes Demo-Szenario bleibt trotzdem richtig, aber aus einem
  anderen Grund: die Abdeckung ist sporadisch, nicht leer. An vielen Tagen
  liegt nichts im Umkreis, und ein Alarm, den man nie sieht, ist unprüfbar.

  Was hier NICHT passiert: das Demo-Szenario mischt sich nie unter die echten
  Treffer. Es ist ein getrennter Satz mit eigener Herkunft, und die
  Oberfläche muss es als Demo ausweisen können.
*/

import type { Source } from "./model";
import { PARKS } from "./seed";
import { append } from "./store";

const BASIS = "https://firms.modaps.eosdis.nasa.gov/api/area/csv";
const INSTRUMENTE = ["VIIRS_NOAA21_NRT", "VIIRS_NOAA20_NRT"] as const;
/* Die API deckelt den Zeitraum auf 5 Tage ("Invalid day range. Expects [1..5]").
   Das Wireframe versprach "seit 10 Tagen" — diese Zahl konnte die Quelle nie
   liefern. Geändert wird die Beschriftung, nicht die Abfrage. */
const TAGE = 5;
const TTL_MS = 30 * 60_000;
/* Ein fehlgeschlagener Abruf darf NICHT so lange gelten wie ein geglückter.
   Sonst macht eine Störung von zehn Sekunden das System für eine halbe
   Stunde blind — und die Oberfläche zeigt derweil "0 Hotspots", was etwas
   anderes heißt als "wir wissen es gerade nicht". */
const TTL_FEHLER_MS = 2 * 60_000;
/** Rechteck-Radius für die Abfrage. Nicht die Alarmschwelle. */
export const UMKREIS_KM = 50;

/*
  WARUM ES ÜBERHAUPT EINE SCHWELLE GIBT — gemessen, nicht geschätzt.

  Der rohe Feed liefert am 30.08.2026 für fünf Tage 153 Detektionen, davon
  101 im 50-km-Umkreis der Felder. Ein Alarm auf "irgendein Treffer im
  Umkreis" hätte in fünf Tagen 101-mal ausgelöst. Das ist kein Alarm,
  das ist Rauschen — und ein Alarm, den man wegklickt, schützt nichts.

  Die Verteilung erklärt es: FRP-Median 4,2 MW, Maximum 38 MW, Konfidenz
  137-mal "nominal", 16-mal "low", NULL-mal "high". Ende August in
  Brandenburg ist Erntezeit; das sind Stoppelfeuer und Landwirtschaftswärme,
  kein Waldbrand. Nur 11 der 153 liegen an wiederkehrenden Orten, es ist also
  auch keine einzelne Industrieanlage.

  Zwei Stufen, beide an der gemessenen Verteilung ausgerichtet:

    Hinweis   ab  5 MW innerhalb von 10 km   → 13 Treffer in fünf Tagen
    Kritisch  ab 10 MW innerhalb von  5 km   →  0 Treffer in fünf Tagen

  Dass die kritische Stufe mit echten Daten NICHT auslöst, ist kein Mangel,
  sondern der Grund für das gekennzeichnete Demo-Szenario. Ein Alarmpfad, den
  man nie sehen kann, ist nicht prüfbar.
*/
export const HINWEIS_FRP_MW = 5;
export const HINWEIS_KM = 10;
export const KRITISCH_FRP_MW = 10;
export const KRITISCH_KM = 5;

export type Stufe = "keine" | "hinweis" | "kritisch";

export function stufe(h: Hotspot): Stufe {
  if (h.frp >= KRITISCH_FRP_MW && h.abstand_km <= KRITISCH_KM) return "kritisch";
  if (h.frp >= HINWEIS_FRP_MW && h.abstand_km <= HINWEIS_KM) return "hinweis";
  return "keine";
}

export interface Hotspot {
  lat: number;
  lon: number;
  /** Strahlungsleistung in MW. Das Maß für „wie viel Feuer". */
  frp: number;
  konfidenz: string;
  erfasst: string;
  instrument: string;
  /** Nächstes Feld und dessen Abstand. */
  park_id: string;
  abstand_km: number;
  demo: boolean;
}

interface Stand {
  hotspots: Hotspot[];
  fetchedAt: number;
  fehler: string | null;
}

const globalRef = globalThis as unknown as {
  __solarkreisFirms?: Stand;
  __solarkreisFirmsDemo?: boolean;
};

const ECHT = (fetchedAt: number): Source => ({
  origin: "echt",
  label: `NASA FIRMS · VIIRS NOAA-21/20, ${TAGE} Tage`,
  fetchedAt,
});

const DEMO: Source = {
  origin: "simuliert",
  label: "Demo-Szenario — kein echter Satellitentreffer",
  fetchedAt: null,
};

/** Rechteck um alle drei Felder plus Umkreis. Ein Rechteck statt drei
 *  Abfragen: die API rechnet nach Fläche, drei Kreise wären drei Aufrufe. */
function rechteck(): string {
  const rand = UMKREIS_KM / 111;
  const lats = PARKS.map((p) => p.lat);
  const lons = PARKS.map((p) => p.lon);
  const w = Math.min(...lons) - rand / Math.cos((Math.min(...lats) * Math.PI) / 180);
  const o = Math.max(...lons) + rand / Math.cos((Math.max(...lats) * Math.PI) / 180);
  return `${w.toFixed(3)},${(Math.min(...lats) - rand).toFixed(3)},${o.toFixed(3)},${(Math.max(...lats) + rand).toFixed(3)}`;
}

function abstandKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

/** Nächstes Feld zu einem Punkt. */
function naechstesFeld(lat: number, lon: number) {
  let beste = { park_id: PARKS[0].id, abstand_km: Infinity };
  for (const p of PARKS) {
    const d = abstandKm(lat, lon, p.lat, p.lon);
    if (d < beste.abstand_km) beste = { park_id: p.id, abstand_km: d };
  }
  return beste;
}

function parseCsv(text: string, instrument: string): Hotspot[] {
  const zeilen = text.trim().split("\n");
  if (zeilen.length < 2) return [];
  const kopf = zeilen[0].split(",");
  const idx = (n: string) => kopf.indexOf(n);
  const iLat = idx("latitude"), iLon = idx("longitude"), iFrp = idx("frp");
  const iKonf = idx("confidence"), iDatum = idx("acq_date");
  if (iLat < 0 || iLon < 0) return [];

  const raus: Hotspot[] = [];
  for (const z of zeilen.slice(1)) {
    const f = z.split(",");
    const lat = Number(f[iLat]), lon = Number(f[iLon]);
    if (!Number.isFinite(lat) || !Number.isFinite(lon)) continue;
    const nah = naechstesFeld(lat, lon);
    raus.push({
      lat, lon,
      frp: Number(f[iFrp]) || 0,
      konfidenz: f[iKonf] ?? "?",
      erfasst: f[iDatum] ?? "?",
      instrument,
      ...nah,
      demo: false,
    });
  }
  return raus;
}

export async function refreshFeuer(ts: number): Promise<void> {
  const key = process.env.FIRMS_MAP_KEY;
  const jetzt = Date.now();
  const alt = globalRef.__solarkreisFirms;
  const frist = alt?.fehler ? TTL_FEHLER_MS : TTL_MS;
  if (alt && jetzt - alt.fetchedAt < frist) return;

  if (!key) {
    globalRef.__solarkreisFirms = { hotspots: [], fetchedAt: jetzt, fehler: "FIRMS_MAP_KEY fehlt" };
    return;
  }

  const box = rechteck();
  const alle: Hotspot[] = [];
  let fehler: string | null = null;

  for (const instrument of INSTRUMENTE) {
    try {
      const r = await fetch(`${BASIS}/${key}/${instrument}/${box}/${TAGE}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(15000),
      });
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      const text = await r.text();
      /* Die API antwortet bei Schlüsselproblemen mit einer HTML- oder
         Klartextseite und Status 200. Wer das nicht prüft, parst Fehlertexte
         als Messwerte. */
      if (!text.startsWith("latitude,")) throw new Error(text.slice(0, 80));
      alle.push(...parseCsv(text, instrument));
    } catch (e) {
      fehler = e instanceof Error ? e.message : "unbekannt";
    }
  }

  globalRef.__solarkreisFirms = { hotspots: alle, fetchedAt: jetzt, fehler };

  append({
    kind: "abruf",
    ts,
    source: fehler && alle.length === 0 ? { ...ECHT(jetzt), origin: "simuliert", label: `FIRMS nicht erreichbar: ${fehler}` } : ECHT(jetzt),
    note: `${alle.length} Detektionen im Rechteck ${box}, davon ${alle.filter((h) => h.abstand_km <= UMKREIS_KM).length} im ${UMKREIS_KM}-km-Umkreis`,
  });
}

/** Demo-Szenario an- und ausschalten. Getrennt vom echten Satz. */
export function setzeDemo(an: boolean): void {
  globalRef.__solarkreisFirmsDemo = an;
}

/** Ein erfundener Treffer nahe Feld Süd. Immer als Demo gekennzeichnet. */
function demoHotspot(): Hotspot {
  const sued = PARKS.find((p) => p.id === "sued")!;
  return {
    lat: sued.lat + 0.14,
    lon: sued.lon + 0.09,
    frp: 18.4,
    konfidenz: "demo",
    erfasst: new Date().toISOString().slice(0, 10),
    instrument: "DEMO",
    park_id: sued.id,
    abstand_km: Math.round(abstandKm(sued.lat + 0.14, sued.lon + 0.09, sued.lat, sued.lon) * 10) / 10,
    demo: true,
  };
}

export interface FeuerStand {
  hotspots: Hotspot[];
  /** Alle im Abfrage-Rechteck-Umkreis. Zahl zum Einordnen, kein Alarm. */
  imUmkreis: Hotspot[];
  /** Die, auf die das System wirklich reagiert. */
  relevant: (Hotspot & { stufe: Stufe })[];
  schwellen: { hinweis_frp: number; hinweis_km: number; kritisch_frp: number; kritisch_km: number };
  source: Source;
  demoAn: boolean;
  fehler: string | null;
  umkreis_km: number;
  tage: number;
}

export function feuerStand(): FeuerStand {
  const s = globalRef.__solarkreisFirms;
  const demoAn = globalRef.__solarkreisFirmsDemo === true;
  const echte = s?.hotspots ?? [];
  const hotspots = demoAn ? [demoHotspot(), ...echte] : echte;

  return {
    hotspots,
    imUmkreis: hotspots.filter((h) => h.abstand_km <= UMKREIS_KM),
    relevant: hotspots
      .map((h) => ({ ...h, stufe: stufe(h) }))
      .filter((h) => h.stufe !== "keine")
      .sort((a, b) => (a.stufe === b.stufe ? b.frp - a.frp : a.stufe === "kritisch" ? -1 : 1)),
    schwellen: {
      hinweis_frp: HINWEIS_FRP_MW, hinweis_km: HINWEIS_KM,
      kritisch_frp: KRITISCH_FRP_MW, kritisch_km: KRITISCH_KM,
    },
    source: demoAn ? DEMO : s ? ECHT(s.fetchedAt) : { origin: "simuliert", label: "noch nicht abgerufen", fetchedAt: null },
    demoAn,
    fehler: s?.fehler ?? null,
    umkreis_km: UMKREIS_KM,
    tage: TAGE,
  };
}
