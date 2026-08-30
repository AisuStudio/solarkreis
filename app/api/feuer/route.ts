import { NextResponse } from "next/server";
import { feuerStand, setzeDemo } from "@/lib/firms";

export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(feuerStand());
}

/** Schaltet das Demo-Szenario. Bewusst eine eigene Route und kein Kommando:
 *  es greift nicht in den Kreis ein, es verändert nur, was die Quelle liefert. */
export async function POST(request: Request) {
  const b = (await request.json().catch(() => ({}))) as { demo?: boolean };
  setzeDemo(b.demo === true);
  return NextResponse.json(feuerStand());
}
