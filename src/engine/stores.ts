// Supplies: fresh meat, caches and spare shoes.
import { T } from './data';
import { capacity, clamp, itemWeight, ITEMS, loadLb, round1 } from './party';
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
    parts.push(`${round1(qty)} ${item}`);
  }
  if (!Object.keys(here).length) delete s.caches[s.camp];
  if (parts.length) lines.push(`Cached at camp: ${parts.join(', ')}.`);
  return lb;
}

/** Cache about this many pounds, taking the least needed goods first. */
export function cacheWeight(s: GameState, lb: number, lines: string[]): number {
  const order: Item[] = ['grass', 'tea', 'blankets', 'flour', 'saltMeat'];
  const cache: Cache = {};
  let left = lb;
  for (const item of order) {
    if (left <= 0) break;
    const per = itemWeight(item, 1);
    const have = s.stores[item];
    if (have <= 0) continue;
    const qty = per >= 1 ? Math.min(have, Math.ceil(left / per)) : Math.min(have, left / per);
    cache[item] = qty;
    left -= itemWeight(item, qty);
  }
  return cacheItems(s, cache, lines);
}

/** Pick up what was cached here, as far as the horses can carry it. */
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
    parts.push(`${round1(whole)} ${item}`);
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
