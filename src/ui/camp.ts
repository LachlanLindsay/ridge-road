// The camp sheet's defaults: what a player who changes nothing orders for the night.
import { horseWater, modeTuning, sundayTomorrow, type EveningOrders, type GameState } from '../engine';

/** Saturday night on the way out (not at the goal): the camp sheet asks whether to rest on Sunday. */
export function sundayQuestion(s: GameState): boolean {
  return s.leg === 'out' && s.camp !== s.map.goal && sundayTomorrow(s);
}

/**
 * The Sunday rest is ticked for the player on Easy, and left for them to choose otherwise. Not at a
 * camp without water for the horses: a day there costs them, so the sheet leaves it to the player.
 */
export function sundayDefault(s: GameState): boolean {
  return sundayQuestion(s) && modeTuning(s.mode).sundayRest && horseWater(s, s.camp);
}

/** The orders the camp sheet starts from. */
export function campDefaults(s: GameState): EveningOrders {
  const o: EveningOrders = { rations: s.rations, feedGrass: true };
  if (sundayDefault(s)) o.restTomorrow = true;
  const footsore = s.men.filter((m) => m.condition === 'footsore').length;
  const shoes = Math.min(footsore, s.stores.shoes);
  if (shoes > 0) o.shoes = shoes;
  const here = s.caches[s.camp];
  if (here && Object.keys(here).length) o.collect = true;
  if (s.leg === 'out' && s.camp === s.map.goal) o.headHome = true;
  return o;
}
