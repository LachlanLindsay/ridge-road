// Ridge Road engine: the public API. Every rule lives behind these functions; the UI, saves and
// the sim harness only call them. All functions are pure: they return a new state.
export { newGame, replay, applyAction } from './state';
export {
  validatePlan,
  hoursAvailable,
  moveHours,
  cutFrontMiles,
  scoutFrontMiles,
  markedAhead,
  assignments,
  loadAfterCache,
} from './plan';
export { resolveHalfDay } from './half';
export { chooseEvent, eventCard } from './events';
export { endDay } from './night';
export { computeOutcome, routeShare } from './score';
export { dateOf, weekday } from './day';
export {
  horseReach,
  horsePassable,
  openBranches,
  pathSteps,
  stepsToTarget,
  isPassable,
  straightMiles,
  walkedMiles,
  openMiles,
  EPS,
} from './map';
export {
  efficiency,
  workFactor,
  canWork,
  isAway,
  isBusy,
  loadLb,
  capacity,
  foodLb,
  freshLb,
  dailyFood,
  horseCapacity,
  MEMBER_ORDER,
} from './party';
export { T, MAP_DATA, JOURNAL_1813, CARDS } from './data';
export type * from './types';

import type { GameState } from './types';

/** Serialise a save. */
export function toSave(s: GameState): string {
  return JSON.stringify(s);
}

/** Load a save, rejecting anything that is not a v1 game state. */
export function fromSave(json: string): GameState {
  const s = JSON.parse(json) as GameState;
  if (!s || s.v !== 1 || !s.map || !Array.isArray(s.men)) throw new Error('Not a Ridge Road save.');
  return s;
}
