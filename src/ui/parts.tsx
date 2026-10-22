// Small pieces shared by the plan and camp sheets.
import { useState } from 'preact/hooks';
import { T, capacity, horseCapacity, loadLb, withParty, type GameState, type Horse, type Member, type Task } from '../engine';
import { CONDITION_LABEL, TASK_HINT, TASK_LABEL, lb, shortName } from './format';
import type { Draft } from './draft';
import { available } from './draft';

export function Report({ lines, title = 'Report' }: { lines: string[]; title?: string }) {
  const [all, setAll] = useState(false);
  if (!lines.length) return null;
  const shown = all ? lines : lines.slice(-4);
  return (
    <section class="report" aria-live="polite">
      <h3 class="section-title">{title}</h3>
      <ul>
        {shown.map((l, i) => (
          <li key={`${i}:${l}`}>{l}</li>
        ))}
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
  return (
    <button
      type="button"
      class={`chip task-${off ? 'off' : task}`}
      onClick={onTap}
      disabled={off}
      aria-label={`${m.name}${m.leader ? ', leader' : ''}, ${label}${m.condition ? `, ${CONDITION_LABEL[m.condition]}` : ''}. Stamina ${Math.round(m.stamina)}. Tap to change.`}
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
    <div class="roster" role="group" aria-label="The party's tasks">
      {state.men.map((m) => (
        <RosterChip key={m.id} state={state} m={m} task={draft.tasks[m.id] ?? 'camp'} onTap={() => onCycle(m)} />
      ))}
    </div>
  );
}

function horseState(h: Horse): string {
  if (h.leftAt?.startsWith('lost:')) return 'lost';
  if (h.leftAt) return 'left behind';
  if (h.condition < T.horses.exhaustedBelow) return 'exhausted';
  if (h.condition < T.horses.weakBelow) return 'weak';
  return '';
}

export function Horses({ state }: { state: GameState }) {
  const load = loadLb(state.stores);
  const cap = capacity(state);
  const over = load > cap + 1e-6;
  return (
    <section class="horses" aria-label="Horses">
      <div class="horses-list">
        {state.horses.map((h) => (
          <div key={h.id} class={`horse${withParty(h) ? '' : ' horse-gone'}`}>
            <span class="horse-name">{h.name}</span>
            <Meter value={withParty(h) ? h.condition : 0} />
            <span class="horse-note">{horseState(h) || `${Math.round(h.condition)}`}</span>
          </div>
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

export function Stepper({ id, value, min = 0, max, step = 1, onChange, label, unit }: { id: string; value: number; min?: number; max: number; step?: number; onChange: (v: number) => void; label: string; unit?: string }) {
  return (
    <div class="stepper" role="group" aria-labelledby={`${id}-label`}>
      <span id={`${id}-label`} class="stepper-label">
        {label}
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
