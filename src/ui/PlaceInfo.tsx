// What the player knows about the point or ridge they tapped, and what they can do with it.
import {
  T,
  horseReach,
  moveHours,
  pathMiles,
  regionSpec,
  stepsToTarget,
  validTarget,
  type GameState,
  type MapNode,
} from '../engine';
import { GRASS_LABEL, TERRAIN_LABEL, hrs, itemText, mi, num, waterLabel } from './format';

interface Props {
  state: GameState;
  id: string;
  planning: boolean;
  target: string | null;
  moveTo: string | null;
  hoursLeft: number;
  onTarget: (id: string) => void;
  onMove: (id: string | null) => void;
  onClose: () => void;
}

const FEATURE_TEXT: Record<string, string> = {
  ford: 'The Nepean ford. Home is back across the river.',
  lookout: 'A lookout. In clear weather it shows the ridges within two miles.',
  cairn: 'A cairn of stones left by an earlier party that turned back here.',
  goal: 'The sugarloaf hill, beyond the range. Bring the whole party here, then turn for home.',
};

export function PlaceInfo({ state, id, planning, target, moveTo, hoursLeft, onTarget, onMove, onClose }: Props) {
  const map = state.map;
  const node = map.nodes[id];
  const seg = map.segments[id];
  const rows: [string, string][] = [];
  let title = '';
  let note: string | null = null;
  const actions = [];
  const isTarget = target === id;

  if (node) {
    const reached = node.reached;
    title = reached ? (node.label ?? (node.id === state.camp ? 'Camp' : 'A point on the ridge')) : 'A point seen from a lookout';
    if (node.feature === 'precipice' && (reached || map.segments[node.parentSeg ?? '']?.deadEnd)) {
      title = 'Precipice';
      note = 'The ridge ends in cliffs. A dead end.';
    } else if (node.feature === 'pass' && reached) {
      const pass = node.childSegs.map((c) => map.segments[c]!).find((g) => g.pass);
      note = pass?.found
        ? 'The way down the cliffs. Horses go down only once the trench is dug, unloaded, with the men carrying the packs.'
        : `Cliffs drop to open forest below. Scouts searching the cliff line for ${T.obstacles.passSearchScoutHours} scout-hours may find a way down.`;
    } else if (node.feature === 'rockStep' && reached) {
      const done = (node.stepHours ?? 0) >= T.obstacles.rockStepWorkerHours - 1e-6;
      note = done
        ? 'A rock step across the ridge. The stones are shifted; horses can pass.'
        : `A rock step blocks the horses until cutters spend ${T.obstacles.rockStepWorkerHours} worker-hours shifting the stones.`;
    } else if (node.feature && reached) note = FEATURE_TEXT[node.feature] ?? null;
    if (reached) {
      rows.push(['Water', waterLabel(node.water, node.gullyFt)]);
      rows.push(['Grass', GRASS_LABEL[node.grass]]);
    }
    rows.push(['Region', regionSpec(node.region).name]);
    if (node.id !== state.camp) {
      const steps = stepsToTarget(map, state.camp, node.id);
      rows.push(['By the trail', `${mi(pathMiles(map, steps))} from camp`]);
    }
    const cache = state.caches[node.id];
    if (cache && Object.keys(cache).length) {
      rows.push([
        'Left here',
        Object.entries(cache)
          .map(([k, v]) => itemText(k, v ?? 0))
          .join(', '),
      ]);
    }
    const left = state.horses.filter((h) => h.leftAt === node.id).map((h) => h.name);
    if (left.length) rows.push(['Horses left here', left.join(', ')]);

    if (planning && state.leg === 'out') {
      if (node.id !== state.camp && validTarget(state, node.id) && !(node.feature === 'precipice' && reached)) {
        actions.push(
          <button type="button" class={isTarget ? 'btn btn-quiet is-on' : 'btn'} onClick={() => onTarget(node.id)} disabled={isTarget}>
            {isTarget ? 'Working toward here' : passAction(state, node, reached)}
          </button>,
        );
      }
      const steps = horseReach(map, state.camp, state.stores).get(node.id);
      if (node.id !== state.camp && steps) {
        const h = moveHours(state, steps);
        if (moveTo === node.id) {
          actions.push(
            <button type="button" class="btn btn-quiet is-on" onClick={() => onMove(null)}>
              Camp moves here · {hrs(h)} · undo
            </button>,
          );
        } else {
          actions.push(
            <button type="button" class="btn" onClick={() => onMove(node.id)} disabled={h > hoursLeft + 1e-6}>
              {h > hoursLeft + 1e-6 ? `Too far to move camp this half (${hrs(h)})` : `Move camp here · ${hrs(h)}`}
            </button>,
          );
        }
      }
    }
  } else if (seg) {
    const far = map.nodes[seg.b]!;
    const farKnown = seg.farKnown && far.known;
    title = seg.deadEnd ? 'Dead end' : far.reached ? 'Ridge' : 'Ridge not yet scouted';
    rows.push(['Cover', `${TERRAIN_LABEL[seg.terrain]}${T.terrain[seg.terrain].passable ? ', horses can pass' : ', must be cleared for horses'}`]);
    rows.push(['Length', farKnown ? mi(seg.miles) : 'Not yet known']);
    const marked = seg.crossed ? seg.miles : seg.markedMiles;
    if (marked > 0.01) rows.push(['Marked', farKnown ? `${mi(seg.markedMiles)} of ${mi(seg.miles)}` : mi(seg.markedMiles)]);
    if (!T.terrain[seg.terrain].passable && seg.clearedMiles > 0.01) rows.push(['Cleared', mi(seg.clearedMiles)]);
    if (seg.crossed && seg.markedMiles < seg.miles - 0.01) rows.push(['Trail', 'Crossed without blazing: slow going on the way home']);
    if (seg.pass) {
      const need = state.stores.hoe > 0 ? T.obstacles.trenchWorkerHoursHoe : T.obstacles.trenchWorkerHoursNoHoe;
      rows.push(['Trench', (seg.trenchHours ?? 0) >= need - 1e-6 ? 'Dug' : `${num(seg.trenchHours ?? 0)} of ${need} worker-hours`]);
    }
    if (seg.hint) {
      const said = seg.hint === 'fallsAway' ? 'the ridge falls away ahead' : 'the ridge runs on';
      const verdict = seg.hintResolved ? (seg.hintRight ? ' He was right.' : ' He was wrong.') : '';
      note = `Lawson reckons ${said}.${verdict}`;
    }
    if (seg.deadEnd) note = 'This branch ends in cliffs.';
    if (planning && state.leg === 'out' && !seg.deadEnd && validTarget(state, seg.id)) {
      actions.push(
        <button type="button" class={isTarget ? 'btn btn-quiet is-on' : 'btn'} onClick={() => onTarget(seg.id)} disabled={isTarget}>
          {isTarget ? 'Working this way' : 'Work this way'}
        </button>,
      );
    }
  } else return null;

  return (
    <section class="place" aria-label="Selected place">
      <div class="place-head">
        <h3 class="display">{title}</h3>
        <button type="button" class="icon-btn" onClick={onClose} aria-label="Close">
          ×
        </button>
      </div>
      {note && <p class="place-note">{note}</p>}
      <dl class="facts">
        {rows.map(([k, v]) => (
          <div key={k}>
            <dt>{k}</dt>
            <dd>{v}</dd>
          </div>
        ))}
      </dl>
      {actions.length > 0 && <div class="place-actions">{actions}</div>}
    </section>
  );
}

/** The target button at the cliff line: search until the pass is found, dig until the trench is done. */
function passAction(state: GameState, node: MapNode, reached: boolean): string {
  if (node.feature !== 'pass' || !reached) return 'Work toward here';
  const pass = node.childSegs.map((c) => state.map.segments[c]!).find((g) => g.pass);
  if (!pass?.found) return 'Search the cliffs here';
  const need = state.stores.hoe > 0 ? T.obstacles.trenchWorkerHoursHoe : T.obstacles.trenchWorkerHoursNoHoe;
  return (pass.trenchHours ?? 0) >= need - 1e-6 ? 'Work toward here' : 'Dig the trench here';
}
