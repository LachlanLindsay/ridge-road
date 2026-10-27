// endDay: evening orders, then the night in camp settles the costs, then dawn.
import { CARDS, T, modeTuning } from './data';
import { dateOf, startDay, turnHome, weatherWord } from './day';
import { EPS, huntHabitat, zoneOf } from './map';
import {
  clamp,
  foodLb,
  freshLb,
  isAway,
  isOverloaded,
  MEMBER_ORDER,
  rationLevel,
  round1,
  takeFlour,
  takeMeat,
  withParty,
} from './party';
import { chance } from './rng';
import { addFresh, cacheItems, collectCache, issueShoes } from './stores';
import { addMorale, queueEvent, say, unlockCard, type Ctx } from './world';
import type { EatenLevel, EndDayResult, EveningOrders, GameState, Member } from './types';

/** A bigger pack is likelier to bring something down; five dogs, as in 1813, keep the tuned odds. */
export function dogOdds(p: number, dogs: number): number {
  if (dogs <= 0) return 0;
  if (dogs === T.dogs.count) return p;
  return 1 - (1 - p) ** (dogs / T.dogs.count);
}

export function endDay(state: GameState, orders: EveningOrders): EndDayResult {
  if (state.phase !== 'evening') throw new Error('Evening orders are given in camp, after the afternoon.');
  if (state.pending.length) throw new Error('Answer the event card first.');
  const s = structuredClone(state);
  s.actions.push({ t: 'end', orders: structuredClone(orders) });
  const ctx: Ctx = { s, lines: [], events: [] };
  const day = s.day;

  s.rations = orders.rations;
  if (orders.collect) collectCache(s, ctx.lines);
  if (orders.cache) cacheItems(s, orders.cache, ctx.lines);
  if (orders.shoes) issueShoes(s, orders.shoes, ctx.lines);
  let tea = false;
  if (orders.tea && s.stores.tea >= 1) {
    s.stores.tea -= 1;
    tea = true;
  }
  if (orders.restTomorrow) s.restTomorrow = true;
  if (orders.headHome) {
    turnHome(s, s.goalDay !== null ? null : 'chose');
    say(ctx, s.goalDay !== null ? 'The party turns for home.' : 'The party gives up the attempt and turns for home.');
  }
  if (day === 1) {
    unlockCard(ctx, 'ridgeMethod');
    unlockCard(ctx, 'distanceByClock');
  }

  const dayNotes = pickDayNotable(state.today.log);
  const summary = summarise(s, dayNotes.some((l) => l.startsWith('Camp moved') || l.includes('pushed on')));
  night(ctx, tea, orders.feedGrass !== false);
  if (s.leg === 'out') forcedHome(ctx);

  const journal = { day, date: dateOf(day), text: [summary, ...dayNotes, ...pickNotable(ctx.lines)].join(' ') };
  s.journal.push(journal);

  s.pending.push(...ctx.events);
  s.stats.campMilesByDay.push(Math.round(s.furthestCampMiles * 100) / 100);
  s.day += 1;
  s.phase = 'morning';
  startDay(s, ctx.lines);
  s.today.log = ctx.lines;
  return { state: s, journal };
}

function summarise(s: GameState, moveTold: boolean): string {
  const parts = [`${weatherWord(s.weather)}.`];
  if (s.today.movedMiles > EPS) {
    if (!moveTold) parts.push(`Camp moved ${round1(s.today.movedMiles)} mi.`);
  } else parts.push(s.today.fieldWork ? 'Camp stayed; the men worked ahead.' : 'A day in camp.');
  return parts.join(' ');
}

function pickNotable(lines: string[]): string[] {
  const keys = ['chill', 'ill', 'kangaroo', 'collapsed', 'Forced', 'turns', 'Dingoes', 'mending'];
  return lines.filter((l) => keys.some((k) => l.includes(k))).slice(0, 3);
}

/**
 * The day's story for the journal: where the camp went, what was found, the dead ends, the views,
 * the pass and the hill. Cards found read as "Found: The rock wall."; the Signs of Country read as
 * the card's own line ("Signs of people: huts near the ridge."), never as something found.
 */
function pickDayNotable(lines: string[]): string[] {
  const keys = ['Camp moved', 'pushed on', 'Dead end', 'show plainly', 'A view at last', 'way down', 'trench is dug', 'Down the pass', 'Up the pass', 'sugarloaf hill', 'rock step', 'cairn', 'reached a fork', 'Collected from the cache', 'Cached at camp', 'nothing to mark'];
  const out: string[] = [];
  for (const l of lines) {
    if (l.startsWith('Journal card: ')) {
      const title = l.slice('Journal card: '.length, -1);
      const card = Object.values(CARDS).find((c) => c.title === title);
      out.push(card?.found ?? `Found: ${title}.`);
      continue;
    }
    if (keys.some((k) => l.includes(k))) out.push(l);
  }
  return out.slice(0, 4);
}

function blanketed(s: GameState, men: Member[]): Set<string> {
  const order = [...men].sort((a, b) => MEMBER_ORDER.indexOf(a.id) - MEMBER_ORDER.indexOf(b.id));
  return new Set(order.slice(0, s.stores.blankets).map((m) => m.id));
}

function night(ctx: Ctx, tea: boolean, feedGrass: boolean) {
  const { s } = ctx;
  const node = s.map.nodes[s.camp]!;
  const mountains = zoneOf(node.region) === 'mountains';
  const evf = modeTuning(s.mode).eventChanceFactor;
  const men = s.men.filter((m) => !isAway(s, m));

  // Dogs hunt on their own.
  const habitat = huntHabitat(s.map, s.camp);
  if (s.dogs > 0 && chance(s, dogOdds(T.hunting.dogs[habitat], s.dogs))) {
    const lb = chance(s, T.hunting.smallChance) ? T.hunting.smallLb : T.hunting.largeLb;
    addFresh(s, lb);
    s.today.dogsKilled = true;
    s.stats.kills += 1;
    say(ctx, `The dogs brought down a ${lb === T.hunting.smallLb ? 'small' : 'large'} kangaroo: ${lb} lb of fresh meat.`);
    unlockCard(ctx, 'kangarooDogs');
  }

  // Night alarms.
  let dingoes = false;
  if (s.leg === 'out' || mountains) {
    if (mountains && chance(s, T.events.dingoes * evf)) {
      dingoes = true;
      addMorale(s, T.morale.nightAlarm);
      say(ctx, 'Dingoes howl round the camp half the night.');
    }
    if (mountains && s.day > T.events.dogsRaceOffAfterDay && chance(s, T.events.dogsRaceOff * evf)) {
      queueEvent(ctx, { id: 'dogsRaceOff' });
    }
  }
  const frost = s.frostTonight;
  if (frost) {
    say(ctx, 'A hard frost in the night.');
    unlockCard(ctx, 'frost');
  }

  // Water.
  const menWater = node.water !== 'none' || s.today.waterFetched;
  const horseWater = node.water === 'swamp' || node.water === 'stream' || node.water === 'lagoon';
  if (!menWater) {
    s.stats.dryNights += 1;
    say(ctx, 'A dry camp: no water tonight.');
  }

  // Rations: fresh meat first, flour and meat stand in for each other when one runs out.
  const st = s.stores;
  const level = rationLevel(s.rations);
  const needFlour = men.length * T.rations.flourPerMan * level;
  const needMeat = men.length * T.rations.meatPerMan * level;
  const freshBefore = freshLb(st);
  let flour = takeFlour(st, needFlour);
  let meat = takeMeat(st, needMeat);
  if (flour < needFlour - EPS) meat += takeMeat(st, needFlour - flour);
  if (meat < needMeat + needFlour - flour - EPS) flour += takeFlour(st, needMeat + needFlour - flour - meat);
  const freshEaten = freshBefore - freshLb(st) > EPS;
  const perMan = men.length ? (flour + meat) / men.length : 0;
  const fullPerMan = T.rations.flourPerMan + T.rations.meatPerMan;
  const share = perMan / fullPerMan;
  const eaten: EatenLevel = share >= 0.99 ? 'full' : share >= 0.66 ? 'reduced' : share >= 0.49 ? 'short' : 'none';
  if (!s.today.dogsKilled) takeMeat(st, s.dogs * T.rations.dogMeat);
  if (eaten !== s.rations && eaten !== 'full') say(ctx, `Not enough food for ${s.rations} rations: the men ate ${eaten === 'none' ? 'next to nothing' : `${eaten} rations`}.`);
  if (freshEaten) {
    s.today.freshEaten = true;
    s.lastFreshDay = s.day;
  }

  // Fresh meat spoils.
  const keep = frost ? T.rations.freshKeepDaysFrost : T.rations.freshKeepDays;
  const spoiled = st.fresh.filter((f) => s.day - f.day >= keep).reduce((sum, f) => sum + f.lb, 0);
  st.fresh = st.fresh.filter((f) => s.day - f.day < keep);
  if (spoiled > EPS) say(ctx, `${round1(spoiled)} lb of fresh meat has spoiled.`);

  horsesNight(ctx, horseWater, feedGrass);

  // Recovery.
  const rec = T.stamina.recovery;
  const covered = blanketed(s, men);
  for (const m of men) {
    let r: number = rec[eaten];
    if (m.id === 'wentworth') r += rec.wentworthBonus;
    if (m.condition === 'chill' || m.condition === 'tooIll') r *= rec.sickFactor;
    if (!menWater) r += rec.noWater;
    if (frost && !covered.has(m.id)) r += rec.frostNoBlanket;
    if (dingoes) r += rec.dingoes;
    r += m.nightPenalty;
    m.stamina = clamp(m.stamina + r, 0, T.stamina.max);
  }

  illness(ctx, men, frost, covered);

  // A day in camp: the men dry and mend their clothes and boots.
  if (!s.today.campMoved && !s.today.fieldWork && s.wear > EPS) {
    s.wear = clamp(s.wear - T.wear.restMend);
    say(ctx, 'A day in camp: the men dried and mended their clothes and boots.');
  }

  // Morale.
  addMorale(s, T.morale.daily);
  addMorale(s, T.morale.rations[eaten]);
  if (!menWater) addMorale(s, T.morale.noWater);
  if (freshEaten) addMorale(s, T.morale.freshMeat);
  if (tea) addMorale(s, T.morale.tea);
  if (s.leg === 'out' && s.today.newGround > EPS) {
    addMorale(s, Math.min(T.morale.newGroundMaxPerDay, Math.floor(s.today.newGround * T.morale.newGroundPerMile)));
  }

  // Food gone with no catch.
  if (foodLb(st) <= EPS && !s.today.caught) s.noFoodDays += 1;
  else s.noFoodDays = 0;
}

function horsesNight(ctx: Ctx, water: boolean, feedGrass: boolean) {
  const { s } = ctx;
  const node = s.map.nodes[s.camp]!;
  const N = T.horses.night;
  const over = isOverloaded(s);
  const longMove = s.today.movedMiles > N.longMoveMiles;
  // A day of rest: the camp stayed and nobody went out to scout or cut, so the men were free to
  // lead the horses round the best grazing near camp and to water.
  const rested = !s.today.campMoved && !s.today.fieldWork && water;
  let grass = s.stores.grass;
  for (const h of s.horses) {
    if (!withParty(h)) continue;
    let feed: 'good' | 'rushy' | 'none' = node.grass === 'good' || node.grass === 'tall' ? 'good' : node.grass;
    if (feedGrass && feed !== 'good' && grass >= N.grassLbPerHorse - EPS) {
      grass -= N.grassLbPerHorse;
      feed = 'good';
    }
    let d = feed === 'good' ? N.goodFeed : feed === 'rushy' ? N.rushy : N.noFeed;
    if (!water) d += N.noWater;
    if (over) d += N.overloaded;
    if (longMove) d += N.longMove;
    if (rested) d += N.restDay;
    if (d < 0 && s.today.blaxlandAtCamp) d *= N.blaxlandLossFactor;
    const before = h.condition;
    h.condition = clamp(h.condition + d);
    if (h.condition <= 0) {
      h.leftAt = s.camp;
      say(ctx, `${h.name} has collapsed and must be left at this camp.`);
      continue;
    }
    if (before >= T.horses.exhaustedBelow && h.condition < T.horses.exhaustedBelow) {
      queueEvent(ctx, { id: 'horseExhausted', horse: h.id });
    }
  }
  s.stores.grass = Math.max(0, grass);
}

function illness(ctx: Ctx, men: Member[], frost: boolean, covered: Set<string>) {
  const { s } = ctx;
  const node = s.map.nodes[s.camp]!;
  const I = T.illness;
  for (const m of men) {
    if (m.condition === null) {
      let p = I.chill.base;
      if (s.wear > I.chill.wearOver) p += I.chill.wear;
      if (m.stamina < I.chill.staminaUnder) p += I.chill.lowStamina;
      if (m.workedWet) p += I.chill.wetWork;
      if (frost && !covered.has(m.id)) p += I.chill.frostNoBlanket;
      if (s.today.pushedDew && m.worked) p += I.chill.dewPush;
      if (chance(s, p)) {
        m.condition = 'chill';
        m.workingWithChill = false;
        s.stats.illnesses += 1;
        addMorale(s, T.morale.fallsIll);
        say(ctx, `${m.name} has taken a chill.`);
        queueEvent(ctx, { id: 'chill', member: m.id });
        continue;
      }
      if (s.day >= I.bowel.fromDay) {
        let q = I.bowel.base;
        if (s.day - s.lastFreshDay > I.bowel.noFreshMeatDays) q += I.bowel.noFreshMeat;
        if (node.water === 'rockHole' || node.water === 'swamp') q += I.bowel.poorWater;
        if (chance(s, q)) {
          m.condition = 'bowel';
          s.stats.illnesses += 1;
          addMorale(s, T.morale.fallsIll);
          say(ctx, `${m.name} is down with a bowel complaint.`);
          queueEvent(ctx, { id: 'bowel', member: m.id });
          unlockCard(ctx, 'saltMeat');
          continue;
        }
      }
      if (s.wear > I.footsore.wearOver && m.workedRough && chance(s, I.footsore.chance)) {
        m.condition = 'footsore';
        say(ctx, `${m.name} is footsore: his shoes are worn through.`);
      }
    } else if (m.condition === 'chill') {
      if (m.worked) {
        if (chance(s, I.chill.tooIllIfWorks)) {
          m.condition = 'tooIll';
          m.workingWithChill = false;
          addMorale(s, T.morale.fallsIll);
          say(ctx, `${m.name} worked through his chill and is now too ill to work.`);
        }
      } else if (chance(s, I.chill.recoverIfRested)) {
        m.condition = null;
        m.workingWithChill = false;
        m.keepAtCamp = false;
        say(ctx, `${m.name} has shaken off his chill.`);
      }
    } else if (m.condition === 'bowel') {
      if (chance(s, I.bowel.recover)) {
        m.condition = null;
        say(ctx, `${m.name} is mending from his complaint.`);
      }
    } else if (m.condition === 'tooIll') {
      // Lying up all day helps; carried along on a move, or minding camp, he mends more slowly.
      if (chance(s, m.exerted ? I.tooIll.toChill : I.tooIll.toChillRested)) {
        m.condition = 'chill';
        m.keepAtCamp = true; // he rests on until the chill has gone
        say(ctx, `${m.name} is mending, though still chilled.`);
      }
    }
  }
}

function forcedHome(ctx: Ctx) {
  const { s } = ctx;
  let reason: 'morale' | 'food' | 'illness' | 'horses' | null = null;
  if (s.morale <= 0) reason = 'morale';
  else if (s.noFoodDays >= T.forcedHome.noFoodDays) reason = 'food';
  else if (s.men.filter((m) => m.condition === 'tooIll').length >= T.forcedHome.tooIllCount) reason = 'illness';
  else if (s.horses.every((h) => !withParty(h) || h.condition < T.horses.exhaustedBelow)) reason = 'horses';
  if (!reason) return;
  turnHome(s, reason);
  const why = {
    morale: 'the men have lost heart',
    food: 'the food is gone',
    illness: 'too many men are ill',
    horses: 'the horses are finished',
  }[reason];
  say(ctx, `Forced home: ${why}.`);
}

