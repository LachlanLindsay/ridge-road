// Event cards: choices with their effects shown before the player picks, and chooseEvent.
import { EVENT_TEXT, T } from './data';
import { turnHome } from './day';
import { huntHabitat } from './map';
import {
  capacity,
  canWork,
  clamp,
  currentSlot,
  dailyFood,
  foodLb,
  isAway,
  loadLb,
  member,
  slot,
  takeFlour,
  takeMeat,
  withParty,
} from './party';
import { chance } from './rng';
import { addFresh, cacheWeight } from './stores';
import { addMorale, say, unlockCard, type Ctx } from './world';
import type { ChoiceId, EventCard, GameState, Member, PendingEvent } from './types';

interface Option {
  id: ChoiceId;
  effect: string;
  disabled?: string;
  /** The effect is bad news the player may miss: the card shows it as a warning. */
  warn?: boolean;
}

function mealCost(s: GameState, days: number): number {
  return Math.round(dailyFood(s, 'full', false) * days);
}

function canFeast(s: GameState, days: number): string | undefined {
  if (s.stores.tea < 1) return 'No tea left';
  if (foodLb(s.stores) < mealCost(s, days)) return 'Not enough food';
  return undefined;
}

function nameOf(s: GameState, ev: PendingEvent): string {
  if (ev.member) return member(s, ev.member).name;
  if (ev.horse !== undefined) return s.horses.find((h) => h.id === ev.horse)?.name ?? 'A horse';
  return '';
}

function options(s: GameState, ev: PendingEvent): Option[] {
  const node = s.map.nodes[s.camp]!;
  switch (ev.id) {
    case 'dew':
      return [
        { id: 'wait', effect: 'Start work at 10:00, an hour late' },
        { id: 'push', effect: 'Start at 09:00 in wet clothes: boots and coats wear faster, and the men who work are more likely to catch a chill tonight' },
      ];
    case 'horseFall':
      return [
        { id: 'reload', effect: 'Carry on with the same loads; another horse may fall today' },
        { id: 'lighten', effect: `Leave ${T.horses.fall.lightenLb} lb here for the way home; no more falls today` },
      ];
    case 'horseExhausted': {
      const h = s.horses.find((x) => x.id === ev.horse);
      const over = Math.max(0, Math.ceil(loadLb(s.stores) - capacity(s)));
      const tooMuch = loadLb(s.stores) > capacity(s, true);
      // As the night will have it: rushy grass feeds a horse only with cut grass for every horse here.
      const watered = node.water !== 'none' && node.water !== 'rockHole';
      const cutLb = T.horses.night.grassLbPerHorse * s.horses.filter(withParty).length;
      const grassOk = node.grass === 'good' || node.grass === 'tall' || (node.grass === 'rushy' && s.stores.grass >= cutLb - 1e-9);
      const fed = watered && grassOk;
      const name = h?.name ?? 'the horse';
      const lack = !watered ? 'no water for horses' : node.grass === 'rushy' ? 'only rushy grass and not enough cut grass' : 'no grass';
      const rest: Option = {
        id: 'rest',
        ...(fed ? {} : { warn: true }),
        effect: fed
          ? node.grass === 'rushy'
            ? `Nobody works tomorrow; ${name} eats the cut grass, drinks here and recovers a little`
            : `Nobody works tomorrow; ${name} eats and drinks here and recovers a little`
          : `Nobody works tomorrow, but there is ${lack} here, so ${name} will not recover`,
      };
      const spread: Option = {
        id: 'spread',
        effect: over > 0 ? `The others carry its load: ${over} lb over their easy limit, so more falls` : 'The others carry its load',
        ...(tooMuch ? { disabled: 'More than the others can carry' } : {}),
      };
      const cache: Option = { id: 'cache', effect: over > 0 ? `Leave ${over} lb here for the way home: cut grass and spare food first, never the blankets` : 'Nothing needs leaving' };
      // The usual choice first: a rest where the horse can recover, otherwise sharing the load.
      return fed ? [rest, spread, cache] : [spread, cache, rest];
    }
    case 'dryCamp':
      return [
        {
          id: 'fetch',
          effect: node.gullyFt ? `Two men climb ${node.gullyFt} ft down and back after dark: they sleep badly, the rest drink` : 'No gully to fetch from',
          ...(node.gullyFt ? {} : { disabled: 'No gully here' }),
        },
        { id: 'dry', effect: 'Nobody drinks tonight: everyone sleeps badly and spirits drop' },
      ];
    case 'chill':
      return [
        { id: 'keep', effect: 'He rests at camp until the chill passes, usually two or three nights' },
        { id: 'work', effect: `He works, slowly, and each night he works there is a ${Math.round(T.illness.chill.tooIllIfWorks * 100)}% chance he becomes too ill to work at all` },
      ];
    case 'bowel':
      return [
        { id: 'push', effect: 'He keeps working, a little slower, until it passes' },
        {
          id: 'hunt',
          effect: `One shot now for fresh meat: ${Math.round(T.hunting.man[huntHabitat(s.map, s.camp)] * 100)}% chance here, double for Burne`,
          ...(s.stores.shots < 1 ? { disabled: 'No powder left' } : {}),
        },
        { id: 'rest', effect: 'Nobody works today: the whole party loses a day' },
      ];
    case 'hunterStrays':
      return [
        { id: 'search', effect: 'Two men lose the next half-day; he is found' },
        { id: 'wait', effect: `${Math.round(T.hunting.strayBackNextMorning * 100)}% he is back next morning, otherwise the day after` },
      ];
    case 'dogsRaceOff':
      return [
        { id: 'watch', effect: 'Two men stand watch and sleep badly' },
        { id: 'settle', effect: 'A restless night: spirits drop a little' },
      ];
    case 'brood': {
      const no = canFeast(s, 1);
      return [
        { id: 'tea', effect: `Morale +8; costs ${mealCost(s, 1)} lb of food and 1 lb of tea`, ...(no ? { disabled: no } : {}) },
        { id: 'leaders', effect: "Morale +6; the leaders' stamina −10" },
        { id: 'pass', effect: 'Morale −4' },
      ];
    }
    case 'refusal': {
      const no = canFeast(s, 2);
      return [
        { id: 'ration', effect: `Morale +12; costs ${mealCost(s, 2)} lb of food and 1 lb of tea`, ...(no ? { disabled: no } : {}) },
        { id: 'rest', effect: 'Morale +6; nobody works tomorrow' },
        { id: 'turnBack', effect: 'Give up the attempt and head home' },
      ];
    }
  }
}

/** The card for the event waiting on the player, if any. */
export function eventCard(s: GameState): EventCard | null {
  const ev = s.pending[0];
  if (!ev) return null;
  const txt = EVENT_TEXT[ev.id]!;
  const who = nameOf(s, ev);
  return {
    id: ev.id,
    title: who && (ev.member || ev.horse !== undefined) ? `${txt.title}: ${who}` : txt.title,
    text: txt.text,
    choices: options(s, ev).map((o) => ({ id: o.id, label: txt.choices[o.id] ?? o.id, effect: o.effect, ...(o.disabled ? { disabled: o.disabled } : {}), ...(o.warn ? { warn: true } : {}) })),
  };
}

/** Two fit men for a night or day duty, servants first, freshest first. */
function pickTwo(s: GameState, exclude?: string): Member[] {
  return s.men
    .filter((m) => m.id !== exclude && !isAway(s, m) && canWork(s, m))
    .sort((a, b) => Number(a.leader) - Number(b.leader) || b.stamina - a.stamina)
    .slice(0, 2);
}

function scheduleRest(s: GameState) {
  if (s.phase === 'evening') s.restTomorrow = true;
  else s.restToday = true;
}

function feast(s: GameState, days: number) {
  const lb = mealCost(s, days);
  const flour = takeFlour(s.stores, lb / 2);
  takeMeat(s.stores, lb - flour);
  s.stores.tea = Math.max(0, s.stores.tea - 1);
}

export function chooseEvent(state: GameState, choice: ChoiceId): GameState {
  const ev = state.pending[0];
  if (!ev) throw new Error('There is no event to answer.');
  const opt = options(state, ev).find((o) => o.id === choice);
  if (!opt) throw new Error(`"${choice}" is not a choice for ${ev.id}.`);
  if (opt.disabled) throw new Error(`Can't choose ${choice}: ${opt.disabled}.`);
  const s = structuredClone(state);
  s.actions.push({ t: 'choose', choice });
  s.pending.shift();
  const ctx: Ctx = { s, lines: [], events: [] };
  apply(ctx, ev, choice);
  s.today.log.push(...ctx.lines);
  return s;
}

function apply(ctx: Ctx, ev: PendingEvent, choice: ChoiceId) {
  const { s } = ctx;
  switch (ev.id) {
    case 'dew':
      if (choice === 'wait') s.today.dewStart = T.time.dewDelayHours;
      else {
        s.today.dewStart = 0;
        s.today.pushedDew = true;
        s.wear = clamp(s.wear + T.wear.dewPush);
      }
      return;
    case 'horseFall':
      if (choice === 'lighten') {
        cacheWeight(s, T.horses.fall.lightenLb, ctx.lines, 'Loads lightened after the fall, left here for the way home');
        s.today.noFall = true;
      }
      return;
    case 'horseExhausted':
      if (choice === 'cache') {
        const over = loadLb(s.stores) - capacity(s);
        if (over > 0) cacheWeight(s, over, ctx.lines, 'Load of the spent horse left here for the way home');
      } else if (choice === 'rest') scheduleRest(s);
      return;
    case 'dryCamp':
      if (choice === 'fetch') {
        for (const m of pickTwo(s)) m.nightPenalty += T.stamina.recovery.nightDuty;
        s.today.waterFetched = true;
        say(ctx, 'Two men bring water up from the gully after dark.');
        unlockCard(ctx, 'gullyWater');
      }
      return;
    case 'chill': {
      const m = member(s, ev.member!);
      if (choice === 'keep') m.keepAtCamp = true;
      else m.workingWithChill = true;
      return;
    }
    case 'bowel':
      if (choice === 'rest') scheduleRest(s);
      else if (choice === 'hunt') {
        const hunter = s.men.find((m) => m.id === 'burne' && canWork(s, m)) ?? pickTwo(s, ev.member)[0];
        if (!hunter || s.stores.shots < 1) return;
        s.stores.shots -= 1;
        const p = T.hunting.man[huntHabitat(s.map, s.camp)] * (hunter.id === 'burne' ? T.hunting.burneFactor : 1);
        if (chance(s, p)) {
          const lb = chance(s, T.hunting.smallChance) ? T.hunting.smallLb : T.hunting.largeLb;
          addFresh(s, lb);
          s.stats.kills += 1;
          say(ctx, `${hunter.name} brings back ${lb} lb of fresh meat.`);
        } else say(ctx, `${hunter.name} comes back empty-handed.`);
      }
      return;
    case 'hunterStrays': {
      const m = member(s, ev.member!);
      const strayed = m.awayUntil - 1;
      const strayDay = Math.floor(strayed / 3);
      const nextHalf = strayed % 3 === 0 ? strayed + 1 : slot(strayDay + 1, 'morning');
      if (choice === 'search') {
        for (const x of pickTwo(s, m.id)) x.busyUntil = Math.max(x.busyUntil, nextHalf + 1);
        m.awayUntil = Math.max(currentSlot(s), nextHalf + 1);
        say(ctx, `Two men go out after ${m.name}.`);
      } else {
        const back = chance(s, T.hunting.strayBackNextMorning) ? slot(strayDay + 1, 'morning') : slot(strayDay + 2, 'morning');
        m.awayUntil = back;
      }
      return;
    }
    case 'dogsRaceOff':
      if (choice === 'watch') for (const m of pickTwo(s)) m.stamina = clamp(m.stamina + T.stamina.recovery.nightDuty);
      else addMorale(s, -3);
      return;
    case 'brood':
      if (choice === 'tea') {
        feast(s, 1);
        addMorale(s, 8);
      } else if (choice === 'leaders') {
        addMorale(s, 6);
        for (const m of s.men) if (m.leader) m.stamina = clamp(m.stamina - 10);
      } else addMorale(s, T.morale.restDay.bad);
      return;
    case 'refusal':
      if (choice === 'ration') {
        feast(s, 2);
        addMorale(s, 12);
      } else if (choice === 'rest') {
        addMorale(s, 6);
        scheduleRest(s);
      } else {
        turnHome(s, 'refusal');
        say(ctx, 'The party turns back.');
      }
      return;
  }
}

