import { GameSnapshot, StatusEffectType } from './CombatEngine';
import { TileType } from './MapGenerator';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const TILE_SIZE = 30;
const GRID_COLS = 20;
const GRID_ROWS = 20;
const GRID_OFFSET_X = Math.floor((CANVAS_WIDTH - GRID_COLS * TILE_SIZE) / 2);
const GRID_OFFSET_Y = Math.floor((CANVAS_HEIGHT - GRID_ROWS * TILE_SIZE) / 2);
const PORTAL_ROTATION_PERIOD_MS = 2000;

const COLORS = {
  background: '#1e293b',
  gridLine: '#334155',
  roomFloor: '#2d3748',
  corridor: '#4a5568',
  wall: '#0f172a',
  wallEdge: '#1e293b',
  door: '#8b5e3c',
  doorEdge: '#5a3e22',
  trap: '#1a1a2e',
  trapPattern: '#2d1b4e',
  portalGold: '#f6e05e',
  portalGoldDim: '#d4a82d',
  portalInner: '#fef08a',
  playerBody: '#3b82f6',
  playerEdge: '#1d4ed8',
  playerPupil: '#93c5fd',
  enemyBody: '#dc2626',
  enemyEdge: '#991b1b',
  burnFlicker: '#ff6b35',
  freezeOverlay: 'rgba(173,216,230,0.4)',
  projectileCore: '#ffffff',
  projectileHalo: 'rgba(200,220,255,0.6)',
  hudBg: 'rgba(15,23,42,0.85)',
  hudBorder: 'rgba(100,116,139,0.4)',
  hudBorderDamage: 'rgba(239,68,68,0.9)',
  hudBorderFreeze: 'rgba(173,216,230,0.9)',
  hpBarBg: '#374151',
  hpStart: '#ef4444',
  hpEnd: '#22c55e',
  hpMid: '#eab308',
  textWhite: '#ffffff',
  textMuted: '#94a3b8',
  iconFloor: '#f6e05e',
  iconEnemy: '#dc2626',
  burnParticle1: '#ff6b35',
  burnParticle2: '#ffc24a',
  freezeParticle: 'rgba(173,216,230,0.55)',
};

export function getGridOffset(): { x: number; y: number } {
  return { x: GRID_OFFSET_X, y: GRID_OFFSET_Y };
}

export function render(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  timeMs: number,
): void {
  ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.fillStyle = COLORS.background;
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  renderGrid(ctx, snapshot.grid);
  renderTrapMarks(ctx, snapshot.grid);
  renderPortal(ctx, snapshot.portalPos, timeMs);
  renderEnemyFreezeOverlay(ctx, snapshot.enemies);
  renderParticles(ctx, snapshot.particles);
  renderProjectiles(ctx, snapshot.projectiles);
  renderEnemies(ctx, snapshot.enemies, timeMs);
  renderPlayer(ctx, snapshot);
  renderHUD(ctx, snapshot, timeMs);
  renderFloorBannerIfNeeded(ctx, timeMs);
  renderGameOver(ctx, snapshot, timeMs);
}

let lastFloorShown = 0;
let floorBannerUntil = 0;
function renderFloorBannerIfNeeded(ctx: CanvasRenderingContext2D, timeMs: number): void {
  if (timeMs < floorBannerUntil) {
    const alpha = Math.min(1, (floorBannerUntil - timeMs) / 800);
    ctx.save();
    ctx.globalAlpha = alpha * 0.9;
    ctx.fillStyle = 'rgba(15,23,42,0.75)';
    ctx.fillRect(0, CANVAS_HEIGHT / 2 - 40, CANVAS_WIDTH, 80);
    ctx.fillStyle = COLORS.portalGold;
    ctx.font = 'bold 32px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(`FLOOR ${lastFloorShown}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 10);
    ctx.restore();
  }
}

export function triggerFloorBanner(floor: number, timeMs: number): void {
  lastFloorShown = floor;
  floorBannerUntil = timeMs + 1800;
}

function renderGrid(ctx: CanvasRenderingContext2D, grid: TileType[][]): void {
  if (!grid || grid.length === 0) return;

  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      const px = GRID_OFFSET_X + x * TILE_SIZE;
      const py = GRID_OFFSET_Y + y * TILE_SIZE;
      const tile = grid[y][x];

      if (tile === TileType.Wall) {
        ctx.fillStyle = COLORS.wall;
        ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
        ctx.fillStyle = COLORS.wallEdge;
        ctx.fillRect(px, py + TILE_SIZE - 2, TILE_SIZE, 2);
        ctx.fillRect(px + TILE_SIZE - 2, py, 2, TILE_SIZE);
        continue;
      }

      let isCorridor = tile === TileType.Floor;
      if (isCorridor) {
        let roomLike = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            const ny = y + dy;
            const nx = x + dx;
            if (ny < 0 || ny >= grid.length || nx < 0 || nx >= grid[0].length) continue;
            if (grid[ny][nx] === TileType.Floor) roomLike++;
          }
        }
        ctx.fillStyle = roomLike >= 8 ? COLORS.roomFloor : COLORS.corridor;
      }

      ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);

      if (tile === TileType.Door) {
        ctx.fillStyle = COLORS.door;
        ctx.fillRect(px + 2, py + 2, TILE_SIZE - 4, TILE_SIZE - 4);
        ctx.strokeStyle = COLORS.doorEdge;
        ctx.lineWidth = 1;
        ctx.strokeRect(px + 2.5, py + 2.5, TILE_SIZE - 5, TILE_SIZE - 5);
        ctx.fillStyle = '#d4a82d';
        ctx.fillRect(px + TILE_SIZE - 8, py + TILE_SIZE / 2 - 1, 3, 3);
      }

      ctx.strokeStyle = COLORS.gridLine;
      ctx.lineWidth = 0.5;
      ctx.strokeRect(px + 0.5, py + 0.5, TILE_SIZE - 1, TILE_SIZE - 1);
    }
  }

  ctx.strokeStyle = '#0f172a';
  ctx.lineWidth = 2;
  ctx.strokeRect(
    GRID_OFFSET_X,
    GRID_OFFSET_Y,
    GRID_COLS * TILE_SIZE,
    GRID_ROWS * TILE_SIZE,
  );
}

function renderTrapMarks(ctx: CanvasRenderingContext2D, grid: TileType[][]): void {
  if (!grid || grid.length === 0) return;
  for (let y = 0; y < grid.length; y++) {
    for (let x = 0; x < grid[y].length; x++) {
      if (grid[y][x] !== TileType.Trap) continue;
      const px = GRID_OFFSET_X + x * TILE_SIZE;
      const py = GRID_OFFSET_Y + y * TILE_SIZE;
      ctx.strokeStyle = COLORS.trapPattern;
      ctx.lineWidth = 1;
      ctx.strokeRect(px + 4, py + 4, TILE_SIZE - 8, TILE_SIZE - 8);
      ctx.beginPath();
      ctx.moveTo(px + 4, py + 4);
      ctx.lineTo(px + TILE_SIZE - 4, py + TILE_SIZE - 4);
      ctx.moveTo(px + TILE_SIZE - 4, py + 4);
      ctx.lineTo(px + 4, py + TILE_SIZE - 4);
      ctx.stroke();
    }
  }
}

function renderPortal(
  ctx: CanvasRenderingContext2D,
  portalPos: { x: number; y: number },
  timeMs: number,
): void {
  const px = GRID_OFFSET_X + portalPos.x * TILE_SIZE;
  const py = GRID_OFFSET_Y + portalPos.y * TILE_SIZE;
  const cx = px + TILE_SIZE / 2;
  const cy = py + TILE_SIZE / 2;
  const r = TILE_SIZE / 2 - 3;

  const rotation = ((timeMs % PORTAL_ROTATION_PERIOD_MS) / PORTAL_ROTATION_PERIOD_MS) * Math.PI * 2;

  const pulse = 0.5 + 0.5 * Math.sin(timeMs / 250);
  ctx.fillStyle = `rgba(246,224,94,${0.08 + 0.08 * pulse})`;
  ctx.beginPath();
  ctx.arc(cx, cy, r + 6, 0, Math.PI * 2);
  ctx.fill();

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(rotation);

  ctx.strokeStyle = COLORS.portalGold;
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i;
    const px1 = Math.cos(a) * r;
    const py1 = Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px1, py1);
    else ctx.lineTo(px1, py1);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.rotate(-Math.PI / 4);
  ctx.strokeStyle = COLORS.portalGoldDim;
  ctx.lineWidth = 2;
  const rInner = r * 0.6;
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (Math.PI / 2) * i;
    const px1 = Math.cos(a) * rInner;
    const py1 = Math.sin(a) * rInner;
    if (i === 0) ctx.moveTo(px1, py1);
    else ctx.lineTo(px1, py1);
  }
  ctx.closePath();
  ctx.stroke();

  ctx.restore();

  ctx.fillStyle = COLORS.portalInner;
  ctx.beginPath();
  ctx.arc(cx, cy, 2.5 + 1.5 * pulse, 0, Math.PI * 2);
  ctx.fill();
}

function renderPlayer(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
): void {
  const px = GRID_OFFSET_X + snapshot.playerPos.x * TILE_SIZE;
  const py = GRID_OFFSET_Y + snapshot.playerPos.y * TILE_SIZE;
  const size = 16;
  const ox = (TILE_SIZE - size) / 2;

  ctx.strokeStyle = COLORS.playerEdge;
  ctx.lineWidth = 1.5;
  ctx.fillStyle = COLORS.playerBody;
  ctx.fillRect(px + ox, py + ox, size, size);
  ctx.strokeRect(px + ox + 0.5, py + ox + 0.5, size - 1, size - 1);

  ctx.fillStyle = COLORS.playerPupil;
  ctx.fillRect(px + ox + 4, py + ox + 5, 3, 3);
  ctx.fillRect(px + ox + 9, py + ox + 5, 3, 3);

  if (snapshot.playerDamageFlash > 0) {
    ctx.fillStyle = `rgba(239,68,68,${Math.min(1, snapshot.playerDamageFlash / 0.4)})`;
    ctx.fillRect(px, py, TILE_SIZE, TILE_SIZE);
  }
  if (snapshot.playerFreezeFlash > 0) {
    ctx.fillStyle = `rgba(173,216,230,${Math.min(1, snapshot.playerFreezeFlash / 0.15 + 0.3)})`;
    ctx.fillRect(px + ox, py + ox, size, size);
  }
}

function renderEnemyFreezeOverlay(
  ctx: CanvasRenderingContext2D,
  enemies: GameSnapshot['enemies'],
): void {
  for (const enemy of enemies) {
    const hasFreeze = enemy.statusEffects.some((s) => s.type === StatusEffectType.Freeze);
    if (!hasFreeze) continue;

    const px = GRID_OFFSET_X + enemy.x * TILE_SIZE;
    const py = GRID_OFFSET_Y + enemy.y * TILE_SIZE;
    const size = 16;
    const ox = (TILE_SIZE - size) / 2;

    ctx.fillStyle = COLORS.freezeOverlay;
    ctx.fillRect(px + ox, py + ox, size, size);

    ctx.strokeStyle = 'rgba(173,216,230,0.6)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(px + ox + 2, py + ox + 2);
    ctx.lineTo(px + ox + size - 2, py + ox + size - 2);
    ctx.moveTo(px + ox + size - 2, py + ox + 2);
    ctx.lineTo(px + ox + 2, py + ox + size - 2);
    ctx.stroke();
  }
}

function renderEnemies(
  ctx: CanvasRenderingContext2D,
  enemies: GameSnapshot['enemies'],
  _timeMs: number,
): void {
  for (const enemy of enemies) {
    const px = GRID_OFFSET_X + enemy.x * TILE_SIZE;
    const py = GRID_OFFSET_Y + enemy.y * TILE_SIZE;
    const size = 16;
    const ox = (TILE_SIZE - size) / 2;
    const hasBurn = enemy.statusEffects.some((s) => s.type === StatusEffectType.Burn);

    if (hasBurn) {
      ctx.fillStyle = COLORS.burnFlicker;
      ctx.globalAlpha = 0.35 + 0.25 * Math.random();
      ctx.fillRect(px + ox - 1, py + ox - 1, size + 2, size + 2);
      ctx.globalAlpha = 1;
    }

    ctx.strokeStyle = COLORS.enemyEdge;
    ctx.lineWidth = 1.5;

    if (enemy.hitFlash > 0) {
      ctx.fillStyle = '#ffffff';
    } else {
      ctx.fillStyle = COLORS.enemyBody;
    }

    ctx.fillRect(px + ox, py + ox, size, size);
    ctx.strokeRect(px + ox + 0.5, py + ox + 0.5, size - 1, size - 1);

    const ratio = enemy.hp / enemy.maxHp;
    if (ratio < 1) {
      const barW = size;
      const barH = 3;
      const bx = px + ox;
      const by = py + ox - 6;
      ctx.fillStyle = '#1f2937';
      ctx.fillRect(bx, by, barW, barH);
      let color = COLORS.hpEnd;
      if (ratio <= 0.5) color = COLORS.hpMid;
      if (ratio <= 0.25) color = COLORS.hpStart;
      ctx.fillStyle = color;
      ctx.fillRect(bx, by, Math.max(0, barW * ratio), barH);
    }

    ctx.fillStyle = '#000';
    ctx.fillRect(px + ox + 4, py + ox + 5, 3, 3);
    ctx.fillRect(px + ox + 9, py + ox + 5, 3, 3);
  }
}

function renderProjectiles(ctx: CanvasRenderingContext2D, projectiles: GameSnapshot['projectiles']): void {
  for (const p of projectiles) {
    const lifeRatio = p.life / p.maxLife;
    const alpha = Math.max(0.2, lifeRatio);
    const r = p.radius * (0.6 + 0.6 * lifeRatio);

    const sx = p.x + GRID_OFFSET_X;
    const sy = p.y + GRID_OFFSET_Y;

    const gradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, r + 5);
    gradient.addColorStop(0, `rgba(255,255,255,${alpha})`);
    gradient.addColorStop(0.4, `rgba(200,220,255,${alpha * 0.7})`);
    gradient.addColorStop(1, 'rgba(150,180,255,0)');

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(sx, sy, r + 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = `rgba(255,255,255,${alpha})`;
    ctx.beginPath();
    ctx.arc(sx, sy, r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function renderParticles(ctx: CanvasRenderingContext2D, particles: GameSnapshot['particles']): void {
  for (const p of particles) {
    const alpha = Math.max(0, Math.min(1, p.alpha * (p.life / p.maxLife)));
    const sx = p.x + GRID_OFFSET_X;
    const sy = p.y + GRID_OFFSET_Y;

    if (p.kind === 'burn') {
      const grad = ctx.createRadialGradient(sx, sy, 0, sx, sy, p.size * 1.5);
      grad.addColorStop(0, p.color);
      grad.addColorStop(1, 'rgba(255,107,53,0)');
      ctx.globalAlpha = alpha;
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(sx, sy, p.size * 1.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.globalAlpha = 1;
    } else if (p.kind === 'freeze') {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(sx - p.size / 2, sy - p.size / 2, p.size, p.size);
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = alpha;
      ctx.fillStyle = p.color;
      ctx.fillRect(sx - p.size / 2, sy - p.size / 2, p.size, p.size);
      ctx.globalAlpha = 1;
    }
  }
}

function renderHUD(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  timeMs: number,
): void {
  const hudX = CANVAS_WIDTH - 260;
  const hudY = 16;
  const hudW = 244;
  const hudH = 110;
  const pad = 12;

  const hasDamage = snapshot.playerDamageFlash > 0;
  const hasFreeze = snapshot.playerFreezeFlash > 0;
  const damagePulse = 0.5 + 0.5 * Math.sin(timeMs / 80);
  const freezePulse = 0.5 + 0.5 * Math.sin(timeMs / 100);

  let borderColor = COLORS.hudBorder;
  let borderWidth = 1;
  if (hasDamage) {
    borderColor = `rgba(239,68,68,${0.6 + 0.4 * damagePulse})`;
    borderWidth = 2.5;
  } else if (hasFreeze) {
    borderColor = `rgba(173,216,230,${0.6 + 0.4 * freezePulse})`;
    borderWidth = 2.5;
  }

  ctx.fillStyle = COLORS.hudBg;
  roundRect(ctx, hudX, hudY, hudW, hudH, 8);
  ctx.fill();

  ctx.lineWidth = borderWidth;
  ctx.strokeStyle = borderColor;
  roundRect(ctx, hudX + borderWidth / 2, hudY + borderWidth / 2, hudW - borderWidth, hudH - borderWidth, 8);
  ctx.stroke();

  ctx.font = '16px monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  ctx.fillStyle = COLORS.iconFloor;
  ctx.beginPath();
  const iconX = hudX + pad;
  const iconY = hudY + pad + 8;
  const iconR = 8;
  for (let i = 0; i < 6; i++) {
    const a = (Math.PI / 3) * i - Math.PI / 2;
    const xx = iconX + Math.cos(a) * iconR;
    const yy = iconY + Math.sin(a) * iconR;
    if (i === 0) ctx.moveTo(xx, yy);
    else ctx.lineTo(xx, yy);
  }
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = COLORS.textWhite;
  ctx.fillText(`Floor ${snapshot.currentFloor}`, hudX + pad + 20, hudY + pad + 14);

  const hpBarX = hudX + pad;
  const hpBarY = hudY + pad + 26;
  const hpBarW = hudW - pad * 2;
  const hpBarH = 14;
  const hpRatio = Math.max(0, snapshot.playerHp / snapshot.playerMaxHp);

  ctx.fillStyle = COLORS.hpBarBg;
  roundRect(ctx, hpBarX, hpBarY, hpBarW, hpBarH, 6);
  ctx.fill();

  if (hpRatio > 0) {
    const filledW = Math.max(2, hpBarW * hpRatio);
    const grad = ctx.createLinearGradient(hpBarX, 0, hpBarX + hpBarW, 0);
    grad.addColorStop(0, COLORS.hpStart);
    grad.addColorStop(0.5, COLORS.hpMid);
    grad.addColorStop(1, COLORS.hpEnd);

    ctx.save();
    roundRect(ctx, hpBarX, hpBarY, filledW, hpBarH, 6);
    ctx.clip();
    ctx.fillStyle = grad;
    ctx.fillRect(hpBarX, hpBarY, hpBarW, hpBarH);
    ctx.restore();
  }

  ctx.strokeStyle = 'rgba(15,23,42,0.6)';
  ctx.lineWidth = 1;
  roundRect(ctx, hpBarX + 0.5, hpBarY + 0.5, hpBarW - 1, hpBarH - 1, 6);
  ctx.stroke();

  ctx.font = 'bold 11px monospace';
  ctx.fillStyle = COLORS.textWhite;
  ctx.textAlign = 'center';
  ctx.fillText(
    `${Math.ceil(snapshot.playerHp)} / ${snapshot.playerMaxHp}`,
    hpBarX + hpBarW / 2,
    hpBarY + 10.5,
  );

  ctx.font = '12px monospace';
  ctx.textAlign = 'left';
  ctx.fillStyle = COLORS.iconEnemy;
  ctx.fillRect(hudX + pad, hudY + pad + 56, 9, 9);
  ctx.fillStyle = COLORS.textMuted;
  ctx.fillText(`Enemies: ${snapshot.enemies.length}`, hudX + pad + 14, hudY + pad + 64);

  renderStatusBadges(ctx, snapshot, hudX, hudY + hudH - 4, hudW, pad, timeMs);
}

function renderStatusBadges(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  hudX: number,
  hudY: number,
  hudW: number,
  pad: number,
  timeMs: number,
): void {
  const hasBurn = snapshot.playerStatusEffects.some((e) => e.type === StatusEffectType.Burn);
  const hasFreeze = snapshot.playerStatusEffects.some((e) => e.type === StatusEffectType.Freeze);

  if (!hasBurn && !hasFreeze) return;

  let x = hudX + pad;
  ctx.font = '12px monospace';

  if (hasBurn) {
    const flicker = 0.5 + 0.5 * Math.sin(timeMs / 100);
    ctx.fillStyle = `rgba(255,107,53,${0.25 + 0.25 * flicker})`;
    roundRect(ctx, x, hudY - 22, 90, 18, 4);
    ctx.fill();
    ctx.fillStyle = COLORS.burnParticle1;
    ctx.fillText('🔥 BURNING', x + 8, hudY - 8);
    x += 96;
  }
  if (hasFreeze) {
    ctx.fillStyle = `rgba(173,216,230,0.22)`;
    roundRect(ctx, x, hudY - 22, 88, 18, 4);
    ctx.fill();
    ctx.fillStyle = '#add8e6';
    ctx.fillText('❄ FROZEN', x + 8, hudY - 8);
  }
}

function renderGameOver(
  ctx: CanvasRenderingContext2D,
  snapshot: GameSnapshot,
  timeMs: number,
): void {
  if (!snapshot.gameover) return;

  ctx.fillStyle = 'rgba(0,0,0,0.7)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const shake = Math.sin(timeMs / 60) * 2;
  ctx.save();
  ctx.translate(shake, 0);

  ctx.font = 'bold 52px monospace';
  ctx.fillStyle = '#ef4444';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'alphabetic';
  ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 - 28);

  ctx.restore();

  ctx.font = '20px monospace';
  ctx.fillStyle = '#e2e8f0';
  ctx.fillText(`You reached Floor ${snapshot.currentFloor}`, CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 12);

  ctx.font = '14px monospace';
  ctx.fillStyle = COLORS.textMuted;
  const flash = 0.5 + 0.5 * Math.sin(timeMs / 300);
  ctx.globalAlpha = 0.5 + 0.5 * flash;
  ctx.fillText('Press R to restart', CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2 + 56);
  ctx.globalAlpha = 1;
}

function roundRect(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number,
): void {
  const radius = Math.min(r, Math.min(w, h) / 2);
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + w - radius, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + radius);
  ctx.lineTo(x + w, y + h - radius);
  ctx.quadraticCurveTo(x + w, y + h, x + w - radius, y + h);
  ctx.lineTo(x + radius, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}
