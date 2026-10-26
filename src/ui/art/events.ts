// A strip of engraving across the top of each event card, so a card is known by its picture before
// it is read: the dew on the scrub, a horse down, two men going over the edge for water, the fire at
// night. Close-ups: the figures fill the strip, the sky is a band above them. Pure: each returns a
// Scene of marks (see compose.ts).
import type { EventId } from '../../engine';
import { axeOnGround, bedroll, brinkFace, campfire, cask, fallAway, farGum, gum, gunOnGround, hills, kettle, nightSky, sack, sky, underCliff, type Scene } from './compose';
import { dogRunning, emptyFigure, figureMarks, horse, horseDown, kangaroo, lying, man, sitting, standing, type Figure, type Mark } from './figures';
import { areaPath, bandPath, canopy, cliffFace, cloudBank, curve, f, linePath, ridgeLine, rng, shift, taperEnds, tufts, yAt, type Curve } from './kit';

const W = 400;
const H = 92;
/** Where the figures stand. */
const GY = 86;

function ink(m: Mark[], fig: Figure) {
  m.push(...figureMarks(fig));
}

/** Low scrub along a ground line: a dark scalloped band, the crowns small and close. */
function scrub(m: Mark[], g: Curve, o: { seed: number; size: number; from: number; to: number; tone?: number; drops?: boolean }) {
  const top = taperEnds(canopy(g, { seed: o.seed, size: o.size, from: o.from, to: o.to, tall: 0.2 }), g, o.from, o.to, o.size * 2.4);
  m.push({ d: areaPath(top, H + 4, o.from, o.to), c: 'pp' });
  m.push({ d: bandPath(top, shift(g, 0.4), o.from, o.to), c: `f${o.tone ?? 3}` });
  if (o.drops) {
    // Dew: beads of light caught on the leaves, and drips falling from the lower edge.
    const r = rng(o.seed + 3);
    const beads: string[] = [];
    const drips: string[] = [];
    for (let x = o.from + 1; x < o.to - 1; x += 1.3 + r() * 1.8) {
      const yt = yAt(top, x);
      const yb = yAt(g, x);
      if (yb - yt < 2) continue;
      beads.push(`M${f(x)} ${f(yt + 1 + r() * (yb - yt - 1.8))}h0.01`);
      if (r() < 0.22) drips.push(`M${f(x)} ${f(yb + 1.2)}v${f(1 + r() * 1.6)}`);
    }
    m.push({ d: beads.join(''), c: 'lp', w: 1.05 });
    m.push({ d: drips.join(''), c: 'l3', w: 0.45 });
  }
}

/** The ground the figures stand on: paper, a little contour hatching, a firm line, tufts. */
function ground(m: Mark[], g: Curve, seed: number, o: { tufts?: boolean; from?: number; to?: number } = {}) {
  hills(m, g, H + 4, 3, { seed, depth: 7, gap: 1.4, growth: 0.3, bias: 0.05 });
  if (o.tufts !== false) m.push({ d: tufts(g, { seed: seed + 1, from: o.from ?? 2, to: o.to ?? W - 2, every: 15, h: 4.5 }), c: 'l3', w: 0.45 });
}

const flat = (y: number, seed: number, amp = 1) => curve(-4, W + 4, (x) => y + amp * Math.sin(x / 37 + seed) + 0.5 * amp * Math.sin(x / 11 + seed * 2));

/** A far range across the strip's middle, in haze. */
function range(m: Mark[], seed: number, base: number, o: { amp?: number; gullies?: number; tone?: number } = {}) {
  const far = ridgeLine({ seed, x0: -4, x1: W + 4, base, amp: o.amp ?? 3, scale: 90, plateau: 0.7, gullies: o.gullies ?? 2, gullyDepth: 3, gullyWidth: 9 });
  hills(m, far, H, o.tone ?? 1, { seed: seed + 1, depth: 9, gap: 1.6, growth: 0.25 });
}

// ---------------------------------------------------------------- the ten cards

/** Heavy dew: the men wait by a fire while the sun lifts the wet off the scrub. */
function dew(seed = 101): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 40, clouds: [cloudBank(seed + 1, 300, 20, 170, 14, 7)], reach: 0.65 });
  range(m, seed + 10, 40);
  // Mist lying along the valley: the range fades into white below its crest.
  const mist: string[] = [];
  for (let y = 46; y < 58; y += 1.3) mist.push(`M-4 ${f(y)}H${W + 4}`);
  m.push({ d: mist.join(''), c: 'lp', w: 1 });
  const g = flat(GY, seed);
  ground(m, g, seed + 20, { to: 188 });
  scrub(m, shift(g, 0.5), { seed: seed + 30, size: 13, from: 192, to: W + 4, drops: true });
  campfire(m, { seed: seed + 40, x: 104, y: yAt(g, 104), s: 1.35, smoke: 40, drift: 0.06 });
  const fig = emptyFigure();
  sitting(fig, 52, yAt(g, 52), 1.45, { leader: false, arms: 'fire' });
  sitting(fig, 150, yAt(g, 150), 1.45, { leader: true, arms: 'knees', dir: -1 });
  ink(m, fig);
  return { w: W, h: H, marks: m };
}

/** A horse down: the load slipped off, one man hauling at the halter, another lifting a sack. */
function horseFall(seed = 111): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 38, clouds: [cloudBank(seed + 1, 250, 18, 170, 12, 7)], reach: 0.72 });
  range(m, seed + 10, 38);
  const g = flat(GY, seed, 0.8);
  ground(m, g, seed + 30);
  scrub(m, shift(g, -0.5), { seed: seed + 20, size: 9, from: -4, to: 46 });
  scrub(m, shift(g, -0.5), { seed: seed + 21, size: 9, from: 352, to: W + 4 });
  const fig = emptyFigure();
  horseDown(fig, 206, yAt(g, 206), 1.35);
  ink(m, fig);
  // The load where it fell.
  cask(m, 128, yAt(g, 128), 1.25);
  sack(m, 150, yAt(g, 150) + 0.3, 1.35);
  bedroll(m, 168, yAt(g, 168) + 0.3, 1.25);
  sack(m, 252, yAt(g, 252) + 0.3, 1.2, true);
  const men = emptyFigure();
  standing(men, 304, yAt(g, 304), 1.4, { leader: false, arms: 'haul', dir: -1, lean: -0.3 });
  standing(men, 90, yAt(g, 90), 1.4, { leader: false, arms: 'stone', lean: 0.32 });
  ink(m, men);
  // The halter rope, from the hauler's hands to the horse's head.
  const hx = 304 - 8.8 * 1.4 * Math.cos(0.3) - 1;
  const hy = yAt(g, 304) - 23.6 * 1.4;
  m.push({ d: `M${f(hx)} ${f(hy)}Q${f(hx - 12)} ${f(hy + 6)} ${f(240)} ${f(yAt(g, 240) - 31)}`, c: 'l4', w: 0.7 });
  return { w: W, h: H, marks: m };
}

/** A spent horse: standing head-down under its pack, a man beside it. */
function horseExhausted(seed = 121): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 40, clouds: [cloudBank(seed + 1, 110, 18, 190, 14, 8)], reach: 0.75 });
  range(m, seed + 10, 42, { gullies: 3 });
  const g = flat(GY, seed, 0.7);
  ground(m, g, seed + 20);
  gum(m, { seed: seed + 30, x: 346, y: yAt(g, 346) + 1, h: 76, lean: -0.05, spread: 0.85, density: 0.5, depth: 2 }, 4);
  const fig = emptyFigure();
  // The horse can barely stand: legs braced out, head hanging to its knees under the load.
  horse(fig, 176, yAt(g, 176) + 1.2, 1.55, 0, null, { total: 180, items: { flour: 70, saltMeat: 55, blankets: 3, axes: 1, campKit: 1 } }, { droopDeg: 58, spent: true });
  standing(fig, 248, yAt(g, 248), 1.4, { leader: true, arms: 'down', dir: -1, lean: 0.12 });
  ink(m, fig);
  return { w: W, h: H, marks: m };
}

/** Dry camp: two men take the kettles over the edge, down to the water in the gully. */
function dryCamp(seed = 131): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 40, clouds: [cloudBank(seed + 1, 320, 14, 160, 12, 6)], reach: 0.85 });
  // Across the gully, the far wall: plateau, a pale cliff band, then shadow down into the depths.
  const wall = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 30, amp: 2, scale: 120, plateau: 0.9 });
  hills(m, wall, H, 0, { seed: seed + 11, depth: 3, gap: 1.2 });
  const cl = cliffFace(wall, { seed: seed + 12, height: 14, cover: 2, gap: 3.4, cap: 1.5, grain: 0.2, grainScale: 30 });
  m.push({ d: cl.face, c: 'l0', w: 0.4 }, { d: cl.beds, c: 'l0', w: 0.34 });
  underCliff(m, cl.foot, H, 1, { seed: seed + 13, depth: 22, gap: 1.6, growth: 0.15, bias: 0.1 });
  // Our ridge, rounding over at the brink into a face that drops sheer, past the foot of the strip
  // within a few paces: the water is "six hundred feet" down.
  const edgeX = 246;
  const top = curve(-4, edgeX + 16, (x) => 58 + 0.8 * Math.sin(x / 13) + fallAway(x, edgeX + 6, 1, 12, 40));
  hills(m, top, H + 4, 3, { seed: seed + 23, depth: 22, gap: 1.3, growth: 0.12, bias: 0.1, to: edgeX + 2 });
  brinkFace(m, { seed: seed + 22, top, edgeX: edgeX + 8, side: 1, depth: 40, bottom: H + 4 });
  m.push({ d: linePath(top), c: 'l4', w: 0.9 });
  m.push({ d: tufts(top, { seed: seed + 21, from: 4, to: edgeX - 6, every: 13, h: 4.5 }), c: 'l3', w: 0.45 });
  // The camp behind them: a fire and the packs, a man resting.
  campfire(m, { seed: seed + 30, x: 104, y: yAt(top, 104), s: 1.2, smoke: 30, drift: 0.4 });
  bedroll(m, 140, yAt(top, 140), 1.2);
  const fig = emptyFigure();
  sitting(fig, 60, yAt(top, 60), 1.35, { leader: true, arms: 'knees' });
  standing(fig, 226, yAt(top, 226), 1.35, { leader: false, arms: 'kettle' });
  // The second man already over the edge, climbing down facing the rock: only his head and
  // shoulders and the kettle still above the foot of the strip.
  standing(fig, 255, H + 10, 1.25, { leader: false, arms: 'kettle', dir: -1, lean: 0.12 });
  ink(m, fig);
  return { w: W, h: H, marks: m };
}

/** A chill: a man wrapped in his blanket by the fire, the others setting off without him. */
function chill(seed = 141): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 40, clouds: [cloudBank(seed + 1, 210, 16, 230, 14, 9)], reach: 0.8 });
  range(m, seed + 10, 42);
  const g = flat(GY, seed, 0.7);
  ground(m, g, seed + 20);
  gum(m, { seed: seed + 30, x: 36, y: yAt(g, 36) + 1, h: 82, lean: 0.06, spread: 0.85, density: 0.5, depth: 2 }, 4);
  campfire(m, { seed: seed + 40, x: 150, y: yAt(g, 150), s: 1.3, smoke: 36, drift: 0.25 });
  kettle(m, 172, yAt(g, 172), 1.2);
  const fig = emptyFigure();
  sitting(fig, 100, yAt(g, 100), 1.55, { leader: false, blanket: true });
  // The others, off to work along the ridge.
  man(fig, 296, yAt(g, 296), 1.35, 0.9, false, 'axe');
  man(fig, 336, yAt(g, 336), 1.35, 2.6, true, 'gun');
  ink(m, fig);
  return { w: W, h: H, marks: m };
}

/** A bowel complaint: a man laid up under his blanket, the salt-meat cask beside the fire. */
function bowel(seed = 151): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 40, clouds: [cloudBank(seed + 1, 300, 16, 200, 12, 8)], reach: 0.8 });
  range(m, seed + 10, 42);
  const g = flat(GY, seed, 0.7);
  ground(m, g, seed + 20);
  gum(m, { seed: seed + 30, x: 362, y: yAt(g, 362) + 1, h: 80, lean: -0.08, spread: 0.85, density: 0.5, depth: 2 }, 4);
  campfire(m, { seed: seed + 40, x: 252, y: yAt(g, 252), s: 1.25, smoke: 34, drift: 0.3 });
  cask(m, 290, yAt(g, 290), 1.35, true);
  const fig = emptyFigure();
  lying(fig, 112, yAt(g, 112), 1.5);
  standing(fig, 206, yAt(g, 206), 1.4, { leader: false, arms: 'kettle', dir: -1 });
  ink(m, fig);
  return { w: W, h: H, marks: m };
}

/** A hunter missing: the men call from the ridge; far off, one man goes on among the trees. */
function hunterStrays(seed = 161): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 34, clouds: [cloudBank(seed + 1, 260, 14, 220, 10, 9)], reach: 0.95 });
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 32, amp: 2.5, scale: 110, plateau: 0.8 });
  hills(m, far, H, 0, { seed: seed + 11, depth: 8, gap: 1.7, growth: 0.25 });
  // The lower ridge across the gully, open forest on it, the hunter small among the trees.
  const low = ridgeLine({ seed: seed + 20, x0: -4, x1: W + 4, base: 58, amp: 2.5, scale: 70, plateau: 0.4, tilt: 0.015 });
  hills(m, low, H, 2, { seed: seed + 21, depth: 14, gap: 1.4, growth: 0.2 });
  for (const [i, x] of [226, 262, 304, 338, 380].entries()) farGum(m, { seed: seed + 30 + i, x, y: yAt(low, x) + 0.5, h: 22 + (i % 2) * 6, tone: 2 });
  const far2 = emptyFigure();
  man(far2, 280, yAt(low, 280), 0.5, 1.2, false, 'gun');
  kangaroo(far2, 322, yAt(low, 322), 0.42);
  m.push(...figureMarks(far2, 'f3'));
  // Our ridge in the foreground, the men calling across.
  const near = curve(-4, 206, (x) => 70 + 0.7 * Math.sin(x / 9) + (x > 176 ? ((x - 176) / 30) ** 2 * 24 : 0));
  m.push({ d: areaPath(near, H + 4), c: 'pp' });
  m.push({ d: linePath(near), c: 'l4', w: 0.9 });
  m.push({ d: tufts(near, { seed: seed + 41, from: 4, to: 186, every: 12, h: 4.5 }), c: 'l3', w: 0.45 });
  const men = emptyFigure();
  standing(men, 132, yAt(near, 132), 1.4, { leader: true, arms: 'call' });
  standing(men, 164, yAt(near, 164), 1.4, { leader: false, arms: 'call' });
  standing(men, 96, yAt(near, 96), 1.4, { leader: false, arms: 'down' });
  ink(m, men);
  return { w: W, h: H, marks: m };
}

/** The dogs race off in the dark: the fire, a man on watch, the dogs gone into the scrub. */
function dogsRaceOff(seed = 171): Scene {
  const m: Mark[] = [];
  const g = flat(GY, seed, 0.5);
  const fireX = 92;
  nightSky(m, { seed, w: W, bottom: H, glows: [{ x: fireX, y: 86, rx: 78, ry: 26 }] });
  m.push({ d: areaPath(g, H + 4), c: 'pp' });
  m.push({ d: linePath(g), c: 'l4', w: 0.8 });
  // Scrub on the right, black against the night.
  const sg = shift(g, 0.4);
  const top = taperEnds(canopy(sg, { seed: seed + 10, size: 12, from: 272, to: W + 4, tall: 0.25 }), sg, 272, W + 4, 26);
  m.push({ d: bandPath(top, sg, 272, W + 4), c: 'f4' });
  campfire(m, { seed: seed + 20, x: fireX, y: yAt(g, fireX), s: 1.35, night: true, smoke: 30, drift: 0.2 });
  const fig = emptyFigure();
  sitting(fig, 46, yAt(g, 46), 1.4, { leader: false, arms: 'knees' });
  standing(fig, 138, yAt(g, 138), 1.4, { leader: true, arms: 'gunRest' });
  dogRunning(fig, 206, yAt(g, 206) - 4, 1.25);
  dogRunning(fig, 248, yAt(g, 248) - 5, 1.25, { phase: 1.2 });
  dogRunning(fig, 286, yAt(g, 286) - 4.5, 1.2, { phase: -0.8 });
  ink(m, fig);
  return { w: W, h: H, marks: m };
}

/** The men brood: hunched round the fire in the dark, counting what is left. */
function brood(seed = 181): Scene {
  const m: Mark[] = [];
  const g = flat(GY, seed, 0.4);
  const fireX = 206;
  nightSky(m, { seed, w: W, bottom: H, glows: [{ x: fireX, y: 86, rx: 104, ry: 30 }] });
  m.push({ d: areaPath(g, H + 4), c: 'pp' });
  m.push({ d: linePath(g), c: 'l4', w: 0.8 });
  gum(m, { seed: seed + 10, x: 40, y: yAt(g, 40) + 1, h: 84, lean: 0.05, spread: 0.9, density: 0.45, depth: 2 }, 4);
  campfire(m, { seed: seed + 20, x: fireX, y: yAt(g, fireX), s: 1.3, night: true, smoke: 30, drift: 0.1 });
  kettle(m, 228, yAt(g, 228), 1.1);
  sack(m, 290, yAt(g, 290), 1.2);
  const fig = emptyFigure();
  sitting(fig, 134, yAt(g, 134), 1.45, { leader: false, arms: 'head' });
  sitting(fig, 166, yAt(g, 166), 1.45, { leader: false, arms: 'folded' });
  sitting(fig, 262, yAt(g, 262), 1.45, { leader: false, arms: 'knees', dir: -1 });
  ink(m, fig);
  return { w: W, h: H, marks: m };
}

/** The men will not go on: the servants sit with their arms folded, the axes down, a leader before them. */
function refusal(seed = 191): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 40, clouds: [cloudBank(seed + 1, 140, 16, 200, 12, 8), cloudBank(seed + 2, 330, 10, 100, 7, 5)], reach: 0.8 });
  range(m, seed + 10, 42, { amp: 3.5 });
  const g = flat(GY, seed, 0.7);
  ground(m, g, seed + 20, { to: 330 });
  scrub(m, shift(g, 0.2), { seed: seed + 25, size: 10, from: 334, to: W + 4 });
  axeOnGround(m, 104, yAt(g, 104) + 0.6, 1.45);
  axeOnGround(m, 170, yAt(g, 170) + 0.6, 1.45, true);
  axeOnGround(m, 228, yAt(g, 228) + 0.6, 1.35);
  gunOnGround(m, 34, yAt(g, 34) + 0.6, 1.3);
  const fig = emptyFigure();
  sitting(fig, 76, yAt(g, 76), 1.45, { leader: false, arms: 'folded' });
  sitting(fig, 138, yAt(g, 138), 1.45, { leader: false, arms: 'folded' });
  sitting(fig, 200, yAt(g, 200), 1.45, { leader: false, arms: 'folded' });
  standing(fig, 290, yAt(g, 290), 1.45, { leader: true, arms: 'point', dir: -1 });
  ink(m, fig);
  return { w: W, h: H, marks: m };
}

export const EVENT_ART: Record<EventId, () => Scene> = {
  dew: () => dew(),
  horseFall: () => horseFall(),
  horseExhausted: () => horseExhausted(),
  dryCamp: () => dryCamp(),
  chill: () => chill(),
  bowel: () => bowel(),
  hunterStrays: () => hunterStrays(),
  dogsRaceOff: () => dogsRaceOff(),
  brood: () => brood(),
  refusal: () => refusal(),
};

/** What each strip shows, for the picture's label. */
export const EVENT_ART_LABEL: Record<EventId, string> = {
  dew: 'An engraving: men waiting by a fire beside scrub beaded with dew.',
  horseFall: 'An engraving: a pack horse down on the track, its load spilled, a man hauling at its halter.',
  horseExhausted: 'An engraving: a pack horse that can barely stand under its load, legs braced out and head hanging to its knees, a man looking it over.',
  dryCamp: 'An engraving: two men carrying the kettles over the edge of the ridge, down toward the gully.',
  chill: 'An engraving: a man wrapped in a blanket by the fire while two others set off to work.',
  bowel: 'An engraving: a man lying ill under his blanket, another bringing the kettle, the salt-meat cask by the fire.',
  hunterStrays: 'An engraving: men calling from the ridge; far off across the gully, one man follows a kangaroo among the trees.',
  dogsRaceOff: 'An engraving at night: the dogs racing from the fire into the dark scrub, a man on watch with his musket.',
  brood: 'An engraving at night: three men hunched round the fire.',
  refusal: 'An engraving: three servants sitting with their arms folded and their axes on the ground, a leader standing over them.',
};
