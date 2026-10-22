// The evening in camp: rations, tea, rest, shoes, grass, caches and the turn for home.
import { useState } from 'preact/hooks';
import {
  T,
  dailyFood,
  foodLb,
  freshLb,
  isAway,
  type Cache,
  type EveningOrders,
  type GameState,
  type Item,
  type Rations,
} from '../engine';
import { GRASS_LABEL, horseWaterAt, itemText, lb, num, plural, waterLabel } from './format';
import { Horses, ManRow, Report, Stepper, Toggle } from './parts';
import { PlaceInfo } from './PlaceInfo';

interface Props {
  state: GameState;
  onMakeCamp: (orders: EveningOrders) => void;
  selected: string | null;
  setSelected: (id: string | null) => void;
}

const RATIONS: { id: Rations; label: string }[] = [
  { id: 'full', label: 'Full' },
  { id: 'reduced', label: 'Reduced' },
  { id: 'short', label: 'Short' },
];

const CACHE_ITEMS: { item: Item; step: number; label: string }[] = [
  { item: 'flour', step: 10, label: 'Flour, lb' },
  { item: 'saltMeat', step: 10, label: 'Salt meat, lb' },
  { item: 'grass', step: 15, label: 'Cut grass, lb' },
  { item: 'tea', step: 1, label: 'Tea and sugar, lb' },
  { item: 'blankets', step: 1, label: 'Blankets' },
  { item: 'shoes', step: 1, label: 'Pairs of shoes' },
  { item: 'shots', step: 10, label: 'Shots' },
];

/** Wear below this does nothing yet, so the shoes row stays out of the way unless a man is footsore. */
const SHOES_SHOWN_OVER = 55;

export function CampSheet({ state, onMakeCamp, selected, setSelected }: Props) {
  const node = state.map.nodes[state.camp]!;
  const st = state.stores;
  const atGoal = state.leg === 'out' && state.camp === state.map.goal;
  const footsore = state.men.filter((m) => m.condition === 'footsore').length;
  const [rations, setRations] = useState<Rations>(state.rations);
  const [tea, setTea] = useState(false);
  const [rest, setRest] = useState(false);
  const [shoes, setShoes] = useState(Math.min(footsore, st.shoes));
  const [feed, setFeed] = useState(true);
  const [cache, setCache] = useState<Cache>({});
  const [cacheOpen, setCacheOpen] = useState(false);
  const here = state.caches[state.camp];
  const hasCache = !!here && Object.keys(here).length > 0;
  const [collect, setCollect] = useState(true);
  const [home, setHome] = useState(atGoal);
  const [confirmTurn, setConfirmTurn] = useState(false);

  const menWater = node.water !== 'none' || state.today.waterFetched;
  const horseWater = horseWaterAt(node.water);
  const goodGrass = node.grass === 'good' || node.grass === 'tall';
  const food = foodLb(st);
  const tonight = dailyFood(state, rations);
  const daysLeft = tonight > 0 ? food / tonight : 0;
  const men = state.men.filter((m) => !isAway(state, m));
  const horsesWithUs = state.horses.filter((h) => h.leftAt === null).length;
  const grassNights = Math.floor(st.grass / T.horses.night.grassLbPerHorse);

  const orders = (): EveningOrders => {
    const o: EveningOrders = { rations, feedGrass: feed };
    if (tea) o.tea = true;
    if (rest) o.restTomorrow = true;
    if (shoes > 0) o.shoes = shoes;
    const c = Object.fromEntries(Object.entries(cache).filter(([, v]) => (v ?? 0) > 0));
    if (Object.keys(c).length) o.cache = c;
    if (hasCache && collect) o.collect = true;
    if (home && state.leg === 'out') o.headHome = true;
    return o;
  };

  return (
    <div class="sheet-inner">
      <Report lines={state.today.log} title="Today" />
      {selected && (
        <PlaceInfo state={state} id={selected} planning={false} target={null} moveTo={null} hoursLeft={0} onTarget={() => {}} onMove={() => {}} onClose={() => setSelected(null)} />
      )}
      <section class="plan" aria-label="Evening in camp">
        <header class="plan-head">
          <h2 class="display">Evening{node.label ? ` at ${node.label}` : ' in camp'}</h2>
          <span class="plan-hours">Morale {Math.round(state.morale)}</span>
        </header>

        <dl class="facts">
          <div>
            <dt>Water</dt>
            <dd class={menWater ? '' : 'is-warn'}>
              {state.today.waterFetched && node.water === 'none' ? 'Carried up from the gully for the men' : waterLabel(node.water, node.gullyFt)}
              {!horseWater && horsesWithUs > 0 ? '. The horses go without.' : ''}
            </dd>
          </div>
          <div>
            <dt>Grass</dt>
            <dd class={goodGrass ? '' : 'is-warn'}>
              {GRASS_LABEL[node.grass]}
              {!goodGrass && st.grass > 0
                ? grassNights > 0
                  ? `. ${lb(st.grass)} of cut grass carried, enough for ${plural(grassNights, 'horse-night')}.`
                  : `. ${lb(st.grass)} of cut grass carried, not enough to feed a horse (${T.horses.night.grassLbPerHorse} lb each).`
                : '.'}
              {!goodGrass && ' Grass can only be cut to carry where it is good or tall.'}
            </dd>
          </div>
          <div>
            <dt>Food</dt>
            <dd class={daysLeft < 7 ? 'is-warn' : ''}>
              {lb(food)}
              {freshLb(st) > 0 ? `, ${lb(freshLb(st))} of it fresh meat` : ''}. About {num(daysLeft, 0)} days at {rations} rations.
            </dd>
          </div>
        </dl>

        <fieldset class="segmented">
          <legend class="section-title">Rations tonight</legend>
          <div class="seg-row">
          {RATIONS.map((r) => {
            const m = T.morale.rations[r.id];
            return (
              <label key={r.id} class={rations === r.id ? 'seg is-on' : 'seg'}>
                <input type="radio" name="rations" value={r.id} checked={rations === r.id} onChange={() => setRations(r.id)} />
                <span class="seg-label">{r.label}</span>
                <span class="seg-note">
                  {lb(dailyFood(state, r.id))}
                  {m ? `, morale ${m}` : ''}
                </span>
              </label>
            );
          })}
          </div>
        </fieldset>

        {st.tea >= 1 && <Toggle id="tea" checked={tea} onChange={setTea} label="Issue tea and sugar" note={`Morale +${T.morale.tea}. ${lb(st.tea)} left.`} />}
        <Toggle
          id="rest"
          checked={rest}
          onChange={setRest}
          label="Rest tomorrow"
          note={state.morale >= T.morale.restDay.threshold ? `Stamina recovers and morale +${T.morale.restDay.good}.` : 'Stamina recovers, but low spirits may sour into brooding.'}
        />
        {st.grass >= T.horses.night.grassLbPerHorse && !goodGrass && (
          <Toggle id="feed" checked={feed} onChange={setFeed} label="Feed the cut grass" note="Each horse eats 15 lb and counts as well fed. Untick to save it for a camp with no grass." />
        )}
        {st.shoes > 0 && (footsore > 0 || state.wear > SHOES_SHOWN_OVER) && (
          <Stepper
            id="shoes"
            value={shoes}
            max={st.shoes}
            onChange={setShoes}
            label={`Spare shoes to issue (${plural(st.shoes, 'pair')} left${footsore ? `, ${footsore} footsore` : ''})`}
            note={`Wear ${Math.round(state.wear)}. Each pair takes ${T.wear.shoesRelief} off and puts a footsore man back on his feet. Above ${T.illness.chill.wearOver} chills come more often; above ${T.illness.footsore.wearOver} men go footsore.`}
          />
        )}
        {hasCache && (
          <Toggle
            id="collect"
            checked={collect}
            onChange={setCollect}
            label="Collect what was left here"
            note={Object.entries(here!)
              .map(([k, v]) => itemText(k, v ?? 0))
              .join(', ')}
          />
        )}

        <div class="disclosure">
          <button type="button" class="link-btn" aria-expanded={cacheOpen} onClick={() => setCacheOpen(!cacheOpen)}>
            {cacheOpen ? 'Hide supplies to leave here' : 'Leave supplies here for the way home'}
          </button>
          {cacheOpen && (
            <div class="cache-list">
              {CACHE_ITEMS.filter(({ item }) => st[item] > 0).map(({ item, step, label }) => (
                <Stepper
                  key={item}
                  id={`cache-${item}`}
                  value={Math.round(cache[item] ?? 0)}
                  max={Math.floor(st[item])}
                  step={step}
                  onChange={(v) => setCache({ ...cache, [item]: v })}
                  label={label}
                />
              ))}
            </div>
          )}
        </div>

        {state.leg === 'out' &&
          (atGoal ? (
            <Toggle id="home" checked={home} onChange={setHome} label="Turn for home" note="The goal is reached. Retrace the trail to the Nepean to finish the crossing." />
          ) : confirmTurn ? (
            <div class="confirm">
              <p>Give up the attempt and turn back? The expedition ends repulsed.</p>
              <div class="confirm-actions">
                <button
                  type="button"
                  class="btn btn-danger"
                  onClick={() => {
                    setHome(true);
                    setConfirmTurn(false);
                  }}
                >
                  Turn back tomorrow
                </button>
                <button type="button" class="btn btn-quiet" onClick={() => setConfirmTurn(false)}>
                  Keep going
                </button>
              </div>
            </div>
          ) : home ? (
            <p class="plan-line is-warn">
              The party turns back tomorrow.{' '}
              <button type="button" class="link-btn" onClick={() => setHome(false)}>
                Keep going after all
              </button>
            </p>
          ) : (
            <button type="button" class="link-btn" onClick={() => setConfirmTurn(true)}>
              Give up and turn back
            </button>
          ))}

        <section class="men" aria-label="The men">
          {men.map((m) => (
            <ManRow key={m.id} state={state} m={m} />
          ))}
        </section>
        <Horses state={state} />
      </section>
      <div class="sheet-foot">
        <button type="button" class="btn btn-go" onClick={() => onMakeCamp(orders())}>
          Make camp
        </button>
      </div>
    </div>
  );
}
