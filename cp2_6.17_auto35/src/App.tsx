import { useEffect, useRef, useState } from 'react';
import { GameEngine } from './GameEngine';
import { UIPanel } from './UIPanel';
import { UIState, CANVAS_WIDTH, CANVAS_HEIGHT } from './entities';

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [uiState, setUiState] = useState<UIState>({
    health: 100,
    minerals: 0,
    energy: 100,
    score: 0,
    showLowEnergyWarning: false,
    gameOver: false,
    radarData: {
      ship: { x: 80, y: CANVAS_HEIGHT / 2 },
      minerals: [],
      mines: [],
      station: { x: CANVAS_WIDTH - 80, y: CANVAS_HEIGHT / 2 },
      scanAngle: 0
    }
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const engine = new GameEngine(canvas, (state) => {
      setUiState(state);
    });
    engineRef.current = engine;
    engine.start();

    return () => {
      engine.destroy();
    };
  }, []);

  const handleRestart = () => {
    if (engineRef.current) {
      engineRef.current.restart();
    }
  };

  return (
    <div className="app-container">
      <div className="game-wrapper">
        <div className="canvas-border">
          <canvas
            ref={canvasRef}
            style={{
              width: CANVAS_WIDTH,
              height: CANVAS_HEIGHT,
              display: 'block'
            }}
          />
          {uiState.showLowEnergyWarning && (
            <div className="canvas-warning">
              ⚠ 能量不足
            </div>
          )}
        </div>
        <UIPanel uiState={uiState} onRestart={handleRestart} />
      </div>
    </div>
  );
}

export default App;
