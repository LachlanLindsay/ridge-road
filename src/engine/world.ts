// What happens when scouts or the party reach a node: fog lifts, Lawson reads the ground,
// cliffs end branches, lookouts open the view.
import { CARDS, T, modeTuning } from './data';
import { adjacentSegments, distance, refreshState, revealSegment, straightMiles } from './map';
import { clamp } from './party';
import { chance } from './rng';
import type { GameState, PendingEvent, Segment } from './types';

/** Working context for one engine call: the state being changed and the lines it reports. */
export interface Ctx {
  s: GameState;
  lines: string[];
  events: PendingEvent[];
}

export function say(ctx: Ctx, text: string) {
  ctx.lines.push(text);
}

export function addMorale(s: GameState, delta: number) {
  s.morale = clamp(s.morale + delta, 0, T.morale.max);
}

export function unlockCard(ctx: Ctx, card: string) {
  if (ctx.s.cards.includes(card)) return;
  ctx.s.cards.push(card);
  const title = CARDS[card]?.title ?? card;
  say(ctx, `Journal card: ${title}.`);
}

export type Stop = 'deadEnd' | 'goal' | 'cliff' | null;

function makeHint(s: GameState, seg: Segment) {
  const fallsAway = !seg.isRoute;
  const right = chance(s, modeTuning(s.mode).hintAccuracy);
  seg.hint = right === fallsAway ? 'fallsAway' : 'runsOn';
  seg.hintRight = right;
}

function resolveHint(seg: Segment) {
  if (seg.hint) seg.hintResolved = true;
}

/** Mark the branch ending at this precipice as a dead end, as far back as is known. */
export function markDeadEnd(ctx: Ctx, precipiceId: string, foundByScouts: boolean) {
  const { s } = ctx;
  const map = s.map;
  const node = map.nodes[precipiceId]!;
  if (foundByScouts) {
    addMorale(s, T.morale.deadEnd);
    s.stats.deadEnds += 1;
    say(ctx, 'Dead end: the ridge breaks off in cliffs.');
  }
  let segId = node.parentSeg;
  while (segId) {
    const seg = map.segments[segId]!;
    if (seg.deadEnd) break;
    seg.deadEnd = true;
    resolveHint(seg);
    const a = map.nodes[seg.a]!;
    if (!a.reached || a.id === map.start || a.feature === 'pass' || a.feature === 'goal') break;
    const allDead = a.childSegs.every((c) => map.segments[c]!.deadEnd);
    if (!allDead) break;
    segId = a.parentSeg;
  }
}

/** Reveal the country around a lookout: everything within the radius, plus one more segment with Lawson. */
export function revealAround(ctx: Ctx, id: string, lawson: boolean) {
  const map = ctx.s.map;
  const origin = map.nodes[id]!;
  const r = T.lookout.radiusMiles;
  const seen = new Set([id]);
  const queue = [id];
  while (queue.length) {
    const cur = queue.shift()!;
    for (const seg of adjacentSegments(map, cur)) {
      const other = seg.a === cur ? seg.b : seg.a;
      if (seen.has(other)) continue;
      seen.add(other);
      const on = map.nodes[other]!;
      const within = distance(origin, on) <= r;
      if (within || lawson) {
        revealSegment(map, seg, true);
        if (on.feature === 'precipice' && !seg.deadEnd) markDeadEnd(ctx, other, false);
        if (within) queue.push(other);
      } else {
        revealSegment(map, seg, false);
      }
    }
  }
}

export function useLookout(ctx: Ctx, id: string, lawson: boolean) {
  const { s } = ctx;
  const node = s.map.nodes[id]!;
  if (node.lookoutUsed) return;
  if (s.weather === 'cloud') {
    say(ctx, 'Cloud hides the view from the lookout.');
    return;
  }
  node.lookoutUsed = true;
  revealAround(ctx, id, lawson);
  addMorale(s, T.morale.lookout);
  say(ctx, `From ${node.label ?? 'the lookout'} the ridges ahead show plainly.`);
  if (node.view && !s.viewSeen) {
    s.viewSeen = true;
    addMorale(s, T.morale.firstView);
    say(ctx, 'A view at last: open forest and grass below the cliffs to the west.');
  }
}

/** Scouts or the party reach a node. Returns why they must stop there, if they must. */
export function arriveAt(ctx: Ctx, id: string, lawson: boolean): Stop {
  const { s } = ctx;
  const map = s.map;
  const node = map.nodes[id]!;
  const first = !node.reached;
  node.reached = true;
  node.known = true;
  if (node.parentSeg) {
    const ps = map.segments[node.parentSeg]!;
    ps.visible = true;
    ps.farKnown = true;
    refreshState(ps);
  }
  s.furthestMiles = Math.max(s.furthestMiles, straightMiles(node));
  if (first) {
    for (const c of node.childSegs) {
      const seg = map.segments[c]!;
      if (seg.pass && !seg.found) continue;
      revealSegment(map, seg, false);
      if (lawson && !seg.hint) makeHint(s, seg);
    }
    if (node.card) unlockCard(ctx, node.card);
    if (node.feature === 'cairn') {
      addMorale(s, T.morale.cairn);
      say(ctx, 'The old cairn: a pile of stones the 1813 party took to mark an earlier explorer’s farthest point.');
    }
  }
  if (node.feature === 'precipice') {
    if (first) markDeadEnd(ctx, id, true);
    return 'deadEnd';
  }
  if (node.feature === 'lookout' || node.view) useLookout(ctx, id, lawson);
  if (node.feature === 'pass') {
    const pass = node.childSegs.map((c) => map.segments[c]!).find((g) => g.pass);
    if (pass && !pass.found) return 'cliff';
  }
  if (node.feature === 'goal') {
    if (first) say(ctx, 'The sugarloaf hill: open grass country beyond the range.');
    return 'goal';
  }
  return null;
}

/** The pass is found: the steep way down becomes a lead on the map. */
export function findPass(ctx: Ctx, cliffId: string, lawson: boolean) {
  const map = ctx.s.map;
  const node = map.nodes[cliffId]!;
  for (const c of node.childSegs) {
    const seg = map.segments[c]!;
    if (!seg.pass || seg.found) continue;
    seg.found = true;
    revealSegment(map, seg, false);
    if (lawson && !seg.hint) makeHint(ctx.s, seg);
    say(ctx, 'The scouts find a way down the cliffs: steep, but horses could go with a trench cut.');
  }
}

export function queueEvent(ctx: Ctx, ev: PendingEvent) {
  ctx.events.push(ev);
}
