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

export function Schreibpfad({ z, nachKommando }: { z: Zustand; nachKommando: () => void }) {
  const [antwort, setAntwort] = useState<{ command: Command } | null>(null);
  const [laeuft, setLaeuft] = useState(false);
  const [notAusFuer, setNotAusFuer] = useState<string | null>(null);

  async function senden(body: Record<string, unknown>) {
    setLaeuft(true);
    try {
      const r = await fetch("/api/kommando", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...body, requested_by: z.operatorId }),
      });
      setAntwort(await r.json());
      nachKommando();
    } finally {
      setLaeuft(false);
      setNotAusFuer(null);
    }
  }

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

      <Mandant z={z} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))", gap: 20, marginTop: 24 }}>
        {z.parks.map((p) => {
          const sollwert = p.devices[0]?.device.setpoint ?? 1;
          const offline = p.devices.every((d) => d.device.status === "offline");
          return (
            <div
              key={p.park.id}
              style={{
                background: "var(--sk-canvas-bg)",
                border: "1px solid var(--color-muted)",
                borderRadius: "var(--radius-md)",
                padding: 16,
              }}
            >
              <div className="sk-text-titel">{p.park.name}</div>
              <div className="sk-mono-daten" style={{ color: "var(--color-muted)" }}>
                Sollwert {Math.round(sollwert * 100)} % · {p.devices.length} Geräte
                {offline && " · offline"}
              </div>

              <div className="sk-mono-eyebrow" style={{ color: "var(--color-muted)", marginTop: 14 }}>
                Sollwert setzen
              </div>
              <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap" }}>
                {STUFEN.map(([v, label]) => (
                  <Knopf
                    key={v}
                    aktiv={Math.abs(sollwert - v) < 0.001}
                    disabled={laeuft}
                    onClick={() => senden({ action: "setpoint_setzen", park_id: p.park.id, value: v })}
                  >
                    {label}
                  </Knopf>
                ))}
              </div>

              <div style={{ display: "flex", gap: 6, marginTop: 12, flexWrap: "wrap" }}>
                <Knopf disabled={laeuft} onClick={() => senden({ action: "freigeben", park_id: p.park.id })}>
                  Freigeben
                </Knopf>

                {notAusFuer === p.park.id ? (
                  <>
                    <button
                      type="button"
                      disabled={laeuft}
                      onClick={() => senden({ action: "not_aus", park_id: p.park.id, bestaetigt: true })}
                      className="sk-text-titel"
                      style={{
                        /* Die dokumentierte Ausnahme: Datenfarbe auf einem
                           Bedienelement. strawberry-5 mit vanilla-Label misst
                           4,31:1 — das klärt AA nur als Großtext, deshalb ist
                           das Label auf >= 19 px fett festgelegt.
                           Genommen wird Stufe 05 der Skala (20 px): 19 stand
                           neben der Skala, und eine Auflage rechtfertigt keine
                           eigene Größe, wenn eine passende schon da ist. */
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
            </div>
          );
        })}
      </div>

      {antwort && <WaechterAntwort command={antwort.command} />}
      <Log z={z} />
    </section>
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
        color: aktiv ? "var(--color-bg)" : kritisch ? "var(--sk-crit)" : "var(--color-text)",
        border: `1px solid ${kritisch ? "var(--sk-crit)" : "var(--color-muted)"}`,
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

/** Mandantentrennung zum Vorführen. Ein echtes Auth-System ist nicht in v1. */
function Mandant({ z }: { z: Zustand }) {
  return (
    <p className="sk-text-kompakt" style={{ color: "var(--color-muted)", marginTop: 16, maxWidth: 620 }}>
      Angemeldet als <strong>{z.operatorId}</strong>. Der zweite Bediener{" "}
      <code className="sk-mono-daten">op-nachbar</code> betreibt keines dieser Felder — jeder
      Schreibversuch von ihm wird mit Begründung abgelehnt. Das ist ein Stub, kein Auth-System,
      und die Oberfläche sagt das.
    </p>
  );
}

/** Der Ereignisstrom, neueste oben. Er wächst nur. */
function Log({ z }: { z: Zustand }) {
  return (
    <div style={{ marginTop: 32 }}>
      <div className="sk-mono-eyebrow" style={{ color: "var(--color-muted)" }}>
        Ereignisstrom · {z.eventCount} Einträge
      </div>
      <ol style={{ listStyle: "none", padding: 0, margin: "10px 0 0", display: "grid", gap: 4, maxWidth: 900 }}>
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
              gridTemplateColumns: "72px 110px 1fr",
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
