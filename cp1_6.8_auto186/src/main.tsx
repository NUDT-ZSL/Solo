import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { GameEngine } from './GameEngine';
import { UILayer } from './UILayer';

const App: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const engineRef = useRef<GameEngine | null>(null);
  const [engine, setEngine] = useState<GameEngine | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.style.width = '100%';
    canvas.style.height = '100%';
    canvas.style.display = 'block';

    const eng = new GameEngine(canvas);
    engineRef.current = eng;
    setEngine(eng);

    const onResize = () => {
      eng.resize();
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      eng.destroy();
      engineRef.current = null;
    };
  }, []);

  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        position: 'relative',
        overflow: 'hidden',
        background: '#000',
      }}
    >
      <canvas ref={canvasRef} />
      <UILayer engine={engine} />
    </div>
  );
};

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
