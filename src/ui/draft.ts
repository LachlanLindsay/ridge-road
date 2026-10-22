// The plan sheet's working copy of a half-day plan, and the defaults it starts from.
import {
  T,
  canAdvance,
  canWork,
  capacity,
  chooseTarget,
  isAway,
  isBusy,
  loadLb,
  targetSpent,
  validTarget,
  type Cache,
  type GameState,
  type HalfDayPlan,
  type Item,
  type Member,
  type MemberId,
  type Task,
} from '../engine';

export interface Draft {
  /** Which half this draft was made for: "seed:day:phase". */
  key: string;
  /** Standing orders: what each man does when he is fit and it is a working day. */
  roster: Partial<Record<MemberId, Task>>;
  /** This half's tasks: the standing orders adjusted for illness and rest days, plus any taps. */
  tasks: Partial<Record<MemberId, Task>>;
  target: string | null;
  moveTo: string | null;
  advance: boolean;
  blaze: boolean;
  /** Return leg: stay put this half instead of travelling. */
  halt: boolean;
  /** Supplies to leave at this camp before moving, when the horses cannot carry everything. */
  cache?: Cache;
}

/** Pounds over what the horses can carry at most, or 0. */
export function overload(s: GameState): number {
  return Math.max(0, loadLb(s.stores) - capacity(s, true));
}

/**
 * What to leave behind so the horses can move: the least needed things first, food last. Null when
 * nothing is over, or when no horse can carry anything at all.
 */
export function excessCache(s: GameState): Cache | null {
  const over = overload(s);
  if (over <= 1e-6 || capacity(s, true) <= 0) return null;
  let left = over + 0.5;
  const cache: Cache = {};
  const order: [Item, number][] = [
    ['grass', 1],
    ['tea', 1],
    ['blankets', T.weights.blanket],
    ['shoes', T.weights.shoes],
    ['flour', 1],
    ['saltMeat', 1],
  ];
  for (const [item, per] of order) {
    if (left <= 0) break;
    const have = s.stores[item];
    if (have <= 0) continue;
    const qty = Math.min(have, per === 1 ? Math.ceil(left) : Math.ceil(left / per));
    cache[item] = qty;
    left -= qty * per;
  }
  return cache;
}

/** The tap order on a roster chip, from the spec. */
export const CYCLE: Task[] = ['scout', 'cut', 'camp', 'water', 'hunt', 'grass', 'rest'];
/** Men who cannot work in the field (too ill, kept at camp) only cycle through these. */
export const CAMP_CYCLE: Task[] = ['camp', 'grass', 'rest'];
const FIELD: Task[] = ['scout', 'cut', 'water', 'hunt'];

/** The 1813 rhythm: Lawson marks ahead, four cut, Blaxland and one servant mind the horses. */
export function defaultTasks(): Partial<Record<MemberId, Task>> {
  return { blaxland: 'camp', lawson: 'scout', wentworth: 'cut', burne: 'cut', fairs: 'cut', servant3: 'cut', servant4: 'camp' };
}

export function halfKey(s: GameState): string {
  return `${s.seed}:${s.day}:${s.phase}`;
}

export function available(s: GameState, m: Member): 'away' | 'busy' | 'camp-only' | 'yes' {
  if (isAway(s, m)) return 'away';
  if (isBusy(s, m)) return 'busy';
  return canWork(s, m) ? 'yes' : 'camp-only';
}

/** On a rest day nobody scouts or cuts, so those drop out of the tap order. */
const REST_CYCLE: Task[] = ['rest', 'camp', 'water', 'hunt', 'grass'];

function restDay(s: GameState): boolean {
  return s.restToday && s.leg === 'out';
}

export function nextTask(s: GameState, m: Member, current: Task): Task {
  const avail = available(s, m) === 'yes';
  const cycle = restDay(s) ? (avail ? REST_CYCLE : CAMP_CYCLE) : avail ? CYCLE : CAMP_CYCLE;
  const i = cycle.indexOf(current);
  return cycle[(i + 1) % cycle.length]!;
}

/** Adjust tasks for who can work this half: the ill rest, a rest day stops scouting and cutting. */
function fitTasks(s: GameState, tasks: Partial<Record<MemberId, Task>>, roster: Partial<Record<MemberId, Task>>) {
  const resting = restDay(s);
  for (const m of s.men) {
    const t = tasks[m.id] ?? 'camp';
    if (resting && (t === 'scout' || t === 'cut')) tasks[m.id] = 'rest';
    else if (available(s, m) === 'camp-only' && FIELD.includes(t)) tasks[m.id] = m.condition ? 'rest' : 'camp';
  }
  if (resting || s.leg !== 'out') return;
  // When the usual scout is laid up, a fit leader marks the trail in his place.
  const wantsScout = s.men.some((m) => roster[m.id] === 'scout');
  const leaderScouting = s.men.some((m) => m.leader && tasks[m.id] === 'scout' && available(s, m) === 'yes');
  if (wantsScout && !leaderScouting) {
    const order: MemberId[] = ['blaxland', 'wentworth', 'lawson'];
    const sub = order.map((id) => s.men.find((m) => m.id === id)!).find((m) => available(s, m) === 'yes' && !m.condition);
    if (sub) tasks[sub.id] = 'scout';
  }
}

/**
 * Bring a draft up to date with the state. A new half starts from the standing orders and the same
 * target, without last half's camp move. A spent target gives way to the deepest open lead.
 */
export function normalizeDraft(s: GameState, prev: Draft | null): Draft {
  const key = halfKey(s);
  const fresh = !prev || prev.key !== key;
  const resting = restDay(s);
  const roster = { ...(prev?.roster ?? prev?.tasks ?? defaultTasks()) };
  let tasks: Partial<Record<MemberId, Task>>;
  if (!fresh) tasks = { ...prev!.tasks };
  else if (resting) tasks = Object.fromEntries(s.men.map((m) => [m.id, 'rest' as Task]));
  else tasks = { ...roster };
  fitTasks(s, tasks, roster);
  if (fresh && !resting && s.leg === 'out') minderCutsGrass(s, tasks);
  let target = prev?.target ?? null;
  if (target && !validTarget(s, target)) target = null;
  if (fresh && targetSpent(s, target)) target = chooseTarget(s);
  if (!target) target = chooseTarget(s);
  let moveTo = fresh || resting ? null : (prev?.moveTo ?? null);
  if (moveTo === s.camp) moveTo = null;
  const advance = resting ? false : fresh ? !!target && canAdvance(s, s.camp, target) : (prev?.advance ?? false);
  const out: Draft = { key, roster, tasks, target, moveTo, advance, blaze: prev?.blaze ?? true, halt: fresh ? false : (prev?.halt ?? false) };
  if (!fresh && prev?.cache) out.cache = prev.cache;
  // Horses that cannot carry the load cannot push on, unless the plan leaves the excess here.
  if (out.advance && overload(s) > 1e-6 && !out.cache) out.advance = false;
  return out;
}

/** A tap on a man's chip: the next task, kept as a standing order when he is fit on a working day. */
export function tapTask(s: GameState, d: Draft, m: Member): Draft {
  const next = nextTask(s, m, d.tasks[m.id] ?? 'camp');
  const standing = available(s, m) === 'yes' && !restDay(s) && s.leg === 'out';
  return { ...d, tasks: { ...d.tasks, [m.id]: next }, roster: standing ? { ...d.roster, [m.id]: next } : d.roster };
}

/**
 * Both Camp and Grass mind the horses. Where the grass is good and there is room to carry it, one
 * minder other than Blaxland cuts grass for the dry camps ahead; elsewhere grass cutters go back to
 * minding camp.
 */
function minderCutsGrass(s: GameState, tasks: Partial<Record<MemberId, Task>>) {
  const node = s.map.nodes[s.camp]!;
  const good = node.grass === 'good' || node.grass === 'tall';
  const room = capacity(s) - loadLb(s.stores) > T.horses.night.grassLbPerHorse;
  if (good && room) {
    if (s.men.some((m) => tasks[m.id] === 'grass')) return;
    const minder = s.men.find((m) => m.id !== 'blaxland' && tasks[m.id] === 'camp' && available(s, m) !== 'away' && available(s, m) !== 'busy');
    if (minder) tasks[minder.id] = 'grass';
  } else {
    for (const m of s.men) if (tasks[m.id] === 'grass') tasks[m.id] = 'camp';
  }
}

export function toPlan(s: GameState, d: Draft): HalfDayPlan {
  if (s.leg === 'home') return d.halt ? { tasks: d.tasks, halt: true } : { tasks: {} };
  const plan: HalfDayPlan = { tasks: d.tasks };
  if (d.cache && Object.keys(d.cache).length) plan.cache = d.cache;
  if (d.target) plan.target = d.target;
  if (d.moveTo && d.moveTo !== s.camp) plan.moveTo = d.moveTo;
  if (d.advance && d.target && canAdvance(s, d.moveTo ?? s.camp, d.target)) {
    plan.advance = true;
    if (!d.blaze) plan.blaze = false;
  }
  return plan;
}

export function taskCounts(s: GameState, d: Draft): Partial<Record<Task, number>> {
  const out: Partial<Record<Task, number>> = {};
  for (const m of s.men) {
    if (available(s, m) === 'away' || available(s, m) === 'busy') continue;
    const t = d.tasks[m.id] ?? 'camp';
    out[t] = (out[t] ?? 0) + 1;
  }
  return out;
}
