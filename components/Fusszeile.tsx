/*
  Der Fußbereich, global. Er steht im Wurzel-Layout und damit auf jeder
  Seite — vorher lag er nur auf der Introseite und wäre bei jeder Änderung
  viermal zu pflegen gewesen.

  Vier Verweise, jeder mit einer Zeile darunter, die sagt, wohin er führt.
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
  /* Ohne den t=-Parameter aus Doms Adresszeile: der ist ein Sitzungsmerkmal
     seines Browsers und hat in einem Link, den Fremde öffnen, nichts zu
     suchen. node-id=0-1 öffnet die Seite mit den Wireframes, nicht die
     zuletzt betrachtete.

     p=f steht dagegen drin, weil Dom genau diese Adresse im privaten
     Fenster geprüft hat. Der Parameter ist vermutlich belanglos — aber bei
     einem Link, der in eine Bewerbung geht, ist die geprüfte Fassung mehr
     wert als die aufgeräumte. */
  [
    "Wireframes in Figma",
    "die Entwürfe vor dem Code",
    "https://www.figma.com/design/iDqKPSwZ5pXciPmNzJQe7o/SolarKreis-%E2%80%94-Wireframes?node-id=0-1&p=f",
  ],
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
