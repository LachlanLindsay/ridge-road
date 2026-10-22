// Men, horses, loads and food.
import { T } from './data';
import type { GameState, Horse, Item, Member, MemberId, Rations, Stores } from './types';

export const MEMBER_ORDER: MemberId[] = ['blaxland', 'lawson', 'wentworth', 'burne', 'fairs', 'servant3', 'servant4'];

export const MEMBER_INFO: Record<MemberId, { name: string; leader: boolean }> = {
  blaxland: { name: 'Gregory Blaxland', leader: true },
  lawson: { name: 'William Lawson', leader: true },
  wentworth: { name: 'William Charles Wentworth', leader: true },
  burne: { name: 'James Burne', leader: false },
  fairs: { name: 'Samuel Fairs', leader: false },
  servant3: { name: 'Servant 3', leader: false },
  servant4: { name: 'Servant 4', leader: false },
};

export const clamp = (v: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, v));

/** Time slots: three per day (morning, afternoon, night). Absences are measured in slots. */
export function slot(day: number, part: 'morning' | 'afternoon' | 'night'): number {
  return day * 3 + (part === 'morning' ? 0 : part === 'afternoon' ? 1 : 2);
}

export function currentSlot(s: GameState): number {
  return slot(s.day, s.phase === 'morning' ? 'morning' : s.phase === 'afternoon' ? 'afternoon' : 'night');
}

export function member(s: GameState, id: MemberId): Member {
  const m = s.men.find((x) => x.id === id);
  if (!m) throw new Error(`No member ${id}`);
  return m;
}

/** e = 0.5 + stamina / 200 */
export function efficiency(m: Member): number {
  return T.efficiency.base + T.efficiency.perStamina * clamp(m.stamina);
}

export function illnessFactor(m: Member): number {
  switch (m.condition) {
    case 'chill':
      return T.illness.chill.efficiency;
    case 'bowel':
      return T.illness.bowel.efficiency;
    case 'tooIll':
      return 0;
    default:
      return 1;
  }
}

export function moraleFactor(s: GameState, m: Member): number {
  return !m.leader && s.morale < T.efficiency.servantMoraleBelow ? T.efficiency.servantMoraleFactor : 1;
}

/** Efficiency times illness and morale: how hard this man can work today. */
export function workFactor(s: GameState, m: Member): number {
  return efficiency(m) * illnessFactor(m) * moraleFactor(s, m);
}

export function walkFactor(m: Member): number {
  return m.condition === 'footsore' ? T.illness.footsore.walkFactor : 1;
}

export function isAway(s: GameState, m: Member, at = currentSlot(s)): boolean {
  return m.awayUntil > at;
}

export function isBusy(s: GameState, m: Member, at = currentSlot(s)): boolean {
  return m.busyUntil > at;
}

/** Can be given field work (scout, cut, water, hunt) this half. */
export function canWork(s: GameState, m: Member): boolean {
  return !isAway(s, m) && !isBusy(s, m) && m.condition !== 'tooIll' && !m.keepAtCamp;
}

export function present(s: GameState): Member[] {
  return s.men.filter((m) => !isAway(s, m));
}

// ---------------------------------------------------------------- horses and loads

export function withParty(h: Horse): boolean {
  return h.leftAt === null;
}

export function horseCapacity(h: Horse, overload = false): number {
  if (!withParty(h) || h.condition < T.horses.exhaustedBelow) return 0;
  const cap = overload ? T.horses.overloadLb : T.horses.capacityLb;
  return h.condition < T.horses.weakBelow ? cap * T.horses.weakCarry : cap;
}

export function capacity(s: GameState, overload = false): number {
  return s.horses.reduce((sum, h) => sum + horseCapacity(h, overload), 0);
}

export function itemWeight(item: Item, qty: number): number {
  const w = T.weights;
  switch (item) {
    case 'shots':
      return qty * w.shot;
    case 'axes':
      return qty * w.axe;
    case 'hatchets':
      return qty * w.hatchet;
    case 'hoe':
      return qty * w.hoe;
    case 'blankets':
      return qty * w.blanket;
    case 'shoes':
      return qty * w.shoes;
    case 'campKit':
      return qty * w.campKit;
    default:
      return qty; // flour, saltMeat, tea, grass are in lb
  }
}

export const ITEMS: Item[] = ['flour', 'saltMeat', 'tea', 'shots', 'axes', 'hatchets', 'hoe', 'blankets', 'shoes', 'campKit', 'grass'];

export function freshLb(st: Stores): number {
  return st.fresh.reduce((s, f) => s + f.lb, 0);
}

export function loadLb(st: Stores): number {
  return ITEMS.reduce((sum, it) => sum + itemWeight(it, st[it]), 0) + freshLb(st);
}

export function foodLb(st: Stores): number {
  return st.flour + st.saltMeat + freshLb(st);
}

/** Load each horse carries when the auto-packer spreads the total by capacity. */
export function horseLoads(s: GameState): { horse: Horse; load: number; cap: number }[] {
  const total = loadLb(s.stores);
  const capSum = capacity(s);
  return s.horses
    .filter(withParty)
    .map((h) => {
      const cap = horseCapacity(h);
      return { horse: h, cap, load: capSum > 0 ? (total * cap) / capSum : 0 };
    });
}

export function isOverloaded(s: GameState): boolean {
  return loadLb(s.stores) > capacity(s) + 1e-6;
}

export function canCarry(s: GameState): boolean {
  return loadLb(s.stores) <= capacity(s, true) + 1e-6;
}

// ---------------------------------------------------------------- food

export function rationLevel(r: Rations): number {
  return T.rations.levels[r];
}

/** Food the men and dogs eat in a day at this ration. */
export function dailyFood(s: GameState, r: Rations, dogsFed = true): number {
  const men = present(s).length;
  const perMan = (T.rations.flourPerMan + T.rations.meatPerMan) * rationLevel(r);
  return men * perMan + (dogsFed ? s.dogs * T.rations.dogMeat : 0);
}

/** Take meat, fresh first (oldest first), then salt. Returns pounds actually taken. */
export function takeMeat(st: Stores, lb: number): number {
  let need = lb;
  st.fresh.sort((a, b) => a.day - b.day);
  while (need > 1e-9 && st.fresh.length) {
    const f = st.fresh[0]!;
    const take = Math.min(f.lb, need);
    f.lb -= take;
    need -= take;
    if (f.lb <= 1e-9) st.fresh.shift();
  }
  const salt = Math.min(st.saltMeat, need);
  st.saltMeat -= salt;
  need -= salt;
  return lb - need;
}

export function takeFlour(st: Stores, lb: number): number {
  const t = Math.min(st.flour, lb);
  st.flour -= t;
  return t;
}

export function round1(v: number): number {
  return Math.round(v * 10) / 10;
}
