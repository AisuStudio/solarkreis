/*
  Schritt 5: der Strompreis.

  aWATTar veröffentlicht den Day-Ahead-Spotpreis für den deutschen Markt,
  ohne Schlüssel, stündlich, in EUR/MWh. Das ist derselbe Preis, gegen den
  eine echte Anlage disponiert — und der einzige Wert im ganzen Projekt, der
  negativ werden kann.

  Beim ersten Lauf am 30.08.: 24 Stunden, Spanne 194 EUR/MWh, davon vier
  Stunden unter null. Genau der Fall, für den die Kreis-Regel gebaut ist —
  bei negativem Preis ist Einspeisen teurer als Einlagern.

  Zum Alter: `lib/storage.ts` lässt den Speicher nur schalten, wenn die
  Preisdaten jünger als 15 Minuten sind (MAX_PRICE_AGE_MS). Der
  Zwischenspeicher hält deshalb nur 10 Minuten — nicht aus Sparsamkeit,
  sondern damit der Wächter im Normalbetrieb durchlässt und wirklich erst
  dann blockiert, wenn die Quelle tatsächlich weg ist. Ein Wächter, der
  immer blockiert, beweist nichts.
*/

import type { MarketPrice, Source } from "./model";
import { append } from "./store";

const ENDPUNKT = "https://api.awattar.de/v1/marketdata";
const TTL_MS = 10 * 60_000;

interface Reihe {
  preise: MarketPrice[];
  /** Ende der letzten abgedeckten Stunde. */
  bisTs: number;
  fetchedAt: number;
}

const globalRef = globalThis as unknown as { __solarkreisPreis?: Reihe | null };

const ECHT = (fetchedAt: number): Source => ({
  origin: "echt",
  label: "aWATTar, Day-Ahead DE",
  fetchedAt,
});

/** Holt die Preisreihe, wenn sie fehlt oder älter als der Zwischenspeicher ist. */
export async function refreshPreise(): Promise<void> {
  const jetzt = Date.now();
  const r = globalRef.__solarkreisPreis;
  if (r && jetzt - r.fetchedAt < TTL_MS) return;

  try {
    const antwort = await fetch(ENDPUNKT, { cache: "no-store", signal: AbortSignal.timeout(8000) });
    if (!antwort.ok) throw new Error(`HTTP ${antwort.status}`);
    const d = await antwort.json();
    const roh = d?.data;
    if (!Array.isArray(roh) || roh.length === 0) throw new Error("keine Marktdaten");

    const preise: MarketPrice[] = roh.map((x: { start_timestamp: number; marketprice: number }) => ({
      ts: x.start_timestamp,
      price_eur_mwh: x.marketprice,
    }));

    globalRef.__solarkreisPreis = {
      preise,
      bisTs: roh[roh.length - 1].end_timestamp,
      fetchedAt: jetzt,
    };

    const werte = preise.map((p) => p.price_eur_mwh);
    const negativ = werte.filter((v) => v < 0).length;
    append({
      kind: "abruf",
      ts: jetzt,
      source: ECHT(jetzt),
      note:
        `${preise.length} Stundenpreise, ${werte.reduce((a, b) => Math.min(a, b)).toFixed(2)} bis ` +
        `${werte.reduce((a, b) => Math.max(a, b)).toFixed(2)} EUR/MWh` +
        (negativ ? `, ${negativ} Stunden negativ` : ""),
    });
  } catch {
    /* Stumm. Die Folge zeigt sich am Zustand: kein Preis, und der Wächter
       schaltet den Speicher in Ruhe. Genau das ist fail-closed. */
  }
}

export interface PreisStand {
  /** null, wenn für diesen Zeitpunkt kein Preis vorliegt. */
  eur_mwh: number | null;
  source: Source | null;
  /** Alter der Daten in ms. null = noch nie erfolgreich abgerufen. */
  alterMs: number | null;
  /** Tagesreihe für den Verlauf, kann leer sein. */
  reihe: MarketPrice[];
}

export function preisStand(ts: number): PreisStand {
  const r = globalRef.__solarkreisPreis;
  if (!r) return { eur_mwh: null, source: null, alterMs: null, reihe: [] };

  const alterMs = Date.now() - r.fetchedAt;

  /* Der Preis gilt für die ganze Stunde — nicht interpolieren. Ein Preis
     zwischen zwei Stunden existiert am Markt nicht. */
  let treffer: MarketPrice | null = null;
  for (const p of r.preise) {
    if (ts >= p.ts && ts < p.ts + 3_600_000) { treffer = p; break; }
  }

  return {
    eur_mwh: treffer?.price_eur_mwh ?? null,
    source: treffer ? ECHT(r.fetchedAt) : null,
    alterMs,
    reihe: r.preise,
  };
}

/**
 * Ertrag in EUR pro Stunde bei momentaner Leistung und momentanem Preis.
 * Kann negativ sein — und soll es auch zeigen: bei negativem Preis kostet
 * Einspeisen Geld, und genau daran hängt die Entscheidung des Speichers.
 */
export function ertragEurProStunde(total_kw: number, eur_mwh: number | null): number | null {
  if (eur_mwh === null) return null;
  return (total_kw / 1000) * eur_mwh;
}
