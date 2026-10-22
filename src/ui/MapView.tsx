// The survey plot: known ridges in ink with hachures, the cleared road in red, fog over the rest.
// Drag to pan, pinch or scroll to zoom, tap a point or a ridge to select it.
import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { getUnits } from './format';
import { distToSeg, hachurePath, lerp, targetPoint, type Bounds, type MapDraw, type NodeDraw, type P, type SegDraw } from './geometry';
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
/** The Nepean runs north past the ford, the one stretch of country the party already knows. */
const NEPEAN = 'M0.55 7.5 C0.35 6.2 0.05 5.4 0.2 4.3 S0.45 2.6 0.25 1.5 S0.02 0.4 0.14 -0.4 S0.4 -1.8 0.3 -3 S0.05 -4.6 0.2 -5.8 S0.5 -7 0.4 -8.5';
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
  const kGlyph = v ? v.k / uiScale(w, h) : 1;
  const hatch = useMemo(() => (v && box ? hachurePath(draw.segs, v.k, box) : ''), [draw, v?.k, v?.cx, v?.cy, w, h]);

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
            <path class="map-river" d={NEPEAN} stroke-width={2.4 / v.k} />
            <text class="map-river-label" font-size={12 / v.k} transform={`translate(${f(0.36)} ${f(1.7)}) rotate(-84)`}>
              Nepean River
            </text>
            <path class="map-hachure" d={hatch} stroke-width={1 / v.k} />
            {draw.segs.map((s) => (
              <Seg key={s.id} s={s} k={kGlyph} selected={selected === s.id} />
            ))}
            {draw.nodes.map((n) => (
              <Node key={n.id} n={n} k={kGlyph} selected={selected === n.id} />
            ))}
            <Markers draw={draw} k={kGlyph} target={target} moveTo={moveTo} />
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
    if (s.deadRoot) {
      const c = lerp(s.a, s.b, 0.4);
      const d = px(5);
      out.push(<path class="seg-cross" stroke-width={px(2)} d={`M${f(c.x - d)} ${f(c.y - d)}L${f(c.x + d)} ${f(c.y + d)}M${f(c.x - d)} ${f(c.y + d)}L${f(c.x + d)} ${f(c.y - d)}`} />);
    }
  } else {
    out.push(line(s.a, s.b, 'seg-seen', 1.3, `${px(1.5)} ${px(3.5)}`));
    if (s.marked > 0.001) out.push(line(s.a, lerp(s.a, s.b, s.marked), 'seg-marked', 1.8, `${px(6)} ${px(4)}`));
    if (s.open > 0.001) out.push(line(s.a, lerp(s.a, s.b, s.open), s.crossed ? 'seg-crossed' : 'seg-open', s.crossed ? 2.6 : 3.4, s.crossed ? `${px(0.1)} ${px(5)}` : undefined));
    if (s.lead && !s.farKnown) out.push(<circle cx={f(s.b.x)} cy={f(s.b.y)} r={px(4)} class="lead-end" stroke-width={px(1.4)} />);
  }
  if (s.hint) {
    const t = s.farKnown ? 0.5 : 0.62;
    const c = lerp(s.a, s.b, t);
    const dx = s.b.x - s.a.x;
    const dy = s.b.y - s.a.y;
    const l = Math.max(Math.hypot(dx, dy), 1e-6);
    const o = { x: c.x - (dy / l) * px(11), y: c.y + (dx / l) * px(11) };
    const cls = `hint hint-${s.hint}${s.hintMark ? ` hint-${s.hintMark}` : ''}`;
    // The arrow is Lawson's reading. Once the branch is known the ring says whether he was right:
    // green for right, red with a slash for wrong. (A cross is kept for dead ends only.)
    out.push(
      <g class={cls}>
        <circle cx={f(o.x)} cy={f(o.y)} r={px(7)} stroke-width={px(1.2)} />
        <text x={f(o.x)} y={f(o.y)} font-size={px(10)} text-anchor="middle" dominant-baseline="central">
          {s.hint === 'fallsAway' ? '↓' : '→'}
        </text>
        {s.hintMark === 'wrong' && <path class="hint-slash" stroke-width={px(1.6)} d={`M${f(o.x - px(6))} ${f(o.y + px(6))}L${f(o.x + px(6))} ${f(o.y - px(6))}`} />}
      </g>,
    );
  }
  return <g>{out}</g>;
}

function Node({ n, k, selected }: { n: NodeDraw; k: number; selected: boolean }) {
  const px = (v: number) => v / k;
  const at = (dx: number, dy: number) => `${f(n.p.x + px(dx))} ${f(n.p.y + px(dy))}`;
  const out = [];
  if (selected) out.push(<circle cx={f(n.p.x)} cy={f(n.p.y)} r={px(15)} class="node-selected" stroke-width={px(3)} />);
  const perp = { x: -n.dir.y, y: n.dir.x };
  const comb = (half: number) => {
    const base = { x: n.p.x + n.dir.x * px(3), y: n.p.y + n.dir.y * px(3) };
    let d = `M${f(base.x - perp.x * px(half))} ${f(base.y - perp.y * px(half))}L${f(base.x + perp.x * px(half))} ${f(base.y + perp.y * px(half))}`;
    for (let i = -half; i <= half + 0.01; i += 3) {
      const t = { x: base.x + perp.x * px(i), y: base.y + perp.y * px(i) };
      d += `M${f(t.x)} ${f(t.y)}l${f(n.dir.x * px(4.5))} ${f(n.dir.y * px(4.5))}`;
    }
    return <path d={d} class="glyph-cliff" stroke-width={px(1.6)} />;
  };
  switch (n.feature) {
    case 'ford':
      out.push(<path class="glyph-water-line" stroke-width={px(1.5)} d={`M${at(-12, 9)}q${f(px(3))} ${f(px(-3))} ${f(px(6))} 0t${f(px(6))} 0t${f(px(6))} 0t${f(px(6))} 0M${at(-12, 14)}q${f(px(3))} ${f(px(-3))} ${f(px(6))} 0t${f(px(6))} 0t${f(px(6))} 0t${f(px(6))} 0`} />);
      break;
    case 'lookout':
      out.push(<path class="glyph-trig" stroke-width={px(1.4)} d={`M${at(0, -10)}L${at(8.5, 5)}L${at(-8.5, 5)}Z`} />);
      break;
    case 'precipice':
      out.push(comb(8));
      break;
    case 'cliff':
      out.push(comb(14));
      break;
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
  if (n.water === 'swamp' || n.water === 'stream' || n.water === 'lagoon') out.push(<circle cx={f(n.p.x + px(8))} cy={f(n.p.y - px(7))} r={px(2.8)} class="glyph-water" />);
  else if (n.water === 'rockHole') out.push(<circle cx={f(n.p.x + px(8))} cy={f(n.p.y - px(7))} r={px(2.4)} class="glyph-rockhole" stroke-width={px(1.2)} />);
  if (n.grass === 'good' || n.grass === 'tall')
    out.push(<path class="glyph-grass" stroke-width={px(1.3)} d={`M${at(-12, 9)}l${f(px(-1.5))} ${f(px(-5))}M${at(-9.5, 9)}l0 ${f(px(-6))}M${at(-7, 9)}l${f(px(1.5))} ${f(px(-5))}`} />);
  else if (n.grass === 'rushy') out.push(<path class="glyph-grass glyph-grass-rushy" stroke-width={px(1.1)} d={`M${at(-11, 9)}l${f(px(-1))} ${f(px(-4))}M${at(-8, 9)}l${f(px(1))} ${f(px(-4))}`} />);
  if (n.cache) out.push(<rect x={f(n.p.x + px(6))} y={f(n.p.y + px(5))} width={f(px(6))} height={f(px(5))} class="glyph-cache" stroke-width={px(1.2)} />);
  if (n.horsesLeft) out.push(<path class="glyph-horse" stroke-width={px(1.6)} d={`M${at(-10, -5)}a${f(px(3))} ${f(px(3))} 0 1 1 ${f(px(6))} 0`} />);
  out.push(<circle cx={f(n.p.x)} cy={f(n.p.y)} r={px(n.reached ? 3 : 2.6)} class={n.reached ? 'node node-reached' : 'node'} stroke-width={px(1.2)} />);
  if (n.label)
    out.push(
      <text x={f(n.p.x + px(11))} y={f(n.p.y + px(4))} class="map-label" font-size={px(13)} stroke-width={px(3.5)}>
        {n.label}
      </text>,
    );
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
  const c = draw.camp;
  const at = (dx: number, dy: number) => `${f(c.x + px(dx))} ${f(c.y + px(dy))}`;
  out.push(
    <g class="camp-tent">
      <path d={`M${at(0, -17)}L${at(11, 1)}L${at(-11, 1)}Z`} class="tent" stroke-width={px(1.4)} />
      <path d={`M${at(0, -17)}L${at(0, 1)}`} class="tent-door" stroke-width={px(1.2)} />
    </g>,
  );
  return <g>{out}</g>;
}
