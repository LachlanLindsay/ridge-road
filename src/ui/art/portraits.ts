// A portrait at the head of each party card: every man, each horse and the dogs, in the plates'
// engraving. Each is drawn only from what the record says of its subject (see people.ts for the
// sources): Lawson's journal logs compass courses and distances, so he takes a bearing with his
// field book open; Wentworth's journal is all landscape, "some Mighty convulsion in Nature", so he
// stands at a gorge; Blaxland came for grass for his stock; Burne was the party's kangaroo hunter;
// the servants cut the path and marked the trees "on two sides". Nobody's face is known well enough
// to draw, and the figures stay silhouettes, as everywhere else in the game. Pure: each returns a
// Scene of marks (see compose.ts).
import type { MemberId } from '../../engine';
import { bedroll, brinkFace, campfire, cask, fallAway, farGum, gum, gunOnGround, hills, kettle, ledge, sack, sky, underCliff, type Scene } from './compose';
import { dog, emptyFigure, figureMarks, horse, horseDown, kangaroo, man, sitting, standing, type Figure, type Mark, type Pack } from './figures';
import { areaPath, bandPath, canopy, cliffFace, cloudBank, curve, f, grassTree, linePath, ridgeLine, rng, shift, taperEnds, tufts, waterHatch, yAt, type Curve } from './kit';

const W = 400;
const H = 140;

const flat = (y: number, seed: number, amp = 1.2) => curve(-4, W + 4, (x) => y + amp * Math.sin(x / 41 + seed) + 0.5 * amp * Math.sin(x / 13 + seed * 2));

/** A far range and a nearer one, the usual depth behind a figure. */
function backdrop(m: Mark[], seed: number, o: { horizon: number; far: number; mid?: number; cloudX?: number; trees?: number[] }) {
  sky(m, { seed, w: W, horizon: o.horizon, clouds: [cloudBank(seed + 1, o.cloudX ?? 280, 24, 170, 18, 7)], reach: 0.75 });
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: o.far, amp: 3, scale: 110, plateau: 0.75, gullies: 3 });
  hills(m, far, H, 0, { seed: seed + 11, depth: 8, gap: 1.6, growth: 0.25 });
  if (o.mid !== undefined) {
    const mid = curve(-4, W + 4, (x) => o.mid! + 3 * Math.sin(x / 47 + seed) + 1.4 * Math.sin(x / 15));
    hills(m, mid, H, 1, { seed: seed + 20, depth: 10, gap: 1.5, growth: 0.25 });
    (o.trees ?? []).forEach((x, i) => farGum(m, { seed: seed + 30 + i, x, y: yAt(mid, x) + 0.5, h: 22 + (i % 3) * 5, tone: 1 }));
  }
}

/** The near ground the figures stand on, hatched, with grass along it. */
function ground(m: Mark[], g: Curve, seed: number, grass: { every: number; h: number; tone?: number }) {
  hills(m, g, H + 2, 3, { seed, depth: 12, gap: 1.35, growth: 0.25 });
  m.push({ d: tufts(g, { seed: seed + 1, from: 2, to: W - 2, every: grass.every, h: grass.h }), c: `l${grass.tone ?? 3}`, w: 0.48 });
}

/**
 * Thick brush standing on a ground line: the dark scalloped band the map draws for brush, `lift`
 * high above the ground before its crowns begin.
 */
function brush(m: Mark[], g: Curve, o: { seed: number; size: number; from: number; to: number; lift?: number; tone?: number }) {
  const top = taperEnds(canopy(shift(g, -(o.lift ?? 0)), { seed: o.seed, size: o.size, from: o.from, to: o.to, tall: 0.1 }), g, o.from, o.to, o.size * 1.6);
  m.push({ d: bandPath(top, shift(g, 0.4), o.from, o.to), c: `f${o.tone ?? 3}` });
}

/** A gum with its bark cut away in a pale blaze, the way the party marked its track. */
function blazedGum(m: Mark[], o: { seed: number; x: number; y: number; h: number }) {
  gum(m, { seed: o.seed, x: o.x, y: o.y, h: o.h, lean: 0.02, spread: 0.85, density: 0.45, depth: 3 });
  const bx = o.x + 0.3;
  const by = o.y - 52;
  const w = 2.4;
  const h = 7;
  m.push({ d: `M${f(bx)} ${f(by - h)}C${f(bx + w)} ${f(by - h * 0.5)} ${f(bx + w)} ${f(by + h * 0.5)} ${f(bx)} ${f(by + h)}C${f(bx - w)} ${f(by + h * 0.5)} ${f(bx - w)} ${f(by - h * 0.5)} ${f(bx)} ${f(by - h)}Z`, c: 'pk', w: 0.4 });
}

// ---------------------------------------------------------------- the men

/**
 * Blaxland: a grazier who came looking for grass for his stock ("enough grass to support the stock
 * of the colony for thirty years"); in the game he minds the horses. He holds a pack horse by its
 * halter in long grass, in open forest land, his gun laid down.
 */
function blaxland(seed = 401): Scene {
  const m: Mark[] = [];
  backdrop(m, seed, { horizon: 84, far: 80, mid: 98, cloudX: 300, trees: [24, 92, 300, 352] });
  const g = flat(126, seed, 1.1);
  ground(m, g, seed + 40, { every: 6, h: 10 });
  gum(m, { seed: seed + 50, x: 36, y: yAt(g, 36) + 1, h: 120, lean: 0.07, spread: 0.95, density: 0.45, depth: 3 });
  gunOnGround(m, 306, yAt(g, 306) - 0.4, 2.2);
  const fig = emptyFigure();
  const hs = 2.05;
  const hx = 156;
  const ms = 2.3;
  const mx = 244;
  const hand: [number, number] = [mx - 8.8 * ms, yAt(g, mx) - 23.2 * ms];
  horse(fig, hx, yAt(g, hx), hs, 0.3, hand, { total: 120, items: { flour: 50, saltMeat: 45, blankets: 2, axes: 1 } });
  standing(fig, mx, yAt(g, mx), ms, { leader: true, dir: -1, arms: 'haul' });
  m.push(...figureMarks(fig));
  // Long grass in front of the feet.
  m.push({ d: tufts(shift(g, 6), { seed: seed + 60, from: 90, to: 330, every: 9, h: 9 }), c: 'l4', w: 0.5 });
  return { w: W, h: H, marks: m };
}

/**
 * Lawson: a trained surveyor. His journal records compass courses ("Steared S¼ SW¼ WSW¼") and the
 * day's distances, and he looked out from the heights with pride. On a rock ledge above the ridges,
 * he takes a bearing with a pocket compass, his field book open.
 */
function lawson(seed = 411): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 74, clouds: [cloudBank(seed + 1, 300, 26, 180, 20, 8), cloudBank(seed + 2, 190, 52, 80, 10, 5)], reach: 0.8 });
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 70, amp: 3.5, scale: 120, plateau: 0.8, gullies: 5, gullyDepth: 4, gullyWidth: 8 });
  hills(m, far, H, 0, { seed: seed + 11, depth: 8, gap: 1.5, growth: 0.25 }, 0.6);
  const mid = ridgeLine({ seed: seed + 20, x0: -4, x1: W + 4, base: 86, amp: 6, scale: 80, plateau: 0.55, gullies: 4, gullyDepth: 7, gullyWidth: 11 });
  hills(m, mid, H, 1, { seed: seed + 21, depth: 12, gap: 1.4, growth: 0.2 }, 0.9);
  const near = ridgeLine({ seed: seed + 30, x0: -4, x1: W + 4, base: 106, amp: 8, scale: 62, plateau: 0.35, gullies: 3, gullyDepth: 9, gullyWidth: 13 });
  hills(m, near, H, 2, { seed: seed + 31, depth: 20, gap: 1.3, growth: 0.15, bias: 0.1 }, 1.3);
  // The ledge, ending in a drop on the right.
  const edgeX = 196;
  const top = curve(-4, edgeX + 12, (x) => 124 - (x / edgeX) * 4 + 1 * Math.sin(x / 9) + fallAway(x, edgeX, 1, 20, 24));
  ledge(m, top, H + 2, seed + 40);
  brinkFace(m, { seed: seed + 42, top, edgeX: edgeX + 4, side: 1, depth: 26, bottom: H });
  m.push({ d: tufts(top, { seed: seed + 41, from: 4, to: edgeX - 10, every: 11, h: 6 }), c: 'l4', w: 0.5 });
  gum(m, { seed: seed + 50, x: 28, y: yAt(top, 28) + 1, h: 112, lean: 0.1, spread: 0.95, density: 0.3, depth: 3 });
  const fig = emptyFigure();
  standing(fig, 132, yAt(top, 132), 2.3, { leader: true, arms: 'notes' });
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m };
}

/**
 * Wentworth: 22, the youngest, and in the game the strongest cutter. His own journal is about the
 * country: "so singular a description" it could "only have been produced by some Mighty convulsion
 * in Nature". He stands at the end of the cut track, the axe on his shoulder, facing the gorge.
 */
function wentworth(seed = 421): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 62, clouds: [cloudBank(seed + 1, 300, 22, 200, 20, 8)], reach: 0.9 });
  // The far wall of the gorge: a tall broken cliff under the plateau, forest falling below it.
  const wall = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 48, amp: 4, scale: 70, plateau: 0.7, gullies: 4, gullyDepth: 10, gullyWidth: 9 });
  hills(m, wall, H, 1, { seed: seed + 11, depth: 2.5, gap: 1 }, 0.8);
  const cliff = cliffFace(wall, { seed: seed + 12, height: 34, cover: 2, gap: 1.9, cap: 2, grain: 0.2, grainScale: 30 });
  m.push({ d: cliff.face, c: 'l2', w: 0.5 }, { d: cliff.beds, c: 'l2', w: 0.42 });
  underCliff(m, cliff.foot, H, 2, { seed: seed + 13, depth: 40, gap: 1.15, growth: 0.12, bias: 0.3 });
  // Our ridge: the end of the track, the stumps and the cut brushwood behind him.
  const edgeX = 258;
  const ridge = curve(-4, edgeX + 12, (x) => 118 + (x / edgeX) * 4 + 1.1 * Math.sin(x / 10) + fallAway(x, edgeX, 1, 22, 26));
  ledge(m, ridge, H + 2, seed + 20);
  brinkFace(m, { seed: seed + 22, top: ridge, edgeX: edgeX + 4, side: 1, depth: 26, bottom: H });
  // Stumps and cut brushwood in the gap.
  const stumps: string[] = [];
  for (const x of [70, 79, 86]) {
    const y = yAt(ridge, x);
    stumps.push(`M${f(x - 1.6)} ${f(y)}L${f(x - 1.3)} ${f(y - 4.2)}L${f(x + 1.4)} ${f(y - 4.8)}L${f(x + 1.6)} ${f(y)}Z`);
  }
  m.push({ d: stumps.join(''), c: 'pk', w: 0.45 });
  const r = rng(seed + 32);
  const twigs: string[] = [];
  for (let i = 0; i < 14; i++) {
    const x = 140 + r() * 30;
    const y = yAt(ridge, x) - 0.5;
    twigs.push(`M${f(x)} ${f(y)}L${f(x + 6 + r() * 6)} ${f(y - 2 - r() * 4)}`);
  }
  m.push({ d: twigs.join(''), c: 'l4', w: 0.5 });
  m.push({ d: tufts(ridge, { seed: seed + 33, from: 140, to: edgeX - 10, every: 11, h: 6 }), c: 'l4', w: 0.5 });
  const fig = emptyFigure();
  standing(fig, 206, yAt(ridge, 206), 2.35, { leader: true, arms: 'axe' });
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m };
}

/**
 * Burne: the party's guide and kangaroo hunter. Gun grounded, a kangaroo dog at his knee, he
 * watches a kangaroo standing across the valley in open forest.
 */
function burne(seed = 431): Scene {
  const m: Mark[] = [];
  backdrop(m, seed, { horizon: 80, far: 76, mid: 96, cloudX: 120, trees: [40, 110, 176, 330, 376] });
  // The kangaroo across the valley, small, on the far slope.
  const far = emptyFigure();
  kangaroo(far, 312, 100, 0.85, { pose: 'stand', dir: -1 });
  m.push(...figureMarks(far, 'f2', { near: 'l2', far: 'l1' }));
  const g = flat(126, seed, 1);
  ground(m, g, seed + 40, { every: 10, h: 6 });
  gum(m, { seed: seed + 50, x: 50, y: yAt(g, 50) + 1, h: 122, lean: 0.06, spread: 0.9, density: 0.45, depth: 3 });
  const fig = emptyFigure();
  standing(fig, 168, yAt(g, 168), 2.35, { leader: false, arms: 'gunRest' });
  dog(fig, 214, yAt(g, 214), 2.1, 0.15);
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m };
}

/**
 * Fairs, and the servants generally: the men who cut the path for the horses through the brush,
 * marking the track "by cutting the bark of the trees on two sides". Axe on the shoulder, beside a
 * blazed gum at the mouth of the cut.
 */
function cutter(seed: number, o: { blaze: number; man: number }): Scene {
  const m: Mark[] = [];
  backdrop(m, seed, { horizon: 76, far: 74, cloudX: 220 });
  const g = flat(124, seed, 1);
  // Brush either side of the cut, the cut running back between.
  ground(m, g, seed + 30, { every: 12, h: 5 });
  brush(m, g, { seed: seed + 20, size: 10, from: -4, to: 146, lift: 16 });
  brush(m, g, { seed: seed + 21, size: 10, from: 228, to: W + 4, lift: 16 });
  const stumps: string[] = [];
  for (const x of [154, 168, 180, 262, 280]) {
    const y = yAt(g, x);
    stumps.push(`M${f(x - 1.8)} ${f(y)}L${f(x - 1.4)} ${f(y - 4.6)}L${f(x + 1.5)} ${f(y - 5.2)}L${f(x + 1.8)} ${f(y)}Z`);
  }
  m.push({ d: stumps.join(''), c: 'pk', w: 0.45 });
  blazedGum(m, { seed: seed + 40, x: o.blaze, y: yAt(g, o.blaze) + 1, h: 118 });
  const fig = emptyFigure();
  standing(fig, o.man, yAt(g, o.man), 2.35, { leader: false, arms: 'axe', dir: -1 });
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m };
}

/**
 * Two of the servants have never been identified. The journal's servants do the camp's work: two
 * men "to take care of the horses and provisions", and water fetched up from the gullies. One sits
 * minding the camp and the packs, the horses grazing behind; the other carries the kettles.
 */
function campMinder(seed = 451): Scene {
  const m: Mark[] = [];
  backdrop(m, seed, { horizon: 82, far: 78, mid: 98, trees: [60, 140, 344] });
  const g = flat(124, seed, 1);
  ground(m, g, seed + 40, { every: 10, h: 6 });
  gum(m, { seed: seed + 50, x: 364, y: yAt(g, 364) + 1, h: 118, lean: -0.06, spread: 0.9, density: 0.45, depth: 3 });
  const back = emptyFigure();
  // Grazing: heads down in the grass.
  horse(back, 70, yAt(g, 70) - 6, 1.2, 0.6, null, null, { droopDeg: 62 });
  horse(back, 116, yAt(g, 116) - 7, 1.15, -0.4, null, null, { droopDeg: 58 });
  m.push(...figureMarks(back, 'f3'));
  // The long grass they are cropping, up round their muzzles.
  for (const [i, [x, y]] of ([
    [99, yAt(g, 70) - 6],
    [142, yAt(g, 116) - 7],
  ] as const).entries()) {
    m.push({ d: tufts(curve(x - 6, x + 6, () => y + 0.4), { seed: seed + 70 + i, from: x - 6, to: x + 6, every: 3, h: 13, blades: 5 }), c: 'l3', w: 0.45 });
  }
  campfire(m, { seed: seed + 60, x: 232, y: yAt(g, 232), s: 1.7, smoke: 46, drift: 0.25 });
  cask(m, 290, yAt(g, 290), 2);
  sack(m, 316, yAt(g, 316), 2.2, true);
  bedroll(m, 270, yAt(g, 270), 1.8);
  kettle(m, 252, yAt(g, 252), 1.7);
  const fig = emptyFigure();
  sitting(fig, 190, yAt(g, 190), 2.3, { leader: false, arms: 'fire' });
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m };
}

function waterCarrier(seed = 461): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 60, clouds: [cloudBank(seed + 1, 120, 20, 180, 16, 7)], reach: 0.85 });
  // The far wall of the gully.
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 52, amp: 2.5, scale: 110, plateau: 0.85 });
  hills(m, far, H, 1, { seed: seed + 11, depth: 3, gap: 1 }, 0.6);
  const fc = cliffFace(far, { seed: seed + 12, height: 26, cover: 2, gap: 2.2, cap: 1.5, grain: 0.2, grainScale: 30 });
  m.push({ d: fc.face, c: 'l1', w: 0.4 }, { d: fc.beds, c: 'l1', w: 0.34 });
  underCliff(m, fc.foot, H, 2, { seed: seed + 13, depth: 40, gap: 1.3, growth: 0.12, bias: 0.25 });
  // The water hole at the bottom.
  const wh = waterHatch({ seed: seed + 14, from: 238, to: W + 4, top: 114, bottom: 128, gap: 1.6 });
  m.push({ d: `M226 113.4H${W + 4}V${H + 2}H226Z`, c: 'pp' }, { d: wh.light, c: 'lw', w: 0.45 }, { d: wh.dark, c: 'lw', w: 0.5 });
  // Our side: the camp's ground on the left, then the steep face down into the water.
  const top = curve(-4, 270, (x) => (x < 208 ? 100 + 0.8 * Math.sin(x / 11) : 100 + Math.min(1, (x - 208) / 40) ** 0.7 * 22) + fallAway(x, 262, 1, 14, 30));
  hills(m, top, H + 2, 3, { seed: seed + 20, depth: 40, gap: 1.25, growth: 0.1, bias: 0.25 }, 1.2);
  const r = rng(seed + 21);
  const rock: string[] = [];
  for (let x = 210; x < 262; x += 1 + r() * 0.9) {
    const y0 = yAt(top, x) + 1.5;
    for (let y = y0; y < H + 2; y += 3 + r() * 6) rock.push(`M${f(x)} ${f(y)}V${f(Math.min(H + 2, y + 2 + r() * 5))}`);
  }
  m.push({ d: rock.join(''), c: 'l4', w: 0.45 }, { d: linePath(top), c: 'l4', w: 0.8 });
  m.push({ d: tufts(top, { seed: seed + 22, from: 4, to: 206, every: 12, h: 5 }), c: 'l4', w: 0.45 });
  campfire(m, { seed: seed + 30, x: 54, y: yAt(top, 54), s: 1.2, smoke: 40, drift: 0.4 });
  const fig = emptyFigure();
  // Just up from the climb, bent under the weight, heading back to camp.
  standing(fig, 200, yAt(top, 200), 2.3, { leader: false, arms: 'kettle', dir: -1, lean: 0.14 });
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m };
}

/** A man the 1813 party did not have: plain, on an open ridge, with nothing of 1813 about him but the work. */
function extraHand(seed: number, o: { leading: boolean }): Scene {
  const m: Mark[] = [];
  backdrop(m, seed, { horizon: 80, far: 78, mid: 98, trees: [70, 150, 300] });
  const g = flat(124, seed, 1);
  ground(m, g, seed + 40, { every: 12, h: 5 });
  gum(m, { seed: seed + 50, x: 40, y: yAt(g, 40) + 1, h: 116, lean: 0.06, spread: 0.9, density: 0.45, depth: 3 });
  const fig = emptyFigure();
  if (o.leading) {
    const hand = man(fig, 270, yAt(g, 270), 2.2, 0.5, false, 'none', true);
    horse(fig, 196, yAt(g, 196), 1.95, 1.1, hand);
  } else {
    man(fig, 200, yAt(g, 200), 2.3, 0.6, false, 'axe');
    sack(m, 262, yAt(g, 262), 2.4);
  }
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m };
}

const MAN_PLATES: Record<MemberId, () => Scene> = {
  blaxland: () => blaxland(),
  lawson: () => lawson(),
  wentworth: () => wentworth(),
  burne: () => burne(),
  fairs: () => cutter(441, { blaze: 120, man: 196 }),
  servant3: () => campMinder(),
  servant4: () => waterCarrier(),
  servant5: () => extraHand(471, { leading: false }),
  servant6: () => extraHand(481, { leading: true }),
};

export const MAN_PORTRAIT_LABEL: Record<MemberId, string> = {
  blaxland: 'An engraving: Gregory Blaxland, in a tall hat and tailcoat, holds a pack horse by its halter in long grass in open forest, his gun laid on the ground.',
  lawson: 'An engraving: William Lawson on a rock ledge above the ridges, taking a bearing with a pocket compass, his field book open in his other hand.',
  wentworth: 'An engraving: William Charles Wentworth at the end of the cut track, an axe on his shoulder, facing a gorge walled with broken cliffs.',
  burne: 'An engraving: James Burne, the hunter, his gun grounded and a kangaroo dog at his knee, watching a kangaroo across the valley.',
  fairs: 'An engraving: a servant with an axe on his shoulder beside a gum blazed to mark the track, at the mouth of the path cut through the brush.',
  servant3: 'An engraving: a servant sitting by the fire minding the camp and the packs, two horses grazing behind.',
  servant4: 'An engraving: a servant back up from the gully with the kettle, the water hole below and the camp smoking ahead.',
  servant5: 'An engraving: a servant walking a ridge with an axe on his shoulder.',
  servant6: 'An engraving: a servant leading a pack horse along a ridge.',
};

const manCache = new Map<MemberId, Scene>();
export function manPortrait(id: MemberId): Scene {
  let s = manCache.get(id);
  if (!s) {
    s = MAN_PLATES[id]();
    manCache.set(id, s);
  }
  return s;
}

// ---------------------------------------------------------------- the horses

/**
 * The horses' coats, by the names the game gives them, in coat tones that keep their order in both
 * themes (see --coat-* in styles.css): Black darkest, Grey palest. Bay and Dun have black legs, as
 * those coats do; Roan is flecked with white.
 */
const COAT: Record<string, { tone: string; legs: { near: string; far: string; top: string }; fleck?: boolean; word: string }> = {
  Bay: { tone: 'hc3', legs: { near: 'hl4', far: 'hl4 o1', top: 'f4' }, word: 'bay' },
  Grey: { tone: 'hc1', legs: { near: 'hl1', far: 'hl2 o1', top: 'f4' }, word: 'grey' },
  Chestnut: { tone: 'hc2', legs: { near: 'hl2', far: 'hl3 o1', top: 'f4' }, word: 'chestnut' },
  Black: { tone: 'hc4', legs: { near: 'hl4', far: 'hl4 o1', top: 'f4' }, word: 'black' },
  Dun: { tone: 'hc1', legs: { near: 'hl4', far: 'hl4 o1', top: 'f4' }, word: 'dun' },
  Roan: { tone: 'hc3', legs: { near: 'hl3', far: 'hl3 o1', top: 'f4' }, fleck: true, word: 'roan' },
};

/** Where each horse is drawn: four places from the journal, the two extra horses on an open ridge. */
type HorsePlace = 'ridge' | 'swamp' | 'heath' | 'forest' | 'open';
const PLACE: HorsePlace[] = ['ridge', 'swamp', 'heath', 'forest', 'open', 'open'];

const PLACE_WORDS: Record<HorsePlace, string> = {
  ridge: 'on the narrow ridge between the brush',
  swamp: 'at a swamp, where the horses fed on the rushy grass',
  heath: 'on the open heath of the high ridge',
  forest: 'in forest land with fresh grass',
  open: 'on an open ridge',
};

function horseGround(m: Mark[], seed: number, place: HorsePlace): Curve {
  const g = flat(126, seed, 1);
  switch (place) {
    case 'ridge':
      backdrop(m, seed, { horizon: 78, far: 76 });
      ground(m, g, seed + 30, { every: 14, h: 5 });
      brush(m, shift(g, -9), { seed: seed + 20, size: 9, from: -4, to: W + 4, lift: 8 });
      break;
    case 'swamp': {
      backdrop(m, seed, { horizon: 80, far: 78, mid: 98, trees: [30, 330, 380] });
      ground(m, g, seed + 30, { every: 16, h: 4 });
      const wh = waterHatch({ seed: seed + 40, from: 250, to: W + 4, top: 128, bottom: 140, gap: 1.6 });
      m.push({ d: `M250 127.6H${W + 4}V${H + 2}H250Z`, c: 'pp' }, { d: wh.light, c: 'lw', w: 0.45 }, { d: wh.dark, c: 'lw', w: 0.5 });
      // Rushes: tall, thin, in clumps.
      const r = rng(seed + 41);
      const reeds: string[] = [];
      for (let i = 0; i < 26; i++) {
        const x = 8 + r() * 384;
        const y = x > 250 ? 129 : yAt(g, x) + 1;
        const h = 10 + r() * 12;
        for (let k = -1; k <= 1; k++) reeds.push(`M${f(x + k * 1.2)} ${f(y)}Q${f(x + k * 1.6)} ${f(y - h * 0.6)} ${f(x + k * 3 + (r() - 0.5) * 2)} ${f(y - h)}`);
      }
      m.push({ d: reeds.join(''), c: 'l3', w: 0.45 });
      break;
    }
    case 'heath': {
      sky(m, { seed, w: W, horizon: 96, clouds: [cloudBank(seed + 1, 240, 30, 200, 20, 8)], reach: 0.85 });
      const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 94, amp: 2, scale: 140, plateau: 0.9 });
      hills(m, far, H, 0, { seed: seed + 11, depth: 6, gap: 1.6, growth: 0.25 });
      ground(m, g, seed + 30, { every: 7, h: 4 });
      for (const [i, x] of [40, 330, 372].entries()) {
        const gt = grassTree({ seed: seed + 50 + i, x, y: yAt(g, x) + 1, h: 30 + i * 5 });
        m.push({ d: gt.trunk, c: 'f4' }, { d: gt.leaves, c: 'l4', w: 0.4 }, { d: gt.spike, c: 'l4', w: 1 });
      }
      break;
    }
    case 'forest':
      backdrop(m, seed, { horizon: 82, far: 80, mid: 98, trees: [20, 70, 120, 300, 350, 390] });
      ground(m, g, seed + 30, { every: 6, h: 9 });
      gum(m, { seed: seed + 50, x: 360, y: yAt(g, 360) + 1, h: 122, lean: -0.05, spread: 0.95, density: 0.45, depth: 3 });
      break;
    case 'open':
      backdrop(m, seed, { horizon: 80, far: 78, mid: 98, trees: [60, 140, 330] });
      ground(m, g, seed + 30, { every: 11, h: 5 });
      gum(m, { seed: seed + 50, x: 40, y: yAt(g, 40) + 1, h: 116, lean: 0.06, spread: 0.9, density: 0.45, depth: 3 });
      break;
  }
  return g;
}

export interface HorseNow {
  pack: Pack | null;
  /** 0 to 100, when a game is going. */
  condition?: number;
  /** Left behind: collapsed at a camp. */
  down?: boolean;
}

/** A horse's portrait: its coat, its load as the party has packed it, its head lower the worse it is. */
export function horsePortrait(id: number, name: string, now: HorseNow): { scene: Scene; label: string } {
  const coat = COAT[name] ?? COAT.Bay!;
  const place = PLACE[(id - 1) % PLACE.length]!;
  const seed = 500 + id * 10;
  const m: Mark[] = [];
  const g = horseGround(m, seed, place);
  const fig = emptyFigure();
  const x = 186;
  const y = yAt(g, x);
  const s = 2.6;
  const spent = now.condition !== undefined && now.condition < 50;
  if (now.down) horseDown(fig, x, y, s * 0.95);
  else horse(fig, x, y, s, 0.2, null, now.pack, spent ? { droopDeg: 16 + (50 - now.condition!) * 0.5 } : undefined);
  m.push(...figureMarks(fig, coat.tone, coat.legs));
  if (coat.fleck && !now.down) {
    // White hairs through the coat, on the quarters and the neck where the pack leaves it bare.
    const r = rng(seed + 90);
    const dots: string[] = [];
    const P = (dx: number, dy: number) => `M${f(x + dx * s)} ${f(y + dy * s)}h0.01`;
    for (let i = 0; i < 40; i++) dots.push(P(-14 + r() * 6, -22.5 + r() * 8));
    for (let i = 0; i < 24; i++) dots.push(P(13.5 + r() * 4, -27 + r() * 7));
    m.push({ d: dots.join(''), c: 'lp', w: 0.8 });
  }
  const state = now.down ? 'down where it fell, left behind' : spent ? 'its head hanging, worn out' : now.pack && now.pack.total >= 3 ? 'standing under its load' : 'standing unloaded';
  return { scene: { w: W, h: H, marks: m }, label: `An engraving: ${name}, a ${coat.word} pack horse, ${state}, ${PLACE_WORDS[place]}.` };
}

// ---------------------------------------------------------------- the dogs

/**
 * The dogs: by day they ran down kangaroo, at night they gave the alarm ("they barked and ran off
 * continually during the whole night"). At the camp's edge, heads up toward the scrub, the fire's
 * smoke behind; as many as the party has.
 */
export function dogsPortrait(count: number): { scene: Scene; label: string } {
  const seed = 601;
  const m: Mark[] = [];
  backdrop(m, seed, { horizon: 80, far: 78, mid: 98, cloudX: 160, trees: [40, 110] });
  const g = flat(124, seed, 1);
  ground(m, g, seed + 40, { every: 10, h: 6 });
  brush(m, g, { seed: seed + 50, size: 9, from: 336, to: W + 4, lift: 12, tone: 4 });
  campfire(m, { seed: seed + 60, x: 46, y: yAt(g, 46), s: 1.6, smoke: 56, drift: 0.35 });
  bedroll(m, 74, yAt(g, 74), 1.8);
  const fig = emptyFigure();
  const n = Math.max(0, Math.min(8, count));
  // Spread them out between the fire and the scrub, the nearest largest.
  for (let i = 0; i < n; i++) {
    const t = n === 1 ? 0.5 : i / (n - 1);
    const x = 112 + t * (n > 4 ? 196 : 150);
    const s = (n > 4 ? 1.3 : 1.55) + 0.15 * Math.sin(i * 2.1);
    dog(fig, x, yAt(g, x) + (i % 2) * 3, s, 0.2 + i * 0.9);
  }
  m.push(...figureMarks(fig));
  const label = n === 0 ? 'An engraving: the camp with no dogs, the fire smoking and the scrub beyond.' : `An engraving: ${n === 1 ? 'a kangaroo dog' : `${n} kangaroo dogs`} at the edge of the camp, heads up toward the scrub, the fire smoking behind.`;
  return { scene: { w: W, h: H, marks: m }, label };
}
