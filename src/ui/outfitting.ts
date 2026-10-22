// Outfitting: the party and the stores it sets out with, how the horses would carry them, and how
// long the food would last. Every number comes from tuning.json through the engine.
import { T, itemWeight, partyOf, type Item, type Loadout } from '../engine';

export interface Outfit {
  servants: number;
  horses: number;
  dogs: number;
  loadout: Record<Item, number>;
}

export function outfit1813(): Outfit {
  const p = partyOf();
  return { ...p, loadout: { ...T.loadouts.historical } as Record<Item, number> };
}

export function sameOutfit(a: Outfit, b: Outfit): boolean {
  return a.servants === b.servants && a.horses === b.horses && a.dogs === b.dogs && (Object.keys(a.loadout) as Item[]).every((k) => a.loadout[k] === b.loadout[k]);
}

export interface Row {
  item: Item;
  label: string;
  unit?: string;
  step: number;
  max: number;
  note: string;
}

export const PROVISIONS: Row[] = [
  { item: 'flour', label: 'Flour', unit: 'lb', step: 20, max: 500, note: 'Half of each man’s daily ration' },
  { item: 'saltMeat', label: 'Salt meat', unit: 'lb', step: 20, max: 500, note: 'The other half, and the dogs’ food' },
  { item: 'tea', label: 'Tea and sugar', unit: 'lb', step: 5, max: 50, note: '1 lb in the evening lifts spirits' },
  { item: 'shots', label: 'Powder and shot', unit: 'shots', step: 10, max: 150, note: 'One shot for each hunting try' },
];

export const KIT: Row[] = [
  { item: 'axes', label: 'Felling axes', step: 1, max: 9, note: 'One per cutter for full speed' },
  { item: 'hatchets', label: 'Hatchets', step: 1, max: 9, note: 'Cut at three-quarters speed' },
  { item: 'hoe', label: 'Hoe', step: 1, max: 2, note: 'Digs the trench that gets the horses down the descent' },
  { item: 'blankets', label: 'Blankets', step: 1, max: 12, note: 'A man without one feels the frost' },
  { item: 'shoes', label: 'Spare shoes', unit: 'pairs', step: 1, max: 14, note: 'Each pair puts a footsore man back on his feet' },
];

export const men = (o: Outfit) => 3 + o.servants;

export function totalLoad(l: Record<Item, number>): number {
  return (Object.keys(l) as Item[]).reduce((sum, k) => sum + itemWeight(k, l[k]), 0);
}

export function capacityOf(horses: number, push = false): number {
  return horses * (push ? T.horses.overloadLb : T.horses.capacityLb);
}

/** Pounds eaten a day at full rations: flour and meat for every man, meat for the dogs. */
export function dailyEat(o: Outfit): number {
  return men(o) * (T.rations.flourPerMan + T.rations.meatPerMan) + o.dogs * T.rations.dogMeat;
}

/** Days the food lasts at full rations, before any hunting. Flour and meat stand in for each other. */
export function foodDays(o: Outfit): number {
  const eat = dailyEat(o);
  return eat > 0 ? (o.loadout.flour + o.loadout.saltMeat) / eat : 0;
}

/** Nights of cut grass the spare capacity would carry for every horse. */
export function grassNights(o: Outfit): number {
  const room = capacityOf(o.horses) - totalLoad(o.loadout);
  return room > 0 ? room / (T.horses.night.grassLbPerHorse * o.horses) : 0;
}

export type Kind = 'food' | 'gear';
export interface HorseLoad {
  name: string;
  food: number;
  gear: number;
  total: number;
  items: Partial<Record<Item, number>>;
}

const HORSE_NAMES = ['Bay', 'Grey', 'Chestnut', 'Black', 'Dun', 'Roan'];
const WHOLE: Item[] = ['campKit', 'axes', 'hoe', 'blankets', 'hatchets', 'shoes'];
const LOOSE: Item[] = ['flour', 'saltMeat', 'tea', 'shots'];

/**
 * Pack the horses the way a packer would: the heavy single pieces first, each onto the horse
 * carrying least, then the sacks of flour and meat poured in to even the loads up.
 */
export function packHorses(o: Outfit): HorseLoad[] {
  const n = Math.max(1, o.horses);
  const loads: HorseLoad[] = Array.from({ length: n }, (_, i) => ({ name: HORSE_NAMES[i] ?? `Horse ${i + 1}`, food: 0, gear: 0, total: 0, items: {} }));
  const pieces: { item: Item; lb: number }[] = [];
  for (const item of WHOLE) for (let k = 0; k < o.loadout[item]; k++) pieces.push({ item, lb: itemWeight(item, 1) });
  pieces.sort((a, b) => b.lb - a.lb);
  for (const p of pieces) {
    const h = loads.reduce((a, b) => (b.total < a.total ? b : a));
    h.items[p.item] = (h.items[p.item] ?? 0) + 1;
    h.gear += p.lb;
    h.total += p.lb;
  }
  const loose = LOOSE.map((item) => ({ item, lb: itemWeight(item, o.loadout[item]) })).filter((x) => x.lb > 0);
  const pour = loose.reduce((s, x) => s + x.lb, 0);
  if (pour > 0) {
    // Find the level the lightest horses are filled up to.
    const sorted = loads.map((h) => h.total).sort((a, b) => a - b);
    let level = sorted[0]!;
    let left = pour;
    for (let i = 0; i < sorted.length; i++) {
      const next = i + 1 < sorted.length ? sorted[i + 1]! : Infinity;
      const room = (next - level) * (i + 1);
      if (room >= left) {
        level += left / (i + 1);
        left = 0;
        break;
      }
      left -= room;
      level = next;
    }
    for (const h of loads) {
      const share = Math.max(0, level - h.total);
      if (share <= 0) continue;
      for (const x of loose) {
        const lb = (share * x.lb) / pour;
        const qty = lb / itemWeight(x.item, 1);
        h.items[x.item] = (h.items[x.item] ?? 0) + qty;
        if (x.item === 'flour' || x.item === 'saltMeat') h.food += lb;
        else h.gear += lb;
      }
      h.total += share;
    }
  }
  return loads;
}

export interface Check {
  level: 'ok' | 'warn' | 'stop';
  text: string;
}

/** What stands out about an outfit, worst first. `stop` means the party cannot set out with it. */
export function checks(o: Outfit): Check[] {
  const out: Check[] = [];
  const load = totalLoad(o.loadout);
  const cap = capacityOf(o.horses);
  const push = capacityOf(o.horses, true);
  if (load > push + 1e-6) out.push({ level: 'stop', text: `Too heavy to set out: ${Math.ceil(load - push)} lb more than the horses can carry even at a push. Leave something behind or take another horse.` });
  else if (load > cap + 1e-6) out.push({ level: 'warn', text: `${Math.ceil(load - cap)} lb over the horses’ easy load: they will tire faster and stumble more, and there is no room for cut grass.` });
  const days = foodDays(o);
  if (days < 14) out.push({ level: 'warn', text: `Food for only ${Math.floor(days)} days. The 1813 party was out 27 days and came home with almost nothing left.` });
  const cold = men(o) - o.loadout.blankets;
  if (cold > 0) out.push({ level: 'warn', text: `${cold} ${cold === 1 ? 'man has' : 'men have'} no blanket for the frosty nights.` });
  if (o.loadout.hoe === 0) out.push({ level: 'warn', text: 'Without a hoe, the trench that gets the horses down the far descent takes much longer.' });
  if (o.loadout.shots === 0) out.push({ level: 'warn', text: 'No powder and shot: no hunting, so no fresh meat.' });
  if (o.loadout.axes + o.loadout.hatchets === 0) out.push({ level: 'warn', text: 'No axes or hatchets: the cutters will barely make a path.' });
  return out;
}

export function toOptions(o: Outfit): { party: { servants: number; horses: number; dogs: number }; loadout: Loadout } {
  return { party: { servants: o.servants, horses: o.horses, dogs: o.dogs }, loadout: { ...o.loadout } };
}
