// The fork card: the scouts have run into a fork, and the player chooses which ridge to follow. The
// sheet never picks the branch: the target stays empty until a button here (or a ridge tapped on the
// map) chooses it.
import { useEffect, useRef } from 'preact/hooks';
import { forkBranches, lawsonsPick, modeTuning, type GameState, type Segment } from '../engine';

const POINTS8 = ['north', 'north-east', 'east', 'south-east', 'south', 'south-west', 'west', 'north-west'];

/** Bearing in degrees from a to b, clockwise from north, in map coordinates (x east, y north). */
function bearing(a: { x: number; y: number }, b: { x: number; y: number }): number {
  return ((Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI + 360) % 360;
}

export interface Branch {
  seg: Segment;
  /** A, B, C: top to bottom on the north-up sketch, as on the map. */
  letter: string;
  /** One of eight compass points. */
  dir: string;
  deg: number;
}

/** The fork's branches, lettered from the northernmost, each with a plain compass word. */
export function branchesAt(s: GameState, at: string): Branch[] {
  const from = s.map.nodes[at]!;
  return forkBranches(s, at)
    .map((seg) => {
      const deg = bearing(from, s.map.nodes[seg.b]!);
      return { seg, deg, dir: POINTS8[Math.round(deg / 45) % 8]! };
    })
    .sort((x, y) => Math.cos((y.deg * Math.PI) / 180) - Math.cos((x.deg * Math.PI) / 180))
    .map((b, i) => ({ ...b, letter: 'ABCDE'[i]! }));
}

function reading(seg: Segment): string {
  return seg.hint === 'runsOn' ? 'Lawson reads it as running on' : seg.hint === 'fallsAway' ? 'Lawson reads it as falling away to cliffs' : 'Lawson has not seen it';
}

/** What "Let Lawson choose" will do, said plainly. */
function lawsonLine(branches: Branch[], pick: string | null): string {
  const chosen = branches.find((b) => b.seg.id === pick);
  if (!chosen) return 'He picks a ridge.';
  const name = `ridge ${chosen.letter}`;
  const hints = branches.map((b) => b.seg.hint ?? null);
  if (hints.every((h) => h === null)) return `He has not seen these ridges, so he guesses: ${name}.`;
  if (hints.every((h) => h === hints[0])) return `His readings are the same ${branches.length === 2 ? 'both ways' : 'every way'}, so he guesses: ${name}.`;
  if (chosen.seg.hint === 'runsOn' && branches.filter((b) => b.seg.hint === 'runsOn').length === 1) return `He takes ${name}, the one he reads as running on.`;
  return `He takes ${name}, the likeliest by his readings.`;
}

/**
 * A small sketch of the fork, north up like the map: the trail in, each branch lettered, and
 * Lawson's pencilled reading. Branches that point almost the same way are spread apart so their
 * letters don't collide: a sketch, not to scale.
 */
function ForkSketch({ state, at, branches }: { state: GameState; at: string; branches: Branch[] }) {
  const map = state.map;
  const node = map.nodes[at]!;
  const parent = node.parentSeg ? map.nodes[map.segments[node.parentSeg]!.a]! : null;
  const angles = branches.map((b) => ({ b, deg: b.deg })).sort((x, y) => x.deg - y.deg);
  for (let pass = 0; pass < 6; pass++) {
    for (let i = 1; i < angles.length; i++) {
      const gap = angles[i]!.deg - angles[i - 1]!.deg;
      if (gap < 44) {
        angles[i - 1]!.deg -= (44 - gap) / 2;
        angles[i]!.deg += (44 - gap) / 2;
      }
    }
  }
  const len = 58;
  const pt = (deg: number, r: number): [number, number] => [r * Math.sin((deg * Math.PI) / 180), -r * Math.cos((deg * Math.PI) / 180)];
  const inDeg = parent ? bearing(node, parent) : 90;
  const tail = pt(inDeg, 64);
  // Bounds of everything drawn, the words estimated at 7.5 px a letter, for a snug view box.
  let minX = Math.min(0, tail[0]);
  let maxX = Math.max(0, tail[0]);
  let minY = Math.min(0, tail[1]);
  let maxY = Math.max(0, tail[1]);
  const marks = angles.map(({ b, deg }) => {
    const end = pt(deg, len);
    const tag = pt(deg, len + 15);
    const side = Math.sin((deg * Math.PI) / 180);
    const word = b.seg.hint === 'runsOn' ? 'runs on' : b.seg.hint === 'fallsAway' ? 'falls away' : 'not read';
    const wordW = word.length * 7.5;
    // The reading sits beside the letter, on the outward side.
    const wx = side < -0.25 ? tag[0] - 13 : side > 0.25 ? tag[0] + 13 : tag[0] + 13;
    const anchor = side < -0.25 ? 'end' : 'start';
    minX = Math.min(minX, tag[0] - 10, anchor === 'end' ? wx - wordW : wx);
    maxX = Math.max(maxX, tag[0] + 10, anchor === 'end' ? wx : wx + wordW);
    minY = Math.min(minY, tag[1] - 12);
    maxY = Math.max(maxY, tag[1] + 12);
    const a1 = pt(deg - 155, 8);
    const a2 = pt(deg + 155, 8);
    return { b, end, tag, wx, anchor, word, a1, a2 };
  });
  const pad = 8;
  const vb = `${minX - pad} ${minY - pad} ${maxX - minX + 2 * pad} ${maxY - minY + 2 * pad}`;
  return (
    <svg class="fork-sketch" viewBox={vb} role="img" aria-label={`A sketch of the fork: ${branches.map((b) => `ridge ${b.letter} runs ${b.dir}`).join(', ')}`}>
      <line x1={tail[0]} y1={tail[1]} x2={0} y2={0} stroke="var(--ink-2)" stroke-width="2.4" stroke-linecap="round" />
      {marks.map(({ b, end, tag, wx, anchor, word, a1, a2 }) => (
        <g key={b.seg.id}>
          <line x1={0} y1={0} x2={end[0]} y2={end[1]} stroke="var(--ink)" stroke-width="2" stroke-dasharray="1 5" stroke-linecap="round" />
          <polyline points={`${end[0] + a1[0]},${end[1] + a1[1]} ${end[0]},${end[1]} ${end[0] + a2[0]},${end[1] + a2[1]}`} fill="none" stroke="var(--ink)" stroke-width="1.6" stroke-linejoin="round" />
          <circle cx={tag[0]} cy={tag[1]} r="9.5" fill="var(--paper-3)" stroke="var(--ink)" stroke-width="1.3" />
          <text x={tag[0]} y={tag[1] + 4.5} text-anchor="middle" class="fork-letter">
            {b.letter}
          </text>
          <text x={wx} y={tag[1] + 4} text-anchor={anchor} class="fork-hint">
            {word}
          </text>
        </g>
      ))}
      <circle cx={0} cy={0} r="4.5" fill="var(--paper-3)" stroke="var(--ink)" stroke-width="1.6" />
    </svg>
  );
}

export function ForkCard({ state, at, onChoose, onMap }: { state: GameState; at: string; onChoose: (seg: string) => void; onMap: () => void }) {
  const branches = branchesAt(state, at);
  const pick = lawsonsPick(state, at);
  const first = useRef<HTMLButtonElement>(null);
  useEffect(() => first.current?.focus(), [at]);
  if (branches.length < 2) return null;
  const node = state.map.nodes[at]!;
  const read = branches.some((b) => b.seg.hint);
  const acc = Math.round(modeTuning(state.mode).hintAccuracy * 100);
  return (
    <div class="backdrop">
      <div class="event-card fork-card" role="dialog" aria-modal="true" aria-labelledby="fork-title" aria-describedby="fork-text">
        <ForkSketch state={state} at={at} branches={branches} />
        <h2 id="fork-title" class="display event-title">
          {node.label ? `A fork at ${node.label}` : 'A fork in the ridge'}
        </h2>
        <p id="fork-text" class="event-text">
          The ridge splits and the scouts need to know which way to go. Most ridges end at cliffs.{' '}
          {read ? `Lawson pencils a guess beside each ridge; he is right ${acc}% of the time.` : 'Lawson was not with the scouts, so neither ridge has his reading.'}
        </p>
        <div class="choices">
          {branches.map((b, i) => (
            <button key={b.seg.id} ref={i === 0 ? first : undefined} type="button" class="choice" onClick={() => onChoose(b.seg.id)}>
              <span class="choice-label">
                Ridge {b.letter}, running {b.dir}
              </span>
              <span class="choice-effect">{reading(b.seg)}.</span>
            </button>
          ))}
          <button type="button" class="choice" onClick={() => pick && onChoose(pick)}>
            <span class="choice-label">Let Lawson choose</span>
            <span class="choice-effect">{lawsonLine(branches, pick)}</span>
          </button>
        </div>
        <button type="button" class="link-btn fork-map" onClick={onMap}>
          Look at the map first
        </button>
      </div>
    </div>
  );
}
