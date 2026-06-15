import React, { useState, useEffect, useRef } from 'react';
import { createRoot } from 'react-dom/client';
import { EditorPanel } from './editor/EditorPanel';
import { GameEngine } from './engine/GameEngine';
import type { PlayableStatus } from './types';

type AppMode = 'editor' | 'play';

const App: React.FC = () => {
  const [mode, setMode] = useState<AppMode>('editor');
  const [engineStatus, setEngineStatus] = useState<PlayableStatus>('ready');
  const [transitionAlpha, setTransitionAlpha] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const transitionRef = useRef<number | null>(null);

  useEffect(() => {
    if (mode === 'play' && canvasRef.current && !engineRef.current) {
      engineRef.current = new GameEngine(canvasRef.current);
      engineRef.current.start();
    }
  }, [mode]);

  const handlePlay = () => {
    startTransition('play');
  };

  const handleReturn = () => {
    if (engineRef.current) {
      engineRef.current.stop();
      engineRef.current = null;
    }
    startTransition('editor');
  };

  const startTransition = (newMode: AppMode) => {
    if (transitionRef.current) {
      cancelAnimationFrame(transitionRef.current);
    }

    const startTime = performance.now();
    const duration = 300;

    const animate = () => {
      const elapsed = performance.now() - startTime;
      const progress = Math.min(1, elapsed / duration);
      const alpha = newMode === 'play' ? progress : 1 - progress;

      setTransitionAlpha(alpha);

      if (progress < 1) {
        transitionRef.current = requestAnimationFrame(animate);
      } else {
        setMode(newMode);
        if (newMode === 'editor') {
          setTransitionAlpha(0);
        }
      }
    };

    transitionRef.current = requestAnimationFrame(animate);
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.code === 'Escape' && mode === 'play') {
        handleReturn();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [mode]);

  useEffect(() => {
    return () => {
      if (transitionRef.current) {
        cancelAnimationFrame(transitionRef.current);
      }
      if (engineRef.current) {
        engineRef.current.stop();
      }
    };
  }, []);

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative', overflow: 'hidden' }}>
      {mode === 'editor' && <EditorPanel onPlay={handlePlay} />}

      {mode === 'play' && (
        <canvas
          ref={canvasRef}
          style={{
            display: 'block',
            width: '100%',
            height: '100%',
            background: '#000'
          }}
        />
      )}

      {transitionAlpha > 0 && (
        <div
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: '#000',
            opacity: transitionAlpha,
            pointerEvents: 'none',
            zIndex: 9999,
            transition: 'opacity 0.3s ease-in-out'
          }}
        />
      )}
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
