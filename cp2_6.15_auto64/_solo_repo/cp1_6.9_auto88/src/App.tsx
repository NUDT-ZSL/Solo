import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { HUD } from './components/HUD';
import { TowerType, TOWER_CONFIGS, CELL_SIZE } from './game/types';
import { Tower } from './game/Tower';

interface UIState {
  hp: number;
  gold: number;
  wave: number;
  minerCount: number;
  nextWaveTimer: number;
  waveInProgress: boolean;
  selectedTowerType: TowerType | null;
  selectedPlacedTower: Tower | null;
}

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rafRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const hoverPosRef = useRef<{ x: number; y: number } | null>(null);

  const [uiState, setUiState] = useState<UIState>({
    hp: 100,
    gold: 200,
    wave: 0,
    minerCount: 0,
    nextWaveTimer: 30,
    waveInProgress: false,
    selectedTowerType: null,
    selectedPlacedTower: null,
  });

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const engine = engineRef.current;
    const canvas = canvasRef.current;
    if (!engine || !canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    engine.handleCanvasClick(x, y);
    engine.ensureAudio();
    syncUIState();
  }, []);

  const handleCanvasMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    hoverPosRef.current = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }, []);

  const handleCanvasLeave = useCallback(() => {
    hoverPosRef.current = null;
  }, []);

  const syncUIState = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    setUiState({
      hp: engine.state.hp,
      gold: engine.state.gold,
      wave: engine.state.wave,
      minerCount: engine.state.minerCount,
      nextWaveTimer: engine.state.nextWaveTimer,
      waveInProgress: engine.state.waveInProgress,
      selectedTowerType: engine.state.selectedTowerType,
      selectedPlacedTower: engine.state.selectedPlacedTower,
    });
  }, []);

  const handleSelectTowerType = useCallback((type: TowerType | null) => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.selectTowerType(type);
    syncUIState();
  }, []);

  const handleStartWave = useCallback(() => {
    const engine = engineRef.current;
    if (!engine) return;
    engine.startWaveNow();
    syncUIState();
  }, []);

  const handleUpgradeTower = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !engine.state.selectedPlacedTower) return;
    engine.upgradeTower(engine.state.selectedPlacedTower);
    syncUIState();
  }, []);

  const handleSellTower = useCallback(() => {
    const engine = engineRef.current;
    if (!engine || !engine.state.selectedPlacedTower) return;
    engine.sellTower(engine.state.selectedPlacedTower);
    syncUIState();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const updateCanvasSize = () => {
      canvas.width = Math.min(window.innerWidth, 1400);
      canvas.height = Math.min(window.innerHeight - 20, 820);
    };
    updateCanvasSize();

    const engine = new GameEngine(canvas);
    engineRef.current = engine;

    let uiSyncTimer = 0;

    const loop = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      let dt = (timestamp - lastTimeRef.current) / 1000;
      lastTimeRef.current = timestamp;
      if (dt > 0.05) dt = 0.05;

      engine.update(dt);

      const ctx = canvas.getContext('2d')!;
      engine.render();

      if (hoverPosRef.current && engine.state.selectedTowerType) {
        const { x, y } = hoverPosRef.current;
        const gridX = Math.floor(x / CELL_SIZE);
        const gridY = Math.floor(y / CELL_SIZE);
        const canPlace = engine.canPlaceTower(gridX, gridY);
        const config = TOWER_CONFIGS[engine.state.selectedTowerType];
        const cx = gridX * CELL_SIZE + CELL_SIZE / 2;
        const cy = gridY * CELL_SIZE + CELL_SIZE / 2;

        ctx.save();
        ctx.globalAlpha = 0.6;
        ctx.strokeStyle = canPlace ? config.color : '#FF4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([4, 4]);
        ctx.beginPath();
        ctx.arc(cx, cy, config.baseRadius, 0, Math.PI * 2);
        ctx.stroke();

        ctx.globalAlpha = canPlace ? 0.4 : 0.25;
        ctx.fillStyle = canPlace ? config.color : '#FF4444';
        ctx.fillRect(gridX * CELL_SIZE, gridY * CELL_SIZE, CELL_SIZE, CELL_SIZE);

        ctx.globalAlpha = canPlace ? 0.9 : 0.5;
        ctx.strokeStyle = canPlace ? '#FFFFFF' : '#FF4444';
        ctx.lineWidth = 2;
        ctx.setLineDash([]);
        ctx.strokeRect(gridX * CELL_SIZE + 1, gridY * CELL_SIZE + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        ctx.restore();
      }

      uiSyncTimer += dt;
      if (uiSyncTimer >= 0.1) {
        uiSyncTimer = 0;
        syncUIState();
      }

      rafRef.current = requestAnimationFrame(loop);
    };

    rafRef.current = requestAnimationFrame(loop);
    window.addEventListener('resize', updateCanvasSize);

    return () => {
      cancelAnimationFrame(rafRef.current);
      window.removeEventListener('resize', updateCanvasSize);
    };
  }, []);

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(180deg, #0B0C2A 0%, #1E1A3A 100%)',
      overflow: 'hidden',
      position: 'relative',
    }}>
      <div style={{
        position: 'relative',
        boxShadow: '0 0 60px rgba(68, 136, 255, 0.2), inset 0 0 100px rgba(0,0,0,0.4)',
        borderRadius: 8,
        overflow: 'hidden',
      }}>
        <canvas
          ref={canvasRef}
          onClick={handleCanvasClick}
          onMouseMove={handleCanvasMove}
          onMouseLeave={handleCanvasLeave}
          style={{
            display: 'block',
            cursor: uiState.selectedTowerType ? 'crosshair' : 'default',
          }}
        />
        <HUD
          hp={uiState.hp}
          maxHp={100}
          gold={uiState.gold}
          wave={uiState.wave}
          minerCount={uiState.minerCount}
          nextWaveTimer={uiState.nextWaveTimer}
          waveInProgress={uiState.waveInProgress}
          selectedTowerType={uiState.selectedTowerType}
          selectedPlacedTower={uiState.selectedPlacedTower}
          onSelectTowerType={handleSelectTowerType}
          onStartWave={handleStartWave}
          onUpgradeTower={handleUpgradeTower}
          onSellTower={handleSellTower}
        />
      </div>
    </div>
  );
}

export default App;
