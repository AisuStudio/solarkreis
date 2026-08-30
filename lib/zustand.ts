/*
  Alles, was die Oberfläche braucht, an einer Stelle.

  Absicht: die Seite soll nicht drei Routen abfragen und dabei drei
  verschiedene Zeitpunkte zusammensetzen — der Kreis wäre dann in sich
  widersprüchlich. Ein Zeitstempel, ein Zustand.

  Steht in lib/ und nicht in der Route, weil eine `route.ts` laut Next-Doku
  nur HTTP-Methoden und Segment-Config exportieren darf. Die Route ist eine
  dünne Hülle darum, die Simulationsseite ruft dieselbe Funktion direkt auf.

  Seit Schritt 3 asynchron: das Wetter wird VOR der Faltung frisch geholt,
  damit alle drei Felder gegen denselben Datenstand gerechnet werden.
*/

import { snapshot } from "./snapshot";
import { PARKS, STORAGE } from "./seed";
import { projectStorage } from "./storage";
import { simNow, store } from "./store";
import { openMeteo } from "./openmeteo";

export async function zustand(ts: number = simNow()) {
  await openMeteo.refresh(PARKS, ts);

  return {
    ...snapshot(ts, openMeteo),
    speicher: {
      stamm: STORAGE,
      ...projectStorage(ts),
    },
    clock: store().clock,
    operatorId: store().operatorId,
    eventCount: store().events.length,
  };
}

export type Zustand = Awaited<ReturnType<typeof zustand>>;
