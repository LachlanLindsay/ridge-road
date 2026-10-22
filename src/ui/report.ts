// The text of a feedback or crash report: who, where, what the tester said, and a replay code.
import type { GameState } from '../engine';
import { BUILD } from './build';
import { shortDate } from './format';

/** Screen size, theme and browser: enough to reproduce a layout problem. */
export function deviceLine(): string {
  try {
    const theme = matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    return `${innerWidth}×${innerHeight}, ${theme}, ${navigator.userAgent}`;
  } catch {
    return 'unknown';
  }
}

export function reportText(o: { state: GameState | null; note: string; code: string | null; error?: string; device?: string }): string {
  const s = o.state;
  const lines = ['Ridge Road feedback', `Build: ${BUILD}`];
  if (s) {
    lines.push(`Expedition: seed ${s.seed}, ${s.mode}, day ${s.day} (${shortDate(s.day)}), ${s.phase}${s.leg === 'home' ? ', homeward' : ''}`);
    lines.push(`Party: ${s.men.length} men, ${s.horses.length} horses, ${s.dogs} dogs`);
    if (s.outcome) lines.push(`Result: ${s.outcome.result}${s.outcome.score !== null ? `, ${s.outcome.score} points` : ''}`);
  } else {
    lines.push('Expedition: none in progress');
  }
  lines.push(`Device: ${o.device ?? deviceLine()}`);
  if (o.error) lines.push(`Error: ${o.error}`);
  lines.push('', 'Note:', o.note.trim() || '(none)');
  if (o.code) lines.push('', 'Replay code:', o.code);
  return lines.join('\n');
}
