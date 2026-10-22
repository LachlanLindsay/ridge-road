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
export function horse(fig: Figure, X: number, Y: number, s: number, step: number, lead: [number, number] | null = null, pack: Pack | null = PLAIN_PACK) {
  const p = at(X, Y, s);
  const a = Math.sin(step);
  const b = Math.sin(step + Math.PI);
  const total = pack?.total ?? 0;
  // Past an easy load the head comes down, further the heavier it is.
  const droop = total > EASY_LB ? ((12 + Math.min(1, (total - EASY_LB) / (MOST_LB - EASY_LB)) * 16) * Math.PI) / 180 : 0;
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
  // Near legs in ink, far legs a shade lighter, so the walk reads.
  fig.limbs.push({ d: leg(p, [11.4, -14], [11.8 + 2.2 * a, -7.2], [12.2 + 4 * a, -0.4]), w: 2.3 * s });
  fig.limbs.push({ d: leg(p, [-10.4, -14.6], [-12.8 + 1.2 * b, -7.4], [-11 + 3.8 * b, -0.4]), w: 2.5 * s });
  fig.farLimbs.push({ d: leg(p, [9.8, -14], [10.2 + 2.2 * b, -7.2], [10.6 + 4 * b, -0.4]), w: 2.1 * s });
  fig.farLimbs.push({ d: leg(p, [-8.8, -14.6], [-11.2 + 1.2 * a, -7.4], [-9.4 + 3.8 * a, -0.4]), w: 2.3 * s });
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
export function man(fig: Figure, X: number, Y: number, s: number, step: number, leader: boolean, tool: Tool, leading = false): [number, number] {
  const p = at(X, Y, s);
  const a = Math.sin(step);
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

/** Who walks where, front first: a dog out ahead, the guide, then each horse led by a man. */
function order(c: PartyCounts, seed: number): Unit[] {
  const r = rng(seed);
  const men: { id: MemberId; leader: boolean; tool: Tool }[] = [];
  // Burne, the guide and hunter, goes first with a gun when he comes; then leaders and servants
  // take turns, the servants with axes.
  const servants = Array.from({ length: Math.min(c.servants, SERVANT_IDS.length) }, (_, i) => ({ id: SERVANT_IDS[i]!, leader: false, tool: (i === 0 ? 'gun' : 'axe') as Tool }));
  const leaders = LEADER_IDS.map((id) => ({ id, leader: true, tool: 'gun' as Tool }));
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
  units.push({ kind: 'man', ...men[m++]!, leading: false });
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
  return units;
}

/** Length of the procession at scale 1. */
function span(units: Unit[]): number {
  return units.reduce((sum, u) => sum + WIDTH[u.kind] + GAP[u.kind], 0);
}

/**
 * Lay the party out along `ground`, heading right, centred in [from, to], no larger than `maxScale`.
 * `loads` is what each horse carries, first horse first. Returns the figure, the scale used and
 * where each figure stands.
 */
export function procession(
  c: PartyCounts,
  ground: Curve,
  o: { from: number; to: number; maxScale: number; seed: number; phase?: number; loads?: Pack[] },
): { fig: Figure; scale: number; slots: Slot[] } {
  const units = order(c, o.seed);
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
    if (u.kind === 'man') lastHand = man(fig, ox, y, s, step, u.leader, u.tool, u.leading);
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

/** The marks for a figure, in drawing order: far limbs, bodies, near limbs, loads, ropes. */
export function figureMarks(fig: Figure, tone = 'f4'): Mark[] {
  const out: Mark[] = [];
  const join = (xs: { d: string; w: number }[], c: string) => {
    // Group by width so each stroke width is one path.
    const byW = new Map<number, string[]>();
    for (const x of xs) byW.set(Math.round(x.w * 100) / 100, [...(byW.get(Math.round(x.w * 100) / 100) ?? []), x.d]);
    for (const [w, ds] of byW) out.push({ d: ds.join(''), c, w });
  };
  join(fig.farLimbs, 'l3');
  out.push({ d: fig.ink.join(''), c: tone });
  join(fig.limbs, tone === 'f4' ? 'l4' : 'l3');
  join(fig.back, 'pk');
  join(fig.paper, 'pk');
  join(fig.front, 'pk');
  if (fig.topInk.length) out.push({ d: fig.topInk.join(''), c: tone });
  join(fig.rope, 'l4');
  return out;
}
