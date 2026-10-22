// The save is the whole game state as JSON in local storage. Storage can be missing or throw
// (private windows, blocked site data, previews), so every access is guarded and the game still
// runs without it.
//
// Each save is stamped with the build that wrote it. A save from another build is rebuilt by
// replaying its orders with this build's engine, so a fix shipped mid-expedition never meets a game
// state shaped by older code; if the orders no longer replay, the player is told and starts afresh.
import { fromSave, replay, toSave, type GameState } from '../engine';
import { BUILD } from './build';
import type { Draft } from './draft';

const SAVE_KEY = 'ridge-road.save.v1';
const BUILD_KEY = 'ridge-road.build.v1';
const DRAFT_KEY = 'ridge-road.draft.v1';

let latest: string | null = null;

/** The most recent save, for the published page's update hook and for reports. */
export function currentSave(): string | null {
  return latest;
}

export interface Restored {
  game: GameState | null;
  /** Something the player should be told, such as an expedition that could not be carried over. */
  notice: string | null;
}

export const CARRY_OVER_FAILED = 'Your saved expedition came from an earlier test build and could not be carried over. Please start a new one.';

/** Load a save written by `savedBuild` (null when unknown). */
export function restore(raw: string | null, savedBuild: string | null): Restored {
  if (!raw) return { game: null, notice: null };
  let s: GameState;
  try {
    s = fromSave(raw);
  } catch {
    return { game: null, notice: CARRY_OVER_FAILED };
  }
  if (savedBuild === BUILD) return { game: s, notice: null };
  try {
    return { game: replay(s.opts, s.actions), notice: null };
  } catch {
    return { game: null, notice: CARRY_OVER_FAILED };
  }
}

export function readSave(resume?: string | null, resumeBuild?: string | null): Restored {
  if (resume) return restore(resume, resumeBuild ?? null);
  try {
    return restore(localStorage.getItem(SAVE_KEY), localStorage.getItem(BUILD_KEY));
  } catch {
    return { game: null, notice: null };
  }
}

export function writeSave(s: GameState) {
  latest = toSave(s);
  try {
    localStorage.setItem(SAVE_KEY, latest);
    localStorage.setItem(BUILD_KEY, BUILD);
  } catch {
    // Storage full or blocked: the game carries on, unsaved.
  }
}

export function clearSave() {
  latest = null;
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(BUILD_KEY);
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear.
  }
}

/** The saved game for a report, whatever state the app is in. */
export function lastSaved(): GameState | null {
  try {
    const raw = latest ?? localStorage.getItem(SAVE_KEY);
    return raw ? fromSave(raw) : null;
  } catch {
    return null;
  }
}

export function readDraft(): Draft | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    return raw ? (JSON.parse(raw) as Draft) : null;
  } catch {
    return null;
  }
}

export function writeDraft(d: Draft) {
  try {
    localStorage.setItem(DRAFT_KEY, JSON.stringify(d));
  } catch {
    // Not worth losing a game over.
  }
}

const NOTES_KEY = 'ridge-road.notes.v1';

/** The player's own journal lines, by day, kept on the device beside the save (not part of the replay). */
export function readNotes(seed: number): Record<number, string> {
  try {
    const raw = localStorage.getItem(`${NOTES_KEY}.${seed}`);
    return raw ? (JSON.parse(raw) as Record<number, string>) : {};
  } catch {
    return {};
  }
}

export function writeNote(seed: number, day: number, text: string) {
  try {
    const notes = readNotes(seed);
    if (text.trim()) notes[day] = text;
    else delete notes[day];
    localStorage.setItem(`${NOTES_KEY}.${seed}`, JSON.stringify(notes));
  } catch {
    // A convenience only.
  }
}

/** A remembered yes/no for small conveniences, such as a dismissed hint. */
export function readFlag(key: string): boolean {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

export function writeFlag(key: string) {
  try {
    localStorage.setItem(key, '1');
  } catch {
    // A convenience only.
  }
}
