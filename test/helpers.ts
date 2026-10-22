import { newGame, type GameMap, type GameState, type MapNode, type Segment, type Terrain } from '../src/engine/index';

/** A game on a one-segment test map: the ford, then `miles` of one terrain to node A. */
export function lineGame(terrain: Terrain, miles: number, opts: { marked?: number; cleared?: number; seed?: number } = {}): GameState {
  const s = newGame({ seed: opts.seed ?? 7, mode: 'historical' });
  const node = (id: string, x: number, parentSeg: string | null, childSegs: string[], routeMiles: number): MapNode => ({
    id,
    x,
    y: 0,
    region: 3,
    water: 'swamp',
    grass: 'rushy',
    parentSeg,
    childSegs,
    routeMiles,
    known: true,
    reached: true,
  });
  const seg: Segment = {
    id: 's:A',
    a: 'ford',
    b: 'A',
    miles,
    terrain,
    region: 3,
    state: 'revealed',
    visible: true,
    farKnown: false,
    markedMiles: opts.marked ?? 0,
    clearedMiles: opts.cleared ?? 0,
    isRoute: true,
  };
  const map: GameMap = {
    nodes: { ford: node('ford', 0, null, ['s:A'], 0), A: { ...node('A', -miles, 's:A', [], miles), known: false, reached: false } },
    segments: { 's:A': seg },
    start: 'ford',
    goal: 'A',
    routeMiles: miles,
  };
  s.map = map;
  s.camp = 'ford';
  s.weather = 'fair';
  s.pending = [];
  s.today.dewStart = 0;
  for (const m of s.men) m.stamina = 70;
  return s;
}

/** Everyone not named minds camp. */
export function tasks(work: Record<string, 'scout' | 'cut' | 'camp' | 'rest' | 'hunt' | 'water' | 'grass'>) {
  return work as Partial<Record<'blaxland' | 'lawson' | 'wentworth' | 'burne' | 'fairs' | 'servant3' | 'servant4', 'scout' | 'cut' | 'camp' | 'rest' | 'hunt' | 'water' | 'grass'>>;
}
