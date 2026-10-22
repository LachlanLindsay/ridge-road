// Development only (?gallery): every plate at phone width, for review.
import { useMemo } from 'preact/hooks';
import { outfit1813, packHorses, type Outfit } from '../outfitting';
import { country, crossed, ford, loads1813, partyPlate, Plate, repulsed, vista } from './scenes';

const o1813 = outfit1813();
const outfit = (patch: Partial<Outfit>, items: Partial<Outfit['loadout']> = {}): Outfit => ({ ...o1813, ...patch, loadout: { ...o1813.loadout, ...items } });

const PLATES = [
  { name: 'vista', make: () => vista() },
  { name: 'ford', make: () => ford() },
  { name: 'party', make: () => partyPlate({ servants: 4, horses: 4, dogs: 5 }, 5, loads1813()) },
  { name: 'party-small', make: () => partyPlate({ servants: 0, horses: 2, dogs: 0 }, 5, packHorses(outfit({ servants: 0, horses: 2, dogs: 0 }, { flour: 120, saltMeat: 100, blankets: 3 }))) },
  { name: 'party-big', make: () => partyPlate({ servants: 6, horses: 6, dogs: 8 }, 5, packHorses(outfit({ servants: 6, horses: 6, dogs: 8 }, { flour: 400, saltMeat: 300, axes: 6, blankets: 9 }))) },
  { name: 'party-heavy', make: () => partyPlate({ servants: 4, horses: 3, dogs: 5 }, 5, packHorses(outfit({ horses: 3 }, { flour: 300, saltMeat: 220 }))) },
  { name: 'party-bare', make: () => partyPlate({ servants: 4, horses: 4, dogs: 5 }, 5, packHorses(outfit({}, { flour: 0, saltMeat: 0, tea: 0, shots: 0, axes: 0, hatchets: 0, hoe: 0, blankets: 0, shoes: 0, campKit: 1 }))) },
  { name: 'country', make: () => country() },
  { name: 'crossed', make: () => crossed({ servants: 4, horses: 3, dogs: 4 }, 31, packHorses(outfit({ horses: 3 }, { flour: 6, saltMeat: 0, tea: 2, shots: 30, blankets: 7, shoes: 1 }))) },
  { name: 'repulsed', make: () => repulsed({ servants: 4, horses: 4, dogs: 5 }) },
];

function One({ name, make }: { name: string; make: () => ReturnType<typeof vista> }) {
  const t0 = performance.now();
  const scene = useMemo(make, []);
  const ms = performance.now() - t0;
  const bytes = scene.marks.reduce((s, m) => s + m.d.length, 0);
  return (
    <section class="gallery-item" data-name={name}>
      <p class="fine">
        {name} · {scene.marks.length} paths · {Math.round(bytes / 1024)} KB · {ms.toFixed(0)} ms
      </p>
      <Plate scene={scene} label={name} class="plate" />
    </section>
  );
}

export function Gallery() {
  const only = new URLSearchParams(location.search).get('gallery');
  return (
    <main style={{ padding: '12px 0', display: 'grid', gap: '18px', maxWidth: '44rem', margin: '0 auto' }}>
      {PLATES.filter((p) => !only || p.name === only).map((p) => (
        <One key={p.name} {...p} />
      ))}
    </main>
  );
}
