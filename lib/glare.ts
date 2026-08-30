/*
  Blendung Richtung Fahrbahn.

  Was das ist: die Spiegelung der Sonne an der Modulfläche, berechnet über die
  Flächennormale. r = 2(n·s)n − s ist die übliche Reflexionsformel; daraus
  ergeben sich Azimut und Höhenwinkel des reflektierten Strahls. Trifft dieser
  Strahl flach und in Richtung der Fahrbahn, ist Blendung möglich.

  STATUS: Diagnose, kein Produktmerkmal. Der Alarm wird nicht ausgeliefert —
  an diesem Standort tritt der Fall über ein ganzes Jahr nie ein. Warum, steht
  mit den Messwerten in docs/scope-out.md. Der Code bleibt als Beleg für die
  Entscheidung und als Prüfung für einen anderen Standort.

  Was das NICHT ist: ein Blendgutachten. Ein echtes Gutachten rechnet mit der
  Ausdehnung der Fläche, dem Sonnendurchmesser, dem Reflexionsgrad des Glases
  über den Einfallswinkel, der Augenhöhe des Fahrers, Sichtachsen und
  Abschirmung durch Bewuchs. Hier steht eine geometrische Näherung mit einer
  einzigen Modulausrichtung. Sie taugt, um einen Alarm auszulösen und einen
  Menschen hinschauen zu lassen — nicht, um eine Genehmigungsfrage zu klären.
  Die Oberfläche sagt das an der Auffälligkeit dazu.
*/

import type { Park } from "./model";
import { moduleNormal, solarElevation, sunVector } from "./solar";

const RAD = Math.PI / 180;

export interface GlareCheck {
  /** Blendung Richtung Fahrbahn möglich? */
  risk: boolean;
  /** Azimut des reflektierten Strahls, Grad von Norden. */
  reflectedAzimuth: number;
  /** Höhenwinkel des reflektierten Strahls. Flach = kritisch. */
  reflectedElevation: number;
  /** Winkelabstand zur Peilung Richtung Fahrbahn. */
  offBearing: number;
  reason: string;
}

/** Wie weit der reflektierte Strahl die Fahrbahnpeilung verfehlen darf. */
const AZIMUTH_TOLERANCE_DEG = 20;
/** Nur ein flacher Strahl erreicht die Augen eines Fahrers in 200 m Entfernung. */
const MAX_REFLECTED_ELEVATION_DEG = 6;

export function glareCheck(park: Park, ts: number): GlareCheck {
  const none = (reason: string): GlareCheck => ({
    risk: false,
    reflectedAzimuth: NaN,
    reflectedElevation: NaN,
    offBearing: NaN,
    reason,
  });

  if (!park.motorway) return none("Park liegt an keiner Fahrbahn.");
  if (solarElevation(park.lat, park.lon, ts) <= 0) return none("Sonne unter dem Horizont.");

  const s = sunVector(park.lat, park.lon, ts);
  const n = moduleNormal(park.module_tilt, park.module_azimuth);
  const dot = s[0] * n[0] + s[1] * n[1] + s[2] * n[2];

  // Sonne hinter der Modulebene — es gibt nichts zu spiegeln.
  if (dot <= 0) return none("Sonne steht hinter der Modulebene.");

  const r: [number, number, number] = [
    2 * dot * n[0] - s[0],
    2 * dot * n[1] - s[1],
    2 * dot * n[2] - s[2],
  ];

  const reflectedAzimuth = (Math.atan2(r[0], r[1]) / RAD + 360) % 360;
  const reflectedElevation = Math.asin(Math.max(-1, Math.min(1, r[2]))) / RAD;

  const diff = Math.abs(reflectedAzimuth - park.motorway.bearing_deg);
  const offBearing = Math.min(diff, 360 - diff);

  const aimed = offBearing <= AZIMUTH_TOLERANCE_DEG;
  const flat = reflectedElevation <= MAX_REFLECTED_ELEVATION_DEG;

  const risk = aimed && flat;
  const reason = risk
    ? `Reflex ${reflectedAzimuth.toFixed(0)}° bei ${reflectedElevation.toFixed(0)}° Höhe — Fahrbahn liegt bei ${park.motorway.bearing_deg}°.`
    : !aimed
      ? `Reflex zielt ${offBearing.toFixed(0)}° neben der Fahrbahn.`
      : `Reflex geht mit ${reflectedElevation.toFixed(0)}° über die Fahrbahn hinweg.`;

  return { risk, reflectedAzimuth, reflectedElevation, offBearing, reason };
}

export interface GlareWindow {
  /** Beginn und Ende in ms, UTC. */
  from: number;
  to: number;
  /** Kleinster Winkelabstand zur Fahrbahn im Fenster. */
  closestOffBearing: number;
}

/**
 * Alle Blendfenster eines Jahres, im Raster von `stepMin` Minuten.
 * Trägt die Dokumentation und beantwortet die einzige Frage, die zählt:
 * tritt der Fall überhaupt ein, oder ist der Alarm tot?
 */
export function glareWindows(park: Park, year: number, stepMin = 5): GlareWindow[] {
  const start = Date.UTC(year, 0, 1);
  const end = Date.UTC(year + 1, 0, 1);
  const step = stepMin * 60_000;

  const out: GlareWindow[] = [];
  let open: GlareWindow | null = null;

  for (let ts = start; ts < end; ts += step) {
    const c = glareCheck(park, ts);
    if (c.risk) {
      if (open === null) open = { from: ts, to: ts + step, closestOffBearing: c.offBearing };
      else {
        open.to = ts + step;
        open.closestOffBearing = Math.min(open.closestOffBearing, c.offBearing);
      }
    } else if (open !== null) {
      out.push(open);
      open = null;
    }
  }
  if (open !== null) out.push(open);
  return out;
}
