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

  it('draws no people, huts or camps for the Signs of Country: they share the Country landscape', () => {
    const signs = cardIds.filter((id) => id.startsWith('signs-'));
    expect(signs.length).toBe(4);
    for (const id of signs) {
      expect(isCountryCard(id)).toBe(true);
      expect(CARD_PLATES[id]).toBeUndefined();
    }
  });

  it('gives each fixed plate a thumbnail crop inside the plate', () => {
    for (const [id, make] of Object.entries(CARD_PLATES)) {
      const s = make();
      const [x, y, w, h] = CARD_FOCUS[id]!;
      expect(x >= 0 && y >= 0 && x + w <= s.w && y + h <= s.h, id).toBe(true);
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
