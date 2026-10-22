// The plan sheet: one half-day at a time. Pick a target on the map, move camp, set each man's task, Go.
import { useState } from 'preact/hooks';
import {
  canAdvance,
  capacity,
  horseReach,
  hoursAvailable,
  loadLb,
  markedAhead,
  moveHours,
  pathMiles,
  stepsToTarget,
  suggestCampMove,
  validatePlan,
  type GameState,
  type Member,
} from '../engine';
import { excessCache, overload, tapTask, taskCounts, toPlan, type Draft } from './draft';
import { compass, hrs, itemText, lb, mi } from './format';
import { Horses, Report, Roster, Toggle } from './parts';
import { PlaceInfo } from './PlaceInfo';
import { readFlag, writeFlag } from './save';

const COACH_KEY = 'ridge-road.coach.v1';

/** For a first expedition: what the screen is for, until the player says they have it. */
function Coach({ onDone }: { onDone: () => void }) {
  return (
    <aside class="coach" aria-label="Getting started">
      <p class="coach-title display">Your first day</p>
      <ul>
        <li>
          The plan below is ready. Press <strong>Go</strong> to work the morning, then the afternoon; then make camp for the night.
        </li>
        <li>Tap a man to change his job; press and hold him, or hover with a mouse, to read about him. Tap a ridge on the map to work there instead.</li>
        <li>
          <strong>Menu → How to play</strong> explains the rest, and <strong>Send feedback</strong> is there too.
        </li>
      </ul>
      <button type="button" class="btn btn-small" onClick={onDone}>
        Got it
      </button>
    </aside>
  );
}

interface Props {
  state: GameState;
  draft: Draft;
  setDraft: (d: Draft) => void;
  selected: string | null;
  setSelected: (id: string | null) => void;
  onGo: () => void;
}

function nodeName(state: GameState, id: string): string {
  const n = state.map.nodes[id]!;
  if (id === state.camp) return 'camp';
  return n.label ?? 'an unnamed point';
}

export function describeTarget(state: GameState, id: string | null): string {
  if (!id) return 'Nothing chosen. Tap a ridge on the map.';
  const map = state.map;
  const seg = map.segments[id];
  if (seg) {
    const a = map.nodes[seg.a]!;
    const b = map.nodes[seg.b]!;
    const dir = compass(a, b);
    const where = seg.a === state.camp ? 'from camp' : a.label ? `from ${a.label}` : `from a point ${mi(pathMiles(map, stepsToTarget(map, state.camp, a.id)))} out`;
    return `${b.reached ? 'The ridge' : 'The unexplored ridge'} running ${dir} ${where}`;
  }
  const n = map.nodes[id]!;
  if (n.id === map.goal && n.reached) return 'The sugarloaf hill';
  if (n.feature === 'pass' && n.reached) return 'The cliff line: search for a way down';
  return n.label ?? `A point ${mi(pathMiles(map, stepsToTarget(map, state.camp, n.id)))} along the trail`;
}

export function PlanSheet({ state, draft, setDraft, selected, setSelected, onGo }: Props) {
  const home = state.leg === 'home';
  const plan = toPlan(state, draft);
  const warnings = validatePlan(state, plan);
  const errors = warnings.filter((w) => w.level === 'error');
  const hours = hoursAvailable(state);
  const reach = horseReach(state.map, state.camp, state.stores);
  const moveSteps = draft.moveTo ? reach.get(draft.moveTo) : undefined;
  const moveH = moveSteps ? moveHours(state, moveSteps) : 0;
  const resting = !home && state.restToday;
  const over = home ? 0 : overload(state);
  const leave = over > 0 ? excessCache(state) : null;
  const canMove = over <= 1e-6 || !!draft.cache;
  const suggestion = !home && !resting && canMove && draft.target ? suggestCampMove(state, draft.target) : null;
  const sugSteps = suggestion ? reach.get(suggestion) : undefined;
  const sugH = sugSteps ? moveHours(state, sugSteps) : 0;
  const sugMiles = sugSteps ? pathMiles(state.map, sugSteps) : 0;
  const from = draft.moveTo ?? state.camp;
  const advanceOk = !home && !resting && canMove && !!draft.target && canAdvance(state, from, draft.target);
  const counts = taskCounts(state, draft);
  const ahead = !home && draft.target ? markedAhead(state, from, draft.target) : 0;
  const idleCutters = !home && !!draft.target && !counts.scout && !advanceOk && (counts.cut ?? 0) > 0 && ahead < 0.3 && draft.target !== state.map.goal;
  const dew = state.phase === 'morning' ? state.today.dewStart : 0;
  const halfName = state.phase === 'morning' ? 'Morning' : 'Afternoon';

  const [coach, setCoach] = useState(() => !readFlag(COACH_KEY));
  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const cycle = (m: Member) => setDraft(tapTask(state, draft, m));

  const summary = Object.entries(counts)
    .map(([t, n]) => `${n} ${t === 'scout' ? 'scouting' : t === 'cut' ? 'cutting' : t === 'camp' ? 'minding camp' : t === 'water' ? 'fetching water' : t === 'hunt' ? 'hunting' : t === 'grass' ? 'cutting grass' : 'resting'}`)
    .join(', ');

  return (
    <div class="sheet-inner">
      {coach && state.day === 1 && state.leg === 'out' && (
        <Coach
          onDone={() => {
            writeFlag(COACH_KEY);
            setCoach(false);
          }}
        />
      )}
      <Report lines={state.today.log} />
      {selected && (
        <PlaceInfo
          state={state}
          id={selected}
          planning={true}
          target={draft.target}
          moveTo={draft.moveTo}
          hoursLeft={hours}
          onTarget={(id) => {
            set({ target: id, advance: canAdvance(state, draft.moveTo ?? state.camp, id) });
            setSelected(null);
          }}
          onMove={(id) => set({ moveTo: id, advance: draft.target ? canAdvance(state, id ?? state.camp, draft.target) : false })}
          onClose={() => setSelected(null)}
        />
      )}
      <section class="plan" aria-label={`${halfName} plan`}>
        <header class="plan-head">
          <h2 class="display">{home ? `Homeward, ${halfName.toLowerCase()}` : halfName}</h2>
          <span class="plan-hours">
            {hrs(hours)} of daylight work
            {dew > 0 ? ' after the dew' : ''}
            {state.restToday ? ': a rest day' : ''}
          </span>
        </header>

        {home ? (
          <>
            <p class="plan-line">The party follows its own trail back toward the Nepean. Blazed ground goes at the horses' pace; ground crossed without blazing is slow.</p>
            <Toggle id="halt" checked={draft.halt} onChange={(v) => set({ halt: v })} label="Halt here this half" note="Stay at this camp to rest, hunt, cut grass or fetch water." />
            {draft.halt && <Roster state={state} draft={draft} onCycle={cycle} />}
          </>
        ) : (
          <>
            <div class="plan-row">
              <span class="plan-key">Work toward</span>
              <span class="plan-val">{describeTarget(state, draft.target)}</span>
            </div>
            {over > 0 && (
              <div class="notice">
                {!leave ? (
                  'The horses are too weak to carry anything. Rest them at a camp with grass and water, or turn back.'
                ) : draft.cache ? (
                  <>
                    Leaving{' '}
                    {Object.entries(draft.cache)
                      .map(([k, v]) => itemText(k, v ?? 0))
                      .join(', ')}{' '}
                    here, to collect on the way home.{' '}
                    <button type="button" class="link-btn" onClick={() => set({ cache: undefined, moveTo: null, advance: false })}>
                      Keep it all
                    </button>
                  </>
                ) : (
                  <>
                    The horses can carry {lb(capacity(state, true))} and the party has {lb(loadLb(state.stores))}. To move camp, leave{' '}
                    {Object.entries(leave)
                      .map(([k, v]) => itemText(k, v ?? 0))
                      .join(', ')}{' '}
                    here.{' '}
                    <button type="button" class="btn btn-small" onClick={() => set({ cache: leave })}>
                      Leave it here
                    </button>
                  </>
                )}
              </div>
            )}
            <div class="plan-row">
              <span class="plan-key">Camp</span>
              <span class="plan-val">
                {draft.moveTo ? (
                  <>
                    Moves to {nodeName(state, draft.moveTo)}, {hrs(moveH)} with the horses.{' '}
                    <button type="button" class="link-btn" onClick={() => set({ moveTo: null, advance: draft.target ? canAdvance(state, state.camp, draft.target) : false })}>
                      Stay instead
                    </button>
                  </>
                ) : suggestion ? (
                  <>
                    Stays put.{' '}
                    <button
                      type="button"
                      class="btn btn-small"
                      onClick={() => set({ moveTo: suggestion, advance: draft.target ? canAdvance(state, suggestion, draft.target) : false })}
                    >
                      Move camp forward {mi(sugMiles)} · {hrs(sugH)}
                    </button>
                  </>
                ) : resting ? (
                  'Stays put: a rest day. The men can still hunt, cut grass or fetch water.'
                ) : (
                  'Stays put. Tap a point on the red path to move camp there.'
                )}
              </span>
            </div>
            {advanceOk && (
              <Toggle
                id="advance"
                checked={draft.advance}
                onChange={(v) => set({ advance: v })}
                label="Push on with the horses"
                note="Open ground ahead. The whole party moves on with the horses, blazing as it goes, then works from the new camp."
              />
            )}
            {advanceOk && draft.advance && (
              <Toggle id="blaze" checked={draft.blaze} onChange={(v) => set({ blaze: v })} label="Blaze the trail as you go" note="Unblazed ground is quicker now and slow on the way home." />
            )}
            <Roster state={state} draft={draft} onCycle={cycle} />
            {summary && <p class="plan-line">{summary}.</p>}
          </>
        )}

        {(warnings.length > 0 || idleCutters) && (
          <ul class="warnings">
            {warnings.map((w) => (
              <li key={w.code + w.text} class={w.level === 'error' ? 'is-error' : 'is-warn'}>
                {w.text}
              </li>
            ))}
            {idleCutters && <li class="is-warn">Little is marked ahead, so the cutters will run out of work. Send a leader to scout.</li>}
          </ul>
        )}
        <Horses state={state} />
      </section>
      <div class="sheet-foot">
        <button type="button" class="btn btn-go" onClick={onGo} disabled={errors.length > 0}>
          {home && !draft.halt ? 'Travel on' : 'Go'}
        </button>
      </div>
    </div>
  );
}
