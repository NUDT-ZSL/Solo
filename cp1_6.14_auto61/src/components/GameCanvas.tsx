import React, { useRef, useEffect } from 'react';
import { gameManager } from '../engine/GameManager';

interface GameCanvasProps {
  onCanvasReady?: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ onCanvasReady }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    gameManager.setCanvas(canvas);
    gameManager.resizeCanvas();

    if (onCanvasReady) {
      onCanvasReady();
    }

    const handleResize = () => {
      gameManager.resizeCanvas();
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [onCanvasReady]);

  const handleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    gameManager.handleCanvasClick({ x, y });
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    gameManager.handleCanvasMouseMove({ x, y });
  };

  return (
    <div className="game-canvas-container" ref={containerRef}>
      <canvas
        ref={canvasRef}
        className="game-canvas"
        onClick={handleClick}
        onMouseMove={handleMouseMove}
      />
    </div>
  );
};

export default GameCanvas;
