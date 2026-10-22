import { useEffect, useRef, useState } from 'preact/hooks';
import { eventCard, type ChoiceId, type GameState } from '../engine';
import { localize } from './format';

/** The dew card comes round often; the words vary so it does not read as the same card twice. */
const DEW_AGAIN = [
  'Dew lies heavy on everything again. Start wet, or wait for the sun to lift it.',
  'Another grey, dripping morning: every bush holds a cupful of water.',
  'The scrub is soaked through once more. The men can push into it wet, or sit an hour by the fire.',
  'Heavy dew again. Boots and coats will be wet by the first hundred yards.',
];

/** An event card: what happened, and two or three choices with their effects shown before picking. */
export function EventModal({ state, onChoose, onRemember }: { state: GameState; onChoose: (c: ChoiceId) => void; onRemember?: (c: ChoiceId) => void }) {
  const card = eventCard(state);
  const first = useRef<HTMLButtonElement>(null);
  const [remember, setRemember] = useState(false);
  useEffect(() => first.current?.focus(), [card?.id, state.pending.length]);
  if (!card) return null;
  const firstEnabled = card.choices.findIndex((c) => !c.disabled);
  return (
    <div class="backdrop">
      <div class="event-card" role="dialog" aria-modal="true" aria-labelledby="event-title" aria-describedby="event-text">
        <h2 id="event-title" class="display event-title">
          {card.title}
        </h2>
        <p id="event-text" class="event-text">
          {localize(card.id === 'dew' && state.day % 2 === 0 ? DEW_AGAIN[state.day % DEW_AGAIN.length]! : card.text)}
        </p>
        <div class="choices">
          {card.choices.map((c, i) => (
            <button
              key={c.id}
              ref={i === firstEnabled ? first : undefined}
              type="button"
              class="choice"
              disabled={!!c.disabled}
              onClick={() => {
                if (remember && onRemember) onRemember(c.id);
                onChoose(c.id);
              }}
            >
              <span class="choice-label">{c.label}</span>
              <span class="choice-effect">{c.disabled ? `${localize(c.disabled)}.` : localize(c.effect)}</span>
            </button>
          ))}
        </div>
        {onRemember && (
          <label class="toggle event-remember" for="event-remember">
            <input id="event-remember" type="checkbox" checked={remember} onChange={(e) => setRemember((e.currentTarget as HTMLInputElement).checked)} />
            <span class="toggle-box" aria-hidden="true" />
            <span class="toggle-text">
              <span class="toggle-label">Do the same every misty morning</span>
              <span class="toggle-note">Stops this card for the rest of the expedition.</span>
            </span>
          </label>
        )}
      </div>
    </div>
  );
}
