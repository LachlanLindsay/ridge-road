# Ridge Road

A tap-driven expedition sim of the 1813 crossing of the Blue Mountains: outfit the party (Blaxland took seven men, four pack horses and five dogs), lead it up the ridges west of Sydney, cut a path for the horses, and bring everyone home before the food runs out. The design is in [SPEC.md](SPEC.md); it was committed before any code, and [PROVENANCE.md](PROVENANCE.md) keeps the clean-room log.

## Status

| Milestone | State |
| --- | --- |
| M0, spec in git | Done: first commit |
| M1, engine and sim | Done: all three acceptance checks pass over 1,000 seeds. See [CALIBRATION.md](CALIBRATION.md) |
| M2, map | Done: SVG survey plot with fog of war, pan, pinch and zoom. The route, decoy and hoe checks are in `test/map.test.ts`, the fog-of-war checks in `test/ui.test.ts` |
| M3, play loop | Built: plan sheet, event cards, camp screen, journal. Plays through at phone size with touch in a headless browser; the check on a real iPhone in Safari is still to do |
| M4, outfitting, end screen and history | Partly: outfitting (party size, provisions, auto-packed load bars per horse) and the end screen with score breakdown and ghost line are in, with engraved plates on the title, briefing and outfitting screens. Sourced info-card text is not |
| M5, ship | Partly: save and resume are in. Installable offline app, export and import are not |

## Play on your iPhone over Tailscale

On your Mac, with Node 20 or later and Tailscale running:

```sh
git clone https://github.com/LachlanLindsay/ridge-road
cd ridge-road
npm install
npm run serve
```

`npm run serve` builds the game and serves it on port 4173 on every network interface. On the iPhone, with Tailscale connected, open `http://<your-mac's-tailscale-name>:4173` in Safari. The Tailscale app shows the name; `tailscale ip -4` on the Mac gives the 100.x address, which also works. If macOS asks whether `node` may accept incoming connections, allow it.

Share → Add to Home Screen gives a full-screen game. The expedition saves on the phone after every move, so closing Safari loses nothing.

If your tailnet has HTTPS certificates turned on, `tailscale serve --bg 4173` on the Mac also serves it at `https://<mac-name>.<tailnet>.ts.net`.

For development, `npm run dev` serves on port 5173 with hot reload, also reachable over Tailscale. Add `?seed=123` to the address to replay a particular expedition.

## Run the engine and sim

```sh
npm test                                      # Vitest suite
npm run typecheck
npm run sim -- --bot historical --runs 1000   # or naive, cautious, all
npm run sim -- --bot historical --runs 1 --seed 3 --trace   # one run, half by half
npm run build:artifact                        # one self-contained page: dist/ridge-road.html
npm run replay -- report.txt --trace          # replay a tester's expedition from their feedback report
```

## Beta feedback

Menu → Send feedback (also on the title and end screens) builds a report: the tester's note, the build, the expedition's seed, mode and day, the device, and a replay code of about 1 KB holding the new-game options and every order given. Testers share or copy it into a message. `npm run replay -- <report or code>` rebuilds the exact game in Node (`--trace` prints each order and what it led to, `--until N` stops early, `--save out.json` writes a save to load into the browser). Saves are stamped with the build, and a save from an older build is rebuilt by replaying its orders, so fixes can ship mid-beta. A crash shows a screen with the same report instead of a blank page. In development, `?crash` shows that screen.

`npm run sim -- --bot all` ends with the M1 acceptance checks. `--mode easy|hard` and `--json` are also available.

## Layout

```
SPEC.md                 the game spec (M0)
CALIBRATION.md          what the sim found, what changed in tuning.json, and every rule the spec left open
data/
  tuning.json           every number the engine uses
  map.json              the true route (six regions, 58 mi) and each region's decoy rules
  events.json           event card titles, text and choice labels
  cards.json            info card titles (sourced bodies are M4)
  journal-1813.json     the 1813 party's daily pace, for the journal and the end screen's ghost line
src/engine/             the pure, deterministic engine
  index.ts              public API
  types.ts              GameState and friends
  map.ts world.ts       map build, fog of war, Lawson's hints, lookouts, dead ends
  plan.ts               validatePlan and plan helpers
  advice.ts             suggestions from what the player can see: next lead, camp move, push on
  half.ts               resolveHalfDay: camp moves, the advance, scouting, cutting, camp tasks, the way home
  night.ts day.ts       endDay: rations, horses, recovery, illness, morale; dawn and weather
  events.ts             event cards and chooseEvent
  score.ts              outcome and score
src/ui/                 the Preact app
  App.tsx               screens, save and resume
  MapView.tsx           the SVG survey plot: hachured ridges, pan, pinch, tap to select
  geometry.ts           what the map may show under fog of war (pure, tested)
  draft.ts              the plan sheet's draft: standing orders, rest days, illness, caches (pure, tested)
  Outfit.tsx            choosing the party and stores; outfitting.ts packs the horses (pure, tested)
  MapSize.tsx           the map's minimise and maximise controls and the drag handle
  Feedback.tsx Crash.tsx report.ts replaycode.ts   beta feedback, the crash screen, replay codes
  save.ts build.ts      saves stamped with the build, carried over between builds by replay
  PlanSheet.tsx CampSheet.tsx EventModal.tsx PlaceInfo.tsx Overlays.tsx EndScreen.tsx Title.tsx
  art/                  the engraved plates, drawn in code from a seed: kit.ts (ridges, hatching, cliffs,
                        sky, water, gums), figures.ts (horses, men, dogs, the procession), scenes.tsx.
                        `npm run dev` then ?gallery shows them all
  copy.ts               briefing, help and card text
sim/                    bots and the harness (Node CLI)
test/                   Vitest suite
scripts/                build-artifact.mjs
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

A half-day plan is an optional cache, an optional camp move, an optional advance (the whole party pushes on with the horses into open ground), a target on the map, and a task for each man: `scout`, `cut`, `camp`, `water`, `hunt`, `grass` or `rest`. The plan sheet's warnings come from `validatePlan`.
