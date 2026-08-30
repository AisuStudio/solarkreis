import { NextResponse } from "next/server";
import { glareCheck, glareWindows } from "@/lib/glare";
import { PARKS } from "@/lib/seed";
import { simNow } from "@/lib/store";

export const dynamic = "force-dynamic";

/**
 * Diagnose für den Blendungsfall. Beantwortet zwei Fragen: blendet es gerade,
 * und wann im Jahr überhaupt. Die zweite Antwort steht in der Dokumentation —
 * ein Alarm, der nie auslöst, gehört nicht ins Produkt, sondern in den
 * Abschnitt „bewusst nicht gebaut".
 */
export async function GET(request: Request) {
  const url = new URL(request.url);
  const year = Number(url.searchParams.get("year") ?? new Date().getUTCFullYear());
  const park = PARKS.find((p) => p.motorway);

  if (!park) {
    return NextResponse.json({ note: "Kein Park liegt an einer Autobahn." });
  }

  /*
    Diagnose-Überschreibungen. Damit lässt sich prüfen, ob ein Nullergebnis
    an der Lage liegt oder am Modell — ein Alarm, der bei KEINER Ausrichtung
    auslöst, ist kaputt und nicht harmlos.
  */
  const bearing = url.searchParams.get("bearing");
  const tilt = url.searchParams.get("tilt");
  const probe = {
    ...park,
    module_tilt: tilt ? Number(tilt) : park.module_tilt,
    motorway: park.motorway
      ? { ...park.motorway, bearing_deg: bearing ? Number(bearing) : park.motorway.bearing_deg }
      : undefined,
  };

  if (url.searchParams.get("sweep") === "1") {
    const sweep = [];
    for (let b = 0; b < 360; b += 15) {
      const w = glareWindows({ ...probe, motorway: { ...probe.motorway!, bearing_deg: b } }, year, 10);
      sweep.push({ bearing: b, fenster: w.length, minuten: Math.round(w.reduce((s, x) => s + (x.to - x.from) / 60_000, 0)) });
    }
    return NextResponse.json({ tilt: probe.module_tilt, azimut: probe.module_azimuth, sweep });
  }

  const windows = glareWindows(probe, year);
  const minutes = windows.reduce((s, w) => s + (w.to - w.from) / 60_000, 0);

  return NextResponse.json({
    park: { id: park.id, name: park.name, place: park.place, motorway: park.motorway },
    jetzt: glareCheck(park, simNow()),
    jahr: year,
    fenster: windows.length,
    minutenGesamt: Math.round(minutes),
    beispiele: windows.slice(0, 8).map((w) => ({
      von: new Date(w.from).toISOString(),
      bis: new Date(w.to).toISOString(),
      minuten: Math.round((w.to - w.from) / 60_000),
      naechsterWinkel: Math.round(w.closestOffBearing),
    })),
  });
}
