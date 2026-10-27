// The end screen's chart: each label by the end of its own line, touching neither line nor the other label.
import { describe, expect, it } from 'vitest';
import { JOURNAL_1813, type Mode } from '../src/engine/index';
import { boxesTouch, ghostLayout, insidePlot, LABEL_1813, LABEL_YOU, labelBox, lineTouches } from '../src/ui/ghostChart';
import { BOTS } from '../sim/bots';
import { playRun } from '../sim/run';

let cum = 0;
const total = JOURNAL_1813.days.reduce((s, d) => s + d.move, 0);
const ghost = JOURNAL_1813.days.map((d) => (cum += d.move) / total);

function problems(yours: number[]): string[] {
  const g = ghostLayout(yours, ghost);
  const you = labelBox(g.labels.you, LABEL_YOU);
  const past = labelBox(g.labels.ghost, LABEL_1813);
  const out: string[] = [];
  if (lineTouches(g.you, you) || lineTouches(g.ghost, you)) out.push('"You" on a line');
  if (lineTouches(g.you, past) || lineTouches(g.ghost, past)) out.push('"1813" on a line');
  if (boxesTouch(you, past, 0)) out.push('labels touch');
  if (!insidePlot(you) || !insidePlot(past)) out.push('outside the plot');
  return out;
}

describe('the end chart’s labels', () => {
  it('keep "1813" off a line that runs just under the 1813 party’s to cross on day 23', () => {
    // The first outside tester's shape: close behind 1813 to the end, home two days later.
    const yours = [...ghost.slice(0, 20).map((v) => v * 0.93), 0.95, 0.97, 1];
    expect(problems(yours)).toEqual([]);
    // The old rule put "1813" straight below the end of its line, across this one.
    const g = ghostLayout(yours, ghost);
    const [ex, ey] = g.ghost[g.ghost.length - 1]!;
    expect(lineTouches(g.you, labelBox({ x: ex + 2, y: ey + 12, anchor: 'end' }, LABEL_1813))).toBe(true);
  });

  it('clear both lines and each other in played games and in any shape of line', () => {
    for (const mode of ['easy', 'historical', 'hard'] as Mode[]) {
      for (const bot of ['historical', 'naive', 'cautious']) {
        for (const seed of [1, 2, 3]) {
          const s = playRun(seed, BOTS[bot]!, { mode }).state;
          const outDays = s.goalDay ?? s.turnedBackDay ?? s.stats.campMilesByDay.length;
          const yours = s.stats.campMilesByDay.slice(0, Math.max(1, outDays)).map((m) => Math.min(1, m / s.map.routeMiles));
          expect(problems(yours), `${bot} ${mode} ${seed}`).toEqual([]);
        }
      }
    }
    // Lines of every length to 34 days, flat stretches and all, ending anywhere or at the goal.
    let seed = 2026;
    const rnd = () => (seed = (seed * 1103515245 + 12345) % 2147483648) / 2147483648;
    for (let i = 0; i < 600; i++) {
      const days = 1 + Math.floor(rnd() * 34);
      let v = 0;
      const yours = Array.from({ length: days }, () => (v = Math.min(1, v + (rnd() < 0.3 ? 0 : (rnd() * 2.2) / days))));
      if (days >= 10 && rnd() < 0.5) yours[days - 1] = 1;
      expect(problems(yours), yours.map((x) => x.toFixed(2)).join(' ')).toEqual([]);
    }
  }, 30_000);
});
