// What a player can see and reasonably do next. Used by the plan sheet's suggestions and by the sim
// bots. Nothing here reads hidden truth (isRoute, hintRight).
import { EPS, horsePassable, horseReach, isPassable, openBranches, stepsToTarget, walkedMiles } from './map';
import { T } from './data';
import { hoursAvailable, moveHours, validTarget } from './plan';
import { canWork } from './party';
import type { GameState, Segment } from './types';

/** Stable pseudo-random number in [0, 1) for tie-breaks, so a suggestion does not flip-flop between halves. */
export function stableNoise(seed: number, key: string): number {
  let h = (seed ^ 0x2c1b3c6d) >>> 0;
  for (let i = 0; i < key.length; i++) {
    h = Math.imul(h ^ key.charCodeAt(i), 0x5bd1e995) >>> 0;
    h ^= h >>> 13;
  }
  h = Math.imul(h ^ (h >>> 15), 0x27d4eb2d) >>> 0;
  return (h >>> 0) / 4294967296;
}

/** Visible branches leading from explored ground into unexplored ground. */
export function leads(s: GameState): Segment[] {
  const map = s.map;
  return Object.values(map.segments).filter((seg) => {
    if (!seg.visible || seg.deadEnd) return false;
    if (seg.pass && !seg.found) return false;
    if (!map.nodes[seg.a]!.reached) return false;
    return !map.nodes[seg.b]!.reached;
  });
}

/** Where the party should be working toward: the goal once seen, a cliff to search, or the best lead. */
export function chooseTarget(s: GameState): string | null {
  const map = s.map;
  const goal = map.nodes[map.goal]!;
  if (goal.reached) return goal.id;
  for (const n of Object.values(map.nodes)) {
    if (n.feature !== 'pass' || !n.reached) continue;
    const pass = n.childSegs.map((c) => map.segments[c]!).find((g) => g.pass);
    if (pass && !pass.found) return n.id;
  }
  const options = leads(s);
  if (!options.length) return null;
  // Depth first: keep pushing the deepest line. Lawson's hints only rank branches at the same fork.
  const score = (seg: Segment) => {
    let v = map.nodes[seg.a]!.routeMiles;
    if (seg.hint === 'runsOn') v += 0.5;
    if (seg.hint === 'fallsAway') v -= 0.5;
    return v + 0.1 * stableNoise(s.seed, seg.id);
  };
  options.sort((x, y) => score(y) - score(x));
  return options[0]!.id;
}

/** The unexplored branches running on from a reached point. */
export function forkBranches(s: GameState, at: string): Segment[] {
  return openBranches(s.map, at).filter((b) => !s.map.nodes[b.b]!.reached);
}

/** A reached point the work cannot go past without choosing a branch: two or more unexplored ones. */
function isFork(s: GameState, id: string): boolean {
  const n = s.map.nodes[id];
  if (!n || !n.reached || n.feature === 'goal' || n.feature === 'precipice') return false;
  // At the cliff line the scouts search for the way down before anything else.
  if (n.feature === 'pass' && n.childSegs.some((c) => s.map.segments[c]!.pass && !s.map.segments[c]!.found)) return false;
  return forkBranches(s, id).length >= 2;
}

/**
 * The fork the work toward the flag has run into, which the player decides: the flag's far end is a
 * fork the scouts or the party have reached, or the flag is spent and the next lead starts at a fork.
 * Null when the way on is a single ridge, or the flag still has work to do short of a fork.
 */
export function forkAhead(s: GameState, target: string | null): string | null {
  const map = s.map;
  if (target && validTarget(s, target)) {
    const seg = map.segments[target];
    const end = seg ? (seg.deadEnd ? null : seg.b) : target;
    if (end && isFork(s, end)) return end;
    if (!targetSpent(s, target)) return null;
  }
  const next = chooseTarget(s);
  const lead = next ? map.segments[next] : undefined;
  return lead && isFork(s, lead.a) ? lead.a : null;
}

/** Lawson's pick at a fork: the branch he reads as running on; with equal readings, a guess. */
export function lawsonsPick(s: GameState, at: string): string | null {
  const score = (seg: Segment) => (seg.hint === 'runsOn' ? 0.5 : seg.hint === 'fallsAway' ? -0.5 : 0) + 0.1 * stableNoise(s.seed, seg.id);
  const options = forkBranches(s, at).sort((x, y) => score(y) - score(x));
  return options[0]?.id ?? null;
}

/** The furthest node the horses can reach on the way to the target within the hours this half allows. */
export function furthestReachable(s: GameState, target: string, maxHours = hoursAvailable(s)): string {
  let at = s.camp;
  let hours = 0;
  for (const st of stepsToTarget(s.map, s.camp, target)) {
    const seg = s.map.segments[st.seg]!;
    if (!horsePassable(s.map, seg, s.stores)) break;
    hours += moveHours(s, [st]);
    if (hours > maxHours + EPS) break;
    at = st.dir === 'out' ? seg.b : seg.a;
  }
  return at;
}

export function horseWater(s: GameState, id: string): boolean {
  const w = s.map.nodes[id]!.water;
  return w === 'swamp' || w === 'stream' || w === 'lagoon';
}

/** How much a night here costs the horses, in miles of progress a party would give up to avoid it. */
export function campPenalty(s: GameState, id: string): number {
  const n = s.map.nodes[id]!;
  const w = T.advice.campPenalty;
  let p = 0;
  if (n.water === 'none') p += w.noWater; // nobody drinks unless there is a gully to climb
  else if (!horseWater(s, id)) p += w.rockHole; // the men drink, the horses go without
  if (n.grass === 'none') p += w.noGrass;
  else if (n.grass === 'rushy') p += w.rushyGrass;
  return p;
}

/**
 * The camp on the way to the target: the furthest the horses can reach this half, unless a camp a
 * little short of it has water and grass that the furthest one lacks. Scored as miles gained less
 * what a dry or bare camp costs the horses, so the suggestion never walks the party past water
 * into a dry camp for the sake of half a mile.
 */
export function campChoice(s: GameState, target: string, maxHours = hoursAvailable(s)): string {
  const along: { id: string; miles: number }[] = [{ id: s.camp, miles: 0 }];
  let hours = 0;
  let miles = 0;
  for (const st of stepsToTarget(s.map, s.camp, target)) {
    const seg = s.map.segments[st.seg]!;
    if (!horsePassable(s.map, seg, s.stores)) break;
    hours += moveHours(s, [st]);
    if (hours > maxHours + EPS) break;
    miles += seg.miles;
    along.push({ id: st.dir === 'out' ? seg.b : seg.a, miles });
  }
  let best = along[along.length - 1]!;
  let bestScore = best.miles - campPenalty(s, best.id);
  for (let i = along.length - 2; i >= 0; i--) {
    const n = along[i]!;
    const score = n.miles - campPenalty(s, n.id);
    if (score > bestScore + EPS) {
      best = n;
      bestScore = score;
    }
  }
  return best.id;
}

/**
 * Is the next ground beyond the cleared path open country the whole party could push into,
 * without gambling the camp on one side of an unread fork?
 */
export function canAdvance(s: GameState, from: string, target: string): boolean {
  // Only a leader blazes: with every leader ill, kept at camp or away, nobody can lead the advance.
  if (!s.men.some((m) => m.leader && canWork(s, m))) return false;
  for (const st of stepsToTarget(s.map, from, target)) {
    const seg = s.map.segments[st.seg]!;
    if (horsePassable(s.map, seg, s.stores)) continue;
    if (st.dir === 'in' || seg.pass || seg.hint === 'fallsAway') return false;
    if (!isPassable(seg.terrain) || walkedMiles(seg) >= seg.miles - EPS) return false;
    // Never take the horses down one side of an unread fork: let the scouts settle it first.
    const forks = openBranches(s.map, seg.a).filter((b) => !s.map.nodes[b.b]!.reached).length;
    return forks <= 1;
  }
  return false;
}

/** The camp move worth offering this half: forward along the cleared path, or off a dead branch. */
export function suggestCampMove(s: GameState, target: string): string | null {
  const camp = s.map.nodes[s.camp]!;
  const stranded = !!camp.parentSeg && !!s.map.segments[camp.parentSeg]!.deadEnd;
  const reach = campChoice(s, target);
  if (reach === s.camp) return null;
  const gain = s.map.nodes[reach]!.routeMiles - camp.routeMiles;
  return stranded || gain > EPS ? reach : null;
}

/** A target is spent once there is nothing left to do toward it: a dead end, or open to the horses. */
export function targetSpent(s: GameState, target: string | null | undefined): boolean {
  if (!target || !validTarget(s, target)) return true;
  const map = s.map;
  const seg = map.segments[target];
  if (seg) {
    if (seg.deadEnd) return true;
    return map.nodes[seg.b]!.reached && horseReach(map, s.camp, s.stores).has(seg.b);
  }
  const node = map.nodes[target]!;
  if (node.id === map.goal) return false;
  if (node.feature === 'precipice' && node.reached) return true;
  if (node.feature === 'pass') {
    const pass = node.childSegs.map((c) => map.segments[c]!).find((g) => g.pass);
    if (pass && !pass.found) return false;
  }
  return node.reached && horseReach(map, s.camp, s.stores).has(node.id);
}
