// Outcome and score at the ford.
import { T } from './data';
import { isPassable } from './map';
import { foodLb, isAway, round1 } from './party';
import type { GameState, Outcome, ScoreLine } from './types';

/** Share of the true route both blazed and open to horses. */
export function routeShare(s: GameState): number {
  let done = 0;
  let total = 0;
  for (const seg of Object.values(s.map.segments)) {
    if (!seg.isRoute) continue;
    total += seg.miles;
    done += isPassable(seg.terrain) ? seg.markedMiles : Math.min(seg.markedMiles, seg.clearedMiles);
  }
  return total > 0 ? done / total : 0;
}

export function computeOutcome(s: GameState): Outcome {
  const horsesHome = s.horses.filter((h) => h.leftAt === null).length;
  const food = round1(foodLb(s.stores));
  const base = {
    goalDay: s.goalDay,
    dayHome: s.day,
    turnedBackDay: s.turnedBackDay,
    reason: s.turnReason,
    furthestMiles: round1(s.furthestMiles),
    horsesHome,
    foodLeft: food,
  };
  if (s.goalDay === null) return { ...base, result: 'repulsed', score: null, breakdown: [], title: 'Repulsed' };

  const sc = T.scoring;
  const allWell = s.men.every((m) => m.condition === null && !isAway(s, m));
  const share = routeShare(s);
  const breakdown: ScoreLine[] = [
    { label: 'Reached the goal and returned', points: sc.base },
    { label: `Days to the goal: ${s.goalDay} against ${sc.parDays}`, points: (sc.parDays - s.goalDay) * sc.perDay },
    { label: `Horses home: ${horsesHome} of ${s.horses.length}`, points: horsesHome * sc.perHorse },
    { label: allWell ? 'Every man well at the ford' : `Every man well at the ford: no (+${sc.allWell} if they had been)`, points: allWell ? sc.allWell : 0 },
    { label: `Route marked and cleared: ${Math.round(share * 100)}%`, points: Math.round(sc.routeMax * share) },
    { label: `Food left at the ford: ${food} lb`, points: Math.floor(food / 10) * sc.foodPer10Lb },
  ];
  const score = breakdown.reduce((sum, l) => sum + l.points, 0);
  const title = score >= sc.titles.trailblazer ? 'Trailblazer' : score >= sc.titles.explorer ? 'Explorer' : 'Crossed';
  return { ...base, result: 'crossed', score, breakdown, title };
}

export function finishGame(s: GameState) {
  s.phase = 'over';
  s.pending = [];
  s.eveningQueue = [];
  if (!s.cards.includes('after1813')) s.cards.push('after1813');
  s.outcome = computeOutcome(s);
}
