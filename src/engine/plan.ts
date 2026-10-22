// Plan helpers and validatePlan: what the plan sheet warns about before Go.
import { T, terrainSpec } from './data';
import {
  EPS,
  horsePassable,
  horseReach,
  isPassable,
  openMiles,
  stepShifted,
  stepsToTarget,
  trenchDone,
  walkedMiles,
  type Step,
} from './map';
import { canWork, isAway, isBusy, itemWeight, loadLb, capacity, MEMBER_ORDER, round1 } from './party';
import type { GameState, HalfDayPlan, Item, MemberId, Task, Warning } from './types';

export type Assignment = Task | 'away' | 'busy';

export const FIELD_TASKS: Task[] = ['scout', 'cut', 'water', 'hunt'];
export const AT_CAMP_TASKS: Task[] = ['camp', 'rest', 'grass'];

export function assignments(s: GameState, plan: HalfDayPlan): Map<MemberId, Assignment> {
  const out = new Map<MemberId, Assignment>();
  for (const id of MEMBER_ORDER) {
    const m = s.men.find((x) => x.id === id)!;
    if (isAway(s, m)) out.set(id, 'away');
    else if (isBusy(s, m)) out.set(id, 'busy');
    else out.set(id, plan.tasks[id] ?? 'camp');
  }
  return out;
}

export function teamFor(s: GameState, plan: HalfDayPlan, task: Task) {
  const a = assignments(s, plan);
  return s.men.filter((m) => a.get(m.id) === task);
}

/** Hours this half offers before any camp move: dew and strayed horses come off the top. */
export function hoursAvailable(s: GameState): number {
  const dew = s.phase === 'morning' ? s.today.dewStart : 0;
  return Math.max(0, T.time.halfHours - dew - s.delayNext);
}

/** Hours a camp move takes along these steps. The descent is a fixed carry; the climb home is longer. */
export function moveHours(s: GameState, steps: Step[]): number {
  let h = 0;
  for (const st of steps) {
    const seg = s.map.segments[st.seg]!;
    if (seg.pass) h += st.dir === 'out' ? T.obstacles.descentHours : T.obstacles.ascentHours;
    else h += seg.miles / terrainSpec(seg.terrain).horseMph;
  }
  return h;
}

/** Miles from a node to where clearing stops on the way to a target (the cut front). */
export function cutFrontMiles(s: GameState, from: string, target: string): number {
  const map = s.map;
  let d = 0;
  for (const st of stepsToTarget(map, from, target)) {
    const seg = map.segments[st.seg]!;
    if (st.dir === 'in') {
      d += seg.miles;
      continue;
    }
    if (!stepShifted(map.nodes[seg.a]!)) return d;
    if (seg.pass && (!seg.found || !trenchDone(seg, s.stores))) return d;
    const open = openMiles(seg);
    if (open < seg.miles - EPS) return d + open;
    d += seg.miles;
  }
  return d;
}

/** Miles from a node to the first unblazed ground on the way to a target (the scout front). */
export function scoutFrontMiles(s: GameState, from: string, target: string): number {
  const map = s.map;
  let d = 0;
  for (const st of stepsToTarget(map, from, target)) {
    const seg = map.segments[st.seg]!;
    const walked = walkedMiles(seg);
    if (st.dir === 'out' && walked < seg.miles - EPS) return d + walked;
    d += seg.miles;
  }
  return d;
}

/** Marked ground not yet cleared between the cut front and the scout front. */
export function markedAhead(s: GameState, from: string, target: string): number {
  const map = s.map;
  let ahead = 0;
  for (const st of stepsToTarget(map, from, target)) {
    if (st.dir === 'in') continue;
    const seg = map.segments[st.seg]!;
    if (isPassable(seg.terrain)) {
      if (walkedMiles(seg) < seg.miles - EPS) break;
      continue;
    }
    ahead += Math.max(0, seg.markedMiles - seg.clearedMiles);
    if (seg.markedMiles < seg.miles - EPS) break;
  }
  return ahead;
}

/** Pounds the horses would carry after the plan's cache is left at camp. */
export function loadAfterCache(s: GameState, plan: HalfDayPlan): number {
  let lb = loadLb(s.stores);
  for (const [item, qty] of Object.entries(plan.cache ?? {}) as [Item, number][]) {
    if (item === 'campKit' || !qty || qty <= 0) continue;
    lb -= itemWeight(item, Math.min(qty, s.stores[item]));
  }
  return lb;
}

export function validTarget(s: GameState, target: string | undefined): boolean {
  if (!target) return false;
  const seg = s.map.segments[target];
  if (seg) return seg.visible && !(seg.pass && !seg.found);
  const node = s.map.nodes[target];
  return !!node && node.known;
}

const err = (code: string, text: string): Warning => ({ level: 'error', code, text });
const warn = (code: string, text: string): Warning => ({ level: 'warn', code, text });

export function validatePlan(s: GameState, plan: HalfDayPlan): Warning[] {
  const out: Warning[] = [];
  if (s.phase !== 'morning' && s.phase !== 'afternoon') return [err('phase', 'It is not time to plan a half-day.')];
  if (s.pending.length) return [err('pending', 'Answer the event card first.')];

  const a = assignments(s, plan);
  const byTask = (t: Task) => s.men.filter((m) => a.get(m.id) === t);

  if (s.leg === 'home') {
    if (!plan.halt && plan.moveTo) out.push(warn('home', 'On the way home the party follows its trail; camp moves are automatic.'));
    return out;
  }

  for (const m of s.men) {
    const t = a.get(m.id);
    if (!t || t === 'away' || t === 'busy') continue;
    if (FIELD_TASKS.includes(t) && !canWork(s, m)) {
      const why = m.condition === 'tooIll' ? 'is too ill to work' : 'is being kept at camp';
      out.push(err('unavailable', `${m.name} ${why}.`));
    }
  }

  const working = byTask('scout').length + byTask('cut').length;
  if (s.restToday && (working > 0 || plan.moveTo || plan.advance)) out.push(err('rest', 'Rest day: nobody moves, scouts or cuts.'));

  const scouts = byTask('scout');
  if (scouts.length && !scouts.some((m) => m.leader)) out.push(err('leader', 'A scouting team needs a leader: only leaders mark the trail.'));
  if (scouts.length > T.scouting.maxTeam) out.push(warn('scouts', `Only ${T.scouting.maxTeam} scout together; the rest add nothing.`));

  const needsTarget = scouts.length > 0 || byTask('cut').length > 0 || !!plan.advance;
  if (needsTarget && !validTarget(s, plan.target)) out.push(err('target', 'Pick a target on the map for scouts, cutters or the advance.'));

  let from = s.camp;
  let hours = hoursAvailable(s);
  const load = loadAfterCache(s, plan);
  const tooHeavy = load > capacity(s, true) + EPS;
  const moving = (plan.moveTo && plan.moveTo !== s.camp) || plan.advance;
  if (moving && tooHeavy) out.push(err('load', `Too much to carry: cache ${Math.ceil(load - capacity(s, true))} lb first.`));
  if (plan.moveTo && plan.moveTo !== s.camp) {
    const reach = horseReach(s.map, s.camp, s.stores);
    const steps = reach.get(plan.moveTo);
    if (!steps) out.push(err('move', 'The horses cannot reach that camp: the path is not cleared.'));
    else {
      const h = moveHours(s, steps);
      if (h > hours + EPS) out.push(err('move', `Moving camp there takes ${round1(h)} hours; only ${round1(hours)} are left this half.`));
      hours -= h;
      from = plan.moveTo;
    }
  }

  if (plan.advance && validTarget(s, plan.target)) {
    if (!s.men.some((m) => m.leader && canWork(s, m))) out.push(err('advance', 'Advancing needs a leader fit to blaze the trail.'));
    const steps = stepsToTarget(s.map, from, plan.target!);
    const next = steps.find((st) => {
      const seg = s.map.segments[st.seg]!;
      return !horsePassable(s.map, seg, s.stores);
    });
    if (next) {
      const seg = s.map.segments[next.seg]!;
      if (!isPassable(seg.terrain)) out.push(warn('advance', 'The next ground needs cutting; the advance will stop there.'));
    }
  }

  const present = s.men.filter((m) => {
    const t = a.get(m.id);
    return t === 'camp' || t === 'rest' || t === 'grass';
  });
  if (!present.length && s.horses.some((h) => h.leftAt === null)) out.push(warn('camp', 'Nobody minding camp: horses may stray.'));

  if (byTask('cut').length && validTarget(s, plan.target)) {
    const m = cutFrontMiles(s, from, plan.target!);
    if (m > 1.5) {
      const walk = (2 * m) / T.time.walkMph;
      out.push(warn('walk', `Work front is ${round1(m)} miles away: ${round1(walk)} hours of walking.`));
    }
    if (markedAhead(s, from, plan.target!) < EPS) out.push(warn('cut', 'Nothing marked to cut on the way to that target.'));
  }
  if (scouts.length && validTarget(s, plan.target)) {
    const m = scoutFrontMiles(s, from, plan.target!);
    if (m > 2) out.push(warn('walk', `Scouts walk ${round1(m)} miles before new ground: ${round1((2 * m) / T.time.walkMph)} hours.`));
  }

  const node = s.map.nodes[from]!;
  if (byTask('water').length) {
    if (node.water !== 'none') out.push(warn('water', 'This camp has water already.'));
    else if (!node.gullyFt) out.push(warn('water', 'No gully to fetch water from here.'));
  }
  if (byTask('hunt').length > s.stores.shots) out.push(err('hunt', 'Not enough powder and shot for every hunter.'));
  if (byTask('grass').length && (node.grass === 'none')) out.push(warn('grass', 'No grass to cut here.'));
  if (hours <= EPS && working > 0) out.push(warn('time', 'No time left this half for work after the move.'));
  return out;
}

export function planErrors(s: GameState, plan: HalfDayPlan): Warning[] {
  return validatePlan(s, plan).filter((w) => w.level === 'error');
}
