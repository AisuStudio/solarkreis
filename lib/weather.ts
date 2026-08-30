/*
  Die Wetterquelle als Schnittstelle.

  Schritt 2 liefert `clearSky` — Solargeometrie plus ein einfaches
  Temperaturmodell, vollständig deterministisch. Schritt 3 hängt Open-Meteo
  darunter, ohne dass die Simulation etwas davon merkt. Deshalb trägt jede
  Probe ihre `Source` mit sich: die Oberfläche zeigt an, ob gerade der echte
  Feed oder der Rückfall rechnet, und muss dafür nichts über beide wissen.
*/

import type { Park, Source } from "./model";
import { clearSkyIrradiance, dayOfYear } from "./solar";
import { noise } from "./rng";

export interface WeatherSample {
  /** Globalstrahlung auf die Horizontale, W/m². */
  irradiance: number;
  /** Lufttemperatur, °C. */
  airTemp: number;
  /** Bewölkung, 0..1. */
  cloudCover: number;
  /** Niederschlag der letzten Stunde, mm. */
  precipitation: number;
  source: Source;
}

export interface WeatherSource {
  at(park: Park, ts: number): WeatherSample;
}

const FALLBACK: Source = {
  origin: "simuliert",
  label: "Rückfall (Solargeometrie + Temperaturmodell)",
  fetchedAt: null,
};

/**
 * Lufttemperatur aus Jahres- und Tagesgang. Kalibriert auf Brandenburg:
 * Jahresmittel gut 9 °C, Maximum um den 20. Juli, Tagesmaximum gegen 15 Uhr.
 * Kein Messwert, ein Modell — und als solches gekennzeichnet.
 */
function modelledAirTemp(park: Park, ts: number): number {
  const n = dayOfYear(ts);
  const seasonal = 9.3 + 9.5 * Math.cos((2 * Math.PI * (n - 201)) / 365);
  const localHour = new Date(ts).getUTCHours() + new Date(ts).getUTCMinutes() / 60 + park.lon / 15;
  const diurnal = 4.5 * Math.cos((2 * Math.PI * (localHour - 15)) / 24);
  return seasonal + diurnal + noise(`temp:${park.id}:${Math.floor(ts / 3_600_000)}`, 1.4);
}

/**
 * Klarhimmel-Quelle. Bewölkung und Niederschlag sind hier bewusst null —
 * ein Modell, das sich Wolken ausdenkt, wäre eine Erfindung ohne Nutzen.
 * Bewölkung kommt ab Schritt 3 aus Open-Meteo oder gar nicht.
 */
export const clearSky: WeatherSource = {
  at(park: Park, ts: number): WeatherSample {
    return {
      irradiance: clearSkyIrradiance(park.lat, park.lon, ts),
      airTemp: modelledAirTemp(park, ts),
      cloudCover: 0,
      precipitation: 0,
      source: FALLBACK,
    };
  },
};
