import { afterEach, describe, expect, it } from 'vitest';
import { chooseEvent, endDay, newGame, replay, resolveHalfDay, toSave, type GameState } from '../src/engine/index';
import { BUILD } from '../src/ui/build';
import { decodeReplay, encodeReplay } from '../src/ui/replaycode';
import { reportText } from '../src/ui/report';
import { CARRY_OVER_FAILED, restore } from '../src/ui/save';
import { BOTS } from '../sim/bots';
import { playRun } from '../sim/run';

/** A game some days in, played by the historical bot with a non-default party. */
function played(days: number): GameState {
  const bot = BOTS.historical!;
  let s = newGame({ seed: 8, mode: 'historical', party: { servants: 5, horses: 5, dogs: 3 }, loadout: { flour: 260 } });
  while (s.phase !== 'over' && s.day <= days) {
    if (s.pending.length) s = chooseEvent(s, bot.choose(s));
    else if (s.phase === 'evening') s = endDay(s, bot.evening(s)).state;
    else s = resolveHalfDay(s, bot.plan(s)).state;
  }
  return s;
}

const realCompression = globalThis.CompressionStream;
afterEach(() => {
  globalThis.CompressionStream = realCompression;
});

describe('replay codes in feedback reports', () => {
  it('rebuild the exact game, found anywhere in a pasted report', async () => {
    const s = played(6);
    const code = await encodeReplay(s, BUILD);
    expect(code.startsWith('RR1.')).toBe(true);
    expect(code.length).toBeLessThan(2000);
    const report = reportText({ state: s, note: 'Horses stuck at the second camp.', code, device: 'test' });
    const data = await decodeReplay(`Hi! Here it is:\n\n${report}\n\nThanks`);
    expect(data.b).toBe(BUILD);
    expect(toSave(replay(data.o, data.a))).toBe(toSave(s));
  });

  it('fall back to an uncompressed code where the browser cannot compress', async () => {
    const s = played(2);
    (globalThis as { CompressionStream?: unknown }).CompressionStream = undefined;
    const code = await encodeReplay(s, BUILD);
    expect(code.startsWith('RR0.')).toBe(true);
    globalThis.CompressionStream = realCompression;
    const data = await decodeReplay(code);
    expect(toSave(replay(data.o, data.a))).toBe(toSave(s));
  });

  it('reject text with no code in it', async () => {
    await expect(decodeReplay('no code here')).rejects.toThrow(/No replay code/);
  });

  it('carry the build, the expedition, the note and the code', () => {
    const s = played(3);
    const text = reportText({ state: s, note: '  The map was too big.  ', code: 'RR1.abc', device: 'iPhone' });
    expect(text).toContain(`Build: ${BUILD}`);
    expect(text).toContain(`seed ${s.seed}, historical, day ${s.day}`);
    expect(text).toContain('Party: 8 men, 5 horses, 3 dogs');
    expect(text).toContain('The map was too big.');
    expect(text).toContain('RR1.abc');
    expect(reportText({ state: null, note: '', code: null, device: 'x' })).toContain('none in progress');
  });
});

describe('saves across builds', () => {
  it('keep a save from this build as it is', () => {
    const s = played(4);
    expect(restore(toSave(s), BUILD)).toEqual({ game: s, notice: null });
  });

  it('rebuild a save from another build by replaying its orders', () => {
    const s = played(4);
    // An older build's state may be missing fields this build expects; the orders are enough.
    const old = JSON.parse(toSave(s)) as { stats: Record<string, unknown> };
    delete old.stats.campMilesByDay;
    const r = restore(JSON.stringify(old), 'an-older-build');
    expect(r.notice).toBeNull();
    expect(toSave(r.game!)).toBe(toSave(s));
  });

  it('tell the player when an old save cannot be carried over', () => {
    const s = played(4);
    const broken = { ...s, actions: [{ t: 'end', orders: { rations: 'full' } }, ...s.actions] };
    expect(restore(JSON.stringify(broken), 'an-older-build')).toEqual({ game: null, notice: CARRY_OVER_FAILED });
    expect(restore('{"not":"a save"}', null)).toEqual({ game: null, notice: CARRY_OVER_FAILED });
    expect(restore(null, null)).toEqual({ game: null, notice: null });
  });

  it('keep a finished expedition whose orders no longer replay, for its end screen and journal', () => {
    const s = playRun(3, BOTS.historical!).state;
    expect(s.phase).toBe('over');
    const old = { ...s, actions: [{ t: 'end', orders: { rations: 'full' } }, ...s.actions] };
    expect(restore(JSON.stringify(old), 'an-older-build').game?.outcome).toEqual(s.outcome);
  });
});
