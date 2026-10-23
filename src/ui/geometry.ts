// What the map shows, computed from the game state under fog of war. Pure: no DOM.
// Map units are straight-line miles; SVG y runs down, so north is up with y = -north.
import { EPS, T, isPassable, openMiles, walkedMiles, type Feature, type GameState, type Grass, type Terrain, type Water } from '../engine';

export interface P {
  x: number;
  y: number;
}

export interface SegDraw {
  id: string;
  a: P;
  /** The drawn end: the far node, or the end of a short stub when the far end is unexplored. */
  b: P;
  farKnown: boolean;
  /** Fraction of a→b open to the horses. */
  open: number;
  /** Fraction of a→b blazed or walked. */
  marked: number;
  /** Open to horses only because the party crossed it without blazing. */
  crossed: boolean;
  deadEnd: boolean;
  /** The first segment of a dead branch, where the cross-out goes. */
  deadRoot: boolean;
  /** The far end has not been reached: a lead to follow. */
  lead: boolean;
  hint?: 'fallsAway' | 'runsOn';
  hintMark?: 'right' | 'wrong';
  pass: boolean;
  terrain: Terrain;
  passable: boolean;
}

export interface NodeDraw {
  id: string;
  p: P;
  reached: boolean;
  feature?: Feature | 'cliff';
  label?: string;
  water?: Water;
  grass?: Grass;
  cache: boolean;
  horsesLeft: number;
  /** For cliff glyphs: unit vector of the ridge arriving here. */
  dir: P;
  /** At the top of the pass, once it is found: the way down. */
  passDir?: P;
  /** The trench down the pass is dug. */
  trench?: boolean;
  stepShifted?: boolean;
}

export interface Bounds {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

export interface MapDraw {
  nodes: NodeDraw[];
  segs: SegDraw[];
  bounds: Bounds;
  camp: P;
}

export const toSvg = (n: { x: number; y: number }): P => ({ x: n.x, y: -n.y });
const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

export function mapDraw(s: GameState): MapDraw {
  const map = s.map;
  const segs: SegDraw[] = [];
  const nodes: NodeDraw[] = [];
  const b: Bounds = { minX: Infinity, minY: Infinity, maxX: -Infinity, maxY: -Infinity };
  const grow = (p: P) => {
    b.minX = Math.min(b.minX, p.x);
    b.minY = Math.min(b.minY, p.y);
    b.maxX = Math.max(b.maxX, p.x);
    b.maxY = Math.max(b.maxY, p.y);
  };

  for (const seg of Object.values(map.segments)) {
    if (!seg.visible) continue;
    if (seg.pass && !seg.found) continue;
    const A = map.nodes[seg.a]!;
    const B = map.nodes[seg.b]!;
    if (!A.known) continue;
    const a = toSvg(A);
    const bTrue = toSvg(B);
    const dx = bTrue.x - a.x;
    const dy = bTrue.y - a.y;
    const len = Math.max(Math.hypot(dx, dy), 1e-6);
    const fWalk = clamp01(walkedMiles(seg) / seg.miles);
    const fOpen = clamp01(openMiles(seg) / seg.miles);
    const farKnown = seg.farKnown && B.known;
    let scale = 1;
    if (!farKnown) {
      // The far end is unknown: draw a stub a little past whatever has been marked.
      const markedLen = fWalk * len;
      let stub = Math.min(len * 0.85, Math.max(markedLen + 0.35, 0.45));
      stub = Math.max(stub, Math.min(len * 0.98, markedLen + 0.08));
      scale = stub / len;
    }
    const end = { x: a.x + dx * scale, y: a.y + dy * scale };
    const parent = A.parentSeg ? map.segments[A.parentSeg] : undefined;
    const draw: SegDraw = {
      id: seg.id,
      a,
      b: end,
      farKnown,
      open: clamp01(fOpen / scale),
      marked: clamp01(fWalk / scale),
      crossed: !!seg.crossed && seg.markedMiles < seg.miles - EPS,
      deadEnd: !!seg.deadEnd,
      deadRoot: !!seg.deadEnd && !parent?.deadEnd,
      lead: !B.reached,
      pass: !!seg.pass,
      terrain: seg.terrain,
      passable: isPassable(seg.terrain),
    };
    if (seg.hint) draw.hint = seg.hint;
    if (seg.hint && seg.hintResolved) draw.hintMark = seg.hintRight ? 'right' : 'wrong';
    segs.push(draw);
    grow(a);
    grow(end);
  }

  const horsesAt = new Map<string, number>();
  for (const h of s.horses) if (h.leftAt && !h.leftAt.startsWith('lost:')) horsesAt.set(h.leftAt, (horsesAt.get(h.leftAt) ?? 0) + 1);

  for (const n of Object.values(map.nodes)) {
    if (!n.known) continue;
    const p = toSvg(n);
    let dir: P = { x: 0, y: -1 };
    const ps = n.parentSeg ? map.segments[n.parentSeg] : undefined;
    if (ps) {
      const a = toSvg(map.nodes[ps.a]!);
      const l = Math.max(Math.hypot(p.x - a.x, p.y - a.y), 1e-6);
      dir = { x: (p.x - a.x) / l, y: (p.y - a.y) / l };
    }
    let feature: NodeDraw['feature'];
    if (n.feature === 'precipice') feature = n.reached || ps?.deadEnd ? 'precipice' : undefined;
    else if (n.feature === 'pass') feature = n.reached ? 'cliff' : undefined;
    else if (n.reached) feature = n.feature;
    const draw: NodeDraw = {
      id: n.id,
      p,
      reached: n.reached,
      cache: !!s.caches[n.id] && Object.keys(s.caches[n.id]!).length > 0,
      horsesLeft: horsesAt.get(n.id) ?? 0,
      dir,
    };
    if (feature) draw.feature = feature;
    if (n.reached && n.label) draw.label = n.label;
    if (n.reached) {
      draw.water = n.water;
      draw.grass = n.grass;
    }
    if (n.feature === 'rockStep' && n.reached) draw.stepShifted = (n.stepHours ?? 0) >= T.obstacles.rockStepWorkerHours - EPS;
    if (n.feature === 'pass' && n.reached) {
      const pass = n.childSegs.map((id) => map.segments[id]!).find((g) => g.pass && g.found);
      if (pass) {
        const q = toSvg(map.nodes[pass.b]!);
        const l = Math.max(Math.hypot(q.x - p.x, q.y - p.y), 1e-6);
        draw.passDir = { x: (q.x - p.x) / l, y: (q.y - p.y) / l };
        const need = s.stores.hoe > 0 ? T.obstacles.trenchWorkerHoursHoe : T.obstacles.trenchWorkerHoursNoHoe;
        draw.trench = (pass.trenchHours ?? 0) >= need - EPS;
      }
    }
    nodes.push(draw);
    grow(p);
  }

  const camp = toSvg(map.nodes[s.camp]!);
  grow(camp);
  return { nodes, segs, bounds: b, camp };
}

/** Distance from a point to the segment a→b. */
export function distToSeg(p: P, a: P, b: P): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const l2 = dx * dx + dy * dy;
  const t = l2 > 0 ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / l2)) : 0;
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
}

export function lerp(a: P, b: P, t: number): P {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}

/** Where the target flag stands: a node, or the drawn end of a segment. */
export function targetPoint(draw: MapDraw, target: string | null): P | null {
  if (!target) return null;
  const node = draw.nodes.find((n) => n.id === target);
  if (node) return node.p;
  const seg = draw.segs.find((g) => g.id === target);
  return seg ? seg.b : null;
}

/** Hachure spacing and length in screen pixels, by the cover on the ridge. Rougher ground, denser ticks. */
export const HATCH: Record<Terrain, { gap: number; len: number }> = {
  rocky: { gap: 3.5, len: 6.5 },
  thick: { gap: 4.5, len: 5 },
  thorny: { gap: 4.5, len: 5 },
  scrub: { gap: 5.5, len: 4.5 },
  heath: { gap: 8, len: 3.5 },
  swamp: { gap: 10, len: 3 },
  openForest: { gap: 12, len: 3 },
  meadow: { gap: 15, len: 2.5 },
};

/** Ticks either side of every ridge in view, as one path in map units, for the current zoom. */
export function hachurePath(segs: SegDraw[], k: number, view: Bounds): string {
  const m = 24 / k;
  const parts: string[] = [];
  const f = (v: number) => v.toFixed(3);
  for (const s of segs) {
    if (Math.max(s.a.x, s.b.x) < view.minX - m || Math.min(s.a.x, s.b.x) > view.maxX + m) continue;
    if (Math.max(s.a.y, s.b.y) < view.minY - m || Math.min(s.a.y, s.b.y) > view.maxY + m) continue;
    const dx = s.b.x - s.a.x;
    const dy = s.b.y - s.a.y;
    const len = Math.hypot(dx, dy);
    if (len < 1e-6) continue;
    const ux = dx / len;
    const uy = dy / len;
    const nx = -uy;
    const ny = ux;
    const h = HATCH[s.terrain];
    const step = h.gap / k;
    const L = h.len / k;
    const off = 3.4 / k;
    for (let t = step / 2; t < len; t += step) {
      const px = s.a.x + ux * t;
      const py = s.a.y + uy * t;
      if (px < view.minX - m || px > view.maxX + m || py < view.minY - m || py > view.maxY + m) continue;
      parts.push(`M${f(px + nx * off)} ${f(py + ny * off)}l${f(nx * L)} ${f(ny * L)}`);
      parts.push(`M${f(px - nx * off)} ${f(py - ny * off)}l${f(-nx * L)} ${f(-ny * L)}`);
    }
  }
  return parts.join('');
}
