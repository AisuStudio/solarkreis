/* Prüfseite für die Design-Ebene. Kein Produktbildschirm — sie beweist nur,
   dass waffle korrekt verdrahtet ist, und hält die vier Entscheidungen fest,
   die SolarKreis über waffle hinaus getroffen hat. Bleibt stehen. */

const FLOWS = [
  { key: "read",  label: "read",     line: "var(--sk-read)",  fill: "var(--sk-read-fill)",  desc: "Nur lesen. Messwerte, Wetter, Preis, Feuer." },
  { key: "write", label: "write",    line: "var(--sk-write)", fill: "var(--sk-write-fill)", desc: "Nur schreiben. Sollwert, Drosselung, Not-Aus." },
  { key: "rw",    label: "r&w",      line: "var(--sk-rw)",    fill: "var(--sk-rw-fill)",    desc: "Beides. Feld liest vom HQ und schreibt an es zurück." },
  { key: "crit",  label: "kritisch", line: "var(--sk-crit)",  fill: "var(--sk-crit-fill)",  desc: "Not-Aus, Überhitzung, Feuer in der Nähe." },
];

const RAMPS = [
  { name: "pistachio", levels: ["#c4ddb6", "#a6cd93", "#92c982", "#57a03a", "#3e7c1f"] },
  { name: "mango",     levels: ["#f0d9a3", "#efcc81", "#f2b63c", "#f0921a", "#ec6608"] },
  { name: "strawberry",levels: ["#f0aaa0", "#e9887b", "#e9634f", "#ee3d28", "#d80b0b"] },
  { name: "raspberry", levels: ["#f5b3d6", "#f192c7", "#ee72b6", "#ea4e9f", "#e6187c"] },
];

function Section({ n, title, children }: { n: string; title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "var(--sp-3xl)" }}>
      <div className="wf-eyebrow" style={{ marginBottom: "var(--sp-sm)" }}>{n}</div>
      <h2 style={{ marginBottom: "var(--sp-md)" }}>{title}</h2>
      {children}
    </section>
  );
}

export default function DesignSystemPage() {
  return (
    <main style={{ maxWidth: "var(--container-max)", margin: "0 auto", padding: "var(--sp-2xl) var(--gutter) var(--sp-4xl)" }}>
      <header style={{ marginBottom: "var(--sp-3xl)" }}>
        <div className="wf-eyebrow" style={{ marginBottom: "var(--sp-sm)" }}>SolarKreis · Designebene</div>
        <h1>waffle, verdrahtet</h1>
        <p style={{ color: "var(--color-muted)", maxWidth: "62ch", marginTop: "var(--sp-md)" }}>
          Diese Seite ist die Kontrolle, nicht das Produkt. Sie zeigt, dass Tokens, Schriften und
          Komponenten aus <a href="https://github.com/AisuStudio/waffle">AisuStudio/waffle</a> im
          Projekt ankommen, und dokumentiert die vier Stellen, an denen SolarKreis eine eigene
          Entscheidung getroffen hat. v1 ist bewusst nur hell.
        </p>
      </header>

      <Section n="01" title="Rollen-Tokens">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(150px, 1fr))", gap: "var(--sp-sm)" }}>
          {[
            ["--color-bg", "Seitengrund", "vanilla"],
            ["--color-surface", "Karte", "cappuccino"],
            ["--color-surface-2", "Fläche auf Fläche", "galão"],
            ["--color-text", "Text", "blueberry"],
            ["--color-muted", "Sekundärtext", "cortado"],
            ["--color-accent", "Akzent, Links", "grape"],
            ["--color-highlight", "Hervorhebung", "lemon"],
            ["--color-border", "Rahmen", "ink 14 %"],
          ].map(([token, role, swatch]) => (
            <div key={token} style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
              <div style={{ height: 44, background: `var(${token})`, borderBottom: "1px solid var(--color-border)" }} />
              <div style={{ padding: "8px 10px" }}>
                <div className="sk-val" style={{ fontSize: 12 }}>{token}</div>
                <div style={{ fontSize: 12, color: "var(--color-muted)" }}>{role} · {swatch}</div>
              </div>
            </div>
          ))}
        </div>
      </Section>

      <Section n="02" title="Datenkodierung">
        <p style={{ color: "var(--color-muted)", maxWidth: "62ch", marginBottom: "var(--sp-lg)" }}>
          Die Flavor-Rampen sind waffles dritte Farbebene. Sie kodieren Bedeutung im Inhalt und
          werden nie zu Chrome. Der Punkt im Chip trägt die volle Sättigung — also die echte
          Linienfarbe. Die Füllung liegt eine Stufe blass, damit das Label in Ink lesbar bleibt.
        </p>
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--sp-md)", marginBottom: "var(--sp-lg)" }}>
          {FLOWS.map((f) => (
            <span key={f.key} style={{
              display: "inline-flex", alignItems: "center", gap: 8,
              background: f.fill, color: "var(--sk-on-fill)",
              padding: "5px 12px 5px 9px", borderRadius: "var(--radius-full)",
              fontFamily: "var(--font-tertiary)", fontSize: 12,
            }}>
              <span style={{ width: 10, height: 10, borderRadius: "50%", background: f.line, boxShadow: "0 0 0 1px var(--color-blueberry)" }} />
              {f.label}
            </span>
          ))}
        </div>
        <div className="wf-spec-list">
          {FLOWS.map((f) => (
            <div className="wf-row" key={f.key}>
              <span>{f.desc}</span>
              <span className="wf-val">{f.label}</span>
            </div>
          ))}
        </div>
      </Section>

      <Section n="03" title="Warum jede Flusslinie eine Fassung bekommt">
        <p style={{ color: "var(--color-muted)", maxWidth: "62ch", marginBottom: "var(--sp-lg)" }}>
          WCAG 1.4.11 will 3:1 für bedeutungstragende Grafik gegen ihren Grund. Gegen vanilla
          messen die vier Linienfarben 4.17 · 2.65 · 3.58 · 4.31 — write fällt durch, und write ist
          die Linie, auf die es hier am meisten ankommt. Statt den Farbwert zu verbiegen bekommt
          jede Linie eine dünne Ink-Fassung: die Fassung trägt den Kontrast, der Farbton trägt
          weiter die Bedeutung.
        </p>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "var(--sp-md)" }}>
          {[false, true].map((cased) => (
            <figure key={String(cased)} style={{ margin: 0 }}>
              <svg viewBox="0 0 260 120" width="100%" role="img"
                   aria-label={cased ? "Vier Flusslinien mit Ink-Fassung" : "Vier Flusslinien ohne Fassung"}
                   style={{ background: "var(--color-bg)", border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", display: "block" }}>
                {FLOWS.map((f, i) => {
                  const y = 22 + i * 26;
                  return (
                    <g key={f.key}>
                      {cased && <line x1="20" y1={y} x2="240" y2={y} stroke="var(--sk-line-casing)" strokeWidth="var(--sk-line-casing-w)" strokeLinecap="round" />}
                      <line x1="20" y1={y} x2="240" y2={y} stroke={f.line} strokeWidth="var(--sk-line-w)" strokeLinecap="round" />
                    </g>
                  );
                })}
              </svg>
              <figcaption className="wf-meta-caption" style={{ marginTop: 6 }}>
                {cased ? "mit Fassung — so wird gebaut" : "ohne Fassung — mango verschwindet"}
              </figcaption>
            </figure>
          ))}
        </div>
      </Section>

      <Section n="04" title="Kontrast der Rampen gegen Ink">
        <p style={{ color: "var(--color-muted)", maxWidth: "62ch", marginBottom: "var(--sp-lg)" }}>
          Level 2 quer über alle vier Flavors ist der einzige Level, auf dem eine Füllung mit
          Ink-Label AA für Fließtext klärt. Deshalb liegen die Chips oben dort.
        </p>
        <table className="wf-table">
          <thead>
            <tr><th>Flavor</th>{[1, 2, 3, 4, 5].map((l) => <th key={l}>Level {l}</th>)}</tr>
          </thead>
          <tbody>
            {RAMPS.map((r) => (
              <tr key={r.name}>
                <td className="sk-val">{r.name}</td>
                {r.levels.map((hex, i) => (
                  <td key={hex} style={{ background: hex, color: "var(--color-blueberry)", fontFamily: "var(--font-tertiary)", fontSize: 12 }}>
                    {["11.52 / 9.44 / 8.74 / 5.21 / 3.29", "12.16 / 10.93 / 9.25 / 7.08 / 5.19",
                      "8.79 / 6.63 / 5.10 / 4.28 / 3.19", "9.87 / 7.76 / 6.19 / 4.88 / 3.84"
                     ][RAMPS.indexOf(r)].split(" / ")[i]}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </Section>

      <Section n="05" title="Tailwind-Utilities">
        <p style={{ color: "var(--color-muted)", maxWidth: "62ch", marginBottom: "var(--sp-lg)" }}>
          Die Tokens sind über <code className="sk-val">@theme inline</code> in Tailwind geöffnet.
          Kein Hex-Wert liegt doppelt — die Utility zeigt auf dieselbe Variable wie das CSS.
        </p>
        <div className="flex flex-wrap gap-2" id="tw-probe">
          <span className="bg-surface text-text rounded-sm px-3 py-1 text-xs">bg-surface</span>
          <span className="bg-surface-2 text-muted rounded-sm px-3 py-1 text-xs">bg-surface-2 · text-muted</span>
          <span className="bg-accent text-on-accent-solid rounded-sm px-3 py-1 text-xs">bg-accent</span>
          <span className="bg-highlight text-on-accent rounded-sm px-3 py-1 text-xs">bg-highlight</span>
          <span className="font-mono text-text border border-border rounded-sm px-3 py-1 text-xs">font-mono</span>
          <span className="bg-read-fill text-text rounded-sm px-3 py-1 text-xs">bg-read-fill</span>
          <span className="bg-write-fill text-text rounded-sm px-3 py-1 text-xs">bg-write-fill</span>
        </div>
      </Section>

      <Section n="06" title="Schrift">
        <div className="wf-spec-list">
          <div className="wf-row"><span style={{ fontFamily: "var(--font-secondary)", fontSize: 22 }}>Stoke · Überschriften</span><span className="wf-val">--font-secondary</span></div>
          <div className="wf-row"><span style={{ fontFamily: "var(--font-primary)" }}>Public Sans · Fließtext, Knöpfe, Navigation</span><span className="wf-val">--font-primary</span></div>
          <div className="wf-row"><span className="sk-val">iA Writer Mono · 12.4 kW · 48 °C · 61,20 €/MWh</span><span className="wf-val">--font-tertiary</span></div>
        </div>
      </Section>

      <Section n="07" title="Komponenten aus waffle">
        <div style={{ display: "flex", flexWrap: "wrap", gap: "var(--sp-md)", alignItems: "center" }}>
          <button className="wf-btn wf-btn-primary">Sollwert setzen</button>
          <button className="wf-btn wf-btn-secondary">Abbrechen</button>
          <button
            className="wf-btn"
            style={{
              background: "var(--sk-estop-bg)", color: "var(--sk-estop-label)",
              border: "1px solid var(--color-blueberry)", borderRadius: "var(--radius-sm)",
              padding: "10px 18px", fontSize: 19, fontWeight: 700, letterSpacing: ".04em", textTransform: "uppercase",
            }}
          >
            Not-Aus
          </button>
          <span className="wf-tag-pill">Format A</span>
          <span className="wf-chip-dashed">Daten veraltet</span>
          <span className="wf-badge-accent">simuliert</span>
        </div>
        <p className="wf-meta-caption" style={{ marginTop: "var(--sp-md)", maxWidth: "62ch" }}>
          Der Not-Aus ist die einzige Ausnahme von waffles Regel „keine Flavor-Farbe für Chrome“:
          hier ist die Farbe die Bedeutung. Auflage — Label ≥ 19 px bold (strawberry-5 mit
          vanilla misst 4.31:1, das klärt AA nur als Großtext), und Farbe ist nie das einzige
          Signal: der Knopf trägt immer Wort und Bestätigungsdialog.
        </p>
      </Section>
    </main>
  );
}
