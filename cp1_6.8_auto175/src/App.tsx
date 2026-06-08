import { useRef, useState, useEffect, useCallback } from "react";
import UILayer from "./UILayer";
import GameEngine from "./GameEngine";

interface GameState {
  level: number;
  resonanceCount: number;
  totalResonance: number;
  levelComplete: boolean;
  hintNode: null;
}

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>({
    level: 1,
    resonanceCount: 0,
    totalResonance: 0,
    levelComplete: false,
    hintNode: null,
  });

  const handleStateChange = useCallback(
    (state: Omit<GameState, "hintNode">) => {
      setGameState((prev) => ({ ...prev, ...state }));
    },
    []
  );

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas, handleStateChange);
    engineRef.current = engine;
    engine.init();

    return () => {
      engine.destroy();
      engineRef.current = null;
    };
  }, [handleStateChange]);

  const handleReset = useCallback(() => {
    engineRef.current?.reset();
  }, []);

  const handleHint = useCallback(() => {
    engineRef.current?.hint();
  }, []);

  return (
    <>
      <canvas
        ref={canvasRef}
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 0,
        }}
      />
      <UILayer
        level={gameState.level}
        resonanceCount={gameState.resonanceCount}
        totalResonance={gameState.totalResonance}
        levelComplete={gameState.levelComplete}
        onReset={handleReset}
        onHint={handleHint}
      />
    </>
  );
}
