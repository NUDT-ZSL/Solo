import React, { useRef, useEffect, useCallback } from 'react';
import type { BlockData, Particle } from '../types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  GRID_COLS,
  GRID_ROWS,
  CELL_SIZE,
  MATERIAL_CONFIGS,
} from '../types';

interface CanvasProps {
  blocks: BlockData[];
  particles: Particle[];
  isSimulating: boolean;
  onLeftClick: (gridX: number, gridY: number) => void;
  onRightClick: (gridX: number, gridY: number) => void;
}

const Canvas: React.FC<CanvasProps> = ({
  blocks,
  particles,
  isSimulating,
  onLeftClick,
  onRightClick,
}) => {
  const blockCanvasRef = useRef<HTMLCanvasElement>(null);
  const particleCanvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number | null>(null);
  const lastParticleCountRef = useRef<number>(0);

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#d9d9d9';
    ctx.lineWidth = 1;

    for (let i = 0; i <= GRID_COLS; i++) {
      const x = i * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }

    for (let j = 0; j <= GRID_ROWS; j++) {
      const y = j * CELL_SIZE;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }
  }, []);

  const drawBlocks = useCallback((ctx: CanvasRenderingContext2D) => {
    const sorted = [...blocks].sort((a, b) => a.y - b.y);

    for (const block of sorted) {
      const config = MATERIAL_CONFIGS[block.material];
      ctx.save();
      ctx.translate(block.x + CELL_SIZE / 2, block.y + CELL_SIZE / 2);
      ctx.rotate(block.angle);

      ctx.fillStyle = config.color;
      ctx.fillRect(-CELL_SIZE / 2, -CELL_SIZE / 2, CELL_SIZE, CELL_SIZE);

      ctx.strokeStyle = 'rgba(0,0,0,0.3)';
      ctx.lineWidth = 1;
      ctx.strokeRect(-CELL_SIZE / 2, -CELL_SIZE / 2, CELL_SIZE, CELL_SIZE);

      ctx.fillStyle = 'rgba(255,255,255,0.15)';
      ctx.fillRect(-CELL_SIZE / 2, -CELL_SIZE / 2, CELL_SIZE, CELL_SIZE * 0.3);

      ctx.restore();
    }
  }, [blocks]);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    for (const particle of particles) {
      const alpha = particle.life / particle.maxLife;
      ctx.beginPath();
      ctx.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }
  }, [particles]);

  useEffect(() => {
    const blockCanvas = blockCanvasRef.current;
    if (!blockCanvas) return;
    const ctx = blockCanvas.getContext('2d');
    if (!ctx) return;

    ctx.fillStyle = '#f0f0f0';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    drawGrid(ctx);
    drawBlocks(ctx);
  }, [blocks, drawGrid, drawBlocks]);

  useEffect(() => {
    const particleCanvas = particleCanvasRef.current;
    if (!particleCanvas) return;
    const ctx = particleCanvas.getContext('2d');
    if (!ctx) return;

    drawParticles(ctx);
  }, [particles, drawParticles]);

  useEffect(() => {
    if (!isSimulating) return;

    const render = () => {
      const blockCanvas = blockCanvasRef.current;
      const particleCanvas = particleCanvasRef.current;
      if (!blockCanvas || !particleCanvas) return;

      const blockCtx = blockCanvas.getContext('2d');
      const particleCtx = particleCanvas.getContext('2d');
      if (!blockCtx || !particleCtx) return;

      blockCtx.fillStyle = '#f0f0f0';
      blockCtx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      drawGrid(blockCtx);
      drawBlocks(blockCtx);
      drawParticles(particleCtx);

      animFrameRef.current = requestAnimationFrame(render);
    };

    animFrameRef.current = requestAnimationFrame(render);

    return () => {
      if (animFrameRef.current !== null) {
        cancelAnimationFrame(animFrameRef.current);
      }
    };
  }, [isSimulating, drawGrid, drawBlocks, drawParticles]);

  const getGridPosition = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = particleCanvasRef.current;
    if (!canvas) return { gridX: -1, gridY: -1 };

    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    const gridX = Math.floor(x / CELL_SIZE);
    const gridY = Math.floor(y / CELL_SIZE);

    if (gridX < 0 || gridX >= GRID_COLS || gridY < 0 || gridY >= GRID_ROWS) {
      return { gridX: -1, gridY: -1 };
    }

    return { gridX, gridY };
  }, []);

  const handleLeftClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isSimulating) return;
    const { gridX, gridY } = getGridPosition(e);
    if (gridX >= 0 && gridY >= 0) {
      onLeftClick(gridX, gridY);
    }
  }, [isSimulating, onLeftClick, getGridPosition]);

  const handleRightClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    if (isSimulating) return;
    const { gridX, gridY } = getGridPosition(e);
    if (gridX >= 0 && gridY >= 0) {
      onRightClick(gridX, gridY);
    }
  }, [isSimulating, onRightClick, getGridPosition]);

  return (
    <div className="canvas-container">
      <canvas
        ref={blockCanvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="block-canvas"
      />
      <canvas
        ref={particleCanvasRef}
        width={CANVAS_WIDTH}
        height={CANVAS_HEIGHT}
        className="particle-canvas"
        onClick={handleLeftClick}
        onContextMenu={handleRightClick}
      />
    </div>
  );
};

export default Canvas;
