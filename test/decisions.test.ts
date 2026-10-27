// The three decisions put to the player (the fork, Sunday, the dew), and what rest and wear now do.
import { describe, expect, it } from 'vitest';
import {
  T,
  canAdvance,
  chooseEvent,
  endDay,
  eventCard,
  forkAhead,
  lawsonsPick,
  newGame,
  resolveHalfDay,
  validatePlan,
  workFactor,
  type GameState,
  type MapNode,
  type Segment,
} from '../src/engine/index';
import { campDefaults, sundayDefault, sundayQuestion } from '../src/ui/camp';
import { excessCache, forkPending, normalizeDraft, toPlan, withTarget } from '../src/ui/draft';
import { BOTS } from '../sim/bots';
import { playRun } from '../sim/run';
import { lineGame, tasks } from './helpers';

/** The ford, a reached point A two miles on, and two unexplored ridges from A. */
function forkGame(): GameState {
  const s = lineGame('openForest', 2, { marked: 2, cleared: 2 });
  const map = s.map;
  map.nodes.A!.reached = true;
  map.nodes.A!.known = true;
  map.nodes.A!.childSegs = ['s:B', 's:C'];
  const node = (id: string, x: number, y: number): MapNode => ({
    id,
    x,
    y,
    region: 3,
    water: 'swamp',
    grass: 'rushy',
    parentSeg: `s:${id}`,
    childSegs: [],
    routeMiles: 4,
    known: false,
    reached: false,
  });
  const seg = (id: string, isRoute: boolean): Segment => ({
    id: `s:${id}`,
    a: 'A',
    b: id,
    miles: 2,
    terrain: 'scrub',
    region: 3,
    state: 'revealed',
    visible: true,
    farKnown: false,
    markedMiles: 0,
    clearedMiles: 0,
    isRoute,
  });
  map.nodes.B = node('B', -4, 1.5);
  map.nodes.C = node('C', -3, -2);
  map.segments['s:B'] = seg('B', true);
  map.segments['s:C'] = seg('C', false);
  map.goal = 'B';
  return s;
}

describe('the fork card', () => {
  it('leaves the target empty at a fork, so the sheet never picks the ridge', () => {
    const s = forkGame();
    expect(forkAhead(s, 's:A')).toBe('A');
    const d = normalizeDraft(s, null);
    expect(d.fork).toBe('A');
    expect(d.target).toBeNull();
    expect(forkPending(s, d)).toBe(true);
    // Go stays shut until a ridge is chosen.
    expect(validatePlan(s, toPlan(s, d)).some((w) => w.code === 'target')).toBe(true);
    const chosen = withTarget(s, d, 's:C');
    expect(chosen.target).toBe('s:C');
    expect(chosen.fork).toBeNull();
    // Within the half the choice stands.
    expect(normalizeDraft(s, chosen).target).toBe('s:C');
  });

  it('picks a lone ridge on its own: there is nothing to decide', () => {
    const s = forkGame();
    s.map.segments['s:C']!.deadEnd = true;
    expect(forkAhead(s, 's:A')).toBeNull();
    expect(normalizeDraft(s, null).target).toBe('s:B');
  });

  it('lets Lawson take the one ridge he reads as running on', () => {
    const s = forkGame();
    s.map.segments['s:B']!.hint = 'fallsAway';
    s.map.segments['s:C']!.hint = 'runsOn';
    expect(lawsonsPick(s, 'A')).toBe('s:C');
  });

  it('keeps the question for the next working half when a rest day comes first', () => {
    const s = forkGame();
    s.restToday = true;
    const d = normalizeDraft(s, null);
    expect(d.fork).toBe('A');
    expect(forkPending(s, d)).toBe(false);
    const work = structuredClone(s);
    work.restToday = false;
    work.day = 2;
    expect(normalizeDraft(work, d).fork).toBe('A');
  });
});

describe('Sunday', () => {
  function saturday(mode: 'easy' | 'historical'): GameState {
    const s = newGame({ seed: 4, mode });
    s.day = 5; // 15 May 1813, a Saturday
    s.phase = 'evening';
    s.pending = [];
    return s;
  }

  it('asks on Saturday night on the way out', () => {
    const s = saturday('easy');
    expect(sundayQuestion(s)).toBe(true);
    s.day = 6;
    expect(sundayQuestion(s)).toBe(false);
  });

  it('is ticked on Easy at a camp with water for the horses, and nowhere else', () => {
    const easy = saturday('easy');
    easy.map.nodes[easy.camp]!.water = 'swamp';
    expect(sundayDefault(easy)).toBe(true);
    expect(campDefaults(easy).restTomorrow).toBe(true);
    easy.map.nodes[easy.camp]!.water = 'none';
    expect(sundayDefault(easy)).toBe(false);
    const hist = saturday('historical');
    hist.map.nodes[hist.camp]!.water = 'swamp';
    expect(sundayDefault(hist)).toBe(false);
    expect(campDefaults(hist).restTomorrow).toBeUndefined();
  });
});

describe('the dew', () => {
  function dewMorning(): GameState {
    for (let seed = 1; seed < 200; seed++) {
      const s = newGame({ seed, mode: 'easy' });
      if (s.pending[0]?.id === 'dew') return s;
    }
    throw new Error('no dewy first morning');
  }

  it('states the chill odds each way on the card', () => {
    const s = dewMorning();
    const card = eventCard(s)!;
    const dry = Math.round(T.illness.chill.base * 100);
    const wet = Math.round((T.illness.chill.base + T.illness.chill.dewPush) * 100);
    expect(card.choices[0]!.id).toBe('wait');
    expect(card.choices[0]!.effect).toContain(`${dry}%`);
    expect(card.choices[1]!.effect).toContain(`${wet}% chance of a chill tonight, not ${dry}%`);
  });

  it('says in the report what the men did', () => {
    const s = dewMorning();
    expect(chooseEvent(s, 'wait').today.log.at(-1)).toMatch(/wait an hour/);
    const pushed = chooseEvent(s, 'push');
    expect(pushed.today.log.at(-1)).toMatch(/push into the wet brush/);
    expect(pushed.wear).toBe(T.wear.dewPush);
  });

  it('gives a chill to men who worked wet more often than to men who waited', () => {
    let wet = 0;
    let dry = 0;
    for (let seed = 1; seed <= 300; seed++) {
      for (const pushed of [true, false]) {
        const s = lineGame('scrub', 4, { seed, marked: 4 });
        s.today.pushedDew = pushed;
        let m = resolveHalfDay(s, { tasks: tasks({ lawson: 'scout', wentworth: 'cut', burne: 'cut', fairs: 'cut', servant3: 'cut' }), target: 's:A' }).state;
        m = resolveHalfDay(m, { tasks: tasks({ lawson: 'camp', wentworth: 'camp' }) }).state;
        m.pending = [];
        const n = endDay(m, { rations: 'full' }).state.men.filter((x) => x.condition === 'chill').length;
        if (pushed) wet += n;
        else dry += n;
      }
    }
    expect(wet).toBeGreaterThan(2 * dry);
  });
});

describe('a day of rest', () => {
  function restDay(water: 'swamp' | 'none'): GameState {
    const s = lineGame('scrub', 4);
    s.map.nodes.ford!.water = water;
    s.wear = 40;
    for (const h of s.horses) h.condition = 50;
    const all = tasks({ blaxland: 'rest', lawson: 'rest', wentworth: 'rest', burne: 'rest', fairs: 'rest', servant3: 'rest', servant4: 'rest' });
    let m = resolveHalfDay(s, { tasks: all }).state;
    m = resolveHalfDay(m, { tasks: all }).state;
    m.pending = [];
    return endDay(m, { rations: 'full' }).state;
  }

  it('mends clothes and boots', () => {
    expect(restDay('swamp').wear).toBe(40 - T.wear.restMend);
  });

  it('lets the horses graze, where there is water', () => {
    const N = T.horses.night;
    expect(restDay('swamp').horses[0]!.condition).toBe(50 + N.rushy + N.restDay);
    expect(restDay('none').horses[0]!.condition).toBe(50 + N.rushy + N.noWater);
  });

  it('helps a man who is too ill: lying up mends him faster than minding camp', () => {
    const rate = (task: 'rest' | 'camp') => {
      let mended = 0;
      for (let seed = 1; seed <= 400; seed++) {
        const s = lineGame('scrub', 4, { seed });
        const burne = s.men.find((x) => x.id === 'burne')!;
        burne.condition = 'tooIll';
        const t = tasks({ burne: task });
        let m = resolveHalfDay(s, { tasks: t }).state;
        m = resolveHalfDay(m, { tasks: t }).state;
        m.pending = [];
        if (endDay(m, { rations: 'full' }).state.men.find((x) => x.id === 'burne')!.condition !== 'tooIll') mended += 1;
      }
      return mended / 400;
    };
    expect(rate('rest')).toBeGreaterThan(T.illness.tooIll.toChillRested - 0.08);
    expect(rate('camp')).toBeLessThan(T.illness.tooIll.toChill + 0.08);
  });
});

describe('wear', () => {
  it('slows scouting and cutting past the threshold', () => {
    const s = lineGame('scrub', 4);
    const m = s.men[0]!;
    const fresh = workFactor(s, m);
    s.wear = T.wear.slowOver;
    expect(workFactor(s, m)).toBeCloseTo(fresh);
    s.wear = T.wear.slowOver + 20;
    expect(workFactor(s, m)).toBeCloseTo(fresh * (1 - 20 * T.wear.slowPerPoint));
  });
});

describe('plans the sheet can always carry out', () => {
  it('never pushes on without a leader fit to blaze', () => {
    const s = lineGame('openForest', 4);
    expect(canAdvance(s, 'ford', 's:A')).toBe(true);
    for (const m of s.men) if (m.leader) m.condition = 'tooIll';
    expect(canAdvance(s, 'ford', 's:A')).toBe(false);
  });

  it('offers no cache that would leave the horses still overloaded', () => {
    const s = lineGame('scrub', 4);
    for (const h of s.horses) h.condition = 26;
    for (const k of ['flour', 'saltMeat', 'tea', 'grass', 'blankets', 'shoes', 'shots'] as const) s.stores[k] = 0;
    s.stores.axes = 30;
    expect(excessCache(s)).toBeNull();
  });

  it('plays whole expeditions on the defaults without a plan the sheet would refuse', () => {
    for (const seed of [7, 11, 23]) {
      const { result } = playRun(seed, BOTS.defaults!, { mode: 'easy' });
      expect(result.result).not.toBe('stuck');
    }
  });
});
