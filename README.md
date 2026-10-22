# Ridge Road

A tap-driven expedition sim of the 1813 crossing of the Blue Mountains: lead seven men, four pack horses and five dogs up the ridges west of Sydney, cut a path for the horses, and bring everyone home before the food runs out. The design is in [SPEC.md](SPEC.md); it was committed before any code, and [PROVENANCE.md](PROVENANCE.md) keeps the clean-room log.

## Status

| Milestone | State |
| --- | --- |
| M0, spec in git | Done: first commit |
| M1, engine and sim | Done: all three acceptance checks pass over 1,000 seeds. See [CALIBRATION.md](CALIBRATION.md) |
| M2, map render | Next. The authored 1813 map data already exists in `data/map.json` |
| M3 to M5 | Not started |

## Run it

Needs Node 20 or later.

```sh
npm install
npm test                                      # Vitest suite
npm run typecheck
npm run sim -- --bot historical --runs 1000   # or naive, cautious, all
npm run sim -- --bot historical --runs 1 --seed 3 --trace   # one run, half by half
```

`npm run sim -- --bot all` ends with the M1 acceptance checks. `--mode easy|hard` and `--json` are also available.

## Layout

```
SPEC.md                 the game spec (M0)
CALIBRATION.md          what the sim found, what changed in tuning.json, and every rule the spec left open
data/
  tuning.json           every number the engine uses
  map.json              the true route (six regions, 58 mi) and each region's decoy rules
  events.json           event card titles, text and choice labels (placeholder copy)
  cards.json            info card titles (bodies are M4)
  journal-1813.json     the 1813 party's daily pace, for the end screen's ghost line
src/engine/             the pure, deterministic engine
  index.ts              public API
  types.ts              GameState and friends
  map.ts world.ts       map build, fog of war, Lawson's hints, lookouts, dead ends
  plan.ts               validatePlan and plan helpers
  half.ts               resolveHalfDay: camp moves, the advance, scouting, cutting, camp tasks, the way home
  night.ts day.ts       endDay: rations, horses, recovery, illness, morale; dawn and weather
  events.ts             event cards and chooseEvent
  score.ts              outcome and score
sim/                    bots and the harness (Node CLI)
test/                   Vitest suite
```

## The engine API

```ts
newGame(opts: { seed: number; mode: Mode; loadout?; names? }): GameState
validatePlan(state, plan: HalfDayPlan): Warning[]
resolveHalfDay(state, plan): { state; log: LogLine[]; event?: EventId }
chooseEvent(state, choice: ChoiceId): GameState
endDay(state, orders: EveningOrders): { state; journal: JournalLine }
eventCard(state): EventCard | null       // the waiting card, with each choice's effect
replay(opts, actions): GameState         // any run rebuilds from its seed and action log
toSave(state) / fromSave(json)
```

Every call returns a new state and never mutates its input. The state carries its own RNG (mulberry32) and its action log, so a save is just the JSON. A day is: dawn (weather, any waiting event cards), a morning plan, an afternoon plan, evening event cards, then evening orders. While `state.pending` is not empty the front card must be answered first.

A half-day plan is an optional camp move, an optional advance (the whole party pushes on with the horses into open ground), a target on the map, and a task for each man: `scout`, `cut`, `camp`, `water`, `hunt`, `grass` or `rest`. The plan sheet's warnings come from `validatePlan`.
