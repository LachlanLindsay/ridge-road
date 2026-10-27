// Words shown in the game. Facts come from SPEC.md, which cites its sources; everything here is
// written fresh. The Country text is a draft for review by a Gundungurra or Darug organisation
// before any public release (SPEC.md, "History and Country content").

export interface Card {
  title: string;
  paragraphs: string[];
}

export const BRIEFING: Card[] = [
  {
    title: 'Whose Country',
    paragraphs: [
      'The Blue Mountains are Darug and Gundungurra Country, and the plains beyond them, where the colony went next, are Wiradjuri Country. Aboriginal people knew routes across the range long before 1813, including Bilpin Ridge and the Coxs River.',
      'This was the first recorded European crossing, not the first crossing. The signs of people the party saw along the way appear in the journal as you find them.',
    ],
  },
  {
    title: 'May 1813',
    paragraphs: [
      'The settlements west of Sydney end at the Nepean River, a frontier where Darug people have fought the farms since the 1790s. Beyond it rise the Blue Mountains. Every European party that has tried to cross them has been turned back, and the ones that got furthest took Aboriginal guides. Blaxland’s party takes none.',
      // The droughts: Wikipedia, “1813 crossing of the Blue Mountains” (the colony needed more
      // farming land, “particularly after the droughts of 1812 and 1813”), which cites NSW National
      // Parks and the State Library of NSW; C. Fenby, History of Meteorology 7 (2015), dates that
      // drought in coastal NSW to 1809–1815.
      'Drought in 1812 and 1813 has left the colony short of grass for its sheep and cattle, and it wants more land. Gregory Blaxland means to keep to the ridges: find the one that runs through, mark it, and cut a path wide enough for four pack horses.',
      'Lead the party across the range to open country, then bring everyone home before the food runs out.',
    ],
  },
  {
    title: 'The party',
    paragraphs: [
      'Seven men, four pack horses and five dogs. Only the three leaders can mark the trail, so every scouting party needs one.',
      'Gregory Blaxland, grazier: the horses lose less condition on afternoons he minds camp. William Lawson, surveyor: he reads whether a ridge falls away, right three times in four, and sees further from a lookout. William Charles Wentworth, the youngest: he cuts faster and recovers more overnight.',
      'James Burne, a colonist who worked as a guide and kangaroo hunter, is the best shot. Samuel Fairs and two convict servants who have never been identified make up the rest. The traits are invented for play.',
    ],
  },
];

/** The briefing card that introduces the party, for the screens that put the roster under it. */
export const PARTY_CARD = BRIEFING.findIndex((c) => c.title === 'The party');
/** The briefing card about whose Country the mountains are: the journal's Whose Country card. */
export const COUNTRY_CARD = BRIEFING.findIndex((c) => c.title === 'Whose Country');

/** The title screen's acknowledgement of Country: the game's own statement, not the communities' text. */
export const ACKNOWLEDGEMENT =
  'Ridge Road is set on Darug, Gundungurra and Wiradjuri Country. The game acknowledges their peoples as the Traditional Custodians of the mountains and the plains beyond, and their Elders past and present.';

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
      'Scouts mark the ridge ahead. Cutters clear marked ground so the horses can follow. Horses move only on the cleared path, drawn in red. Brush, the dark green stipple along a ridge, and rock have to be cleared first; open forest, heath, meadow and swamp need no clearing once marked.',
      'Every mile between camp and the work front is walked out and back each half, so the plan moves camp forward along the red path with the work; tap Stay instead to keep it where it is. Where the ground ahead is open, the whole party can push on with the horses.',
    ],
  },
  {
    title: 'Dead ends',
    paragraphs: [
      'Most ridges end at cliffs. Lawson pencils his guess beside each ridge nobody has walked yet: runs on, or falls away. A lookout shows the ridges around it in clear weather. A cliff line drawn across a ridge’s end marks a branch that leads nowhere, and country the party hasn’t seen lies under haze.',
    ],
  },
  {
    title: 'Keeping the party going',
    paragraphs: [
      'Leave at least one man minding camp, or horses stray. Horses need water and grass every night. Each camp’s point on the map shows its feed: solid green is full feed, half green half feed (the horses still weaken), empty none. Grass cut at a full-feed camp can be carried for the bare ones, and the plan offers it before bare ground. Men need food, water, rest and, when spirits sag, tea.',
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
  whoseCountry: BRIEFING[COUNTRY_CARD]!.paragraphs,
  ridgeMethod: [
    'From the colony’s first years, people tried to get through the mountains. Most followed the rivers upstream and were stopped by rapids and sheer cliffs; others lost themselves in gorges or gave up in the scrub. Francis Barrallier was turned back by a waterfall in 1802.',
    'Blaxland’s plan turned that around: keep to the line of ridges running west between two river valleys, and never go down into them. Keeping to the ridges is how the mountains had always been crossed; the party was the first European one to try it without Aboriginal guides. It was hard going. On 13 May, their third day, every ridge they explored “proved to terminate in a deep rocky precipice”.',
    'So they worked in stages. Two men stayed with the horses while the rest went ahead, marking trees and cutting a path, then walked back to camp; when the path was ready, the whole party moved up. Most of the way was walked three times over.',
  ],
  distanceByClock: [
    'Blaxland’s journal gives each day’s distance as an estimate. It “was computed by time, the rate being estimated at about two miles per hour”: hours on the move, at a guessed pace.',
    'By that reckoning they had walked about 58 miles when they reached the sugarloaf hill: fifty through the mountains, counting the last descent as half a mile, and eight through the forest land beyond. The route in this game is laid out to the same reckoning.',
    'William Lawson, a trained surveyor, kept a careful record of their progress west, and his journal is perhaps the most useful for retracing their trail today.',
  ],
  cairn: [
    'On 19 May, on the second ridge, the party found a pile of stones. “This pile they concluded to be the one erected by Mr. Bass, to mark the end of his journey.”',
    'The historian Ernest Scott, who later edited the journal, judged the guess wrong. In 1814 William Cox, building the road over the mountains, called it Caley’s pile, after the botanist George Caley, and the place is still known as Caley’s Repulse, though Caley is not known to have reached it either.',
    'Who piled the stones, and why, is not known.',
  ],
  'signs-huts': [
    'On 13 May 1813, their third day out, the party came on a line of trees blazed by some European before them, the bark cut to mark the way. In different places, “several native huts presented themselves”.',
    'They are the journal’s first sign that the ridges were not empty country. People lived and travelled here, and had for at least twenty thousand years: Dargan Shelter, in these mountains north of the route, was lived in through the last ice age.',
    'Later, west of the range, the journal remarks that the people there “appear to have no huts like those on the eastern side”.',
  ],
  'signs-smoke': [
    'On 26 May, from the high ground, the party “saw the fires of some natives below” and put their number at about thirty: men, women and children.',
    'The next day they saw more fires and about as many people, further along the way they were heading. On 28 May they found that what they had taken for sandy barren land below the mountain “was forest land”: the country they had come to find, already lived in.',
  ],
  'signs-woodcutter': [
    'On 24 May, camped at a swamp, the party “heard a native chopping wood very near them, who fled at the approach of the dogs”.',
    'The journal records only the sound, and that he fled. Nowhere in it does the party meet the people whose Country it crossed: they are heard, or seen from a distance, or known by what they left behind.',
  ],
  'signs-camps': [
    'West of the range, on 31 May, “traces of the natives presented themselves in the fires they had left the day before”.',
    'On 28 and 29 May the people ahead “moved before them”, the smoke of their fires showing where they went. On this side of the mountains, the journal notes, they “appear to have no huts like those on the eastern side”.',
    'The country beyond the mountains, which the party had come to find for the colony’s flocks, was already somebody’s home.',
  ],
  wombats: [
    'On 25 May, pushing through prickly brush, the party “saw the track of the wombat”, which Blaxland describes as “an animal which burrows in the ground as a badger”.',
    'The journal notices animals mostly as food or as noise. There is a kangaroo an eagle had just killed, on the second day, and an emu calling all night across a gully. Dingoes, which the journal calls native dogs, howl round the camp. And there are the kangaroos the dogs ran down, welcome after nearly two weeks of salt meat.',
  ],
  viewBack: [
    'You have climbed the second ridge. Look back the way you came: the farms you left are far below.',
    'Blaxland’s party climbed this ridge on 19 May 1813. From the top they had, for the first time, “an extensive view of the settlements below”.',
    'They could see Prospect Hill to the east, Windsor and Grose Head to the north-east, and Mount Banks to the north-west. Mount Banks was as far as the botanist George Caley had got, in 1804.',
  ],
  rockWall: [
    'On 18 May the ridge was “not more than fifteen or twenty yards over, with deep precipices on each side”, and then it was blocked by a mass of rock “nearly thirty feet high, extending across the whole breadth”.',
    'There was a small broken track through the middle, and by moving a few large stones they were able to pass.',
  ],
  gullyWater: [
    'On 17 May they camped on a narrow ridge between two very deep gullies. Water had to be fetched up a precipice “about six hundred feet high”, and they “could get scarcely enough for the party”. “The horses had none this night.”',
    'Water decided where they camped. On the second night there was “just enough for the night, contained in a hole in the rock”; further on they camped at the heads of swamps.',
  ],
  highHeath: [
    'You have reached the high heath, the top of the range. The ground here is open, but past it the cliffs drop away.',
    'Blaxland’s party got here on 22 May 1813. On top they found “about two thousand acres of land clear of trees”. They worked out that it was eighteen miles from the Nepean in a straight line. They camped “by the side of a fine stream of water”.',
    'Then they tried to get down the cliffs. They followed the streams, and tried where the rock had fallen in, but they “were baffled in every instance”: every way down beat them. In places, the journal says, “the perpendicular height of the rocks above the earth below could not be less than four hundred feet.”',
  ],
  kangarooDogs: [
    'The kangaroo dog was bred in the colony in the early 1800s, mostly from greyhounds and Scottish deerhounds: a sighthound fast and strong enough to outrun a kangaroo and hold it, and tough enough to survive its claws. Kangaroo was a major food for the early settlers.',
    'The journal doesn’t say what kind of dogs the party’s five were, but it records their kills: a large kangaroo on 13 May, two small ones on 16 May, and another on 29 May. That last one was “very acceptable, as the party had lived on salt meat since they caught the last”.',
    'To the people of the mountains, five strange dogs were the first thing they met of the party: the man cutting wood on 24 May “fled at the approach of the dogs”.',
  ],
  frost: [
    'Below the western cliffs, in the journal for 30 May: during the night “the ground was covered with a thick frost, and a leg of the kangaroo was quite frozen”.',
    'When they got back on 6 June, they found that on the colony’s side “the winter had not set in”, nor had there been any frost.',
  ],
  saltMeat: [
    'Between kangaroo kills the party lived on salt meat. By 31 May “the whole party were ill with bowel complaints”; the journal doesn’t say why.',
    '“Their provisions were nearly expended, their clothes and shoes were in very bad condition”, and they decided “to return home by the track they came”.',
  ],
  wayDown: [
    'You have found a way down the cliffs. At the bottom there is fresh grass for the horses.',
    'Blaxland’s party came to the edge of the cliffs on 28 May 1813, above forest land. They got the horses down “by cutting a small trench with a hoe, which kept them from slipping”. At the bottom the horses “again tasted fresh grass for the first time since they left the forest land on the other side of the mountain”.',
    'The next morning the party went down “through a pass in the rock, about thirty feet wide”. It took them from seven o’clock until nine. In places “the party were obliged to carry the packages themselves”. They had come down from what is now called Mount York.',
  ],
  sugarloaf: [
    'You have reached the sugarloaf hill, the end of the way out. Now bring everyone home.',
    'Blaxland’s party came here on 31 May 1813, eight miles past the cliffs. They saw “a high hill, in the shape of a sugar-loaf”, and that afternoon they “ascended its summit”.',
    'All round lay forest and grass. They thought there was enough “to support the stock of the colony for the next thirty years”. Stock means farm animals: sheep and cattle.',
    '“This was the extreme point of their journey.” The next morning they turned for home.',
  ],
  after1813: [
    'In November 1813 Governor Macquarie sent the surveyor George Evans after the party. He passed their sugarloaf hill, now Mount Blaxland, and went on to the plains where Bathurst stands.',
    'In July 1814 William Cox began a road over the mountains along the party’s line. Thirty convicts and eight guards finished it in January 1815, and a Darug man, Colebee, went with the road party as an adviser. Each of the three leaders was granted 1,000 acres beyond the range, on Aboriginal land that was never ceded.',
    'In April 1816 soldiers under Macquarie’s orders killed at least fourteen Dharawal people at Appin, south of the Nepean farms.',
    'West of the range, land grants were slow at first. In the early 1820s the colony granted Wiradjuri land to settlers in a rush, and in 1824 the Wiradjuri, led by Windradyne, fought the colony in what became known as the Bathurst War. Under martial law, from August to December, settlers and soldiers killed many Wiradjuri people: by recent estimates, a quarter to a third of those living round Bathurst. On 28 December Windradyne walked into the Governor’s feast at Parramatta wearing a hat labelled “Peace”.',
  ],
};

/** Where each card's facts come from, shown under the card. */
export const CARD_SOURCES: Record<string, string> = {
  whoseCountry: 'Sources: Wikipedia, “Blue Mountains (New South Wales)”, “1813 crossing of the Blue Mountains”, “Wiradjuri” and “Bathurst War”; State Library of NSW, “Finding the way west”. A draft, to be reviewed by Darug, Gundungurra and Wiradjuri organisations before release.',
  ridgeMethod: 'Sources: Blaxland’s journal, 13, 14 and 31 May 1813; State Library of NSW, “Finding the way west” and “Crossing the Blue Mountains”; Wikipedia, “Francis Barrallier”.',
  distanceByClock: 'Sources: Blaxland’s journal, 11 and 31 May 1813; State Library of NSW, “Finding the way west”.',
  cairn: 'Sources: Blaxland’s journal, 19 May 1813, with Ernest Scott’s note in Australian Discovery; Penrith City Library, Caley’s Repulse; the Cox’s Road heritage listing at Linden.',
  'signs-huts': 'Sources: Blaxland’s journal, 13 and 31 May 1813; Wikipedia, “Blue Mountains (New South Wales)”; Nature Human Behaviour, “Ice-age life in the Blue Mountains” (Dargan Shelter), 2025.',
  'signs-smoke': 'Source: Blaxland’s journal, 26 to 28 May 1813.',
  'signs-woodcutter': 'Source: Blaxland’s journal, 24 May 1813.',
  'signs-camps': 'Source: Blaxland’s journal, 28, 29 and 31 May 1813.',
  wombats: 'Source: Blaxland’s journal, 12–29 May 1813.',
  viewBack: 'Sources: Blaxland’s journal, 19 May 1813; Greater Blue Mountains Drive, “Colonial exploration”.',
  rockWall: 'Source: Blaxland’s journal, 18 May 1813.',
  gullyWater: 'Source: Blaxland’s journal, 12–23 May 1813.',
  highHeath: 'Source: Blaxland’s journal, 22 May 1813.',
  kangarooDogs: 'Sources: Wikipedia, “Kangaroo dog”; Blaxland’s journal, 13–29 May 1813.',
  frost: 'Source: Blaxland’s journal, 30 May and 6 June 1813.',
  saltMeat: 'Source: Blaxland’s journal, 29 and 31 May 1813.',
  wayDown: 'Sources: Blaxland’s journal, 28–29 May 1813; Greater Blue Mountains Drive, “Colonial exploration”.',
  sugarloaf: 'Source: Blaxland’s journal, 31 May and 1 June 1813.',
  after1813: 'Sources: Wikipedia, “1813 crossing of the Blue Mountains”, “Blue Mountains (New South Wales)”, “Colebee (Boorooberongal)”, “Bathurst War” and “Windradyne”; Museums of History NSW, “Massacre at Appin, 17 April 1816”.',
};
