import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";

/* waffle-Schriften, selbst gehostet. Die drei Variablennamen sind das, worauf
   waffles --font-primary / --font-secondary / --font-tertiary zeigen. */
const publicSans = localFont({
  src: [
    { path: "./fonts/PublicSans/PublicSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fonts/PublicSans/PublicSans-Italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/PublicSans/PublicSans-Medium.woff2", weight: "500", style: "normal" },
    { path: "./fonts/PublicSans/PublicSans-Bold.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-public-sans",
  display: "swap",
});

const stoke = localFont({
  src: [
    { path: "./fonts/Stoke/Stoke-Light.woff2", weight: "300", style: "normal" },
    { path: "./fonts/Stoke/Stoke-Regular.woff2", weight: "400", style: "normal" },
  ],
  variable: "--font-stoke",
  display: "swap",
});

const iaMono = localFont({
  src: [
    { path: "./fonts/iA-Writer-Mono/ia-writer-mono-latin-400-normal.woff2", weight: "400", style: "normal" },
    { path: "./fonts/iA-Writer-Mono/ia-writer-mono-latin-400-italic.woff2", weight: "400", style: "italic" },
    { path: "./fonts/iA-Writer-Mono/ia-writer-mono-latin-700-normal.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-ia-mono",
  display: "swap",
});

export const metadata: Metadata = {
  title: "SolarKreis",
  description:
    "Ein simuliertes Netz aus drei Solarparks, gespeist mit echten Wetter-, Preis- und Feuerdaten. Read-only-Monitoring mit sicherem Schreibpfad.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    /* data-theme="light": v1 ist bewusst nur hell (siehe globals.css). */
    <html lang="de" data-theme="light" className={`${publicSans.variable} ${stoke.variable} ${iaMono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
