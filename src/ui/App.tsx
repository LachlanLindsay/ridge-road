import { useEffect, useMemo, useRef, useState } from 'preact/hooks';
import { chooseEvent, endDay, newGame, resolveHalfDay, type ChoiceId, type EveningOrders, type GameState, type Mode } from '../engine';
import { CampSheet } from './CampSheet';
import { normalizeDraft, toPlan, type Draft } from './draft';
import { EndScreen } from './EndScreen';
import { EventModal } from './EventModal';
import { mapDraw } from './geometry';
import { Grip, readMapSize, writeMapSize, type MapSize } from './MapSize';
import { MapView } from './MapView';
import { Help, Journal, MapKey, Menu, Party, type OverlayId } from './Overlays';
import { PlanSheet } from './PlanSheet';
import { clearSave, readDraft, readSave, writeDraft, writeSave } from './save';
import { Briefing, Title } from './Title';
import { TopBar } from './TopBar';

type Screen = 'title' | 'briefing' | 'play';

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

export function App({ resume }: { resume: string | null }) {
  const [game, setGame] = useState<GameState | null>(() => readSave(resume));
  const [screen, setScreen] = useState<Screen>('title');
  const [draft, setDraft] = useState<Draft | null>(() => readDraft());
  const [selected, setSelected] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<OverlayId | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [mapSize, setMapSizeState] = useState<MapSize>(() => readMapSize());
  const sheet = useRef<HTMLDivElement>(null);
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

  const start = (mode: Mode) => {
    clearSave();
    setGame(newGame({ seed: startSeed(), mode }));
    setDraft(null);
    setSelected(null);
    setOverlay(null);
    setScreen('briefing');
  };

  if (screen === 'title' || !game) return <Title save={game} onContinue={() => setScreen('play')} onStart={start} />;
  if (screen === 'briefing') return <Briefing onDone={() => setScreen('play')} />;
  if (game.phase === 'over') return <EndScreen state={game} onNew={() => setScreen('title')} onTitle={() => setScreen('title')} />;

  const go = () => {
    if (!current) return;
    setDraft(current);
    setSelected(null);
    act(() => resolveHalfDay(game, toPlan(game, current)).state);
  };
  const choose = (c: ChoiceId) => act(() => chooseEvent(game, c));
  const makeCamp = (orders: EveningOrders) => {
    setSelected(null);
    act(() => endDay(game, orders).state);
  };

  return (
    <div class="play" data-map={mapSize} ref={play}>
      <TopBar state={game} onMenu={() => setOverlay('menu')} />
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
      {game.pending.length > 0 && <EventModal state={game} onChoose={choose} />}
      {overlay === 'menu' && (
        <Menu
          state={game}
          open={setOverlay}
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
      {overlay === 'journal' && <Journal state={game} onClose={() => setOverlay('menu')} />}
      {overlay === 'party' && <Party state={game} onClose={() => setOverlay('menu')} />}
      {overlay === 'help' && <Help onClose={() => setOverlay('menu')} />}
      {overlay === 'key' && <MapKey onClose={() => setOverlay(null)} />}
    </div>
  );
}
