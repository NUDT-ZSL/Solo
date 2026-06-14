import { useRef, useEffect, useCallback, useState } from 'react';
import { generateDungeon, DungeonMap } from './MapGenerator';
import { CombatEngine, EventBus, GameSnapshot } from './CombatEngine';
import { render, getGridOffset } from './Renderer';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const TARGET_FPS = 60;
const FRAME_TIME = 1000 / TARGET_FPS;

const initialSnapshot: GameSnapshot = {
  playerPos: { x: 0, y: 0 },
  playerHp: 100,
  playerMaxHp: 100,
  playerStatusEffects: [],
  enemies: [],
  projectiles: [],
  particles: [],
  currentFloor: 1,
  playerDamageFlash: 0,
  playerFreezeFlash: 0,
  portalPos: { x: 0, y: 0 },
  grid: [],
  gameover: false,
  hitEnemyId: null,
};

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<CombatEngine | null>(null);
  const eventBusRef = useRef<EventBus>(new EventBus());
  const snapshotRef = useRef<GameSnapshot>(initialSnapshot);
  const keysRef = useRef<Set<string>>(new Set());
  const mouseRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
  const lastTimeRef = useRef<number>(0);
  const animFrameRef = useRef<number>(0);
  const [, forceUpdate] = useState(0);

  const initDungeon = useCallback((engine: CombatEngine) => {
    const dungeon: DungeonMap = generateDungeon();
    engine.loadDungeon(dungeon);
  }, []);

  useEffect(() => {
    const eventBus = eventBusRef.current;
    const engine = new CombatEngine(eventBus);
    engineRef.current = engine;

    eventBus.on('stateUpdate', (data: GameSnapshot) => {
      snapshotRef.current = data;
    });

    eventBus.on('generateNewFloor', () => {
      initDungeon(engine);
    });

    initDungeon(engine);

    const handleKeyDown = (e: KeyboardEvent) => {
      keysRef.current.add(e.key.toLowerCase());

      if (e.key === 'r' && snapshotRef.current.gameover) {
        engine.resetGame();
        return;
      }

      e.preventDefault();
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysRef.current.delete(e.key.toLowerCase());
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      mouseRef.current = {
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      };
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button === 0) {
        const canvas = canvasRef.current;
        if (!canvas) return;
        const rect = canvas.getBoundingClientRect();
        const offset = getGridOffset();
        engine.fireProjectile(
          e.clientX - rect.left,
          e.clientY - rect.top,
          offset.x,
          offset.y,
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
    };
  }, [initDungeon]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let lastKeyProcess = 0;

    const gameLoop = (timestamp: number) => {
      if (lastTimeRef.current === 0) {
        lastTimeRef.current = timestamp;
      }

      const elapsed = timestamp - lastTimeRef.current;
      const dt = Math.min(elapsed / 1000, 0.05);
      lastTimeRef.current = timestamp;

      const engine = engineRef.current;
      if (engine) {
        if (timestamp - lastKeyProcess > 150) {
          const keys = keysRef.current;
          if (keys.has('w') || keys.has('arrowup')) {
            engine.handleMove(0, -1);
            lastKeyProcess = timestamp;
          } else if (keys.has('s') || keys.has('arrowdown')) {
            engine.handleMove(0, 1);
            lastKeyProcess = timestamp;
          } else if (keys.has('a') || keys.has('arrowleft')) {
            engine.handleMove(-1, 0);
            lastKeyProcess = timestamp;
          } else if (keys.has('d') || keys.has('arrowright')) {
            engine.handleMove(1, 0);
            lastKeyProcess = timestamp;
          }
        }

        engine.update(dt);
      }

      render(ctx, snapshotRef.current, timestamp);

      animFrameRef.current = requestAnimationFrame(gameLoop);
    };

    animFrameRef.current = requestAnimationFrame(gameLoop);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      forceUpdate((n) => n + 1);
    }, 500);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background: '#0f172a',
        fontFamily: 'monospace',
        userSelect: 'none',
      }}
    >
      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          border: '2px solid #334155',
          borderRadius: '4px',
          cursor: 'crosshair',
        }}
      />
      <div
        style={{
          marginTop: '12px',
          color: '#64748b',
          fontSize: '13px',
          textAlign: 'center',
          lineHeight: 1.6,
        }}
      >
        <span style={{ color: '#93c5fd' }}>WASD</span> 移动 ·{' '}
        <span style={{ color: '#93c5fd' }}>左键</span> 释放魔法 ·{' '}
        <span style={{ color: '#f6e05e' }}>传送门</span> 进入下一层 ·{' '}
        <span style={{ color: '#ef4444' }}>R</span> 重新开始
      </div>
    </div>
  );
}
