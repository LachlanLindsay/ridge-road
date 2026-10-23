// A full-height sheet over the game, closed by its × button, a tap on the backdrop, or Escape
// (handled by whoever opened it).
import type { ComponentChildren } from 'preact';
import { useRef } from 'preact/hooks';

/** A tap that ends just after a sheet opens (a press and hold, say) is not a tap on the backdrop. */
const SETTLE_MS = 350;

export function Sheet({ title, onClose, children, class: cls, icon }: { title: string; onClose: () => void; children: ComponentChildren; class?: string; icon?: ComponentChildren }) {
  const opened = useRef(Date.now());
  return (
    <div class={cls ? `backdrop backdrop-sheet ${cls}` : 'backdrop backdrop-sheet'} onClick={(e) => e.target === e.currentTarget && Date.now() - opened.current > SETTLE_MS && onClose()}>
      <div class="overlay" role="dialog" aria-modal="true" aria-labelledby="overlay-title">
        <div class="overlay-head">
          {icon}
          <h2 id="overlay-title" class="display">
            {title}
          </h2>
          <button type="button" class="icon-btn" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div class="overlay-body">{children}</div>
      </div>
    </div>
  );
}
