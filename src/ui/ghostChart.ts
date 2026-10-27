// The end screen's chart: the share of the route covered by each evening, yours against the 1813
// party's, and where each line's label goes so it touches neither line nor the other label.

export const CHART = { W: 320, H: 168, L: 34, R: 22, Tp: 14, B: 26 } as const;

export type Pt = readonly [number, number];
export type Anchor = 'start' | 'middle' | 'end';
export interface Label {
  x: number;
  /** The text's baseline. */
  y: number;
  anchor: Anchor;
}

export interface GhostLayout {
  days: number;
  /** Your line and the 1813 party's, in chart units. */
  you: Pt[];
  ghost: Pt[];
  ticks: number[];
  labels: { you: Label; ghost: Label };
}

export const LABEL_YOU = 'You';
export const LABEL_1813 = '1813';

// The labels are 11px bold (styles.css, .ghost-label): a generous width per character, and the
// box from the baseline up to the top of the figures and a little below.
const CHAR_W = 6.8;
const ASCENT = 8.5;
const DESCENT = 1.5;
/** Clearance from a line's centre: half its stroke and a little air. */
const CLEAR = 2.5;
/** Air between the two labels. */
const GAP = 3;

/** Both lines and their labels, from the share of the route covered each evening. */
export function ghostLayout(yours: number[], shares1813: number[]): GhostLayout {
  const { W, H, L, R, Tp, B } = CHART;
  const mine = yours.length ? yours : [0];
  const days = Math.max(mine.length, shares1813.length);
  const x = (i: number) => L + ((W - L - R) * i) / Math.max(1, days);
  const y = (v: number) => Tp + (H - Tp - B) * (1 - v);
  const pts = (vs: number[]): Pt[] => vs.map((v, i) => [x(i + 1), y(v)] as const);
  const you = pts(mine);
  const ghost = pts(shares1813);
  const ticks = [1, 7, 14, 21, 28, 35].filter((d) => d <= days);
  return { days, you, ghost, ticks, labels: placeLabels(you, ghost) };
}

interface Box {
  x0: number;
  y0: number;
  x1: number;
  y1: number;
}

export function labelBox(l: Label, text: string): Box {
  const w = text.length * CHAR_W;
  const x0 = l.anchor === 'start' ? l.x : l.anchor === 'end' ? l.x - w : l.x - w / 2;
  return { x0, y0: l.y - ASCENT, x1: x0 + w, y1: l.y + DESCENT };
}

/** Distance from a point to a box: 0 inside it. */
function pointBox(p: Pt, b: Box): number {
  const dx = Math.max(b.x0 - p[0], 0, p[0] - b.x1);
  const dy = Math.max(b.y0 - p[1], 0, p[1] - b.y1);
  return Math.hypot(dx, dy);
}

/** Does the segment a–b pass through the box? (Liang–Barsky clipping.) */
function segmentHits(a: Pt, b: Pt, box: Box): boolean {
  if (Math.max(a[0], b[0]) < box.x0 || Math.min(a[0], b[0]) > box.x1 || Math.max(a[1], b[1]) < box.y0 || Math.min(a[1], b[1]) > box.y1) return false;
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  let t0 = 0;
  let t1 = 1;
  const clip = (p: number, q: number): boolean => {
    if (p === 0) return q >= 0;
    const r = q / p;
    if (p < 0) t0 = Math.max(t0, r);
    else t1 = Math.min(t1, r);
    return t0 <= t1;
  };
  return clip(-dx, a[0] - box.x0) && clip(dx, box.x1 - a[0]) && clip(-dy, a[1] - box.y0) && clip(dy, box.y1 - a[1]);
}

const grow = (b: Box, d: number): Box => ({ x0: b.x0 - d, y0: b.y0 - d, x1: b.x1 + d, y1: b.y1 + d });

/** Does the line (as drawn: one point draws nothing) pass within `CLEAR` of the box? */
export function lineTouches(line: Pt[], box: Box): boolean {
  const g = grow(box, CLEAR);
  for (let i = 1; i < line.length; i++) if (segmentHits(line[i - 1]!, line[i]!, g)) return true;
  return false;
}

/** Distance from the point (px, py) to the segment a–b. */
function pointSegment(px: number, py: number, a: Pt, b: Pt): number {
  const dx = b[0] - a[0];
  const dy = b[1] - a[1];
  const len = dx * dx + dy * dy;
  const t = len ? Math.max(0, Math.min(1, ((px - a[0]) * dx + (py - a[1]) * dy) / len)) : 0;
  return Math.hypot(px - a[0] - t * dx, py - a[1] - t * dy);
}

/** How near the line comes to the box: 0 if it crosses it. */
function lineDistance(line: Pt[], box: Box): number {
  let d = line.length ? pointBox(line[0]!, box) : Infinity;
  for (let i = 1; i < line.length; i++) {
    const a = line[i - 1]!;
    const b = line[i]!;
    if (segmentHits(a, b, box)) return 0;
    d = Math.min(d, pointBox(b, box), pointSegment(box.x0, box.y0, a, b), pointSegment(box.x1, box.y0, a, b), pointSegment(box.x0, box.y1, a, b), pointSegment(box.x1, box.y1, a, b));
  }
  return d;
}

export function boxesTouch(a: Box, b: Box, gap = GAP): boolean {
  return a.x0 < b.x1 + gap && b.x0 < a.x1 + gap && a.y0 < b.y1 + gap && b.y0 < a.y1 + gap;
}

export function insidePlot(b: Box): boolean {
  const { W, H, L, B } = CHART;
  return b.x0 >= L && b.x1 <= W - 1 && b.y0 >= 1 && b.y1 <= H - B - 1;
}

/** Places to try for a label at a line's end: right of it, then rows above and below, sliding back along the line. */
function spots(end: Pt): Label[] {
  const [ex, ey] = end;
  const out: Label[] = [];
  for (const dy of [4, -6, 13, -13, 20, -20, 27, -27, 34, -34, 41, -41]) {
    out.push({ x: ex + 5, y: ey + dy, anchor: 'start' });
    out.push({ x: ex, y: ey + dy, anchor: 'middle' });
    out.push({ x: ex - 2, y: ey + dy, anchor: 'start' });
    for (let k = 0; k <= 10; k++) out.push({ x: ex + 2 - 6 * k, y: ey + dy, anchor: 'end' });
  }
  return out;
}

interface Option {
  label: Label;
  box: Box;
  /** How far the label sits from its line's end. */
  cost: number;
  /** Clear of both lines and inside the plot. */
  clear: boolean;
  /** Nearer its own line than the other one, so it reads as that line's label. */
  own: boolean;
}

/** The faint 0%, 50% and 100% rules: a label is easier to read off them, though it may sit on one. */
const RULES = [0, 0.5, 1].map((v) => CHART.Tp + (CHART.H - CHART.Tp - CHART.B) * (1 - v));
const ON_RULE = 4;

function options(text: string, line: Pt[], other: Pt[]): Option[] {
  const end = line[line.length - 1]!;
  return spots(end).map((label) => {
    const box = labelBox(label, text);
    const clear = insidePlot(box) && pointBox(end, box) >= CLEAR && !lineTouches(line, box) && !lineTouches(other, box);
    // Only a clear spot is ever judged on whose label it reads as.
    const own = clear && lineDistance(line, box) <= lineDistance(other, box);
    const onRule = RULES.some((r) => r > box.y0 - 1 && r < box.y1 + 1);
    return { label, box, cost: pointBox(end, box) + (onRule ? ON_RULE : 0), clear, own };
  });
}

/**
 * The two labels sit as near the ends of their lines as they can while touching neither line, the
 * other label or the edges of the plot, each nearer its own line than the other. If nothing fits
 * every rule, the rules give way from the last.
 */
export function placeLabels(you: Pt[], ghost: Pt[]): { you: Label; ghost: Label } {
  const byCost = (x: Option, y: Option) => x.cost - y.cost;
  const a = options(LABEL_YOU, you, ghost).sort(byCost);
  const b = options(LABEL_1813, ghost, you).sort(byCost);
  const tiers: ((o: Option) => boolean)[] = [(o) => o.clear && o.own, (o) => o.clear, () => true];
  for (const ok of tiers) {
    const as = a.filter(ok);
    const bs = b.filter(ok);
    let best: [Option, Option] | null = null;
    let bestCost = Infinity;
    for (const p of as) {
      if (p.cost + (bs[0]?.cost ?? 0) >= bestCost) break;
      for (const q of bs) {
        if (p.cost + q.cost >= bestCost) break;
        if (boxesTouch(p.box, q.box)) continue;
        bestCost = p.cost + q.cost;
        best = [p, q];
      }
    }
    if (best) return { you: best[0].label, ghost: best[1].label };
  }
  // Unreachable: the last tier only asks that the labels keep apart, and the rows give room for that.
  return { you: a[0]!.label, ghost: b[0]!.label };
}
