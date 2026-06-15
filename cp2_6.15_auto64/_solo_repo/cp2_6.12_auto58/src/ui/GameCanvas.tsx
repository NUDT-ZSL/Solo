import React, { useRef, useEffect, useCallback } from 'react';
import { GameState, TOWER_CONFIG, ENEMY_CONFIG, CELL_SIZE, CANVAS_WIDTH, CANVAS_HEIGHT, GRID_SIZE, TowerType, Particle } from '../game/types';
import { gridToPixel } from '../game/Collision';

interface GameCanvasProps {
  state: GameState;
  onCanvasClick: (x: number, y: number) => void;
  selectedTowerType: TowerType | null;
}

interface FPSMonitor {
  frames: number;
  lastCheck: number;
  fps: number;
}

export default function GameCanvas({ state, onCanvasClick, selectedTowerType }: GameCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fpsRef = useRef<FPSMonitor>({ frames: 0, lastCheck: performance.now(), fps: 0 });

  const drawGrid = useCallback((ctx: CanvasRenderingContext2D) => {
    ctx.strokeStyle = '#3a3a5c';
    ctx.lineWidth = 1;
    for (let i = 0; i <= GRID_SIZE; i++) {
      ctx.beginPath();
      ctx.moveTo(i * CELL_SIZE, 0);
      ctx.lineTo(i * CELL_SIZE, CANVAS_HEIGHT);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(0, i * CELL_SIZE);
      ctx.lineTo(CANVAS_WIDTH, i * CELL_SIZE);
      ctx.stroke();
    }

    for (let gy = 0; gy < GRID_SIZE; gy++) {
      if (gy === 1 || gy === 2) {
        ctx.fillStyle = 'rgba(60, 60, 100, 0.3)';
        ctx.fillRect(0, gy * CELL_SIZE, CANVAS_WIDTH, CELL_SIZE);
      }
    }
  }, []);

  const drawTowers = useCallback((ctx: CanvasRenderingContext2D, now: number) => {
    for (const tower of state.towers) {
      const pos = gridToPixel(tower.gridX, tower.gridY);
      const config = TOWER_CONFIG[tower.type];
      const scale = 1 + (tower.level - 1) * 0.2;
      const size = 20 * scale;

      const placeElapsed = now - tower.placeTime;
      if (placeElapsed < 400) {
        const progress = placeElapsed / 400;
        const swRadius = config.range * CELL_SIZE * progress;
        const swAlpha = 1 - progress;
        ctx.save();
        ctx.strokeStyle = `rgba(255, 255, 255, ${swAlpha})`;
        ctx.lineWidth = 3;
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, swRadius, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }

      ctx.save();
      ctx.translate(pos.x, pos.y);
      ctx.rotate(tower.rotation);

      const flashElapsed = now - tower.flashTime;
      const isFlashing = flashElapsed < 100;
      const baseColor = config.color;
      const fillColor = isFlashing ? '#ffffff' : baseColor;

      if (tower.level >= 2) {
        const darken = tower.level === 2 ? 0.85 : 0.7;
        if (!isFlashing) {
          ctx.fillStyle = adjustBrightness(baseColor, darken);
        } else {
          ctx.fillStyle = '#ffffff';
        }
      } else {
        ctx.fillStyle = fillColor;
      }

      if (tower.type === 'arrow') {
        ctx.beginPath();
        ctx.moveTo(0, -size);
        ctx.lineTo(size * 0.7, size * 0.5);
        ctx.lineTo(-size * 0.7, size * 0.5);
        ctx.closePath();
        ctx.fill();
      } else if (tower.type === 'cannon') {
        ctx.fillRect(-size, -size, size * 2, size * 2);
        ctx.fillStyle = '#555';
        ctx.fillRect(-size * 0.2, -size * 1.2, size * 0.4, size * 0.6);
      } else if (tower.type === 'magic') {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const px = Math.cos(angle) * size;
          const py = Math.sin(angle) * size;
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.closePath();
        ctx.fill();
        if (tower.level >= 2) {
          ctx.strokeStyle = `rgba(153, 50, 204, ${0.3 + Math.sin(now / 200) * 0.2})`;
          ctx.lineWidth = 2;
          ctx.stroke();
        }
      }

      ctx.restore();

      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, config.range * CELL_SIZE, 0, Math.PI * 2);
      ctx.stroke();
    }
  }, [state.towers]);

  const drawEnemies = useCallback((ctx: CanvasRenderingContext2D, now: number) => {
    for (const enemy of state.enemies) {
      const config = ENEMY_CONFIG[enemy.type];

      if (enemy.isDead) {
        const deathElapsed = now - enemy.deathTime;
        const deathProgress = Math.min(deathElapsed / 500, 1);
        const grayR = Math.floor(lerp(hexToRgb(config.color).r, 128, deathProgress));
        const grayG = Math.floor(lerp(hexToRgb(config.color).g, 128, deathProgress));
        const grayB = Math.floor(lerp(hexToRgb(config.color).b, 128, deathProgress));
        const alpha = 1 - deathProgress;
        const yOffset = -deathProgress * 30;

        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = `rgb(${grayR}, ${grayG}, ${grayB})`;

        if (enemy.type === 'flying') {
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y + yOffset, 8, 0, Math.PI * 2);
          ctx.fill();
        } else if (enemy.type === 'heavy') {
          ctx.fillRect(enemy.x - 10, enemy.y - 10 + yOffset, 20, 20);
        } else {
          ctx.beginPath();
          ctx.arc(enemy.x, enemy.y + yOffset, 8, 0, Math.PI * 2);
          ctx.fill();
        }
        ctx.restore();
        continue;
      }

      ctx.save();
      if (enemy.isFrozen) {
        ctx.fillStyle = '#88ccff';
        ctx.strokeStyle = '#aaeeff';
        ctx.lineWidth = 2;
      } else {
        ctx.fillStyle = config.color;
      }

      if (enemy.type === 'flying') {
        ctx.beginPath();
        ctx.moveTo(enemy.x, enemy.y - 10);
        ctx.lineTo(enemy.x - 8, enemy.y + 4);
        ctx.lineTo(enemy.x + 8, enemy.y + 4);
        ctx.closePath();
        ctx.fill();
      } else if (enemy.type === 'heavy') {
        ctx.fillRect(enemy.x - 10, enemy.y - 10, 20, 20);
      } else {
        ctx.beginPath();
        ctx.arc(enemy.x, enemy.y, 8, 0, Math.PI * 2);
        ctx.fill();
      }

      const hpRatio = enemy.hp / enemy.maxHp;
      const barWidth = 30;
      const barHeight = 4;
      ctx.fillStyle = '#333';
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y - 16, barWidth, barHeight);
      ctx.fillStyle = '#ff3333';
      ctx.fillRect(enemy.x - barWidth / 2, enemy.y - 16, barWidth * hpRatio, barHeight);

      ctx.restore();
    }
  }, [state.enemies]);

  const drawProjectiles = useCallback((ctx: CanvasRenderingContext2D) => {
    for (const proj of state.projectiles) {
      ctx.save();
      ctx.fillStyle = proj.color;
      ctx.shadowColor = proj.color;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.arc(proj.x, proj.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }, [state.projectiles]);

  const drawResources = useCallback((ctx: CanvasRenderingContext2D, now: number) => {
    for (const res of state.resources) {
      if (res.remainingClicks <= 0) continue;
      const pos = gridToPixel(res.gridX, res.gridY);

      ctx.save();
      if (res.type === 'gold') {
        ctx.fillStyle = '#ffd700';
        ctx.fillRect(pos.x - 12, pos.y - 12, 24, 24);
        ctx.strokeStyle = '#b8960f';
        ctx.lineWidth = 2;
        ctx.strokeRect(pos.x - 12, pos.y - 12, 24, 24);
      } else {
        ctx.fillStyle = '#8b4513';
        ctx.beginPath();
        ctx.ellipse(pos.x, pos.y, 10, 14, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#5c2e0a';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      ctx.fillStyle = '#fff';
      ctx.font = 'bold 10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(`${res.remainingClicks}`, pos.x, pos.y + 4);

      for (const ft of res.floatTexts) {
        const elapsed = now - ft.startTime;
        const progress = elapsed / ft.duration;
        const alpha = 1 - progress;
        const yOffset = -progress * 30;
        ctx.save();
        ctx.globalAlpha = alpha;
        ctx.fillStyle = ft.color;
        ctx.font = 'bold 14px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(ft.text, ft.x, ft.y + yOffset);
        ctx.restore();
      }
      ctx.restore();
    }
  }, [state.resources]);

  const drawParticles = useCallback((ctx: CanvasRenderingContext2D, now: number) => {
    for (const p of state.particles) {
      const lifeRatio = p.life / p.maxLife;
      const alpha = lifeRatio;

      ctx.save();
      ctx.globalAlpha = alpha;

      if (p.type === 'explosion') {
        ctx.fillStyle = p.color;
        const sz = (p.size ?? 4) * lifeRatio;
        ctx.beginPath();
        ctx.arc(p.x, p.y, sz, 0, Math.PI * 2);
        ctx.fill();
      } else if (p.type === 'ice') {
        ctx.fillStyle = p.color;
        ctx.strokeStyle = '#aaeeff';
        ctx.lineWidth = 1;
        const sz = (p.size ?? 5) * (0.8 + Math.sin(now / 100) * 0.2);
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - sz);
        ctx.lineTo(p.x + sz * 0.6, p.y);
        ctx.lineTo(p.x, p.y + sz);
        ctx.lineTo(p.x - sz * 0.6, p.y);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      } else if (p.type === 'shockwave') {
        const progress = 1 - lifeRatio;
        const radius = (p.size ?? 100) * progress;
        ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
        ctx.lineWidth = 3 * lifeRatio;
        ctx.beginPath();
        ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
        ctx.stroke();
      }

      ctx.restore();
    }
  }, [state.particles]);

  const drawFreezeOverlay = useCallback((ctx: CanvasRenderingContext2D, now: number) => {
    if (!state.freezeActive) return;
    const remaining = state.freezeEndTime - now;
    if (remaining <= 0) return;
    const flash = Math.sin(now / 100) * 0.05 + 0.1;
    ctx.save();
    ctx.fillStyle = `rgba(100, 180, 255, ${flash})`;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.restore();
  }, [state.freezeActive, state.freezeEndTime]);

  const drawWarningFlash = useCallback((ctx: CanvasRenderingContext2D, now: number) => {
    if (state.warningFlashTime <= 0) return;
    const elapsed = now - state.warningFlashTime;
    if (elapsed > 600) return;
    const flashIndex = Math.floor(elapsed / 150);
    const isInFlash = flashIndex % 2 === 0;
    if (isInFlash) {
      ctx.save();
      ctx.strokeStyle = 'rgba(255, 0, 0, 0.6)';
      ctx.lineWidth = 8;
      ctx.strokeRect(4, 4, CANVAS_WIDTH - 8, CANVAS_HEIGHT - 8);
      ctx.restore();
    }
  }, [state.warningFlashTime]);

  const drawSelectedTowerPreview = useCallback((ctx: CanvasRenderingContext2D) => {
    if (!selectedTowerType) return;
    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.font = '12px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`选中: ${selectedTowerType === 'arrow' ? '箭塔' : selectedTowerType === 'cannon' ? '炮塔' : '魔法塔'}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT - 10);
    ctx.restore();
  }, [selectedTowerType]);

  const drawFPS = useCallback((ctx: CanvasRenderingContext2D) => {
    const monitor = fpsRef.current;
    monitor.frames++;
    const now = performance.now();
    if (now - monitor.lastCheck >= 1000) {
      monitor.fps = monitor.frames;
      monitor.frames = 0;
      monitor.lastCheck = now;
    }
    ctx.save();
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`FPS: ${monitor.fps}`, CANVAS_WIDTH - 10, 20);
    ctx.restore();
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const now = performance.now();

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    drawGrid(ctx);
    drawResources(ctx, now);
    drawTowers(ctx, now);
    drawEnemies(ctx, now);
    drawProjectiles(ctx);
    drawParticles(ctx, now);
    drawFreezeOverlay(ctx, now);
    drawWarningFlash(ctx, now);
    drawSelectedTowerPreview(ctx);
    drawFPS(ctx);
  }, [state, drawGrid, drawResources, drawTowers, drawEnemies, drawProjectiles, drawParticles, drawFreezeOverlay, drawWarningFlash, drawSelectedTowerPreview, drawFPS]);

  const handleClick = useCallback((e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    onCanvasClick(x, y);
  }, [onCanvasClick]);

  return (
    <canvas
      ref={canvasRef}
      width={CANVAS_WIDTH}
      height={CANVAS_HEIGHT}
      onClick={handleClick}
      style={{
        border: '2px solid #3a3a5c',
        borderRadius: '8px',
        cursor: 'crosshair',
        width: '400px',
        height: '400px',
        imageRendering: 'pixelated'
      }}
    />
  );
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? { r: parseInt(result[1], 16), g: parseInt(result[2], 16), b: parseInt(result[3], 16) }
    : { r: 128, g: 128, b: 128 };
}

function adjustBrightness(hex: string, factor: number): string {
  const rgb = hexToRgb(hex);
  const r = Math.floor(rgb.r * factor);
  const g = Math.floor(rgb.g * factor);
  const b = Math.floor(rgb.b * factor);
  return `rgb(${r}, ${g}, ${b})`;
}
