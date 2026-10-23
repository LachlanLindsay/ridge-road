import type { ComponentChildren } from 'preact';
import { useMemo } from 'preact/hooks';
import { T, type GameState, type Horse } from '../engine';
import { emptyFigure, horse } from './art/figures';
import { WEATHER_LABEL, longDate, plural } from './format';
import { Meter } from './parts';

/** Enough of a load to make the drawn horse hang its head, with nothing on its back drawn. */
const HEAD_DOWN = { total: 200, items: {} };

function horseTone(h: Horse): 'ok' | 'weak' | 'spent' | 'gone' {
  if (h.leftAt) return 'gone';
  if (h.condition < T.horses.exhaustedBelow) return 'spent';
  if (h.condition < T.horses.weakBelow) return 'weak';
  return 'ok';
}

/** One horse in silhouette, as the plates draw him: head up when he is fit, down when he is not. */
function HorseMark({ tone }: { tone: ReturnType<typeof horseTone> }) {
  const tired = tone === 'weak' || tone === 'spent';
  const d = useMemo(() => {
    const fig = emptyFigure();
    horse(fig, 20, 40.5, 1, 0.9, null, tired ? HEAD_DOWN : null);
    return { body: fig.ink.join(''), legs: [...fig.farLimbs, ...fig.limbs] };
  }, [tired]);
  return (
    <svg class={`herd-mark herd-${tone}`} viewBox="0 0 49 42" width="14" height="12" aria-hidden="true">
      <path d={d.body} />
      {d.legs.map((l, i) => (
        <path key={i} d={l.d} stroke-width={l.w} class="herd-leg" />
      ))}
    </svg>
  );
}

/** The horses in the top bar: the one thing the crossing turns on, always in sight. */
function Herd({ horses }: { horses: Horse[] }) {
  const words = horses.map((h) => `${h.name} ${h.leftAt ? 'left behind' : Math.round(h.condition)}`).join(', ');
  return (
    <span class="herd" role="img" aria-label={`Horses: ${words}`}>
      {horses
        .filter((h) => !h.leftAt?.startsWith('lost:'))
        .map((h) => (
          <HorseMark key={h.id} tone={horseTone(h)} />
        ))}
    </span>
  );
}

export function TopBar({ state, onMenu, unread = 0, children }: { state: GameState; onMenu: () => void; unread?: number; children?: ComponentChildren }) {
  const morale = Math.round(state.morale);
  const tone = morale < 25 ? 'low' : morale < 45 ? 'mid' : 'ok';
  return (
    <header class="topbar">
      <div class="topbar-inner">
        <div class="topbar-date">
          <span class="display date">{longDate(state.day)}</span>
          <span class="topbar-meta">
            Day {state.day} · {WEATHER_LABEL[state.weather]}
            {state.frostTonight ? ' · frost likely' : ''}
            {state.leg === 'home' ? ' · homeward' : ''}
          </span>
        </div>
        <div class="topbar-morale">
          <span class="topbar-meta" aria-label={`Morale ${morale} of 100`}>
            Morale {morale}
          </span>
          <Meter value={morale} tone={tone} />
          {state.horses.length > 0 && <Herd horses={state.horses} />}
        </div>
        <button type="button" class="icon-btn menu-btn" onClick={onMenu} aria-label={unread ? `Menu: ${plural(unread, 'journal card')} to read` : 'Menu'}>
          <svg viewBox="0 0 24 24" width="22" height="22" aria-hidden="true">
            <path d="M4 7h16M4 12h16M4 17h16" class="btn-glyph" />
          </svg>
          {unread > 0 && (
            <span class="menu-badge" aria-hidden="true">
              {unread}
            </span>
          )}
        </button>
      </div>
      {children}
    </header>
  );
}
