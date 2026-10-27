// The pictures on the cards: every journal card and every event card has one, each is drawn the
// same way every time, and none is so heavy that a phone struggles to draw it.
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { CARDS } from '../src/engine/index';
import eventsJson from '../data/events.json';
import { CARD_FOCUS, CARD_PLATES, hasCardArt, isCountryCard, isMilestone } from '../src/ui/art/cards';
import { EVENT_ART, EVENT_ART_LABEL } from '../src/ui/art/events';
import { figureMarks, procession } from '../src/ui/art/figures';
import { curve } from '../src/ui/art/kit';

const cardIds = Object.keys(CARDS).filter((k) => !k.startsWith('_'));
const eventIds = Object.keys(eventsJson).filter((k) => !k.startsWith('_'));
const kb = (marks: { d: string }[]) => marks.reduce((s, m) => s + m.d.length, 0) / 1024;

describe('card art', () => {
  it('gives every journal card a picture', () => {
    for (const id of cardIds) expect(hasCardArt(id), id).toBe(true);
  });

  it('gives each Sign of Country its own moment, the fires of 26 May on the Country landscape', () => {
    // Each sign used to share the one Country plate, so the huts and the woodcutter showed fires in a
    // valley. Now each draws the party's side of its own moment; none draws the people or their huts.
    const signs = cardIds.filter((id) => id.startsWith('signs-'));
    expect(signs.sort()).toEqual(['signs-camps', 'signs-huts', 'signs-smoke', 'signs-woodcutter']);
    expect(isCountryCard('whoseCountry')).toBe(true);
    expect(isCountryCard('signs-smoke')).toBe(true);
    for (const id of ['signs-camps', 'signs-huts', 'signs-woodcutter']) {
      expect(isCountryCard(id), id).toBe(false);
      expect(CARD_PLATES[id], id).toBeDefined();
    }
    const drawn = ['signs-camps', 'signs-huts', 'signs-woodcutter'].map((id) => JSON.stringify(CARD_PLATES[id]!()));
    expect(new Set(drawn).size).toBe(3);
  });

  it('gives each fixed plate a thumbnail crop inside the plate', () => {
    for (const [id, make] of Object.entries(CARD_PLATES)) {
      const s = make();
      const [x, y, w, h] = CARD_FOCUS[id]!;
      expect(x >= 0 && y >= 0 && x + w <= s.w && y + h <= s.h, id).toBe(true);
    }
  });

  it('never draws an empty path, which the browser reports as an error', () => {
    for (const [id, make] of Object.entries({ ...CARD_PLATES, ...EVENT_ART })) {
      for (const m of make().marks) if (m.d.trim()) expect(m.d.trim(), id).toMatch(/^[Mm]/);
    }
  });

  it('draws the same plate every time, and keeps it light enough for a phone', () => {
    for (const [id, make] of Object.entries(CARD_PLATES)) {
      const a = make();
      expect(JSON.stringify(make()), id).toBe(JSON.stringify(a));
      expect(kb(a.marks), id).toBeLessThan(200);
    }
  });

  it('keeps the milestone cards apart: their plates draw the party as it is', () => {
    expect(cardIds.filter(isMilestone).sort()).toEqual(['highHeath', 'sugarloaf', 'viewBack', 'wayDown']);
  });
});

describe('event art', () => {
  it('gives every event card a strip and a label for it', () => {
    for (const id of eventIds) {
      const make = EVENT_ART[id as keyof typeof EVENT_ART];
      expect(make, id).toBeDefined();
      const s = make!();
      expect(s.marks.length, id).toBeGreaterThan(5);
      expect(EVENT_ART_LABEL[id as keyof typeof EVENT_ART_LABEL], id).toMatch(/^An engraving/);
    }
  });

  it('keeps each strip small', () => {
    for (const [id, make] of Object.entries(EVENT_ART)) expect(kb(make().marks), id).toBeLessThan(80);
  });
});

describe('the procession', () => {
  it('draws exactly as it did before the new poses were added', () => {
    // The hashes of the 1813 party's procession as figures.ts drew it before the card art.
    const ground = curve(-4, 404, () => 100);
    const { fig, slots } = procession({ servants: 4, horses: 4, dogs: 5 }, ground, { from: 40, to: 380, maxScale: 0.9, seed: 8 });
    const h = (x: unknown) => createHash('sha1').update(JSON.stringify(x)).digest('hex').slice(0, 16);
    expect(slots.map((s) => s.who.kind).join(' ')).toBe('dog man man horse man horse man dog horse man dog horse dog man dog man');
    expect(h(figureMarks(fig))).toBe('40b18043fa7a92af');
    expect(h(slots)).toBe('2eb8841669cfe0cc');
  });
});

describe('journal thumbnails', () => {
  it('write each mark with its colours, so the picture needs no stylesheet', async () => {
    const { thumbSvg } = await import('../src/ui/art/thumbs');
    const ink = new Map([['l1 o1', { fill: 'none', stroke: 'rgb(1, 2, 3)', opacity: '0.7' }]]);
    const svg = thumbSvg({ w: 400, h: 200, marks: [{ d: 'M0 0L10 10', c: 'l1 o1', w: 0.5 }] }, [10, 20, 96, 54], 96, 54, ink);
    expect(svg).toContain('viewBox="10 20 96 54"');
    expect(svg).toContain('stroke="rgb(1, 2, 3)"');
    expect(svg).toContain('opacity="0.7"');
    expect(svg).toContain('stroke-width="0.5"');
  });
});

describe('party portraits', () => {
  const men = ['blaxland', 'lawson', 'wentworth', 'burne', 'fairs', 'servant3', 'servant4', 'servant5', 'servant6'] as const;

  it('gives every man, each horse and the dogs a portrait with a label', async () => {
    const { MAN_PORTRAIT_LABEL, manPortrait, horsePortrait, dogsPortrait } = await import('../src/ui/art/portraits');
    for (const id of men) {
      expect(manPortrait(id).marks.length, id).toBeGreaterThan(5);
      expect(MAN_PORTRAIT_LABEL[id], id).toMatch(/^An engraving/);
    }
    ['Bay', 'Grey', 'Chestnut', 'Black', 'Dun', 'Roan'].forEach((n, i) => {
      const h = horsePortrait(i + 1, n, { pack: { total: 120, items: { flour: 60, saltMeat: 50 } } });
      expect(h.label, n).toContain(n);
      expect(h.scene.marks.length, n).toBeGreaterThan(5);
    });
    expect(horsePortrait(1, 'Bay', { pack: null, down: true }).label).toMatch(/left behind/);
    expect(dogsPortrait(5).label).toMatch(/5 kangaroo dogs/);
    expect(dogsPortrait(0).label).toMatch(/no dogs/);
  });

  it('draws each portrait the same way every time, light enough for a phone', async () => {
    const { manPortrait, horsePortrait, dogsPortrait } = await import('../src/ui/art/portraits');
    const all = [
      ...men.map((id) => () => manPortrait(id)),
      ...[1, 2, 3, 4, 5, 6].map((i) => () => horsePortrait(i, 'Roan', { pack: { total: 150, items: { flour: 70, saltMeat: 60, axes: 1 } }, condition: 30 }).scene),
      () => dogsPortrait(8).scene,
    ];
    for (const make of all) {
      const a = make();
      expect(JSON.stringify(make())).toBe(JSON.stringify(a));
      expect(kb(a.marks)).toBeLessThan(200);
    }
  });
});
