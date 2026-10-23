// The engraved map: haze over unknown country, cover along the ridges, labels kept apart.
import { describe, expect, it } from 'vitest';
import { newGame } from '../src/engine/index';
import { mapDraw, type MapDraw, type SegDraw } from '../src/ui/geometry';
import { capsuleSpan, cover, haze, hazeStep, mapLabel, placeLabels, riverX } from '../src/ui/mapArt';

const seg = (terrain: SegDraw['terrain'], open = 0, extra: Partial<SegDraw> = {}): SegDraw => ({
  id: `s-${terrain}-${open}`,
  a: { x: 0, y: 0 },
  b: { x: -1, y: 0 },
  farKnown: true,
  open,
  marked: open,
  crossed: false,
  deadEnd: false,
  deadRoot: false,
  lead: false,
  pass: false,
  terrain,
  passable: !['scrub', 'thick', 'thorny', 'rocky'].includes(terrain),
  ...extra,
});

const ALL = { minX: -1e9, minY: -1e9, maxX: 1e9, maxY: 1e9 };

describe('the haze over unknown country', () => {
  it('finds where a level line passes near a ridge', () => {
    const s = capsuleSpan({ x: 0, y: 0 }, { x: -2, y: 0 }, 0.5, 0)!;
    expect(s[0]).toBeCloseTo(-2.5);
    expect(s[1]).toBeCloseTo(0.5);
    expect(capsuleSpan({ x: 0, y: 0 }, { x: -2, y: 0 }, 0.5, 0.6)).toBeNull();
    // A slanting ridge: the line at its middle is cut close round it.
    const t = capsuleSpan({ x: 0, y: 0 }, { x: -2, y: -2 }, 0.3, -1)!;
    expect((t[0] + t[1]) / 2).toBeCloseTo(-1);
    expect(t[1] - t[0]).toBeCloseTo(0.6 * Math.SQRT2, 3);
  });

  it('keeps clear of the ridges the party knows and of the settled side of the river', () => {
    const draw: MapDraw = mapDraw(newGame({ seed: 3, mode: 'easy' }));
    const k = 120;
    const box = { minX: -4, minY: -3, maxX: 3, maxY: 3 };
    const { far, edge } = haze(draw, k, box);
    expect(far.length).toBeGreaterThan(100);
    const sw = hazeStep(k);
    const rClear = Math.max(0.3, 4 * sw);
    for (const d of [far, edge]) {
      for (const m of d.matchAll(/M(-?[\d.]+) (-?[\d.]+)H(-?[\d.]+)/g)) {
        const [x0, y, x1] = [Number(m[1]), Number(m[2]), Number(m[3])];
        // Nothing east of the Nepean, where the colony is.
        expect(Math.max(x0, x1)).toBeLessThanOrEqual(riverX(y) + 1e-3);
        // Nothing within the clear distance of a known ridge.
        for (const s of draw.segs) {
          const span = capsuleSpan(s.a, s.b, rClear - 1e-6, y);
          if (span) expect(x1 <= span[0] + 1e-3 || x0 >= span[1] - 1e-3).toBe(true);
        }
      }
    }
  });

  it('puts the rules on a grid, so panning does not move them', () => {
    const draw = mapDraw(newGame({ seed: 3, mode: 'easy' }));
    const ys = (d: string) => new Set([...d.matchAll(/M-?[\d.]+ (-?[\d.]+)H/g)].map((m) => Number(m[1])));
    const a = ys(haze(draw, 100, { minX: -4, minY: -2, maxX: 0, maxY: 2 }).far);
    const b = ys(haze(draw, 100, { minX: -4.3, minY: -1.7, maxX: -0.3, maxY: 2.3 }).far);
    const shared = [...a].filter((y) => b.has(y));
    expect(shared.length).toBeGreaterThan(a.size * 0.7);
  });
});

describe('cover along the ridges', () => {
  it('stipples standing brush across the ridge, and only either side once it is cut', () => {
    const standing = cover([seg('scrub', 0)], 100, ALL);
    expect(standing.brush.some((r) => r.standing && r.d)).toBe(true);
    expect(standing.brush.some((r) => !r.standing && r.d)).toBe(false);
    const cut = cover([seg('thick', 1)], 100, ALL);
    expect(cut.brush.some((r) => !r.standing && r.d)).toBe(true);
    expect(cut.brush.some((r) => r.standing && r.d)).toBe(false);
  });

  it('draws trees for open forest, tufts for heath, marsh marks for swamp, boulders for rock', () => {
    expect(cover([seg('openForest')], 100, ALL).gumCrowns).not.toBe('');
    expect(cover([seg('heath')], 100, ALL).heath).not.toBe('');
    expect(cover([seg('swamp')], 100, ALL).marsh).not.toBe('');
    expect(cover([seg('rocky')], 100, ALL).rocks).not.toBe('');
    const open = cover([seg('openForest')], 100, ALL);
    expect(open.brush.every((r) => !r.d)).toBe(true);
  });

  it('leaves dead ends bare', () => {
    const c = cover([seg('scrub', 0, { deadEnd: true })], 100, ALL);
    expect(c.brush.every((r) => !r.d)).toBe(true);
  });
});

describe('labels', () => {
  it('moves a second label off the first', () => {
    const opts = (x: number, y: number) => [
      { x: x + 10, y, anchor: 'start' as const, box: { x0: x + 10, y0: y - 10, x1: x + 90, y1: y + 3 } },
      { x: x - 10, y, anchor: 'end' as const, box: { x0: x - 90, y0: y - 10, x1: x - 10, y1: y + 3 } },
    ];
    const placed = placeLabels(
      [
        { id: 'a', text: 'Swamp', size: 13, options: opts(100, 100) },
        { id: 'b', text: 'Lookout', size: 13, options: opts(100, 102) },
      ],
      [],
    );
    expect(placed.map((p) => p.anchor)).toEqual(['start', 'end']);
  });

  it('keeps a label on the side it took last frame while that side is clear', () => {
    const opts = [
      { x: 10, y: 10, anchor: 'start' as const, box: { x0: 10, y0: 0, x1: 90, y1: 13 } },
      { x: -10, y: 10, anchor: 'end' as const, box: { x0: -90, y0: 0, x1: -10, y1: 13 } },
    ];
    const last = new Map<string, number>([['a', 1]]);
    expect(placeLabels([{ id: 'a', text: 'Swamp', size: 13, options: opts }], [], undefined, last)[0]!.anchor).toBe('end');
    // Once its side is blocked it moves, and remembers the move.
    const wall = { x0: -100, y0: -5, x1: -5, y1: 20 };
    expect(placeLabels([{ id: 'a', text: 'Swamp', size: 13, options: opts }], [wall], undefined, last)[0]!.anchor).toBe('start');
    expect(last.get('a')).toBe(0);
  });

  it('leaves an optional label off rather than pile it on another', () => {
    const box = { x0: 0, y0: 0, x1: 80, y1: 13 };
    const placed = placeLabels([{ id: 'c', text: 'Camp', size: 13, optional: true, options: [{ x: 0, y: 10, anchor: 'start', box }] }], [box]);
    expect(placed).toHaveLength(0);
  });

  it('keeps names off the map that a mark already says', () => {
    const n = mapDraw(newGame({ seed: 3, mode: 'easy' })).nodes[0]!;
    expect(mapLabel({ ...n, label: 'Swamp head' })).toBeUndefined();
    expect(mapLabel({ ...n, label: 'Precipice' })).toBeUndefined();
    expect(mapLabel({ ...n, label: 'The old cairn' })).toBe('The old cairn');
  });
});

describe('the pass on the map', () => {
  it('shows the way down and the trench once found and dug', () => {
    const s = newGame({ seed: 3, mode: 'easy' });
    const top = Object.values(s.map.nodes).find((n) => n.feature === 'pass')!;
    const pass = top.childSegs.map((id) => s.map.segments[id]!).find((g) => g.pass)!;
    top.known = true;
    top.reached = true;
    expect(mapDraw(s).nodes.find((n) => n.id === top.id)!.passDir).toBeUndefined();
    pass.found = true;
    pass.trenchHours = 100;
    const drawn = mapDraw(s).nodes.find((n) => n.id === top.id)!;
    expect(drawn.passDir).toBeDefined();
    expect(Math.hypot(drawn.passDir!.x, drawn.passDir!.y)).toBeCloseTo(1);
    expect(drawn.trench).toBe(true);
  });
});
