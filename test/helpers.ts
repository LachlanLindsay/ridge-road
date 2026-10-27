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

/** Syllables in a word by the usual vowel-group rule: rough, but within a few tenths of a grade of a dictionary count over a card. */
export function syllables(word: string): number {
  let w = word.toLowerCase().replace(/[^a-z]/g, '');
  if (!w) return 0;
  if (w.length <= 3) return 1;
  // A silent final e or es, and an -ed that is not its own syllable (walked, but not waited).
  w = w.replace(/(?:[^laeiouy]es|[^laeiouy]e)$/, '').replace(/([^td])ed$/, '$1').replace(/^y/, '');
  return Math.max(1, (w.match(/[aeiouy]{1,2}/g) ?? []).length);
}

/** Flesch–Kincaid grade: the US school grade a text reads at. */
export function fleschKincaid(text: string): number {
  const sentences = text.split(/[.!?]+[”’]?(?=\s|$)/).filter((s) => /[A-Za-z0-9]/.test(s)).length;
  const words = text.match(/[A-Za-z0-9’'-]+/g) ?? [];
  const syl = words.reduce((n, w) => n + syllables(w), 0);
  return 0.39 * (words.length / Math.max(1, sentences)) + 11.8 * (syl / Math.max(1, words.length)) - 15.59;
}

/** A card's own words: its text with every quotation taken out, leaving the rest of each sentence. */
export function ownWords(text: string): string {
  return text
    .replace(/“[^”]*”/g, ' ')
    .replace(/\s+([.,;:])/g, '$1')
    .replace(/([.:;,])\s*[.:;,]/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}
