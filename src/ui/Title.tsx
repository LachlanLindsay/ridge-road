import { useState } from 'preact/hooks';
import type { GameState, Mode } from '../engine';
import { BriefingArt, TitleArt } from './art/scenes';
import { BRIEFING } from './copy';
import { shortDate } from './format';

const MODES: { id: Mode; label: string; note: string }[] = [
  { id: 'easy', label: 'Easy', note: 'Fewer false ridges, faster cutting, steadier men' },
  { id: 'historical', label: 'Historical', note: 'The 1813 numbers' },
  { id: 'hard', label: 'Hard', note: 'More dead ends, slower cutting, a warier party' },
];

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
      <div class="title-art">
        <TitleArt />
      </div>
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
      <div class="briefing-art" key={i}>
        <BriefingArt card={i} />
      </div>
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
            {last ? 'Outfit the party' : 'Next'}
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
