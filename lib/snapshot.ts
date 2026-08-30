/*
  Ein Blick auf den Kreis zu einem Zeitpunkt. Alles, was die Oberfläche und die
  Regeln brauchen, an einer Stelle zusammengesetzt — damit Seite, Route und
  Automatik nicht drei verschiedene Wahrheiten berechnen.
*/

import type { Device, Park, Reading } from "./model";
import { PARKS, GRID_LIMIT_KW, TOTAL_CAPACITY_KW } from "./seed";
import { projectDevices, simNow } from "./store";
import { normalize, readingFor, toVendorFormat, type RawReading } from "./sim";
import { clearSky, type WeatherSample, type WeatherSource } from "./weather";
import { isDaylight } from "./solar";

export interface DeviceSnapshot {
  device: Device;
  /** Was das Gerät sendet — in seinem eigenen Format. */
  raw: RawReading;
  /** Was am Ingest daraus wird. */
  reading: Reading;
}

export interface ParkSnapshot {
  park: Park;
  devices: DeviceSnapshot[];
  output_kw: number;
  weather: WeatherSample;
  daylight: boolean;
}

export interface KreisSnapshot {
  ts: number;
  parks: ParkSnapshot[];
  total_kw: number;
  capacity_kw: number;
  grid_limit_kw: number;
  /** Liegt der Kreis über der Netzgrenze? Auslöser der Kreis-Regel. */
  over_limit: boolean;
}

export function snapshot(ts: number = simNow(), weather: WeatherSource = clearSky): KreisSnapshot {
  const devices = projectDevices();

  const parks = PARKS.map<ParkSnapshot>((park) => {
    const sample = weather.at(park, ts);
    const own = devices.filter((d) => d.park_id === park.id);

    const snaps = own.map<DeviceSnapshot>((device) => {
      /*
        Die Reihenfolge ist Absicht und nicht umstellbar: die Simulation
        erzeugt den wahren Wert, das Gerät verpackt ihn in sein Format, und
        erst die Normalisierung macht daraus wieder ein Reading. Alles
        dahinter sieht ausschließlich das normalisierte Ergebnis.

        Wer hier abkürzt und `truth` direkt weiterreicht, zeigt in der
        Oberfläche Werte an, die in der Rohform gar nicht stehen — die Geräte
        melden ganzzahlige Temperaturen, 38.6 °C kommt bei keinem an. Genau
        dieser Fehler war zuerst drin.
      */
      const truth = readingFor(device, park, ts, sample);
      const raw = toVendorFormat(truth, device.vendor_format);
      const reading = normalize(raw, device.vendor_format, device.id, ts, sample.irradiance);
      return { device, raw, reading };
    });

    return {
      park,
      devices: snaps,
      output_kw: round1(snaps.reduce((s, d) => s + d.reading.output_kw, 0)),
      weather: sample,
      daylight: isDaylight(park.lat, park.lon, ts),
    };
  });

  const total_kw = round1(parks.reduce((s, p) => s + p.output_kw, 0));

  return {
    ts,
    parks,
    total_kw,
    capacity_kw: TOTAL_CAPACITY_KW,
    grid_limit_kw: GRID_LIMIT_KW,
    over_limit: total_kw > GRID_LIMIT_KW,
  };
}

const round1 = (v: number) => Math.round(v * 10) / 10;
