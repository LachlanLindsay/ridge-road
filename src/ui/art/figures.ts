// The party in silhouette: pack horses, men and kangaroo dogs walking to the right, drawn as path
// data in scene units so a whole procession merges into a handful of paths.
import { f, rng, yAt, type Curve } from './kit';

/** One run of path data with the class that colours it and its stroke width. */
export interface Mark {
  d: string;
  c: string;
  w?: number;
}

type Pt = (x: number, y: number) => string;
const at = (X: number, Y: number, s: number): Pt => (x, y) => `${f(X + x * s)} ${f(Y + y * s)}`;

/**
 * Figure parts sorted by how they print: `ink` solid, `far` the legs on the far side, `paper` the
 * loads (paper with an ink outline), `rope` thin ink lines.
 */
export interface Figure {
  ink: string[];
  far: string[];
  limbs: { d: string; w: number }[];
  farLimbs: { d: string; w: number }[];
  paper: { d: string; w: number }[];
  rope: { d: string; w: number }[];
}

export const emptyFigure = (): Figure => ({ ink: [], far: [], limbs: [], farLimbs: [], paper: [], rope: [] });

/** A leg as hip, joint and foot, the joint bent the way the animal's bends. */
function leg(p: Pt, top: [number, number], joint: [number, number], foot: [number, number]) {
  return `M${p(...top)}L${p(...joint)}L${p(...foot)}`;
}

/**
 * A pack horse facing right, feet on y = 0, about 26 to the withers. `step` sets the walk; `lead`
 * is where the rope from its halter goes, in the same units, or null for a loose horse.
 */
export function horse(fig: Figure, X: number, Y: number, s: number, step: number, lead: [number, number] | null = null, packed = true) {
  const p = at(X, Y, s);
  const a = Math.sin(step);
  const b = Math.sin(step + Math.PI);
  fig.ink.push(
    `M${p(-15.5, -23.8)}C${p(-13, -25.6)} ${p(-9, -25.4)} ${p(-6, -24.9)}C${p(-2, -24.3)} ${p(2, -24.6)} ${p(5, -25.4)}C${p(7, -26)} ${p(8.5, -26.6)} ${p(10, -27.4)}` +
      `C${p(13, -30)} ${p(16, -33.5)} ${p(18.6, -36)}L${p(18.5, -39.6)}L${p(19.9, -36.7)}C${p(20.7, -36.3)} ${p(21.4, -35.8)} ${p(22, -35)}` +
      `C${p(24, -32)} ${p(26.4, -28.6)} ${p(27.8, -26.4)}C${p(28.4, -25.4)} ${p(27.9, -24.4)} ${p(26.6, -24.5)}C${p(25.2, -24.6)} ${p(24, -25.4)} ${p(23.2, -26.4)}` +
      `C${p(22.2, -27.6)} ${p(21, -28.6)} ${p(20.2, -28.6)}C${p(18.8, -27.2)} ${p(16.6, -24.2)} ${p(15.4, -21.4)}C${p(14.8, -19.6)} ${p(14.4, -17)} ${p(13.4, -15.2)}` +
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
  fig.rope.push({ d: `M${p(20.6, -35)}L${p(24.6, -29.4)}M${p(23.2, -30.6)}L${p(26.9, -28.1)}`, w: 0.7 * s });
  if (packed) {
    // Pack saddle: a pannier on the near side, a roll on top, a diamond of lashings, the girth,
    // breast strap and breeching.
    fig.paper.push({
      d:
        `M${p(-6.4, -31.8)}L${p(5.6, -31.8)}Q${p(7.6, -31.8)} ${p(7.6, -29.8)}L${p(7.6, -20.2)}Q${p(7.6, -18.2)} ${p(5.6, -18.2)}L${p(-6.4, -18.2)}Q${p(-8.4, -18.2)} ${p(-8.4, -20.2)}L${p(-8.4, -29.8)}Q${p(-8.4, -31.8)} ${p(-6.4, -31.8)}Z` +
        `M${p(-6.8, -33.2)}a${f(6.4 * s)} ${f(2.3 * s)} 0 1 0 ${f(12.8 * s)} 0a${f(6.4 * s)} ${f(2.3 * s)} 0 1 0 ${f(-12.8 * s)} 0Z`,
      w: 0.85 * s,
    });
    fig.rope.push({ d: `M${p(-7.4, -30.6)}L${p(6.6, -19.4)}M${p(6.6, -30.6)}L${p(-7.4, -19.4)}M${p(-8.4, -25)}L${p(7.6, -25)}`, w: 0.6 * s });
    fig.rope.push({ d: `M${p(-0.4, -18.2)}L${p(-0.4, -12.3)}M${p(7.6, -22)}Q${p(11.6, -21)} ${p(14.8, -19.2)}M${p(-8.4, -21.2)}Q${p(-12.6, -19.2)} ${p(-15.9, -19.8)}`, w: 0.75 * s });
  }
  if (lead) {
    const [hx, hy] = lead;
    const sx = X + 25.4 * s;
    const sy = Y - 25 * s;
    const sag = Math.max(2 * s, Math.abs(hx - sx) * 0.25);
    fig.rope.push({ d: `M${f(sx)} ${f(sy)}Q${f((sx + hx) / 2)} ${f(Math.max(sy, hy) + sag)} ${f(hx)} ${f(hy)}`, w: 0.7 * s });
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

type Unit = { kind: 'man'; leader: boolean; tool: Tool; leading: boolean } | { kind: 'horse' } | { kind: 'dog' };

const WIDTH = { man: 11, horse: 48, dog: 25 };
const GAP = { man: 4, horse: 3, dog: 3 };

/** Who walks where, front first: a dog out ahead, the guide, then each horse led by a man. */
function order(c: PartyCounts, seed: number): Unit[] {
  const r = rng(seed);
  const men: { leader: boolean; tool: Tool }[] = [];
  // Burne, the guide and hunter, goes first with a gun when he comes; then leaders and servants
  // take turns, the servants with axes.
  const servants = Array.from({ length: c.servants }, (_, i) => ({ leader: false, tool: (i === 0 ? 'gun' : 'axe') as Tool }));
  const leaders = [0, 1, 2].map(() => ({ leader: true, tool: 'gun' as Tool }));
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
    if (m < men.length) units.push({ kind: 'man', ...men[m++]!, leading: true, tool: men[m - 1]!.leader ? 'none' : men[m - 1]!.tool });
    units.push({ kind: 'horse' });
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
 * Returns the figure and the scale used.
 */
export function procession(c: PartyCounts, ground: Curve, o: { from: number; to: number; maxScale: number; seed: number; phase?: number }): { fig: Figure; scale: number } {
  const units = order(c, o.seed);
  const len = span(units);
  const s = Math.min(o.maxScale, (o.to - o.from) / len);
  const fig = emptyFigure();
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
      horse(fig, ox, y, s, step, prev?.kind === 'man' && prev.leading ? lastHand : null);
    }
    if (u.kind !== 'man') lastHand = null;
    x -= w + GAP[u.kind] * s;
  }
  return { fig, scale: s };
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
  join(fig.paper, 'pk');
  join(fig.rope, 'l4');
  return out;
}
