import React, { useRef, useEffect, useCallback } from 'react';
import {
  GameState,
  GridCell,
  PlacedPlant,
  EnemyInstance,
  AttackEffect,
  Particle,
  cellCenter,
  GRID_COLS,
  GRID_ROWS,
  CELL_SIZE,
  PATH,
} from './utils/gameLogic';
import { Season, SEASON_COLORS, PLANTS } from './utils/plants';

interface GameBoardProps {
  state: GameState;
  onCellClick: (col: number, row: number) => void;
  onCellHover: (col: number | null, row: number | null) => void;
}

function drawBackground(ctx: CanvasRenderingContext2D, width: number, height: number, time: number) {
  const gradient = ctx.createLinearGradient(0, 0, width, height);
  gradient.addColorStop(0, '#1e3a1e');
  gradient.addColorStop(0.3, '#2a4a2a');
  gradient.addColorStop(0.6, '#3a4a2a');
  gradient.addColorStop(1, '#4a3a1e');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);

  for (let i = 0; i < 30; i++) {
    const x = ((i * 137.5 + time * 0.005) % (width + 40)) - 20;
    const y = ((i * 89.3 + Math.sin(i + time * 0.001) * 20) % height);
    ctx.fillStyle = `rgba(100, 160, 80, ${0.03 + Math.sin(i + time * 0.002) * 0.02})`;
    ctx.beginPath();
    ctx.arc(x, y, 2 + Math.sin(i) * 1.5, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawGrid(ctx: CanvasRenderingContext2D, grid: GridCell[][], hoveredCell: { col: number; row: number } | null, selectedCard: string | null) {
  for (let row = 0; row < GRID_ROWS; row++) {
    for (let col = 0; col < GRID_COLS; col++) {
      const cell = grid[row][col];
      const x = col * CELL_SIZE;
      const y = row * CELL_SIZE;

      if (cell.isPath) {
        ctx.fillStyle = 'rgba(60, 45, 30, 0.7)';
        ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        ctx.strokeStyle = 'rgba(80, 60, 40, 0.5)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      } else {
        const gradient = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE);
        gradient.addColorStop(0, 'rgba(40, 70, 35, 0.5)');
        gradient.addColorStop(1, 'rgba(50, 80, 40, 0.5)');
        ctx.fillStyle = gradient;
        ctx.fillRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);

        ctx.strokeStyle = 'rgba(80, 120, 60, 0.3)';
        ctx.lineWidth = 1;
        ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);

        ctx.fillStyle = 'rgba(60, 100, 50, 0.15)';
        ctx.beginPath();
        ctx.arc(x + CELL_SIZE / 2, y + CELL_SIZE / 2, 3, 0, Math.PI * 2);
        ctx.fill();
      }

      if (cell.isInteractive && cell.interactiveType) {
        drawInteractiveElement(ctx, cell, x, y);
      }

      if (cell.frozen) {
        ctx.fillStyle = 'rgba(126, 200, 227, 0.3)';
        ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
        ctx.strokeStyle = 'rgba(184, 232, 248, 0.5)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x + 2, y + 2, CELL_SIZE - 4, CELL_SIZE - 4);
      }

      if (hoveredCell && hoveredCell.col === col && hoveredCell.row === row && selectedCard) {
        const canPlace = !cell.isPath && !cell.plantId;
        ctx.fillStyle = canPlace ? 'rgba(126, 207, 126, 0.2)' : 'rgba(255, 80, 80, 0.2)';
        ctx.fillRect(x, y, CELL_SIZE, CELL_SIZE);

        if (canPlace) {
          const plantConfig = PLANTS[selectedCard];
          if (plantConfig) {
            const center = cellCenter(col, row);
            ctx.strokeStyle = plantConfig.glowColor;
            ctx.lineWidth = 1;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.arc(center.x, center.y, plantConfig.range, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
          }
        }
      }
    }
  }
}

function drawInteractiveElement(ctx: CanvasRenderingContext2D, cell: GridCell, x: number, y: number) {
  const cx = x + CELL_SIZE / 2;
  const cy = y + CELL_SIZE / 2;

  if (cell.interactiveType === 'pond') {
    ctx.fillStyle = 'rgba(60, 120, 180, 0.4)';
    ctx.beginPath();
    ctx.ellipse(cx, cy, 20, 14, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = 'rgba(80, 160, 220, 0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  } else if (cell.interactiveType === 'rock') {
    ctx.fillStyle = 'rgba(100, 90, 80, 0.6)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + 4, 16, 12, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(120, 110, 100, 0.5)';
    ctx.beginPath();
    ctx.ellipse(cx - 2, cy, 14, 10, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (cell.interactiveType === 'bush') {
    ctx.fillStyle = 'rgba(50, 120, 50, 0.5)';
    ctx.beginPath();
    ctx.arc(cx, cy, 16, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = 'rgba(60, 140, 60, 0.4)';
    ctx.beginPath();
    ctx.arc(cx - 5, cy - 3, 10, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawPath(ctx: CanvasRenderingContext2D) {
  if (PATH.length < 2) return;

  ctx.beginPath();
  ctx.moveTo(PATH[0].x, PATH[0].y);
  for (let i = 1; i < PATH.length; i++) {
    ctx.lineTo(PATH[i].x, PATH[i].y);
  }
  ctx.strokeStyle = 'rgba(100, 80, 50, 0.6)';
  ctx.lineWidth = CELL_SIZE * 0.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.stroke();

  ctx.strokeStyle = 'rgba(80, 65, 40, 0.8)';
  ctx.lineWidth = CELL_SIZE * 0.45;
  ctx.stroke();

  ctx.setLineDash([6, 8]);
  ctx.strokeStyle = 'rgba(120, 100, 70, 0.3)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.setLineDash([]);
}

function drawPlant(ctx: CanvasRenderingContext2D, plant: PlacedPlant, time: number) {
  const center = cellCenter(plant.col, plant.row);
  const config = plant.config;
  const seasonColor = SEASON_COLORS[config.season];
  const bobOffset = Math.sin(time * 0.003 + plant.col * 0.5 + plant.row * 0.7) * 2;

  ctx.save();
  ctx.translate(center.x, center.y + bobOffset);

  ctx.shadowColor = config.glowColor;
  ctx.shadowBlur = 12 + Math.sin(time * 0.005) * 4;

  const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, config.radius);
  gradient.addColorStop(0, seasonColor.secondary);
  gradient.addColorStop(0.7, config.color);
  gradient.addColorStop(1, seasonColor.primary);
  ctx.fillStyle = gradient;

  ctx.beginPath();
  if (config.season === 'spring') {
    ctx.arc(0, 0, config.radius, 0, Math.PI * 2);
    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2 + time * 0.002;
      const leafX = Math.cos(angle) * (config.radius + 5);
      const leafY = Math.sin(angle) * (config.radius + 5);
      ctx.moveTo(leafX, leafY);
      ctx.arc(leafX, leafY, 6, 0, Math.PI * 2);
    }
  } else if (config.season === 'summer') {
    ctx.arc(0, 0, config.radius, 0, Math.PI * 2);
    const spikes = 8;
    for (let i = 0; i < spikes; i++) {
      const angle = (i / spikes) * Math.PI * 2 + time * 0.003;
      const spikeLen = config.radius + 8;
      const tipX = Math.cos(angle) * spikeLen;
      const tipY = Math.sin(angle) * spikeLen;
      ctx.moveTo(0, 0);
      ctx.lineTo(tipX, tipY);
    }
  } else if (config.season === 'autumn') {
    ctx.arc(0, 0, config.radius, 0, Math.PI * 2);
    for (let i = 0; i < 3; i++) {
      const angle = (i / 3) * Math.PI * 2 + time * 0.001;
      const lx = Math.cos(angle) * (config.radius * 0.7);
      const ly = Math.sin(angle) * (config.radius * 0.7);
      ctx.moveTo(lx, ly);
      ctx.ellipse(lx, ly, 8, 5, angle, 0, Math.PI * 2);
    }
  } else if (config.season === 'winter') {
    ctx.arc(0, 0, config.radius, 0, Math.PI * 2);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      ctx.moveTo(0, 0);
      const len = config.radius + 6;
      ctx.lineTo(Math.cos(angle) * len, Math.sin(angle) * len);
      const branchAngle1 = angle + 0.5;
      const branchAngle2 = angle - 0.5;
      const midX = Math.cos(angle) * len * 0.6;
      const midY = Math.sin(angle) * len * 0.6;
      ctx.moveTo(midX, midY);
      ctx.lineTo(midX + Math.cos(branchAngle1) * 6, midY + Math.sin(branchAngle1) * 6);
      ctx.moveTo(midX, midY);
      ctx.lineTo(midX + Math.cos(branchAngle2) * 6, midY + Math.sin(branchAngle2) * 6);
    }
  }
  ctx.fill();

  ctx.shadowBlur = 0;

  if (plant.shieldHp > 0) {
    ctx.strokeStyle = `rgba(212, 162, 78, ${0.4 + Math.sin(time * 0.005) * 0.2})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(0, 0, config.radius + 6, 0, Math.PI * 2);
    ctx.stroke();
  }

  if (plant.hp < plant.config.hp) {
    const hpRatio = plant.hp / plant.config.hp;
    const barWidth = CELL_SIZE * 0.6;
    const barHeight = 4;
    const barY = -config.radius - 10;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);
    ctx.fillStyle = hpRatio > 0.5 ? '#7ecf7e' : hpRatio > 0.25 ? '#ffcc00' : '#ff4444';
    ctx.fillRect(-barWidth / 2, barY, barWidth * hpRatio, barHeight);
  }

  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, enemy: EnemyInstance, time: number) {
  ctx.save();
  ctx.translate(enemy.x, enemy.y);

  if (enemy.dissolving) {
    ctx.globalAlpha = enemy.dissolveAlpha;
  }

  ctx.shadowColor = enemy.config.glowColor;
  ctx.shadowBlur = 15;

  const wobble = Math.sin(time * 0.005 + enemy.id.charCodeAt(0)) * 1.5;
  const size = enemy.config.size;

  const bodyGradient = ctx.createRadialGradient(0, wobble, 0, 0, wobble, size);
  bodyGradient.addColorStop(0, enemy.config.glowColor);
  bodyGradient.addColorStop(0.5, enemy.config.color);
  bodyGradient.addColorStop(1, 'rgba(20, 10, 30, 0.8)');
  ctx.fillStyle = bodyGradient;

  ctx.beginPath();
  ctx.ellipse(0, wobble, size, size * 1.2, 0, 0, Math.PI * 2);
  ctx.fill();

  const eyeOffset = size * 0.3;
  ctx.fillStyle = 'rgba(200, 100, 255, 0.8)';
  ctx.beginPath();
  ctx.arc(-eyeOffset, wobble - size * 0.2, 2.5, 0, Math.PI * 2);
  ctx.arc(eyeOffset, wobble - size * 0.2, 2.5, 0, Math.PI * 2);
  ctx.fill();

  ctx.shadowBlur = 0;

  if (enemy.frozen) {
    ctx.strokeStyle = 'rgba(126, 200, 227, 0.7)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, wobble, size + 4, 0, Math.PI * 2);
    ctx.stroke();
    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2;
      const cx = Math.cos(angle) * (size + 6);
      const cy = Math.sin(angle) * (size + 6) + wobble;
      ctx.fillStyle = 'rgba(184, 232, 248, 0.6)';
      ctx.fillRect(cx - 2, cy - 2, 4, 4);
    }
  } else if (enemy.slowFactor < 1) {
    ctx.strokeStyle = 'rgba(126, 207, 126, 0.5)';
    ctx.lineWidth = 2;
    ctx.setLineDash([3, 3]);
    ctx.beginPath();
    ctx.arc(0, wobble, size + 3, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (enemy.hp < enemy.maxHp) {
    const hpRatio = enemy.hp / enemy.maxHp;
    const barWidth = size * 2;
    const barHeight = 3;
    const barY = -size * 1.2 - 8;
    ctx.globalAlpha = enemy.dissolving ? enemy.dissolveAlpha : 1;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
    ctx.fillRect(-barWidth / 2, barY, barWidth, barHeight);
    ctx.fillStyle = hpRatio > 0.5 ? '#cc44cc' : '#ff2244';
    ctx.fillRect(-barWidth / 2, barY, barWidth * hpRatio, barHeight);
  }

  ctx.restore();
}

function drawEffects(ctx: CanvasRenderingContext2D, effects: AttackEffect[], time: number) {
  for (const effect of effects) {
    const progress = effect.progress;

    ctx.save();

    if (progress < 0.5) {
      const t = progress * 2;
      const x = effect.fromX + (effect.toX - effect.fromX) * t;
      const y = effect.fromY + (effect.toY - effect.fromY) * t;

      ctx.strokeStyle = effect.color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      ctx.shadowColor = effect.color;
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.moveTo(effect.fromX, effect.fromY);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      const t = (progress - 0.5) * 2;
      const particleCount = effect.particleCount;

      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const speed = 1.5 + Math.sin(i * 2.5) * 0.8;
        const px = effect.toX + Math.cos(angle) * speed * t * 30;
        const py = effect.toY + Math.sin(angle) * speed * t * 30;
        const alpha = 1 - t;
        const size = 3 + (1 - t) * 3;

        ctx.fillStyle = effect.color;
        ctx.globalAlpha = alpha * 0.7;
        ctx.shadowColor = effect.color;
        ctx.shadowBlur = 6;
        ctx.beginPath();
        ctx.arc(px, py, size, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    ctx.restore();
  }
}

function drawEntryExit(ctx: CanvasRenderingContext2D, time: number) {
  if (PATH.length >= 2) {
    const entry = PATH[0];
    const exit = PATH[PATH.length - 1];

    ctx.save();

    ctx.fillStyle = 'rgba(126, 207, 126, 0.3)';
    ctx.strokeStyle = 'rgba(126, 207, 126, 0.6)';
    ctx.lineWidth = 2;
    const pulse = Math.sin(time * 0.004) * 4;
    ctx.beginPath();
    ctx.arc(entry.x, entry.y, 12 + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = 'rgba(255, 80, 80, 0.3)';
    ctx.strokeStyle = 'rgba(255, 80, 80, 0.6)';
    ctx.beginPath();
    ctx.arc(exit.x, exit.y, 12 + pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    ctx.restore();
  }
}

const GameBoard: React.FC<GameBoardProps> = ({ state, onCellClick, onCellHover }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animFrameRef = useRef<number>(0);

  const canvasWidth = GRID_COLS * CELL_SIZE;
  const canvasHeight = GRID_ROWS * CELL_SIZE;

  const render = useCallback((time: number) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvasWidth, canvasHeight);

    drawBackground(ctx, canvasWidth, canvasHeight, time);
    drawPath(ctx);
    drawGrid(ctx, state.grid, state.hoveredCell, state.selectedCard);
    drawEntryExit(ctx, time);

    for (const plant of state.plants) {
      drawPlant(ctx, plant, time);
    }

    for (const enemy of state.enemies) {
      drawEnemy(ctx, enemy, time);
    }

    drawEffects(ctx, state.effects, time);

    animFrameRef.current = requestAnimationFrame(render);
  }, [state, canvasWidth, canvasHeight]);

  useEffect(() => {
    animFrameRef.current = requestAnimationFrame(render);
    return () => cancelAnimationFrame(animFrameRef.current);
  }, [render]);

  const handleCanvasClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      onCellClick(col, row);
    }
  }, [onCellClick]);

  const handleCanvasMouseMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    const col = Math.floor(x / CELL_SIZE);
    const row = Math.floor(y / CELL_SIZE);
    if (col >= 0 && col < GRID_COLS && row >= 0 && row < GRID_ROWS) {
      onCellHover(col, row);
    } else {
      onCellHover(null, null);
    }
  }, [onCellHover]);

  const handleCanvasMouseLeave = useCallback(() => {
    onCellHover(null, null);
  }, [onCellHover]);

  return (
    <canvas
      ref={canvasRef}
      width={canvasWidth}
      height={canvasHeight}
      onClick={handleCanvasClick}
      onMouseMove={handleCanvasMouseMove}
      onMouseLeave={handleCanvasMouseLeave}
      style={{
        borderRadius: '12px',
        cursor: state.selectedCard ? 'crosshair' : 'default',
        boxShadow: '0 0 30px rgba(0, 0, 0, 0.5), inset 0 0 20px rgba(0, 0, 0, 0.2)',
        maxWidth: '100%',
        height: 'auto',
      }}
    />
  );
};

export default GameBoard;
