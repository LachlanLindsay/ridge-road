// Development only (?gallery): every plate at phone width, for review. ?gallery=name shows one,
// ?gallery=event-* every name with that start.
import { useMemo } from 'preact/hooks';
import { outfit1813, packHorses, type Outfit } from '../outfitting';
import type { Scene } from './compose';
import { CARD_PLATES } from './cards';
import { EVENT_ART } from './events';
import { dogsPortrait, horsePortrait, manPortrait } from './portraits';
import { dogRunning, emptyFigure, figureMarks, horse, horseDown, kangaroo, lying, man, sitting, standing, wombat, type Mark } from './figures';
import { country, crossed, ford, highHeath, loads1813, partyPlate, Plate, repulsed, viewBack, vista, wayDown } from './scenes';

const o1813 = outfit1813();
const outfit = (patch: Partial<Outfit>, items: Partial<Outfit['loadout']> = {}): Outfit => ({ ...o1813, ...patch, loadout: { ...o1813.loadout, ...items } });

/** Every new figure in a row, large, on a ruled ground line. */
function poses(): Scene {
  const fig = emptyFigure();
  const y = 60;
  standing(fig, 14, y, 1, { leader: true, arms: 'down' });
  standing(fig, 34, y, 1, { leader: false, arms: 'call' });
  standing(fig, 54, y, 1, { leader: false, arms: 'kettle' });
  standing(fig, 76, y, 1, { leader: true, arms: 'point' });
  standing(fig, 104, y, 1, { leader: false, arms: 'folded', dir: -1 });
  standing(fig, 120, y, 1, { leader: false, arms: 'stone', lean: 0.25 });
  standing(fig, 146, y, 1, { leader: true, arms: 'gunRest' });
  standing(fig, 166, y, 1, { leader: false, arms: 'haul', lean: -0.3 });
  sitting(fig, 190, y, 1, { leader: true, arms: 'knees' });
  sitting(fig, 214, y, 1, { leader: false, arms: 'fire' });
  sitting(fig, 238, y, 1, { leader: false, arms: 'folded' });
  sitting(fig, 262, y, 1, { leader: true, arms: 'head' });
  sitting(fig, 290, y, 1, { leader: false, blanket: true });
  lying(fig, 318, y, 1);
  const fig2 = emptyFigure();
  const y2 = 112;
  horseDown(fig2, 30, y2, 1);
  horse(fig2, 92, y2, 1, 0, null, { total: 170, items: { flour: 70, saltMeat: 50, blankets: 2, campKit: 1 } }, { droopDeg: 44 });
  dogRunning(fig2, 140, y2 - 4, 1);
  kangaroo(fig2, 186, y2 - 3, 1);
  kangaroo(fig2, 226, y2, 1, { pose: 'stand' });
  wombat(fig2, 262, y2, 1);
  man(fig2, 300, y2, 1, 0, true, 'none');
  man(fig2, 320, y2, 1, 0, false, 'none');
  const marks: Mark[] = [{ d: `M0 ${y}H400M0 ${y2}H400`, c: 'l2', w: 0.5 }, ...figureMarks(fig), ...figureMarks(fig2)];
  return { w: 400, h: 120, marks };
}

interface Item {
  name: string;
  make: () => Scene;
}

const PLATES: Item[] = [
  { name: 'poses', make: poses },
  { name: 'vista', make: () => vista() },
  { name: 'ford', make: () => ford() },
  { name: 'party', make: () => partyPlate({ servants: 4, horses: 4, dogs: 5 }, 5, loads1813()) },
  { name: 'party-small', make: () => partyPlate({ servants: 0, horses: 2, dogs: 0 }, 5, packHorses(outfit({ servants: 0, horses: 2, dogs: 0 }, { flour: 120, saltMeat: 100, blankets: 3 }))) },
  { name: 'party-big', make: () => partyPlate({ servants: 6, horses: 6, dogs: 8 }, 5, packHorses(outfit({ servants: 6, horses: 6, dogs: 8 }, { flour: 400, saltMeat: 300, axes: 6, blankets: 9 }))) },
  { name: 'party-heavy', make: () => partyPlate({ servants: 4, horses: 3, dogs: 5 }, 5, packHorses(outfit({ horses: 3 }, { flour: 300, saltMeat: 220 }))) },
  { name: 'party-bare', make: () => partyPlate({ servants: 4, horses: 4, dogs: 5 }, 5, packHorses(outfit({}, { flour: 0, saltMeat: 0, tea: 0, shots: 0, axes: 0, hatchets: 0, hoe: 0, blankets: 0, shoes: 0, campKit: 1 }))) },
  { name: 'country', make: () => country() },
  ...(['blaxland', 'lawson', 'wentworth', 'burne', 'fairs', 'servant3', 'servant4', 'servant5', 'servant6'] as const).map((id) => ({ name: `who-${id}`, make: () => manPortrait(id) })),
  ...['Bay', 'Grey', 'Chestnut', 'Black', 'Dun', 'Roan'].map((n, i) => ({ name: `who-horse-${n}`, make: () => horsePortrait(i + 1, n, { pack: loads1813()[i] ?? loads1813()[0]!, condition: i === 3 ? 30 : 90 }).scene })),
  { name: 'who-horse-down', make: () => horsePortrait(2, 'Grey', { pack: null, down: true }).scene },
  { name: 'who-dogs', make: () => dogsPortrait(5).scene },
  { name: 'crossed', make: () => crossed({ servants: 4, horses: 3, dogs: 4 }, 31, packHorses(outfit({ horses: 3 }, { flour: 6, saltMeat: 0, tea: 2, shots: 30, blankets: 7, shoes: 1 }))) },
  { name: 'repulsed', make: () => repulsed({ servants: 4, horses: 4, dogs: 5 }) },
  { name: 'm-viewBack', make: () => viewBack({ servants: 4, horses: 4, dogs: 5 }, 301, loads1813()) },
  { name: 'm-highHeath', make: () => highHeath({ servants: 4, horses: 4, dogs: 5 }, 311, loads1813()) },
  { name: 'm-wayDown', make: () => wayDown({ servants: 4, horses: 3, dogs: 4 }, 321, loads1813()) },
  ...Object.entries(CARD_PLATES).map(([id, make]) => ({ name: `card-${id}`, make })),
  ...Object.entries(EVENT_ART).map(([id, make]) => ({ name: `event-${id}`, make })),
];

function One({ name, make }: Item) {
  const t0 = performance.now();
  const scene = useMemo(make, []);
  const ms = performance.now() - t0;
  const bytes = scene.marks.reduce((s, m) => s + m.d.length, 0);
  return (
    <section class="gallery-item" data-name={name}>
      <p class="fine">
        {name} · {scene.marks.length} paths · {Math.round(bytes / 1024)} KB · {ms.toFixed(0)} ms
      </p>
      <Plate scene={scene} label={name} class={name.startsWith('event-') ? 'plate plate-strip' : 'plate'} />
    </section>
  );
}

export function Gallery() {
  const only = new URLSearchParams(location.search).get('gallery');
  return (
    <main style={{ padding: '12px 0', display: 'grid', gap: '18px', maxWidth: '44rem', margin: '0 auto' }}>
      {PLATES.filter((p) => !only || p.name === only || (only.endsWith('*') && p.name.startsWith(only.slice(0, -1)))).map((p) => (
        <One key={p.name} {...p} />
      ))}
    </main>
  );
}
