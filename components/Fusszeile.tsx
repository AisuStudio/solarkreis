/*
  Der Fußbereich, global. Er steht im Wurzel-Layout und damit auf jeder
  Seite — vorher lag er nur auf der Introseite und wäre bei jeder Änderung
  viermal zu pflegen gewesen.

  Drei Verweise, jeder mit einer Zeile darunter, die sagt, wohin er führt.
  Die letzte Karte ist der Urheber: ohne sie ist eine Arbeitsprobe anonym.

  „Hero als eine Datei" stand hier bis zum 31.08. und ist raus. Der Prototyp
  public/hero.html bleibt im Repo — als Zwilling zur React-Fassung ist er
  nützlich. Für jemanden, der die Seite liest, ist er ein Bauteil aus der
  Werkstatt und kein Ziel.

  Externe Ziele tragen rel="noreferrer" — der Verweis soll nicht mitteilen,
  von welcher Unterseite aus jemand geklickt hat.
*/

const LINKS: [string, string, string][] = [
  ["Code auf GitHub", "github.com/AisuStudio/solarkreis", "https://github.com/AisuStudio/solarkreis"],
  ["Datenquellen", "was gerade wirklich antwortet", "/datenquellen"],
  ["Dominik Heilig", "dominikheilig.com", "https://dominikheilig.com"],
];

export function Fusszeile() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--color-surface)",
        marginTop: "var(--sp-4xl)",
        padding: "var(--sp-2xl) var(--gutter)",
      }}
    >
      <div
        style={{
          maxWidth: 1200,
          margin: "0 auto",
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
          gap: "var(--sp-xl)",
        }}
      >
        {LINKS.map(([t, u, href]) => {
          const extern = href.startsWith("http");
          return (
            <div key={href}>
              <a
                className="sk-text-titel"
                href={href}
                {...(extern ? { target: "_blank", rel: "noreferrer" } : {})}
              >
                {t} {extern ? "↗" : "→"}
              </a>
              <div className="sk-mono-daten" style={{ color: "var(--color-muted)", marginTop: 2 }}>
                {u}
              </div>
            </div>
          );
        })}
      </div>
    </footer>
  );
}
