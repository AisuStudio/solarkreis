/*
  Schritt 7: die automatisierten Abläufe.

  Der wichtigste Satz steht hier oben, weil er sonst untergeht:

      Die Automatik geht durch DENSELBEN Wächter wie ein Mensch.

  Sie ruft `ausfuehren()` auf, nicht `append()`. Damit kann eine Regel nichts,
  was ein Bediener nicht auch dürfte — keine Abkürzung, kein zweiter Weg in
  den Zustand. Wäre das anders, hieße „fail-closed" nur „fail-closed für
  Menschen", und der Wächter wäre eine Dekoration.

  Ausgewertet wird bei jedem Zustandsabruf, nicht in einem Hintergrundtakt.
  Das ist Absicht: der Zustand ist ohnehin eine Faltung über den Zeitpunkt,
  und auf einer Plattform ohne dauerhaft laufenden Prozess wäre ein eigener
  Takt eine Behauptung, die der Betrieb nicht einlöst.

  Gehandelt wird nur, wenn die Entscheidung vom aktuellen Zustand abweicht.
  Sonst stünde bei jedem Abruf dieselbe Zeile im Log, und ein Log, in dem
  alles steht, sagt nichts.
*/

import type { Alert, StorageMode } from "./model";
import { GRID_LIMIT_KW, PARKS, STORAGE } from "./seed";
import { ladder, projectStorage } from "./storage";
import { append, simNow, store } from "./store";
import { ausfuehren } from "./kommando";
import { preisStand } from "./awattar";

/** Schwellen der Leiter. Betreibergrößen, hier als Konstanten. */
const LADEN_UNTER = 0;      // negativer Preis: einspeisen kostet
const ENTLADEN_UEBER = 120; // €/MWh

const AKTION: Record<StorageMode, "speicher_laden" | "speicher_entladen" | "speicher_ruhe"> = {
  laden: "speicher_laden",
  entladen: "speicher_entladen",
  ruhe: "speicher_ruhe",
};

export interface AutomatikErgebnis {
  ausgewertet: boolean;
  grund: string;
  /** Was die Leiter entschieden hat, unabhängig davon, ob gehandelt wurde. */
  entscheidung: { speicher: StorageMode; drosseln: boolean; grund: string } | null;
  gehandelt: string[];
}

/**
 * Wertet die Kreis-Regel aus und handelt, wenn nötig.
 * Ohne Preis passiert nichts — und das ist die Regel, nicht die Ausnahme:
 * die Leiter entscheidet über Geld, und ohne Preis wäre jede Entscheidung
 * geraten. Der Wächter würde ohnehin blockieren.
 */
export function automatik(total_kw: number, ts: number = simNow()): AutomatikErgebnis {
  const preis = preisStand(ts);

  if (preis.eur_mwh === null) {
    return {
      ausgewertet: false,
      grund: "Kein Preis für diese Stunde — die Leiter entscheidet über Geld, also entscheidet sie nicht.",
      entscheidung: null,
      gehandelt: [],
    };
  }

  const zustand = projectStorage(ts);
  const d = ladder({
    price_eur_mwh: preis.eur_mwh,
    total_output_kw: total_kw,
    grid_limit_kw: GRID_LIMIT_KW,
    state: zustand,
    charge_below: LADEN_UNTER,
    discharge_above: ENTLADEN_UEBER,
  });

  const gehandelt: string[] = [];

  /* ── Speicher: nur schalten, wenn sich der Modus wirklich ändert ── */
  if (d.storage !== zustand.mode) {
    const c = ausfuehren({ action: AKTION[d.storage], storage_id: STORAGE.id }, ts);
    gehandelt.push(`Speicher ${zustand.mode} → ${d.storage}: ${c.status}`);

    if (c.status === "ausgefuehrt") {
      alarm(ts, {
        type: "speicher_grenze",
        severity: "hinweis",
        park_id: null,
        message: d.reason,
      });
    }
  }

  /* ── Drosseln ist das letzte Mittel. Es trifft das schwächste Feld —
        wer viel liefert, wird zuletzt beschnitten. ── */
  if (d.curtail) {
    const schwaechstes = schwaechstesFeld();
    if (schwaechstes) {
      const c = ausfuehren({ action: "drosseln", park_id: schwaechstes, value: 0.5 }, ts);
      gehandelt.push(`Drosseln ${schwaechstes}: ${c.status}`);
      if (c.status === "ausgefuehrt") {
        alarm(ts, {
          type: "ueberlast",
          severity: "warnung",
          park_id: schwaechstes,
          message: `Netzgrenze erreicht und Speicher voll — ${schwaechstes} auf 50 % gedrosselt.`,
        });
      }
    }
  }

  return {
    ausgewertet: true,
    grund: d.reason,
    entscheidung: { speicher: d.storage, drosseln: d.curtail, grund: d.reason },
    gehandelt,
  };
}

/** Das Feld mit der kleinsten installierten Leistung. Wer viel liefert, wird
    zuletzt beschnitten — Abregelung soll so wenig Energie wie möglich kosten. */
function schwaechstesFeld(): string | null {
  return [...PARKS].sort((a, b) => a.capacity_kw - b.capacity_kw)[0]?.id ?? null;
}

/** Hängt eine Auffälligkeit an — aber nicht dieselbe zweimal hintereinander. */
function alarm(ts: number, a: Omit<Alert, "id" | "ts" | "source">): void {
  const events = store().events;
  for (let i = events.length - 1; i >= 0; i--) {
    const e = events[i];
    if (e.kind !== "auffaelligkeit") continue;
    if (e.alert.type === a.type && e.alert.message === a.message) return;
    break;
  }

  append({
    kind: "auffaelligkeit",
    ts,
    alert: {
      ...a,
      id: `alert-${ts}`,
      ts,
      source: {
        origin: "simuliert",
        label: "Kreis-Regel (aus echtem Preis und gerechneter Leistung)",
        fetchedAt: null,
      },
    },
  });
}

/** Die letzten offenen Auffälligkeiten für die Anzeige. */
export function auffaelligkeiten(grenze = 5): Alert[] {
  const raus: Alert[] = [];
  const events = store().events;
  for (let i = events.length - 1; i >= 0 && raus.length < grenze; i--) {
    const e = events[i];
    if (e.kind === "auffaelligkeit") raus.push(e.alert);
  }
  return raus;
}
