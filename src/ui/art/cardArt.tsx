// The pictures on the cards: a plate at the head of each journal card (the milestone cards drawn
// with the party as it is now), a thumbnail of it in the journal, a strip at the top of each event
// card, and the small figures that mark leaders and servants on the roster and on their cards.
import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { freshLb, withParty, type EventId, type GameState, type Item, type MemberId } from '../../engine';
import { packHorses } from '../outfitting';
import type { Who } from '../people';
import { CARD_FOCUS, CARD_PLATE_LABEL, CARD_PLATES, isCountryCard, isMilestone } from './cards';
import type { Scene } from './compose';
import { EVENT_ART, EVENT_ART_LABEL } from './events';
import { dog, emptyFigure, figureMarks, horse, man, type Mark, type Pack, type PartyCounts } from './figures';
import { COUNTS_1813, country, loads1813, milestone, MILESTONE_LABEL, Plate } from './scenes';
import { themeKey, thumbPicture } from './thumbs';

/** The journal thumbnail's size in CSS pixels; see .card-thumb. */
const THUMB_W = 96;
const THUMB_H = 54;

const LEADERS: MemberId[] = ['blaxland', 'lawson', 'wentworth'];

/** The Country landscape, shared by Whose Country and the Signs of Country (see cards.ts). */
const COUNTRY_LABEL = 'An engraving: across a deep valley to a wall of sandstone cliffs, smoke rising from fires on the valley floor.';
const COUNTRY_FOCUS = [96, 56, 250, 104] as const;

/** A milestone plate at the head of its card, cropped to the scene so the party shows larger. */
const MILESTONE_HEAD: Record<string, readonly [number, number, number, number]> = {
  viewBack: [0, 52, 330, 128],
  highHeath: [10, 70, 340, 110],
  wayDown: [0, 36, 360, 144],
  sugarloaf: [0, 50, 360, 130],
};

const MILESTONE_FOCUS: Record<string, readonly [number, number, number, number]> = {
  viewBack: [0, 84, 260, 96],
  highHeath: [40, 96, 260, 64],
  wayDown: [20, 52, 300, 116],
  sugarloaf: [20, 64, 300, 116],
};

const fixedCache = new Map<string, Scene>();
function fixedScene(id: string): Scene | null {
  const key = isCountryCard(id) ? 'country' : id;
  const hit = fixedCache.get(key);
  if (hit) return hit;
  const make = key === 'country' ? () => country() : CARD_PLATES[key];
  if (!make) return null;
  const scene = make();
  fixedCache.set(key, scene);
  return scene;
}

/** The party as it stands: men, the horses still with it, the dogs, and the stores packed onto the horses. */
export function partyNow(s: GameState | null): { counts: PartyCounts; loads: Pack[] } {
  if (!s) return { counts: COUNTS_1813, loads: loads1813() };
  const horses = s.horses.filter(withParty).length;
  const st = s.stores;
  const loadout: Record<Item, number> = {
    flour: st.flour,
    saltMeat: st.saltMeat + freshLb(st),
    tea: st.tea,
    shots: st.shots,
    axes: st.axes,
    hatchets: st.hatchets,
    hoe: st.hoe,
    blankets: st.blankets,
    shoes: st.shoes,
    campKit: st.campKit,
    grass: st.grass,
  };
  return { counts: { servants: Math.max(0, s.men.length - 3), horses, dogs: s.dogs }, loads: packHorses({ servants: 0, horses: Math.max(1, horses), dogs: 0, loadout }) };
}

/** A signature of the party, so a milestone plate is redrawn only when the party has changed. */
function partyKey(p: { counts: PartyCounts; loads: Pack[] }): string {
  return `${p.counts.servants}.${p.counts.horses}.${p.counts.dogs}|${p.loads.map((l) => Math.round(l.total / 10)).join(',')}`;
}

function useCardScene(id: string, state: GameState | null): { scene: Scene | null; label: string } {
  const party = isMilestone(id) ? partyNow(state) : null;
  const key = party ? partyKey(party) : '';
  const scene = useMemo(() => (party ? milestone(id, party.counts, party.loads) : fixedScene(id)), [id, key]);
  const label = isMilestone(id) ? MILESTONE_LABEL[id]! : isCountryCard(id) ? COUNTRY_LABEL : (CARD_PLATE_LABEL[id] ?? '');
  return { scene, label };
}

/** The plate at the head of a journal card. */
export function CardArt({ id, state }: { id: string; state: GameState | null }) {
  const { scene, label } = useCardScene(id, state);
  if (!scene) return null;
  return (
    <div class={isMilestone(id) ? 'card-art card-art-milestone' : 'card-art'}>
      <Plate scene={scene} label={label} class="plate" view={MILESTONE_HEAD[id]} />
    </div>
  );
}

/** Becomes true once the element has scrolled into view, and stays true. */
function useSeen<T extends Element>(): [preact.RefObject<T>, boolean] {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(() => typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (seen || !ref.current) return;
    const io = new IntersectionObserver((entries) => entries.some((e) => e.isIntersecting) && setSeen(true), { rootMargin: '120px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]);
  return [ref, seen];
}

/** A card's plate cropped to its subject, small, drawn only once it scrolls into view. */
export function CardThumb({ id, state }: { id: string; state: GameState | null }) {
  const [ref, seen] = useSeen<HTMLSpanElement>();
  return (
    <span ref={ref} class="card-thumb" aria-hidden="true">
      {seen && <ThumbPlate id={id} state={state} />}
    </span>
  );
}

function ThumbPlate({ id, state }: { id: string; state: GameState | null }) {
  const party = isMilestone(id) ? partyNow(state) : null;
  const theme = themeKey();
  const key = `${isCountryCard(id) ? 'country' : id}|${party ? partyKey(party) : ''}|${theme}`;
  const [url, setUrl] = useState<string | null>(null);
  useEffect(() => {
    let live = true;
    const view = MILESTONE_FOCUS[id] ?? (isCountryCard(id) ? COUNTRY_FOCUS : CARD_FOCUS[id]);
    const p = thumbPicture(key, () => {
      const scene = party ? milestone(id, party.counts, party.loads) : fixedScene(id);
      return scene ? { scene, view } : null;
    }, THUMB_W, THUMB_H, theme);
    void p?.then((u) => live && setUrl(u));
    return () => {
      live = false;
    };
  }, [key]);
  return url ? <img class="card-thumb-img" src={url} alt="" width={THUMB_W} height={THUMB_H} decoding="async" /> : null;
}

const eventCache = new Map<EventId, Scene>();

/** The strip of engraving at the top of an event card. */
export function EventArt({ id }: { id: EventId }) {
  const scene = useMemo(() => {
    const hit = eventCache.get(id);
    if (hit) return hit;
    const make = EVENT_ART[id];
    if (!make) return null;
    const s = make();
    eventCache.set(id, s);
    return s;
  }, [id]);
  if (!scene) return null;
  return (
    <div class="event-art">
      <Plate scene={scene} label={EVENT_ART_LABEL[id]} class="plate plate-strip" />
    </div>
  );
}

// ---------------------------------------------------------------- figures for the roster and cards

interface Icon {
  marks: Mark[];
  view: string;
}

const iconCache = new Map<string, Icon>();
function icon(key: string, draw: () => Icon): Icon {
  const hit = iconCache.get(key);
  if (hit) return hit;
  const made = draw();
  iconCache.set(key, made);
  return made;
}

/**
 * A man standing, as he walks in the procession: a leader in his tall hat and tailcoat with his
 * musket at the slope, a servant in a low hat and short jacket with his axe on his shoulder.
 */
function manIcon(leader: boolean): Icon {
  return icon(leader ? 'leader' : 'servant', () => {
    const fig = emptyFigure();
    man(fig, 0, 0, 1, 0, leader, leader ? 'gun' : 'axe');
    return { marks: figureMarks(fig), view: '-9.5 -40.5 16 41.5' };
  });
}

function horseIcon(): Icon {
  return icon('horse', () => {
    const fig = emptyFigure();
    horse(fig, 0, 0, 1, 0, null, { total: 120, items: { flour: 60, saltMeat: 45, blankets: 2 } });
    return { marks: figureMarks(fig), view: '-21 -41 50 42' };
  });
}

function dogIcon(): Icon {
  return icon('dog', () => {
    const fig = emptyFigure();
    dog(fig, 0, 0, 1, 0.6);
    return { marks: figureMarks(fig), view: '-16 -19 33 20' };
  });
}

function IconSvg({ ic, class: cls, label }: { ic: Icon; class: string; label?: string }) {
  return (
    <svg class={`art ${cls}`} viewBox={ic.view} {...(label ? { role: 'img', 'aria-label': label } : { 'aria-hidden': 'true' })}>
      {ic.marks.map((mk, i) => (
        <path key={i} d={mk.d} class={mk.c} stroke-width={mk.w} />
      ))}
    </svg>
  );
}

/** The small figure on a roster chip: says at a glance who is a leader and can mark the trail. */
export function ManMark({ leader }: { leader: boolean }) {
  return <IconSvg ic={manIcon(leader)} class="man-mark" />;
}

/** The figure in the head of a card for a man, a horse or the dogs. */
export function WhoFigure({ who }: { who: Who }) {
  if (who.kind === 'man') {
    const leader = LEADERS.includes(who.id);
    return <IconSvg ic={manIcon(leader)} class="who-figure who-man" label={leader ? 'A leader: tall hat, tailcoat and musket' : 'A servant: low hat, short jacket and axe'} />;
  }
  if (who.kind === 'horse') return <IconSvg ic={horseIcon()} class="who-figure who-horse" />;
  return <IconSvg ic={dogIcon()} class="who-figure who-dog" />;
}
