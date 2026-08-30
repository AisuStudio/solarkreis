/*
  Aus Einstrahlung wird Leistung.

  Die Kette ist bewusst physikalisch und nicht kosmetisch:
  Leistung = Kapazität × Anteil × Sollwert × (G/1000) × Temperaturverlust × Zustand.

  Der Temperaturverlust ist der Grund, warum ein heißer Julitag weniger bringt
  als ein kühler Maitag mit gleicher Sonne — genau die Art Zusammenhang, die
  ein Monitoring-Dashboard zeigen soll. Modulzelltemperatur nach NOCT-Modell.
*/

import type { Device, Park, Reading, VendorFormat } from "./model";
import { noise } from "./rng";
import type { WeatherSample } from "./weather";

/** Temperaturkoeffizient der Leistung, je Kelvin über 25 °C. Übliche Größe für Silizium. */
const GAMMA_PER_K = -0.004;

/** NOCT 45 °C bei 800 W/m² und 20 °C Umgebung — der Standardwert im Datenblatt. */
const NOCT_FACTOR = (45 - 20) / 800;

/** Wirkungsgrad je Gerätezustand. offline liefert nichts. */
const STATUS_FACTOR: Record<Device["status"], number> = {
  ok: 1,
  degradiert: 0.6,
  offline: 0,
};

export function panelTemperature(airTemp: number, irradiance: number): number {
  return airTemp + NOCT_FACTOR * irradiance;
}

/**
 * Ein normalisierter Messwert für ein Gerät zu einem Zeitpunkt.
 * Deterministisch: gleiches Gerät, gleiche Sekunde, gleicher Wert — überall.
 */
export function readingFor(
  device: Device,
  park: Park,
  ts: number,
  weather: WeatherSample,
): Reading {
  const panel_temp = panelTemperature(weather.airTemp, weather.irradiance);
  const tempLoss = 1 + GAMMA_PER_K * (panel_temp - 25);

  // Rauschen im Minutentakt, nicht je Sekunde — sonst flackert die Anzeige.
  const minute = Math.floor(ts / 60_000);
  const jitter = 1 + noise(`out:${device.id}:${minute}`, 0.03);

  const output_kw = Math.max(
    0,
    park.capacity_kw *
      device.share *
      device.setpoint *
      (weather.irradiance / 1000) *
      tempLoss *
      STATUS_FACTOR[device.status] *
      jitter,
  );

  return {
    device_id: device.id,
    ts,
    output_kw: round(output_kw, 1),
    panel_temp: round(panel_temp, 1),
    irradiance: round(weather.irradiance, 0),
  };
}

function round(v: number, digits: number): number {
  const f = 10 ** digits;
  return Math.round(v * f) / f;
}

/* ── Format-Normalisierung ──────────────────────────────────────────────────
   Der Kernbeleg des Projekts. Drei Hersteller, drei Rohformate, ein Reading.
   Die Rohform wird aus dem normalisierten Wert zurückgerechnet, damit die
   Oberfläche beide Seiten nebeneinander zeigen kann: was das Gerät sendet und
   was daraus wird. In einem echten System liefe es andersherum — hier ist die
   Simulation die Quelle, also muss die Rohform daraus entstehen.             */

export type RawA = { outputKw: number; tempC: number };
export type RawB = { power_w: number; temperature: number };
export type RawC = { payload: { p: number; t: number } };
export type RawReading = RawA | RawB | RawC;

/** Normalisierter Wert → Rohform des jeweiligen Herstellers. */
export function toVendorFormat(reading: Reading, format: VendorFormat): RawReading {
  switch (format) {
    case "A":
      return { outputKw: reading.output_kw, tempC: Math.round(reading.panel_temp) };
    case "B":
      return { power_w: Math.round(reading.output_kw * 1000), temperature: Math.round(reading.panel_temp) };
    case "C":
      return { payload: { p: reading.output_kw, t: Math.round(reading.panel_temp) } };
  }
}

/**
 * Rohform → ein Reading. Das ist die Stelle, an der die Vereinheitlichung
 * tatsächlich passiert: am Ingest, nicht später in der Anzeige. Alles
 * dahinter kennt nur noch kW und °C.
 */
export function normalize(
  raw: RawReading,
  format: VendorFormat,
  device_id: string,
  ts: number,
  irradiance: number,
): Reading {
  let output_kw: number;
  let panel_temp: number;

  switch (format) {
    case "A": {
      const a = raw as RawA;
      output_kw = a.outputKw;
      panel_temp = a.tempC;
      break;
    }
    case "B": {
      const b = raw as RawB;
      output_kw = b.power_w / 1000; // Watt → Kilowatt, die einzige echte Umrechnung
      panel_temp = b.temperature;
      break;
    }
    case "C": {
      const c = raw as RawC;
      output_kw = c.payload.p;
      panel_temp = c.payload.t;
      break;
    }
  }

  return { device_id, ts, output_kw, panel_temp, irradiance };
}
