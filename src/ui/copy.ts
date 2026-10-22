// Words shown in the game. Facts come from SPEC.md, which cites its sources; everything here is
// written fresh. The Country text is a draft for review by a Gundungurra or Darug organisation
// before any public release (SPEC.md, "History and Country content").

export interface Card {
  title: string;
  paragraphs: string[];
}

export const BRIEFING: Card[] = [
  {
    title: 'May 1813',
    paragraphs: [
      'The settlements west of Sydney end at the Nepean River. Beyond it rise the Blue Mountains, and every European party that has tried to cross them has been turned back.',
      'Gregory Blaxland means to keep to the ridges: find the one that runs through, mark it, and cut a path wide enough for four pack horses.',
      'Lead the party across the range to open country, then bring everyone home before the food runs out.',
    ],
  },
  {
    title: 'The party',
    paragraphs: [
      'Seven men, four pack horses and five dogs. Only the three leaders can mark the trail, so every scouting party needs one.',
      'Gregory Blaxland, grazier: the horses lose less condition on afternoons he minds camp. William Lawson, surveyor: he reads whether a ridge falls away, right three times in four, and sees further from a lookout. William Charles Wentworth, the youngest: he cuts faster and recovers more overnight.',
      'James Burne, servant and guide, is the best hunter. Samuel Fairs and two convict servants whose names were not recorded make up the rest. The traits are invented for play.',
    ],
  },
  {
    title: 'Whose Country',
    paragraphs: [
      'The Blue Mountains are Gundungurra and Darug Country. Aboriginal people knew routes across them long before 1813, including Bilpin Ridge and the Coxs River.',
      'This was the first recorded European crossing, not the first crossing. The signs of people the party saw along the way appear in the journal as you find them.',
    ],
  },
];

export const HELP: Card[] = [
  {
    title: 'A day on the ridges',
    paragraphs: [
      'Each day you plan a morning and an afternoon, then settle the night in camp. Pick where to work by tapping a ridge on the map, give each man a task by tapping his name, and press Go.',
    ],
  },
  {
    title: 'Scout, cut, advance',
    paragraphs: [
      'Scouts mark the ridge ahead. Cutters clear marked ground so the horses can follow. Horses move only on the cleared path, drawn in red; open forest, heath, meadow and swamp need no clearing once marked.',
      'Every mile between camp and the work front is walked out and back each half, so move camp forward along the red path often. Where the ground ahead is open, the whole party can push on with the horses.',
    ],
  },
  {
    title: 'Dead ends',
    paragraphs: [
      'Most ridges end at cliffs. Lawson reads which way the ground falls when he scouts, and a lookout shows the ridges around it in clear weather. A cross marks a branch that leads nowhere.',
    ],
  },
  {
    title: 'Keeping the party going',
    paragraphs: [
      'Leave at least one man minding camp, or horses stray. Horses need water and grass every night; swamp heads have both, and grass cut at a good camp can be carried for dry ones. Men need food, water, rest and, when spirits sag, tea.',
      'Reach the sugarloaf hill beyond the range, then turn for home and bring everyone back across the Nepean.',
    ],
  },
];

/** Bodies for the journal cards this build can show. The rest are titles until their text is written and sourced. */
export const CARD_TEXT: Record<string, string[]> = {
  whoseCountry: BRIEFING[2]!.paragraphs,
  cairn: ['The party credited this cairn to the explorer George Bass. It was later named Caley’s Repulse, though Caley was reportedly never there.'],
  after1813: [
    'In November 1813 the surveyor George Evans was sent after the party and pushed on to the Bathurst plains.',
    'In 1814–15 William Cox’s convict gang built a road over the mountains. Each of the three leaders was granted 1,000 acres.',
    'Settlement spread west into Wiradjuri Country and led to the Bathurst War.',
  ],
};
