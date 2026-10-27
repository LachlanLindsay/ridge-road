# Ridge Road — Game Spec

2026-10-21 · Lachlan Lindsay

> Transcribed from the Claude Docs spec "Ridge Road — Game Spec" (https://claude.ai/artifact/8K7T1P7TckZwLScTNdPohm, rev 22) for milestone M0. Diagrams and the chart are rendered there; their content is given here as text and data.

## Summary

Ridge Road (working title) is a 2D, tap-driven expedition sim. You lead the 1813 party up the ridges west of Sydney, cut a path for four pack horses, and bring everyone home before the food runs out. A run takes 30–45 minutes. It is an original, clean-room design built on the public-domain 1813 journals, not a port of *Crossing the Mountains*.

Design pillars:

- **Ridges, not valleys.** The map is a branching ridge network where most branches end at cliffs. Finding the one that runs through is the game.
- **Scout, cut, advance.** Horses move only on cleared path, so each half-day you split seven men between marking ahead, cutting and minding camp. That is the method that worked in 1813.
- **Distance is time.** Every mile walked to and from the work front is time not spent cutting, so moving camp forward is the constant trade-off.
- **Thin margins, no deaths.** Flour, salt meat, water, horse feed, boots and morale run down together. Running short forces you home, the way several earlier attempts, two of them Blaxland's, were turned back.

v1 scope: one hand-authored map on the real route, randomised decoy ridges, weather and events, three difficulty levels, save and resume. It runs as an installable web app in Safari on iPhone and in desktop browsers. Procedural maps and other expeditions wait for v2.

## Provenance and clean-room rules

Nothing in this spec comes from the original game's code, art, text, manual or screens. The only facts used about *Crossing the Mountains* are its catalogue description and genre, which are ideas, not expression.

| Source | What it gave | Used for |
| --- | --- | --- |
| [WorldCat record, 1993 edition](https://search.worldcat.org/title/crossing-the-mountains-an-exploration-simulation/oclc/221481062) (seen via search; the page blocks automated access) | A simulation loosely based on Blaxland's crossing; shipped with a handbook, teacher's guide and worksheets | Subject and genre only |
| [Jacaranda Software, Wikipedia](https://en.wikipedia.org/wiki/Jacaranda_Software) | 1989 Apple II and BBC versions; Greygum bought the rights; Greygum reportedly closed in 2018 | Licensing context |
| Forum recollections (search snippets only) | Players grouped it with Oregon Trail-style games | Genre only |
| [Blaxland's 1823 account](https://gutenberg.net.au/ebooks02/0201001/ausdisc2-01.html); Lawson's and Wentworth's journals | Route, distances, party, hazards, daily method | All historical content (public domain) |
| SLNSW, Wikipedia, Penrith City Library (see Sources) | Facts about the party, the cairn and Aboriginal Country | Facts only, rewritten |

Rules from here:

1. Don't obtain or view the original: no disk images, screenshots, manuals or videos. If it happens anyway, record it in the repo.
2. Commit this spec to git before any code. The commit history is the provenance record.
3. All code, art, layout and writing are new. In-game quotes come only from the 1813 explorers' own words, never from modern editors' notes.
4. Don't use the name *Crossing the Mountains*. Check *Ridge Road* for conflicts before publishing.
5. Don't chase a licence. Greygum reportedly closed in 2018 when its owners retired, so the rights are hard to trace.

## Core loop

Each day the player plans two half-days, the game resolves them, and the night in camp settles the costs.

*Diagram — daily loop · 4 stages, 1 exit to the return leg.* "Each day is two planned halves, then a night in camp."

- **Dawn:** weather is rolled; dew may delay start; status of party.
- **Morning half:** optional camp move; assign seven men; resolve on Go.
- **Afternoon half:** same choices again; work front moves on; events may fire.
- **Camp:** water and feed; rations, illness; night events. Then the next day.
- Half-day rules: camp moves first and costs everyone its hours; workers walk out and back at 2.5 mph; scouts mark ridge; cutters clear it for horses.
- At the goal: **Return leg** — retrace your trail.
- Forced home at any camp if morale hits 0, food runs out, three men are too ill or every horse is down.

The 1813 rhythm is the strong line: move camp to the end of the cleared path in the morning, then send five men to mark and cut ahead in the afternoon while two mind the horses. Leaving camp behind saves the morning but makes every later half pay a longer walk; moving it too often spends hours the cutters needed. Rest days cost a day, but mend clothes and boots and let the horses graze, and give a low-morale party time to brood, as the 1813 men did on their first Sunday.

Three decisions are always the player's, never the plan sheet's:

- **The fork.** When the work toward the flag runs into a fork (the scouts stop there, or the flag is spent and the next lead starts at one), the target is left empty and a card asks which ridge to follow: each branch with Lawson's reading, and "Let Lawson choose" last. The sheet never fills the branch in.
- **Sunday.** On Saturday night the camp sheet asks whether to rest tomorrow, and says the 1813 party rested on Sunday 16 and Sunday 30 May and worked the Sunday between. The rest is ticked for the player on Easy at a camp with water for the horses, and left unticked otherwise.
- **The dew.** Waiting costs the morning's first hour; pushing through costs chill odds and wear, and the card states both with the numbers. After two answers the same way the card ticks "every misty morning" for the player and says so.

## World model

The map is a graph of ridge segments. Nodes are points on ridges; segments join them and carry a length in miles and a terrain type. The camp sits on one node, and the known world grows outward from it.

Terrain (rates are in the Tuning table):

| Terrain | Horses pass before clearing? | What it means in play |
| --- | --- | --- |
| Open forest | Yes | Foothills and forest tracts; grazing nearby |
| Heath | Yes | Treeless tops with loose stones and short coarse grass; fast scouting, long views |
| Meadow | Yes | West of the range; tall grass and streams |
| Swamp head | Yes | Wet ground with water and rushy grass; slows horses |
| Scrub | No | Light brush and crooked timber; the most common ridge cover |
| Thick brush | No | The wall of the early ridges; clearing is the bottleneck |
| Thorny scrub | No | Prickly underwood; heavy wear on clothes and boots |
| Narrow rocky ridge | No | 15–20 yards wide with drops either side; may carry a rock step |

Node features:

| Feature | Effect |
| --- | --- |
| Water | None, rock hole (men only), or swamp, stream or lagoon (men and horses) |
| Gully depth | 300–600 ft; men can fetch water from below, horses can't drink |
| Grass | None, rushy (half feed), good or tall (full feed) |
| Lookout | Reveals terrain within 2 miles in clear weather |
| Precipice | Ends a branch: the dead end |
| Rock step | Blocks horses until the stones are shifted |
| Descent pass | Hidden until the cliff line is searched; needs a trench and packs carried down |
| Cairn | An earlier explorer's turning point; morale and an info card |
| Goal | The sugarloaf hill beyond the range; ends the outbound leg |

Each segment moves through four states: unknown, revealed, marked (blazed trees) and cleared (horses can pass). Clearing is tracked in miles, so a segment can be part-cleared, and it always extends outward from the cleared end. Cutting is only possible on marked ground.

Fog of war hides everything not yet scouted. A branch shows as a dead end only when scouts reach its precipice, or from a lookout in clear weather. With Lawson on a scouting team, each new node carries a hint, right 75% of the time, about whether the ridge falls away ahead. Scouts with Lawson carry on down the one branch he reads as running on; when his readings agree, or he was not there, they stop at the fork and the player chooses.

## The 1813 map

The v1 map follows the real route: about 50 miles through the mountains and 8 beyond, in six regions taken from Blaxland's day-by-day account. The true route is fixed; decoy branches are re-rolled each run within each region's count.

| Region | Miles | Terrain on the true route | Camps: water and grass | Landmarks and obstacles | Decoys |
| --- | --- | --- | --- | --- | --- |
| 1. Foothills | 6 | Open forest 3, scrub 3 | A lagoon; a rock-hole camp with a small grass patch; a forest tract of about 2,000 acres with good grass and water | Nepean ford; an older blazed track; huts | 4 |
| 2. The brush | 8 | Thick brush 6.5, narrow rocky 1.5 | No grass for 2–3 camps; water from gullies up to 600 ft deep | A rock step across a ridge 15–20 yards wide | 2 |
| 3. Second ridge | 9 | Scrub 6, swamp heads 3 | Swamp heads with rushy grass and running water | Lookout over the settlements; the old cairn | 3 |
| 4. High heath | 5 | Scrub 3, heath 2 | A fine stream; short coarse grass | Highest ridge, 18 miles in a straight line from the Nepean; 400–500 ft cliffs block west and south-west, so the route turns north | 3 |
| 5. Northern ridge | 22 | Scrub 10, thorny 6, heath 4, swamp 2 | Swamp heads most nights; the last 6 miles dry | Smoke of fires below; wombat tracks; a precipice edge above open forest | 4 |
| 6. Descent and west | 8 | Pass and meadow 2, open forest 6 | Streams; grass 2–3 ft tall; frost | The hidden pass; the sugarloaf hill, which is the goal | 0 |

Decoys run 0.5–3 miles off the true route and end at a precipice. Region 1 and region 4 hold the cruellest ones, as they did in 1813.

The end screen's ghost line comes from the real party's daily progress:

*Chart — Blaxland's 1823 account, camp-to-camp miles per day · 11–31 May 1813 · May 13 and 19 estimated.* "1813 pace: 21 days to the goal, five of them with no camp move." Reference line: Blaxland reckoning, 58 mi.

| Date | Camp moved (mi) | Day | Estimated |
| --- | --- | --- | --- |
| 1813-05-11 | 2 | move | |
| 1813-05-12 | 3.25 | move | |
| 1813-05-13 | 2 | move | yes |
| 1813-05-14 | 0 | cut | |
| 1813-05-15 | 0 | cut | |
| 1813-05-16 | 0 | rest | |
| 1813-05-17 | 6.5 | move | |
| 1813-05-18 | 0 | cut | |
| 1813-05-19 | 2 | move | yes |
| 1813-05-20 | 5 | move | |
| 1813-05-21 | 4 | move | |
| 1813-05-22 | 4.5 | move | |
| 1813-05-23 | 3.5 | move | |
| 1813-05-24 | 4.5 | move | |
| 1813-05-25 | 3.5 | move | |
| 1813-05-26 | 2.75 | move | |
| 1813-05-27 | 5.25 | move | |
| 1813-05-28 | 5.75 | move | |
| 1813-05-29 | 2.5 | move | |
| 1813-05-30 | 0 | rest | |
| 1813-05-31 | 6 | move | |

The daily figures sum to more than Blaxland's own reckoning of the whole route, so plot the ghost line as share of route covered, not raw miles. The flat stretches are the point: the camp stood still while the men cut ahead or rested.

## Party, horses and dogs

The party is fixed: seven men, four pack horses and five dogs, as in 1813. Nobody dies. Illness takes men off work, and a collapsed horse stays at a camp and may rejoin on the way home.

| Member | Role | Trait (invented for play) |
| --- | --- | --- |
| Gregory Blaxland | Leader | Grazier: horses lose 25% less condition on nights he is assigned to camp |
| William Lawson | Leader | Surveyor: dead-end hints when scouting; lookouts reveal one more segment |
| William Charles Wentworth | Leader | Young: cuts 15% faster and recovers 5 more stamina a night |
| James Burne | Servant, guide | Hunter: doubles a hunter's odds |
| Samuel Fairs | Convict servant | None |
| Servant 3 | Convict servant | Unidentified in the records; the player names him |
| Servant 4 | Convict servant | Unidentified in the records; the player names him |

Men:

- Each scouting team needs a leader, because only leaders mark the trail.
- Leave at least one man minding camp. Unattended, each horse has a 15% chance per half-day to stray, costing 2 hours to recover.
- Each man has stamina (0–100) and at most one condition: chill, bowel complaint, footsore or too ill.

Horses:

- Each carries up to 160 lb without penalty, and up to 200 lb overloaded with a fall risk.
- Condition runs 0–100. Below 50 a horse is weak and carries 25% less; below 25 it is exhausted and carries nothing; at 0 it collapses and is left at camp.
- They need water and feed every night, and never drink from gullies.

Dogs hunt on their own each day and eat 0.5 lb of meat each a day unless they made a kill. They bark at night, which costs the camp a little rest on alarm nights.

## Supplies and outfitting

The four horses carry 640 lb without penalty. The Historical loadout fills 538 lb, leaving about 100 lb for cut grass: under two nights' fodder for all four horses. That squeeze between food and fodder is the outfitting decision.

| Item | Default | Weight (lb) | Use |
| --- | --- | --- | --- |
| Flour | 220 lb | 220 | Ration: 1 lb per man per day |
| Salt meat | 180 lb | 180 | Ration: 1 lb per man per day; feeds the dogs |
| Tea and sugar | 20 lb | 20 | Issue 1 lb in the evening for a morale lift |
| Powder and shot | 60 shots | 10 | One shot per hunting attempt |
| Felling axes | 3 | 18 | Full-rate cutting tool |
| Hatchets | 2 | 6 | Cutting tool at 75% rate |
| Hoe | 1 | 5 | Cuts the trench that gets horses down the descent |
| Blankets | 7 | 35 | Prevent the frost penalty |
| Spare shoes | 7 pairs | 14 | Each pair cures one footsore man and takes 10 off party wear |
| Camp kit | 1 | 30 | Kettles, rope, tinderbox; required |
| Cut grass | 0 | 15 per horse-night | Feeds one horse for one night |

Rations are set each evening: full (1 lb flour and 1 lb meat per man), reduced (two-thirds) or short (half). Fresh kangaroo is eaten before salt meat and spoils after 3 days, or 5 in frost.

At full rations the party eats 16.5 lb a day: 14 lb for the men and 2.5 lb of meat for the dogs. The 400 lb of food lasts 24 days on its own, and hunting usually adds 60–100 lb. The 1813 trip took 27 days, so a well-run expedition gets home with almost nothing left, as the real one did.

The outfitting screen packs items across the horses automatically, heaviest first, and warns above 160 lb a horse. At any camp the player can cache items and collect them on the way back.

The outfitting screen also sets the party. The three leaders always go; the player picks 0 to 6 servants (Burne first, then Fairs, then unnamed convict servants), 2 to 6 pack horses and 0 to 8 dogs, defaulting to the 1813 party. Each extra man and dog eats; each extra horse carries 160 lb more but needs feed every night; a bigger pack of dogs raises the daily chance of a kill (five dogs give the tuned odds). There are no wagons: nothing on wheels could climb the ridges until Cox's road of 1814–15, and the screen says so. Limits live in `tuning.json` under `party`.

## Tuning table

Every number the engine uses lives in one file, `tuning.json`, mirrored here. With these defaults the 1813 method reaches the goal in about 22 days, and a player who trusts the plan sheet on Easy in about 21, the same as the real party. The sim calibration behind the numbers is in `CALIBRATION.md`; the hand check at the end of this section is where they started.

**Time.** Work runs 09:00–17:00 in two 4-hour halves; heavy dew starts the morning at 10:00. A camp move comes first and costs everyone miles ÷ horse speed. Workers walk to the work front and back at 2.5 mph, and the walk back covers whatever they cleared.

| Terrain | Scouting (mph) | Clearing (mi per worker-hour) | Horses on passable ground (mph) | Wear per hour |
| --- | --- | --- | --- | --- |
| Open forest | 1.5 | — | 2.0 | 0.2 |
| Heath | 2.0 | — | 2.0 | 0.2 |
| Meadow | 2.0 | — | 2.0 | 0.2 |
| Swamp head | 1.0 | — | 1.5 | 0.2 |
| Scrub | 1.45 | 0.39 | 2.0 | 0.5 |
| Thick brush | 0.82 | 0.13 | 2.0 | 0.5 |
| Thorny scrub | 0.82 | 0.20 | 2.0 | 1.0 |
| Narrow rocky ridge | 0.82 | 0.16 | 1.5 | 0.5 |

Miles cleared in a half-day:

```latex
p = \frac{k\,(4 - h_{move} - h_{dew} - 2m/2.5)}{1 + k/2.5}, \qquad k = \sum_{cutters} r \cdot e \cdot t
```

Here m is miles from camp to the work front at the start of the half, r the clearing rate, e = (0.5 + stamina ÷ 200) × the wear factor (1 − 1% for each point of wear over 50), and t the tool factor (axe 1.0, hatchet 0.75, none 0.3; Wentworth ×1.15). Scouting covers speed × mean e × (1 + 0.1 per extra member, up to 3), ×0.6 in cloud and ×0.8 in rain, after the same walk out. A party may advance into scouted passable ground at scouting speed.

| Activity | Stamina per hour |
| --- | --- |
| Walking or moving camp | −3 |
| Scouting | −5 |
| Cutting | −7 |
| Fetching water from a gully | −9 |
| Carrying packs on a descent | −10 |
| Hunting | −4 |
| Minding camp | −1 |
| Resting | +3 |

Overnight recovery is +40 on full rations, +30 reduced, +20 short and +5 with no food. It drops by 10 without water and by 8 in frost without a blanket, and halves for a sick man.

| Horse condition, per night | Change |
| --- | --- |
| Good or tall grass, with water | +8 |
| Rushy grass (15 lb of cut grass per horse counts as good grass) | −2 |
| No feed | −10 |
| No water | −6 more |
| Overloaded (over 160 lb) | −3 |
| Moved more than 6 miles today | −3 |
| A rest day, with water | +4 more |

A loaded move risks a fall: 2%, plus 1% per 10 lb over 160, plus (50 − condition) ÷ 2 % when condition is under 50. A fall costs an hour, and 1 in 10 also costs 20 condition. These horse numbers reproduce the journal: horses weak but upright by the descent.

| Morale cause (party, 0–100, starts at 70) | Change |
| --- | --- |
| Each day | −1 |
| Reduced, short or no rations | −3, −6, −12 |
| No water at camp | −6 |
| Fresh meat eaten | +4 |
| Tea and sugar issued | +3 |
| New westward ground | +1 per mile, up to +4 a day |
| Reaching a lookout | +5 |
| First sight of grassland beyond | +15, once |
| Dead end found | −6 |
| A man falls ill | −2 |
| Rest day | +4 if morale is 45 or more, else −4 |
| Night alarm | −2 |

A rest day is any day the camp stays and nobody scouts or cuts. Its night mends clothes and boots (wear −8) and, where there is water for the horses, adds +4 to each horse's night.

**Wear** (0–100) is the party's clothes and boots. Each working party adds the terrain's wear per hour in the field (the Terrain table), and pushing through dew adds 3. Past 50 each point slows scouting and cutting by 1% (wear 70: 20% slower); past 60 chills come more often; past 70 men who work rough ground go footsore. A day of rest takes 8 off, and each pair of spare shoes 10.

Below 40 the servants work at 90%. Below 25 the Refusal event fires, and at 0 the party turns home.

| Condition | Nightly chance | Effect | Recovery |
| --- | --- | --- | --- |
| Chill | 2%, +3% if wear over 60, +4% if stamina under 30, +3% if he worked in cloud or rain, +5% in frost without a blanket, +7% if he worked on a morning the party pushed through dew | Efficiency ×0.7, recovery halved; 15% a night to become too ill if he works | 30% a night if rested |
| Bowel complaint | From day 14: 3%, +4% if no fresh meat in 4 days, +4% if camp water is a rock hole or swamp | Efficiency ×0.8 | 20% a night |
| Footsore | 5% when party wear is over 70 and he worked in thorny or rocky ground | Walking and scouting ×0.85 | Spare shoes |
| Too ill | Comes only from a chill | Can't work; stays at camp | 50% a night back to a chill if he lay up all day (Rest, no camp move); 25% if he minded camp or was carried along |

| Weather | Fair | Heavy dew | Cloud | Rain | Frost at night |
| --- | --- | --- | --- | --- | --- |
| Mountains | 45% | 30% | 15% | 10% | — |
| West of the range | 70% | 20% | 5% | 5% | 60% |

Cloud blanks lookouts and has a 40% chance to lift by noon. Rain slows all work to 80%.

| Hunting | Forest, grass or meadow node | Brush, heath or swamp node |
| --- | --- | --- |
| Dogs, automatically each day | 25% | 8% |
| A man hunting for a half-day (one shot) | 35% | 10% |

A catch is a small kangaroo (10 lb, 60%) or a large one (30 lb, 40%). Burne doubles a hunter's odds, and 5% of hunts trigger the stray-hunter event.

| Obstacle | Cost |
| --- | --- |
| Rock step | 6 worker-hours to shift the stones |
| Finding the descent pass | 3 scout-hours searching the cliff line |
| Trench for the horses | 6 worker-hours with the hoe, 16 without |
| Going down | Horses unloaded; 2 hours for the whole party carrying packs |
| Coming back up on the return | 3 hours carrying packs |
| Water from a gully | Depth ÷ 300 hours per carrier; 2 carriers water the men and dogs, never the horses |

Calibration, five men cutting at mean efficiency 0.85, camp moved to the end of the cleared path each morning:

| Route terrain | Miles | Pace (mi/day) | Days |
| --- | --- | --- | --- |
| Scrub | 22 | 4.75 | 4.6 |
| Thick brush | 6.5 | 2.46 | 2.6 |
| Thorny scrub | 6 | 3.24 | 1.9 |
| Narrow rocky ridge | 1.5 | 2.64 | 0.6 |
| Open ground (forest, heath, meadow, swamp) | 22 | 6.8–12 | 2.3 |
| Overheads: dead ends 2.5, weather 1.75, rest 2.5, obstacles 1.25, illness 1.0 | — | — | 9.0 |
| Total | 58 | — | 21 |

This is a hand check; the sim harness in milestone M1 replaces it.

| Difficulty | Easy | Historical | Hard |
| --- | --- | --- | --- |
| False ridges per region | as Historical | as the map | one more |
| Lawson's readings right | 85% | 75% | 65% |
| Clearing | ×1.0 | ×1.0 | ×0.9 |
| Morale at the start | 75 | 70 | 65 |
| Event odds | ×0.75 | ×1 | ×1.25 |
| Sunday rest ticked on the camp sheet | yes, at a camp with water for the horses | no | no |

## Events

Events are short cards with two or three choices, effects shown before the player picks. All text is written fresh; the 1813 journals supply situations, not wording.

| Event | Trigger | Choices and effects |
| --- | --- | --- |
| Heavy dew | 30% of mountain mornings | Wait: start at 10:00 · Push through: start at 09:00, wear +3, chill odds +7% tonight for each man who works. The card gives the night's odds both ways. After two answers the same way it ticks "every misty morning" for the player |
| A fork | The work toward the flag runs into two or more unexplored ridges | One button per ridge, lettered as on the card's sketch, with Lawson's reading · Let Lawson choose: the one he reads as running on, otherwise his guess. The flag moves to the chosen ridge |
| Cloud lifts | Cloudy morning, 40% by noon | At a lookout: full reveal; elsewhere morale +2 |
| Horse falls under its load | Fall roll on a loaded move | Reload: −1 hour · Lighten: cache 20 lb here, −1 hour, no second fall today |
| Horse exhausted | Condition below 25 | Spread its load, which may overload others · Cache goods at camp · Rest a day here |
| Dry camp | Evening at a node without water | Send 2 men down the gully: their recovery −10 · Go dry: no-water penalties for all |
| Dead end | Scouts reach a precipice | Marked on the map; morale −6; any Lawson hint on that branch shows as right or wrong |
| A man takes a chill | Nightly roll | Keep him at camp tomorrow · Let him work, with a 15% chance a night he becomes too ill |
| Bowel complaint | Nightly roll from day 14 | Rest a day · Send a hunter for fresh meat · Push on |
| Dogs bring down a kangaroo | Daily roll | 10 or 30 lb of fresh meat; morale +4 when eaten |
| Hunter strays | 5% of hunts | Search: 2 men lose the next half · Wait: he's back next morning 70% of the time, else the day after |
| Dingoes howl | 12% of mountain nights | Morale −2; recovery −5 for all |
| Dogs race off in the dark | 6% of mountain nights after day 8 | Double the watch: 2 men's recovery −10 · Let them settle: morale −3. The card says the 1813 party only assumed someone was out there |
| Signs of Country | Authored nodes drawn from the journals | Info card added to the journal; no mechanical effect |
| The men brood | Rest day with morale under 45 | Tea and an extra ration: morale +8, costs a day's food · Leaders take the worst cutting tomorrow: morale +6, leaders' stamina −10 · Let it pass: morale −4 |
| Refusal | Morale under 25 | Extra ration and tea: morale +12, costs 2 days' food · Rest a day: morale +6 · Turn back |
| Frost | 60% of nights west of the range | Fresh meat keeps 5 days; men without blankets lose 8 recovery |
| A view at last | First lookout showing grassland beyond | Morale +15, once |
| The old cairn | Authored node in region 3 | Morale +5; info card on who built it |

Only one choice event fires per half-day; extra triggers queue to the evening. Weather and kill events are results, not choices, and show as log lines.

## Win, loss and scoring

You win by reaching the sugarloaf hill beyond the range and getting the whole party back across the Nepean. Turning back short of the goal is the loss, as it was for Blaxland twice before 1813.

| Outcome | Condition |
| --- | --- |
| Crossed and returned | Reached the goal, then back at the ford |
| Repulsed | Turned back before the goal, by choice or forced |

The party is forced home when morale hits 0, food is gone with no catch for 2 days, three men are too ill at once, or all four horses are exhausted or collapsed.

The return leg starts when the player chooses "Head home" at the goal. The party retraces its trail at horse speed. Stretches it crossed without marking go at 1 mph, with a 25% chance per mile of losing an hour. A horse left at a camp rejoins half the time. A fully marked trail should bring the party home in a third of the outbound days or less; the 1813 party took six.

| Score component | Points |
| --- | --- |
| Reaching the goal and returning | 1,000 |
| Days to the goal vs 21 | +20 per day under, −20 per day over |
| Horses home | +50 each |
| All seven men well at the ford | +100 |
| Route marked and cleared end to end | Up to +300, by share of the route |
| Food left at the ford | +5 per 10 lb |

Titles: Trailblazer at 1,600 or more, Explorer at 1,250, Crossed below that. A Repulsed run shows its furthest straight-line miles from the Nepean instead of a score. The end screen draws the 1813 party's pace as a ghost line against the player's.

## Screens and interaction

Everything is a tap or a click: no keyboard, no real-time action. The layout is designed for a portrait phone first; desktop gets the same screens with a wider map.

| Screen | What the player does |
| --- | --- |
| Title | Start a new expedition (difficulty, optional seed) or continue |
| Briefing | Three cards: whose Country the mountains are, 1813 context, the party. Back, Next and Skip; the dots jump between cards; the menu has it again during play |
| Outfitting | Steppers per item; auto-packed load bars per horse; warnings over 160 lb. The party's plate draws each horse's pack from its load: the panniers swell, the blankets, tools and camp kettle ride on top, and a horse over 160 lb hangs its head |
| Party cards | A card for each man, each horse and the dogs: his trait in play with the numbers for the mode, how he is now, and what the record says of 1813, with sources. Hover with a mouse or press and hold a roster chip; tap anyone in Party and stores or in the party's plate |
| Expedition | The main screen, below |
| Event card | Short text, two or three choices with their effects shown |
| Camp | Evening summary: food eaten, water, horse condition, who is ill; set tomorrow's rations, issue tea, call a rest day, cache items. On Saturday night the rest is the Sunday question, with the 1813 Sundays |
| Lookout | A layered 2D panorama; newly revealed terrain lights up on the map |
| Journal | One auto-written line per day plus the player's notes, with the 1813 entry for the same date beside it |
| End | Outcome, score breakdown, ghost-line chart, history panel |

The main screen, top to bottom:

- **Top bar:** date (from 11 May 1813), day number, weather, morale.
- **Map, about 55% of the height:** pinch and pan; fog of war; marked trail dashed, cleared path solid, dead ends crossed out.
- **Plan sheet:** Morning and Afternoon tabs. "Move camp to…" means tapping a node on the cleared path, which shows the hours it costs. Seven roster chips cycle Scout, Cut, Camp, Water, Hunt, Grass and Rest on each tap. Scout and Cut work toward the target selected on the map.
- **Go:** resolves the half. The trail grows on the map, two or three log lines appear, and any event card follows.

The plan sheet warns before Go, for example "Nobody minding camp: horses may stray" or "Work front is 3.1 miles away: 2.5 hours of walking".

Tap targets are at least 44 px, trail states differ by dash as well as colour, and text follows the system size. The art is original flat 2D: an ink-line contour map on paper tones and simple silhouettes for lookouts.

## History and Country content

The game presents 1813 as the first recorded European crossing, not the first crossing. The Blue Mountains are Darug and Gundungurra Country, the plains beyond are Wiradjuri Country, and local Aboriginal people knew routes over the range, including Bilpin Ridge and the Coxs River.

Rules:

- Aboriginal people appear only as the presence the 1813 journals record: huts, the smoke of fires, a man cutting wood who moved off when the dogs came near, the remains of camps. Each is an info card, never an enemy, obstacle or resource, and never a collectable: the Signs of Country are counted apart from the cards found, the journal records them as "Signs of people", not "Found", and no camp takes a sign's card title as its name (a camp may say what was seen near it, as "Swamp by the woodcutter" does, but is not called "A man cutting wood").
- The game's own voice never says "natives"; the word appears only inside the journal's quotation marks, attributed. Unwalked ground is unknown to the party, never to "nobody".
- There is no combat. Firearms are for hunting only.
- The party's night-time fear of being watched is shown as their assumption, not as fact.
- Animals and plants are named as the journals name them, with a modern note where it helps.
- Before publishing, have the Country content reviewed by Darug, Gundungurra and Wiradjuri organisations: the route crosses Darug and Gundungurra Country and the After 1813 card is Wiradjuri history. Reserve a card for text they author, credited to them, with their consent recorded in PROVENANCE.md; pay for the consultation. The project doc `country-review.md` rehearses the review and lists what to send.

| Info card | Unlocked by | What it covers (written fresh) |
| --- | --- | --- |
| Whose Country | Briefing | Darug, Gundungurra and Wiradjuri peoples; the routes they already used; the Nepean as a frontier; the party went without guides |
| The ridge method | First evening | Why ridges, not valleys; earlier attempts that failed |
| Distance by the clock | First evening | The party estimated miles from time walked, at about 2 mph |
| The old cairn | Reaching the cairn | The party credited it to Bass; it was later named Caley's Repulse, though Caley was reportedly never there |
| Signs of Country | Each sign the journals record | What the party saw, and what it shows about the people already living there |
| The view back | Reaching the lookout over the settlements | 19 May: the colony seen from the second ridge; Caley's farthest point in 1804 |
| The rock wall | Reaching the rock step | 18 May: the narrow ridge and the wall of rock they got past by moving stones |
| Water up the cliff | First water carried up from a gully | 17 May: water fetched up a precipice, none for the horses; camps chosen for water |
| The high heath | Reaching the high heath | 22 May: the clear heath on the third ridge, and the cliffs that beat every attempt down |
| Kangaroo dogs | The dogs' first kill | The colony's kangaroo dogs; the party's dogs and their kills |
| Frost | The first frost | 30 May: the frozen kangaroo leg; no frost on the colony's side when they got home |
| Salt meat | The first bowel complaint | Salt meat between kills; the illness, worn clothes and empty stores that turned them home |
| The way down | Reaching the foot of the pass | 28–29 May: the hoe trench, the 30-foot pass, the men carrying the packs; Mount York |
| The sugarloaf hill | Reaching the sugarloaf hill | 31 May: the hill, the grass land "for the next thirty years", the extreme point of the journey |
| After 1813 | End screen | Evans, sent in November 1813, pushed on to the Bathurst plains; Cox's convict gang built a road in 1814–15 with a Darug adviser, Colebee; each leader got 1,000 acres of unceded land; Appin, April 1816; the 1820s grants of Wiradjuri land, the Bathurst War and martial law, Windradyne's peace |

The end panel states the consequences plainly, alongside the achievement.

## Tech architecture

Build it in TypeScript with Vite, Preact and SVG, and put every rule in a pure, deterministic engine. The game is turn-based and menu-heavy, so DOM and SVG beat a canvas engine like Phaser, and a static installable web app covers iPhone and Mac with no app store.

*Diagram — architecture · 5 parts, all rules in the engine.* "All rules live in one pure engine; screens, saves and the sim only call it."

- **UI:** Preact screens; SVG map, fog of war; touch-first layout. Sends actions to the engine and gets new state back.
- **Engine:** pure TypeScript; resolveHalfDay, endDay; seeded RNG in state.
- **Data files:** map.json, events.json, tuning.json, journal-1813.json; loaded once by the engine.
- **Save:** localStorage JSON; export and import. The UI saves and resumes through it.
- **Sim harness and tests:** Node CLI, three bots; 1,000-seed runs; Vitest suite. Calls the same API as the UI, with no UI.

The whole game state is one serialisable object that carries its own RNG state (mulberry32), so any run replays exactly from its seed and action log. A save is that JSON in localStorage, read and written inside try/catch, with export and import as a file.

```ts
type Mode = 'easy' | 'historical' | 'hard';
newGame(opts: { seed: number; mode: Mode }): GameState
validatePlan(state: GameState, plan: HalfDayPlan): Warning[]
resolveHalfDay(state: GameState, plan: HalfDayPlan): { state: GameState; log: LogLine[]; event?: EventId }
chooseEvent(state: GameState, choice: ChoiceId): GameState
endDay(state: GameState, orders: EveningOrders): { state: GameState; journal: JournalLine }
```

```ts
interface MapNode {
  id: string; x: number; y: number; region: 1 | 2 | 3 | 4 | 5 | 6;
  water: 'none' | 'rockHole' | 'swamp' | 'stream' | 'lagoon'; gullyFt?: number;
  grass: 'none' | 'rushy' | 'good' | 'tall';
  feature?: 'lookout' | 'precipice' | 'rockStep' | 'pass' | 'cairn' | 'goal' | 'ford';
}
interface Segment {
  id: string; a: string; b: string; miles: number; terrain: Terrain;
  state: 'unknown' | 'revealed' | 'marked'; clearedMiles: number;
}
```

The sim harness runs `npm run sim -- --bot historical --runs 1000` and prints median days to the goal, food left, horses home and refusals. Its three bots are historical (five blaze, two mind camp, camp advances each morning), naive (all scout, rarely cut) and cautious (rest every third day).

## Milestones and acceptance criteria

Six milestones take it from spec to an installable game; the engine and sim come before any UI so the numbers are proven first.

1. **M0, spec in git.** Done when this doc is the repo's first commit, before any code.
2. **M1, engine and sim.** Pure engine, `tuning.json`, seeded RNG, Vitest suite and a sim harness with three bots. Done when the historical bot reaches the goal in a median of 20–23 days over 1,000 seeds, the naive bot is repulsed in at least 60% of runs, and the same seed and actions always give the same end state.
3. **M2, map.** Authored 1813 map data, SVG render, fog of war, pan and zoom. Done when the true route totals 58 miles ± 2, every decoy ends at a precipice, and the route is passable with the hoe.
4. **M3, play loop.** Plan sheet, event cards, camp screen and journal. Done when a full run plays in Safari on iPhone with no keyboard.
5. **M4, outfitting, end screen and history.** Ghost line, scoring and info cards. Done when the score breakdown sums correctly and every info card is written fresh and sourced.
6. **M5, ship.** Installable web app, save and resume, export and import, static hosting. Done when it installs to the iPhone home screen, plays offline and resumes after the app is closed.

Playtest targets: a full run takes 30–45 minutes, and a first-time player reaches the goal on Easy. Later, for v2: seeded procedural maps, Evans's 1813–14 route as a second scenario, and a bearings-and-reckoning mini-game built on Lawson's surveying.

## Sources

- [Blaxland's account of the 1813 crossing](https://gutenberg.net.au/ebooks02/0201001/ausdisc2-01.html), Project Gutenberg Australia
- [1813 crossing of the Blue Mountains](https://en.wikipedia.org/wiki/1813_crossing_of_the_Blue_Mountains), Wikipedia
- [Finding the way west](https://www.sl.nsw.gov.au/stories/finding-way-west), State Library of NSW
- [Blue Mountains (New South Wales)](https://en.wikipedia.org/wiki/Blue_Mountains_(New_South_Wales)), Wikipedia
- [Caley's Repulse, Linden](https://penrithcity.spydus.com/cgi-bin/spydus.exe/ENQ/WPAC/ARCENQ?RNI=348320), Penrith City Library
- [Jacaranda Software](https://en.wikipedia.org/wiki/Jacaranda_Software), Wikipedia
- [Would You Be a Good Explorer?](https://digital-classroom.nma.gov.au/games/would-you-be-good-explorer), National Museum of Australia: a separate modern game on the same crossing. Treat it as prior art and borrow nothing from it.
