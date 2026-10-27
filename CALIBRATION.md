# M1 calibration

What the sim harness found when it played the spec's rules, what changed, and how the engine settles each rule the spec leaves open. SPEC.md is unchanged; the numbers that moved are in `data/tuning.json`, and the spec's tuning table should be updated to match if these are accepted.

## Result

1,000 seeds per bot, `npm run sim -- --bot all --runs 1000`, mode historical, on the 27 October 2026 rules (the three decisions, below). Defaults is a player who trusts the plan sheet (`sim/defaults.ts`).

| | Historical | Naive | Cautious | Defaults |
| --- | --- | --- | --- | --- |
| Reached the goal | 86.7% | 0% | 71.6% | 92.2% |
| Median day at the goal (p10–p90) | 22 (21–24) | — | 29 (28–32) | 21 (19–23) |
| Days home after the goal (median) | 5 | — | 5 | 5 |
| Repulsed | 13.3%, all by spent horses | 100%: horses 88.6%, food 10.8%, morale 0.6% | 28.4%: horses 27.3%, food 1.1% | 7.8%: horses 7.7%, food 0.1% |
| Food left at the ford (median) | 50 lb | — | 28 lb | 61 lb |
| Horses home (mean of 4) | 2.9 | 4.0 | 2.6 | 3.3 |
| Mean horse condition at the descent | 44 | — | 43 | 52 |
| Refusals per run | 0.00 | 0.87 | 0.01 | 0.00 |
| Dead ends found per run | 3.6 | 1.2 | 3.4 | 3.6 |
| Median score | 1,480 (Explorer 81%, Trailblazer 5%) | — | 1,320 | 1,530 (Explorer 80%, Trailblazer 12%) |

The 1813 party reached the goal on day 21 and took six days home; the spec asks for horses "weak but upright by the descent" (condition under 50) and a well-run party "home with almost nothing left".

M1 acceptance: historical median 22 days (target 20–23) **pass**; naive repulsed in 100% of runs (target at least 60%) **pass**; the same seed and actions give the same end state, checked by replaying three full runs from their action logs and by the Vitest suite **pass**. The plan-sheet defaults on Easy reach the goal in a median of 21 days (target 20–23) **pass**.

The sections below are in the order the work happened: the first M1 calibration, then the changes after each round of play.

## What the sim found

Played as written, the spec's rules are much slower than its own hand calibration. With the tuning table exactly as in SPEC.md, the historical bot (150 seeds) reached the goal in only 71% of runs, in a median of 26 days; the other 29% ended with all four horses spent and the party forced home.

Switching overheads off one at a time showed where the time goes. With decoys, weather, illness and random events all off, the 1813 method still needed 21 days: 19 working days and two Sundays, against the hand check's 12 days of pure progress. With the new rates the same pure-progress run takes 17. The gap is structural:

- **Fewer cutters.** The hand check assumed five men cutting full time. The historical method sends Lawson ahead to mark the trail (cutting is only possible on marked ground, and only leaders mark) and keeps two men minding camp, which leaves about 3.5 effective cutters once illness and Sundays are counted.
- **Walking every half.** The hand check charged one walk back at the end of the day. The spec's formula charges the walk out and back in every half-day, which adds roughly an hour per cutter per day.
- **Camps sit on nodes.** The camp can only move to the last node before the cut front, so a typical half starts half a mile short of the work.

Slow runs then fail for a second reason: more nights in the mountains wear the horses down, and once they drop below 25 all four go together.

## What changed

**Tuning (data/tuning.json).** The smallest change that brings the historical bot inside 20–23 days with most runs succeeding:

| Terrain | Clearing, spec → M1 → 27 Oct (mi per worker-hour) | Scouting, spec → M1 → 27 Oct (mph) |
| --- | --- | --- |
| Scrub | 0.30 → 0.48 → 0.39 | 1.25 → 1.75 → 1.45 |
| Thick brush | 0.10 → 0.16 → 0.13 | 0.75 → 1.0 → 0.82 |
| Thorny scrub | 0.15 → 0.24 → 0.20 | 0.75 → 1.0 → 0.82 |
| Narrow rocky ridge | 0.12 → 0.19 → 0.16 | 0.75 → 1.0 → 0.82 |

(The 27 October column is explained under "The three decisions" below.)

Clearing is up by 60%, which restores the cutting labour the hand check assumed. Scouting in brush is up by a third because scouts also pay the walk out and back every half. Scouting on open ground is unchanged; raising it would let scouts outpace a walking man.

**Map (data/map.json).** Camps in regions 3–5 were first authored with too many dry nodes, so horses spent about ten dry nights a run instead of the four or five the spec's region notes imply ("Swamp heads most nights; the last 6 miles dry"). More of those camps are now swamp heads with rushy grass. Region 2 stays dry with gullies, the high lookouts stay dry, and the last 6 miles of region 5 stay dry.

**Rules the sim exposed, now fixed in the engine:**

- Party wear now accrues per hour each working party (scouts, cutters, the advance) spends in a terrain. Averaged over all seven men it never passed 30, so the spec's wear thresholds (chills over 60, footsore over 70) and its seven pairs of spare shoes never mattered. It now reaches the low 60s late in region 5.
- Recovery halves for a chill or too ill only. Halving it for a bowel complaint too, whose table row lists only efficiency ×0.8, compounded with the region 5 swamp water into a stamina collapse.
- Cut grass can only be cut where the grass is good or tall; rushy grass cut and fed back the same night was a free upgrade.
- Camp moves now "reach" each node they pass, so a camp moved along an old blazed track reveals what lies beyond.

**Bot fixes** (sim/bots.ts), each needed before the numbers meant anything: Lawson scouts alone unless nothing is marked ahead, and Wentworth always cuts; the camp never moves backward unless it is stranded on a dead branch; leads are explored depth first, with Lawson's hints ranking only branches at the same fork; the party never takes the horses down an unread fork; chilled men rest until they are over it; camps prefer horse water within a mile; and nothing is cached on the way home. The historical bot rests on a Sunday unless the men rested within the last ten days, which reproduces the 1813 rest days of 16 and 30 May.

## Rules the spec leaves open

How the engine settles each one. All are easy to change.

| Rule | Engine behaviour |
| --- | --- |
| "A party may advance into scouted passable ground at scouting speed" | A plan can set `advance`: after any camp move, the whole party pushes on with the horses into open ground (forest, heath, meadow, swamp) toward the target at the slower of scouting and horse speed, blazing as it goes. It stops at brush, a fork, a cliff, the pass, the goal, or the end of the half, and the camp ends at the last node reached. `blaze: false` moves at horse speed without marking: faster out, but 1 mph with lost hours on the way home and no route-score credit |
| Scouts reaching the end of their target | They carry on along a single unexplored branch. At a fork they follow Lawson's "runs on" hint if he is with them and exactly one branch has it; otherwise they stop and report, and the fork card puts the choice to the player |
| Cutters reaching the end of their target | They follow the scouts' blazes onward if the blazes lead one way |
| Lawson's hints | Given for each new branch when a party including Lawson first reaches a node. A branch "falls away" if it leads only to cliffs; the hint is right 75% of the time (85% easy, 65% hard) |
| Lookouts | Reveal every node within 2 miles in a straight line and the segments joining them; with Lawson, one segment more. Cloud blanks them. +5 morale the first time. The cliff above open forest counts as the first view of grassland (+15, once) |
| The pass | Hidden until scouts spend 3 scout-hours searching the cliff line, then a lead like any other. The trench is dug at the top before horses can use it. Going down is a flat 2 hours of carrying packs for everyone; the climb home is 3 |
| Rock step | Blocks horses beyond it until cutters reach it and spend 6 worker-hours, scaled by efficiency (no tool factor) |
| Horses straying | If nobody is at camp (camp, rest or grass), each horse has a 15% chance to stray. Each one costs 2 hours at the start of the next half for everyone, capped at 4 |
| Loads | Spread across the horses by capacity (weak horses carry 25% less). Overloaded means above the 160 lb limit; nothing moves above 200 lb a horse. A plan can cache items before moving |
| Cut grass | 15 lb per man-hour (scaled by efficiency), at good or tall grass only, up to the horses' unpenalised capacity. Fed automatically where the camp's own grass is poor or missing, unless the evening order says not to |
| Hunting ground | A camp counts as forest, grass or meadow if its grass is good or tall or an adjoining segment is open forest or meadow |
| New westward ground | +1 morale per mile the camp moves beyond its previous furthest point along the trail, up to +4 a day |
| Rest day | Any outbound day with no camp move, no scouting and no cutting. Its night takes 8 off wear and, with water for the horses, adds 4 to each horse |
| Wear | Past 50 each point slows scouting and cutting by 1%, in `workFactor` |
| A missing hunter | Away for a number of time slots (three a day). Waiting brings him back next morning 70% of the time, otherwise the morning after. Searching costs two men the next half and brings him back with them |
| The way home | Each half travels along the trail automatically unless the plan halts. Horses left at a camp rejoin half the time when the party passes; caches are collected on the way |
| Starting values | Stamina 100, horse condition 100 |
| Gaps filled with a number | Grass cutting rate, grass stamina cost (−4/h), advance stamina (leaders −5/h, others −3/h), horse rejoin condition (30), the stray delay cap. Listed under `_specGaps` in tuning.json |
| Difficulty | Proposed, not in the spec, now in its tuning table: easy has the historical decoys, hints right 85%, clearing ×1.0, morale 75, event odds ×0.75 and the Sunday rest ticked; hard has one more decoy per region, 65%, ×0.9, morale 65, ×1.25 |

## Changes after the school playtest (22 October 2026)

Played on a laptop the way a Year 5 class would, the defaults lost: a player who accepted every suggestion and took the first option on every card was repulsed at the pass with four spent horses, then walked home past a cache of flour. These engine rules changed; the sim acceptance still passes (historical median 22 days over 300 seeds, dry nights down from 2.4 to 1.3 a run, horses home up from 2.9 to 3.3).

| Rule | Was | Now |
| --- | --- | --- |
| Camp suggestion | Morning: furthest reachable node unless horse water lies within a mile short of it. Afternoon: furthest reachable | Both halves: the node that scores best on miles gained less a penalty for a poor night (`advice.campPenalty` in tuning.json: no water 1.5, rock hole 1, no grass 0.5, rushy 0.25). The button says what the camp has |
| The advance | Stopped wherever the half ran out | Will not leave a node with horse water for one without, when the party could not get beyond the dry node that half anyway (`leavesWaterForDry`). Day 1 now ends at the lagoon, not two miles on in the scrub |
| "Keep him at camp" (chill) | One day | Until the chill has gone; a man mending from too ill stays at camp too |
| Spent horse, "Cache goods here"; horse fall, "Lighten" | Cached tea, blankets, then flour | Cached grass, then food beyond a reserve for the way home (`pathHomeDays` × full rations + 2 days), then spare shoes beyond two pairs, then tea. Blankets stay |
| Collecting a cache | Only what the horses could carry, so spent horses meant none | On the way home each fit man carries 15 lb (`returnLeg.manCarryLb`), as the packs went down the pass |
| Card option order | Fixed | Bowel complaint: push on, hunt, rest. Spent horse: rest first where the camp has water and grass, otherwise spread the load first |
| "Nothing marked to cut" | Whenever nothing was marked at plan time | Only when nobody is scouting toward the target; cutters follow the scouts' blazes in the same half |
| Horse fall | "A horse fell: 2 h" when two fell, one card | Counts them; the card choices say what they do (reloading costs nothing further) |
| Homeward halts | Standing orders (scout, cut) | Rest, hunt, grass, water, camp only |

Log lines name items ("87 lb of flour", not "87 flour"); the descent and the climb home are narrated; scouts who stop at an unread fork say so; the journal line carries the day's finds, dead ends and views.

## Changes after the first outside tester (24 October 2026)

The first player outside the project crossed on day 23 with one horse of four and no food left at the ford, and could not tell which camps had grass. 28 of the 50 camps on the route are rushy, half feed, and the map drew rushy grass as a smaller copy of the good-grass mark, with only good grass in the key. These changed:

| Rule | Was | Now |
| --- | --- | --- |
| "A fine stream" (region 4) | Good grass | Rushy. Blaxland's 22 May entry gives the high ground only "short coarse grass", and on 28 May the horses "tasted fresh grass for the first time since they left the forest land". The route now has no good grass from the forest tract to the descent, as the journal has it (`test/runway.test.ts`) |
| Grass on the map | A tuft beside the point; rushy a fainter tuft | The point itself: solid green full feed, half green half feed, empty no feed, a small pencil ring for a point seen only from a lookout |
| Cut grass | A minder was put on Grass at every good-grass camp, unasked | Nobody is put on Grass unasked. At a good-grass camp, when the ground walked toward the flag (or the camp's next stop) has no feed before any good grass, the plan offers it with the 17 May 1813 line; "Stay here and cut grass" keeps the camp and takes up to two men, servants first, never Blaxland |
| Hunting | Never suggested | When food at these rations will not cover the days home plus three, at a forest or grass camp with shot left, the plan offers a hunt with the odds (Burne first). On the way home that means halting |
| Camp move | A "Move camp forward" button, pressed each half | The suggested move is filled in with the target each half and whenever the target changes; "Stay instead" undoes it |
| Runway | Food in pounds and days | Food in days against the days home along the trail; the weakest horse against tonight's camp ("spent in about 8 nights") and the cut grass in nights, on the plan and camp sheets (`engine/forecast.ts`) |
| Lightening loads on the way home | "Left here for the way home", and a cache mark | "Abandon": the goods are dropped, with no cache to collect. The camp sheet no longer offers to leave supplies on the way home or at the goal |
| Map key | A full sheet over the map; an unexplored ridge was the same dotted line as a seen one with a 4 px ring | Key opens a legend docked on the map listing only the marks in view, with the whole key a tap away; an unexplored ridge ends in an open arrow into the haze |

Historical bot, 200 seeds, before and after the stream correction: reached the goal 90.0% → 84.5%, median day 22.5 → 22.0, horses at the descent 48.7 → 45.2, all repulses by horses. M1 acceptance still passes.

A player who trusts the plan sheet (its draft each half, Go, the first live choice on every card, the camp sheet's defaults), 60 seeds each:

| | Easy | Historical |
| --- | --- | --- |
| 24 October build, pressing "Move camp forward" whenever offered | 60 crossed · goal day 17 · 3.8 horses home | 57 crossed · day 19 · 3.6 |
| This build, ignoring the offers | 57 crossed · day 17 · 2.6 horses | 39 crossed · day 19 · 2.0 |
| This build, taking the offers | 60 crossed · day 17 · 3.95 horses | 60 crossed · day 19 · 3.8 |

Grass is now a decision with a cost the sheet states. The pace is unchanged: the fork, Sunday and the dew are still made for the player, which is the open "nobody can lose" item.

## The three decisions (27 October 2026)

The second school playtest found that nobody could lose: a player who trusted the plan sheet crossed on every difficulty, one to six days ahead of 1813, because the sheet made the three real decisions for them. It picked the ridge at every fork (`chooseTarget`), the camp sheet never asked about Sunday, and pushing through the dew cost nothing that landed. The fix puts each decision to the player and retunes the pace so the defaults land beside 1813.

### The decisions

| Decision | Was | Now |
| --- | --- | --- |
| The fork | The sheet filled in the branch, depth first with Lawson's hint as a tie-break | When the work toward the flag runs into a fork (the scouts stop there, or the flag is spent and the next lead starts at one), the target stays empty and Go stays shut until the fork card is answered: a sketch of the fork with each ridge lettered and Lawson's pencil, one button per ridge with his reading and his accuracy, "Let Lawson choose" last, and "Look at the map first". The card can be put aside; the plan sheet keeps a "Which way?" prompt and a tapped ridge on the map answers it too. Scouts with Lawson still follow his one "runs on" ridge, so the card comes when his readings agree or he was not there: about 11 times a run |
| Sunday | Never asked; the Rest toggle was off | On Saturday night the camp sheet asks: "Tomorrow is Sunday. The 1813 party rested on Sunday 16 May and Sunday 30 May, and worked the Sunday between." Ticked on Easy at a camp with water for the horses; unticked otherwise, with the reason (a rest at a dry camp costs the horses). About 3 times a run |
| The dew | Push: wear +3, chill odds +3% for those who worked. Strictly better than waiting | Push: wear +3, chill odds +7%, and wear now slows the work past 50. The card gives the night's odds both ways ("a 9% chance of a chill tonight, not 2%"). After two answers the same way it ticks "Do the same every misty morning" for the player and says so. The report says what the men did, and a remembered answer can be undone from the plan sheet ("Ask me each time"). About 7 dew cards a run |

### Rules that changed

| Rule | Was | Now |
| --- | --- | --- |
| Rest day | Stamina and morale only, both of which reset or rarely bind | Also mends clothes and boots (wear −8) and, where there is water for the horses, +4 to each horse that night. The camp sheet's rest toggle says what a rest gives and costs |
| Wear | Past 60 chills, past 70 footsore | Also past 50: each point slows scouting and cutting by 1%. The plan sheet says so when it applies |
| Too ill | 25% a night back to a chill, whatever he did | 50% a night if he lay up all day (Rest, no camp move); 25% if he minded camp or was carried along |
| Brush rates | M1 values | About 18% slower (table above), because the bot now moves camp as the plan sheet does |
| Easy | One fewer false ridge per region, clearing ×1.1 | Historical false ridges and clearing; Lawson's 85%, morale 75, softer events and the Sunday rest are what make it easier. The title note says so |
| The advance | Offered with every leader ill or kept at camp, so Go stayed shut (the historical bot crashed on Easy seed 703) | Not offered without a leader fit to blaze |
| Leaving the excess | Could offer an empty cache when only tools were left, then refuse the move | Offered only when it lightens the loads enough; otherwise the sheet says the horses can't carry what is left |
| Dry camp plate | One brush tuft past the plate's edge drew an empty path, a console error on every Dry camp card | Skipped; a test checks every plate |

### The bots

- **historical** now moves camp up with the work every half, as the plan sheet does, instead of only in the morning. That afternoon move was the main reason the sheet beat the calibrated bot by two to three days; the brush rates came down to bring the bot back to 22.
- **historical** loads grass before the brush, the 1813 way: at a full-feed camp with no feed on the ground walked ahead (the forest tract), it holds the camp for a half and puts the minders and a spare servant on Grass until the horses carry what they can. In 1813 the party camped at the forest tract from 13 to 16 May and loaded the horses with grass on 17 May; the engine charges the walk to the work front every half, so holding the camp four days would stall the cutters, and the bot holds it for one half. With the afternoon moves at M1 rates, this alone took the bot from 91.5% to 97.5% reaching the goal (200 seeds).
- **defaults** (new) plays through the plan sheet's own draft: every suggestion taken (the camp move, the advance, grass and hunt offers, leaving the excess), "Let Lawson choose" at every fork, the camp sheet's own ticks (so the Sunday rest on Easy at water), and the top choice on every other card. Played by touch in the browser on Easy seed 7 it reaches the same end as the bot: goal day 24, home day 29, 22.5 lb of food at the ford.

### The defaults, before and after

1,000 seeds each; "before" is the same player on `main` (`ffc4203`).

| Plan-sheet defaults | Easy, before | Easy, now | Historical, before | Historical, now | Hard, before | Hard, now |
| --- | --- | --- | --- | --- | --- | --- |
| Reached the goal | 95.5% | 96.0% | 89.6% | 92.2% | 88.3% | 84.3% |
| Median day at the goal (p10–p90) | 17 (16–19) | 21 (19–23) | 19 (18–21) | 21 (19–23) | 22 (20–25) | 24 (21–26) |
| Horses home (mean of 4) | 3.4 | 3.6 | 3.2 | 3.3 | 3.1 | 3.0 |
| Rest days | 0 | 1.3 | 0 | 0 | 0 | 0 |
| Dead ends | 1.6 | 2.2 | 3.6 | 3.6 | 6.5 | 6.4 |
| Median score | 1,615 | 1,535 | 1,570 | 1,530 | 1,495 | 1,450 |

On Historical the defaults leave Sundays unticked, so they work through and arrive with the 1813 party on day 21, failing about one run in thirteen.

### Each decision played the other way

The defaults, with one decision always made the other way, 1,000 seeds:

| | Reached | Median day | Horses home | Illnesses | Median score |
| --- | --- | --- | --- | --- | --- |
| Easy, defaults | 96.0% | 21 | 3.56 | 7.5 | 1,535 |
| Easy, push through every dew | 95.3% | 21 | 3.84 | 9.8 | 1,540 |
| Easy, work every Sunday | 95.5% | 19 | 3.38 | 6.9 | 1,560 |
| Easy, against Lawson at every fork | 91.1% | 24 | 3.28 | 9.5 | 1,460 |
| Historical, defaults | 92.2% | 21 | 3.3 | 7.7 | 1,530 |
| Historical, push through every dew | 88.3% | 21 | 3.58 | 10.4 | 1,540 |
| Historical, rest every Sunday at water | 92.6% | 22 | 3.46 | 8.4 | 1,515 |
| Historical, against Lawson at every fork | 88.0% | 23 | 3.14 | 9.4 | 1,480 |

No answer is right every time any more. Pushing through gains the hour and keeps the camp moves longer (more horses home), and pays in chills and in wear that slows the late cutting; on Historical it fails more often. Resting on Sunday costs a day and buys a little safety in horses and wear; it is the weakest of the three, a choice about following 1813 more than an edge. Going against Lawson costs two or three days and three or four more dead ends a run.

### Saves

Saves from `main` are rebuilt by replaying their orders, and the new pace and Easy's map change most of them: of 240 saves made on `main` by the defaults player at days 1 to 30, 17 carried over, all from the first six days, and none of the 55 finished ones. The player is told and starts a new expedition, as before. A finished expedition whose orders no longer replay is now kept as it was, for its end screen and printable journal, since nothing more is played in it.

## Re-running

```sh
npm run sim -- --bot all --runs 1000                  # about five minutes
npm run sim -- --bot defaults --runs 1000 --mode easy # the plan-sheet target: median 20–23
npm run sim -- --bot historical --runs 200            # a quick check while tuning
RR_DEW=push npm run sim -- --bot defaults --runs 1000 # a decision the other way (RR_SUNDAY=rest|work, RR_FORK=against)
```
