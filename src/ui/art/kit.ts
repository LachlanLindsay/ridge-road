// The engraver's kit: seeded noise, ridgelines, hatching, cliffs, sky, water and gum trees. Every
// function returns SVG path data in a scene's own units; the scenes colour it through CSS classes,
// so the same plate prints in ink on paper by day and in pale lines on dark paper by night.
import { makeRng } from '../../engine/rng';

export type Rng = () => number;
export const rng = (seed: number): Rng => makeRng(seed);
/** Path numbers to one decimal place: plenty at these sizes, and it keeps the markup small. */
export const f = (v: number) => (Math.round(v * 10) / 10).toString();
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

// ---------------------------------------------------------------- noise

/** Smooth value noise in [-1, 1], one lattice point per unit. */
export function noise1(seed: number): (x: number) => number {
  const r = rng(seed);
  const N = 512;
  const v = Array.from({ length: N }, () => r() * 2 - 1);
  return (x: number) => {
    const i = Math.floor(x);
    const t = x - i;
    const a = v[((i % N) + N) % N]!;
    const b = v[(((i + 1) % N) + N) % N]!;
    return a + (b - a) * t * t * (3 - 2 * t);
  };
}

/** Fractal noise: octaves of value noise, each half the size and half the strength. */
export function fbm(seed: number, octaves = 4): (x: number) => number {
  const layers = Array.from({ length: octaves }, (_, k) => noise1(seed * 131 + k * 17 + 1));
  let norm = 0;
  for (let k = 0; k < octaves; k++) norm += 0.5 ** k;
  return (x: number) => {
    let s = 0;
    for (let k = 0; k < octaves; k++) s += 0.5 ** k * layers[k]!(x * 2 ** k + k * 13.7);
    return s / norm;
  };
}

// ---------------------------------------------------------------- curves sampled along x

export interface Curve {
  x0: number;
  dx: number;
  y: number[];
}

export function curve(x0: number, x1: number, fn: (x: number) => number, dx = 1): Curve {
  const n = Math.ceil((x1 - x0) / dx) + 1;
  return { x0, dx, y: Array.from({ length: n }, (_, i) => fn(x0 + i * dx)) };
}

export const xEnd = (c: Curve) => c.x0 + (c.y.length - 1) * c.dx;

export function yAt(c: Curve, x: number): number {
  const p = (x - c.x0) / c.dx;
  const i = clamp(Math.floor(p), 0, c.y.length - 2);
  const t = clamp(p - i, 0, 1);
  return c.y[i]! + (c.y[i + 1]! - c.y[i]!) * t;
}

export function slopeAt(c: Curve, x: number, h = 3): number {
  return (yAt(c, x + h) - yAt(c, x - h)) / (2 * h);
}

/** Two passes of a moving average: a soft blur of the line. */
export function smooth(c: Curve, radius: number): Curve {
  const k = Math.max(1, Math.round(radius / c.dx));
  let y = c.y;
  for (let pass = 0; pass < 2; pass++) {
    const n = y.length;
    const pre = new Float64Array(n + 1);
    for (let i = 0; i < n; i++) pre[i + 1] = pre[i]! + y[i]!;
    y = y.map((_, i) => {
      const a = Math.max(0, i - k);
      const b = Math.min(n, i + k + 1);
      return (pre[b]! - pre[a]!) / (b - a);
    });
  }
  return { ...c, y };
}

export function shift(c: Curve, dy: number | ((x: number) => number)): Curve {
  return { ...c, y: c.y.map((y, i) => y + (typeof dy === 'number' ? dy : dy(c.x0 + i * c.dx))) };
}

// ---------------------------------------------------------------- land

export interface RidgeOpts {
  seed: number;
  x0: number;
  x1: number;
  /** Mean height of the skyline. */
  base: number;
  /** How far the skyline rises and falls. */
  amp: number;
  /** Width of its main swells. */
  scale: number;
  /** 0 to 1: how much the tops are planed flat. The Blue Mountains are a cut-down plateau. */
  plateau?: number;
  /** Rise per unit to the right. */
  tilt?: number;
  /** Notches where gullies cut back into the plateau. */
  gullies?: number;
  gullyDepth?: number;
  gullyWidth?: number;
}

export function ridgeLine(o: RidgeOpts): Curve {
  const n = fbm(o.seed, 4);
  const r = rng(o.seed ^ 0x5bd1);
  const gullies = Array.from({ length: o.gullies ?? 0 }, () => ({
    x: o.x0 + r() * (o.x1 - o.x0),
    w: (o.gullyWidth ?? 10) * (0.6 + r() * 0.8),
    d: (o.gullyDepth ?? o.amp * 0.5) * (0.5 + r() * 0.5),
  }));
  const flat = o.plateau ?? 0;
  return curve(o.x0, o.x1, (x) => {
    let v = n(x / o.scale);
    if (v > 0) v *= 1 - flat;
    let y = o.base - v * o.amp * 1.6 - (o.tilt ?? 0) * (x - o.x0);
    for (const g of gullies) {
      const t = (x - g.x) / g.w;
      if (Math.abs(t) < 1) y += g.d * (1 - t * t) ** 2;
    }
    return y;
  });
}

/**
 * A forest edge: small crowns packed along the skyline, some standing taller than the rest, so the
 * line reads as treetops. Returns the raised line, sampled finely enough to show the crowns; fill
 * between it and the ground for the dark band of the canopy.
 */
export function canopy(g: Curve, o: { seed: number; size: number; sparse?: number; from?: number; to?: number; tall?: number }): Curve {
  const r = rng(o.seed);
  const dx = Math.min(g.dx, Math.max(0.25, o.size * 0.3));
  const base = dx === g.dx ? g : curve(g.x0, xEnd(g), (x) => yAt(g, x), dx);
  const y = base.y.slice();
  const from = o.from ?? base.x0;
  const to = o.to ?? xEnd(base);
  const raise = (x: number, rad: number, height: number) => {
    const i0 = Math.max(0, Math.floor((x - rad - base.x0) / dx));
    const i1 = Math.min(y.length - 1, Math.ceil((x + rad - base.x0) / dx));
    for (let i = i0; i <= i1; i++) {
      const t = (base.x0 + i * dx - x) / rad;
      if (Math.abs(t) >= 1) continue;
      y[i] = Math.min(y[i]!, base.y[i]! - height * Math.sqrt(1 - t * t));
    }
  };
  let x = from - r() * o.size;
  while (x < to + o.size) {
    const rad = o.size * (0.35 + r() * 0.6);
    if (r() >= (o.sparse ?? 0)) {
      const tall = r() < (o.tall ?? 0.08);
      const height = o.size * (tall ? 1.3 + r() * 0.8 : 0.45 + r() * 0.6);
      raise(x, rad, height);
      // A tall tree's crown is a cluster: a second puff beside the first.
      if (tall) raise(x + rad * (r() < 0.5 ? -0.8 : 0.8), rad * 0.7, height * 0.8);
    }
    x += rad * (0.75 + r() * 0.6);
  }
  return { ...base, y };
}

export function linePath(c: Curve, from = c.x0, to = xEnd(c), step = c.dx): string {
  const out: string[] = [];
  for (let x = from; x <= to + 1e-6; x += step) out.push(`${out.length ? 'L' : 'M'}${f(x)} ${f(yAt(c, x))}`);
  return out.join('');
}

/** The shape under a skyline, down to `bottom`: filled with paper, it hides whatever lies behind. */
export function areaPath(c: Curve, bottom: number, from = c.x0, to = xEnd(c)): string {
  return `${linePath(c, from, to)}L${f(to)} ${f(bottom)}L${f(from)} ${f(bottom)}Z`;
}

/** The shape between two curves. */
export function bandPath(top: Curve, bottom: Curve, from = top.x0, to = xEnd(top)): string {
  const back: string[] = [];
  for (let x = to; x >= from - 1e-6; x -= bottom.dx) back.push(`L${f(x)} ${f(yAt(bottom, x))}`);
  return `${linePath(top, from, to)}${back.join('')}Z`;
}

// ---------------------------------------------------------------- hatching

export interface HatchOpts {
  seed: number;
  /** How far below the skyline the hatching reaches before it fades into haze. */
  depth: number;
  /** Spacing of the first lines under the skyline. */
  gap: number;
  /** Spacing grows by this share with each line. */
  growth?: number;
  first?: number;
  /** How strongly slopes facing away from the light (falling to the right) darken. */
  light?: number;
  /** Raise to darken the whole layer. */
  bias?: number;
  step?: number;
  /** Chance of a small break at each step, like a burin lifting. */
  breaks?: number;
  /** Lines are grouped in bands from the skyline down, so each band can be drawn lighter. */
  bands?: number;
  from?: number;
  to?: number;
}

/**
 * Lines that follow the skyline down the slope, relaxing as they go: close and continuous at the
 * crest, broken and only in shadow further down, so each ridge darkens at the top and fades below.
 */
export function contourHatch(c: Curve, o: HatchOpts): string[] {
  const r = rng(o.seed);
  const nz = noise1(o.seed + 3);
  const radii = [0, 1.5, 3, 6, 12, 24, 48];
  const blurred = radii.map((rad) => (rad ? smooth(c, rad) : c));
  const pick = (d: number) => {
    const want = d * 0.6;
    if (want < 0.75) return blurred[0]!;
    return blurred[clamp(Math.round(Math.log2(want / 1.5)) + 1, 1, radii.length - 1)]!;
  };
  const nb = o.bands ?? 3;
  const out: string[][] = Array.from({ length: nb }, () => []);
  const step = o.step ?? 2;
  const from = o.from ?? c.x0;
  const to = o.to ?? xEnd(c);
  let d = o.first ?? o.gap * 0.9;
  for (let i = 0; d < o.depth; i++) {
    const t = d / o.depth;
    const line = pick(d);
    const shadeLine = pick(Math.max(d, 8));
    const ph = r() * 500;
    const parts: string[] = [];
    let on = false;
    for (let x = from; x <= to + 1e-6; x += step) {
      const shade = 0.5 + (o.light ?? 1.2) * slopeAt(shadeLine, x, 4) + 0.32 * nz((x + ph) / 23);
      const visible = shade + (o.bias ?? 0) > t - 0.35 && r() > (o.breaks ?? 0.04);
      if (visible) {
        parts.push(`${on ? 'L' : 'M'}${f(x)} ${f(yAt(line, x) + d + 0.35 * nz((x + ph * 2) / 7))}`);
        on = true;
      } else on = false;
    }
    out[Math.min(nb - 1, Math.floor(t * nb))]!.push(parts.join(''));
    d += o.gap * (1 + (o.growth ?? 0.1) * i);
  }
  return out.map((b) => b.join(''));
}

/**
 * Diagonal strokes laid over the shadowed parts of a slope, between `top` (plus `from`) and `depth`
 * below it: the second, darker layer of an engraver's shading.
 */
export function slantHatch(c: Curve, o: { seed: number; depth: number; gap: number; angle?: number; light?: number; bias?: number; start?: number; from?: number; to?: number }): string {
  const r = rng(o.seed);
  const nz = noise1(o.seed + 9);
  const sm = smooth(c, 6);
  const a = ((o.angle ?? 62) * Math.PI) / 180;
  const ux = Math.cos(a);
  const uy = Math.sin(a);
  const from = o.from ?? c.x0;
  const to = o.to ?? xEnd(c);
  const top = Math.min(...c.y);
  const span = (yAt(c, to) - top + o.depth + 10) / uy;
  const parts: string[] = [];
  for (let x = from - span * ux; x <= to; x += o.gap * (0.85 + r() * 0.3)) {
    let on = false;
    for (let s = 0; s <= span; s += 1.5) {
      const px = x + s * ux;
      const py = top - 4 + s * uy;
      if (px < from || px > to) {
        on = false;
        continue;
      }
      const g = yAt(c, px);
      const below = py - g;
      const t = below / o.depth;
      const shade = 0.5 + (o.light ?? 1.4) * slopeAt(sm, px, 5) + 0.3 * nz(px / 19);
      const inside = below > (o.start ?? 1.5) && t < 1;
      const dark = shade + (o.bias ?? 0) > 0.62 + t * 0.3;
      if (inside && dark) {
        parts.push(`${on ? 'L' : 'M'}${f(px)} ${f(py)}`);
        on = true;
      } else on = false;
    }
  }
  return parts.join('');
}

export interface CliffOpts {
  seed: number;
  /** Tallest the cliff band gets. */
  height: number;
  /** -1 to 1: how much of the length is cliff rather than wooded slope. */
  cover?: number;
  gap?: number;
  /** Wooded ground left on top before the cliff begins. */
  cap?: number;
  from?: number;
  to?: number;
}

/**
 * A band of sandstone cliff under a plateau skyline: vertical strokes broken where the bedding runs,
 * closer together where the face turns from the light. Returns the strokes and the foot of the cliff.
 */
export function cliffFace(top: Curve, o: CliffOpts): { face: string; beds: string; foot: Curve } {
  const r = rng(o.seed);
  const body = fbm(o.seed + 11, 3);
  const grain = noise1(o.seed + 12);
  const turn = noise1(o.seed + 13);
  const cap = o.cap ?? 1.5;
  const hAt = (x: number) => {
    const v = body(x / 70) + (o.cover ?? 0.15);
    return v <= 0 ? 0 : o.height * Math.min(1, v * 2.4) * (0.78 + 0.22 * grain(x / 8));
  };
  const foot = curve(top.x0, xEnd(top), (x) => yAt(top, x) + cap + hAt(x), top.dx);
  const from = o.from ?? top.x0;
  const to = o.to ?? xEnd(top);
  const face: string[] = [];
  const stroke = (x: number) => {
    const h = hAt(x);
    if (h < 1.6) return;
    const yt = yAt(top, x) + cap;
    const yb = yt + h;
    let y = yt + r() * 0.6;
    while (y < yb - 0.8) {
      const y2 = Math.min(yb, y + 2.5 + r() * Math.max(3, h * 0.55));
      face.push(`M${f(x)} ${f(y)}L${f(x + (r() - 0.5) * 0.5)} ${f(y2)}`);
      y = y2 + 0.7 + r() * 1.3;
    }
  };
  for (let x = from; x <= to; ) {
    const g = (o.gap ?? 2.2) * (0.75 + r() * 0.5);
    stroke(x);
    // Where the face turns away from the light, a second stroke between.
    if (turn(x / 34) > 0.15) stroke(x + g * 0.5);
    x += g;
  }
  const beds: string[] = [];
  for (let k = 1; k <= 3; k++) {
    let x = from + r() * 8;
    while (x < to) {
      const len = 3 + r() * 9;
      const h = hAt(x);
      if (h > 5 && r() < 0.7) {
        const y = yAt(top, x) + cap + h * (k / 4 + (r() - 0.5) * 0.12);
        beds.push(`M${f(x)} ${f(y)}L${f(x + len)} ${f(y + (r() - 0.5) * 0.6)}`);
      }
      x += len + 3 + r() * 9;
    }
  }
  return { face: face.join(''), beds: beds.join(''), foot };
}

// ---------------------------------------------------------------- sky and water

export interface Ellipse {
  x: number;
  y: number;
  rx: number;
  ry: number;
}

/** Where a horizontal line at height y is cut by a set of ellipses, as merged [from, to] gaps. */
function gapsAt(y: number, shapes: Ellipse[]): [number, number][] {
  const gaps: [number, number][] = [];
  for (const e of shapes) {
    const t = (y - e.y) / e.ry;
    if (Math.abs(t) >= 1) continue;
    const hw = e.rx * Math.sqrt(1 - t * t);
    gaps.push([e.x - hw, e.x + hw]);
  }
  gaps.sort((a, b) => a[0] - b[0]);
  const merged: [number, number][] = [];
  for (const g of gaps) {
    const last = merged[merged.length - 1];
    if (last && g[0] <= last[1]) last[1] = Math.max(last[1], g[1]);
    else merged.push([g[0], g[1]]);
  }
  return merged;
}

/** Long dashes along y from `from` to `to`, skipping the gaps. */
function dashes(r: Rng, y: number, from: number, to: number, gaps: [number, number][], dash: [number, number], gap: [number, number], wob = 0): string {
  const out: string[] = [];
  let x = from - r() * dash[1];
  while (x < to) {
    const len = dash[0] + r() * (dash[1] - dash[0]);
    let a = Math.max(from, x);
    const b = Math.min(to, x + len);
    for (const g of gaps) {
      if (g[1] <= a || g[0] >= b) continue;
      if (g[0] > a) out.push(`M${f(a)} ${f(y + (r() - 0.5) * wob)}H${f(g[0])}`);
      a = Math.max(a, g[1]);
    }
    if (b > a + 0.4) out.push(`M${f(a)} ${f(y + (r() - 0.5) * wob)}H${f(b)}`);
    x += len + gap[0] + r() * (gap[1] - gap[0]);
  }
  return out.join('');
}

/**
 * An engraved sky: ruled lines, close at the top and opening out until they stop well above the
 * horizon, so the sky pales toward the ranges. Clouds are left white, with a few broken lines across
 * their shaded undersides.
 */
export function skyHatch(o: { seed: number; w: number; top?: number; horizon: number; gap?: number; clouds?: Ellipse[][]; reach?: number }): { bands: string[]; clouds: string } {
  const r = rng(o.seed);
  const top = o.top ?? 1;
  const shapes = (o.clouds ?? []).flat();
  const bands: string[][] = [[], [], []];
  const stop = top + (o.horizon - top) * (o.reach ?? 0.78);
  let y = top;
  for (let i = 0; y < stop; i++) {
    const t = (y - top) / Math.max(1, stop - top);
    bands[Math.min(2, Math.floor(t * 3))]!.push(dashes(r, y, 0, o.w, gapsAt(y, shapes), [24, 120], [1.5, 5 + 10 * t]));
    y += (o.gap ?? 2) * (1 + 1.6 * t * t);
  }
  // The shaded underside of each cloud: short lines across its lower part, inside its outline.
  const shade: string[] = [];
  for (const cloud of o.clouds ?? []) {
    const bottom = Math.max(...cloud.map((e) => e.y + e.ry));
    const height = bottom - Math.min(...cloud.map((e) => e.y - e.ry));
    for (let yy = bottom - height * 0.42; yy < bottom - 0.8; yy += 1.8) {
      const inside = gapsAt(yy, cloud);
      for (const [a, b] of inside) {
        const shrink = (b - a) * 0.12;
        const mask: [number, number][] = [];
        shade.push(dashes(r, yy, a + shrink, b - shrink, mask, [3, 14], [1.5, 4]));
      }
    }
  }
  return { bands: bands.map((b) => b.join('')), clouds: shade.join('') };
}

/** A bank of cloud as overlapping puffs, wide and flat. */
export function cloudBank(seed: number, x: number, y: number, w: number, h: number, puffs = 6): Ellipse[] {
  const r = rng(seed);
  const out: Ellipse[] = [];
  for (let i = 0; i < puffs; i++) {
    const t = puffs === 1 ? 0.5 : i / (puffs - 1);
    const rise = Math.sin(t * Math.PI);
    out.push({ x: x - w / 2 + t * w + (r() - 0.5) * w * 0.08, y: y - rise * h * 0.35 + (r() - 0.5) * h * 0.1, rx: (w / puffs) * (0.8 + r() * 0.5), ry: h * (0.3 + rise * 0.35 + r() * 0.12) });
  }
  return out;
}

/**
 * Still water: level dashes, closer near the far bank. Under the bank they turn dark where they
 * mirror it: `bank` is the far shore's skyline, reflected about the waterline `top`.
 */
export function waterHatch(o: { seed: number; from: number; to: number; top: number; bottom: number; gap: number; bank?: Curve; squash?: number; fade?: number }): { light: string; dark: string } {
  const r = rng(o.seed);
  const light: string[] = [];
  const dark: string[] = [];
  let y = o.top + o.gap * 0.6;
  while (y < o.bottom) {
    const t = (y - o.top) / (o.bottom - o.top);
    let x = o.from - r() * 20;
    while (x < o.to) {
      const len = 4 + r() * (8 + 30 * t);
      const a = Math.max(o.from, x);
      const b = Math.min(o.to, x + len);
      if (b > a) {
        const mid = (a + b) / 2;
        const depth = y - o.top;
        const mirrored = o.bank ? (o.top - yAt(o.bank, mid)) * (o.squash ?? 0.8) : 0;
        const fade = depth / Math.max(1, mirrored);
        const isDark = depth < mirrored && r() > fade * (o.fade ?? 0.7);
        (isDark ? dark : light).push(`M${f(a)} ${f(y)}H${f(b)}`);
      }
      x += len + 1.5 + r() * (3 + 9 * (1 - t));
    }
    y += o.gap * (1 + t * 1.2);
  }
  return { light: light.join(''), dark: dark.join('') };
}

// ---------------------------------------------------------------- growing things

/** Tufts of grass along a ground line. */
export function tufts(ground: Curve, o: { seed: number; from: number; to: number; every: number; h: number; blades?: number }): string {
  const r = rng(o.seed);
  const out: string[] = [];
  for (let x = o.from + r() * o.every; x < o.to; x += o.every * (0.5 + r())) {
    const y = yAt(ground, x) + 0.6;
    const n = (o.blades ?? 4) + Math.floor(r() * 3);
    for (let i = 0; i < n; i++) {
      const lean = (i / Math.max(1, n - 1) - 0.5) * 1.4 + (r() - 0.5) * 0.4;
      const h = o.h * (0.55 + r() * 0.6);
      const ex = x + lean * h * 0.55;
      const ey = y - h;
      out.push(`M${f(x + (r() - 0.5))} ${f(y)}Q${f(x + lean * h * 0.15)} ${f(y - h * 0.6)} ${f(ex)} ${f(ey)}`);
    }
  }
  return out.join('');
}

export interface Gum {
  wood: string;
  leaves: string;
}

/** A tapered limb along a quadratic curve, as a closed outline. */
function taper(ax: number, ay: number, cx: number, cy: number, bx: number, by: number, w0: number, w1: number): string {
  const left: string[] = [];
  const right: string[] = [];
  for (let k = 0; k <= 6; k++) {
    const t = k / 6;
    const x = (1 - t) ** 2 * ax + 2 * (1 - t) * t * cx + t * t * bx;
    const y = (1 - t) ** 2 * ay + 2 * (1 - t) * t * cy + t * t * by;
    const dx = 2 * (1 - t) * (cx - ax) + 2 * t * (bx - cx);
    const dy = 2 * (1 - t) * (cy - ay) + 2 * t * (by - cy);
    const l = Math.hypot(dx, dy) || 1;
    const w = (w0 + (w1 - w0) * t) / 2;
    left.push(`${f(x - (dy / l) * w)} ${f(y + (dx / l) * w)}`);
    right.push(`${f(x + (dy / l) * w)} ${f(y - (dx / l) * w)}`);
  }
  return `M${left.join('L')}L${right.reverse().join('L')}Z`;
}

/**
 * A eucalypt: a long, slightly crooked trunk forking into upswept limbs, with leaves hanging in
 * loose clumps at the ends, so the crown stays open the way gum crowns do.
 */
export function gumTree(o: { seed: number; x: number; y: number; h: number; lean?: number; spread?: number; leaf?: number; depth?: number; density?: number }): Gum {
  const r = rng(o.seed);
  const wood: string[] = [];
  const leaves: string[] = [];
  const leafLen = o.leaf ?? Math.max(1.4, o.h * 0.024);
  const maxDepth = o.depth ?? (o.h > 90 ? 4 : o.h > 40 ? 3 : 2);
  const gauss = () => (r() + r() + r() - 1.5) / 1.5;
  const leaf = (px: number, py: number, a: number, len: number) => {
    const qx = px + Math.cos(a) * len;
    const qy = py + Math.sin(a) * len;
    const w = len * 0.22;
    const mx = (px + qx) / 2;
    const my = (py + qy) / 2;
    const nx = -Math.sin(a) * w;
    const ny = Math.cos(a) * w;
    leaves.push(`M${f(px)} ${f(py)}Q${f(mx + nx)} ${f(my + ny)} ${f(qx)} ${f(qy)}Q${f(mx - nx)} ${f(my - ny)} ${f(px)} ${f(py)}Z`);
  };
  // Twigs fan out from the end of a limb, each with a tuft of leaves hanging from it.
  const clump = (x: number, y: number, size: number) => {
    const twigs = 4 + Math.floor(r() * 4);
    for (let t = 0; t < twigs; t++) {
      const a = -Math.PI / 2 + (r() - 0.5) * 2.6;
      const len = size * (0.35 + r() * 0.5);
      const tx = x + Math.cos(a) * len;
      const ty = y + Math.sin(a) * len * 0.75;
      wood.push(taper(x, y, (x + tx) / 2, (y + ty) / 2 - len * 0.1, tx, ty, Math.max(0.25, size * 0.035), 0.18));
      const n = Math.round((9 + size * 0.6) * (o.density ?? 1));
      for (let i = 0; i < n; i++) {
        const px = tx + gauss() * size * 0.24;
        const py = ty + gauss() * size * 0.14 - size * 0.04;
        leaf(px, py, Math.PI / 2 + (r() - 0.5) * 1.3, leafLen * (0.7 + r() * 0.6));
      }
    }
  };
  const limb = (x: number, y: number, ang: number, len: number, w: number, depth: number) => {
    const bend = (r() - 0.5) * 0.7;
    const end = ang + bend * 0.6;
    const ex = x + Math.sin(end) * len;
    const ey = y - Math.cos(end) * len;
    const cx = x + Math.sin(ang + bend) * len * 0.5;
    const cy = y - Math.cos(ang + bend) * len * 0.5;
    const w1 = w * 0.64;
    wood.push(taper(x, y, cx, cy, ex, ey, depth === 0 ? w * 1.25 : w, w1));
    if (depth >= maxDepth || w1 < 0.28) {
      clump(ex, ey, len * 0.95);
      return;
    }
    const n = depth === 0 ? 2 + (r() < 0.55 ? 1 : 0) : 2 + (r() < 0.3 ? 1 : 0);
    for (let i = 0; i < n; i++) {
      const side = n === 3 && i === 2 ? 0 : i % 2 === 0 ? -1 : 1;
      const spread = (0.28 + r() * 0.42) * side * (o.spread ?? 1);
      // Limbs sweep up: each child turns back toward the vertical a little.
      limb(ex, ey, end * 0.6 + spread, len * (0.56 + r() * 0.18), w1 * (side === 0 ? 0.8 : 1), depth + 1);
    }
    if (depth >= 1 && r() < 0.6) clump(x + (ex - x) * 0.75, y + (ey - y) * 0.75, len * 0.5);
  };
  limb(o.x, o.y, o.lean ?? 0, o.h * 0.46, o.h * 0.05, 0);
  return { wood: wood.join(''), leaves: leaves.join('') };
}

/** Thin columns of smoke from fires far below, bending with the wind and thinning as they rise. */
export function smoke(o: { seed: number; x: number; y: number; h: number; drift?: number }): string[] {
  const r = rng(o.seed);
  const bands: string[][] = [[], [], []];
  for (let i = 0; i < 3; i++) {
    const x0 = o.x + (i - 1) * 0.6;
    const drift = (o.drift ?? 0.35) * o.h * (0.85 + r() * 0.3);
    const wob = o.h * 0.05;
    const spread = (i - 1) * o.h * 0.1;
    const ph = r() * 6;
    for (let k = 0; k < 18; k++) {
      const t0 = k / 18;
      const t1 = (k + 1) / 18;
      if (r() < 0.04 + t0 * 0.22) continue;
      const at = (t: number) => `${f(x0 + drift * t * t + Math.sin(t * 6 + ph) * wob * t + spread * t)} ${f(o.y - o.h * t)}`;
      bands[Math.min(2, Math.floor(t0 * 3))]!.push(`M${at(t0)}L${at((t0 + t1) / 2)}L${at(t1)}`);
    }
  }
  return bands.map((b) => b.join(''));
}

/** A grass tree: a short black trunk, a fountain of fine leaves, and a tall flower spike. */
export function grassTree(o: { seed: number; x: number; y: number; h: number; spike?: boolean }): { trunk: string; leaves: string; spike: string } {
  const r = rng(o.seed);
  const th = o.h * 0.38;
  const tw = o.h * 0.07;
  const top = o.y - th;
  const trunk = `M${f(o.x - tw)} ${f(o.y)}L${f(o.x - tw * 0.8)} ${f(top)}L${f(o.x + tw * 0.8)} ${f(top)}L${f(o.x + tw)} ${f(o.y)}Z`;
  const leaves: string[] = [];
  const n = 46;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI / 2 + (i / (n - 1) - 0.5) * Math.PI * 1.25 + (r() - 0.5) * 0.12;
    const len = o.h * (0.34 + r() * 0.14) * (1 - Math.abs(i / (n - 1) - 0.5) * 0.35);
    const ex = o.x + Math.cos(a) * len;
    const ey = top + Math.sin(a) * len * 0.8;
    // Leaves arch over and droop at the tips.
    const cx = o.x + Math.cos(a) * len * 0.55;
    const cy = top + Math.sin(a) * len * 0.8 - len * 0.18;
    leaves.push(`M${f(o.x + (r() - 0.5) * tw)} ${f(top + 0.5)}Q${f(cx)} ${f(cy)} ${f(ex)} ${f(ey + len * 0.22)}`);
  }
  const spike = o.spike === false ? '' : `M${f(o.x)} ${f(top - o.h * 0.1)}L${f(o.x + o.h * 0.03)} ${f(top - o.h * 0.95)}`;
  return { trunk, leaves: leaves.join(''), spike };
}
