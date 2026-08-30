# Bewusst nicht gebaut

Sammelstelle für Abschnitt 10 der Dokumentation. Jeder Eintrag nennt die Idee,
den Grund und — wo vorhanden — die Messung, die den Grund trägt. Ein „passt
nicht ins Scope" ohne Beleg ist eine Behauptung, keine Entscheidung.

## Verkehrsmelder am Autobahn-Feld

**Idee.** Feld Süd liegt 221 m von der A9. Ein Verkehrsmelder als vierte
Datenquelle lag nahe.

**Geprüft.** Die offene API der Autobahn GmbH (`verkehr.autobahn.de`) ist frei,
braucht keinen Schlüssel und liefert live — beim Test sieben Meldungen auf der
A9. Das übliche Argument gegen einen vierten Feed, „keine echte Quelle
verfügbar", trifft hier also **nicht** zu.

**Grund trotzdem dagegen.** Der Melder erzeugt Messwerte, die nie zu einem
Kommando führen. Eine Baustelle fünf Kilometer weiter ändert nichts an
Einstrahlung, Leistung oder Sicherheit der Anlage; es gäbe keine Regel, die
darauf reagiert, und keinen Schreibpfad, den er speist. Damit wäre er genau das,
wogegen dieses Projekt argumentiert: ein Strom, den man anzeigt, weil man ihn
hat. Die Meldungen sind zudem über die gesamte A9 verteilt — beim Test lagen die
ersten beiden in Bayern, rund 400 km entfernt.

**Was stattdessen bliebe.** Die Autobahnlage steht als Kontext in der
Park-Detailseite, weil sie erklärt, warum das Feld dort steht: das EEG
privilegiert einen 500-m-Streifen entlang von Autobahnen für Freiflächen-PV.

## Blendungs-Alarm Richtung Fahrbahn

**Idee.** Blendung ist bei autobahnnaher PV eine reale Auflage und wäre aus dem
Sonnenstand berechenbar, den die Simulation ohnehin führt — kein neuer Feed,
aber ein echter Schreibpfad: Sonne im kritischen Winkel → Module in
Schutzstellung → Wächter → Log. Das schließt den Kreis, den ein Verkehrsmelder
offen lässt.

**Gebaut und gemessen.** Die Geometrie ist implementiert (`lib/glare.ts`):
Flächennormale aus Neigung und Ausrichtung, Reflexion über `r = 2(n·s)n − s`,
daraus Azimut und Höhenwinkel des reflektierten Strahls. Ein Blendfenster gilt,
wenn der Strahl flach verläuft (≤ 6° Höhe) und die Fahrbahnpeilung um höchstens
20° verfehlt. Durchgerechnet über das gesamte Jahr 2026 im 5-Minuten-Raster.

**Ergebnis: null Blendfenster.** Nicht, weil das Modell nicht auslöst — der
Durchlauf über alle 24 Fahrbahnpeilungen zeigt Blendung bei 75–120° und
240–285°, symmetrisch um Süden, also tief stehende Morgen- und Abendsonne. Genau
das, was die Physik für nach Süden geneigte Module verlangt.

Der Grund ist die Lage. Die A9 verläuft bei Deutsch Bork mit 51°/231°; die
Senkrechten darauf zeigen auf 141° und 321°. Beide liegen außerhalb der Keulen:

| Fahrbahnpeilung | Blendminuten im Jahr |
|---|---|
| 120° | 8.285 |
| 135° | 0 |
| **141° (Feld nordwestlich der Fahrbahn)** | **0** |
| 285° | 1.000 |
| 300° | 0 |
| **309° (unser Standort)** | **0** |
| 321° (Feld südöstlich der Fahrbahn) | 0 |

**Entscheidung.** Der Alarm wird nicht ausgeliefert. An diesem Standort wäre er
toter Code, der so aussieht, als könne er etwas. Die naheliegende Rettung wäre
gewesen, so lange eine andere A9-Strecke zu suchen, bis eine zur Keule passt —
also die Welt zurechtzubiegen, damit das Feature auslöst. Das ist bei einem
Stück, dessen Wert an der Ehrlichkeit seiner Kennzeichnung hängt, der teuerste
mögliche Kurzschluss.

**Was bleibt.** Die Geometrie und die Diagnose-Route `/api/glare` bleiben im
Repo — sie sind der Beleg für diese Entscheidung, nicht ein halbes Feature. Wer
den Standort ändert, sieht dort sofort, ob der Fall dann eintritt.

**Grenze der Rechnung.** Das ist kein Blendgutachten. Ein echtes rechnet mit der
Ausdehnung der Fläche, dem Sonnendurchmesser, dem winkelabhängigen
Reflexionsgrad des Glases, Augenhöhe, Sichtachsen und Bewuchs. Hier steht eine
geometrische Näherung mit einer Modulausrichtung. Sie taugt, um zu zeigen, dass
der Fall an diesem Ort nicht eintritt — nicht, um eine Genehmigungsfrage zu
beantworten.
