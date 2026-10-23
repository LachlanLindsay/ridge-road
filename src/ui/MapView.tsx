// The survey plot, engraved: country the party has not seen lies under ruled haze; each known ridge
// carries its cover (brush to cut, open forest, heath, swamp, rock); the cleared road is in red;
// cliffs are drawn where the ridges break off. Drag to pan, pinch or scroll to zoom, tap a point or
// a ridge to select it.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { getUnits } from './format';
import { distToSeg, hachurePath, lerp, targetPoint, type Bounds, type MapDraw, type NodeDraw, type P, type SegDraw } from './geometry';
import { BRUSH, cliffLine, cover, grassMark, haze, hazeStep, mapLabel, NEPEAN, placeLabels, rockHoleMark, streamMark, swampMark, type LabelItem, type Rect } from './mapArt';
import { SizeButtons, type MapSize } from './MapSize';

interface View {
  cx: number;
  cy: number;
  /** Pixels per map unit (straight-line mile). */
  k: number;
}

interface Props {
  draw: MapDraw;
  campKey: string;
  selected: string | null;
  target: string | null;
  moveTo: string | null;
  onTap: (id: string | null) => void;
  onKey: () => void;
  size: MapSize;
  onSize: (m: MapSize) => void;
}

const K_MAX = 420;
const MIN_SPAN = 3;
/** Glyphs, labels and line weights grow with the panel: a laptop map is not a phone map seen from further away. */
function uiScale(w: number, h: number): number {
  return clamp(Math.min(w, h) / 480, 1, 1.5);
}
const f = (v: number) => (Math.round(v * 1000) / 1000).toString();
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const reducedMotion = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function kLimits(draw: MapDraw, w: number, h: number) {
  const b = draw.bounds;
  const spanX = Math.max(b.maxX - b.minX, MIN_SPAN);
  const spanY = Math.max(b.maxY - b.minY, MIN_SPAN);
  const kAll = Math.min((w - 48) / spanX, (h - 48) / spanY);
  return { kMin: Math.max(4, Math.min(kAll * 0.8, 40)), kMax: K_MAX };
}

function fit(b: Bounds, w: number, h: number, kMin: number, kMax: number): View {
  const spanX = Math.max(b.maxX - b.minX, 2);
  const spanY = Math.max(b.maxY - b.minY, 2);
  const k = clamp(Math.min((w - 72) / spanX, (h - 72) / spanY), kMin, kMax);
  return { cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2, k };
}

/** Frame the camp and the country within a few miles of it. */
function frameCamp(draw: MapDraw, w: number, h: number): View {
  const c = draw.camp;
  // The same few miles of country around the camp on every screen: a bigger panel draws them
  // bigger rather than showing more empty fog.
  const R = clamp((2.6 * Math.min(w, h)) / 420, 2.2, 3.2);
  const b: Bounds = { minX: c.x - 0.9, maxX: c.x + 0.9, minY: c.y - 0.9, maxY: c.y + 0.9 };
  const add = (p: P) => {
    if (Math.hypot(p.x - c.x, p.y - c.y) > R) return;
    b.minX = Math.min(b.minX, p.x);
    b.maxX = Math.max(b.maxX, p.x);
    b.minY = Math.min(b.minY, p.y);
    b.maxY = Math.max(b.maxY, p.y);
  };
  for (const n of draw.nodes) add(n.p);
  for (const s of draw.segs) {
    add(s.a);
    add(s.b);
  }
  const { kMin, kMax } = kLimits(draw, w, h);
  return fit(b, w, h, kMin, Math.min(kMax, Math.min(w, h) / (R * 1.2)));
}

/** The haze is drawn for a margin around the view, on a grid, so it is rebuilt only now and then while panning. */
function hazeBox(box: Bounds, sw: number): Bounds {
  const cell = 32 * sw;
  const mx = (box.maxX - box.minX) * 0.25;
  const my = (box.maxY - box.minY) * 0.25;
  return {
    minX: Math.floor((box.minX - mx) / cell) * cell,
    maxX: Math.ceil((box.maxX + mx) / cell) * cell,
    minY: Math.floor((box.minY - my) / cell) * cell,
    maxY: Math.ceil((box.maxY + my) / cell) * cell,
  };
}

export function MapView({ draw, campKey, selected, target, moveTo, onTap, onKey, size: mapSize, onSize }: Props) {
  const wrap = useRef<HTMLDivElement>(null);
  const svg = useRef<SVGSVGElement>(null);
  const [size, setSize] = useState({ w: 0, h: 0 });
  const [view, setView] = useState<View | null>(null);
  const viewRef = useRef<View | null>(null);
  viewRef.current = view;
  const drawRef = useRef(draw);
  drawRef.current = draw;
  const sizeRef = useRef(size);
  sizeRef.current = size;
  const anim = useRef<number | null>(null);
  const pointers = useRef(new Map<number, P>());
  const gesture = useRef<{ start: P; t0: number; moved: boolean; dist?: number; mid?: P } | null>(null);

  useLayoutEffect(() => {
    const el = wrap.current!;
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight });
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // First frame, and a new expedition: frame the camp.
  useEffect(() => {
    if (!size.w || !size.h) return;
    if (!viewRef.current) setView(frameCamp(draw, size.w, size.h));
  }, [size.w, size.h]);

  // After each half, keep the camp and the work front in view: pan when they have drifted toward
  // an edge, and zoom out a step when they no longer fit together.
  useEffect(() => {
    const v = viewRef.current;
    const { w, h } = sizeRef.current;
    if (!v || !w) return;
    const pts = [draw.camp];
    const t = targetPoint(draw, target);
    if (t) pts.push(t);
    const inner = (p: P) => {
      const sx = (p.x - v.cx) * v.k + w / 2;
      const sy = (p.y - v.cy) * v.k + h / 2;
      return sx >= w * 0.12 && sx <= w * 0.88 && sy >= h * 0.12 && sy <= h * 0.88;
    };
    if (pts.every(inner)) return;
    const b: Bounds = { minX: Infinity, maxX: -Infinity, minY: Infinity, maxY: -Infinity };
    for (const p of pts) {
      b.minX = Math.min(b.minX, p.x);
      b.maxX = Math.max(b.maxX, p.x);
      b.minY = Math.min(b.minY, p.y);
      b.maxY = Math.max(b.maxY, p.y);
    }
    const { kMin } = kLimits(draw, w, h);
    const kFit = Math.min((w * 0.7) / Math.max(b.maxX - b.minX, 0.01), (h * 0.7) / Math.max(b.maxY - b.minY, 0.01));
    animateTo({ k: clamp(Math.min(v.k, kFit), kMin, v.k), cx: (b.minX + b.maxX) / 2, cy: (b.minY + b.maxY) / 2 });
  }, [campKey]);

  function clampView(v: View): View {
    const { w, h } = sizeRef.current;
    const d = drawRef.current;
    const { kMin, kMax } = kLimits(d, w, h);
    const k = clamp(v.k, kMin, kMax);
    const b = d.bounds;
    const mx = Math.max(1.5, w / 2 / k);
    const my = Math.max(1.5, h / 2 / k);
    return { k, cx: clamp(v.cx, b.minX - mx * 0.6, b.maxX + mx * 0.6), cy: clamp(v.cy, b.minY - my * 0.6, b.maxY + my * 0.6) };
  }

  function stopAnim() {
    if (anim.current !== null) cancelAnimationFrame(anim.current);
    anim.current = null;
  }

  function animateTo(to: View) {
    stopAnim();
    const from = viewRef.current;
    const target = clampView(to);
    if (!from || reducedMotion()) {
      setView(target);
      return;
    }
    const t0 = performance.now();
    const dur = 300;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - (1 - t) ** 3;
      const k = from.k * (target.k / from.k) ** e;
      setView({ k, cx: from.cx + (target.cx - from.cx) * e, cy: from.cy + (target.cy - from.cy) * e });
      anim.current = t < 1 ? requestAnimationFrame(step) : null;
    };
    anim.current = requestAnimationFrame(step);
  }

  function zoomAround(p: P, factor: number) {
    setView((v) => {
      if (!v) return v;
      const { w, h } = sizeRef.current;
      const { kMin, kMax } = kLimits(drawRef.current, w, h);
      const k = clamp(v.k * factor, kMin, kMax);
      const mx = v.cx + (p.x - w / 2) / v.k;
      const my = v.cy + (p.y - h / 2) / v.k;
      return clampView({ k, cx: mx - (p.x - w / 2) / k, cy: my - (p.y - h / 2) / k });
    });
  }

  function panBy(dx: number, dy: number) {
    setView((v) => (v ? clampView({ ...v, cx: v.cx - dx / v.k, cy: v.cy - dy / v.k }) : v));
  }

  function local(e: { clientX: number; clientY: number }): P {
    const r = svg.current!.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  function hit(p: P): string | null {
    const v = viewRef.current;
    if (!v) return null;
    const { w, h } = sizeRef.current;
    const m = { x: v.cx + (p.x - w / 2) / v.k, y: v.cy + (p.y - h / 2) / v.k };
    let best: string | null = null;
    let bd = 24 / v.k;
    for (const n of drawRef.current.nodes) {
      const d = Math.hypot(n.p.x - m.x, n.p.y - m.y);
      if (d < bd) {
        best = n.id;
        bd = d;
      }
    }
    if (best) return best;
    bd = 18 / v.k;
    for (const s of drawRef.current.segs) {
      const d = distToSeg(m, s.a, s.b);
      if (d < bd) {
        best = s.id;
        bd = d;
      }
    }
    return best;
  }

  useEffect(() => {
    const el = svg.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      stopAnim();
      const scale = e.deltaMode === 1 ? 16 : 1;
      zoomAround(local(e), Math.exp(-e.deltaY * scale * 0.0016));
    };
    el.addEventListener('wheel', onWheel, { passive: false });
    return () => el.removeEventListener('wheel', onWheel);
  }, []);

  const onPointerDown = (e: PointerEvent) => {
    stopAnim();
    svg.current!.setPointerCapture(e.pointerId);
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    if (pointers.current.size === 1) gesture.current = { start: p, t0: performance.now(), moved: false };
    else if (gesture.current) gesture.current.moved = true;
  };

  const onPointerMove = (e: PointerEvent) => {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const p = local(e);
    pointers.current.set(e.pointerId, p);
    const g = gesture.current;
    if (!g) return;
    if (pointers.current.size === 1) {
      if (!g.moved && Math.hypot(p.x - g.start.x, p.y - g.start.y) > 8) g.moved = true;
      if (g.moved) panBy(p.x - prev.x, p.y - prev.y);
    } else if (pointers.current.size >= 2) {
      const [p1, p2] = [...pointers.current.values()];
      const dist = Math.hypot(p1!.x - p2!.x, p1!.y - p2!.y);
      const mid = { x: (p1!.x + p2!.x) / 2, y: (p1!.y + p2!.y) / 2 };
      if (g.dist && g.mid) {
        panBy(mid.x - g.mid.x, mid.y - g.mid.y);
        zoomAround(mid, dist / g.dist);
      }
      g.dist = dist;
      g.mid = mid;
    }
  };

  const onPointerEnd = (e: PointerEvent) => {
    if (!pointers.current.has(e.pointerId)) return;
    pointers.current.delete(e.pointerId);
    const g = gesture.current;
    if (pointers.current.size === 0) {
      if (g && !g.moved && e.type === 'pointerup' && performance.now() - g.t0 < 700) onTap(hit(local(e)));
      gesture.current = null;
    } else if (g) {
      g.dist = undefined;
      g.mid = undefined;
    }
  };

  const recenter = () => {
    const { w, h } = sizeRef.current;
    if (w) animateTo(frameCamp(drawRef.current, w, h));
  };
  const zoomBy = (factor: number) => {
    const { w, h } = sizeRef.current;
    const v = viewRef.current;
    if (v) animateTo({ ...v, k: v.k * factor });
    else zoomAround({ x: w / 2, y: h / 2 }, factor);
  };

  const v = view;
  const { w, h } = size;
  const box: Bounds | null = v ? { minX: v.cx - w / 2 / v.k, minY: v.cy - h / 2 / v.k, maxX: v.cx + w / 2 / v.k, maxY: v.cy + h / 2 / v.k } : null;
  const ui = uiScale(w, h);
  const kGlyph = v ? v.k / ui : 1;
  // Cover is drawn at a zoom level rounded to a power of two, so pans and small zooms reuse it.
  const kCover = 2 ** Math.round(Math.log2(kGlyph));
  // Hachures show the ridge falling away on either side; where brush stands, the brush does.
  const hatch = useMemo(() => (v && box ? hachurePath(draw.segs.filter((s) => s.deadEnd || !BRUSH.has(s.terrain)), v.k, box) : ''), [draw, v?.k, v?.cx, v?.cy, w, h]);
  const coverArt = useMemo(() => (v ? cover(draw.segs, kCover, { minX: -Infinity, minY: -Infinity, maxX: Infinity, maxY: Infinity }) : null), [draw, kCover, !!v]);
  const sw = v ? hazeStep(v.k) : 1;
  const hb = box ? hazeBox(box, sw) : null;
  const hazeKey = hb ? `${sw}:${hb.minX}:${hb.minY}:${hb.maxX}:${hb.maxY}` : '';
  const fog = useMemo(() => (hb ? haze(draw, 7 / sw, hb) : null), [draw, hazeKey]);
  const text = useMemo(() => (v && box ? mapText(draw, v.k, kGlyph, box, ui) : null), [draw, v?.k, v?.cx, v?.cy, w, h]);

  return (
    <div class="map" ref={wrap}>
      <svg
        ref={svg}
        class="map-svg"
        width={w || 1}
        height={h || 1}
        viewBox={box ? `${f(box.minX)} ${f(box.minY)} ${f(box.maxX - box.minX)} ${f(box.maxY - box.minY)}` : '0 0 1 1'}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerEnd}
        onPointerCancel={onPointerEnd}
        role="img"
        aria-label="Map of the ridges explored so far"
      >
        {v && (
          <>
            {fog && (
              <g class="map-haze">
                <path d={fog.far} stroke-width={0.75 / v.k} />
                <path class="map-haze-edge" d={fog.edge} stroke-width={0.6 / v.k} />
              </g>
            )}
            <River k={v.k} />
            <path class="map-hachure" d={hatch} stroke-width={0.9 / v.k} />
            {coverArt && <Cover art={coverArt} k={v.k} />}
            {draw.segs.map((s) => (
              <Seg key={s.id} s={s} k={kGlyph} selected={selected === s.id} />
            ))}
            {draw.nodes.map((n) => (
              <Node key={n.id} n={n} k={kGlyph} selected={selected === n.id} />
            ))}
            <Markers draw={draw} k={kGlyph} target={target} moveTo={moveTo} />
            {text && <MapText text={text} k={v.k} />}
          </>
        )}
      </svg>
      <div class="map-overlay">
        <div class="map-north" aria-hidden="true">
          <svg viewBox="0 0 20 30" width="16" height="24">
            <path d="M10 2 L15 22 L10 18 L5 22 Z" class="north-arrow" />
          </svg>
          <span>N</span>
        </div>
        {v && <ScaleBar k={v.k} />}
        <SizeButtons size={mapSize} onSize={onSize} />
        <div class="map-buttons">
          <button type="button" class="map-btn" onClick={onKey} aria-label="Map key">
            Key
          </button>
          <button type="button" class="map-btn" onClick={() => zoomBy(1.6)} aria-label="Zoom in">
            +
          </button>
          <button type="button" class="map-btn" onClick={() => zoomBy(1 / 1.6)} aria-label="Zoom out">
            −
          </button>
          <button type="button" class="map-btn" onClick={recenter} aria-label="Show the camp">
            <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
              <circle cx="12" cy="12" r="6" class="btn-glyph" />
              <path d="M12 2v5M12 17v5M2 12h5M17 12h5" class="btn-glyph" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );
}

/** The Nepean, water-lined the way an engraver draws a river: two banks and a line down the middle. */
function River({ k }: { k: number }) {
  return (
    <g class="map-river">
      <path class="map-river-bank" d={NEPEAN} stroke-width={7 / k} />
      <path class="map-river-water" d={NEPEAN} stroke-width={4.4 / k} />
      <path class="map-river-line" d={NEPEAN} stroke-width={0.7 / k} />
      <text class="map-river-label" font-size={12 / k} transform={`translate(${f(0.52)} ${f(1.75)}) rotate(-84)`}>
        Nepean River
      </text>
    </g>
  );
}

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

function ScaleBar({ k }: { k: number }) {
  if (getUnits() === 'metric') {
    // k is pixels per mile; a kilometre is 0.6214 of one.
    const kkm = k / 1.60934;
    const options = [0.25, 0.5, 1, 2, 5, 10, 20];
    let km = options[0]!;
    for (const o of options) if (o * kkm <= 120) km = o;
    const px = km * kkm;
    const label = km < 1 ? `${km * 1000} m` : `${km} km`;
    return (
      <div class="map-scale" aria-label={`Scale: ${label}`}>
        <svg width={px + 2} height="10" aria-hidden="true">
          <path d={`M1 2 V8 H${px + 1} V2 M${px / 2 + 1} 5 V8`} class="scale-line" />
        </svg>
        <span>{label}</span>
      </div>
    );
  }
  const options = [0.25, 0.5, 1, 2, 4, 8, 16];
  let miles = options[0]!;
  for (const o of options) if (o * k <= 120) miles = o;
  const px = miles * k;
  const label = miles < 1 ? `${miles === 0.25 ? '¼' : '½'} mile` : `${miles} mile${miles > 1 ? 's' : ''}`;
  return (
    <div class="map-scale" aria-label={`Scale: ${label}`}>
      <svg width={px + 2} height="10" aria-hidden="true">
        <path d={`M1 2 V8 H${px + 1} V2 M${px / 2 + 1} 5 V8`} class="scale-line" />
      </svg>
      <span>
        {label} · {miles * 80} chains
      </span>
    </div>
  );
}

function Seg({ s, k, selected }: { s: SegDraw; k: number; selected: boolean }) {
  const px = (n: number) => n / k;
  const line = (a: P, b: P, cls: string, width: number, dash?: string) => (
    <line x1={f(a.x)} y1={f(a.y)} x2={f(b.x)} y2={f(b.y)} class={cls} stroke-width={px(width)} stroke-dasharray={dash} />
  );
  const out = [];
  if (selected) out.push(line(s.a, s.b, 'seg-selected', 12));
  if (s.deadEnd) {
    out.push(line(s.a, s.b, 'seg-dead', 1.4, `${px(2)} ${px(3)}`));
  } else {
    // A paper casing under the line keeps it readable where it runs through brush.
    out.push(line(s.a, s.b, 'seg-casing', 3.2));
    out.push(line(s.a, s.b, 'seg-seen', 1.3, `${px(1.5)} ${px(3.5)}`));
    if (s.marked > 0.001) out.push(line(s.a, lerp(s.a, s.b, s.marked), 'seg-marked', 1.8, `${px(6)} ${px(4)}`));
    if (s.open > 0.001) out.push(line(s.a, lerp(s.a, s.b, s.open), s.crossed ? 'seg-crossed' : 'seg-open', s.crossed ? 2.6 : 3.4, s.crossed ? `${px(0.1)} ${px(5)}` : undefined));
    if (s.lead && !s.farKnown) out.push(<circle cx={f(s.b.x)} cy={f(s.b.y)} r={px(4)} class="lead-end" stroke-width={px(1.4)} />);
  }
  return <g>{out}</g>;
}

function Node({ n, k, selected }: { n: NodeDraw; k: number; selected: boolean }) {
  const px = (v: number) => v / k;
  const at = (dx: number, dy: number) => `${f(n.p.x + px(dx))} ${f(n.p.y + px(dy))}`;
  const pt = (dx: number, dy: number): P => ({ x: n.p.x + px(dx), y: n.p.y + px(dy) });
  const out = [];
  if (selected) out.push(<circle cx={f(n.p.x)} cy={f(n.p.y)} r={px(15)} class="node-selected" stroke-width={px(3)} />);
  switch (n.feature) {
    case 'ford':
      out.push(<path class="glyph-water-line" stroke-width={px(1.5)} d={`M${at(-12, 9)}q${f(px(3))} ${f(px(-3))} ${f(px(6))} 0t${f(px(6))} 0t${f(px(6))} 0t${f(px(6))} 0M${at(-12, 14)}q${f(px(3))} ${f(px(-3))} ${f(px(6))} 0t${f(px(6))} 0t${f(px(6))} 0t${f(px(6))} 0`} />);
      break;
    case 'lookout':
      out.push(<path class="glyph-trig" stroke-width={px(1.4)} d={`M${at(0, -10)}L${at(8.5, 5)}L${at(-8.5, 5)}Z`} />);
      break;
    case 'precipice':
    case 'cliff': {
      // A dead end gets a short cliff line across its tip. The top of the pass gets the long one
      // across the range, broken where the way down is once it is found.
      const long = n.feature === 'cliff';
      const dir = long && n.passDir ? n.passDir : n.dir;
      const cl = cliffLine(pt(dir.x * 4, dir.y * 4), dir, px(1), long ? 26 : 11, long && n.passDir ? 3.2 : 0, n.id.length * 7 + 1);
      out.push(<path class="glyph-cliff-face" stroke-width={px(0.9)} d={cl.face} />, <path class="glyph-cliff" stroke-width={px(1.7)} d={cl.edge} />);
      if (long && n.trench) {
        const a = pt(dir.x * 2.5, dir.y * 2.5);
        const nx = -dir.y;
        const ny = dir.x;
        const steps: string[] = [];
        for (let i = 0; i < 3; i++) {
          const c0 = { x: a.x + dir.x * px(2.6 * i), y: a.y + dir.y * px(2.6 * i) };
          steps.push(`M${f(c0.x - nx * px(2.4))} ${f(c0.y - ny * px(2.4))}L${f(c0.x + nx * px(2.4))} ${f(c0.y + ny * px(2.4))}`);
        }
        out.push(<path class="glyph-trench" stroke-width={px(1.1)} d={steps.join('')} />);
      }
      break;
    }
    case 'rockStep':
      out.push(<path class={n.stepShifted ? 'glyph-step glyph-step-done' : 'glyph-step'} stroke-width={px(1.2)} d={`M${at(0, -12)}l${f(px(4))} ${f(px(4))}l${f(px(-4))} ${f(px(4))}l${f(px(-4))} ${f(px(-4))}Z`} />);
      break;
    case 'cairn':
      out.push(<path class="glyph-cairn" stroke-width={px(1)} d={`M${at(0, -14)}L${at(4.5, -5)}L${at(-4.5, -5)}Z`} />);
      break;
    case 'goal':
      out.push(<path class="glyph-goal" stroke-width={px(1.3)} d={`M${at(-13, 4)}Q${at(0, -18)} ${at(13, 4)}Z`} />);
      break;
  }
  // Water above the point, grass to its left, a cache below: the label goes to the right.
  if (n.feature !== 'ford') {
    if (n.water === 'swamp' || n.water === 'lagoon') {
      const m = swampMark(pt(0, -9.5), px(1), n.water === 'lagoon');
      out.push(<path class="glyph-pool" stroke-width={px(1)} d={m.pool} />, <path class="glyph-water-line" stroke-width={px(0.7)} d={m.lines} />, <path class="glyph-rush" stroke-width={px(0.8)} d={m.rushes} />);
    } else if (n.water === 'stream') {
      out.push(<path class="glyph-water-line" stroke-width={px(1.1)} d={streamMark(pt(0, -10), px(1))} />);
    } else if (n.water === 'rockHole') {
      const m = rockHoleMark(pt(0, -10), px(1));
      out.push(<path class="glyph-rock" stroke-width={px(0.9)} d={m.rock} />, <path class="glyph-rockhole" d={m.pool} />);
    }
  }
  if (n.grass === 'good' || n.grass === 'tall') out.push(<path class="glyph-grass" stroke-width={px(1.2)} d={grassMark(pt(-10, 4), px(1), n.grass === 'tall')} />);
  else if (n.grass === 'rushy') out.push(<path class="glyph-grass glyph-grass-rushy" stroke-width={px(1)} d={grassMark(pt(-9, 4), px(0.75), false)} />);
  if (n.cache) out.push(<rect x={f(n.p.x - px(3))} y={f(n.p.y + px(6))} width={f(px(6))} height={f(px(5))} class="glyph-cache" stroke-width={px(1.2)} />);
  if (n.horsesLeft) out.push(<path class="glyph-horse" stroke-width={px(1.6)} d={`M${at(-12, -5)}a${f(px(3))} ${f(px(3))} 0 1 1 ${f(px(6))} 0`} />);
  out.push(<circle cx={f(n.p.x)} cy={f(n.p.y)} r={px(n.reached ? 3 : 2.6)} class={n.reached ? 'node node-reached' : 'node'} stroke-width={px(1.2)} />);
  return <g>{out}</g>;
}

function Markers({ draw, k, target, moveTo }: { draw: MapDraw; k: number; target: string | null; moveTo: string | null }) {
  const px = (v: number) => v / k;
  const out = [];
  const move = moveTo ? draw.nodes.find((n) => n.id === moveTo) : undefined;
  if (move) out.push(<circle cx={f(move.p.x)} cy={f(move.p.y)} r={px(12)} class="move-ring" stroke-width={px(2)} stroke-dasharray={`${px(4)} ${px(3)}`} />);
  const t = targetPoint(draw, target);
  if (t) {
    const at = (dx: number, dy: number) => `${f(t.x + px(dx))} ${f(t.y + px(dy))}`;
    out.push(
      <g class="target-flag">
        <path d={`M${at(0, 0)}L${at(0, -18)}`} class="flag-pole" stroke-width={px(1.6)} />
        <path d={`M${at(0, -18)}L${at(11, -14)}L${at(0, -10)}Z`} class="flag-cloth" stroke-width={px(1)} />
      </g>,
    );
  }
  // The camp: a tent in ink with the smoke of its fire drifting off.
  const c = draw.camp;
  const at = (dx: number, dy: number) => `${f(c.x + px(dx))} ${f(c.y + px(dy))}`;
  out.push(
    <g class="camp-tent">
      <path d={`M${at(1.5, -16)}c${f(px(-2.4))} ${f(px(-3))} ${f(px(2.6))} ${f(px(-4.6))} ${f(px(0.6))} ${f(px(-8))}s${f(px(3.4))} ${f(px(-4.2))} ${f(px(1.8))} ${f(px(-7.6))}`} class="tent-smoke" stroke-width={px(1.2)} />
      <path d={`M${at(0, -15)}L${at(10.5, 1)}L${at(-10.5, 1)}Z`} class="tent" stroke-width={px(1.2)} />
      <path d={`M${at(0, -15)}L${at(-2.6, 1)}L${at(2.6, 1)}Z`} class="tent-door" />
    </g>,
  );
  return <g>{out}</g>;
}

// ---------------------------------------------------------------- words on the map

interface Text {
  labels: { x: number; y: number; anchor: string; text: string; size: number }[];
  hints: { x: number; y: number; text: string; size: number; wrong: boolean; strike?: [number, number, number] }[];
}

/**
 * Place labels and Lawson's pencilled readings in screen space, clear of each other and of the
 * marks, then hand back positions in map units.
 */
function mapText(draw: MapDraw, k: number, kGlyph: number, box: Bounds, ui: number): Text {
  const sx = (p: P) => (p.x - box.minX) * k;
  const sy = (p: P) => (p.y - box.minY) * k;
  const g = k / kGlyph;
  const W = (box.maxX - box.minX) * k;
  const H = (box.maxY - box.minY) * k;
  const inView = (x: number, y: number, m = 80) => x > -m && x < W + m && y > -m && y < H + m;
  const obstacles: (Rect & { owner?: string })[] = [];
  // The marks round each point, the camp and the flag.
  for (const n of draw.nodes) {
    const x = sx(n.p);
    const y = sy(n.p);
    if (!inView(x, y)) continue;
    obstacles.push({ x0: x - 12 * g, y0: y - 14 * g, x1: x + 6 * g, y1: y + 9 * g, owner: n.id });
  }
  const cx = sx(draw.camp);
  const cy = sy(draw.camp);
  obstacles.push({ x0: cx - 12 * g, y0: cy - 33 * g, x1: cx + 12 * g, y1: cy + 3 * g, owner: 'camp' });
  // The controls laid over the map: north arrow, size buttons, scale, and the zoom column.
  obstacles.push({ x0: 0, y0: 0, x1: 44, y1: 64 }, { x0: W - 132, y0: 0, x1: W, y1: 70 }, { x0: 0, y0: H - 48, x1: 176, y1: H }, { x0: W - 64, y0: H - 266, x1: W, y1: H });

  // Lawson's readings first: they belong beside their ridge, on whichever side is clear.
  const hintItems: LabelItem[] = [];
  const hintMeta = new Map<string, { wrong: boolean }>();
  for (const s of draw.segs) {
    if (!s.hint) continue;
    // A reading matters while the ridge is unexplored. Once someone has walked it, only a wrong
    // one stays, struck through: the dead end's cliff line already says when he was right.
    if (s.hintMark !== 'wrong' && (!s.lead || s.hintMark === 'right')) continue;
    const t = s.farKnown ? 0.5 : 0.6;
    const c = lerp(s.a, s.b, t);
    const x = sx(c);
    const y = sy(c);
    if (!inView(x, y, 40)) continue;
    const dx = sx(s.b) - sx(s.a);
    const dy = sy(s.b) - sy(s.a);
    const l = Math.max(Math.hypot(dx, dy), 1e-6);
    const nx = -dy / l;
    const ny = dx / l;
    const word = s.hint === 'fallsAway' ? 'falls away' : 'runs on';
    const text = s.hintMark ? word : `${word}?`;
    const size = 10.5 * g;
    const tw = text.length * size * 0.44 + 2;
    const off = 9 * g + Math.abs(nx) * tw * 0.5;
    const opt = (side: number) => {
      const ax = x + nx * off * side;
      const ay = y + ny * off * side + size * 0.35;
      return { x: ax, y: ay, anchor: 'middle' as const, box: { x0: ax - tw / 2, y0: ay - size * 0.8, x1: ax + tw / 2, y1: ay + size * 0.25 } };
    };
    hintItems.push({ id: s.id, text, size, options: [opt(ny <= 0 ? 1 : -1), opt(ny <= 0 ? -1 : 1)] });
    hintMeta.set(s.id, { wrong: s.hintMark === 'wrong' });
  }
  const frame: Rect = { x0: 4, y0: 4, x1: W - 4, y1: H - 4 };
  const placedHints = placeLabels(hintItems, obstacles, frame);
  const hints: Text['hints'] = [];
  for (const p of placedHints) {
    const meta = hintMeta.get(p.id)!;
    hints.push({
      x: box.minX + p.x / k,
      y: box.minY + p.y / k,
      text: p.text,
      size: p.size / k,
      wrong: meta.wrong,
      strike: meta.wrong ? [box.minX + p.box.x0 / k, box.minX + p.box.x1 / k, box.minY + (p.box.y0 + p.box.y1) / 2 / k] : undefined,
    });
    obstacles.push(p.box);
  }

  // Then the names: the camp's first, then the landmarks, then the rest nearest the camp first.
  const named = draw.nodes
    .map((n) => ({ n, text: mapLabel(n) }))
    .filter((x): x is { n: NodeDraw; text: string } => !!x.text && inView(sx(x.n.p), sy(x.n.p), 120));
  const rank = (n: NodeDraw) => (n.p.x === draw.camp.x && n.p.y === draw.camp.y ? 0 : n.feature ? 1 : 2);
  named.sort((a, b) => rank(a.n) - rank(b.n) || Math.hypot(a.n.p.x - draw.camp.x, a.n.p.y - draw.camp.y) - Math.hypot(b.n.p.x - draw.camp.x, b.n.p.y - draw.camp.y));
  const size = 13 * g;
  const items: LabelItem[] = named.map(({ n, text }) => {
    const x = sx(n.p);
    const y = sy(n.p);
    const tw = text.length * size * 0.45 + 3;
    const h = size;
    const mk = (ax: number, ay: number, anchor: 'start' | 'middle' | 'end') => {
      const x0 = anchor === 'start' ? ax : anchor === 'end' ? ax - tw : ax - tw / 2;
      return { x: ax, y: ay, anchor, box: { x0, y0: ay - h * 0.78, x1: x0 + tw, y1: ay + h * 0.25 } };
    };
    return {
      id: n.id,
      text,
      size,
      owner: n.id,
      optional: rank(n) === 2,
      options: [mk(x + 10 * g, y + 4.5 * g, 'start'), mk(x - 16 * g, y + 4.5 * g, 'end'), mk(x, y + 22 * g, 'middle'), mk(x, y - 18 * g, 'middle')],
    };
  });
  const placed = placeLabels(items, obstacles, frame);
  return {
    labels: placed.map((p) => ({ x: box.minX + p.x / k, y: box.minY + p.y / k, anchor: p.anchor, text: p.text, size: p.size / k })),
    hints,
  };
}

function MapText({ text, k }: { text: Text; k: number }) {
  return (
    <g>
      {text.hints.map((h) => (
        <g key={`${h.x}:${h.y}:${h.text}`} class={h.wrong ? 'map-hint map-hint-wrong' : 'map-hint'}>
          <text x={f(h.x)} y={f(h.y)} font-size={f(h.size)} text-anchor="middle" stroke-width={f(3 / k)}>
            {h.text}
          </text>
          {h.strike && <path class="map-hint-strike" d={`M${f(h.strike[0])} ${f(h.strike[2])}L${f(h.strike[1])} ${f(h.strike[2] - 1.5 / k)}`} stroke-width={f(1.4 / k)} />}
        </g>
      ))}
      {text.labels.map((l) => (
        <text key={`${l.text}:${l.x}`} x={f(l.x)} y={f(l.y)} class="map-label" font-size={f(l.size)} text-anchor={l.anchor} stroke-width={f(3.5 / k)}>
          {l.text}
        </text>
      ))}
    </g>
  );
}
