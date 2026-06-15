import { gameConfig } from './controls';
import { GameState, Player, Asteroid, Crystal, Enemy, Bullet, Particle, Star } from './entities';

let bgCacheCanvas: HTMLCanvasElement | null = null;
let bgCacheWidth = 0;
let bgCacheHeight = 0;

export function invalidateBackgroundCache(): void {
  bgCacheCanvas = null;
}

function buildBackgroundCache(stars: Star[]): void {
  if (bgCacheCanvas &&
      bgCacheWidth === gameConfig.canvasWidth &&
      bgCacheHeight === gameConfig.canvasHeight) {
    return;
  }

  bgCacheCanvas = document.createElement('canvas');
  bgCacheCanvas.width = gameConfig.canvasWidth;
  bgCacheCanvas.height = gameConfig.canvasHeight;
  bgCacheWidth = gameConfig.canvasWidth;
  bgCacheHeight = gameConfig.canvasHeight;

  const ctx = bgCacheCanvas.getContext('2d');
  if (!ctx) return;

  const gradient = ctx.createLinearGradient(0, 0, 0, gameConfig.canvasHeight);
  gradient.addColorStop(0, '#0B0C10');
  gradient.addColorStop(1, '#1A202C');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, gameConfig.canvasWidth, gameConfig.canvasHeight);

  for (const s of stars) {
    const alpha = s.baseAlpha * (0.6 + 0.4 * Math.sin(s.phase));
    ctx.fillStyle = `rgba(226, 232, 240, ${alpha})`;
    ctx.fillRect(Math.floor(s.x), Math.floor(s.y), Math.ceil(s.size), Math.ceil(s.size));
  }
}

export function renderBackground(ctx: CanvasRenderingContext2D, state: GameState): void {
  buildBackgroundCache(state.stars);
  if (bgCacheCanvas) {
    ctx.drawImage(bgCacheCanvas, 0, 0);
  }

  for (const s of state.stars) {
    const alpha = s.baseAlpha * (0.6 + 0.4 * Math.sin(s.phase));
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.5})`;
    ctx.fillRect(Math.floor(s.x), Math.floor(s.y), Math.ceil(s.size), Math.ceil(s.size));
  }
}

function drawPlayer(ctx: CanvasRenderingContext2D, p: Player): void {
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);

  if (p.invincibleTimer > 0 && Math.floor(p.invincibleTimer / 4) % 2 === 0) {
    ctx.globalAlpha = 0.4;
  }

  ctx.beginPath();
  ctx.moveTo(14, 0);
  ctx.lineTo(-10, 10);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-10, -10);
  ctx.closePath();

  ctx.fillStyle = p.hitFlashTimer > 0 ? '#FFFFFF' : '#4FD1C5';
  ctx.fill();
  ctx.strokeStyle = '#81E6D9';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.fillStyle = '#234E52';
  ctx.fillRect(-2, -2, 6, 4);

  ctx.restore();
}

function drawAsteroid(ctx: CanvasRenderingContext2D, a: Asteroid): void {
  ctx.save();
  ctx.translate(a.x, a.y);
  ctx.rotate(a.rotation);

  ctx.beginPath();
  for (let i = 0; i < a.points.length; i += 2) {
    const angle = a.points[i];
    const r = a.points[i + 1];
    const x = Math.cos(angle) * r;
    const y = Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  const grad = ctx.createRadialGradient(-a.size * 0.2, -a.size * 0.2, a.size * 0.1, 0, 0, a.size);
  grad.addColorStop(0, '#CBD5E0');
  grad.addColorStop(0.5, a.isFragment ? '#718096' : '#A0AEC0');
  grad.addColorStop(1, '#4A5568');
  ctx.fillStyle = grad;
  ctx.fill();

  ctx.strokeStyle = '#2D3748';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  if (!a.isFragment) {
    ctx.fillStyle = '#F6E05E';
    const crystalDisplay = Math.min(a.crystalCount, 3);
    for (let i = 0; i < crystalDisplay; i++) {
      const angle = (i / crystalDisplay) * Math.PI * 2 + a.rotation;
      const r = a.size * 0.4;
      const cx = Math.cos(angle) * r;
      const cy = Math.sin(angle) * r;
      ctx.save();
      ctx.translate(cx, cy);
      ctx.rotate(Math.PI / 4);
      ctx.fillRect(-3, -3, 6, 6);
      ctx.restore();
    }
  }

  if (a.isFragment) {
    const alpha = Math.min(1, a.life / 60);
    ctx.globalAlpha = alpha;
  }

  ctx.restore();
}

function drawCrystal(ctx: CanvasRenderingContext2D, c: Crystal): void {
  for (let i = c.trail.length - 1; i >= 0; i--) {
    const t = c.trail[i];
    const alpha = t.alpha * 0.5;
    ctx.fillStyle = `rgba(246, 224, 94, ${alpha})`;
    const size = 6 * t.alpha;
    ctx.save();
    ctx.translate(t.x, t.y);
    ctx.rotate(Math.PI / 4);
    ctx.fillRect(-size / 2, -size / 2, size, size);
    ctx.restore();
  }

  ctx.save();
  ctx.translate(c.x, c.y);
  ctx.rotate(Math.PI / 4);

  ctx.shadowColor = '#F6E05E';
  ctx.shadowBlur = 8;

  ctx.fillStyle = '#F6E05E';
  ctx.fillRect(-5, -5, 10, 10);

  ctx.fillStyle = '#FEFCBF';
  ctx.fillRect(-5, -5, 4, 4);

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawEnemy(ctx: CanvasRenderingContext2D, e: Enemy, playerX: number, playerY: number): void {
  if (!e.active) return;

  const d = Math.sqrt((e.x - playerX) ** 2 + (e.y - playerY) ** 2);
  const isChasing = d < gameConfig.enemyShootDistance + 30;

  ctx.save();
  ctx.translate(e.x, e.y);

  if (isChasing) {
    ctx.shadowColor = '#FC8181';
    ctx.shadowBlur = 18;
  }

  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(angle) * 20;
    const y = Math.sin(angle) * 20;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();

  ctx.fillStyle = '#FC8181';
  ctx.fill();
  ctx.strokeStyle = '#FEB2B2';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.shadowBlur = 0;

  ctx.fillStyle = '#742A2A';
  ctx.beginPath();
  ctx.arc(0, 0, 7, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = isChasing ? '#FED7D7' : '#FC8181';
  ctx.beginPath();
  ctx.arc(0, 0, 4, 0, Math.PI * 2);
  ctx.fill();

  const hpBarWidth = 28;
  const hpX = -hpBarWidth / 2;
  const hpY = -30;
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.fillRect(hpX, hpY, hpBarWidth, 4);
  ctx.fillStyle = '#FC8181';
  ctx.fillRect(hpX, hpY, hpBarWidth * (e.hp / gameConfig.enemyHp), 4);

  ctx.restore();
}

function drawBullet(ctx: CanvasRenderingContext2D, b: Bullet): void {
  ctx.save();
  ctx.translate(b.x, b.y);

  if (b.isEnemy) {
    ctx.shadowColor = '#FC8181';
    ctx.shadowBlur = 10;
    ctx.fillStyle = '#FC8181';
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#FED7D7';
    ctx.beginPath();
    ctx.arc(0, 0, 2, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawParticle(ctx: CanvasRenderingContext2D, p: Particle): void {
  const alpha = p.life / p.maxLife;
  ctx.fillStyle = p.color;
  ctx.globalAlpha = alpha;
  ctx.fillRect(Math.floor(p.x - p.size / 2), Math.floor(p.y - p.size / 2), p.size, p.size);
  ctx.globalAlpha = 1;
}

function drawLaser(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (!state.laser.active) return;

  const p = state.player;
  const dx = Math.cos(p.angle);
  const dy = Math.sin(p.angle);
  const startX = p.x + dx * 14;
  const startY = p.y + dy * 14;
  const endX = state.laser.hitX || (p.x + dx * gameConfig.laserRange);
  const endY = state.laser.hitY || (p.y + dy * gameConfig.laserRange);

  ctx.save();

  if (state.laser.flashTimer > 0) {
    ctx.shadowColor = '#FFFFFF';
    ctx.shadowBlur = 20;
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 6;
  } else {
    ctx.shadowColor = '#4FD1C5';
    ctx.shadowBlur = 12;
    ctx.strokeStyle = '#4FD1C5';
    ctx.lineWidth = 3;
  }

  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.strokeStyle = '#E6FFFA';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(endX, endY);
  ctx.stroke();

  ctx.restore();
}

function drawUI(ctx: CanvasRenderingContext2D, state: GameState, fps: number): void {
  ctx.save();

  ctx.fillStyle = 'rgba(11, 12, 16, 0.8)';
  roundRect(ctx, 12, 12, 170, 64, 8);
  ctx.fill();

  ctx.fillStyle = '#E2E8F0';
  ctx.font = 'bold 14px Consolas, monospace';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';

  ctx.fillStyle = '#F6E05E';
  ctx.fillText('◆', 24, 24);
  ctx.fillStyle = '#E2E8F0';
  ctx.fillText(`水晶库存: ${state.crystalStock}`, 42, 24);

  ctx.fillStyle = '#A0AEC0';
  ctx.fillText('总开采量:', 24, 48);
  ctx.fillStyle = '#63B3ED';
  ctx.fillText(`${state.totalMined}`, 104, 48);

  ctx.fillStyle = '#A0AEC0';
  ctx.font = '12px Consolas, monospace';
  ctx.textAlign = 'right';
  ctx.fillText(`FPS: ${fps}`, gameConfig.canvasWidth - 14, 14);

  ctx.restore();
}

function roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
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

function drawScreenFlash(ctx: CanvasRenderingContext2D, state: GameState): void {
  if (state.screenFlashTimer <= 0) return;
  const alpha = state.screenFlashTimer / 9 * 0.4;
  ctx.fillStyle = `rgba(252, 129, 129, ${alpha})`;
  ctx.fillRect(0, 0, gameConfig.canvasWidth, gameConfig.canvasHeight);
}

export function render(ctx: CanvasRenderingContext2D, state: GameState, fps: number): void {
  renderBackground(ctx, state);

  for (const a of state.asteroids) {
    drawAsteroid(ctx, a);
  }

  for (const c of state.crystals) {
    drawCrystal(ctx, c);
  }

  for (const p of state.particles) {
    drawParticle(ctx, p);
  }

  for (const b of state.bullets) {
    drawBullet(ctx, b);
  }

  for (const e of state.enemies) {
    drawEnemy(ctx, e, state.player.x, state.player.y);
  }

  drawLaser(ctx, state);

  drawPlayer(ctx, state.player);

  drawUI(ctx, state, fps);

  drawScreenFlash(ctx, state);
}
