/*
  Prüft die laufende Instanz gegen das Datenmodell.

      node scripts/pruefen.mjs [http://localhost:3021]

  Warum gegen die laufende Instanz und nicht als Unit-Test: die Fragen, um die
  es hier geht, entstehen erst im Zusammenspiel — ob die Normalisierung das
  überlebt, was das Gerät wirklich gesendet hat, ob die Summe der Geräte die
  Parkleistung ergibt, ob der Ladestand innerhalb seiner Grenzen bleibt. Ein
  Test gegen Attrappen würde genau das nicht sehen.

  Der Rückgabewert ist 1, sobald eine Prüfung durchfällt — damit taugt das
  Skript für eine Pipeline.
*/

const basis = process.argv[2] ?? "http://localhost:3021";
const ok = [];
const fehl = [];
const p = (bedingung, text) => (bedingung ? ok : fehl).push(text);
const n1 = (v) => Number(v).toFixed(1);

const z = await (await fetch(`${basis}/api/state`)).json();

/* ── Stammdaten ───────────────────────────────────────────────────────── */
for (const park of z.parks) {
  const summe = park.devices.reduce((s, g) => s + g.device.share, 0);
  p(Math.abs(summe - 1) < 1e-9, `${park.park.name}: Anteile summieren auf ${summe.toFixed(6)}`);
}

/* ── Normalisierung: was das Gerät sendet, muss herauskommen ───────────── */
for (const park of z.parks) {
  for (const g of park.devices) {
    const { raw, reading, device } = g;
    let kw, t;
    if (device.vendor_format === "A") { kw = raw.outputKw; t = raw.tempC; }
    else if (device.vendor_format === "B") { kw = raw.power_w / 1000; t = raw.temperature; }
    else { kw = raw.payload.p; t = raw.payload.t; }

    p(Math.abs(kw - reading.output_kw) < 0.05,
      `${device.id} Format ${device.vendor_format}: Rohform ${n1(kw)} kW = normalisiert ${n1(reading.output_kw)} kW`);
    p(Math.abs(t - reading.panel_temp) < 0.51,
      `${device.id} Format ${device.vendor_format}: Temperatur roh ${t} = normalisiert ${n1(reading.panel_temp)}`);
    /* Der Fehler, der zuerst drin war: Geräte melden ganze Grad. Wer die
       Rohform überspringt, zeigt 38,6 °C an — eine Zahl, die nie gesendet wurde. */
    p(Number.isInteger(t), `${device.id} meldet ganze Grad (${t})`);
  }
}

/* ── Summen ───────────────────────────────────────────────────────────── */
for (const park of z.parks) {
  const s = park.devices.reduce((a, g) => a + g.reading.output_kw, 0);
  p(Math.abs(s - park.output_kw) < 0.15, `${park.park.name}: Summe der Geräte ${n1(s)} = Parkleistung ${n1(park.output_kw)}`);
}
const gesamt = z.parks.reduce((a, x) => a + x.output_kw, 0);
p(Math.abs(gesamt - z.total_kw) < 0.15, `Kreis: Summe der Felder ${n1(gesamt)} = total_kw ${n1(z.total_kw)}`);

/* ── Physikalische Schranke ───────────────────────────────────────────── */
for (const park of z.parks) {
  for (const g of park.devices) {
    const grenze = park.park.capacity_kw * g.device.share * g.device.setpoint;
    p(g.reading.output_kw <= grenze + 0.5,
      `${g.device.id}: ${n1(g.reading.output_kw)} kW <= Kapazität × Anteil × Sollwert (${n1(grenze)})`);
  }
}

/* ── Speicher ─────────────────────────────────────────────────────────── */
const sp = z.speicher;
p(sp.soc >= sp.stamm.reserve_soc && sp.soc <= sp.stamm.max_soc,
  `Speicher: Ladestand ${(sp.soc * 100).toFixed(1)} % zwischen Reserve ${sp.stamm.reserve_soc * 100} und Max ${sp.stamm.max_soc * 100}`);
p(Math.abs(sp.available_kwh - (sp.soc - sp.stamm.reserve_soc) * sp.stamm.capacity_kwh) < 1,
  "Speicher: abrufbare Energie passt zum Ladestand");

/* ── Kreis-Regel ──────────────────────────────────────────────────────── */
p(z.grid_limit_kw === Math.round(z.capacity_kw * 0.72), `Netzgrenze ${z.grid_limit_kw} = 72 % von ${z.capacity_kw}`);
p(z.over_limit === z.total_kw > z.grid_limit_kw, "over_limit stimmt mit der Rechnung überein");

/* ── Ehrlichkeitsregel: jeder Wert trägt seine Herkunft ───────────────── */
for (const park of z.parks) {
  p(["echt", "simuliert"].includes(park.weather.source.origin),
    `${park.park.name}: Wetter trägt Herkunft (${park.weather.source.origin})`);
}
p(z.preis.source === null || ["echt", "simuliert"].includes(z.preis.source.origin), "Preis trägt Herkunft");
p(["echt", "simuliert"].includes(z.feuer.source.origin), `Feuer trägt Herkunft (${z.feuer.source.origin})`);

/* ── Die drei echten Quellen ──────────────────────────────────────────── */
p(z.parks.every((x) => x.weather.source.origin === "echt"), "Open-Meteo antwortet für alle drei Felder");
p(z.preis.source?.origin === "echt" && z.preis.reihe.length > 0, `aWATTar antwortet (${z.preis.reihe.length} Stundenpreise)`);
p(z.feuer.source.origin === "echt" && z.feuer.fehler === null, `NASA FIRMS antwortet (${z.feuer.hotspots.length} Detektionen)`);

/* ── Herkunft muss dem Ergebnis folgen, nicht der Absicht ──────────────
   Der Fehler, der das nötig gemacht hat: auf Vercel fehlte der
   FIRMS-Schlüssel, der Abruf lief ins Leere — und die Quellkarte zeigte
   trotzdem "ECHT". Ein Zustand, der einen Fehler trägt, darf nicht
   gleichzeitig "echt" heißen. */
p(!(z.feuer.fehler && z.feuer.hotspots.length === 0) || z.feuer.source.origin === "simuliert",
  `Feuer: Fehlerzustand und Herkunft passen zusammen (Fehler: ${z.feuer.fehler ?? "keiner"}, Herkunft: ${z.feuer.source.origin})`);
for (const park of z.parks) {
  p(park.weather.source.origin !== "echt" || park.weather.source.fetchedAt !== null,
    `${park.park.name}: "echt" trägt einen Abrufzeitpunkt`);
}
p(z.preis.source?.origin !== "echt" || z.preis.reihe.length > 0,
  "Preis: \"echt\" nur mit tatsächlich gelieferten Stundenpreisen");

/* ── Alarme sind gefiltert, nicht roh ─────────────────────────────────── */
p(z.feuer.relevant.length <= z.feuer.imUmkreis.length,
  `Feuer: ${z.feuer.relevant.length} relevant von ${z.feuer.imUmkreis.length} im Umkreis (${z.feuer.hotspots.length} roh)`);

/* ── Ausgabe ──────────────────────────────────────────────────────────── */
for (const t of ok) console.log("  ok    " + t);
if (fehl.length) {
  console.log("\n  DURCHGEFALLEN:");
  for (const t of fehl) console.log("  FEHL  " + t);
}
console.log(`\n${ok.length} bestanden, ${fehl.length} durchgefallen.`);
process.exit(fehl.length ? 1 : 0);
