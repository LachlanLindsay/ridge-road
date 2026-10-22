// Typed access to the data files. The engine reads them once; nothing here is mutable.
import tuningJson from '../../data/tuning.json';
import mapJson from '../../data/map.json';
import eventsJson from '../../data/events.json';
import cardsJson from '../../data/cards.json';
import journalJson from '../../data/journal-1813.json';
import type { Feature, Grass, Mode, RegionId, Terrain, Water, Zone } from './types';

export type Tuning = typeof tuningJson;
export const T: Tuning = tuningJson;

export interface NodeSpec {
  id: string;
  water: Water;
  gullyFt?: number;
  grass: Grass;
  feature?: Feature;
  label?: string;
  card?: string;
  view?: boolean;
}

export interface RouteLeg {
  region: RegionId;
  miles: number;
  terrain: Terrain;
  bearing: number;
  oldTrack?: boolean;
  pass?: boolean;
  to: NodeSpec;
}

export interface RegionSpec {
  id: RegionId;
  name: string;
  zone: Zone;
  straightness: number;
  decoys: number;
  decoyMiles: [number, number];
  decoyBearing: [number, number];
  decoyTerrain: Partial<Record<Terrain, number>>;
}

export interface ForcedDecoy {
  at: string;
  oldTrack?: boolean;
  miles: [number, number];
  bearing: [number, number];
}

export interface MapData {
  start: NodeSpec;
  regions: RegionSpec[];
  decoyStraightness: number;
  forcedDecoys: ForcedDecoy[];
  route: RouteLeg[];
}

export const MAP_DATA = mapJson as unknown as MapData;

export interface EventText {
  title: string;
  text: string;
  choices: Record<string, string>;
}

export const EVENT_TEXT = eventsJson as unknown as Record<string, EventText>;

export interface CardSpec {
  title: string;
  unlock: string;
  body: string | null;
  /** How the day's journal line records finding the card; the Signs of Country have one. */
  found?: string;
}

export const CARDS = cardsJson as unknown as Record<string, CardSpec>;

/** The Signs of Country: the people the 1813 journals record, kept apart from the cards collected. */
export function isSignOfCountry(card: string): boolean {
  return card.startsWith('signs-');
}

export interface PaceDay {
  date: string;
  move: number;
  kind: 'move' | 'cut' | 'rest';
  est: boolean;
  /** What the 1813 party did that day, for the journal. */
  text: string;
}

/** A day of the 1813 party's journey home, for the journal. */
export interface HomeDay {
  date: string;
  text: string;
}

export const JOURNAL_1813 = journalJson as unknown as { reckoningMiles: number; days: PaceDay[]; home: HomeDay[] };

export type ModeTuning = Tuning['modes']['historical'];

export function modeTuning(mode: Mode): ModeTuning {
  return T.modes[mode];
}

export function regionSpec(id: RegionId): RegionSpec {
  const r = MAP_DATA.regions.find((x) => x.id === id);
  if (!r) throw new Error(`Unknown region ${id}`);
  return r;
}

export function terrainSpec(t: Terrain) {
  return T.terrain[t];
}
