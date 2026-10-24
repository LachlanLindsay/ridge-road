// The plan sheet: one half-day at a time. Pick a target on the map, move camp, set each man's task, Go.
import { useState } from 'preact/hooks';
import {
  T,
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
  type Task,
} from '../engine';
import { excessCache, grassOffer, huntOffer, overload, setTask, taskCounts, toPlan, withTarget, type Draft, type Offer } from './draft';
import { compass, hrs, itemText, lb, localize, mi, shortName } from './format';
import { Horses, Report, Roster, RunwayLines, Toggle } from './parts';
import { PlaceInfo } from './PlaceInfo';

interface Props {
  state: GameState;
  draft: Draft;
  setDraft: (d: Draft) => void;
  selected: string | null;
  setSelected: (id: string | null) => void;
  onGo: () => void;
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
    return `${b.reached ? 'The ridge' : 'The unscouted ridge'} running ${dir} ${where}`;
  }
  const n = map.nodes[id]!;
  if (n.id === map.goal && n.reached) return 'The sugarloaf hill';
  if (n.feature === 'pass' && n.reached) return 'The cliff line: search for a way down';
  return n.label ?? `A point ${mi(pathMiles(map, stepsToTarget(map, state.camp, n.id)))} along the trail`;
}

/** "Swamp head · water for men and horses · rushy grass": what a night at this camp offers. */
function campNote(n: GameState['map']['nodes'][string]): string {
  const water =
    n.water === 'none' ? (n.gullyFt ? 'no water up here, a gully for the men' : 'no water') : n.water === 'rockHole' ? 'rock-hole water for the men only' : 'water for men and horses';
  const grass = n.grass === 'none' ? 'no feed for horses' : n.grass === 'rushy' ? 'half feed (rushy grass)' : `full feed (${n.grass} grass)`;
  return `${n.label ?? 'an unnamed camp'} · ${water} · ${grass}`;
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
  const dew = state.phase === 'morning' ? state.today.dewStart : 0;
  const halfName = state.phase === 'morning' ? 'Morning' : 'Afternoon';

  const set = (patch: Partial<Draft>) => setDraft({ ...draft, ...patch });
  const give = (m: Member, t: Task) => setDraft(setTask(state, draft, m, t));
  const grassCutters = state.men.filter((m) => draft.tasks[m.id] === 'grass');
  const campNode = state.map.nodes[state.camp]!;
  const sugNode = suggestion ? state.map.nodes[suggestion]! : null;
  const sugNote = sugNode ? campNote(sugNode) : '';
  const cuttersIdle = !home && !resting && advanceOk && !draft.advance && (counts.cut ?? 0) > 0 && ahead < 0.3;

  const [dismissed, setDismissed] = useState<string[]>([]);
  const offers = [grassOffer(state, draft), huntOffer(state, draft)].filter((o): o is Offer => !!o && !dismissed.includes(`${draft.key}:${o.id}`));

  const offerList = offers.map((o) => (
    <div class="offer" key={o.id}>
      <p>{o.text}</p>
      <div class="offer-actions">
        <button type="button" class="btn btn-small" onClick={() => setDraft(o.apply(draft))}>
          {o.action}
        </button>
        <button type="button" class="link-btn" onClick={() => setDismissed([...dismissed, `${draft.key}:${o.id}`])}>
          Not now
        </button>
      </div>
    </div>
  ));

  const summary = Object.entries(counts)
    .map(([t, n]) => `${n} ${t === 'scout' ? 'scouting' : t === 'cut' ? 'cutting' : t === 'camp' ? 'minding camp' : t === 'water' ? 'fetching water' : t === 'hunt' ? 'hunting' : t === 'grass' ? 'cutting grass' : 'resting'}`)
    .join(', ');

  return (
    <div class="sheet-inner">
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
            setDraft(withTarget(state, draft, id));
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
            <RunwayLines state={state} night={state.camp} />
            {offerList}
            <Toggle id="halt" checked={draft.halt} onChange={(v) => set({ halt: v })} label="Halt here this half" note="Stay at this camp to rest, hunt, cut grass or fetch water." />
            {draft.halt && <Roster state={state} draft={draft} onSet={give} />}
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
                    Moves {moveSteps ? `${mi(pathMiles(state.map, moveSteps))} ` : ''}to {campNote(state.map.nodes[draft.moveTo]!)}, {hrs(moveH)} with the horses.{' '}
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
                    <span class="plan-note">to {sugNote}</span>
                  </>
                ) : resting ? (
                  'Stays put: a rest day. The men can still hunt, cut grass or fetch water.'
                ) : (
                  reach.size > 1 ? 'Stays put. Tap a point on the red path to move camp there.' : 'Stays put: there is no cleared path to move along yet.'
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
            <RunwayLines state={state} night={draft.moveTo ?? state.camp} />
            {offerList}
            <Roster state={state} draft={draft} onSet={give} />
            {summary && <p class="plan-line">{summary}.</p>}
            {grassCutters.length > 0 && (campNode.grass === 'good' || campNode.grass === 'tall') && (
              <p class="plan-line">
                {grassCutters.map((m) => shortName(m.name)).join(' and ')} cut{grassCutters.length === 1 ? 's' : ''} grass here to feed the horses at the dry camps ahead: {lb(T.horses.night.grassLbPerHorse)} a horse a night.
              </p>
            )}
            {cuttersIdle && <p class="plan-line is-warn">Camp stays here and nothing is marked ahead, so the cutters will have no work. Tick "Push on with the horses", or send a leader to scout.</p>}
          </>
        )}

        {warnings.length > 0 && (
          <ul class="warnings">
            {warnings.map((w) => (
              <li key={w.code + w.text} class={w.level === 'error' ? 'is-error' : 'is-warn'}>
                {localize(w.text)}
              </li>
            ))}
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
