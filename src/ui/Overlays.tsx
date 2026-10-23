// Full-height sheets over the game: the menu, journal, party and stores, how to play, map key.
import type { ComponentChildren } from 'preact';
import { useState } from 'preact/hooks';
import { CARDS, JOURNAL_1813, T, foodLb, freshLb, isSignOfCountry, type GameState } from '../engine';
import { BUILD } from './build';
import { BriefingArt } from './art/scenes';
import { BRIEFING, CARD_SOURCES, CARD_TEXT, HELP, PARTY_CARD } from './copy';
import { isoShort, itemText, lb, localize, longDate, plural, type Units } from './format';
import { DogsRow, Horses, ManRow, Toggle } from './parts';
import { encodeReplay } from './replaycode';
import { Sheet } from './Sheet';
import { readNotes, writeNote } from './save';

export { Sheet };

export type OverlayId = 'menu' | 'journal' | 'party' | 'briefing' | 'help' | 'key' | 'feedback';

/** The expedition as a code the player can copy, to load on another device or keep. */
function CopyCode({ state }: { state: GameState }) {
  const [done, setDone] = useState<string | null>(null);
  const copy = async () => {
    try {
      const code = await encodeReplay(state, BUILD);
      await navigator.clipboard.writeText(code);
      setDone('Copied. Paste it into "Load an expedition code" on the title screen of any device.');
    } catch {
      setDone('Could not copy here. Send feedback shows the same code as text.');
    }
  };
  return (
    <button type="button" class="menu-item" onClick={copy}>
      Copy expedition code
      <span>{done ?? 'A short code that rebuilds this expedition on another device, or keeps it when someone else plays here'}</span>
    </button>
  );
}

export function Menu({
  state,
  unread = 0,
  open,
  units,
  onUnits,
  onClose,
  onTitle,
  onRestart,
}: {
  state: GameState;
  unread?: number;
  open: (o: OverlayId) => void;
  units: Units;
  onUnits: (u: Units) => void;
  onClose: () => void;
  onTitle: () => void;
  onRestart: () => void;
}) {
  const [confirm, setConfirm] = useState(false);
  return (
    <Sheet title="Ridge Road" onClose={onClose}>
      <nav class="menu">
        <button type="button" class="menu-item" onClick={() => open('journal')}>
          <span class="menu-item-head">
            Journal
            {unread > 0 && <span class="tag-new">{unread} new</span>}
          </span>
          <span>{unread > 0 ? `${plural(unread, 'card')} found and not yet read, and your days beside 1813` : "One line a day, beside the 1813 party's day, and the cards you find"}</span>
        </button>
        <button type="button" class="menu-item" onClick={() => open('party')}>
          Party and stores
          <span>Men, horses, food and gear</span>
        </button>
        <button type="button" class="menu-item" onClick={() => open('briefing')}>
          The briefing
          <span>Whose Country it is, May 1813 and the party</span>
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
        <CopyCode state={state} />
        <div class="menu-item menu-setting">
          <Toggle id="units" checked={units === 'metric'} onChange={(v) => onUnits(v ? 'metric' : 'imperial')} label="Metric units" note="Kilograms and kilometres instead of the 1813 party's pounds, miles and chains." />
        </div>
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

/** The journal as a plain page for printing: your days beside the 1813 party's, your notes, and the cards found. */
function printJournal(state: GameState, notes: Record<number, string>) {
  const then1813 = new Map<string, string>([...JOURNAL_1813.days, ...JOURNAL_1813.home].map((d) => [d.date, d.text]));
  const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const days = state.journal
    .map((j) => {
      const then = then1813.get(j.date);
      const note = notes[j.day];
      return `<section class="day"><h2>Day ${j.day} · ${esc(isoShort(j.date))}</h2><p>${esc(localize(j.text))}</p>${note ? `<p class="note"><b>My note:</b> ${esc(note)}</p>` : ''}${then ? `<p class="then"><b>In 1813:</b> ${esc(then)}</p>` : ''}</section>`;
    })
    .join('');
  const cards = state.cards
    .filter((c) => CARDS[c])
    .map((c) => `<section class="card"><h3>${esc(CARDS[c]!.title)}</h3>${(CARD_TEXT[c] ?? []).map((p) => `<p>${esc(p)}</p>`).join('')}${CARD_SOURCES[c] ? `<p class="src">${esc(CARD_SOURCES[c]!)}</p>` : ''}</section>`)
    .join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>Ridge Road journal</title><style>
    body{font:12pt/1.45 Georgia,serif;max-width:46em;margin:2em auto;padding:0 1em;color:#222}
    h1{font-weight:normal;font-size:2em;margin:0}h2{font-size:1.1em;margin:1.2em 0 .2em}h3{font-size:1em;margin:1em 0 .2em}
    .day{page-break-inside:avoid}.then{color:#444;font-style:italic}.note{background:#f3f1ea;padding:.4em .6em}.src{font-size:.85em;color:#555}
    .cards{page-break-before:always}.sub{color:#555;margin:0 0 1.5em}
    @media print{body{margin:0}}
  </style></head><body>
  <h1>Ridge Road: my journal</h1><p class="sub">Across the Blue Mountains from ${esc(longDate(1))} · seed ${state.seed} · ${esc(state.mode)}</p>
  ${days || '<p>No entries yet.</p>'}
  <div class="cards"><h1>Cards found</h1>${cards || '<p>None yet.</p>'}</div>
  </body></html>`;
  const w = window.open('', '_blank');
  if (!w) return false;
  w.document.open();
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}

export function Journal({ state, unread = [], onRead, onClose }: { state: GameState; unread?: string[]; onRead?: (id: string) => void; onClose: () => void }) {
  // The 1813 party's day for each date: the way out, then the way home.
  const then1813 = new Map<string, string>([...JOURNAL_1813.days, ...JOURNAL_1813.home].map((d) => [d.date, d.text]));
  // Oldest first: the journal reads as a story from day 1.
  const entries = state.journal;
  const cards = state.cards.filter((c) => CARDS[c]).reverse();
  // The Signs of Country are the people the journals record, not things to collect: they are
  // counted apart from the cards found, and never as "still to find".
  const ids = Object.keys(CARDS).filter((k) => !k.startsWith('_'));
  const total = ids.filter((k) => !isSignOfCountry(k)).length;
  const found = cards.filter((c) => !isSignOfCountry(c)).length;
  const signs = cards.filter((c) => isSignOfCountry(c)).length;
  const signsTotal = ids.filter((k) => isSignOfCountry(k)).length;
  // Cards come first when there is something new to read in them.
  const [tab, setTab] = useState<'days' | 'cards'>(unread.length ? 'cards' : 'days');
  const [notes, setNotes] = useState<Record<number, string>>(() => readNotes(state.seed));
  const [printFail, setPrintFail] = useState(false);
  const note = (day: number, text: string) => {
    setNotes({ ...notes, [day]: text });
    writeNote(state.seed, day, text);
  };
  return (
    <Sheet title="Journal" onClose={onClose}>
      <div class="tabs" role="tablist" aria-label="Journal">
        <button type="button" role="tab" id="tab-days" aria-selected={tab === 'days'} aria-controls="panel-days" class={tab === 'days' ? 'tab is-on' : 'tab'} onClick={() => setTab('days')}>
          Your days
          <span class="tab-note">{entries.length ? `${plural(entries.length, 'entry', 'entries')}, beside 1813` : 'Beside 1813'}</span>
        </button>
        <button type="button" role="tab" id="tab-cards" aria-selected={tab === 'cards'} aria-controls="panel-cards" class={tab === 'cards' ? 'tab is-on' : 'tab'} onClick={() => setTab('cards')}>
          <span class="menu-item-head">
            Cards
            {unread.length > 0 && <span class="tag-new">{unread.length} new</span>}
          </span>
          <span class="tab-note">
            {found} of {total} found{signs > 0 ? ` · signs of people: ${signs}` : ''}
          </span>
        </button>
      </div>
      {tab === 'days' ? (
        <div role="tabpanel" id="panel-days" aria-labelledby="tab-days">
          <p class="fine journal-hint">
            One line a day beside the 1813 party's, oldest first. Add your own line to any day.{' '}
            <button type="button" class="link-btn link-inline" onClick={() => setPrintFail(!printJournal(state, notes))}>
              Print or save as PDF
            </button>
            {printFail ? ' (the browser blocked the print window: allow pop-ups for this page and try again)' : ''}
          </p>
          {entries.length === 0 && <p class="fine">The first entry is written tonight.</p>}
          <ol class="journal">
            {entries.map((j) => {
              const then = then1813.get(j.date);
              return (
                <li key={j.day}>
                  <span class="journal-date display">
                    Day {j.day} · {isoShort(j.date)}
                  </span>
                  <span class="journal-text">{localize(j.text)}</span>
                  {then && (
                    <span class="journal-1813">
                      <span class="journal-1813-label">In 1813:</span> {then}
                    </span>
                  )}
                  <textarea class="journal-note" rows={1} placeholder="Your own line for this day" value={notes[j.day] ?? ''} onInput={(e) => note(j.day, (e.currentTarget as HTMLTextAreaElement).value)} aria-label={`Your note for day ${j.day}`} />
                </li>
              );
            })}
          </ol>
        </div>
      ) : (
        <section class="cards" role="tabpanel" id="panel-cards" aria-labelledby="tab-cards">
          <p class="fine">
            History found on the way, from the 1813 journals and the sources each card names.
            {found < total ? ` ${plural(total - found, 'card')} still to find.` : ' You have found them all.'}
            {signs > 0 ? ` The ${signs === 1 ? 'sign' : `${signs} signs`} of people the party saw ${signs === 1 ? 'is' : 'are'} here too: ${signs} of the ${signsTotal} the 1813 journals record.` : ''}
          </p>
          {cards.map((c) => {
            const isNew = unread.includes(c);
            return (
              <details key={c} class={isNew ? 'card-item is-new' : 'card-item'} onToggle={(e) => (e.currentTarget as HTMLDetailsElement).open && onRead?.(c)}>
                <summary>
                  {CARDS[c]!.title}
                  {isNew && <span class="tag-new">New</span>}
                </summary>
                {(CARD_TEXT[c] ?? []).map((p) => (
                  <p key={p}>{p}</p>
                ))}
                {CARD_SOURCES[c] && <p class="card-source">{CARD_SOURCES[c]}</p>}
              </details>
            );
          })}
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
      <p class="fine party-hint">Tap anyone, horses and dogs too, for their part in the game and in 1813.</p>
      <section class="men">
        {state.men.map((m) => (
          <ManRow key={m.id} state={state} m={m} full />
        ))}
      </section>
      <Horses state={state} />
      <section class="men">
        <DogsRow state={state} />
      </section>
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
          <dt>Set out</dt>
          <dd>{longDate(1)}</dd>
        </div>
      </dl>
    </Sheet>
  );
}

/** The three briefing cards again, with their plates, to reread during the expedition. */
export function BriefingSheet({ onClose }: { onClose: () => void }) {
  return (
    <Sheet title="The briefing" onClose={onClose}>
      {BRIEFING.map((c, i) => (
        <section key={c.title} class="help briefing-again">
          <div class="briefing-again-art">
            <BriefingArt card={i} />
          </div>
          <h3 class="display">{c.title}</h3>
          {c.paragraphs.map((p) => (
            <p key={p}>{p}</p>
          ))}
          {i === PARTY_CARD && <p class="fine">In the plan, press and hold a man’s name, or hover over it, for his card. Party and stores, in the menu, has everyone’s.</p>}
        </section>
      ))}
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

/** The map key lives with the map's drawing code. */
export { MapKey } from './MapKey';
