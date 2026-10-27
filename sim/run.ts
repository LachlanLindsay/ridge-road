// Play whole runs with a bot and collect the numbers.
import {
  chooseEvent,
  endDay,
  newGame,
  resolveHalfDay,
  type GameState,
  type HalfDayPlan,
  type LogLine,
  type Mode,
} from '../src/engine/index';
import type { Bot } from './bots';

export interface RunResult {
  seed: number;
  reachedGoal: boolean;
  goalDay: number | null;
  result: 'crossed' | 'repulsed' | 'stuck';
  reason: string | null;
  dayHome: number;
  daysHome: number | null;
  foodLeft: number;
  horsesHome: number;
  refusals: number;
  deadEnds: number;
  restDays: number;
  dryNights: number;
  illnesses: number;
  score: number | null;
  title: string;
  furthestMiles: number;
  minMorale: number;
  minHorse: number;
  horseAtDescent: number | null;
  meanStamina: number;
}

export interface RunOptions {
  mode?: Mode;
  maxDays?: number;
  onLog?: (lines: LogLine[], s: GameState) => void;
  onPlan?: (s: GameState, plan: HalfDayPlan) => void;
}

export function playRun(seed: number, bot: Bot, opts: RunOptions = {}): { state: GameState; result: RunResult } {
  try {
    return play(seed, bot, opts);
  } catch (e) {
    throw new Error(`bot ${bot.name}, seed ${seed}: ${(e as Error).message}`, { cause: e });
  }
}

function play(seed: number, bot: Bot, opts: RunOptions): { state: GameState; result: RunResult } {
  const maxDays = opts.maxDays ?? 90;
  bot.reset?.();
  let s = newGame({ seed, mode: opts.mode ?? 'historical' });
  let minMorale = s.morale;
  let minHorse = 100;
  let horseAtDescent: number | null = null;
  let staminaSum = 0;
  let staminaN = 0;
  let guard = 0;
  while (s.phase !== 'over' && s.day <= maxDays) {
    if (++guard > 5000) break;
    if (s.pending.length) {
      s = chooseEvent(s, bot.choose(s));
      continue;
    }
    if (s.phase === 'morning' || s.phase === 'afternoon') {
      const plan = bot.plan(s);
      opts.onPlan?.(s, plan);
      const r = resolveHalfDay(s, plan);
      opts.onLog?.(r.log, r.state);
      s = r.state;
    } else if (s.phase === 'evening') {
      staminaSum += s.men.reduce((a, m) => a + m.stamina, 0) / s.men.length;
      staminaN += 1;
      const r = endDay(s, bot.evening(s));
      opts.onLog?.([{ day: r.journal.day, half: 'night', text: r.journal.text }], r.state);
      s = r.state;
    }
    minMorale = Math.min(minMorale, s.morale);
    const withParty = s.horses.filter((h) => h.leftAt === null);
    if (withParty.length) minHorse = Math.min(minHorse, ...withParty.map((h) => h.condition));
    if (horseAtDescent === null && s.map.nodes[s.camp]!.feature === 'pass') {
      horseAtDescent = withParty.length ? withParty.reduce((a, h) => a + h.condition, 0) / withParty.length : 0;
    }
  }
  const o = s.outcome;
  const stuck = !o;
  const result: RunResult = {
    seed,
    reachedGoal: s.goalDay !== null,
    goalDay: s.goalDay,
    result: stuck ? 'stuck' : o.result,
    reason: stuck ? 'timeout' : o.reason,
    dayHome: s.day,
    daysHome: o && s.goalDay !== null ? o.dayHome - s.goalDay : null,
    foodLeft: o ? o.foodLeft : 0,
    horsesHome: o ? o.horsesHome : 0,
    refusals: s.stats.refusals,
    deadEnds: s.stats.deadEnds,
    restDays: s.stats.restDays,
    dryNights: s.stats.dryNights,
    illnesses: s.stats.illnesses,
    score: o ? o.score : null,
    title: o ? o.title : 'Stuck',
    furthestMiles: Math.round(s.furthestMiles * 10) / 10,
    minMorale,
    minHorse,
    horseAtDescent,
    meanStamina: staminaN ? staminaSum / staminaN : 0,
  };
  return { state: s, result };
}

// ---------------------------------------------------------------- statistics

export function quantile(xs: number[], q: number): number {
  if (!xs.length) return NaN;
  const a = [...xs].sort((x, y) => x - y);
  const pos = (a.length - 1) * q;
  const lo = Math.floor(pos);
  const hi = Math.ceil(pos);
  return a[lo]! + (a[hi]! - a[lo]!) * (pos - lo);
}

export const median = (xs: number[]) => quantile(xs, 0.5);
export const mean = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : NaN);

export interface Summary {
  bot: string;
  runs: number;
  reachedGoal: number;
  crossed: number;
  repulsed: number;
  stuck: number;
  repulsedBy: Record<string, number>;
  medianGoalDay: number;
  p10GoalDay: number;
  p90GoalDay: number;
  medianFoodLeft: number;
  meanHorsesHome: number;
  meanRefusals: number;
  meanDeadEnds: number;
  meanRestDays: number;
  medianDaysHome: number;
  medianScore: number;
  titles: Record<string, number>;
  meanMinHorse: number;
  meanHorseAtDescent: number;
  meanStamina: number;
  meanDryNights: number;
  meanIllnesses: number;
}

export function summarise(bot: string, results: RunResult[]): Summary {
  const n = results.length;
  const pct = (k: number) => (100 * k) / n;
  const goalDays = results.filter((r) => r.goalDay !== null).map((r) => r.goalDay!);
  const repulsed = results.filter((r) => r.result === 'repulsed');
  const repulsedBy: Record<string, number> = {};
  for (const r of repulsed) repulsedBy[r.reason ?? 'unknown'] = (repulsedBy[r.reason ?? 'unknown'] ?? 0) + 1;
  for (const k of Object.keys(repulsedBy)) repulsedBy[k] = pct(repulsedBy[k]!);
  const titles: Record<string, number> = {};
  for (const r of results) titles[r.title] = (titles[r.title] ?? 0) + 1;
  for (const k of Object.keys(titles)) titles[k] = pct(titles[k]!);
  const descents = results.filter((r) => r.horseAtDescent !== null).map((r) => r.horseAtDescent!);
  return {
    bot,
    runs: n,
    reachedGoal: pct(goalDays.length),
    crossed: pct(results.filter((r) => r.result === 'crossed').length),
    repulsed: pct(repulsed.length),
    stuck: pct(results.filter((r) => r.result === 'stuck').length),
    repulsedBy,
    medianGoalDay: median(goalDays),
    p10GoalDay: quantile(goalDays, 0.1),
    p90GoalDay: quantile(goalDays, 0.9),
    medianFoodLeft: median(results.filter((r) => r.result !== 'stuck').map((r) => r.foodLeft)),
    meanHorsesHome: mean(results.filter((r) => r.result !== 'stuck').map((r) => r.horsesHome)),
    meanRefusals: mean(results.map((r) => r.refusals)),
    meanDeadEnds: mean(results.map((r) => r.deadEnds)),
    meanRestDays: mean(results.map((r) => r.restDays)),
    medianDaysHome: median(results.filter((r) => r.daysHome !== null).map((r) => r.daysHome!)),
    medianScore: median(results.filter((r) => r.score !== null).map((r) => r.score!)),
    titles,
    meanMinHorse: mean(results.map((r) => r.minHorse)),
    meanHorseAtDescent: mean(descents),
    meanStamina: mean(results.map((r) => r.meanStamina)),
    meanDryNights: mean(results.map((r) => r.dryNights)),
    meanIllnesses: mean(results.map((r) => r.illnesses)),
  };
}
