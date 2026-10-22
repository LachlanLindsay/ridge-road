import { describe, expect, it } from 'vitest';
import { buildMap, horseReach, straightMiles } from '../src/engine/map';
import { MAP_DATA, T } from '../src/engine/data';
import { seedRng } from '../src/engine/rng';
import { storesFrom } from '../src/engine/stores';
import type { GameMap, Mode, Terrain } from '../src/engine/types';

const build = (seed: number, mode: Mode = 'historical') => buildMap({ rng: seedRng(seed) }, mode);
const routeSegs = (map: GameMap) => Object.values(map.segments).filter((s) => s.isRoute);

const SPEC_REGIONS: Record<number, { miles: number; terrain: Partial<Record<Terrain, number>>; decoys: number }> = {
  1: { miles: 6, terrain: { openForest: 3, scrub: 3 }, decoys: 4 },
  2: { miles: 8, terrain: { thick: 6.5, rocky: 1.5 }, decoys: 2 },
  3: { miles: 9, terrain: { scrub: 6, swamp: 3 }, decoys: 3 },
  4: { miles: 5, terrain: { scrub: 3, heath: 2 }, decoys: 3 },
  5: { miles: 22, terrain: { scrub: 10, thorny: 6, heath: 4, swamp: 2 }, decoys: 4 },
  6: { miles: 8, terrain: { meadow: 2, openForest: 6 }, decoys: 0 },
};

describe('the 1813 map', () => {
  it('has a true route of 58 miles, within the M2 tolerance of ±2', () => {
    const map = build(1);
    const total = routeSegs(map).reduce((s, g) => s + g.miles, 0);
    expect(total).toBeCloseTo(58, 6);
    expect(Math.abs(total - 58)).toBeLessThanOrEqual(2);
  });

  it('matches the spec region by region: miles and terrain', () => {
    const map = build(1);
    for (const [id, spec] of Object.entries(SPEC_REGIONS)) {
      const segs = routeSegs(map).filter((g) => g.region === Number(id));
      expect(segs.reduce((s, g) => s + g.miles, 0)).toBeCloseTo(spec.miles, 6);
      const byTerrain: Partial<Record<Terrain, number>> = {};
      for (const g of segs) byTerrain[g.terrain] = (byTerrain[g.terrain] ?? 0) + g.miles;
      for (const [t, mi] of Object.entries(spec.terrain)) expect(byTerrain[t as Terrain], `region ${id} ${t}`).toBeCloseTo(mi, 6);
    }
  });

  it('puts the high heath turn 18 miles in a straight line from the Nepean', () => {
    const map = build(1);
    expect(straightMiles(map.nodes['turn-north']!)).toBeCloseTo(18, 0);
  });

  it('places each region its decoys, every one ending at a precipice 0.5–3 miles off the route', () => {
    for (const seed of [1, 2, 3, 99, 1234]) {
      const map = build(seed);
      const decoySegs = Object.values(map.segments).filter((g) => !g.isRoute);
      const roots = decoySegs.filter((g) => map.segments[map.nodes[g.a]!.parentSeg ?? '']?.isRoute || map.nodes[g.a]!.id === map.start);
      const perRegion: Record<number, number> = {};
      for (const root of roots) {
        perRegion[root.region] = (perRegion[root.region] ?? 0) + 1;
        let miles = 0;
        let seg = root;
        for (;;) {
          miles += seg.miles;
          const b = map.nodes[seg.b]!;
          if (!b.childSegs.length) {
            expect(b.feature).toBe('precipice');
            break;
          }
          expect(b.childSegs).toHaveLength(1);
          seg = map.segments[b.childSegs[0]!]!;
        }
        expect(miles).toBeGreaterThanOrEqual(0.5 - 1e-9);
        expect(miles).toBeLessThanOrEqual(3 + 1e-9);
      }
      for (const [id, spec] of Object.entries(SPEC_REGIONS)) expect(perRegion[Number(id)] ?? 0, `seed ${seed} region ${id}`).toBe(spec.decoys);
      // Every precipice is a decoy's end; the route has none.
      const precipices = Object.values(map.nodes).filter((n) => n.feature === 'precipice');
      expect(precipices).toHaveLength(roots.length);
    }
  });

  it('re-rolls decoys per seed but keeps the true route fixed', () => {
    const a = build(1);
    const b = build(2);
    expect(routeSegs(a).map((g) => g.id)).toEqual(routeSegs(b).map((g) => g.id));
    const ends = (m: GameMap) => Object.values(m.nodes).filter((n) => n.feature === 'precipice').map((n) => `${n.x},${n.y}`).sort();
    expect(ends(a)).not.toEqual(ends(b));
    expect(JSON.stringify(build(5))).toBe(JSON.stringify(build(5)));
  });

  it('scales decoys by difficulty', () => {
    const count = (mode: Mode) => Object.values(build(3, mode).nodes).filter((n) => n.feature === 'precipice').length;
    expect(count('historical')).toBe(16);
    expect(count('easy')).toBe(16 - 5);
    expect(count('hard')).toBe(16 + 5);
  });

  it('is passable with the hoe once the route is cleared, the step shifted and the trench dug', () => {
    const map = build(1);
    const stores = storesFrom({});
    for (const seg of routeSegs(map)) {
      seg.visible = true;
      seg.markedMiles = seg.miles;
      seg.clearedMiles = seg.miles;
      if (seg.pass) {
        seg.found = true;
        seg.trenchHours = T.obstacles.trenchWorkerHoursHoe;
      }
    }
    const step = Object.values(map.nodes).find((n) => n.feature === 'rockStep')!;
    expect(horseReach(map, map.start, stores).has(map.goal)).toBe(false);
    step.stepHours = T.obstacles.rockStepWorkerHours;
    expect(horseReach(map, map.start, stores).has(map.goal)).toBe(true);
    // Without the hoe the same trench is not enough.
    expect(horseReach(map, map.start, { ...stores, hoe: 0 }).has(map.goal)).toBe(false);
  });

  it('starts with only the ford known and its first branch showing', () => {
    const map = build(4);
    const known = Object.values(map.nodes).filter((n) => n.known).map((n) => n.id);
    expect(known).toEqual(['ford']);
    const visible = Object.values(map.segments).filter((g) => g.visible);
    expect(visible.every((g) => g.a === 'ford')).toBe(true);
    expect(MAP_DATA.route[0]!.to.id).toBe('lagoon');
  });
});
