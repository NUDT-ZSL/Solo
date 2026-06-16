import React, { useReducer, useEffect, useCallback, useRef } from 'react';
import PetCanvas from './PetCanvas';
import StatusBar from './ui/StatusBar';
import BottomPanel from './ui/BottomPanel';
import { GameEngine, type PetState, type MoodType } from './GameEngine';
import { ANIMATION_CONFIG } from './GameEngine';

type PetAction =
  | { type: 'FEED' }
  | { type: 'BATH' }
  | { type: 'PLAY' }
  | { type: 'SLEEP' }
  | { type: 'TICK' }
  | { type: 'ADVANCE_FRAME' }
  | { type: 'LOAD'; payload: PetState }
  | { type: 'RESET_ANIMATION' };

const STORAGE_KEY = 'pocket-pet-state';

const loadState = (): PetState | null => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      return JSON.parse(saved) as PetState;
    }
  } catch {
    // ignore
  }
  return null;
};

const saveState = (state: PetState) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // ignore
  }
};

const initialState: PetState = GameEngine.getInitialState();

const reducer = (state: PetState, action: PetAction): PetState => {
  switch (action.type) {
    case 'LOAD':
      return action.payload;
    case 'FEED':
      return GameEngine.feed(state);
    case 'BATH':
      return GameEngine.bath(state);
    case 'PLAY':
      return GameEngine.play(state);
    case 'SLEEP':
      return GameEngine.sleep(state);
    case 'TICK': {
      let newState = GameEngine.updateSimulatedTime(state);
      newState = GameEngine.applyNaturalDecay(newState);
      newState = GameEngine.updateHappiness(newState);
      const shouldBeNight = GameEngine.checkNightMode(newState.simulatedHour);
      if (shouldBeNight !== newState.isNightMode) {
        newState = GameEngine.toggleNightMode(newState, shouldBeNight);
      }
      return newState;
    }
    case 'ADVANCE_FRAME':
      return GameEngine.advanceAnimationFrame(state);
    case 'RESET_ANIMATION':
      return GameEngine.resetToIdle(state);
    default:
      return state;
  }
};

const App: React.FC = () => {
  const [state, dispatch] = useReducer(reducer, initialState);
  const saveTimeoutRef = useRef<number | null>(null);
  const animationTimeoutRef = useRef<number | null>(null);
  const isLoadedRef = useRef(false);

  useEffect(() => {
    const saved = loadState();
    if (saved) {
      const now = Date.now();
      const offlineTime = now - saved.lastUpdateTime;
      const offlineHungerDecay = Math.floor(offlineTime / 10000);
      const offlineCleanDecay = Math.floor(offlineTime / 15000);
      const restoredState: PetState = {
        ...saved,
        lastUpdateTime: now,
        lastHungerDecayTime: now,
        lastCleanDecayTime: now,
        hunger: GameEngine.clamp(saved.hunger - offlineHungerDecay, 0, 100),
        cleanliness: GameEngine.clamp(saved.cleanliness - offlineCleanDecay, 0, 100),
        simulatedHour: new Date().getHours(),
      };
      restoredState.isNightMode = GameEngine.checkNightMode(restoredState.simulatedHour);
      if (restoredState.isNightMode) {
        restoredState.currentAnimation = 'sleep';
      }
      dispatch({ type: 'LOAD', payload: restoredState });
    }
    isLoadedRef.current = true;
  }, []);

  useEffect(() => {
    if (!isLoadedRef.current) return;
    if (saveTimeoutRef.current) {
      window.clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = window.setTimeout(() => {
      saveState(state);
    }, 1000);
    return () => {
      if (saveTimeoutRef.current) {
        window.clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [state]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      dispatch({ type: 'TICK' });
    }, 1000);
    return () => window.clearInterval(interval);
  }, []);

  const scheduleAnimationReset = useCallback(() => {
    if (animationTimeoutRef.current) {
      window.clearTimeout(animationTimeoutRef.current);
    }
    const config = ANIMATION_CONFIG[state.currentAnimation];
    const duration = config.frames * config.interval * 2;
    animationTimeoutRef.current = window.setTimeout(() => {
      dispatch({ type: 'RESET_ANIMATION' });
    }, duration);
  }, [state.currentAnimation]);

  useEffect(() => {
    if (state.currentAnimation !== 'idle' && state.currentAnimation !== 'sleep') {
      scheduleAnimationReset();
    }
    return () => {
      if (animationTimeoutRef.current) {
        window.clearTimeout(animationTimeoutRef.current);
      }
    };
  }, [state.currentAnimation, scheduleAnimationReset]);

  const handleFeed = useCallback(() => {
    dispatch({ type: 'FEED' });
  }, []);

  const handleBath = useCallback(() => {
    dispatch({ type: 'BATH' });
  }, []);

  const handlePlay = useCallback(() => {
    dispatch({ type: 'PLAY' });
  }, []);

  const handleSleep = useCallback(() => {
    dispatch({ type: 'SLEEP' });
  }, []);

  const handleFrameAdvance = useCallback(() => {
    dispatch({ type: 'ADVANCE_FRAME' });
  }, []);

  const mood: MoodType = GameEngine.getMood(state);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '16px',
        padding: '32px 16px',
        minHeight: '100vh',
        boxSizing: 'border-box',
      }}
    >
      <StatusBar state={state} mood={mood} />
      <PetCanvas state={state} onFrameAdvance={handleFrameAdvance} />
      <BottomPanel
        onFeed={handleFeed}
        onBath={handleBath}
        onPlay={handlePlay}
        onSleep={handleSleep}
        isNightMode={state.isNightMode}
      />
    </div>
  );
};

export default App;
