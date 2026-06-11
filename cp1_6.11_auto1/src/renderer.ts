import type {
  RenderInput,
  OrbitState,
  PlanetState,
  BlackHoleState,
  BallState,
  ParticleState,
  AimData
} from './types';
import {
  CANVAS_WIDTH,
  CANVAS_HEIGHT,
  LAUNCH_POS
} from './types_internal';

interface Star {
  x: number;
  y: number;
  size: number;
  phase: number;
  freq: number;
}

interface RendererCache {
  bgCanvas: HTMLCanvasElement | null;
  stars: Star[];
}

const cache: RendererCache = {
  bgCanvas: null,
  stars: []
};

let gameOverBtn: { x: number; y: number; w: number; h: number } | null = null;

function initStars(): void {
  if (cache.stars.length > 0) return;
  cache.stars = [];
  for (let i = 0; i < 28; i++) {
    cache.stars.push({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      size: 2 + Math.random() * 2.5,
      phase: Math.random() * Math.PI * 2,
      freq: 1.5 + Math.random() * 2.5
    });
  }
}

function buildBackgroundCache(): void {
  if (cache.bgCanvas) return;
  const c = document.createElement('canvas');
  c.width = CANVAS_WIDTH;
  c.height = CANVAS_HEIGHT;
  const g = c.getContext('2d');
  if (!g) return;
  cache.bgCanvas = c;

  const rg = g.createRadialGradient(
    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 40,
    CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, CANVAS_WIDTH * 0.85
  );
  rg.addColorStop(0, '#0B1026');
  rg.addColorStop(1, '#1A0E30');
  g.fillStyle = rg;
  g.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  for (let n = 0; n < 4; n++) {
    const cx = 100 + Math.random() * (CANVAS_WIDTH - 200);
    const cy = 100 + Math.random() * (CANVAS_HEIGHT - 200);
    const r = 80 + Math.random() * 120;
    const palette = [
      'rgba(100, 60, 180, 0.08)',
      'rgba(60, 100, 200, 0.07)',
      'rgba(180, 60, 140, 0.06)',
      'rgba(60, 180, 180, 0.06)'
    ];
    const ng = g.createRadialGradient(cx, cy, 0, cx, cy, r);
    ng.addColorStop(0, palette[n % 4]);
    ng.addColorStop(1, 'rgba(0,0,0,0)');
    g.fillStyle = ng;
    g.beginPath();
    g.arc(cx, cy, r, 0, Math.PI * 2);
    g.fill();
  }
}

function drawBackground(ctx: CanvasRenderingContext2D): void {
  buildBackgroundCache();
  if (cache.bgCanvas) ctx.drawImage(cache.bgCanvas, 0, 0);
}

function drawStars(ctx: CanvasRenderingContext2D, elapsed: number): void {
  initStars();
  for (const s of cache.stars) {
    const f = 0.5 + 0.5 * Math.sin(elapsed * s.freq + s.phase);
    ctx.globalAlpha = 0.2 + 0.55 * f;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(s.x, s.y, s.size * (0.8 + 0.4 * f), 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
}

function drawGravityField(
  ctx: CanvasRenderingContext2D,
  planets: readonly PlanetState[],
  bh: BlackHoleState,
  planetRanges: readonly number[]
): void {
  for (let i = 0; i < planets.length; i++) {
    const p = planets[i];
    const range = planetRanges[i] ?? 180;
    const g = ctx.createRadialGradient(
      p.pos.x, p.pos.y, p.radius,
      p.pos.x, p.pos.y, range
    );
    g.addColorStop(0, hexA(p.color, 0.08));
    g.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, range, 0, Math.PI * 2);
    ctx.fill();
  }

  const bg = ctx.createRadialGradient(
    bh.pos.x, bh.pos.y, bh.radius * 0.5,
    bh.pos.x, bh.pos.y, bh.gravityRange
  );
  bg.addColorStop(0, 'rgba(120, 30, 140, 0.18)');
  bg.addColorStop(0.5, 'rgba(74, 14, 78, 0.08)');
  bg.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.arc(bh.pos.x, bh.pos.y, bh.gravityRange, 0, Math.PI * 2);
  ctx.fill();
}

function drawOrbit(ctx: CanvasRenderingContext2D, orbit: OrbitState): void {
  ctx.save();
  ctx.translate(orbit.center.x, orbit.center.y);
  ctx.rotate(orbit.rotation);

  ctx.shadowColor = orbit.color;
  ctx.shadowBlur = orbit.cooldown > 0 ? 8 : 20;
  ctx.strokeStyle = orbit.color;
  ctx.lineWidth = orbit.thickness;
  ctx.globalAlpha = orbit.cooldown > 0 ? 0.4 : 0.95;
  ctx.beginPath();
  ctx.arc(0, 0, orbit.radius, 0, Math.PI * 2);
  ctx.stroke();

  ctx.lineWidth = orbit.thickness * 0.4;
  ctx.strokeStyle = '#FFFFFF';
  ctx.globalAlpha = orbit.cooldown > 0 ? 0.15 : 0.55;
  ctx.shadowBlur = 4;
  ctx.beginPath();
  ctx.arc(0, 0, orbit.radius, 0, Math.PI * 2);
  ctx.stroke();

  const markers = 6;
  for (let i = 0; i < markers; i++) {
    const a = (i / markers) * Math.PI * 2;
    const x = Math.cos(a) * orbit.radius;
    const y = Math.sin(a) * orbit.radius;
    ctx.shadowBlur = 10;
    ctx.fillStyle = orbit.color;
    ctx.globalAlpha = orbit.cooldown > 0 ? 0.5 : 1;
    ctx.beginPath();
    ctx.arc(x, y, orbit.thickness * 0.7, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.shadowBlur = 0;
  ctx.globalAlpha = 1;
  ctx.restore();
}

function drawPlanet(ctx: CanvasRenderingContext2D, p: PlanetState): void {
  let scale = 1;
  if (p.pulseTimer > 0) {
    const t = p.pulseTimer / 0.3;
    scale = 1 + 0.2 * Math.sin(t * Math.PI);
  }
  const r = p.radius * scale;
  ctx.save();
  ctx.shadowColor = p.color;
  ctx.shadowBlur = p.pulseTimer > 0 ? 32 : 22;
  const g = ctx.createRadialGradient(
    p.pos.x - r * 0.32, p.pos.y - r * 0.32, r * 0.08,
    p.pos.x, p.pos.y, r
  );
  g.addColorStop(0, light(p.color, 50));
  g.addColorStop(0.45, p.color);
  g.addColorStop(1, dark(p.color, 40));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(p.pos.x, p.pos.y, r, 0, Math.PI * 2);
  ctx.fill();

  ctx.globalAlpha = 0.35;
  ctx.strokeStyle = light(p.color, 60);
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(p.pos.x - r * 0.15, p.pos.y - r * 0.15, r * 0.55, Math.PI * 0.8, Math.PI * 1.5);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawBlackHole(
  ctx: CanvasRenderingContext2D,
  bh: BlackHoleState,
  elapsed: number
): void {
  ctx.save();
  const outerR = bh.radius * 3.2;
  const rg = ctx.createRadialGradient(
    bh.pos.x, bh.pos.y, bh.radius * 0.8,
    bh.pos.x, bh.pos.y, outerR
  );
  rg.addColorStop(0, 'rgba(180, 60, 200, 0.55)');
  rg.addColorStop(0.4, 'rgba(120, 30, 160, 0.35)');
  rg.addColorStop(0.75, 'rgba(74, 14, 78, 0.18)');
  rg.addColorStop(1, 'rgba(74, 14, 78, 0)');
  ctx.fillStyle = rg;
  ctx.beginPath();
  ctx.arc(bh.pos.x, bh.pos.y, outerR, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(bh.pos.x, bh.pos.y);
  ctx.rotate(elapsed * 1.8);
  for (let i = 0; i < 3; i++) {
    ctx.rotate((Math.PI * 2) / 3);
    const ag = ctx.createRadialGradient(0, 0, bh.radius * 0.9, 0, 0, bh.radius * 2.6);
    ag.addColorStop(0, 'rgba(200, 80, 220, 0.4)');
    ag.addColorStop(1, 'rgba(200, 80, 220, 0)');
    ctx.fillStyle = ag;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    const sp = 0.5;
    ctx.arc(0, 0, bh.radius * 2.6, -sp, sp);
    ctx.closePath();
    ctx.fill();
  }
  ctx.rotate(-elapsed * 1.8);
  ctx.translate(-bh.pos.x, -bh.pos.y);

  ctx.shadowColor = '#000000';
  ctx.shadowBlur = 35;
  ctx.fillStyle = '#000000';
  ctx.beginPath();
  ctx.arc(bh.pos.x, bh.pos.y, bh.radius, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = 'rgba(200, 100, 220, 0.8)';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#C864DC';
  ctx.shadowBlur = 18;
  ctx.beginPath();
  ctx.arc(bh.pos.x, bh.pos.y, bh.radius * 1.12, 0, Math.PI * 2);
  ctx.stroke();

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawBall(ctx: CanvasRenderingContext2D, ball: BallState): void {
  ctx.save();
  let color = '#00E5FF';
  if (ball.goldTimer > 0) color = '#FFD700';
  if (ball.absorbing) color = mix(color, '#4A0E4E', 0.4);
  const r = Math.max(1, ball.radius);

  ctx.shadowColor = color;
  ctx.shadowBlur = ball.boostTimer > 0 ? 35 : ball.goldTimer > 0 ? 30 : 20;

  const g = ctx.createRadialGradient(
    ball.pos.x - r * 0.3, ball.pos.y - r * 0.3, r * 0.08,
    ball.pos.x, ball.pos.y, r
  );
  g.addColorStop(0, '#FFFFFF');
  g.addColorStop(0.4, color);
  g.addColorStop(1, dark(color, 45));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(ball.pos.x, ball.pos.y, r, 0, Math.PI * 2);
  ctx.fill();

  if (ball.boostTimer > 0 && !ball.absorbing) {
    ctx.globalAlpha = 0.5 + 0.5 * Math.sin(ball.boostTimer * 30);
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 25;
    ctx.beginPath();
    ctx.arc(ball.pos.x, ball.pos.y, r + 4, 0, Math.PI * 2);
    ctx.stroke();
  }

  ctx.shadowBlur = 0;
  ctx.restore();
}

function drawLaunchPad(ctx: CanvasRenderingContext2D): void {
  ctx.save();
  ctx.shadowColor = '#00E5FF';
  ctx.shadowBlur = 18;
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.7)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(LAUNCH_POS.x, LAUNCH_POS.y, 22, 0, Math.PI * 2);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(LAUNCH_POS.x, LAUNCH_POS.y, 30, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = 'rgba(0, 229, 255, 0.6)';
  ctx.beginPath();
  ctx.arc(LAUNCH_POS.x, LAUNCH_POS.y, 3, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawAim(ctx: CanvasRenderingContext2D, aim: AimData): void {
  if (!aim.isActive) return;
  const start = aim.startPos;
  const end = aim.endPos;
  const a = aim.angleRad;
  const pct = aim.powerPercent;

  ctx.save();

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.35)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  ctx.setLineDash([2, 10]);
  const predEndX = start.x + Math.cos(a) * (60 + pct * 120);
  const predEndY = start.y + Math.sin(a) * (60 + pct * 120);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(predEndX, predEndY);
  ctx.stroke();
  ctx.setLineDash([]);

  ctx.strokeStyle = '#FFFFFF';
  ctx.lineWidth = 3;
  ctx.setLineDash([10, 7]);
  ctx.beginPath();
  ctx.moveTo(start.x, start.y);
  ctx.lineTo(end.x, end.y);
  ctx.stroke();
  ctx.setLineDash([]);

  const arrow = 12;
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = '#FFFFFF';
  ctx.shadowBlur = 10;
  ctx.beginPath();
  ctx.moveTo(end.x, end.y);
  ctx.lineTo(
    end.x - arrow * Math.cos(a - Math.PI / 6),
    end.y - arrow * Math.sin(a - Math.PI / 6)
  );
  ctx.lineTo(
    end.x - arrow * Math.cos(a + Math.PI / 6),
    end.y - arrow * Math.sin(a + Math.PI / 6)
  );
  ctx.closePath();
  ctx.fill();
  ctx.shadowBlur = 0;

  const bw = 130;
  const bh = 14;
  const bx = start.x - 10;
  const by = start.y + 38;
  ctx.fillStyle = 'rgba(255, 255, 255, 0.12)';
  roundR(ctx, bx, by, bw, bh, 7);
  ctx.fill();

  const barCol = pct < 0.33 ? '#4D96FF' : pct < 0.66 ? '#6BCB77' : '#FF6B6B';
  const fg = ctx.createLinearGradient(bx, by, bx + bw, by);
  fg.addColorStop(0, light(barCol, 30));
  fg.addColorStop(1, barCol);
  ctx.fillStyle = fg;
  ctx.shadowColor = barCol;
  ctx.shadowBlur = 12;
  roundR(ctx, bx, by, bw * (0.1 + pct * 0.9), bh, 7);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
  ctx.lineWidth = 1;
  roundR(ctx, bx, by, bw, bh, 7);
  ctx.stroke();

  ctx.font = 'bold 14px sans-serif';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 6;
  ctx.fillText(`${aim.angleDeg.toFixed(0)}°`, bx, by - 6);
  ctx.textAlign = 'right';
  ctx.fillText(`${aim.power.toFixed(1)}`, bx + bw, by - 6);
  ctx.shadowBlur = 0;

  ctx.restore();
}

function drawScore(ctx: CanvasRenderingContext2D, score: number): void {
  ctx.save();
  ctx.font = 'bold 28px sans-serif';
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillText(`分数: ${score}`, 24, 24);
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 6;
  ctx.fillText(`分数: ${score}`, 22, 22);
  ctx.restore();
}

function drawLaunches(ctx: CanvasRenderingContext2D, n: number): void {
  ctx.save();
  ctx.font = 'bold 24px sans-serif';
  ctx.textAlign = 'right';
  ctx.textBaseline = 'bottom';
  ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
  ctx.fillText(`剩余次数: ${n}`, CANVAS_WIDTH - 18, CANVAS_HEIGHT - 18);
  ctx.fillStyle = '#FFFFFF';
  ctx.shadowColor = 'rgba(0, 0, 0, 0.55)';
  ctx.shadowBlur = 6;
  ctx.fillText(`剩余次数: ${n}`, CANVAS_WIDTH - 20, CANVAS_HEIGHT - 20);

  for (let i = 0; i < 3; i++) {
    const dx = CANVAS_WIDTH - 20 - i * 22;
    const dy = CANVAS_HEIGHT - 55;
    ctx.fillStyle = i < n ? '#00E5FF' : 'rgba(255,255,255,0.2)';
    ctx.shadowColor = i < n ? '#00E5FF' : 'transparent';
    ctx.shadowBlur = i < n ? 10 : 0;
    ctx.beginPath();
    ctx.arc(dx, dy, 7, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

function drawParticles(ctx: CanvasRenderingContext2D, ps: readonly ParticleState[]): void {
  for (const p of ps) {
    const a = Math.max(0, p.life / p.maxLife);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = p.color;
    ctx.shadowColor = p.color;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(p.pos.x, p.pos.y, Math.max(0.5, p.size * (0.5 + 0.5 * a)), 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

function drawFlash(
  ctx: CanvasRenderingContext2D,
  timer: number,
  color: string
): void {
  if (timer <= 0 || !color) return;
  const i = Math.min(1, timer);
  const pulse = 0.6 + 0.4 * Math.sin(timer * 25);
  ctx.save();
  const alpha = i * 0.85 * pulse;
  const g = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, 0);
  g.addColorStop(0, hexA(color, alpha));
  g.addColorStop(0.5, hexA(color, alpha * 0.6));
  g.addColorStop(1, hexA(color, alpha));
  ctx.strokeStyle = g;
  ctx.lineWidth = 18;
  ctx.shadowColor = color;
  ctx.shadowBlur = 40 * i;
  ctx.strokeRect(9, 9, CANVAS_WIDTH - 18, CANVAS_HEIGHT - 18);

  ctx.globalAlpha = i * 0.25;
  ctx.fillStyle = color;
  ctx.fillRect(0, 0, CANVAS_WIDTH, 6);
  ctx.fillRect(0, CANVAS_HEIGHT - 6, CANVAS_WIDTH, 6);
  ctx.fillRect(0, 0, 6, CANVAS_HEIGHT);
  ctx.fillRect(CANVAS_WIDTH - 6, 0, 6, CANVAS_HEIGHT);
  ctx.restore();
}

export function drawGameOver(
  ctx: CanvasRenderingContext2D,
  score: number,
  onRestart: () => void
): void {
  ctx.save();
  ctx.fillStyle = 'rgba(0, 0, 0, 0.55)';
  ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

  const pw = 380;
  const ph = 240;
  const px = (CANVAS_WIDTH - pw) / 2;
  const py = (CANVAS_HEIGHT - ph) / 2;

  ctx.fillStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.shadowColor = 'rgba(100, 100, 255, 0.6)';
  ctx.shadowBlur = 40;
  roundR(ctx, px, py, pw, ph, 20);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#1A0E30';
  ctx.font = 'bold 30px sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('游戏结束', CANVAS_WIDTH / 2, py + 58);

  ctx.fillStyle = '#444444';
  ctx.font = '16px sans-serif';
  ctx.fillText('本次发射最终得分', CANVAS_WIDTH / 2, py + 90);

  ctx.fillStyle = '#4D96FF';
  ctx.font = 'bold 42px sans-serif';
  ctx.shadowColor = 'rgba(77, 150, 255, 0.4)';
  ctx.shadowBlur = 15;
  ctx.fillText(`${score}`, CANVAS_WIDTH / 2, py + 140);
  ctx.shadowBlur = 0;

  const bw = 180;
  const bh = 52;
  const bx = (CANVAS_WIDTH - bw) / 2;
  const by = py + 165;
  gameOverBtn = { x: bx, y: by, w: bw, h: bh };

  const bg = ctx.createLinearGradient(bx, by, bx, by + bh);
  bg.addColorStop(0, '#6BB3FF');
  bg.addColorStop(1, '#4D96FF');
  ctx.fillStyle = bg;
  ctx.shadowColor = '#4D96FF';
  ctx.shadowBlur = 22;
  roundR(ctx, bx, by, bw, bh, 12);
  ctx.fill();
  ctx.shadowBlur = 0;

  ctx.fillStyle = '#FFFFFF';
  ctx.font = 'bold 19px sans-serif';
  ctx.textBaseline = 'middle';
  ctx.fillText('重新开始', CANVAS_WIDTH / 2, by + bh / 2);
  ctx.textBaseline = 'alphabetic';

  ctx.restore();
  (window as unknown as { __goRestart?: () => void }).__goRestart = onRestart;
}

export function setupGameOverClick(canvas: HTMLCanvasElement): () => void {
  const handler = (e: MouseEvent): void => {
    const w = (window as unknown as { __goRestart?: () => void });
    if (!w.__goRestart || !gameOverBtn) return;
    const rect = canvas.getBoundingClientRect();
    const sx = canvas.width / rect.width;
    const sy = canvas.height / rect.height;
    const mx = (e.clientX - rect.left) * sx;
    const my = (e.clientY - rect.top) * sy;
    const b = gameOverBtn;
    if (mx >= b.x && mx <= b.x + b.w && my >= b.y && my <= b.y + b.h) {
      const fn = w.__goRestart;
      w.__goRestart = undefined;
      gameOverBtn = null;
      fn();
    }
  };
  canvas.addEventListener('click', handler);
  return (): void => canvas.removeEventListener('click', handler);
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  input: RenderInput,
  planetGravityRanges: readonly number[],
  onRestart: () => void
): void {
  drawBackground(ctx);
  drawStars(ctx, input.physics.elapsedTime);
  drawGravityField(ctx, input.physics.planets, input.physics.blackHole, planetGravityRanges);
  drawLaunchPad(ctx);

  for (const orbit of input.physics.orbits) {
    drawOrbit(ctx, orbit);
  }

  for (const planet of input.physics.planets) {
    drawPlanet(ctx, planet);
  }

  drawBlackHole(ctx, input.physics.blackHole, input.physics.elapsedTime);
  drawBall(ctx, input.physics.ball);
  drawParticles(ctx, input.physics.particles);

  if (!input.physics.ball.launched && !input.gameOver && !input.physics.ball.absorbing) {
    drawAim(ctx, input.aim);
  }

  drawScore(ctx, input.physics.score);
  drawLaunches(ctx, input.launchesRemaining);
  drawFlash(ctx, input.physics.borderFlashTimer, input.physics.borderFlashColor);

  if (input.gameOver) {
    drawGameOver(ctx, input.physics.score, onRestart);
  }
}

export function invalidateBackgroundCache(): void {
  cache.bgCanvas = null;
}

function roundR(
  ctx: CanvasRenderingContext2D,
  x: number, y: number, w: number, h: number, r: number
): void {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.lineTo(x + w - rr, y);
  ctx.quadraticCurveTo(x + w, y, x + w, y + rr);
  ctx.lineTo(x + w, y + h - rr);
  ctx.quadraticCurveTo(x + w, y + h, x + w - rr, y + h);
  ctx.lineTo(x + rr, y + h);
  ctx.quadraticCurveTo(x, y + h, x, y + h - rr);
  ctx.lineTo(x, y + rr);
  ctx.quadraticCurveTo(x, y, x + rr, y);
  ctx.closePath();
}

function light(hex: string, p: number): string {
  const c = parseInt(hex.slice(1), 16);
  const r = Math.min(255, ((c >> 16) & 0xff) + Math.round(2.55 * p));
  const g = Math.min(255, ((c >> 8) & 0xff) + Math.round(2.55 * p));
  const b = Math.min(255, (c & 0xff) + Math.round(2.55 * p));
  return `rgb(${r}, ${g}, ${b})`;
}

function dark(hex: string, p: number): string {
  const c = parseInt(hex.slice(1), 16);
  const r = Math.max(0, ((c >> 16) & 0xff) - Math.round(2.55 * p));
  const g = Math.max(0, ((c >> 8) & 0xff) - Math.round(2.55 * p));
  const b = Math.max(0, (c & 0xff) - Math.round(2.55 * p));
  return `rgb(${r}, ${g}, ${b})`;
}

function hexA(hex: string, a: number): string {
  if (hex.startsWith('rgb')) return hex;
  const c = parseInt(hex.slice(1), 16);
  const r = (c >> 16) & 0xff;
  const g = (c >> 8) & 0xff;
  const b = c & 0xff;
  return `rgba(${r}, ${g}, ${b}, ${a})`;
}

function mix(a: string, b: string, t: number): string {
  const ca = parseInt(a.slice(1), 16);
  const cb = parseInt(b.slice(1), 16);
  const ra = (ca >> 16) & 0xff, ga = (ca >> 8) & 0xff, ba = ca & 0xff;
  const rb = (cb >> 16) & 0xff, gb = (cb >> 8) & 0xff, bb = cb & 0xff;
  const r = Math.round(ra * (1 - t) + rb * t);
  const g = Math.round(ga * (1 - t) + gb * t);
  const bl = Math.round(ba * (1 - t) + bb * t);
  return `rgb(${r}, ${g}, ${bl})`;
}
