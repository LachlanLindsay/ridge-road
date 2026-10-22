import { useState } from 'preact/hooks';
import type { GameState, Mode } from '../engine';
import { BRIEFING } from './copy';
import { shortDate } from './format';

const MODES: { id: Mode; label: string; note: string }[] = [
  { id: 'easy', label: 'Easy', note: 'Fewer false ridges, faster cutting, steadier men' },
  { id: 'historical', label: 'Historical', note: 'The 1813 numbers' },
  { id: 'hard', label: 'Hard', note: 'More dead ends, slower cutting, a warier party' },
];

/** Layered ridgelines fading into haze: the range as seen from the Nepean. */
function Range() {
  return (
    <svg class="range" viewBox="0 0 400 120" preserveAspectRatio="none" aria-hidden="true">
      <path class="range-3" d="M0 62 L30 50 L58 56 L92 38 L120 46 L150 30 L184 40 L214 26 L250 36 L282 24 L318 34 L350 22 L400 30 L400 120 L0 120Z" />
      <path class="range-2" d="M0 78 L40 64 L70 72 L104 56 L140 66 L172 52 L210 62 L246 48 L280 58 L316 46 L352 56 L400 44 L400 120 L0 120Z" />
      <path class="range-1" d="M0 96 L36 84 L76 92 L118 78 L160 88 L198 76 L236 86 L276 74 L318 84 L360 72 L400 80 L400 120 L0 120Z" />
    </svg>
  );
}

export function Title({ save, onContinue, onStart }: { save: GameState | null; onContinue: () => void; onStart: (mode: Mode) => void }) {
  const [mode, setMode] = useState<Mode>('historical');
  const [choosing, setChoosing] = useState(!save || save.phase === 'over');
  const resumable = save && save.phase !== 'over';
  return (
    <main class="title">
      <div class="title-inner">
        <h1 class="display title-name">Ridge Road</h1>
        <p class="title-sub">Across the Blue Mountains with Blaxland, Lawson and Wentworth, May 1813</p>
      </div>
      <Range />
      <div class="title-inner title-actions">
        {resumable && !choosing && (
          <>
            <button type="button" class="btn btn-go" onClick={onContinue}>
              Continue · day {save.day}, {shortDate(save.day)}
            </button>
            <button type="button" class="btn btn-quiet" onClick={() => setChoosing(true)}>
              New expedition
            </button>
          </>
        )}
        {choosing && (
          <>
            <fieldset class="modes">
              <legend class="section-title">Difficulty</legend>
              {MODES.map((m) => (
                <label key={m.id} class={mode === m.id ? 'mode is-on' : 'mode'}>
                  <input type="radio" name="mode" value={m.id} checked={mode === m.id} onChange={() => setMode(m.id)} />
                  <span class="mode-label">{m.label}</span>
                  <span class="mode-note">{m.note}</span>
                </label>
              ))}
            </fieldset>
            <button type="button" class="btn btn-go" onClick={() => onStart(mode)}>
              {resumable ? 'Start a new expedition' : 'Set out'}
            </button>
            {resumable && (
              <button type="button" class="btn btn-quiet" onClick={() => setChoosing(false)}>
                Back
              </button>
            )}
            {resumable && <p class="fine">Starting again replaces the expedition saved on this device.</p>}
          </>
        )}
        <p class="fine">An original game built on the public-domain 1813 journals.</p>
      </div>
    </main>
  );
}

export function Briefing({ onDone }: { onDone: () => void }) {
  const [i, setI] = useState(0);
  const card = BRIEFING[i]!;
  const last = i === BRIEFING.length - 1;
  return (
    <main class="briefing">
      <div class="briefing-inner">
        <p class="briefing-step" aria-label={`Card ${i + 1} of ${BRIEFING.length}`}>
          {BRIEFING.map((_, j) => (
            <span key={j} class={j === i ? 'dot is-on' : 'dot'} />
          ))}
        </p>
        <h1 class="display briefing-title">{card.title}</h1>
        {card.paragraphs.map((p) => (
          <p key={p} class="briefing-text">
            {p}
          </p>
        ))}
        <div class="briefing-actions">
          <button type="button" class="btn btn-go" onClick={() => (last ? onDone() : setI(i + 1))}>
            {last ? 'Set out from the Nepean' : 'Next'}
          </button>
          {!last && (
            <button type="button" class="btn btn-quiet" onClick={onDone}>
              Skip
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
