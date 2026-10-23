// How much of a phone screen the map takes: a strip, the usual share, or nearly all of it. Only the
// stacked phone layout uses this; wide screens keep the map beside the plan.
import type { RefObject } from 'preact';
import { useRef } from 'preact/hooks';

export type MapSize = 'min' | 'mid' | 'max';

const KEY = 'ridge-road.map-size.v1';
/** Shares of the space below the top bar, as in styles.css. */
const SHARE = { min: 0.22, mid: 0.55 };
/** Plan left showing when the map is at its largest, in rem, as in styles.css. */
const PEEK_REM = 9.5;

export function readMapSize(): MapSize {
  try {
    const v = localStorage.getItem(KEY);
    return v === 'min' || v === 'max' ? v : 'mid';
  } catch {
    return 'mid';
  }
}

export function writeMapSize(m: MapSize) {
  try {
    localStorage.setItem(KEY, m);
  } catch {
    // A convenience only.
  }
}

const LABEL: Record<MapSize, string> = {
  min: 'Shrink the map to a strip',
  mid: 'Restore the map',
  max: 'Make the map fill the screen',
};

function Glyph({ to }: { to: MapSize }) {
  return (
    <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
      {to === 'min' && <path d="M6 17h12" class="btn-glyph" />}
      {to === 'max' && <rect x="5" y="5" width="14" height="14" rx="1.5" class="btn-glyph" />}
      {to === 'mid' && (
        <>
          <path d="M9 8V5.5h9.5V15H16" class="btn-glyph" />
          <rect x="5.5" y="8" width="10.5" height="10.5" rx="1.5" class="btn-glyph" />
        </>
      )}
    </svg>
  );
}

/** Window-style buttons on the map: the two sizes it is not at now, smaller first. */
export function SizeButtons({ size, onSize }: { size: MapSize; onSize: (m: MapSize) => void }) {
  const others = (['min', 'mid', 'max'] as MapSize[]).filter((m) => m !== size);
  return (
    <div class="map-size">
      {others.map((m) => (
        <button key={m} type="button" class="map-btn" onClick={() => onSize(m)} aria-label={LABEL[m]} title={LABEL[m]}>
          <Glyph to={m} />
        </button>
      ))}
    </div>
  );
}

interface Drag {
  id: number;
  y0: number;
  h0: number;
  total: number;
  lo: number;
  hi: number;
  h: number;
  moved: boolean;
  /** Recent pointer positions, for the flick. */
  trail: { y: number; t: number }[];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/**
 * The handle between map and plan. Drag it to resize; it settles on the nearest of the three sizes,
 * or the next one along after a flick. A tap switches between the strip and the usual size.
 */
export function Grip({ size, onSize, play }: { size: MapSize; onSize: (m: MapSize) => void; play: RefObject<HTMLDivElement> }) {
  const drag = useRef<Drag | null>(null);
  const dragged = useRef(false);

  const heights = (total: number) => {
    const rem = parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;
    return { min: total * SHARE.min, mid: total * SHARE.mid, max: Math.max(total * SHARE.mid, total - PEEK_REM * rem) };
  };

  const setRows = (h: number | null) => {
    const el = play.current;
    if (el) el.style.gridTemplateRows = h === null ? '' : `auto ${Math.round(h)}px auto minmax(0, 1fr)`;
  };

  const onPointerDown = (e: PointerEvent) => {
    const el = play.current;
    const map = el?.querySelector<HTMLElement>('.map');
    const sheet = el?.querySelector<HTMLElement>('.sheet');
    if (!map || !sheet) return;
    const h0 = map.getBoundingClientRect().height;
    const total = h0 + sheet.getBoundingClientRect().height;
    const d = heights(total);
    drag.current = { id: e.pointerId, y0: e.clientY, h0, total, lo: d.min, hi: d.max, h: h0, moved: false, trail: [{ y: e.clientY, t: e.timeStamp }] };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    const dy = e.clientY - d.y0;
    if (!d.moved && Math.abs(dy) < 6) return;
    d.moved = true;
    d.h = clamp(d.h0 + dy, d.lo, d.hi);
    d.trail.push({ y: e.clientY, t: e.timeStamp });
    if (d.trail.length > 5) d.trail.shift();
    setRows(d.h);
  };

  const finish = (e: PointerEvent, cancelled: boolean) => {
    const d = drag.current;
    if (!d || d.id !== e.pointerId) return;
    drag.current = null;
    setRows(null);
    if (!d.moved || cancelled) return;
    dragged.current = true;
    const first = d.trail[0]!;
    const last = d.trail[d.trail.length - 1]!;
    const v = last.t > first.t ? (last.y - first.y) / (last.t - first.t) : 0;
    // Where the handle would come to rest, carried on by a flick.
    const rest = d.h + clamp(v, -3, 3) * 160;
    const hs = heights(d.total);
    const best = (['min', 'mid', 'max'] as MapSize[]).reduce((a, b) => (Math.abs(hs[b] - rest) < Math.abs(hs[a] - rest) ? b : a));
    onSize(best);
  };

  const onClick = () => {
    if (dragged.current) {
      dragged.current = false;
      return;
    }
    onSize(size === 'min' ? 'mid' : 'min');
  };

  return (
    <button
      type="button"
      class="grip"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={(e) => finish(e, false)}
      onPointerCancel={(e) => finish(e, true)}
      onClick={onClick}
      aria-label={size === 'min' ? 'Map shown as a strip. Tap to restore it, or drag to resize' : 'Tap to shrink the map to a strip, or drag to resize'}
    >
      <span class="grip-pill" aria-hidden="true" />
    </button>
  );
}
