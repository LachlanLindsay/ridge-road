// The survey plot drawn the way the plates are engraved: ruled haze over country the party has
// not seen, the cover along each ridge (brush to be cut, open forest, heath, swamp, rock), cliff
// lines where the ridges break off, and water. Pure: path data in map units for the current view,
// sized in screen pixels so the marks keep their weight at any zoom.
import type { Terrain } from '../engine';
import type { Bounds, MapDraw, NodeDraw, P, SegDraw } from './geometry';

const f = (v: number) => (Math.round(v * 1000) / 1000).toString();

/** A stable number in [0, 1) from integers, so the same patch of map always gets the same marks. */
export function hash(a: number, b: number, c = 0): number {
  let h = Math.imul(a | 0, 0x27d4eb2d) ^ Math.imul(b | 0, 0x165667b1) ^ Math.imul(c | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

// ---------------------------------------------------------------- the Nepean

/** The river past the ford, the one stretch of country the party already knows (y = -north). */
export const NEPEAN = 'M0.55 7.5 C0.35 6.2 0.05 5.4 0.2 4.3 S0.45 2.6 0.25 1.5 S0.02 0.4 0.14 -0.4 S0.4 -1.8 0.3 -3 S0.05 -4.6 0.2 -5.8 S0.5 -7 0.4 -8.5';

/** The river's course as points, south to north, from its curve. */
export const NEPEAN_PTS: P[] = (() => {
  const t = NEPEAN.match(/[MCS]|-?[0-9.]+/g)!;
  let i = 0;
  const num = () => Number(t[i++]);
  const pts: P[] = [];
  let cur: P = { x: 0, y: 0 };
  let c2: P = cur;
  const bez = (p1: P, p2: P, p3: P) => {
    for (let k = 1; k <= 10; k++) {
      const s = k / 10;
      const u = 1 - s;
      pts.push({ x: u * u * u * cur.x + 3 * u * u * s * p1.x + 3 * u * s * s * p2.x + s * s * s * p3.x, y: u * u * u * cur.y + 3 * u * u * s * p1.y + 3 * u * s * s * p2.y + s * s * s * p3.y });
    }
  };
  while (i < t.length) {
    const c = t[i++];
    if (c === 'M') {
      cur = { x: num(), y: num() };
      pts.push(cur);
    } else if (c === 'C' || c === 'S') {
      const p1 = c === 'C' ? { x: num(), y: num() } : { x: 2 * cur.x - c2.x, y: 2 * cur.y - c2.y };
      const p2 = { x: num(), y: num() };
      const p3 = { x: num(), y: num() };
      bez(p1, p2, p3);
      c2 = p2;
      cur = p3;
    }
  }
  return pts.sort((a, b) => a.y - b.y);
})();

/** Where the river runs at height y: the colony lies east of it. */
export function riverX(y: number): number {
  const pts = NEPEAN_PTS;
  if (y <= pts[0]!.y) return pts[0]!.x;
  for (let i = 1; i < pts.length; i++) {
    const a = pts[i - 1]!;
    const b = pts[i]!;
    if (y <= b.y) return a.x + ((b.x - a.x) * (y - a.y)) / Math.max(1e-9, b.y - a.y);
  }
  return pts[pts.length - 1]!.x;
}

// ---------------------------------------------------------------- haze

type Span = [number, number];

function merge(spans: Span[]): Span[] {
  spans.sort((a, b) => a[0] - b[0]);
  const out: Span[] = [];
  for (const s of spans) {
    const last = out[out.length - 1];
    if (last && s[0] <= last[1]) last[1] = Math.max(last[1], s[1]);
    else out.push([s[0], s[1]]);
  }
  return out;
}

/** What is left of [lo, hi] once the (merged, sorted) spans are taken out. */
function without(lo: number, hi: number, spans: Span[]): Span[] {
  const out: Span[] = [];
  let x = lo;
  for (const [a, b] of spans) {
    if (b <= x) continue;
    if (a >= hi) break;
    if (a > x) out.push([x, Math.min(a, hi)]);
    x = Math.max(x, b);
  }
  if (x < hi) out.push([x, hi]);
  return out;
}

/** Where the horizontal line at y passes within r of the segment a–b, or null. */
export function capsuleSpan(a: P, b: P, r: number, y: number): Span | null {
  let lo = Infinity;
  let hi = -Infinity;
  for (const c of [a, b]) {
    const dy = y - c.y;
    if (Math.abs(dy) <= r) {
      const w = Math.sqrt(r * r - dy * dy);
      lo = Math.min(lo, c.x - w);
      hi = Math.max(hi, c.x + w);
    }
  }
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  const L = Math.hypot(dx, dy);
  if (L > 1e-9) {
    // Between the ends: 0 ≤ t ≤ 1 along the segment and within r of its line, each linear in x.
    let xl = -Infinity;
    let xh = Infinity;
    const keep = (c1: number, c0: number, min: number, max: number) => {
      if (Math.abs(c1) < 1e-12) {
        if (c0 < min || c0 > max) {
          xl = Infinity;
          xh = -Infinity;
        }
        return;
      }
      let x1 = (min - c0) / c1;
      let x2 = (max - c0) / c1;
      if (x1 > x2) [x1, x2] = [x2, x1];
      xl = Math.max(xl, x1);
      xh = Math.min(xh, x2);
    };
    keep(dx / (L * L), (-a.x * dx + (y - a.y) * dy) / (L * L), 0, 1);
    keep(-dy / L, (a.x * dy + (y - a.y) * dx) / L, -r, r);
    if (xl <= xh) {
      lo = Math.min(lo, xl);
      hi = Math.max(hi, xh);
    }
  }
  return lo <= hi ? [lo, hi] : null;
}

export interface Haze {
  /** Ruled haze over country nobody in the party has seen. */
  far: string;
  /** Fainter, broken lines where the haze thins out toward known ground. */
  edge: string;
}

/** Spacing of the haze lines, in miles: a power of two, so the rules stay put as the map pans. */
export function hazeStep(k: number): number {
  return 2 ** Math.round(Math.log2(9 / k));
}

/**
 * The haze over unknown country: level lines like an engraved sky, stopping short of every ridge
 * the party knows and of the settled side of the Nepean. Lines sit on a grid in map units, so they
 * travel with the map; their spacing steps by doubling as the zoom changes.
 */
export function haze(draw: MapDraw, k: number, box: Bounds): Haze {
  const sw = hazeStep(k);
  const level = Math.round(Math.log2(sw));
  const rClear = Math.max(0.3, 4 * sw);
  const rEdge = rClear + Math.max(0.28, 4 * sw);
  const segs = draw.segs.map((s) => ({ a: s.a, b: s.b, y0: Math.min(s.a.y, s.b.y), y1: Math.max(s.a.y, s.b.y) }));
  const nodes = draw.nodes.map((n) => n.p).concat([draw.camp]);
  const cell = 26 * sw;
  const far: string[] = [];
  const edge: string[] = [];
  const dash = (j: number, [x0, x1]: Span, out: string[], gapsPerCell: number, y: number) => {
    // Breaks in the rule, fixed to the map: a few per cell, like a burin lifting.
    const gaps: Span[] = [];
    for (let c = Math.floor(x0 / cell); c <= Math.floor(x1 / cell); c++) {
      for (let g = 0; g < gapsPerCell; g++) {
        const at = (c + hash(j, c, level * 7 + g)) * cell;
        const w = sw * (1 + 2.2 * hash(c, j, level * 13 + g));
        gaps.push([at, at + w]);
      }
    }
    for (const [a, b] of without(x0, x1, merge(gaps))) if (b - a > sw * 0.6) out.push(`M${f(a)} ${f(y)}H${f(b)}`);
  };
  const j0 = Math.ceil(box.minY / sw);
  const j1 = Math.floor(box.maxY / sw);
  for (let j = j0; j <= j1; j++) {
    const y = j * sw;
    const clear: Span[] = [];
    const near: Span[] = [];
    for (const s of segs) {
      if (y < s.y0 - rEdge || y > s.y1 + rEdge) continue;
      const e = capsuleSpan(s.a, s.b, rEdge, y);
      if (!e) continue;
      near.push(e);
      const c = capsuleSpan(s.a, s.b, rClear, y);
      if (c) clear.push(c);
    }
    for (const p of nodes) {
      const dy = Math.abs(y - p.y);
      if (dy <= rEdge) near.push([p.x - Math.sqrt(rEdge * rEdge - dy * dy), p.x + Math.sqrt(rEdge * rEdge - dy * dy)]);
      if (dy <= rClear) clear.push([p.x - Math.sqrt(rClear * rClear - dy * dy), p.x + Math.sqrt(rClear * rClear - dy * dy)]);
    }
    // The colony's side of the river is known country.
    const bank = riverX(y) - 0.06;
    clear.push([bank, Infinity]);
    near.push([bank - (rEdge - rClear), Infinity]);
    const nearM = merge(near);
    for (const span of without(box.minX, box.maxX, nearM)) dash(j, span, far, 4, y);
    const clearM = merge(clear);
    for (const [a, b] of nearM) for (const span of without(Math.max(a, box.minX), Math.min(b, box.maxX), clearM)) dash(j, span, edge, 6, y);
  }
  return { far: far.join(''), edge: edge.join('') };
}

// ---------------------------------------------------------------- cover along the ridges

export const BRUSH: ReadonlySet<Terrain> = new Set<Terrain>(['scrub', 'thick', 'thorny']);

/** A row of crowns: a dotted stroke whose round dots are the bushes, in map units. */
export interface BrushRow {
  d: string;
  /** Stroke width: the size of a crown. */
  w: number;
  dash: string;
  /** Standing brush still across the ridge, or the brush left either side of a cut. */
  standing: boolean;
}

export interface Cover {
  /** Brush, stippled the way the plates draw treetops: rows of crowns right across the ridge where
   * it still stands, and either side of the road where it has been cut. */
  brush: BrushRow[];
  /** Rock to be shifted: boulders along and across the ridge. */
  rocks: string;
  /** Open forest: small gums standing beside the ridge. */
  gumWood: string;
  gumCrowns: string;
  /** Heath: low tufts. */
  heath: string;
  /** Grassy meadow, west of the range. */
  meadow: string;
  /** Swamp: the surveyor's marsh mark, level dashes under a tuft. */
  marsh: string;
}

interface Frame {
  a: P;
  u: P;
  n: P;
  len: number;
  /** Map units per screen pixel. */
  px: number;
}

function frame(s: SegDraw, k: number): Frame | null {
  const dx = s.b.x - s.a.x;
  const dy = s.b.y - s.a.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) return null;
  const u = { x: dx / len, y: dy / len };
  return { a: s.a, u, n: { x: -u.y, y: u.x }, len, px: 1 / k };
}

const at = (F: Frame, t: number, side: number): P => ({ x: F.a.x + F.u.x * t + F.n.x * side, y: F.a.y + F.u.y * t + F.n.y * side });

/** Small boulders: lumpy five-sided outlines. */
function boulder(c: P, r: number, seed: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2 + hash(seed, i) * 0.9;
    const rr = r * (0.7 + 0.5 * hash(i, seed, 3));
    pts.push(`${i ? 'L' : 'M'}${f(c.x + Math.cos(a) * rr)} ${f(c.y + Math.sin(a) * rr * 0.8)}`);
  }
  return `${pts.join('')}Z`;
}

/** A gum in the surveyor's convention for woodland: a short trunk and a crown of three puffs. */
function gum(base: P, px: number, seed: number): { wood: string; crown: string } {
  const h = (5 + 1.5 * hash(seed, 1)) * px;
  const top = { x: base.x, y: base.y - h };
  const lean = (hash(seed, 2) - 0.5) * 1.2 * px;
  const wood = `M${f(base.x)} ${f(base.y)}L${f(top.x + lean)} ${f(top.y + 1.2 * px)}`;
  const puff = (dx: number, dy: number, r: number) => {
    const cx = top.x + lean + dx * px;
    const cy = top.y + dy * px;
    const rr = r * px;
    return `M${f(cx - rr)} ${f(cy)}a${f(rr)} ${f(rr)} 0 1 0 ${f(2 * rr)} 0a${f(rr)} ${f(rr)} 0 1 0 ${f(-2 * rr)} 0Z`;
  };
  return { wood, crown: puff(-1.4, 0.4, 1.5) + puff(1.3, 0.2, 1.6) + puff(0, -1.1, 1.7) };
}

function tuft(base: P, px: number, h: number): string {
  const b = `${f(base.x)} ${f(base.y)}`;
  return `M${b}l${f(-1.1 * px)} ${f(-h * 0.8 * px)}M${b}l0 ${f(-h * px)}M${b}l${f(1.1 * px)} ${f(-h * 0.8 * px)}`;
}

/** Rows of brush, by offset from the ridge line and crown size, in pixels. */
const STANDING_ROWS = [
  { off: 0.4, w: 3.4, dash: [0.01, 3.3, 0.01, 4.6, 0.01, 2.6] },
  { off: -1.6, w: 2.6, dash: [0.01, 4.1, 0.01, 2.9] },
  { off: 2.6, w: 3.0, dash: [0.01, 2.7, 0.01, 4.4, 0.01, 3.4] },
  { off: -3.7, w: 3.2, dash: [0.01, 3.6, 0.01, 2.5, 0.01, 4.8] },
  { off: 4.9, w: 2.4, dash: [0.01, 3.9, 0.01, 2.8] },
  { off: -5.9, w: 2.1, dash: [0.01, 2.9, 0.01, 4.2, 0.01, 3.3] },
];
const CUT_ROWS = [
  { off: 3.7, w: 2.9, dash: [0.01, 2.7, 0.01, 4.4, 0.01, 3.4] },
  { off: -3.9, w: 3.1, dash: [0.01, 3.6, 0.01, 2.5, 0.01, 4.8] },
  { off: 5.6, w: 2.4, dash: [0.01, 3.9, 0.01, 2.8] },
  { off: -6.0, w: 2.1, dash: [0.01, 2.9, 0.01, 4.2, 0.01, 3.3] },
];

/** Marks for the cover along every ridge in view, under the ridge lines. */
export function cover(segs: SegDraw[], k: number, box: Bounds, seen: (s: SegDraw) => boolean = () => true): Cover {
  const rows = new Map<string, BrushRow & { parts: string[] }>();
  const row = (spec: (typeof STANDING_ROWS)[number], standing: boolean, px: number) => {
    const key = `${standing}:${spec.off}`;
    let r = rows.get(key);
    if (!r) {
      r = { d: '', w: spec.w * px, dash: spec.dash.map((v) => f(v * px)).join(' '), standing, parts: [] };
      rows.set(key, r);
    }
    return r;
  };
  const rocks: string[] = [];
  const gumWood: string[] = [];
  const gumCrowns: string[] = [];
  const heath: string[] = [];
  const meadow: string[] = [];
  const marsh: string[] = [];
  const m = 30 / k;
  for (const s of segs) {
    if (s.deadEnd || !seen(s)) continue;
    if (Math.max(s.a.x, s.b.x) < box.minX - m || Math.min(s.a.x, s.b.x) > box.maxX + m) continue;
    if (Math.max(s.a.y, s.b.y) < box.minY - m || Math.min(s.a.y, s.b.y) > box.maxY + m) continue;
    const F = frame(s, k);
    if (!F) continue;
    const px = F.px;
    const seed = hashId(s.id);
    // Leave the ends clear for the node marks.
    const t0 = Math.min(F.len * 0.5, 3.5 * px);
    const t1 = Math.max(t0, F.len - 3.5 * px);
    const cut = Math.max(t0, Math.min(t1, F.len * s.open));
    if (BRUSH.has(s.terrain)) {
      // Each row starts a little way in, by a different amount, so the crowns don't line up.
      const run = (specs: typeof STANDING_ROWS, standing: boolean, a: number, b: number) => {
        if (b - a < 1.5 * px) return;
        specs.forEach((spec, i) => {
          const jitter = hash(seed, i, standing ? 1 : 2) * 4.5 * px;
          const p = at(F, a + jitter, spec.off * px);
          const q = at(F, b, spec.off * px);
          row(spec, standing, px).parts.push(`M${f(p.x)} ${f(p.y)}L${f(q.x)} ${f(q.y)}`);
        });
      };
      run(STANDING_ROWS, true, cut, t1);
      run(CUT_ROWS, false, t0, cut);
    } else if (s.terrain === 'rocky') {
      const step = 4.2 * px;
      let i = 0;
      for (let t = t0; t < t1; t += step, i++) {
        const blocked = t > cut;
        const sides = blocked ? [-3.4, 0, 3.4] : [-4.6, 4.6];
        for (const sd of sides) {
          if (hash(seed, i, Math.round(sd)) < (blocked ? 0.25 : 0.35)) continue;
          rocks.push(boulder(at(F, t + (hash(i, seed) - 0.5) * 1.6 * px, (sd + (hash(seed + 1, i) - 0.5) * 1.4) * px), 1.4 * px, seed * 31 + i * 7 + sd));
        }
      }
    } else if (s.terrain === 'openForest') {
      const step = 15 * px;
      let i = 0;
      for (let t = t0 + step * 0.4; t < t1; t += step, i++) {
        const side = i % 2 ? 1 : -1;
        const g = gum(at(F, t, side * 7.5 * px), px * 1.2, seed + i);
        gumWood.push(g.wood);
        gumCrowns.push(g.crown);
      }
    } else if (s.terrain === 'heath' || s.terrain === 'meadow') {
      const step = (s.terrain === 'heath' ? 8 : 11) * px;
      let i = 0;
      for (let t = t0 + step * 0.5; t < t1; t += step, i++) {
        const side = i % 2 ? 1 : -1;
        (s.terrain === 'heath' ? heath : meadow).push(tuft(at(F, t, side * 6 * px), px, s.terrain === 'heath' ? 3 : 4.2));
      }
    } else if (s.terrain === 'swamp') {
      const step = 13 * px;
      let i = 0;
      for (let t = t0 + step * 0.5; t < t1; t += step, i++) {
        const side = i % 2 ? 1 : -1;
        const c = at(F, t, side * 7 * px);
        marsh.push(`M${f(c.x - 2.6 * px)} ${f(c.y)}h${f(5.2 * px)}M${f(c.x - 1.5 * px)} ${f(c.y + 1.7 * px)}h${f(3 * px)}` + tuft({ x: c.x, y: c.y - 0.6 * px }, px, 2.6));
      }
    }
  }
  const brush = [...rows.values()].map(({ parts, ...r }) => ({ ...r, d: parts.join('') }));
  return { brush, rocks: rocks.join(''), gumWood: gumWood.join(''), gumCrowns: gumCrowns.join(''), heath: heath.join(''), meadow: meadow.join(''), marsh: marsh.join('') };
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (Math.imul(h, 31) + id.charCodeAt(i)) | 0;
  return h;
}

// ---------------------------------------------------------------- cliffs

/**
 * A cliff line across the end of a ridge: an edge bowed outward with short strokes falling away
 * beyond it, the plan-view way to draw a precipice. `half` is its half-length in pixels, `gap` a
 * break in the middle in pixels, for a pass.
 */
export function cliffLine(c: P, dir: P, px: number, half: number, gap = 0, seed = 1): { edge: string; face: string } {
  const n = { x: -dir.y, y: dir.x };
  const edge: string[] = [];
  const face: string[] = [];
  const step = 2.1;
  const bow = half * 0.18;
  const point = (s: number) => {
    const t = s / half;
    const out = bow * (1 - t * t) + (hash(seed, Math.round(s * 3)) - 0.5) * 0.5;
    return { x: c.x + n.x * s * px + dir.x * out * px, y: c.y + n.y * s * px + dir.y * out * px };
  };
  const runs: Span[] = gap > 0 ? [[-half, -gap], [gap, half]] : [[-half, half]];
  for (const [s0, s1] of runs) {
    const pts: string[] = [];
    for (let s = s0; s <= s1 + 1e-6; s += 1) {
      const p = point(Math.min(s, s1));
      pts.push(`${pts.length ? 'L' : 'M'}${f(p.x)} ${f(p.y)}`);
    }
    edge.push(pts.join(''));
    let i = 0;
    for (let s = s0 + step / 2; s < s1; s += step, i++) {
      const t = Math.abs(s) / half;
      const len = (3.4 + 3 * (1 - t * t)) * (0.75 + 0.5 * hash(seed, i, 5));
      const p = point(s);
      face.push(`M${f(p.x + dir.x * 0.8 * px)} ${f(p.y + dir.y * 0.8 * px)}l${f(dir.x * len * px)} ${f(dir.y * len * px)}`);
    }
  }
  return { edge: edge.join(''), face: face.join('') };
}

// ---------------------------------------------------------------- water and grass

/** A swamp head: a small pool with rushes at its edge. */
export function swampMark(c: P, px: number, big = false): { pool: string; lines: string; rushes: string } {
  const rx = (big ? 6 : 4.6) * px;
  const ry = (big ? 2.8 : 2.2) * px;
  const pool = `M${f(c.x - rx)} ${f(c.y)}a${f(rx)} ${f(ry)} 0 1 0 ${f(2 * rx)} 0a${f(rx)} ${f(ry)} 0 1 0 ${f(-2 * rx)} 0Z`;
  const lines = `M${f(c.x - rx * 0.55)} ${f(c.y - ry * 0.25)}h${f(rx * 1.1)}M${f(c.x - rx * 0.3)} ${f(c.y + ry * 0.45)}h${f(rx * 0.7)}`;
  const rushes = tuft({ x: c.x - rx * 0.95, y: c.y - ry * 0.35 }, px, 3.6) + tuft({ x: c.x + rx * 0.9, y: c.y - ry * 0.25 }, px, 3);
  return { pool, lines, rushes };
}

/** A stream: a short run of ripples. */
export function streamMark(c: P, px: number): string {
  const w = 3.2 * px;
  const a = 1.4 * px;
  return `M${f(c.x - 1.5 * w)} ${f(c.y)}q${f(w / 4)} ${f(-a)} ${f(w / 2)} 0t${f(w / 2)} 0t${f(w / 2)} 0t${f(w / 2)} 0t${f(w / 2)} 0t${f(w / 2)} 0` + `M${f(c.x - 1.1 * w)} ${f(c.y + 2.6 * px)}q${f(w / 4)} ${f(-a)} ${f(w / 2)} 0t${f(w / 2)} 0t${f(w / 2)} 0t${f(w / 2)} 0`;
}

/** A rock hole: a little pool held in a hollow of stone. */
export function rockHoleMark(c: P, px: number): { rock: string; pool: string } {
  return { rock: boulder(c, 3.6 * px, 7), pool: `M${f(c.x - 1.6 * px)} ${f(c.y)}a${f(1.6 * px)} ${f(1.2 * px)} 0 1 0 ${f(3.2 * px)} 0a${f(1.6 * px)} ${f(1.2 * px)} 0 1 0 ${f(-3.2 * px)} 0Z` };
}

/** Grass for the horses: one tuft, or two for tall grass. */
export function grassMark(c: P, px: number, tall: boolean): string {
  return tuft(c, px, 5) + (tall ? tuft({ x: c.x + 3.4 * px, y: c.y + 0.4 * px }, px, 4.2) : '');
}

// ---------------------------------------------------------------- labels

export interface Rect {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

/** One place a label may go: its anchor in screen pixels and the box its text covers. */
export interface LabelOption {
  x: number;
  y: number;
  anchor: 'start' | 'middle' | 'end';
  box: Rect;
}

export interface LabelItem {
  id: string;
  text: string;
  size: number;
  /** The marks this label belongs to: its own point's marks do not push it away. */
  owner?: string;
  /** Places to try, best first. */
  options: LabelOption[];
  /** Leave the label off rather than pile it on others. */
  optional?: boolean;
}

export interface PlacedLabel extends LabelOption {
  id: string;
  text: string;
  size: number;
  /** Which of its places it took, so the next frame can keep it there. */
  option: number;
}

const overlap = (a: Rect, b: Rect) => Math.max(0, Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)) * Math.max(0, Math.min(a.y1, b.y1) - Math.max(a.y0, b.y0));

/**
 * Place labels so they do not sit on each other or on the marks: each takes the first of its
 * places that is clear, or the least crowded one. An optional label that finds no clear place is
 * left off.
 *
 * `last` holds the place each label took on the previous frame: a label stays there while that
 * place is still clear, so panning does not flip labels from side to side.
 */
export function placeLabels(items: LabelItem[], obstacles: (Rect & { owner?: string })[], bounds?: Rect, last?: Map<string, number>): PlacedLabel[] {
  const placed: (Rect & { owner?: string })[] = [...obstacles];
  const out: PlacedLabel[] = [];
  for (const it of items) {
    if (!it.options[0]) continue;
    const scoreOf = (o: LabelOption) => {
      let score = 0;
      for (const r of placed) if (!(it.owner && r.owner === it.owner)) score += overlap(o.box, r);
      // Text off the edge of the map is worse than text over another mark.
      if (bounds) score += 4 * ((o.box.x1 - o.box.x0) * (o.box.y1 - o.box.y0) - overlap(o.box, bounds));
      return score;
    };
    let bestI = 0;
    let bestScore = Infinity;
    const prev = last?.get(it.id);
    if (prev !== undefined && it.options[prev] && scoreOf(it.options[prev]) === 0) {
      bestI = prev;
      bestScore = 0;
    } else {
      for (let i = 0; i < it.options.length; i++) {
        const score = scoreOf(it.options[i]!);
        if (score < bestScore - 1e-6) {
          bestI = i;
          bestScore = score;
        }
        if (score === 0) break;
      }
    }
    const best = it.options[bestI]!;
    const area = (best.box.x1 - best.box.x0) * (best.box.y1 - best.box.y0);
    if (it.optional && bestScore > area * 0.12) continue;
    placed.push(best.box);
    out.push({ ...best, id: it.id, text: it.text, size: it.size, option: bestI });
    last?.set(it.id, bestI);
  }
  return out;
}

/** The labels a node gets on the map: generic ones are left to the water mark that says the same. */
export function mapLabel(n: NodeDraw): string | undefined {
  return n.label === 'Swamp head' || n.label === 'Precipice' ? undefined : n.label;
}
