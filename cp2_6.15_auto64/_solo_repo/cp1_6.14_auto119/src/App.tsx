import { useEffect, useRef, useState } from 'react';
import { EventBus } from './EventBus';
import { GameEngine } from './GameEngine';
import { Renderer } from './Renderer';
import { GameUI } from './GameUI';
import styles from './GameUI.module.css';

interface AppProps {
  eventBus: EventBus;
}

export function App({ eventBus }: AppProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const [gamePhase, setGamePhase] = useState<'start' | 'playing' | 'end'>('start');

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = canvasRef.current;
    canvas.width = 800;
    canvas.height = 500;

    const engine = new GameEngine(eventBus);
    const renderer = new Renderer(canvas);

    engineRef.current = engine;
    rendererRef.current = renderer;

    renderer.start();

    const unsubState = eventBus.on('stateUpdate', (state) => {
      renderer.setState(state);
    });

    const unsubNote = eventBus.on('noteCollected', (data) => {
      renderer.spawnParticles(data.x, data.y);
    });

    const unsubEnd = eventBus.on('gameEnd', () => {
      setGamePhase('end');
    });

    const unsubStart = eventBus.on('gameStart', () => {
      setGamePhase('playing');
    });

    return () => {
      unsubState();
      unsubNote();
      unsubEnd();
      unsubStart();
      engine.stop();
      renderer.stop();
    };
  }, [eventBus]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        if (gamePhase === 'start') {
          handleStart();
        } else if (gamePhase === 'playing') {
          engineRef.current?.jump();
        } else if (gamePhase === 'end') {
          handleRestart();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [gamePhase]);

  const handleStart = () => {
    engineRef.current?.start();
  };

  const handleRestart = () => {
    engineRef.current?.start();
  };

  const handleExit = () => {
    setGamePhase('start');
  };

  const handleCanvasClick = () => {
    if (gamePhase === 'playing') {
      engineRef.current?.jump();
    }
  };

  return (
    <div className={styles['game-container']}>
      <canvas
        ref={canvasRef}
        className={styles['game-canvas']}
        onClick={handleCanvasClick}
      />
      <GameUI
        eventBus={eventBus}
        onStart={handleStart}
        onRestart={handleRestart}
        onExit={handleExit}
        gamePhase={gamePhase}
      />
    </div>
  );
}
