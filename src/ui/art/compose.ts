// Building blocks for plates: sky, ranges of hills, gums, ledges, fires and camp things. Pure: every
// function pushes path data onto a list of marks, coloured by class (see the engravings section of
// styles.css), so scenes stay data and can be tested without a page.
import type { Mark, Pack, Slot } from './figures';
import {
  areaPath,
  bandPath,
  canopy,
  contourHatch,
  dashes,
  f,
  gapsAt,
  gumTree,
  linePath,
  plume,
  rng,
  shift,
  skyHatch,
  smoke,
  yAt,
  type Curve,
  type Ellipse,
  type HatchOpts,
} from './kit';

export interface Scene {
  w: number;
  h: number;
  marks: Mark[];
  /** Where the party's figures stand, when the scene has them. */
  slots?: Slot[];
  /** What each horse carries, first horse first, when the scene draws the party's loads. */
  loads?: Pack[];
}

/** Stroke weight of hatching, by tone from the far haze (0) to the foreground ink (4). */
export const TONE_W = [0.38, 0.44, 0.52, 0.6, 0.68];

export function sky(m: Mark[], o: { seed: number; w: number; horizon: number; clouds: Ellipse[][]; reach?: number }) {
  const s = skyHatch({ seed: o.seed, w: o.w, horizon: o.horizon, clouds: o.clouds, gap: 2, reach: o.reach });
  s.bands.forEach((d, i) => d && m.push({ d, c: `l1 o${i}`, w: 0.36 }));
  if (s.clouds) m.push({ d: s.clouds, c: 'l1 o1', w: 0.32 });
}

/**
 * One range of hills: paper to hide what lies behind, a band of treetops along the crest, contour
 * hatching that follows the ground down the slope, and the skyline itself.
 */
export function hills(m: Mark[], ground: Curve, bottom: number, tone: number, h: HatchOpts, crown?: number): Curve {
  const w = TONE_W[tone]!;
  if (crown) {
    const top = canopy(ground, { seed: h.seed + 500, size: crown });
    m.push({ d: areaPath(top, bottom), c: 'pp' });
    m.push({ d: bandPath(top, shift(ground, Math.max(0.6, crown * 0.55))), c: `f${tone}` });
    contourHatch(ground, { first: crown * 0.55 + h.gap, ...h }).forEach((d, i) => d && m.push({ d, c: `l${tone} o${i}`, w: w * (1 - i * 0.15) }));
    return top;
  }
  m.push({ d: areaPath(ground, bottom), c: 'pp' });
  contourHatch(ground, h).forEach((d, i) => d && m.push({ d, c: `l${tone} o${i}`, w: w * (1 - i * 0.15) }));
  m.push({ d: linePath(ground), c: `l${tone}`, w: w * 1.6 });
  return ground;
}

/** Smoke rising from a fire in the trees: a white plume over the hatching, a dark smudge at its foot. */
export function smokePlume(m: Mark[], o: { seed: number; x: number; y: number; h: number; drift?: number; tone?: number }) {
  const p = plume({ seed: o.seed, x: o.x, y: o.y, h: o.h, drift: o.drift });
  const tone = o.tone ?? 2;
  m.push({ d: p.body, c: 'pp' });
  m.push({ d: p.edge, c: `l${tone}`, w: 0.45 }, { d: p.curls, c: `l${Math.max(1, tone - 1)}`, w: 0.35 });
  const s = o.h * 0.05;
  m.push({ d: `M${f(o.x - s * 1.4)} ${f(o.y + s * 0.3)}Q${f(o.x)} ${f(o.y - s * 1.1)} ${f(o.x + s * 1.4)} ${f(o.y + s * 0.3)}Z`, c: `f${Math.min(4, tone + 1)}` });
}

export function gum(m: Mark[], o: Parameters<typeof gumTree>[0], tone = 4) {
  const g = gumTree(o);
  m.push({ d: g.wood, c: `f${tone}` }, { d: g.leaves, c: `f${tone}` });
}

/**
 * How far a ledge's top falls away near the edge it ends at, for a skyline that runs to `edgeX` and
 * a little past: nothing until `width` short of the edge, then the lip rounding over into a drop of
 * `height`. `side` 1 when the drop is on the ledge's right. Added to the skyline, it ends a ledge
 * in a shoulder of rock instead of a ruled vertical.
 */
export function fallAway(x: number, edgeX: number, side: 1 | -1, width: number, height: number): number {
  const t = side > 0 ? (x - (edgeX - width)) / width : (edgeX + width - x) / width;
  return t <= 0 ? 0 : Math.min(t, 1.6) ** 2.6 * height;
}

/**
 * The face under a ledge's rounded lip: broken, bedded sandstone falling away and leaning back under
 * the lip, darkest at the top and fading into the haze below. Draw after the ledge.
 */
export function brinkFace(m: Mark[], o: { seed: number; top: Curve; edgeX: number; side: 1 | -1; depth: number; bottom: number }) {
  const r = rng(o.seed);
  const { top, edgeX, side } = o;
  const strokes: string[][] = [[], [], []];
  const beds: string[] = [];
  // Vertical strokes along the shoulder, where the ground has turned steep, broken where beds run.
  for (let k = 0; k < 26; k++) {
    const x = edgeX - side * (k * 0.75 + r() * 0.4);
    const y0 = yAt(top, x) + 0.8;
    if (y0 > o.bottom - 2) continue;
    let y = y0;
    while (y < Math.min(o.bottom, y0 + o.depth)) {
      const len = 2 + r() * 5;
      const band = Math.min(2, Math.floor(((y - y0) / o.depth) * 3));
      if (r() > 0.18 + band * 0.18) strokes[band]!.push(`M${f(x)} ${f(y)}V${f(y + len)}`);
      y += len + 0.6 + r() * 1.6;
    }
  }
  // Bedding: short level ledges stepping back under the lip.
  for (let k = 0; k < 6; k++) {
    const y = yAt(top, edgeX - side * 8) + 3 + k * (o.depth / 7) + r() * 2;
    const x0 = edgeX - side * (14 + r() * 6);
    const x1 = edgeX - side * (1 + k * 0.6 + r() * 2);
    beds.push(`M${f(x0)} ${f(y)}L${f(x1)} ${f(y + 0.4)}`);
  }
  strokes.forEach((s, i) => s.length && m.push({ d: s.join(''), c: `l${4 - i} o${i}`, w: 0.5 - i * 0.06 }));
  m.push({ d: beds.join(''), c: 'l4 o1', w: 0.45 });
}

/**
 * Loose stones lying on open ground, from just under its skyline `ground` down to `bottom`: small
 * and close far off, larger near. Each is bare paper with a fine outline and a heavier stroke along
 * its shaded underside, so it sits on the hatching.
 */
export function stones(m: Mark[], o: { seed: number; ground: Curve; from: number; to: number; bottom: number; count: number; size: number }) {
  const r = rng(o.seed);
  const fill: string[] = [];
  const shade: string[] = [];
  for (let i = 0; i < o.count; i++) {
    const x = o.from + r() * (o.to - o.from);
    const t = r() ** 1.5;
    const g = yAt(o.ground, x) + 2.5;
    if (g > o.bottom - 2) continue;
    const y = g + t * (o.bottom - g);
    const s = (0.45 + t * 1.2) * o.size * (0.6 + r() * 0.8);
    const flat = 0.42 + r() * 0.22;
    const n = 6;
    const pts: [number, number][] = [];
    for (let k = 0; k < n; k++) {
      const a = Math.PI + (k / (n - 1)) * Math.PI;
      const rr = s * (0.75 + r() * 0.4);
      pts.push([x + Math.cos(a) * rr, y + Math.sin(a) * rr * flat]);
    }
    // The flat underside the stone rests on.
    const base = `${f(pts[n - 1]![0])} ${f(y + s * 0.12)}L${f(pts[0]![0])} ${f(y + s * 0.12)}`;
    fill.push(`M${pts.map(([px, py]) => `${f(px)} ${f(py)}`).join('L')}L${base}Z`);
    shade.push(`M${f(pts[0]![0] + s * 0.1)} ${f(y + s * 0.14)}L${f(pts[n - 1]![0] + s * 0.1)} ${f(y + s * 0.14)}L${f(pts[n - 2]![0])} ${f(pts[n - 2]![1])}`);
  }
  m.push({ d: fill.join(''), c: 'pk', w: 0.35 }, { d: shade.join(''), c: 'l4', w: 0.6 });
}

/** A rock ledge in the foreground: dark, hatched across, with grass along its lip. */
export function ledge(m: Mark[], top: Curve, bottom: number, seed: number) {
  m.push({ d: areaPath(top, bottom), c: 'pp' });
  contourHatch(top, { seed, depth: 34, gap: 1, growth: 0.05, bias: 0.45, light: 0.5 }).forEach((d, i) => d && m.push({ d, c: `l4 o${i}`, w: 0.6 }));
  m.push({ d: linePath(top), c: 'l4', w: 1 });
}

// ---------------------------------------------------------------- night and fire

/**
 * A night sky: ruled lines close together from the top of the plate down to `bottom`, opening a
 * little toward it, and broken around each glow (the light of a fire), so the fire lights its own
 * patch of the dark.
 */
export function nightSky(m: Mark[], o: { seed: number; w: number; bottom: number; glows?: Ellipse[]; gap?: number }) {
  const r = rng(o.seed);
  const bands: string[][] = [[], []];
  let y = 0.8;
  const gap = o.gap ?? 1.15;
  while (y < o.bottom) {
    const t = y / o.bottom;
    bands[t < 0.6 ? 0 : 1]!.push(dashes(r, y, 0, o.w, gapsAt(y, o.glows ?? []), [30, 140], [0.8, 2.4]));
    y += gap * (1 + 0.5 * t);
  }
  bands.forEach((b, i) => b.length && m.push({ d: b.join(''), c: i === 0 ? 'ln' : 'ln o1', w: 0.42 }));
}

/**
 * A camp fire on the ground at (x, y): a ring of stones, two crossed sticks, and flames. By night
 * the flames are left as paper, outlined; by day they are a few curling strokes. Smoke optional.
 */
export function campfire(m: Mark[], o: { seed: number; x: number; y: number; s: number; night?: boolean; smoke?: number; drift?: number; out?: boolean }) {
  const r = rng(o.seed);
  const { x, y, s } = o;
  const P = (dx: number, dy: number) => `${f(x + dx * s)} ${f(y + dy * s)}`;
  // Stones round the hearth.
  const stones: string[] = [];
  for (let i = 0; i < 6; i++) {
    const t = i / 5;
    const sx = -5.2 + t * 10.4 + (r() - 0.5) * 0.6;
    const rw = 1.1 + r() * 0.5;
    const rh = 0.7 + r() * 0.3;
    stones.push(`M${P(sx - rw, 0)}Q${P(sx - rw, -rh * 1.6)} ${P(sx, -rh * 1.6)}Q${P(sx + rw, -rh * 1.6)} ${P(sx + rw, 0)}Z`);
  }
  m.push({ d: stones.join(''), c: 'pk', w: 0.4 * s });
  // Sticks, crossed.
  m.push({ d: `M${P(-4.6, -0.6)}L${P(3.8, -3.2)}M${P(4.4, -0.5)}L${P(-3.6, -3.4)}M${P(-1, -0.4)}L${P(0.6, -3.8)}`, c: 'l4', w: 0.9 * s });
  if (!o.out) {
    // Flames: three tongues, the middle one tallest.
    const tongues: string[] = [];
    const inner: string[] = [];
    for (const [dx, h, lean] of [
      [-1.8, 5.2, -0.6],
      [0.2, 8.4, 0.5],
      [2, 5.8, 0.9],
    ] as const) {
      const w = 1.5 + h * 0.08;
      tongues.push(`M${P(dx - w, -1.6)}C${P(dx - w * 1.2, -1.6 - h * 0.5)} ${P(dx + lean - w * 0.3, -1.6 - h * 0.7)} ${P(dx + lean, -1.6 - h)}C${P(dx + lean + w * 0.2, -1.6 - h * 0.6)} ${P(dx + w * 1.2, -1.6 - h * 0.45)} ${P(dx + w, -1.6)}Z`);
      inner.push(`M${P(dx - w * 0.2, -2.2)}Q${P(dx + lean * 0.3, -1.6 - h * 0.35)} ${P(dx + lean * 0.6, -1.6 - h * 0.62)}`);
    }
    if (o.night) {
      m.push({ d: tongues.join(''), c: 'pk', w: 0.45 * s });
      m.push({ d: inner.join(''), c: 'l3', w: 0.35 * s });
    } else {
      m.push({ d: tongues.join(''), c: 'l4', w: 0.45 * s });
      m.push({ d: inner.join(''), c: 'l4', w: 0.35 * s });
    }
  }
  if (o.smoke) {
    smoke({ seed: o.seed + 7, x, y: y - (o.out ? 2 : 9) * s, h: o.smoke, drift: o.drift ?? 0.3 }).forEach((d, j) => d && m.push({ d, c: `ls o${j}`, w: 0.6 }));
  }
}

// ---------------------------------------------------------------- camp things

/** The camp kettle standing on the ground, its bail up. */
export function kettle(m: Mark[], x: number, y: number, s: number) {
  const P = (dx: number, dy: number) => `${f(x + dx * s)} ${f(y + dy * s)}`;
  m.push({ d: `M${P(-2.6, -4.6)}L${P(2.6, -4.6)}C${P(3.4, -3)} ${P(3.1, -0.4)} ${P(2, 0)}L${P(-2, 0)}C${P(-3.1, -0.4)} ${P(-3.4, -3)} ${P(-2.6, -4.6)}Z`, c: 'pk', w: 0.55 * s });
  m.push({ d: `M${P(-2.3, -4.6)}Q${P(0, -8.6)} ${P(2.3, -4.6)}M${P(2.7, -3.4)}L${P(4.6, -5.2)}M${P(-2.4, -3.6)}L${P(2.4, -3.6)}`, c: 'l4', w: 0.5 * s });
}

/** A cask on end, hooped; open, its dark inside shows. */
export function cask(m: Mark[], x: number, y: number, s: number, open = false) {
  const P = (dx: number, dy: number) => `${f(x + dx * s)} ${f(y + dy * s)}`;
  m.push({ d: `M${P(-4.4, -12)}C${P(-5.6, -8)} ${P(-5.6, -4)} ${P(-4.4, 0)}L${P(4.4, 0)}C${P(5.6, -4)} ${P(5.6, -8)} ${P(4.4, -12)}Z`, c: 'pk', w: 0.6 * s });
  m.push({ d: `M${P(-4.9, -9.4)}Q${P(0, -8.6)} ${P(4.9, -9.4)}M${P(-5.1, -2.8)}Q${P(0, -2)} ${P(5.1, -2.8)}M${P(-5.2, -6.6)}Q${P(0, -5.8)} ${P(5.2, -6.6)}`, c: 'l4', w: 0.5 * s });
  // Staves, shaded on the side away from the light.
  m.push({ d: `M${P(2.2, -11.6)}Q${P(3, -6)} ${P(2.2, -0.4)}M${P(3.4, -11.4)}Q${P(4.3, -6)} ${P(3.4, -0.6)}M${P(-1, -11.8)}Q${P(-1.2, -6)} ${P(-1, -0.2)}`, c: 'l3', w: 0.35 * s });
  if (open) m.push({ d: `M${P(-4.4, -12)}Q${P(0, -13.6)} ${P(4.4, -12)}Q${P(0, -10.6)} ${P(-4.4, -12)}Z`, c: 'f4' });
  else m.push({ d: `M${P(-4.4, -12)}Q${P(0, -13.4)} ${P(4.4, -12)}`, c: 'l4', w: 0.5 * s });
}

/** A felling axe lying on the ground, its head to the right. */
export function axeOnGround(m: Mark[], x: number, y: number, s: number, flip = false) {
  const d = flip ? -1 : 1;
  const P = (dx: number, dy: number) => `${f(x + d * dx * s)} ${f(y + dy * s)}`;
  m.push({ d: `M${P(-8, -0.6)}L${P(5.4, -1.4)}`, c: 'l4', w: 0.8 * s });
  m.push({ d: `M${P(5, -0.4)}L${P(7.6, -0.2)}L${P(8.4, -3.6)}L${P(5.4, -3.2)}Z`, c: 'f4' });
}

/** A musket lying on the ground. */
export function gunOnGround(m: Mark[], x: number, y: number, s: number) {
  const P = (dx: number, dy: number) => `${f(x + dx * s)} ${f(y + dy * s)}`;
  m.push({ d: `M${P(-9, -0.5)}L${P(9, -1.6)}`, c: 'l4', w: 0.6 * s });
  m.push({ d: `M${P(-9.6, -0.2)}L${P(-4.6, -0.8)}L${P(-4.4, -1.9)}L${P(-9.4, -1.6)}Z`, c: 'f4' });
}

/** A sack lying on its side, tied at the neck. */
export function sack(m: Mark[], x: number, y: number, s: number, flip = false) {
  const d = flip ? -1 : 1;
  const P = (dx: number, dy: number) => `${f(x + d * dx * s)} ${f(y + dy * s)}`;
  m.push({ d: `M${P(-5, 0)}C${P(-6.2, -3.4)} ${P(-3, -5.6)} ${P(0.6, -5)}C${P(3, -4.6)} ${P(4.4, -3.6)} ${P(5.2, -2.6)}L${P(7, -3.6)}L${P(7.4, -1.4)}L${P(5.4, -1.2)}C${P(4.6, -0.2)} ${P(2, 0.2)} ${P(-5, 0)}Z`, c: 'pk', w: 0.55 * s });
  m.push({ d: `M${P(-2.4, -4.6)}Q${P(-1.6, -2.4)} ${P(-2.6, -0.4)}M${P(5.2, -2.8)}L${P(5.4, -1.2)}`, c: 'l4', w: 0.4 * s });
}

/** A blanket roll on the ground. */
export function bedroll(m: Mark[], x: number, y: number, s: number) {
  const P = (dx: number, dy: number) => `${f(x + dx * s)} ${f(y + dy * s)}`;
  const R = f(1.8 * s);
  m.push({ d: `M${P(-6, -3.6)}L${P(6, -3.6)}A${R} ${R} 0 0 1 ${P(6, 0)}L${P(-6, 0)}A${R} ${R} 0 0 1 ${P(-6, -3.6)}Z`, c: 'pk', w: 0.5 * s });
  m.push({ d: `M${P(-2.6, -3.6)}L${P(-2.6, 0)}M${P(2.6, -3.6)}L${P(2.6, 0)}M${P(6, -3.6)}A${f(0.7 * s)} ${R} 0 0 0 ${P(6, 0)}`, c: 'l4', w: 0.4 * s });
}

/**
 * A heap of stones: rounded blocks stacked into a rough cone, each shaded on its lower right and
 * outlined, the way an engraver draws a cairn.
 */
export function stonePile(m: Mark[], o: { seed: number; x: number; y: number; w: number; h: number }) {
  const r = rng(o.seed);
  const blocks: string[] = [];
  const shade: string[] = [];
  const rows = Math.max(3, Math.round(o.h / 3.2));
  for (let k = 0; k < rows; k++) {
    const t = k / rows;
    const rowW = o.w * (1 - t * 0.82);
    const yb = o.y - (k * o.h) / rows;
    const sh = (o.h / rows) * (1.05 + r() * 0.2);
    let x = o.x - rowW / 2;
    while (x < o.x + rowW / 2 - 0.8) {
      const bw = Math.min(o.x + rowW / 2 - x, 2.2 + r() * 3.2);
      const x0 = x;
      const x1 = x + bw;
      const top = yb - sh;
      blocks.push(`M${f(x0 + 0.3)} ${f(yb)}C${f(x0 - 0.3)} ${f(yb - sh * 0.5)} ${f(x0 + 0.2)} ${f(top + 0.4)} ${f(x0 + bw * 0.4)} ${f(top)}C${f(x1 - 0.4)} ${f(top - 0.2)} ${f(x1 + 0.2)} ${f(top + sh * 0.4)} ${f(x1)} ${f(yb)}Z`);
      for (let hy = yb - sh * 0.45; hy < yb - 0.3; hy += 0.9) shade.push(`M${f(x0 + bw * 0.45)} ${f(hy)}L${f(x1 - 0.2)} ${f(hy - 0.2)}`);
      x = x1 + 0.1 + r() * 0.3;
    }
  }
  m.push({ d: blocks.join(''), c: 'pk', w: 0.45 });
  m.push({ d: shade.join(''), c: 'l3', w: 0.3 });
}

/** Tracks in soft ground: paired marks running along a line, a little apart, like a short-legged animal's. */
export function tracks(m: Mark[], o: { seed: number; pts: [number, number][]; every: number }) {
  const r = rng(o.seed);
  const out: string[] = [];
  for (let i = 0; i + 1 < o.pts.length; i++) {
    const [x0, y0] = o.pts[i]!;
    const [x1, y1] = o.pts[i + 1]!;
    const len = Math.hypot(x1 - x0, y1 - y0);
    for (let t = 0; t < len; t += o.every * (0.85 + r() * 0.3)) {
      const x = x0 + ((x1 - x0) * t) / len;
      const y = y0 + ((y1 - y0) * t) / len;
      const side = (Math.round(t / o.every) % 2 ? 1 : -1) * 0.7;
      out.push(`M${f(x - 0.5)} ${f(y + side)}h1`);
    }
  }
  m.push({ d: out.join(''), c: 'l4', w: 0.7 });
}

/** A low sun on the horizon: a half disc left white, with rays cut into the sky lines as gaps. */
export function sunGaps(x: number, y: number, r: number): Ellipse[] {
  return [{ x, y, rx: r, ry: r }];
}

/**
 * A distant gum, simplified: a crooked trunk forking into two or three upswept limbs, each ending in
 * loose clumps of leaves at different heights, so the crown stays open the way gum crowns do. A
 * fraction of a full gumTree's path data, for trees too small to show twigs.
 */
export function farGum(m: Mark[], o: { seed: number; x: number; y: number; h: number; tone?: number }) {
  const r = rng(o.seed);
  const { x, y, h } = o;
  const forkY = y - h * (0.38 + r() * 0.12);
  const forkX = x + (r() - 0.5) * h * 0.08;
  const trunk = `M${f(x - h * 0.035)} ${f(y)}Q${f(x + h * 0.02)} ${f((y + forkY) / 2)} ${f(forkX - h * 0.016)} ${f(forkY)}L${f(forkX + h * 0.016)} ${f(forkY)}Q${f(x + h * 0.05)} ${f((y + forkY) / 2)} ${f(x + h * 0.035)} ${f(y)}Z`;
  const limbs: string[] = [];
  const leaves: string[] = [];
  const blob = (cx: number, cy: number, rw: number) => {
    const rh = rw * (0.55 + r() * 0.3);
    leaves.push(`M${f(cx - rw)} ${f(cy)}C${f(cx - rw)} ${f(cy - rh * 1.2)} ${f(cx + rw)} ${f(cy - rh * 1.2)} ${f(cx + rw)} ${f(cy)}C${f(cx + rw * 0.6)} ${f(cy + rh * 0.9)} ${f(cx - rw * 0.6)} ${f(cy + rh * 0.9)} ${f(cx - rw)} ${f(cy)}Z`);
  };
  const n = 2 + (r() < 0.6 ? 1 : 0);
  for (let i = 0; i < n; i++) {
    const side = n === 3 && i === 2 ? 0.15 : i === 0 ? -1 : 1;
    const tx = forkX + side * h * (0.16 + r() * 0.14);
    const ty = y - h * (0.78 + r() * 0.18);
    const mx = (forkX + tx) / 2 - side * h * 0.04;
    const my = (forkY + ty) / 2;
    limbs.push(`M${f(forkX)} ${f(forkY)}Q${f(mx)} ${f(my)} ${f(tx)} ${f(ty)}`);
    // Clumps hang from the end of the limb and from a twig partway along it.
    const k = 3 + Math.floor(r() * 3);
    for (let j = 0; j < k; j++) {
      const cx = tx + (r() - 0.5) * h * 0.22;
      const cy = ty + (r() - 0.25) * h * 0.14;
      limbs.push(`M${f(tx)} ${f(ty)}L${f(cx)} ${f(cy)}`);
      blob(cx, cy, h * (0.045 + r() * 0.035));
    }
    if (r() < 0.7) blob(mx + side * h * 0.05, my - h * 0.02, h * (0.04 + r() * 0.03));
  }
  const tone = o.tone ?? 2;
  m.push({ d: trunk, c: `f${tone}` });
  m.push({ d: limbs.join(''), c: `l${tone}`, w: Math.max(0.3, h * 0.018) });
  m.push({ d: leaves.join(''), c: `f${tone}` });
}
