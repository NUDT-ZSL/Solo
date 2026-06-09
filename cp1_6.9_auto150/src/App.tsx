import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine, EngineEvents } from './GameEngine';
import { Renderer } from './Renderer';
import { soundManager } from './SoundManager';
import { DragState, Vector2, GAME_CONFIG } from './types';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const animationRef = useRef<number>(0);
  const lastTimeRef = useRef<number>(0);
  const dragStateRef = useRef<DragState>({
    dragging: false,
    startPos: null,
    currentPos: null
  });

  const [uiLevel, setUiLevel] = useState(1);
  const [uiProgress, setUiProgress] = useState({ lit: 0, total: 36 });
  const [soundReady, setSoundReady] = useState(false);

  const calculateCanvasSize = useCallback(() => {
    if (!containerRef.current) return { width: GAME_CONFIG.MIN_WIDTH, height: GAME_CONFIG.MIN_HEIGHT };
    const container = containerRef.current;
    const cw = container.clientWidth;
    const ch = container.clientHeight;
    const ratio = GAME_CONFIG.CANVAS_RATIO;

    let width: number, height: number;
    if (cw / ch > ratio) {
      height = Math.min(ch, cw / ratio);
      width = height * ratio;
    } else {
      width = Math.min(cw, ch * ratio);
      height = width / ratio;
    }

    width = Math.max(width, GAME_CONFIG.MIN_WIDTH);
    height = Math.max(height, GAME_CONFIG.MIN_HEIGHT);
    return { width: Math.floor(width), height: Math.floor(height) };
  }, []);

  const handleAggregation = useCallback((_pos: Vector2, _hue: number) => {
    soundManager.playAggregationSound();
  }, []);

  const handleBallDissipate = useCallback((_pos: Vector2, _hue: number) => {
    soundManager.playGravityBallDissipate();
  }, []);

  const handleZoneLit = useCallback(() => {
    soundManager.playZoneLit();
  }, []);

  const handleLevelUp = useCallback(() => {
    setUiLevel(engineRef.current?.getLevel() ?? 1);
  }, []);

  useEffect(() => {
    const init = async () => {
      await soundManager.init();
      setSoundReady(true);
    };
    init();
  }, []);

  useEffect(() => {
    if (!canvasRef.current || !containerRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const events: EngineEvents = {
      onAggregation: handleAggregation,
      onBallDissipate: handleBallDissipate,
      onZoneLit: handleZoneLit,
      onLevelUp: handleLevelUp
    };

    const { width, height } = calculateCanvasSize();
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.scale(dpr, dpr);

    engineRef.current = new GameEngine(width, height, events);
    rendererRef.current = new Renderer(ctx);
    setUiLevel(1);
    setUiProgress({ lit: 0, total: engineRef.current.getTotalZones() });

    const handleResize = () => {
      if (!canvasRef.current || !engineRef.current) return;
      const { width: w, height: h } = calculateCanvasSize();
      const dpr2 = window.devicePixelRatio || 1;
      canvasRef.current.width = w * dpr2;
      canvasRef.current.height = h * dpr2;
      canvasRef.current.style.width = w + 'px';
      canvasRef.current.style.height = h + 'px';
      const c = canvasRef.current.getContext('2d');
      if (c) c.setTransform(dpr2, 0, 0, dpr2, 0, 0);
      engineRef.current.resize(w, h);
      setUiProgress(p => ({ ...p, total: engineRef.current!.getTotalZones() }));
    };
    window.addEventListener('resize', handleResize);

    const loop = (timestamp: number) => {
      if (!engineRef.current || !rendererRef.current) {
        animationRef.current = requestAnimationFrame(loop);
        return;
      }
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const dt = Math.min(50, timestamp - lastTimeRef.current);
      lastTimeRef.current = timestamp;

      engineRef.current.update(dt, timestamp);
      const renderData = engineRef.current.getRenderData(dragStateRef.current);
      rendererRef.current.render(renderData, dt);

      const newLit = engineRef.current.getLitCount();
      setUiProgress(p => p.lit !== newLit ? { ...p, lit: newLit } : p);
      setUiLevel(l => {
        const cur = engineRef.current!.getLevel();
        return cur !== l ? cur : l;
      });

      animationRef.current = requestAnimationFrame(loop);
    };
    animationRef.current = requestAnimationFrame(loop);

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationRef.current);
    };
  }, [calculateCanvasSize, handleAggregation, handleBallDissipate, handleZoneLit, handleLevelUp]);

  const getCanvasPos = (e: React.MouseEvent<HTMLCanvasElement>): Vector2 | null => {
    if (!canvasRef.current) return null;
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    if (!soundReady) {
      soundManager.init().then(() => setSoundReady(true));
    }
    const pos = getCanvasPos(e);
    if (!pos) return;
    dragStateRef.current = {
      dragging: true,
      startPos: pos,
      currentPos: pos
    };
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const pos = getCanvasPos(e);
    if (!pos) return;

    if (dragStateRef.current.dragging) {
      dragStateRef.current.currentPos = pos;
    } else {
      engineRef.current?.setHoveredFragment(pos);
    }
  };

  const handleMouseUp = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (e.button !== 0) return;
    const ds = dragStateRef.current;
    if (ds.dragging && ds.startPos && ds.currentPos) {
      engineRef.current?.releaseGravityBall(ds.startPos, ds.currentPos);
    }
    dragStateRef.current = {
      dragging: false,
      startPos: null,
      currentPos: null
    };
  };

  const handleMouseLeave = () => {
    engineRef.current?.setHoveredFragment(null);
    const ds = dragStateRef.current;
    if (ds.dragging && ds.startPos && ds.currentPos) {
      engineRef.current?.releaseGravityBall(ds.startPos, ds.currentPos);
    }
    dragStateRef.current = {
      dragging: false,
      startPos: null,
      currentPos: null
    };
  };

  const handleReset = () => {
    engineRef.current?.reset();
    setUiLevel(1);
    setUiProgress(p => ({ lit: 0, total: engineRef.current?.getTotalZones() ?? p.total }));
  };

  const handleNextLevel = () => {
    engineRef.current?.nextLevel();
    setUiLevel(engineRef.current?.getLevel() ?? 1);
  };

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(90deg, #0A0E27 0%, #12163A 50%, #0A0E27 100%)',
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <canvas
        ref={canvasRef}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseLeave}
        style={{
          cursor: dragStateRef.current.dragging ? 'grabbing' : 'crosshair',
          boxShadow: '0 0 60px rgba(74, 144, 217, 0.3)',
          borderRadius: '4px'
        }}
      />

      <div
        style={{
          position: 'absolute',
          bottom: 20,
          left: '50%',
          transform: 'translateX(-50%)',
          display: 'flex',
          gap: 16,
          zIndex: 10
        }}
      >
        <button
          onClick={handleReset}
          style={{
            padding: '10px 24px',
            fontSize: '15px',
            color: 'white',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#4A90D9';
            e.currentTarget.style.borderColor = '#4A90D9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          重置游戏
        </button>
        <button
          onClick={handleNextLevel}
          style={{
            padding: '10px 24px',
            fontSize: '15px',
            color: 'white',
            background: 'rgba(255, 255, 255, 0.1)',
            border: '1px solid rgba(255, 255, 255, 0.2)',
            borderRadius: '8px',
            cursor: 'pointer',
            backdropFilter: 'blur(10px)',
            transition: 'all 0.2s ease',
            fontFamily: 'inherit'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#4A90D9';
            e.currentTarget.style.borderColor = '#4A90D9';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)';
            e.currentTarget.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          }}
        >
          下一关
        </button>
      </div>

      <div
        style={{
          position: 'absolute',
          bottom: 80,
          left: '50%',
          transform: 'translateX(-50%)',
          color: 'rgba(255, 255, 255, 0.5)',
          fontSize: '12px',
          textAlign: 'center',
          pointerEvents: 'none',
          lineHeight: '1.6'
        }}
      >
        点击并拖拽释放引力球 · 拖拽距离决定质量 · 吸引碎片聚合成形点亮星空
      </div>
    </div>
  );
}
