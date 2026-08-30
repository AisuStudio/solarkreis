"use client";

/*
  Schritt 6b: die Bedienung.

  ACHTUNG beim Lesen: für diesen Block gibt es kein Wireframe. Sollwert-
  Bedienung, Bestätigung und Not-Aus hat niemand gezeichnet — die Form unten
  ist meine Entscheidung, nicht Doms. Die Liste steht in
  docs/erfundene-entscheidungen.md und ist ausdrücklich zum Umwerfen da.

  Was NICHT erfunden ist, weil es feststand:
  - fail-closed: die Antwort des Wächters steht immer da, auch bei Erfolg
  - kritische Aktionen brauchen eine zweite Hand
  - der Not-Aus ist die einzige erlaubte Ausnahme von waffles Regel
    „keine Datenfarbe für Bedienelemente", Auflage Label >= 19px fett
  - jedes Kommando, auch das abgelehnte, landet im Log
*/

import { useState } from "react";
import type { Command, GuardResult } from "@/lib/model";
import type { Zustand } from "@/lib/zustand";

const STUFEN: [number, string][] = [
  [1, "100 %"],
  [0.75, "75 %"],
  [0.5, "50 %"],
  [0, "0 %"],
];

export function Schreibpfad({
  z,
  feldAktiv,
  onFeld,
  senden,
  laeuft,
  antwort,
}: {
  z: Zustand;
  feldAktiv: string | null;
  onFeld: (id: string | null) => void;
  senden: (body: Record<string, unknown>) => void;
  laeuft: boolean;
  antwort: Command | null;
}) {
  const [notAusFuer, setNotAusFuer] = useState<string | null>(null);
  /* Welche Felder ihre Geräte zeigen. Ein Set, weil man zwei Felder
     nebeneinander vergleichen will — ein einzelner offener Eintrag würde
     genau das verhindern. Zugeklappt beim Laden: sieben Geräte mit je vier
     Knöpfen sind die Antwort auf eine Frage, die man erst stellen muss. */
  const [geraeteOffen, setGeraeteOffen] = useState<Set<string>>(new Set());

  /* Nach jedem Absenden ist die Not-Aus-Rückfrage erledigt — egal wie der
     Wächter entschieden hat. */
  const abschicken = (body: Record<string, unknown>) => {
    senden(body);
    setNotAusFuer(null);
  };

  return (
    <section style={{ padding: "40px", background: "var(--color-bg)" }} aria-labelledby="eingreifen">
      <div className="sk-mono-eyebrow" style={{ color: "var(--color-muted)" }}>
        Schreibpfad
      </div>
      <h2 id="eingreifen" className="sk-titel-abschnitt" style={{ marginTop: 4 }}>
        Eingreifen
      </h2>
      <p className="sk-text-fliess" style={{ color: "var(--color-muted)", maxWidth: 620, marginTop: 8 }}>
        Jede Anforderung geht durch den Wächter. Was er sagt, steht darunter — auch
        wenn er zustimmt. Abgelehnte Kommandos landen genauso im Log wie ausgeführte.
      </p>

      <Mandant z={z} laeuft={laeuft} senden={abschicken} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginTop: 24 }}>
        {z.parks.map((p) => {
          /* Der Sollwert des Parks ist eine Ableitung, kein gespeicherter Wert:
             gespeichert ist er je Gerät. Solange nur der Park bedienbar war,
             stimmten alle Geräte immer überein und `devices[0]` war eine
             zulässige Abkürzung. Mit der Geräteebene ist sie es nicht mehr —
             die Zeile hätte den Sollwert des ersten Wechselrichters als den
             des ganzen Feldes ausgegeben.
             Deshalb: entweder sind sich alle einig, dann steht die Zahl da,
             oder sie sind es nicht, dann steht „gemischt" da. Eine dritte
             Möglichkeit gibt es nicht. */
          const sollwerte = p.devices.map((d) => d.device.setpoint);
          const einig = sollwerte.every((v) => Math.abs(v - sollwerte[0]) < 0.001);
          const sollwert = einig ? (sollwerte[0] ?? 1) : null;
          const offline = p.devices.every((d) => d.device.status === "offline");
          return (
            <div
              key={p.park.id}
              id={`eingreifen-${p.park.id}`}
              onMouseEnter={() => onFeld(p.park.id)}
              onMouseLeave={() => onFeld(null)}
              /* onFocus/onBlur steigen in React auf, deshalb genügt der
                 Container: wer sich per Tab durch die Knöpfe arbeitet, sieht
                 oben im Lageplan das passende Feld mitlaufen. */
              onFocus={() => onFeld(p.park.id)}
              onBlur={() => onFeld(null)}
              /* Sprungziel für den Alarmstreifen. scrollMarginTop hält die
                 Karte unter der klebenden Navigation frei — ohne das landet
                 sie beim Sprung genau darunter. */
              style={{
                scrollMarginTop: 72,
                background: "var(--sk-canvas-bg)",
                border: feldAktiv === p.park.id ? "2px solid var(--color-text)" : "1px solid var(--color-muted)",
                borderRadius: "var(--radius-md)",
                /* Ein Pixel weniger Polster, wenn der Rahmen ein Pixel
                   breiter wird — sonst springt der Inhalt beim Überfahren. */
                padding: feldAktiv === p.park.id ? 15 : 16,
              }}
            >
              <div className="sk-text-titel">{p.park.name}</div>
              <div className="sk-mono-daten" style={{ color: "var(--color-muted)" }}>
                Sollwert{" "}
                {sollwert === null
                  ? `gemischt (${sollwerte.map((v) => Math.round(v * 100)).join(" / ")} %)`
                  : `${Math.round(sollwert * 100)} %`}{" "}
                · {p.devices.length} Geräte
                {offline && " · offline"}
              </div>

              <div className="sk-mono-eyebrow" style={{ color: "var(--color-muted)", marginTop: 14 }}>
                Sollwert setzen
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {STUFEN.map(([v, label]) => (
                  <Knopf
                    key={v}
                    aktiv={sollwert !== null && Math.abs(sollwert - v) < 0.001}
                    disabled={laeuft}
                    onClick={() => abschicken({ action: "setpoint_setzen", park_id: p.park.id, value: v })}
                  >
                    {label}
                  </Knopf>
                ))}
              </div>

              <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                <Knopf disabled={laeuft} onClick={() => abschicken({ action: "freigeben", park_id: p.park.id })}>
                  Freigeben
                </Knopf>

                {notAusFuer === p.park.id ? (
                  <>
                    <button
                      type="button"
                      disabled={laeuft}
                      onClick={() => abschicken({ action: "not_aus", park_id: p.park.id, bestaetigt: true })}
                      className="sk-text-titel"
                      style={{
                        /* Die dokumentierte Ausnahme: Datenfarbe auf einem
                           Bedienelement. strawberry-5 mit vanilla-Label misst
                           4,31:1 — das klärt AA nur als Großtext, deshalb ist
                           das Label auf >= 19 px fett festgelegt.
                           Genommen wird Stufe 05 der Skala. Die stand beim
                           Schreiben dieser Zeile auf 20 px und liegt nach der
                           Neubewertung der Skala auf 24 — die Auflage bleibt
                           damit erfüllt, mit mehr Luft als vorher. Die Stufe
                           ist hier das Verlässliche, nicht die Zahl. */
                        fontSize: "var(--sk-fs-05)",
                        background: "var(--sk-estop-bg)",
                        color: "var(--sk-estop-label)",
                        border: "2px solid var(--color-text)",
                        borderRadius: "var(--radius-sm)",
                        padding: "8px 14px",
                        cursor: "pointer",
                      }}
                    >
                      Wirklich stilllegen
                    </button>
                    <Knopf disabled={laeuft} onClick={() => setNotAusFuer(null)}>
                      Abbrechen
                    </Knopf>
                  </>
                ) : (
                  <Knopf disabled={laeuft} onClick={() => setNotAusFuer(p.park.id)} kritisch>
                    Not-Aus
                  </Knopf>
                )}
              </div>

              <Geraeteliste
                p={p}
                offen={geraeteOffen.has(p.park.id)}
                umschalten={() =>
                  setGeraeteOffen((alt) => {
                    const neu = new Set(alt);
                    neu.has(p.park.id) ? neu.delete(p.park.id) : neu.add(p.park.id);
                    return neu;
                  })
                }
                laeuft={laeuft}
                senden={abschicken}
              />
            </div>
          );
        })}
      </div>

      {antwort && <WaechterAntwort command={antwort} />}
      <Log z={z} />
    </section>
  );
}

/*
  Die Geräteebene.

  Sie war die einzige Stelle, an der die Oberfläche weniger konnte als das
  Modell darunter: `device_id` ist in der Route seit jeher optional, der
  Wächter prüft sie mit, und die Faltung in store.ts filtert korrekt darauf.
  Es fehlten nur die Knöpfe. Wer den Code las, fand eine Fähigkeit, die er im
  Bild nicht wiederfand — und musste raten, ob sie trägt.

  Zugeklappt beim Laden, weil sieben Geräte mit je vier Stufen die Aussage
  der Feldebene erschlagen. Aufgeklappt steht je Gerät, was es unterscheidet:
  das Herstellerformat, sein Anteil an der Feldleistung, sein Zustand.

  Der Aufklapper ist ein Knopf mit aria-expanded und aria-controls, kein
  angeklickter div. Ohne das weiß niemand, der nicht hinsieht, dass sich hier
  etwas öffnen lässt.
*/
function Geraeteliste({
  p,
  offen,
  umschalten,
  laeuft,
  senden,
}: {
  p: Zustand["parks"][number];
  offen: boolean;
  umschalten: () => void;
  laeuft: boolean;
  senden: (body: Record<string, unknown>) => void;
}) {
  const id = `geraete-${p.park.id}`;
  return (
    <div style={{ marginTop: 14, borderTop: "1px solid var(--color-surface)", paddingTop: 12 }}>
      <button
        type="button"
        onClick={umschalten}
        aria-expanded={offen}
        aria-controls={id}
        className="sk-text-titel-klein"
        style={{
          background: "none",
          border: 0,
          padding: "6px 0",
          minHeight: 24,
          color: "var(--color-text)",
          cursor: "pointer",
          font: "inherit",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
        }}
      >
        {/* Das Zeichen dreht sich, es wird nicht ausgetauscht — der
            Zustand steht ohnehin in aria-expanded. */}
        <span aria-hidden="true" style={{ display: "inline-block", transition: "transform 140ms", transform: offen ? "rotate(90deg)" : "none" }}>
          ▸
        </span>
        {p.devices.length} Geräte einzeln
      </button>

      {offen && (
        <ul id={id} style={{ listStyle: "none", padding: 0, margin: "8px 0 0", display: "grid", gap: 12 }}>
          {p.devices.map(({ device, reading }) => (
            <li key={device.id}>
              <div className="sk-mono-kompakt" style={{ color: "var(--color-text)" }}>
                {device.id}
              </div>
              <div className="sk-mono-daten" style={{ color: "var(--color-muted)" }}>
                Format {device.vendor_format} · {Math.round(device.share * 100)} % Anteil ·{" "}
                {device.status} · Sollwert {Math.round(device.setpoint * 100)} % ·{" "}
                {reading.output_kw.toFixed(1)} kW
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {STUFEN.map(([v, label]) => (
                  <Knopf
                    key={v}
                    aktiv={Math.abs(device.setpoint - v) < 0.001}
                    disabled={laeuft}
                    onClick={() =>
                      senden({
                        action: "setpoint_setzen",
                        park_id: p.park.id,
                        device_id: device.id,
                        value: v,
                      })
                    }
                  >
                    {label}
                  </Knopf>
                ))}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function Knopf({
  children,
  onClick,
  disabled,
  aktiv,
  kritisch,
}: {
  children: React.ReactNode;
  onClick: () => void;
  disabled?: boolean;
  aktiv?: boolean;
  kritisch?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={aktiv}
      className="sk-text-titel-klein"
      style={{
        background: aktiv ? "var(--color-text)" : "var(--color-bg)",
        /* Die Schrift bleibt Ink, auch beim kritischen Knopf: strawberry-5 auf
           Vanilla misst 4,31:1 und verfehlt die 4,5 für Fließtext knapp. Das
           Signal trägt der Rahmen (4,31 reicht für Nicht-Text, gefordert 3:1)
           und das Wort selbst — Farbe war hier ohnehin nie das einzige Signal. */
        color: aktiv ? "var(--color-bg)" : "var(--color-text)",
        border: `${kritisch ? "2px" : "1px"} solid ${kritisch ? "var(--sk-crit)" : "var(--color-muted)"}`,
        borderRadius: "var(--radius-sm)",
        padding: "8px 12px",
        minHeight: 24,
        cursor: disabled ? "wait" : "pointer",
        opacity: disabled ? 0.6 : 1,
      }}
    >
      {children}
    </button>
  );
}

/** Die Antwort des Wächters, immer sichtbar — auch bei Zustimmung. */
function WaechterAntwort({ command }: { command: Command }) {
  const g: GuardResult = command.guard_result;
  const ok = g.kind === "autorisiert";
  return (
    <div
      role="status"
      style={{
        marginTop: 24,
        padding: 14,
        borderRadius: "var(--radius-md)",
        background: ok ? "var(--sk-read-fill)" : g.kind === "bestaetigung_noetig" ? "var(--sk-write-fill)" : "var(--sk-crit-fill)",
        color: "var(--sk-on-fill)",
        maxWidth: 720,
      }}
    >
      <div className="sk-mono-eyebrow">Wächter · {g.kind.replace(/_/g, " ")}</div>
      <div className="sk-text-fliess" style={{ marginTop: 4 }}>
        {command.action.replace(/_/g, " ")}
        {command.value !== null && ` auf ${Math.round(command.value * 100)} %`}
        {command.park_id && ` · ${command.park_id}`} → <strong>{command.status}</strong>.
        {!ok && " " + ("reason" in g ? g.reason : "")}
        {"safeDefault" in g && ` Sicherer Zustand: ${g.safeDefault}.`}
      </div>
    </div>
  );
}

/*
  Mandantentrennung zum Vorführen. Ein echtes Auth-System ist nicht in v1.

  Warum hier kein Umschalter steht: die Zuständigkeitsprüfung ist echt und
  läuft als erster Wächter bei jedem Kommando. Eine Anmeldung, eine Sitzung
  oder Rechte gibt es aber nicht — nur eine Kennung im Zustand. Ein Knopf
  „als op-nachbar handeln" wäre ein Rollenwechsel ohne Rollen dahinter.

  Der Preis war, dass sich ausgerechnet der Wächter, der zuerst greift, als
  einziger nicht vorführen ließ — man musste dem Satz glauben.

  Der Testschuss löst das ohne Lüge: ein einzelnes Kommando, ausdrücklich im
  Namen von op-nachbar, ausdrücklich als Vorführung benannt. Kein
  Rollenwechsel, keine behauptete Anmeldung. Es geht über den echten Pfad und
  nicht über den Trockenlauf, damit die Ablehnung auch im Log landet — die
  Regel „jedes Kommando, auch das abgelehnte, landet im Log" gilt für einen
  Testschuss genauso.
*/
function Mandant({
  z,
  laeuft,
  senden,
}: {
  z: Zustand;
  laeuft: boolean;
  senden: (body: Record<string, unknown>) => void;
}) {
  const fremd = z.operatoren.find((o) => o.id !== z.operatorId);
  return (
    <div style={{ marginTop: 16, maxWidth: 620 }}>
      <p className="sk-text-kompakt" style={{ color: "var(--color-muted)", margin: 0 }}>
        Angemeldet als <strong>{z.operatorId}</strong>. Der zweite Bediener{" "}
        <code className="sk-mono-daten">op-nachbar</code> betreibt keines dieser Felder — jeder
        Schreibversuch von ihm wird mit Begründung abgelehnt. Das ist ein Stub, kein Auth-System,
        und die Oberfläche sagt das.
      </p>
      {fremd && (
        <button
          type="button"
          disabled={laeuft}
          onClick={() =>
            senden({
              action: "setpoint_setzen",
              park_id: z.parks[0]?.park.id,
              value: 0.5,
              requested_by: fremd.id,
            })
          }
          className="sk-text-titel-klein"
          style={{
            marginTop: 10,
            background: "var(--color-bg)",
            color: "var(--color-text)",
            border: "1px dashed var(--color-muted)",
            borderRadius: "var(--radius-sm)",
            padding: "8px 12px",
            minHeight: 24,
            cursor: laeuft ? "wait" : "pointer",
            font: "inherit",
          }}
        >
          {/* Gestrichelter Rahmen: dieser Knopf schaltet nichts, er führt vor.
              Die übrigen Bedienelemente tragen durchgezogene Rahmen. */}
          Ablehnung vorführen — Kommando als {fremd.id}
        </button>
      )}
    </div>
  );
}

/*
  Der Ereignisstrom, neueste oben. Er wächst nur.

  Deshalb sitzt er in einem eigenen Rahmen mit fester Höhe: vierzig Einträge
  hätten die Seite sonst um mehrere Bildschirmhöhen verlängert, und alles
  darunter wäre unerreichbar geworden. Das Log ist Beleg, kein Hauptinhalt —
  es soll einsehbar sein, nicht die Seite bestimmen.

  Ein scrollbarer Kasten braucht `tabIndex={0}`: sonst kommt niemand hinein,
  der keine Maus benutzt. Mit role="region" und einem Namen taucht er
  zusätzlich in der Landmarkenliste auf.
*/
function Log({ z }: { z: Zustand }) {
  return (
    <div style={{ marginTop: 32, maxWidth: 900 }}>
      <div className="sk-mono-eyebrow" style={{ color: "var(--color-muted)" }}>
        Ereignisstrom · {z.eventCount} Einträge
      </div>
      <ol
        tabIndex={0}
        role="region"
        aria-label={`Ereignisstrom, ${z.eventCount} Einträge, neueste oben`}
        style={{
          listStyle: "none",
          padding: "4px 14px",
          margin: "10px 0 0",
          display: "grid",
          gap: 4,
          maxHeight: 340,
          overflowY: "auto",
          overscrollBehavior: "contain",
          border: "1px solid var(--color-muted)",
          borderRadius: "var(--radius-md)",
          background: "var(--sk-canvas-bg)",
        }}
      >
        {z.log.length === 0 && (
          <li className="sk-text-kompakt" style={{ color: "var(--color-muted)" }}>
            Noch nichts passiert.
          </li>
        )}
        {z.log.map((e, i) => (
          <li
            key={i}
            className="sk-mono-kompakt"
            style={{
              display: "grid",
              /* In ch statt px: in einer dicktengleichen Schrift ist 1ch genau
                 eine Zeichenbreite. Vorher standen hier 72px und 110px — bei
                 13px Schrift ging das auf, bei 15px braucht „auffaelligkeit"
                 aber 126px und lief in die Nachbarspalte. Mit ch wächst die
                 Spalte mit der Schrift mit, und der Fehler kann nicht
                 wiederkommen. 8 Zeichen Uhrzeit, 14 für die längste Art. */
              gridTemplateColumns: "9ch 15ch 1fr",
              gap: 12,
              padding: "6px 0",
              borderBottom: "1px solid var(--color-surface)",
              color: "var(--color-muted)",
            }}
          >
            <span>{new Date(e.ts).toLocaleTimeString("de-DE")}</span>
            <span style={{ color: "var(--color-text)" }}>{e.kind}</span>
            <span>
              {e.kind === "abruf" && `${e.source.label} — ${e.note}`}
              {e.kind === "kommando" &&
                `${e.command.action.replace(/_/g, " ")}${e.command.park_id ? " · " + e.command.park_id : ""} → ${e.command.status}` +
                  (e.command.status === "abgelehnt" && "reason" in e.command.guard_result
                    ? ` (${e.command.guard_result.reason})`
                    : "")}
              {e.kind === "auffaelligkeit" && e.alert.message}
              {e.kind === "messung" && `${e.reading.device_id} · ${e.reading.output_kw} kW`}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}
