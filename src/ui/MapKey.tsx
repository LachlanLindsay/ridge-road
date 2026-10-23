// The map key: every mark on the survey plot, drawn by the same code that draws the map.
import type { ComponentChildren } from 'preact';
import type { Terrain } from '../engine';
import type { SegDraw } from './geometry';
import { cliffLine, cover, grassMark, rockHoleMark, streamMark, swampMark } from './mapArt';
import { Cover } from './MapView';
import { Sheet } from './Sheet';

const EVERYWHERE = { minX: -1e9, minY: -1e9, maxX: 1e9, maxY: 1e9 };

/** A ridge across the sample, 48 by 20, in pixels. */
function ridge(terrain: Terrain, open: number): SegDraw {
  return { id: `key-${terrain}-${open}`, a: { x: 1, y: 10 }, b: { x: 47, y: 10 }, farKnown: true, open, marked: 0, crossed: false, deadEnd: false, deadRoot: false, lead: false, pass: false, terrain, passable: terrain !== 'scrub' && terrain !== 'rocky' };
}

function CoverOf({ terrain, open = 0 }: { terrain: Terrain; open?: number }) {
  return <Cover art={cover([ridge(terrain, open)], 1, EVERYWHERE)} k={1} />;
}

function Row({ glyph, children }: { glyph: ComponentChildren; children: ComponentChildren }) {
  return (
    <li>
      <svg viewBox="0 0 48 20" width="48" height="20" aria-hidden="true">
        {glyph}
      </svg>
      <span>{children}</span>
    </li>
  );
}

const seen = <line x1="2" y1="10" x2="46" y2="10" class="seg-seen" stroke-width="1.3" stroke-dasharray="1.5 3.5" />;

export function MapKey({ onClose }: { onClose: () => void }) {
  const deadCliff = cliffLine({ x: 40, y: 10 }, { x: 1, y: 0 }, 1, 8);
  const passCliff = cliffLine({ x: 22, y: 9 }, { x: 0, y: 1 }, 1, 20, 3.2, 3);
  const pool = swampMark({ x: 24, y: 11 }, 1.5);
  const hole = rockHoleMark({ x: 24, y: 10 }, 1.4);
  return (
    <Sheet title="Map key" onClose={onClose}>
      <h3 class="section-title">The road and the ridges</h3>
      <ul class="key">
        <Row
          glyph={
            <>
              <CoverOf terrain="scrub" open={1} />
              <line x1="2" y1="10" x2="46" y2="10" class="seg-open" stroke-width="3.4" />
            </>
          }
        >
          Cleared path: the horses can walk here. Where it runs through brush, the brush is cut back either side
        </Row>
        <Row
          glyph={
            <>
              <CoverOf terrain="scrub" />
              <line x1="2" y1="10" x2="46" y2="10" class="seg-casing" stroke-width="3.2" />
              <line x1="2" y1="10" x2="46" y2="10" class="seg-marked" stroke-width="1.8" stroke-dasharray="6 4" />
            </>
          }
        >
          Marked trail: the scouts have cut marks on the trees ("blazed" it), but the brush is not cleared for horses yet
        </Row>
        <Row
          glyph={
            <>
              <CoverOf terrain="scrub" />
              <line x1="2" y1="10" x2="46" y2="10" class="seg-casing" stroke-width="3.2" />
              {seen}
            </>
          }
        >
          Brush: thick scrub the cutters must clear before the horses can pass
        </Row>
        <Row
          glyph={
            <>
              <CoverOf terrain="rocky" />
              <line x1="2" y1="10" x2="46" y2="10" class="seg-casing" stroke-width="3.2" />
              {seen}
            </>
          }
        >
          Rock: stones to shift before the horses can pass
        </Row>
        <Row
          glyph={
            <>
              <CoverOf terrain="openForest" />
              {seen}
            </>
          }
        >
          Open forest: the horses can walk through once it is marked
        </Row>
        <Row
          glyph={
            <>
              <CoverOf terrain="heath" />
              {seen}
            </>
          }
        >
          Heath: low, open scrub the horses can cross
        </Row>
        <Row
          glyph={
            <>
              <CoverOf terrain="swamp" />
              {seen}
            </>
          }
        >
          Swamp: wet ground, slow for the horses but passable
        </Row>
        <Row glyph={seen}>A ridge seen from a distance; nobody has walked it</Row>
        <Row
          glyph={
            <>
              <line x1="2" y1="10" x2="40" y2="10" class="seg-seen" stroke-width="1.3" stroke-dasharray="1.5 3.5" />
              <circle cx="42" cy="10" r="4" class="lead-end" stroke-width="1.4" />
            </>
          }
        >
          An unexplored ridge: the party doesn’t know where it goes yet
        </Row>
        <Row glyph={<line x1="2" y1="10" x2="46" y2="10" class="seg-crossed" stroke-width="2.6" stroke-dasharray="0.1 5" />}>Walked without marking the trees: slow to find again on the way home</Row>
        <Row
          glyph={
            <>
              <line x1="2" y1="10" x2="38" y2="10" class="seg-dead" stroke-width="1.4" stroke-dasharray="2 3" />
              <path d={deadCliff.face} class="glyph-cliff-face" stroke-width="0.9" />
              <path d={deadCliff.edge} class="glyph-cliff" stroke-width="1.7" />
            </>
          }
        >
          Dead end: the ridge breaks off in cliffs (the journals say a precipice)
        </Row>
        <Row
          glyph={
            <>
              <path d={passCliff.face} class="glyph-cliff-face" stroke-width="0.9" />
              <path d={passCliff.edge} class="glyph-cliff" stroke-width="1.7" />
              <path d="M19.6 13 L24.4 13 M19.6 15.6 L24.4 15.6" class="glyph-trench" stroke-width="1.1" />
            </>
          }
        >
          The cliff line across the range, broken where the scouts find a way down; the red steps are the trench dug for the horses
        </Row>
        <Row
          glyph={
            <g class="map-haze">
              <path d="M2 4H20M24 4H46M6 8.5H38M2 13H14M18 13H46M10 17.5H42" stroke-width="0.8" />
            </g>
          }
        >
          Haze: country the party hasn’t seen yet
        </Row>
      </ul>
      <h3 class="section-title">Camps and places</h3>
      <ul class="key">
        <Row
          glyph={
            <g class="camp-tent">
              <path d="M25.5 3.2c-1.6 -1.4 1.8 -2.2 0.4 -3.8" class="tent-smoke" stroke-width="1.1" />
              <path d="M24 4 L33 18 L15 18 Z" class="tent" stroke-width="1.2" />
              <path d="M24 4 L21.8 18 L26.2 18 Z" class="tent-door" />
            </g>
          }
        >
          Camp
        </Row>
        <Row
          glyph={
            <>
              <path d="M22 19 L22 2" class="flag-pole" stroke-width="1.6" />
              <path d="M22 2 L33 6 L22 10 Z" class="flag-cloth" stroke-width="1" />
            </>
          }
        >
          The flag: where the scouts and cutters are working today
        </Row>
        <Row
          glyph={
            <>
              <path d="M24 2 L32 16 L16 16 Z" class="glyph-trig" stroke-width="1.4" />
              <circle cx="24" cy="12" r="2.5" class="node node-reached" stroke-width="1" />
            </>
          }
        >
          Lookout: a high point with a view, drawn the way surveyors mark one
        </Row>
        <Row
          glyph={
            <>
              <path d={pool.pool} class="glyph-pool" stroke-width="1" />
              <path d={pool.lines} class="glyph-water-line" stroke-width="0.8" />
              <path d={pool.rushes} class="glyph-rush" stroke-width="0.9" />
            </>
          }
        >
          Swamp head: water for men and horses
        </Row>
        <Row glyph={<path d={streamMark({ x: 24, y: 9 }, 1.3)} class="glyph-water-line" stroke-width="1.2" />}>Stream: water for men and horses</Row>
        <Row
          glyph={
            <>
              <path d={hole.rock} class="glyph-rock" stroke-width="0.9" />
              <path d={hole.pool} class="glyph-rockhole" />
            </>
          }
        >
          Rock hole: a pool in the rock, enough for the men but not the horses
        </Row>
        <Row glyph={<path d={grassMark({ x: 22, y: 16 }, 1.6, true)} class="glyph-grass" stroke-width="1.3" />}>Good grass for the horses</Row>
        <Row glyph={<rect x="20" y="6" width="8" height="7" class="glyph-cache" stroke-width="1.2" />}>Supplies left here to pick up on the way home</Row>
      </ul>
      <h3 class="section-title">Lawson’s readings</h3>
      <ul class="key">
        <Row
          glyph={
            <g class="map-hint">
              <text x="24" y="14" font-size="10.5" text-anchor="middle" stroke-width="3">
                falls away?
              </text>
            </g>
          }
        >
          Pencilled beside a ridge nobody has walked: Lawson’s guess whether it runs on or falls away to cliffs. He is right about three times in four
        </Row>
        <Row
          glyph={
            <g class="map-hint map-hint-wrong">
              <text x="24" y="14" font-size="10.5" text-anchor="middle" stroke-width="3">
                runs on
              </text>
              <path d="M8 10.5 L40 9" class="map-hint-strike" stroke-width="1.4" />
            </g>
          }
        >
          Struck through in red: the ridge proved his guess wrong
        </Row>
      </ul>
      <p class="fine">Ticks along a ridge show the ground falling away on either side. Distances on the map are as the crow flies; the trail along a winding ridge is longer. Drag to move the map, use + and − or the mouse wheel to zoom, and the target button to find the camp again.</p>
    </Sheet>
  );
}
