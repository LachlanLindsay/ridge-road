// The plates: engraved scenes for the title, the briefing, the outfitting screen and the end of a
// run. Each is drawn from a seed, back to front: sky, far ridges in haze, nearer ridges darker, then
// the foreground. Ridges are filled with paper so nearer ones hide what lies behind them, and each
// one's hatching fades out before the next, leaving white haze between them.
import { useMemo } from 'preact/hooks';
import { useInfo } from '../Info';
import { outfit1813, packHorses } from '../outfitting';
import type { Who } from '../people';
import { figureMarks, procession, type Mark, type Pack, type PartyCounts, type Slot } from './figures';
import {
  areaPath,
  bandPath,
  canopy,
  cliffFace,
  cloudBank,
  contourHatch,
  curve,
  grassTree,
  gumTree,
  linePath,
  ridgeLine,
  shift,
  skyHatch,
  smoke,
  smooth,
  tufts,
  waterHatch,
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

const COUNTS_1813: PartyCounts = { servants: 4, horses: 4, dogs: 5 };

/** How the 1813 party's horses were loaded, by the same packing as the outfitting screen. */
export function loads1813(): Pack[] {
  return packHorses(outfit1813());
}

/** Stroke weight of hatching, by tone from the far haze (0) to the foreground ink (4). */
const TONE_W = [0.38, 0.44, 0.52, 0.6, 0.68];

function sky(m: Mark[], o: { seed: number; w: number; horizon: number; clouds: Ellipse[][]; reach?: number }) {
  const s = skyHatch({ seed: o.seed, w: o.w, horizon: o.horizon, clouds: o.clouds, gap: 2, reach: o.reach });
  s.bands.forEach((d, i) => d && m.push({ d, c: `l1 o${i}`, w: 0.36 }));
  if (s.clouds) m.push({ d: s.clouds, c: 'l1 o1', w: 0.32 });
}

/**
 * One range of hills: paper to hide what lies behind, a band of treetops along the crest, contour
 * hatching that follows the ground down the slope, and the skyline itself.
 */
function hills(m: Mark[], ground: Curve, bottom: number, tone: number, h: HatchOpts, crown?: number): Curve {
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

function gum(m: Mark[], o: Parameters<typeof gumTree>[0], tone = 4) {
  const g = gumTree(o);
  m.push({ d: g.wood, c: `f${tone}` }, { d: g.leaves, c: `f${tone}` });
}

/** A rock ledge in the foreground: dark, hatched across, with grass along its lip. */
function ledge(m: Mark[], top: Curve, bottom: number, seed: number) {
  m.push({ d: areaPath(top, bottom), c: 'pp' });
  contourHatch(top, { seed, depth: 34, gap: 1, growth: 0.05, bias: 0.45, light: 0.5 }).forEach((d, i) => d && m.push({ d, c: `l4 o${i}`, w: 0.6 }));
  m.push({ d: linePath(top), c: 'l4', w: 1 });
}

// ---------------------------------------------------------------- the plates

/** Title: from a lookout, the ridges going back in haze, a gum leaning out over the drop. */
export function vista(seed = 3): Scene {
  const W = 400;
  const H = 220;
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 124, clouds: [cloudBank(seed + 1, 300, 40, 150, 30, 7), cloudBank(seed + 2, 178, 70, 90, 14, 5)] });
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 98, amp: 4.5, scale: 120, plateau: 0.8, gullies: 6, gullyDepth: 5, gullyWidth: 8 });
  hills(m, far, H, 0, { seed: seed + 12, depth: 10, gap: 1.5, growth: 0.25 }, 0.7);
  const mid = ridgeLine({ seed: seed + 20, x0: -4, x1: W + 4, base: 113, amp: 7, scale: 80, plateau: 0.6, gullies: 5, gullyDepth: 8, gullyWidth: 11 });
  hills(m, mid, H, 1, { seed: seed + 22, depth: 14, gap: 1.4, growth: 0.2 }, 1);
  const near = ridgeLine({ seed: seed + 30, x0: -4, x1: W + 4, base: 134, amp: 10, scale: 62, plateau: 0.35, gullies: 4, gullyDepth: 10, gullyWidth: 14 });
  hills(m, near, H, 2, { seed: seed + 32, depth: 20, gap: 1.3, growth: 0.15, bias: 0.1 }, 1.4);
  const front = ridgeLine({ seed: seed + 40, x0: -4, x1: W + 4, base: 166, amp: 12, scale: 52, plateau: 0.15, tilt: -0.03 });
  hills(m, front, H, 3, { seed: seed + 42, depth: 36, gap: 1.15, growth: 0.1, bias: 0.25 }, 2.1);
  // The lookout: a sandstone ledge in the left foreground, ending in a drop.
  const edgeX = 166;
  const top = curve(-4, edgeX, (x) => 184 - (x / edgeX) * 6 + 1.2 * Math.sin(x / 9) + (x > edgeX - 16 ? ((x - edgeX + 16) / 16) ** 2 * 5 : 0));
  ledge(m, top, H + 2, seed + 50);
  const face: string[] = [];
  for (let x = edgeX - 6; x <= edgeX + 0.01; x += 1.2) face.push(`M${x.toFixed(1)} ${(yAt(top, x) + 1).toFixed(1)}V${H}`);
  m.push({ d: face.join(''), c: 'l4', w: 0.55 }, { d: `M${edgeX} ${yAt(top, edgeX).toFixed(1)}V${H}`, c: 'l4', w: 1 });
  m.push({ d: tufts(top, { seed: seed + 51, from: 4, to: edgeX - 8, every: 10, h: 7 }), c: 'l4', w: 0.5 });
  gum(m, { seed: seed + 61, x: 128, y: yAt(top, 128) + 1, h: 52, lean: 0.06, spread: 0.9 }, 3);
  gum(m, { seed: seed + 60, x: 46, y: yAt(top, 46) + 2, h: 176, lean: 0.16, spread: 1.15 });
  return { w: W, h: H, marks: m };
}

/** May 1813: the party wading the Nepean, the wall of the range beyond. */
export function ford(seed = 11, loads: Pack[] = loads1813()): Scene {
  const W = 400;
  const H = 200;
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 100, clouds: [cloudBank(seed + 1, 96, 30, 150, 26, 7), cloudBank(seed + 2, 300, 54, 96, 14, 5)] });
  const range = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 80, amp: 2.6, scale: 150, plateau: 0.9, gullies: 6, gullyDepth: 4, gullyWidth: 7, tilt: 0.012 });
  hills(m, range, H, 1, { seed: seed + 12, depth: 20, gap: 1.45, growth: 0.14, light: 1.6 }, 0.7);
  const foothills = ridgeLine({ seed: seed + 20, x0: -4, x1: W + 4, base: 108, amp: 6, scale: 60, plateau: 0.3 });
  hills(m, foothills, H, 2, { seed: seed + 22, depth: 18, gap: 1.35, growth: 0.13 }, 1.2);
  // Trees along the far bank.
  const bankGround = curve(-4, W + 4, (x) => 139 + 1.2 * Math.sin(x / 31));
  const bank = hills(m, bankGround, H, 3, { seed: seed + 32, depth: 2.5, gap: 0.9 }, 2.6);
  // The party, wading: drawn before the water, so the river hides their legs.
  const water = 141.5;
  const { fig, scale } = procession(COUNTS_1813, curve(-4, W + 4, () => water + 6.5), { from: 86, to: 312, maxScale: 0.6, seed: seed + 3, loads });
  m.push(...figureMarks(fig));
  m.push({ d: `M-4 ${water}H${W + 4}V${H + 2}H-4Z`, c: 'pp' });
  const wh = waterHatch({ seed: seed + 40, from: -4, to: W + 4, top: water, bottom: 184, gap: 1.5, bank, squash: 1 });
  m.push({ d: wh.dark, c: 'l3', w: 0.5 }, { d: wh.light, c: 'lw', w: 0.42 });
  // Ripples where the party breaks the surface.
  const rip: string[] = [];
  for (let x = 88; x < 312; x += 9 + (x % 4)) rip.push(`M${(x - 4 * scale).toFixed(1)} ${water + 1.4}q${(4 * scale).toFixed(1)} 1.3 ${(8 * scale).toFixed(1)} 0`);
  m.push({ d: rip.join(''), c: 'lw', w: 0.5 });
  // The near bank.
  const near = curve(-4, W + 4, (x) => 182 + 2.5 * Math.sin(x / 40 + 1) - (x > 300 ? (x - 300) * 0.14 : 0));
  ledge(m, near, H + 4, seed + 50);
  m.push({ d: tufts(near, { seed: seed + 51, from: 0, to: W, every: 8, h: 6 }), c: 'l4', w: 0.5 });
  gum(m, { seed: seed + 60, x: 364, y: yAt(near, 364) + 2, h: 170, lean: -0.12, spread: 1 });
  return { w: W, h: H, marks: m };
}

/** The ranges, the ridge top and the gums of the party plate: drawn once per seed, then reused. */
const BACKDROPS = new Map<number, { before: Mark[]; after: Mark[]; track: Curve }>();

function partyBackdrop(seed: number, W: number, H: number) {
  const hit = BACKDROPS.get(seed);
  if (hit) return hit;
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 112, clouds: [cloudBank(seed + 1, 290, 30, 130, 24, 6), cloudBank(seed + 2, 120, 48, 80, 12, 4)] });
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 96, amp: 3.5, scale: 110, plateau: 0.8, gullies: 3 });
  hills(m, far, H, 0, { seed: seed + 12, depth: 10, gap: 1.6, growth: 0.22 }, 0.6);
  const mid = ridgeLine({ seed: seed + 20, x0: -4, x1: W + 4, base: 112, amp: 5, scale: 80, plateau: 0.5, gullies: 3 });
  hills(m, mid, H, 1, { seed: seed + 22, depth: 14, gap: 1.5, growth: 0.18 }, 0.9);
  // The ridge top the party walks: open forest, a few gums standing back from the track.
  const track = smooth(ridgeLine({ seed: seed + 30, x0: -4, x1: W + 4, base: 146, amp: 2, scale: 90 }), 4);
  for (const [i, x] of [92, 214, 318, 386].entries()) gum(m, { seed: seed + 70 + i, x, y: yAt(track, x) + 1, h: 44 + (i % 2) * 14, lean: (i % 2 ? -0.05 : 0.06), density: 0.9 }, 2);
  hills(m, track, H + 2, 3, { seed: seed + 32, depth: 30, gap: 1.2, growth: 0.12, bias: 0.12 });
  m.push({ d: tufts(track, { seed: seed + 33, from: 0, to: W, every: 10, h: 5 }), c: 'l3', w: 0.45 });
  const after: Mark[] = [];
  gum(after, { seed: seed + 60, x: 16, y: yAt(track, 16) + 16, h: 132, lean: 0.07, spread: 0.85 });
  const out = { before: m.map((mk, i) => ({ ...mk, k: `b${i}` })), after: after.map((mk, i) => ({ ...mk, k: `a${i}` })), track };
  BACKDROPS.set(seed, out);
  return out;
}

/**
 * The party on the march along a ridge top, against the ranges behind. Only the procession is
 * drawn afresh, so the plate keeps up as the outfit changes.
 */
export function partyPlate(counts: PartyCounts, seed = 5, loads?: Pack[]): Scene {
  const W = 400;
  const H = 170;
  const b = partyBackdrop(seed, W, H);
  const { fig, slots } = procession(counts, b.track, { from: 44, to: 376, maxScale: 0.92, seed: seed + 3, loads });
  const party = figureMarks(fig).map((mk, i) => ({ ...mk, k: `p${i}` }));
  return { w: W, h: H, marks: [...b.before, ...party, ...b.after], slots, loads };
}

/** Whose Country: across a valley to a cliffed wall, smoke rising from fires far below. */
export function country(seed = 21): Scene {
  const W = 400;
  const H = 200;
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 80, clouds: [cloudBank(seed + 1, 250, 26, 150, 22, 7)] });
  // The far wall: plateau, a pale cliff band, then dark forested slopes down into the valley.
  const topGround = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 64, amp: 3.5, scale: 120, plateau: 0.85, gullies: 4, gullyDepth: 6, gullyWidth: 10 });
  const top = hills(m, topGround, H, 1, { seed: seed + 13, depth: 3, gap: 1 }, 0.8);
  void top;
  const cliff = cliffFace(topGround, { seed: seed + 12, height: 22, cover: 0.4, gap: 2.6, cap: 2 });
  m.push({ d: cliff.face, c: 'l1', w: 0.42 }, { d: cliff.beds, c: 'l1', w: 0.36 });
  const talus = hills(m, cliff.foot, H, 3, { seed: seed + 15, depth: 54, gap: 1.05, growth: 0.1, bias: 0.4 }, 1.2);
  void talus;
  // The valley floor, all forest, seen from above.
  const floor = curve(-4, W + 4, (x) => 140 + 2.2 * Math.sin(x / 37) + 1.2 * Math.sin(x / 13 + 2));
  hills(m, floor, H, 2, { seed: seed + 16, depth: 14, gap: 1.2, growth: 0.2 }, 1);
  // Smoke from fires down there: pale wisps rising against the dark slope.
  for (const [i, s] of [
    { x: 168, y: 142, h: 64, drift: 0.34 },
    { x: 246, y: 141, h: 52, drift: 0.4 },
    { x: 312, y: 143, h: 40, drift: 0.46 },
  ].entries()) {
    const bands = smoke({ seed: seed + 20 + i, ...s });
    bands.forEach((d, j) => d && m.push({ d, c: 'lp', w: 3.4 - j * 0.7 }));
    bands.forEach((d, j) => d && m.push({ d, c: `ls o${j}`, w: 0.55 }));
  }
  // A nearer spur coming in from the left, cliffed along its flank.
  const spurGround = curve(-4, 152, (x) => (x < 128 ? 108 + (x / 128) * 8 : 116 + ((x - 128) / 24) ** 1.6 * 64) + 1.1 * Math.sin(x / 11));
  hills(m, spurGround, H, 3, { seed: seed + 31, depth: 3, gap: 0.9 }, 1.6);
  const spurCliff = cliffFace(spurGround, { seed: seed + 32, height: 16, cover: 0.8, gap: 1.7, cap: 2.6, to: 126 });
  m.push({ d: spurCliff.face, c: 'l3', w: 0.48 }, { d: spurCliff.beds, c: 'l3', w: 0.4 });
  contourHatch(spurCliff.foot, { seed: seed + 33, depth: 50, gap: 1, growth: 0.06, bias: 0.5, to: 152 }).forEach((d, i) => d && m.push({ d, c: `l4 o${i}`, w: 0.55 }));
  // The ledge in the right foreground, with a grass tree and a gum.
  const lip = curve(236, W + 4, (x) => 180 - ((x - 236) / 168) * 14 + 1.1 * Math.sin(x / 8));
  ledge(m, lip, H + 2, seed + 40);
  m.push({ d: `M236 ${yAt(lip, 236).toFixed(1)}V${H}`, c: 'l4', w: 0.9 });
  m.push({ d: tufts(lip, { seed: seed + 41, from: 244, to: W, every: 12, h: 6 }), c: 'l4', w: 0.5 });
  const gt = grassTree({ seed: seed + 42, x: 318, y: yAt(lip, 318) + 1, h: 40 });
  m.push({ d: gt.trunk, c: 'f4' }, { d: gt.leaves, c: 'l4', w: 0.42 }, { d: gt.spike, c: 'l4', w: 1.1 });
  gum(m, { seed: seed + 43, x: 380, y: yAt(lip, 380) + 2, h: 168, lean: -0.13, spread: 0.95 });
  return { w: W, h: H, marks: m };
}

/** Crossed: from the last ridge, open grassy country rolling west to the sugarloaf hill. */
export function crossed(counts: PartyCounts, seed = 31, loads?: Pack[]): Scene {
  const W = 400;
  const H = 180;
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 112, clouds: [cloudBank(seed + 1, 120, 34, 160, 28, 8), cloudBank(seed + 2, 330, 22, 110, 18, 6)], reach: 0.7 });
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 104, amp: 2, scale: 140, plateau: 0.3 });
  hills(m, far, H, 0, { seed: seed + 11, depth: 6, gap: 1.7, growth: 0.3 }, 0.5);
  // The sugarloaf: a lone cone standing out of the plain.
  const cone = smooth(
    curve(-4, W + 4, (x) => {
      const t = Math.abs(x - 262) / 64;
      const rise = t < 1 ? 40 * (1 - t) ** 1.3 : 0;
      return 112 - rise + 1.2 * Math.sin(x / 17);
    }),
    5,
  );
  hills(m, cone, H, 2, { seed: seed + 12, depth: 30, gap: 1.35, growth: 0.1, light: 2.2 }, 0.7);
  // Rolling grass country, open forest dotted across it.
  const roll = curve(-4, W + 4, (x) => 124 + 3 * Math.sin(x / 47 + 1) + 2 * Math.sin(x / 19));
  hills(m, roll, H, 1, { seed: seed + 13, depth: 10, gap: 1.6, growth: 0.25 });
  for (const [i, x] of [196, 214, 300, 338, 352, 384].entries()) gum(m, { seed: seed + 40 + i, x, y: yAt(roll, x) + 0.5, h: 16 + (i % 3) * 5, density: 0.8 }, 2);
  // A creek winding across the flats, a line of trees along it.
  const creek: string[] = [];
  for (let x = 150; x < W + 4; x += 2) creek.push(`${creek.length ? 'L' : 'M'}${x} ${(146 + 4 * Math.sin(x / 23) + 2 * Math.sin(x / 7)).toFixed(1)}`);
  const flats = curve(-4, W + 4, (x) => 138 + 2 * Math.sin(x / 31));
  hills(m, flats, H, 2, { seed: seed + 14, depth: 6, gap: 1.6, growth: 0.3 });
  m.push({ d: creek.join(''), c: 'lw', w: 0.9 });
  for (const [i, x] of [232, 266, 318, 372].entries()) gum(m, { seed: seed + 50 + i, x, y: yAt(flats, x) + 0.5, h: 24 + (i % 2) * 8, density: 0.9 }, 3);
  // The last ridge in the left foreground, where the party stands looking out.
  const ridge = curve(-4, 196, (x) => 150 - (x / 196) * 6 + 1.2 * Math.sin(x / 9) + (x > 170 ? ((x - 170) / 26) ** 2 * 30 : 0));
  ledge(m, ridge, H + 2, seed + 60);
  m.push({ d: tufts(ridge, { seed: seed + 61, from: 4, to: 180, every: 9, h: 6 }), c: 'l4', w: 0.5 });
  const { fig, slots } = procession(counts, ridge, { from: 44, to: 168, maxScale: 0.5, seed: seed + 3, loads });
  m.push(...figureMarks(fig));
  gum(m, { seed: seed + 62, x: 18, y: yAt(ridge, 18) + 2, h: 140, lean: 0.1, spread: 0.9 });
  return { w: W, h: H, marks: m, slots };
}

/** Repulsed: the ridge ends at a precipice over a gorge, and the far wall gives no way on. */
export function repulsed(counts: PartyCounts, seed = 41, loads?: Pack[]): Scene {
  const W = 400;
  const H = 180;
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 70, clouds: [cloudBank(seed + 1, 250, 26, 220, 26, 9)], reach: 0.95 });
  // The far wall: a tall cliff band under the plateau, dark forest below, mist in the gorge.
  const wall = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 56, amp: 2.5, scale: 120, plateau: 0.85, gullies: 2, gullyDepth: 5 });
  hills(m, wall, H, 1, { seed: seed + 11, depth: 2.5, gap: 1 }, 0.8);
  const cliff = cliffFace(wall, { seed: seed + 12, height: 40, cover: 0.8, gap: 2, cap: 2 });
  m.push({ d: cliff.face, c: 'l2', w: 0.45 }, { d: cliff.beds, c: 'l2', w: 0.38 });
  hills(m, cliff.foot, H, 3, { seed: seed + 13, depth: 40, gap: 1.05, growth: 0.12, bias: 0.35 }, 1.1);
  // The near ridge, ending in a sheer drop.
  const edgeX = 236;
  const ridge = curve(-4, edgeX, (x) => 116 + (x / edgeX) * 4 + 1.1 * Math.sin(x / 10));
  ledge(m, ridge, H + 2, seed + 20);
  const near = cliffFace(ridge, { seed: seed + 21, height: 8, cover: 0.9, gap: 1.6, cap: 1.5, to: edgeX - 2 });
  m.push({ d: near.beds, c: 'l4', w: 0.45 });
  const drop: string[] = [];
  for (let x = edgeX - 9; x <= edgeX + 0.01; x += 1.1) drop.push(`M${x.toFixed(1)} ${(yAt(ridge, x) + 1).toFixed(1)}V${H}`);
  m.push({ d: drop.join(''), c: 'l4', w: 0.55 }, { d: `M${edgeX} ${yAt(ridge, edgeX).toFixed(1)}V${H}`, c: 'l4', w: 1 });
  m.push({ d: tufts(ridge, { seed: seed + 22, from: 4, to: edgeX - 12, every: 10, h: 6 }), c: 'l4', w: 0.5 });
  // A dead tree at the brink.
  const dead = gumTree({ seed: seed + 23, x: edgeX - 22, y: yAt(ridge, edgeX - 22) + 1, h: 70, lean: 0.12, spread: 1.1 });
  m.push({ d: dead.wood, c: 'f4' });
  const { fig, slots } = procession(counts, ridge, { from: 40, to: edgeX - 40, maxScale: 0.55, seed: seed + 3, loads });
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m, slots };
}

// ---------------------------------------------------------------- drawing a plate

/** An invisible box over one figure: point at it for that man's, horse's or the dogs' card. */
function HitBox({ slot, dogs, load }: { slot: Slot; dogs: number; load?: Pack }) {
  const w = slot.who;
  const who: Who = w.kind === 'dog' ? { kind: 'dogs', count: dogs } : w.kind === 'horse' ? { ...w, load } : w;
  const info = useInfo(who, 'tap');
  return <rect class="art-hit" x={slot.x} y={slot.y} width={slot.w} height={slot.h} {...info.props} />;
}

export function Plate({ scene, label, class: cls, dogs }: { scene: Scene; label: string; class?: string; dogs?: number }) {
  return (
    <svg class={cls ? `art ${cls}` : 'art'} viewBox={`0 0 ${scene.w} ${scene.h}`} role="img" aria-label={label}>
      {scene.marks.map((mk, i) => (
        <path key={mk.k ?? i} d={mk.d} class={mk.c} stroke-width={mk.w} />
      ))}
      {dogs !== undefined && scene.slots && (
        <g aria-hidden="true">
          {scene.slots.map((sl, i) => (
            <HitBox key={i} slot={sl} dogs={dogs} load={sl.who.kind === 'horse' ? scene.loads?.[sl.who.id - 1] : undefined} />
          ))}
        </g>
      )}
    </svg>
  );
}

/** A signature of the loads, so a plate redraws only when what the horses carry changes. */
function loadKey(loads: Pack[] | undefined): string {
  return loads ? loads.map((l) => `${Math.round(l.total)}:${Object.entries(l.items).map(([k, v]) => `${k}${Math.round((v ?? 0) * 10)}`).join(',')}`).join('|') : '';
}

/** One plate per briefing card, in the cards' order: whose Country, May 1813, the party. */
const BRIEFING_ART = [
  { make: () => country(), label: 'An engraving: across a deep valley to a wall of sandstone cliffs, smoke rising from fires on the valley floor.', hits: false },
  { make: () => ford(), label: 'An engraving: the party wading the Nepean River, the long wall of the Blue Mountains beyond.', hits: false },
  { make: () => partyPlate(COUNTS_1813, 5, loads1813()), label: 'An engraving: seven men, four pack horses and five dogs walking in file along a ridge top.', hits: true },
];

export function BriefingArt({ card }: { card: number }) {
  const art = BRIEFING_ART[card];
  const scene = useMemo(() => art?.make() ?? null, [card]);
  if (!art || !scene) return null;
  return <Plate scene={scene} label={art.label} class="plate" dogs={art.hits ? COUNTS_1813.dogs : undefined} />;
}

export function TitleArt() {
  const scene = useMemo(() => vista(), []);
  return <Plate scene={scene} label="An engraving: from a lookout, ridge after ridge of the Blue Mountains fading into haze, a gum tree leaning out over the drop." class="plate plate-title" />;
}

/** The party on the march, each horse carrying its share; point at anyone for their card. */
export function PartyArt({ counts, loads }: { counts: PartyCounts; loads?: Pack[] }) {
  const key = loadKey(loads);
  const scene = useMemo(() => partyPlate(counts, 5, loads), [counts.servants, counts.horses, counts.dogs, key]);
  const men = 3 + counts.servants;
  return <Plate scene={scene} label={`An engraving of the party: ${men} men, ${counts.horses} pack horses and ${counts.dogs} dogs on the march.`} class="plate" dogs={counts.dogs} />;
}

export function EndArt({ crossed: won, counts, loads }: { crossed: boolean; counts: PartyCounts; loads?: Pack[] }) {
  const key = loadKey(loads);
  const scene = useMemo(() => (won ? crossed(counts, 31, loads) : repulsed(counts, 41, loads)), [won, counts.servants, counts.horses, counts.dogs, key]);
  const label = won
    ? 'An engraving: the party on the last ridge, looking out over open grassy country to a lone conical hill.'
    : 'An engraving: the party at the end of a ridge, a sheer drop before them and a cliffed wall across the gorge.';
  return <Plate scene={scene} label={label} class="plate" />;
}
