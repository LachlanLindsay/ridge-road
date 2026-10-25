// The plan sheet's working copy of a half-day plan, and the defaults it starts from.
import {
  T,
  canAdvance,
  canWork,
  capacity,
  chooseTarget,
  feedOf,
  huntHabitat,
  huntOdds,
  runway,
  stepsToTarget,
  walkedAhead,
  withParty,
  horseReach,
  hoursAvailable,
  isAway,
  isBusy,
  loadLb,
  moveHours,
  suggestCampMove,
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

/**
 * The 1813 rhythm: Lawson marks ahead, four cut, Blaxland and one servant mind the horses. Servants
 * beyond the 1813 four join the cutters.
 */
export function defaultTasks(s?: GameState): Partial<Record<MemberId, Task>> {
  const all: Partial<Record<MemberId, Task>> = { blaxland: 'camp', lawson: 'scout', wentworth: 'cut', burne: 'cut', fairs: 'cut', servant3: 'cut', servant4: 'camp', servant5: 'cut', servant6: 'cut' };
  return s ? Object.fromEntries(s.men.map((m) => [m.id, all[m.id] ?? 'camp'])) : all;
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
  const cycle = taskChoices(s, m);
  const i = cycle.indexOf(current);
  return cycle[(i + 1) % cycle.length]!;
}

/** The tasks this man may be given this half, in the order the picker shows them. */
export function taskChoices(s: GameState, m: Member): Task[] {
  const avail = available(s, m) === 'yes';
  if (s.leg === 'home') return avail ? ['rest', 'hunt', 'grass', 'water', 'camp'] : CAMP_CYCLE;
  return restDay(s) ? (avail ? REST_CYCLE : CAMP_CYCLE) : avail ? CYCLE : CAMP_CYCLE;
}

/** Adjust tasks for who can work this half: the ill rest, a rest day stops scouting and cutting. */
function fitTasks(s: GameState, tasks: Partial<Record<MemberId, Task>>, roster: Partial<Record<MemberId, Task>>) {
  const resting = restDay(s);
  for (const m of s.men) {
    const t = tasks[m.id] ?? 'camp';
    if ((resting || s.leg === 'home') && (t === 'scout' || t === 'cut')) tasks[m.id] = 'rest';
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
  const roster = { ...(prev?.roster ?? prev?.tasks ?? defaultTasks(s)) };
  let tasks: Partial<Record<MemberId, Task>>;
  if (!fresh) tasks = { ...prev!.tasks };
  else if (resting) tasks = Object.fromEntries(s.men.map((m) => [m.id, 'rest' as Task]));
  else tasks = { ...roster };
  fitTasks(s, tasks, roster);
  if (fresh && !resting && s.leg === 'out') noGrassToCut(s, tasks);
  let target = prev?.target ?? null;
  if (target && !validTarget(s, target)) target = null;
  if (fresh && targetSpent(s, target)) target = chooseTarget(s);
  if (!target) target = chooseTarget(s);
  // A new half moves the camp forward with the work, as the suggestion has it; "Stay instead" undoes it.
  let moveTo = resting ? null : fresh ? campFor(s, target) : (prev?.moveTo ?? null);
  if (moveTo === s.camp) moveTo = null;
  const advance = resting ? false : fresh ? !!target && canAdvance(s, moveTo ?? s.camp, target) : (prev?.advance ?? false);
  const out: Draft = { key, roster, tasks, target, moveTo, advance, blaze: prev?.blaze ?? true, halt: fresh ? false : (prev?.halt ?? false) };
  if (!fresh && prev?.cache) out.cache = prev.cache;
  // Horses that cannot carry the load cannot push on, unless the plan leaves the excess here.
  if (out.advance && overload(s) > 1e-6 && !out.cache) out.advance = false;
  return out;
}

/** A tap on a man's chip: the next task, kept as a standing order when he is fit on a working day. */
export function tapTask(s: GameState, d: Draft, m: Member): Draft {
  return setTask(s, d, m, nextTask(s, m, d.tasks[m.id] ?? 'camp'));
}

/** Give a man a task, kept as a standing order when he is fit on a working day. */
export function setTask(s: GameState, d: Draft, m: Member, next: Task): Draft {
  if (!taskChoices(s, m).includes(next)) return d;
  const standing = available(s, m) === 'yes' && !restDay(s) && s.leg === 'out';
  return { ...d, tasks: { ...d.tasks, [m.id]: next }, roster: standing ? { ...d.roster, [m.id]: next } : d.roster };
}

/**
 * Both Camp and Grass mind the horses. Where the grass is not worth cutting to carry, a standing
 * Grass order goes back to minding camp. Nobody is put on Grass unasked: the plan sheet offers it
 * where it matters (see grassOffer).
 */
function noGrassToCut(s: GameState, tasks: Partial<Record<MemberId, Task>>) {
  const node = s.map.nodes[s.camp]!;
  if (node.grass === 'good' || node.grass === 'tall') return;
  for (const m of s.men) if (tasks[m.id] === 'grass') tasks[m.id] = 'camp';
}

/**
 * The camp move that goes with a target: the suggestion for it, when the horses can carry the
 * load and get there this half. Null keeps the camp where it is.
 */
export function campFor(s: GameState, target: string | null, cache?: Cache): string | null {
  if (!target || s.leg !== 'out' || restDay(s)) return null;
  if (overload(s) > 1e-6 && !cache) return null;
  const to = suggestCampMove(s, target);
  if (!to) return null;
  const steps = horseReach(s.map, s.camp, s.stores).get(to);
  if (!steps || moveHours(s, steps) > hoursAvailable(s) + 1e-6) return null;
  return to;
}

/** A new target, with the camp move that goes with it and whether the party can push on. */
export function withTarget(s: GameState, d: Draft, target: string): Draft {
  const moveTo = campFor(s, target, d.cache);
  return { ...d, target, moveTo, advance: canAdvance(s, moveTo ?? s.camp, target) && !(overload(s) > 1e-6 && !d.cache) };
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

/** A suggestion the plan sheet puts to the player: what it says, its button, and the plan it makes. */
export interface Offer {
  id: 'grass' | 'hunt';
  text: string;
  action: string;
  apply: (d: Draft) => Draft;
}

function nameOf(m: Member): string {
  return m.name.startsWith('Servant') ? m.name : (m.name.split(' ').slice(-1)[0] ?? m.name);
}

/** Up to n fit men to take off their work for a half, servants first, never Blaxland at camp. */
function spareHands(s: GameState, d: Draft, n: number): Member[] {
  const fit = s.men.filter((m) => available(s, m) === 'yes' && !m.condition);
  const rank = (m: Member) => {
    const t = d.tasks[m.id] ?? 'camp';
    const base = t === 'camp' ? 0 : t === 'rest' ? 1 : t === 'cut' ? 2 : 9;
    return base + (m.leader ? 10 : 0);
  };
  return fit
    .filter((m) => m.id !== 'blaxland' && rank(m) < 9 + 10 && (d.tasks[m.id] ?? 'camp') !== 'scout')
    .sort((a, b) => rank(a) - rank(b))
    .slice(0, n);
}

/**
 * Cut grass before leaving good grass behind: offered at a full-feed camp when the camp is about to
 * move somewhere poorer, or the ground already walked toward the flag has no good grass. What the
 * 1813 party did at the forest tract before going into the brush.
 */
export function grassOffer(s: GameState, d: Draft): Offer | null {
  if (s.leg !== 'out' || restDay(s) || !d.target) return null;
  const camp = s.map.nodes[s.camp]!;
  const herd = s.horses.filter(withParty).length;
  if (!herd || feedOf(camp.grass) !== 'full') return null;
  if (s.men.some((m) => d.tasks[m.id] === 'grass')) return null;
  const perNight = T.horses.night.grassLbPerHorse * herd;
  if (s.stores.grass >= 2 * perNight) return null;
  if (capacity(s) - loadLb(s.stores) < T.horses.night.grassLbPerHorse) return null;
  // Bare ground ahead: a camp with no feed at all before any good grass, on the ground already
  // walked toward the flag or where the camp is moving. Rushy grass alone is a slow loss, not this.
  const moving = d.moveTo ? s.map.nodes[d.moveTo]! : null;
  const ahead = walkedAhead(s, stepsToTarget(s.map, s.camp, d.target));
  const firstGood = ahead.findIndex((n) => feedOf(n.grass) === 'full');
  const bare = (firstGood < 0 ? ahead : ahead.slice(0, firstGood)).some((n) => feedOf(n.grass) === 'none') || (!!moving && feedOf(moving.grass) === 'none');
  if (!bare) return null;
  const hands = spareHands(s, d, 2);
  if (!hands.length) return null;
  const names = hands.map(nameOf).join(' and ');
  return {
    id: 'grass',
    text: `No feed for the horses on the ground walked ahead. On 17 May 1813 the party loaded the horses “with as much grass as could be put on them” before going into the brush.`,
    action: moving ? `Stay here and cut grass: ${names}` : `Cut grass here: ${names}`,
    apply: (x) => {
      const tasks = { ...x.tasks };
      for (const m of hands) tasks[m.id] = 'grass';
      return { ...x, tasks, moveTo: null, advance: false };
    },
  };
}

function inTen(p: number): string {
  return `about ${Math.max(1, Math.round(p * 10))} in 10`;
}

/**
 * Hunt when the food will not see the party home with days to spare, from a camp where hunting is
 * good (forest or grass). On the way home that means halting for the half.
 */
export function huntOffer(s: GameState, d: Draft): Offer | null {
  const home = s.leg === 'home';
  const camp = home || !d.moveTo ? s.camp : d.moveTo;
  const r = runway(s, camp);
  if (!r.foodShort || s.stores.shots < 1) return null;
  if (s.men.some((m) => d.tasks[m.id] === 'hunt' && (!home || d.halt))) return null;
  if (huntHabitat(s.map, camp) !== 'good') return null;
  const fit = s.men.filter((m) => available(s, m) === 'yes' && !m.condition);
  const hunter = fit.find((m) => m.id === 'burne') ?? spareHands(s, d, 1)[0];
  if (!hunter) return null;
  const p = huntOdds(s, hunter, camp);
  const days = Math.floor(r.foodDays + 1e-9);
  const poor = T.hunting.man.poor * (hunter.id === 'burne' ? T.hunting.burneFactor : 1);
  const who = hunter.id === 'burne' ? 'Burne' : 'A hunter';
  return {
    id: 'hunt',
    text: `Food for about ${days} day${days === 1 ? '' : 's'}; home is about ${r.homeDays}. ${who} brings in a kangaroo ${inTen(p)} half-days from a camp like this, ${inTen(poor)} in brush, heath or swamp.`,
    action: home ? `Halt and send ${nameOf(hunter)} hunting` : `Send ${nameOf(hunter)} hunting`,
    apply: (x) => ({ ...x, halt: home ? true : x.halt, tasks: { ...x.tasks, [hunter.id]: 'hunt' } }),
  };
}
