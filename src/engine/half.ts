// resolveHalfDay: a camp move, an optional advance, then each man's task, in that order.
import { T, modeTuning, terrainSpec } from './data';
import {
  EPS,
  blazedContinuation,
  continuation,
  horsePassable,
  horseReach,
  huntHabitat,
  isPassable,
  openBranches,
  openMiles,
  pathSteps,
  setCleared,
  setMarked,
  stepEnd,
  stepShifted,
  stepsToTarget,
  trenchDone,
  trenchNeed,
  walkedMiles,
  type Step,
} from './map';
import { homeEntry } from './night';
import { finishGame } from './score';
import { assignments, hoursAvailable, planErrors, type Assignment } from './plan';
import {
  canCarry,
  canWork,
  capacity,
  clamp,
  currentSlot,
  efficiency,
  horseLoads,
  isAway,
  loadLb,
  MEMBER_ORDER,
  round1,
  walkFactor,
  withParty,
  workFactor,
} from './party';
import { chance } from './rng';
import { addFresh, cacheItems, collectCache } from './stores';
import { addMorale, arriveAt, findPass, queueEvent, say, unlockCard, useLookout, type Ctx } from './world';
import type { GameState, Half, HalfDayPlan, HalfResult, Member, MemberId, Segment, Task, Terrain } from './types';

type Activity = 'walk' | 'scout' | 'cut' | 'water' | 'carry' | 'hunt' | 'camp' | 'idle' | 'rest' | 'grass';
type Acct = Record<Activity, number>;

interface HalfCtx extends Ctx {
  half: Half;
  acct: Map<MemberId, Acct>;
  /** Field team-hours times terrain wear rate: each working party wears its clothes and boots. */
  wear: number;
}

const blank = (): Acct => ({ walk: 0, scout: 0, cut: 0, water: 0, carry: 0, hunt: 0, camp: 0, idle: 0, rest: 0, grass: 0 });

function log(ctx: HalfCtx, m: Member, a: Activity, hours: number) {
  if (hours <= 0) return;
  ctx.acct.get(m.id)![a] += hours;
}

function wearFor(ctx: HalfCtx, terrain: Terrain, teamHours: number) {
  ctx.wear += terrainSpec(terrain).wearPerHour * teamHours;
}

function firstName(m: Member) {
  return m.name.split(' ')[0] === 'Servant' ? m.name : m.name.split(' ').slice(-1)[0]!;
}

export function resolveHalfDay(state: GameState, plan: HalfDayPlan): HalfResult {
  const errors = planErrors(state, plan);
  if (errors.length) throw new Error(errors.map((e) => e.text).join(' '));
  const s = structuredClone(state);
  s.actions.push({ t: 'half', plan: structuredClone(plan) });
  const half = s.phase as Half;
  const day = s.day;
  const ctx: HalfCtx = { s, lines: [], events: [], half, acct: new Map(), wear: 0 };
  for (const m of s.men) ctx.acct.set(m.id, blank());

  const hours = hoursAvailable(s);
  s.delayNext = 0;
  if (plan.cache) cacheItems(s, plan.cache, ctx.lines);
  const a = assignments(s, plan);
  if (s.leg === 'home') resolveHome(ctx, plan, a, hours);
  else resolveOut(ctx, plan, a, hours);

  applyAccounts(ctx);
  const event = finishHalf(ctx);
  s.today.log.push(...ctx.lines);
  homeEntry(s);
  return { state: s, log: ctx.lines.map((text) => ({ day, half, text })), ...(event ? { event } : {}) };
}

// ---------------------------------------------------------------- outbound half

function resolveOut(ctx: HalfCtx, plan: HalfDayPlan, a: Map<MemberId, Assignment>, startHours: number) {
  const { s } = ctx;
  let H = startHours;
  const party = s.men.filter((m) => a.get(m.id) !== 'away' && a.get(m.id) !== 'busy');
  for (const m of s.men) if (a.get(m.id) === 'busy') log(ctx, m, 'walk', startHours);

  if (plan.moveTo && plan.moveTo !== s.camp) {
    const steps = horseReach(s.map, s.camp, s.stores).get(plan.moveTo)!;
    H -= moveCamp(ctx, steps, party);
  }
  if (plan.advance && plan.target) H -= advanceParty(ctx, plan.target, plan.blaze !== false, party, Math.max(0, H));
  H = Math.max(0, H);

  const team = (t: Task) => party.filter((m) => a.get(m.id) === t);
  const scouts = team('scout');
  const cutters = team('cut');
  if (scouts.length && plan.target) scoutHalf(ctx, scouts, plan.target, H);
  if (cutters.length && plan.target) cutHalf(ctx, cutters, plan.target, H);
  waterHalf(ctx, team('water'), H);
  huntHalf(ctx, team('hunt'), H);
  grassHalf(ctx, team('grass'), H);
  for (const m of team('camp')) log(ctx, m, 'camp', H);
  for (const m of team('rest')) log(ctx, m, 'rest', H);

  const wet = s.weather === 'cloud' || s.weather === 'rain';
  for (const m of party) {
    const t = a.get(m.id);
    if (t === 'scout' || t === 'cut' || t === 'water' || t === 'hunt') {
      m.worked = true;
      if (wet) m.workedWet = true;
    }
  }
  if ((scouts.length || cutters.length) && H > EPS) s.today.fieldWork = true;
  if (ctx.half === 'afternoon') s.today.blaxlandAtCamp = a.get('blaxland') === 'camp';

  const minding = party.some((m) => {
    const t = a.get(m.id);
    return t === 'camp' || t === 'rest' || t === 'grass';
  });
  if (!minding) strays(ctx);
}

/** Move camp along horse-passable steps. Everyone walks; the descent is carried. Returns hours used. */
function moveCamp(ctx: HalfCtx, steps: Step[], party: Member[]): number {
  const { s } = ctx;
  const lawson = party.some((m) => m.id === 'lawson');
  let hours = 0;
  let miles = 0;
  let loaded = false;
  for (const st of steps) {
    const seg = s.map.segments[st.seg]!;
    let h: number;
    if (seg.pass) {
      h = st.dir === 'out' ? T.obstacles.descentHours : T.obstacles.ascentHours;
      for (const m of party) log(ctx, m, 'carry', h);
      sayPass(ctx, st.dir, h);
    } else {
      h = seg.miles / terrainSpec(seg.terrain).horseMph;
      loaded = true;
      for (const m of party) log(ctx, m, 'walk', h);
    }
    hours += h;
    miles += seg.miles;
    s.camp = stepEnd(s.map, st);
    arriveAt(ctx, s.camp, lawson);
  }
  const node = s.map.nodes[s.camp]!;
  say(ctx, `Camp moved ${round1(miles)} mi to ${node.label ?? 'a new camp'} (${round1(hours)} h).`);
  campArrived(ctx, miles);
  if (loaded) hours += horseFalls(ctx, party);
  return hours;
}

/** The pass is the one place the horses go unloaded: the men carry every pack down, and up again on the way home. */
function sayPass(ctx: HalfCtx, dir: Step['dir'], hours: number) {
  if (dir === 'out') say(ctx, `Down the pass: the horses are unloaded and led down the trench, and every man carries a pack. ${round1(hours)} h of climbing.`);
  else if (ctx.s.horses.some(withParty)) say(ctx, `Up the pass: the packs go up on the men's backs and the horses climb the trench behind them. ${round1(hours)} h of climbing.`);
  else say(ctx, `Up the pass: no horses are left, so the men carry every pack up themselves. ${round1(hours)} h of climbing.`);
}

function campArrived(ctx: HalfCtx, miles: number) {
  const { s } = ctx;
  const node = s.map.nodes[s.camp]!;
  s.today.movedMiles += miles;
  s.today.campMoved = true;
  if (node.routeMiles > s.furthestCampMiles + EPS) {
    s.today.newGround += node.routeMiles - s.furthestCampMiles;
    s.furthestCampMiles = node.routeMiles;
  }
  if (node.feature === 'goal' && s.goalDay === null && s.leg === 'out') {
    s.goalDay = s.day;
    say(ctx, 'The whole party stands on the sugarloaf hill, beyond the range.');
  }
}

function horseFalls(ctx: HalfCtx, party: Member[]): number {
  const { s } = ctx;
  if (s.today.noFall) return 0;
  const fall = T.horses.fall;
  let lost = 0;
  let first: number | null = null;
  for (const { horse, load, cap } of horseLoads(s)) {
    if (cap <= 0) continue;
    let p = fall.base + (fall.per10LbOver * Math.max(0, load - cap)) / 10;
    if (horse.condition < T.horses.weakBelow) p += fall.weakPerPoint * (T.horses.weakBelow - horse.condition);
    if (!chance(s, p)) continue;
    lost += fall.hours;
    s.stats.horseFalls += 1;
    if (chance(s, fall.injuryChance)) {
      horse.condition = clamp(horse.condition - fall.injuryCondition);
      say(ctx, `${horse.name} is hurt in the fall.`);
    }
    if (first === null) first = horse.id;
  }
  if (first !== null) {
    queueEvent(ctx, { id: 'horseFall', horse: first });
    const n = Math.round(lost / fall.hours);
    say(ctx, n > 1 ? `${n} horses fell under their loads: ${lost} h lost getting them up again.` : `A horse fell under its load: ${lost} h lost getting it up again.`);
    for (const m of party) log(ctx, m, 'walk', lost);
  }
  return lost;
}

/**
 * The advance stops at water rather than push on to a dry camp: leaving a node with water for one
 * without, when the party could not get beyond the dry one this half anyway, strands the horses dry
 * for the night for no gain. Rock holes count as water for the men only, so they count as dry for
 * the horses here.
 */
function leavesWaterForDry(ctx: HalfCtx, from: string, seg: Segment, st: Step, hoursLeft: number): boolean {
  const { s } = ctx;
  const map = s.map;
  const here = map.nodes[from]!;
  const hereWater = here.water === 'swamp' || here.water === 'stream' || here.water === 'lagoon';
  if (!hereWater) return false;
  const next = map.nodes[stepEnd(map, st)]!;
  if (next.water !== 'none' && next.water !== 'rockHole') return false;
  if (next.feature === 'goal' || next.feature === 'pass') return false;
  // Could the party carry on past the dry node this half? Then it is not the night's camp.
  const h = seg.pass ? T.obstacles.descentHours : seg.miles / terrainSpec(seg.terrain).horseMph;
  const after = hoursLeft - h;
  const onward = next.childSegs.map((c) => map.segments[c]!).filter((g) => g.visible && !g.deadEnd && (horsePassable(map, g, s.stores) || (isPassable(g.terrain) && !g.pass)));
  return !onward.some((g) => g.miles / terrainSpec(g.terrain).horseMph <= after + EPS);
}

/** The whole party pushes on with the horses into passable ground, blazing as it goes. */
function advanceParty(ctx: HalfCtx, target: string, blaze: boolean, party: Member[], H: number): number {
  const { s } = ctx;
  const map = s.map;
  const leaders = party.filter((m) => m.leader && canWork(s, m));
  if (!leaders.length || H <= EPS) return 0;
  if (!canCarry(s)) return 0;
  const lawson = party.some((m) => m.id === 'lawson');
  const group = 1 + T.scouting.extraMemberBonus * (Math.min(party.length, T.scouting.maxTeam) - 1);
  const weather = s.weather === 'cloud' ? T.scouting.cloud : s.weather === 'rain' ? T.scouting.rain : 1;
  const sore = party.some((m) => m.condition === 'footsore') ? T.illness.footsore.walkFactor : 1;
  const factor = (leaders.reduce((sum, m) => sum + workFactor(s, m), 0) / leaders.length) * group * weather * sore;

  const steps = stepsToTarget(map, s.camp, target);
  let t = 0;
  let miles = 0;
  let newMiles = 0;
  let moved = false;
  let loaded = false;
  let i = 0;
  for (;;) {
    if (i >= steps.length) {
      const next = continuation(map, s.camp, lawson);
      if (!next) break;
      steps.push({ seg: next.id, dir: 'out' });
    }
    const st = steps[i++]!;
    const seg = map.segments[st.seg]!;
    if (horsePassable(map, seg, s.stores)) {
      const h = seg.pass ? (st.dir === 'out' ? T.obstacles.descentHours : T.obstacles.ascentHours) : seg.miles / terrainSpec(seg.terrain).horseMph;
      if (t + h > H + EPS) break;
      if (leavesWaterForDry(ctx, s.camp, seg, st, H - t)) break;
      t += h;
      miles += seg.miles;
      if (!seg.pass) loaded = true;
      for (const m of party) log(ctx, m, seg.pass ? 'carry' : 'walk', h);
      if (seg.pass) sayPass(ctx, st.dir, h);
      s.camp = stepEnd(map, st);
      moved = true;
      if (arriveAt(ctx, s.camp, lawson)) break;
      continue;
    }
    if (st.dir === 'in') break;
    if (!isPassable(seg.terrain) || seg.pass || !stepShifted(map.nodes[seg.a]!)) break;
    if (leavesWaterForDry(ctx, s.camp, seg, st, H - t)) break;
    const horse = terrainSpec(seg.terrain).horseMph;
    const v = blaze ? Math.min(terrainSpec(seg.terrain).scoutMph * factor, horse) : horse;
    const known = walkedMiles(seg);
    const tKnown = known / horse;
    const remain = seg.miles - known;
    const tNew = remain / v;
    if (t + tKnown + tNew > H + EPS) {
      // Not enough time to reach the next camp: the leaders blaze what they can and walk back.
      const A = H - t;
      if (blaze && A > EPS) {
        const wv = T.time.walkMph;
        const x = Math.min(remain, Math.max(0, A - (2 * known) / wv) / (1 / v + 1 / wv));
        if (x > EPS) {
          setMarked(seg, seg.markedMiles + x);
          newMiles += x;
          wearFor(ctx, seg.terrain, x / v);
        }
      }
      for (const m of party) log(ctx, m, leaders.includes(m) ? 'scout' : 'camp', A);
      t = H;
      break;
    }
    t += tKnown + tNew;
    miles += seg.miles;
    newMiles += remain;
    loaded = true;
    for (const m of party) {
      log(ctx, m, 'walk', tKnown);
      log(ctx, m, m.leader ? 'scout' : 'walk', tNew);
    }
    wearFor(ctx, seg.terrain, tNew);
    if (blaze) setMarked(seg, seg.miles);
    else seg.crossed = true;
    s.camp = seg.b;
    moved = true;
    const stop = arriveAt(ctx, seg.b, lawson);
    if (stop) break;
  }
  if (newMiles > EPS) s.today.fieldWork = true;
  if (moved) {
    say(ctx, `The party pushed on ${round1(miles)} mi with the horses${blaze ? ', blazing the trail' : ', without blazing'}.`);
    campArrived(ctx, miles);
    if (loaded) t += horseFalls(ctx, party);
  }
  return t;
}

// ---------------------------------------------------------------- scouting

function scoutHalf(ctx: HalfCtx, team: Member[], target: string, H: number) {
  const { s } = ctx;
  const map = s.map;
  const lawson = team.some((m) => m.id === 'lawson');
  const w = T.time.walkMph * Math.min(...team.map(walkFactor));
  const group = 1 + T.scouting.extraMemberBonus * (Math.min(team.length, T.scouting.maxTeam) - 1);
  const weather = s.weather === 'cloud' ? T.scouting.cloud : s.weather === 'rain' ? T.scouting.rain : 1;
  const factor = (team.reduce((sum, m) => sum + workFactor(s, m), 0) / team.length) * group * weather;

  const steps = stepsToTarget(map, s.camp, target);
  let committed = 0;
  let dist = 0;
  let walkOut = 0;
  let scoutH = 0;
  let searchH = 0;
  let marked = 0;
  const startKnown = Object.values(map.nodes).filter((n) => n.reached).length;
  let pos = s.camp;
  let i = 0;

  const search = (): boolean => {
    const node = map.nodes[pos]!;
    const need = T.obstacles.passSearchScoutHours - (node.searchHours ?? 0);
    const avail = H - committed;
    if (avail <= EPS) return false;
    const rate = team.length;
    if (need / rate <= avail + EPS) {
      node.searchHours = T.obstacles.passSearchScoutHours;
      committed += need / rate;
      searchH += need / rate;
      findPass(ctx, pos, lawson);
      return true;
    }
    node.searchHours = (node.searchHours ?? 0) + avail * rate;
    committed = H;
    searchH += avail;
    say(ctx, 'The scouts search the cliff line for a way down.');
    return false;
  };

  for (;;) {
    if (i >= steps.length) {
      const node = map.nodes[pos]!;
      if (node.feature === 'precipice' || node.feature === 'goal') break;
      if (node.feature === 'pass' && !node.childSegs.some((c) => map.segments[c]!.found)) {
        if (!search()) break;
      }
      const next = continuation(map, pos, lawson);
      if (!next) {
        const open = openBranches(map, pos).filter((b) => !map.nodes[b.b]!.reached).length;
        if (open >= 2 && H - committed > EPS) {
          const where = node.label ? `at ${node.label}` : `${round1(dist)} mi out`;
          say(ctx, `The scouts reached a fork ${where} and came back to ask which branch to take. Tap one on the map.`);
        }
        break;
      }
      steps.push({ seg: next.id, dir: 'out' });
    }
    const st = steps[i++]!;
    const seg = map.segments[st.seg]!;
    if (st.dir === 'in') {
      const cost = (2 * seg.miles) / w;
      if (committed + cost > H + EPS) break;
      committed += cost;
      dist += seg.miles;
      walkOut += seg.miles / w;
      pos = seg.a;
      continue;
    }
    if (seg.pass && !seg.found) break;
    const known = walkedMiles(seg);
    const wc = (2 * known) / w;
    if (committed + wc > H + EPS) break;
    committed += wc;
    dist += known;
    walkOut += known / w;
    const remain = seg.miles - known;
    if (remain > EPS) {
      const v = terrainSpec(seg.terrain).scoutMph * factor;
      const perMile = 1 / v + 1 / w;
      const can = (H - committed) / perMile;
      if (can <= EPS) break;
      const x = Math.min(remain, can);
      setMarked(seg, seg.markedMiles + x);
      committed += x * perMile;
      dist += x;
      scoutH += x / v;
      marked += x;
      wearFor(ctx, seg.terrain, x / v);
      if (seg.terrain === 'thorny' || seg.terrain === 'rocky') for (const m of team) m.workedRough = true;
      if (x < remain - EPS) break;
    }
    pos = seg.b;
    const stop = arriveAt(ctx, seg.b, lawson);
    if (stop === 'deadEnd' || stop === 'goal') break;
    if (stop === 'cliff' && !search()) break;
  }

  const back = dist / w;
  const idle = Math.max(0, H - committed);
  for (const m of team) {
    log(ctx, m, 'walk', walkOut + back);
    log(ctx, m, 'scout', scoutH + searchH);
    log(ctx, m, 'idle', idle);
  }
  const found = Object.values(map.nodes).filter((n) => n.reached).length - startKnown;
  if (marked > EPS) {
    const who = team.length === 1 ? firstName(team[0]!) : `${team.length} scouts`;
    say(ctx, `${who} marked ${round1(marked)} mi of new ridge${found > 0 ? `, reaching ${found} new point${found > 1 ? 's' : ''}` : ''}.`);
  } else if (idle > H - EPS && H > EPS) {
    say(ctx, 'The scouts found nothing to mark that way.');
  }
}

// ---------------------------------------------------------------- cutting

function cutHalf(ctx: HalfCtx, team: Member[], target: string, H: number) {
  const { s } = ctx;
  const map = s.map;
  const rain = s.weather === 'rain' ? T.efficiency.rain : 1;
  const ranked = [...team].sort((x, y) => workFactor(s, y) - workFactor(s, x) || MEMBER_ORDER.indexOf(x.id) - MEMBER_ORDER.indexOf(y.id));
  let axes = s.stores.axes;
  let hatchets = s.stores.hatchets;
  let K = 0;
  let W = 0;
  for (const m of ranked) {
    let tool = T.efficiency.tools.none;
    if (axes > 0) {
      axes -= 1;
      tool = T.efficiency.tools.axe;
    } else if (hatchets > 0) {
      hatchets -= 1;
      tool = T.efficiency.tools.hatchet;
    }
    const wf = workFactor(s, m) * rain;
    K += wf * tool * (m.id === 'wentworth' ? T.efficiency.wentworthCut : 1);
    W += wf;
  }
  K *= modeTuning(s.mode).clearRateFactor;
  const w = T.time.walkMph * Math.min(...team.map(walkFactor));

  let committed = 0;
  let dist = 0;
  let walkOut = 0;
  let cutH = 0;
  let cleared = 0;
  const work = (hoursNeeded: number, done: (h: number) => void): boolean => {
    const avail = H - committed;
    if (avail <= EPS) return false;
    const t = Math.min(avail, hoursNeeded);
    committed += t;
    cutH += t;
    done(t);
    return t >= hoursNeeded - EPS;
  };

  const steps = stepsToTarget(map, s.camp, target);
  let pos = s.camp;
  for (let i = 0; ; i++) {
    if (i >= steps.length) {
      // Past the end of their orders the cutters follow the scouts' blazes, if they lead one way.
      if (map.nodes[pos]!.feature === 'precipice') break;
      const next = blazedContinuation(map, pos);
      if (!next) break;
      steps.push({ seg: next.id, dir: 'out' });
    }
    const st = steps[i]!;
    const seg = map.segments[st.seg]!;
    pos = st.dir === 'out' ? seg.b : seg.a;
    if (st.dir === 'in') {
      const cost = (2 * seg.miles) / w;
      if (committed + cost > H + EPS) break;
      committed += cost;
      dist += seg.miles;
      walkOut += seg.miles / w;
      continue;
    }
    const a = map.nodes[seg.a]!;
    if (!stepShifted(a)) {
      const need = T.obstacles.rockStepWorkerHours - (a.stepHours ?? 0);
      const ok = work(need / W, (h) => {
        a.stepHours = (a.stepHours ?? 0) + h * W;
        wearFor(ctx, 'rocky', h);
      });
      if (!ok) {
        say(ctx, 'The cutters work at shifting the stones of the rock step.');
        break;
      }
      a.stepHours = T.obstacles.rockStepWorkerHours;
      say(ctx, 'The rock step is cleared: horses can pass.');
    }
    if (seg.pass) {
      if (!seg.found) break;
      if (!trenchDone(seg, s.stores)) {
        const need = trenchNeed(s.stores) - (seg.trenchHours ?? 0);
        const ok = work(need / W, (h) => {
          seg.trenchHours = (seg.trenchHours ?? 0) + h * W;
        });
        if (!ok) {
          say(ctx, 'The cutters dig at the trench down the pass.');
          break;
        }
        seg.trenchHours = trenchNeed(s.stores);
        say(ctx, 'The trench is dug: the horses can be led down the pass.');
      }
    }
    const open = openMiles(seg);
    const wc = (2 * open) / w;
    if (committed + wc > H + EPS) break;
    committed += wc;
    dist += open;
    walkOut += open / w;
    if (open >= seg.miles - EPS) continue;
    if (isPassable(seg.terrain)) break;
    const avail = seg.markedMiles - seg.clearedMiles;
    if (avail <= EPS) break;
    const k = terrainSpec(seg.terrain).clearMiPerWorkerHour * K;
    const perMile = 1 / k + 1 / w;
    const can = (H - committed) / perMile;
    if (can <= EPS) break;
    const x = Math.min(avail, can);
    setCleared(seg, seg.clearedMiles + x);
    committed += x * perMile;
    dist += x;
    cutH += x / k;
    cleared += x;
    wearFor(ctx, seg.terrain, x / k);
    if (seg.terrain === 'thorny' || seg.terrain === 'rocky') for (const m of team) m.workedRough = true;
    if (seg.clearedMiles < seg.miles - EPS) break;
  }

  const back = dist / w;
  const idle = Math.max(0, H - committed);
  for (const m of team) {
    log(ctx, m, 'walk', walkOut + back);
    log(ctx, m, 'cut', cutH);
    log(ctx, m, 'idle', idle);
  }
  if (cleared > EPS) say(ctx, `${team.length} cutter${team.length > 1 ? 's' : ''} cleared ${round1(cleared)} mi for the horses.`);
  else if (cutH <= EPS && H > EPS) say(ctx, 'The cutters had nothing marked to clear.');
}

// ---------------------------------------------------------------- camp tasks

function waterHalf(ctx: HalfCtx, carriers: Member[], H: number) {
  if (!carriers.length) return;
  const { s } = ctx;
  const node = s.map.nodes[s.camp]!;
  if (node.water !== 'none' || !node.gullyFt || s.today.waterFetched) {
    for (const m of carriers) log(ctx, m, 'camp', H);
    return;
  }
  const trip = node.gullyFt / T.obstacles.gullyFtPerHour;
  let trips = 0;
  for (const m of carriers) {
    const n = Math.min(Math.floor((H + EPS) / trip), T.obstacles.waterCarriers - trips);
    if (n <= 0) {
      log(ctx, m, 'camp', H);
      continue;
    }
    trips += n;
    log(ctx, m, 'water', n * trip);
    log(ctx, m, 'camp', H - n * trip);
  }
  if (trips >= T.obstacles.waterCarriers) {
    s.today.waterFetched = true;
    say(ctx, `Water carried up ${node.gullyFt} ft from the gully for the men and dogs.`);
    unlockCard(ctx, 'gullyWater');
  } else {
    say(ctx, 'Not enough trips to the gully to water the camp.');
  }
}

function huntHalf(ctx: HalfCtx, hunters: Member[], H: number) {
  if (!hunters.length) return;
  const { s } = ctx;
  const habitat = huntHabitat(s.map, s.camp);
  for (const m of hunters) {
    log(ctx, m, 'hunt', H);
    if (s.stores.shots < 1) {
      say(ctx, `${firstName(m)} has no powder left to hunt with.`);
      continue;
    }
    s.stores.shots -= 1;
    const p = T.hunting.man[habitat] * (m.id === 'burne' ? T.hunting.burneFactor : 1);
    // The rolls stay in this order (kill, size, stray) so saves from earlier builds replay the same.
    let kill = 0;
    if (chance(s, p)) {
      kill = chance(s, T.hunting.smallChance) ? T.hunting.smallLb : T.hunting.largeLb;
      addFresh(s, kill);
      s.stats.kills += 1;
    }
    const size = kill === T.hunting.smallLb ? 'small' : 'large';
    if (chance(s, T.hunting.strayChance * modeTuning(s.mode).eventChanceFactor)) {
      m.awayUntil = currentSlot(s) + 1;
      queueEvent(ctx, { id: 'hunterStrays', member: m.id });
      say(
        ctx,
        kill
          ? `${firstName(m)} shot a ${size} kangaroo and sent ${kill} lb of meat back to camp, but has not come back himself.`
          : `${firstName(m)} has not come back from hunting.`,
      );
    } else if (kill) say(ctx, `${firstName(m)} shot a ${size} kangaroo: ${kill} lb of fresh meat.`);
    else say(ctx, `${firstName(m)} came back from hunting empty-handed.`);
  }
}

function grassHalf(ctx: HalfCtx, men: Member[], H: number) {
  if (!men.length) return;
  const { s } = ctx;
  const node = s.map.nodes[s.camp]!;
  // Only good or tall grass is worth cutting to carry; rushy grass is no better cut than grazed.
  const rate = node.grass === 'good' || node.grass === 'tall' ? T.grass.lbPerManHour : 0;
  let cut = 0;
  for (const m of men) {
    log(ctx, m, 'grass', H);
    cut += rate * H * efficiency(m);
  }
  if (!rate) {
    say(ctx, `${node.grass === 'none' ? 'No grass' : 'Only rushy grass'} at this camp: nothing worth cutting to carry.`);
    return;
  }
  const room = Math.max(0, capacity(s) - loadLb(s.stores));
  const add = Math.min(cut, room);
  s.stores.grass += add;
  if (add > EPS) say(ctx, `${Math.round(add)} lb of grass cut and bundled for the horses.`);
  else if (cut > EPS) say(ctx, 'The horses are fully loaded: no room for cut grass.');
}

function strays(ctx: HalfCtx) {
  const { s } = ctx;
  let n = 0;
  for (const h of s.horses) if (h.leftAt === null && chance(s, T.horses.strayChance)) n += 1;
  if (!n) return;
  const delay = Math.min(T.horses.strayDelayCapHours, n * T.horses.strayHours);
  s.delayNext = Math.max(s.delayNext, delay);
  s.stats.strays += n;
  say(ctx, `${n} horse${n > 1 ? 's' : ''} strayed from the unattended camp: ${delay} h to bring them in.`);
}

// ---------------------------------------------------------------- return leg

function resolveHome(ctx: HalfCtx, plan: HalfDayPlan, a: Map<MemberId, Assignment>, H: number) {
  const { s } = ctx;
  const party = s.men.filter((m) => a.get(m.id) !== 'away' && a.get(m.id) !== 'busy');
  for (const m of s.men) if (a.get(m.id) === 'busy') log(ctx, m, 'walk', H);
  if (plan.halt || s.restToday) {
    const team = (t: Task) => party.filter((m) => a.get(m.id) === t);
    waterHalf(ctx, team('water'), H);
    huntHalf(ctx, team('hunt'), H);
    grassHalf(ctx, team('grass'), H);
    for (const m of [...team('camp'), ...team('scout'), ...team('cut')]) log(ctx, m, 'camp', H);
    for (const m of team('rest')) log(ctx, m, 'rest', H);
    return;
  }
  travelHome(ctx, party, H);
}

function travelHome(ctx: HalfCtx, party: Member[], H: number) {
  const { s } = ctx;
  const map = s.map;
  // Homeward the men shoulder whatever the horses cannot carry.
  let t = 0;
  let miles = 0;
  let loaded = false;
  for (const st of pathSteps(map, s.camp, map.start)) {
    const seg = map.segments[st.seg]!;
    let h: number;
    let carry = false;
    if (seg.pass) {
      h = T.obstacles.ascentHours;
      carry = true;
    } else if (seg.crossed && seg.markedMiles < seg.miles - EPS) {
      h = seg.miles / T.returnLeg.unmarkedMph;
      let left = seg.miles;
      while (left > EPS) {
        const part = Math.min(1, left);
        if (chance(s, T.returnLeg.loseHourChancePerMile * part)) h += 1;
        left -= part;
      }
    } else {
      h = seg.miles / terrainSpec(seg.terrain).horseMph;
    }
    if (t + h > H + EPS) break;
    t += h;
    miles += seg.miles;
    if (!carry) loaded = true;
    for (const m of party) log(ctx, m, carry ? 'carry' : 'walk', h);
    if (seg.pass) sayPass(ctx, 'in', h);
    s.camp = seg.a;
    passHomeNode(ctx, seg.a);
    if (seg.a === map.start) break;
  }
  for (const m of party) log(ctx, m, 'camp', Math.max(0, H - t));
  if (miles > EPS) {
    s.today.movedMiles += miles;
    s.today.campMoved = true;
    say(ctx, `Homeward ${round1(miles)} mi along the trail.`);
    if (loaded) horseFalls(ctx, party);
  }
  if (s.camp === map.start) {
    say(ctx, 'Back across the Nepean.');
    finishGame(s);
  }
}

function passHomeNode(ctx: HalfCtx, id: string) {
  const { s } = ctx;
  collectCache(s, ctx.lines, id);
  for (const h of s.horses) {
    if (h.leftAt !== id) continue;
    if (chance(s, T.horses.rejoinChance)) {
      h.leftAt = null;
      h.condition = Math.max(h.condition, T.horses.rejoinCondition);
      say(ctx, `${h.name}, left behind on the way out, is found grazing and rejoins the party.`);
    } else {
      h.leftAt = `lost:${id}`;
      say(ctx, `No sign of ${h.name} where it was left.`);
    }
  }
}

// ---------------------------------------------------------------- bookkeeping

function applyAccounts(ctx: HalfCtx) {
  const { s } = ctx;
  const rate = T.stamina.perHour;
  for (const m of s.men) {
    const a = ctx.acct.get(m.id)!;
    for (const [k, v] of Object.entries(a)) {
      if (v <= 0) continue;
      const key = `${s.leg}:${k}`;
      s.stats.manHours[key] = (s.stats.manHours[key] ?? 0) + v;
    }
    const d =
      a.walk * rate.walk +
      a.scout * rate.scout +
      a.cut * rate.cut +
      a.water * rate.water +
      a.carry * rate.carry +
      a.hunt * rate.hunt +
      (a.camp + a.idle) * rate.camp +
      a.rest * rate.rest +
      a.grass * rate.grass;
    m.stamina = clamp(m.stamina + d, 0, T.stamina.max);
  }
  s.wear = clamp(s.wear + ctx.wear);
}

function finishHalf(ctx: HalfCtx) {
  const { s } = ctx;
  const ev = ctx.events[0];
  if (ev) s.pending.push(ev);
  s.eveningQueue.push(...ctx.events.slice(1));
  if (s.phase === 'over') return ev?.id;
  if (ctx.half === 'morning') {
    s.phase = 'afternoon';
    if (s.weather === 'cloud' && s.today.cloudLifts) {
      s.weather = 'fair';
      const node = s.map.nodes[s.camp]!;
      if ((node.feature === 'lookout' || node.view) && !node.lookoutUsed) {
        say(ctx, 'The cloud lifts at noon.');
        useLookout(ctx, s.camp, s.men.some((m) => m.id === 'lawson' && !isAway(s, m)));
      } else {
        addMorale(s, T.morale.cloudLifts);
        say(ctx, 'The cloud lifts at noon and spirits with it.');
      }
    }
  } else {
    setupEvening(ctx);
  }
  return ev?.id;
}

/** After the afternoon: queued events, rest-day brooding, refusal, dry camp. */
export function setupEvening(ctx: Ctx) {
  const { s } = ctx;
  s.phase = 'evening';
  s.pending.push(...s.eveningQueue);
  s.eveningQueue = [];
  if (s.leg === 'out') {
    if (!s.today.fieldWork && !s.today.campMoved) {
      s.stats.restDays += 1;
      s.lastRestDay = s.day;
      if (s.morale >= T.morale.restDay.threshold) {
        addMorale(s, T.morale.restDay.good);
        say(ctx, 'A day of rest does the men good.');
      } else {
        s.pending.push({ id: 'brood' });
      }
    }
    if (s.morale < T.morale.refusalBelow) {
      s.pending.push({ id: 'refusal' });
      s.stats.refusals += 1;
    }
  }
  const node = s.map.nodes[s.camp]!;
  if (node.water === 'none' && !s.today.waterFetched) s.pending.push({ id: 'dryCamp' });
}
