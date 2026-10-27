// The UI-defaults bot: a player who trusts the sheet. It plays through the plan sheet's own draft
// (src/ui/draft.ts), takes every suggestion the sheet offers, answers the fork card and the Sunday
// question with their defaults, and picks the top choice on every other card.
//
// To see what each of the three decisions is worth, any one can be played the other way:
//   RR_DEW=push|wait          every misty morning (default: the card's top choice, wait)
//   RR_SUNDAY=rest|work       every Saturday night (default: the sheet's tick, rest on Easy at water)
//   RR_FORK=against           at every fork, the branch Lawson would not take (default: Lawson's pick)
import { eventCard, forkBranches, horseReach, horseWater, lawsonsPick, suggestCampMove, type ChoiceId, type EveningOrders, type GameState, type HalfDayPlan } from '../src/engine/index';
import { campDefaults, sundayQuestion } from '../src/ui/camp';
import { excessCache, forkPending, grassOffer, huntOffer, normalizeDraft, overload, toPlan, withTarget, type Draft } from '../src/ui/draft';
import type { Bot } from './bots';

export function defaultsBot(): Bot {
  let draft: Draft | null = null;
  return {
    name: 'defaults',
    reset() {
      draft = null;
    },
    plan(s: GameState): HalfDayPlan {
      let d = normalizeDraft(s, draft);
      // The fork card: "Let Lawson choose" is its default.
      if (forkPending(s, d)) {
        let pick = lawsonsPick(s, d.fork!);
        if (process.env.RR_FORK === 'against') pick = forkBranches(s, d.fork!).find((b) => b.id !== pick)?.id ?? pick;
        if (pick) d = withTarget(s, d, pick);
      }
      for (const offer of [grassOffer(s, d), huntOffer(s, d)]) if (offer) d = offer.apply(d);
      if (s.leg === 'out' && !s.restToday) {
        if (overload(s) > 1e-6 && !d.cache) {
          const leave = excessCache(s);
          if (leave) d = { ...d, cache: leave };
        }
        if (!d.moveTo && d.target && (overload(s) <= 1e-6 || d.cache)) {
          const sug = suggestCampMove(s, d.target);
          if (sug && horseReach(s.map, s.camp, s.stores).has(sug)) d = { ...d, moveTo: sug };
        }
      }
      draft = d;
      return toPlan(s, d);
    },
    choose(s: GameState): ChoiceId {
      const card = eventCard(s)!;
      const dew = process.env.RR_DEW;
      if (card.id === 'dew' && (dew === 'push' || dew === 'wait')) return dew;
      return card.choices.find((c) => !c.disabled)!.id;
    },
    evening(s: GameState): EveningOrders {
      const o = campDefaults(s);
      const sunday = process.env.RR_SUNDAY;
      if (sundayQuestion(s) && sunday === 'rest' && horseWater(s, s.camp)) o.restTomorrow = true;
      if (sundayQuestion(s) && sunday === 'work') delete o.restTomorrow;
      return o;
    },
  };
}
