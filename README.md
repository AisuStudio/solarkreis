# SolarKreis

Ein interaktives 2D-Dashboard für ein simuliertes Netz aus drei Solarparks, gespeist
mit echten externen Daten. Es zeigt ein Produktmuster: einen read-only-Monitoring-
Prototyp in ein System mit sicherem Schreibzugriff und automatisierten Abläufen
überführen, mit Daten aus mehreren Geräteformaten in einem Modell vereinheitlicht.

Zwei Bereiche: **Simulation** und **Dokumentation**.

**Echt sind** Wetter (Open-Meteo), Strompreis (aWATTar) und aktive Feuer (NASA FIRMS).
**Simuliert sind** Parks, Geräte und Messwerte — letztere abgeleitet aus der echten
Einstrahlung plus Rauschen. Die Oberfläche kennzeichnet das an jeder Stelle.

## Stand

Schritt 1 von 10 der Build-Reihenfolge: Gerüst und Designebene stehen.
`/ds` ist die Kontrollseite dafür.

## Stack

Next.js 16 (App Router) · React 19 · TypeScript · Tailwind v4 · Ziel Vercel.
Kein Zustandsspeicher außer einem In-Memory-Store mit Sim-Tick; externe Feeds
laufen über Route Handlers.

```bash
npm run dev    # http://localhost:3021
npm run build
```

## Designebene

Das Design kommt aus [AisuStudio/waffle](https://github.com/AisuStudio/waffle) und
liegt als Kopie im Repo — den Weg empfiehlt waffles README für neue Projekte.

| Datei | Was |
|---|---|
| `app/waffle/tokens.css` | Kopie aus waffle. Zwei dokumentierte Eingriffe (Fonts über `next/font/local`), sonst unverändert. |
| `app/waffle/components.css` | Kopie aus waffle, unverändert. `wf-`-Klassen. |
| `app/tokens.solarkreis.css` | Eigene Ebene darüber: was in diesem Produkt read, write, r&w und kritisch heißt. Keine neuen Farbwerte. |
| `app/globals.css` | Tailwind, Imports, `@theme inline`-Brücke, Basisstile. |

Vier Entscheidungen über waffle hinaus, alle auf `/ds` belegt:

1. **v1 ist nur hell.** `<html data-theme="light">` pinnt waffles Rollenebene fest.
   Gebaut wird trotzdem ausschließlich auf Rollen-Tokens — Dark Mode wäre später
   das Entfernen eines Attributs, kein Umbau.
2. **Flusslinien bekommen eine Ink-Fassung.** WCAG 1.4.11 will 3:1 für bedeutungs-
   tragende Grafik. Gegen vanilla messen die vier Linienfarben 4.17 · 2.65 · 3.58 ·
   4.31 — write (mango, `#ec6608`) fällt durch, und write ist die Linie, auf die es
   hier am meisten ankommt. Statt den Farbwert zu verbiegen trägt eine dünne
   Ink-Fassung den Kontrast, der Farbton weiter die Bedeutung.
3. **Chips füllen auf Level 2.** Nur dort klären alle vier Flavors mit Ink-Label AA
   für Fließtext. Der Punkt im Chip trägt die volle Sättigung, zeigt also die echte
   Linienfarbe.
4. **Der Not-Aus ist die einzige Ausnahme** von waffles Regel „keine Flavor-Farbe
   für Chrome“: hier ist die Farbe die Bedeutung. Auflage — Label ≥ 19 px bold
   (4.31:1 klärt AA nur als Großtext), und Farbe ist nie das einzige Signal.

## Datenquellen

| Quelle | Key | Status |
|---|---|---|
| Open-Meteo — Temperatur, Bewölkung, Niederschlag, Einstrahlung, Vorhersage | nein | offen |
| aWATTar — Day-Ahead-Spotpreis | nein | offen |
| NASA FIRMS — aktive Feuer | ja | offen, bis dahin gekennzeichneter Mock |

**Satellitenquelle:** NASA stellt die Auslieferung von **Suomi NPP zum 1.11.2026
ein**. SolarKreis fragt deshalb `VIIRS_NOAA21_NRT` und `VIIRS_NOAA20_NRT` ab, nicht
`VIIRS_SNPP_NRT` — sonst läuft der Feed zwei Monate nach dem Bau still aus.
Gegen `/api/data_availability` geprüft (30.08.2026): beide Quellen liefern bis heute,
SNPP ebenfalls noch. Rate-Limit sind 5000 Abrufe pro 10 Minuten, für einen Sim-Tick
also kein Thema.

**Feuerdichte, gemessen am 30.08.2026:** über ganz Deutschland **null** aktive Feuer
in 10 Tagen — auf NOAA-21, NOAA-20 und MODIS gleichermaßen. Europaweit im selben
Zeitraum 112 an einem Tag. Der echte Feed ist über Deutschland also fast immer leer.
Das ist keine Fehlfunktion, sondern der Normalzustand, und die Oberfläche zeigt ihn
als solchen an.

Den FIRMS-Key gibt es kostenlos unter
<https://firms.modaps.eosdis.nasa.gov/api/map_key/> — E-Mail eintragen, der Key
kommt sofort per Mail. Er gehört dann als `FIRMS_MAP_KEY` in `.env.local`
(und in die Vercel-Projektvariablen), nicht ins Repo.
