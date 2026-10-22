// mulberry32, with its 32-bit state stored in the game state so every run replays from its seed.

export interface RngHolder {
  rng: number;
}

export function seedRng(seed: number): number {
  // Spread small seeds so seeds 1, 2, 3... start far apart.
  let h = (seed ^ 0x9e3779b9) >>> 0;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b) >>> 0;
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35) >>> 0;
  return (h ^ (h >>> 16)) | 0;
}

/** Uniform float in [0, 1). Advances the holder's state. */
export function rand(h: RngHolder): number {
  h.rng = (h.rng + 0x6d2b79f5) | 0;
  let t = h.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

export function chance(h: RngHolder, p: number): boolean {
  return rand(h) < p;
}

export function between(h: RngHolder, lo: number, hi: number): number {
  return lo + (hi - lo) * rand(h);
}

export function pickIndex(h: RngHolder, n: number): number {
  return Math.min(n - 1, Math.floor(rand(h) * n));
}

export function pickWeighted<K extends string>(h: RngHolder, weights: Partial<Record<K, number>>): K {
  const entries = Object.entries(weights) as [K, number][];
  const total = entries.reduce((s, [, w]) => s + w, 0);
  let r = rand(h) * total;
  for (const [k, w] of entries) {
    r -= w;
    if (r < 0) return k;
  }
  return entries[entries.length - 1]![0];
}

export function shuffle<T>(h: RngHolder, arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = pickIndex(h, i + 1);
    [arr[i], arr[j]] = [arr[j]!, arr[i]!];
  }
  return arr;
}

/** A standalone generator for bots and tools, independent of game state. */
export function makeRng(seed: number): () => number {
  const h: RngHolder = { rng: seedRng(seed) };
  return () => rand(h);
}
