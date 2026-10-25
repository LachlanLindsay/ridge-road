// A plate for each journal card, shown at the head of the card and as its thumbnail in the
// journal. The four milestone cards draw the party as it is (see scenes.tsx); the rest are fixed
// scenes, drawn once from a seed. Pure: each returns a Scene of marks (see compose.ts).
import { bedroll, campfire, cask, farGum, gum, hills, kettle, ledge, sack, sky, stonePile, tracks, type Scene } from './compose';
import { dog, dogRunning, emptyFigure, figureMarks, kangaroo, lying, procession, standing, wombat, type Mark, type Pack, type PartyCounts } from './figures';
import { areaPath, bandPath, canopy, cliffFace, cloudBank, contourHatch, curve, f, linePath, ridgeLine, rng, shift, tufts, waterHatch, yAt } from './kit';

const W = 400;
const H = 140;

const flat = (y: number, seed: number, amp = 1.2) => curve(-4, W + 4, (x) => y + amp * Math.sin(x / 41 + seed) + 0.5 * amp * Math.sin(x / 13 + seed * 2));

/**
 * The ridge method: from above and behind, one ridge running on into the distance between two
 * valleys, its flanks hachured the way a surveyor shows ground falling away, the valleys left white
 * with mist. The party is small on the near end of it.
 */
function ridgeMethod(seed = 201): Scene {
  const m: Mark[] = [];
  const HZ = 56;
  sky(m, { seed, w: W, horizon: HZ, clouds: [cloudBank(seed + 1, 80, 20, 150, 16, 7), cloudBank(seed + 2, 340, 14, 110, 10, 5)], reach: 0.75 });
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: HZ, amp: 2.5, scale: 110, plateau: 0.85, gullies: 4, gullyDepth: 3, gullyWidth: 8 });
  hills(m, far, H, 0, { seed: seed + 11, depth: 6, gap: 1.6, growth: 0.3 });
  // The far walls of the two valleys, either side of the ridge: cliffed under their tops, forested
  // slopes below running down to the valley floors.
  const walls: [number, number, number][] = [
    [-4, 196, 68],
    [250, W + 4, 66],
  ];
  for (const [i, [x0, x1, base]] of walls.entries()) {
    const wall = ridgeLine({ seed: seed + 12 + i, x0, x1, base, amp: 2, scale: 60, plateau: 0.8, tilt: i ? -0.03 : 0.04 });
    hills(m, wall, H, 1, { seed: seed + 14 + i, depth: 3, gap: 1.2 }, 1.2);
    const cl = cliffFace(wall, { seed: seed + 16 + i, height: 9, cover: 0.6, gap: 1.8, cap: 1 });
    m.push({ d: cl.face, c: 'l1', w: 0.38 });
    hills(m, cl.foot, H, 1, { seed: seed + 18 + i, depth: 22, gap: 1.4, growth: 0.18, bias: 0.15 }, 1.6);
  }
  // The valley floors, forest under a lying mist: treelines going back, broken by bands of white.
  for (const [i, y] of [94, 110, 130].entries()) {
    const gl = curve(-4, W + 4, (x) => y + 1.4 * Math.sin(x / (26 + i * 8) + i) + 0.6 * Math.sin(x / 9 + i * 2), 1.5);
    hills(m, gl, H + 4, Math.min(3, 1 + i), { seed: seed + 40 + i * 3, depth: 6 + i * 3, gap: 1.5, growth: 0.3 }, 2.2 + i * 0.9);
    const mist: string[] = [];
    for (let k = 0; k < 3; k++) mist.push(`M-4 ${f(y + 5 + i * 2 + k * 1.3)}H${W + 4}`);
    m.push({ d: mist.join(''), c: 'lp', w: 1 });
  }
  // The ridge itself, running from under our feet away to the horizon between the two valleys:
  // depth d runs from 0 at the foot of the plate to 1 at the far end.
  const yAtD = (d: number) => HZ + 6 + (H + 10 - HZ - 6) * (1 - d) ** 2.2;
  const xAtD = (d: number) => 196 + 42 * d ** 0.9 + 12 * Math.sin(d * 6 + 0.6) * (1 - d);
  const sc = (d: number) => (1 - d) ** 1.6 + 0.03;
  const crest = (d: number) => 34 * sc(d) + 0.6;
  const reach = (d: number) => 96 * sc(d) + 3;
  const drop = (d: number) => 30 * sc(d) + 1.5;
  const ds: number[] = [];
  for (let d = 0; d <= 0.985; d += 0.0035 + 0.016 * d ** 1.5) ds.push(d);
  const pt = (x: number, y: number) => `${f(x)} ${f(y)}`;
  // The whole mass in paper first, so the valleys behind it are hidden: crest, both flanks, feet.
  const footL = ds.map((d) => pt(xAtD(d) - crest(d) - reach(d), yAtD(d) + drop(d)));
  const footR = ds.map((d) => pt(xAtD(d) + crest(d) + reach(d), yAtD(d) + drop(d)));
  const tip = pt(xAtD(1), yAtD(1));
  m.push({ d: `M${footL.join('L')}L${tip}L${[...footR].reverse().join('L')}Z`, c: 'pp' });
  // Hachures down each flank the way a surveyor draws ground falling away: short strokes from the
  // crest edge outward and down, a second row lower on the slope, closer and darker on the shaded
  // (right) flank, open on the lit one.
  const r = rng(seed + 20);
  const flank: [string[], string[]] = [[], []];
  const low: [string[], string[]] = [[], []];
  for (const d of ds) {
    const x = xAtD(d);
    const y = yAtD(d);
    for (const [k, side] of [-1, 1].entries()) {
      if (side < 0 && r() < 0.3) continue;
      const ex = x + side * crest(d);
      const L = reach(d) * (0.38 + r() * 0.1);
      const D = drop(d) * (0.45 + r() * 0.1);
      flank[k]!.push(`M${pt(ex, y)}Q${pt(ex + side * L * 0.35, y + D * 0.7)} ${pt(ex + side * L, y + D)}`);
      if (r() < (side > 0 ? 0.7 : 0.45)) {
        const sx = ex + side * reach(d) * (0.5 + r() * 0.06);
        const sy = y + drop(d) * 0.55;
        low[k]!.push(`M${pt(sx, sy)}Q${pt(sx + side * L * 0.3, sy + D * 0.6)} ${pt(sx + side * L * 0.85, sy + D * 0.85)}`);
      }
    }
  }
  m.push({ d: flank[0]!.join(''), c: 'l2', w: 0.42 }, { d: flank[1]!.join(''), c: 'l3', w: 0.5 });
  m.push({ d: low[0]!.join(''), c: 'l1', w: 0.36 }, { d: low[1]!.join(''), c: 'l2', w: 0.42 });
  // The crest: its two edges, and the bush along it, a few gums near and ticks far off.
  m.push({ d: `M${ds.map((d) => pt(xAtD(d) - crest(d), yAtD(d))).join('L')}`, c: 'l3', w: 0.5 });
  m.push({ d: `M${ds.map((d) => pt(xAtD(d) + crest(d), yAtD(d))).join('L')}`, c: 'l4', w: 0.6 });
  const ticks: string[][] = [[], []];
  const gums: [number, number, number, number][] = [];
  for (const d of ds) {
    if (d < 0.2 || r() > 0.3) continue;
    const tx = xAtD(d) + (r() - 0.5) * crest(d) * 1.4;
    if (d < 0.5) gums.push([tx, yAtD(d), 24 * sc(d) + 4, d < 0.32 ? 3 : 2]);
    else ticks[d < 0.72 ? 1 : 0]!.push(`M${pt(tx, yAtD(d))}v${f(-(5 * sc(d) + 1.2))}`);
  }
  ticks.forEach((t, i) => t.length && m.push({ d: t.join(''), c: `l${i + 1}`, w: 0.7 }));
  for (const [i, [x, y, h, tone]] of gums.entries()) farGum(m, { seed: seed + 100 + i, x, y, h, tone });
  // The near end of the ridge top, open, where the party walks on; a man blazing a gum beside the
  // way so the cutters and the horses can follow.
  const g = curve(110, 290, (x) => H + 2 - 16 * Math.exp(-(((x - 200) / 56) ** 2)) + 0.6 * Math.sin(x / 7));
  m.push({ d: areaPath(g, H + 4), c: 'pp' }, { d: linePath(g), c: 'l4', w: 0.8 });
  m.push({ d: tufts(g, { seed: seed + 22, from: 120, to: 280, every: 9, h: 4 }), c: 'l3', w: 0.42 });
  const bx = 266;
  gum(m, { seed: seed + 60, x: bx, y: yAt(g, bx) + 1, h: 58, lean: -0.03, spread: 0.75, density: 0.35, depth: 2 });
  blaze(m, bx - 0.5, yAt(g, bx) - 7.5, 1.25);
  const blazer = emptyFigure();
  standing(blazer, bx - 15, yAt(g, bx - 15), 0.68, { leader: false, arms: 'axe' });
  m.push(...figureMarks(blazer));
  const { fig } = procession({ servants: 1, horses: 2, dogs: 1 }, g, { from: 128, to: 236, maxScale: 0.62, seed: seed + 30 });
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m };
}

/**
 * Distance by the clock: a still life on the rock at the end of a day. A pocket watch lying open
 * on the ledge, its chain run out, and Lawson's field book beside it, the day's hours and miles
 * pencilled in a column; the ridges small and far below, beyond the ledge's edge.
 */
function distanceByClock(seed = 211): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 58, clouds: [cloudBank(seed + 1, 310, 24, 160, 18, 7)], reach: 0.72 });
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 58, amp: 2.5, scale: 100, plateau: 0.7, gullies: 4 });
  hills(m, far, H, 0, { seed: seed + 11, depth: 7, gap: 1.6, growth: 0.25 });
  const mid = ridgeLine({ seed: seed + 20, x0: -4, x1: W + 4, base: 68, amp: 3.5, scale: 70, plateau: 0.4 });
  hills(m, mid, H, 1, { seed: seed + 21, depth: 9, gap: 1.5, growth: 0.2 }, 0.8);
  const low = ridgeLine({ seed: seed + 22, x0: -4, x1: W + 4, base: 78, amp: 4, scale: 56, plateau: 0.3 });
  hills(m, low, H, 2, { seed: seed + 23, depth: 9, gap: 1.4, growth: 0.2 }, 1.1);
  // The ledge, close: its far edge across the plate, the top seen from above, grained and cracked.
  const edge = curve(-4, W + 4, (x) => 88 - 2 * Math.sin(x / 70 + 0.6) + 0.7 * Math.sin(x / 7));
  m.push({ d: areaPath(edge, H + 2), c: 'pp' }, { d: linePath(edge), c: 'l4', w: 1 });
  const r = rng(seed + 30);
  const grain: string[][] = [[], [], []];
  for (let y0 = 1.4, i = 0; y0 < 60; y0 += 1.3 + y0 * 0.06, i++) {
    let x = -4 + r() * 10;
    while (x < W + 4) {
      const len = 6 + r() * 30 * (0.5 + y0 / 50);
      if (r() < 0.62) grain[Math.min(2, Math.floor(y0 / 14))]!.push(`M${f(x)} ${f(yAt(edge, x) + y0)}Q${f(x + len / 2)} ${f(yAt(edge, x + len / 2) + y0 + (r() - 0.5) * 1.4)} ${f(x + len)} ${f(yAt(edge, x + len) + y0 + (r() - 0.5))}`);
      x += len + 2 + r() * 8;
    }
  }
  grain.forEach((g, i) => m.push({ d: g.join(''), c: `l${3 - i} o${i}`, w: 0.42 }));
  m.push({ d: `M18 ${f(yAt(edge, 18) + 2)}Q30 104 26 118L34 136M352 ${f(yAt(edge, 352) + 1)}Q346 100 360 112Q372 122 366 138`, c: 'l4', w: 0.6 });
  // The field book, open: two pages in perspective, the spine between, a column of figures pencilled
  // on each, and the pencil laid across.
  const P = (u: number, v: number) => {
    // u across the book (0..1), v from the near edge (0) to the far edge (1).
    const xn0 = 70;
    const xn1 = 196;
    const xf0 = 84;
    const xf1 = 188;
    const yn = 124;
    const yf = 97;
    const x = (xn0 + (xn1 - xn0) * u) * (1 - v) + (xf0 + (xf1 - xf0) * u) * v;
    return [x, yn + (yf - yn) * v] as const;
  };
  const pp = ([x, y]: readonly [number, number]) => `${f(x)} ${f(y)}`;
  const page = (u0: number, u1: number, sag: number) => `M${pp(P(u0, 0))}Q${pp([(P(u0, 0)[0] + P(u1, 0)[0]) / 2, P(u0, 0)[1] - sag])} ${pp(P(u1, 0))}L${pp(P(u1, 1))}Q${pp([(P(u0, 1)[0] + P(u1, 1)[0]) / 2, P(u0, 1)[1] - sag * 0.6])} ${pp(P(u0, 1))}Z`;
  m.push({ d: `M${pp(P(-0.01, -0.06))}L${pp(P(1.01, -0.06))}L${pp(P(1.01, 1.02))}L${pp(P(-0.01, 1.02))}Z`, c: 'f4' });
  m.push({ d: page(0, 0.5, 1.6) + page(0.5, 1, 1.6), c: 'pk', w: 0.5 });
  const lines: string[] = [];
  const figs: string[] = [];
  for (const [u0, u1] of [
    [0.05, 0.45],
    [0.55, 0.95],
  ] as const) {
    for (let v = 0.12; v < 0.92; v += 0.11) {
      lines.push(`M${pp(P(u0, v))}L${pp(P(u1, v))}`);
      // Figures: a short date, then hours and miles in a column.
      const a0 = P(u0 + 0.02, v + 0.03);
      figs.push(`M${f(a0[0])} ${f(a0[1])}h${f(3 + r() * 4)}`);
      const a1 = P(u0 + (u1 - u0) * 0.55, v + 0.03);
      figs.push(`M${f(a1[0])} ${f(a1[1])}h${f(2 + r() * 2.5)}`);
      const a2 = P(u0 + (u1 - u0) * 0.78, v + 0.03);
      figs.push(`M${f(a2[0])} ${f(a2[1])}h${f(2 + r() * 2.5)}`);
    }
  }
  m.push({ d: lines.join(''), c: 'l2', w: 0.3 }, { d: figs.join(''), c: 'l4', w: 0.55 });
  m.push({ d: `M${pp(P(0.5, -0.02))}L${pp(P(0.5, 1))}`, c: 'l4', w: 0.6 });
  m.push({ d: `M${pp(P(0.62, -0.18))}L${pp(P(1.12, 0.5))}`, c: 'l4', w: 1.6 }, { d: `M${pp(P(1.12, 0.5))}L${pp(P(1.16, 0.56))}`, c: 'l2', w: 1.1 });
  // The watch, lying open on the rock: the case's edge, the bezel, the dial with its hours, the
  // hands at two o'clock; the bow toward the far side, the chain run out from it across the rock.
  const cx = 276;
  const cy = 110;
  const rx = 24;
  const ry = 11;
  const ell = (x: number, y: number, a: number, b: number) => `M${f(x - a)} ${f(y)}A${f(a)} ${f(b)} 0 1 0 ${f(x + a)} ${f(y)}A${f(a)} ${f(b)} 0 1 0 ${f(x - a)} ${f(y)}Z`;
  m.push({ d: ell(cx + 1.2, cy + 3.4, rx + 1.4, ry + 1.2), c: 'f3' });
  m.push({ d: ell(cx, cy + 2.4, rx, ry), c: 'f4' });
  m.push({ d: ell(cx, cy, rx, ry), c: 'pk', w: 0.9 });
  m.push({ d: ell(cx, cy, rx - 2.6, ry - 1.2), c: 'l4', w: 0.5 });
  const ticks: string[] = [];
  const mins: string[] = [];
  for (let i = 0; i < 60; i++) {
    const t = (i / 60) * Math.PI * 2;
    const big = i % 5 === 0;
    const r0 = big ? 0.72 : 0.82;
    const r1 = 0.88;
    const q = (rr: number) => `${f(cx + Math.sin(t) * (rx - 2.6) * rr)} ${f(cy - Math.cos(t) * (ry - 1.2) * rr)}`;
    (big ? ticks : mins).push(`M${q(r0)}L${q(r1)}`);
  }
  m.push({ d: ticks.join(''), c: 'l4', w: 0.9 }, { d: mins.join(''), c: 'l4', w: 0.3 });
  const hand = (t: number, len: number, w: number) => {
    const ex = cx + Math.sin(t) * (rx - 2.6) * len;
    const ey = cy - Math.cos(t) * (ry - 1.2) * len;
    const nx = -Math.cos(t) * w;
    const ny = -Math.sin(t) * w * 0.5;
    return `M${f(cx + nx)} ${f(cy + ny)}L${f(ex)} ${f(ey)}L${f(cx - nx)} ${f(cy - ny)}Z`;
  };
  m.push({ d: hand((2 / 12) * Math.PI * 2, 0.5, 1.1) + hand(0.08, 0.74, 0.8) + ell(cx, cy, 1.3, 0.8), c: 'f4' });
  // Pendant and bow, then the chain.
  const by = cy - ry;
  m.push({ d: `M${f(cx - 1.8)} ${f(by + 0.4)}L${f(cx - 1.6)} ${f(by - 2.2)}L${f(cx + 1.6)} ${f(by - 2.2)}L${f(cx + 1.8)} ${f(by + 0.4)}Z`, c: 'pk', w: 0.6 });
  m.push({ d: ell(cx, by - 4, 3.6, 2), c: 'l4', w: 0.9 });
  const links: string[] = [];
  let i = 0;
  for (let t = 0; t <= 1; t += 0.022, i++) {
    const x = cx + 3 + t * 96;
    const y = by - 4 + Math.sin(t * Math.PI * 1.3) * 10 + t * 14;
    links.push(i % 2 ? `M${f(x - 1.1)} ${f(y)}h2.2` : `M${f(x - 1.1)} ${f(y)}a1.1 0.7 0 1 0 2.2 0a1.1 0.7 0 1 0 -2.2 0Z`);
  }
  m.push({ d: links.join(''), c: 'l4', w: 0.5 });
  return { w: W, h: H, marks: m };
}

/**
 * The old cairn, 19 May: on the crest of the second ridge, the ground falling away on both sides
 * into the valleys, a rough pile of flat stones, and two of the party looking it over.
 */
function cairn(seed = 221): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 70, clouds: [cloudBank(seed + 1, 120, 22, 170, 18, 7)], reach: 0.75 });
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 66, amp: 3, scale: 110, plateau: 0.8, gullies: 4 });
  hills(m, far, H, 0, { seed: seed + 11, depth: 8, gap: 1.6, growth: 0.25 });
  const mid = ridgeLine({ seed: seed + 20, x0: -4, x1: W + 4, base: 82, amp: 4, scale: 80, plateau: 0.6, gullies: 3 });
  hills(m, mid, H, 1, { seed: seed + 21, depth: 12, gap: 1.4, growth: 0.2 }, 1);
  // The ridge, end on: a narrow crest, the ground rounding over and falling away either side.
  const g = curve(-4, W + 4, (x) => 104 + 40 * (Math.abs(x - 206) / 210) ** 2.2 + 0.9 * Math.sin(x / 13) + 0.4 * Math.sin(x / 4));
  hills(m, g, H + 2, 3, { seed: seed + 30, depth: 26, gap: 1.3, growth: 0.12, bias: 0.15, light: 1.4 });
  m.push({ d: tufts(g, { seed: seed + 31, from: 40, to: W - 30, every: 12, h: 5 }), c: 'l4', w: 0.48 });
  gum(m, { seed: seed + 40, x: 352, y: yAt(g, 352) + 1, h: 98, lean: -0.08, spread: 0.9, density: 0.45, depth: 3 });
  stonePile(m, { seed: seed + 50, x: 212, y: yAt(g, 212) + 1, w: 46, h: 31 });
  const fig = emptyFigure();
  standing(fig, 172, yAt(g, 172), 1.05, { leader: true, arms: 'point' });
  standing(fig, 146, yAt(g, 146), 1.05, { leader: false, arms: 'gunRest' });
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m };
}

/**
 * Prickly brush: a shrub of stiff, needle-leaved twigs, drawn as short straight strokes fanning up
 * and out from a dark heart, so it reads spiky rather than leafy.
 */
function prickly(m: Mark[], o: { seed: number; x: number; y: number; w: number; h: number; tone?: number }) {
  const r = rng(o.seed);
  const out: string[] = [];
  const twigs = Math.round(o.w * o.h * 0.09);
  for (let i = 0; i < twigs; i++) {
    const u = r() * 2 - 1;
    const bx = o.x + u * o.w * 0.3;
    const by = o.y - r() * o.h * 0.25;
    const a = -Math.PI / 2 + u * 1.15 + (r() - 0.5) * 0.5;
    const len = (0.5 + r() * 0.5) * o.h * (1 - Math.abs(u) * 0.35);
    const ex = bx + Math.cos(a) * len * (o.w / o.h) * 0.55;
    const ey = by + Math.sin(a) * len;
    out.push(`M${f(bx)} ${f(by)}L${f(ex)} ${f(ey)}`);
    // Needles along the outer half of each twig.
    for (let k = 0; k < 3; k++) {
      const t = 0.45 + k * 0.18 + r() * 0.08;
      const nx = bx + (ex - bx) * t;
      const ny = by + (ey - by) * t;
      const na = a + (k % 2 ? 0.7 : -0.7);
      out.push(`M${f(nx)} ${f(ny)}l${f(Math.cos(na) * o.h * 0.09)} ${f(Math.sin(na) * o.h * 0.09)}`);
    }
  }
  const tone = o.tone ?? 4;
  m.push({ d: `M${f(o.x - o.w * 0.24)} ${f(o.y + 0.3)}C${f(o.x - o.w * 0.2)} ${f(o.y - o.h * 0.2)} ${f(o.x + o.w * 0.2)} ${f(o.y - o.h * 0.22)} ${f(o.x + o.w * 0.24)} ${f(o.y + 0.3)}Z`, c: `f${tone}` });
  m.push({ d: out.join(''), c: `l${tone}`, w: 0.42 });
}

/**
 * Wombat tracks, 25 May: pushing through prickly brush, "the track of the wombat". Its paired
 * prints run across a patch of sand to its burrow, a dark mouth under a sandy bank with the spoil
 * fanned out in front, and the wombat itself ambling home.
 */
function wombats(seed = 231): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 66, clouds: [cloudBank(seed + 1, 300, 20, 180, 16, 8)], reach: 0.7 });
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 66, amp: 3, scale: 110, plateau: 0.8 });
  hills(m, far, H, 0, { seed: seed + 11, depth: 8, gap: 1.6, growth: 0.25 });
  const mid = ridgeLine({ seed: seed + 12, x0: -4, x1: W + 4, base: 80, amp: 3, scale: 70, plateau: 0.5 });
  hills(m, mid, H, 1, { seed: seed + 13, depth: 8, gap: 1.6, growth: 0.25 }, 1);
  // The ground the brush grows on, and the brush behind the sand: stiff, spiky shrubs.
  const ground = flat(98, seed + 3, 1.2);
  hills(m, ground, H + 2, 2, { seed: seed + 14, depth: 4, gap: 1.6 });
  const rb = rng(seed + 15);
  for (let x = -6; x < 300; x += 15 + rb() * 16) prickly(m, { seed: seed + 16 + Math.round(x), x, y: yAt(ground, x) + 1, w: 16 + rb() * 12, h: 12 + rb() * 9, tone: 3 });
  // The sand bank on the right, with the burrow in its face.
  const bank = curve(220, W + 4, (x) => 100 - 18 * Math.exp(-(((x - 352) / 52) ** 2)) + 0.6 * Math.sin(x / 6), 1);
  m.push({ d: areaPath(bank, H + 2), c: 'pp' });
  contourHatch(bank, { seed: seed + 20, depth: 26, gap: 1.6, growth: 0.12, light: 1.6, bias: -0.05 }).forEach((d, i) => d && m.push({ d, c: `l2 o${i}`, w: 0.42 }));
  m.push({ d: linePath(bank), c: 'l3', w: 0.6 });
  for (const [i, x] of [300, 344, 384].entries()) prickly(m, { seed: seed + 22 + i, x, y: yAt(bank, x) + 1, w: 18 + i * 3, h: 14 + i * 2, tone: 4 });
  // The burrow: a dark mouth under an overhanging lip, the spoil fanned out in front.
  const bx = 334;
  const by = 106;
  // The hole dug into the bank's face, wider than high, the turf hanging over its lip.
  m.push({ d: `M${f(bx - 16)} ${f(by + 1)}C${f(bx - 15)} ${f(by - 15)} ${f(bx + 15)} ${f(by - 15)} ${f(bx + 16)} ${f(by + 1)}Z`, c: 'pp' });
  m.push({ d: `M${f(bx - 13)} ${f(by + 0.5)}C${f(bx - 12.6)} ${f(by - 13)} ${f(bx + 12.6)} ${f(by - 13)} ${f(bx + 13)} ${f(by + 0.5)}Z`, c: 'f4' });
  const lip = curve(bx - 15, bx + 15, (x) => by - 11.2 * Math.sqrt(Math.max(0, 1 - ((x - bx) / 15) ** 2)) - 0.6 + 0.5 * Math.sin(x * 1.3), 0.6);
  m.push({ d: linePath(lip), c: 'l4', w: 1 });
  m.push({ d: tufts(shift(lip, -0.6), { seed: seed + 23, from: bx - 12, to: bx + 12, every: 5, h: 3.4, blades: 3 }), c: 'l4', w: 0.4 });
  // The spoil, fanned out in front of the hole.
  const spoil = curve(bx - 40, bx + 34, (x) => by + 1.2 - 4 * Math.exp(-(((x - bx) / 17) ** 2)), 1);
  m.push({ d: `${linePath(spoil)}L${f(bx + 34)} ${f(by + 9)}L${f(bx - 40)} ${f(by + 9)}Z`, c: 'pp' }, { d: linePath(spoil), c: 'l3', w: 0.55 });
  const sp: string[] = [];
  const rs = rng(seed + 24);
  for (let i = 0; i < 70; i++) {
    const x = bx - 30 + rs() * 60;
    const y = yAt(spoil, x) + 0.8 + rs() * 5;
    sp.push(`M${f(x)} ${f(y)}h0.25`);
  }
  m.push({ d: sp.join(''), c: 'l3', w: 0.7 });
  // The sand: stippled, finer far off, with a few tufts.
  const r = rng(seed + 40);
  const dots: string[] = [];
  for (let i = 0; i < 520; i++) {
    const t = r();
    const y = 100 + t * 34;
    const x = r() * W;
    if (y < yAt(bank, x) + 1 && x > 220) continue;
    dots.push(`M${f(x)} ${f(y)}h${f(0.05 + t * 0.3)}`);
  }
  m.push({ d: dots.join(''), c: 'l2', w: 0.75 });
  m.push({ d: tufts(curve(-4, W + 4, () => 112), { seed: seed + 50, from: 4, to: 200, every: 30, h: 4 }), c: 'l3', w: 0.42 });
  // The track: paired prints, a broad clawed fore print and a longer hind one, coming across the
  // sand to the burrow, larger as they come nearer.
  const path: [number, number][] = [
    [14, 126],
    [90, 120],
    [170, 114],
    [252, 110],
  ];
  const prints: string[] = [];
  const claws: string[] = [];
  let side = 1;
  for (let i = 0; i + 1 < path.length; i++) {
    const [x0, y0] = path[i]!;
    const [x1, y1] = path[i + 1]!;
    const len = Math.hypot(x1 - x0, y1 - y0);
    for (let t = 0; t < len; ) {
      const x = x0 + ((x1 - x0) * t) / len;
      const y = y0 + ((y1 - y0) * t) / len;
      const sc = 0.55 + ((y - 104) / 26) * 0.75;
      const py = y + side * 1.4 * sc;
      for (const [dx, rx, ry] of [
        [0, 1.1, 0.75],
        [2.6, 1.3, 0.7],
      ] as const) {
        const cx = x + dx * sc;
        prints.push(`M${f(cx - rx * sc)} ${f(py)}A${f(rx * sc)} ${f(ry * sc)} 0 1 0 ${f(cx + rx * sc)} ${f(py)}A${f(rx * sc)} ${f(ry * sc)} 0 1 0 ${f(cx - rx * sc)} ${f(py)}Z`);
        for (let k = -1.5; k <= 1.6; k += 1) {
          const qx = cx + rx * sc * 0.85 + 0.9 * sc * Math.cos(k * 0.45);
          const qy = py + 0.9 * sc * Math.sin(k * 0.45) * 1.2;
          claws.push(`M${f(qx - 0.22 * sc)} ${f(qy)}a${f(0.22 * sc)} ${f(0.22 * sc)} 0 1 0 ${f(0.44 * sc)} 0a${f(0.22 * sc)} ${f(0.22 * sc)} 0 1 0 ${f(-0.44 * sc)} 0Z`);
        }
      }
      side = -side;
      t += 6.4 * sc;
    }
  }
  m.push({ d: prints.join(''), c: 'f3' }, { d: claws.join(''), c: 'f3' });
  // The wombat, ambling home.
  const fig = emptyFigure();
  wombat(fig, 270, 112, 1.5);
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m };
}

/**
 * The rock wall, 18 May: looking along the ridge, "not more than fifteen or twenty yards over, with
 * deep precipices on each side", to the mass of rock "nearly thirty feet high, extending across the
 * whole breadth": weathered sandstone, its cap overhanging, honeycombed, one broken cleft through
 * the middle where a man shifts the stones and the party waits its turn.
 */
function rockWall(seed = 241, counts: PartyCounts = { servants: 2, horses: 2, dogs: 1 }, loads?: Pack[]): Scene {
  const m: Mark[] = [];
  const HZ = 50;
  sky(m, { seed, w: W, horizon: HZ, clouds: [cloudBank(seed + 1, 80, 18, 150, 14, 7), cloudBank(seed + 2, 350, 12, 100, 10, 5)], reach: 0.8 });
  // The far sides of the two gorges, cliffed under their tops, forest falling to the floors.
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: HZ, amp: 2, scale: 120, plateau: 0.85, gullies: 3 });
  hills(m, far, H, 0, { seed: seed + 11, depth: 5, gap: 1.6, growth: 0.3 });
  for (const [i, [x0, x1, base]] of ([
    [-4, 170, 58],
    [230, W + 4, 56],
  ] as const).entries()) {
    const wall = ridgeLine({ seed: seed + 12 + i, x0, x1, base, amp: 2, scale: 60, plateau: 0.8, tilt: i ? -0.03 : 0.03 });
    hills(m, wall, H, 1, { seed: seed + 14 + i, depth: 3, gap: 1.2 }, 1);
    const cl = cliffFace(wall, { seed: seed + 16 + i, height: 14, cover: 0.5, gap: 1.9, cap: 1 });
    m.push({ d: cl.face, c: 'l1', w: 0.4 }, { d: cl.beds, c: 'l1', w: 0.34 });
    hills(m, cl.foot, H, 1, { seed: seed + 18 + i, depth: 20, gap: 1.4, growth: 0.18, bias: 0.15 }, 1.4);
  }
  // The gorge floors far below, forest under a lying mist.
  for (const [i, y] of [96, 114].entries()) {
    const gl = curve(-4, W + 4, (x) => y + 1.3 * Math.sin(x / (24 + i * 9) + i) + 0.6 * Math.sin(x / 8 + i * 2), 1.5);
    hills(m, gl, H + 4, 2 + i, { seed: seed + 20 + i * 3, depth: 5 + i * 3, gap: 1.5, growth: 0.3 }, 1.8 + i);
    m.push({ d: `M-4 ${f(y + 6 + i * 2)}H${W + 4}M-4 ${f(y + 7.4 + i * 2)}H${W + 4}`, c: 'lp', w: 1 });
  }
  // The ridge, from under our feet to the rock: narrowing as it goes, its edges broken rims of rock
  // with the ground falling away outside them.
  const vy = 60;
  const cxAt = (y: number) => 200 + 6 * Math.sin((y - vy) / 23);
  const nz = rng(seed + 25);
  const ys: number[] = [];
  for (let y = 100; y <= H + 6; y += 1.5) ys.push(y);
  const wob = ys.map(() => (nz() - 0.5) * 2.2);
  const edgeL = ys.map((y, i) => [cxAt(y) - 1.45 * (y - vy) + wob[i]!, y] as const);
  const edgeR = ys.map((y, i) => [cxAt(y) + 1.45 * (y - vy) - wob[(i + 7) % ys.length]!, y] as const);
  const pt = ([x, y]: readonly [number, number]) => `${f(x)} ${f(y)}`;
  m.push({ d: `M${edgeL.map(pt).join('L')}L${[...edgeR].reverse().map(pt).join('L')}Z`, c: 'pp' });
  // The ground falling away outside each rim: hachures running outward and down, darkest at the lip.
  const fall: [string[], string[]] = [[], []];
  for (const [k, edge] of [edgeL, edgeR].entries()) {
    const side = k ? 1 : -1;
    for (let i = 0; i < edge.length; i += 1) {
      const [x, y] = edge[i]!;
      const sc = (y - vy) / 80;
      const L = (5 + nz() * 4) * sc * 2;
      const D = (7 + nz() * 6) * sc * 2;
      fall[k]!.push(`M${f(x + side * 0.4)} ${f(y + 0.4)}Q${f(x + side * L * 0.25)} ${f(y + D * 0.6)} ${f(x + side * L)} ${f(y + D)}`);
    }
  }
  m.push({ d: fall[0]!.join(''), c: 'l3', w: 0.42 }, { d: fall[1]!.join(''), c: 'l4', w: 0.5 });
  m.push({ d: `M${edgeL.map(pt).join('L')}M${edgeR.map(pt).join('L')}`, c: 'l4', w: 0.9 });
  // The ridge top: ground lines across it, closer far off, and coarse grass.
  const across: string[] = [];
  for (let y = 104; y < H; y += 1.6 + (y - 100) * 0.09) {
    const hw = 1.45 * (y - vy) - 3;
    const cx = cxAt(y);
    let x = cx - hw + nz() * 4;
    while (x < cx + hw - 3) {
      const len = 4 + nz() * 12 * ((y - vy) / 60);
      if (nz() < 0.55) across.push(`M${f(x)} ${f(y)}h${f(Math.min(len, cx + hw - x))}`);
      x += len + 2 + nz() * 6;
    }
  }
  m.push({ d: across.join(''), c: 'l3', w: 0.4 });
  const crestG = curve(cxAt(122) - 72, cxAt(122) + 72, () => 122);
  m.push({ d: tufts(crestG, { seed: seed + 26, from: crestG.x0 + 10, to: crestG.x0 + 134, every: 16, h: 4, blades: 4 }), c: 'l4', w: 0.45 });
  // The rock: weathered sandstone in tiers, like the pagoda rocks of these ridges, each tier
  // standing a little out over the one below, rounded lobes on top, a broken cleft through it.
  const baseY = 102;
  const gapX = cxAt(baseY) + 4;
  const r = rng(seed + 30);
  const lobes = [
    [136, 22, 15],
    [158, 33, 18],
    [188, 42, 17],
    [220, 46, 19],
    [248, 37, 15],
    [268, 24, 12],
  ] as const;
  const tier = 8.5;
  const raw = (x: number) => Math.max(...lobes.map(([lx, lh, lw]) => lh * Math.exp(-(((x - lx) / lw) ** 6))));
  // Heights step into tiers, each edge rounded; the cleft cuts a narrow notch down to the floor.
  const heightAt = (x: number) => {
    const h = raw(x);
    const k = Math.floor(h / tier);
    const frac = h / tier - k;
    const stepped = k * tier + tier * Math.min(1, frac * 5) ** 0.5 * (frac > 0.04 ? 1 : 0);
    const cleft = 1 - Math.exp(-(((x - gapX) / 2.4) ** 2));
    return Math.min(h + 2, stepped) * cleft;
  };
  const rx0 = 120;
  const rx1 = 284;
  const prof = curve(rx0, rx1, (x) => baseY - heightAt(x) + 0.3 * Math.sin(x / 1.7), 0.5);
  m.push({ d: `${linePath(prof)}L${rx1} ${baseY + 3}L${rx0} ${baseY + 3}Z`, c: 'pp' });
  // Under each tier's edge the rock is cut back in shadow, with honeycomb hollows in it.
  const ledges: string[] = [];
  const under: string[] = [];
  const pits: string[] = [];
  const shade: string[] = [];
  for (let k = 1; k * tier < 48; k++) {
    const y = baseY - k * tier;
    let on = false;
    let run: number[] = [];
    const flush = () => {
      if (run.length > 3) {
        const x0 = run[0]!;
        const x1 = run[run.length - 1]!;
        ledges.push(`M${f(x0)} ${f(y + 0.3)}Q${f((x0 + x1) / 2)} ${f(y + (r() - 0.5) * 1.2)} ${f(x1)} ${f(y + 0.2)}`);
        for (let x = x0 + 0.4; x < x1; x += 0.9 + r() * 0.5) under.push(`M${f(x)} ${f(y + 0.9)}V${f(y + 1.8 + r() * 2.2)}`);
        for (let j = 0; j < (x1 - x0) / 11; j++) {
          const px = x0 + 2 + r() * (x1 - x0 - 4);
          const py = y + 2.6 + r() * 3;
          const rr = 0.35 + r() * 0.6;
          pits.push(`M${f(px - rr)} ${f(py)}A${f(rr)} ${f(rr * 0.8)} 0 1 0 ${f(px + rr)} ${f(py)}A${f(rr)} ${f(rr * 0.8)} 0 1 0 ${f(px - rr)} ${f(py)}Z`);
        }
      }
      run = [];
    };
    for (let x = rx0; x <= rx1; x += 0.5) {
      const inside = heightAt(x) > k * tier + 1.2;
      if (inside) run.push(x);
      else if (on) flush();
      on = inside;
    }
    flush();
  }
  // Each lobe shaded on the side away from the light, and lightly bedded between the tiers.
  for (let x = rx0; x < rx1; x += 1.1 + r() * 0.5) {
    const slope = heightAt(x + 2) - heightAt(x - 2);
    const yt = baseY - heightAt(x);
    if (yt > baseY - 2) continue;
    const dark = slope < -1.5 || x > gapX + 30;
    if (!dark && r() > 0.12) continue;
    for (let y = yt + 2 + r() * 2; y < baseY; y += 2.6 + r() * 3.4) shade.push(`M${f(x)} ${f(y)}V${f(Math.min(baseY, y + 1.6 + r() * 3))}`);
  }
  m.push({ d: shade.join(''), c: 'l3', w: 0.38 }, { d: under.join(''), c: 'l4', w: 0.5 }, { d: ledges.join(''), c: 'l4', w: 0.6 }, { d: pits.join(''), c: 'f4' });
  m.push({ d: linePath(prof), c: 'l4', w: 0.9 });
  // Scrub in the cracks along the top.
  for (const [lx, lh] of lobes) {
    const g = curve(lx - 6, lx + 6, (x) => baseY - heightAt(x) + 0.4, 1);
    const tp = canopy(g, { seed: seed + 32 + lx, size: 1.8 + lh * 0.03, sparse: 0.5 });
    m.push({ d: bandPath(tp, g), c: 'f3' });
  }
  // The cleft, dark, floored with broken stone.
  m.push({ d: `M${f(gapX - 2.6)} ${f(baseY - heightAt(gapX - 6) + 3)}L${f(gapX - 1.2)} ${f(baseY)}L${f(gapX + 1.4)} ${f(baseY)}L${f(gapX + 2.8)} ${f(baseY - heightAt(gapX + 6) + 3)}Z`, c: 'f4' });
  // Stones lifted out of the cleft, and a man heaving another.
  const lifted: string[] = [];
  const lshade: string[] = [];
  for (const [i, [x, sz]] of ([
    [gapX - 13, 1.2],
    [gapX + 11, 1],
    [gapX + 17, 0.75],
    [gapX - 20, 0.65],
  ] as const).entries()) {
    const y = baseY + 2.4 + i * 0.5;
    lifted.push(`M${f(x - 4 * sz)} ${f(y)}L${f(x - 3.6 * sz)} ${f(y - 2.6 * sz)}L${f(x - 1 * sz)} ${f(y - 3.8 * sz)}L${f(x + 3 * sz)} ${f(y - 3.2 * sz)}L${f(x + 4.2 * sz)} ${f(y - 1 * sz)}L${f(x + 4 * sz)} ${f(y)}Z`);
    lshade.push(`M${f(x - 3.8 * sz)} ${f(y + 0.3)}H${f(x + 4.2 * sz)}L${f(x + 4.4 * sz)} ${f(y - 1 * sz)}`);
  }
  m.push({ d: lifted.join(''), c: 'pk', w: 0.45 }, { d: lshade.join(''), c: 'l4', w: 0.7 });
  const men = emptyFigure();
  standing(men, gapX - 3, baseY + 2, 0.44, { leader: false, arms: 'stone', lean: 0.3 });
  m.push(...figureMarks(men));
  // The party waiting its turn on the ridge before the rock.
  const wait = curve(60, 240, () => 110);
  const { fig } = procession(counts, wait, { from: 112, to: gapX - 26, maxScale: 0.46, seed: seed + 40, loads });
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m };
}

/** Water up the cliff: the camp on a narrow ridge, the gully six hundred feet below, two men climbing with kettles. */
function gullyWater(seed = 251): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 60, clouds: [cloudBank(seed + 1, 300, 20, 180, 16, 7)], reach: 0.85 });
  // The far wall of the gully.
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 46, amp: 2.5, scale: 110, plateau: 0.85 });
  hills(m, far, H, 1, { seed: seed + 11, depth: 3, gap: 1 }, 0.6);
  const fc = cliffFace(far, { seed: seed + 12, height: 26, cover: 0.8, gap: 2.2, cap: 1.5 });
  m.push({ d: fc.face, c: 'l1', w: 0.4 }, { d: fc.beds, c: 'l1', w: 0.34 });
  hills(m, fc.foot, H, 2, { seed: seed + 13, depth: 40, gap: 1.3, growth: 0.12, bias: 0.25 }, 1);
  // The creek at the bottom of the gully.
  const wh = waterHatch({ seed: seed + 14, from: 160, to: W + 4, top: 128, bottom: 136, gap: 1.6 });
  m.push({ d: `M160 127.4H${W + 4}V${H + 2}H160Z`, c: 'pp' }, { d: wh.light, c: 'lw', w: 0.45 }, { d: wh.dark, c: 'lw', w: 0.5 });
  // Our ridge: narrow, high on the left, its face falling sheer to the creek.
  const top = curve(-4, 168, (x) => 50 + 0.8 * Math.sin(x / 11) + (x > 150 ? ((x - 150) / 18) ** 2 * 3 : 0));
  hills(m, top, H + 2, 3, { seed: seed + 21, depth: 60, gap: 1.3, growth: 0.08, bias: 0.25, step: 2.5 }, 1.6);
  const face = curve(166, 198, (x) => yAt(top, 166) + ((x - 166) / 32) ** 0.6 * (130 - yAt(top, 166)));
  m.push({ d: `${linePath(face)}L198 ${H + 2}L150 ${H + 2}L150 ${f(yAt(top, 150))}Z`, c: 'pp' });
  const r = rng(seed + 20);
  const strokes: string[] = [];
  for (let x = 150; x < 198; x += 0.9 + r() * 0.8) {
    const y0 = x < 166 ? yAt(top, x) + 2 + (166 - x) * 0.4 : yAt(face, x) + 0.5;
    for (let y = y0; y < H + 2; y += 3 + r() * 6) strokes.push(`M${f(x)} ${f(y)}V${f(Math.min(H + 2, y + 2 + r() * 5))}`);
  }
  m.push({ d: strokes.join(''), c: 'l4', w: 0.5 });
  m.push({ d: linePath(top), c: 'l4', w: 0.9 }, { d: linePath(face), c: 'l4', w: 0.8 });
  // The track down the face, zigzag, and two men on it with the kettles.
  m.push({ d: `M164 54L176 72L168 84L184 102L176 114L192 128`, c: 'l4 o1', w: 0.5 });
  const men = emptyFigure();
  standing(men, 175, 72, 0.5, { leader: false, arms: 'kettle', dir: 1, lean: 0.1 });
  standing(men, 183, 102, 0.5, { leader: false, arms: 'kettle', dir: -1, lean: 0.1 });
  m.push(...figureMarks(men));
  // The camp on top: smoke, the packs, the horses standing dry.
  campfire(m, { seed: seed + 30, x: 112, y: yAt(top, 112), s: 0.7, smoke: 26, drift: 0.5 });
  const { fig } = procession({ servants: 1, horses: 2, dogs: 1 }, top, { from: 6, to: 96, maxScale: 0.52, seed: seed + 40, phase: 0 });
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m };
}

/** Kangaroo dogs: the dogs running down a kangaroo across open forest. */
function kangarooDogs(seed = 261): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 78, clouds: [cloudBank(seed + 1, 140, 26, 190, 20, 8)], reach: 0.72 });
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 78, amp: 3, scale: 110, plateau: 0.6 });
  hills(m, far, H, 0, { seed: seed + 11, depth: 8, gap: 1.6, growth: 0.25 });
  const mid = curve(-4, W + 4, (x) => 98 + 3 * Math.sin(x / 50 + 1) + 1.5 * Math.sin(x / 17));
  hills(m, mid, H, 1, { seed: seed + 20, depth: 10, gap: 1.6, growth: 0.25 });
  for (const [i, x] of [30, 96, 150, 228, 300, 372].entries()) farGum(m, { seed: seed + 30 + i, x, y: yAt(mid, x) + 0.5, h: 24 + (i % 3) * 5, tone: 1 });
  const g = flat(126, seed, 1.2);
  hills(m, g, H + 2, 3, { seed: seed + 40, depth: 10, gap: 1.4, growth: 0.25 });
  m.push({ d: tufts(g, { seed: seed + 41, from: 2, to: W - 2, every: 10, h: 5.5 }), c: 'l3', w: 0.45 });
  gum(m, { seed: seed + 50, x: 26, y: yAt(g, 26) + 1, h: 118, lean: 0.06, spread: 0.9, density: 0.45, depth: 3 });
  const fig = emptyFigure();
  kangaroo(fig, 296, yAt(g, 296) - 6, 1.55);
  dogRunning(fig, 236, yAt(g, 236) - 5, 1.3, { phase: 0.6 });
  dogRunning(fig, 196, yAt(g, 196) - 6, 1.3, { phase: -0.6 });
  dogRunning(fig, 158, yAt(g, 158) - 4.5, 1.25, { phase: 1.1 });
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m };
}

/** Frost: dawn under the western cliffs, the camp asleep in the white, the kangaroo leg hung frozen. */
function frost(seed = 271): Scene {
  const m: Mark[] = [];
  // A clear, cold sky, ruled close, and the sun just up.
  sky(m, { seed, w: W, horizon: 84, clouds: [[{ x: 302, y: 80, rx: 11, ry: 11 }]], reach: 0.95 });
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 80, amp: 2.5, scale: 120, plateau: 0.8 });
  hills(m, far, H, 1, { seed: seed + 11, depth: 5, gap: 1.8, growth: 0.3 });
  // The ground white with frost: no hatching, only a crust of tiny crystals and pale tufts.
  const g = flat(118, seed, 1);
  m.push({ d: areaPath(g, H + 2), c: 'pp' }, { d: linePath(g), c: 'l3', w: 0.7 });
  const r = rng(seed + 20);
  const xs: string[] = [];
  for (let i = 0; i < 150; i++) {
    const x = r() * W;
    const y = yAt(g, x) + 2 + r() * 20;
    const s = 0.5 + r() * 0.6;
    xs.push(`M${f(x - s)} ${f(y)}h${f(2 * s)}M${f(x)} ${f(y - s)}v${f(2 * s)}`);
  }
  m.push({ d: xs.join(''), c: 'l2', w: 0.32 });
  m.push({ d: tufts(g, { seed: seed + 21, from: 2, to: W - 2, every: 16, h: 4 }), c: 'l2', w: 0.4 });
  gum(m, { seed: seed + 30, x: 54, y: yAt(g, 54) + 1, h: 112, lean: 0.07, spread: 0.9, density: 0.45, depth: 3 });
  // The meat pole: three sticks, the kangaroo leg hung from the top.
  const px = 160;
  const py = yAt(g, px);
  m.push({ d: `M${f(px - 12)} ${f(py)}L${f(px)} ${f(py - 40)}L${f(px + 12)} ${f(py)}M${f(px + 2)} ${f(py + 0.5)}L${f(px)} ${f(py - 40)}`, c: 'l4', w: 0.8 });
  m.push({ d: `M${f(px)} ${f(py - 40)}L${f(px)} ${f(py - 34)}`, c: 'l4', w: 0.5 });
  m.push({
    d: `M${f(px - 1.6)} ${f(py - 34)}C${f(px - 4)} ${f(py - 30)} ${f(px - 4.4)} ${f(py - 24)} ${f(px - 2)} ${f(py - 20)}L${f(px - 1.2)} ${f(py - 12)}L${f(px - 3.6)} ${f(py - 9.6)}L${f(px - 0.6)} ${f(py - 9.8)}L${f(px + 0.4)} ${f(py - 12.6)}L${f(px + 1.6)} ${f(py - 21)}C${f(px + 3.6)} ${f(py - 25)} ${f(px + 3)} ${f(py - 31)} ${f(px + 1.6)} ${f(py - 34)}Z`,
    c: 'f4',
  });
  // The fire out, a last thread of smoke; the men asleep under their blankets.
  campfire(m, { seed: seed + 40, x: 224, y: yAt(g, 224), s: 1, out: true, smoke: 30, drift: 0.05 });
  const fig = emptyFigure();
  lying(fig, 248, yAt(g, 248), 1.2);
  lying(fig, 196, yAt(g, 196), 1.15, { dir: -1 });
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m };
}

/** Salt meat: the cask open by the dying fire, a man laid up beside it. */
function saltMeat(seed = 281): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 80, clouds: [cloudBank(seed + 1, 240, 26, 200, 20, 8)], reach: 0.78 });
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 80, amp: 3, scale: 100, plateau: 0.7, gullies: 3 });
  hills(m, far, H, 0, { seed: seed + 11, depth: 8, gap: 1.6, growth: 0.25 });
  const g = flat(122, seed, 1);
  hills(m, g, H + 2, 3, { seed: seed + 20, depth: 12, gap: 1.35, growth: 0.25 });
  m.push({ d: tufts(g, { seed: seed + 21, from: 2, to: W - 2, every: 13, h: 5 }), c: 'l3', w: 0.45 });
  gum(m, { seed: seed + 30, x: 364, y: yAt(g, 364) + 1, h: 116, lean: -0.06, spread: 0.85, density: 0.45, depth: 3 });
  cask(m, 104, yAt(g, 104), 1.7);
  cask(m, 136, yAt(g, 136), 2.3, true);
  campfire(m, { seed: seed + 40, x: 186, y: yAt(g, 186), s: 1.5, smoke: 42, drift: 0.3 });
  kettle(m, 206, yAt(g, 206), 1.5);
  bedroll(m, 72, yAt(g, 72), 1.4);
  const fig = emptyFigure();
  lying(fig, 236, yAt(g, 236), 1.55);
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m };
}

/** After 1813: Cox's road, cut up the line of the ridge and over its crest, nobody on it. */
function after1813(seed = 291): Scene {
  const m: Mark[] = [];
  const HZ = 70;
  sky(m, { seed, w: W, horizon: HZ, clouds: [cloudBank(seed + 1, 110, 24, 190, 18, 8), cloudBank(seed + 2, 330, 16, 120, 12, 5)], reach: 0.75 });
  // Beyond the crest, the plains to the west, flat and pale.
  const far = curve(-4, W + 4, (x) => HZ + 0.6 * Math.sin(x / 23));
  hills(m, far, H, 0, { seed: seed + 10, depth: 8, gap: 1.8, growth: 0.3 });
  // The ridge the road climbs: a broad hump, wooded along its shoulders.
  const ridge = curve(-4, W + 4, (x) => 86 + 34 * ((x - 236) / 260) ** 2 + 1.2 * Math.sin(x / 11));
  hills(m, ridge, H + 4, 2, { seed: seed + 20, depth: 30, gap: 1.4, growth: 0.12, bias: 0.12 }, 1.6);
  // The road, from the foot of the plate up to the crest, narrowing as it goes.
  const N = 60;
  const L: [number, number][] = [];
  const R: [number, number][] = [];
  for (let i = 0; i <= N; i++) {
    const t = i / N;
    const y = H + 4 - (H + 4 - yAt(ridge, 238) - 1) * (1 - (1 - t) ** 1.8);
    const cx = 196 + 42 * t + 14 * Math.sin(t * 4.2) * (1 - t);
    const half = 34 * (1 - t) ** 1.4 + 1.2;
    L.push([cx - half, y]);
    R.push([cx + half, y]);
  }
  const pts = (ps: [number, number][]) => ps.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('');
  m.push({ d: `${pts(L)}${pts([...R].reverse()).replace('M', 'L')}Z`, c: 'pp' });
  // The cut bank on the uphill (left) side: raw earth, ruled down; ruts along the road.
  const r = rng(seed + 30);
  const bank: string[] = [];
  for (let i = 0; i < N; i++) {
    const [x, y] = L[i]!;
    const t = i / N;
    const h = 9 * (1 - t) ** 1.3 + 0.8;
    for (let k = 0; k < 3; k++) {
      const xx = x - (k + r()) * (3 * (1 - t) + 0.4);
      bank.push(`M${f(xx)} ${f(y - h * (0.5 + r() * 0.5))}L${f(xx + 0.2)} ${f(y)}`);
    }
  }
  m.push({ d: bank.join(''), c: 'l3', w: 0.45 });
  m.push({ d: pts(L), c: 'l4', w: 0.9 }, { d: pts(R), c: 'l3', w: 0.7 });
  const rut = (k: number) => pts(L.map(([x, y], i) => [x + (R[i]![0] - x) * k, y] as [number, number]));
  m.push({ d: rut(0.32) + rut(0.68), c: 'l2', w: 0.45 });
  // Stumps along both sides where the line was cleared, smaller as they go.
  const stumps: string[] = [];
  const tops: string[] = [];
  const stump = (x: number, y: number, s: number) => {
    stumps.push(`M${f(x - 2.2 * s)} ${f(y)}L${f(x - 1.7 * s)} ${f(y - 4 * s)}L${f(x + 1.9 * s)} ${f(y - 4.6 * s)}L${f(x + 2.4 * s)} ${f(y)}Z`);
    tops.push(`M${f(x - 1.8 * s)} ${f(y - 4 * s)}Q${f(x)} ${f(y - 5.8 * s)} ${f(x + 1.9 * s)} ${f(y - 4.6 * s)}Q${f(x)} ${f(y - 3.4 * s)} ${f(x - 1.8 * s)} ${f(y - 4 * s)}Z`);
  };
  for (let i = 4; i < N - 6; i += 6 + Math.floor(r() * 5)) {
    const t = i / N;
    const s = 2.2 * (1 - t) ** 1.5 + 0.35;
    const [lx, ly] = L[i]!;
    const [rx, ry] = R[i]!;
    stump(lx - 12 * (1 - t) - 3, ly + 1, s);
    stump(rx + 10 * (1 - t) + 3, ry + 1, s * 0.9);
  }
  m.push({ d: stumps.join(''), c: 'f4' }, { d: tops.join(''), c: 'pk', w: 0.45 });
  return { w: W, h: H, marks: m };
}

// ---------------------------------------------------------------- the signs of people
//
// The Signs of Country draw what the journal records from the party's side: what they heard, saw
// from a distance, or came upon. The people themselves and their huts are not drawn; that is for the
// Darug, Gundungurra and Wiradjuri reviewers to agree first (see the project's Country review).

/** A blaze cut in a gum's bark: a pale scar on the trunk, its cut edge dark, a notch across the top. */
function blaze(m: Mark[], x: number, y: number, s: number) {
  const w = 0.85 * s;
  const h = 3.4 * s;
  m.push({ d: `M${f(x - w)} ${f(y)}C${f(x - w * 1.1)} ${f(y - h * 0.6)} ${f(x - w * 0.6)} ${f(y - h)} ${f(x)} ${f(y - h)}C${f(x + w * 0.6)} ${f(y - h)} ${f(x + w * 1.1)} ${f(y - h * 0.6)} ${f(x + w)} ${f(y)}C${f(x + w * 0.5)} ${f(y + h * 0.15)} ${f(x - w * 0.5)} ${f(y + h * 0.15)} ${f(x - w)} ${f(y)}Z`, c: 'pk', w: 0.5 * Math.max(0.6, s) });
  m.push({ d: `M${f(x - w * 0.7)} ${f(y - h * 0.78)}L${f(x + w * 0.7)} ${f(y - h * 0.62)}M${f(x - w * 0.5)} ${f(y - h * 0.4)}L${f(x + w * 0.5)} ${f(y - h * 0.32)}`, c: 'l3', w: 0.35 * Math.max(0.6, s) });
}

/**
 * Huts (13 May): open forest on the foothills, a line of old blazes running on through the trees,
 * cut by some European before them; the party halted at the first of them, a leader pointing on
 * along the line. The huts the journal mentions are not drawn.
 */
function signsHuts(seed = 331): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 76, clouds: [cloudBank(seed + 1, 260, 26, 180, 20, 7)], reach: 0.78 });
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 74, amp: 3, scale: 110, plateau: 0.7, gullies: 3 });
  hills(m, far, H, 0, { seed: seed + 11, depth: 8, gap: 1.6, growth: 0.25 });
  // The ridge top rising gently away to the right, open forest on it.
  const g = curve(-4, W + 4, (x) => 124 - (x / W) * 18 + 1.2 * Math.sin(x / 23) + 0.5 * Math.sin(x / 7));
  hills(m, g, H + 2, 3, { seed: seed + 20, depth: 14, gap: 1.4, growth: 0.25 });
  m.push({ d: tufts(g, { seed: seed + 21, from: 2, to: W - 2, every: 11, h: 5 }), c: 'l3', w: 0.45 });
  // The blazed line: gums standing away into the distance, each marked on the side the track came.
  const line: [number, number, number][] = [
    [362, 26, 2],
    [318, 36, 2],
    [268, 50, 3],
    [206, 74, 3],
    [118, 124, 4],
  ];
  for (const [i, [x, h, tone]] of line.entries()) {
    const y = yAt(g, x) + 1;
    if (h < 40) farGum(m, { seed: seed + 30 + i, x, y, h, tone });
    else gum(m, { seed: seed + 30 + i, x, y, h, lean: i % 2 ? 0.04 : -0.04, spread: 0.8, density: 0.4, depth: 3 }, tone);
    blaze(m, x - h * 0.004, y - h * 0.13, h / 46);
  }
  // A few unmarked trees off the line.
  for (const [i, x] of [40, 252, 292, 384].entries()) farGum(m, { seed: seed + 50 + i, x, y: yAt(g, x) - 2, h: 22 + (i % 2) * 8, tone: 1 });
  // The party halted at the first blaze: a leader pointing on along the line, Lawson with his
  // field book, the horses and a servant behind.
  const fig = emptyFigure();
  standing(fig, 150, yAt(g, 150), 1.05, { leader: true, arms: 'point' });
  standing(fig, 92, yAt(g, 92), 1.05, { leader: true, arms: 'notes' });
  m.push(...figureMarks(fig));
  const { fig: party } = procession({ servants: 1, horses: 1, dogs: 1 }, g, { from: 4, to: 72, maxScale: 0.85, seed: seed + 60, phase: 0 });
  m.push(...figureMarks(party));
  return { w: W, h: H, marks: m };
}

/**
 * A man cutting wood (24 May): evening at a swamp camp on the range. A sound of chopping from the
 * scrub; the dogs are away into it and two of the party on their feet looking after them. Nobody
 * else is in the picture: the journal has only the sound, and that he fled.
 */
function signsWoodcutter(seed = 341): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 64, clouds: [cloudBank(seed + 1, 110, 26, 190, 18, 8)], reach: 0.92 });
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 64, amp: 3, scale: 110, plateau: 0.8, gullies: 3 });
  hills(m, far, H, 0, { seed: seed + 11, depth: 8, gap: 1.6, growth: 0.25 });
  // The scrub on the rise beyond the swamp, running off to the right, its near end thinning down
  // into the grass; set back so the dogs show against the open ground in front of it.
  const scrubBase = curve(180, W + 4, (x) => 92 - ((x - 214) / 190) * 3 + 1.2 * Math.sin(x / 19) + (x < 240 ? ((240 - x) / 60) ** 2 * 18 : 0));
  const scrubTop = canopy(scrubBase, { seed: seed + 30, size: 6.5, tall: 0.22, from: 196 });
  m.push({ d: areaPath(scrubTop, H + 2), c: 'pp' });
  m.push({ d: bandPath(scrubTop, shift(scrubBase, 3)), c: 'f3' });
  contourHatch(shift(scrubBase, 3), { seed: seed + 31, depth: 8, gap: 1.2, growth: 0.3 }).forEach((d, i) => d && m.push({ d, c: `l3 o${i}`, w: 0.5 }));
  // The swamp head: low rushy ground, a pool in it on the left.
  const g = flat(108, seed, 0.8);
  hills(m, g, H + 2, 2, { seed: seed + 20, depth: 8, gap: 1.6, growth: 0.35 });
  const pool = `M14 111C40 109.4 140 109.2 172 111.2C160 119.6 64 124.4 20 119.8Z`;
  const wh = waterHatch({ seed: seed + 21, from: 16, to: 170, top: 111, bottom: 123, gap: 1 });
  m.push({ d: pool, c: 'pp' }, { d: wh.light, c: 'lw', w: 0.55 }, { d: wh.dark, c: 'lw', w: 0.7 }, { d: pool, c: 'l3', w: 0.55 });
  m.push({ d: tufts(curve(6, 184, (x) => 110.6 + 0.4 * Math.sin(x / 5)), { seed: seed + 22, from: 8, to: 180, every: 6, h: 9, blades: 5 }), c: 'l3', w: 0.42 });
  m.push({ d: tufts(curve(10, 206, (x) => 125 + 0.5 * Math.sin(x / 6)), { seed: seed + 23, from: 12, to: 200, every: 7, h: 8, blades: 4 }), c: 'l4', w: 0.48 });
  // The camp: the fire, the kettle, the packs on the ground.
  campfire(m, { seed: seed + 40, x: 204, y: yAt(g, 204) + 2, s: 1.4, smoke: 40, drift: 0.25 });
  kettle(m, 222, yAt(g, 222) + 2, 1.4);
  sack(m, 186, yAt(g, 186) + 2, 1.6);
  bedroll(m, 196, yAt(g, 196) + 9, 1.4);
  // Two of the party on their feet, turned to the scrub; the dogs away after the sound, across the
  // open ground toward it.
  const fig = emptyFigure();
  standing(fig, 246, yAt(g, 246) + 4, 1.3, { leader: false, arms: 'down' });
  standing(fig, 266, yAt(g, 266) + 4, 1.3, { leader: true, arms: 'point' });
  dogRunning(fig, 312, yAt(g, 312) + 2, 1.25, { phase: 0.4 });
  dogRunning(fig, 352, yAt(g, 352) - 1, 1.15, { phase: -0.5 });
  m.push(...figureMarks(fig));
  gum(m, { seed: seed + 60, x: 30, y: yAt(g, 30) + 1, h: 110, lean: 0.07, spread: 0.85, density: 0.45, depth: 3 });
  return { w: W, h: H, marks: m };
}

/**
 * An old camp (31 May): open grass country west of the range, gums standing wide apart, and in the
 * grass the ashes of fires left the day before. The party has come upon them; a leader stands over
 * the nearest, the dogs nosing round it.
 */
function signsCamps(seed = 351): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 80, clouds: [cloudBank(seed + 1, 300, 34, 170, 22, 8), cloudBank(seed + 2, 90, 24, 120, 14, 5)], reach: 0.7 });
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 78, amp: 2, scale: 140, plateau: 0.3 });
  hills(m, far, H, 0, { seed: seed + 11, depth: 6, gap: 1.7, growth: 0.3 }, 0.5);
  const mid = curve(-4, W + 4, (x) => 92 + 3 * Math.sin(x / 60 + 2) + 1.2 * Math.sin(x / 17));
  hills(m, mid, H, 1, { seed: seed + 20, depth: 10, gap: 1.6, growth: 0.25 });
  for (const [i, x] of [24, 120, 214, 300, 366].entries()) farGum(m, { seed: seed + 30 + i, x, y: yAt(mid, x) + 0.5, h: 22 + (i % 3) * 6, tone: 1 });
  const g = flat(108, seed, 1);
  hills(m, g, H + 2, 2, { seed: seed + 40, depth: 8, gap: 1.6, growth: 0.3 });
  // Tall grass, "covered with high good grass", trodden flat round the fires.
  const trodden = (x0: number, x1: number) => [x0, x1] as const;
  const clear = [trodden(196, 336)];
  const grass = (c: typeof g, every: number, h: number, seedK: number, cls: string, w: number) => {
    let from = 2;
    for (const [a, b] of [...clear, [W + 10, W + 10] as const]) {
      if (a > from) m.push({ d: tufts(c, { seed: seed + seedK + a, from, to: Math.min(W - 2, a), every, h, blades: 5 }), c: cls, w });
      from = b;
    }
  };
  grass(g, 6, 9, 41, 'l3', 0.42);
  grass(shift(g, 16), 7, 10, 42, 'l4', 0.48);
  // The ashes: grey patches on the trodden ground, charcoal at their hearts, a few burnt sticks.
  const r = rng(seed + 50);
  for (const [x, y, s] of [
    [258, 122, 2.1],
    [314, 114.5, 1.4],
    [214, 114, 1.2],
  ] as const) {
    const blob = (rx: number, ry: number) => {
      const pts: string[] = [];
      for (let k = 0; k < 14; k++) {
        const a = (k / 14) * Math.PI * 2;
        const j = 0.82 + r() * 0.3;
        pts.push(`${f(x + Math.cos(a) * rx * j)} ${f(y + Math.sin(a) * ry * j)}`);
      }
      return `M${pts.join('L')}Z`;
    };
    // A pale ring of ash on the trodden ground, finely stippled, ruled in shadow along its near edge.
    const ash = blob(11 * s, 2.8 * s);
    m.push({ d: blob(13 * s, 3.4 * s), c: 'pp' }, { d: ash, c: 'l2', w: 0.35 });
    const dots: string[] = [];
    for (let k = 0; k < 26 * s; k++) {
      const a = r() * Math.PI * 2;
      const d = Math.sqrt(r());
      dots.push(`M${f(x + Math.cos(a) * 10 * s * d)} ${f(y + Math.sin(a) * 2.5 * s * d)}h0.01`);
    }
    m.push({ d: dots.join(''), c: 'l2', w: 0.8 });
    m.push({ d: `M${f(x - 9 * s)} ${f(y + 1.6 * s)}Q${f(x)} ${f(y + 3.4 * s)} ${f(x + 9 * s)} ${f(y + 1.4 * s)}`, c: 'l3', w: 0.45 });
    // Charcoal at the heart, and the burnt ends of the sticks it was laid with.
    m.push({ d: blob(3.6 * s, 1 * s), c: 'f4' });
    m.push({ d: `M${f(x - 7 * s)} ${f(y - 0.4 * s)}L${f(x + 1 * s)} ${f(y - 0.9 * s)}M${f(x + 0.6 * s)} ${f(y + 0.6 * s)}L${f(x + 7.5 * s)} ${f(y - 0.2 * s)}M${f(x - 2.4 * s)} ${f(y - 1.2 * s)}L${f(x + 2.6 * s)} ${f(y + 0.9 * s)}`, c: 'l4', w: 0.65 * s });
  }
  gum(m, { seed: seed + 60, x: 372, y: yAt(g, 372) + 1, h: 120, lean: -0.05, spread: 0.95, density: 0.45, depth: 3 });
  const { fig: party } = procession({ servants: 1, horses: 2, dogs: 0 }, g, { from: 20, to: 170, maxScale: 0.85, seed: seed + 70, phase: 0 });
  m.push(...figureMarks(party));
  const fig = emptyFigure();
  standing(fig, 232, 123, 1.35, { leader: true, arms: 'down', lean: 0.22 });
  standing(fig, 196, 118, 1.25, { leader: true, arms: 'gunRest' });
  dog(fig, 292, 123, 1.25, 0.4);
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m };
}

/** The card plates drawn the same every time, by card id. */
export const CARD_PLATES: Record<string, () => Scene> = {
  ridgeMethod: () => ridgeMethod(),
  distanceByClock: () => distanceByClock(),
  cairn: () => cairn(),
  wombats: () => wombats(),
  rockWall: () => rockWall(),
  gullyWater: () => gullyWater(),
  kangarooDogs: () => kangarooDogs(),
  frost: () => frost(),
  saltMeat: () => saltMeat(),
  after1813: () => after1813(),
  'signs-huts': () => signsHuts(),
  'signs-woodcutter': () => signsWoodcutter(),
  'signs-camps': () => signsCamps(),
};

export const CARD_PLATE_LABEL: Record<string, string> = {
  ridgeMethod: 'An engraving: one ridge running away to the horizon between two misty valleys, its flanks falling to the forest on both sides; at its near end a man blazes a gum as the party follows.',
  distanceByClock: 'An engraving: a pocket watch lying open on a rock ledge at two o’clock, its chain run out, beside an open field book with a column of figures and a pencil; the ridges small and far below.',
  cairn: 'An engraving: a rough pile of flat stones on the crest of a ridge that falls away on both sides, a leader pointing it out to a man resting on his gun.',
  wombats: 'An engraving: a wombat ambling across the sand to its burrow in a bank, its paired tracks behind it, prickly brush all round.',
  rockWall: 'An engraving: looking along a narrow ridge with precipices either side to a tiered mass of sandstone across its whole breadth, a man shifting stones in the one cleft through it, the party waiting.',
  gullyWater: 'An engraving: the camp on a narrow ridge, the gully far below, two men climbing the face with kettles.',
  kangarooDogs: 'An engraving: three kangaroo dogs running down a kangaroo through open forest.',
  frost: 'An engraving: dawn on a frosty camp, the men asleep under blankets, a kangaroo leg hanging frozen from a meat pole.',
  saltMeat: 'An engraving: an open cask of salt meat by a dying fire, a man laid up under his blanket.',
  after1813: 'An engraving: a road cut slantwise across a ridge and over its crest, stumps along it, nobody on it.',
  'signs-huts': 'An engraving: open forest on the foothills, a line of old blazes cut in the gums running on through the trees, the party halted at the first of them, a leader pointing on along the line.',
  'signs-woodcutter': 'An engraving: evening at a swamp camp, the dogs racing off into the dark scrub, two of the party on their feet looking after them.',
  'signs-camps': 'An engraving: open grass country west of the range, the ashes of old fires in the grass, a leader standing over them, the dogs nosing round.',
};

/** Where each plate's subject is, for its thumbnail: x, y, width, height in the plate's units. */
export const CARD_FOCUS: Record<string, readonly [number, number, number, number]> = {
  ridgeMethod: [96, 44, 230, 96],
  distanceByClock: [64, 40, 250, 96],
  cairn: [96, 52, 200, 86],
  wombats: [180, 76, 200, 64],
  rockWall: [84, 30, 240, 96],
  gullyWater: [10, 26, 240, 100],
  kangarooDogs: [120, 52, 240, 86],
  frost: [110, 54, 230, 82],
  saltMeat: [64, 64, 230, 76],
  after1813: [100, 60, 240, 80],
  'signs-huts': [60, 50, 240, 90],
  'signs-woodcutter': [140, 60, 230, 80],
  'signs-camps': [130, 70, 230, 70],
};

/** The cards whose plate draws the party as it is now, at the place the card is found. */
export const MILESTONE_IDS = ['viewBack', 'highHeath', 'wayDown', 'sugarloaf'] as const;
export const isMilestone = (id: string) => (MILESTONE_IDS as readonly string[]).includes(id);

/**
 * The cards drawn on the Country landscape: Whose Country, and the fires of 26 May, which the party
 * saw across just such a valley (that plate adds two of them on the ledge). The other signs have
 * plates of their own; none draws the people or their huts (see the signs section above).
 */
export const COUNTRY_PLATE_IDS = ['whoseCountry', 'signs-smoke'] as const;
export const isCountryCard = (id: string) => (COUNTRY_PLATE_IDS as readonly string[]).includes(id);

/** Every journal card has a picture: its own plate, the Country landscape, or a milestone plate. */
export function hasCardArt(id: string): boolean {
  return isCountryCard(id) || !!CARD_PLATES[id] || isMilestone(id);
}
