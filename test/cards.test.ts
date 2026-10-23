import { describe, expect, it } from 'vitest';
import { CARDS, MEMBER_INFO, T, dogOdds, newGame, type MemberId, type Mode } from '../src/engine/index';
import { emptyFigure, horse, procession } from '../src/ui/art/figures';
import { curve } from '../src/ui/art/kit';
import { cardInLine } from '../src/ui/Info';
import { outfit1813, packHorses } from '../src/ui/outfitting';
import { infoFor, partyWhos } from '../src/ui/people';

const ids = Object.keys(MEMBER_INFO) as MemberId[];
const modes: Mode[] = ['easy', 'historical', 'hard'];

describe('party cards', () => {
  it('gives every man, the horses and the dogs a card with history and sources', () => {
    for (const id of ids) {
      const c = infoFor({ kind: 'man', id }, null);
      expect(c.title.length, id).toBeGreaterThan(3);
      expect(c.game.length, id).toBeGreaterThan(0);
      expect(c.history.join(' ').length, id).toBeGreaterThan(60);
      expect(c.sources, id).toMatch(/^Sources?: /);
      const text = [...c.history, ...c.game].join(' ');
      expect((text.match(/“/g) ?? []).length, id).toBe((text.match(/”/g) ?? []).length);
    }
    for (const c of [infoFor({ kind: 'horse', id: 1 }, null), infoFor({ kind: 'dogs', count: 5 }, null)]) {
      expect(c.history.length).toBeGreaterThan(0);
      expect(c.sources).toMatch(/^Sources?: /);
    }
  });

  it('states the traits with the numbers the engine uses, for the mode played', () => {
    for (const mode of modes) {
      const lawson = infoFor({ kind: 'man', id: 'lawson' }, null, mode).game.join(' ');
      expect(lawson).toContain(`${Math.round(T.modes[mode].hintAccuracy * 100)}% of the time`);
    }
    expect(infoFor({ kind: 'man', id: 'blaxland' }, null).game[0]).toContain(`${Math.round((1 - T.horses.night.blaxlandLossFactor) * 100)}% less condition`);
    const went = infoFor({ kind: 'man', id: 'wentworth' }, null).game[0]!;
    expect(went).toContain(`${Math.round((T.efficiency.wentworthCut - 1) * 100)}% faster`);
    expect(went).toContain(`${T.stamina.recovery.wentworthBonus} more stamina`);
    const burne = infoFor({ kind: 'man', id: 'burne' }, null).game[0]!;
    expect(burne).toContain(`${Math.round(T.hunting.man.good * T.hunting.burneFactor * 100)}%`);
    for (const n of [2, 5, 8]) {
      const dogs = infoFor({ kind: 'dogs', count: n }, null).game[0]!;
      expect(dogs).toContain(`${Math.round(dogOdds(T.hunting.dogs.good, n) * 100)}% chance`);
    }
  });

  it('says how each one is now, in a game', () => {
    const s = newGame({ seed: 4, mode: 'hard' });
    for (const w of partyWhos(s)) expect(infoFor(w, s).now, JSON.stringify(w)).toBeTruthy();
    expect(infoFor({ kind: 'man', id: 'lawson' }, s).game.join(' ')).toContain(`${Math.round(T.modes.hard.hintAccuracy * 100)}%`);
    // Before setting out, a horse's card describes what the outfitting packs on it.
    const load = packHorses(outfit1813())[0]!;
    expect(infoFor({ kind: 'horse', id: 1, load }, null).now).toMatch(/^Packed with the camp kit, .*: 135 lb\.$/);
  });

  it('finds the journal card a report line announces', () => {
    for (const id of Object.keys(CARDS).filter((k) => !k.startsWith('_'))) {
      expect(cardInLine(`Journal card: ${CARDS[id]!.title}.`), id).toBe(id);
    }
    expect(cardInLine('The dogs brought down a small kangaroo: 10 lb of fresh meat.')).toBeNull();
  });
});

describe('the party drawn from its loads', () => {
  const ground = curve(-4, 404, () => 120);

  it('knows which figure is which man, horse and dog', () => {
    const { slots } = procession({ servants: 4, horses: 4, dogs: 5 }, ground, { from: 40, to: 380, maxScale: 0.9, seed: 8 });
    const men = slots.flatMap((s) => (s.who.kind === 'man' ? [s.who.id] : []));
    expect(men).toHaveLength(7);
    expect(new Set(men)).toEqual(new Set(['blaxland', 'lawson', 'wentworth', 'burne', 'fairs', 'servant3', 'servant4']));
    expect(slots.flatMap((s) => (s.who.kind === 'horse' ? [s.who.id] : []))).toEqual([1, 2, 3, 4]);
    expect(slots.filter((s) => s.who.kind === 'dog')).toHaveLength(5);
    // Burne, the guide, walks at the front, behind only a dog.
    expect(slots.find((s) => s.who.kind === 'man')!.who).toEqual({ kind: 'man', id: 'burne' });
    const none = procession({ servants: 0, horses: 2, dogs: 0 }, ground, { from: 40, to: 380, maxScale: 0.9, seed: 8 }).slots;
    expect(none.flatMap((s) => (s.who.kind === 'man' ? [s.who.id] : []))).toEqual(['blaxland', 'lawson', 'wentworth']);
  });

  /** Highest point (smallest y) of a figure's pannier, from its path. */
  const packTop = (total: number, flour: number) => {
    const fig = emptyFigure();
    horse(fig, 0, 0, 1, 0, null, { total, items: { flour } });
    const nums = fig.paper.map((p) => p.d).join(' ').match(/-?\d+(\.\d+)?/g)!.map(Number);
    return { top: Math.min(...nums.filter((_, i) => i % 2 === 1)), head: fig.ink[0] };
  };

  it('fills the pannier with the load, and hangs the horse’s head past an easy load', () => {
    // Flour stands for the sacks; the rest of each load is kit.
    const light = packTop(40, 20);
    const usual = packTop(135, 66);
    const easy = packTop(158, 66);
    const heavy = packTop(190, 104);
    expect(usual.top).toBeLessThan(light.top);
    expect(heavy.top).toBeLessThan(usual.top);
    expect(easy.head).toBe(usual.head);
    expect(heavy.head).not.toBe(usual.head);
    const bare = emptyFigure();
    horse(bare, 0, 0, 1, 0, null, null);
    expect(bare.paper).toHaveLength(0);
  });

  it('packs cut grass with the stores', () => {
    const o = outfit1813();
    const loads = packHorses({ ...o, loadout: { ...o.loadout, grass: 40 } });
    expect(loads.reduce((s, h) => s + (h.items.grass ?? 0), 0)).toBeCloseTo(40, 6);
  });
});
