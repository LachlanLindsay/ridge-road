// The save is the whole game state as JSON in local storage. Storage can be missing or throw
// (private windows, blocked site data, previews), so every access is guarded and the game still
// runs without it.
import { fromSave, toSave, type GameState } from '../engine';
import type { Draft } from './draft';

const SAVE_KEY = 'ridge-road.save.v1';
const DRAFT_KEY = 'ridge-road.draft.v1';

let latest: string | null = null;

/** The most recent save, for the published page's update hook. */
export function currentSave(): string | null {
  return latest;
}

export function readSave(resume?: string | null): GameState | null {
  try {
    const raw = resume ?? localStorage.getItem(SAVE_KEY);
    return raw ? fromSave(raw) : null;
  } catch {
    return null;
  }
}

export function writeSave(s: GameState) {
  latest = toSave(s);
  try {
    localStorage.setItem(SAVE_KEY, latest);
  } catch {
    // Storage full or blocked: the game carries on, unsaved.
  }
}

export function clearSave() {
  latest = null;
  try {
    localStorage.removeItem(SAVE_KEY);
    localStorage.removeItem(DRAFT_KEY);
  } catch {
    // Nothing to clear.
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
