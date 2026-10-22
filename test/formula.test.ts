import { describe, expect, it } from 'vitest';
import { T, resolveHalfDay, validatePlan } from '../src/engine/index';
import { lineGame } from './helpers';

const e = (stamina: number) => T.efficiency.base + T.efficiency.perStamina * stamina;
const W = T.time.walkMph;

/** The spec's formula: p = k(4 − h_move − h_dew − 2m/2.5) / (1 + k/2.5). */
const spec = (k: number, m: number, hMove = 0, hDew = 0) => (k * (T.time.halfHours - hMove - hDew - (2 * m) / W)) / (1 + k / W);

describe('miles cleared in a half-day', () => {
  // Five cutters at stamina 70 (e = 0.85): the two best tools are axes, then axes, then hatchets.
  // All have equal efficiency, so tools go in party order: Blaxland, Lawson, Wentworth axes; Burne, Fairs hatchets.
  const tools = T.efficiency.tools;
  const toolSum = tools.axe + tools.axe + tools.axe * T.efficiency.wentworthCut + tools.hatchet + tools.hatchet;
  const plan = {
    target: 's:A',
    tasks: { blaxland: 'cut', lawson: 'cut', wentworth: 'cut', burne: 'cut', fairs: 'cut', servant3: 'camp', servant4: 'camp' } as const,
  };

  it('matches the formula with the camp at the work front', () => {
    const s = lineGame('scrub', 10, { marked: 10 });
    const k = T.terrain.scrub.clearMiPerWorkerHour * e(70) * toolSum;
    const r = resolveHalfDay(s, plan);
    expect(r.state.map.segments['s:A']!.clearedMiles).toBeCloseTo(spec(k, 0), 9);
  });

  it('pays the walk to a work front a mile out, both ways', () => {
    const s = lineGame('thick', 10, { marked: 10, cleared: 1 });
    const k = T.terrain.thick.clearMiPerWorkerHour * e(70) * toolSum;
    const r = resolveHalfDay(s, plan);
    expect(r.state.map.segments['s:A']!.clearedMiles - 1).toBeCloseTo(spec(k, 1), 9);
  });

  it('loses the dew hour in the morning', () => {
    const s = lineGame('thorny', 10, { marked: 10 });
    s.today.dewStart = T.time.dewDelayHours;
    const k = T.terrain.thorny.clearMiPerWorkerHour * e(70) * toolSum;
    const r = resolveHalfDay(s, plan);
    expect(r.state.map.segments['s:A']!.clearedMiles).toBeCloseTo(spec(k, 0, 0, T.time.dewDelayHours), 9);
  });

  it('cannot cut past marked ground', () => {
    const s = lineGame('scrub', 10, { marked: 0.4 });
    const r = resolveHalfDay(s, plan);
    expect(r.state.map.segments['s:A']!.clearedMiles).toBeCloseTo(0.4, 9);
  });

  it('works rain to 80%', () => {
    const s = lineGame('scrub', 10, { marked: 10 });
    s.weather = 'rain';
    const k = T.terrain.scrub.clearMiPerWorkerHour * e(70) * toolSum * T.efficiency.rain;
    const r = resolveHalfDay(s, plan);
    expect(r.state.map.segments['s:A']!.clearedMiles).toBeCloseTo(spec(k, 0), 9);
  });
});

describe('miles scouted in a half-day', () => {
  it('covers speed × mean e × team bonus, after the walk out and with the walk back', () => {
    const s = lineGame('scrub', 10, { marked: 1 });
    const plan = { target: 's:A', tasks: { lawson: 'scout', blaxland: 'scout', servant3: 'camp' } as const };
    const v = T.terrain.scrub.scoutMph * e(70) * (1 + T.scouting.extraMemberBonus);
    const m = 1;
    const expected = (v * (T.time.halfHours - (2 * m) / W)) / (1 + v / W);
    const r = resolveHalfDay(s, plan);
    expect(r.state.map.segments['s:A']!.markedMiles - 1).toBeCloseTo(expected, 9);
  });

  it('needs a leader on every scouting team', () => {
    const s = lineGame('scrub', 10);
    const errs = validatePlan(s, { target: 's:A', tasks: { burne: 'scout', fairs: 'scout' } }).filter((w) => w.level === 'error');
    expect(errs.map((w) => w.code)).toContain('leader');
  });

  it('is slowed to 60% by cloud', () => {
    const s = lineGame('heath', 30);
    s.weather = 'cloud';
    const plan = { target: 's:A', tasks: { lawson: 'scout', servant3: 'camp' } as const };
    const v = T.terrain.heath.scoutMph * e(70) * T.scouting.cloud;
    const expected = (v * T.time.halfHours) / (1 + v / W);
    const r = resolveHalfDay(s, plan);
    expect(r.state.map.segments['s:A']!.markedMiles).toBeCloseTo(expected, 9);
  });
});

describe('stamina and wear', () => {
  it('charges cutting at −7 an hour and walking at −3', () => {
    const s = lineGame('scrub', 10, { marked: 10 });
    const r = resolveHalfDay(s, { target: 's:A', tasks: { servant3: 'cut', servant4: 'camp' } });
    const cut = r.state.map.segments['s:A']!.clearedMiles;
    const k = T.terrain.scrub.clearMiPerWorkerHour * e(70) * T.efficiency.tools.axe;
    const cutHours = cut / k;
    const walkHours = cut / W;
    const expected = 70 + cutHours * T.stamina.perHour.cut + walkHours * T.stamina.perHour.walk;
    expect(r.state.men.find((m) => m.id === 'servant3')!.stamina).toBeCloseTo(expected, 9);
    expect(r.state.men.find((m) => m.id === 'servant4')!.stamina).toBeCloseTo(70 + 4 * T.stamina.perHour.camp, 9);
  });

  it('wears the party by the hour of work in each terrain', () => {
    const s = lineGame('thorny', 10, { marked: 10 });
    const r = resolveHalfDay(s, { target: 's:A', tasks: { servant3: 'cut', servant4: 'camp' } });
    const k = T.terrain.thorny.clearMiPerWorkerHour * e(70) * T.efficiency.tools.axe;
    const cutHours = r.state.map.segments['s:A']!.clearedMiles / k;
    expect(r.state.wear).toBeCloseTo(cutHours * T.terrain.thorny.wearPerHour, 9);
  });
});
