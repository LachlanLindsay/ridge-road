// A strip of engraving across the top of each event card, so a card is known by its picture before
// it is read: the dew on the scrub, a horse down, two men going over the edge for water, the fire at
// night. Close-ups: the figures fill the strip, the sky is a band above them. Pure: each returns a
// Scene of marks (see compose.ts).
import type { EventId } from '../../engine';
import { axeOnGround, bedroll, campfire, cask, farGum, gum, gunOnGround, hills, kettle, nightSky, sack, sky, type Scene } from './compose';
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

/**
 * A wall of wet brush, as high as a man's shoulders: a dark mass rising out of the ground at its
 * near end, its top ragged with stiff leaf sprays, and the wet on it as glints of bare paper: short
 * curved strokes along the lit tops of the leaf clumps, a few runs of water down the face.
 */
function wetBrush(m: Mark[], g: Curve, o: { seed: number; from: number; to: number; height: number }) {
  const r = rng(o.seed);
  const crest = curve(o.from, o.to, (x) => yAt(g, x) - o.height * (0.86 + 0.14 * Math.sin(x / 23 + 1)), 1);
  const top = taperEnds(canopy(crest, { seed: o.seed + 1, size: o.height * 0.22, tall: 0.35 }), g, o.from, o.to, 34);
  m.push({ d: areaPath(top, H + 4, o.from, o.to), c: 'pp' });
  m.push({ d: bandPath(top, shift(g, 0.4), o.from, o.to), c: 'f3' });
  // Stiff leaf sprays standing out of the top.
  const sprays: string[] = [];
  for (let x = o.from + 2; x < o.to; x += 1.2 + r() * 1.6) {
    const yt = yAt(top, x);
    if (yAt(g, x) - yt < 4) continue;
    const a = -Math.PI / 2 + (r() - 0.5) * 1.6;
    const len = 1.8 + r() * 3;
    sprays.push(`M${f(x)} ${f(yt + 1)}l${f(Math.cos(a) * len)} ${f(Math.sin(a) * len)}`);
  }
  m.push({ d: sprays.join(''), c: 'l3', w: 0.55 });
  // The wet: curved glints along the upper side of each clump, thinning down the face, and a few
  // runs of water.
  const glints: string[] = [];
  const runs: string[] = [];
  for (let x = o.from + 6; x < o.to - 1; x += 1.6 + r() * 2.2) {
    const yt = yAt(top, x);
    const yb = yAt(g, x);
    const depth = yb - yt;
    if (depth < 6) continue;
    for (let k = 0; k < 4; k++) {
      const t = (k + r() * 0.8) / 5;
      if (r() < t * 1.1) continue;
      const y = yt + 1.6 + t * depth * 0.85;
      const len = 1.4 + r() * 1.6;
      glints.push(`M${f(x)} ${f(y)}q${f(len / 2)} ${f(-0.9)} ${f(len)} ${f(0.2)}`);
    }
    if (r() < 0.12) {
      const y = yt + 4 + r() * depth * 0.4;
      runs.push(`M${f(x + 0.6)} ${f(y)}v${f(2 + r() * 4)}`);
    }
  }
  m.push({ d: glints.join(''), c: 'lp', w: 0.55 }, { d: runs.join(''), c: 'lp', w: 0.4 });
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
  wetBrush(m, shift(g, 0.5), { seed: seed + 30, from: 196, to: W + 4, height: 40 });
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

/**
 * Dry camp, 17 May: the camp on a narrow ridge with no water, and the water "up the side of the
 * precipice, about six hundred feet high". From the camp on the left the eye goes over the brink and
 * down the flank of the ridge, a foot track worked down it in switchbacks, to a pool in the gully
 * floor far below, at the foot of the far wall. The two men with the kettles are strung along the
 * track, one just over the edge and one at the water, much smaller: the drop is told by how far the
 * track runs, how small the far man and the trees on the floor are, and the haze, since men at true
 * scale cannot fit in a strip.
 */
function dryCamp(seed = 131): Scene {
  const m: Mark[] = [];
  const r = rng(seed + 22);
  const floorY = 80;
  const pool = { x0: 208, x1: 278, y: floorY + 0.6 };
  // Our ridge: the camp along its top, and under it the end of the ridge, a precipice facing us,
  // sheer under the brink and easing a little toward its foot at the pool.
  const brink = 156;
  const ridgeY = 30;
  const span = pool.x0 + 4 - brink;
  // Broken rock along the edge: small steps and bulges on the way down.
  const rough = (x: number) => Math.max(0, Math.min(1, (x - brink) / 6)) * (1 - Math.max(0, (x - brink - span + 10) / 10)) * (1.1 * Math.sin(x / 3.1) + 0.7 * Math.sin(x / 1.7 + 1));
  const P = (x: number) => (x <= brink ? ridgeY + 0.6 * Math.sin(x / 13) - 0.6 * Math.sin(brink / 13) : ridgeY + (floorY - ridgeY) * Math.min(1, (x - brink) / span) ** 0.8 + rough(x));
  const top = curve(-4, brink + span, P, 0.5);
  sky(m, { seed, w: W, horizon: 9, clouds: [], reach: 0.9 });
  // Across the gully, the far wall, its rim about level with our camp: one cliff from the rim down to
  // the forest on the gully floor, pale with distance, its beds showing and scrub on a few ledges.
  const rim = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 8, amp: 1, scale: 120, plateau: 0.9, gullies: 3, gullyDepth: 2, gullyWidth: 9 });
  m.push({ d: areaPath(rim, H + 4), c: 'pp' });
  const wall = cliffFace(rim, { seed: seed + 12, height: 72, cover: 2, gap: 3, cap: 0.8, grain: 0.08, grainScale: 40 });
  // Only the strokes that show above our ridge, which stands in front of the wall's lower part.
  const hidden = (x: number, y: number) => x < brink + span && y > yAt(top, x) + 0.5;
  const face = wall.face.split('M').filter((seg) => {
    const [x, y] = seg.split('L')[0]!.split(' ').map(Number);
    return seg && !hidden(x!, y!);
  });
  m.push({ d: face.map((seg) => `M${seg}`).join(''), c: 'l0', w: 0.38 }, { d: linePath(rim), c: 'l1', w: 0.45 });
  const ledges: string[] = [];
  for (const [k, y0] of [21, 36, 52, 66].entries()) {
    let x = 150 + r() * 20;
    while (x < W + 4) {
      const len = 16 + r() * 40;
      const ly = (xx: number) => y0 + 1.2 * Math.sin(xx / (23 + k * 7) + k) + 0.4 * Math.sin(xx / 6 + k * 2);
      const pts: string[] = [];
      for (let xx = x; xx <= Math.min(W + 4, x + len); xx += 2) pts.push(`${pts.length ? 'L' : 'M'}${f(xx)} ${f(ly(xx))}`);
      ledges.push(pts.join(''));
      if (r() < 0.45) {
        const a = x + r() * len * 0.5;
        const b = Math.min(W + 4, a + 4 + r() * 8);
        const g = curve(a, b, (xx) => ly(xx) - 0.1, 0.4);
        m.push({ d: bandPath(taperEnds(canopy(g, { seed: seed + 40 + Math.round(a), size: 1.1, tall: 0.2 }), g, a, b, 1.5), g), c: 'f1' });
      }
      x += len + 6 + r() * 20;
    }
  }
  m.push({ d: ledges.join(''), c: 'l1', w: 0.4 });
  // The gully floor, far below: forest along it, and the pool in a gap among the trees.
  const fl = curve(-4, W + 4, (x) => floorY + 0.5 * Math.sin(x / 9));
  // The floor: a dark ribbon of forest along it, so the water shows bright in a gap among the trees.
  // (The near ridge hides it left of the pool.)
  const fl0 = 196;
  const flR = curve(fl0, W + 4, (x) => yAt(fl, x));
  m.push({ d: areaPath(shift(flR, -2.5), H + 4), c: 'pp' });
  const treeTop = canopy(shift(flR, -2.4), { seed: seed + 14, size: 2, tall: 0.3 });
  const treeFoot = curve(fl0, W + 4, (x) => floorY + 5 + 0.5 * Math.sin(x / 7) + 0.6 * Math.sin(x / 2.3) + 0.4 * Math.sin(x / 1.1));
  m.push({ d: bandPath(treeTop, treeFoot), c: 'f1' });
  const poolD = `M${pool.x0} ${pool.y}C${pool.x0 + 12} ${pool.y - 3.8} ${pool.x1 - 18} ${pool.y - 4} ${pool.x1} ${pool.y - 1.2}C${pool.x1 - 12} ${pool.y + 2.6} ${pool.x0 + 16} ${pool.y + 2.8} ${pool.x0} ${pool.y}Z`;
  m.push({ d: poolD, c: 'pp' });
  // The water: the trees on the far bank mirrored dark under it, then ruled water and a bright glint.
  m.push({ d: `M${pool.x0 + 9} ${f(pool.y - 2.4)}H${pool.x1 - 10}M${pool.x0 + 14} ${f(pool.y - 1.6)}h12M${pool.x0 + 34} ${f(pool.y - 1.7)}h8M${pool.x0 + 48} ${f(pool.y - 1.5)}h10`, c: 'l1', w: 0.7 });
  m.push({ d: `M${pool.x0 + 6} ${f(pool.y + 0.1)}h10M${pool.x0 + 22} ${f(pool.y + 0.2)}h6M${pool.x0 + 44} ${f(pool.y)}h14M${pool.x0 + 14} ${f(pool.y + 1.3)}h18M${pool.x0 + 40} ${f(pool.y + 1.4)}h8`, c: 'lw', w: 0.5 });
  // Our ridge, drawn after the far side.
  m.push({ d: areaPath(top, H + 4), c: 'pp' });
  // The face in upright strokes broken by its beds, darkest under the rim, paling downward into the
  // haze of the gully.
  const rock: string[][] = [[], [], []];
  const beds = [41, 50, 59, 67, 74];
  for (let x = -4; x < brink + span; x += 0.8 + r() * 0.6) {
    for (let y = yAt(top, x) + 0.8 + r() * 1.2; y < H + 4; y += 2.2 + r() * 3) {
      const y2 = Math.min(H + 4, y + 1.5 + r() * 3);
      if (beds.some((b) => b > y - 0.6 && b < y2 + 0.6)) continue;
      const depth = Math.max(0, Math.min(1, (y - ridgeY) / 50));
      if (r() < 0.95 - depth * 0.3) rock[Math.min(2, Math.floor(depth * 3))]!.push(`M${f(x)} ${f(y)}V${f(y2)}`);
    }
  }
  rock.forEach((d, i) => d.length && m.push({ d: d.join(''), c: `l${4 - i}`, w: 0.5 - i * 0.06 }));
  // The beds themselves: ledges running across the face, breaking off here and there.
  const ledgeLines: string[][] = [[], [], []];
  for (const [k, by] of beds.entries()) {
    let x = -4 + r() * 10;
    while (x < brink + span) {
      const len = 18 + r() * 46;
      const pts: string[] = [];
      for (let xx = x; xx <= x + len; xx += 1.5) {
        const y = by + 0.5 * Math.sin(xx / 7 + k * 1.3) + (xx - x) * 0.015;
        if (y > yAt(top, xx) + 1.2) pts.push(`${pts.length ? 'L' : 'M'}${f(xx)} ${f(y)}`);
      }
      if (pts.length > 2) ledgeLines[Math.min(2, Math.floor((by - ridgeY) / 17))]!.push(pts.join(''));
      x += len + 2 + r() * 8;
    }
  }
  ledgeLines.forEach((d, i) => d.length && m.push({ d: d.join(''), c: `l${4 - i}`, w: 0.6 - i * 0.08 }));
  m.push({ d: linePath(top), c: 'l4', w: 0.9 });
  m.push({ d: tufts(top, { seed: seed + 21, from: 4, to: brink - 6, every: 13, h: 3.4 }), c: 'l3', w: 0.42 });
  // The foot track worked down the face in switchbacks from the camp to the water, pale on the dark
  // rock, its lower edge in shadow, the legs shortening as they go down and away.
  const track: [number, number][] = [
    [150, ridgeY + 0.4],
    [118, 41],
    [150, 47],
    [122, 52.5],
    [156, 58],
    [132, 62.5],
    [166, 67],
    [148, 70.5],
    [180, 74],
    [166, 76.8],
    [198, 79.2],
    [pool.x0 + 3, floorY - 0.3],
  ];
  const tpath = (dy: number) => `M${track.map(([x, y]) => `${f(x)} ${f(y + dy)}`).join('L')}`;
  m.push({ d: tpath(0), c: 'lp', w: 2 }, { d: tpath(1.05), c: 'l4', w: 0.4 });
  // The camp: the fire, the packs, a horse standing dry, a leader sitting by.
  campfire(m, { seed: seed + 30, x: 44, y: yAt(top, 44), s: 0.8, smoke: 20, drift: 0.4 });
  sack(m, 62, yAt(top, 62), 0.8);
  bedroll(m, 77, yAt(top, 77), 0.8);
  const fig = emptyFigure();
  horse(fig, 103, yAt(top, 103), 0.72, 0.3, null, null, { droopDeg: 26 });
  sitting(fig, 20, yAt(top, 20), 0.85, { leader: true, arms: 'knees' });
  // The two men with the kettles: one just over the edge, one far below at the water.
  const along = (i: number, t: number) => [track[i]![0] + (track[i + 1]![0] - track[i]![0]) * t, track[i]![1] + (track[i + 1]![1] - track[i]![1]) * t] as const;
  const [m1x, m1y] = along(0, 0.4);
  standing(fig, m1x, m1y + 0.4, 0.56, { leader: false, arms: 'kettle', dir: -1, lean: 0.14 });
  standing(fig, pool.x0 + 2, floorY - 0.2, 0.22, { leader: false, arms: 'kettle', lean: 0.4 });
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
  dryCamp: 'An engraving: the camp on a ridge top with a horse standing dry, and a foot track zigzagging all the way down the precipice to a pool on the gully floor far below, one man with a kettle starting down and another, tiny, at the water.',
  chill: 'An engraving: a man wrapped in a blanket by the fire while two others set off to work.',
  bowel: 'An engraving: a man lying ill under his blanket, another bringing the kettle, the salt-meat cask by the fire.',
  hunterStrays: 'An engraving: men calling from the ridge; far off across the gully, one man follows a kangaroo among the trees.',
  dogsRaceOff: 'An engraving at night: the dogs racing from the fire into the dark scrub, a man on watch with his musket.',
  brood: 'An engraving at night: three men hunched round the fire.',
  refusal: 'An engraving: three servants sitting with their arms folded and their axes on the ground, a leader standing over them.',
};
