// newGame and replay.
import { T, modeTuning } from './data';
import { startDay, blankToday } from './day';
import { chooseEvent } from './events';
import { resolveHalfDay } from './half';
import { buildMap } from './map';
import { endDay } from './night';
import { LEADERS, MEMBER_INFO, SERVANTS } from './party';
import { seedRng } from './rng';
import { storesFrom } from './stores';
import type { Action, GameState, Horse, Member, NewGameOptions, PartyChoice } from './types';

const HORSE_NAMES = ['Bay', 'Grey', 'Chestnut', 'Black', 'Dun', 'Roan'];

const clampInt = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, Math.round(v)));

/** The party that sets out, within the limits in tuning.json. Defaults to the 1813 party. */
export function partyOf(choice: PartyChoice = {}): Required<PartyChoice> {
  const P = T.party;
  return {
    servants: clampInt(choice.servants ?? P.servants, 0, P.servantsMax),
    horses: clampInt(choice.horses ?? T.horses.count, P.horsesMin, P.horsesMax),
    dogs: clampInt(choice.dogs ?? T.dogs.count, 0, P.dogsMax),
  };
}

export function newGame(opts: NewGameOptions): GameState {
  const holder = { rng: seedRng(opts.seed) };
  const map = buildMap(holder, opts.mode);
  const party = partyOf(opts.party);
  const men: Member[] = [...LEADERS, ...SERVANTS.slice(0, party.servants)].map((id) => {
    const custom = id === 'servant3' ? opts.names?.servant3 : id === 'servant4' ? opts.names?.servant4 : undefined;
    return {
      id,
      name: custom?.trim() || MEMBER_INFO[id].name,
      leader: MEMBER_INFO[id].leader,
      stamina: T.stamina.start,
      condition: null,
      keepAtCamp: false,
      workingWithChill: false,
      awayUntil: 0,
      busyUntil: 0,
      worked: false,
      workedWet: false,
      workedRough: false,
      nightPenalty: 0,
    };
  });
  const horses: Horse[] = Array.from({ length: party.horses }, (_, i) => ({
    id: i + 1,
    name: HORSE_NAMES[i] ?? `Horse ${i + 1}`,
    condition: T.horses.startCondition,
    leftAt: null,
  }));
  const s: GameState = {
    v: 1,
    seed: opts.seed,
    mode: opts.mode,
    rng: holder.rng,
    day: 1,
    phase: 'morning',
    leg: 'out',
    weather: 'fair',
    frostTonight: false,
    map,
    camp: map.start,
    furthestCampMiles: 0,
    furthestMiles: 0,
    men,
    horses,
    dogs: party.dogs,
    stores: storesFrom(opts.loadout ?? {}),
    caches: {},
    morale: modeTuning(opts.mode).moraleStart,
    wear: 0,
    rations: 'full',
    pending: [],
    eveningQueue: [],
    delayNext: 0,
    restToday: false,
    restTomorrow: false,
    noFoodDays: 0,
    lastFreshDay: 0,
    lastRestDay: 0,
    viewSeen: false,
    goalDay: null,
    turnedBackDay: null,
    turnReason: null,
    outcome: null,
    today: blankToday(),
    cards: ['whoseCountry'],
    journal: [],
    stats: { deadEnds: 0, refusals: 0, restDays: 0, horseFalls: 0, strays: 0, kills: 0, illnesses: 0, dryNights: 0, manHours: {}, campMilesByDay: [] },
    opts: structuredClone(opts),
    actions: [],
  };
  const lines: string[] = [];
  startDay(s, lines);
  s.today.log = lines;
  return s;
}

export function applyAction(s: GameState, a: Action): GameState {
  switch (a.t) {
    case 'half':
      return resolveHalfDay(s, a.plan).state;
    case 'choose':
      return chooseEvent(s, a.choice);
    case 'end':
      return endDay(s, a.orders).state;
  }
}

/** Rebuild a run from its options and action log. */
export function replay(opts: NewGameOptions, actions: Action[]): GameState {
  let s = newGame(opts);
  for (const a of actions) s = applyAction(s, a);
  return s;
}
