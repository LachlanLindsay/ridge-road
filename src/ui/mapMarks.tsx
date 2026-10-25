// Marks drawn both on the map and in its key: the cover along a ridge, the feed in a point, the
// arrow at the end of an unexplored ridge.
import type { NodeDraw, P } from './geometry';
import type { cover } from './mapArt';

const f = (v: number) => (Math.round(v * 1000) / 1000).toString();

export function Cover({ art, k }: { art: NonNullable<ReturnType<typeof cover>>; k: number }) {
  return (
    <g class="cover">
      {art.brush.map((r) => (
        <path key={`${r.standing}:${r.w}:${r.dash}`} class={r.standing ? 'cover-brush' : 'cover-brush cover-brush-cut'} d={r.d} stroke-width={r.w} stroke-dasharray={r.dash} />
      ))}
      <path class="cover-rocks" d={art.rocks} stroke-width={0.75 / k} />
      <path class="cover-gum-wood" d={art.gumWood} stroke-width={0.9 / k} />
      <path class="cover-gum-crown" d={art.gumCrowns} />
      <path class="cover-heath" d={art.heath} stroke-width={0.8 / k} />
      <path class="cover-meadow" d={art.meadow} stroke-width={0.9 / k} />
      <path class="cover-marsh" d={art.marsh} stroke-width={0.8 / k} />
    </g>
  );
}

/**
 * The point itself says what a night there does for the horses: a solid green dot is full feed, a
 * half-green dot half feed (rushy grass), an empty dot none. A point only seen from a lookout is a
 * small pencil ring, its grass not yet known.
 */
export function FeedDot({ n, k }: { n: Pick<NodeDraw, 'p' | 'reached' | 'grass' | 'feature'>; k: number }) {
  const px = (v: number) => v / k;
  const { x, y } = n.p;
  if (!n.reached) return <circle cx={f(x)} cy={f(y)} r={px(2.6)} class="node node-unseen" stroke-width={px(1.1)} />;
  const r = px(4.5);
  const feed = n.feature === 'precipice' ? 'none' : feedOf(n.grass);
  return (
    <g class={`feed feed-${feed}`}>
      <circle cx={f(x)} cy={f(y)} r={f(r)} class={feed === 'full' ? 'node node-full' : 'node'} stroke-width={px(1.2)} />
      {feed === 'half' && <path d={`M${f(x - r)} ${f(y)}A${f(r)} ${f(r)} 0 0 0 ${f(x + r)} ${f(y)}Z`} class="node-half" />}
      {feed === 'half' && <circle cx={f(x)} cy={f(y)} r={f(r)} class="node node-ring" stroke-width={px(1.2)} />}
    </g>
  );
}

export type Feed = 'full' | 'half' | 'none';

export function feedOf(grass: NodeDraw['grass']): Feed {
  return grass === 'good' || grass === 'tall' ? 'full' : grass === 'rushy' ? 'half' : 'none';
}

/** The end of what is known: an open arrowhead pointing on along the ridge into the haze. */
export function leadArrow(a: P, b: P, px: (n: number) => number): string {
  const l = Math.max(Math.hypot(b.x - a.x, b.y - a.y), 1e-9);
  const ux = (b.x - a.x) / l;
  const uy = (b.y - a.y) / l;
  const tip = { x: b.x + ux * px(3), y: b.y + uy * px(3) };
  const back = { x: tip.x - ux * px(7), y: tip.y - uy * px(7) };
  const w = px(5);
  return `M${f(back.x - uy * w)} ${f(back.y + ux * w)}L${f(tip.x)} ${f(tip.y)}L${f(back.x + uy * w)} ${f(back.y - ux * w)}`;
}
