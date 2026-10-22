import { render } from 'preact';
import { App } from './ui/App';
import { BUILD } from './ui/build';
import { Guard } from './ui/Crash';
import { currentSave } from './ui/save';
import './ui/fonts.css';
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
/** Development only (?crash): a component that fails to render, to see the crash screen. */
function Boom(): null {
  throw new Error('A test crash, from ?crash in the address.');
}

function start(data: unknown) {
  const d = data as { save?: unknown; build?: unknown } | null;
  if (import.meta.env.DEV && location.search.includes('gallery')) {
    void import('./ui/art/Gallery').then(({ Gallery }) => render(<Gallery />, root));
    return;
  }
  if (import.meta.env.DEV && location.search.includes('crash')) {
    render(
      <Guard>
        <Boom />
      </Guard>,
      root,
    );
    return;
  }
  render(
    <Guard>
      <App resume={typeof d?.save === 'string' ? d.save : null} resumeBuild={typeof d?.build === 'string' ? d.build : null} />
    </Guard>,
    root,
  );
}

try {
  hot?.snapshot?.(() => ({ save: currentSave(), build: BUILD }));
} catch {
  // No hot-update hook here; the save in local storage is enough.
}
if (typeof hot?.ready === 'function') hot.ready(start);
else start(hot?.data ?? null);
