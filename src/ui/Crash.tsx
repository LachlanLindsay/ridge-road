// When rendering fails: a screen that says so, offers a report with a replay code of the saved
// expedition, and a way back in, instead of a blank page.
import type { ComponentChildren } from 'preact';
import { useErrorBoundary, useMemo, useState } from 'preact/hooks';
import { ReportActions, useReplayCode } from './Feedback';
import { reportText } from './report';
import { clearSave, lastSaved } from './save';

export function Guard({ children }: { children: ComponentChildren }) {
  const [error] = useErrorBoundary();
  if (error) return <Crash error={error} />;
  return <>{children}</>;
}

function Crash({ error }: { error: unknown }) {
  const state = useMemo(lastSaved, []);
  const code = useReplayCode(state);
  const [note, setNote] = useState('');
  const e = error as Error | null;
  const message = `${e?.name ?? 'Error'}: ${e?.message ?? String(error)}`;
  const stack = (e?.stack ?? '').split('\n').slice(0, 8).join('\n');
  const text = reportText({ state, note, code, error: `${message}\n${stack}` });
  return (
    <main class="crash">
      <div class="crash-inner">
        <h1 class="display crash-title">Something broke</h1>
        <p>The game hit an error it couldn’t recover from. Your expedition is saved up to the last order you gave, so reloading usually puts you back where you were.</p>
        <p>Please send the report: it carries a code that replays your expedition up to the moment it broke.</p>
        <label class="field">
          <span class="field-label">What were you doing? (optional)</span>
          <textarea rows={3} maxLength={2000} value={note} onInput={(ev) => setNote((ev.currentTarget as HTMLTextAreaElement).value)} />
        </label>
        <ReportActions text={text} />
        <div class="crash-actions">
          <button type="button" class="btn" onClick={() => location.reload()}>
            Reload the game
          </button>
          <button
            type="button"
            class="btn btn-quiet"
            onClick={() => {
              clearSave();
              location.reload();
            }}
          >
            Start a new expedition
          </button>
        </div>
        <details class="report-preview">
          <summary>Error details</summary>
          <pre>
            {message}
            {'\n'}
            {stack}
          </pre>
        </details>
      </div>
    </main>
  );
}
