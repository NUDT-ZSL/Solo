import { CelestialBody, SimulationState, Vec2 } from './entities';

interface Star {
  x: number;
  y: number;
  size: number;
  brightness: number;
  twinkleSpeed: number;
  twinkleOffset: number;
}

let bgStars: Star[] = [];
let bgStarsGenerated = false;

function generateBgStars(width: number, height: number): void {
  bgStars = [];
  const count = Math.floor((width * height) / 1500);
  for (let i = 0; i < count; i++) {
    bgStars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: 0.5 + Math.random() * 1.5,
      brightness: 0.3 + Math.random() * 0.7,
      twinkleSpeed: 0.5 + Math.random() * 2.0,
      twinkleOffset: Math.random() * Math.PI * 2,
    });
  }
  bgStarsGenerated = true;
}

export function drawBackground(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  time: number
): void {
  ctx.fillStyle = '#0a0a2e';
  ctx.fillRect(0, 0, width, height);

  if (!bgStarsGenerated || bgStars.length === 0) {
    generateBgStars(width, height);
  }

  for (const star of bgStars) {
    const twinkle = 0.5 + 0.5 * Math.sin(time * star.twinkleSpeed + star.twinkleOffset);
    const alpha = star.brightness * twinkle;
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha.toFixed(3)})`;
    ctx.fill();
  }
}

export function drawStarGlow(
  ctx: CanvasRenderingContext2D,
  body: CelestialBody,
  camOffset: Vec2
): void {
  const sx = body.pos.x + camOffset.x;
  const sy = body.pos.y + camOffset.y;

  const outerRadius = body.radius * 6;
  const gradient = ctx.createRadialGradient(sx, sy, body.radius * 0.5, sx, sy, outerRadius);
  gradient.addColorStop(0, 'rgba(255, 220, 100, 0.9)');
  gradient.addColorStop(0.2, 'rgba(255, 180, 50, 0.5)');
  gradient.addColorStop(0.5, 'rgba(255, 120, 20, 0.15)');
  gradient.addColorStop(1, 'rgba(255, 80, 0, 0)');

  ctx.beginPath();
  ctx.arc(sx, sy, outerRadius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  const coreGradient = ctx.createRadialGradient(sx, sy, 0, sx, sy, body.radius);
  coreGradient.addColorStop(0, '#fff8e0');
  coreGradient.addColorStop(0.5, '#ffdd66');
  coreGradient.addColorStop(1, '#ffaa00');

  ctx.beginPath();
  ctx.arc(sx, sy, body.radius, 0, Math.PI * 2);
  ctx.fillStyle = coreGradient;
  ctx.fill();
}

export function drawPlanet(
  ctx: CanvasRenderingContext2D,
  body: CelestialBody,
  camOffset: Vec2,
  isSelected: boolean
): void {
  const sx = body.pos.x + camOffset.x;
  const sy = body.pos.y + camOffset.y;

  const gradient = ctx.createRadialGradient(
    sx - body.radius * 0.3,
    sy - body.radius * 0.3,
    body.radius * 0.1,
    sx,
    sy,
    body.radius
  );

  const baseColor = body.color;
  gradient.addColorStop(0, lightenColor(baseColor, 40));
  gradient.addColorStop(0.6, baseColor);
  gradient.addColorStop(1, darkenColor(baseColor, 40));

  ctx.beginPath();
  ctx.arc(sx, sy, body.radius, 0, Math.PI * 2);
  ctx.fillStyle = gradient;
  ctx.fill();

  if (body.highlighted) {
    ctx.beginPath();
    ctx.arc(sx, sy, body.radius + 4, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 255, 100, 0.8)';
    ctx.lineWidth = 2;
    ctx.setLineDash([4, 4]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (isSelected) {
    ctx.beginPath();
    ctx.arc(sx, sy, body.radius + 6, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(100, 180, 255, 0.8)';
    ctx.lineWidth = 2;
    ctx.stroke();
  }

  ctx.fillStyle = '#fff';
  ctx.font = '11px Segoe UI, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText(body.name, sx, sy - body.radius - 6);
}

export function drawTrail(
  ctx: CanvasRenderingContext2D,
  body: CelestialBody,
  camOffset: Vec2
): void {
  if (body.trail.length < 2) return;

  const rgb = hexToRgb(body.color);
  if (!rgb) return;

  for (let i = 1; i < body.trail.length; i++) {
    const p0 = body.trail[i - 1];
    const p1 = body.trail[i];
    const alpha = p1.alpha * 0.6;

    ctx.beginPath();
    ctx.moveTo(p0.x + camOffset.x, p0.y + camOffset.y);
    ctx.lineTo(p1.x + camOffset.x, p1.y + camOffset.y);
    ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(3)})`;
    ctx.lineWidth = body.isAsteroid ? 1 : 1.5;
    ctx.stroke();
  }
}

export function drawParticles(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  camOffset: Vec2
): void {
  for (const p of state.particles) {
    const rgb = hexToRgb(p.color);
    if (!rgb) continue;
    const alpha = p.alpha();
    ctx.beginPath();
    ctx.arc(p.pos.x + camOffset.x, p.pos.y + camOffset.y, p.radius * alpha, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha.toFixed(3)})`;
    ctx.fill();
  }
}

export function drawLaunchLine(
  ctx: CanvasRenderingContext2D,
  from: Vec2,
  to: Vec2,
  camOffset: Vec2
): void {
  const sx = from.x + camOffset.x;
  const sy = from.y + camOffset.y;
  const ex = to.x + camOffset.x;
  const ey = to.y + camOffset.y;

  ctx.beginPath();
  ctx.moveTo(sx, sy);
  ctx.lineTo(ex, ey);
  ctx.strokeStyle = 'rgba(255, 100, 100, 0.6)';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.stroke();
  ctx.setLineDash([]);

  const angle = Math.atan2(ey - sy, ex - sx);
  const arrowLen = 10;
  ctx.beginPath();
  ctx.moveTo(ex, ey);
  ctx.lineTo(
    ex - arrowLen * Math.cos(angle - 0.3),
    ey - arrowLen * Math.sin(angle - 0.3)
  );
  ctx.moveTo(ex, ey);
  ctx.lineTo(
    ex - arrowLen * Math.cos(angle + 0.3),
    ey - arrowLen * Math.sin(angle + 0.3)
  );
  ctx.strokeStyle = 'rgba(255, 100, 100, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();
}

export function render(
  ctx: CanvasRenderingContext2D,
  state: SimulationState,
  canvasWidth: number,
  canvasHeight: number,
  time: number,
  camOffset: Vec2,
  launchFrom: Vec2 | null,
  launchTo: Vec2 | null
): void {
  ctx.clearRect(0, 0, canvasWidth, canvasHeight);

  drawBackground(ctx, canvasWidth, canvasHeight, time);

  for (const body of state.bodies) {
    if (state.trailEnabled && !body.isStar) {
      drawTrail(ctx, body, camOffset);
    }
  }

  for (const body of state.bodies) {
    if (body.isStar) {
      drawStarGlow(ctx, body, camOffset);
    }
  }

  for (const body of state.bodies) {
    if (!body.isStar) {
      const isSelected = state.selectedBody === body;
      drawPlanet(ctx, body, camOffset, isSelected);
    }
  }

  drawParticles(ctx, state, camOffset);

  if (launchFrom && launchTo) {
    drawLaunchLine(ctx, launchFrom, launchTo, camOffset);
  }
}

export function resizeCanvas(
  canvas: HTMLCanvasElement,
  container: HTMLElement
): { width: number; height: number } {
  const containerWidth = container.clientWidth;
  const containerHeight = container.clientHeight;

  let width: number;
  let height: number;

  const targetRatio = 16 / 9;
  const containerRatio = containerWidth / containerHeight;

  if (containerRatio > targetRatio) {
    height = containerHeight;
    width = Math.floor(height * targetRatio);
  } else {
    width = containerWidth;
    height = Math.floor(width / targetRatio);
  }

  canvas.width = width;
  canvas.height = height;
  canvas.style.width = width + 'px';
  canvas.style.height = height + 'px';

  bgStarsGenerated = false;

  return { width, height };
}

function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : null;
}

function lightenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.min(255, rgb.r + amount);
  const g = Math.min(255, rgb.g + amount);
  const b = Math.min(255, rgb.b + amount);
  return `rgb(${r}, ${g}, ${b})`;
}

function darkenColor(hex: string, amount: number): string {
  const rgb = hexToRgb(hex);
  if (!rgb) return hex;
  const r = Math.max(0, rgb.r - amount);
  const g = Math.max(0, rgb.g - amount);
  const b = Math.max(0, rgb.b - amount);
  return `rgb(${r}, ${g}, ${b})`;
}
