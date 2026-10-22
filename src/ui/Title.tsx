import { useState } from 'preact/hooks';
import { computeOutcome, replay, type GameState, type Mode } from '../engine';
import { BriefingArt, TitleArt } from './art/scenes';
import { BUILD } from './build';
import { BRIEFING } from './copy';
import { Feedback } from './Feedback';
import { MeetRow } from './Info';
import type { Who } from './people';
import { shortDate } from './format';
import { decodeReplay } from './replaycode';

const MODES: { id: Mode; label: string; note: string }[] = [
  { id: 'easy', label: 'Easy', note: 'Fewer false ridges, faster cutting, steadier men' },
  { id: 'historical', label: 'Historical', note: 'The 1813 numbers' },
  { id: 'hard', label: 'Hard', note: 'More dead ends, slower cutting, a warier party' },
];

/** Paste a replay code to rebuild an expedition from another device, or one kept aside. */
function LoadCode({ onLoad }: { onLoad: (g: GameState) => void }) {
  const [open, setOpen] = useState(false);
  const [text, setText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const load = async () => {
    try {
      const data = await decodeReplay(text);
      onLoad(replay(data.o, data.a));
    } catch (e) {
      setError((e as Error).message);
    }
  };
  if (!open)
    return (
      <button type="button" class="link-btn" onClick={() => setOpen(true)}>
        Load an expedition code
      </button>
    );
  return (
    <div class="load-code">
      <label class="section-title" for="load-code">
        Expedition code
      </label>
      <textarea id="load-code" rows={3} value={text} onInput={(e) => setText((e.currentTarget as HTMLTextAreaElement).value)} placeholder="Paste a code from Menu → Copy expedition code" />
      {error && <p class="fine is-warn">{error}</p>}
      <div class="confirm-actions">
        <button type="button" class="btn btn-small" onClick={load} disabled={!text.trim()}>
          Load it
        </button>
        <button type="button" class="btn btn-small btn-quiet" onClick={() => setOpen(false)}>
          Cancel
        </button>
      </div>
    </div>
  );
}

export function Title({ save, notice = null, onContinue, onStart, onLoad }: { save: GameState | null; notice?: string | null; onContinue: () => void; onStart: (mode: Mode) => void; onLoad: (g: GameState) => void }) {
  const [mode, setMode] = useState<Mode>('easy');
  const [feedback, setFeedback] = useState(false);
  const [choosing, setChoosing] = useState(!save);
  const resumable = save && save.phase !== 'over';
  const finished = save && save.phase === 'over' ? computeOutcome(save) : null;
  const owner = save?.opts.owner?.trim();
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
        {notice && (
          <p class="notice" role="status">
            {notice}
          </p>
        )}
        {resumable && !choosing && (
          <>
            <button type="button" class="btn btn-go" onClick={onContinue}>
              Continue{owner ? ` ${owner}'s expedition` : ''} · day {save.day}, {shortDate(save.day)}
            </button>
            <button type="button" class="btn btn-quiet" onClick={() => setChoosing(true)}>
              New expedition
            </button>
          </>
        )}
        {finished && !choosing && (
          <>
            <button type="button" class="btn btn-go" onClick={onContinue}>
              {owner ? `${owner}'s last expedition` : 'Your last expedition'}: {finished.result === 'crossed' ? 'crossed and returned' : 'repulsed'}, day {finished.dayHome}
            </button>
            <p class="fine">The end screen and the journal are kept until a new expedition sets out.</p>
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
              {save ? 'Start a new expedition' : 'Set out'}
            </button>
            {save && (
              <button type="button" class="btn btn-quiet" onClick={() => setChoosing(false)}>
                Back
              </button>
            )}
            {resumable && <p class="fine">Starting again replaces the expedition saved on this device. Menu → Copy expedition code keeps it first.</p>}
            <LoadCode onLoad={onLoad} />
          </>
        )}
        <p class="fine">
          An original game built on the public-domain 1813 journals. Test build {BUILD}.{' '}
          <button type="button" class="link-btn link-inline" onClick={() => setFeedback(true)}>
            Send feedback
          </button>
        </p>
      </div>
      {feedback && <Feedback state={save} onClose={() => setFeedback(false)} />}
    </main>
  );
}

/** Everyone in the 1813 party, for the briefing's card about them. */
const PARTY_1813: { who: Who; name: string }[] = [
  { who: { kind: 'man', id: 'blaxland' }, name: 'Blaxland' },
  { who: { kind: 'man', id: 'lawson' }, name: 'Lawson' },
  { who: { kind: 'man', id: 'wentworth' }, name: 'Wentworth' },
  { who: { kind: 'man', id: 'burne' }, name: 'Burne' },
  { who: { kind: 'man', id: 'fairs' }, name: 'Fairs' },
  { who: { kind: 'man', id: 'servant3' }, name: 'the other two servants' },
  { who: { kind: 'horse', id: 1 }, name: 'the horses' },
  { who: { kind: 'dogs', count: 5 }, name: 'the dogs' },
];

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
        <p class="briefing-step">
          {BRIEFING.map((c, j) => (
            <button key={j} type="button" class={j === i ? 'dot is-on' : 'dot'} aria-label={`Card ${j + 1} of ${BRIEFING.length}: ${c.title}`} aria-current={j === i ? 'step' : undefined} onClick={() => setI(j)} />
          ))}
        </p>
        <h1 class="display briefing-title">{card.title}</h1>
        {card.paragraphs.map((p) => (
          <p key={p} class="briefing-text">
            {p}
          </p>
        ))}
        {i === 1 && (
          <>
            <MeetRow whos={PARTY_1813} />
          </>
        )}
        <div class="briefing-actions">
          {i > 0 && (
            <button type="button" class="btn btn-quiet" onClick={() => setI(i - 1)}>
              Back
            </button>
          )}
          <button type="button" class="btn btn-go" onClick={() => (last ? onDone() : setI(i + 1))}>
            {last ? 'Pack for the trip' : 'Next'}
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
