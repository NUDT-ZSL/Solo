import type { Ball, Particle } from './physicsEngine';

export function initCanvas(canvas: HTMLCanvasElement): { width: number; height: number } {
  const dpr = window.devicePixelRatio || 1;
  const rect = canvas.getBoundingClientRect();
  const width = rect.width;
  const height = rect.height;

  canvas.width = width * dpr;
  canvas.height = height * dpr;

  const ctx = canvas.getContext('2d');
  if (ctx) {
    ctx.scale(dpr, dpr);
  }

  return { width, height };
}

function drawBackground(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  const gradient = ctx.createRadialGradient(
    w / 2, h / 2, 0,
    w / 2, h / 2, Math.max(w, h) / 1.5
  );
  gradient.addColorStop(0, '#1a1a2e');
  gradient.addColorStop(1, '#0f0f23');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, w, h);
}

function drawBallTrail(ctx: CanvasRenderingContext2D, ball: Ball): void {
  if (ball.trail.length < 2) return;

  const trail = ball.trail;
  const segments = trail.length - 1;

  for (let i = 0; i < segments; i++) {
    const t = i / segments;
    const alpha = 0.5 * (1 - t);
    const lineWidth = ball.radius * 0.6 * (1 - t * 0.5);

    const p0 = trail[i];
    const p1 = trail[i + 1];
    const midX = (p0.x + p1.x) / 2;
    const midY = (p0.y + p1.y) / 2;

    ctx.beginPath();
    ctx.moveTo(p0.x, p0.y);
    ctx.quadraticCurveTo(midX, midY, p1.x, p1.y);
    ctx.strokeStyle = `${ball.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
    ctx.lineWidth = lineWidth;
    ctx.lineCap = 'round';
    ctx.stroke();
  }
}

function drawBall(
  ctx: CanvasRenderingContext2D,
  ball: Ball,
  isSelected: boolean,
  highlightPhase: number
): void {
  const scale = ball.scale;
  if (scale <= 0) return;

  const r = ball.radius * scale;

  ctx.save();
  ctx.translate(ball.x, ball.y);

  if (isSelected) {
    const pulse = (Math.sin(highlightPhase * Math.PI * 2) + 1) / 2;
    const strokeWidth = 2 + pulse * 1;
    const glowSize = 4 + pulse * 4;

    ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
    ctx.shadowBlur = glowSize;

    ctx.beginPath();
    ctx.arc(0, 0, r + strokeWidth + 2, 0, Math.PI * 2);
    ctx.strokeStyle = `rgba(255, 255, 255, ${0.6 + pulse * 0.4})`;
    ctx.lineWidth = strokeWidth;
    ctx.stroke();

    ctx.shadowBlur = 0;
  }

  const gradient = ctx.createRadialGradient(
    -r * 0.3, -r * 0.3, 0,
    0, 0, r
  );
  gradient.addColorStop(0, lightenColor(ball.color, 30));
  gradient.addColorStop(0.5, ball.color);
  gradient.addColorStop(1, darkenColor(ball.color, 30));

  ctx.beginPath();
  ctx.arc(0, 0, r, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  ctx.beginPath();
  ctx.arc(-r * 0.25, -r * 0.25, r * 0.25, 0, Math.PI * 2);
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
  ctx.fill();

  ctx.restore();
}

function lightenColor(hex: string, percent: number): string {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.min(255, (num >> 16) + amt);
  const G = Math.min(255, ((num >> 8) & 0x00FF) + amt);
  const B = Math.min(255, (num & 0x0000FF) + amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.slice(1), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, (num >> 16) - amt);
  const G = Math.max(0, ((num >> 8) & 0x00FF) - amt);
  const B = Math.max(0, (num & 0x0000FF) - amt);
  return `#${(1 << 24 | R << 16 | G << 8 | B).toString(16).slice(1)}`;
}

function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    const alpha = p.life;
    const r = p.radius * p.life;

    ctx.beginPath();
    ctx.arc(p.x, p.y, r, 0, Math.PI * 2);
    ctx.fillStyle = `${p.color}${Math.floor(alpha * 255).toString(16).padStart(2, '0')}`;
    ctx.fill();
  }
}

function drawPauseOverlay(ctx: CanvasRenderingContext2D, w: number, h: number): void {
  ctx.fillStyle = 'rgba(0, 0, 0, 0.5)';
  ctx.fillRect(0, 0, w, h);

  ctx.font = 'bold 48px monospace';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.fillText('PAUSED', w / 2, h / 2);
}

export function renderScene(
  ctx: CanvasRenderingContext2D,
  balls: Ball[],
  particles: Particle[],
  selectedId: string | null,
  isPaused: boolean,
  canvasWidth: number,
  canvasHeight: number,
  highlightPhase: number
): void {
  drawBackground(ctx, canvasWidth, canvasHeight);

  for (const ball of balls) {
    drawBallTrail(ctx, ball);
  }

  drawParticles(ctx, particles);

  for (const ball of balls) {
    const isSelected = ball.id === selectedId;
    drawBall(ctx, ball, isSelected, highlightPhase);
  }

  if (isPaused) {
    drawPauseOverlay(ctx, canvasWidth, canvasHeight);
  }
}
