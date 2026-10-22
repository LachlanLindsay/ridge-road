import { describe, expect, it } from 'vitest';
import {
  T,
  chooseEvent,
  dailyFood,
  endDay,
  foodLb,
  fromSave,
  loadLb,
  newGame,
  replay,
  resolveHalfDay,
  toSave,
  validatePlan,
  type GameState,
} from '../src/engine/index';
import { BOTS } from '../sim/bots';
import { playRun } from '../sim/run';
import { lineGame } from './helpers';

describe('a new expedition', () => {
  it('starts on 11 May 1813 at the ford with the Historical loadout', () => {
    const s = newGame({ seed: 1, mode: 'historical' });
    expect(s.day).toBe(1);
    expect(s.phase).toBe('morning');
    expect(s.camp).toBe('ford');
    expect(s.men).toHaveLength(7);
    expect(s.horses).toHaveLength(4);
    expect(s.dogs).toBe(5);
    expect(s.morale).toBe(70);
    expect(Math.round(loadLb(s.stores))).toBe(538);
    expect(foodLb(s.stores)).toBe(400);
  });

  it('eats 16.5 lb a day at full rations, so 400 lb lasts 24 days', () => {
    const s = newGame({ seed: 1, mode: 'historical' });
    expect(dailyFood(s, 'full')).toBeCloseTo(16.5, 9);
    expect(Math.floor(400 / dailyFood(s, 'full'))).toBe(24);
  });

  it('lets the player name the two unidentified servants', () => {
    const s = newGame({ seed: 1, mode: 'easy', names: { servant3: 'Tom', servant4: 'Will' } });
    expect(s.men.find((m) => m.id === 'servant3')!.name).toBe('Tom');
    expect(s.men.find((m) => m.id === 'servant4')!.name).toBe('Will');
  });
});

describe('validatePlan', () => {
  it('warns when nobody minds camp, as the plan sheet does', () => {
    const s = lineGame('scrub', 10, { marked: 10 });
    const w = validatePlan(s, {
      target: 's:A',
      tasks: { blaxland: 'cut', lawson: 'cut', wentworth: 'cut', burne: 'cut', fairs: 'cut', servant3: 'cut', servant4: 'cut' },
    });
    expect(w.find((x) => x.code === 'camp')?.text).toBe('Nobody minding camp: horses may stray.');
  });

  it('warns about a distant work front in hours of walking', () => {
    const s = lineGame('scrub', 10, { marked: 10, cleared: 3.1 });
    const w = validatePlan(s, { target: 's:A', tasks: { burne: 'cut' } });
    expect(w.find((x) => x.code === 'walk')?.text).toBe('Work front is 3.1 miles away: 2.5 hours of walking.');
  });

  it('refuses work from a man too ill, and a camp move the horses cannot make', () => {
    const s = lineGame('scrub', 10, { marked: 10 });
    s.men.find((m) => m.id === 'burne')!.condition = 'tooIll';
    const errs = validatePlan(s, { target: 's:A', moveTo: 'A', tasks: { burne: 'cut' } }).filter((x) => x.level === 'error');
    expect(errs.map((x) => x.code).sort()).toEqual(['move', 'unavailable']);
    expect(() => resolveHalfDay(s, { target: 's:A', tasks: { burne: 'cut' } })).toThrow(/too ill/);
  });

  it('says rushy grass is not worth cutting, and the report says nothing was cut', () => {
    const s = lineGame('scrub', 10, { marked: 10 });
    const plan = { target: 's:A', tasks: { servant4: 'grass' as const } };
    expect(validatePlan(s, plan).find((x) => x.code === 'grass')?.text).toBe('Rushy grass is not worth cutting: men on Grass only mind camp.');
    const r = resolveHalfDay(s, plan);
    expect(r.state.stores.grass).toBe(s.stores.grass);
    expect(r.state.today.log).toContain('Only rushy grass at this camp: nothing worth cutting to carry.');
  });

  it('needs a target for scouts and cutters', () => {
    const s = lineGame('scrub', 10);
    expect(validatePlan(s, { tasks: { lawson: 'scout' } }).some((x) => x.code === 'target')).toBe(true);
  });

  it('keeps a rest day free of work', () => {
    const s = lineGame('scrub', 10, { marked: 10 });
    s.restToday = true;
    expect(validatePlan(s, { target: 's:A', tasks: { burne: 'cut' } }).some((x) => x.code === 'rest')).toBe(true);
  });
});

describe('the daily loop', () => {
  it('runs morning, afternoon and evening, then a new dawn', () => {
    let s = lineGame('scrub', 10, { marked: 10 });
    s = resolveHalfDay(s, { target: 's:A', tasks: { servant3: 'cut' } }).state;
    expect(s.phase).toBe('afternoon');
    s = resolveHalfDay(s, { target: 's:A', tasks: { servant3: 'cut' } }).state;
    expect(s.phase).toBe('evening');
    while (s.pending.length) s = chooseEvent(s, eventDefault(s));
    const r = endDay(s, { rations: 'full' });
    expect(r.journal.date).toBe('1813-05-11');
    expect(r.state.day).toBe(2);
    expect(r.state.phase).toBe('morning');
  });

  it('fires at most one choice event per half-day and queues the rest for the evening', () => {
    for (let seed = 1; seed <= 25; seed++) {
      let s = newGame({ seed, mode: 'historical' });
      const bot = BOTS.historical!;
      while (s.phase !== 'over' && s.day < 40) {
        if (s.pending.length) {
          s = chooseEvent(s, bot.choose(s));
          continue;
        }
        if (s.phase === 'evening') {
          s = endDay(s, bot.evening(s)).state;
          continue;
        }
        const before = s.pending.length;
        const r = resolveHalfDay(s, bot.plan(s));
        if (r.state.phase !== 'evening') expect(r.state.pending.length - before).toBeLessThanOrEqual(1);
        s = r.state;
      }
    }
  });

  it('turns home when the men refuse and the player gives in', () => {
    const s = newGame({ seed: 3, mode: 'historical' });
    s.phase = 'evening';
    s.pending = [{ id: 'refusal' }];
    const t = chooseEvent(s, 'turnBack');
    expect(t.leg).toBe('home');
    expect(t.turnReason).toBe('refusal');
  });
});

describe('determinism, saves and replay', () => {
  it('gives the same end state from the same seed and actions', () => {
    const a = playRun(42, BOTS.historical!).state;
    const b = playRun(42, BOTS.historical!).state;
    expect(toSave(a)).toBe(toSave(b));
    expect(toSave(replay(a.opts, a.actions))).toBe(toSave(a));
  });

  it('resumes from a saved JSON mid-run exactly as if never saved', () => {
    const full = playRun(7, BOTS.historical!).state;
    const half = Math.floor(full.actions.length / 2);
    const mid = replay(full.opts, full.actions.slice(0, half));
    const reloaded = fromSave(toSave(mid));
    let s: GameState = reloaded;
    for (const a of full.actions.slice(half)) {
      s = a.t === 'half' ? resolveHalfDay(s, a.plan).state : a.t === 'choose' ? chooseEvent(s, a.choice) : endDay(s, a.orders).state;
    }
    expect(toSave(s)).toBe(toSave(full));
  });

  it('rejects a file that is not a save', () => {
    expect(() => fromSave('{"hello":1}')).toThrow(/Not a Ridge Road save/);
  });
});

describe('the end: return leg and score', () => {
  it('scores a crossing with a breakdown that sums to the total', () => {
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const o = playRun(seed, BOTS.historical!).state.outcome!;
      if (o.result !== 'crossed') continue;
      expect(o.breakdown.reduce((s, l) => s + l.points, 0)).toBe(o.score);
      expect(['Trailblazer', 'Explorer', 'Crossed']).toContain(o.title);
      return;
    }
    throw new Error('no crossing in eight seeds');
  });

  it('brings a well-marked party home in a third of the outbound days or less', () => {
    let checked = 0;
    for (let seed = 1; seed <= 12; seed++) {
      const s = playRun(seed, BOTS.historical!).state;
      if (s.outcome?.result !== 'crossed') continue;
      const home = s.outcome.dayHome - s.outcome.goalDay!;
      expect(home).toBeLessThanOrEqual(Math.ceil(s.outcome.goalDay! / 3));
      checked += 1;
    }
    expect(checked).toBeGreaterThan(5);
  });

  it('shows a repulsed run its furthest straight-line miles instead of a score', () => {
    const s = playRun(5, BOTS.naive!).state;
    expect(s.outcome!.result).toBe('repulsed');
    expect(s.outcome!.score).toBeNull();
    expect(s.outcome!.furthestMiles).toBeGreaterThan(0);
  });

  it('crosses unblazed ground at 1 mph on the way home', () => {
    const s = lineGame('openForest', 2);
    s.map.segments['s:A']!.crossed = true;
    s.map.nodes.A!.reached = true;
    s.camp = 'A';
    s.leg = 'home';
    s.goalDay = 1;
    const r = resolveHalfDay(s, { tasks: {} });
    // Two unblazed miles take at least two hours; blazed they would take one.
    expect(r.state.camp).toBe('ford');
    expect(r.log.some((l) => l.text.includes('Homeward 2 mi'))).toBe(true);
    const marked = lineGame('openForest', 2, { marked: 2, cleared: 2 });
    marked.map.nodes.A!.reached = true;
    marked.camp = 'A';
    marked.leg = 'home';
    marked.goalDay = 1;
    const mr = resolveHalfDay(marked, { tasks: {} });
    expect(mr.state.camp).toBe('ford');
    expect(mr.state.stats.manHours['home:walk']!).toBeLessThan(r.state.stats.manHours['home:walk']!);
  });
});

function eventDefault(s: GameState) {
  return BOTS.historical!.choose(s);
}

export { T };

describe('cache report lines', () => {
  it('name the goods in plain words and say why they were left', async () => {
    const { cacheItems, cacheWeight } = await import('../src/engine/stores');
    const s = newGame({ seed: 3, mode: 'historical' });
    const lines: string[] = [];
    cacheItems(s, { tea: 17, saltMeat: 8 }, lines);
    cacheWeight(s, 5, lines, 'Loads lightened after the fall, left here for the way home');
    expect(lines[0]).toBe('Left at camp for the way home: 8 lb salt meat, 17 lb tea and sugar.');
    expect(lines[1]).toMatch(/^Loads lightened after the fall, left here for the way home: .+ lb .+\.$/);
    expect(lines[1]).not.toMatch(/saltMeat|\d tea\b|\d grass\b/);
  });
});
