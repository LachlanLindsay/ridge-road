import { dateOf, type Condition, type Grass, type Task, type Terrain, type Water, type Weather } from '../engine';

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function parts(day: number) {
  const d = new Date(`${dateOf(day)}T00:00:00Z`);
  return { weekday: DAYS[d.getUTCDay()]!, date: d.getUTCDate(), month: MONTHS[d.getUTCMonth()]!, year: d.getUTCFullYear() };
}

/** "Tuesday 11 May 1813" */
export function longDate(day: number): string {
  const p = parts(day);
  return `${p.weekday} ${p.date} ${p.month} ${p.year}`;
}

/** "11 May" */
export function shortDate(day: number): string {
  const p = parts(day);
  return `${p.date} ${p.month}`;
}

/** "11 May" from an ISO date. */
export function isoShort(iso: string): string {
  const d = new Date(`${iso}T00:00:00Z`);
  return `${d.getUTCDate()} ${MONTHS[d.getUTCMonth()]}`;
}

export function num(v: number, digits = 1): string {
  const f = 10 ** digits;
  const r = Math.round(v * f) / f;
  return Number.isInteger(r) ? String(r) : r.toFixed(digits);
}

export const mi = (v: number) => `${num(v)} mi`;
export const hrs = (v: number) => `${num(v)} h`;
export const lb = (v: number) => `${Math.round(v)} lb`;

export const TASK_LABEL: Record<Task, string> = {
  scout: 'Scout',
  cut: 'Cut',
  camp: 'Camp',
  water: 'Water',
  hunt: 'Hunt',
  grass: 'Grass',
  rest: 'Rest',
};

export const TASK_HINT: Record<Task, string> = {
  scout: 'marks the ridge ahead',
  cut: 'clears marked ground',
  camp: 'minds the horses',
  water: 'fetches gully water',
  hunt: 'takes one shot',
  grass: 'cuts horse feed',
  rest: 'recovers',
};

export const CONDITION_LABEL: Record<Condition, string> = {
  chill: 'Chill',
  bowel: 'Bowel complaint',
  footsore: 'Footsore',
  tooIll: 'Too ill to work',
};

export const WEATHER_LABEL: Record<Weather, string> = {
  fair: 'Fair',
  dew: 'Heavy dew',
  cloud: 'Cloud',
  rain: 'Rain',
};

export const TERRAIN_LABEL: Record<Terrain, string> = {
  openForest: 'Open forest',
  heath: 'Heath',
  meadow: 'Meadow',
  swamp: 'Swamp head',
  scrub: 'Scrub',
  thick: 'Thick brush',
  thorny: 'Thorny scrub',
  rocky: 'Narrow rocky ridge',
};

export const GRASS_LABEL: Record<Grass, string> = {
  none: 'None',
  rushy: 'Rushy, half feed',
  good: 'Good',
  tall: 'Tall',
};

export function waterLabel(water: Water, gullyFt?: number): string {
  switch (water) {
    case 'none':
      return gullyFt ? `None up here; a gully ${gullyFt} ft down, for the men only` : 'None';
    case 'rockHole':
      return 'Rock hole, for the men only';
    case 'swamp':
      return 'Swamp head, for men and horses';
    case 'stream':
      return 'Stream';
    case 'lagoon':
      return 'Lagoon';
  }
}

export function horseWaterAt(water: Water): boolean {
  return water === 'swamp' || water === 'stream' || water === 'lagoon';
}

/** "Lawson" from "William Lawson"; servants keep their full label. */
export function shortName(name: string): string {
  if (name.startsWith('Servant')) return name;
  return name.split(' ').slice(-1)[0] ?? name;
}

export function plural(n: number, one: string, many = `${one}s`): string {
  return `${n} ${n === 1 ? one : many}`;
}

export { itemText } from '../engine';

const COMPASS = ['north', 'north-north-east', 'north-east', 'east-north-east', 'east', 'east-south-east', 'south-east', 'south-south-east', 'south', 'south-south-west', 'south-west', 'west-south-west', 'west', 'west-north-west', 'north-west', 'north-north-west'];

/** Compass point from a to b, in map coordinates (x east, y north). */
export function compass(a: { x: number; y: number }, b: { x: number; y: number }): string {
  const deg = ((Math.atan2(b.x - a.x, b.y - a.y) * 180) / Math.PI + 360) % 360;
  return COMPASS[Math.round(deg / 22.5) % 16]!;
}
