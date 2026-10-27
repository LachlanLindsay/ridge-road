import { describe, expect, it } from 'vitest';
import { CARDS, JOURNAL_1813 } from '../src/engine/index';
import { BRIEFING, CARD_SOURCES, CARD_TEXT, COUNTRY_CARD, PARTY_CARD } from '../src/ui/copy';
import { MILESTONE_CARDS } from '../src/ui/Info';
import { fleschKincaid, ownWords } from './helpers';

const cardIds = Object.keys(CARDS).filter((k) => !k.startsWith('_'));

describe('journal content for a complete game', () => {
  it('gives every card the engine can unlock its text and sources', () => {
    expect(cardIds.length).toBeGreaterThanOrEqual(10);
    for (const id of cardIds) {
      expect(CARD_TEXT[id], id).toBeDefined();
      expect(CARD_TEXT[id]!.join(' ').length, id).toBeGreaterThan(80);
      expect(CARD_SOURCES[id], id).toMatch(/^Sources?: /);
    }
    expect(CARD_TEXT.whoseCountry).toBe(BRIEFING[COUNTRY_CARD]!.paragraphs);
    // Whose Country opens the briefing and cannot be skipped past by reading the first card only.
    expect(COUNTRY_CARD).toBe(0);
    expect(PARTY_CARD).toBeGreaterThan(0);
  });

  it('keeps quotation marks paired in every card', () => {
    for (const id of cardIds) {
      const text = CARD_TEXT[id]!.join(' ');
      expect((text.match(/“/g) ?? []).length, id).toBe((text.match(/”/g) ?? []).length);
    }
  });

  it('opens each milestone card with a plain line placing the player there, then Blaxland’s words', () => {
    for (const id of MILESTONE_CARDS) {
      const [first, ...rest] = CARD_TEXT[id]!;
      expect(first, id).toMatch(/^You have /);
      expect(first, id).not.toMatch(/[“”]/);
      expect(rest.join(' '), id).toMatch(/“[^”]+”/);
      // The game's own words, with Blaxland's quotations taken out, read at US grade 6 or under.
      expect(fleschKincaid(ownWords(CARD_TEXT[id]!.join(' '))), id).toBeLessThanOrEqual(6);
    }
    // The measure is not soft: the After 1813 card, written for older readers, reads well above it.
    expect(fleschKincaid(ownWords(CARD_TEXT.after1813!.join(' ')))).toBeGreaterThan(8);
  });

  it('has the 1813 party’s day for every date out and home', () => {
    const dates = [...JOURNAL_1813.days, ...JOURNAL_1813.home].map((d) => d.date);
    const expected = Array.from({ length: 27 }, (_, i) => new Date(Date.UTC(1813, 4, 11 + i)).toISOString().slice(0, 10));
    expect(dates).toEqual(expected);
    for (const d of [...JOURNAL_1813.days, ...JOURNAL_1813.home]) expect(d.text.length, d.date).toBeGreaterThan(30);
  });
});
