/*
  Sonnenstand und Klarhimmel-Einstrahlung.

  Das ist keine Attrappe: Deklination, Zeitgleichung und Stundenwinkel sind die
  üblichen astronomischen Näherungen, die Einstrahlung folgt dem Meinel-Modell
  (Solar Energy: Fundamentals in Ecology, 1976). Ergebnis liegt mittags im
  Sommer bei rund 900–1000 W/m², nachts exakt bei null — der Tag/Nacht-Wechsel
  im Dashboard kommt also aus Geometrie, nicht aus einer Sinuskurve.

  Ab Schritt 3 liefert Open-Meteo die tatsächliche Einstrahlung. Dieses Modell
  bleibt als Rückfall, wenn der Feed nicht antwortet — dann steht in der
  Oberfläche auch, dass gerade der Rückfall rechnet.
*/

const RAD = Math.PI / 180;

/** Tag im Jahr, 1..366. */
export function dayOfYear(ts: number): number {
  const d = new Date(ts);
  const start = Date.UTC(d.getUTCFullYear(), 0, 0);
  return Math.floor((d.getTime() - start) / 86_400_000);
}

/** Deklination der Sonne in Grad. */
export function declination(ts: number): number {
  const n = dayOfYear(ts);
  return 23.45 * Math.sin(RAD * ((360 / 365) * (284 + n)));
}

/** Zeitgleichung in Minuten — die Differenz zwischen wahrer und mittlerer Sonnenzeit. */
export function equationOfTime(ts: number): number {
  const b = RAD * ((360 / 364) * (dayOfYear(ts) - 81));
  return 9.87 * Math.sin(2 * b) - 7.53 * Math.cos(b) - 1.5 * Math.sin(b);
}

/** Höhenwinkel der Sonne in Grad. Negativ = unter dem Horizont. */
export function solarElevation(lat: number, lon: number, ts: number): number {
  const d = new Date(ts);
  const utcHours = d.getUTCHours() + d.getUTCMinutes() / 60 + d.getUTCSeconds() / 3600;
  // Wahre Sonnenzeit am Ort: UTC + 4 min je Längengrad + Zeitgleichung.
  const solarTime = utcHours + (4 * lon + equationOfTime(ts)) / 60;
  const hourAngle = (solarTime - 12) * 15;
  const dec = declination(ts);
  const sinH =
    Math.sin(RAD * lat) * Math.sin(RAD * dec) +
    Math.cos(RAD * lat) * Math.cos(RAD * dec) * Math.cos(RAD * hourAngle);
  return Math.asin(Math.max(-1, Math.min(1, sinH))) / RAD;
}

/**
 * Klarhimmel-Globalstrahlung in W/m² auf die Horizontale.
 * Kasten-Young für die Luftmasse, Meinel für die Schwächung.
 *
 * Grenze des Modells: Meinel beschreibt die direkte Strahlung, der diffuse
 * Anteil fehlt. Die Werte liegen dadurch rund 10–15 % unter dem, was ein
 * Pyranometer bei klarem Himmel misst. Für einen Rückfall ist das in Ordnung —
 * ab Schritt 3 kommt die gemessene Einstrahlung von Open-Meteo.
 */
export function clearSkyIrradiance(lat: number, lon: number, ts: number): number {
  const h = solarElevation(lat, lon, ts);
  if (h <= 0) return 0;
  const airMass = 1 / (Math.sin(RAD * h) + 0.50572 * Math.pow(h + 6.07995, -1.6364));
  const direct = 1361 * Math.pow(0.7, Math.pow(airMass, 0.678));
  return Math.max(0, direct * Math.sin(RAD * h));
}

/** Ist am Ort gerade Tag? Bürgerliche Dämmerung als Grenze. */
export function isDaylight(lat: number, lon: number, ts: number): boolean {
  return solarElevation(lat, lon, ts) > -6;
}
