// Development only (?mapgallery): the map of one expedition at several days, played by the
// historical bot, for reviewing the drawing. ?seed=5&mode=easy&days=1,4,8&w=390&h=440&dark
import { BOTS } from '../../sim/bots';
import { chooseEvent, endDay, newGame, resolveHalfDay, type GameState, type Mode } from '../engine';
import { mapDraw } from './geometry';
import { MapView } from './MapView';

function playTo(seed: number, mode: Mode, day: number, phase: string): { s: GameState; target: string | null; moveTo: string | null } {
  const bot = BOTS.historical!;
  let s = newGame({ seed, mode });
  const settle = () => {
    while (s.pending.length) s = chooseEvent(s, bot.choose(s));
  };
  for (let i = 0; i < 600 && s.phase !== 'over'; i++) {
    settle();
    if (s.day >= day && (s.phase === phase || (phase === 'morning' && s.phase !== 'evening'))) break;
    if (s.phase === 'evening') s = endDay(s, bot.evening(s)).state;
    else s = resolveHalfDay(s, bot.plan(s)).state;
  }
  settle();
  if (s.phase === 'morning' || s.phase === 'afternoon') {
    const plan = bot.plan(s);
    return { s, target: plan.target ?? null, moveTo: plan.moveTo ?? null };
  }
  return { s, target: null, moveTo: null };
}

export function MapGallery() {
  const q = new URLSearchParams(location.search);
  const seed = Number(q.get('seed') ?? 5);
  const mode = (q.get('mode') ?? 'easy') as Mode;
  const days = (q.get('days') ?? '1,4,8,12,17').split(',').map(Number);
  const phase = q.get('phase') ?? 'morning';
  const w = Number(q.get('w') ?? 390);
  const h = Number(q.get('h') ?? 440);
  if (q.has('dark')) document.documentElement.dataset.theme = 'dark';
  return (
    <main style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '12px', background: 'var(--paper-2)' }}>
      {days.map((d) => {
        const { s, target, moveTo } = playTo(seed, mode, d, phase);
        return (
          <section key={d} data-day={d} style={{ display: 'grid', gap: '4px' }}>
            <p class="fine">
              seed {seed} · {mode} · day {s.day} {s.phase}
              {s.leg === 'home' ? ' · homeward' : ''}
            </p>
            <div style={{ width: `${w}px`, height: `${h}px`, display: 'grid', border: '1px solid var(--line)' }}>
              <MapView draw={mapDraw(s)} campKey={`${s.camp}:${s.day}`} selected={null} target={target} moveTo={moveTo} onTap={() => {}} onKey={() => {}} size="mid" onSize={() => {}} />
            </div>
          </section>
        );
      })}
    </main>
  );
}
