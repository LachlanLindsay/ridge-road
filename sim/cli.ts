// npm run sim -- --bot historical --runs 1000 [--seed 1] [--mode historical] [--json] [--trace]
import { replay, type Mode } from '../src/engine/index';
import { BOTS } from './bots';
import { playRun, summarise, type RunResult, type Summary } from './run';

interface Args {
  bot: string;
  runs: number;
  seed: number;
  mode: Mode;
  json: boolean;
  trace: boolean;
}

function parse(argv: string[]): Args {
  const args: Args = { bot: 'historical', runs: 100, seed: 1, mode: 'historical', json: false, trace: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]!;
    const next = () => argv[++i] ?? '';
    if (a === '--bot') args.bot = next();
    else if (a === '--runs') args.runs = Number(next());
    else if (a === '--seed') args.seed = Number(next());
    else if (a === '--mode') args.mode = next() as Mode;
    else if (a === '--json') args.json = true;
    else if (a === '--trace') args.trace = true;
    else if (a === '--help' || a === '-h') {
      console.log('npm run sim -- --bot historical|naive|cautious|all --runs N [--seed S] [--mode easy|historical|hard] [--json] [--trace]');
      process.exit(0);
    }
  }
  return args;
}

const f1 = (v: number) => (Number.isFinite(v) ? v.toFixed(1) : '—');
const f0 = (v: number) => (Number.isFinite(v) ? Math.round(v).toLocaleString('en-US') : '—');
const pc = (v: number) => `${f1(v)}%`;

function print(sum: Summary, mode: Mode, firstSeed: number) {
  const reasons = Object.entries(sum.repulsedBy)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${pc(v)}`)
    .join(', ');
  const titles = Object.entries(sum.titles)
    .sort((a, b) => b[1] - a[1])
    .map(([k, v]) => `${k} ${pc(v)}`)
    .join(' · ');
  console.log(`\nbot ${sum.bot} · mode ${mode} · ${sum.runs} runs (seeds ${firstSeed}–${firstSeed + sum.runs - 1})`);
  console.log(`  Reached the goal        ${pc(sum.reachedGoal)}   median day ${f1(sum.medianGoalDay)} (p10 ${f1(sum.p10GoalDay)}, p90 ${f1(sum.p90GoalDay)})`);
  console.log(`  Crossed and returned    ${pc(sum.crossed)}   median ${f1(sum.medianDaysHome)} days home`);
  console.log(`  Repulsed                ${pc(sum.repulsed)}${reasons ? `   (${reasons})` : ''}`);
  if (sum.stuck > 0) console.log(`  Stuck (timed out)       ${pc(sum.stuck)}`);
  console.log(`  Food left at the ford   median ${f1(sum.medianFoodLeft)} lb`);
  console.log(`  Horses home             mean ${f1(sum.meanHorsesHome)} · lowest condition mean ${f1(sum.meanMinHorse)} · at the descent ${f1(sum.meanHorseAtDescent)}`);
  console.log(`  Refusals                mean ${sum.meanRefusals.toFixed(2)} per run`);
  console.log(`  Dead ends found         mean ${f1(sum.meanDeadEnds)} · rest days ${f1(sum.meanRestDays)} · dry nights ${f1(sum.meanDryNights)} · illnesses ${f1(sum.meanIllnesses)}`);
  console.log(`  Mean stamina at dusk    ${f1(sum.meanStamina)}`);
  console.log(`  Score                   median ${f0(sum.medianScore)} · ${titles}`);
}

function determinism(seeds: number[], mode: Mode): boolean {
  const bot = BOTS.historical!;
  for (const seed of seeds) {
    const a = playRun(seed, bot, { mode }).state;
    const b = playRun(seed, bot, { mode }).state;
    const c = replay(a.opts, a.actions);
    if (JSON.stringify(a) !== JSON.stringify(b) || JSON.stringify(a) !== JSON.stringify(c)) return false;
  }
  return true;
}

function main() {
  const args = parse(process.argv.slice(2));
  const names = args.bot === 'all' ? Object.keys(BOTS) : [args.bot];
  const summaries: Summary[] = [];
  const all: Record<string, RunResult[]> = {};
  for (const name of names) {
    const bot = BOTS[name];
    if (!bot) throw new Error(`Unknown bot ${name}. Bots: ${Object.keys(BOTS).join(', ')}`);
    const results: RunResult[] = [];
    for (let i = 0; i < args.runs; i++) {
      const seed = args.seed + i;
      const trace = args.trace && i === 0;
      const { result } = playRun(seed, bot, {
        mode: args.mode,
        onLog: trace ? (lines) => lines.forEach((l) => console.log(`d${l.day} ${l.half.padEnd(9)} ${l.text}`)) : undefined,
        onPlan: trace
          ? (s, plan) => {
              const tasks = Object.entries(plan.tasks).map(([k, v]) => `${k.slice(0, 3)}:${v}`).join(' ');
              const horses = s.horses.map((h) => Math.round(h.condition)).join('/');
              const st = Math.round(s.men.reduce((a, m) => a + m.stamina, 0) / s.men.length);
              console.log(`   [${s.phase} at ${s.camp} (${s.map.nodes[s.camp]!.routeMiles} mi) → ${plan.target ?? '-'}${plan.moveTo ? ` move ${plan.moveTo}` : ''}${plan.advance ? ' advance' : ''}] morale ${Math.round(s.morale)} stamina ${st} horses ${horses} food ${Math.round(s.stores.flour + s.stores.saltMeat)} | ${tasks}`);
            }
          : undefined,
      });
      results.push(result);
    }
    all[name] = results;
    const sum = summarise(name, results);
    summaries.push(sum);
    if (!args.json) print(sum, args.mode, args.seed);
  }

  if (args.json) {
    console.log(JSON.stringify({ mode: args.mode, summaries }, null, 2));
    return;
  }

  const hist = summaries.find((x) => x.bot === 'historical');
  const naive = summaries.find((x) => x.bot === 'naive');
  if (hist || naive) {
    console.log('\nM1 acceptance');
    if (hist) {
      const ok = hist.medianGoalDay >= 20 && hist.medianGoalDay <= 23;
      console.log(`  ${ok ? 'PASS' : 'FAIL'}  historical bot median days to the goal ${f1(hist.medianGoalDay)} (target 20–23)`);
    }
    if (naive) {
      const ok = naive.repulsed >= 60;
      console.log(`  ${ok ? 'PASS' : 'FAIL'}  naive bot repulsed in ${pc(naive.repulsed)} of runs (target at least 60%)`);
    }
    const det = determinism([args.seed, args.seed + 1, args.seed + 2], args.mode);
    console.log(`  ${det ? 'PASS' : 'FAIL'}  same seed and actions give the same end state (3 seeds, replayed)`);
  }
}

main();
