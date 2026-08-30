/*
  Deterministischer Zufall.

  Warum nicht Math.random(): Messwerte müssen reproduzierbar sein. Zwei Abrufe
  derselben Sekunde müssen denselben Wert liefern, sonst zappelt das Dashboard
  bei jedem Rendern, und auf Vercel (mehrere Instanzen, kalte Starts) würde
  jede Instanz etwas anderes erzählen. Der Seed ist deshalb (Gerät, Zeitpunkt) —
  gleicher Seed, gleicher Wert, überall.
*/

/** 32-Bit-Hash über eine Zeichenkette (xmur3). */
function hash(str: string): number {
  let h = 1779033703 ^ str.length;
  for (let i = 0; i < str.length; i++) {
    h = Math.imul(h ^ str.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^= h >>> 16) >>> 0;
}

/** Gleichverteilt in [0,1) aus einem Seed (mulberry32). */
export function rand01(seed: string): number {
  let a = hash(seed);
  a |= 0;
  a = (a + 0x6d2b79f5) | 0;
  let t = Math.imul(a ^ (a >>> 15), 1 | a);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Rauschen in [-amount, +amount]. */
export function noise(seed: string, amount: number): number {
  return (rand01(seed) * 2 - 1) * amount;
}
