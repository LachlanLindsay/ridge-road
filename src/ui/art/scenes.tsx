// The plates: engraved scenes for the title, the briefing, the outfitting screen and the end of a
// run. Each is drawn from a seed, back to front: sky, far ridges in haze, nearer ridges darker, then
// the foreground. Ridges are filled with paper so nearer ones hide what lies behind them, and each
// one's hatching fades out before the next, leaving white haze between them.
import { useMemo } from 'preact/hooks';
import { useInfo } from '../Info';
import { outfit1813, packHorses } from '../outfitting';
import type { Who } from '../people';
import { farGum, gum, hills, ledge, sky, type Scene } from './compose';
import { figureMarks, procession, standing, type Mark, type Pack, type PartyCounts, type Slot } from './figures';
import { bandPath, canopy, cliffFace, cloudBank, contourHatch, curve, grassTree, gumTree, linePath, ridgeLine, rng, shift, smoke, smooth, tufts, waterHatch, yAt, type Curve } from './kit';

export type { Scene };

export const COUNTS_1813: PartyCounts = { servants: 4, horses: 4, dogs: 5 };

/** How the 1813 party's horses were loaded, by the same packing as the outfitting screen. */
export function loads1813(): Pack[] {
  return packHorses(outfit1813());
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
  // Tall, but short of the plate's top fade, so the whole crown shows.
  gum(m, { seed: seed + 60, x: 46, y: yAt(top, 46) + 2, h: 156, lean: 0.16, spread: 1.15 });
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
  hills(m, floor, H, 2, { seed: seed + 16, depth: 64, gap: 1.25, growth: 0.06, bias: 0.12 }, 1);
  // Smoke from fires down there: grey columns, the darkest soft marks in the valley, each kept
  // clear of the hatching by a margin of paper and standing on the smudge of its fire. A fourth,
  // fainter, further off.
  for (const [i, sm] of [
    { x: 168, y: 142, h: 64, drift: 0.34, w: 1.6 },
    { x: 246, y: 141, h: 52, drift: 0.4, w: 1.45 },
    { x: 312, y: 143, h: 40, drift: 0.46, w: 1.3 },
    { x: 206, y: 140, h: 26, drift: 0.5, w: 0.9 },
  ].entries()) {
    const bands = smoke({ seed: seed + 20 + i, x: sm.x, y: sm.y, h: sm.h, drift: sm.drift });
    bands.forEach((d, j) => d && m.push({ d, c: 'lp', w: sm.w * 2.6 - j * 0.6 }));
    bands.forEach((d, j) => d && m.push({ d, c: `${i === 3 ? 'l2' : 'l3'} o${j}`, w: sm.w - j * 0.3 }));
    const fx = sm.x;
    const fy = sm.y + 0.6;
    m.push({ d: `M${(fx - 3.4).toFixed(1)} ${fy.toFixed(1)}Q${fx.toFixed(1)} ${(fy - 3.2).toFixed(1)} ${(fx + 3.4).toFixed(1)} ${fy.toFixed(1)}Z`, c: i === 3 ? 'f2' : 'f3' });
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
  m.push({ d: cliff.face, c: 'l3', w: 0.5 }, { d: cliff.beds, c: 'l3', w: 0.42 });
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
  // A dead tree back from the edge.
  const dead = gumTree({ seed: seed + 23, x: edgeX - 70, y: yAt(ridge, edgeX - 70) + 1, h: 70, lean: 0.12, spread: 1.1 });
  m.push({ d: dead.wood, c: 'f4' });
  // The party halted behind, and a leader at the brink, leaning to look down the drop.
  const { fig, slots } = procession(counts, ridge, { from: 12, to: edgeX - 30, maxScale: 0.55, seed: seed + 3, loads });
  standing(fig, edgeX - 7, yAt(ridge, edgeX - 7), 0.62, { leader: true, arms: 'down', lean: 0.28 });
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m, slots };
}

// ---------------------------------------------------------------- the milestone cards

/** A small house in the distance: walls, a roof, a thread of smoke from the chimney. */
function cottage(m: Mark[], x: number, y: number, s: number, seed: number, smokeH = 0) {
  const P = (dx: number, dy: number) => `${(x + dx * s).toFixed(1)} ${(y + dy * s).toFixed(1)}`;
  m.push({ d: `M${P(-3, 0)}L${P(-3, -2.6)}L${P(3, -2.6)}L${P(3, 0)}Z`, c: 'pk', w: 0.3 });
  m.push({ d: `M${P(-3.8, -2.4)}L${P(-1.6, -4.6)}L${P(1.8, -4.6)}L${P(3.8, -2.4)}Z`, c: 'f3' });
  if (smokeH) smoke({ seed, x: x + 1.6 * s, y: y - 4.6 * s, h: smokeH, drift: 0.6 }).forEach((d, j) => d && m.push({ d, c: `ls o${j}`, w: 0.35 }));
}

/**
 * The view back, 19 May: from the second ridge, east over the colony. The foothills fall away below
 * the party to the Nepean winding across the plain, the farms cleared out of the bush, smoke from
 * the houses, and the plain running on in haze to the horizon.
 */
export function viewBack(counts: PartyCounts, seed = 301, loads?: Pack[]): Scene {
  const W = 400;
  const H = 180;
  const HZ = 96;
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: HZ, clouds: [cloudBank(seed + 1, 260, 34, 220, 26, 9), cloudBank(seed + 2, 90, 52, 120, 12, 5)], reach: 0.82 });
  // The plain: bands of country from the horizon down, paler with distance; rows of fields and
  // bush, the fields ruled in furrows, the bush a dark speckle.
  const r = rng(seed + 10);
  const rows = [HZ, HZ + 2.2, HZ + 5, HZ + 8.6, HZ + 13.2, HZ + 19, HZ + 26.4, HZ + 35.6, HZ + 47];
  m.push({ d: `M-4 ${HZ}H${W + 4}V${H + 2}H-4Z`, c: 'pp' });
  m.push({ d: `M-4 ${HZ}L246 ${HZ}Q262 ${HZ - 4.6} 280 ${HZ - 4.4}Q296 ${HZ - 4.6} 312 ${HZ}L${W + 4} ${HZ}`, c: 'l0', w: 0.6 });
  const furrows: string[][] = [[], [], []];
  const bush: string[][] = [[], [], []];
  const hedges: string[] = [];
  for (let k = 0; k + 1 < rows.length; k++) {
    const y0 = rows[k]!;
    const y1 = rows[k + 1]!;
    const tone = k < 3 ? 0 : k < 6 ? 1 : 2;
    const depth = (y1 - HZ) / (rows[rows.length - 1]! - HZ);
    let x = -4 - r() * 30;
    while (x < W + 4) {
      const wf = (18 + r() * 40) * (0.4 + depth);
      const x1 = x + wf;
      const cleared = r() < 0.5;
      if (cleared) {
        for (let y = y0 + 0.7; y < y1 - 0.2; y += 0.8 + depth * 1.3) furrows[tone]!.push(`M${(x + 0.6).toFixed(1)} ${y.toFixed(1)}H${(x1 - 0.6).toFixed(1)}`);
        hedges.push(`M${x.toFixed(1)} ${y0.toFixed(1)}V${y1.toFixed(1)}`);
      } else {
        for (let i = 0; i < wf * (y1 - y0) * 0.16; i++) {
          const bx = x + r() * wf;
          const by = y0 + 0.4 + r() * (y1 - y0 - 0.4);
          const br = 0.35 + depth * 0.9;
          bush[tone]!.push(`M${(bx - br).toFixed(1)} ${by.toFixed(1)}a${br.toFixed(2)} ${(br * 0.7).toFixed(2)} 0 1 0 ${(br * 2).toFixed(2)} 0Z`);
        }
      }
      x = x1;
    }
  }
  furrows.forEach((f2, i) => f2.length && m.push({ d: f2.join(''), c: `l${i}`, w: 0.32 }));
  bush.forEach((b, i) => b.length && m.push({ d: b.join(''), c: `f${i}` }));
  m.push({ d: hedges.join(''), c: 'l1', w: 0.35 });
  // The Nepean, winding across the plain: a band of light with the water ruled across it.
  const riverY = (x: number) => HZ + 22 + 5 * Math.sin(x / 38 + 1) + 2.4 * Math.sin(x / 13);
  const top = curve(-4, W + 4, (x) => riverY(x) - 1.3 - 0.6 * Math.sin(x / 9));
  const bot = curve(-4, W + 4, (x) => riverY(x) + 1.3 + 0.6 * Math.sin(x / 7));
  m.push({ d: bandPath(top, bot), c: 'pp' });
  const wl: string[] = [];
  for (let x = -4; x < W + 4; x += 2.4 + r() * 2) wl.push(`M${x.toFixed(1)} ${riverY(x).toFixed(1)}h${(1.2 + r() * 2).toFixed(1)}`);
  m.push({ d: wl.join(''), c: 'lw', w: 0.4 }, { d: linePath(top) + linePath(bot), c: 'lw', w: 0.45 });
  // The settlements: houses along the river, smoke from a few chimneys.
  const houses: [number, number, number, number][] = [
    [120, -4, 0.9, 10],
    [131, -3, 0.8, 0],
    [214, 5, 1.1, 12],
    [226, 6, 0.9, 0],
    [318, -6, 0.7, 8],
    [62, 7, 1.2, 14],
  ];
  for (const [i, [hx, dy, hs, sm]] of houses.entries()) cottage(m, hx, riverY(hx) + dy, hs, seed + 20 + i, sm);
  // The foothills falling away below the party, wooded, to the edge of the plain.
  const foot = curve(-4, W + 4, (x) => 150 + 10 * Math.sin(x / 70 + 0.5) + 2 * Math.sin(x / 17) - x * 0.03);
  hills(m, foot, H, 2, { seed: seed + 30, depth: 24, gap: 1.3, growth: 0.15, bias: 0.15 }, 1.8);
  // The party on its ledge, looking out over the colony.
  const ledgeTop = curve(-4, 190, (x) => 158 + (x / 190) * 4 + 1.2 * Math.sin(x / 9) + (x > 168 ? ((x - 168) / 22) ** 2 * 12 : 0));
  ledge(m, ledgeTop, H + 2, seed + 40);
  m.push({ d: tufts(ledgeTop, { seed: seed + 41, from: 4, to: 172, every: 10, h: 6 }), c: 'l4', w: 0.5 });
  const { fig, slots } = procession(counts, ledgeTop, { from: 40, to: 168, maxScale: 0.52, seed: seed + 3, loads });
  m.push(...figureMarks(fig));
  gum(m, { seed: seed + 50, x: 18, y: yAt(ledgeTop, 18) + 2, h: 132, lean: 0.08, spread: 0.9, density: 0.6, depth: 3 });
  return { w: W, h: H, marks: m, slots };
}

/**
 * The high heath, 22 May: the clear summit of the third ridge, two thousand acres without a tree,
 * and the cliffs falling away on both sides that beat every attempt down.
 */
export function highHeath(counts: PartyCounts, seed = 311, loads?: Pack[]): Scene {
  const W = 400;
  const H = 180;
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 104, clouds: [cloudBank(seed + 1, 150, 36, 230, 26, 9), cloudBank(seed + 2, 340, 22, 110, 12, 5)], reach: 0.8 });
  // Across the gorge: plateau after plateau, each with its band of cliff.
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 92, amp: 2.5, scale: 120, plateau: 0.9, gullies: 4, gullyDepth: 4, gullyWidth: 9 });
  hills(m, far, H, 0, { seed: seed + 11, depth: 3, gap: 1.4 });
  const fc = cliffFace(far, { seed: seed + 12, height: 12, cover: 0.7, gap: 2.4, cap: 1 });
  m.push({ d: fc.face, c: 'l0', w: 0.38 });
  hills(m, fc.foot, H, 1, { seed: seed + 13, depth: 14, gap: 1.5, growth: 0.25 });
  const left = ridgeLine({ seed: seed + 24, x0: -4, x1: 120, base: 116, amp: 2, scale: 60, plateau: 0.9, tilt: 0.04 });
  hills(m, left, H, 1, { seed: seed + 25, depth: 3, gap: 1.2 }, 0.8);
  const lc = cliffFace(left, { seed: seed + 26, height: 18, cover: 0.9, gap: 1.8, cap: 1.2 });
  m.push({ d: lc.face, c: 'l2', w: 0.42 }, { d: lc.beds, c: 'l2', w: 0.36 });
  hills(m, lc.foot, H, 2, { seed: seed + 27, depth: 24, gap: 1.4, growth: 0.15, bias: 0.15 });
  const mid = ridgeLine({ seed: seed + 20, x0: 230, x1: W + 4, base: 112, amp: 2, scale: 90, plateau: 0.9, tilt: -0.02 });
  hills(m, mid, H, 1, { seed: seed + 21, depth: 3, gap: 1.2 }, 0.8);
  const mc = cliffFace(mid, { seed: seed + 22, height: 22, cover: 0.9, gap: 1.8, cap: 1.2 });
  m.push({ d: mc.face, c: 'l2', w: 0.42 }, { d: mc.beds, c: 'l2', w: 0.36 });
  hills(m, mc.foot, H, 2, { seed: seed + 23, depth: 30, gap: 1.3, growth: 0.12, bias: 0.2 }, 1.1);
  // The heath: broad and open, low scrub in patches, grass trees; it ends in a drop at each side.
  const x0 = 22;
  const x1 = 318;
  const heath = curve(x0, x1, (x) => 140 - ((x - x0) / (x1 - x0)) * 4 + 1.1 * Math.sin(x / 13) + 0.5 * Math.sin(x / 4) + Math.max(0, 1 - (x - x0) / 8) ** 2 * 4 + Math.max(0, 1 - (x1 - x) / 8) ** 2 * 4);
  m.push({ d: `${linePath(heath)}L${x1} ${H + 2}L${x0} ${H + 2}Z`, c: 'pp' });
  contourHatch(heath, { seed: seed + 30, depth: 46, gap: 1.3, growth: 0.06, bias: 0.3, light: 0.6 }).forEach((d, i) => d && m.push({ d, c: `l3 o${i}`, w: 0.5 }));
  const drops: string[] = [];
  for (const [ex, dir] of [
    [x0, 1],
    [x1, -1],
  ] as const) {
    for (let k = 0; k <= 7; k++) {
      const x = ex + dir * k * 1.1;
      drops.push(`M${x.toFixed(1)} ${(yAt(heath, x) + 1).toFixed(1)}V${H + 2}`);
    }
  }
  m.push({ d: drops.join(''), c: 'l4', w: 0.55 });
  m.push({ d: `M${x0} ${H + 2}V${yAt(heath, x0).toFixed(1)}${linePath(heath).replace('M', 'L')}L${x1} ${H + 2}`, c: 'l4', w: 1 });
  const r = rng(seed + 31);
  for (let x = x0 + 10; x < x1 - 14; x += 18 + r() * 30) {
    const w = 8 + r() * 14;
    const g = curve(x, x + w, (xx) => yAt(heath, xx) + 0.4, 0.5);
    const top = canopy(g, { seed: seed + 32 + Math.round(x), size: 2.6 + r() * 1.4, tall: 0.1 });
    m.push({ d: bandPath(top, g), c: 'f3' });
  }
  m.push({ d: tufts(heath, { seed: seed + 33, from: x0 + 4, to: x1 - 6, every: 8, h: 5 }), c: 'l3', w: 0.45 });
  for (const [i, x] of [46, 250, 282].entries()) {
    const gt = grassTree({ seed: seed + 40 + i, x, y: yAt(heath, x) + 1, h: 30 + i * 4 });
    m.push({ d: gt.trunk, c: 'f4' }, { d: gt.leaves, c: 'l4', w: 0.4 }, { d: gt.spike, c: 'l4', w: 1 });
  }
  const { fig, slots } = procession(counts, heath, { from: 66, to: 238, maxScale: 0.58, seed: seed + 3, loads });
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m, slots };
}

/**
 * The way down, 28–29 May: the trench cut down the cliff with a hoe, the party leading the horses
 * down it, the forest land below with grass for the horses at last.
 */
export function wayDown(counts: PartyCounts, seed = 321, loads?: Pack[]): Scene {
  const W = 400;
  const H = 180;
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 100, clouds: [cloudBank(seed + 1, 300, 30, 200, 22, 8)], reach: 0.8 });
  // The forest land beyond, rolling away west.
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 98, amp: 3, scale: 120, plateau: 0.3 });
  hills(m, far, H, 0, { seed: seed + 11, depth: 8, gap: 1.6, growth: 0.25 });
  const roll = curve(-4, W + 4, (x) => 118 + 3 * Math.sin(x / 47 + 2) + 1.4 * Math.sin(x / 15));
  hills(m, roll, H, 1, { seed: seed + 12, depth: 12, gap: 1.6, growth: 0.25 });
  for (const [i, x] of [190, 226, 262, 300, 334, 376].entries()) farGum(m, { seed: seed + 20 + i, x, y: yAt(roll, x) + 0.5, h: 18 + (i % 3) * 4, tone: 1 });
  // The grass at the foot of the cliffs, open forest on it.
  const low = curve(-4, W + 4, (x) => 162 + 2 * Math.sin(x / 31));
  hills(m, low, H + 2, 2, { seed: seed + 30, depth: 10, gap: 1.6, growth: 0.3 });
  m.push({ d: tufts(low, { seed: seed + 31, from: 150, to: W - 2, every: 9, h: 5 }), c: 'l2', w: 0.42 });
  gum(m, { seed: seed + 32, x: 356, y: yAt(low, 356) + 1, h: 92, lean: -0.06, spread: 0.9, density: 0.5, depth: 3 }, 3);
  // The talus: a long steep slope from the foot of the cliffs down to the grass.
  const slope = curve(-4, 338, (x) => (x < 150 ? 120 + 0.6 * Math.sin(x / 7) : 120 + 44 * (1 - Math.cos((Math.min(1, (x - 150) / 188) * Math.PI) / 2))) + 0.5 * Math.sin(x / 5));
  hills(m, slope, H + 2, 3, { seed: seed + 39, depth: 40, gap: 1.25, growth: 0.06, bias: 0.25, light: 0.7 });
  // The cliff band on the left, from the plateau down to the talus, and the plateau's scrub on top.
  const edge = 158;
  const plateau = curve(-4, edge, (x) => 64 + 0.8 * Math.sin(x / 11) + (x > edge - 16 ? ((x - edge + 16) / 16) ** 2 * 6 : 0));
  m.push({ d: `${linePath(plateau)}L${edge} ${yAt(slope, edge).toFixed(1)}L-4 ${yAt(slope, -4).toFixed(1)}Z`, c: 'pp' });
  const cliff = cliffFace(plateau, { seed: seed + 40, height: 72, cover: 2, gap: 1.9, cap: 2 });
  m.push({ d: cliff.face, c: 'l3', w: 0.46 }, { d: cliff.beds, c: 'l3', w: 0.4 });
  const top = canopy(plateau, { seed: seed + 41, size: 2.4, to: edge - 14 });
  m.push({ d: bandPath(top, shift(plateau, 1.2), -4, edge - 14), c: 'f3' });
  m.push({ d: linePath(plateau), c: 'l4', w: 0.9 }, { d: `M${edge} ${yAt(plateau, edge).toFixed(1)}L${edge + 1.5} ${yAt(slope, edge + 1.5).toFixed(1)}`, c: 'l4', w: 0.8 });
  // The cut: a shelf slanting across the cliff face, then down the talus, the trench along it.
  const ramp = curve(30, 336, (x) => (x < 150 ? 68 + ((x - 30) / 120) * 50 : yAt(slope, x) - 1.5 - 6 * Math.max(0, 1 - (x - 150) / 40)) + 0.8 * Math.sin(x / 9));
  const below = shift(ramp, 3);
  m.push({ d: bandPath(ramp, below), c: 'pp' });
  m.push({ d: linePath(below), c: 'l4', w: 0.6 }, { d: linePath(shift(ramp, 1.3)), c: 'l3', w: 0.35 });
  const { fig, slots } = procession(counts, ramp, { from: 54, to: 318, maxScale: 0.5, seed: seed + 3, loads });
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m, slots };
}

/** The plate at the head of a milestone card: the party as it is now, at that place. */
export function milestone(id: string, counts: PartyCounts, loads?: Pack[]): Scene | null {
  switch (id) {
    case 'viewBack':
      return viewBack(counts, 301, loads);
    case 'highHeath':
      return highHeath(counts, 311, loads);
    case 'wayDown':
      return wayDown(counts, 321, loads);
    case 'sugarloaf':
      return crossed(counts, 31, loads);
    default:
      return null;
  }
}

export const MILESTONE_LABEL: Record<string, string> = {
  viewBack: 'An engraving: the party on a ledge of the second ridge, looking back east over the foothills to the Nepean winding across the plain, farms and smoke from the houses.',
  highHeath: 'An engraving: the party crossing open heath on the summit of the third ridge, grass trees and low scrub, cliffs falling away into the gorge beyond.',
  wayDown: 'An engraving: the party leading the horses down a cut slanting across the cliff face, forest land and grass below.',
  sugarloaf: 'An engraving: the party on the last ridge, looking out over open grassy country to a lone conical hill.',
};

// ---------------------------------------------------------------- drawing a plate

/** An invisible box over one figure: point at it for that man's, horse's or the dogs' card. */
function HitBox({ slot, dogs, load }: { slot: Slot; dogs: number; load?: Pack }) {
  const w = slot.who;
  const who: Who = w.kind === 'dog' ? { kind: 'dogs', count: dogs } : w.kind === 'horse' ? { ...w, load } : w;
  const info = useInfo(who, 'tap');
  return <rect class="art-hit" x={slot.x} y={slot.y} width={slot.w} height={slot.h} {...info.props} />;
}

/**
 * An engraving as an SVG. `view` shows only part of the scene (a thumbnail's crop), filling the box
 * and cutting off what does not fit.
 */
export function Plate({ scene, label, class: cls, dogs, view }: { scene: Scene; label: string; class?: string; dogs?: number; view?: readonly [number, number, number, number] }) {
  return (
    <svg
      class={cls ? `art ${cls}` : 'art'}
      viewBox={view ? view.join(' ') : `0 0 ${scene.w} ${scene.h}`}
      preserveAspectRatio={view ? 'xMidYMid slice' : undefined}
      role="img"
      aria-label={label}
    >
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
