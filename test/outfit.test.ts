import { describe, expect, it } from 'vitest';
import { T, capacity, dailyFood, loadLb, newGame } from '../src/engine/index';
import { capacityOf, checks, dailyEat, foodDays, outfit1813, packHorses, toOptions, totalLoad, type Outfit } from '../src/ui/outfitting';

const with_ = (patch: Partial<Outfit>, items: Partial<Outfit['loadout']> = {}): Outfit => {
  const o = outfit1813();
  return { ...o, ...patch, loadout: { ...o.loadout, ...items } };
};

describe('outfitting', () => {
  it('starts from the 1813 outfit, which the engine loads exactly', () => {
    const o = outfit1813();
    expect({ servants: o.servants, horses: o.horses, dogs: o.dogs }).toEqual({ servants: 4, horses: 4, dogs: 5 });
    const s = newGame({ seed: 1, mode: 'historical', ...toOptions(o) });
    expect(loadLb(s.stores)).toBeCloseTo(totalLoad(o.loadout), 6);
    expect(totalLoad(o.loadout)).toBeCloseTo(538, 0);
    expect(capacity(s)).toBe(capacityOf(o.horses));
  });

  it('counts food days the way the engine eats', () => {
    const o = outfit1813();
    const s = newGame({ seed: 1, mode: 'historical', ...toOptions(o) });
    expect(dailyEat(o)).toBe(dailyFood(s, 'full'));
    expect(Math.floor(foodDays(o))).toBe(24);
  });

  it('packs every pound, evens the loads, and puts single pieces on one horse each', () => {
    for (const o of [outfit1813(), with_({ horses: 6, servants: 6 }), with_({ horses: 2 }, { flour: 100, saltMeat: 60 })]) {
      const loads = packHorses(o);
      expect(loads).toHaveLength(o.horses);
      const sum = loads.reduce((s, h) => s + h.total, 0);
      expect(sum).toBeCloseTo(totalLoad(o.loadout), 6);
      expect(loads.reduce((s, h) => s + h.food + h.gear, 0)).toBeCloseTo(sum, 6);
      expect(loads.reduce((s, h) => s + (h.items.campKit ?? 0), 0)).toBe(1);
      for (const h of loads) expect(Number.isInteger(h.items.axes ?? 0)).toBe(true);
      // With food to pour, the loads come out level.
      const totals = loads.map((h) => h.total);
      expect(Math.max(...totals) - Math.min(...totals)).toBeLessThan(1e-6);
    }
  });

  it('stops an outfit the horses cannot carry and warns about thin ones', () => {
    expect(checks(outfit1813())).toEqual([]);
    const heavy = with_({ horses: 2 });
    expect(checks(heavy)[0]!.level).toBe('stop');
    const over = with_({}, { flour: 340 });
    expect(totalLoad(over.loadout)).toBeGreaterThan(capacityOf(4));
    expect(checks(over).map((c) => c.level)).toEqual(['warn']);
    const thin = with_({ servants: 6 }, { flour: 60, saltMeat: 60, hoe: 0, shots: 0, axes: 0, hatchets: 0 });
    const text = checks(thin).map((c) => c.text).join(' ');
    expect(text).toMatch(/Food for only/);
    expect(text).toMatch(/no blanket/);
    expect(text).toMatch(/hoe/);
    expect(text).toMatch(/powder/);
    expect(text).toMatch(/axes/);
  });

  it('hands the engine a party it accepts', () => {
    const o = with_({ servants: 6, horses: 6, dogs: 8 }, { blankets: 9, axes: 5 });
    const s = newGame({ seed: 2, mode: 'hard', ...toOptions(o) });
    expect(s.men).toHaveLength(9);
    expect(s.horses).toHaveLength(6);
    expect(s.dogs).toBe(8);
    expect(s.stores.blankets).toBe(9);
    expect(s.stores.axes).toBe(5);
    expect(T.party.servantsMax).toBe(6);
  });
});
