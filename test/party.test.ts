import { describe, expect, it } from 'vitest';
import { T, chooseEvent, dailyFood, dogOdds, endDay, newGame, partyOf, resolveHalfDay, validatePlan, type ChoiceId, type EventId, type GameState } from '../src/engine/index';
import { lawsonsPick } from '../src/engine/index';
import { forkPending, normalizeDraft, toPlan, withTarget } from '../src/ui/draft';

/** A safe answer to every event card. */
const ANSWER: Record<EventId, ChoiceId> = {
  dew: 'wait',
  horseFall: 'reload',
  horseExhausted: 'cache',
  dryCamp: 'dry',
  chill: 'keep',
  bowel: 'push',
  hunterStrays: 'wait',
  dogsRaceOff: 'settle',
  brood: 'pass',
  refusal: 'rest',
};

/** Play a few days on the plan sheet's defaults, checking every plan is valid. */
function playDays(s: GameState, days: number): GameState {
  let draft = null;
  while (s.phase !== 'over' && s.day <= days) {
    if (s.pending.length) s = chooseEvent(s, ANSWER[s.pending[0]!.id]);
    else if (s.phase === 'evening') s = endDay(s, { rations: 'full' }).state;
    else {
      draft = normalizeDraft(s, draft);
      // The fork card: let Lawson choose.
      if (forkPending(s, draft)) draft = withTarget(s, draft, lawsonsPick(s, draft.fork!)!);
      const plan = toPlan(s, draft);
      expect(validatePlan(s, plan).filter((w) => w.level === 'error')).toEqual([]);
      s = resolveHalfDay(s, plan).state;
    }
  }
  return s;
}

describe('choosing the party', () => {
  it('defaults to the 1813 party', () => {
    expect(partyOf()).toEqual({ servants: 4, horses: 4, dogs: 5 });
    const s = newGame({ seed: 1, mode: 'historical' });
    expect(s.men.map((m) => m.id)).toEqual(['blaxland', 'lawson', 'wentworth', 'burne', 'fairs', 'servant3', 'servant4']);
    expect(s.horses).toHaveLength(4);
    expect(s.dogs).toBe(5);
  });

  it('keeps the three leaders and takes servants in order, Burne first', () => {
    const one = newGame({ seed: 1, mode: 'historical', party: { servants: 1 } });
    expect(one.men.map((m) => m.id)).toEqual(['blaxland', 'lawson', 'wentworth', 'burne']);
    const six = newGame({ seed: 1, mode: 'historical', party: { servants: 6, horses: 6, dogs: 8 } });
    expect(six.men).toHaveLength(9);
    expect(six.horses.map((h) => h.name)).toEqual(['Bay', 'Grey', 'Chestnut', 'Black', 'Dun', 'Roan']);
    expect(six.dogs).toBe(8);
  });

  it('holds choices inside the limits', () => {
    expect(partyOf({ servants: 12, horses: 0, dogs: -3 })).toEqual({ servants: T.party.servantsMax, horses: T.party.horsesMin, dogs: 0 });
  });

  it('feeds every man and dog it brings', () => {
    const small = newGame({ seed: 1, mode: 'historical', party: { servants: 0, dogs: 0 } });
    const big = newGame({ seed: 1, mode: 'historical', party: { servants: 6, dogs: 8 } });
    expect(dailyFood(small, 'full')).toBe(3 * 2);
    expect(dailyFood(big, 'full')).toBe(9 * 2 + 8 * T.rations.dogMeat);
  });

  it('plays with a party of any size without a broken plan', () => {
    for (const party of [{ servants: 0, horses: 2, dogs: 0 }, { servants: 6, horses: 6, dogs: 8 }, { servants: 2, horses: 3, dogs: 2 }]) {
      const s = playDays(newGame({ seed: 4, mode: 'historical', party }), 6);
      expect(s.day).toBeGreaterThan(1);
    }
  });

  it('gives a bigger pack better odds of a kill, and five dogs the tuned odds exactly', () => {
    const p = T.hunting.dogs.good;
    expect(dogOdds(p, 5)).toBe(p);
    expect(dogOdds(p, 0)).toBe(0);
    expect(dogOdds(p, 8)).toBeGreaterThan(p);
    expect(dogOdds(p, 2)).toBeLessThan(p);
  });
});
