import React, { useCallback, useRef, useState } from 'react';
import PetCanvas from './PetCanvas';
import ControlPanel from './ControlPanel';
import { useGameLoop, GameLoopSnapshot } from '../hooks/useGameLoop';
import { ActionType } from '../utils/petAi';

const App: React.FC = () => {
  const [snapshot, setSnapshot] = useState<GameLoopSnapshot | null>(null);
  const [weakAlertSignal, setWeakAlertSignal] = useState(0);
  const weakTimerRef = useRef<number | null>(null);

  const handleStateChange = useCallback((snap: GameLoopSnapshot) => {
    setSnapshot(snap);
  }, []);

  const handleWeakAlert = useCallback(() => {
    setWeakAlertSignal((n) => n + 1);
    if (weakTimerRef.current != null) window.clearTimeout(weakTimerRef.current);
    weakTimerRef.current = window.setTimeout(() => {
      // 信号保留
    }, 1500);
  }, []);

  const { trigger, setPetCenter } = useGameLoop({
    onStateChange: handleStateChange,
    onWeakAlert: handleWeakAlert,
  });

  const handleAction = useCallback(
    (a: ActionType) => {
      trigger(a);
    },
    [trigger],
  );

  const pet = snapshot?.pet ?? {
    mood: 80,
    health: 90,
    hunger: 70,
    stage: 'baby' as const,
    isWeak: false,
    isEndangered: false,
    animation: 'idle' as const,
    emoji: '😊',
  };

  const gameTime = snapshot?.gameTime ?? { day: 1, hour: 0, minute: 0 };
  const particles = snapshot?.particles ?? [];
  const endState = snapshot?.endState ?? { ended: false, timeLeft: 0 };
  const animProgress = snapshot?.animationProgress ?? 0;
  const animElapsed = snapshot?.animationElapsed ?? 0;
  const endangeredFlash = snapshot?.endangeredFlash ?? 0;
  const transitionProgress = snapshot?.transitionProgress ?? 1;
  const prevAnimation = snapshot?.prevAnimation ?? 'idle';

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        background: '#fff5e6',
        padding: 12,
        boxSizing: 'border-box',
        gap: 12,
      }}
    >
      <div
        style={{
          width: '70%',
          height: '100%',
          borderRadius: 12,
          overflow: 'hidden',
          boxShadow: '0 4px 20px rgba(180,120,60,0.15)',
          background: '#fff0e0',
        }}
      >
        <PetCanvas
          pet={pet}
          particles={particles}
          gameTime={gameTime}
          animationProgress={animProgress}
          animationElapsed={animElapsed}
          endangeredFlash={endangeredFlash}
          endState={endState}
          transitionProgress={transitionProgress}
          prevAnimation={prevAnimation}
          onPetCenter={setPetCenter}
        />
      </div>

      <div style={{ width: '30%', height: '100%' }}>
        <ControlPanel
          petName="小乖"
          stage={pet.stage}
          mood={pet.mood}
          health={pet.health}
          hunger={pet.hunger}
          isWeak={pet.isWeak}
          isEndangered={pet.isEndangered}
          onAction={handleAction}
          weakAlertSignal={weakAlertSignal}
        />
      </div>
    </div>
  );
};

export default App;
