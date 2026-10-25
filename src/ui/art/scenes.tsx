// The plates: engraved scenes for the title, the briefing, the outfitting screen and the end of a
// run. Each is drawn from a seed, back to front: sky, far ridges in haze, nearer ridges darker, then
// the foreground. Ridges are filled with paper so nearer ones hide what lies behind them, and each
// one's hatching fades out before the next, leaving white haze between them.
import { useMemo } from 'preact/hooks';
import { useInfo } from '../Info';
import { outfit1813, packHorses } from '../outfitting';
import type { Who } from '../people';
import { brinkFace, fallAway, farGum, gum, hills, ledge, sky, smokePlume, stones, underCliff, type Scene } from './compose';
import { emptyFigure, figureMarks, procession, standing, type Mark, type Pack, type PartyCounts, type Slot } from './figures';
import { areaPath, bandPath, canopy, cliffFace, cloudBank, contourHatch, curve, grassTree, gumTree, linePath, ridgeLine, rng, shift, smoke, smooth, taperEnds, tufts, waterHatch, yAt, type Curve } from './kit';

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
  const top = curve(-4, edgeX + 10, (x) => 184 - (x / edgeX) * 6 + 1.2 * Math.sin(x / 9) + fallAway(x, edgeX, 1, 22, 26));
  ledge(m, top, H + 2, seed + 50);
  brinkFace(m, { seed: seed + 52, top, edgeX: edgeX + 4, side: 1, depth: 30, bottom: H });
  m.push({ d: tufts(top, { seed: seed + 51, from: 4, to: edgeX - 8, every: 10, h: 7 }), c: 'l4', w: 0.5 });
  gum(m, { seed: seed + 61, x: 128, y: yAt(top, 128) + 1, h: 46, lean: 0.06, spread: 0.9 });
  // Tall, but short of the plate's top fade, so the whole crown shows.
  gum(m, { seed: seed + 60, x: 46, y: yAt(top, 46) + 2, h: 156, lean: 0.16, spread: 1.15 });
  return { w: W, h: H, marks: m };
}

/**
 * May 1813: the party wading the Nepean, mid-river with the water about their legs, and beyond the
 * far bank the long wall of the range rising from the plain, level along the top, forested, with
 * rock showing under its rim.
 */
export function ford(seed = 11, loads: Pack[] = loads1813(), counts: PartyCounts = COUNTS_1813): Scene {
  const W = 400;
  const H = 200;
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 84, clouds: [cloudBank(seed + 1, 96, 26, 150, 22, 7), cloudBank(seed + 2, 300, 44, 96, 12, 5)] });
  // The wall of the range: a level top, steep forested slopes scored by gullies, rock under the rim.
  const range = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 62, amp: 2.4, scale: 150, plateau: 0.9, gullies: 8, gullyDepth: 5, gullyWidth: 7, tilt: 0.01 });
  hills(m, range, H, 1, { seed: seed + 12, depth: 3, gap: 1 }, 0.7);
  const rim = cliffFace(range, { seed: seed + 13, height: 8, cover: 0.35, gap: 2, cap: 1.4 });
  m.push({ d: rim.face, c: 'l2', w: 0.4 }, { d: rim.beds, c: 'l2', w: 0.36 });
  hills(m, rim.foot, H, 1, { seed: seed + 14, depth: 34, gap: 1.2, growth: 0.1, light: 1.6, bias: 0.15 }, 0.9);
  const foothills = ridgeLine({ seed: seed + 20, x0: -4, x1: W + 4, base: 100, amp: 5, scale: 60, plateau: 0.3 });
  hills(m, foothills, H, 2, { seed: seed + 22, depth: 14, gap: 1.35, growth: 0.13 }, 1.2);
  // The far bank, trees along it, and the broad river.
  const bankGround = curve(-4, W + 4, (x) => 120 + 1.2 * Math.sin(x / 31));
  const bank = hills(m, bankGround, H, 3, { seed: seed + 32, depth: 2.5, gap: 0.9 }, 2.4);
  const far = 122.5;
  m.push({ d: `M-4 ${far}H${W + 4}V${H + 2}H-4Z`, c: 'pp' });
  const wf = waterHatch({ seed: seed + 40, from: -4, to: W + 4, top: far, bottom: 184, gap: 1.5, bank, squash: 1 });
  m.push({ d: wf.dark, c: 'l3', w: 0.5 }, { d: wf.light, c: 'lw', w: 0.42 });
  // The party, wading: drawn on the water, then the river laid again over their legs.
  const water = 146;
  const { fig, scale, slots } = procession(counts, curve(-4, W + 4, () => water + 5), { from: 70, to: 300, maxScale: 0.64, seed: seed + 3, loads });
  m.push(...figureMarks(fig));
  m.push({ d: `M-4 ${water}H${W + 4}V${H + 2}H-4Z`, c: 'pp' });
  const wn = waterHatch({ seed: seed + 41, from: -4, to: W + 4, top: water, bottom: 184, gap: 1.6, squash: 1 });
  m.push({ d: wn.dark, c: 'l3', w: 0.5 }, { d: wn.light, c: 'lw', w: 0.42 });
  // Ripples round each man's, horse's and dog's legs where they break the surface.
  const rip: string[] = [];
  for (const sl of slots) {
    for (let x = sl.x + 1; x < sl.x + sl.w - 1; x += 5 * scale + 1) rip.push(`M${(x - 3 * scale).toFixed(1)} ${(water + 1.2).toFixed(1)}q${(3 * scale).toFixed(1)} 1.4 ${(6 * scale).toFixed(1)} 0`);
    rip.push(`M${(sl.x - 2).toFixed(1)} ${(water + 3).toFixed(1)}h${(sl.w * 0.6).toFixed(1)}M${(sl.x + sl.w * 0.3).toFixed(1)} ${(water + 5).toFixed(1)}h${(sl.w * 0.7).toFixed(1)}`);
  }
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

/**
 * Whose Country: from a ledge across a deep valley to a wall of sandstone cliffs, the valley floor
 * all forest, smoke rising out of the trees from fires far below. With `watchers`, two of the party
 * stand on the ledge looking down, as on 26 May.
 */
export function country(seed = 21, o: { watchers?: boolean } = {}): Scene {
  const W = 400;
  const H = 200;
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 80, clouds: [cloudBank(seed + 1, 250, 26, 150, 22, 7)] });
  // The far wall: plateau, a pale cliff band the whole way along, then dark slopes falling from its
  // foot into the valley (no crest of their own, so the cliffs read as one wall).
  const topGround = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 64, amp: 3.5, scale: 120, plateau: 0.85, gullies: 4, gullyDepth: 6, gullyWidth: 10 });
  hills(m, topGround, H, 1, { seed: seed + 13, depth: 3, gap: 1 }, 0.8);
  const cliff = cliffFace(topGround, { seed: seed + 12, height: 20, cover: 2, gap: 2.6, cap: 2, grain: 0.2, grainScale: 30 });
  m.push({ d: cliff.face, c: 'l1', w: 0.42 }, { d: cliff.beds, c: 'l1', w: 0.36 });
  underCliff(m, cliff.foot, H, 3, { seed: seed + 15, depth: 54, gap: 1.05, growth: 0.1, bias: 0.4 });
  // The valley floor, all forest: low rolling treelines one behind another, the crowns small and
  // close far off, larger near. Smoke rises from fires among the far ones, pale billowing plumes
  // leaning with the wind up over the far wall and thinning away, the nearer trees in front of their feet.
  const treelines = [
    { y: 140, crown: 2.6, tone: 2 },
    { y: 151, crown: 3.4, tone: 3 },
    { y: 165, crown: 4.4, tone: 3 },
    { y: 183, crown: 5.6, tone: 3 },
  ];
  treelines.forEach((t, i) => {
    if (i === 1) {
      for (const [k, sm] of [
        { x: 160, y: 150, h: 70, drift: 0.5 },
        { x: 244, y: 149, h: 58, drift: 0.52 },
        { x: 310, y: 151, h: 46, drift: 0.55 },
        { x: 204, y: 145, h: 28, drift: 0.58 },
      ].entries()) {
        smokePlume(m, { seed: seed + 20 + k, x: sm.x, y: sm.y, h: sm.h, drift: sm.drift, tone: k === 3 ? 1 : 2 });
      }
    }
    const ph = i * 1.7;
    const g = curve(-4, W + 4, (x) => t.y + (1.6 + i * 0.7) * Math.sin(x / (34 + i * 12) + ph) + 0.9 * Math.sin(x / 13 + ph * 2));
    hills(m, g, H + 4, t.tone, { seed: seed + 16 + i * 3, depth: 13 + i * 5, gap: 1.05 + i * 0.1, growth: 0.16, bias: 0.3 }, t.crown);
  });
  // A nearer spur coming in from the left, cliffed along its flank.
  const spurGround = curve(-4, 152, (x) => (x < 128 ? 108 + (x / 128) * 8 : 116 + ((x - 128) / 24) ** 1.6 * 64) + 1.1 * Math.sin(x / 11));
  hills(m, spurGround, H, 3, { seed: seed + 31, depth: 3, gap: 0.9 }, 1.6);
  const spurCliff = cliffFace(spurGround, { seed: seed + 32, height: 16, cover: 0.8, gap: 1.7, cap: 2.6, to: 126 });
  m.push({ d: spurCliff.face, c: 'l3', w: 0.48 }, { d: spurCliff.beds, c: 'l3', w: 0.4 });
  contourHatch(spurCliff.foot, { seed: seed + 33, depth: 50, gap: 1, growth: 0.06, bias: 0.5, to: 152 }).forEach((d, i) => d && m.push({ d, c: `l4 o${i}`, w: 0.55 }));
  // The ledge in the right foreground, its end rounded off where the rock breaks away, with a grass
  // tree and a gum on it.
  const lip = curve(228, W + 4, (x) => {
    const end = x < 246 ? ((246 - x) / 18) ** 2 * 22 : 0;
    return 180 - ((x - 236) / 168) * 14 + 1.1 * Math.sin(x / 8) + end;
  });
  ledge(m, lip, H + 2, seed + 40);
  m.push({ d: tufts(lip, { seed: seed + 41, from: 250, to: W, every: 12, h: 6 }), c: 'l4', w: 0.5 });
  const gt = grassTree({ seed: seed + 42, x: 336, y: yAt(lip, 336) + 1, h: 40 });
  m.push({ d: gt.trunk, c: 'f4' }, { d: gt.leaves, c: 'l4', w: 0.42 }, { d: gt.spike, c: 'l4', w: 1.1 });
  gum(m, { seed: seed + 43, x: 384, y: yAt(lip, 384) + 2, h: 168, lean: -0.13, spread: 0.95 });
  if (o.watchers) {
    const fig = emptyFigure();
    standing(fig, 262, yAt(lip, 262), 1.25, { leader: true, arms: 'point', dir: -1 });
    standing(fig, 286, yAt(lip, 286), 1.25, { leader: true, arms: 'notes', dir: -1 });
    m.push(...figureMarks(fig));
  }
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
  // The "fine stream of water" they camped by (probably Lowther Creek, a tributary of the Cox):
  // a creek a few yards across winding over the flats, a ribbon of water between its banks, ruled
  // across like the Nepean on the ford plate but far narrower.
  const flats = curve(-4, W + 4, (x) => 138 + 2 * Math.sin(x / 31));
  hills(m, flats, H, 2, { seed: seed + 14, depth: 6, gap: 1.6, growth: 0.3 });
  const mid = (x: number) => 147 + 4.2 * Math.sin(x / 26 + 0.4) + 1.6 * Math.sin(x / 11 + 1) + 0.7 * Math.sin(x / 5);
  const half = (x: number) => 0.9 + Math.max(0, (x - 150) / 250) * 0.7 + 0.2 * Math.sin(x / 17);
  const bankT = curve(150, W + 4, (x) => mid(x) - half(x));
  const bankB = curve(150, W + 4, (x) => mid(x) + half(x));
  m.push({ d: bandPath(bankT, bankB), c: 'pp' });
  const rw = rng(seed + 15);
  const ripples: string[] = [];
  for (let x = 152; x < W + 4; x += 2 + rw() * 2.4) {
    const y = mid(x) + (rw() - 0.5) * half(x) * 0.8;
    ripples.push(`M${x.toFixed(1)} ${y.toFixed(1)}h${(1 + rw() * 2).toFixed(1)}`);
  }
  m.push({ d: ripples.join(''), c: 'lw', w: 0.36 }, { d: linePath(bankT), c: 'l2', w: 0.45 }, { d: linePath(bankB), c: 'lw', w: 0.45 });
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
  sky(m, { seed, w: W, horizon: 64, clouds: [cloudBank(seed + 1, 250, 24, 220, 24, 9)], reach: 0.95 });
  // The far wall: the plateau, then a cliff band unbroken along the gorge, notched where gullies
  // cut back, its bedding showing; the slope falling from its foot into the gorge.
  const wall = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 46, amp: 2.5, scale: 110, plateau: 0.85, gullies: 5, gullyDepth: 7, gullyWidth: 9 });
  hills(m, wall, H, 1, { seed: seed + 11, depth: 3, gap: 1 }, 0.9);
  const cliff = cliffFace(wall, { seed: seed + 12, height: 32, cover: 2, gap: 2.3, cap: 2.2, grain: 0.2, grainScale: 30 });
  m.push({ d: cliff.face, c: 'l2', w: 0.46 }, { d: cliff.beds, c: 'l2', w: 0.44 });
  underCliff(m, cliff.foot, H, 2, { seed: seed + 13, depth: 30, gap: 1.2, growth: 0.14, bias: 0.25 });
  // Far below, under a lane of mist, the tops of the trees on the floor of the gorge.
  const floor = [
    { y: 141, crown: 1.7, tone: 2 },
    { y: 156, crown: 2.4, tone: 3 },
    { y: 172, crown: 3.2, tone: 3 },
  ];
  floor.forEach((t, i) => {
    const g = curve(150, W + 4, (x) => t.y + 1.4 * Math.sin(x / (26 + i * 9) + i * 2) + 0.7 * Math.sin(x / 9 + i));
    hills(m, g, H + 4, t.tone, { seed: seed + 14 + i * 3, depth: 8 + i * 4, gap: 1.1 + i * 0.1, growth: 0.2, bias: 0.2 }, t.crown);
  });
  // The near ridge, rounding over at its end and plunging: the steep flank hatched dark, the
  // bedding of the brink showing under the lip.
  const edgeX = 232;
  const ridge = curve(-4, edgeX + 30, (x) => 114 + (x / edgeX) * 3 + 1.1 * Math.sin(x / 10) + fallAway(x, edgeX, 1, 14, 52));
  ledge(m, ridge, H + 2, seed + 20);
  brinkFace(m, { seed: seed + 21, top: ridge, edgeX: edgeX + 6, side: 1, depth: 46, bottom: H });
  m.push({ d: tufts(ridge, { seed: seed + 22, from: 4, to: edgeX - 10, every: 10, h: 6 }), c: 'l4', w: 0.5 });
  // A dead tree back along the ridge, framing the left.
  const dead = gumTree({ seed: seed + 23, x: 14, y: yAt(ridge, 14) + 1, h: 92, lean: 0.1, spread: 1.1 });
  m.push({ d: dead.wood, c: 'f4' });
  // The party halted behind, and Blaxland gone on to the brink, leaning to look down the drop, the
  // same size as the rest of them.
  const { fig, scale, slots } = procession(counts, ridge, { from: 34, to: edgeX - 30, maxScale: 0.55, seed: seed + 3, loads, omit: ['blaxland'] });
  const bx = edgeX - 9;
  standing(fig, bx, yAt(ridge, bx), scale, { leader: true, arms: 'down', lean: 0.28 });
  slots.push({ who: { kind: 'man', id: 'blaxland' }, x: bx - 5 * scale, y: yAt(ridge, bx) - 41 * scale, w: 11 * scale, h: 42.5 * scale });
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m, slots };
}

// ---------------------------------------------------------------- the milestone cards

/**
 * A settler's cottage in the distance, gable end on: whitewashed walls, a steep pitched roof, a
 * chimney at one end, the door dark; a thread of smoke from the chimney.
 */
function cottage(m: Mark[], x: number, y: number, s: number, seed: number, smokeH = 0, flip = false) {
  const k = flip ? -1 : 1;
  const P = (dx: number, dy: number) => `${(x + k * dx * s).toFixed(1)} ${(y + dy * s).toFixed(1)}`;
  // The long side running back from the gable, its roof, then the gable end in front of them.
  m.push({ d: `M${P(3.6, 0)}L${P(3.6, -3.2)}L${P(7.6, -3.5)}L${P(7.6, -0.3)}Z`, c: 'pk', w: 0.28 });
  m.push({ d: `M${P(0.9, -6.4)}L${P(4.9, -6.7)}L${P(8, -3.4)}L${P(4, -3)}Z`, c: 'f3' });
  m.push({ d: `M${P(-1.8, 0)}L${P(-1.8, -3.2)}L${P(0.9, -6.4)}L${P(3.6, -3.2)}L${P(3.6, 0)}Z`, c: 'pk', w: 0.3 });
  m.push({ d: `M${P(-2.4, -2.6)}L${P(0.9, -6.6)}L${P(4.2, -2.6)}`, c: 'l3', w: 0.5 * s });
  m.push({ d: `M${P(0.4, 0)}L${P(0.4, -1.9)}L${P(1.4, -1.9)}L${P(1.4, 0)}Z` + `M${P(5.6, -6.3)}L${P(5.6, -8.2)}L${P(6.5, -8.2)}L${P(6.5, -6.2)}Z`, c: 'f3' });
  if (smokeH) smoke({ seed, x: x + k * 6 * s, y: y - 8.2 * s, h: smokeH, drift: 0.6 }).forEach((d, j) => d && m.push({ d, c: `ls o${j}`, w: 0.35 }));
}

/**
 * The view back, 19 May: from the second ridge, east over the colony. The foothills fall away below
 * the party to the Nepean winding across the plain, the farms cleared out of the bush in ruled
 * paddocks, smoke from the houses, and the plain running on in haze to the horizon.
 */
export function viewBack(counts: PartyCounts, seed = 301, loads?: Pack[]): Scene {
  const W = 400;
  const H = 180;
  const HZ = 82;
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: HZ, clouds: [cloudBank(seed + 1, 260, 28, 220, 24, 9), cloudBank(seed + 2, 90, 44, 120, 12, 5)], reach: 0.82 });
  // The plain, in rows from the horizon down, each split into paddocks and bush. Fences run back
  // toward a point above the horizon, so the paddocks lie flat; the cleared ones are ruled in
  // furrows, across or along; the bush is a band of treetops along the row's near edge.
  const r = rng(seed + 10);
  const vx = 200;
  const vy = HZ - 70;
  const back = (x: number, yNear: number, yFar: number) => vx + (x - vx) * ((yFar - vy) / (yNear - vy));
  const rows = [HZ, HZ + 2.4, HZ + 5.4, HZ + 9.2, HZ + 14, HZ + 20, HZ + 27.6, HZ + 37, HZ + 49];
  m.push({ d: `M-4 ${HZ}H${W + 4}V${H + 2}H-4Z`, c: 'pp' });
  m.push({ d: `M-4 ${HZ}L246 ${HZ}Q262 ${HZ - 4.2} 280 ${HZ - 4}Q296 ${HZ - 4.2} 312 ${HZ}L${W + 4} ${HZ}`, c: 'l0', w: 0.6 });
  const furrows: string[][] = [[], [], []];
  const fences: string[][] = [[], [], []];
  for (let k = 0; k + 1 < rows.length; k++) {
    const y0 = rows[k]!;
    const y1 = rows[k + 1]!;
    const tone = k < 3 ? 0 : k < 6 ? 1 : 2;
    const depth = (y1 - HZ) / (rows[rows.length - 1]! - HZ);
    let x = -30 - r() * 30;
    while (x < W + 30) {
      const wf = (26 + r() * 46) * (0.35 + depth);
      const x1 = x + wf;
      // The farms keep to the river; back from it the bush closes in.
      const kind = r();
      const farmed = k >= 3 && k <= 6 ? 0.6 : 0.22;
      if (kind < farmed) {
        // A paddock: its fences, and furrows across or along it.
        const f0 = back(x, y1, y0);
        const f1 = back(x1, y1, y0);
        fences[tone]!.push(`M${f0.toFixed(1)} ${y0.toFixed(1)}L${x.toFixed(1)} ${y1.toFixed(1)}`);
        if (r() < 0.5) {
          for (let y = y0 + 0.8; y < y1 - 0.3; y += 0.7 + depth * 1.2) {
            const a = back(x, y1, y) + 0.5;
            const b = back(x1, y1, y) - 0.5;
            furrows[tone]!.push(`M${a.toFixed(1)} ${y.toFixed(1)}H${b.toFixed(1)}`);
          }
        } else {
          const n = Math.max(2, Math.round(wf / (1.4 + depth * 1.6)));
          for (let i = 1; i < n; i++) {
            const t = i / n;
            furrows[tone]!.push(`M${(f0 + (f1 - f0) * t).toFixed(1)} ${(y0 + 0.5).toFixed(1)}L${(x + (x1 - x) * t).toFixed(1)} ${(y1 - 0.3).toFixed(1)}`);
          }
        }
      } else if (kind < farmed + (1 - farmed) * 0.75) {
        // Bush: a band of treetops along the row's near edge.
        const g = curve(x, x1, () => y1 - 0.2, 0.8);
        const top = taperEnds(canopy(g, { seed: seed + 11 + Math.round(x * 7 + k), size: 0.7 + depth * 1.9 }), g, x, x1, Math.min(4, wf * 0.2));
        m.push({ d: bandPath(top, g), c: `f${tone}` });
      }
      // Otherwise rough open grazing, left bare.
      x = x1;
    }
  }
  furrows.forEach((d, i) => d.length && m.push({ d: d.join(''), c: `l${i}`, w: 0.3 }));
  fences.forEach((d, i) => d.length && m.push({ d: d.join(''), c: `l${i + 1}`, w: 0.34 }));
  // The Nepean, winding across the plain: a ribbon of water, wider as it comes nearer, ruled across.
  const riverY = (x: number) => HZ + 24 + 5 * Math.sin(x / 38 + 1) + 2.4 * Math.sin(x / 13);
  const half = (x: number) => 1.5 + 0.5 * Math.sin(x / 29);
  const top = curve(-4, W + 4, (x) => riverY(x) - half(x));
  const bot = curve(-4, W + 4, (x) => riverY(x) + half(x));
  m.push({ d: bandPath(top, bot), c: 'pp' });
  const wl: string[] = [];
  for (let x = -4; x < W + 4; x += 1.6 + r() * 1.6) {
    const y = riverY(x) + (r() - 0.5) * half(x) * 1.2;
    wl.push(`M${x.toFixed(1)} ${y.toFixed(1)}h${(1.4 + r() * 2.4).toFixed(1)}`);
  }
  m.push({ d: wl.join(''), c: 'lw', w: 0.4 }, { d: linePath(top), c: 'l2', w: 0.4 }, { d: linePath(bot), c: 'lw', w: 0.5 });
  // The settlements: houses along the river, smoke from most chimneys.
  const houses: [number, number, number, number, boolean][] = [
    [66, 9, 1.5, 14, false],
    [118, -6, 1.1, 10, true],
    [132, -5, 1, 0, false],
    [212, 6, 1.4, 12, false],
    [228, 7, 1.2, 0, true],
    [318, -7, 1, 9, false],
    [352, 4, 1.2, 0, true],
  ];
  for (const [i, [hx, dy, hs, sm, flip]] of houses.entries()) cottage(m, hx, riverY(hx) + dy, hs, seed + 20 + i, sm, flip);
  // The foothills falling away below the party, wooded, to the edge of the plain.
  const foot = curve(-4, W + 4, (x) => 140 + 9 * Math.sin(x / 70 + 0.5) + 2 * Math.sin(x / 17) - x * 0.05);
  hills(m, foot, H, 2, { seed: seed + 30, depth: 24, gap: 1.3, growth: 0.15, bias: 0.15 }, 1.8);
  // The party on its ledge, looking out over the colony; the ledge rounds over where it ends.
  const ledgeTop = curve(-4, 200, (x) => 142 + (x / 180) * 4 + 1.2 * Math.sin(x / 9) + fallAway(x, 182, 1, 16, 20));
  ledge(m, ledgeTop, H + 2, seed + 40);
  brinkFace(m, { seed: seed + 42, top: ledgeTop, edgeX: 188, side: 1, depth: 22, bottom: H });
  m.push({ d: tufts(ledgeTop, { seed: seed + 41, from: 4, to: 172, every: 10, h: 6 }), c: 'l4', w: 0.5 });
  const { fig, slots } = procession(counts, ledgeTop, { from: 36, to: 172, maxScale: 0.55, seed: seed + 3, loads });
  m.push(...figureMarks(fig));
  gum(m, { seed: seed + 50, x: 16, y: yAt(ledgeTop, 16) + 2, h: 122, lean: 0.08, spread: 0.9, density: 0.6, depth: 3 });
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
  sky(m, { seed, w: W, horizon: 92, clouds: [cloudBank(seed + 1, 150, 30, 230, 24, 9), cloudBank(seed + 2, 340, 18, 110, 12, 5)], reach: 0.8 });
  // Across the gorge: plateau after plateau, each with its band of cliff.
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 80, amp: 2.5, scale: 120, plateau: 0.9, gullies: 4, gullyDepth: 4, gullyWidth: 9 });
  hills(m, far, H, 0, { seed: seed + 11, depth: 3, gap: 1.4 });
  const fc = cliffFace(far, { seed: seed + 12, height: 12, cover: 0.7, gap: 2.4, cap: 1 });
  m.push({ d: fc.face, c: 'l0', w: 0.38 });
  hills(m, fc.foot, H, 1, { seed: seed + 13, depth: 14, gap: 1.5, growth: 0.25 });
  // The spurs either side of the gorge, rounding over at their ends rather than stopping square.
  const leftTop = ridgeLine({ seed: seed + 24, x0: -4, x1: 140, base: 100, amp: 2, scale: 60, plateau: 0.9, tilt: 0.04 });
  const left = curve(-4, 140, (x) => yAt(leftTop, x) + fallAway(x, 122, 1, 16, 26));
  hills(m, left, H, 1, { seed: seed + 25, depth: 3, gap: 1.2 }, 0.8);
  const lc = cliffFace(left, { seed: seed + 26, height: 18, cover: 0.9, gap: 1.8, cap: 1.2 });
  m.push({ d: lc.face, c: 'l2', w: 0.42 }, { d: lc.beds, c: 'l2', w: 0.36 });
  hills(m, lc.foot, H, 2, { seed: seed + 27, depth: 24, gap: 1.4, growth: 0.15, bias: 0.15 });
  const midTop = ridgeLine({ seed: seed + 20, x0: 210, x1: W + 4, base: 98, amp: 2, scale: 90, plateau: 0.9, tilt: -0.02 });
  const mid = curve(210, W + 4, (x) => yAt(midTop, x) + fallAway(x, 228, -1, 16, 26));
  hills(m, mid, H, 1, { seed: seed + 21, depth: 3, gap: 1.2 }, 0.8);
  const mc = cliffFace(mid, { seed: seed + 22, height: 22, cover: 0.9, gap: 1.8, cap: 1.2 });
  m.push({ d: mc.face, c: 'l2', w: 0.42 }, { d: mc.beds, c: 'l2', w: 0.36 });
  hills(m, mc.foot, H, 2, { seed: seed + 23, depth: 30, gap: 1.3, growth: 0.12, bias: 0.2 }, 1.1);
  // The heath: broad and open, short coarse grass and loose stones, a few grass trees; it runs out
  // of the plate to the east and on the west rounds over at the cliff edge, the gorge beyond.
  const edge = 304;
  const heath = curve(-4, edge + 26, (x) => 114 + 2.2 * Math.sin(x / 61 + 0.4) + 0.5 * Math.sin(x / 9) + (x / edge) * 3 + fallAway(x, edge, 1, 20, 40));
  m.push({ d: areaPath(heath, H + 2), c: 'pp' });
  contourHatch(heath, { seed: seed + 30, depth: 70, gap: 1.6, growth: 0.07, bias: -0.05, light: 0.9, breaks: 0.1 }).forEach((d, i) => d && m.push({ d, c: `l3 o${i}`, w: 0.46 }));
  m.push({ d: linePath(heath), c: 'l4', w: 0.8 });
  brinkFace(m, { seed: seed + 34, top: heath, edgeX: edge + 6, side: 1, depth: 40, bottom: H });
  // Low scrub in a few patches far off along the skyline.
  const r = rng(seed + 31);
  for (let x = 30 + r() * 20; x < edge - 30; x += 50 + r() * 60) {
    const w = 6 + r() * 10;
    const g = curve(x, x + w, (xx) => yAt(heath, xx) + 0.4, 0.5);
    const top = taperEnds(canopy(g, { seed: seed + 32 + Math.round(x), size: 1.6 + r() * 0.8, tall: 0.1 }), g, x, x + w, w * 0.4);
    m.push({ d: bandPath(top, g), c: 'f3' });
  }
  // Short coarse grass, in tufts small far off and larger near, and the loose stones among it.
  for (const [i, d] of [3, 10, 21, 35, 52].entries()) {
    const g = shift(heath, d);
    m.push({ d: tufts(g, { seed: seed + 50 + i, from: 0, to: edge - 8 - d * 0.2, every: 10 + i * 3, h: 2.2 + i * 1.1, blades: 3 }), c: `l${i < 2 ? 3 : 4}`, w: 0.36 + i * 0.04 });
  }
  stones(m, { seed: seed + 36, ground: heath, from: 0, to: edge - 6, bottom: H - 8, count: 170, size: 2.3 });
  // Grass trees, the flower spikes standing a little above the leaves.
  for (const [i, [x, d, h]] of ([
    [30, 34, 32],
    [214, 8, 18],
    [262, 20, 24],
  ] as const).entries()) {
    const gt = grassTree({ seed: seed + 40 + i, x, y: yAt(heath, x) + d, h, spikeLen: 0.5 });
    m.push({ d: gt.trunk, c: 'f4' }, { d: gt.leaves, c: 'l4', w: 0.4 }, { d: gt.spike, c: 'l4', w: 0.6 }, { d: gt.flower, c: 'l4', w: 1.5 });
  }
  // The party crossing it, on the heath rather than its skyline.
  const walk = shift(heath, (x) => 20 + (x / edge) * 4);
  const { fig, slots } = procession(counts, walk, { from: 70, to: 250, maxScale: 0.6, seed: seed + 3, loads });
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m, slots };
}

/**
 * The way down, 28–29 May: the trench cut down the cliff with a hoe, the party leading the horses
 * down it unloaded and carrying the packs themselves ("the party were obliged to carry the
 * packages themselves"), the forest land below with grass for the horses at last.
 */
export function wayDown(counts: PartyCounts, seed = 321, _loads?: Pack[]): Scene {
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
  // The grass at the foot of the cliffs.
  const low = curve(-4, W + 4, (x) => 162 + 2 * Math.sin(x / 31));
  hills(m, low, H + 2, 2, { seed: seed + 30, depth: 10, gap: 1.6, growth: 0.3 });
  // The escarpment on the left: the plateau's edge rounding over at its corner and plunging, the
  // cliff hung under it. The talus is drawn after, so the cliff's foot is buried in its own scree.
  const edge = 150;
  // At the corner the rock steps down: the lip rounds over onto a bench, then falls sheer.
  const ease = (t: number) => (t <= 0 ? 0 : t >= 1 ? 1 : t * t * (3 - 2 * t));
  const corner = (x: number) => 11 * ease((x - (edge - 16)) / 11) + 3 * ease((x - (edge - 5)) / 6) + 70 * ease((x - (edge + 1)) / 9) ** 1.4;
  const plateau = curve(-4, edge + 12, (x) => 64 + 0.8 * Math.sin(x / 11) + corner(x));
  m.push({ d: areaPath(plateau, H + 2), c: 'pp' });
  const cliff = cliffFace(plateau, { seed: seed + 40, height: 96, cover: 2, gap: 1.9, cap: 2 });
  m.push({ d: cliff.face, c: 'l3', w: 0.46 }, { d: cliff.beds, c: 'l3', w: 0.42 });
  const top = canopy(plateau, { seed: seed + 41, size: 2.4, to: edge - 17 });
  m.push({ d: bandPath(top, shift(plateau, 1.2), -4, edge - 17), c: 'f3' });
  m.push({ d: linePath(plateau), c: 'l4', w: 0.9 });
  // The talus: scree fans run up into the gullies of the cliff, then a long slope falls to the
  // grass and runs out into it.
  const slope = curve(-4, W + 4, (x) => {
    const fans = 7 * Math.max(0, Math.sin(x / 15 + 0.6)) ** 3 + 3 * Math.max(0, Math.sin(x / 6.3)) ** 4;
    const fall = x < 140 ? 0 : 44 * (1 - Math.cos((Math.min(1, (x - 140) / 196) * Math.PI) / 2));
    return Math.min(yAt(low, x), 120 - (x < 150 ? fans : fans * Math.max(0, 1 - (x - 150) / 20)) + fall + 0.5 * Math.sin(x / 5));
  });
  hills(m, slope, H + 2, 3, { seed: seed + 39, depth: 40, gap: 1.25, growth: 0.06, bias: 0.25, light: 0.7 });
  m.push({ d: tufts(slope, { seed: seed + 31, from: 330, to: W - 2, every: 9, h: 5 }), c: 'l3', w: 0.42 });
  gum(m, { seed: seed + 32, x: 356, y: yAt(slope, 356) + 1, h: 92, lean: -0.06, spread: 0.9, density: 0.5, depth: 3 }, 3);
  // The cut: a shelf slanting across the cliff face, then down the talus, the trench along it.
  const ramp = curve(30, 336, (x) => (x < 140 ? 70 + ((x - 30) / 110) * 46 : yAt(slope, x) - 1.5 - 4 * Math.max(0, 1 - (x - 140) / 40)) + 0.8 * Math.sin(x / 9));
  const below = shift(ramp, 3);
  m.push({ d: bandPath(ramp, below), c: 'pp' });
  m.push({ d: linePath(below), c: 'l4', w: 0.6 }, { d: linePath(shift(ramp, 1.3)), c: 'l3', w: 0.35 });
  // The horses go down bare but for their pack saddles; the men carry the loads.
  const bare: Pack[] = Array.from({ length: counts.horses }, () => ({ total: 4, items: {} }));
  const { fig, slots } = procession(counts, ramp, { from: 54, to: 318, maxScale: 0.5, seed: seed + 3, loads: bare, swags: true });
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

/** The first morning: the party as outfitted, wading the Nepean, at the head of the first-day card. */
export function SetOutArt({ counts, loads }: { counts: PartyCounts; loads: Pack[] }) {
  const key = loadKey(loads);
  const scene = useMemo(() => ford(11, loads, counts), [counts.servants, counts.horses, counts.dogs, key]);
  const men = 3 + counts.servants;
  // A strip from the range down to the near bank, so the card stays short on a phone.
  return <Plate scene={scene} view={[0, 52, 400, 128]} label={`An engraving: your party of ${men} men, ${counts.horses} pack horses and ${counts.dogs} dogs wading the Nepean, the wall of the Blue Mountains beyond.`} class="plate" />;
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
