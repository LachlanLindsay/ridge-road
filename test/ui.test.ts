import { describe, expect, it } from 'vitest';
import {
  capacity,
  chooseEvent,
  endDay,
  loadAfterCache,
  loadLb,
  newGame,
  resolveHalfDay,
  validatePlan,
  type GameState,
} from '../src/engine/index';
import { excessCache, normalizeDraft, overload, tapTask, toPlan } from '../src/ui/draft';
import { hachurePath, mapDraw } from '../src/ui/geometry';
import { BOTS } from '../sim/bots';
import { playRun } from '../sim/run';

/** Play the historical bot until the given day's morning. */
function playTo(seed: number, day: number): GameState {
  const bot = BOTS.historical!;
  let s = newGame({ seed, mode: 'historical' });
  while (s.phase !== 'over' && s.day < day) {
    if (s.pending.length) s = chooseEvent(s, bot.choose(s));
    else if (s.phase === 'evening') s = endDay(s, bot.evening(s)).state;
    else s = resolveHalfDay(s, bot.plan(s)).state;
  }
  while (s.pending.length) s = chooseEvent(s, bot.choose(s));
  return s;
}

describe('the map under fog of war (M2)', () => {
  it('shows only the ford and the first ridge at the start', () => {
    const d = mapDraw(newGame({ seed: 3, mode: 'historical' }));
    expect(d.nodes.map((n) => n.id)).toEqual(['ford']);
    expect(d.segs).toHaveLength(1);
    expect(d.segs[0]!.lead).toBe(true);
    expect(d.segs[0]!.farKnown).toBe(false);
  });

  it('never draws an unseen ridge, an unknown point, or the hidden pass before it is found', () => {
    for (const day of [4, 12, 20]) {
      const s = playTo(5, day);
      const d = mapDraw(s);
      for (const g of d.segs) {
        const seg = s.map.segments[g.id]!;
        expect(seg.visible).toBe(true);
        if (seg.pass) expect(seg.found).toBe(true);
      }
      for (const n of d.nodes) expect(s.map.nodes[n.id]!.known).toBe(true);
      const hiddenPass = Object.values(s.map.segments).find((g) => g.pass && !g.found);
      if (hiddenPass) expect(d.segs.some((g) => g.id === hiddenPass.id)).toBe(false);
      // The drawing carries no hint of which ridge is the true route.
      expect(JSON.stringify(d)).not.toContain('isRoute');
    }
  });

  it('draws an unexplored lead as a stub that stops short of where the ridge really ends', () => {
    const s = playTo(8, 6);
    const d = mapDraw(s);
    const stubs = d.segs.filter((g) => !g.farKnown);
    expect(stubs.length).toBeGreaterThan(0);
    for (const g of stubs) {
      const far = s.map.nodes[s.map.segments[g.id]!.b]!;
      expect(Math.hypot(g.b.x - far.x, g.b.y + far.y)).toBeGreaterThan(0.01);
    }
  });

  it('marks dead ends and shows the far ends of explored ridges', () => {
    const s = playRun(2, BOTS.historical!).state;
    const d = mapDraw(s);
    expect(d.segs.some((g) => g.deadEnd && g.deadRoot)).toBe(true);
    expect(d.nodes.some((n) => n.feature === 'precipice')).toBe(true);
    expect(d.nodes.some((n) => n.feature === 'goal')).toBe(s.goalDay !== null);
  });

  it('hachures only the ridges in view', () => {
    const d = mapDraw(playTo(4, 8));
    const b = d.bounds;
    expect(hachurePath(d.segs, 120, b).length).toBeGreaterThan(100);
    expect(hachurePath(d.segs, 120, { minX: 500, minY: 500, maxX: 501, maxY: 501 })).toBe('');
  });
});

describe('the plan sheet draft', () => {
  it('starts from the 1813 rhythm and a valid plan', () => {
    const s = newGame({ seed: 9, mode: 'historical' });
    s.pending = [];
    const d = normalizeDraft(s, null);
    expect(d.tasks.lawson).toBe('scout');
    expect(Object.values(d.tasks).filter((t) => t === 'cut')).toHaveLength(4);
    expect(d.target).not.toBeNull();
    expect(validatePlan(s, toPlan(s, d)).filter((w) => w.level === 'error')).toEqual([]);
  });

  it('stands a fit leader in as scout while Lawson is laid up, then puts Lawson back', () => {
    const s = newGame({ seed: 9, mode: 'historical' });
    s.pending = [];
    const lawson = s.men.find((m) => m.id === 'lawson')!;
    lawson.condition = 'chill';
    lawson.keepAtCamp = true;
    const ill = normalizeDraft(s, null);
    expect(ill.tasks.lawson).toBe('rest');
    expect(ill.tasks.blaxland).toBe('scout');
    expect(ill.roster.lawson).toBe('scout');
    expect(validatePlan(s, toPlan(s, ill)).filter((w) => w.level === 'error')).toEqual([]);
    const next = structuredClone(s);
    next.phase = 'afternoon';
    next.men.find((m) => m.id === 'lawson')!.condition = null;
    next.men.find((m) => m.id === 'lawson')!.keepAtCamp = false;
    const well = normalizeDraft(next, ill);
    expect(well.tasks.lawson).toBe('scout');
    expect(well.tasks.blaxland).toBe('camp');
  });

  it('rests everyone on a rest day and goes back to the standing orders after', () => {
    const s = newGame({ seed: 9, mode: 'historical' });
    s.pending = [];
    const working = normalizeDraft(s, null);
    const rest = structuredClone(s);
    rest.restToday = true;
    rest.phase = 'afternoon';
    const d = normalizeDraft(rest, working);
    expect(Object.values(d.tasks).every((t) => t === 'rest')).toBe(true);
    expect(validatePlan(rest, toPlan(rest, d)).filter((w) => w.level === 'error')).toEqual([]);
    const after = structuredClone(s);
    after.day = 2;
    expect(normalizeDraft(after, d).tasks).toEqual(working.tasks);
  });

  it('keeps a tap as a standing order only for a fit man on a working day', () => {
    const s = newGame({ seed: 9, mode: 'historical' });
    s.pending = [];
    const d = normalizeDraft(s, null);
    const burne = s.men.find((m) => m.id === 'burne')!;
    const t = tapTask(s, d, burne);
    expect(t.tasks.burne).toBe('camp');
    expect(t.roster.burne).toBe('camp');
    burne.condition = 'tooIll';
    const sick = normalizeDraft(s, t);
    const u = tapTask(s, sick, burne);
    expect(['camp', 'grass', 'rest']).toContain(u.tasks.burne);
    expect(u.roster.burne).toBe('camp');
  });

  it('offers a cache that lets weakened horses move on', () => {
    const s = newGame({ seed: 9, mode: 'historical' });
    s.pending = [];
    // Two weak horses carry 150 lb each at most; two exhausted ones carry nothing.
    s.horses.forEach((h, i) => (h.condition = i < 2 ? 40 : 10));
    expect(overload(s)).toBeGreaterThan(0);
    const cache = excessCache(s)!;
    const d = { ...normalizeDraft(s, null), cache };
    const plan = toPlan(s, d);
    expect(loadAfterCache(s, plan)).toBeLessThanOrEqual(capacity(s, true) + 1e-6);
    expect(loadLb(s.stores)).toBeGreaterThan(capacity(s, true));
    expect(validatePlan(s, { ...plan, advance: true }).some((w) => w.code === 'load')).toBe(false);
    // Food goes only once the tea, blankets and spare shoes are all left behind.
    expect(cache.flour).toBeGreaterThan(0);
    expect([cache.tea, cache.blankets, cache.shoes]).toEqual([s.stores.tea, s.stores.blankets, s.stores.shoes]);
    for (const h of s.horses) h.condition = 10;
    expect(excessCache(s)).toBeNull();
  });
});
