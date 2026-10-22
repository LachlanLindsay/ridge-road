// Development only (?gallery): every plate at phone width, for review.
import { useMemo } from 'preact/hooks';
import { country, crossed, ford, partyPlate, Plate, repulsed, vista } from './scenes';

const PLATES = [
  { name: 'vista', make: () => vista() },
  { name: 'ford', make: () => ford() },
  { name: 'party', make: () => partyPlate({ servants: 4, horses: 4, dogs: 5 }) },
  { name: 'party-small', make: () => partyPlate({ servants: 0, horses: 2, dogs: 0 }) },
  { name: 'party-big', make: () => partyPlate({ servants: 6, horses: 6, dogs: 8 }) },
  { name: 'country', make: () => country() },
  { name: 'crossed', make: () => crossed({ servants: 4, horses: 3, dogs: 4 }) },
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
