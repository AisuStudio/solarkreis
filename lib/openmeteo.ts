/*
  Schritt 3: die erste echte Quelle.

  Open-Meteo braucht keinen Schlüssel und deckt genau die vier Größen ab, die
  die Simulation braucht: Einstrahlung, Lufttemperatur, Bewölkung, Niederschlag.
  Abgefragt wird für die echten Koordinaten der drei Felder — genau deshalb
  stehen im Seed reale Orte und keine Fantasiepunkte.

  Warum ein Zwischenspeicher und kein Abruf pro Anfrage: die Oberfläche fragt
  alle zwei Sekunden. Ein Abruf pro Anfrage wären 5.400 Aufrufe pro Stunde für
  Daten, die sich stündlich ändern. Der Speicher hält 30 Minuten.

  Warum `at()` synchron bleibt: `snapshot()` rechnet den ganzen Kreis in einem
  Zug durch, und ein `await` mitten in der Faltung würde bedeuten, dass Felder
  zu leicht verschiedenen Zeitpunkten gerechnet werden. Stattdessen füllt
  `refresh()` vorher den Speicher, und `at()` liest nur noch.

  Und die Ehrlichkeitsregel: schlägt der Abruf fehl oder liegt der Zeitpunkt
  außerhalb des gelieferten Fensters, rechnet der Rückfall — und die Probe
  trägt dann `origin: "simuliert"`. Die Oberfläche zeigt das an, ohne etwas
  über beide Quellen wissen zu müssen.
*/

import type { Park, Source } from "./model";
import { clearSky, type WeatherSample, type WeatherSource } from "./weather";
import { append } from "./store";

const ENDPUNKT = "https://api.open-meteo.com/v1/forecast";
const TTL_MS = 30 * 60_000;
const STUNDE_MS = 3_600_000;

interface Serie {
  /** Zeitstempel der Stundenwerte, aufsteigend. */
  t: number[];
  strahlung: number[];
  temperatur: number[];
  bewoelkung: number[];
  niederschlag: number[];
  fetchedAt: number;
}

/* Wie beim Ereignis-Store an globalThis, sonst ist der Speicher nach jedem
   Hot Reload leer und die Entwicklung feuert unnötig gegen die API. */
const globalRef = globalThis as unknown as { __solarkreisWetter?: Map<string, Serie> };
const speicher = (): Map<string, Serie> => (globalRef.__solarkreisWetter ??= new Map());

const ECHT = (fetchedAt: number): Source => ({
  origin: "echt",
  label: "Open-Meteo, Stundenwerte",
  fetchedAt,
});

const AUSSERHALB: Source = {
  origin: "simuliert",
  label: "Rückfall — Zeitpunkt außerhalb des abgerufenen Fensters",
  fetchedAt: null,
};

const FEHLER: Source = {
  origin: "simuliert",
  label: "Rückfall — Open-Meteo nicht erreichbar",
  fetchedAt: null,
};

function url(park: Park): string {
  const p = new URLSearchParams({
    latitude: String(park.lat),
    longitude: String(park.lon),
    hourly: "shortwave_radiation,temperature_2m,cloud_cover,precipitation",
    timezone: "UTC",
    past_days: "1",
    forecast_days: "2",
  });
  return `${ENDPUNKT}?${p}`;
}

function brauchtAbruf(s: Serie | undefined, ts: number, jetzt: number): boolean {
  if (!s) return true;
  if (jetzt - s.fetchedAt > TTL_MS) return true;
  /* Auch dann neu holen, wenn der gefragte Zeitpunkt gar nicht abgedeckt ist —
     etwa nachdem der Zeitraffer weit gelaufen ist. */
  return ts < s.t[0] || ts > s.t[s.t.length - 1];
}

/** Holt fehlende oder veraltete Serien. Fehler werden geschluckt: die Probe
 *  fällt dann auf den Rückfall zurück und sagt das auch. */
export async function refresh(parks: Park[], ts: number): Promise<void> {
  const jetzt = Date.now();
  const offen = parks.filter((p) => brauchtAbruf(speicher().get(p.id), ts, jetzt));
  if (offen.length === 0) return;

  await Promise.all(
    offen.map(async (park) => {
      try {
        const r = await fetch(url(park), { cache: "no-store", signal: AbortSignal.timeout(8000) });
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        const d = await r.json();
        const h = d?.hourly;
        if (!h?.time?.length) throw new Error("keine Stundenwerte");

        speicher().set(park.id, {
          /* Open-Meteo liefert bei timezone=UTC Zeitstempel ohne Zonenangabe. */
          t: h.time.map((s: string) => Date.parse(s + "Z")),
          strahlung: h.shortwave_radiation,
          temperatur: h.temperature_2m,
          bewoelkung: h.cloud_cover,
          niederschlag: h.precipitation,
          fetchedAt: jetzt,
        });

        /* Der Abruf ist ein Ereignis. Das Modell kennt die Art `abruf`, und die
           Doku behauptet, jeder Wert trage seine Herkunft — also muss der
           Abruf auch im Log stehen und nicht nur im Speicher. */
        append({
          kind: "abruf",
          ts,
          source: ECHT(jetzt),
          note: `${park.name}: ${h.time.length} Stundenwerte`,
        });
      } catch {
        /* Absichtlich stumm. Der Fehler zeigt sich dort, wo er hingehört:
           an der Probe, die dann „simuliert" trägt. */
      }
    }),
  );
}

/** Linear zwischen den beiden umgebenden Stundenwerten. */
function zwischen(t: number[], werte: number[], ts: number): number | null {
  if (!t.length || ts < t[0] || ts > t[t.length - 1]) return null;
  let i = 0;
  while (i < t.length - 1 && t[i + 1] < ts) i++;
  const a = werte[i];
  const b = werte[Math.min(i + 1, werte.length - 1)];
  if (a == null || b == null) return null;
  const spanne = t[Math.min(i + 1, t.length - 1)] - t[i];
  const anteil = spanne > 0 ? (ts - t[i]) / spanne : 0;
  return a + (b - a) * anteil;
}

export const openMeteo: WeatherSource & {
  refresh: (parks: Park[], ts: number) => Promise<void>;
} = {
  refresh,

  at(park: Park, ts: number): WeatherSample {
    const s = speicher().get(park.id);
    if (!s) return { ...clearSky.at(park, ts), source: FEHLER };

    const strahlung = zwischen(s.t, s.strahlung, ts);
    if (strahlung === null) return { ...clearSky.at(park, ts), source: AUSSERHALB };

    /* Bewölkung und Niederschlag NICHT interpolieren: beides sind Summen bzw.
       Zustände über die Stunde, kein stetiger Verlauf. Der Stundenwert gilt. */
    const i = Math.max(0, Math.min(s.t.length - 1, Math.floor((ts - s.t[0]) / STUNDE_MS)));

    return {
      irradiance: Math.max(0, strahlung),
      airTemp: zwischen(s.t, s.temperatur, ts) ?? 0,
      cloudCover: (s.bewoelkung[i] ?? 0) / 100,
      precipitation: s.niederschlag[i] ?? 0,
      source: ECHT(s.fetchedAt),
    };
  },
};
