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

/**
 * The journal cards, written fresh from Blaxland's 1823 account of the crossing and the sources in
 * SPEC.md. Quotations are the 1813 party's own words, as Blaxland printed them; everything else is
 * new writing. Each card's sources are in CARD_SOURCES.
 */
export const CARD_TEXT: Record<string, string[]> = {
  whoseCountry: BRIEFING[2]!.paragraphs,
  ridgeMethod: [
    'From the colony’s first years, people tried to get through the mountains. Most followed the rivers upstream and were stopped by rapids and sheer cliffs; others lost themselves in gorges or gave up in the scrub. Francis Barrallier was turned back by a waterfall in 1802.',
    'Blaxland’s plan turned that around: keep to the line of ridges running west between two river valleys, and never go down into them. It was hard going. On the third day, every ridge they explored “proved to terminate in a deep rocky precipice”.',
    'So they worked in stages. Two men stayed with the horses while the rest went ahead, marked trees along the line and cut a path back to camp; then the whole party moved up. Some ground was walked three times over.',
  ],
  distanceByClock: [
    'Blaxland’s journal gives each day’s distance as an estimate. It “was computed by time, the rate being estimated at about two miles per hour”: hours on the move, at a guessed pace.',
    'By that reckoning the sugarloaf hill was about 58 miles from the Nepean, counting the descent of the last mountain as half a mile. The route in this game is laid out to the same reckoning.',
    'William Lawson, a trained surveyor, kept a careful record of their progress west, and his journal is the one later travellers used to retrace the route.',
  ],
  cairn: [
    'On 19 May, on the second ridge, the party found a pile of stones. “This pile they concluded to be the one erected by Mr. Bass, to mark the end of his journey.”',
    'Historians doubt George Bass came this far. In 1814 William Cox, building the road over the mountains, called it Caley’s pile, after the botanist George Caley, and the place is still known as Caley’s Repulse, though Caley is not known to have reached it either.',
    'Who piled the stones, and why, is not known. The cairn may be Aboriginal.',
  ],
  'signs-huts': [
    'On the third day the party came on a line of trees blazed by some European before them, the bark cut to mark the way. In different places, “several native huts presented themselves”.',
    'They are the journal’s first sign that the ridges were not empty country. People lived and travelled here, and had for a very long time.',
    'Later, west of the range, the journal remarks that the people there “appear to have no huts like those on the eastern side”.',
  ],
  'signs-smoke': [
    'On 26 May, from the high ground, the party “saw the fires of some natives below” and put their number at about thirty: men, women and children.',
    'The next day they saw more fires and about as many people, further along the way they were heading. They also made out forest land below the cliffs: the country they had come to find, already lived in.',
  ],
  'signs-woodcutter': [
    'On 24 May, camped at a swamp, the party “heard a native chopping wood very near them, who fled at the approach of the dogs”.',
    'He was heard, not seen. Nowhere in the journal does the party meet the people whose Country it crossed: they are heard, or seen from a distance, or known by what they left behind.',
  ],
  'signs-camps': [
    'West of the range, on 31 May, “traces of the natives presented themselves in the fires they had left the day before”.',
    'For three days the people ahead had kept their distance; the journal says they “moved before them”, the smoke of their fires showing where they went. On this side of the mountains, it notes, they “appear to have no huts like those on the eastern side”.',
    'The country beyond the mountains, which the party had come to find for the colony’s flocks, was already somebody’s home.',
  ],
  wombats: [
    'On 25 May, pushing through prickly brush, the party “saw the track of the wombat”, which Blaxland describes as “an animal which burrows in the ground as a badger”.',
    'The journal notices animals mostly as food or as noise: a kangaroo an eagle had just killed, on the second day; an emu calling all night across a gully; native dogs, now called dingoes, howling round the camp; and the kangaroos the dogs ran down, welcome after nearly two weeks of salt meat.',
    'Common wombats still live in these mountains.',
  ],
  after1813: [
    'In November 1813 Governor Macquarie sent the surveyor George Evans after the party. He passed their sugarloaf hill, now Mount Blaxland, and went on to the plains where Bathurst stands.',
    'In July 1814 William Cox began a road over the mountains along the party’s line. Thirty convicts and eight guards finished it in January 1815. Each of the three leaders was granted 1,000 acres beyond the range.',
    'Settlement spread fast into Wiradjuri Country. In 1824 the Wiradjuri, led by Windradyne, fought the colony in what became known as the Bathurst War; martial law was declared that August.',
  ],
};

/** Where each card's facts come from, shown under the card. */
export const CARD_SOURCES: Record<string, string> = {
  whoseCountry: 'Sources: Wikipedia, “Blue Mountains (New South Wales)” and “1813 crossing of the Blue Mountains”.',
  ridgeMethod: 'Sources: Blaxland’s journal, 13–14 May 1813; State Library of NSW, “Finding the way west” and “Crossing the Blue Mountains”.',
  distanceByClock: 'Sources: Blaxland’s journal, 11 and 31 May 1813; State Library of NSW, “Finding the way west”.',
  cairn: 'Sources: Blaxland’s journal, 19 May 1813; Penrith City Library, Caley’s Repulse; the Cox’s Road heritage listing at Linden.',
  'signs-huts': 'Source: Blaxland’s journal, 13 and 31 May 1813.',
  'signs-smoke': 'Source: Blaxland’s journal, 26 and 27 May 1813.',
  'signs-woodcutter': 'Source: Blaxland’s journal, 24 May 1813.',
  'signs-camps': 'Source: Blaxland’s journal, 29 and 31 May 1813.',
  wombats: 'Source: Blaxland’s journal, 12–29 May 1813.',
  after1813: 'Sources: Wikipedia, “1813 crossing of the Blue Mountains”, “Blue Mountains (New South Wales)” and “Bathurst War”.',
};
