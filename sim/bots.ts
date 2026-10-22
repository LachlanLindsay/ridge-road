// Three bots for the sim harness, playing through the same API as the UI.
//   historical: the 1813 method. Five blaze, two mind camp, camp advances each morning, rest on Sundays.
//   naive:      everyone scouts, cutting only now and then, nobody minds camp.
//   cautious:   the historical method, resting every third day.
import {
  T,
  canWork,
  capacity,
  dailyFood,
  eventCard,
  foodLb,
  isAway,
  isBusy,
  loadAfterCache,
  loadLb,
  markedAhead,
  weekday,
  type ChoiceId,
  type EveningOrders,
  type GameState,
  type HalfDayPlan,
  type Member,
  type MemberId,
  type Rations,
  type Task,
} from '../src/engine/index';
import { campChoice, canAdvance, chooseTarget, furthestReachable, stableNoise } from './view';

export interface Bot {
  name: string;
  plan(s: GameState): HalfDayPlan;
  choose(s: GameState): ChoiceId;
  evening(s: GameState): EveningOrders;
}

const ROUTE_MILES = 58; // Blaxland's reckoning, known to the player from the briefing.
// Marked-but-uncut ground ahead below which Lawson goes out to mark, and below which a second leader joins him.
const SCOUT_ONE_BELOW = Number(process.env.RR_SCOUT_ONE ?? 2.5);
const SCOUT_TWO_BELOW = Number(process.env.RR_SCOUT_TWO ?? 0.3);

function restPlan(s: GameState): HalfDayPlan {
  const tasks: Partial<Record<MemberId, Task>> = {};
  for (const m of s.men) tasks[m.id] = 'rest';
  const node = s.map.nodes[s.camp]!;
  const burne = s.men.find((m) => m.id === 'burne');
  if (s.phase === 'afternoon' && burne && canWork(s, burne) && s.stores.shots > 10) tasks.burne = 'hunt';
  if ((node.grass === 'good' || node.grass === 'tall') && capacity(s) - loadLb(s.stores) > 30) tasks.servant4 = 'grass';
  return { tasks };
}

function needsGrass(s: GameState): boolean {
  const node = s.map.nodes[s.camp]!;
  if (node.grass !== 'good' && node.grass !== 'tall') return false;
  return capacity(s) - loadLb(s.stores) > 15;
}

interface WorkStyle {
  minders: number;
  scoutsWhenShort: boolean;
}

/** The 1813 method: move camp to the end of the cleared path, mark and cut ahead, two mind the horses. */
function methodPlan(s: GameState, style: WorkStyle): HalfDayPlan {
  if (s.leg === 'home') return { tasks: {} };
  const target = chooseTarget(s);
  if (!target) return restPlan(s);

  let moveTo: string | undefined;
  const campNode = s.map.nodes[s.camp]!;
  const campInDeadEnd = !!campNode.parentSeg && !!s.map.segments[campNode.parentSeg]!.deadEnd;
  const reach = s.phase === 'morning' ? campChoice(s, target) : furthestReachable(s, target);
  if (reach !== s.camp) {
    const gain = s.map.nodes[reach]!.routeMiles - campNode.routeMiles;
    // The camp only goes back when it is stranded on a dead branch.
    if (campInDeadEnd || (gain > 0 && (s.phase === 'morning' || gain >= 3 || reach === s.map.goal))) moveTo = reach;
  }
  const from = moveTo ?? s.camp;
  const advance = canAdvance(s, from, target);

  const tasks: Partial<Record<MemberId, Task>> = {};
  const here = s.men.filter((m) => !isAway(s, m) && !isBusy(s, m));
  // A chilled man rests until he is over it: working through a chill risks him falling too ill.
  const fit = (m: Member) => canWork(s, m) && m.condition !== 'chill';
  const able = here.filter(fit);
  const unable = here.filter((m) => !fit(m));
  for (const m of unable) tasks[m.id] = m.condition ? 'rest' : 'camp';

  // Minders: the unable count; then the most tired. Lawson scouts and Wentworth cuts, so neither minds.
  // Blaxland, the grazier, takes the afternoon camp when he can.
  let minders = unable.length;
  const byTired = [...able]
    .filter((m) => m.id !== 'lawson' && m.id !== 'wentworth')
    .sort((a, b) => {
      const pref = (m: Member) => (s.phase === 'afternoon' && m.id === 'blaxland' ? -50 : 0);
      return pref(a) + a.stamina - (pref(b) + b.stamina);
    });
  const camp: Member[] = [];
  for (const m of byTired) {
    if (minders >= style.minders) break;
    camp.push(m);
    minders += 1;
  }
  for (const m of camp) tasks[m.id] = needsGrass(s) ? 'grass' : 'camp';

  // Lawson marks ahead alone while there is marked ground to cut; with nothing marked, a second leader helps.
  const workers = able.filter((m) => !camp.includes(m));
  const buffer = markedAhead(s, from, target);
  const leaders = workers
    .filter((m) => m.leader)
    .sort((a, b) => (a.id === 'lawson' ? -1 : b.id === 'lawson' ? 1 : a.id === 'wentworth' ? 1 : b.id === 'wentworth' ? -1 : 0));
  let nScouts = 0;
  if (leaders.length && style.scoutsWhenShort && target !== s.map.goal) {
    if (buffer < SCOUT_TWO_BELOW) nScouts = Math.min(2, leaders.length);
    else if (buffer < SCOUT_ONE_BELOW) nScouts = 1;
  }
  const scouts = leaders.slice(0, nScouts);
  for (const m of workers) tasks[m.id] = scouts.includes(m) ? 'scout' : 'cut';

  // The horses can already reach the goal: nothing left to clear.
  if (target === s.map.goal && reach === s.map.goal) for (const m of workers) tasks[m.id] = 'camp';

  const plan: HalfDayPlan = { tasks, target };
  const cache = cacheExcess(s);
  if (cache) plan.cache = cache;
  // With every horse spent there is no moving camp; the work goes on until the night decides.
  const canMove = loadAfterCache(s, plan) <= capacity(s, true) + 1e-6;
  if (moveTo && canMove) plan.moveTo = moveTo;
  if (advance && canMove) plan.advance = true;
  return plan;
}

function projectedNeed(s: GameState): number {
  const perDay = dailyFood(s, 'full');
  const atMiles = s.map.nodes[s.camp]!.routeMiles;
  if (s.leg === 'home') return (atMiles / 14 + 1) * perDay;
  const daysOut = Math.max(0, ROUTE_MILES - s.furthestCampMiles) / 2.6;
  const daysHome = ROUTE_MILES / 14 + 1;
  const hunting = 2.5 * (daysOut + daysHome);
  return (daysOut + daysHome) * perDay - hunting;
}

function rationsFor(s: GameState): Rations {
  const food = foodLb(s.stores);
  const need = projectedNeed(s);
  if (food >= need * 0.95) return 'full';
  if (food >= need * 0.7) return 'reduced';
  return 'short';
}

/** Leave behind whatever the horses cannot carry, least needed first; food last, kept for the way home. */
function cacheExcess(s: GameState): EveningOrders['cache'] {
  const over = loadLb(s.stores) - capacity(s, true);
  // Nothing to gain by dumping stores when no horse can carry anything.
  if (over <= 0 || capacity(s, true) <= 0 || s.leg === 'home') return undefined;
  let left = over + 0.5;
  const cache: NonNullable<EveningOrders['cache']> = {};
  const take = (item: 'grass' | 'tea' | 'blankets' | 'shoes' | 'flour' | 'saltMeat', per: number) => {
    if (left <= 0) return;
    const qty = Math.min(s.stores[item], per === 1 ? left : Math.ceil(left / per));
    if (qty <= 0) return;
    cache[item] = qty;
    left -= qty * per;
  };
  take('grass', 1);
  take('tea', 1);
  take('blankets', T.weights.blanket);
  take('shoes', T.weights.shoes);
  take('flour', 1);
  take('saltMeat', 1);
  return cache;
}

/** Save cut grass for camps with none; spend it on rushy camps only when there is plenty or a horse is failing. */
function feedGrass(s: GameState): boolean {
  const node = s.map.nodes[s.camp]!;
  if (node.grass === 'none') return true;
  return s.stores.grass >= 150 || s.horses.some((h) => h.leftAt === null && h.condition < 40);
}

function methodEvening(s: GameState): EveningOrders {
  const orders: EveningOrders = { rations: rationsFor(s), feedGrass: feedGrass(s) };
  if (s.leg === 'out' && s.camp === s.map.goal) orders.headHome = true;
  if (s.morale < 50 && s.stores.tea >= 1) orders.tea = true;
  const sore = s.men.filter((m) => m.condition === 'footsore').length;
  if (sore && s.stores.shoes) orders.shoes = Math.min(sore, s.stores.shoes);
  else if (s.wear > 65 && s.stores.shoes > 2) orders.shoes = 1;
  return orders;
}

function methodChoice(s: GameState): ChoiceId {
  const card = eventCard(s)!;
  const ok = (id: ChoiceId) => card.choices.some((c) => c.id === id && !c.disabled);
  switch (card.id) {
    case 'dew':
      return 'wait';
    case 'horseFall':
      return 'reload';
    case 'horseExhausted':
      return loadLb(s.stores) > capacity(s) ? 'cache' : 'spread';
    case 'dryCamp':
      return ok('fetch') ? 'fetch' : 'dry';
    case 'chill':
      return 'keep';
    case 'bowel':
      return 'push';
    case 'hunterStrays':
      return 'wait';
    case 'dogsRaceOff':
      return s.morale >= 50 ? 'settle' : 'watch';
    case 'brood':
      return ok('tea') ? 'tea' : 'leaders';
    case 'refusal':
      return ok('ration') ? 'ration' : 'rest';
  }
}

export const historical: Bot = {
  name: 'historical',
  plan(s) {
    if (s.leg === 'out' && (s.restToday || sundayRest(s))) return restPlan(s);
    return methodPlan(s, { minders: 2, scoutsWhenShort: true });
  },
  choose: methodChoice,
  evening: methodEvening,
};

/** Rest on a Sunday unless the men rested within the last ten days: in 1813 that gives 16 and 30 May. */
function sundayRest(s: GameState): boolean {
  return weekday(s.day) === 0 && (s.lastRestDay === 0 || s.day - s.lastRestDay > 10);
}

export const cautious: Bot = {
  name: 'cautious',
  plan(s) {
    if (s.leg === 'out' && (s.restToday || s.day % 3 === 0)) return restPlan(s);
    return methodPlan(s, { minders: 2, scoutsWhenShort: true });
  },
  choose: methodChoice,
  evening: methodEvening,
};

export const naive: Bot = {
  name: 'naive',
  plan(s) {
    if (s.leg === 'home') return { tasks: {} };
    if (s.restToday) return restPlan(s);
    const target = chooseTarget(s);
    if (!target) return restPlan(s);
    const tasks: Partial<Record<MemberId, Task>> = {};
    const cutTurn = stableNoise(s.seed, `cut:${s.day}:${s.phase}`) < 0.1;
    for (const m of s.men) {
      if (isAway(s, m)) continue;
      tasks[m.id] = canWork(s, m) ? (cutTurn ? 'cut' : 'scout') : 'rest';
    }
    const plan: HalfDayPlan = { tasks, target };
    const cache = cacheExcess(s);
    if (cache) plan.cache = cache;
    const canMove = loadAfterCache(s, plan) <= capacity(s, true) + 1e-6;
    const reach = furthestReachable(s, target);
    if (canMove && s.phase === 'morning' && reach !== s.camp) plan.moveTo = reach;
    if (canMove && canAdvance(s, plan.moveTo ?? s.camp, target)) plan.advance = true;
    if (!s.men.some((m) => tasks[m.id] === 'scout' && m.leader)) {
      for (const m of s.men) if (tasks[m.id] === 'scout') tasks[m.id] = 'cut';
    }
    return plan;
  },
  choose: methodChoice,
  evening(s) {
    const orders: EveningOrders = { rations: 'full' };
    if (s.leg === 'out' && s.camp === s.map.goal) orders.headHome = true;
    return orders;
  },
};

export const BOTS: Record<string, Bot> = { historical, naive, cautious };
