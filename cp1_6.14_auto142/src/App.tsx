import { useEffect, useRef, useState } from 'react';
import {
  CombatEngine,
  EventBus,
  EVENTS,
  GameSnapshot,
  setupMapGenerationBridge,
} from './CombatEngine';
import { render, triggerFloorBanner } from './Renderer';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const eventBusRef = useRef<EventBus>(new EventBus());
  const engineRef = useRef<CombatEngine | null>(null);
  const snapshotRef = useRef<GameSnapshot | null>(null);
  const animFrameRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const keysDownRef = useRef<Set<string>>(new Set());
  const lastMoveProcessedRef = useRef<number>(0);
  const cleanupRef = useRef<Array<() => void>>([]);
  const [, tickRender] = useState(0);

  useEffect(() => {
    const eventBus = eventBusRef.current;
    const cleanup: Array<() => void> = [];

    const mapBridgeOff = setupMapGenerationBridge(eventBus);
    cleanup.push(mapBridgeOff);

    const engine = new CombatEngine(eventBus);
    engineRef.current = engine;
    cleanup.push(() => engine.destroy());

    const stateUpdateOff = eventBus.on(EVENTS.STATE_UPDATE, (data) => {
      snapshotRef.current = data as GameSnapshot;
    });
    cleanup.push(stateUpdateOff);

    const floorDescendOff = eventBus.on(EVENTS.FLOOR_DESCEND, (data) => {
      const info = data as { floor: number; difficulty: number };
      triggerFloorBanner(info.floor, performance.now());
    });
    cleanup.push(floorDescendOff);

    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.toLowerCase();
      keysDownRef.current.add(key);

      if (key === 'r' && snapshotRef.current?.gameover) {
        eventBus.emit(EVENTS.RESET_GAME);
        return;
      }

      if (['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright'].includes(key)) {
        e.preventDefault();
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      keysDownRef.current.delete(e.key.toLowerCase());
    };

    const handleMouseMove = (e: MouseEvent) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      (window as unknown as { __drMouseX?: number; __drMouseY?: number }).__drMouseX =
        (e.clientX - rect.left) * (canvas.width / rect.width);
      (window as unknown as { __drMouseX?: number; __drMouseY?: number }).__drMouseY =
        (e.clientY - rect.top) * (canvas.height / rect.height);
    };

    const handleMouseDown = (e: MouseEvent) => {
      if (e.button !== 0) return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = (e.clientX - rect.left) * (canvas.width / rect.width);
      const mouseY = (e.clientY - rect.top) * (canvas.height / rect.height);
      eventBus.emit(EVENTS.INPUT_FIRE, { mouseX, mouseY });
    };

    const handleKeyDownSpace = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        const mouseX =
          (window as unknown as { __drMouseX?: number; __drMouseY?: number }).__drMouseX ?? 0;
        const mouseY =
          (window as unknown as { __drMouseX?: number; __drMouseY?: number }).__drMouseY ?? 0;
        if (mouseX || mouseY) {
          eventBus.emit(EVENTS.INPUT_FIRE, { mouseX, mouseY });
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keydown', handleKeyDownSpace);
    window.addEventListener('keyup', handleKeyUp);
    cleanup.push(() => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keydown', handleKeyDownSpace);
      window.removeEventListener('keyup', handleKeyUp);
    });

    const canvasEl = canvasRef.current;
    if (canvasEl) {
      canvasEl.addEventListener('mousemove', handleMouseMove);
      canvasEl.addEventListener('mousedown', handleMouseDown);
      cleanup.push(() => {
        canvasEl.removeEventListener('mousemove', handleMouseMove);
        canvasEl.removeEventListener('mousedown', handleMouseDown);
      });
    }

    cleanupRef.current = cleanup;
    return () => {
      for (const off of cleanupRef.current) {
        try {
          off();
        } catch {
          /* ignore */
        }
      }
      cleanupRef.current = [];
      cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const eventBus = eventBusRef.current;

    const loop = (timestamp: number) => {
      if (lastTimeRef.current === 0) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;
      const dt = Math.min(0.05, elapsed / 1000);
      lastTimeRef.current = timestamp;

      const keys = keysDownRef.current;
      if (timestamp - lastMoveProcessedRef.current >= 150) {
        let dx = 0;
        let dy = 0;
        if (keys.has('w') || keys.has('arrowup')) dy = -1;
        else if (keys.has('s') || keys.has('arrowdown')) dy = 1;
        else if (keys.has('a') || keys.has('arrowleft')) dx = -1;
        else if (keys.has('d') || keys.has('arrowright')) dx = 1;

        if (dx !== 0 || dy !== 0) {
          eventBus.emit(EVENTS.INPUT_MOVE, { dx, dy });
          lastMoveProcessedRef.current = timestamp;
        }
      }

      const engine = engineRef.current;
      if (engine) {
        engine.update(dt);
      }

      const snap = snapshotRef.current;
      if (snap) {
        render(ctx, snap, timestamp);
      }

      tickRender((n) => (n + 1) & 0xffff);
      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, []);

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100vh',
        background:
          'radial-gradient(ellipse at center, #172036 0%, #0f172a 70%, #0a0f1e 100%)',
        fontFamily: 'monospace',
        userSelect: 'none',
        padding: '16px',
      }}
    >
      <h1
        style={{
          color: '#f6e05e',
          fontSize: '28px',
          letterSpacing: '6px',
          marginBottom: '10px',
          textShadow: '0 0 8px rgba(246,224,94,0.35)',
          fontWeight: 800,
        }}
      >
        DUNGEON  REACH
      </h1>

      <canvas
        ref={canvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        style={{
          border: '2px solid #334155',
          borderRadius: '6px',
          cursor: 'crosshair',
          boxShadow:
            '0 0 0 1px rgba(15,23,42,0.9), 0 20px 60px -15px rgba(0,0,0,0.6)',
          maxWidth: '100%',
        }}
      />

      <div
        style={{
          marginTop: '14px',
          color: '#64748b',
          fontSize: '13px',
          textAlign: 'center',
          lineHeight: 1.8,
          display: 'flex',
          gap: '20px',
          flexWrap: 'wrap',
          justifyContent: 'center',
          maxWidth: CANVAS_WIDTH,
        }}
      >
        <LegendRow color="#93c5fd" label="WASD / 方向键" desc="移动" />
        <LegendRow color="#f6e05e" label="左键 / 空格" desc="释放魔法" />
        <LegendRow color="#facc15" label="金色传送门" desc="进入下一层" />
        <LegendRow color="#ef4444" label="R" desc="死亡后重新开始" />
      </div>

      <div
        style={{
          marginTop: '6px',
          color: '#475569',
          fontSize: '11px',
        }}
      >
        Tip: 命中带冻结状态的敌人会造成双倍伤害！燃烧每秒损失 5% 生命 · 30% 触发率
      </div>
    </div>
  );
}

function LegendRow({
  color,
  label,
  desc,
}: {
  color: string;
  label: string;
  desc: string;
}) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
      <span
        style={{
          color,
          padding: '2px 8px',
          background: 'rgba(15,23,42,0.6)',
          border: `1px solid ${color}33`,
          borderRadius: '4px',
          fontSize: '12px',
        }}
      >
        {label}
      </span>
      <span style={{ color: '#94a3b8' }}>{desc}</span>
    </div>
  );
}
