# SolarKreis

Ein interaktives 2D-Dashboard für ein simuliertes Netz aus drei Solarparks, das mit
echten externen Daten gespeist werden soll. Es zeigt ein Produktmuster: einen read-only-Monitoring-
Prototyp in ein System mit sicherem Schreibzugriff und automatisierten Abläufen
überführen, mit Daten aus mehreren Geräteformaten in einem Modell vereinheitlicht.

Zwei Bereiche: **Simulation** und **Dokumentation**.

> **Alle drei echten Quellen hängen** (Stand 30.08.2026): Wetter über
> [Open-Meteo](https://open-meteo.com), Strompreis über [aWATTar](https://www.awattar.de),
> aktive Feuer über [NASA FIRMS](https://firms.modaps.eosdis.nasa.gov). Fällt eine aus,
> rechnet ein deterministischer Rückfall — und die Herkunft der betroffenen Werte wechselt
> sichtbar auf „simuliert". Nachprüfbar unter `/datenquellen` und mit
> `node scripts/pruefen.mjs`.

**Simuliert sind** Parks, Geräte und Messwerte — letztere abgeleitet aus der
Einstrahlung plus Rauschen. Die Oberfläche kennzeichnet das an jeder Stelle.

## Stand

Alle zehn Schritte abgeschlossen. Was danach offen bleibt, steht unten.

| | Schritt | |
|---|---|---|
| 1 | Gerüst + waffle-Tokens | ✓ Kontrollseite `/ds`, dazu neun Größenstufen und zwanzig Textstile |
| 2 | Datenmodell, Event-Store, Simulation | ✓ Kontrolle über `/api/state` |
| 3 | Open-Meteo | ✓ Stundenwerte für die echten Koordinaten der drei Felder |
| 4 | Geräteformate → Normalisierung → Übersicht | ◐ Logik fertig, Oberfläche unter `/simulation`; Geometrie noch nicht sauber |
| 5 | aWATTar + Statusleiste | ✓ Preis und Ertrag, Ertrag darf negativ werden |
| 6 | Schreibpfad fail-closed | ✓ Wächter, Kommando-Route, Bedienung; erfundene Teile in [docs/erfundene-entscheidungen.md](docs/erfundene-entscheidungen.md) |
| 7 | Kreis-Regel + Alerts | ✓ die Automatik geht durch denselben Wächter wie ein Mensch |
| 8 | NASA FIRMS | ✓ mit begründeter Schwelle statt rohem Feed |
| 9 | Datenquellen-Seite | ✓ `/datenquellen` |
| 10 | Dokumentationsseite | ✓ `/doku`, an mehreren Stellen gegen die Messung nachgezogen |

**Noch offen:** der animierte Hero liegt als Prototyp unter `public/hero.html` und ist
noch keine React-Komponente · die Geometrie des Lageplans ist nicht sauber (Text schneidet
in den Knotenkästen ab) · kein Deploy · Tastaturfokus und Reflow auf 320 px sind nicht
geprüft.

Außerhalb der Reihenfolge: `lib/glare.ts` als Beleg für eine Absage (siehe unten),
ein Hero-Prototyp als eine Datei unter `public/hero.html`, und `scripts/pruefen.mjs` —
48 Prüfungen gegen die laufende Instanz, vom Anteil-je-Park bis zur Frage, ob die
Normalisierung das überlebt, was das Gerät wirklich gesendet hat.

Feld Süd liegt seit der Autobahn-Frage an einer realen Ackerfläche bei Deutsch
Bork, 221 m von der A9 — innerhalb des 500-m-Korridors, den das EEG für
Freiflächen-PV entlang von Autobahnen privilegiert. Was daraus **nicht** folgt
(Verkehrsmelder, Blendungs-Alarm) und warum, steht mit den Messwerten in
[docs/scope-out.md](docs/scope-out.md).

### Wie die Simulation rechnet

Nicht kosmetisch, sondern physikalisch. `lib/solar.ts` bestimmt den Sonnenstand
über Deklination, Zeitgleichung und Stundenwinkel und daraus die
Klarhimmel-Einstrahlung (Kasten-Young für die Luftmasse, Meinel für die
Schwächung). `lib/sim.ts` macht daraus Leistung:

```
Leistung = Kapazität × Anteil × Sollwert × (G/1000) × Temperaturverlust × Zustand
```

Der Temperaturverlust folgt dem NOCT-Modell mit −0,4 %/K über 25 °C — deshalb
bringt ein heißer Julitag weniger als ein kühler Maitag mit gleicher Sonne.
Gemessen am 30.08.: mitternachts 0 kW, mittags 32 MW bei 618 W/m², zur
Sommersonnenwende 39,8 MW — also über der Netzgrenze von 38,88 MW, womit die
Kreis-Regel in Schritt 7 tatsächlich auslöst.

Der Zufall ist deterministisch (`lib/rng.ts`, Seed aus Gerät und Minute).
Zwei Abrufe derselben Minute liefern denselben Wert — sonst zappelt die
Anzeige, und auf Vercel erzählte jede Instanz etwas anderes.

### Event Sourcing

`lib/store.ts` ist append-only. Ein Sollwert ist kein Feld, das man setzt,
sondern die Faltung über alle ausgeführten Kommandos. Das Audit-Log ist damit
nicht nachträglich angeklebt — es *ist* der Zustand, und ein Kommando ohne
Eintrag kann es nicht geben.

Messwerte liegen bewusst **nicht** im Log, sondern werden auf Anfrage berechnet.
Sieben Geräte im Sekundentakt wären 25.000 Einträge pro Stunde für null
Erkenntnis. Ins Log kommt eine Messung nur, wenn sie etwas ausgelöst hat.

Bewusste Grenze von v1: bei einem Kaltstart auf Vercel ist das Log leer.
Kommandos überleben keinen Instanz-Neustart. Der Weg nach draußen wäre Supabase
mit derselben append-only-Tabelle.

### Speicher am HQ

Ein Batteriespeicher, 20 MWh bei 5 MW, am HQ statt in einem Park — damit wird
das HQ vom Beschriftungspunkt zum handelnden Actor. Er kostet **keine neue
Datenquelle**: er lebt von aWATTar, das ohnehin im Set ist.

Er ist aus drei Gründen drin, und nur der erste ist offensichtlich:

1. **Er ist der fehlende Schreib-Actor.** Jeder andere Schreibzugriff im System
   schränkt ein — drosseln, Not-Aus, Schutzstellung. Das Vokabular des
   „sicheren Schreibzugriffs" war damit rein defensiv. Der Speicher gibt dem
   Schreibpfad eine Handlung, die etwas herstellt.
2. **Er macht die Kreis-Regel zur Leiter.** Vorher: über der Netzgrenze oder
   Preis negativ → schwächsten Park drosseln, also Energie wegwerfen. Jetzt:
   erst einlagern, drosseln erst wenn nichts mehr hineinpasst. Abregelung ist
   das letzte Mittel statt der ersten Reaktion. Der Speicher ist bewusst zu
   klein, um Abregelung zu ersetzen — sonst wäre sie nie zu sehen.
3. **Der Ladestand belegt, dass das Event-Log trägt.** Ein Sollwert ist „letztes
   Kommando gewinnt"; den bekommt man auch ohne Ereignisstrom. Ein Ladestand ist
   eine Akkumulation über den gesamten Strom *und* über die Zeit zwischen den
   Kommandos. Man kann ihn nicht aus dem letzten Ereignis ablesen.

**Chemie: Eisen-Redox-Flow, nicht Eisen-Luft.** Die „Rostbatterie" ist eine
100-Stunden-Technologie für mehrtägige Überbrückung, mit absichtlich niedrigem
Leistungs-zu-Energie-Verhältnis und rund 50 % Zykluswirkungsgrad — für einen
Tageszyklus das falsche Werkzeug. Gerechnet an 30 Tagen echter Spotpreise
(31.07.–30.08.2026, 719 Stunden, Median-Tagesspanne 181 €/MWh) bringt dieselbe
Anlage bei 80 % rund 2.290 €/Tag und war an 29 von 29 Tagen im Plus; bei 50 %
rund 1.115 €/Tag und an 24 von 29. Die deutsche Preisspanne trägt also beide —
der Einwand gegen Eisen-Luft ist die Bauform, nicht die Wirtschaftlichkeit.

Und die Kennzeichnung bleibt genau: kein thermisches Durchgehen, keine
kritischen Rohstoffe. Nicht „ungefährlich" — der Elektrolyt ist ätzend.

Der Wächter ist hier am einleuchtendsten: **Preisdaten älter als 15 Minuten →
nicht handeln, Ruhestellung.** Ruhe ist der sichere Zustand, weil Nichtstun die
einzige Handlung ist, die ohne verlässlichen Preis nachweislich keinen Schaden
anrichtet. Belegt unter `/api/storage`, samt Prüflauf der Faltung gegen einen
erfundenen Ereignisstrom (4 h laden → 2 h ruhen → entladen, Zyklus misst 80 %).

### Normalisierung

Der Kernbeleg. Die drei Formate aus dem Brief werden am **Ingest** vereinheitlicht,
nicht in der Anzeige — `snapshot()` erzeugt den wahren Wert, verpackt ihn in die
Herstellerform und normalisiert ihn zurück. Alles dahinter sieht nur noch kW und °C.

| Format | Rohform | normalisiert |
|---|---|---|
| A | `{"outputKw":5845.4,"tempC":39}` | 5845.4 kW · 39.0 °C |
| B | `{"power_w":4815000,"temperature":39}` | 4815.0 kW · 39.0 °C |
| C | `{"payload":{"p":3597.6,"t":41}}` | 3597.6 kW · 41.0 °C |

Die Umleitung über die Rohform ist keine Umständlichkeit: wer sie abkürzt, zeigt
Werte an, die kein Gerät je gesendet hat. Geräte melden ganzzahlige Temperaturen.

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

**Entscheidung dazu (Dom, 30.08.2026):** Der echte Feed läuft und zeigt seinen
Normalzustand ehrlich an („keine aktiven Feuer im Umkreis, zuletzt geprüft 14:32").
Daneben steht ein klar als *simuliert* gekennzeichneter Szenario-Knopf, der einen
Hotspot einspielt — nur so ist der Eskalationspfad Waldbrand → verschärftes
Monitoring → Not-Aus überhaupt vorführbar. Verworfen: Radius auf 300–500 km
aufziehen („Waldbrand in der Nähe" bei 400 km ist eine unehrliche Behauptung) und
die Parks nach Südeuropa verlegen (kostet aWATTar, das nur DE/AT abdeckt).

Den FIRMS-Key gibt es kostenlos unter
<https://firms.modaps.eosdis.nasa.gov/api/map_key/> — E-Mail eintragen, der Key
kommt sofort per Mail. Er gehört dann als `FIRMS_MAP_KEY` in `.env.local`
(und in die Vercel-Projektvariablen), nicht ins Repo.
