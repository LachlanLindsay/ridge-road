// The party in silhouette: pack horses, men and kangaroo dogs walking to the right, drawn as path
// data in scene units so a whole procession merges into a handful of paths.
import type { MemberId } from '../../engine';
import { f, rng, yAt, type Curve } from './kit';

/** One run of path data with the class that colours it and its stroke width. */
export interface Mark {
  d: string;
  c: string;
  w?: number;
  /** A stable key, for marks that stay put while others around them are redrawn. */
  k?: string;
}

type Pt = (x: number, y: number) => string;
const at = (X: number, Y: number, s: number): Pt => (x, y) => `${f(X + x * s)} ${f(Y + y * s)}`;

/**
 * Figure parts sorted by how they print: `ink` solid, `far` the legs on the far side, `paper` the
 * loads (paper with an ink outline) in three layers, back to front, `topInk` solid pieces lying on
 * the loads, `rope` thin ink lines.
 */
export interface Figure {
  ink: string[];
  far: string[];
  limbs: { d: string; w: number }[];
  farLimbs: { d: string; w: number }[];
  back: { d: string; w: number }[];
  paper: { d: string; w: number }[];
  front: { d: string; w: number }[];
  topInk: string[];
  rope: { d: string; w: number }[];
}

export const emptyFigure = (): Figure => ({ ink: [], far: [], limbs: [], farLimbs: [], back: [], paper: [], front: [], topInk: [], rope: [] });

/** A leg as hip, joint and foot, the joint bent the way the animal's bends. */
function leg(p: Pt, top: [number, number], joint: [number, number], foot: [number, number]) {
  return `M${p(...top)}L${p(...joint)}L${p(...foot)}`;
}

/** What one horse carries, for drawing its pack: pounds in all, and the pieces by item. */
export interface Pack {
  total: number;
  /** Pounds of flour, salt meat, tea and cut grass; counts of shots, axes, hatchets, hoes, blankets, shoes and camp kits. */
  items: Partial<Record<string, number>>;
}

/** An ordinary load, for a horse drawn without one: sacks and a keg, nothing tied on top. */
export const PLAIN_PACK: Pack = { total: 120, items: { flour: 60, saltMeat: 45 } };

const SHOT_LB = 1 / 6;
const SHOES_LB = 2;
/** The load at which a horse starts to hang its head, and the most it is ever drawn carrying. */
const EASY_LB = 160;
const MOST_LB = 200;

/** Rotate a point about (px, py) by `a` radians, clockwise on screen. */
function turn(x: number, y: number, px: number, py: number, a: number): [number, number] {
  const c = Math.cos(a);
  const s = Math.sin(a);
  return [px + (x - px) * c - (y - py) * s, py + (x - px) * s + (y - py) * c];
}

/**
 * A pack horse facing right, feet on y = 0, about 26 to the withers. `step` sets the walk; `lead`
 * is where the rope from its halter goes, in the same units, or null for a loose horse. `pack` is
 * what it carries: the panniers fill and the pile on top grows with the load, and past an easy
 * load the horse hangs its head. Null draws it bare.
 */
export function horse(fig: Figure, X: number, Y: number, s: number, step: number, lead: [number, number] | null = null, pack: Pack | null = PLAIN_PACK, o?: { droopDeg?: number; spent?: boolean }) {
  const p = at(X, Y, s);
  const a = Math.sin(step);
  const b = Math.sin(step + Math.PI);
  const total = pack?.total ?? 0;
  // Past an easy load the head comes down, further the heavier it is. A spent horse hangs it lower.
  const droop = o?.droopDeg !== undefined ? (o.droopDeg * Math.PI) / 180 : total > EASY_LB ? ((12 + Math.min(1, (total - EASY_LB) / (MOST_LB - EASY_LB)) * 16) * Math.PI) / 180 : 0;
  const h: Pt = droop ? (x, y) => p(...turn(x, y, 12.5, -24.5, droop)) : p;
  fig.ink.push(
    `M${p(-15.5, -23.8)}C${p(-13, -25.6)} ${p(-9, -25.4)} ${p(-6, -24.9)}C${p(-2, -24.3)} ${p(2, -24.6)} ${p(5, -25.4)}C${p(7, -26)} ${p(8.5, -26.6)} ${p(10, -27.4)}` +
      `C${h(13, -30)} ${h(16, -33.5)} ${h(18.6, -36)}L${h(18.5, -39.6)}L${h(19.9, -36.7)}C${h(20.7, -36.3)} ${h(21.4, -35.8)} ${h(22, -35)}` +
      `C${h(24, -32)} ${h(26.4, -28.6)} ${h(27.8, -26.4)}C${h(28.4, -25.4)} ${h(27.9, -24.4)} ${h(26.6, -24.5)}C${h(25.2, -24.6)} ${h(24, -25.4)} ${h(23.2, -26.4)}` +
      `C${h(22.2, -27.6)} ${h(21, -28.6)} ${h(20.2, -28.6)}C${h(18.8, -27.2)} ${h(16.6, -24.2)} ${p(15.4, -21.4)}C${p(14.8, -19.6)} ${p(14.4, -17)} ${p(13.4, -15.2)}` +
      `C${p(12, -13.2)} ${p(9, -12.4)} ${p(6, -12.4)}C${p(1, -12)} ${p(-4, -12.2)} ${p(-7.5, -12.8)}C${p(-9.5, -13.2)} ${p(-11, -14.2)} ${p(-12.2, -15.6)}` +
      `C${p(-14.6, -17.5)} ${p(-16.4, -20.4)} ${p(-15.5, -23.8)}Z` +
      // Tail
      `M${p(-15.2, -23.4)}C${p(-18.6, -22.6)} ${p(-19.8, -19)} ${p(-19.4, -15.5)}C${p(-19.2, -13)} ${p(-18.6, -11.2)} ${p(-17.7, -9.8)}C${p(-17.4, -12.6)} ${p(-17.5, -15.5)} ${p(-17.2, -18)}C${p(-17, -20.2)} ${p(-16.4, -21.6)} ${p(-15, -22)}Z`,
  );
  if (o?.spent) {
    // Spent: the forelegs braced out in front, the hind legs propped out behind, the knees not quite
    // straight, the way a horse stands when it can barely stay on its feet.
    fig.limbs.push({ d: leg(p, [11.4, -14], [13.4, -7.4], [16.4, -0.4]), w: 2.3 * s });
    fig.limbs.push({ d: leg(p, [-10.4, -14.6], [-14.6, -7.8], [-16.4, -0.4]), w: 2.5 * s });
    fig.farLimbs.push({ d: leg(p, [9.8, -14], [12.4, -7.6], [14.2, -0.4]), w: 2.1 * s });
    fig.farLimbs.push({ d: leg(p, [-8.8, -14.6], [-12.4, -7.4], [-13.2, -0.4]), w: 2.3 * s });
  } else {
  // Near legs in ink, far legs a shade lighter, so the walk reads.
  fig.limbs.push({ d: leg(p, [11.4, -14], [11.8 + 2.2 * a, -7.2], [12.2 + 4 * a, -0.4]), w: 2.3 * s });
  fig.limbs.push({ d: leg(p, [-10.4, -14.6], [-12.8 + 1.2 * b, -7.4], [-11 + 3.8 * b, -0.4]), w: 2.5 * s });
  fig.farLimbs.push({ d: leg(p, [9.8, -14], [10.2 + 2.2 * b, -7.2], [10.6 + 4 * b, -0.4]), w: 2.1 * s });
  fig.farLimbs.push({ d: leg(p, [-8.8, -14.6], [-11.2 + 1.2 * a, -7.4], [-9.4 + 3.8 * a, -0.4]), w: 2.3 * s });
  }
  // Halter.
  fig.rope.push({ d: `M${h(20.6, -35)}L${h(24.6, -29.4)}M${h(23.2, -30.6)}L${h(26.9, -28.1)}`, w: 0.7 * s });
  if (pack && total >= 3) packOn(fig, p, s, pack);
  if (lead) {
    const [hx, hy] = lead;
    const [lx, ly] = droop ? turn(25.4, -25, 12.5, -24.5, droop) : [25.4, -25];
    const sx = X + lx * s;
    const sy = Y + ly * s;
    const sag = Math.max(2 * s, Math.abs(hx - sx) * 0.25);
    fig.rope.push({ d: `M${f(sx)} ${f(sy)}Q${f((sx + hx) / 2)} ${f(Math.max(sy, hy) + sag)} ${f(hx)} ${f(hy)}`, w: 0.7 * s });
  }
}

/**
 * The load on a pack saddle, near side: a pannier of sacks that fills with the flour, tea, shot
 * and shoes; a keg of salt meat slung below it; a blanket roll on top; axes, hatchets and the hoe
 * tied along the roll; the camp kettle hung at the front; a bundle of cut grass on the pile.
 */
function packOn(fig: Figure, p: Pt, s: number, pack: Pack) {
  const n = (k: string) => Math.max(0, pack.items[k] ?? 0);
  const sack = n('flour') + n('tea') + n('shots') * SHOT_LB + n('shoes') * SHOES_LB;
  const meat = n('saltMeat');
  const r = (v: number) => f(v * s);
  const cx = -0.4;
  // The pannier.
  let top = -26.4;
  let bot = -23.6;
  let hw = 5.6;
  const hasSack = sack >= 3;
  if (hasSack) {
    // The pannier swells with what is in it: a slack bag at a few pounds, as deep as the horse's
    // side at an easy load, piled high above the back past that.
    const k = Math.min(1.35, sack / 80);
    hw = 3.6 + 5.2 * Math.min(1, k);
    const hh = 3 + 11.5 * k;
    top = -25 - 0.5 * hh - Math.max(0, k - 1) * 4;
    bot = top + hh;
    const rr = Math.min(2.2, hh / 3);
    const bulge = 0.8 + 0.6 * Math.min(1, k);
    const L = cx - hw;
    const R = cx + hw;
    fig.paper.push({
      d:
        `M${p(L + rr, top)}L${p(R - rr, top)}Q${p(R, top)} ${p(R, top + rr)}C${p(R + bulge, top + hh * 0.35)} ${p(R + bulge, bot - hh * 0.3)} ${p(R, bot - rr)}` +
        `Q${p(R, bot)} ${p(R - rr, bot)}L${p(L + rr, bot)}Q${p(L, bot)} ${p(L, bot - rr)}C${p(L - bulge, bot - hh * 0.3)} ${p(L - bulge, top + hh * 0.35)} ${p(L, top + rr)}Q${p(L, top)} ${p(L + rr, top)}Z`,
      w: 0.85 * s,
    });
    // A diamond of lashings and a band round the middle.
    const mid = (top + bot) / 2;
    fig.rope.push({ d: `M${p(L + 0.9, top + 1.2)}L${p(R - 0.9, bot - 1.2)}M${p(R - 0.9, top + 1.2)}L${p(L + 0.9, bot - 1.2)}M${p(L - 0.4, mid)}L${p(R + 0.4, mid)}`, w: 0.55 * s });
    // The neck of a flour sack, tied off, standing up out of the pannier.
    if (n('flour') >= 15) {
      const x = R - 4.8;
      fig.back.push({
        d: `M${p(x, top + 0.6)}Q${p(x + 0.4, top - 0.6)} ${p(x + 1, top - 1.3)}Q${p(x - 0.2, top - 2.4)} ${p(x + 0.5, top - 3)}Q${p(x + 1.6, top - 3.6)} ${p(x + 2.8, top - 3)}Q${p(x + 3.6, top - 2.4)} ${p(x + 2.4, top - 1.3)}Q${p(x + 3, top - 0.6)} ${p(x + 3.4, top + 0.6)}Z`,
        w: 0.7 * s,
      });
      fig.rope.push({ d: `M${p(x + 0.8, top - 1.3)}L${p(x + 2.6, top - 1.3)}`, w: 0.6 * s });
    }
  } else {
    // A bare pack saddle: the pad, with whatever is tied to it.
    fig.back.push({ d: `M${p(-6, -26.6)}L${p(5, -26.6)}L${p(5.6, -24.2)}L${p(-6.6, -24.2)}Z`, w: 0.75 * s });
  }
  // Girth, breast strap and breeching.
  const strap = hasSack ? (top + bot) / 2 + 1.5 : -25;
  fig.rope.push({ d: `M${p(cx, bot)}L${p(cx, -12.3)}M${p(cx + hw, strap)}Q${p(11.6, strap + 1)} ${p(14.8, -19.2)}M${p(cx - hw, strap + 0.8)}Q${p(-12.6, -19.2)} ${p(-15.9, -19.8)}`, w: 0.75 * s });
  // The keg of salt meat, slung at the back of the pannier.
  let pileTop = top;
  if (meat >= 6) {
    const km = Math.min(1, meat / 70);
    const L = 5 + 3.5 * km;
    const D = 3.6 + 2.6 * km;
    const kx = hasSack ? cx - hw + L / 2 - 1.4 : cx - 1;
    const ky = hasSack ? bot - D / 2 + 1 : -25.6 - D / 2;
    const x0 = kx - L / 2;
    const x1 = kx + L / 2;
    const y0 = ky - D / 2;
    const y1 = ky + D / 2;
    fig.front.push({ d: `M${p(x0, y0 + 0.5)}Q${p(kx, y0 - 0.6)} ${p(x1, y0 + 0.5)}L${p(x1, y1 - 0.5)}Q${p(kx, y1 + 0.6)} ${p(x0, y1 - 0.5)}Z`, w: 0.75 * s });
    fig.rope.push({ d: `M${p(x0 + L * 0.22, y0 + 0.05)}L${p(x0 + L * 0.22, y1 - 0.05)}M${p(x1 - L * 0.22, y0 + 0.05)}L${p(x1 - L * 0.22, y1 - 0.05)}`, w: 0.5 * s });
    if (!hasSack) pileTop = y0;
  }
  // The blanket roll on top.
  const blankets = Math.min(6, n('blankets'));
  if (blankets >= 1) {
    const Lr = 7 + 1.5 * blankets;
    const Tr = 2.3 + 0.32 * blankets;
    const y = pileTop + 0.5 - Tr / 2;
    const x0 = cx - Lr / 2 + Tr / 2;
    const x1 = cx + Lr / 2 - Tr / 2;
    const rt = r(Tr / 2);
    fig.front.push({ d: `M${p(x0, y - Tr / 2)}L${p(x1, y - Tr / 2)}A${rt} ${rt} 0 0 1 ${p(x1, y + Tr / 2)}L${p(x0, y + Tr / 2)}A${rt} ${rt} 0 0 1 ${p(x0, y - Tr / 2)}Z`, w: 0.7 * s });
    // The rolled end, and two ties.
    fig.rope.push({ d: `M${p(x1, y - Tr / 2)}A${r(Tr * 0.28)} ${rt} 0 0 0 ${p(x1, y + Tr / 2)}M${p(x1 - 0.5, y - Tr * 0.12)}A${r(Tr * 0.12)} ${r(Tr * 0.16)} 0 1 0 ${p(x1 - 0.5, y + Tr * 0.18)}`, w: 0.45 * s });
    fig.rope.push({ d: `M${p(cx - Lr * 0.26, y - Tr / 2)}L${p(cx - Lr * 0.26, y + Tr / 2)}M${p(cx + Lr * 0.2, y - Tr / 2)}L${p(cx + Lr * 0.2, y + Tr / 2)}`, w: 0.55 * s });
    pileTop = y - Tr / 2;
  }
  // Tools tied along the top: felling axes with their heads behind, hatchets with theirs in front,
  // the hoe's blade hanging at the back.
  let ty = pileTop - 0.3;
  const handle = (x0: number, x1: number, rise: number) => {
    fig.rope.push({ d: `M${p(x0, ty)}L${p(x1, ty - rise)}`, w: 0.75 * s });
  };
  for (let i = 0; i < Math.min(3, n('axes')); i++) {
    handle(cx - 9.6, cx + 6.4, 1);
    fig.topInk.push(`M${p(cx - 9.4, ty - 0.3)}L${p(cx - 11.4, ty + 0.6)}L${p(cx - 11.1, ty + 2.1)}L${p(cx - 9.2, ty + 1)}Z`);
    ty -= 0.9;
  }
  for (let i = 0; i < Math.min(2, n('hatchets')); i++) {
    handle(cx - 3.6, cx + 6.8, 0.6);
    fig.topInk.push(`M${p(cx + 6.6, ty - 0.9)}L${p(cx + 8.2, ty - 1.3)}L${p(cx + 8.4, ty + 0.2)}L${p(cx + 6.8, ty + 0.2)}Z`);
    ty -= 0.8;
  }
  if (n('hoe') >= 1) {
    handle(cx - 10.8, cx + 8.8, 1.4);
    fig.topInk.push(`M${p(cx - 11.6, ty - 0.3)}L${p(cx - 9.8, ty - 0.1)}L${p(cx - 10, ty + 2.9)}L${p(cx - 11.8, ty + 2.7)}Z`);
    ty -= 0.9;
  }
  // Cut grass carried for a dry camp, a bundle on the pile.
  const grass = n('grass');
  if (grass >= 8) {
    const g = Math.min(1, grass / 40);
    const tufts: string[] = [];
    const w = 4 + 6 * g;
    for (let x = cx - w; x <= cx + w + 0.01; x += 1.1) tufts.push(`M${p(x, ty + 0.4)}L${p(x + 1.2 + 0.4 * Math.sin(x * 3.1), ty - 2.4 - 1.6 * g)}`);
    fig.rope.push({ d: tufts.join(''), w: 0.45 * s });
  }
  // The camp kettle, tin-bright, hung by its bail at the front corner of the load.
  if (n('campKit') >= 1) {
    const kx = hasSack ? cx + hw + 0.6 : 5.4;
    const ky = hasSack ? bot - 1.2 : -21.4;
    fig.rope.push({ d: `M${p(kx - 1.7, ky - 2.3)}Q${p(kx - 0.4, ky - 5)} ${p(kx + 1.7, ky - 2.3)}`, w: 0.55 * s });
    fig.front.push({
      d: `M${p(kx - 2.1, ky - 2.3)}L${p(kx + 2.1, ky - 2.3)}C${p(kx + 2.7, ky - 1.3)} ${p(kx + 2.5, ky + 0.7)} ${p(kx + 1.6, ky + 1.1)}L${p(kx - 1.6, ky + 1.1)}C${p(kx - 2.5, ky + 0.7)} ${p(kx - 2.7, ky - 1.3)} ${p(kx - 2.1, ky - 2.3)}Z`,
      w: 0.6 * s,
    });
    fig.rope.push({ d: `M${p(kx + 2.3, ky - 0.9)}L${p(kx + 3.7, ky - 2.4)}M${p(kx - 1.9, ky - 1.2)}L${p(kx + 1.9, ky - 1.2)}`, w: 0.55 * s });
  }
}

export type Tool = 'axe' | 'gun' | 'none';

/**
 * A man walking right, feet on y = 0, about 34 tall bareheaded. Leaders wear tall hats and
 * tailcoats; servants short jackets and low hats. Returns where his trailing hand is, for a lead rope.
 */
export function man(fig: Figure, X: number, Y: number, s: number, step: number, leader: boolean, tool: Tool, leading = false, swag = false): [number, number] {
  const p = at(X, Y, s);
  const a = Math.sin(step);
  if (swag) {
    // A pack on his back, tied round twice: the load a horse could not take down the pass.
    fig.paper.push({
      d: `M${p(-2.6, -28.6)}C${p(-5, -30)} ${p(-8, -29)} ${p(-8.3, -25.4)}L${p(-8.5, -21)}C${p(-8.5, -18.6)} ${p(-6.5, -17.8)} ${p(-4.4, -18)}L${p(-2.8, -18.4)}Z`,
      w: 0.8 * s,
    });
    fig.rope.push({ d: `M${p(-8.3, -25)}L${p(-2.7, -25.3)}M${p(-8.5, -21.4)}L${p(-2.8, -21.7)}`, w: 0.55 * s });
  }
  fig.ink.push(
    // Head and nose.
    `M${p(-2.15, -30.2)}a${f(2.55 * s)} ${f(2.55 * s)} 0 1 0 ${f(5.1 * s)} 0a${f(2.55 * s)} ${f(2.55 * s)} 0 1 0 ${f(-5.1 * s)} 0Z` +
      `M${p(2.6, -31)}L${p(3.7, -29.6)}L${p(2.7, -29.3)}Z` +
      `M${p(-0.9, -28.2)}L${p(1.3, -28.2)}L${p(1.4, -26.8)}L${p(-0.9, -26.8)}Z` +
      (leader
        ? // Tailcoat, the tails reaching the back of the knee, and a tall hat.
          `M${p(-3, -27.2)}C${p(-1, -27.9)} ${p(1.6, -27.9)} ${p(3.2, -27)}L${p(3.4, -21.5)}L${p(2.7, -17.6)}L${p(2.3, -16.3)}L${p(-0.6, -16.5)}L${p(-3.7, -11.4)}L${p(-4.7, -12)}L${p(-3.7, -18.2)}Z` +
          `M${p(-2.4, -32.2)}L${p(-2.1, -37.9)}C${p(-0.3, -38.5)} ${p(1.7, -38.5)} ${p(3.3, -37.9)}L${p(3.3, -32.2)}Z`
        : `M${p(-3, -27.2)}C${p(-1, -27.9)} ${p(1.6, -27.9)} ${p(3.1, -27)}L${p(3.3, -18.6)}L${p(2.7, -16)}L${p(-3, -16)}L${p(-3.5, -20)}Z` +
          `M${p(-2.8, -32)}C${p(-2.7, -35.2)} ${p(2.8, -35.4)} ${p(3.1, -32)}Z`),
  );
  // Hat brim.
  fig.limbs.push({ d: leader ? `M${p(-4.2, -32.3)}L${p(4.9, -32.3)}` : `M${p(-4.7, -32.1)}L${p(5.2, -32.1)}`, w: 1.15 * s });
  // Legs: near leg in ink, far leg a shade lighter. Shoes point forward.
  const hipY = -16.6;
  const front = (k: number): [number, number][] => [
    [0.6, hipY],
    [0.6 + 2.4 * k, -8.6],
    [1 + 4.3 * k, -1.1],
  ];
  const near = front(a);
  const far = front(-a);
  const legPath = (pts: [number, number][]) => `M${p(...pts[0]!)}L${p(...pts[1]!)}L${p(...pts[2]!)}M${p(pts[2]![0] - 0.7, -0.6)}L${p(pts[2]![0] + 2.5, -0.5)}`;
  fig.limbs.push({ d: legPath(near), w: 2.2 * s });
  fig.farLimbs.push({ d: legPath(far), w: 2.1 * s });
  // Arms and tools.
  let hand: [number, number];
  if (tool === 'axe') {
    // Axe on the shoulder, held by the haft in front; the head rides behind.
    fig.limbs.push({ d: `M${p(0.8, -26.2)}L${p(2.4, -23)}L${p(3.2, -21.4)}`, w: 1.7 * s });
    fig.limbs.push({ d: `M${p(3.6, -20.9)}L${p(-6, -32)}`, w: 0.95 * s });
    fig.ink.push(`M${p(-8.3, -33.6)}L${p(-4.6, -31.5)}L${p(-5.8, -29.7)}L${p(-8.9, -31.6)}Z`);
    hand = [X - 2 * s, Y - 18 * s];
  } else if (tool === 'gun') {
    // Musket at the slope: butt in the hand, barrel over the shoulder.
    fig.limbs.push({ d: `M${p(0.8, -26.2)}L${p(2.6, -22.6)}L${p(3.4, -20.6)}`, w: 1.7 * s });
    fig.limbs.push({ d: `M${p(4.2, -19.4)}L${p(2.4, -22.4)}`, w: 1.9 * s });
    fig.limbs.push({ d: `M${p(2.6, -22)}L${p(-6.4, -39.6)}`, w: 0.85 * s });
    hand = [X - 2 * s, Y - 18 * s];
  } else {
    fig.limbs.push({ d: `M${p(0.8, -26.2)}L${p(1.4 + 1.6 * a, -21.6)}L${p(2 + 3 * a, -17.4)}`, w: 1.7 * s });
    hand = [X + (2 + 3 * a) * s, Y - 17.4 * s];
  }
  if (leading) {
    // The trailing arm reaches back to the lead rope.
    fig.farLimbs.push({ d: `M${p(-0.6, -26)}L${p(-2.6, -21.8)}L${p(-4.8, -18.4)}`, w: 1.6 * s });
    hand = [X - 4.8 * s, Y - 18.4 * s];
  }
  return hand;
}

/** A kangaroo dog trotting right: lean, deep in the chest, long in the leg and tail. */
export function dog(fig: Figure, X: number, Y: number, s: number, step: number) {
  const p = at(X, Y, s);
  const a = Math.sin(step);
  fig.ink.push(
    `M${p(-8, -11.6)}C${p(-5, -13.4)} ${p(0, -13.2)} ${p(4, -12.8)}C${p(6, -12.6)} ${p(7.4, -13.2)} ${p(8.6, -14.6)}C${p(9.4, -15.8)} ${p(10.6, -16.4)} ${p(11.8, -16.2)}` +
      `L${p(15.6, -14.6)}L${p(15.4, -13.8)}L${p(11.6, -13.6)}C${p(10, -12.6)} ${p(8.6, -11)} ${p(7.6, -8.8)}C${p(7, -7.4)} ${p(5.6, -6.8)} ${p(4, -7)}` +
      `C${p(1, -7.6)} ${p(-2, -9.2)} ${p(-4, -9.4)}C${p(-6, -9.4)} ${p(-8, -9.6)} ${p(-8.8, -10.6)}Z` +
      `M${p(10.5, -16.2)}L${p(9.6, -18)}L${p(11.6, -16.7)}Z`,
  );
  fig.limbs.push({ d: `M${p(-8.4, -11.2)}C${p(-11.5, -11)} ${p(-13.6, -9)} ${p(-14.8, -5.6)}`, w: 1.05 * s });
  fig.limbs.push({ d: leg(p, [5, -7.6], [5.3 + 1.4 * a, -3.8], [5.6 + 2.8 * a, -0.3]), w: 1.25 * s });
  fig.limbs.push({ d: leg(p, [-6.4, -10], [-8.6 - 0.8 * a, -5], [-7.2 - 2.6 * a, -0.3]), w: 1.35 * s });
  fig.farLimbs.push({ d: leg(p, [3.8, -7.6], [4.1 - 1.4 * a, -3.8], [4.4 - 2.8 * a, -0.3]), w: 1.15 * s });
  fig.farLimbs.push({ d: leg(p, [-5.4, -10], [-7.6 + 0.8 * a, -5], [-6.2 + 2.6 * a, -0.3]), w: 1.25 * s });
}

// ---------------------------------------------------------------- the procession

export interface PartyCounts {
  /** Leaders first (always three), then servants. */
  servants: number;
  horses: number;
  dogs: number;
}

/** Who a figure is: a man by his place in the party, a horse by its number from 1, or a dog. */
export type FigureWho = { kind: 'man'; id: MemberId } | { kind: 'horse'; id: number } | { kind: 'dog' };

/** Where a figure stands in the scene, for pointing at it. */
export interface Slot {
  who: FigureWho;
  x: number;
  y: number;
  w: number;
  h: number;
}

type Unit = { kind: 'man'; id: MemberId; leader: boolean; tool: Tool; leading: boolean } | { kind: 'horse'; id: number } | { kind: 'dog' };

const WIDTH = { man: 11, horse: 48, dog: 25 };
const GAP = { man: 4, horse: 3, dog: 3 };
/** How tall each figure stands, at scale 1, for its slot. */
const TALL = { man: 41, horse: 46, dog: 20 };

const LEADER_IDS: MemberId[] = ['blaxland', 'lawson', 'wentworth'];
const SERVANT_IDS: MemberId[] = ['burne', 'fairs', 'servant3', 'servant4', 'servant5', 'servant6'];

/**
 * Who walks where, front first: a dog out ahead, the guide, then each horse led by a man. `omit`
 * leaves those men out, for a plate that draws them elsewhere in the scene. `horsesLast` puts the
 * men on foot and the dogs in front and every horse, with the man leading it, at the back.
 */
function order(c: PartyCounts, seed: number, omit: readonly MemberId[] = [], horsesLast = false): Unit[] {
  const r = rng(seed);
  const men: { id: MemberId; leader: boolean; tool: Tool }[] = [];
  // Burne, the guide and hunter, goes first with a gun when he comes; then leaders and servants
  // take turns, the servants with axes.
  const servants = Array.from({ length: Math.min(c.servants, SERVANT_IDS.length) }, (_, i) => ({ id: SERVANT_IDS[i]!, leader: false, tool: (i === 0 ? 'gun' : 'axe') as Tool })).filter((u) => !omit.includes(u.id));
  const leaders = LEADER_IDS.filter((id) => !omit.includes(id)).map((id) => ({ id, leader: true, tool: 'gun' as Tool }));
  if (servants.length) men.push(servants.shift()!);
  while (leaders.length || servants.length) {
    if (leaders.length) men.push(leaders.shift()!);
    if (servants.length) men.push(servants.shift()!);
  }
  const units: Unit[] = [];
  let dogs = c.dogs;
  if (dogs > 0) {
    units.push({ kind: 'dog' });
    dogs--;
  }
  let m = 0;
  if (men.length) units.push({ kind: 'man', ...men[m++]!, leading: false });
  for (let h = 0; h < c.horses; h++) {
    if (m < men.length) {
      const who = men[m++]!;
      units.push({ kind: 'man', ...who, leading: true, tool: who.leader ? 'none' : who.tool });
    }
    units.push({ kind: 'horse', id: h + 1 });
    if (dogs > 0 && r() < 0.45) {
      units.push({ kind: 'dog' });
      dogs--;
    }
  }
  while (m < men.length) {
    units.push({ kind: 'man', ...men[m++]!, leading: false });
    if (dogs > 0 && r() < 0.5) {
      units.push({ kind: 'dog' });
      dogs--;
    }
  }
  // Any dogs left run alongside, slotted in between.
  while (dogs > 0) {
    const at = 1 + Math.floor(r() * (units.length - 1));
    if (units[at]?.kind === 'dog' || units[at - 1]?.kind === 'dog') {
      units.push({ kind: 'dog' });
    } else units.splice(at, 0, { kind: 'dog' });
    dogs--;
  }
  if (!horsesLast) return units;
  const front: Unit[] = [];
  const back: Unit[] = [];
  for (let i = 0; i < units.length; i++) {
    const u = units[i]!;
    if (u.kind === 'horse') back.push(u);
    else if (u.kind === 'man' && u.leading) {
      // The man and the horse he leads go back together; a dog that ran in between goes forward.
      let j = i + 1;
      while (units[j]?.kind === 'dog') front.push(units[j++]!);
      back.push(u);
      if (units[j]?.kind === 'horse') back.push(units[j]!);
      else j--;
      i = j;
    } else front.push(u);
  }
  return [...front, ...back];
}

/** Length of the procession at scale 1. */
function span(units: Unit[]): number {
  return units.reduce((sum, u) => sum + WIDTH[u.kind] + GAP[u.kind], 0);
}

/**
 * Lay the party out along `ground`, heading right, centred in [from, to], no larger than `maxScale`.
 * `loads` is what each horse carries, first horse first; `omit` leaves out men the plate draws
 * elsewhere (a leader at the brink, two standing over a blaze). Returns the figure, the scale used
 * and where each figure stands.
 */
export function procession(
  c: PartyCounts,
  ground: Curve,
  o: { from: number; to: number; maxScale: number; seed: number; phase?: number; loads?: Pack[]; swags?: boolean; omit?: readonly MemberId[]; horsesLast?: boolean },
): { fig: Figure; scale: number; slots: Slot[] } {
  const units = order(c, o.seed, o.omit, o.horsesLast);
  const len = span(units);
  const s = Math.min(o.maxScale, (o.to - o.from) / len);
  const fig = emptyFigure();
  const slots: Slot[] = [];
  // Walk from the front (right) to the back.
  let x = (o.from + o.to) / 2 + (len * s) / 2;
  let step = o.phase ?? 0.6;
  let lastHand: [number, number] | null = null;
  for (let i = 0; i < units.length; i++) {
    const u = units[i]!;
    const w = WIDTH[u.kind] * s;
    // Each figure's origin, from its right-hand extent.
    const right = u.kind === 'horse' ? 28 : u.kind === 'dog' ? 15.6 : 5;
    const ox = x - right * s;
    const y = yAt(ground, ox);
    step += 1.7;
    if (u.kind === 'man') lastHand = man(fig, ox, y, s, step, u.leader, u.tool, u.leading, o.swags);
    else if (u.kind === 'dog') dog(fig, ox, y, s, step * 1.6);
    else {
      const prev = units[i - 1];
      horse(fig, ox, y, s, step, prev?.kind === 'man' && prev.leading ? lastHand : null, o.loads ? (o.loads[u.id - 1] ?? null) : PLAIN_PACK);
    }
    const who: FigureWho = u.kind === 'man' ? { kind: 'man', id: u.id } : u.kind === 'horse' ? { kind: 'horse', id: u.id } : { kind: 'dog' };
    slots.push({ who, x: x - w, y: y - TALL[u.kind] * s, w, h: (TALL[u.kind] + 1.5) * s });
    if (u.kind !== 'man') lastHand = null;
    x -= w + GAP[u.kind] * s;
  }
  return { fig, scale: s, slots };
}

/**
 * The marks for a figure, in drawing order: far limbs, bodies, near limbs, loads, ropes. `legs`
 * overrides the classes of the near and far limbs, for a horse whose legs are darker or lighter
 * than its body, and of the ink lying on its load (`top`), which stays ink whatever the coat.
 */
export function figureMarks(fig: Figure, tone = 'f4', legs?: { near: string; far: string; top?: string }): Mark[] {
  const out: Mark[] = [];
  const join = (xs: { d: string; w: number }[], c: string) => {
    // Group by width so each stroke width is one path.
    const byW = new Map<number, string[]>();
    for (const x of xs) byW.set(Math.round(x.w * 100) / 100, [...(byW.get(Math.round(x.w * 100) / 100) ?? []), x.d]);
    for (const [w, ds] of byW) out.push({ d: ds.join(''), c, w });
  };
  join(fig.farLimbs, legs?.far ?? 'l3');
  out.push({ d: fig.ink.join(''), c: tone });
  join(fig.limbs, legs?.near ?? (tone === 'f4' ? 'l4' : 'l3'));
  join(fig.back, 'pk');
  join(fig.paper, 'pk');
  join(fig.front, 'pk');
  if (fig.topInk.length) out.push({ d: fig.topInk.join(''), c: legs?.top ?? tone });
  join(fig.rope, 'l4');
  return out;
}

// ---------------------------------------------------------------- still figures, for the cards

/** Like `at`, but able to face left: x runs the other way when dir is -1. */
const atD = (X: number, Y: number, s: number, dir: 1 | -1): Pt => (x, y) => `${f(X + dir * x * s)} ${f(Y + y * s)}`;

/** A filled circle through a point mapper. */
function disc(p: Pt, s: number, cx: number, cy: number, r: number): string {
  const R = f(r * s);
  return `M${p(cx - r, cy)}A${R} ${R} 0 1 0 ${p(cx + r, cy)}A${R} ${R} 0 1 0 ${p(cx - r, cy)}Z`;
}

/** Rotate about (px, py) by `a` radians, clockwise on screen when facing right. */
function rot(px: number, py: number, a: number) {
  return (x: number, y: number): [number, number] => turn(x, y, px, py, a);
}

/** Head, nose, neck, coat and hat of a man standing upright, as in `man`. */
function upperBody(p: Pt, s: number, leader: boolean): { ink: string; brim: { d: string; w: number } } {
  return {
    ink:
      disc(p, s, 0.4, -30.2, 2.55) +
      `M${p(2.6, -31)}L${p(3.7, -29.6)}L${p(2.7, -29.3)}Z` +
      `M${p(-0.9, -28.2)}L${p(1.3, -28.2)}L${p(1.4, -26.8)}L${p(-0.9, -26.8)}Z` +
      (leader
        ? `M${p(-3, -27.2)}C${p(-1, -27.9)} ${p(1.6, -27.9)} ${p(3.2, -27)}L${p(3.4, -21.5)}L${p(2.7, -17.6)}L${p(2.3, -16.3)}L${p(-0.6, -16.5)}L${p(-3.7, -11.4)}L${p(-4.7, -12)}L${p(-3.7, -18.2)}Z` +
          `M${p(-2.4, -32.2)}L${p(-2.1, -37.9)}C${p(-0.3, -38.5)} ${p(1.7, -38.5)} ${p(3.3, -37.9)}L${p(3.3, -32.2)}Z`
        : `M${p(-3, -27.2)}C${p(-1, -27.9)} ${p(1.6, -27.9)} ${p(3.1, -27)}L${p(3.3, -18.6)}L${p(2.7, -16)}L${p(-3, -16)}L${p(-3.5, -20)}Z` +
          `M${p(-2.8, -32)}C${p(-2.7, -35.2)} ${p(2.8, -35.4)} ${p(3.1, -32)}Z`),
    brim: { d: leader ? `M${p(-4.2, -32.3)}L${p(4.9, -32.3)}` : `M${p(-4.7, -32.1)}L${p(5.2, -32.1)}`, w: 1.15 * s },
  };
}

export type Arms = 'down' | 'call' | 'kettle' | 'point' | 'folded' | 'stone' | 'gun' | 'gunRest' | 'axe' | 'haul' | 'notes';

/**
 * A man standing still, feet on y = 0, facing right (or left with dir -1): the figure `man` draws,
 * legs planted, arms set for what he is doing. `lean` tips him forward from the hips (radians).
 */
export function standing(fig: Figure, X: number, Y: number, s: number, o: { leader: boolean; dir?: 1 | -1; arms?: Arms; lean?: number }) {
  const p0 = atD(X, Y, s, o.dir ?? 1);
  const r = rot(0.5, -16.6, o.lean ?? 0);
  const p: Pt = o.lean ? (x, y) => p0(...r(x, y)) : p0;
  const up = upperBody(p, s, o.leader);
  fig.ink.push(up.ink);
  fig.limbs.push(up.brim);
  fig.limbs.push({ d: `M${p0(0.9, -16.6)}L${p0(1.2, -8.6)}L${p0(1.6, -1.1)}M${p0(0.9, -0.6)}L${p0(4.1, -0.5)}`, w: 2.2 * s });
  fig.farLimbs.push({ d: `M${p0(-0.4, -16.6)}L${p0(-0.6, -8.6)}L${p0(-0.9, -1.1)}M${p0(-1.6, -0.6)}L${p0(1.6, -0.5)}`, w: 2.1 * s });
  switch (o.arms ?? 'down') {
    case 'down':
      fig.limbs.push({ d: `M${p(0.8, -26.2)}L${p(1.3, -21.6)}L${p(1.7, -17.2)}`, w: 1.7 * s });
      break;
    case 'call':
      // Both hands cupped at the mouth.
      fig.limbs.push({ d: `M${p(0.8, -26.2)}L${p(4.4, -24.2)}L${p(4.3, -28.6)}`, w: 1.6 * s });
      fig.farLimbs.push({ d: `M${p(-0.4, -26.2)}L${p(3.4, -24.8)}L${p(3.6, -28.8)}`, w: 1.5 * s });
      break;
    case 'kettle': {
      fig.limbs.push({ d: `M${p(0.8, -26.2)}L${p(1.8, -21.8)}L${p(2.6, -17.6)}`, w: 1.7 * s });
      fig.front.push({ d: `M${p(0.7, -14.6)}L${p(5.3, -14.6)}C${p(5.9, -13.4)} ${p(5.7, -11.4)} ${p(4.8, -11)}L${p(1.2, -11)}C${p(0.3, -11.4)} ${p(0.1, -13.4)} ${p(0.7, -14.6)}Z`, w: 0.55 * s });
      fig.rope.push({ d: `M${p(0.9, -14.6)}Q${p(2.4, -18.6)} ${p(5.1, -14.6)}`, w: 0.5 * s });
      break;
    }
    case 'point':
      fig.limbs.push({ d: `M${p(0.8, -26.2)}L${p(5.4, -25.6)}L${p(10.2, -27)}`, w: 1.6 * s });
      break;
    case 'folded':
      fig.limbs.push({ d: `M${p(0.8, -26.2)}L${p(3, -22.6)}L${p(-1.4, -21.6)}`, w: 1.8 * s });
      break;
    case 'stone':
      fig.limbs.push({ d: `M${p(0.8, -26.2)}L${p(3.2, -22.2)}L${p(5.6, -19.8)}`, w: 1.7 * s });
      fig.farLimbs.push({ d: `M${p(-0.4, -26)}L${p(2.4, -22)}L${p(4.8, -20.2)}`, w: 1.6 * s });
      fig.front.push({ d: `M${p(3.2, -19.4)}C${p(3.4, -22)} ${p(8.4, -22.4)} ${p(9, -19.6)}C${p(9.4, -17.4)} ${p(3.4, -16.8)} ${p(3.2, -19.4)}Z`, w: 0.6 * s });
      break;
    case 'gun':
      fig.limbs.push({ d: `M${p(0.8, -26.2)}L${p(2.6, -22.6)}L${p(3.4, -20.6)}`, w: 1.7 * s });
      fig.limbs.push({ d: `M${p(4.2, -19.4)}L${p(2.4, -22.4)}`, w: 1.9 * s });
      fig.limbs.push({ d: `M${p(2.6, -22)}L${p(-6.4, -39.6)}`, w: 0.85 * s });
      break;
    case 'gunRest':
      // Musket upright, butt on the ground, held at the muzzle.
      fig.limbs.push({ d: `M${p(0.8, -26.2)}L${p(3.2, -23.4)}L${p(5.2, -24.6)}`, w: 1.6 * s });
      fig.limbs.push({ d: `M${p0(5.6, -0.4)}L${p0(5.5, -31)}`, w: 0.8 * s });
      fig.limbs.push({ d: `M${p0(5.6, -0.6)}L${p0(5.6, -5.6)}`, w: 1.8 * s });
      break;
    case 'axe':
      fig.limbs.push({ d: `M${p(0.8, -26.2)}L${p(2.4, -23)}L${p(3.2, -21.4)}`, w: 1.7 * s });
      fig.limbs.push({ d: `M${p(3.6, -20.9)}L${p(-6, -32)}`, w: 0.95 * s });
      fig.ink.push(`M${p(-8.3, -33.6)}L${p(-4.6, -31.5)}L${p(-5.8, -29.7)}L${p(-8.9, -31.6)}Z`);
      break;
    case 'notes': {
      // A surveyor taking a bearing: a pocket compass held out level in the far hand, the field
      // book open in the near hand at his waist.
      fig.farLimbs.push({ d: `M${p(-0.4, -26)}L${p(2.8, -22.6)}L${p(7.4, -23)}`, w: 1.5 * s });
      fig.front.push({ d: disc(p, s, 9.2, -23.6, 1.6), w: 0.5 * s });
      fig.rope.push({ d: `M${p(8.2, -24.2)}L${p(10.2, -23)}`, w: 0.35 * s });
      fig.limbs.push({ d: `M${p(0.8, -26.2)}L${p(1.8, -21.4)}L${p(4.2, -19.4)}`, w: 1.7 * s });
      fig.front.push({ d: `M${p(3.2, -21.4)}L${p(7.8, -22.2)}L${p(8.1, -18.6)}L${p(3.5, -17.8)}Z`, w: 0.5 * s });
      fig.rope.push({ d: `M${p(5.6, -21.8)}L${p(5.8, -18.2)}M${p(4, -20.4)}L${p(5.1, -20.6)}M${p(4.1, -19.4)}L${p(5.1, -19.6)}M${p(6.3, -20.9)}L${p(7.4, -21.1)}M${p(6.4, -19.9)}L${p(7.5, -20.1)}`, w: 0.3 * s });
      break;
    }
    case 'haul':
      // Both arms out in front at the height of a halter rope.
      fig.limbs.push({ d: `M${p(0.8, -26.2)}L${p(4.8, -24.2)}L${p(8.8, -23.2)}`, w: 1.6 * s });
      fig.farLimbs.push({ d: `M${p(-0.4, -26)}L${p(3.8, -23.6)}L${p(7.8, -22.8)}`, w: 1.5 * s });
      break;
  }
}

/**
 * A man sitting on the ground with his knees up, facing right (or left with dir -1). `arms`: hugging
 * his knees, holding his hands to a fire, folded on his knees, or his head in his hands. A blanket
 * wraps him, hooded, leaving the face and feet out.
 */
export function sitting(fig: Figure, X: number, Y: number, s: number, o: { leader: boolean; dir?: 1 | -1; arms?: 'knees' | 'fire' | 'folded' | 'head'; blanket?: boolean; hunch?: number }) {
  const p = atD(X, Y, s, o.dir ?? 1);
  const hunch = o.hunch ?? 0.6;
  const H = [0, -2.2] as const;
  const S = [1.2 + 2.2 * hunch, -12.6 + 1.2 * hunch] as const;
  const head = o.arms === 'head' ? ([S[0] + 2.6, S[1] - 2.4] as const) : ([S[0] + 1, S[1] - 3.7] as const);
  const K = [6.8, -9.6] as const;
  const A = [9.6, -1] as const;
  // Legs: thigh up to the knee, shin down to the foot.
  fig.farLimbs.push({ d: `M${p(H[0] + 0.2, H[1] - 0.4)}L${p(K[0] - 0.8, K[1] + 1)}L${p(A[0] + 0.3, A[1])}M${p(A[0] - 0.4, -0.6)}L${p(A[0] + 2.6, -0.5)}`, w: 2.3 * s });
  fig.limbs.push({ d: `M${p(H[0] + 0.8, H[1] - 0.6)}L${p(K[0], K[1])}L${p(A[0], A[1])}M${p(A[0] - 0.6, -0.6)}L${p(A[0] + 2.8, -0.5)}`, w: 2.5 * s });
  // Body: a coat from the shoulders down to the seat; a leader's tails lie on the ground behind.
  const coat = o.leader
    ? `M${p(S[0] - 3, S[1] - 0.4)}C${p(S[0] - 1, S[1] - 1.1)} ${p(S[0] + 1.6, S[1] - 1)} ${p(S[0] + 3.2, S[1] + 0.2)}L${p(H[0] + 3.4, H[1] - 0.6)}L${p(H[0] + 1, H[1] + 1.6)}L${p(H[0] - 6.2, -0.1)}L${p(H[0] - 6, -1.2)}L${p(H[0] - 3.4, H[1] - 0.6)}Z`
    : `M${p(S[0] - 3, S[1] - 0.4)}C${p(S[0] - 1, S[1] - 1.1)} ${p(S[0] + 1.6, S[1] - 1)} ${p(S[0] + 3.1, S[1] + 0.2)}L${p(H[0] + 3.2, H[1] - 0.4)}L${p(H[0] + 2, H[1] + 1.8)}L${p(H[0] - 3, H[1] + 1.8)}L${p(H[0] - 3.6, H[1] - 0.6)}Z`;
  const neck = `M${p(S[0] - 1.1, S[1] - 1)}L${p(head[0] - 0.6, head[1] + 2.2)}L${p(head[0] + 1, head[1] + 2.4)}L${p(S[0] + 1.3, S[1] - 0.8)}Z`;
  const face = disc(p, s, head[0], head[1], 2.55) + `M${p(head[0] + 2.2, head[1] - 0.8)}L${p(head[0] + 3.3, head[1] + 0.6)}L${p(head[0] + 2.3, head[1] + 0.9)}Z`;
  const hat = o.leader
    ? `M${p(head[0] - 2.8, head[1] - 2)}L${p(head[0] - 2.5, head[1] - 7.7)}C${p(head[0] - 0.7, head[1] - 8.3)} ${p(head[0] + 1.3, head[1] - 8.3)} ${p(head[0] + 2.9, head[1] - 7.7)}L${p(head[0] + 2.9, head[1] - 2)}Z`
    : `M${p(head[0] - 3.2, head[1] - 1.8)}C${p(head[0] - 3.1, head[1] - 5)} ${p(head[0] + 2.4, head[1] - 5.2)} ${p(head[0] + 2.7, head[1] - 1.8)}Z`;
  const brim = o.leader ? `M${p(head[0] - 4.6, head[1] - 2.1)}L${p(head[0] + 4.5, head[1] - 2.1)}` : `M${p(head[0] - 5.1, head[1] - 1.9)}L${p(head[0] + 4.8, head[1] - 1.9)}`;
  if (o.blanket) {
    // The body under the blanket; the face shows at the front of the hood.
    fig.ink.push(coat + neck);
    fig.paper.push({
      d:
        `M${p(head[0] + 1.4, head[1] - 3.2)}C${p(head[0] - 1.6, head[1] - 4.2)} ${p(head[0] - 4.6, head[1] - 2.4)} ${p(head[0] - 4.2, head[1] + 1.6)}` +
        `C${p(head[0] - 5.4, head[1] + 6)} ${p(H[0] - 6, -5)} ${p(H[0] - 6.4, 0)}L${p(K[0] + 2.2, 0)}C${p(K[0] + 2.6, -4)} ${p(K[0] + 2.4, K[1] - 0.4)} ${p(K[0] + 0.6, K[1] - 1.8)}` +
        `C${p(K[0] - 1.6, K[1] - 2.6)} ${p(head[0] + 2.6, head[1] + 4.2)} ${p(head[0] + 1.2, head[1] + 2.6)}C${p(head[0] - 0.2, head[1] + 1.2)} ${p(head[0] - 0.2, head[1] - 1.6)} ${p(head[0] + 1.4, head[1] - 3.2)}Z`,
      w: 0.6 * s,
    });
    fig.rope.push({ d: `M${p(head[0] - 2.6, head[1] + 3.6)}Q${p(H[0] - 2.6, -6)} ${p(H[0] - 3.4, -0.8)}M${p(head[0] + 0.6, head[1] + 5.4)}Q${p(2.6, -5)} ${p(2.4, -0.6)}M${p(K[0] - 1.6, K[1] + 0.2)}Q${p(K[0] + 0.6, -4)} ${p(K[0] - 0.4, -0.6)}`, w: 0.35 * s });
    fig.topInk.push(face);
    return;
  }
  fig.ink.push(coat + neck + face + hat);
  fig.limbs.push({ d: brim, w: 1.1 * s });
  const sh = [S[0] + 0.6, S[1] + 0.4] as const;
  switch (o.arms ?? 'knees') {
    case 'knees':
      fig.limbs.push({ d: `M${p(...sh)}L${p(S[0] + 2.6, S[1] + 5.4)}L${p(K[0] - 0.2, K[1] - 0.2)}`, w: 1.7 * s });
      break;
    case 'fire':
      fig.limbs.push({ d: `M${p(...sh)}L${p(S[0] + 4.2, S[1] + 3.2)}L${p(K[0] + 4.6, K[1] + 1.6)}`, w: 1.6 * s });
      fig.farLimbs.push({ d: `M${p(sh[0] - 0.8, sh[1])}L${p(S[0] + 3.4, S[1] + 3.6)}L${p(K[0] + 3.8, K[1] + 2)}`, w: 1.5 * s });
      break;
    case 'folded':
      fig.limbs.push({ d: `M${p(...sh)}L${p(S[0] + 1.8, S[1] + 4.8)}L${p(K[0] + 0.8, K[1] - 0.4)}`, w: 1.8 * s });
      fig.limbs.push({ d: `M${p(K[0] - 2.6, K[1] - 0.6)}L${p(K[0] + 1.2, K[1] - 0.4)}`, w: 1.6 * s });
      break;
    case 'head':
      // Elbows on the knees, chin in the hands.
      fig.limbs.push({ d: `M${p(...sh)}L${p(K[0] - 0.2, K[1] - 0.8)}L${p(head[0] + 1.2, head[1] + 2.6)}`, w: 1.7 * s });
      break;
  }
}

/** A man lying on his back under a blanket, head on a rolled pack at x = 0, feet toward +x (or -x). */
export function lying(fig: Figure, X: number, Y: number, s: number, o: { dir?: 1 | -1; leader?: boolean } = {}) {
  const p = atD(X, Y, s, o.dir ?? 1);
  // The pillow, the head on it, nose up.
  fig.back.push({ d: `M${p(-4.4, -3.4)}L${p(2.4, -3.4)}Q${p(3.6, -1.7)} ${p(2.4, 0)}L${p(-4.4, 0)}Q${p(-5.6, -1.7)} ${p(-4.4, -3.4)}Z`, w: 0.5 * s });
  fig.topInk.push(disc(p, s, 0.2, -5.6, 2.5) + `M${p(-0.6, -7.8)}L${p(0.4, -9.2)}L${p(1, -7.9)}Z`);
  // Under the blanket: shoulders, chest, knees drawn up a little, feet.
  fig.paper.push({
    d: `M${p(2.4, -2.6)}C${p(3, -5.6)} ${p(4.6, -6.8)} ${p(7, -6.8)}C${p(11, -6.6)} ${p(15, -6)} ${p(18.4, -6.4)}C${p(21, -7.8)} ${p(23.4, -7.8)} ${p(25, -5.8)}C${p(26.6, -4.2)} ${p(28.2, -2.6)} ${p(29.4, 0)}L${p(2.2, 0)}Z`,
    w: 0.6 * s,
  });
  fig.rope.push({ d: `M${p(9, -6.4)}Q${p(10.2, -3.4)} ${p(9.4, -0.4)}M${p(19.6, -6.8)}Q${p(18.6, -3.4)} ${p(19.6, -0.4)}M${p(5, -5.2)}Q${p(13, -3.6)} ${p(24, -4.6)}`, w: 0.35 * s });
  // Boots out from under the end.
  fig.topInk.push(`M${p(28.6, -3.2)}L${p(31, -4.4)}L${p(31.8, -2.6)}L${p(30.6, -0.2)}L${p(28.8, 0)}Z`);
}

/**
 * A horse down on the track: fallen onto its knees and side, legs folded under, head up as it
 * struggles. Facing right (or left with dir -1), on y = 0.
 */
export function horseDown(fig: Figure, X: number, Y: number, s: number, o: { dir?: 1 | -1 } = {}) {
  const p0 = atD(X, Y, s, o.dir ?? 1);
  // The standing horse's outline, tipped forward and lowered until the belly touches the ground.
  const body = rot(0, -12, (7 * Math.PI) / 180);
  const head = rot(12.5, -24.5, (-14 * Math.PI) / 180);
  const P: Pt = (x, y) => {
    const [bx, by] = body(x, y);
    return p0(bx, by + 10.2);
  };
  const Hd: Pt = (x, y) => P(...head(x, y));
  fig.ink.push(
    `M${P(-15.5, -23.8)}C${P(-13, -25.6)} ${P(-9, -25.4)} ${P(-6, -24.9)}C${P(-2, -24.3)} ${P(2, -24.6)} ${P(5, -25.4)}C${P(7, -26)} ${P(8.5, -26.6)} ${P(10, -27.4)}` +
      `C${Hd(13, -30)} ${Hd(16, -33.5)} ${Hd(18.6, -36)}L${Hd(18.5, -39.6)}L${Hd(19.9, -36.7)}C${Hd(20.7, -36.3)} ${Hd(21.4, -35.8)} ${Hd(22, -35)}` +
      `C${Hd(24, -32)} ${Hd(26.4, -28.6)} ${Hd(27.8, -26.4)}C${Hd(28.4, -25.4)} ${Hd(27.9, -24.4)} ${Hd(26.6, -24.5)}C${Hd(25.2, -24.6)} ${Hd(24, -25.4)} ${Hd(23.2, -26.4)}` +
      `C${Hd(22.2, -27.6)} ${Hd(21, -28.6)} ${Hd(20.2, -28.6)}C${Hd(18.8, -27.2)} ${Hd(16.6, -24.2)} ${P(15.4, -21.4)}C${P(14.8, -19.6)} ${P(14.4, -17)} ${P(13.4, -15.2)}` +
      `C${P(12, -13.2)} ${P(9, -12.4)} ${P(6, -12.4)}C${P(1, -12)} ${P(-4, -12.2)} ${P(-7.5, -12.8)}C${P(-9.5, -13.2)} ${P(-11, -14.2)} ${P(-12.2, -15.6)}` +
      `C${P(-14.6, -17.5)} ${P(-16.4, -20.4)} ${P(-15.5, -23.8)}Z` +
      `M${P(-15.2, -23.4)}C${P(-18.6, -22.6)} ${P(-21, -20)} ${P(-23.4, -17.6)}C${P(-21.6, -19.4)} ${P(-19.6, -20.4)} ${P(-17.4, -20.8)}C${P(-16.6, -21.6)} ${P(-15.8, -22.2)} ${P(-15, -22)}Z`,
  );
  // Forelegs buckled at the knee, one reaching out to rise; hind legs folded under the belly.
  fig.limbs.push({ d: `M${P(11.4, -14)}L${p0(15.6, -4.4)}L${p0(19.6, -0.6)}`, w: 2.3 * s });
  fig.farLimbs.push({ d: `M${P(9.8, -14)}L${p0(9.6, -2.6)}L${p0(14.4, -0.5)}`, w: 2.1 * s });
  fig.limbs.push({ d: `M${P(-10.4, -14.6)}L${p0(-4.6, -1.8)}L${p0(-11.6, -0.5)}`, w: 2.5 * s });
  fig.farLimbs.push({ d: `M${P(-8.8, -14.6)}L${p0(-2.8, -1.4)}L${p0(-8.4, -0.4)}`, w: 2.3 * s });
  fig.rope.push({ d: `M${Hd(20.6, -35)}L${Hd(24.6, -29.4)}M${Hd(23.2, -30.6)}L${Hd(26.9, -28.1)}`, w: 0.7 * s });
}

/** A kangaroo dog at full stretch, running right (or left): no foot on the ground. */
export function dogRunning(fig: Figure, X: number, Y: number, s: number, o: { dir?: 1 | -1; phase?: number } = {}) {
  const p = atD(X, Y, s, o.dir ?? 1);
  const k = o.phase ?? 0;
  fig.ink.push(
    `M${p(-8.4, -11.4)}C${p(-4.6, -13.4)} ${p(0.6, -13.4)} ${p(4.6, -12.8)}C${p(7, -12.6)} ${p(9, -12.6)} ${p(10.8, -13.6)}` +
      `L${p(12.6, -14.6)}L${p(17.2, -12.8)}L${p(16.8, -11.8)}L${p(12.4, -11.4)}C${p(10.6, -10.8)} ${p(8.8, -9.8)} ${p(7.4, -8.8)}` +
      `C${p(6, -7.8)} ${p(3.8, -7.8)} ${p(1.8, -8.4)}C${p(-1.2, -9.4)} ${p(-4.4, -9.8)} ${p(-6.2, -9.8)}C${p(-7.8, -9.8)} ${p(-9, -10.4)} ${p(-8.4, -11.4)}Z` +
      `M${p(11.4, -14.2)}L${p(9.4, -15.4)}L${p(12.2, -14.8)}Z`,
  );
  fig.limbs.push({ d: `M${p(-8.4, -11.2)}C${p(-11.6, -11.8)} ${p(-14.4, -12.2)} ${p(-17.4, -13.4)}`, w: 1.05 * s });
  // Forelegs reaching out together, hind legs thrown back.
  fig.limbs.push({ d: `M${p(6, -8.6)}L${p(9.6 + k, -5.6)}L${p(14 + k, -4.4)}`, w: 1.25 * s });
  fig.farLimbs.push({ d: `M${p(5, -8.4)}L${p(8.4 + k, -4.8)}L${p(12 + k, -2.8)}`, w: 1.15 * s });
  fig.limbs.push({ d: `M${p(-6, -9.8)}L${p(-9.2, -6.4)}L${p(-13.8 - k, -4.4)}`, w: 1.35 * s });
  fig.farLimbs.push({ d: `M${p(-5, -9.6)}L${p(-7.6, -5.4)}L${p(-11.8 - k, -2.4)}`, w: 1.25 * s });
}

/**
 * A kangaroo, facing right (or left), feet on y = 0. 'hop': in mid-bound, body tipped forward, the
 * long feet thrown back and the tail out straight behind. 'stand': upright on its tail.
 */
export function kangaroo(fig: Figure, X: number, Y: number, s: number, o: { dir?: 1 | -1; pose?: 'hop' | 'stand' } = {}) {
  const p = atD(X, Y, s, o.dir ?? 1);
  if ((o.pose ?? 'hop') === 'hop') {
    fig.ink.push(
      // Body, rising from the rump to the shoulders, small head forward, ears up.
      `M${p(-7, -10.6)}C${p(-7.4, -15.6)} ${p(-3, -20.6)} ${p(3, -22.6)}C${p(6, -23.6)} ${p(8.6, -24.6)} ${p(10.4, -26.4)}` +
        `L${p(10.2, -30.4)}L${p(11.4, -27.2)}L${p(12.2, -30.6)}L${p(12.6, -27)}C${p(14, -26.6)} ${p(15.6, -26.2)} ${p(17, -25.4)}` +
        `L${p(16.8, -24.4)}C${p(15, -24.2)} ${p(13, -23.8)} ${p(11.6, -23)}C${p(10.4, -21.4)} ${p(9, -19.6)} ${p(7, -18.4)}` +
        `C${p(4.4, -16.8)} ${p(2.4, -14.2)} ${p(1.4, -12)}C${p(0.4, -10.6)} ${p(-1.4, -9.6)} ${p(-3.4, -9.4)}Z` +
        // The great hind leg: thigh, the hock thrown back, the long foot.
        `M${p(-6.6, -12.4)}C${p(-5.4, -15.4)} ${p(-1, -16)} ${p(1, -13)}C${p(1.8, -11.4)} ${p(0.6, -9.4)} ${p(-1.6, -8.4)}` +
        `L${p(-8.4, -5)}L${p(-16.6, -1.6)}L${p(-17, -2.6)}L${p(-10, -6.6)}C${p(-8.2, -8)} ${p(-7.2, -9.8)} ${p(-6.6, -12.4)}Z` +
        // The tail, thick at the root, out straight behind.
        `M${p(-6.8, -11.8)}C${p(-11, -11.8)} ${p(-16, -12.8)} ${p(-24, -15.4)}C${p(-16, -12)} ${p(-11, -10.2)} ${p(-6.4, -9.8)}Z`,
    );
    fig.limbs.push({ d: `M${p(7.4, -19)}L${p(9.6, -16.4)}L${p(11.2, -16.8)}`, w: 0.9 * s });
    return;
  }
  fig.ink.push(
    `M${p(-3.4, -2)}C${p(-5, -8)} ${p(-4.6, -16)} ${p(-1.6, -22)}C${p(0, -25.4)} ${p(1.6, -27.6)} ${p(2.6, -29)}` +
      `L${p(2.4, -33.4)}L${p(3.6, -30)}L${p(4.4, -33.6)}L${p(4.8, -29.8)}C${p(6.2, -29.4)} ${p(7.6, -28.8)} ${p(8.8, -28)}` +
      `L${p(8.6, -27)}C${p(7, -26.8)} ${p(5.6, -26.2)} ${p(4.6, -25.2)}C${p(3.6, -22)} ${p(3, -18)} ${p(3.4, -13)}` +
      `C${p(4.4, -9)} ${p(5, -5)} ${p(4.2, -2.4)}L${p(9.6, -0.8)}L${p(9.4, 0)}L${p(-1.6, 0)}Z` +
      `M${p(-3, -3)}C${p(-8, -2.6)} ${p(-13, -1.6)} ${p(-17, -0.2)}L${p(-16.6, 0.2)}C${p(-11, -0.4)} ${p(-6, -0.6)} ${p(-2, -0.6)}Z`,
  );
  fig.limbs.push({ d: `M${p(3, -21)}L${p(5.6, -18.4)}L${p(6.8, -18.8)}`, w: 0.9 * s });
}

/**
 * A wombat walking right, feet on y = 0, about 26 long and 12 high: a low barrel of a body, round
 * rump with no tail to speak of, a broad flat head with a blunt square snout, small rounded ears,
 * and short thick legs.
 */
export function wombat(fig: Figure, X: number, Y: number, s: number, o: { dir?: 1 | -1; step?: number } = {}) {
  const p = atD(X, Y, s, o.dir ?? 1);
  const a = Math.sin(o.step ?? 0.8);
  fig.ink.push(
    // Round rump down almost to the ground, the back highest over the hips, sloping to a short
    // neck; a big flat-topped head, deep in the jaw, ending in a broad square snout; a low belly.
    `M${p(-12, -2.2)}C${p(-13.4, -5.6)} ${p(-12, -10.6)} ${p(-7, -12.2)}C${p(-2, -13.4)} ${p(3.6, -12.2)} ${p(6.6, -10.4)}` +
      `C${p(7.8, -10.2)} ${p(9.4, -10.4)} ${p(11, -10.2)}C${p(13, -10)} ${p(14.8, -9.2)} ${p(15.8, -7.8)}` +
      `C${p(16.6, -6.8)} ${p(16.6, -5.2)} ${p(16, -4.4)}C${p(15.2, -3.6)} ${p(13.4, -3.4)} ${p(11.6, -3.6)}` +
      `C${p(10, -3.8)} ${p(8.8, -2.6)} ${p(7.6, -2.2)}C${p(3, -1.6)} ${p(-4, -1.6)} ${p(-8, -1.8)}C${p(-10.4, -1.8)} ${p(-11.6, -1.8)} ${p(-12, -2.2)}Z` +
      // Small ears, pricked, at the back of the head.
      `M${p(9.6, -10.2)}L${p(9.8, -12.8)}L${p(11.4, -10.4)}Z` +
      `M${p(11.2, -10.2)}L${p(12, -12.4)}L${p(12.8, -10)}Z`,
  );
  // The eye, a glint of paper.
  fig.paper.push({ d: `M${p(12, -7.8)}a${f(0.45 * s)} ${f(0.45 * s)} 0 1 0 ${f(0.9 * s)} 0a${f(0.45 * s)} ${f(0.45 * s)} 0 1 0 ${f(-0.9 * s)} 0Z`, w: 0.1 * s });
  // Legs so short they barely show below the belly, broad feet turned in.
  fig.limbs.push({ d: `M${p(8.6, -3)}L${p(8.9 + 0.6 * a, -0.5)}M${p(7.9 + 0.6 * a, -0.5)}L${p(10.8 + 0.6 * a, -0.5)}M${p(-7.6, -2.6)}L${p(-7.9 - 0.6 * a, -0.5)}M${p(-8.8 - 0.6 * a, -0.5)}L${p(-6 - 0.6 * a, -0.5)}`, w: 2.8 * s });
  fig.farLimbs.push({ d: `M${p(6.6, -2.8)}L${p(6.8 - 0.6 * a, -0.5)}M${p(6 - 0.6 * a, -0.5)}L${p(8.4 - 0.6 * a, -0.5)}M${p(-5.4, -2.4)}L${p(-5.6 + 0.6 * a, -0.5)}M${p(-6.4 + 0.6 * a, -0.5)}L${p(-4 + 0.6 * a, -0.5)}`, w: 2.6 * s });
}
