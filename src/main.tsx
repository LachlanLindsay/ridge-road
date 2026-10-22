import { render } from 'preact';
import { App } from './ui/App';
import { currentSave } from './ui/save';
import './ui/styles.css';

// When the game runs as a published claude.ai page, the viewer can keep an open game across a
// republish. Elsewhere `claude` is absent and the game boots from its own saved state.
interface Hot {
  snapshot?: (get: () => unknown) => void;
  ready?: (start: (data: unknown) => void) => void;
  data?: unknown;
}
const hot = (window as unknown as { claude?: { hot?: Hot } }).claude?.hot;

const root = document.getElementById('app')!;
function start(data: unknown) {
  const save = (data as { save?: unknown } | null)?.save;
  if (import.meta.env.DEV && location.search.includes('gallery')) {
    void import('./ui/art/Gallery').then(({ Gallery }) => render(<Gallery />, root));
    return;
  }
  render(<App resume={typeof save === 'string' ? save : null} />, root);
}

try {
  hot?.snapshot?.(() => ({ save: currentSave() }));
} catch {
  // No hot-update hook here; the save in local storage is enough.
}
if (typeof hot?.ready === 'function') hot.ready(start);
else start(hot?.data ?? null);
