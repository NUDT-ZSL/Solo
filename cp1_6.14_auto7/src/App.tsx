import { useEffect, useRef, useState, useCallback } from 'react';
import { GameEngine } from './game/GameEngine';
import { CanvasRenderer } from './renderer/CanvasRenderer';
import { HUD } from './ui/HUD';
import { GameState, MAX_SONAR_PARTICLES } from './types/gameTypes';

export default function App() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const gameEngineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<CanvasRenderer | null>(null);
  const frameIdRef = useRef<number | null>(null);
  const [gameState, setGameState] = useState<GameState | null>(null);
  const [fps, setFps] = useState(0);
  const [frameTime, setFrameTime] = useState(0);
  const lastFpsTime = useRef(performance.now());
  const frameCount = useRef(0);

  const getCanvasDimensions = useCallback(() => {
    const aspectRatio = 16 / 9;
    let width = window.innerWidth;
    let height = window.innerHeight;

    if (width / height > aspectRatio) {
      width = height * aspectRatio;
    } else {
      height = width / aspectRatio;
    }

    return { width: Math.floor(width), height: Math.floor(height) };
  }, []);

  useEffect(() => {
    const { width, height } = getCanvasDimensions();

    const engine = new GameEngine(width, height);
    gameEngineRef.current = engine;

    engine.setOnStateChange((state) => {
      setGameState({ ...state });
    });

    if (canvasRef.current) {
      const renderer = new CanvasRenderer(canvasRef.current);
      renderer.resize(width, height);
      rendererRef.current = renderer;
    }

    const renderLoop = () => {
      if (gameEngineRef.current && rendererRef.current && gameEngineRef.current.state) {
        const state = gameEngineRef.current.state;

        const sonarParticles = state.particles.filter(p => p.type === 'sonar').length;
        if (sonarParticles > MAX_SONAR_PARTICLES) {
          console.warn(`Performance: Sonar particles ${sonarParticles} exceeds limit ${MAX_SONAR_PARTICLES}`);
        }

        const { frameTime: ft } = rendererRef.current.render(state);
        setFrameTime(ft);

        if (ft > 12) {
          console.warn(`Performance: Frame render time ${ft.toFixed(1)}ms exceeds 12ms limit`);
        }

        frameCount.current++;
        const now = performance.now();
        if (now - lastFpsTime.current >= 1000) {
          setFps(frameCount.current);
          frameCount.current = 0;
          lastFpsTime.current = now;
        }
      }
      frameIdRef.current = requestAnimationFrame(renderLoop);
    };

    const handleResize = () => {
      const { width, height } = getCanvasDimensions();
      if (canvasRef.current && rendererRef.current) {
        rendererRef.current.resize(width, height);
      }
      if (gameEngineRef.current) {
        gameEngineRef.current.resize(width, height);
      }
    };

    window.addEventListener('resize', handleResize);
    engine.start();
    frameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (frameIdRef.current) {
        cancelAnimationFrame(frameIdRef.current);
      }
      engine.stop();
      engine.removeEventListeners();
    };
  }, [getCanvasDimensions]);

  const handleUpgrade = useCallback((type: 'speed' | 'sonarRange' | 'energyEfficiency') => {
    if (gameEngineRef.current) {
      return gameEngineRef.current.upgrade(type);
    }
    return false;
  }, []);

  const handleNextLevel = useCallback(async () => {
    if (gameEngineRef.current) {
      const result = await gameEngineRef.current.nextLevel();
      if (result.saveId) {
        console.log('Saved with ID:', result.saveId);
      }
    }
  }, []);

  const handleCloseUpgrade = useCallback(() => {
    if (gameEngineRef.current) {
      gameEngineRef.current.closeUpgrade();
    }
  }, []);

  const { width, height } = getCanvasDimensions();

  return (
    <div style={{
      width: '100vw',
      height: '100vh',
      backgroundColor: '#0a0b1a',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      position: 'relative',
      overflow: 'hidden'
    }}>
      <canvas
        ref={canvasRef}
        style={{
          display: 'block',
          width: `${width}px`,
          height: `${height}px`
        }}
      />

      {gameState && (
        <HUD
          state={gameState}
          onUpgrade={handleUpgrade}
          onNextLevel={handleNextLevel}
          onCloseUpgrade={handleCloseUpgrade}
        />
      )}

      {fps > 0 && (
        <div style={{
          position: 'fixed',
          top: '12px',
          right: '12px',
          padding: '8px 12px',
          backgroundColor: 'rgba(10, 11, 26, 0.7)',
          border: '1px solid #334155',
          borderRadius: '8px',
          color: fps >= 52 ? '#22c55e' : (fps >= 40 ? '#facc15' : '#ef4444'),
          fontSize: '12px',
          fontFamily: 'monospace',
          zIndex: 30,
          pointerEvents: 'none'
        }}>
          FPS: {fps} | Frame: {frameTime.toFixed(1)}ms
        </div>
      )}
    </div>
  );
}
