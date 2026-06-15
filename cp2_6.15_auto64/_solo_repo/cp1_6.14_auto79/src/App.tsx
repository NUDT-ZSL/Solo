import { useEffect, useRef, useState, useCallback } from 'react';
import { gameEngine } from './GameEngine';
import { renderManager } from './RenderManager';
import { GameState } from './types';
import { eventBus } from './EventBus';
import { GameUI } from './UI';

const CANVAS_WIDTH = 1000;
const CANVAS_HEIGHT = 600;

function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [gameState, setGameState] = useState<GameState>(gameEngine.getState());
  const draggingSourceId = useRef<string | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width = CANVAS_WIDTH;
    canvas.height = CANVAS_HEIGHT;

    renderManager.attach(canvas);

    gameEngine.setStateChangeCallback((state) => {
      setGameState({ ...state });
      renderManager.render(state);
    });

    gameEngine.start();

    const offStep = (p: { count: number }) => {
      setGameState((prev) => ({ ...prev, stepCount: p.count }));
    };
    eventBus.on('stepUpdate', offStep);

    const offLevelComplete = () => {
    };
    eventBus.on('levelComplete', offLevelComplete);

    return () => {
      gameEngine.stop();
      renderManager.detach();
      eventBus.off('stepUpdate', offStep);
      eventBus.off('levelComplete', offLevelComplete);
    };
  }, []);

  const getCanvasPoint = useCallback((clientX: number, clientY: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  }, []);

  const findSourceAtPoint = useCallback((px: number, py: number): string | null => {
    const state = gameEngine.getState();
    const hitRadius = 22;
    for (const source of state.lightSources) {
      const dx = source.position.x - px;
      const dy = source.position.y - py;
      if (dx * dx + dy * dy <= hitRadius * hitRadius) {
        return source.id;
      }
    }
    return null;
  }, []);

  const computeAngle = useCallback((sourceId: string, px: number, py: number): number => {
    const state = gameEngine.getState();
    const source = state.lightSources.find((s) => s.id === sourceId);
    if (!source) return 0;
    const dx = px - source.position.x;
    const dy = py - source.position.y;
    return Math.atan2(dy, dx);
  }, []);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (gameState.levelComplete) return;
    const point = getCanvasPoint(e.clientX, e.clientY);
    const sourceId = findSourceAtPoint(point.x, point.y);
    if (sourceId) {
      draggingSourceId.current = sourceId;
      eventBus.emit('sourceDragStart', { sourceId });
      const angle = computeAngle(sourceId, point.x, point.y);
      eventBus.emit('sourceDragMove', { sourceId, angle });
      (e.currentTarget as HTMLCanvasElement).setPointerCapture(e.pointerId);
    }
  }, [gameState.levelComplete, getCanvasPoint, findSourceAtPoint, computeAngle]);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!draggingSourceId.current) return;
    const point = getCanvasPoint(e.clientX, e.clientY);
    const angle = computeAngle(draggingSourceId.current, point.x, point.y);
    eventBus.emit('sourceDragMove', { sourceId: draggingSourceId.current, angle });
  }, [getCanvasPoint, computeAngle]);

  const handlePointerUp = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggingSourceId.current) {
      eventBus.emit('sourceDragEnd', { sourceId: draggingSourceId.current });
      draggingSourceId.current = null;
    }
    try {
      (e.currentTarget as HTMLCanvasElement).releasePointerCapture(e.pointerId);
    } catch {}
  }, []);

  const handlePointerLeave = useCallback((e: React.PointerEvent<HTMLCanvasElement>) => {
    if (draggingSourceId.current) {
      const point = getCanvasPoint(e.clientX, e.clientY);
      const angle = computeAngle(draggingSourceId.current, point.x, point.y);
      eventBus.emit('sourceDragMove', { sourceId: draggingSourceId.current, angle });
      eventBus.emit('sourceDragEnd', { sourceId: draggingSourceId.current });
      draggingSourceId.current = null;
    }
  }, [getCanvasPoint, computeAngle]);

  return (
    <div
      style={{
        width: '100%',
        minHeight: '100vh',
        backgroundColor: '#0a0a14',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        padding: '24px 16px 24px',
        boxSizing: 'border-box',
        overflowY: 'auto'
      }}
    >
      <div
        style={{
          textAlign: 'center',
          marginBottom: 20
        }}
      >
        <h1
          style={{
            fontFamily: "'Courier New', monospace",
            fontSize: 36,
            fontWeight: 700,
            margin: 0,
            background: 'linear-gradient(135deg, #ffeb3b 0%, #ff9800 50%, #e040fb 100%)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
            letterSpacing: 2,
            textShadow: '0 0 30px rgba(255, 235, 59, 0.2)'
          }}
        >
          ✦ LuminoPath ✦
        </h1>
        <p
          style={{
            marginTop: 8,
            color: '#9e9e9e',
            fontSize: 13,
            fontFamily: "'Courier New', monospace",
            letterSpacing: 1
          }}
        >
          拖拽光球调整发射角度 · 照亮所有接收器 · 开启传送门
        </p>
      </div>

      <div
        style={{
          maxWidth: CANVAS_WIDTH,
          width: '100%',
          borderRadius: 16,
          overflow: 'hidden',
          boxShadow: '0 0 30px #4a148c',
          position: 'relative'
        }}
      >
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerLeave={handlePointerLeave}
          onPointerCancel={handlePointerUp}
          style={{
            display: 'block',
            width: '100%',
            height: 'auto',
            aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}`,
            cursor: draggingSourceId.current ? 'grabbing' : 'crosshair',
            boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)',
            touchAction: 'none',
            borderRadius: 16,
            userSelect: 'none'
          }}
        />
      </div>

      <div style={{ width: '100%', marginTop: 0 }}>
        <GameUI
          currentLevelId={gameState.levelId}
          stepCount={gameState.stepCount}
          levelName={gameState.levelName}
          levelComplete={gameState.levelComplete}
        />
      </div>

      <div
        style={{
          marginTop: 24,
          padding: '16px 24px',
          backgroundColor: 'rgba(26, 26, 46, 0.6)',
          border: '1px solid rgba(74, 20, 140, 0.4)',
          borderRadius: 12,
          maxWidth: CANVAS_WIDTH,
          width: '100%',
          boxSizing: 'border-box'
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: 12,
            fontSize: 12,
            fontFamily: "'Courier New', monospace",
            color: '#9e9e9e'
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#ffeb3b' }}>●</span>
            <span>光球：拖拽调整角度</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#e0e0e0' }}>━</span>
            <span>镜面：反射光线（0.95效率）</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#e040fb' }}>▲</span>
            <span>棱镜：光线折射分光</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#00e676' }}>◉</span>
            <span>接收器：持续照射激活</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#e040fb' }}>◎</span>
            <span>传送门：全部激活后开启</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ color: '#ff9800' }}>▬</span>
            <span>移动平台：关联接收器驱动</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
