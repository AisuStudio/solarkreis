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
import { OPERATORS, PARKS, STORAGE } from "./seed";
import { projectStorage } from "./storage";
import { simNow, store } from "./store";
import { openMeteo } from "./openmeteo";
import { ertragEurProStunde, preisStand, refreshPreise } from "./awattar";
import { auffaelligkeiten, automatik } from "./automatik";

export async function zustand(ts: number = simNow()) {
  /* Beide Quellen parallel: sie hängen nicht voneinander ab, und
     nacheinander würde der Zustand über zwei Netzlaufzeiten altern. */
  await Promise.all([openMeteo.refresh(PARKS, ts), refreshPreise()]);

  const kreis = snapshot(ts, openMeteo);
  const preis = preisStand(ts);

  /* Die Kreis-Regel läuft, bevor der Zustand ausgeliefert wird — und über
     denselben Wächter wie ein Mensch. Sie kann nichts, was ein Bediener
     nicht auch dürfte. */
  const regel = automatik(kreis.total_kw, ts);

  return {
    ...kreis,
    preis: {
      ...preis,
      ertrag_eur_h: ertragEurProStunde(kreis.total_kw, preis.eur_mwh),
    },
    speicher: {
      stamm: STORAGE,
      ...projectStorage(ts),
    },
    regel,
    alarme: auffaelligkeiten(),
    clock: store().clock,
    operatorId: store().operatorId,
    operatoren: OPERATORS,
    eventCount: store().events.length,
    /* Die letzten Ereignisse für die Anzeige. Nicht der ganze Strom: der
       wächst unbegrenzt, und die Oberfläche braucht ihn nicht ganz. Wer
       alles will, faltet selbst — dafür ist das Log da. */
    log: store().events.slice(-40).reverse(),
  };
}

export type Zustand = Awaited<ReturnType<typeof zustand>>;
