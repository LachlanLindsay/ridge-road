// Ridge Road engine types. The whole game is one serialisable GameState.

export type Mode = 'easy' | 'historical' | 'hard';
export type Terrain = 'openForest' | 'heath' | 'meadow' | 'swamp' | 'scrub' | 'thick' | 'thorny' | 'rocky';
export type Water = 'none' | 'rockHole' | 'swamp' | 'stream' | 'lagoon';
export type Grass = 'none' | 'rushy' | 'good' | 'tall';
export type Feature = 'lookout' | 'precipice' | 'rockStep' | 'pass' | 'cairn' | 'goal' | 'ford';
export type RegionId = 1 | 2 | 3 | 4 | 5 | 6;
export type Zone = 'mountains' | 'west';
export type Weather = 'fair' | 'dew' | 'cloud' | 'rain';
export type Task = 'scout' | 'cut' | 'camp' | 'water' | 'hunt' | 'grass' | 'rest';
export type MemberId = 'blaxland' | 'lawson' | 'wentworth' | 'burne' | 'fairs' | 'servant3' | 'servant4' | 'servant5' | 'servant6';
export type Condition = 'chill' | 'bowel' | 'footsore' | 'tooIll';
export type Rations = 'full' | 'reduced' | 'short';
export type EatenLevel = Rations | 'none';
export type Phase = 'morning' | 'afternoon' | 'evening' | 'over';
export type Leg = 'out' | 'home';
export type Half = 'morning' | 'afternoon';

export interface MapNode {
  id: string;
  /** Miles east of the ford (negative is west). */
  x: number;
  /** Miles north of the ford. */
  y: number;
  region: RegionId;
  water: Water;
  gullyFt?: number;
  grass: Grass;
  feature?: Feature;
  label?: string;
  card?: string;
  /** Grassland visible from here: the first such view lifts morale once. */
  view?: boolean;
  /** Tree topology: the segment toward the ford, and segments leading away. */
  parentSeg: string | null;
  childSegs: string[];
  /** Path miles from the ford. */
  routeMiles: number;
  /** Shown on the map (reached, or seen from a lookout). */
  known: boolean;
  /** Visited by scouts or the party. */
  reached: boolean;
  /** Worker-hours spent shifting a rock step. */
  stepHours?: number;
  /** Scout-hours spent searching the cliff line for the pass. */
  searchHours?: number;
  lookoutUsed?: boolean;
}

export interface Segment {
  id: string;
  /** End nearer the ford. Marking and clearing extend outward from a. */
  a: string;
  b: string;
  miles: number;
  terrain: Terrain;
  region: RegionId;
  state: 'unknown' | 'revealed' | 'marked';
  visible: boolean;
  /** Far end and length known (traversed, or seen from a lookout). */
  farKnown: boolean;
  markedMiles: number;
  clearedMiles: number;
  /** Pre-blazed by an earlier party; found when reached. */
  oldTrack?: boolean;
  /** The descent: hidden until the cliff line is searched; needs a trench. */
  pass?: boolean;
  /** The pass has been found by searching the cliff line. */
  found?: boolean;
  trenchHours?: number;
  /** Camp crossed this passable segment without blazing it. */
  crossed?: boolean;
  /** Lawson's hint about whether the ridge falls away down this branch. */
  hint?: 'fallsAway' | 'runsOn';
  /** Whether the hint shown is right: hidden from the player until the branch resolves. */
  hintRight?: boolean;
  hintResolved?: boolean;
  /** Known to end only in cliffs. */
  deadEnd?: boolean;
  /** Hidden truth: part of the true route. Bots and UI must not read this before the end. */
  isRoute: boolean;
}

export interface GameMap {
  nodes: Record<string, MapNode>;
  segments: Record<string, Segment>;
  start: string;
  goal: string;
  routeMiles: number;
}

export interface Member {
  id: MemberId;
  name: string;
  leader: boolean;
  stamina: number;
  condition: Condition | null;
  /** Chill choice: keep him at camp tomorrow. */
  keepAtCamp: boolean;
  /** Chill choice: let him work, with a nightly risk of becoming too ill. */
  workingWithChill: boolean;
  /** Away (strayed hunter) until this time slot (three slots a day: morning, afternoon, night). */
  awayUntil: number;
  /** Busy searching for a strayed hunter until this time slot. */
  busyUntil: number;
  // Per-day flags, reset at dawn.
  worked: boolean;
  workedWet: boolean;
  workedRough: boolean;
  nightPenalty: number;
  /** Walked, carried, worked or minded camp today: anything but lying up. */
  exerted?: boolean;
}

export interface Horse {
  id: number;
  name: string;
  condition: number;
  /** Node where a collapsed horse was left; null while with the party. */
  leftAt: string | null;
}

export interface FreshMeat {
  lb: number;
  day: number;
}

export interface Stores {
  flour: number;
  saltMeat: number;
  fresh: FreshMeat[];
  tea: number;
  shots: number;
  axes: number;
  hatchets: number;
  hoe: number;
  blankets: number;
  shoes: number;
  campKit: number;
  grass: number;
}

export type Item = Exclude<keyof Stores, 'fresh'>;
export type Cache = Partial<Record<Item, number>>;
export type Loadout = Partial<Record<Item, number>>;

export type EventId =
  | 'dew'
  | 'horseFall'
  | 'horseExhausted'
  | 'dryCamp'
  | 'chill'
  | 'bowel'
  | 'hunterStrays'
  | 'dogsRaceOff'
  | 'brood'
  | 'refusal';

export type ChoiceId =
  | 'wait' | 'push'
  | 'reload' | 'lighten'
  | 'spread' | 'cache' | 'rest'
  | 'fetch' | 'dry'
  | 'keep' | 'work'
  | 'hunt'
  | 'search'
  | 'watch' | 'settle'
  | 'tea' | 'leaders' | 'pass'
  | 'ration' | 'turnBack';

export interface PendingEvent {
  id: EventId;
  member?: MemberId;
  horse?: number;
}

export interface EventChoiceView {
  id: ChoiceId;
  label: string;
  effect: string;
  disabled?: string;
  /** Bad news in the effect that is easy to miss, such as resting a horse where it cannot eat. */
  warn?: boolean;
}

export interface EventCard {
  id: EventId;
  title: string;
  text: string;
  choices: EventChoiceView[];
}

export interface HalfDayPlan {
  /** Move camp first, to a node on the horse path. */
  moveTo?: string;
  /** After any move, the whole party pushes on with the horses into passable ground toward the target. */
  advance?: boolean;
  /** Blaze the trail while advancing (default true). Unblazed ground is slow on the way home. */
  blaze?: boolean;
  /** Node or segment that Scout, Cut and Advance work toward. */
  target?: string;
  /** Task per man. Anyone left out minds camp. */
  tasks: Partial<Record<MemberId, Task>>;
  /** Items to leave at the current camp before anything else, to lighten the loads. */
  cache?: Cache;
  /** Return leg only: stay put this half instead of travelling. */
  halt?: boolean;
}

export interface EveningOrders {
  rations: Rations;
  tea?: boolean;
  restTomorrow?: boolean;
  /** Pairs of spare shoes to issue tonight. */
  shoes?: number;
  /** Feed cut grass where the camp's own grass is poor or missing (default true). */
  feedGrass?: boolean;
  /** Items to leave at this camp. */
  cache?: Cache;
  /** Pick up anything cached at this camp. */
  collect?: boolean;
  /** Turn for home: from the goal this is the win path, anywhere else it is a retreat. */
  headHome?: boolean;
}

export interface Warning {
  level: 'error' | 'warn';
  code: string;
  text: string;
}

export interface LogLine {
  day: number;
  half: Half | 'night' | 'dawn';
  text: string;
}

export interface JournalLine {
  day: number;
  date: string;
  text: string;
}

export interface ScoreLine {
  label: string;
  points: number;
}

export type ForcedReason = 'morale' | 'food' | 'illness' | 'horses';

export interface Outcome {
  result: 'crossed' | 'repulsed';
  /** Day the camp reached the goal (day 1 is 11 May 1813). */
  goalDay: number | null;
  dayHome: number;
  turnedBackDay: number | null;
  reason: ForcedReason | 'chose' | 'refusal' | null;
  /** Furthest straight-line miles from the Nepean reached by anyone. */
  furthestMiles: number;
  score: number | null;
  breakdown: ScoreLine[];
  title: 'Trailblazer' | 'Explorer' | 'Crossed' | 'Repulsed';
  horsesHome: number;
  foodLeft: number;
}

export interface Today {
  dewStart: number;
  pushedDew: boolean;
  movedMiles: number;
  newGround: number;
  waterFetched: boolean;
  fieldWork: boolean;
  campMoved: boolean;
  noFall: boolean;
  blaxlandAtCamp: boolean;
  cloudLifts: boolean;
  dogsKilled: boolean;
  /** Any kill today, by dogs or hunters. */
  caught: boolean;
  freshEaten: boolean;
  eventThisHalf: boolean;
  log: string[];
}

export type Action =
  | { t: 'half'; plan: HalfDayPlan }
  | { t: 'choose'; choice: ChoiceId }
  | { t: 'end'; orders: EveningOrders };

/** Who sets out. Leaders are always the three of 1813; the 1813 party had 4 servants, 4 horses, 5 dogs. */
export interface PartyChoice {
  /** 0 to 6. Burne comes first, then Fairs, then unnamed men. */
  servants?: number;
  /** 2 to 6 pack horses. */
  horses?: number;
  /** 0 to 8 dogs. */
  dogs?: number;
}

export interface NewGameOptions {
  seed: number;
  mode: Mode;
  loadout?: Loadout;
  party?: PartyChoice;
  names?: { servant3?: string; servant4?: string };
  /** Whose expedition this is, for a shared device. Display only. */
  owner?: string;
}

export interface GameState {
  v: 1;
  seed: number;
  mode: Mode;
  rng: number;
  day: number;
  phase: Phase;
  leg: Leg;
  weather: Weather;
  frostTonight: boolean;
  map: GameMap;
  camp: string;
  furthestCampMiles: number;
  furthestMiles: number;
  men: Member[];
  horses: Horse[];
  dogs: number;
  stores: Stores;
  caches: Record<string, Cache>;
  morale: number;
  wear: number;
  rations: Rations;
  pending: PendingEvent[];
  eveningQueue: PendingEvent[];
  /** Hours lost at the start of the next half (strayed horses). */
  delayNext: number;
  /** Today is a rest day: nobody moves, scouts or cuts. */
  restToday: boolean;
  restTomorrow: boolean;
  noFoodDays: number;
  lastFreshDay: number;
  /** Last day nobody moved, scouted or cut on the way out (0 before the first). */
  lastRestDay: number;
  viewSeen: boolean;
  goalDay: number | null;
  turnedBackDay: number | null;
  turnReason: Outcome['reason'];
  outcome: Outcome | null;
  today: Today;
  cards: string[];
  journal: JournalLine[];
  stats: {
    deadEnds: number;
    refusals: number;
    restDays: number;
    horseFalls: number;
    strays: number;
    kills: number;
    illnesses: number;
    dryNights: number;
    /** Man-hours by activity across the run, for tuning. */
    manHours: Record<string, number>;
    /** Furthest camp miles along the trail at the end of each day, for the end screen's ghost line. */
    campMilesByDay: number[];
  };
  opts: NewGameOptions;
  actions: Action[];
}

export interface HalfResult {
  state: GameState;
  log: LogLine[];
  event?: EventId;
}

export interface EndDayResult {
  state: GameState;
  journal: JournalLine;
}
