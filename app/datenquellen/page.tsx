/*
  Schritt 9: die Datenquellen-Seite.

  Sie beantwortet eine Frage, die man einem Prototyp sonst glauben muss:
  läuft das wirklich, oder sieht es nur so aus? Deshalb steht hier kein
  Prospekttext, sondern der Zustand des letzten Abrufs — mit Uhrzeit, Anzahl
  und Fehler, falls einer vorliegt.

  Server-Komponente: die Werte werden beim Aufruf gerechnet. Ein Client, der
  sie nachlädt, würde beim ersten Bild eine leere Seite zeigen und damit
  behaupten, es gäbe nichts.
*/

import { TopNav } from "@/components/TopNav";
import { zustand } from "@/lib/zustand";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Datenquellen — SolarKreis",
  description: "Welche Quellen echt sind, wann sie zuletzt geantwortet haben und was sie geliefert haben.",
};

const nf = (v: number, n = 1) =>
  v.toLocaleString("de-DE", { minimumFractionDigits: n, maximumFractionDigits: n });

const uhr = (ms: number | null) =>
  ms === null ? "nie" : new Date(ms).toLocaleTimeString("de-DE", { hour: "2-digit", minute: "2-digit", second: "2-digit" });

export default async function DatenquellenSeite() {
  const z = await zustand();
  const wetter = z.parks[0]?.weather.source;

  return (
    <>
      <TopNav aktiv="/doku" />
      <main style={{ maxWidth: 900, margin: "0 auto", padding: "var(--sp-3xl) var(--gutter) var(--sp-4xl)" }}>
        <div className="sk-mono-eyebrow" style={{ color: "var(--color-muted)" }}>
          SolarKreis · Dokumentation
        </div>
        <h1 className="sk-titel-seite" style={{ marginTop: "var(--sp-sm)" }}>
          Datenquellen
        </h1>
        <p className="sk-text-lead" style={{ color: "var(--color-muted)", maxWidth: "62ch", marginTop: "var(--sp-md)" }}>
          Drei Quellen, alle nur lesend, alle ohne Bezahlschranke. Was hier steht,
          ist der Zustand des letzten Abrufs — nicht das, was vorgesehen ist.
        </p>

        <Quelle
          name="Open-Meteo"
          zweck="Einstrahlung, Lufttemperatur, Bewölkung, Niederschlag — stündlich, für die echten Koordinaten der drei Felder."
          echt={wetter?.origin === "echt"}
          stand={`zuletzt ${uhr(wetter?.fetchedAt ?? null)} · ${wetter?.label ?? "—"}`}
          werte={z.parks.map((p) => ({
            k: p.park.name,
            v: `${Math.round(p.weather.irradiance)} W/m² · ${nf(p.weather.airTemp)} °C · ${Math.round(p.weather.cloudCover * 100)} % Wolken`,
          }))}
          auflagen={[
            "Zwischenspeicher 30 Minuten. Die Oberfläche fragt alle zwei Sekunden; ein Abruf pro Anfrage wären 5.400 pro Stunde für stündliche Daten.",
            "Bewölkung und Niederschlag werden nicht interpoliert — beides sind Zustände über die Stunde, kein stetiger Verlauf.",
            "Fällt die Quelle aus, rechnet ein deterministischer Rückfall aus Solargeometrie und Temperaturmodell. Die Herkunft wechselt dann sichtbar auf „simuliert“.",
          ]}
        />

        <Quelle
          name="aWATTar"
          zweck="Day-Ahead-Spotpreis für den deutschen Markt, stündlich, in Euro je Megawattstunde."
          echt={z.preis.source?.origin === "echt"}
          stand={`zuletzt ${uhr(z.preis.source?.fetchedAt ?? null)} · ${z.preis.reihe.length} Stundenpreise`}
          werte={[
            { k: "Jetzt", v: z.preis.eur_mwh === null ? "kein Preis für diese Stunde" : `${nf(z.preis.eur_mwh, 2)} €/MWh` },
            {
              k: "Spanne heute",
              v: z.preis.reihe.length
                ? `${nf(Math.min(...z.preis.reihe.map((p) => p.price_eur_mwh)), 2)} bis ${nf(Math.max(...z.preis.reihe.map((p) => p.price_eur_mwh)), 2)} €/MWh`
                : "—",
            },
            {
              k: "Stunden unter null",
              v: String(z.preis.reihe.filter((p) => p.price_eur_mwh < 0).length),
            },
          ]}
          auflagen={[
            "Zwischenspeicher nur 10 Minuten, und das ist eine Auflage: der Wächter lässt den Speicher nur bei Preisdaten unter 15 Minuten schalten. Ein Wächter, der immer blockiert, beweist nichts.",
            "Preise werden nicht interpoliert. Einen Preis zwischen zwei Stunden gibt es am Markt nicht.",
            "Ohne Preis entscheidet die Kreis-Regel nicht. Sie entscheidet über Geld; ohne Preis wäre jede Entscheidung geraten.",
          ]}
        />

        <Quelle
          name="NASA FIRMS"
          zweck="Satellitengestützte Wärmedetektionen aus VIIRS. Abgefragt werden NOAA-21 und NOAA-20 — nicht Suomi NPP, das zum 1.11.2026 abgeschaltet wird."
          echt={z.feuer.source.origin === "echt"}
          stand={
            z.feuer.fehler
              ? `Fehler: ${z.feuer.fehler}`
              : `zuletzt ${uhr(z.feuer.source.fetchedAt)} · ${z.feuer.tage} Tage, Rechteck um alle drei Felder`
          }
          werte={[
            { k: "Detektionen gesamt", v: String(z.feuer.hotspots.length) },
            { k: `davon im ${z.feuer.umkreis_km}-km-Umkreis`, v: String(z.feuer.imUmkreis.length) },
            { k: "davon relevant", v: `${z.feuer.relevant.length} — nur diese lösen etwas aus` },
            {
              k: "Nächste relevante",
              v: z.feuer.relevant[0]
                ? `${nf(z.feuer.relevant[0].abstand_km)} km von ${z.feuer.relevant[0].park_id}, ${nf(z.feuer.relevant[0].frp)} MW`
                : "keine",
            },
            { k: "Demo-Szenario", v: z.feuer.demoAn ? "an — Treffer sind erfunden" : "aus" },
          ]}
          auflagen={[
            `Schwellen: Hinweis ab ${z.feuer.schwellen.hinweis_frp} MW innerhalb von ${z.feuer.schwellen.hinweis_km} km, kritisch ab ${z.feuer.schwellen.kritisch_frp} MW innerhalb von ${z.feuer.schwellen.kritisch_km} km.`,
            "Warum überhaupt eine Schwelle: der rohe Feed lieferte am 30.08. für fünf Tage 153 Detektionen, 101 davon im 50-km-Umkreis. Ein Alarm darauf hätte 101-mal ausgelöst. FRP-Median 4,2 MW, Konfidenz 137-mal „nominal“, null-mal „hoch“ — Ende August ist in Brandenburg Erntezeit.",
            "Feuer meldet, aber schaltet nicht. Eine Anlage stillzulegen, weil ein Satellit Wärme gesehen hat, wäre die falsche Richtung von fail-closed.",
            "Die API deckelt den Zeitraum auf fünf Tage. Der frühere Entwurf versprach zehn — geändert wurde die Beschriftung, nicht die Abfrage.",
          ]}
        />

        <section style={{ marginTop: "var(--sp-2xl)" }}>
          <h2 className="sk-titel-abschnitt">Was hier nicht steht</h2>
          <p className="sk-text-fliess" style={{ color: "var(--color-muted)", maxWidth: "62ch", marginTop: "var(--sp-sm)" }}>
            Parks, Geräte und Messwerte sind simuliert. Die Messwerte werden aus der
            echten Einstrahlung gerechnet, nicht erfunden — aber sie sind gerechnet,
            und die Oberfläche schreibt das an jede betroffene Stelle. Die verworfene
            vierte Quelle, die offene Autobahn-Schnittstelle, steht mit ihrer Messung
            in <code className="sk-mono-kompakt">docs/scope-out.md</code>.
          </p>
        </section>
      </main>
    </>
  );
}

function Quelle({
  name,
  zweck,
  echt,
  stand,
  werte,
  auflagen,
}: {
  name: string;
  zweck: string;
  echt: boolean;
  stand: string;
  werte: { k: string; v: string }[];
  auflagen: string[];
}) {
  return (
    <section
      style={{
        marginTop: "var(--sp-2xl)",
        paddingTop: "var(--sp-lg)",
        borderTop: "1px solid var(--color-muted)",
      }}
    >
      <div style={{ display: "flex", alignItems: "baseline", gap: "var(--sp-md)", flexWrap: "wrap" }}>
        <h2 className="sk-titel-abschnitt">{name}</h2>
        <span
          className="sk-mono-eyebrow"
          style={{
            background: echt ? "var(--sk-read-fill)" : "var(--sk-crit-fill)",
            color: "var(--sk-on-fill)",
            padding: "3px 9px",
            borderRadius: "var(--radius-full)",
          }}
        >
          {echt ? "echt · read" : "antwortet nicht"}
        </span>
      </div>

      <p className="sk-text-fliess" style={{ color: "var(--color-muted)", maxWidth: "62ch", marginTop: "var(--sp-sm)" }}>
        {zweck}
      </p>
      <p className="sk-mono-kompakt" style={{ color: "var(--color-muted)", marginTop: "var(--sp-xs)" }}>
        {stand}
      </p>

      <dl
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(160px, auto) 1fr",
          gap: "var(--sp-xs) var(--sp-md)",
          margin: "var(--sp-md) 0 0",
          maxWidth: 720,
        }}
      >
        {werte.map((w) => (
          <div key={w.k} style={{ display: "contents" }}>
            <dt className="sk-text-kompakt" style={{ color: "var(--color-muted)" }}>{w.k}</dt>
            <dd className="sk-mono-kompakt" style={{ margin: 0 }}>{w.v}</dd>
          </div>
        ))}
      </dl>

      <ul style={{ margin: "var(--sp-md) 0 0", paddingLeft: "1.1em", maxWidth: "68ch" }}>
        {auflagen.map((a, i) => (
          <li key={i} className="sk-text-kompakt" style={{ color: "var(--color-muted)", marginTop: "var(--sp-xs)" }}>
            {a}
          </li>
        ))}
      </ul>
    </section>
  );
}
