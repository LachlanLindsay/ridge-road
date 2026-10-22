// Cards for the people, horses and dogs: hover with a mouse for a quick look, press and hold on a
// touch screen (or right-click) for the whole card. Lists and pictures open the card on a tap.
import { createContext, type ComponentChildren } from 'preact';
import { useContext, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'preact/hooks';
import { CARDS, type GameState, type Mode } from '../engine';
import { CARD_SOURCES, CARD_TEXT } from './copy';
import { infoFor, type Info, type Who } from './people';
import { Sheet } from './Sheet';

/** What a card sheet can show: someone in the party, or a journal card found on the way. */
export type Opened = Who | { kind: 'card'; id: string };

export interface InfoApi {
  /** Open the whole card in a sheet. */
  open: (w: Opened) => void;
  /** Show the quick card beside an element (mouse only); `click` says a click opens the whole card. */
  peek: (w: Who, el: Element, click: boolean) => void;
  unpeek: () => void;
}

export const InfoContext = createContext<InfoApi | null>(null);

const HOLD_MS = 450;
const PEEK_MS = 300;
const SLOP_PX = 10;

/**
 * Handlers that open a card. `hold`: for controls whose tap already does something (a roster chip
 * changes the man's task): hover shows the quick card, holding or right-clicking opens the whole
 * one, and `held()` tells the control's own click to stand down after a hold. `tap`: for rows and
 * pictures, where a tap or click opens the card.
 */
export function useInfo(who: Who | null, mode: 'hold' | 'tap' = 'hold') {
  const api = useContext(InfoContext);
  const timer = useRef<number | null>(null);
  const origin = useRef<[number, number] | null>(null);
  const wasHeld = useRef(false);
  const clear = () => {
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = null;
  };
  useEffect(() => clear, []);
  const props = useMemo(() => {
    if (!api || !who) return {};
    const base = {
      onPointerEnter: (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        clear();
        const el = e.currentTarget as Element;
        timer.current = window.setTimeout(() => {
          timer.current = null;
          api.peek(who, el, mode === 'tap');
        }, PEEK_MS);
      },
      onPointerLeave: (e: PointerEvent) => {
        if (e.pointerType !== 'mouse') return;
        clear();
        api.unpeek();
      },
      onContextMenu: (e: MouseEvent) => {
        e.preventDefault();
        if (wasHeld.current) return;
        clear();
        api.unpeek();
        api.open(who);
      },
    };
    if (mode === 'tap') {
      return {
        ...base,
        onClick: () => {
          clear();
          api.unpeek();
          api.open(who);
        },
      };
    }
    return {
      ...base,
      onPointerDown: (e: PointerEvent) => {
        wasHeld.current = false;
        clear();
        if (e.pointerType === 'mouse') {
          api.unpeek();
          return;
        }
        origin.current = [e.clientX, e.clientY];
        timer.current = window.setTimeout(() => {
          timer.current = null;
          wasHeld.current = true;
          api.open(who);
        }, HOLD_MS);
      },
      onPointerMove: (e: PointerEvent) => {
        const o = origin.current;
        if (!o || timer.current === null) return;
        if (Math.hypot(e.clientX - o[0], e.clientY - o[1]) > SLOP_PX) clear();
      },
      onPointerUp: () => {
        clear();
        origin.current = null;
      },
      onPointerCancel: () => {
        clear();
        origin.current = null;
      },
      // A hold ends without the tap that would change the task. If the browser sends the tap
      // anyway, `held()` turns it away; either way the hold is forgotten soon after.
      onTouchEnd: (e: TouchEvent) => {
        if (!wasHeld.current) return;
        if (e.cancelable) e.preventDefault();
        window.setTimeout(() => {
          wasHeld.current = false;
        }, 600);
      },
    };
    // `who` is compared by value: the same man, horse or pack of dogs keeps the same handlers.
  }, [api, who && JSON.stringify(who), mode]);
  const held = () => {
    const h = wasHeld.current;
    wasHeld.current = false;
    return h;
  };
  return { props, held };
}

/** The card's body: who, how he is, what he does in the game, and 1813. */
export function InfoBody({ info, quick = false, click = false }: { info: Info; quick?: boolean; click?: boolean }) {
  const history = quick ? info.history.slice(0, 1) : info.history;
  return (
    <div class={quick ? 'info info-quick' : 'info'}>
      <p class="info-role">{info.role}</p>
      {info.now && <p class="info-now">{info.now}</p>}
      <h3 class="section-title">In the game</h3>
      <ul class="info-game">
        {info.game.map((g) => (
          <li key={g}>{g}</li>
        ))}
      </ul>
      <h3 class="section-title">In 1813</h3>
      {history.map((p) => (
        <p key={p} class="info-history">
          {p}
        </p>
      ))}
      {quick ? <p class="info-more">{`${click ? 'Click' : 'Right-click'} ${info.history.length > 1 ? 'for the whole card' : 'to keep this open'}.`}</p> : <p class="card-source">{info.sources}</p>}
    </div>
  );
}

function Peek({ info, rect, click }: { info: Info; rect: DOMRect; click: boolean }) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const w = el.offsetWidth;
    const h = el.offsetHeight;
    const gap = 10;
    let left = rect.right + gap;
    let top = rect.top;
    if (left + w > vw - 8) left = rect.left - gap - w;
    if (left < 8) {
      // No room either side: centre it above or below.
      left = Math.min(vw - w - 8, Math.max(8, rect.left + rect.width / 2 - w / 2));
      top = rect.bottom + gap + h <= vh - 8 ? rect.bottom + gap : rect.top - gap - h;
    }
    top = Math.min(vh - h - 8, Math.max(8, top));
    setPos({ left, top });
  }, [rect, info]);
  return (
    <div ref={ref} class="peek" role="tooltip" style={pos ? { left: `${pos.left}px`, top: `${pos.top}px` } : { visibility: 'hidden', left: '0px', top: '0px' }}>
      <p class="peek-title display">{info.title}</p>
      <InfoBody info={info} quick click={click} />
    </div>
  );
}

/**
 * Provides the card handlers to everything inside, and draws the quick card and the card sheet.
 * Without a game, cards describe the party being outfitted for the chosen mode.
 */
/** A journal card in a sheet of its own, opened from the report line that found it. */
function JournalCard({ id }: { id: string }) {
  return (
    <div class="info">
      {(CARD_TEXT[id] ?? []).map((p) => (
        <p key={p} class="info-history">
          {p}
        </p>
      ))}
      {CARD_SOURCES[id] && <p class="card-source">{CARD_SOURCES[id]}</p>}
      <p class="info-more">Every card you find is kept in the Journal, under the menu.</p>
    </div>
  );
}

/** The id of the journal card a report line announces ("Journal card: The rock wall."), if any. */
export function cardInLine(line: string): string | null {
  const m = /^Journal card: (.+)\.$/.exec(line);
  if (!m) return null;
  return Object.keys(CARDS).find((id) => CARDS[id]!.title === m[1]) ?? null;
}

/**
 * Buttons naming everyone in a party, each opening that one's card: the keyboard's way in, after a
 * line saying the picture above works too.
 */
export function MeetRow({ whos }: { whos: { who: Who; name: string }[] }) {
  return (
    <p class="meet">
      <span class="hint-touch">Tap anyone in the picture to meet them, or a name:</span>
      <span class="hint-mouse">Point at anyone in the picture to meet them, or pick a name:</span>{' '}
      {whos.map((w, i) => (
        <MeetButton key={i} who={w.who} name={w.name} last={i === whos.length - 1} />
      ))}
    </p>
  );
}

function MeetButton({ who, name, last }: { who: Who; name: string; last: boolean }) {
  const info = useInfo(who, 'tap');
  return (
    <>
      <button type="button" class="link-btn link-inline meet-btn" {...info.props}>
        {name}
      </button>
      {last ? '' : ' · '}
    </>
  );
}

/** Cards that open by themselves when found: the moments the whole crossing is about. */
export const MILESTONE_CARDS = ['viewBack', 'highHeath', 'wayDown', 'sugarloaf'] as const;

export function InfoLayer({
  state,
  mode,
  onCardOpen,
  children,
}: {
  state: GameState | null;
  mode: Mode;
  /** Told whenever a journal card is opened, from wherever: the slip, a report line, the journal. */
  onCardOpen?: (id: string) => void;
  children: ComponentChildren;
}) {
  const [open, setOpen] = useState<Opened | null>(null);
  const [peek, setPeek] = useState<{ who: Who; rect: DOMRect; click: boolean } | null>(null);
  const cardOpened = useRef(onCardOpen);
  cardOpened.current = onCardOpen;
  const api = useMemo<InfoApi>(
    () => ({
      open: (w) => {
        setPeek(null);
        setOpen(w);
        if (w.kind === 'card') cardOpened.current?.(w.id);
      },
      peek: (w, el, click) => setPeek({ who: w, rect: el.getBoundingClientRect(), click }),
      unpeek: () => setPeek(null),
    }),
    [],
  );
  // A milestone card found this turn opens on its own, once.
  const seen = useRef<Set<string> | null>(null);
  useEffect(() => {
    if (!state) return;
    if (!seen.current) {
      seen.current = new Set(state.cards);
      return;
    }
    for (const id of state.cards) {
      if (seen.current.has(id)) continue;
      seen.current.add(id);
      if ((MILESTONE_CARDS as readonly string[]).includes(id) && CARDS[id]) api.open({ kind: 'card', id });
    }
  }, [state?.cards.length]);
  useEffect(() => {
    if (!peek) return;
    const hide = () => setPeek(null);
    window.addEventListener('scroll', hide, true);
    window.addEventListener('resize', hide);
    return () => {
      window.removeEventListener('scroll', hide, true);
      window.removeEventListener('resize', hide);
    };
  }, [peek]);
  useEffect(() => {
    if (!open) return;
    // Escape closes the card before anything under it.
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== 'Escape') return;
      e.stopImmediatePropagation();
      setOpen(null);
    };
    window.addEventListener('keydown', onKey, true);
    return () => window.removeEventListener('keydown', onKey, true);
  }, [open]);
  const openInfo = open && open.kind !== 'card' ? infoFor(open, state, mode) : null;
  const openCard = open && open.kind === 'card' && CARDS[open.id] ? open.id : null;
  const peekInfo = peek && !open ? infoFor(peek.who, state, mode) : null;
  return (
    <InfoContext.Provider value={api}>
      {children}
      {peek && peekInfo && <Peek info={peekInfo} rect={peek.rect} click={peek.click} />}
      {openInfo && (
        <Sheet title={openInfo.title} onClose={() => setOpen(null)} class="sheet-info">
          <InfoBody info={openInfo} />
        </Sheet>
      )}
      {openCard && (
        <Sheet title={CARDS[openCard]!.title} onClose={() => setOpen(null)} class="sheet-info">
          <JournalCard id={openCard} />
        </Sheet>
      )}
    </InfoContext.Provider>
  );
}
