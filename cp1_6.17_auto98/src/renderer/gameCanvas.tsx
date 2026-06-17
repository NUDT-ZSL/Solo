import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useGameStore, TOWER_STATS, Point } from '../store/gameStore';
import { generatePath, generateCheckpoints, generateTowerGridPoints, CANVAS_WIDTH, CANVAS_HEIGHT, PATH_WIDTH } from '../gameEngine/pathManager';
import { isEnemyInRange } from '../gameEngine/towerManager';

interface GridPoint {
  position: Point;
  gridIndex: number;
}

const GameCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hoveredGrid, setHoveredGrid] = useState<number | null>(null);

  const pathRef = useRef(generatePath());
  const checkpointsRef = useRef<ReturnType<typeof generateCheckpoints>>([]);
  const gridPointsRef = useRef<GridPoint[]>([]);

  const {
    enemies,
    towers,
    projectiles,
    splashEffects,
    iceParticles,
    floatingScores,
    screenShakeTimer,
    screenFlashTimer,
    placeTower,
  } = useGameStore();

  useEffect(() => {
    pathRef.current = generatePath();
    checkpointsRef.current = generateCheckpoints(pathRef.current);
    gridPointsRef.current = generateTowerGridPoints(pathRef.current);
  }, []);

  const handleCanvasClick = useCallback(
    (e: React.MouseEvent<HTMLCanvasElement>) => {
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const y = e.clientY - rect.top;

      for (const gp of gridPointsRef.current) {
        const dx = x - gp.position.x;
        const dy = y - gp.position.y;
        if (Math.abs(dx) <= 15 && Math.abs(dy) <= 15) {
          placeTower(gp.gridIndex, { ...gp.position });
          break;
        }
      }
    },
    [placeTower]
  );

  const handleCanvasMove = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    let found: number | null = null;
    for (const gp of gridPointsRef.current) {
      const dx = x - gp.position.x;
      const dy = y - gp.position.y;
      if (Math.abs(dx) <= 15 && Math.abs(dy) <= 15) {
        found = gp.gridIndex;
        break;
      }
    }
    setHoveredGrid(found);
  }, []);

  const handleCanvasLeave = useCallback(() => {
    setHoveredGrid(null);
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationId: number;

    const draw = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      let shakeX = 0;
      let shakeY = 0;
      if (screenShakeTimer > 0) {
        shakeX = (Math.random() - 0.5) * 6;
        shakeY = (Math.random() - 0.5) * 6;
      }

      ctx.save();
      ctx.translate(shakeX, shakeY);

      ctx.fillStyle = '#2E4A2E';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      drawPath(ctx, pathRef.current);
      drawGridPoints(ctx, gridPointsRef.current, hoveredGrid, towers);
      drawCheckpoints(ctx, checkpointsRef.current);
      drawEnemies(ctx, enemies, towers);
      drawTowers(ctx, towers);
      drawProjectiles(ctx, projectiles);
      drawSplashEffects(ctx, splashEffects);
      drawIceParticles(ctx, iceParticles);
      drawFloatingScores(ctx, floatingScores);

      ctx.restore();

      if (screenFlashTimer > 0) {
        ctx.fillStyle = `rgba(255, 255, 255, ${screenFlashTimer / 50 * 0.5})`;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }

      animationId = requestAnimationFrame(draw);
    };

    animationId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animationId);
  }, [
    enemies,
    towers,
    projectiles,
    splashEffects,
    iceParticles,
    floatingScores,
    hoveredGrid,
    screenShakeTimer,
    screenFlashTimer,
  ]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      onClick={handleCanvasClick}
      onMouseMove={handleCanvasMove}
      onMouseLeave={handleCanvasLeave}
      style={{ display: 'block', cursor: 'pointer' }}
    />
  );
};

function drawPath(ctx: CanvasRenderingContext2D, path: Point[]) {
  ctx.save();
  ctx.fillStyle = '#D2B48C';
  ctx.strokeStyle = '#C0C0C0';
  ctx.lineWidth = PATH_WIDTH;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.stroke();

  ctx.strokeStyle = '#C0C0C0';
  ctx.lineWidth = 2;
  ctx.setLineDash([8, 8]);
  ctx.beginPath();
  ctx.moveTo(path[0].x, path[0].y);
  for (let i = 1; i < path.length; i++) {
    ctx.lineTo(path[i].x, path[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.restore();
}

function drawGridPoints(
  ctx: CanvasRenderingContext2D,
  points: GridPoint[],
  hoveredIndex: number | null,
  towers: ReturnType<typeof useGameStore.getState>['towers']
) {
  for (const gp of points) {
    const isOccupied = towers.some((t) => t.gridIndex === gp.gridIndex);
    if (isOccupied) continue;

    const isHovered = gp.gridIndex === hoveredIndex;

    ctx.save();
    ctx.fillStyle = isHovered ? 'rgba(0, 255, 0, 0.6)' : 'rgba(255, 255, 255, 0.3)';
    ctx.strokeStyle = isHovered ? '#00FF00' : 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = isHovered ? 2 : 1;

    ctx.beginPath();
    ctx.rect(gp.position.x - 15, gp.position.y - 15, 30, 30);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
}

function drawCheckpoints(ctx: CanvasRenderingContext2D, checkpoints: ReturnType<typeof generateCheckpoints>) {
  for (const cp of checkpoints) {
    ctx.save();
    ctx.fillStyle = '#FFD700';
    ctx.beginPath();
    ctx.arc(cp.position.x, cp.position.y, 8, 0, Math.PI * 2);
    ctx.fill();

    if (!cp.activated) {
      ctx.strokeStyle = '#FFA500';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cp.position.x, cp.position.y, 12, 0, Math.PI * 2);
      ctx.stroke();
    }
    ctx.restore();
  }
}

function drawEnemies(
  ctx: CanvasRenderingContext2D,
  enemies: ReturnType<typeof useGameStore.getState>['enemies'],
  towers: ReturnType<typeof useGameStore.getState>['towers']
) {
  for (const enemy of enemies) {
    if (!enemy.active) continue;

    const inTowerRange = towers.some((t) => isEnemyInRange(t, enemy));

    if (inTowerRange) {
      ctx.save();
      ctx.fillStyle = 'rgba(255, 0, 0, 0.2)';
      ctx.beginPath();
      ctx.arc(enemy.position.x, enemy.position.y, 18, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    const bodyColor = enemy.isFlashing ? '#FF0000' : '#8B0000';

    ctx.fillStyle = bodyColor;
    ctx.beginPath();
    ctx.arc(enemy.position.x, enemy.position.y, 14, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#4B0000';
    ctx.beginPath();
    ctx.arc(enemy.position.x - 4, enemy.position.y - 4, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(enemy.position.x + 4, enemy.position.y - 4, 4, 0, Math.PI * 2);
    ctx.fill();

    if (enemy.slowTimer > 0) {
      ctx.strokeStyle = '#00BFFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(enemy.position.x, enemy.position.y, 18, 0, Math.PI * 2);
      ctx.stroke();
    }

    if (enemy.speedBoostRemainingTime > 0) {
      ctx.strokeStyle = '#FFD700';
      ctx.lineWidth = 2;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(enemy.position.x, enemy.position.y, 20, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    const barWidth = 28;
    const barHeight = 4;
    const healthPercent = enemy.health / enemy.maxHealth;
    ctx.fillStyle = '#333333';
    ctx.fillRect(enemy.position.x - barWidth / 2, enemy.position.y - 24, barWidth, barHeight);
    ctx.fillStyle = healthPercent > 0.5 ? '#32CD32' : healthPercent > 0.25 ? '#FFA500' : '#FF4500';
    ctx.fillRect(enemy.position.x - barWidth / 2, enemy.position.y - 24, barWidth * healthPercent, barHeight);

    ctx.restore();
  }
}

function drawTowers(ctx: CanvasRenderingContext2D, towers: ReturnType<typeof useGameStore.getState>['towers']) {
  for (const tower of towers) {
    const stats = TOWER_STATS[tower.type];
    let scale = 1;
    if (tower.isPlacing) {
      const progress = 1 - tower.placeTimer / 300;
      scale = easeOut(progress, 0, 1, 1);
    }

    ctx.save();
    ctx.translate(tower.position.x, tower.position.y);
    ctx.scale(scale, scale);

    ctx.fillStyle = '#5D4037';
    ctx.beginPath();
    ctx.arc(0, 6, 16, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = stats.color;
    ctx.fillRect(-10, -10, 20, 20);

    ctx.rotate(tower.rotation);
    if (tower.type === 'arrow') {
      ctx.fillStyle = '#2E7D32';
      ctx.beginPath();
      ctx.moveTo(18, 0);
      ctx.lineTo(6, -5);
      ctx.lineTo(6, 5);
      ctx.closePath();
      ctx.fill();
    } else if (tower.type === 'cannon') {
      ctx.fillStyle = '#333333';
      ctx.fillRect(0, -5, 22, 10);
    } else if (tower.type === 'magic') {
      ctx.fillStyle = '#7B1FA2';
      ctx.beginPath();
      ctx.arc(16, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = '#CE93D8';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(16, 0, 10, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

function drawProjectiles(ctx: CanvasRenderingContext2D, projectiles: ReturnType<typeof useGameStore.getState>['projectiles']) {
  for (const proj of projectiles) {
    if (!proj.active) continue;

    ctx.save();
    if (proj.towerType === 'arrow') {
      const angle = Math.atan2(1, 0);
      ctx.translate(proj.position.x, proj.position.y);
      ctx.fillStyle = '#32CD32';
      ctx.beginPath();
      ctx.moveTo(6, 0);
      ctx.lineTo(-3, -3.5);
      ctx.lineTo(-3, 3.5);
      ctx.closePath();
      ctx.fill();
    } else if (proj.towerType === 'cannon') {
      ctx.fillStyle = '#888888';
      ctx.beginPath();
      ctx.arc(proj.position.x, proj.position.y, 8, 0, Math.PI * 2);
      ctx.fill();
    } else if (proj.towerType === 'magic') {
      ctx.shadowColor = '#FFFFFF';
      ctx.shadowBlur = 15;
      ctx.globalAlpha = 0.7;
      ctx.fillStyle = '#FFFFFF';
      ctx.beginPath();
      ctx.arc(proj.position.x, proj.position.y, 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.fillStyle = '#9932CC';
      ctx.beginPath();
      ctx.arc(proj.position.x, proj.position.y, 5, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawSplashEffects(ctx: CanvasRenderingContext2D, effects: ReturnType<typeof useGameStore.getState>['splashEffects']) {
  for (const effect of effects) {
    ctx.save();
    for (const frag of effect.fragments) {
      if (!frag.visible) continue;
      const x = effect.position.x + Math.cos(frag.angle) * frag.distance;
      const y = effect.position.y + Math.sin(frag.angle) * frag.distance;
      ctx.fillStyle = '#FFA500';
      ctx.beginPath();
      ctx.arc(x, y, 4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}

function drawIceParticles(ctx: CanvasRenderingContext2D, particles: ReturnType<typeof useGameStore.getState>['iceParticles']) {
  for (const p of particles) {
    ctx.save();
    ctx.globalAlpha = p.timer / 500;
    ctx.fillStyle = '#00BFFF';
    ctx.translate(p.position.x + p.offsetX, p.position.y + p.offsetY);
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const px = Math.cos(angle) * 5;
      const py = Math.sin(angle) * 5;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
}

function drawFloatingScores(ctx: CanvasRenderingContext2D, scores: ReturnType<typeof useGameStore.getState>['floatingScores']) {
  for (const fs of scores) {
    ctx.save();
    ctx.globalAlpha = fs.timer / 500;
    ctx.fillStyle = '#FFD700';
    ctx.font = 'bold 16px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`+${fs.value}`, fs.position.x, fs.position.y);
    ctx.restore();
  }
}

function easeOut(t: number, b: number, c: number, d: number): number {
  const tt = Math.min(t / d, 1);
  return b + c * (1 - Math.pow(1 - tt, 3));
}

export default GameCanvas;
