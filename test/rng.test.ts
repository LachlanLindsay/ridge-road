import { describe, expect, it } from 'vitest';
import { rand, seedRng } from '../src/engine/rng';

describe('mulberry32 in state', () => {
  it('repeats exactly from the same seed', () => {
    const a = { rng: seedRng(42) };
    const b = { rng: seedRng(42) };
    const xs = Array.from({ length: 50 }, () => rand(a));
    const ys = Array.from({ length: 50 }, () => rand(b));
    expect(xs).toEqual(ys);
  });

  it('differs between seeds and stays in [0, 1)', () => {
    const a = { rng: seedRng(1) };
    const b = { rng: seedRng(2) };
    const xs = Array.from({ length: 1000 }, () => rand(a));
    expect(xs.every((x) => x >= 0 && x < 1)).toBe(true);
    expect(rand(b)).not.toBe(xs[0]);
    const mean = xs.reduce((s, x) => s + x, 0) / xs.length;
    expect(mean).toBeGreaterThan(0.45);
    expect(mean).toBeLessThan(0.55);
  });

  it('keeps its state as a plain number that survives JSON', () => {
    const h = { rng: seedRng(9) };
    rand(h);
    const copy = JSON.parse(JSON.stringify(h)) as { rng: number };
    expect(rand(copy)).toBe(rand(h));
  });
});
