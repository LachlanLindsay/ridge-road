// Sending feedback: the tester's note with the build, the expedition and a replay code, handed to the
// phone's share sheet or copied to paste into a message. When neither works (some embedded views
// block both), the report is shown selected, ready to copy by hand.
import { useEffect, useState } from 'preact/hooks';
import type { GameState } from '../engine';
import { BUILD } from './build';
import { Sheet } from './Overlays';
import { encodeReplay } from './replaycode';
import { reportText } from './report';

const NOTE_KEY = 'ridge-road.feedback-note.v1';

function readNote(): string {
  try {
    return localStorage.getItem(NOTE_KEY) ?? '';
  } catch {
    return '';
  }
}

function writeNote(v: string) {
  try {
    if (v) localStorage.setItem(NOTE_KEY, v);
    else localStorage.removeItem(NOTE_KEY);
  } catch {
    // A convenience only.
  }
}

/** The replay code for a game, worked out once (compression is asynchronous). */
export function useReplayCode(state: GameState | null): string | null {
  const [code, setCode] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    if (!state) {
      setCode(null);
      return;
    }
    encodeReplay(state, BUILD)
      .then((c) => live && setCode(c))
      .catch(() => live && setCode(null));
    return () => {
      live = false;
    };
  }, [state]);
  return code;
}

type Sent = 'idle' | 'shared' | 'copied' | 'manual';

export function ReportActions({ text, onSent }: { text: string; onSent?: () => void }) {
  const [sent, setSent] = useState<Sent>('idle');
  const canShare = typeof navigator !== 'undefined' && typeof navigator.share === 'function';
  const share = async () => {
    try {
      await navigator.share({ title: 'Ridge Road feedback', text });
      setSent('shared');
      onSent?.();
    } catch (e) {
      // Closing the share sheet is not a failure.
      if ((e as DOMException)?.name !== 'AbortError') setSent('manual');
    }
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setSent('copied');
      onSent?.();
    } catch {
      setSent('manual');
    }
  };
  return (
    <div class="report-actions">
      {canShare && (
        <button type="button" class="btn btn-go" onClick={share}>
          Share the report
        </button>
      )}
      <button type="button" class={canShare ? 'btn btn-quiet' : 'btn btn-go'} onClick={copy}>
        {sent === 'copied' ? 'Copied' : 'Copy the report'}
      </button>
      {sent === 'manual' && (
        <>
          <p class="fine">This view can’t share or copy for you. Select the report below and copy it.</p>
          <textarea class="report-manual" readOnly rows={8} value={text} onFocus={(e) => (e.currentTarget as HTMLTextAreaElement).select()} />
        </>
      )}
      {sent === 'copied' && <p class="fine">Paste it into a message to whoever sent you the game.</p>}
      {sent === 'shared' && <p class="fine">Thank you.</p>}
    </div>
  );
}

export function Feedback({ state, onClose }: { state: GameState | null; onClose: () => void }) {
  const [note, setNote] = useState(readNote);
  const code = useReplayCode(state);
  const text = reportText({ state, note, code });
  return (
    <Sheet title="Send feedback" onClose={onClose}>
      <div class="feedback">
        <p>
          What happened, what confused you, what you enjoyed. Your note goes with the build and, if you have an expedition going, a code that replays it exactly, so any problem can be
          seen as you saw it.
        </p>
        <label class="field">
          <span class="field-label">Your note</span>
          <textarea
            rows={5}
            maxLength={2000}
            value={note}
            placeholder="On day 9 the horses wouldn’t move camp, though…"
            onInput={(e) => {
              const v = (e.currentTarget as HTMLTextAreaElement).value;
              setNote(v);
              writeNote(v);
            }}
          />
        </label>
        <ReportActions text={text} onSent={() => writeNote('')} />
        <details class="report-preview">
          <summary>What the report contains</summary>
          <pre>{text}</pre>
        </details>
      </div>
    </Sheet>
  );
}
