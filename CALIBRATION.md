# M1 calibration

What the sim harness found when it played the spec's rules, what changed, and how the engine settles each rule the spec leaves open. SPEC.md is unchanged; the numbers that moved are in `data/tuning.json`, and the spec's tuning table should be updated to match if these are accepted.

## Result

1,000 seeds per bot, `npm run sim -- --bot all --runs 1000`, mode historical:

| | Historical | Naive | Cautious |
| --- | --- | --- | --- |
| Reached the goal | 86.3% | 0% | 44.0% |
| Median day at the goal (p10–p90) | 22 (21–24) | — | 31 (28–32) |
| Days home after the goal (median) | 5 | — | 5 |
| Repulsed | 13.7%, all by spent horses | 100%: horses 84%, food 9%, illness 6%, morale 1% | 56%: horses 54%, food 2% |
| Food left at the ford (median) | 25 lb | 0 | 0 |
| Horses home (mean of 4) | 2.9 | 4.0 | 1.8 |
| Mean horse condition at the descent | 49 | — | 41 |
| Refusals per run | 0.00 | 1.03 | 0.02 |
| Dead ends found per run | 3.5 | 1.3 | 3.3 |
| Median score | 1,480 (Explorer 81%, Trailblazer 4%) | — | 1,310 |

The 1813 party reached the goal on day 21 and took six days home; the spec asks for horses "weak but upright by the descent" (condition under 50) and a well-run party "home with almost nothing left".

M1 acceptance: historical median 22 days (target 20–23) **pass**; naive repulsed in 100% of runs (target at least 60%) **pass**; the same seed and actions give the same end state, checked by replaying three full runs from their action logs and by the Vitest suite **pass**.

## What the sim found

Played as written, the spec's rules are much slower than its own hand calibration. With the tuning table exactly as in SPEC.md, the historical bot (150 seeds) reached the goal in only 71% of runs, in a median of 26 days; the other 29% ended with all four horses spent and the party forced home.

Switching overheads off one at a time showed where the time goes. With decoys, weather, illness and random events all off, the 1813 method still needed 21 days: 19 working days and two Sundays, against the hand check's 12 days of pure progress. With the new rates the same pure-progress run takes 17. The gap is structural:

- **Fewer cutters.** The hand check assumed five men cutting full time. The historical method sends Lawson ahead to mark the trail (cutting is only possible on marked ground, and only leaders mark) and keeps two men minding camp, which leaves about 3.5 effective cutters once illness and Sundays are counted.
- **Walking every half.** The hand check charged one walk back at the end of the day. The spec's formula charges the walk out and back in every half-day, which adds roughly an hour per cutter per day.
- **Camps sit on nodes.** The camp can only move to the last node before the cut front, so a typical half starts half a mile short of the work.

Slow runs then fail for a second reason: more nights in the mountains wear the horses down, and once they drop below 25 all four go together.

## What changed

**Tuning (data/tuning.json).** The smallest change that brings the historical bot inside 20–23 days with most runs succeeding:

| Terrain | Clearing, spec → now (mi per worker-hour) | Scouting, spec → now (mph) |
| --- | --- | --- |
| Scrub | 0.30 → 0.48 | 1.25 → 1.75 |
| Thick brush | 0.10 → 0.16 | 0.75 → 1.0 |
| Thorny scrub | 0.15 → 0.24 | 0.75 → 1.0 |
| Narrow rocky ridge | 0.12 → 0.19 | 0.75 → 1.0 |

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
| Scouts reaching the end of their target | They carry on along a single unexplored branch. At a fork they follow Lawson's "runs on" hint if he is with them and exactly one branch has it; otherwise they stop and report |
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
| Rest day | Any outbound day with no camp move, no scouting and no cutting |
| A missing hunter | Away for a number of time slots (three a day). Waiting brings him back next morning 70% of the time, otherwise the morning after. Searching costs two men the next half and brings him back with them |
| The way home | Each half travels along the trail automatically unless the plan halts. Horses left at a camp rejoin half the time when the party passes; caches are collected on the way |
| Starting values | Stamina 100, horse condition 100 |
| Gaps filled with a number | Grass cutting rate, grass stamina cost (−4/h), advance stamina (leaders −5/h, others −3/h), horse rejoin condition (30), the stray delay cap. Listed under `_specGaps` in tuning.json |
| Difficulty | Proposed, not in the spec: easy has one fewer decoy per region, hints right 85%, clearing ×1.1, morale 75, event odds ×0.75; hard is the mirror (one more decoy, 65%, ×0.9, morale 65, ×1.25) |

## Re-running

```sh
npm run sim -- --bot all --runs 1000          # about ten minutes
npm run sim -- --bot historical --runs 200    # a quick check while tuning
```
