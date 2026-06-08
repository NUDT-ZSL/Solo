import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, GameState } from './GameEngine';
import UILayer from './UILayer';
import './App.css';

const initialState: GameState = {
  fireflyCount: 0,
  cycleCount: 0,
  unlockedCount: 0,
  totalFlowers: 6,
  flowers: [],
  newlyUnlocked: null,
  showUnlock: false,
  showButterfly: false,
  selectedFlower: null,
  score: 0,
};

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [gameState, setGameState] = useState<GameState>(initialState);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas);
    engineRef.current = engine;
    engine.setOnStateChange(setGameState);
    engine.init();
    engine.start();

    return () => {
      engine.stop();
    };
  }, []);

  const handleReset = useCallback(() => {
    engineRef.current?.reset();
  }, []);

  const handleFlowerClick = useCallback((flower: any) => {
    engineRef.current?.selectFlower(flower);
  }, []);

  const handleCloseCard = useCallback(() => {
    engineRef.current?.selectFlower(null);
  }, []);

  return (
    <div className="game-container">
      <canvas ref={canvasRef} className="game-canvas" />
      <UILayer
        state={gameState}
        onReset={handleReset}
        onFlowerClick={handleFlowerClick}
        onCloseCard={handleCloseCard}
      />
    </div>
  );
}

export default App;
