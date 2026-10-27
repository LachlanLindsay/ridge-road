// The journal: one entry a day, the big moments kept ahead of card finds, and the day home written.
import { describe, expect, it } from 'vitest';
import type { GameState, Mode } from '../src/engine/index';
import { pickDayNotable } from '../src/engine/night';
import { BOTS } from '../sim/bots';
import { playRun } from '../sim/run';

// Seed 7 on Easy, day 17, as the plan sheet plays it: the day the whole party reaches the hill.
const GOAL_DAY = [
  'The dogs brought down a small kangaroo: 10 lb of fresh meat.',
  'A dry camp: no water tonight.',
  'Dawn: cloud on the ridges.',
  'Down the pass: the horses are unloaded and led down the trench, and every man carries a pack. 2 h of climbing.',
  'Camp moved 3.5 mi to a new camp (3.5 h).',
  'The cloud lifts at noon and spirits with it.',
  'Journal card: An old campsite.',
  'Journal card: The sugarloaf hill.',
  'The sugarloaf hill: open grass country beyond the range.',
  'The party pushed on 4.5 mi with the horses, blazing the trail.',
  'The whole party stands on the sugarloaf hill, beyond the range.',
  'A horse fell under its load: 1 h lost getting it up again.',
  'The scouts found nothing to mark that way.',
  'The cutters had nothing marked to clear.',
];

/** Every day's report, as it stood when the day was over, and the finished game. */
function played(seed: number, mode: Mode): { s: GameState; logs: Map<number, string[]> } {
  const logs = new Map<number, string[]>();
  const s = playRun(seed, BOTS.historical!, { mode, onLog: (_, st) => logs.set(st.day, [...st.today.log]) }).state;
  return { s, logs };
}

/** Lines the journal must never drop: the hill, the river, the pass, the first view, dead ends and the people seen. */
const MUST = ['The whole party stands on the sugarloaf hill', 'Back across the Nepean', 'Down the pass', 'Up the pass', 'find a way down', 'trench is dug', 'A view at last', 'Dead end'];
const SIGNS = /^Journal card: (Huts|Smoke below the ridge|A man cutting wood|An old campsite)\.$/;

describe('the day’s journal entry', () => {
  it('keeps the hill, the pass and the people seen ahead of card finds, in the order they happened', () => {
    expect(pickDayNotable(GOAL_DAY)).toEqual([
      'Down the pass: the horses are unloaded and led down the trench, and every man carries a pack. 2 h of climbing.',
      'Camp moved 3.5 mi to a new camp (3.5 h).',
      'Signs of people: the fires of a camp left the day before.',
      'The whole party stands on the sugarloaf hill, beyond the range.',
    ]);
  });

  it('says a thing once, but counts two dead ends or two camp moves', () => {
    const lines = ['Dead end: the ridge breaks off in cliffs.', 'The scouts found nothing to mark that way.', 'Dead end: the ridge breaks off in cliffs.', 'The scouts found nothing to mark that way.'];
    expect(pickDayNotable(lines)).toEqual(['Dead end: the ridge breaks off in cliffs.', 'The scouts found nothing to mark that way.', 'Dead end: the ridge breaks off in cliffs.']);
  });

  it('never drops the big moments, whatever else happened that day', () => {
    let goals = 0;
    for (const mode of ['easy', 'historical', 'hard'] as Mode[]) {
      for (const seed of [1, 2, 3, 4]) {
        const { s, logs } = played(seed, mode);
        const entry = new Map(s.journal.map((j) => [j.day, j.text]));
        for (const [day, log] of logs) {
          const text = entry.get(day) ?? '';
          for (const k of MUST) if (log.some((l) => l.includes(k))) expect(text, `${mode} ${seed} day ${day}: ${k}`).toContain(k);
          const signs = log.filter((l) => SIGNS.test(l)).length;
          expect((text.match(/Signs of people/g) ?? []).length, `${mode} ${seed} day ${day}`).toBe(signs);
        }
        if (s.goalDay !== null) {
          goals += 1;
          expect(entry.get(s.goalDay), `${mode} ${seed}`).toContain('The whole party stands on the sugarloaf hill');
        }
      }
    }
    expect(goals).toBeGreaterThan(4);
  });
});

describe('the way home in the journal', () => {
  it('writes an entry for the day the party crosses the Nepean, and the climb back up the pass', () => {
    let crossed = 0;
    for (const seed of [1, 2, 3, 4, 5, 6]) {
      const { s } = played(seed, 'historical');
      const o = s.outcome!;
      const days = s.journal.map((j) => j.day);
      expect(days, `seed ${seed}`).toEqual(Array.from({ length: o.dayHome }, (_, i) => i + 1));
      const last = s.journal[s.journal.length - 1]!;
      expect(last.text, `seed ${seed}`).toContain('Back across the Nepean.');
      if (o.result !== 'crossed') continue;
      crossed += 1;
      const homeward = s.journal.filter((j) => j.day > o.goalDay!).map((j) => j.text).join(' ');
      expect(homeward, `seed ${seed}`).toMatch(/Up the pass: .* h of climbing\./);
    }
    expect(crossed).toBeGreaterThan(2);
  });
});
