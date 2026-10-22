// Dawn: reset the day, roll the weather. Turning for home.
import { T } from './data';
import { zoneOf } from './map';
import { chance, pickWeighted } from './rng';
import type { GameState, Outcome, Today, Weather } from './types';

export function blankToday(): Today {
  return {
    dewStart: 0,
    pushedDew: false,
    movedMiles: 0,
    newGround: 0,
    waterFetched: false,
    fieldWork: false,
    campMoved: false,
    noFall: false,
    blaxlandAtCamp: false,
    cloudLifts: false,
    dogsKilled: false,
    caught: false,
    freshEaten: false,
    eventThisHalf: false,
    log: [],
  };
}

export function dateOf(day: number): string {
  const d = new Date(`${T.start.date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + day - 1);
  return d.toISOString().slice(0, 10);
}

export function weekday(day: number): number {
  const d = new Date(`${T.start.date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + day - 1);
  return d.getUTCDay();
}

const WEATHER_WORDS: Record<Weather, string> = {
  fair: 'Fair',
  dew: 'Heavy dew',
  cloud: 'Cloud on the ridges',
  rain: 'Rain',
};

export function weatherWord(w: Weather): string {
  return WEATHER_WORDS[w];
}

/** Start a new day: flags reset, the weather rolled, heavy dew asks its question. */
export function startDay(s: GameState, lines: string[]) {
  s.today = blankToday();
  for (const m of s.men) {
    m.worked = false;
    m.workedWet = false;
    m.workedRough = false;
    m.nightPenalty = 0;
    m.keepAtCamp = false;
  }
  s.restToday = s.restTomorrow;
  s.restTomorrow = false;
  const zone = zoneOf(s.map.nodes[s.camp]!.region);
  const w = T.weather.zones[zone];
  s.weather = pickWeighted(s, { fair: w.fair, dew: w.dew, cloud: w.cloud, rain: w.rain }) as Weather;
  s.today.cloudLifts = s.weather === 'cloud' && chance(s, T.weather.cloudLiftChance);
  s.frostTonight = chance(s, w.frost);
  lines.push(`Dawn: ${weatherWord(s.weather).toLowerCase()}.`);
  if (s.weather === 'dew' && !s.restToday) s.pending.push({ id: 'dew' });
}

/** Turn the party for home. From the goal this is the win path; anywhere else it is the loss. */
export function turnHome(s: GameState, reason: Outcome['reason']) {
  if (s.leg === 'home') return;
  s.leg = 'home';
  if (s.goalDay === null) {
    s.turnedBackDay = s.day;
    s.turnReason = reason;
  }
}
