import { NextResponse } from "next/server";
import { snapshot } from "@/lib/snapshot";
import { simNow, store } from "@/lib/store";

/* Kein Caching: der Zustand ändert sich mit jeder Sekunde. */
export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const atParam = url.searchParams.get("at");
  const ts = atParam ? Date.parse(atParam) : simNow();

  if (Number.isNaN(ts)) {
    return NextResponse.json({ error: "Parameter 'at' ist kein gültiges Datum." }, { status: 400 });
  }

  return NextResponse.json({
    ...snapshot(ts),
    clock: store().clock,
    operatorId: store().operatorId,
    eventCount: store().events.length,
  });
}
