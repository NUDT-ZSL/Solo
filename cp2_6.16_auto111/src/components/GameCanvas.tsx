import { useEffect, useRef } from 'react';
import { useGameState } from '../hooks/useGameState';

const CANVAS_WIDTH = 960;
const CANVAS_HEIGHT = 640;

function GameCanvas() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { engine } = useGameState();

  useEffect(() => {
    if (!canvasRef.current || !engine) return;
    
    const gameCanvas = engine.getCanvas();
    const ctx = canvasRef.current.getContext('2d');
    
    canvasRef.current.width = CANVAS_WIDTH;
    canvasRef.current.height = CANVAS_HEIGHT;
    
    let animationId: number;
    
    const render = () => {
      if (ctx && gameCanvas) {
        ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.drawImage(gameCanvas, 0, 0);
      }
      animationId = requestAnimationFrame(render);
    };
    
    animationId = requestAnimationFrame(render);
    
    return () => {
      cancelAnimationFrame(animationId);
    };
  }, [engine]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        display: 'block',
        borderRadius: '2px',
        imageRendering: 'pixelated',
        cursor: 'crosshair',
      }}
    />
  );
}

export default GameCanvas;
