/*
  Die Kennzahlenleiste. Sechs Zellen, jede mit ihrer Herkunft.

  Zwei Zellen stehen bewusst auf „—": Preis und Ertrag hängen an aWATTar, und
  der ist noch nicht angeschlossen (Schritt 5 der Bauordnung). Eine erfundene
  Zahl wäre die schnellere, aber falsche Lösung — das ganze Stück argumentiert
  gegen Anzeigen, die etwas behaupten, was nicht gemessen ist.
*/

import type { Zustand } from "@/lib/zustand";

function Zelle({
  label,
  wert,
  herkunft,
  offen,
}: {
  label: string;
  wert: string;
  herkunft?: string;
  offen?: boolean;
}) {
  return (
    <div style={{ minWidth: 0 }}>
      <div className="sk-mono-eyebrow" style={{ color: "var(--color-muted)" }}>
        {label}
      </div>
      <div
        className="sk-mono-betont"
        style={{ color: offen ? "var(--color-hazelnut)" : "var(--color-text)", marginTop: 2 }}
      >
        {wert}
      </div>
      {herkunft && (
        <div className="sk-text-label" style={{ color: "var(--color-muted)", marginTop: 1 }}>
          {herkunft}
        </div>
      )}
    </div>
  );
}

const nf = (v: number, n = 1) =>
  v.toLocaleString("de-DE", { minimumFractionDigits: n, maximumFractionDigits: n });

export function StatusBar({ z }: { z: Zustand }) {
  const mw = z.total_kw / 1000;
  const grenzeMw = z.grid_limit_kw / 1000;

  /* Wetter ist je Park gemessen. Die Leiste zeigt das Mittel über die drei
     Felder und sagt das auch — ein Einzelwert wäre hier eine Auswahl ohne
     Begründung. */
  const temp = z.parks.reduce((s, p) => s + p.weather.airTemp, 0) / z.parks.length;
  const strahlung = z.parks.reduce((s, p) => s + p.weather.irradiance, 0) / z.parks.length;
  const wetterQuelle = z.parks[0]?.weather.source;

  const zeit = new Date(z.ts);
  const uhr = zeit.toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", timeZone: "Europe/Berlin" });
  const tag = z.parks.some((p) => p.daylight);

  const soc = Math.round(z.speicher.soc * 100);

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "repeat(6, minmax(0, 1fr))",
        gap: 24,
        padding: "12px 40px",
        background: "var(--sk-canvas-bg)",
        borderBottom: "1px solid var(--color-muted)",
      }}
    >
      <Zelle
        label="Gesamt"
        wert={`${nf(mw)} MW`}
        herkunft={`von ${nf(grenzeMw)} MW Netzgrenze`}
      />
      <Zelle label="Preis" wert="—" herkunft="aWATTar, Schritt 5" offen />
      <Zelle label="Ertrag" wert="—" herkunft="braucht den Preis" offen />
      <Zelle
        label="Speicher"
        wert={`${soc} % · ${z.speicher.mode}`}
        herkunft={`${nf(z.speicher.available_kwh / 1000)} MWh abrufbar`}
      />
      <Zelle
        label="Wetter"
        wert={`${nf(temp)} °C · ${Math.round(strahlung)} W/m²`}
        herkunft={`Mittel · ${wetterQuelle?.origin ?? "unbekannt"}`}
      />
      <Zelle
        label="Zeit"
        wert={`${uhr} · ${tag ? "Tag" : "Nacht"}`}
        herkunft={`${z.clock.speed}× Zeitraffer`}
      />
    </div>
  );
}
