// The slip that hangs under the top bar when a journal card is found: the card's title and its
// first sentence, one tap from the whole card. It stays until the player reads it, dismisses it,
// or gives the next orders; unread cards stay marked in the menu and the journal after that.
import { useContext } from 'preact/hooks';
import { CARDS } from '../engine';
import { InfoContext } from './Info';
import { cardLede } from './journalMarks';

export function JournalSlip({ ids, onDismiss }: { ids: string[]; onDismiss: () => void }) {
  const api = useContext(InfoContext);
  if (!ids.length) return null;
  const open = (id: string) => api?.open({ kind: 'card', id });
  const one = ids.length === 1 ? ids[0]! : null;
  return (
    <aside class="journal-slip" role="status" aria-label="New in the journal">
      <JournalGlyph />
      <div class="journal-slip-body">
        <p class="journal-slip-label">{one ? 'New in the journal' : `${ids.length} new in the journal`}</p>
        {one ? (
          <>
            <button type="button" class="journal-slip-title display" onClick={() => open(one)}>
              {CARDS[one]!.title}
            </button>
            <p class="journal-slip-lede">{cardLede(one)}</p>
          </>
        ) : (
          <ul class="journal-slip-list">
            {ids.map((id) => (
              <li key={id}>
                <button type="button" class="journal-slip-title display" onClick={() => open(id)}>
                  {CARDS[id]!.title}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      <div class="journal-slip-actions">
        {one && (
          <button type="button" class="btn btn-small" onClick={() => open(one)}>
            Read
          </button>
        )}
        <button type="button" class="icon-btn" onClick={onDismiss} aria-label="Dismiss: read it later in the Journal">
          ×
        </button>
      </div>
    </aside>
  );
}

/** An open field book with a red ribbon. */
export function JournalGlyph({ size = 28 }: { size?: number }) {
  return (
    <svg class="journal-glyph" viewBox="0 0 32 32" width={size} height={size} aria-hidden="true">
      <path d="M16 9.5C12.5 7.2 8.5 6.8 4 8v16.2c4.5-1.2 8.5-.8 12 1.5 3.5-2.3 7.5-2.7 12-1.5V8c-4.5-1.2-8.5-.8-12 1.5zM16 9.5v16.2" class="journal-glyph-book" />
      <path d="M7.5 12.2c2.3-.4 4.4-.2 6 .6M7.5 15.6c2.3-.4 4.4-.2 6 .6M7.5 19c2.3-.4 4.4-.2 6 .6" class="journal-glyph-lines" />
      <path d="M21.5 8.4v8.4l1.8-1.5 1.8 1.5V8" class="journal-glyph-ribbon" />
    </svg>
  );
}
