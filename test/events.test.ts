import { describe, expect, it } from 'vitest';
import { T, chooseEvent, eventCard, hoursAvailable, newGame, resolveHalfDay } from '../src/engine/index';
import { slot } from '../src/engine/party';
import { lineGame } from './helpers';

describe('event cards', () => {
  it('shows two or three choices, each with its effect, before the player picks', () => {
    const ids = ['dew', 'horseFall', 'horseExhausted', 'dryCamp', 'chill', 'bowel', 'hunterStrays', 'dogsRaceOff', 'brood', 'refusal'] as const;
    const s = newGame({ seed: 2, mode: 'historical' });
    for (const id of ids) {
      s.pending = [{ id, member: 'burne', horse: 1 }];
      const card = eventCard(s)!;
      expect(card.id).toBe(id);
      expect(card.choices.length).toBeGreaterThanOrEqual(2);
      expect(card.choices.length).toBeLessThanOrEqual(3);
      for (const c of card.choices) expect(c.effect.length).toBeGreaterThan(5);
    }
  });

  it('waiting out heavy dew starts work at 10:00', () => {
    const s = lineGame('scrub', 10, { marked: 10 });
    s.pending = [{ id: 'dew' }];
    const t = chooseEvent(s, 'wait');
    expect(hoursAvailable(t)).toBe(T.time.halfHours - T.time.dewDelayHours);
    const p = chooseEvent(s, 'push');
    expect(hoursAvailable(p)).toBe(T.time.halfHours);
    expect(p.wear).toBe(T.wear.dewPush);
  });

  it('will not send men down a gully that is not there', () => {
    const s = lineGame('scrub', 10);
    s.phase = 'evening';
    s.pending = [{ id: 'dryCamp' }];
    const card = eventCard(s)!;
    expect(card.choices.find((c) => c.id === 'fetch')!.disabled).toBeTruthy();
    expect(() => chooseEvent(s, 'fetch')).toThrow(/No gully/);
  });

  it('a missing hunter who is waited for is back next morning or the day after', () => {
    const s = lineGame('openForest', 10);
    const burne = s.men.find((m) => m.id === 'burne')!;
    burne.awayUntil = slot(s.day, 'afternoon') + 1; // strayed during the afternoon half
    s.phase = 'evening';
    s.pending = [{ id: 'hunterStrays', member: 'burne' }];
    const t = chooseEvent(s, 'wait');
    const back = t.men.find((m) => m.id === 'burne')!.awayUntil;
    expect([slot(s.day + 1, 'morning'), slot(s.day + 2, 'morning')]).toContain(back);
  });

  it('searching for him costs two men the next half-day', () => {
    const s = lineGame('openForest', 10);
    const burne = s.men.find((m) => m.id === 'burne')!;
    burne.awayUntil = slot(s.day, 'morning') + 1; // strayed during the morning half
    s.pending = [{ id: 'hunterStrays', member: 'burne' }];
    const t = chooseEvent(s, 'search');
    t.phase = 'afternoon';
    const busy = t.men.filter((m) => m.busyUntil > slot(t.day, 'afternoon'));
    expect(busy).toHaveLength(2);
    expect(t.men.find((m) => m.id === 'burne')!.awayUntil).toBe(slot(t.day, 'night'));
    const r = resolveHalfDay(t, { target: 's:A', tasks: Object.fromEntries(busy.map((m) => [m.id, 'cut'])) });
    expect(r.state.map.segments['s:A']!.clearedMiles).toBe(0);
  });

  it('a chilled man kept at camp cannot be sent to work', () => {
    const s = lineGame('scrub', 10, { marked: 10 });
    s.men.find((m) => m.id === 'fairs')!.condition = 'chill';
    s.pending = [{ id: 'chill', member: 'fairs' }];
    const t = chooseEvent(s, 'keep');
    expect(() => resolveHalfDay(t, { target: 's:A', tasks: { fairs: 'cut' } })).toThrow(/kept at camp/);
  });
});

describe('the spent-horse card', () => {
  it('warns when resting here cannot help the horse, and not when it can', () => {
    const s = lineGame('scrub', 2);
    s.pending = [{ id: 'horseExhausted', horse: 1 }];
    s.map.nodes[s.camp]!.grass = 'none';
    const dry = eventCard(s)!.choices.find((c) => c.id === 'rest')!;
    expect(dry.warn).toBe(true);
    expect(dry.effect).toMatch(/will not recover/);
    s.map.nodes[s.camp]!.grass = 'good';
    s.map.nodes[s.camp]!.water = 'stream';
    expect(eventCard(s)!.choices.find((c) => c.id === 'rest')!.warn).toBeUndefined();
  });
});
