import { NextResponse } from "next/server";
import type { Command, SolarEvent } from "@/lib/model";
import { STORAGE } from "@/lib/seed";
import { foldStorage, ladder, projectStorage, storageGuard } from "@/lib/storage";
import { simNow, store } from "@/lib/store";

export const dynamic = "force-dynamic";

/** Ein ausgeführtes Speicher-Kommando für den Prüflauf. */
function cmd(action: Command["action"], ts: number): SolarEvent {
  return {
    kind: "kommando",
    ts,
    command: {
      id: `pruef-${ts}`,
      park_id: null,
      device_id: null,
      storage_id: STORAGE.id,
      action,
      value: null,
      requested_by: "op-kreis",
      guard_result: { ok: true, kind: "autorisiert" },
      status: "ausgefuehrt",
      ts,
    },
  };
}

/**
 * Diagnose für den Speicher. Zeigt drei Dinge:
 * den echten Zustand, den Wächter unter allen Bedingungen, und einen
 * Prüflauf der Faltung gegen einen erfundenen Ereignisstrom — damit belegt
 * ist, dass der Ladestand wirklich über die Zeit integriert wird und nicht
 * nur das letzte Kommando abliest.
 */
export async function GET() {
  const now = simNow();
  const state = projectStorage(now);

  const H = 3_600_000;
  const t0 = 0;
  const lauf: SolarEvent[] = [
    cmd("speicher_laden", t0),          // 0–4 h laden
    cmd("speicher_ruhe", t0 + 4 * H),   // 4–6 h ruhen
    cmd("speicher_entladen", t0 + 6 * H), // 6–12 h abgeben
  ];

  const trajektorie = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12].map((h) => {
    const s = foldStorage(lauf, t0, t0 + h * H);
    return {
      stunde: h,
      soc: Number((s.soc * 100).toFixed(1)),
      modus: s.mode,
      netz_kw: s.grid_kw,
    };
  });

  const frisch = { operatorId: "op-kreis", priceAgeMs: 60_000, state };
  const alt = { operatorId: "op-kreis", priceAgeMs: 40 * 60_000, state };
  const fremd = { operatorId: "op-nachbar", priceAgeMs: 60_000, state };

  return NextResponse.json({
    speicher: STORAGE,
    zustand: { ...state, soc_prozent: Number((state.soc * 100).toFixed(1)) },
    waechter: {
      laden_frische_preise: storageGuard("speicher_laden", frisch),
      entladen_frische_preise: storageGuard("speicher_entladen", frisch),
      laden_veraltete_preise: storageGuard("speicher_laden", alt),
      ruhe_veraltete_preise: storageGuard("speicher_ruhe", alt),
      laden_fremder_mandant: storageGuard("speicher_laden", fremd),
    },
    prueflauf: {
      hinweis: "4 h laden, 2 h ruhen, dann entladen — gegen einen erfundenen Ereignisstrom.",
      trajektorie,
    },
    leiter: {
      /* Der Fall, um den es geht: erst aufnehmen, drosseln nur wenn nichts
         mehr hineinpasst. Ohne diesen Prüfpunkt wäre die Leiter nie an ihrer
         entscheidenden Sprosse getestet. */
      ueberschuss_speicher_voll: ladder({
        price_eur_mwh: 40, total_output_kw: 45_000, grid_limit_kw: 38_880,
        state: foldStorage([cmd("speicher_laden", 0)], 0, 6 * H),
        charge_below: 0, discharge_above: 120,
      }),
      ueberschuss: ladder({ price_eur_mwh: 40, total_output_kw: 45_000, grid_limit_kw: 38_880, state, charge_below: 0, discharge_above: 120 }),
      negativer_preis: ladder({ price_eur_mwh: -1.06, total_output_kw: 20_000, grid_limit_kw: 38_880, state, charge_below: 0, discharge_above: 120 }),
      hoher_preis: ladder({ price_eur_mwh: 193.2, total_output_kw: 8_000, grid_limit_kw: 38_880, state, charge_below: 0, discharge_above: 120 }),
      ruhe: ladder({ price_eur_mwh: 70, total_output_kw: 20_000, grid_limit_kw: 38_880, state, charge_below: 0, discharge_above: 120 }),
    },
    eventCount: store().events.length,
  });
}
