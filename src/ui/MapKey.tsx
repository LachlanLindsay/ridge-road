// The map key: every mark on the survey plot, drawn by the same code that draws the map. The whole
// key opens as a sheet; the legend docked on the map shows only the marks in view right now.
import { Fragment, type ComponentChildren } from 'preact';
import type { Terrain } from '../engine';
import type { Bounds, MapDraw, NodeDraw, P, SegDraw } from './geometry';
import { BRUSH, cliffLine, cover, rockHoleMark, streamMark, swampMark } from './mapArt';
import { Cover, FeedDot, feedOf, leadArrow } from './mapMarks';
import { Sheet } from './Sheet';

const EVERYWHERE = { minX: -1e9, minY: -1e9, maxX: 1e9, maxY: 1e9 };

/** A ridge across the sample, 48 by 20, in pixels. */
function ridge(terrain: Terrain, open: number): SegDraw {
  return { id: `key-${terrain}-${open}`, a: { x: 1, y: 10 }, b: { x: 47, y: 10 }, farKnown: true, open, marked: 0, crossed: false, deadEnd: false, deadRoot: false, lead: false, pass: false, terrain, passable: terrain !== 'scrub' && terrain !== 'rocky' };
}

function CoverOf({ terrain, open = 0 }: { terrain: Terrain; open?: number }) {
  return <Cover art={cover([ridge(terrain, open)], 1, EVERYWHERE)} k={1} />;
}

const seen = <line x1="2" y1="10" x2="46" y2="10" class="seg-seen" stroke-width="1.3" stroke-dasharray="1.5 3.5" />;
const casing = <line x1="2" y1="10" x2="46" y2="10" class="seg-casing" stroke-width="3.2" />;

function dot(grass: NodeDraw['grass'], reached = true) {
  return <FeedDot n={{ p: { x: 24, y: 10 }, reached, grass }} k={0.75} />;
}

/** What is on the screen now, for the docked legend. */
export interface InView {
  draw: MapDraw;
  box: Bounds;
  target: boolean;
  moveTo: boolean;
}

interface Entry {
  id: string;
  section: 'road' | 'places' | 'lawson';
  glyph: () => ComponentChildren;
  /** The whole key's wording. */
  text: string;
  /** The docked legend's wording: a few words. */
  short: string;
  shown: (v: InView, segs: SegDraw[], nodes: NodeDraw[]) => boolean;
  /** Left out of the docked legend: marks that explain themselves or are always there. */
  undocked?: true;
}

const always = () => true;

const ENTRIES: Entry[] = [
  {
    id: 'road',
    section: 'road',
    glyph: () => (
      <>
        <CoverOf terrain="scrub" open={1} />
        <line x1="2" y1="10" x2="46" y2="10" class="seg-open" stroke-width="3.4" />
      </>
    ),
    text: 'Cleared path: the horses can walk here. Where it runs through brush, the brush is cut back either side',
    short: 'Cleared path: horses can walk it',
    shown: (_, segs) => segs.some((s) => s.open > 0.001 && !s.crossed && !s.deadEnd),
  },
  {
    id: 'marked',
    section: 'road',
    glyph: () => (
      <>
        <CoverOf terrain="scrub" />
        {casing}
        <line x1="2" y1="10" x2="46" y2="10" class="seg-marked" stroke-width="1.8" stroke-dasharray="6 4" />
      </>
    ),
    text: 'Marked trail: the scouts have cut marks on the trees ("blazed" it), but the brush is not cleared for horses yet',
    short: 'Marked trail, not yet cleared',
    shown: (_, segs) => segs.some((s) => s.marked > s.open + 0.001 && !s.deadEnd),
  },
  {
    id: 'unwalked',
    section: 'road',
    glyph: () => seen,
    text: 'Dotted: a ridge nobody has walked yet',
    short: 'Dotted: nobody has walked it',
    shown: (_, segs) => segs.some((s) => s.marked < 0.999 && s.open < 0.999 && !s.deadEnd),
  },
  {
    id: 'lead',
    section: 'road',
    glyph: () => (
      <>
        <line x1="2" y1="10" x2="36" y2="10" class="seg-seen" stroke-width="1.3" stroke-dasharray="1.5 3.5" />
        <path d={leadArrow({ x: 2, y: 10 }, { x: 38, y: 10 }, (n) => n * 1.1)} class="lead-end" stroke-width="1.6" />
      </>
    ),
    text: 'Arrow at the end: the ridge runs on into country the party hasn’t seen. Scout it to find out where it goes',
    short: 'Arrow: runs on, unknown beyond',
    shown: (_, segs) => segs.some((s) => s.lead && !s.farKnown && !s.deadEnd),
  },
  {
    id: 'brush',
    section: 'road',
    glyph: () => (
      <>
        <CoverOf terrain="scrub" />
        {casing}
        {seen}
      </>
    ),
    text: 'Brush: thick scrub the cutters must clear before the horses can pass',
    short: 'Brush: cut before horses pass',
    shown: (_, segs) => segs.some((s) => BRUSH.has(s.terrain) && !s.deadEnd),
  },
  {
    id: 'rock',
    section: 'road',
    glyph: () => (
      <>
        <CoverOf terrain="rocky" />
        {casing}
        {seen}
      </>
    ),
    text: 'Rock: stones to shift before the horses can pass',
    short: 'Rock: shift before horses pass',
    shown: (_, segs) => segs.some((s) => s.terrain === 'rocky' && !s.deadEnd),
  },
  {
    id: 'openForest',
    section: 'road',
    glyph: () => (
      <>
        <CoverOf terrain="openForest" />
        {seen}
      </>
    ),
    text: 'Open forest: the horses can walk through once it is marked',
    short: 'Open forest: horses can pass',
    shown: (_, segs) => segs.some((s) => s.terrain === 'openForest'),
  },
  {
    id: 'heath',
    section: 'road',
    glyph: () => (
      <>
        <CoverOf terrain="heath" />
        {seen}
      </>
    ),
    text: 'Heath: low, open scrub the horses can cross',
    short: 'Heath: horses can pass',
    shown: (_, segs) => segs.some((s) => s.terrain === 'heath'),
  },
  {
    id: 'swampGround',
    section: 'road',
    glyph: () => (
      <>
        <CoverOf terrain="swamp" />
        {seen}
      </>
    ),
    text: 'Swamp: wet ground, slow for the horses but passable',
    short: 'Swamp ground: slow but passable',
    shown: (_, segs) => segs.some((s) => s.terrain === 'swamp'),
  },
  {
    id: 'meadow',
    section: 'road',
    glyph: () => (
      <>
        <CoverOf terrain="meadow" />
        {seen}
      </>
    ),
    text: 'Meadow: open grass country beyond the range',
    short: 'Meadow: open grass country',
    shown: (_, segs) => segs.some((s) => s.terrain === 'meadow'),
  },
  {
    id: 'crossed',
    section: 'road',
    glyph: () => <line x1="2" y1="10" x2="46" y2="10" class="seg-crossed" stroke-width="2.6" stroke-dasharray="0.1 5" />,
    text: 'Walked without marking the trees: slow to find again on the way home',
    short: 'Walked unmarked: slow going home',
    shown: (_, segs) => segs.some((s) => s.crossed),
  },
  {
    id: 'dead',
    section: 'road',
    glyph: () => {
      const c = cliffLine({ x: 40, y: 10 }, { x: 1, y: 0 }, 1, 8);
      return (
        <>
          <line x1="2" y1="10" x2="38" y2="10" class="seg-dead" stroke-width="1.4" stroke-dasharray="2 3" />
          <path d={c.face} class="glyph-cliff-face" stroke-width="0.9" />
          <path d={c.edge} class="glyph-cliff" stroke-width="1.7" />
        </>
      );
    },
    text: 'Dead end: the ridge breaks off in cliffs (the journals say a precipice)',
    short: 'Dead end: cliffs',
    shown: (_, segs) => segs.some((s) => s.deadEnd),
  },
  {
    id: 'cliffLine',
    section: 'road',
    glyph: () => {
      const c = cliffLine({ x: 22, y: 9 }, { x: 0, y: 1 }, 1, 20, 3.2, 3);
      return (
        <>
          <path d={c.face} class="glyph-cliff-face" stroke-width="0.9" />
          <path d={c.edge} class="glyph-cliff" stroke-width="1.7" />
          <path d="M19.6 13 L24.4 13 M19.6 15.6 L24.4 15.6" class="glyph-trench" stroke-width="1.1" />
        </>
      );
    },
    text: 'The cliff line across the range, broken where the scouts find a way down; the red steps are the trench dug for the horses',
    short: 'Cliff line; the gap is the way down',
    shown: (_, __, nodes) => nodes.some((n) => n.feature === 'cliff'),
  },
  {
    id: 'haze',
    section: 'road',
    glyph: () => (
      <g class="map-haze">
        <path d="M2 4H20M24 4H46M6 8.5H38M2 13H14M18 13H46M10 17.5H42" stroke-width="0.8" />
      </g>
    ),
    text: 'Haze: country the party hasn’t seen yet',
    short: 'Haze: not seen yet',
    undocked: true,
    shown: always,
  },
  {
    id: 'camp',
    section: 'places',
    glyph: () => (
      <g class="camp-tent">
        <path d="M25.5 3.2c-1.6 -1.4 1.8 -2.2 0.4 -3.8" class="tent-smoke" stroke-width="1.1" />
        <path d="M24 4 L33 18 L15 18 Z" class="tent" stroke-width="1.2" />
        <path d="M24 4 L21.8 18 L26.2 18 Z" class="tent-door" />
      </g>
    ),
    text: 'Camp',
    short: 'Camp',
    undocked: true,
    shown: (v) => inBox(v.box, v.draw.camp),
  },
  {
    id: 'flag',
    section: 'places',
    glyph: () => (
      <>
        <path d="M22 19 L22 2" class="flag-pole" stroke-width="1.6" />
        <path d="M22 2 L33 6 L22 10 Z" class="flag-cloth" stroke-width="1" />
      </>
    ),
    text: 'The flag: where the scouts and cutters are working today',
    short: 'Flag: today’s work',
    undocked: true,
    shown: (v) => v.target,
  },
  {
    id: 'move',
    section: 'places',
    glyph: () => <circle cx="24" cy="10" r="7.5" class="move-ring" stroke-width="1.5" stroke-dasharray="3 2.4" />,
    text: 'Dashed ring: where the camp moves to this half-day',
    short: 'Dashed ring: camp moves here',
    shown: (v) => v.moveTo,
  },
  {
    id: 'feedFull',
    section: 'places',
    glyph: () => dot('good'),
    text: 'Full feed: good grass. With water, the horses gain condition overnight',
    short: 'Full feed: good grass',
    shown: (_, __, nodes) => nodes.some((n) => n.reached && n.feature !== 'precipice' && feedOf(n.grass) === 'full'),
  },
  {
    id: 'feedHalf',
    section: 'places',
    glyph: () => dot('rushy'),
    text: 'Half feed: rushy grass. The horses still lose a little each night unless they are fed cut grass',
    short: 'Half feed: rushy, horses weaken',
    shown: (_, __, nodes) => nodes.some((n) => n.reached && n.feature !== 'precipice' && feedOf(n.grass) === 'half'),
  },
  {
    id: 'feedNone',
    section: 'places',
    glyph: () => dot('none'),
    text: 'No feed: the horses lose condition fast. Carry cut grass from a full-feed camp',
    short: 'No feed: carry cut grass',
    shown: (_, __, nodes) => nodes.some((n) => n.reached && (n.feature === 'precipice' || feedOf(n.grass) === 'none')),
  },
  {
    id: 'unseenPoint',
    section: 'places',
    glyph: () => dot(undefined, false),
    text: 'A point seen from a lookout: nobody has been there, so its water and grass aren’t known',
    short: 'Seen from afar: grass unknown',
    shown: (_, __, nodes) => nodes.some((n) => !n.reached),
  },
  {
    id: 'swampHead',
    section: 'places',
    glyph: () => {
      const m = swampMark({ x: 24, y: 11 }, 1.5);
      return (
        <>
          <path d={m.pool} class="glyph-pool" stroke-width="1" />
          <path d={m.lines} class="glyph-water-line" stroke-width="0.8" />
          <path d={m.rushes} class="glyph-rush" stroke-width="0.9" />
        </>
      );
    },
    text: 'Swamp head or lagoon: water for men and horses',
    short: 'Swamp water: men and horses',
    shown: (_, __, nodes) => nodes.some((n) => n.feature !== 'ford' && (n.water === 'swamp' || n.water === 'lagoon')),
  },
  {
    id: 'stream',
    section: 'places',
    glyph: () => <path d={streamMark({ x: 24, y: 9 }, 1.3)} class="glyph-water-line" stroke-width="1.2" />,
    text: 'Stream: water for men and horses',
    short: 'Stream: men and horses',
    shown: (_, __, nodes) => nodes.some((n) => n.feature !== 'ford' && n.water === 'stream'),
  },
  {
    id: 'rockHole',
    section: 'places',
    glyph: () => {
      const m = rockHoleMark({ x: 24, y: 10 }, 1.4);
      return (
        <>
          <path d={m.rock} class="glyph-rock" stroke-width="0.9" />
          <path d={m.pool} class="glyph-rockhole" />
        </>
      );
    },
    text: 'Rock hole: a pool in the rock, enough for the men but not the horses',
    short: 'Rock hole: men only',
    shown: (_, __, nodes) => nodes.some((n) => n.water === 'rockHole'),
  },
  {
    id: 'lookout',
    section: 'places',
    glyph: () => <path d="M24 2 L32 16 L16 16 Z" class="glyph-trig" stroke-width="1.4" />,
    text: 'Lookout: a high point with a view, drawn the way surveyors mark one',
    short: 'Lookout',
    shown: (_, __, nodes) => nodes.some((n) => n.feature === 'lookout'),
  },
  {
    id: 'cache',
    section: 'places',
    glyph: () => <rect x="20" y="6" width="8" height="7" class="glyph-cache" stroke-width="1.2" />,
    text: 'Supplies left here to pick up on the way home',
    short: 'Supplies left for the way home',
    shown: (_, __, nodes) => nodes.some((n) => n.cache),
  },
  {
    id: 'horsesLeft',
    section: 'places',
    glyph: () => <path d="M19 14a5 5 0 1 1 10 0" class="glyph-horse" stroke-width="1.8" />,
    text: 'A horse left behind here, too weak to go on. It may be found grazing on the way home',
    short: 'Horse left here',
    shown: (_, __, nodes) => nodes.some((n) => n.horsesLeft > 0),
  },
  {
    id: 'hint',
    section: 'lawson',
    glyph: () => (
      <g class="map-hint">
        <text x="24" y="14" font-size="10.5" text-anchor="middle" stroke-width="3">
          falls away?
        </text>
      </g>
    ),
    text: 'Pencilled beside a ridge nobody has walked: Lawson’s guess whether it runs on or falls away to cliffs. He is right about three times in four',
    short: 'Lawson’s guess, in pencil',
    shown: (_, segs) => segs.some((s) => !!s.hint && s.lead && !s.hintMark),
  },
  {
    id: 'hintWrong',
    section: 'lawson',
    glyph: () => (
      <g class="map-hint map-hint-wrong">
        <text x="24" y="14" font-size="10.5" text-anchor="middle" stroke-width="3">
          runs on
        </text>
        <path d="M8 10.5 L40 9" class="map-hint-strike" stroke-width="1.4" />
      </g>
    ),
    text: 'Struck through in red: the ridge proved his guess wrong',
    short: 'Struck through: Lawson was wrong',
    shown: (_, segs) => segs.some((s) => s.hintMark === 'wrong'),
  },
];

const SECTIONS: { id: Entry['section']; title: string }[] = [
  { id: 'road', title: 'The road and the ridges' },
  { id: 'places', title: 'Camps, feed and water' },
  { id: 'lawson', title: 'Lawson’s readings' },
];

function Glyph({ e, w = 48 }: { e: Entry; w?: number }) {
  return (
    <svg viewBox="0 0 48 20" width={w} height={(w * 20) / 48} aria-hidden="true">
      {e.glyph()}
    </svg>
  );
}

export function MapKey({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="Map key" onClose={onClose}>
      {SECTIONS.map((sec) => (
        <Fragment key={sec.id}>
          <h3 class="section-title">{sec.title}</h3>
          <ul class="key">
            {ENTRIES.filter((e) => e.section === sec.id).map((e) => (
              <li key={e.id}>
                <Glyph e={e} />
                <span>{e.text}</span>
              </li>
            ))}
          </ul>
        </Fragment>
      ))}
      <p class="fine">Ticks along a ridge show the ground falling away on either side. Distances on the map are as the crow flies; the trail along a winding ridge is longer. Drag to move the map, use + and − or the mouse wheel to zoom, and the target button to find the camp again.</p>
    </Sheet>
  );
}

function inBox(b: Bounds, p: P, m = 0): boolean {
  return p.x >= b.minX - m && p.x <= b.maxX + m && p.y >= b.minY - m && p.y <= b.maxY + m;
}

/** Which key entries are on the screen now, in key order. */
export function entriesInView(v: InView): string[] {
  const b = v.box;
  const segs = v.draw.segs.filter((s) => Math.max(s.a.x, s.b.x) >= b.minX && Math.min(s.a.x, s.b.x) <= b.maxX && Math.max(s.a.y, s.b.y) >= b.minY && Math.min(s.a.y, s.b.y) <= b.maxY);
  const nodes = v.draw.nodes.filter((n) => inBox(b, n.p));
  return ENTRIES.filter((e) => e.shown(v, segs, nodes)).map((e) => e.id);
}

/** The key docked on the map: only what is in view, a line each, beside the map rather than over it. */
export function MapLegend({ view, onWhole, onClose }: { view: InView; onWhole: () => void; onClose: () => void }) {
  const ids = new Set(entriesInView(view));
  const rows = ENTRIES.filter((e) => ids.has(e.id) && !e.undocked);
  return (
    <section class="map-legend" aria-label="Key to what is on the map">
      <div class="map-legend-head">
        <span class="display">On the map</span>
        <button type="button" class="icon-btn" onClick={onClose} aria-label="Hide the key">
          ×
        </button>
      </div>
      <ul class="map-legend-list">
        {rows.map((e) => (
          <li key={e.id}>
            <Glyph e={e} w={32} />
            <span>{e.short}</span>
          </li>
        ))}
      </ul>
      <button type="button" class="link-btn map-legend-all" onClick={onWhole}>
        The whole key
      </button>
    </section>
  );
}
