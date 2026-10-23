// Outfitting at the Nepean: choose the party and its stores, see the horses' loads and how long the
// food will last, then set out. The party drawing redraws as the numbers change.
import { useState } from 'preact/hooks';
import { HORSE_NAMES, LEADERS, MEMBER_INFO, SERVANTS, T, partyOf, type Item } from '../engine';
import { PartyArt } from './art/scenes';
import { lb, num, shortName } from './format';
import { MeetRow } from './Info';
import type { Who } from './people';
import { KIT, PROVISIONS, capacityOf, checks, dailyEat, foodDays, grassNights, men, outfit1813, packHorses, sameOutfit, totalLoad, type HorseLoad, type Outfit as OutfitT, type Row } from './outfitting';

function Count({ id, label, note, warn, value, min, max, step = 1, unit, onChange }: { id: string; label: string; note?: string; warn?: boolean; value: number; min: number; max: number; step?: number; unit?: string; onChange: (v: number) => void }) {
  return (
    <div class="ostep" role="group" aria-labelledby={`${id}-l`}>
      <span class="ostep-text">
        <span id={`${id}-l`} class="ostep-label">
          {label}
        </span>
        {note && <span class={warn ? 'ostep-note is-warn' : 'ostep-note'}>{note}</span>}
      </span>
      <button type="button" class="step-btn" onClick={() => onChange(Math.max(min, value - step))} disabled={value <= min} aria-label={`Fewer: ${label}`}>
        −
      </button>
      <output id={id} class="step-value" aria-live="polite">
        {value}
        {unit && <span class="step-unit"> {unit}</span>}
      </output>
      <button type="button" class="step-btn" onClick={() => onChange(Math.min(max, value + step))} disabled={value >= max} aria-label={`More: ${label}`}>
        +
      </button>
    </div>
  );
}

const WORDS = ['no', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten', 'eleven', 'twelve'];
const word = (n: number) => WORDS[n] ?? String(n);

function servantNote(n: number): string {
  if (n === 0) return 'None: the three leaders do all the work themselves';
  if (n === 1) return 'James Burne, guide and the best hunter';
  if (n === 2) return 'Burne and Samuel Fairs';
  return `Burne, Fairs and ${word(n - 2)} convict servant${n - 2 > 1 ? 's' : ''}`;
}

/** Everyone setting out, for the row of names that opens their cards. */
function meet(o: OutfitT, loads: HorseLoad[]): { who: Who; name: string }[] {
  const men = [...LEADERS, ...SERVANTS.slice(0, o.servants)].map((id) => ({ who: { kind: 'man', id } as Who, name: shortName(MEMBER_INFO[id].name) }));
  const horses = Array.from({ length: o.horses }, (_, i) => ({ who: { kind: 'horse', id: i + 1, load: loads[i] } as Who, name: HORSE_NAMES[i] ?? `Horse ${i + 1}` }));
  return [...men, ...horses, ...(o.dogs > 0 ? [{ who: { kind: 'dogs', count: o.dogs } as Who, name: 'the dogs' }] : [])];
}

function Loads({ loads }: { loads: HorseLoad[] }) {
  const top = T.horses.overloadLb;
  const pct = (v: number) => `${Math.min(100, (v / top) * 100)}%`;
  return (
    <div class="loads">
      {loads.map((h) => (
        <div key={h.name} class="load-row" aria-label={`${h.name} carries ${lb(h.total)}: ${lb(h.food)} of food and ${lb(h.gear)} of kit and stores`}>
          <span class="load-name">{h.name}</span>
          <span class="load-bar" aria-hidden="true">
            <i class="load-food" style={{ width: pct(h.food) }} />
            <i class="load-gear" style={{ width: pct(h.gear) }} />
          </span>
          <span class={h.total > top + 0.5 ? 'load-lb is-over' : h.total > T.horses.capacityLb + 0.5 ? 'load-lb is-warn' : 'load-lb'}>{lb(h.total)}</span>
        </div>
      ))}
      <p class="load-key" aria-hidden="true">
        <span class="key-swatch load-food" /> Food <span class="key-swatch load-gear" /> Kit and stores <span class="key-line" /> {T.horses.capacityLb} lb, an easy load
      </p>
    </div>
  );
}

export function Outfit({ onSetOut, onBack }: { onSetOut: (o: OutfitT) => void; onBack: () => void }) {
  const [o, setO] = useState<OutfitT>(outfit1813);
  const P = T.party;
  const set = (patch: Partial<OutfitT>) => setO({ ...o, ...patch });
  const setItem = (item: Item, v: number) => setO({ ...o, loadout: { ...o.loadout, [item]: v } });
  // Blankets follow the size of the party while there is one for every man.
  const setServants = (v: number) => {
    const blankets = o.loadout.blankets === men(o) ? 3 + v : o.loadout.blankets;
    setO({ ...o, servants: v, loadout: { ...o.loadout, blankets } });
  };

  const load = totalLoad(o.loadout);
  const cap = capacityOf(o.horses);
  const days = foodDays(o);
  const issues = checks(o);
  const stop = issues.some((c) => c.level === 'stop');
  const changed = !sameOutfit(o, outfit1813());
  const h1813 = partyOf();
  const loads = packHorses(o);
  const rows = (list: Row[]) =>
    list.map((r) => (
      <Count
        key={r.item}
        id={`o-${r.item}`}
        label={r.label}
        note={r.note}
        warn={r.item === 'blankets' && o.loadout.blankets < men(o)}
        value={o.loadout[r.item]}
        min={0}
        max={r.max}
        step={r.step}
        unit={r.unit}
        onChange={(v) => setItem(r.item, v)}
      />
    ));

  return (
    <main class="outfit">
      <div class="outfit-art">
        <PartyArt counts={{ servants: o.servants, horses: o.horses, dogs: o.dogs }} loads={loads} />
      </div>
      <div class="outfit-inner">
        <p class="end-kicker">Emu Ford on the Nepean, 11 May 1813</p>
        <h1 class="display outfit-title">Pack for the trip</h1>
        <p class="outfit-lede">
          Blaxland took {word(h1813.servants)} servants, {word(h1813.horses)} pack horses and {word(h1813.dogs)} dogs, with food for about {Math.round(foodDays(outfit1813()))} days. Keep his outfit or choose your own.
        </p>
        {changed && (
          <button type="button" class="link-btn" onClick={() => setO({ ...outfit1813(), owner: o.owner })}>
            Back to Blaxland’s outfit
          </button>
        )}

        <section class="outfit-section">
          <h2 class="section-title">Who is leading this expedition?</h2>
          <input class="owner-field" type="text" maxLength={40} value={o.owner ?? ''} placeholder="Your name (optional, for a shared device)" onInput={(e) => set({ owner: (e.currentTarget as HTMLInputElement).value })} aria-label="Your name" />
        </section>

        <section class="outfit-section">
          <h2 class="section-title">The party</h2>
          <p class="outfit-fixed">Blaxland, Lawson and Wentworth lead, and only they can mark the trail.</p>
          <MeetRow whos={meet(o, loads)} />
          <Count id="o-servants" label="Servants" note={servantNote(o.servants)} value={o.servants} min={0} max={P.servantsMax} onChange={setServants} />
          <Count id="o-horses" label="Pack horses" note={`${T.horses.capacityLb} lb each, ${T.horses.overloadLb} at a push. Grass and water every night.`} value={o.horses} min={P.horsesMin} max={P.horsesMax} onChange={(v) => set({ horses: v })} />
          <Count id="o-dogs" label="Kangaroo dogs" note="They hunt on their own and eat ½ lb of meat a day" value={o.dogs} min={0} max={P.dogsMax} onChange={(v) => set({ dogs: v })} />
          <div class="ostep ostep-fixed">
            <span class="ostep-text">
              <span class="ostep-label">Wagons</span>
              <span class="ostep-note">No cart could get up the ridges. The first road over the range was William Cox’s, built in 1814–15.</span>
            </span>
            <span class="step-value ostep-none">None</span>
          </div>
        </section>

        <section class="outfit-section">
          <h2 class="section-title">Provisions</h2>
          {rows(PROVISIONS)}
          <p class={days < 14 ? 'outfit-sum is-warn' : 'outfit-sum'}>
            Food for <strong>{Math.floor(days)} days</strong> at full rations: {men(o)} men and {o.dogs} dogs eat {num(dailyEat(o))} lb a day. Hunting adds more; short rations stretch it.
          </p>
        </section>

        <section class="outfit-section">
          <h2 class="section-title">Tools and kit</h2>
          {rows(KIT)}
          <div class="ostep ostep-fixed">
            <span class="ostep-text">
              <span class="ostep-label">Camp kit</span>
              <span class="ostep-note">Kettles, rope and tinderbox: always packed</span>
            </span>
            <span class="step-value ostep-none">{lb(T.weights.campKit)}</span>
          </div>
        </section>

        <section class="outfit-section">
          <h2 class="section-title">Loading the horses</h2>
          <Loads loads={loads} />
          <p class={load > cap ? 'outfit-sum is-warn' : 'outfit-sum'}>
            {lb(load)} to carry, {lb(cap)} at an easy load.{' '}
            {load <= cap ? `Room for ${lb(cap - load)} of cut grass: ${num(grassNights(o))} night${num(grassNights(o)) === '1' ? '' : 's'} of feed for ${o.horses} horses at a dry camp.` : ''}
          </p>
        </section>

        {issues.length > 0 && (
          <ul class="outfit-checks">
            {issues.map((c) => (
              <li key={c.text} class={c.level === 'stop' ? 'is-over' : 'is-warn'}>
                {c.text}
              </li>
            ))}
          </ul>
        )}
        <button type="button" class="link-btn outfit-back" onClick={onBack}>
          Back to the title screen
        </button>
      </div>
      <div class="outfit-foot">
        <p class="outfit-foot-sum">
          <span class={load > cap ? 'is-warn' : ''}>
            Load {Math.round(load)} of {lb(cap)}
          </span>
          <span>·</span>
          <span class={days < 14 ? 'is-warn' : ''}>food for {Math.floor(days)} days</span>
        </p>
        <button type="button" class="btn btn-go" onClick={() => onSetOut(o)} disabled={stop}>
          Set out from the Nepean
        </button>
      </div>
    </main>
  );
}
