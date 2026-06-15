import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import type { GameState } from './game/GameEngine';
import { Panel } from './ui/Panel';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [gameState, setGameState] = useState<GameState | null>(null);

  const handleStateUpdate = useCallback((state: GameState) => {
    setGameState(state);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const engine = new GameEngine(canvas, handleStateUpdate);
    engineRef.current = engine;

    const resizeCanvas = () => {
      const rect = container.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0) return;
      engine.resize(rect.width, rect.height);
    };

    resizeCanvas();
    engine.start();

    const resizeObserver = new ResizeObserver(() => {
      resizeCanvas();
    });
    resizeObserver.observe(container);

    return () => {
      resizeObserver.disconnect();
      engine.destroy();
      engineRef.current = null;
    };
  }, [handleStateUpdate]);

  const handleWater = useCallback(() => {
    engineRef.current?.water();
  }, []);

  const handleLightChange = useCallback((value: number) => {
    engineRef.current?.setLight(value);
  }, []);

  const handleSoundToggle = useCallback(() => {
    engineRef.current?.toggleSound();
  }, []);

  const handleMeditate = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    const state = gameState;
    if (state?.isMeditating) {
      engine.exitMeditationManual();
    } else {
      engine.enterMeditation();
    }
  }, [gameState]);

  const state = gameState;

  return (
    <div className="app-container">
      <Panel
        canWater={state?.canWater ?? true}
        waterCooldownMs={state?.waterCooldownMs ?? 0}
        lightLevel={state?.plant.lightLevel ?? 50}
        activeSound={state?.activeSound ?? 'none'}
        mood={state?.plant.mood ?? 0}
        plantStage={state?.plant.stage ?? 'seed'}
        growthPercent={state?.plant.growthPercent ?? 0}
        isMeditating={state?.isMeditating ?? false}
        meditationRemaining={state?.meditationRemaining ?? 0}
        onWater={handleWater}
        onLightChange={handleLightChange}
        onSoundToggle={handleSoundToggle}
        onMeditate={handleMeditate}
      />
      <div className="canvas-container" ref={containerRef}>
        <canvas ref={canvasRef} />
      </div>
    </div>
  );
}
