// A plate for each journal card, shown at the head of the card and as its thumbnail in the
// journal. The four milestone cards draw the party as it is (see scenes.tsx); the rest are fixed
// scenes, drawn once from a seed. Pure: each returns a Scene of marks (see compose.ts).
import { isSignOfCountry } from '../../engine';
import { bedroll, campfire, cask, farGum, gum, hills, kettle, ledge, sky, stonePile, tracks, type Scene } from './compose';
import { dogRunning, emptyFigure, figureMarks, kangaroo, lying, procession, standing, wombat, type Mark, type Pack, type PartyCounts } from './figures';
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
  const HZ = 64;
  sky(m, { seed, w: W, horizon: HZ, clouds: [cloudBank(seed + 1, 80, 22, 150, 18, 7), cloudBank(seed + 2, 340, 16, 110, 12, 5)], reach: 0.75 });
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: HZ, amp: 2.5, scale: 110, plateau: 0.85, gullies: 4, gullyDepth: 3, gullyWidth: 8 });
  hills(m, far, H, 0, { seed: seed + 11, depth: 6, gap: 1.6, growth: 0.3 });
  // The far walls of the two valleys, either side of the ridge, cliffed under their tops.
  const walls: [number, number, number][] = [
    [-4, 128, 84],
    [296, W + 4, 80],
  ];
  for (const [i, [x0, x1, base]] of walls.entries()) {
    const wall = ridgeLine({ seed: seed + 12 + i, x0, x1, base, amp: 2, scale: 60, plateau: 0.8, tilt: i ? -0.04 : 0.05 });
    hills(m, wall, H, 1, { seed: seed + 14 + i, depth: 4, gap: 1.2 }, 0.7);
    const cl = cliffFace(wall, { seed: seed + 16 + i, height: 9, cover: 0.6, gap: 1.8, cap: 1 });
    m.push({ d: cl.face, c: 'l1', w: 0.38 });
    hills(m, cl.foot, H, 1, { seed: seed + 18 + i, depth: 10, gap: 1.6, growth: 0.3 });
  }
  // Mist in the valleys: the walls fade to white.
  const mist: string[] = [];
  for (let y = 96; y < H + 4; y += 1.4) mist.push(`M-4 ${f(y)}H${W + 4}`);
  m.push({ d: mist.join(''), c: 'lp', w: 1.05 });
  // The spine: depth d runs from 0 at the foot of the plate to 1 at the horizon.
  const yAtD = (d: number) => HZ + 3 + (H + 8 - HZ - 3) * (1 - d) ** 2.1;
  const xAtD = (d: number) => 150 + 116 * d ** 0.8 + 9 * Math.sin(d * 8 + 1) * (1 - d);
  const sc = (d: number) => (1 - d) ** 1.5 + 0.03;
  const r = rng(seed + 20);
  const paper: string[] = [];
  const left: string[] = [];
  const right: string[] = [];
  const crowns: string[][] = [[], [], []];
  const gums: [number, number, number, number][] = [];
  let d = 0;
  while (d < 0.97) {
    const x = xAtD(d);
    const y = yAtD(d);
    const dx = xAtD(d + 0.01) - x;
    const dy = yAtD(d + 0.01) - y;
    const l = Math.hypot(dx, dy) || 1;
    const nx = -dy / l;
    const ny = dx / l;
    const half = 22 * sc(d) + 0.8;
    const len = 36 * sc(d) + 2.5;
    // Each side: a rib from the edge of the crest, falling outward and down.
    for (const side of [-1, 1]) {
      const ex = x + side * nx * half;
      const ey = y + side * ny * half;
      const ox = side * (0.55 + r() * 0.2);
      const L = len * (0.7 + r() * 0.5);
      const q = `M${f(ex)} ${f(ey)}Q${f(ex + ox * L * 0.25)} ${f(ey + L * 0.5)} ${f(ex + ox * L * 0.8)} ${f(ey + L)}`;
      (side > 0 ? right : left).push(q);
    }
    paper.push(`M${f(x - nx * half)} ${f(y - ny * half)}L${f(x + nx * half)} ${f(y + ny * half)}`);
    // Trees along the crest, smaller with distance: a few gums near, ticks far off.
    if (d > 0.16 && r() < 0.32) {
      const tx = x + (r() - 0.5) * half * 1.5;
      if (d < 0.5) gums.push([tx, y, 26 * sc(d) + 4, d < 0.3 ? 3 : 2]);
      else crowns[d < 0.7 ? 1 : 0]!.push(`M${f(tx)} ${f(y)}v${f(-(5 * sc(d) + 1.2))}`);
    }
    d += 0.0045 + 0.06 * (1 - (1 - d) ** 2) * 0.12 + (1 - d) * 0.004;
  }
  m.push({ d: right.join(''), c: 'l3', w: 0.5 }, { d: left.join(''), c: 'l2', w: 0.42 });
  crowns.forEach((c, i) => c.length && m.push({ d: c.join(''), c: `l${i + 1}`, w: 0.7 }));
  for (const [i, [x, y, h, tone]] of gums.entries()) farGum(m, { seed: seed + 100 + i, x, y, h, tone });
  // The near end of the ridge top, open, where the party walks on.
  const g = curve(84, 240, (x) => H + 2 - 14 * Math.exp(-(((x - 160) / 46) ** 2)) + 0.6 * Math.sin(x / 7));
  m.push({ d: areaPath(g, H + 4), c: 'pp' }, { d: linePath(g), c: 'l4', w: 0.8 });
  m.push({ d: tufts(g, { seed: seed + 22, from: 96, to: 228, every: 9, h: 4 }), c: 'l3', w: 0.42 });
  const { fig } = procession({ servants: 1, horses: 2, dogs: 1 }, g, { from: 104, to: 214, maxScale: 0.5, seed: seed + 30 });
  m.push(...figureMarks(fig));
  void paper;
  return { w: W, h: H, marks: m };
}

/** Distance by the clock: a watch on the rock, its chain run out, the ridges below. */
function distanceByClock(seed = 211): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 80, clouds: [cloudBank(seed + 1, 310, 30, 160, 22, 7)], reach: 0.72 });
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 78, amp: 3, scale: 100, plateau: 0.7, gullies: 4 });
  hills(m, far, H, 0, { seed: seed + 11, depth: 8, gap: 1.5, growth: 0.25 });
  const mid = ridgeLine({ seed: seed + 20, x0: -4, x1: W + 4, base: 94, amp: 5, scale: 70, plateau: 0.4 });
  hills(m, mid, H, 1, { seed: seed + 21, depth: 12, gap: 1.4, growth: 0.2 }, 0.9);
  const top = curve(-4, W + 4, (x) => 118 - 4 * Math.sin(x / 90) + 1.1 * Math.sin(x / 9));
  ledge(m, top, H + 2, seed + 30);
  // The watch, standing against a stone: case, bezel, dial, the hours, two hands at two o'clock.
  const cx = 150;
  const R = 27;
  const cy = yAt(top, cx) - R - 0.5;
  const circle = (r: number) => `M${f(cx - r)} ${f(cy)}A${f(r)} ${f(r)} 0 1 0 ${f(cx + r)} ${f(cy)}A${f(r)} ${f(r)} 0 1 0 ${f(cx - r)} ${f(cy)}Z`;
  m.push({ d: `M${f(cx + 16)} ${f(yAt(top, cx + 22))}C${f(cx + 18)} ${f(cy + 6)} ${f(cx + 34)} ${f(cy + 4)} ${f(cx + 38)} ${f(yAt(top, cx + 38))}Z`, c: 'pk', w: 0.6 });
  m.push({ d: circle(R), c: 'pk', w: 1.1 });
  m.push({ d: circle(R - 3.4), c: 'l4', w: 0.6 });
  // The case shaded on its lower right.
  const shade: string[] = [];
  for (let a = 0.05; a < 1.55; a += 0.07) {
    const c = Math.cos(a);
    const s = Math.sin(a);
    shade.push(`M${f(cx + c * (R - 3))} ${f(cy + s * (R - 3))}L${f(cx + c * (R - 0.6))} ${f(cy + s * (R - 0.6))}`);
  }
  m.push({ d: shade.join(''), c: 'l3', w: 0.4 });
  const ticks: string[] = [];
  const minutes: string[] = [];
  for (let i = 0; i < 60; i++) {
    const a = (i / 60) * Math.PI * 2;
    const big = i % 5 === 0;
    const r0 = R - (big ? 9 : 5.6);
    const r1 = R - 4.6;
    (big ? ticks : minutes).push(`M${f(cx + Math.sin(a) * r0)} ${f(cy - Math.cos(a) * r0)}L${f(cx + Math.sin(a) * r1)} ${f(cy - Math.cos(a) * r1)}`);
  }
  m.push({ d: ticks.join(''), c: 'l4', w: 1 }, { d: minutes.join(''), c: 'l4', w: 0.35 });
  const hand = (a: number, len: number, w: number) => {
    const sx = Math.sin(a);
    const cy2 = -Math.cos(a);
    const nx = -cy2 * w;
    const ny = sx * w;
    return `M${f(cx - sx * 3 + nx)} ${f(cy - cy2 * 3 + ny)}L${f(cx + sx * len)} ${f(cy + cy2 * len)}L${f(cx - sx * 3 - nx)} ${f(cy - cy2 * 3 - ny)}Z`;
  };
  m.push({ d: hand((2 / 12) * Math.PI * 2, R - 13, 1.3) + hand(0, R - 8, 0.9), c: 'f4' });
  m.push({ d: circle(1.6), c: 'f4' });
  // Pendant and bow at the top, and the chain run out along the rock.
  m.push({ d: `M${f(cx - 2.4)} ${f(cy - R + 0.4)}L${f(cx - 2.4)} ${f(cy - R - 3.2)}L${f(cx + 2.4)} ${f(cy - R - 3.2)}L${f(cx + 2.4)} ${f(cy - R + 0.4)}Z`, c: 'pk', w: 0.7 });
  m.push({ d: `M${f(cx - 4.4)} ${f(cy - R - 5)}A4.4 4.4 0 1 1 ${f(cx + 4.4)} ${f(cy - R - 5)}`, c: 'l4', w: 1 });
  const links: string[] = [];
  const pts: [number, number][] = [];
  for (let t = 0; t <= 1; t += 0.035) {
    const x = cx + 4.4 + t * 118;
    const sag = Math.sin(t * Math.PI) * 6;
    const y = t < 0.35 ? cy - R - 5 + (yAt(top, x) - (cy - R - 5)) * (t / 0.35) ** 1.6 : yAt(top, x) - 1.2 - sag * 0.15;
    pts.push([x, y]);
  }
  for (const [i, [x, y]] of pts.entries()) links.push(i % 2 ? `M${f(x - 1.3)} ${f(y)}h2.6` : `M${f(x)} ${f(y - 0.9)}a1.3 0.9 0 1 0 0.01 0Z`);
  m.push({ d: links.join(''), c: 'l4', w: 0.55 });
  return { w: W, h: H, marks: m };
}

/** The old cairn: a pile of stones on the ridge top, two of the party looking it over. */
function cairn(seed = 221): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 78, clouds: [cloudBank(seed + 1, 120, 26, 170, 20, 7)], reach: 0.75 });
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 74, amp: 3, scale: 110, plateau: 0.8, gullies: 4 });
  hills(m, far, H, 0, { seed: seed + 11, depth: 8, gap: 1.6, growth: 0.25 });
  const mid = ridgeLine({ seed: seed + 20, x0: -4, x1: W + 4, base: 92, amp: 4, scale: 80, plateau: 0.6, gullies: 3 });
  hills(m, mid, H, 1, { seed: seed + 21, depth: 12, gap: 1.4, growth: 0.2 }, 1);
  const g = flat(122, seed, 1.4);
  hills(m, g, H + 2, 3, { seed: seed + 30, depth: 14, gap: 1.3, growth: 0.2, bias: 0.1 });
  m.push({ d: tufts(g, { seed: seed + 31, from: 2, to: W - 2, every: 12, h: 5 }), c: 'l4', w: 0.48 });
  gum(m, { seed: seed + 40, x: 340, y: yAt(g, 340) + 1, h: 104, lean: -0.06, spread: 0.9, density: 0.45, depth: 3 });
  stonePile(m, { seed: seed + 50, x: 214, y: yAt(g, 214) + 0.5, w: 48, h: 34 });
  const fig = emptyFigure();
  standing(fig, 158, yAt(g, 158), 1.05, { leader: true, arms: 'point' });
  standing(fig, 128, yAt(g, 128), 1.05, { leader: false, arms: 'gunRest' });
  m.push(...figureMarks(fig));
  return { w: W, h: H, marks: m };
}

/** Wombat tracks: the track across the sand to a burrow under the prickly brush. */
function wombats(seed = 231): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 70, clouds: [cloudBank(seed + 1, 300, 22, 180, 18, 8)], reach: 0.7 });
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 70, amp: 3, scale: 110, plateau: 0.8 });
  hills(m, far, H, 0, { seed: seed + 11, depth: 8, gap: 1.6, growth: 0.25 });
  // The prickly brush, thick and dark behind.
  const bank = flat(100, seed + 3, 2);
  const brushTop = canopy(bank, { seed: seed + 20, size: 9, tall: 0.15 });
  m.push({ d: areaPath(brushTop, H + 2), c: 'pp' });
  m.push({ d: bandPath(brushTop, shift(bank, 0.5)), c: 'f3' });
  // A low bank of sand with the burrow in it.
  const sand = curve(-4, W + 4, (x) => 106 - 9 * Math.exp(-(((x - 316) / 38) ** 2)) + 0.6 * Math.sin(x / 7));
  hills(m, sand, H + 2, 2, { seed: seed + 30, depth: 6, gap: 2.2, growth: 0.4 });
  const bx = 318;
  const by = yAt(sand, bx) + 8;
  m.push({ d: `M${f(bx - 9)} ${f(by)}C${f(bx - 9)} ${f(by - 10)} ${f(bx + 9)} ${f(by - 10)} ${f(bx + 9)} ${f(by)}Z`, c: 'f4' });
  // Sand stippled, and the track running across it to the burrow.
  const r = rng(seed + 40);
  const dots: string[] = [];
  for (let i = 0; i < 260; i++) {
    const x = r() * W;
    const y = 112 + r() * 28;
    dots.push(`M${f(x)} ${f(y)}h0.01`);
  }
  m.push({ d: dots.join(''), c: 'l2', w: 0.7 });
  tracks(m, { seed: seed + 41, pts: [[10, 132], [90, 128], [170, 124], [232, 122]], every: 5.2 });
  const fig = emptyFigure();
  wombat(fig, 262, 122, 1.9);
  m.push(...figureMarks(fig));
  m.push({ d: tufts(curve(-4, W + 4, () => 113), { seed: seed + 50, from: 4, to: 280, every: 22, h: 5 }), c: 'l3', w: 0.45 });
  return { w: W, h: H, marks: m };
}

/** The rock wall: the narrow ridge blocked by a mass of rock, the men shifting stones in its one gap. */
function rockWall(seed = 241, counts: PartyCounts = { servants: 2, horses: 2, dogs: 1 }, loads?: Pack[]): Scene {
  const m: Mark[] = [];
  sky(m, { seed, w: W, horizon: 62, clouds: [cloudBank(seed + 1, 120, 22, 170, 16, 7)], reach: 0.8 });
  // Across the gorge, the far side in haze.
  const far = ridgeLine({ seed: seed + 10, x0: -4, x1: W + 4, base: 58, amp: 2.5, scale: 120, plateau: 0.85, gullies: 3 });
  hills(m, far, H, 0, { seed: seed + 11, depth: 8, gap: 1.6, growth: 0.25 });
  const low = ridgeLine({ seed: seed + 12, x0: -4, x1: W + 4, base: 80, amp: 3, scale: 70, plateau: 0.5 });
  hills(m, low, H, 1, { seed: seed + 13, depth: 12, gap: 1.6, growth: 0.25 });
  // The ridge top, narrow, its near side a precipice falling out of the plate.
  const ridge = curve(-4, W + 4, (x) => 110 + 0.8 * Math.sin(x / 17) + 0.4 * Math.sin(x / 5));
  m.push({ d: areaPath(ridge, H + 2), c: 'pp' });
  const drop = cliffFace(ridge, { seed: seed + 20, height: 30, cover: 0.4, gap: 2, cap: 0.8 });
  m.push({ d: drop.face, c: 'l2', w: 0.42 }, { d: drop.beds, c: 'l2', w: 0.36 });
  m.push({ d: linePath(ridge), c: 'l4', w: 0.9 });
  // The rock: weathered sandstone rising sheer from the ridge, bedded, scrub on top, a broken cleft
  // through the middle where the track goes.
  const wx0 = 214;
  const wx1 = 346;
  const gapX = 282;
  const n = rng(seed + 30);
  const lumps = Array.from({ length: 14 }, () => n());
  const topAt = (x: number) => {
    const u = ((x - wx0) / (wx1 - wx0)) * 13;
    const i = Math.floor(u);
    const t = u - i;
    const a = lumps[Math.max(0, Math.min(13, i))]!;
    const b = lumps[Math.max(0, Math.min(13, i + 1))]!;
    return 56 + (a + (b - a) * t * t * (3 - 2 * t)) * 7 + 0.4 * Math.sin(x / 1.7);
  };
  const base = (x: number) => yAt(ridge, x);
  const courses: string[] = [];
  const joints: string[] = [];
  const shade: string[] = [];
  for (const [x0, x1, lean0, lean1] of [
    [wx0, gapX - 3.5, 4, 1],
    [gapX + 3.5, wx1, 1, 5],
  ] as const) {
    // The outline: a leaning, broken side up to a rounded, ragged top and down the other side.
    const outline: [number, number][] = [];
    const sideL = (y: number) => x0 + lean0 * ((base(x0) - y) / (base(x0) - topAt(x0))) ** 1.6 + (n() - 0.5) * 0.8;
    const sideR = (y: number) => x1 - lean1 * ((base(x1) - y) / (base(x1) - topAt(x1))) ** 1.6 + (n() - 0.5) * 0.8;
    for (let y = base(x0); y > topAt(x0) + 3; y -= 2) outline.push([sideL(y), y]);
    const xa = x0 + lean0;
    const xb = x1 - lean1;
    for (let x = xa; x <= xb; x += 1) {
      const round = Math.min(1, (x - xa) / 4, (xb - x) / 4);
      outline.push([x, topAt(x) + (1 - round) * 3]);
    }
    for (let y = topAt(x1) + 3; y < base(x1); y += 2) outline.push([sideR(y), y]);
    m.push({ d: outline.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join('') + 'Z', c: 'pp' });
    m.push({ d: outline.map(([x, y], i) => `${i ? 'L' : 'M'}${f(x)} ${f(y)}`).join(''), c: 'l4', w: 0.95 });
    // Scrub along the top.
    const crest = curve(xa + 2, xb - 2, (x) => topAt(x) + 0.4, 1);
    const scrubTop = canopy(crest, { seed: seed + 33 + x0, size: 3.4, sparse: 0.25 });
    m.push({ d: bandPath(scrubTop, crest), c: 'f3' });
    // Bedding: wavering, broken courses; a few upright joints; shade on the side away from the light.
    for (let y = topAt((x0 + x1) / 2) + 6; y < base(x0) - 3; y += 5 + n() * 3) {
      let x = x0 + lean0 + 1 + n() * 4;
      while (x < x1 - lean1 - 2) {
        const len = 5 + n() * 14;
        const xe = Math.min(x1 - lean1 - 1, x + len);
        if (y > topAt(x) + 3) courses.push(`M${f(x)} ${f(y)}Q${f((x + xe) / 2)} ${f(y + (n() - 0.5) * 2.2)} ${f(xe)} ${f(y + (n() - 0.5) * 1.2)}`);
        x = xe + 2 + n() * 5;
      }
    }
    for (let x = x0 + 8 + n() * 8; x < x1 - 6; x += 12 + n() * 14) {
      const y0 = topAt(x) + 4 + n() * 10;
      joints.push(`M${f(x)} ${f(y0)}Q${f(x + (n() - 0.5) * 3)} ${f(y0 + 8)} ${f(x + (n() - 0.5) * 2)} ${f(Math.min(base(x) - 1, y0 + 10 + n() * 18))}`);
    }
    for (let x = x0 + (x1 - x0) * 0.55; x < x1 - lean1 * 0.5; x += 1 + n() * 0.9) {
      for (let y = topAt(x) + 3; y < base(x) - 0.5; y += 2.4 + n() * 3.6) shade.push(`M${f(x)} ${f(y)}V${f(Math.min(base(x) - 0.5, y + 1.5 + n() * 3))}`);
    }
  }
  m.push({ d: courses.join(''), c: 'l3', w: 0.5 }, { d: joints.join(''), c: 'l4', w: 0.45 }, { d: shade.join(''), c: 'l3', w: 0.4 });
  // The cleft between: dark, narrowing to the broken floor where the track goes through.
  m.push({ d: `M${f(gapX - 3.6)} ${f(topAt(gapX - 3.6) + 4)}L${f(gapX - 1.4)} ${f(base(gapX) - 9)}L${f(gapX + 1.4)} ${f(base(gapX) - 9)}L${f(gapX + 3.6)} ${f(topAt(gapX + 3.6) + 4)}Z`, c: 'f4' });
  // Rubble at the foot.
  const rubble: string[] = [];
  for (const x of [wx0 - 4, wx0 + 6, wx1 - 6, wx1 + 4, gapX - 12]) {
    const y = base(x) + 0.2;
    const sz = 1.2 + n() * 1.4;
    rubble.push(`M${f(x - sz * 1.6)} ${f(y)}C${f(x - sz * 1.6)} ${f(y - sz * 1.6)} ${f(x + sz * 1.4)} ${f(y - sz * 1.8)} ${f(x + sz * 1.6)} ${f(y)}Z`);
  }
  m.push({ d: rubble.join(''), c: 'pk', w: 0.45 });
  // Stones moved out of the cleft, and a man lifting another.
  for (const [i, x] of [264, 300, 310].entries()) {
    const y = yAt(ridge, x) + 0.3;
    const sz = 1 - i * 0.12;
    m.push({ d: `M${f(x - 4 * sz)} ${f(y)}C${f(x - 4.4 * sz)} ${f(y - 5.6 * sz)} ${f(x + 3.4 * sz)} ${f(y - 6.2 * sz)} ${f(x + 4.2 * sz)} ${f(y)}Z`, c: 'pk', w: 0.5 });
  }
  const men = emptyFigure();
  standing(men, gapX - 1, yAt(ridge, gapX), 0.78, { leader: false, arms: 'stone', lean: 0.3 });
  m.push(...figureMarks(men));
  // The party waiting behind.
  const { fig } = procession(counts, ridge, { from: 8, to: 196, maxScale: 0.62, seed: seed + 40, loads });
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
};

export const CARD_PLATE_LABEL: Record<string, string> = {
  ridgeMethod: 'An engraving: the line of a ridge running on into the distance, valleys falling away on both sides; a man marks a tree as the party follows.',
  distanceByClock: 'An engraving: a pocket watch standing on a rock at two o’clock, its chain run out, the ridges beyond.',
  cairn: 'An engraving: a pile of stones on the ridge top, a leader pointing it out.',
  wombats: 'An engraving: a wombat’s track across the sand to its burrow under the prickly brush.',
  rockWall: 'An engraving: a wall of rock across a narrow ridge above a precipice, a man shifting stones in its one gap, the party waiting.',
  gullyWater: 'An engraving: the camp on a narrow ridge, the gully far below, two men climbing the face with kettles.',
  kangarooDogs: 'An engraving: three kangaroo dogs running down a kangaroo through open forest.',
  frost: 'An engraving: dawn on a frosty camp, the men asleep under blankets, a kangaroo leg hanging frozen from a meat pole.',
  saltMeat: 'An engraving: an open cask of salt meat by a dying fire, a man laid up under his blanket.',
  after1813: 'An engraving: a road cut slantwise across a ridge and over its crest, stumps along it, nobody on it.',
};

/** Where each plate's subject is, for its thumbnail: x, y, width, height in the plate's units. */
export const CARD_FOCUS: Record<string, readonly [number, number, number, number]> = {
  ridgeMethod: [96, 44, 230, 96],
  distanceByClock: [70, 24, 200, 100],
  cairn: [96, 52, 200, 86],
  wombats: [180, 76, 200, 64],
  rockWall: [140, 40, 240, 96],
  gullyWater: [10, 26, 240, 100],
  kangarooDogs: [120, 52, 240, 86],
  frost: [110, 54, 230, 82],
  saltMeat: [64, 64, 230, 76],
  after1813: [100, 60, 240, 80],
};

/** The cards whose plate draws the party as it is now, at the place the card is found. */
export const MILESTONE_IDS = ['viewBack', 'highHeath', 'wayDown', 'sugarloaf'] as const;
export const isMilestone = (id: string) => (MILESTONE_IDS as readonly string[]).includes(id);

/**
 * Whose Country and the four Signs of Country share the Country landscape and get no pictures of
 * their own. The signs are people: the huts they lived in, the smoke of their fires, a man cutting
 * wood, their camps. Drawing them is for the Darug, Gundungurra and Wiradjuri reviewers to agree
 * first (see the project's Country review); until then the cards show the country, not the people.
 */
export const isCountryCard = (id: string) => id === 'whoseCountry' || isSignOfCountry(id);

/** Every journal card has a picture: its own plate, the Country landscape, or a milestone plate. */
export function hasCardArt(id: string): boolean {
  return isCountryCard(id) || !!CARD_PLATES[id] || isMilestone(id);
}
