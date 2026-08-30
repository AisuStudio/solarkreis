import { NextResponse } from "next/server";
import type { CommandAction } from "@/lib/model";
import { ausfuehren, guard } from "@/lib/kommando";
import { simNow, store } from "@/lib/store";

export const dynamic = "force-dynamic";

const ERLAUBT: CommandAction[] = [
  "setpoint_setzen", "drosseln", "not_aus", "schutzstellung", "freigeben",
  "speicher_laden", "speicher_entladen", "speicher_ruhe",
];

/**
 * Der einzige Weg, auf dem etwas in den Kreis hineingeschrieben wird.
 *
 * Antwortet auch bei Ablehnung mit 200 und dem angehängten Kommando: eine
 * Absage des Wächters ist kein Fehler der Schnittstelle, sondern ein
 * Ergebnis — und sie steht dann genauso im Log wie eine Ausführung.
 * Nur unlesbare Anfragen bekommen 400.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Kein lesbares JSON." }, { status: 400 });
  }

  const a = body as { action?: string };
  if (!a?.action || !ERLAUBT.includes(a.action as CommandAction)) {
    return NextResponse.json(
      { error: `Unbekannte Aktion. Erlaubt: ${ERLAUBT.join(", ")}.` },
      { status: 400 },
    );
  }

  const command = ausfuehren(body as Parameters<typeof ausfuehren>[0]);
  return NextResponse.json({ command, eventCount: store().events.length });
}

/** Trockenlauf: was würde der Wächter sagen, ohne dass etwas angehängt wird. */
export async function GET(request: Request) {
  const u = new URL(request.url);
  const action = u.searchParams.get("action") as CommandAction | null;
  if (!action || !ERLAUBT.includes(action)) {
    return NextResponse.json({ error: "Parameter 'action' fehlt oder ist unbekannt." }, { status: 400 });
  }
  const wert = u.searchParams.get("value");
  return NextResponse.json({
    probe: guard({
      action,
      park_id: u.searchParams.get("park_id"),
      device_id: u.searchParams.get("device_id"),
      value: wert === null ? null : Number(wert),
      requested_by: u.searchParams.get("operator") ?? undefined,
      bestaetigt: u.searchParams.get("bestaetigt") === "1",
    }, simNow()),
  });
}
