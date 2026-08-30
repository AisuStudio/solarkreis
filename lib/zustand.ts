/*
  Alles, was die Oberfläche braucht, an einer Stelle.

  Absicht: die Seite soll nicht drei Routen abfragen und dabei drei
  verschiedene Zeitpunkte zusammensetzen — der Kreis wäre dann in sich
  widersprüchlich. Ein Zeitstempel, ein Zustand.

  Steht in lib/ und nicht in der Route, weil eine `route.ts` laut Next-Doku
  nur HTTP-Methoden und Segment-Config exportieren darf. Die Route ist eine
  dünne Hülle darum, die Simulationsseite ruft dieselbe Funktion direkt auf.
*/

import { snapshot } from "./snapshot";
import { STORAGE } from "./seed";
import { projectStorage } from "./storage";
import { simNow, store } from "./store";

export function zustand(ts: number = simNow()) {
  return {
    ...snapshot(ts),
    speicher: {
      stamm: STORAGE,
      ...projectStorage(ts),
    },
    clock: store().clock,
    operatorId: store().operatorId,
    eventCount: store().events.length,
  };
}

export type Zustand = ReturnType<typeof zustand>;
