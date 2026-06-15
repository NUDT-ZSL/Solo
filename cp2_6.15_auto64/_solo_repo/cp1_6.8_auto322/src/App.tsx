import React, { useState, useRef, useCallback, useEffect } from 'react';
import BreathingCanvas from './BreathingCanvas';
import ControlPanel from './ControlPanel';
import {
  BREATHING_PATTERNS,
  BreathingState,
  computeBreathingState,
  estimateHeartRate,
  computeRelaxationIndex,
  playBreathSound,
  BreathingPhase,
} from './utils/breathingUtils';

export default function App() {
  const [currentMode, setCurrentMode] = useState<string>('4-7-8');
  const [isRunning, setIsRunning] = useState(false);
  const [durationMultiplier, setDurationMultiplier] = useState(1.0);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [glassBlurStrength, setGlassBlurStrength] = useState(5);
  const [breathingState, setBreathingState] = useState<BreathingState>({
    phase: 'idle',
    phaseProgress: 0,
    cycleCount: 0,
    totalElapsed: 0,
  });
  const [heartRate, setHeartRate] = useState(72);
  const [relaxationIndex, setRelaxationIndex] = useState(0);

  const startTimeRef = useRef<number>(0);
  const elapsedRef = useRef<number>(0);
  const rafRef = useRef<number>(0);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const prevPhaseRef = useRef<BreathingPhase>('idle');

  const tick = useCallback(() => {
    if (!startTimeRef.current) startTimeRef.current = performance.now();
    const elapsed = performance.now() - startTimeRef.current + elapsedRef.current;

    const pattern = BREATHING_PATTERNS[currentMode];
    const state = computeBreathingState(pattern, durationMultiplier, elapsed);

    if (soundEnabled && prevPhaseRef.current !== state.phase && state.phase !== 'idle') {
      playBreathSound(state.phase, audioCtxRef);
    }
    prevPhaseRef.current = state.phase;

    setBreathingState(state);

    if (state.cycleCount > 0 || state.totalElapsed > 5000) {
      setHeartRate(estimateHeartRate(state.cycleCount, state.totalElapsed / 1000));
      setRelaxationIndex(computeRelaxationIndex(state.cycleCount, state.totalElapsed / 1000));
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [currentMode, durationMultiplier, soundEnabled]);

  const handleStartStop = useCallback(() => {
    if (isRunning) {
      cancelAnimationFrame(rafRef.current);
      elapsedRef.current += performance.now() - startTimeRef.current;
      startTimeRef.current = 0;
      setIsRunning(false);
      setBreathingState((prev) => ({ ...prev, phase: 'idle' }));
      prevPhaseRef.current = 'idle';
    } else {
      startTimeRef.current = performance.now();
      prevPhaseRef.current = 'idle';
      rafRef.current = requestAnimationFrame(tick);
      setIsRunning(true);
    }
  }, [isRunning, tick]);

  const handleModeChange = useCallback((mode: string) => {
    if (isRunning) return;
    setCurrentMode(mode);
    elapsedRef.current = 0;
    startTimeRef.current = 0;
    setHeartRate(72);
    setRelaxationIndex(0);
    setBreathingState({ phase: 'idle', phaseProgress: 0, cycleCount: 0, totalElapsed: 0 });
  }, [isRunning]);

  useEffect(() => {
    return () => {
      cancelAnimationFrame(rafRef.current);
    };
  }, []);

  return (
    <div className="app-root">
      <div className="canvas-area">
        <BreathingCanvas
          breathingState={breathingState}
          glassBlurStrength={glassBlurStrength}
        />
      </div>
      <ControlPanel
        currentMode={currentMode}
        onModeChange={handleModeChange}
        durationMultiplier={durationMultiplier}
        onDurationChange={setDurationMultiplier}
        soundEnabled={soundEnabled}
        onSoundToggle={() => setSoundEnabled((v) => !v)}
        glassBlurStrength={glassBlurStrength}
        onGlassBlurChange={setGlassBlurStrength}
        isRunning={isRunning}
        onStartStop={handleStartStop}
        heartRate={heartRate}
        relaxationIndex={relaxationIndex}
        cycleCount={breathingState.cycleCount}
      />
    </div>
  );
}
