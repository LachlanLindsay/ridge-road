// Fixes from the primary-school playtest: the defaults that lost a first-time player.
import { describe, expect, it } from 'vitest';
import { campChoice, capacity, chooseEvent, endDay, newGame, resolveHalfDay, validatePlan, type GameState } from '../src/engine/index';
import { cacheWeight, collectCache, pathHomeDays } from '../src/engine/stores';
import { lineGame, tasks } from './helpers';

function evening(s: GameState): GameState {
  const m = resolveHalfDay(s, { tasks: tasks({ blaxland: 'camp', lawson: 'camp' }) }).state;
  return resolveHalfDay(m, { tasks: tasks({ blaxland: 'camp', lawson: 'camp' }) }).state;
}

describe('keep him at camp', () => {
  it('lasts until the chill has gone, not one day', () => {
    let s = lineGame('scrub', 4);
    const burne = s.men.find((m) => m.id === 'burne')!;
    burne.condition = 'chill';
    s.pending = [{ id: 'chill', member: 'burne' }];
    s = chooseEvent(s, 'keep');
    expect(s.men.find((m) => m.id === 'burne')!.keepAtCamp).toBe(true);
    // Through a night and a dawn he is still chilled (recovery is a roll) or recovered; either way
    // the flag matches the chill.
    s = evening(s);
    s = endDay(s, { rations: 'full' }).state;
    const b = s.men.find((m) => m.id === 'burne')!;
    expect(b.keepAtCamp).toBe(b.condition === 'chill');
  });
});

describe('caches', () => {
  it('never leaves the blankets and keeps food for the way home', () => {
    const s = lineGame('scrub', 4);
    const before = { ...s.stores };
    const lines: string[] = [];
    cacheWeight(s, 120, lines);
    expect(s.stores.blankets).toBe(before.blankets);
    expect(s.stores.flour + s.stores.saltMeat).toBeGreaterThan(0);
    expect(lines[0]).toMatch(/lb of (flour|salt meat|cut grass)/);
    expect(lines[0]).not.toMatch(/saltMeat/);
  });

  it('lets the men carry a cache home when the horses are spent', () => {
    const s = lineGame('scrub', 4);
    s.leg = 'home';
    for (const h of s.horses) h.condition = 10;
    expect(capacity(s, true)).toBeGreaterThan(0);
    s.stores.flour = 0;
    s.stores.saltMeat = 0;
    s.stores.tea = 0;
    s.stores.grass = 0;
    s.stores.blankets = 0;
    s.stores.shoes = 0;
    s.stores.axes = 0;
    s.stores.hatchets = 0;
    s.stores.hoe = 0;
    s.stores.shots = 0;
    s.caches[s.camp] = { flour: 60 };
    const lines: string[] = [];
    collectCache(s, lines);
    expect(s.stores.flour).toBeGreaterThan(0);
    expect(lines[0]).toMatch(/Collected from the cache: .* lb of flour/);
  });

  it('counts the days home from the trail', () => {
    const s = lineGame('scrub', 4);
    expect(pathHomeDays(s)).toBe(1);
  });
});

describe('camp suggestions and warnings', () => {
  it('prefers a camp with water a little short of the furthest reachable node', () => {
    const s = newGame({ seed: 3, mode: 'easy' });
    // From the ford the first mile of open forest leads to the lagoon; the suggestion should not
    // walk past water into a dry camp for the sake of a little distance.
    const target = Object.values(s.map.segments).find((g) => g.a === s.camp)!;
    const choice = campChoice(s, target.id, 8);
    const node = s.map.nodes[choice]!;
    expect(node.water === 'none' && choice !== s.camp).toBe(false);
  });

  it('does not warn about unmarked ground when a leader is scouting that way', () => {
    const s = lineGame('scrub', 4);
    const target = 's:A';
    const withScout = validatePlan(s, { tasks: tasks({ lawson: 'scout', wentworth: 'cut' }), target });
    expect(withScout.some((w) => w.code === 'cut')).toBe(false);
    const noScout = validatePlan(s, { tasks: tasks({ wentworth: 'cut' }), target });
    expect(noScout.some((w) => w.code === 'cut')).toBe(true);
  });
});
