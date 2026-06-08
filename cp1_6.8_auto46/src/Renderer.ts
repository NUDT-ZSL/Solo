import type { Tower, Enemy, Projectile, Particle, RuneEffect, TowerType, Point } from './types';
import { CELL_SIZE, GRID_COLS, GRID_ROWS, GRID_WALKABLE, PATH_WAYPOINTS, CANVAS_WIDTH, CANVAS_HEIGHT, TOWER_STATS, getTowerCenter, dist } from './types';
import { drawTowerShape } from './TowerSystem';
import { drawParticles } from './ParticleSystem';
import { getEnemySize } from './EnemyManager';

export function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number) {
  const oceanGrad = ctx.createLinearGradient(0, 0, 0, h);
  oceanGrad.addColorStop(0, '#1A5276');
  oceanGrad.addColorStop(0.5, '#1B4F72');
  oceanGrad.addColorStop(1, '#154360');
  ctx.fillStyle = oceanGrad;
  ctx.fillRect(0, 0, w, h);

  for (let r = 0; r < GRID_ROWS; r++) {
    for (let c = 0; c < GRID_COLS; c++) {
      if (GRID_WALKABLE[r][c]) {
        const x = c * CELL_SIZE;
        const y = r * CELL_SIZE;
        const woodGrad = ctx.createLinearGradient(x, y, x + CELL_SIZE, y + CELL_SIZE);
        woodGrad.addColorStop(0, '#D4B896');
        woodGrad.addColorStop(0.3, '#C9A87C');
        woodGrad.addColorStop(0.6, '#D4B896');
        woodGrad.addColorStop(1, '#BF9B6E');
        ctx.fillStyle = woodGrad;
        ctx.fillRect(x + 1, y + 1, CELL_SIZE - 2, CELL_SIZE - 2);
      }
    }
  }
}

export function drawGrid(ctx: CanvasRenderingContext2D, hoverCell: { gx: number; gy: number } | null, towers: Tower[]) {
  ctx.strokeStyle = 'rgba(100, 180, 220, 0.25)';
  ctx.lineWidth = 1;
  for (let r = 0; r <= GRID_ROWS; r++) {
    ctx.beginPath();
    ctx.moveTo(0, r * CELL_SIZE);
    ctx.lineTo(CANVAS_WIDTH, r * CELL_SIZE);
    ctx.stroke();
  }
  for (let c = 0; c <= GRID_COLS; c++) {
    ctx.beginPath();
    ctx.moveTo(c * CELL_SIZE, 0);
    ctx.lineTo(c * CELL_SIZE, CANVAS_HEIGHT);
    ctx.stroke();
  }

  if (hoverCell) {
    const { gx, gy } = hoverCell;
    const placeable = isCellPlaceableForHover(gx, gy, towers);
    ctx.fillStyle = placeable ? 'rgba(100, 220, 100, 0.3)' : 'rgba(220, 80, 80, 0.3)';
    ctx.fillRect(gx * CELL_SIZE, gy * CELL_SIZE, CELL_SIZE, CELL_SIZE);
  }
}

function isCellPlaceableForHover(gx: number, gy: number, towers: Tower[]): boolean {
  if (gx < 0 || gx >= GRID_COLS || gy < 0 || gy >= GRID_ROWS) return false;
  if (!GRID_WALKABLE[gy][gx]) return false;
  if (towers.some((t) => t.gridX === gx && t.gridY === gy)) return false;
  return true;
}

export function drawPath(ctx: CanvasRenderingContext2D) {
  ctx.strokeStyle = 'rgba(139, 115, 85, 0.5)';
  ctx.lineWidth = CELL_SIZE * 0.6;
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(PATH_WAYPOINTS[0].x, PATH_WAYPOINTS[0].y);
  for (let i = 1; i < PATH_WAYPOINTS.length; i++) {
    ctx.lineTo(PATH_WAYPOINTS[i].x, PATH_WAYPOINTS[i].y);
  }
  ctx.stroke();

  ctx.strokeStyle = 'rgba(160, 140, 110, 0.3)';
  ctx.lineWidth = CELL_SIZE * 0.4;
  ctx.beginPath();
  ctx.moveTo(PATH_WAYPOINTS[0].x, PATH_WAYPOINTS[0].y);
  for (let i = 1; i < PATH_WAYPOINTS.length; i++) {
    ctx.lineTo(PATH_WAYPOINTS[i].x, PATH_WAYPOINTS[i].y);
  }
  ctx.stroke();
}

export function drawFog(ctx: CanvasRenderingContext2D, time: number) {
  const startX = 0;
  const fogWidth = CELL_SIZE * 2.5;
  const grad = ctx.createLinearGradient(startX, 0, startX + fogWidth, 0);
  const alpha = 0.3 + Math.sin(time * 0.002) * 0.1;
  grad.addColorStop(0, `rgba(30, 40, 50, ${alpha})`);
  grad.addColorStop(1, 'rgba(30, 40, 50, 0)');
  ctx.fillStyle = grad;
  ctx.fillRect(startX, 0, fogWidth, CANVAS_HEIGHT);
}

export function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, time: number) {
  if (enemy.isDead) return;
  const { x, y } = enemy.position;
  const size = getEnemySize(enemy.type);
  const shakeX = enemy.shakeTimer > 0 ? (Math.random() - 0.5) * 6 : 0;
  const shakeY = enemy.shakeTimer > 0 ? (Math.random() - 0.5) * 6 : 0;
  const drawX = x + shakeX;
  const drawY = y + shakeY;

  ctx.save();
  if (enemy.flashTimer > 0) {
    ctx.globalAlpha = 0.6 + Math.sin(enemy.flashTimer * 0.05) * 0.4;
  }

  switch (enemy.type) {
    case 'normal': {
      ctx.fillStyle = enemy.flashTimer > 0 ? '#FFFFFF' : '#2E4057';
      ctx.beginPath();
      ctx.arc(drawX, drawY, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#4A6FA5';
      for (let i = 0; i < 4; i++) {
        const a = (Math.PI * 2 * i) / 4 + time * 0.002;
        ctx.beginPath();
        ctx.arc(drawX + Math.cos(a) * size * 0.6, drawY + Math.sin(a) * size * 0.6, size * 0.25, 0, Math.PI * 2);
        ctx.fill();
      }
      break;
    }
    case 'elite': {
      ctx.fillStyle = enemy.flashTimer > 0 ? '#FFFFFF' : '#4A6FA5';
      ctx.beginPath();
      ctx.ellipse(drawX, drawY, size * 1.1, size * 0.8, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#708090';
      ctx.beginPath();
      ctx.arc(drawX, drawY - size * 0.3, size * 0.5, Math.PI, 0);
      ctx.fill();
      ctx.fillStyle = '#C0C0C0';
      ctx.beginPath();
      ctx.ellipse(drawX, drawY, size * 0.7, size * 0.4, 0, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'boss': {
      ctx.fillStyle = enemy.flashTimer > 0 ? '#FFFFFF' : '#8B0000';
      ctx.beginPath();
      ctx.ellipse(drawX, drawY, size * 1.2, size, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#A52A2A';
      ctx.beginPath();
      ctx.moveTo(drawX - size * 0.8, drawY - size * 0.5);
      ctx.quadraticCurveTo(drawX, drawY - size * 1.5, drawX + size * 0.8, drawY - size * 0.5);
      ctx.fill();
      ctx.fillStyle = '#FFD700';
      ctx.beginPath();
      ctx.arc(drawX - size * 0.3, drawY - size * 0.15, size * 0.12, 0, Math.PI * 2);
      ctx.arc(drawX + size * 0.3, drawY - size * 0.15, size * 0.12, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }

  if (enemy.slowTimer > 0) {
    ctx.strokeStyle = 'rgba(155, 89, 182, 0.6)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(drawX, drawY, size + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.restore();

  if (enemy.hp < enemy.maxHp) {
    const barW = size * 2;
    const barH = 4;
    const barX = drawX - barW / 2;
    const barY = drawY - size - 10;
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(barX, barY, barW, barH);
    const hpRatio = enemy.hp / enemy.maxHp;
    ctx.fillStyle = hpRatio > 0.5 ? '#2ECC71' : hpRatio > 0.25 ? '#F39C12' : '#E74C3C';
    ctx.fillRect(barX, barY, barW * hpRatio, barH);
  }
}

export function drawProjectile(ctx: CanvasRenderingContext2D, proj: Projectile) {
  const t = proj.progress;
  const x = proj.fromX + (proj.toX - proj.fromX) * t;
  const y = proj.fromY + (proj.toY - proj.fromY) * t;

  ctx.save();
  switch (proj.type) {
    case 'arrow': {
      const angle = Math.atan2(proj.toY - proj.fromY, proj.toX - proj.fromX);
      ctx.translate(x, y);
      ctx.rotate(angle);
      ctx.fillStyle = '#F4D03F';
      ctx.beginPath();
      ctx.moveTo(10, 0);
      ctx.lineTo(-6, -3);
      ctx.lineTo(-6, 3);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = '#F4D03F';
      ctx.lineWidth = 1;
      ctx.globalAlpha = 0.4;
      ctx.beginPath();
      ctx.moveTo(-6, 0);
      ctx.lineTo(-14, 0);
      ctx.stroke();
      break;
    }
    case 'cannon': {
      ctx.fillStyle = '#333';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#FF6B35';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
    case 'magic': {
      ctx.strokeStyle = '#9B59B6';
      ctx.lineWidth = 2;
      ctx.globalAlpha = 0.7;
      const rot = (t * Math.PI * 4);
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const a = rot + (Math.PI * 2 * i) / 3;
        const rx = x + Math.cos(a) * 8;
        const ry = y + Math.sin(a) * 8;
        if (i === 0) ctx.moveTo(rx, ry);
        else ctx.lineTo(rx, ry);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.fillStyle = '#E8DAEF';
      ctx.beginPath();
      ctx.arc(x, y, 3, 0, Math.PI * 2);
      ctx.fill();
      break;
    }
  }
  ctx.restore();
}

export function drawRuneEffect(ctx: CanvasRenderingContext2D, rune: RuneEffect) {
  const alpha = Math.max(0, rune.life / rune.maxLife) * 0.4;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = '#9B59B6';
  ctx.lineWidth = 2;
  ctx.translate(rune.x, rune.y);
  ctx.rotate(rune.rotation);

  const innerR = 15;
  const outerR = 25;
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI * 2 * i) / 6;
    ctx.beginPath();
    ctx.moveTo(Math.cos(a) * innerR, Math.sin(a) * innerR);
    ctx.lineTo(Math.cos(a) * outerR, Math.sin(a) * outerR);
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(0, 0, innerR, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(0, 0, outerR, 0, Math.PI * 2);
  ctx.stroke();

  ctx.restore();
}

export function drawSplashEffect(ctx: CanvasRenderingContext2D, x: number, y: number, radius: number, progress: number) {
  const alpha = 1 - progress;
  ctx.save();
  ctx.globalAlpha = alpha * 0.5;
  ctx.strokeStyle = '#FF6B35';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.arc(x, y, radius * progress, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawTowerRange(ctx: CanvasRenderingContext2D, tower: Tower) {
  const center = getTowerCenter(tower.gridX, tower.gridY);
  const range = TOWER_STATS[tower.type][tower.level - 1].range;
  ctx.save();
  ctx.strokeStyle = 'rgba(244, 208, 63, 0.3)';
  ctx.lineWidth = 1;
  ctx.setLineDash([5, 5]);
  ctx.beginPath();
  ctx.arc(center.x, center.y, range, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function render(
  ctx: CanvasRenderingContext2D,
  towers: Tower[],
  enemies: Enemy[],
  projectiles: Projectile[],
  particles: Particle[],
  runeEffects: RuneEffect[],
  hoverCell: { gx: number; gy: number } | null,
  selectedTower: Tower | null,
  time: number
) {
  const w = ctx.canvas.width;
  const h = ctx.canvas.height;

  ctx.clearRect(0, 0, w, h);
  drawBackground(ctx, w, h);
  drawPath(ctx);
  drawGrid(ctx, hoverCell, towers);
  drawFog(ctx, time);

  if (selectedTower) {
    drawTowerRange(ctx, selectedTower);
  }

  for (const tower of towers) {
    const bounceY = tower.placeAnimProgress < 1
      ? -15 * Math.sin(tower.placeAnimProgress * Math.PI)
      : 0;
    drawTowerShape(ctx, tower, bounceY);
  }

  for (const rune of runeEffects) {
    drawRuneEffect(ctx, rune);
  }

  for (const proj of projectiles) {
    drawProjectile(ctx, proj);
  }

  for (const enemy of enemies) {
    drawEnemy(ctx, enemy, time);
  }

  drawParticles(ctx, particles);
}
