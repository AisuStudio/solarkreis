/*
  Die Simulationsseite. Server-Komponente: der erste Zustand wird hier
  gerechnet, nicht im Browser nachgeladen — sonst sieht der erste Frame leer
  aus und die Seite behauptet kurz, es gäbe nichts.
*/

import { TopNav } from "@/components/TopNav";
import { Simulation } from "@/components/Simulation";
import { zustand } from "@/lib/zustand";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Simulation — SolarKreis",
  description: "Drei simulierte Solarparks um eine Zentrale, gespeist mit echten Wetter-, Preis- und Feuerdaten.",
};

export default function SimulationSeite() {
  return (
    <>
      <TopNav aktiv="/simulation" />
      <Simulation initial={zustand()} />
    </>
  );
}
