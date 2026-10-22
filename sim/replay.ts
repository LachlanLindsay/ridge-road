// Replay a tester's expedition from the replay code in their feedback report.
//
//   npm run replay -- <report file | code> [--trace] [--until N] [--save out.json]
//
// The code can be pasted on its own or inside the whole report. --trace prints each order and what
// it led to; --until stops after N orders; --save writes the resulting game as a save file, which can
// be loaded into the browser (local storage key ridge-road.save.v1) to see the same screen.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { applyAction, newGame, toSave, type GameState } from '../src/engine';
import { decodeReplay } from '../src/ui/replaycode';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(name);
  return i >= 0 ? (args[i + 1] ?? '') : null;
};
const input = args.find((a, i) => !a.startsWith('--') && !['--until', '--save'].includes(args[i - 1] ?? ''));
if (!input) {
  console.error('Usage: npm run replay -- <report file | code> [--trace] [--until N] [--save out.json]');
  process.exit(2);
}
const text = existsSync(input) ? readFileSync(input, 'utf8') : input;
const data = await decodeReplay(text);
const until = flag('--until') ? Number(flag('--until')) : data.a.length;
const trace = args.includes('--trace');

const o = data.o;
console.log(`Build ${data.b}. Seed ${o.seed}, ${o.mode}${o.party ? `, party ${JSON.stringify(o.party)}` : ''}. ${data.a.length} orders.`);
let s: GameState = newGame(o);
let seen = 0;
for (let i = 0; i < Math.min(until, data.a.length); i++) {
  const a = data.a[i]!;
  const where = `day ${s.day} ${s.phase}`;
  const day = s.day;
  try {
    s = applyAction(s, a);
  } catch (e) {
    console.log(`Order ${i + 1} (${a.t}, ${where}) failed: ${(e as Error).message}`);
    process.exitCode = 1;
    break;
  }
  if (trace) {
    const what = a.t === 'half' ? `plan ${JSON.stringify(a.plan)}` : a.t === 'choose' ? `choice ${a.choice}` : `camp ${JSON.stringify(a.orders)}`;
    console.log(`${String(i + 1).padStart(3)}. ${where}: ${what}`);
    // Only the lines this order added; a new day starts a new log.
    if (s.day !== day) seen = 0;
    for (const line of s.today.log.slice(seen)) console.log(`       ${line}`);
    seen = s.today.log.length;
  }
}
console.log(
  `Now day ${s.day}, ${s.phase}, ${s.leg === 'home' ? 'homeward' : 'outward'}, camp ${s.camp}, morale ${Math.round(s.morale)}, ` +
    `food ${Math.round(s.stores.flour + s.stores.saltMeat)} lb${s.outcome ? `. ${s.outcome.result}${s.outcome.score !== null ? `, ${s.outcome.score} points` : ''}` : ''}.`,
);
const out = flag('--save');
if (out) {
  writeFileSync(out, toSave(s));
  console.log(`Saved to ${out}.`);
}
