"use client";

/*
  Ein Kommando abschicken — an genau einer Stelle.

  Der Haken lag zuerst im Schreibpfad, weil dort die einzigen Knöpfe saßen.
  Seit die Schaltwarte auch über der Feldkarte im Lageplan aufgeht, brauchen
  ihn zwei Geschwister. Eine zweite Kopie hätte zwei Wege zum Wächter
  bedeutet, die auseinanderlaufen können — und der Wächter ist der Gegenstand
  dieser Arbeit.

  `antwort` hält die letzte Antwort, auch die abgelehnte. Sie wird nicht
  zurückgesetzt, wenn ein Kommando durchgeht: was der Wächter gesagt hat,
  bleibt sichtbar, bis er etwas Neues sagt.
*/

import { useState } from "react";
import type { Command } from "@/lib/model";

export function useKommando(operatorId: string, nachKommando: () => void) {
  const [antwort, setAntwort] = useState<Command | null>(null);
  const [laeuft, setLaeuft] = useState(false);

  async function senden(body: Record<string, unknown>) {
    setLaeuft(true);
    try {
      const r = await fetch("/api/kommando", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        /* requested_by zuerst, damit der Aufrufer es überschreiben kann.
           Genau eine Stelle tut das: der Testschuss im Schreibpfad. */
        body: JSON.stringify({ requested_by: operatorId, ...body }),
      });
      const j = (await r.json()) as { command: Command };
      setAntwort(j.command);
      nachKommando();
    } finally {
      setLaeuft(false);
    }
  }

  return { senden, laeuft, antwort };
}
