import type { ComponentChildren } from 'preact';
import type { GameState } from '../engine';
import { WEATHER_LABEL, longDate, plural } from './format';
import { Meter } from './parts';

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
        <div class="topbar-morale" aria-label={`Morale ${morale} of 100`}>
          <span class="topbar-meta">Morale {morale}</span>
          <Meter value={morale} tone={tone} />
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
