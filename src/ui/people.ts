// Who's who: a card for each man, each horse and the dogs. What each does in the game, with the
// numbers for the mode being played; how he is now, when a game is going; and what the record says
// of 1813. The traits are invented for play (the briefing says so); the history is written fresh
// from the sources named under each card, and quotations are the 1813 party's own words.
import { HORSE_NAMES, T, dogOdds, horseLoads, isAway, isBusy, modeTuning, workFactor, type GameState, type MemberId, type Mode } from '../engine';
import { CONDITION_LABEL, itemText, lb } from './format';

/** A horse's load as the outfitting packs it: pounds in all, and the pieces by item. */
export interface PackedLoad {
  total: number;
  items: Partial<Record<string, number>>;
}

export type Who = { kind: 'man'; id: MemberId } | { kind: 'horse'; id: number; load?: PackedLoad } | { kind: 'dogs'; count: number };

export interface Info {
  title: string;
  role: string;
  /** A few words for the trait, for lists. */
  trait: string;
  /** What he does in the game, with live numbers. */
  game: string[];
  /** How he is now, when there is a game going. */
  now: string | null;
  /** The record of 1813. */
  history: string[];
  sources: string;
}

const MODE_LABEL: Record<Mode, string> = { easy: 'Easy', historical: 'Historical', hard: 'Hard' };

const pct = (p: number) => `${Math.round(p * 100)}%`;

const ATTENDED = 'Blaxland’s journal doesn’t name the four servants. It says only that the three gentlemen set out “attended by four servants”.';

const LEADER = 'A leader: only Blaxland, Lawson and Wentworth can mark the trail, so every scouting party needs one of them.';

function servantLine(): string {
  const f = T.efficiency;
  return `A servant: he can’t mark the trail, and while morale is below ${f.servantMoraleBelow} he works at ${pct(f.servantMoraleFactor)} pace.`;
}

interface ManCard {
  role: string;
  trait: string;
  game: (mode: Mode) => string[];
  history: string[];
  sources: string;
}

const PLAIN_HANDS = 'No special trait: a steady pair of hands for cutting, fetching water, cutting grass and minding camp.';

const MEN: Record<MemberId, ManCard> = {
  blaxland: {
    role: 'Leader · farmer and grazier, 34 in May 1813',
    trait: 'Minds the horses',
    game: () => [
      `Minds the horses: on a night after he has minded camp in the afternoon, the horses lose ${pct(1 - T.horses.night.blaxlandLossFactor)} less condition.`,
      LEADER,
    ],
    history: [
      'Born in Kent in 1778, he sailed for New South Wales in 1805 with his family and some livestock, and set up as a farmer with cattle. Early in 1813, wanting more grazing land, he won Governor Macquarie’s approval to try a crossing by following the ridges, and asked Lawson and Wentworth to come.',
      'His journal of the crossing, written in the third person, was printed in England in 1823; the quotations in this game come from it. He later claimed to have led the expedition, though records from the time suggest the three led it together.',
    ],
    sources: 'Sources: Wikipedia, “Gregory Blaxland” and “1813 crossing of the Blue Mountains”.',
  },
  lawson: {
    role: 'Leader · surveyor and lieutenant, 38 in May 1813',
    trait: 'Reads the ground',
    game: (mode) => [
      `Reads the ground: scouting with him, you get his reading of each new branch, whether it falls away to cliffs or runs on. On ${MODE_LABEL[mode]} he is right ${pct(modeAccuracy(mode))} of the time.`,
      'At a fork, scouts with him carry on down the branch he reads as running on; without him they stop and report.',
      'From a lookout he sees one ridge further than anyone else.',
      LEADER,
    ],
    history: [
      'Born in Middlesex in 1774 and trained as a surveyor, he came to Sydney in 1800 as an officer of the New South Wales Corps, and raised cattle and sheep. Blaxland’s journal calls him Lieutenant Lawson.',
      'He kept detailed route notes, with each day’s distance; they are held by the State Library of NSW. From 1819 to 1824 he was commandant of the new settlement at Bathurst, west of the range.',
    ],
    sources: 'Sources: Australian Dictionary of Biography, “Lawson, William”; Wikipedia, “1813 crossing of the Blue Mountains”; Blaxland’s journal, 11 May 1813.',
  },
  wentworth: {
    role: 'Leader · the youngest, 22 in May 1813',
    trait: 'Young and strong',
    game: () => [
      `Young and strong: he cuts ${pct(T.efficiency.wentworthCut - 1)} faster than another man would, and gets back ${T.stamina.recovery.wentworthBonus} more stamina each night.`,
      LEADER,
    ],
    history: [
      'Born in 1790 and taken to Norfolk Island as a baby, he was schooled in England and came back to Sydney in 1810. In 1811 Governor Macquarie made him acting provost-marshal.',
      'He went on to be a barrister, founded the newspaper The Australian with Robert Wardell in 1824, and in 1853 chaired the committee that drafted the colony’s constitution.',
    ],
    sources: 'Sources: Australian Dictionary of Biography, “Wentworth, William Charles”; Wikipedia, “1813 crossing of the Blue Mountains”.',
  },
  burne: {
    role: 'Servant · guide and kangaroo hunter',
    trait: 'The best shot',
    game: () => [
      `The best shot: each hunting try, he is ${T.hunting.burneFactor === 2 ? 'twice' : `${T.hunting.burneFactor} times`} as likely as another man to bring down a kangaroo, ${pct(T.hunting.man.good * T.hunting.burneFactor)} in open forest or meadow and ${pct(T.hunting.man.poor * T.hunting.burneFactor)} elsewhere. When the party needs a hunter, he goes first.`,
      servantLine(),
    ],
    history: ['James Burne, or Burnes, is remembered as the party’s guide and kangaroo hunter.', ATTENDED],
    sources: 'Sources: Wikipedia, “1813 crossing of the Blue Mountains”; Blaxland’s journal, 11 May 1813.',
  },
  fairs: {
    role: 'Servant · convict',
    trait: 'A steady hand',
    game: () => [PLAIN_HANDS, servantLine()],
    history: ['Samuel Fairs was a convict who had arrived in the colony in 1810.', ATTENDED],
    sources: 'Sources: Wikipedia, “1813 crossing of the Blue Mountains”; Blaxland’s journal, 11 May 1813.',
  },
  servant3: {
    role: 'Servant · convict, name not recorded',
    trait: 'A steady hand',
    game: () => [PLAIN_HANDS, servantLine()],
    history: ['The last two of the four servants are thought to have been convicts, but who they were is not known.', ATTENDED],
    sources: 'Sources: Wikipedia, “1813 crossing of the Blue Mountains”; Blaxland’s journal, 11 May 1813.',
  },
  servant4: {
    role: 'Servant · convict, name not recorded',
    trait: 'A steady hand',
    game: () => [PLAIN_HANDS, servantLine()],
    history: ['The last two of the four servants are thought to have been convicts, but who they were is not known.', ATTENDED],
    sources: 'Sources: Wikipedia, “1813 crossing of the Blue Mountains”; Blaxland’s journal, 11 May 1813.',
  },
  servant5: {
    role: 'Servant · not in the 1813 party',
    trait: 'An extra hand',
    game: () => [PLAIN_HANDS, servantLine()],
    history: ['The 1813 party had four servants. This man is your addition: another pair of hands to cut and carry, and another mouth to feed.'],
    sources: 'Source: Blaxland’s journal, 11 May 1813.',
  },
  servant6: {
    role: 'Servant · not in the 1813 party',
    trait: 'An extra hand',
    game: () => [PLAIN_HANDS, servantLine()],
    history: ['The 1813 party had four servants. This man is your addition: another pair of hands to cut and carry, and another mouth to feed.'],
    sources: 'Source: Blaxland’s journal, 11 May 1813.',
  },
};

function modeAccuracy(mode: Mode): number {
  return modeTuning(mode).hintAccuracy;
}

const HORSE_HISTORY = [
  'Four pack horses went, “laden with provisions, ammunition, and other necessaries”. The journal never names them; the names here are invented.',
  'Kept standing under their packs while the men cut ahead, “some of the horses, while standing, fell several times under their loads” on 13 May. Going down the cliffs on 29 May “the horses could but just keep their footing without a load”, and on the way home, on 4 June, “one of the horses fell this day with his load, quite exhausted”.',
];

const DOG_HISTORY = [
  'Five dogs went with the party, and they helped feed it: the journal records their kills on 13, 16 and 29 May. At night they gave the alarm; on 21 May “the dogs ran off and barked violently”.',
  'The journal doesn’t say what kind of dogs they were. The game makes them kangaroo dogs, the sighthounds the colonists bred from greyhounds and deerhounds to run down kangaroo.',
];

export function manName(id: MemberId, s: GameState | null): string {
  return s?.men.find((m) => m.id === id)?.name ?? NAMES[id];
}

const NAMES: Record<MemberId, string> = {
  blaxland: 'Gregory Blaxland',
  lawson: 'William Lawson',
  wentworth: 'William Charles Wentworth',
  burne: 'James Burne',
  fairs: 'Samuel Fairs',
  servant3: 'Servant 3',
  servant4: 'Servant 4',
  servant5: 'Servant 5',
  servant6: 'Servant 6',
};

function manNow(s: GameState, id: MemberId): string | null {
  const m = s.men.find((x) => x.id === id);
  if (!m) return null;
  if (isAway(s, m)) return 'Away from camp, not back yet.';
  const parts = [`Stamina ${Math.round(m.stamina)} of 100`];
  parts.push(m.condition ? CONDITION_LABEL[m.condition].toLowerCase() : 'well');
  if (isBusy(s, m)) parts.push('out searching for the hunter');
  const pace = m.condition === 'tooIll' ? 'too ill to work' : `works at ${pct(workFactor(s, m))} pace`;
  return `${parts.join(', ')}: ${pace}.`;
}

function horseNow(s: GameState, id: number): string | null {
  const h = s.horses.find((x) => x.id === id);
  if (!h) return null;
  if (h.leftAt?.startsWith('lost:')) return 'Lost: left behind on the way out, and not found again on the way home.';
  if (h.leftAt) return 'Left behind, too weak to go on. He may be found grazing on the way home.';
  const load = horseLoads(s).find((x) => x.horse.id === id);
  const c = Math.round(h.condition);
  const state = h.condition < T.horses.exhaustedBelow ? ', exhausted' : h.condition < T.horses.weakBelow ? ', weak' : '';
  return `Condition ${c} of 100${state}${load ? `, carrying about ${lb(load.load)} of ${lb(load.cap)}` : ''}.`;
}

const PACK_ORDER = ['campKit', 'axes', 'hatchets', 'hoe', 'blankets', 'shoes', 'flour', 'saltMeat', 'tea', 'shots', 'grass'];

/** "Packed with the camp kit, 2 axes and 61 lb flour: 134 lb." */
function packText(p: PackedLoad): string {
  const parts = PACK_ORDER.filter((k) => (p.items[k] ?? 0) >= 0.5).map((k) => itemText(k, Math.round(p.items[k]!)));
  if (!parts.length) return 'Carrying nothing.';
  const list = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts[0]!;
  const heavy = p.total > T.horses.overloadLb + 0.5 ? ', more than he can carry' : p.total > T.horses.capacityLb + 0.5 ? ', more than an easy load' : '';
  return `Packed with ${list}: ${lb(p.total)}${heavy}.`;
}

function horseGame(): string[] {
  const H = T.horses;
  const N = H.night;
  return [
    `Carries ${H.capacityLb} lb easily and ${H.overloadLb} at a push; overloaded, he tires faster and stumbles more.`,
    `Below ${H.weakBelow} condition he carries ${H.weakCarry === 0.75 ? 'three-quarters' : pct(H.weakCarry)} of a load; below ${H.exhaustedBelow} he is exhausted and carries nothing.`,
    `Every night he needs water and grass, or ${N.grassLbPerHorse} lb of cut grass: good grass puts back ${N.goodFeed} condition, no feed costs ${-N.noFeed}, and no water ${-N.noWater} more.`,
  ];
}

function dogGame(n: number): string[] {
  const D = T.hunting.dogs;
  const odds = n > 0 ? `with ${n}, a ${pct(dogOdds(D.good, n))} chance of a kill in open forest or meadow, ${pct(dogOdds(D.poor, n))} elsewhere` : 'with none, no chance of a kill';
  return [
    `They hunt on their own every night: ${odds}. More dogs, better odds.`,
    `Each eats ${T.rations.dogMeat === 0.5 ? '½' : T.rations.dogMeat} lb of meat a day, unless they have made a kill.`,
    'Some nights in the mountains they race off barking into the dark, and the camp loses sleep or heart.',
  ];
}

/** The card for a man, a horse or the dogs: in a game when there is one, otherwise for the mode chosen. */
export function infoFor(who: Who, s: GameState | null, mode: Mode = s?.mode ?? 'historical'): Info {
  if (who.kind === 'man') {
    const c = MEN[who.id];
    return { title: manName(who.id, s), role: c.role, trait: c.trait, game: c.game(mode), now: s ? manNow(s, who.id) : null, history: c.history, sources: c.sources };
  }
  if (who.kind === 'horse') {
    const name = s?.horses.find((h) => h.id === who.id)?.name ?? HORSE_NAMES[who.id - 1] ?? `Horse ${who.id}`;
    const now = s ? horseNow(s, who.id) : who.load ? packText(who.load) : null;
    return { title: name, role: 'Pack horse', trait: 'Carries the stores', game: horseGame(), now, history: HORSE_HISTORY, sources: 'Source: Blaxland’s journal, 11 May to 4 June 1813.' };
  }
  const n = s ? s.dogs : who.count;
  return {
    title: 'The dogs',
    role: n === 0 ? 'No dogs this time' : n === 1 ? 'One dog' : `${n} dogs`,
    trait: 'Hunt at night',
    game: dogGame(n),
    now: s ? (s.dogs > 0 ? `${s.dogs} with the party.` : 'None with the party.') : null,
    history: DOG_HISTORY,
    sources: 'Sources: Blaxland’s journal, 11–29 May 1813; Wikipedia, “Kangaroo dog”.',
  };
}

/** Everyone in a party, front to back as the Party sheet lists them. */
export function partyWhos(s: GameState): Who[] {
  return [...s.men.map((m): Who => ({ kind: 'man', id: m.id })), ...s.horses.map((h): Who => ({ kind: 'horse', id: h.id })), { kind: 'dogs', count: s.dogs }];
}
