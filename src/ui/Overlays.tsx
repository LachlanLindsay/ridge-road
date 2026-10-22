// Full-height sheets over the game: the menu, journal, party and stores, how to play, map key.
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { CARDS, JOURNAL_1813, T, foodLb, freshLb, isAway, type GameState } from '../engine';
import { BUILD } from './build';
import { CARD_SOURCES, CARD_TEXT, HELP } from './copy';
import { CONDITION_LABEL, isoShort, itemText, lb, longDate, plural } from './format';
import { Horses, Meter } from './parts';

export type OverlayId = 'menu' | 'journal' | 'party' | 'help' | 'key' | 'feedback';

export function Sheet({ title, onClose, children }: { title: string; onClose: () => void; children: ComponentChildren }) {
  return (
    <div class="backdrop backdrop-sheet" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="overlay-title">
        <div class="overlay-head">
          <h2 id="overlay-title" class="display">
            {title}
          </h2>
          <button type="button" class="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div class="overlay-body">{children}</div>
      </div>
    </div>
  );
}

export function Menu({ state, open, onClose, onTitle, onRestart }: { state: GameState; open: (o: OverlayId) => void; onClose: () => void; onTitle: () => void; onRestart: () => void }) {
  const [confirm, setConfirm] = useState(false);
  return (
    <Sheet title="Ridge Road" onClose={onClose}>
      <nav class="menu">
        <button type="button" class="menu-item" onClick={() => open('journal')}>
          Journal
          <span>One line a day, beside the 1813 party's day</span>
        </button>
        <button type="button" class="menu-item" onClick={() => open('party')}>
          Party and stores
          <span>Men, horses, food and gear</span>
        </button>
        <button type="button" class="menu-item" onClick={() => open('key')}>
          Map key
        </button>
        <button type="button" class="menu-item" onClick={() => open('help')}>
          How to play
        </button>
        <button type="button" class="menu-item" onClick={() => open('feedback')}>
          Send feedback
          <span>Your note, with a code that replays this expedition</span>
        </button>
        <button type="button" class="menu-item" onClick={onTitle}>
          Title screen
          <span>The expedition is saved on this device</span>
        </button>
        {confirm ? (
          <div class="confirm">
            <p>Abandon this expedition and start again?</p>
            <div class="confirm-actions">
              <button type="button" class="btn btn-danger" onClick={onRestart}>
                Abandon it
              </button>
              <button type="button" class="btn btn-quiet" onClick={() => setConfirm(false)}>
                Keep playing
              </button>
            </div>
          </div>
        ) : (
          <button type="button" class="menu-item menu-danger" onClick={() => setConfirm(true)}>
            Abandon and start again
          </button>
        )}
      </nav>
      <p class="fine">
        Seed {state.seed} · {state.mode} · {plural(state.actions.length, 'order')} given · build {BUILD}
      </p>
    </Sheet>
  );
}

export function Journal({ state, onClose }: { state: GameState; onClose: () => void }) {
  // The 1813 party's day for each date: the way out, then the way home.
  const then1813 = new Map<string, string>([...JOURNAL_1813.days, ...JOURNAL_1813.home].map((d) => [d.date, d.text]));
  const entries = [...state.journal].reverse();
  const cards = state.cards.filter((c) => CARDS[c]);
  return (
    <Sheet title="Journal" onClose={onClose}>
      {entries.length === 0 && <p class="fine">The first entry is written tonight.</p>}
      <ol class="journal">
        {entries.map((j) => {
          const then = then1813.get(j.date);
          return (
            <li key={j.day}>
              <span class="journal-date display">
                Day {j.day} · {isoShort(j.date)}
              </span>
              <span class="journal-text">{j.text}</span>
              {then && (
                <span class="journal-1813">
                  <span class="journal-1813-label">In 1813:</span> {then}
                </span>
              )}
            </li>
          );
        })}
      </ol>
      {cards.length > 0 && (
        <section class="cards">
          <h3 class="section-title">Cards found</h3>
          {cards.map((c) => (
            <details key={c} class="card-item">
              <summary>{CARDS[c]!.title}</summary>
              {(CARD_TEXT[c] ?? []).map((p) => (
                <p key={p}>{p}</p>
              ))}
              {CARD_SOURCES[c] && <p class="card-source">{CARD_SOURCES[c]}</p>}
            </details>
          ))}
        </section>
      )}
    </Sheet>
  );
}

export function Party({ state, onClose }: { state: GameState; onClose: () => void }) {
  const st = state.stores;
  const gear = (['tea', 'shots', 'axes', 'hatchets', 'hoe', 'blankets', 'shoes', 'grass'] as const).filter((k) => st[k] > 0);
  return (
    <Sheet title="Party and stores" onClose={onClose}>
      <section class="men">
        {state.men.map((m) => (
          <div key={m.id} class="man">
            <span class="man-name">
              {m.name}
              {m.leader ? ', leader' : ''}
            </span>
            <Meter value={m.stamina} />
            <span class={m.condition ? 'man-cond is-warn' : 'man-cond'}>{isAway(state, m) ? 'Away' : m.condition ? CONDITION_LABEL[m.condition] : `Stamina ${Math.round(m.stamina)}`}</span>
          </div>
        ))}
      </section>
      <Horses state={state} />
      <dl class="facts">
        <div>
          <dt>Food</dt>
          <dd>
            {lb(foodLb(st))}: {lb(st.flour)} flour, {lb(st.saltMeat)} salt meat{freshLb(st) > 0 ? `, ${lb(freshLb(st))} fresh` : ''}
          </dd>
        </div>
        <div>
          <dt>Gear</dt>
          <dd>{gear.map((k) => itemText(k, st[k])).join(', ') || 'Nothing spare'}</dd>
        </div>
        <div>
          <dt>Morale</dt>
          <dd>{Math.round(state.morale)} of 100</dd>
        </div>
        <div>
          <dt>Wear</dt>
          <dd>
            {Math.round(state.wear)} of 100{state.wear > T.illness.chill.wearOver ? ': clothes and boots are failing, chills come easier' : ''}
          </dd>
        </div>
        <div>
          <dt>Dogs</dt>
          <dd>{state.dogs}, hunting on their own each day</dd>
        </div>
        <div>
          <dt>Set out</dt>
          <dd>{longDate(1)}</dd>
        </div>
      </dl>
    </Sheet>
  );
}

export function Help({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="How to play" onClose={onClose}>
      {HELP.map((c) => (
        <section key={c.title} class="help">
          <h3 class="display">{c.title}</h3>
          {c.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>
      ))}
    </Sheet>
  );
}

export function MapKey({ onClose }: { onClose: () => void }) {
  const row = (glyph: ComponentChildren, label: string) => (
    <li>
      <svg viewBox="0 0 48 20" width="48" height="20" aria-hidden="true">
        {glyph}
      </svg>
      <span>{label}</span>
    </li>
  );
  return (
    <Sheet title="Map key" onClose={onClose}>
      <ul class="key">
        {row(<line x1="2" y1="10" x2="46" y2="10" class="seg-open" stroke-width="3.4" />, 'Cleared path: the horses can go here')}
        {row(<line x1="2" y1="10" x2="46" y2="10" class="seg-marked" stroke-width="1.8" stroke-dasharray="6 4" />, 'Marked trail: blazed, not yet cleared')}
        {row(<line x1="2" y1="10" x2="46" y2="10" class="seg-seen" stroke-width="1.3" stroke-dasharray="1.5 3.5" />, 'Ridge seen, not yet marked')}
        {row(
          <>
            <line x1="2" y1="10" x2="40" y2="10" class="seg-seen" stroke-width="1.3" stroke-dasharray="1.5 3.5" />
            <circle cx="42" cy="10" r="4" class="lead-end" stroke-width="1.4" />
          </>,
          'Unexplored lead: where it goes is unknown',
        )}
        {row(<line x1="2" y1="10" x2="46" y2="10" class="seg-crossed" stroke-width="2.6" stroke-dasharray="0.1 5" />, 'Crossed without blazing: slow on the way home')}
        {row(
          <>
            <line x1="2" y1="10" x2="46" y2="10" class="seg-dead" stroke-width="1.4" stroke-dasharray="2 3" />
            <path d="M19 5 L29 15 M19 15 L29 5" class="seg-cross" stroke-width="2" />
          </>,
          'Dead end: the branch ends in cliffs',
        )}
        {row(<path d="M14 18 L34 18 M14 12 L14 18 M19 12 L19 18 M24 12 L24 18 M29 12 L29 18 M34 12 L34 18" class="glyph-cliff" stroke-width="1.6" />, 'Precipice')}
        {row(
          <>
            <path d="M24 2 L32 16 L16 16 Z" class="glyph-trig" stroke-width="1.4" />
            <circle cx="24" cy="12" r="2.5" class="node node-reached" stroke-width="1" />
          </>,
          'Lookout, marked like a survey trig station',
        )}
        {row(
          <>
            <path d="M24 1 L34 18 L14 18 Z" class="tent" stroke-width="1.4" />
            <path d="M24 1 L24 18" class="tent-door" stroke-width="1.2" />
          </>,
          'Camp',
        )}
        {row(
          <>
            <path d="M22 19 L22 2" class="flag-pole" stroke-width="1.6" />
            <path d="M22 2 L33 6 L22 10 Z" class="flag-cloth" stroke-width="1" />
          </>,
          'Where scouts and cutters are working',
        )}
        {row(<circle cx="24" cy="10" r="4" class="glyph-water" />, 'Water for men and horses')}
        {row(<circle cx="24" cy="10" r="3.5" class="glyph-rockhole" stroke-width="1.4" />, 'Rock hole: water for the men only')}
        {row(<path d="M20 16 l-1.5 -6 M24 16 l0 -7 M28 16 l1.5 -6" class="glyph-grass" stroke-width="1.4" />, 'Good grass for the horses')}
        {row(
          <g class="hint hint-fallsAway">
            <circle cx="24" cy="10" r="7" stroke-width="1.2" />
            <text x="24" y="10" font-size="10" text-anchor="middle" dominant-baseline="central">
              ↓
            </text>
          </g>,
          "Lawson's reading: the ridge falls away (→ runs on); ✓ or ✗ once it is known",
        )}
        {row(<rect x="20" y="6" width="8" height="7" class="glyph-cache" stroke-width="1.2" />, 'Supplies left for the way home')}
      </ul>
      <p class="fine">Ticks along each ridge are hachures: the closer they sit, the rougher the ground. Distances on the map are straight-line miles; the trail along a winding ridge is longer.</p>
    </Sheet>
  );
}
