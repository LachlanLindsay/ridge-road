// The first outside tester's round: grass the map can show, the arithmetic the sheets now give, the
// offers that replace silent defaults, and nothing left "for the way home" once on it.
import { describe, expect, it } from 'vitest';
import { MAP_DATA, T, chooseEvent, eventCard, horseNightRate, runway } from '../src/engine/index';
import { grassOffer, huntOffer, normalizeDraft, withTarget } from '../src/ui/draft';
import { lineGame } from './helpers';

describe('grass on the true route follows the 1813 journal', () => {
  it('has no good grass between the forest tract and the descent (28 May: "fresh grass for the first time since")', () => {
    const route = (MAP_DATA as { route: { region: number; to: { id: string; grass: string } }[] }).route;
    const from = route.findIndex((l) => l.to.id === 'tract');
    const to = route.findIndex((l) => l.to.id === 'cliff');
    expect(from).toBeGreaterThan(0);
    expect(to).toBeGreaterThan(from);
    const between = route.slice(from + 1, to + 1);
    expect(between.filter((l) => l.to.grass === 'good' || l.to.grass === 'tall').map((l) => l.to.id)).toEqual([]);
  });
});

describe('the runway', () => {
  it('reads a night the way the night rules have it', () => {
    const s = lineGame('scrub', 3);
    const ford = s.map.nodes.ford!;
    ford.grass = 'rushy';
    ford.water = 'swamp';
    expect(horseNightRate(s, ford)).toBe(T.horses.night.rushy);
    ford.water = 'none';
    expect(horseNightRate(s, ford)).toBe(T.horses.night.rushy + T.horses.night.noWater);
    ford.grass = 'good';
    ford.water = 'stream';
    expect(horseNightRate(s, ford)).toBe(T.horses.night.goodFeed);
  });

  it('counts the nights until the weakest horse is spent', () => {
    const s = lineGame('scrub', 3);
    s.map.nodes.ford!.grass = 'none';
    s.map.nodes.ford!.water = 'none';
    s.horses[2]!.condition = 41;
    const r = runway(s);
    const loss = -(T.horses.night.noFeed + T.horses.night.noWater);
    expect(r.weakest?.condition).toBe(41);
    // Spent means below the line: 41 less one night's 16 is 25, still standing; the second night spends him.
    expect(r.nightsToSpent).toBe(Math.floor((41 - T.horses.exhaustedBelow) / loss) + 1);
  });

  it('flags food that will not see the party home with days to spare', () => {
    const s = lineGame('scrub', 3);
    expect(runway(s).foodShort).toBe(false);
    s.stores.flour = 10;
    s.stores.saltMeat = 10;
    s.stores.fresh = [];
    expect(runway(s).foodShort).toBe(true);
  });
});

describe('the plan sheet offers', () => {
  function atGoodGrass() {
    const s = lineGame('thick', 3, { marked: 3 });
    s.map.nodes.ford!.grass = 'good';
    s.map.nodes.ford!.water = 'stream';
    const a = s.map.nodes.A!;
    Object.assign(a, { known: true, reached: true, grass: 'none', water: 'none' });
    s.map.segments['s:A']!.farKnown = true;
    s.stores.grass = 0;
    const d = { ...normalizeDraft(s, null), target: 's:A', moveTo: null };
    return { s, d };
  }

  it('offers grass cutting at good grass when the ground walked ahead has none, as on 17 May 1813', () => {
    const { s, d } = atGoodGrass();
    const o = grassOffer(s, d)!;
    expect(o).not.toBeNull();
    expect(o.text).toMatch(/as much grass as could be put on them/);
    const after = o.apply(d);
    expect(Object.values(after.tasks).filter((t) => t === 'grass').length).toBeGreaterThan(0);
    expect(after.tasks.blaxland).not.toBe('grass');
    expect(grassOffer(s, after)).toBeNull();
  });

  it('puts nobody on grass unasked', () => {
    const { s } = atGoodGrass();
    const d = normalizeDraft(s, null);
    expect(Object.values(d.tasks)).not.toContain('grass');
  });

  it('does not offer grass where good grass lies ahead too', () => {
    const { s, d } = atGoodGrass();
    s.map.nodes.A!.grass = 'good';
    expect(grassOffer(s, d)).toBeNull();
  });

  it('offers Burne a hunt when food runs short at a forest or grass camp', () => {
    const { s, d } = atGoodGrass();
    s.stores.flour = 10;
    s.stores.saltMeat = 10;
    s.stores.fresh = [];
    const o = huntOffer(s, d)!;
    expect(o).not.toBeNull();
    expect(o.action).toMatch(/Burne/);
    expect(o.apply(d).tasks.burne).toBe('hunt');
  });
});

describe('the camp follows the work', () => {
  it('moves camp forward with a new target, with "Stay instead" left to the player', () => {
    const s = lineGame('openForest', 2, { marked: 2, cleared: 2 });
    const a = s.map.nodes.A!;
    Object.assign(a, { known: true, reached: true });
    s.map.segments['s:A']!.farKnown = true;
    s.map.goal = 'ford';
    const d = withTarget(s, { ...normalizeDraft(s, null), moveTo: null }, 's:A');
    expect(d.moveTo).toBe('A');
  });
});

describe('on the way home', () => {
  it('abandons goods rather than caching them for a way home already under way', () => {
    const s = lineGame('scrub', 3);
    s.leg = 'home';
    s.pending = [{ id: 'horseFall', horse: 1 }];
    expect(eventCard(s)!.choices.find((c) => c.id === 'lighten')!.effect).toMatch(/^Abandon/);
    const before = s.stores.grass + s.stores.flour + s.stores.saltMeat + s.stores.tea + s.stores.shoes;
    const t = chooseEvent(s, 'lighten');
    expect(t.caches[t.camp]).toBeUndefined();
    expect(t.stores.grass + t.stores.flour + t.stores.saltMeat + t.stores.tea + t.stores.shoes).toBeLessThan(before);
  });

  it('still leaves goods for the way home on the way out', () => {
    const s = lineGame('scrub', 3);
    s.pending = [{ id: 'horseFall', horse: 1 }];
    expect(eventCard(s)!.choices.find((c) => c.id === 'lighten')!.effect).toMatch(/for the way home/);
    const t = chooseEvent(s, 'lighten');
    expect(t.caches[t.camp]).toBeDefined();
  });
});
