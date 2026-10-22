// Small pieces shared by the plan and camp sheets.
import { useContext, useState } from 'preact/hooks';
import { T, capacity, horseCapacity, isAway, loadLb, withParty, type GameState, type Horse, type Member, type Task } from '../engine';
import { CONDITION_LABEL, TASK_HINT, TASK_LABEL, lb, shortName } from './format';
import type { Draft } from './draft';
import { available } from './draft';
import { InfoContext, cardInLine, useInfo } from './Info';
import { infoFor } from './people';

export function Report({ lines, title = 'Report' }: { lines: string[]; title?: string }) {
  const [all, setAll] = useState(false);
  const api = useContext(InfoContext);
  if (!lines.length) return null;
  const shown = all ? lines : lines.slice(-4);
  return (
    <section class="report" aria-live="polite">
      <h3 class="section-title">{title}</h3>
      <ul>
        {shown.map((l, i) => {
          const card = api ? cardInLine(l) : null;
          return (
            <li key={`${i}:${l}`}>
              {card ? (
                <button type="button" class="link-btn link-inline report-card" onClick={() => api!.open({ kind: 'card', id: card })}>
                  {l} <span class="report-card-read">Read it</span>
                </button>
              ) : (
                l
              )}
            </li>
          );
        })}
      </ul>
      {lines.length > 4 && (
        <button type="button" class="link-btn" onClick={() => setAll(!all)}>
          {all ? 'Show less' : `Show all ${lines.length} lines`}
        </button>
      )}
    </section>
  );
}

export function Meter({ value, max = 100, tone }: { value: number; max?: number; tone?: 'low' | 'mid' | 'ok' }) {
  const pct = Math.max(0, Math.min(100, (value / max) * 100));
  const t = tone ?? (pct < 25 ? 'low' : pct < 50 ? 'mid' : 'ok');
  return (
    <span class={`meter meter-${t}`} aria-hidden="true">
      <i style={{ width: `${pct}%` }} />
    </span>
  );
}

export function RosterChip({ state, m, task, onTap }: { state: GameState; m: Member; task: Task; onTap: () => void }) {
  const avail = available(state, m);
  const off = avail === 'away' || avail === 'busy';
  const label = avail === 'away' ? 'Away' : avail === 'busy' ? 'Searching' : TASK_LABEL[task];
  const info = useInfo({ kind: 'man', id: m.id });
  return (
    <button
      type="button"
      class={`chip task-${off ? 'off' : task}`}
      {...info.props}
      onClick={() => {
        if (!info.held() && !off) onTap();
      }}
      aria-disabled={off}
      aria-label={`${m.name}${m.leader ? ', leader' : ''}, ${label}${m.condition ? `, ${CONDITION_LABEL[m.condition]}` : ''}. Stamina ${Math.round(m.stamina)}.${off ? '' : ' Tap to change the task.'} Press and hold for his card.`}
    >
      <span class="chip-name">{shortName(m.name)}</span>
      <span class="chip-task">{label}</span>
      <span class={m.condition ? 'chip-hint is-warn' : 'chip-hint'}>
        {m.leader ? 'Leader, ' : ''}
        {off ? (avail === 'away' ? 'not back yet' : 'out after the hunter') : m.condition ? CONDITION_LABEL[m.condition].toLowerCase() : TASK_HINT[task]}
      </span>
      <Meter value={m.stamina} />
    </button>
  );
}

export function Roster({ state, draft, onCycle }: { state: GameState; draft: Draft; onCycle: (m: Member) => void }) {
  return (
    <>
      <div class="roster" role="group" aria-label="The party's tasks">
        {state.men.map((m) => (
          <RosterChip key={m.id} state={state} m={m} task={draft.tasks[m.id] ?? 'camp'} onTap={() => onCycle(m)} />
        ))}
      </div>
      <p class="roster-hint">
        <span class="hint-touch">Tap a man to change his task; press and hold to read about him.</span>
        <span class="hint-mouse">Click a man to change his task; hover to read about him.</span>
      </p>
    </>
  );
}

function horseState(h: Horse): string {
  if (h.leftAt?.startsWith('lost:')) return 'lost';
  if (h.leftAt) return 'left behind';
  if (h.condition < T.horses.exhaustedBelow) return 'exhausted';
  if (h.condition < T.horses.weakBelow) return 'weak';
  return '';
}

function HorseRow({ state, h }: { state: GameState; h: Horse }) {
  const info = useInfo({ kind: 'horse', id: h.id }, 'tap');
  const note = horseState(h) || `${Math.round(h.condition)}`;
  return (
    <button type="button" class={`horse${withParty(h) ? '' : ' horse-gone'}`} {...info.props} aria-label={`${h.name}, ${note}. Open his card.`}>
      <span class="horse-name">{h.name}</span>
      <Meter value={withParty(h) ? h.condition : 0} />
      <span class="horse-note">{note}</span>
    </button>
  );
}

export function Horses({ state }: { state: GameState }) {
  const load = loadLb(state.stores);
  const cap = capacity(state);
  const over = load > cap + 1e-6;
  return (
    <section class="horses" aria-label="Horses">
      <div class="horses-list">
        {state.horses.map((h) => (
          <HorseRow key={h.id} state={state} h={h} />
        ))}
      </div>
      <p class={over ? 'horses-load is-over' : 'horses-load'}>
        Carrying {lb(load)} of {lb(cap)}
        {over ? `: ${lb(load - cap)} over the limit` : ''}
        {state.horses.some((h) => withParty(h) && horseCapacity(h) < T.horses.capacityLb) ? ' (weak horses carry less)' : ''}
      </p>
    </section>
  );
}

/** A man in a list: his name, his trait, his stamina and how he is. A tap opens his card. */
export function ManRow({ state, m, full = false }: { state: GameState; m: Member; full?: boolean }) {
  const info = useInfo({ kind: 'man', id: m.id }, 'tap');
  const card = infoFor({ kind: 'man', id: m.id }, state);
  const cond = isAway(state, m) ? 'Away' : m.condition ? CONDITION_LABEL[m.condition] : full ? `Stamina ${Math.round(m.stamina)}` : `${Math.round(m.stamina)}`;
  return (
    <button type="button" class={full ? 'man man-full' : 'man'} {...info.props} aria-label={`${m.name}${m.leader ? ', leader' : ''}: ${card.trait}. ${cond}. Open his card.`}>
      <span class="man-name">
        {full ? m.name : shortName(m.name)}
        <span class="man-trait">
          {full && m.leader ? 'Leader · ' : ''}
          {card.trait}
        </span>
      </span>
      <Meter value={m.stamina} />
      <span class={m.condition || isAway(state, m) ? 'man-cond is-warn' : 'man-cond'}>{cond}</span>
    </button>
  );
}

/** The dogs in a list: a tap opens their card. */
export function DogsRow({ state }: { state: GameState }) {
  const info = useInfo({ kind: 'dogs', count: state.dogs }, 'tap');
  return (
    <button type="button" class="man dogs-row" {...info.props} aria-label={`The dogs: ${state.dogs}. Open their card.`}>
      <span class="man-name">
        The dogs<span class="man-trait">Hunt at night</span>
      </span>
      <span class="man-cond">{state.dogs > 0 ? `${state.dogs} with the party` : 'None'}</span>
    </button>
  );
}

export function Toggle({ id, checked, onChange, label, note }: { id: string; checked: boolean; onChange: (v: boolean) => void; label: string; note?: string }) {
  return (
    <label class="toggle" for={id}>
      <input id={id} type="checkbox" checked={checked} onChange={(e) => onChange((e.currentTarget as HTMLInputElement).checked)} />
      <span class="toggle-box" aria-hidden="true" />
      <span class="toggle-text">
        <span class="toggle-label">{label}</span>
        {note && <span class="toggle-note">{note}</span>}
      </span>
    </label>
  );
}

export function Stepper({ id, value, min = 0, max, step = 1, onChange, label, unit, note }: { id: string; value: number; min?: number; max: number; step?: number; onChange: (v: number) => void; label: string; unit?: string; note?: string }) {
  return (
    <div class="stepper" role="group" aria-labelledby={`${id}-label`}>
      <span class="stepper-label">
        <span id={`${id}-label`}>{label}</span>
        {note && <span class="toggle-note stepper-note">{note}</span>}
      </span>
      <button type="button" class="step-btn" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} aria-label={`Less ${label}`}>
        −
      </button>
      <output id={id} class="step-value">
        {value}
        {unit ? ` ${unit}` : ''}
      </output>
      <button type="button" class="step-btn" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} aria-label={`More ${label}`}>
        +
      </button>
    </div>
  );
}
