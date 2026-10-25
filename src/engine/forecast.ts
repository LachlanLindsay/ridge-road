// What the stores and the horses come to, for the plan and camp sheets: how long the food lasts
// against the way home, what a night at a camp does to the horses, how many nights the cut grass
// covers, and a hunter's odds. The rules themselves stay in night.ts and half.ts; these read them.
import { T } from './data';
import { huntHabitat, type Step } from './map';
import { dailyFood, foodLb, isOverloaded, withParty } from './party';
import { pathHomeDays } from './stores';
import type { GameState, Grass, MapNode, Member, Rations } from './types';

export type Feed = 'full' | 'half' | 'none';

export function feedOf(grass: Grass): Feed {
  return grass === 'good' || grass === 'tall' ? 'full' : grass === 'rushy' ? 'half' : 'none';
}

export function horseWaterOf(node: MapNode): boolean {
  return node.water === 'swamp' || node.water === 'stream' || node.water === 'lagoon';
}

/**
 * Condition each horse gains or loses on a night at this camp on its own grass and water, as the
 * night's rules have it: feed, water and an overload. Cut grass, Blaxland's care and a long move
 * are left out; the sheets say those separately.
 */
export function horseNightRate(s: GameState, node: MapNode): number {
  const N = T.horses.night;
  const feed = feedOf(node.grass);
  let d = feed === 'full' ? N.goodFeed : feed === 'half' ? N.rushy : N.noFeed;
  if (!horseWaterOf(node)) d += N.noWater;
  if (isOverloaded(s)) d += N.overloaded;
  return d;
}

export interface Runway {
  /** Days the food lasts at these rations. */
  foodDays: number;
  /** Days home along the trail from this camp. */
  homeDays: number;
  /** Too little food for the way home with a few days to spare. */
  foodShort: boolean;
  horses: number;
  weakest: { name: string; condition: number } | null;
  /** Per horse per night at this camp, on its own grass and water. */
  rate: number;
  /** Nights until the weakest horse is spent at that rate; null when the horses hold or gain. */
  nightsToSpent: number | null;
  /** Nights of cut grass for every horse with the party. */
  grassNights: number;
}

/** Days of food the way home should leave in hand. */
export const FOOD_MARGIN_DAYS = 3;

export function runway(s: GameState, nodeId: string = s.camp, rations: Rations = s.rations): Runway {
  const node = s.map.nodes[nodeId]!;
  const daily = dailyFood(s, rations);
  const foodDays = daily > 0 ? foodLb(s.stores) / daily : 0;
  const homeDays = pathHomeDays(s);
  const herd = s.horses.filter(withParty);
  const weakestHorse = herd.reduce<(typeof herd)[number] | null>((w, h) => (!w || h.condition < w.condition ? h : w), null);
  const rate = horseNightRate(s, node);
  const spentAt = T.horses.exhaustedBelow;
  let nightsToSpent: number | null = null;
  if (weakestHorse && rate < 0) nightsToSpent = weakestHorse.condition < spentAt ? 0 : Math.max(1, Math.ceil((weakestHorse.condition - spentAt + 1e-9) / -rate));
  const perNight = T.horses.night.grassLbPerHorse * herd.length;
  return {
    foodDays,
    homeDays,
    foodShort: foodDays < homeDays + (s.leg === 'out' ? FOOD_MARGIN_DAYS : 0),
    horses: herd.length,
    weakest: weakestHorse ? { name: weakestHorse.name, condition: weakestHorse.condition } : null,
    rate,
    nightsToSpent,
    grassNights: perNight > 0 ? Math.floor((s.stores.grass + 1e-9) / perNight) : 0,
  };
}

/** A half-day's hunt from this camp: the chance one shot brings in a kangaroo. */
export function huntOdds(s: GameState, m: Member, nodeId: string = s.camp): number {
  const p = T.hunting.man[huntHabitat(s.map, nodeId)];
  return Math.min(1, p * (m.id === 'burne' ? T.hunting.burneFactor : 1));
}

/**
 * The camps the party has already walked between here and the flag, nearest first. What the
 * scouts know of the ground ahead, as the 1813 party knew it after cutting into the brush.
 */
export function walkedAhead(s: GameState, steps: Step[]): MapNode[] {
  const out: MapNode[] = [];
  for (const st of steps) {
    const seg = s.map.segments[st.seg]!;
    const n = s.map.nodes[st.dir === 'out' ? seg.b : seg.a]!;
    if (!n.reached) break;
    out.push(n);
  }
  return out;
}
