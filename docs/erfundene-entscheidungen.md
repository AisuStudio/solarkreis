# Erfundene Entscheidungen

Für den Lageplan, die Doku und die Introseite gibt es Wireframes. **Für den
Schreibpfad nicht.** Sollwert-Bedienung, Bestätigung, Not-Aus und die Anzeige
des Wächters hat niemand gezeichnet — die Form stammt von mir.

Diese Liste ist zum Umwerfen da. Jeder Eintrag nennt, was ich entschieden habe
und warum, damit die Diskussion nicht bei „gefällt mir nicht" anfängt, sondern
bei der Begründung.

Was hier **nicht** steht, stand vorher fest und ist keine Erfindung: fail-closed,
die zweite Hand bei kritischen Aktionen, der Not-Aus als einzige erlaubte
Ausnahme von waffles Chrome-Regel, und dass jedes Kommando ins Log geht.

---

### 1 · Die Bedienung sitzt unter dem Lageplan, nicht in ihm

Der Lageplan ist das Bild des Systems. Ein Regler darin würde ihn von einer
Karte zu einem Bedienfeld machen, und der Hero verliert seine Aussage.

*Alternative, falls das falsch ist:* Bedienung im Lageplan an den Feldknoten,
dann muss der Hero aber neu gedacht werden.

**Geändert am 30.08 — beides, nicht eines.** Ich hatte Doms „ja" auf meinen
Gegenvorschlag bezogen; gemeint war seine eigene Idee. Die Schaltwarte geht
jetzt über der Feldkarte auf: vier Stufen, Freigeben, Not-Aus, letzterer
zweistufig wie unten. Eine Sicherung, die je nach Bedienort anders greift,
wäre keine.

Meine drei Einwände bleiben gültig — kein Hover auf Touch, versteckte
Bedienelemente werden nicht gefunden, der Not-Aus gehört nicht hinter eine
Mausbewegung. Sie sind der Grund, warum „Eingreifen" bestehen bleibt: die
Schaltwarte ist der schnelle Weg, nicht der einzige. Dazu die Verkopplung —
Zeiger auf ein Feld hebt die zugehörige Karte unten hervor und umgekehrt,
auch per Tab.

Damit steht die ursprüngliche Entscheidung nur noch halb: die Bedienung sitzt
unter dem Lageplan **und** in ihm. Der Hero bleibt davon unberührt, weil die
Warte erst beim Anfassen erscheint — im Ruhezustand ist der Plan weiter nur
ein Bild.

Bei der Gelegenheit ist der gestrichelte Ring zwischen den Feldern gefallen.
Dom fand unklar, was die Felder untereinander austauschen — die Antwort aus
dem Modell lautet: nichts. Die Linie behauptete eine Beziehung, die es nicht
gibt.

---

### 2 · Sollwert als vier Knöpfe (100 / 75 / 50 / 0 %), kein Schieberegler

Zwei Gründe. Erstens ist ein Schieberegler ein Genauigkeitsversprechen, das die
Simulation nicht einlöst — 63 % und 64 % unterscheiden sich in nichts, was man
sehen könnte. Zweitens sind diskrete Stufen im Log lesbar: „setpoint setzen auf
50 %" erzählt eine Geschichte, „auf 0,6341" nicht.

*Alternative:* Schieberegler mit Rastung, falls die Feinsteuerung später zählt.

**Bestätigt am 30.08.** Ohne Änderung übernommen.

---

### 3 · Not-Aus in zwei Schritten am selben Ort, kein Dialogfenster

Klick öffnet „Wirklich stilllegen" direkt daneben, zweiter Klick führt aus.
Ein modaler Dialog wäre die übliche Lösung, verdeckt aber genau die Anlage,
über die man gerade entscheidet.

Der zweite Knopf trägt strawberry mit vanilla-Label bei **19 px fett** — die
Auflage aus `tokens.solarkreis.css`, weil die Kombination 4,31:1 misst und
damit nur als Großtext AA klärt.

*Alternative:* modaler Dialog mit Tippbestätigung, falls das zu leicht auslöst.

**Bestätigt am 30.08.** Ohne Änderung übernommen.

---

### 4 · Die Antwort des Wächters steht immer da, auch bei Zustimmung

Üblich wäre, nur Fehler zu zeigen. Hier ist der Wächter aber der Gegenstand:
wenn er nur bei Ablehnung sichtbar wird, sieht man nie, dass er bei jedem
Kommando läuft. Grün heißt hier „geprüft und durchgelassen", nicht „gemacht".

*Alternative (beim Durchgang nachgetragen):* eine dauerhafte Zeile statt einer
Meldung pro Klick — sie zeigt immer den letzten Prüfvorgang mit Zeitstempel.
Immer sichtbar, ohne bei jedem Klick neu aufzutauchen. Kostet Fläche, gewinnt
Ruhe.

**Vorerst behalten, 30.08.** Doms Wort war „erstmal" — die Meldung pro Klick
bleibt, die Dauerzeile ist nicht verworfen. Der Anlass, sie zu bauen, wäre
jemand, der viele Sollwerte hintereinander setzt und die Meldungen dabei zu
lesen aufhört.

---

### 5 · Sollwert wirkt auf den ganzen Park, nicht je Gerät

Die Route kann beides — `device_id` ist optional. Die Oberfläche bietet
vorerst nur den Park an, weil sieben Regler nebeneinander die Aussage
verwässern und kein Wireframe eine Geräteebene vorsieht.

*Alternative:* Ausklappen je Feld, sobald es einen Grund gibt, ein einzelnes
Gerät anders zu fahren.

**Umgeworfen am 30.08 — die Geräteebene ist gebaut.** Das war der Eintrag mit
der schwächsten Begründung: es sprach nichts dagegen, es fehlte nur eine
Zeichnung. Jede Feldkarte hat jetzt einen Aufklapper „N Geräte einzeln"; je
Gerät stehen Herstellerformat, Anteil, Zustand, Sollwert und Leistung, dazu
dieselben vier Stufen.

Dabei ist ein Fehler aufgefallen, den erst die Geräteebene auslöst: die
Kopfzeile las den Sollwert des Parks als `devices[0].setpoint`. Solange nur
der Park bedienbar war, stimmten alle Geräte immer überein und das war eine
zulässige Abkürzung. Jetzt steht dort entweder die Zahl, wenn sich alle einig
sind, oder „gemischt (50 / 75 / 50 %)".

---

### 6 · Der Mandantenwechsel ist Text, kein Umschalter

`op-nachbar` wird erklärt, aber nicht anklickbar angeboten. Ein Umschalter
neben den Schaltflächen sähe aus wie ein Rollenwechsel im Produkt — und das
wäre eine Behauptung, die der Operator-Stub nicht trägt. Wer die
Mandantentrennung prüfen will, nimmt die Route:

```
/api/kommando?action=setpoint_setzen&park_id=nord&value=0.6&operator=op-nachbar
```

**Ergänzt am 30.08 — der Testschuss.** Der Preis dieser Entscheidung war,
dass sich ausgerechnet der Wächter, der zuerst greift, als einziger nicht
vorführen ließ. Jetzt steht unter dem Absatz ein Knopf „Ablehnung vorführen —
Kommando als op-nachbar". Er schickt ein einzelnes Kommando im Namen des
fremden Mandanten über den echten Pfad, nicht über den Trockenlauf: die
Ablehnung landet damit auch im Log, und die Regel „jedes Kommando, auch das
abgelehnte, landet im Log" gilt für einen Testschuss genauso.

Kein Rollenwechsel, keine behauptete Anmeldung. Der Knopf trägt als einziger
der Seite einen gestrichelten Rahmen: er schaltet nichts, er führt vor.

---

### 7 · Der Ereignisstrom zeigt die letzten 40 Einträge, neueste oben

Der Strom wächst unbegrenzt; die Anzeige braucht ihn nicht ganz. Neueste oben,
weil die letzte Handlung die ist, deren Wirkung man sucht.

*Bewusste Grenze:* auf Vercel ist das Log nach einem Kaltstart leer. Der Store
liegt im Speicher, nicht in einer Datenbank. Das steht so auch in der README.

**Erledigt am 30.08.** Der Strom sitzt jetzt in einem eigenen Rahmen mit
fester Höhe statt die Seite um mehrere Bildschirmhöhen zu verlängern.
