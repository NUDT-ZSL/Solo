import { useRef, useEffect, useCallback } from 'react';
import { useGameStore } from './store';
import { CANVAS_WIDTH, CANVAS_HEIGHT, CELL_SIZE, GRID_COLS, GRID_ROWS, TOWER_STATS } from './types';
import { render } from './Renderer';
import { startGameLoop, stopGameLoop, isCellPlaceable } from './GameEngine';
import { getTowerCenter } from './types';

export default function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hoverCellRef = useRef<{ gx: number; gy: number } | null>(null);
  const animTimeRef = useRef(0);

  const towers = useGameStore((s) => s.towers);
  const enemies = useGameStore((s) => s.enemies);
  const projectiles = useGameStore((s) => s.projectiles);
  const particles = useGameStore((s) => s.particles);
  const runeEffects = useGameStore((s) => s.runeEffects);
  const selectedTowerType = useGameStore((s) => s.selectedTowerType);
  const selectedPlacedTower = useGameStore((s) => s.selectedPlacedTower);
  const isPaused = useGameStore((s) => s.isPaused);
  const isGameOver = useGameStore((s) => s.isGameOver);
  const isVictory = useGameStore((s) => s.isVictory);
  const placeTower = useGameStore((s) => s.placeTower);
  const setSelectedTowerType = useGameStore((s) => s.setSelectedTowerType);
  const setSelectedPlacedTower = useGameStore((s) => s.setSelectedPlacedTower);
  const togglePause = useGameStore((s) => s.togglePause);
  const startWave = useGameStore((s) => s.startWave);
  const waveInProgress = useGameStore((s) => s.waveInProgress);
  const currentWave = useGameStore((s) => s.currentWave);
  const longPressMenuPos = useGameStore((s) => s.longPressMenuPos);
  const setLongPressMenuPos = useGameStore((s) => s.setLongPressMenuPos);

  const dragRef = useRef<{ type: string; startX: number; startY: number; isDragging: boolean } | null>(null);
  const longPressTimerRef = useRef<number | null>(null);

  useEffect(() => {
    startGameLoop();
    return () => stopGameLoop();
  }, []);

  useEffect(() => {
    animTimeRef.current = performance.now();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    animTimeRef.current = performance.now();
    render(ctx, towers, enemies, projectiles, particles, runeEffects, hoverCellRef.current, selectedPlacedTower, animTimeRef.current);
  }, [towers, enemies, projectiles, particles, runeEffects, selectedPlacedTower, isPaused]);

  const getCanvasCoords = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }, []);

  const getGridCell = useCallback((clientX: number, clientY: number) => {
    const coords = getCanvasCoords(clientX, clientY);
    if (!coords) return null;
    return {
      gx: Math.floor(coords.x / CELL_SIZE),
      gy: Math.floor(coords.y / CELL_SIZE),
    };
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent) => {
    const cell = getGridCell(e.clientX, e.clientY);
    if (!cell) return;

    if (selectedTowerType) {
      const success = placeTower(selectedTowerType, cell.gx, cell.gy);
      if (success) {
        setSelectedTowerType(null);
      }
      return;
    }

    const clickedTower = towers.find((t) => t.gridX === cell.gx && t.gridY === cell.gy);
    if (clickedTower) {
      setSelectedPlacedTower(clickedTower);
      dragRef.current = { type: 'towerClick', startX: e.clientX, startY: e.clientY, isDragging: false };
    } else {
      setSelectedPlacedTower(null);
    }

    longPressTimerRef.current = window.setTimeout(() => {
      if (cell && isCellPlaceable(cell.gx, cell.gy, towers)) {
        setLongPressMenuPos(cell);
      }
    }, 500);
  }, [selectedTowerType, towers, placeTower, setSelectedTowerType, setSelectedPlacedTower, getGridCell, setLongPressMenuPos]);

  const handlePointerMove = useCallback((e: React.PointerEvent) => {
    const cell = getGridCell(e.clientX, e.clientY);
    hoverCellRef.current = cell;

    if (longPressTimerRef.current) {
      const dx = e.clientX - (dragRef.current?.startX || 0);
      const dy = e.clientY - (dragRef.current?.startY || 0);
      if (Math.abs(dx) > 10 || Math.abs(dy) > 10) {
        clearTimeout(longPressTimerRef.current);
        longPressTimerRef.current = null;
      }
    }

    const canvas = canvasRef.current;
    if (canvas) {
      const ctx = canvas.getContext('2d');
      if (ctx) {
        render(ctx, towers, enemies, projectiles, particles, runeEffects, hoverCellRef.current, selectedPlacedTower, performance.now());
      }
    }
  }, [towers, enemies, projectiles, particles, runeEffects, selectedPlacedTower, getGridCell]);

  const handlePointerUp = useCallback(() => {
    if (longPressTimerRef.current) {
      clearTimeout(longPressTimerRef.current);
      longPressTimerRef.current = null;
    }
    dragRef.current = null;
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'p' || e.key === 'P') {
        togglePause();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [togglePause]);

  return (
    <div ref={containerRef} className="relative w-full h-full flex items-center justify-center" style={{ background: '#0D1B2A' }}>
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="max-w-full max-h-full"
        style={{ imageRendering: 'auto', touchAction: 'none', cursor: selectedTowerType ? 'crosshair' : 'default' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />

      {isPaused && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50 z-20">
          <div className="text-center">
            <div className="text-6xl mb-4" style={{ fontFamily: 'Pirata One, cursive', color: '#F4D03F' }}>⏸</div>
            <div className="text-2xl font-bold" style={{ fontFamily: 'Pirata One, cursive', color: '#F4D03F' }}>游戏暂停</div>
            <div className="text-sm mt-2" style={{ color: '#D4B896' }}>按 P 键或点击暂停按钮继续</div>
          </div>
        </div>
      )}

      {isGameOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
          <div className="text-center">
            <div className="text-5xl mb-4" style={{ fontFamily: 'Pirata One, cursive', color: '#E74C3C' }}>灯塔陨落</div>
            <div className="text-lg mb-6" style={{ color: '#D4B896' }}>暗影海怪淹没了孤岛...</div>
            <button
              className="px-6 py-2 rounded-lg font-bold text-lg"
              style={{ background: '#D4B896', color: '#1A5276', fontFamily: 'Noto Sans SC, sans-serif' }}
              onClick={() => useGameStore.getState().resetGame()}
            >
              重新开始
            </button>
          </div>
        </div>
      )}

      {isVictory && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/60 z-20">
          <div className="text-center">
            <div className="text-5xl mb-4" style={{ fontFamily: 'Pirata One, cursive', color: '#F4D03F' }}>晨曦胜利！</div>
            <div className="text-lg mb-6" style={{ color: '#D4B896' }}>所有暗影海怪已被击退！</div>
            <button
              className="px-6 py-2 rounded-lg font-bold text-lg"
              style={{ background: '#D4B896', color: '#1A5276', fontFamily: 'Noto Sans SC, sans-serif' }}
              onClick={() => useGameStore.getState().resetGame()}
            >
              再来一局
            </button>
          </div>
        </div>
      )}

      {longPressMenuPos && (
        <div
          className="absolute z-30 bg-black/80 rounded-lg p-2 flex flex-col gap-1"
          style={{
            left: `${(longPressMenuPos.gx * CELL_SIZE + CELL_SIZE / 2) / CANVAS_WIDTH * 100}%`,
            top: `${(longPressMenuPos.gy * CELL_SIZE) / CANVAS_HEIGHT * 100}%`,
            transform: 'translateX(-50%)',
          }}
        >
          {(['arrow', 'cannon', 'magic'] as const).map((type) => {
            const stats = TOWER_STATS[type][0];
            return (
              <button
                key={type}
                className="px-3 py-1 rounded text-sm whitespace-nowrap"
                style={{ background: '#2E4057', color: '#F4D03F', fontFamily: 'Noto Sans SC, sans-serif' }}
                onClick={() => {
                  placeTower(type, longPressMenuPos.gx, longPressMenuPos.gy);
                  setLongPressMenuPos(null);
                }}
              >
                {type === 'arrow' ? '🏹' : type === 'cannon' ? '💣' : '✨'} {stats.cost}金
              </button>
            );
          })}
          <button
            className="px-3 py-1 rounded text-sm"
            style={{ background: '#4A235A', color: '#ccc', fontFamily: 'Noto Sans SC, sans-serif' }}
            onClick={() => setLongPressMenuPos(null)}
          >
            取消
          </button>
        </div>
      )}
    </div>
  );
}
