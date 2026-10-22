import { JOURNAL_1813, type GameState } from '../engine';
import { useState } from 'preact/hooks';
import { EndArt } from './art/scenes';
import { CARD_TEXT } from './copy';
import { Feedback } from './Feedback';
import { lb, mi, plural } from './format';

const REASON: Record<string, string> = {
  morale: 'the men lost heart',
  food: 'the food ran out',
  illness: 'too many men fell ill',
  horses: 'the horses were finished',
  chose: 'you gave up the attempt',
  refusal: 'the men refused to go on',
};

/** Share of the route covered by the end of each day, for you and for the 1813 party. */
function Ghost({ state }: { state: GameState }) {
  const route = state.map.routeMiles;
  const outDays = state.goalDay ?? state.turnedBackDay ?? state.stats.campMilesByDay.length;
  const yours = state.stats.campMilesByDay.slice(0, Math.max(1, outDays)).map((m) => Math.min(1, m / route));
  let cum = 0;
  const total = JOURNAL_1813.days.reduce((s, d) => s + d.move, 0);
  const ghost = JOURNAL_1813.days.map((d) => (cum += d.move) / total);
  const days = Math.max(yours.length, ghost.length);
  const W = 320;
  const H = 168;
  const L = 34;
  const R = 22;
  const Tp = 14;
  const B = 26;
  const x = (i: number) => L + ((W - L - R) * i) / Math.max(1, days);
  const y = (v: number) => Tp + (H - Tp - B) * (1 - v);
  const path = (vs: number[]) => vs.map((v, i) => `${i ? 'L' : 'M'}${x(i + 1).toFixed(1)} ${y(v).toFixed(1)}`).join('');
  const ticks = [1, 7, 14, 21, 28, 35].filter((d) => d <= days);
  return (
    <figure class="ghost">
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`Share of the route covered each day: yours over ${yours.length} days against the 1813 party's 21`}>
        {[0, 0.5, 1].map((v) => (
          <g key={v}>
            <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} class="ghost-grid" />
            <text x={L - 6} y={y(v)} class="ghost-axis" text-anchor="end" dominant-baseline="central">
              {Math.round(v * 100)}%
            </text>
          </g>
        ))}
        {ticks.map((d, i) => (
          <text key={d} x={x(d)} y={H - 8} class="ghost-axis" text-anchor={i === ticks.length - 1 && x(d) > W - 40 ? 'end' : 'middle'}>
            Day {d}
          </text>
        ))}
        <path d={path(ghost)} class="ghost-1813" />
        <path d={path(yours)} class="ghost-you" />
        <text x={x(ghost.length) + 2} y={y(ghost[ghost.length - 1]!) + 12} class="ghost-label ghost-label-1813" text-anchor="end">
          1813
        </text>
        <text x={Math.min(x(yours.length) + 4, W - R)} y={y(yours[yours.length - 1] ?? 0) - 6} class="ghost-label" text-anchor={x(yours.length) > W - 60 ? 'end' : 'start'}>
          You
        </text>
      </svg>
      <figcaption>Share of the route covered by each evening. The 1813 line follows Blaxland's camp-to-camp miles; its flat days are cutting and rest.</figcaption>
    </figure>
  );
}

export function EndScreen({ state, onNew, onTitle }: { state: GameState; onNew: () => void; onTitle: () => void }) {
  const [feedback, setFeedback] = useState(false);
  const o = state.outcome!;
  const crossed = o.result === 'crossed';
  return (
    <main class="end">
      <div class="end-art">
        <EndArt crossed={crossed} counts={{ servants: Math.max(0, state.men.length - 3), horses: o.horsesHome, dogs: state.dogs }} />
      </div>
      <div class="end-inner">
        <p class="end-kicker">{crossed ? `Home on day ${o.dayHome}` : `Turned back on day ${o.turnedBackDay ?? o.dayHome}`}</p>
        <h1 class="display end-title">{crossed ? 'Crossed and returned' : 'Repulsed'}</h1>
        {crossed ? (
          <p class="end-sub">
            <span class="display">{o.title}</span> · {o.score?.toLocaleString('en-AU')} points. You reached the sugarloaf hill on day {o.goalDay}; the 1813 party took 21.
          </p>
        ) : (
          <p class="end-sub">
            The party turned back because {REASON[o.reason ?? ''] ?? 'it could go no further'}. Furthest point: {mi(o.furthestMiles)} from the Nepean in a straight line. The high heath, where the 1813 party turned north, is 18.
          </p>
        )}

        {crossed && (
          <table class="score">
            <tbody>
              {o.breakdown.map((l) => (
                <tr key={l.label}>
                  <td>{l.label}</td>
                  <td class="num">{l.points > 0 ? `+${l.points}` : l.points}</td>
                </tr>
              ))}
              <tr class="score-total">
                <td>Total</td>
                <td class="num">{o.score}</td>
              </tr>
            </tbody>
          </table>
        )}

        <Ghost state={state} />

        <dl class="facts">
          <div>
            <dt>Horses home</dt>
            <dd>
              {o.horsesHome} of {state.horses.length}
            </dd>
          </div>
          <div>
            <dt>Food left</dt>
            <dd>{lb(o.foodLeft)}</dd>
          </div>
          <div>
            <dt>Dead ends</dt>
            <dd>{state.stats.deadEnds ? `${plural(state.stats.deadEnds, 'branch', 'branches')} ended in cliffs` : 'None found'}</dd>
          </div>
          <div>
            <dt>Rest days</dt>
            <dd>{state.stats.restDays}</dd>
          </div>
        </dl>

        <section class="history">
          <h2 class="display">After 1813</h2>
          {CARD_TEXT.after1813!.map((p) => (
            <p key={p}>{p}</p>
          ))}
        </section>

        <div class="end-actions">
          <button type="button" class="btn btn-go" onClick={onNew}>
            New expedition
          </button>
          <button type="button" class="btn btn-quiet" onClick={() => setFeedback(true)}>
            Send feedback on this expedition
          </button>
          <button type="button" class="btn btn-quiet" onClick={onTitle}>
            Title screen
          </button>
        </div>
        <p class="fine">
          Seed {state.seed} · {state.mode}
        </p>
      </div>
      {feedback && <Feedback state={state} onClose={() => setFeedback(false)} />}
    </main>
  );
}
