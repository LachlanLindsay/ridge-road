import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { chooseEvent, endDay, newGame, resolveHalfDay, type ChoiceId, type EveningOrders, type GameState, type Mode } from '../engine';
import { CampSheet } from './CampSheet';
import { normalizeDraft, toPlan, type Draft } from './draft';
import { EndScreen } from './EndScreen';
import { EventModal } from './EventModal';
import { Feedback } from './Feedback';
import { mapDraw } from './geometry';
import { InfoLayer } from './Info';
import { marksFor, newCards, readCardMarks, unreadCards, withNoticed, withOpened, writeCardMarks, type CardMarks } from './journalMarks';
import { JournalSlip } from './JournalSlip';
import { Grip, readMapSize, writeMapSize, type MapSize } from './MapSize';
import { MapView } from './MapView';
import { Outfit } from './Outfit';
import { toOptions, type Outfit as OutfitT } from './outfitting';
import { BriefingSheet, Help, Journal, MapKey, Menu, Party, type OverlayId } from './Overlays';
import { PlanSheet } from './PlanSheet';
import { clearSave, readDraft, readFlag, readSave, writeDraft, writeFlag, writeSave } from './save';
import { Briefing, Title } from './Title';
import { TopBar } from './TopBar';
import { getUnits, setUnits, type Units } from './format';

type Screen = 'title' | 'briefing' | 'outfit' | 'play';

const coachKey = (seed: number) => `ridge-road.coach.v2.${seed}`;
const dewKey = (seed: number) => `ridge-road.dew.v1.${seed}`;

/** For a first expedition: what the screen is for, shown before anything else on the first morning. */
function Coach({ onDone }: { onDone: () => void }) {
  return (
    <div class="backdrop">
      <div class="event-card coach" role="dialog" aria-modal="true" aria-labelledby="coach-title">
        <h2 id="coach-title" class="display event-title">
          Your first day
        </h2>
        <ul>
          <li>
            The plan <span class="when-below">under the map</span>
            <span class="when-beside">beside the map</span> is ready. Press <strong>Go</strong> to work the morning, then the afternoon; then make camp for the night.
          </li>
          <li>Tap a man to choose his job; press and hold him, or hover with a mouse, to read about him. Tap a ridge on the map to work there instead.</li>
          <li>The horses need water and grass every night. The camp suggestion looks for both.</li>
          <li>
            <strong>Menu → How to play</strong> explains the rest.
          </li>
        </ul>
        <div class="choices">
          <button type="button" class="choice" onClick={onDone}>
            <span class="choice-label">Got it</span>
          </button>
        </div>
      </div>
    </div>
  );
}

/** A seed from the address (?seed=123) replays a known expedition; otherwise a fresh one. */
function startSeed(): number {
  try {
    const fromUrl = Number(new URLSearchParams(location.search).get('seed'));
    if (Number.isInteger(fromUrl) && fromUrl > 0) return fromUrl;
  } catch {
    // No address to read.
  }
  return randomSeed();
}

function randomSeed(): number {
  try {
    const a = new Uint32Array(1);
    crypto.getRandomValues(a);
    return (a[0]! % 2147483646) + 1;
  } catch {
    return Math.floor(Math.random() * 2147483646) + 1;
  }
}

export function App({ resume, resumeBuild = null }: { resume: string | null; resumeBuild?: string | null }) {
  const [boot] = useState(() => readSave(resume, resumeBuild));
  const [game, setGame] = useState<GameState | null>(boot.game);
  const [notice, setNotice] = useState<string | null>(boot.notice);
  const [screen, setScreen] = useState<Screen>('title');
  const [draft, setDraft] = useState<Draft | null>(() => readDraft());
  const [selected, setSelected] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<OverlayId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapSize, setMapSizeState] = useState<MapSize>(() => readMapSize());
  // Which journal cards the player has been told about and has read, for this expedition.
  const [marks, setMarks] = useState<CardMarks | null>(() => (boot.game ? readCardMarks(boot.game) : null));
  // A new expedition between the title and the first morning: its mode and seed, before outfitting.
  const [setup, setSetup] = useState<{ mode: Mode; seed: number } | null>(null);
  const [units, setUnitsState] = useState<Units>(getUnits());
  const [tick, setTick] = useState(0);
  const sheet = useRef<HTMLDivElement>(null);
  const changeUnits = (u: Units) => {
    setUnits(u);
    setUnitsState(u);
  };
  const play = useRef<HTMLDivElement>(null);
  const setMapSize = (m: MapSize) => {
    setMapSizeState(m);
    writeMapSize(m);
  };

  useEffect(() => {
    if (game) writeSave(game);
  }, [game]);
  useEffect(() => {
    if (draft) writeDraft(draft);
  }, [draft]);
  useEffect(() => {
    if (game && marks?.seed !== game.seed) setMarks(readCardMarks(game));
  }, [game, marks]);
  useEffect(() => {
    if (marks) writeCardMarks(marks);
  }, [marks]);

  const planning = !!game && (game.phase === 'morning' || game.phase === 'afternoon');
  // The plan in force: the player's draft brought up to date with the state (a new half, an
  // illness answered, a spent target).
  const current = useMemo(() => (game && planning ? normalizeDraft(game, draft) : null), [game, draft, planning]);
  const draw = useMemo(() => (game ? mapDraw(game) : null), [game]);

  useEffect(() => {
    sheet.current?.scrollTo({ top: 0 });
  }, [game?.day, game?.phase]);

  useEffect(() => {
    if (!overlay) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setOverlay(overlay === 'menu' || overlay === 'key' ? null : 'menu');
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [overlay]);

  const act = (next: () => GameState) => {
    try {
      setGame(next());
      setError(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  // A remembered answer to the dew card: the same choice every misty morning of this expedition.
  useEffect(() => {
    if (!game || game.pending[0]?.id !== 'dew') return;
    let remembered: string | null = null;
    try {
      remembered = localStorage.getItem(dewKey(game.seed));
    } catch {
      // Nothing remembered.
    }
    if (remembered === 'wait' || remembered === 'push') act(() => chooseEvent(game, remembered as ChoiceId));
  }, [game?.pending.length, game?.day]);

  const start = (mode: Mode) => {
    setNotice(null);
    setSetup({ mode, seed: startSeed() });
    setScreen('briefing');
  };

  // The game begins once the party is outfitted; until then any saved expedition is kept.
  const setOut = (o: OutfitT) => {
    if (!setup) return;
    clearSave();
    const fresh = newGame({ ...setup, ...toOptions(o) });
    setGame(fresh);
    setMarks(marksFor(fresh));
    setSetup(null);
    setDraft(null);
    setSelected(null);
    setOverlay(null);
    setScreen('play');
  };

  // Cards for the party: in play they show the game's men and horses as they are; before setting
  // out, the party being outfitted, for the mode chosen.
  const playing = screen === 'play' && !!game;
  const readCard = (id: string) => setMarks((m) => (m ? withOpened(m, id) : m));
  const cards = (key: string, body: preact.ComponentChildren) => (
    <InfoLayer key={key} state={playing ? game : null} mode={playing ? game!.mode : (setup?.mode ?? 'historical')} onCardOpen={playing ? readCard : undefined}>
      {body}
    </InfoLayer>
  );

  if (screen === 'briefing' && setup) return cards('briefing', <Briefing onDone={() => setScreen('outfit')} />);
  if (screen === 'outfit' && setup) return cards('outfit', <Outfit onSetOut={setOut} onBack={() => setScreen('title')} />);
  if (screen === 'title' || !game)
    return (
      <Title
        save={game}
        notice={notice}
        onContinue={() => setScreen('play')}
        onStart={start}
        onLoad={(g) => {
          clearSave();
          setGame(g);
          setDraft(null);
          setSelected(null);
          setOverlay(null);
          setScreen('play');
        }}
      />
    );
  if (game.phase === 'over') return cards('end', <EndScreen state={game} onNew={() => setScreen('title')} onTitle={() => setScreen('title')} />);

  const showCoach = game.day === 1 && game.leg === 'out' && game.phase === 'morning' && !readFlag(coachKey(game.seed));
  const rememberDew = (choice: ChoiceId) => {
    try {
      localStorage.setItem(dewKey(game.seed), choice);
    } catch {
      // A convenience only.
    }
  };
  const live = marks && marks.seed === game.seed ? marks : null;
  const fresh = live ? newCards(game, live) : [];
  const unread = live ? unreadCards(game, live) : [];
  // The slip announces cards found since the last orders; giving the next orders files it away,
  // and the cards stay marked as unread in the menu and the journal until they are opened.
  const fileSlip = () => {
    if (live && fresh.length) setMarks(withNoticed(live, fresh));
  };

  const go = () => {
    if (!current) return;
    fileSlip();
    setDraft(current);
    setSelected(null);
    act(() => resolveHalfDay(game, toPlan(game, current)).state);
  };
  const choose = (c: ChoiceId) => act(() => chooseEvent(game, c));
  const makeCamp = (orders: EveningOrders) => {
    fileSlip();
    setSelected(null);
    act(() => endDay(game, orders).state);
  };

  return cards(
    'play',
    <div class="play" data-map={mapSize} ref={play}>
      <TopBar state={game} onMenu={() => setOverlay('menu')} unread={unread.length}>
        <JournalSlip key={fresh.join('|')} ids={fresh} onDismiss={fileSlip} />
      </TopBar>
      <MapView
        key={game.seed}
        draw={draw!}
        campKey={`${game.camp}:${game.day}:${game.phase}`}
        selected={selected}
        target={current && game.leg === 'out' ? current.target : null}
        moveTo={current && game.leg === 'out' ? current.moveTo : null}
        onTap={setSelected}
        onKey={() => setOverlay('key')}
        size={mapSize}
        onSize={setMapSize}
      />
      <Grip size={mapSize} onSize={setMapSize} play={play} />
      <div class="sheet" ref={sheet}>
        {game.phase === 'evening' ? (
          <CampSheet key={`${game.seed}:${game.day}`} state={game} onMakeCamp={makeCamp} selected={selected} setSelected={setSelected} />
        ) : (
          current && <PlanSheet state={game} draft={current} setDraft={setDraft} selected={selected} setSelected={setSelected} onGo={go} />
        )}
      </div>
      {error && (
        <div class="toast" role="alert">
          <span>{error}</span>
          <button type="button" class="icon-btn" onClick={() => setError(null)} aria-label="Dismiss">
            ×
          </button>
        </div>
      )}
      {showCoach ? (
        <Coach
          onDone={() => {
            writeFlag(coachKey(game.seed));
            setTick(tick + 1);
          }}
        />
      ) : (
        game.pending.length > 0 && <EventModal state={game} onChoose={choose} onRemember={game.pending[0]?.id === 'dew' ? rememberDew : undefined} />
      )}
      {overlay === 'menu' && (
        <Menu
          state={game}
          unread={unread.length}
          open={setOverlay}
          units={units}
          onUnits={changeUnits}
          onClose={() => setOverlay(null)}
          onTitle={() => {
            setOverlay(null);
            setScreen('title');
          }}
          onRestart={() => {
            clearSave();
            setOverlay(null);
            setGame(null);
            setDraft(null);
            setScreen('title');
          }}
        />
      )}
      {overlay === 'journal' && <Journal state={game} unread={unread} onRead={readCard} onClose={() => setOverlay('menu')} />}
      {overlay === 'party' && <Party state={game} onClose={() => setOverlay('menu')} />}
      {overlay === 'briefing' && <BriefingSheet onClose={() => setOverlay('menu')} />}
      {overlay === 'help' && <Help onClose={() => setOverlay('menu')} />}
      {overlay === 'key' && <MapKey onClose={() => setOverlay(null)} />}
      {overlay === 'feedback' && <Feedback state={game} onClose={() => setOverlay('menu')} />}
    </div>,
  );
}
