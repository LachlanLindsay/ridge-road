// Map building and graph helpers. The map is a tree rooted at the Nepean ford: every node but the
// ford has one parent segment, so the path between any two nodes is unique.
import { MAP_DATA, T, modeTuning, regionSpec, terrainSpec, type NodeSpec, type RegionSpec } from './data';
import { between, chance, pickIndex, pickWeighted, shuffle, type RngHolder } from './rng';
import type { GameMap, MapNode, Mode, RegionId, Segment, Stores, Terrain, Zone } from './types';

export const EPS = 1e-6;

export interface Step {
  seg: string;
  /** 'out' walks a to b (away from the ford); 'in' walks b to a. */
  dir: 'out' | 'in';
}

const round3 = (v: number) => Math.round(v * 1000) / 1000;
const quarter = (v: number) => Math.max(0.25, Math.round(v * 4) / 4);

function makeNode(spec: NodeSpec, x: number, y: number, region: RegionId, parentSeg: string | null, routeMiles: number): MapNode {
  const n: MapNode = {
    id: spec.id,
    x: round3(x),
    y: round3(y),
    region,
    water: spec.water,
    grass: spec.grass,
    parentSeg,
    childSegs: [],
    routeMiles: round3(routeMiles),
    known: false,
    reached: false,
  };
  if (spec.gullyFt !== undefined) n.gullyFt = spec.gullyFt;
  if (spec.feature !== undefined) n.feature = spec.feature;
  if (spec.label !== undefined) n.label = spec.label;
  if (spec.card !== undefined) n.card = spec.card;
  if (spec.view) n.view = true;
  if (spec.feature === 'rockStep') n.stepHours = 0;
  if (spec.feature === 'pass') n.searchHours = 0;
  return n;
}

function makeSegment(id: string, a: string, b: string, miles: number, terrain: Terrain, region: RegionId, isRoute: boolean): Segment {
  return {
    id,
    a,
    b,
    miles,
    terrain,
    region,
    state: 'unknown',
    visible: false,
    farKnown: false,
    markedMiles: 0,
    clearedMiles: 0,
    isRoute,
  };
}

/** Build the 1813 map for one run: the fixed true route plus this run's decoys. */
export function buildMap(h: RngHolder, mode: Mode): GameMap {
  const md = MAP_DATA;
  const nodes: Record<string, MapNode> = {};
  const segments: Record<string, Segment> = {};
  nodes[md.start.id] = makeNode(md.start, 0, 0, 1, null, 0);

  let x = 0;
  let y = 0;
  let miles = 0;
  let prev = md.start.id;
  for (const leg of md.route) {
    const region = regionSpec(leg.region);
    const run = leg.miles * region.straightness;
    const rad = (leg.bearing * Math.PI) / 180;
    x += run * Math.sin(rad);
    y += run * Math.cos(rad);
    miles += leg.miles;
    const segId = `s:${leg.to.id}`;
    const seg = makeSegment(segId, prev, leg.to.id, leg.miles, leg.terrain, leg.region, true);
    if (leg.oldTrack) seg.oldTrack = true;
    if (leg.pass) {
      seg.pass = true;
      seg.trenchHours = 0;
    }
    segments[segId] = seg;
    nodes[leg.to.id] = makeNode(leg.to, x, y, leg.region, segId, miles);
    nodes[prev]!.childSegs.push(segId);
    prev = leg.to.id;
  }
  const goal = prev;
  if (nodes[goal]!.feature !== 'goal') throw new Error('Route must end at the goal');

  const map: GameMap = { nodes, segments, start: md.start.id, goal, routeMiles: round3(miles) };

  // Decoys: forced ones first, then random hosts in each region up to its count.
  const delta = modeTuning(mode).decoyDelta;
  const used = new Set<string>();
  let counter = 0;
  const perRegion = new Map<RegionId, number>();
  for (const fd of md.forcedDecoys) {
    const host = nodes[fd.at];
    if (!host) throw new Error(`Forced decoy host ${fd.at} missing`);
    const allowed = Math.max(0, regionSpec(host.region).decoys + delta);
    if ((perRegion.get(host.region) ?? 0) >= allowed) continue;
    used.add(fd.at);
    perRegion.set(host.region, (perRegion.get(host.region) ?? 0) + 1);
    addDecoy(h, map, fd.at, regionSpec(host.region), { miles: fd.miles, bearing: fd.bearing, oldTrack: !!fd.oldTrack }, ++counter);
  }
  for (const region of md.regions) {
    if (region.decoys <= 0) continue;
    const want = Math.max(0, region.decoys + delta) - (perRegion.get(region.id) ?? 0);
    if (want <= 0) continue;
    const hosts = Object.values(nodes)
      .filter((n) => n.region === region.id && n.parentSeg && segments[n.parentSeg]!.isRoute)
      .filter((n) => n.feature !== 'pass' && n.feature !== 'goal' && n.feature !== 'ford')
      .filter((n) => !used.has(n.id))
      .map((n) => n.id);
    shuffle(h, hosts);
    for (const hostId of hosts.slice(0, want)) {
      used.add(hostId);
      addDecoy(h, map, hostId, region, { miles: region.decoyMiles, bearing: region.decoyBearing, oldTrack: false }, ++counter);
    }
  }

  // Branch order at a fork carries no information.
  for (const n of Object.values(nodes)) if (n.childSegs.length > 1) shuffle(h, n.childSegs);

  // Old-track segments are already blazed; they are found when reached.
  for (const seg of Object.values(segments)) {
    if (seg.oldTrack) {
      seg.markedMiles = seg.miles;
      if (isPassable(seg.terrain)) seg.clearedMiles = seg.miles;
    }
  }

  const start = nodes[map.start]!;
  start.known = true;
  start.reached = true;
  for (const c of start.childSegs) revealSegment(map, segments[c]!, false);
  return map;
}

interface DecoyRule {
  miles: [number, number];
  bearing: [number, number];
  oldTrack: boolean;
}

function addDecoy(h: RngHolder, map: GameMap, hostId: string, region: RegionSpec, rule: DecoyRule, index: number) {
  const host = map.nodes[hostId]!;
  const total = quarter(between(h, rule.miles[0], rule.miles[1]));
  const parts = total <= 1 ? 1 : total <= 2 ? 2 : 3;
  const base = between(h, rule.bearing[0], rule.bearing[1]);
  let x = host.x;
  let y = host.y;
  let prev = hostId;
  let sum = 0;
  for (let i = 0; i < parts; i++) {
    const last = i === parts - 1;
    const miles = last ? Math.max(0.25, round3(total - sum)) : quarter(total / parts);
    sum += miles;
    const terrain = pickWeighted(h, region.decoyTerrain) as Terrain;
    const bearing = base + between(h, -15, 15);
    const run = miles * MAP_DATA.decoyStraightness;
    x += run * Math.sin((bearing * Math.PI) / 180);
    y += run * Math.cos((bearing * Math.PI) / 180);
    const id = `d${region.id}-${index}-${i + 1}`;
    const spec: NodeSpec = {
      id,
      water: !last && chance(h, 0.3) ? 'rockHole' : 'none',
      grass: chance(h, 0.4) ? 'rushy' : 'none',
    };
    if (!last && chance(h, 0.5)) spec.gullyFt = 300 + 50 * pickIndex(h, 7);
    if (last) {
      spec.feature = 'precipice';
      spec.label = 'Precipice';
    }
    const segId = `s:${id}`;
    const seg = makeSegment(segId, prev, id, miles, terrain, region.id, false);
    if (rule.oldTrack && !last) seg.oldTrack = true;
    map.segments[segId] = seg;
    map.nodes[id] = makeNode(spec, x, y, region.id, segId, map.nodes[prev]!.routeMiles + miles);
    map.nodes[prev]!.childSegs.push(segId);
    prev = id;
  }
}

// ---------------------------------------------------------------- terrain and passability

export function isPassable(t: Terrain): boolean {
  return terrainSpec(t).passable;
}

export function zoneOf(region: RegionId): Zone {
  return regionSpec(region).zone;
}

export function trenchNeed(stores: Stores): number {
  return stores.hoe > 0 ? T.obstacles.trenchWorkerHoursHoe : T.obstacles.trenchWorkerHoursNoHoe;
}

export function trenchDone(seg: Segment, stores: Stores): boolean {
  return !seg.pass || (seg.trenchHours ?? 0) >= trenchNeed(stores) - EPS;
}

export function stepShifted(node: MapNode): boolean {
  return node.feature !== 'rockStep' || (node.stepHours ?? 0) >= T.obstacles.rockStepWorkerHours - EPS;
}

/** Horses can use this segment: cleared (or crossed unblazed), any trench dug, and no rock step in the way. */
export function horsePassable(map: GameMap, seg: Segment, stores: Stores): boolean {
  if (!seg.visible) return false;
  if (seg.pass && !seg.found) return false;
  const open = seg.clearedMiles >= seg.miles - EPS || !!seg.crossed;
  if (!open) return false;
  if (!trenchDone(seg, stores)) return false;
  return stepShifted(map.nodes[seg.a]!);
}

/** Miles from a that men can walk without blazing: blazed, or crossed by the party. */
export function walkedMiles(seg: Segment): number {
  return seg.crossed ? seg.miles : seg.markedMiles;
}

/** Miles from a open to horses: cleared, or passable ground the party crossed. */
export function openMiles(seg: Segment): number {
  return seg.crossed ? seg.miles : seg.clearedMiles;
}

export function huntHabitat(map: GameMap, id: string): 'good' | 'poor' {
  const n = map.nodes[id]!;
  if (n.grass === 'good' || n.grass === 'tall') return 'good';
  const touching = [n.parentSeg, ...n.childSegs].filter((x): x is string => !!x).map((x) => map.segments[x]!);
  return touching.some((seg) => terrainSpec(seg.terrain).hunt === 'good') ? 'good' : 'poor';
}

export function refreshState(seg: Segment) {
  seg.state = !seg.visible ? 'unknown' : seg.markedMiles >= seg.miles - EPS ? 'marked' : 'revealed';
}

export function revealSegment(map: GameMap, seg: Segment, farKnown: boolean) {
  seg.visible = true;
  if (farKnown) {
    seg.farKnown = true;
    map.nodes[seg.b]!.known = true;
  }
  refreshState(seg);
}

/** Set marked miles; passable ground counts as cleared once blazed. */
export function setMarked(seg: Segment, miles: number) {
  seg.markedMiles = Math.min(seg.miles, Math.max(seg.markedMiles, miles));
  if (seg.markedMiles > seg.miles - EPS) seg.markedMiles = seg.miles;
  if (isPassable(seg.terrain)) seg.clearedMiles = seg.markedMiles;
  refreshState(seg);
}

export function setCleared(seg: Segment, miles: number) {
  seg.clearedMiles = Math.min(seg.markedMiles, Math.max(seg.clearedMiles, miles));
  if (seg.clearedMiles > seg.miles - EPS) seg.clearedMiles = seg.miles;
}

// ---------------------------------------------------------------- paths

export function ancestors(map: GameMap, id: string): string[] {
  const out = [id];
  let n = map.nodes[id];
  while (n && n.parentSeg) {
    const a = map.segments[n.parentSeg]!.a;
    out.push(a);
    n = map.nodes[a];
  }
  return out;
}

/** Steps from one node to another along the tree. */
export function pathSteps(map: GameMap, from: string, to: string): Step[] {
  if (from === to) return [];
  const up = ancestors(map, from);
  const down = ancestors(map, to);
  const downSet = new Set(down);
  const lca = up.find((n) => downSet.has(n));
  if (!lca) throw new Error(`No path from ${from} to ${to}`);
  const steps: Step[] = [];
  for (const n of up) {
    if (n === lca) break;
    steps.push({ seg: map.nodes[n]!.parentSeg!, dir: 'in' });
  }
  const tail: Step[] = [];
  for (const n of down) {
    if (n === lca) break;
    tail.push({ seg: map.nodes[n]!.parentSeg!, dir: 'out' });
  }
  return steps.concat(tail.reverse());
}

/** Steps toward a target that is a node, or a segment (walked out to its far end). */
export function stepsToTarget(map: GameMap, from: string, target: string): Step[] {
  const seg = map.segments[target];
  if (seg) {
    if (from === seg.b) return [];
    const toA = pathSteps(map, from, seg.a);
    // Standing beyond the segment already: walk back to its near end only.
    if (toA.length && toA[toA.length - 1]!.seg === seg.id) return toA;
    return [...toA, { seg: seg.id, dir: 'out' }];
  }
  if (!map.nodes[target]) throw new Error(`Unknown target ${target}`);
  return pathSteps(map, from, target);
}

export function stepEnd(map: GameMap, step: Step): string {
  const seg = map.segments[step.seg]!;
  return step.dir === 'out' ? seg.b : seg.a;
}

export function pathMiles(map: GameMap, steps: Step[]): number {
  return steps.reduce((s, st) => s + map.segments[st.seg]!.miles, 0);
}

export function straightMiles(node: MapNode): number {
  return Math.hypot(node.x, node.y);
}

export function distance(a: MapNode, b: MapNode): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Segments touching a node that are on the map for the player (the hidden pass excluded). */
export function adjacentSegments(map: GameMap, id: string): Segment[] {
  const n = map.nodes[id]!;
  const out: Segment[] = [];
  if (n.parentSeg) out.push(map.segments[n.parentSeg]!);
  for (const c of n.childSegs) {
    const seg = map.segments[c]!;
    if (seg.pass && !seg.found) continue;
    out.push(seg);
  }
  return out;
}

/** Outgoing branches from a node that might still lead somewhere. */
export function openBranches(map: GameMap, id: string): Segment[] {
  return map.nodes[id]!.childSegs
    .map((c) => map.segments[c]!)
    .filter((seg) => seg.visible && !seg.deadEnd && !(seg.pass && !seg.found));
}

/**
 * Where scouts carry on past the end of their orders: the one unexplored branch ahead, or at a fork
 * the one branch Lawson reads as running on, if he is with them. Otherwise they stop and report.
 */
export function continuation(map: GameMap, id: string, lawson: boolean): Segment | null {
  const open = openBranches(map, id).filter((b) => !map.nodes[b.b]!.reached);
  if (open.length === 1) return open[0]!;
  if (!lawson || open.length < 2) return null;
  const runs = open.filter((b) => b.hint === 'runsOn');
  return runs.length === 1 ? runs[0]! : null;
}

/** Where cutters carry on past the end of their orders: the one blazed branch onward, if there is one. */
export function blazedContinuation(map: GameMap, id: string): Segment | null {
  const blazed = openBranches(map, id).filter((b) => walkedMiles(b) > EPS);
  return blazed.length === 1 ? blazed[0]! : null;
}

/** Nodes the horses can reach from the camp, with the steps to each. */
export function horseReach(map: GameMap, from: string, stores: Stores): Map<string, Step[]> {
  const out = new Map<string, Step[]>();
  out.set(from, []);
  const queue = [from];
  while (queue.length) {
    const id = queue.shift()!;
    const base = out.get(id)!;
    const n = map.nodes[id]!;
    const options: Step[] = [];
    if (n.parentSeg) options.push({ seg: n.parentSeg, dir: 'in' });
    for (const c of n.childSegs) options.push({ seg: c, dir: 'out' });
    for (const st of options) {
      const seg = map.segments[st.seg]!;
      const next = st.dir === 'out' ? seg.b : seg.a;
      if (out.has(next)) continue;
      if (!horsePassable(map, seg, stores)) continue;
      out.set(next, [...base, st]);
      queue.push(next);
    }
  }
  return out;
}
