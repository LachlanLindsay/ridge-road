// Supplies: fresh meat, caches and spare shoes.
import { T } from './data';
import { pathMiles, pathSteps } from './map';
import { capacity, clamp, dailyFood, itemText, itemWeight, ITEMS, loadLb } from './party';
import type { Cache, GameState, Item, Loadout, Stores } from './types';

export function storesFrom(loadout: Loadout): Stores {
  const base = T.loadouts.historical;
  const get = (k: Item) => Math.max(0, loadout[k] ?? base[k]);
  return {
    flour: get('flour'),
    saltMeat: get('saltMeat'),
    fresh: [],
    tea: get('tea'),
    shots: get('shots'),
    axes: get('axes'),
    hatchets: get('hatchets'),
    hoe: get('hoe'),
    blankets: get('blankets'),
    shoes: get('shoes'),
    campKit: Math.max(1, get('campKit')),
    grass: get('grass'),
  };
}

/** Days to walk home from this camp along the trail, at the 1813 party's homeward pace. */
export function pathHomeDays(s: GameState): number {
  const miles = pathMiles(s.map, pathSteps(s.map, s.camp, s.map.start));
  return Math.max(1, Math.ceil(miles / T.returnLeg.milesPerDay));
}

export function addFresh(s: GameState, lb: number) {
  s.stores.fresh.push({ lb, day: s.day });
  s.today.caught = true;
}

const UNCACHEABLE: Item[] = ['campKit'];

/** Leave items at the current camp. Returns pounds cached. */
export function cacheItems(s: GameState, cache: Cache, lines: string[]): number {
  let lb = 0;
  const here = (s.caches[s.camp] ??= {});
  const parts: string[] = [];
  for (const item of ITEMS) {
    const want = cache[item];
    if (!want || want <= 0 || UNCACHEABLE.includes(item)) continue;
    const qty = Math.min(want, s.stores[item]);
    if (qty <= 0) continue;
    s.stores[item] -= qty;
    here[item] = (here[item] ?? 0) + qty;
    lb += itemWeight(item, qty);
    parts.push(itemText(item, qty));
  }
  if (!Object.keys(here).length) delete s.caches[s.camp];
  if (parts.length) lines.push(`Cached at camp: ${parts.join(', ')}.`);
  return lb;
}

/**
 * Cache about this many pounds, taking the least needed goods first: cut grass, then food beyond
 * what the party needs to get home from here, then spare shoes and tea. Blankets stay with the
 * men, and the food reserve for the way home is never left behind.
 */
export function cacheWeight(s: GameState, lb: number, lines: string[]): number {
  const cache: Cache = {};
  let left = lb;
  const take = (item: Item, max: number) => {
    if (left <= 0 || max <= 0) return;
    const per = itemWeight(item, 1);
    const qty = per >= 1 ? Math.min(max, Math.ceil(left / per)) : Math.min(max, left / per);
    if (qty <= 0) return;
    cache[item] = qty;
    left -= itemWeight(item, qty);
  };
  take('grass', s.stores.grass);
  // Keep enough food to walk home from here, plus two days; cache the rest, flour and meat alike.
  const reserve = dailyFood(s, 'full') * (pathHomeDays(s) + 2);
  const spareFood = Math.max(0, s.stores.flour + s.stores.saltMeat - reserve);
  const flourShare = s.stores.flour + s.stores.saltMeat > 0 ? s.stores.flour / (s.stores.flour + s.stores.saltMeat) : 0;
  take('flour', Math.min(s.stores.flour, spareFood * flourShare));
  take('saltMeat', Math.min(s.stores.saltMeat, spareFood - (cache.flour ?? 0)));
  take('shoes', Math.max(0, s.stores.shoes - 2));
  take('tea', s.stores.tea);
  return cacheItems(s, cache, lines);
}

/** Pick up what was cached here, as far as the horses and (on the way home) the men can carry it. */
export function collectCache(s: GameState, lines: string[], at = s.camp) {
  const c = s.caches[at];
  if (!c) return;
  const order: Item[] = ['flour', 'saltMeat', 'tea', 'shots', 'shoes', 'blankets', 'axes', 'hatchets', 'hoe', 'grass'];
  const parts: string[] = [];
  for (const item of order) {
    const qty = c[item];
    if (!qty) continue;
    const room = capacity(s, true) - loadLb(s.stores);
    const per = itemWeight(item, 1);
    const take = per > 0 ? Math.min(qty, Math.max(0, room) / per) : qty;
    const whole = item === 'flour' || item === 'saltMeat' || item === 'tea' || item === 'grass' ? take : Math.floor(take);
    if (whole <= 0) continue;
    s.stores[item] += whole;
    c[item] = qty - whole;
    if (c[item]! <= 1e-9) delete c[item];
    parts.push(itemText(item, whole));
  }
  if (!Object.keys(c).length) delete s.caches[at];
  if (parts.length) lines.push(`Collected from the cache: ${parts.join(', ')}.`);
}

export function issueShoes(s: GameState, pairs: number, lines: string[]) {
  let n = Math.min(pairs, s.stores.shoes);
  let cured = 0;
  while (n > 0) {
    s.stores.shoes -= 1;
    s.wear = clamp(s.wear - T.wear.shoesRelief);
    const sore = s.men.find((m) => m.condition === 'footsore');
    if (sore) {
      sore.condition = null;
      cured += 1;
    }
    n -= 1;
  }
  if (pairs > 0) lines.push(`New shoes issued${cured ? `; ${cured} footsore man${cured > 1 ? 'en' : ''} fit to walk` : ''}.`);
}
