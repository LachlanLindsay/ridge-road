import { useEffect, useRef } from 'preact/hooks';
import { eventCard, type ChoiceId, type GameState } from '../engine';

/** An event card: what happened, and two or three choices with their effects shown before picking. */
export function EventModal({ state, onChoose }: { state: GameState; onChoose: (c: ChoiceId) => void }) {
  const card = eventCard(state);
  const first = useRef<HTMLButtonElement>(null);
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
          {card.text}
        </p>
        <div class="choices">
          {card.choices.map((c, i) => (
            <button key={c.id} ref={i === firstEnabled ? first : undefined} type="button" class="choice" disabled={!!c.disabled} onClick={() => onChoose(c.id)}>
              <span class="choice-label">{c.label}</span>
              <span class="choice-effect">{c.disabled ? `${c.disabled}.` : c.effect}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
