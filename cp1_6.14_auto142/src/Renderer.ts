import { GameSnapshot, StatusEffectType } from './CombatEngine';
import { TileType } from './MapGenerator';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const TILE_SIZE = 30;
const GRID_OFFSET_X = Math.floor((CANVAS_WIDTH - 20 * TILE_SIZE) / 2);
const GRID_OFFSET_Y = Math.floor((CANVAS_HEIGHT - 20 * TILE_SIZE) / 2);

const COLORS = {
  background: '#1e293b',
  gridLine: '#334155',
  roomFloor: '#2d3748',
  corridor: '#4a5568',
  wall: '#0f172a',
  door: '#8b5e3c',
  trap: '#1a1a2e',
  portalGold: '#f6e05e',
  portalInner: '#fef08a',
  playerBody: '#3b82f6',
  playerPupil: '#93c5fd',
  enemyBody: '#dc2626',
  burnFlicker: '#ff6b35',
  freezeOverlay: 'rgba(173,216,230,0.4)',
  projectile: '#ffffff',
  hudBg: 'rgba(15,23,42,0.85)',
  hpBarBg: '#374151',
  hpHigh: '#22c55e',
  hpMid: '#eab308',
  hpLow: '#ef4444',
  textWhite: '#ffffff',
};

export function getGridOffset(): { x: number; y: number } {
  return { x: GRID_OFFSET_X, y: GRID_OFFSET_Y };
}

export function render(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot, time: number): void {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  renderGrid(ctx, snapshot.grid);
  renderPortal(ctx, snapshot.portalPos, time);
  renderParticles(ctx, snapshot.particles);
  renderProjectiles(ctx, snapshot.projectiles, time);
  renderEnemies(ctx, snapshot.enemies, snapshot.hitEnemyId, time);
  renderPlayer(ctx, snapshot.playerPos, snapshot.playerDamageFlash, snapshot.playerFreezeFlash, time);
  renderHUD(ctx, snapshot);
  renderStatusEffectsHUD(ctx, snapshot);

  if (snapshot.gameover) {
    renderGameOver(ctx, snapshot);
  }
}

function renderGrid(ctx: CanvasRenderingContext2D, grid: TileType[][]): void {
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const px = GRID_OFFSET_X + x * TILE_SIZE;
      const py = GRID_OFFSET_Y + y * TILE_SIZE;
      const tile = grid[y][x];

      switch (tile) {
        case TileType.Wall:
          ctx.fillStyle = COLORS.wall;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          break;
        case TileType.Floor:
          ctx.fillStyle = COLORS.roomFloor;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          break;
        case TileType.Door:
          ctx.fillStyle = COLORS.door;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          break;
        case TileType.Portal:
          ctx.fillStyle = COLORS.roomFloor;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          break;
        case TileType.Trap:
          ctx.fillStyle = COLORS.trap;
          ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
          ctx.strokeStyle = '#2d1b4e';
          ctx.lineWidth = 1;
          ctx.strokeRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
          ctx.beginPath();
          ctx.moveTo(px + 4, py + 4);
          ctx.lineTo(px + TILE_SIZE - 4, py + TILE_SIZE - 4);
          ctx.moveTo(px + TILE_SIZE - 4, py + 4);
          ctx.lineTo(px + 4, py + TILE_SIZE - 4);
          ctx.stroke();
          break;
      }

      if (tile !== TileType.Wall) {
        ctx.strokeStyle = COLORS.gridLine;
        ctx.lineWidth = 0.5;
        ctx.strokeRect(px, py, TILE_SIZE, TILE_SIZE);
      }
    }
  }

  ctx.strokeStyle = COLORS.gridLine;
  ctx.lineWidth = 1;
  ctx.strokeRect(
    GRID_OFFSET_X,
    GRID_OFFSET_Y,
    20 * TILE_SIZE,
    20 * TILE_SIZE,
  );
}

function renderPortal(ctx: CanvasRenderingContext2D, portalPos: { x: number; y: number }, time: number): void {
  const px = GRID_OFFSET_X + portalPos.x * TILE_SIZE;
  const py = GRID_OFFSET_Y + portalPos.y * TILE_SIZE;
  const rotation = (time / 2000) * Math.PI * 2;
  const cx = px + TILE_SIZE / 2;
  const cy = py + TILE_SIZE / 2;
  const r = TILE_SIZE / 2 - 2;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  ctx.strokeStyle = COLORS.portalGold;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i;
    const x1 = Math.cos(angle) * r;
    const y1 = Math.sin(angle) * r;
    if (i === 0) {
      ctx.moveTo(x1, y1);
    } else {
      ctx.lineTo(x1, y1);
    }
  }
  ctx.closePath();
  ctx.stroke();

  ctx.strokeStyle = COLORS.portalInner;
  ctx.lineWidth = 1.5;
  const innerR = r * 0.6;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const angle = (Math.PI / 2) * i + Math.PI / 4;
    const x1 = Math.cos(angle) * innerR;
    const y1 = Math.sin(angle) * innerR;
    if (i === 0) {
      ctx.moveTo(x1, y1);
    } else {
      ctx.lineTo(x1, y1);
    }
  }
  ctx.closePath();
  ctx.stroke();

  ctx.restore();

  const glowAlpha = 0.2 + 0.1 * Math.sin(time / 300);
  ctx.fillStyle = `rgba(246,224,94,${glowAlpha})`;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 3, 0, Math.PI * 2);
  ctx.fill();
}

function renderPlayer(
  ctx: CanvasRenderingContext2D,
  pos: { x: number; y: number },
  damageFlash: number,
  freezeFlash: number,
  _time: number,
): void {
  const px = GRID_OFFSET_X + pos.x * TILE_SIZE;
  const py = GRID_OFFSET_Y + pos.y * TILE_SIZE;
  const size = 16;
  const offset = (TILE_SIZE - size) / 2;

  ctx.fillStyle = COLORS.playerBody;
  ctx.fillRect(px + offset, py + offset, size, size);

  ctx.fillStyle = COLORS.playerPupil;
  ctx.fillRect(px + offset + 4, py + offset + 4, 3, 3);
  ctx.fillRect(px + offset + 9, py + offset + 4, 3, 3);

  if (damageFlash > 0) {
    ctx.fillStyle = `rgba(239,68,68,${damageFlash})`;
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
  }

  if (freezeFlash > 0) {
    ctx.fillStyle = `rgba(173,216,230,${freezeFlash})`;
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
  }
}

function renderEnemies(
  ctx: CanvasRenderingContext2D,
  enemies: GameSnapshot['enemies'],
  hitEnemyId: number | null,
  time: number,
): void {
  for (const enemy of enemies) {
    const px = GRID_OFFSET_X + enemy.x * TILE_SIZE;
    const py = GRID_OFFSET_Y + enemy.y * TILE_SIZE;
    const size = 16;
    const offset = (TILE_SIZE - size) / 2;

    const isBurning = enemy.statusEffects.some((e) => e.type === StatusEffectType.Burn);
    const isFrozen = enemy.statusEffects.some((e) => e.type === StatusEffectType.Freeze);

    if (isBurning) {
      const flickerAlpha = 0.3 + 0.3 * Math.sin(time / 80);
      ctx.fillStyle = `rgba(255,107,53,${flickerAlpha})`;
      ctx.fillRect(px + offset - 1, py + offset - 1, size + 2, size + 2);
    }

    if (enemy.id === hitEnemyId) {
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(px + offset - 1, py + offset - 1, size + 2, size + 2);
    }

    ctx.fillStyle = COLORS.enemyBody;
    ctx.fillRect(px + offset, py + offset, size, size);

    if (isBurning) {
      const burnAlpha = 0.2 + 0.15 * Math.sin(time / 100);
      ctx.fillStyle = `rgba(255,107,53,${burnAlpha})`;
      ctx.fillRect(px + offset, py + offset, size, size);
    }

    if (isFrozen) {
      ctx.fillStyle = COLORS.freezeOverlay;
      ctx.fillRect(px + offset, py + offset, size, size);
    }

    const hpRatio = enemy.hp / enemy.maxHp;
    if (hpRatio < 1) {
      const barWidth = size;
      const barHeight = 2;
      ctx.fillStyle = '#374151';
      ctx.fillRect(px + offset, py + offset - 4, barWidth, barHeight);
      ctx.fillStyle = hpRatio > 0.5 ? '#22c55e' : hpRatio > 0.25 ? '#eab308' : '#ef4444';
      ctx.fillRect(px + offset, py + offset - 4, barWidth * hpRatio, barHeight);
    }
  }
}

function renderProjectiles(ctx: CanvasRenderingContext2D, projectiles: GameSnapshot['projectiles'], _time: number): void {
  for (const proj of projectiles) {
    const lifeRatio = proj.life / proj.maxLife;
    const radius = proj.radius * lifeRatio;

    const gradient = ctx.createRadialGradient(proj.x, proj.y, 0, proj.x, proj.y, radius + 2);
    gradient.addColorStop(0, `rgba(255,255,255,${lifeRatio})`);
    gradient.addColorStop(0.5, `rgba(200,220,255,${lifeRatio * 0.7})`);
    gradient.addColorStop(1, `rgba(150,180,255,0)`);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, radius + 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255,255,255,${lifeRatio})`;
    ctx.beginPath();
    ctx.arc(proj.x, proj.y, radius, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderParticles(ctx: CanvasRenderingContext2D, particles: GameSnapshot['particles']): void {
  for (const p of particles) {
    const alpha = Math.max(0, p.life / p.maxLife) * p.alpha;
    ctx.globalAlpha = alpha;
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
  ctx.globalAlpha = 1;
}

function renderHUD(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot): void {
  const hudX = CANVAS_WIDTH - 240;
  const hudY = 16;
  const hudW = 224;
  const hudH = 90;

  ctx.fillStyle = COLORS.hudBg;
  roundRect(ctx, hudX, hudY, hudW, hudH, 8);
  ctx.fill();

  ctx.font = '16px monospace';
  ctx.fillStyle = COLORS.textWhite;
  ctx.textAlign = 'left';

  ctx.fillText(`⚔ Floor ${snapshot.currentFloor}`, hudX + 12, hudY + 26);

  const hpBarX = hudX + 12;
  const hpBarY = hudY + 40;
  const hpBarW = 200;
  const hpBarH = 12;
  const hpRatio = snapshot.playerHp / snapshot.playerMaxHp;

  ctx.fillStyle = COLORS.hpBarBg;
  roundRect(ctx, hpBarX, hpBarY, hpBarW, hpBarH, 6);
  ctx.fill();

  if (hpRatio > 0) {
    const hpGradient = ctx.createLinearGradient(hpBarX, 0, hpBarX + hpBarW, 0);
    if (hpRatio > 0.5) {
      hpGradient.addColorStop(0, '#22c55e');
      hpGradient.addColorStop(1, '#4ade80');
    } else if (hpRatio > 0.25) {
      hpGradient.addColorStop(0, '#eab308');
      hpGradient.addColorStop(1, '#facc15');
    } else {
      hpGradient.addColorStop(0, '#ef4444');
      hpGradient.addColorStop(1, '#f87171');
    }

    ctx.fillStyle = hpGradient;
    roundRect(ctx, hpBarX, hpBarY, hpBarW * hpRatio, hpBarH, 6);
    ctx.fill();
  }

  ctx.font = 'bold 10px monospace';
  ctx.fillStyle = COLORS.textWhite;
  ctx.textAlign = 'center';
  ctx.fillText(
    `${Math.ceil(snapshot.playerHp)} / ${snapshot.playerMaxHp}`,
    hpBarX + hpBarW / 2,
    hpBarY + 10,
  );

  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`Enemies: ${snapshot.enemies.length}`, hudX + 12, hudY + 76);
}

function renderStatusEffectsHUD(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot): void {
  const hudX = CANVAS_WIDTH - 240;
  const hudY = 116;

  const hasBurn = snapshot.playerStatusEffects.some((e) => e.type === StatusEffectType.Burn);
  const hasFreeze = snapshot.playerStatusEffects.some((e) => e.type === StatusEffectType.Freeze);

  if (!hasBurn && !hasFreeze) return;

  ctx.fillStyle = COLORS.hudBg;
  roundRect(ctx, hudX, hudY, 224, 30, 8);
  ctx.fill();

  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  let offsetX = hudX + 12;

  if (hasBurn) {
    ctx.fillStyle = '#ff6b35';
    ctx.fillText('🔥 BURNING', offsetX, hudY + 20);
    offsetX += 90;
  }
  if (hasFreeze) {
    ctx.fillStyle = '#add8e6';
    ctx.fillText('❄ FROZEN', offsetX, hudY + 20);
  }
}

function renderGameOver(ctx: CanvasRenderingContext2D, snapshot: GameSnapshot): void {
  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  ctx.font = 'bold 48px monospace';
  ctx.fillStyle = '#ef4444';
  ctx.textAlign = 'center';
  ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 20);

  ctx.font = '20px monospace';
  ctx.fillStyle = '#94a3b8';
  ctx.fillText(`Reached Floor ${snapshot.currentFloor}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 20);

  ctx.font = '16px monospace';
  ctx.fillStyle = '#64748b';
  ctx.fillText('Press R to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 60);
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + r);
  ctx.lineTo(x + w, y + h - r);
  ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
  ctx.lineTo(x + r, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}
