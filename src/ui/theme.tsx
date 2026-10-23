// Light or dark pages: follow the device, or the player's choice, kept on this device. The
// stylesheet does the rest from the data-theme attribute on the root element.
import { useState } from 'preact/hooks';

export type Theme = 'system' | 'light' | 'dark';

const KEY = 'ridge-road.theme.v1';

export function readTheme(): Theme {
  try {
    const t = localStorage.getItem(KEY);
    return t === 'light' || t === 'dark' ? t : 'system';
  } catch {
    return 'system';
  }
}

const BAR = { light: '#e8ebe3', dark: '#1c2127' };

export function applyTheme(t: Theme) {
  const root = document.documentElement;
  if (t === 'system') delete root.dataset.theme;
  else root.dataset.theme = t;
  // The browser's bar follows the choice too: a forced theme sets both tints to its own colour.
  document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"]').forEach((m) => {
    const own = m.media.includes('dark') ? BAR.dark : BAR.light;
    m.content = t === 'system' ? own : BAR[t];
  });
}

function saveTheme(t: Theme) {
  applyTheme(t);
  try {
    if (t === 'system') localStorage.removeItem(KEY);
    else localStorage.setItem(KEY, t);
  } catch {
    // A convenience only.
  }
}

const OPTIONS: { id: Theme; label: string }[] = [
  { id: 'system', label: 'Device' },
  { id: 'light', label: 'Light' },
  { id: 'dark', label: 'Dark' },
];

/** Three buttons: follow the device, always light, always dark. */
export function ThemeChoice({ id = 'theme' }: { id?: string }) {
  const [theme, setTheme] = useState<Theme>(readTheme);
  return (
    <fieldset class="theme-choice">
      <legend class="section-title">Light or dark</legend>
      <div class="seg-row">
        {OPTIONS.map((o) => (
          <label key={o.id} class={theme === o.id ? 'seg is-on' : 'seg'}>
            <input
              type="radio"
              name={id}
              value={o.id}
              checked={theme === o.id}
              onChange={() => {
                setTheme(o.id);
                saveTheme(o.id);
              }}
            />
            <span class="seg-label">{o.label}</span>
          </label>
        ))}
      </div>
    </fieldset>
  );
}
