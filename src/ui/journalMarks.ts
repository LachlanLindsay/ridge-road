// Which journal cards the player has been told about and which they have read, for the current
// expedition. Kept apart from the save: the save is the engine's state, rebuilt from the orders,
// and this is only what the player has looked at. Storage can be missing or throw, so it falls
// back to memory for the session.
import { CARDS, type GameState } from '../engine';
import { CARD_TEXT } from './copy';

const KEY = 'ridge-road.cards-read.v1';

export interface CardMarks {
  seed: number;
  /** Cards the player has been told about: shown on the slip, then acknowledged. */
  noticed: string[];
  /** Cards the player has opened and read. */
  opened: string[];
}

/** Cards that belong in the journal: real cards, in the order they were found. */
function found(s: GameState): string[] {
  return s.cards.filter((c) => CARDS[c]);
}

/** A fresh record for an expedition: everything it already holds counts as read. */
export function marksFor(s: GameState): CardMarks {
  const have = found(s);
  return { seed: s.seed, noticed: have, opened: have };
}

/**
 * The marks for this expedition. An expedition with no record yet (a new one, or one saved before
 * this build) starts with every card it holds counted as read, so nobody resumes to a pile of
 * notices for cards they found long ago.
 */
export function readCardMarks(s: GameState): CardMarks {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) {
      const m = JSON.parse(raw) as CardMarks;
      if (m && m.seed === s.seed && Array.isArray(m.noticed) && Array.isArray(m.opened)) return m;
    }
  } catch {
    // Unreadable: start afresh below.
  }
  const fresh = marksFor(s);
  writeCardMarks(fresh);
  return fresh;
}

export function writeCardMarks(m: CardMarks) {
  try {
    localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    // A convenience only.
  }
}

/** Cards found that the player has not yet been told about, oldest first. */
export function newCards(s: GameState, m: CardMarks): string[] {
  return found(s).filter((c) => !m.noticed.includes(c));
}

/** Cards found and not yet read. */
export function unreadCards(s: GameState, m: CardMarks): string[] {
  return found(s).filter((c) => !m.opened.includes(c));
}

export function withNoticed(m: CardMarks, ids: string[]): CardMarks {
  const add = ids.filter((c) => !m.noticed.includes(c));
  return add.length ? { ...m, noticed: [...m.noticed, ...add] } : m;
}

export function withOpened(m: CardMarks, id: string): CardMarks {
  const noticed = m.noticed.includes(id) ? m.noticed : [...m.noticed, id];
  return m.opened.includes(id) ? { ...m, noticed } : { ...m, noticed, opened: [...m.opened, id] };
}

/** The card's first sentence: the hook on the slip that announces it. */
export function cardLede(id: string): string {
  const first = CARD_TEXT[id]?.[0] ?? '';
  const m = /^(.+?[.!?][”’"]?)(?=\s+[A-Z“‘"]|$)/.exec(first);
  return m ? m[1]! : first;
}
