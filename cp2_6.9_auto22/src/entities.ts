export interface Vec2 {
  x: number;
  y: number;
}

export interface CelestialBody {
  id: number;
  mass: number;
  position: Vec2;
  velocity: Vec2;
  radius: number;
  color: string;
  isStar: boolean;
  glowColor: string;
  trail: Vec2[];
  spawnTime: number;
  deleteProgress: number;
  isDeleting: boolean;
}

export interface Particle {
  position: Vec2;
  velocity: Vec2;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface BackgroundStar {
  x: number;
  y: number;
  size: number;
  baseAlpha: number;
  phase: number;
  speed: number;
}

export const PLANET_COLORS = ['#4A90E2', '#50C878', '#FF8C42'];
export const STAR_COLOR = '#FFD700';
export const STAR_GLOW = '#FFEB8A';

let _idCounter = 0;

export function createBody(
  mass: number,
  position: Vec2,
  velocity: Vec2,
  isStar: boolean,
  color?: string
): CelestialBody {
  const radius = Math.cbrt(mass) * (isStar ? 1.8 : 2.2);
  const actualColor = isStar ? STAR_COLOR : (color ?? PLANET_COLORS[Math.floor(Math.random() * PLANET_COLORS.length)]);
  const glowColor = isStar ? STAR_GLOW : actualColor;

  return {
    id: _idCounter++,
    mass,
    position: { ...position },
    velocity: { ...velocity },
    radius,
    color: actualColor,
    isStar,
    glowColor,
    trail: [],
    spawnTime: performance.now(),
    deleteProgress: 0,
    isDeleting: false,
  };
}

export function drawCelestialBody(
  ctx: CanvasRenderingContext2D,
  body: CelestialBody,
  now: number
): void {
  const spawnElapsed = now - body.spawnTime;
  const spawnDuration = 200;
  let scale = 1;
  let spawnGlow = 0;

  if (spawnElapsed < spawnDuration) {
    const t = spawnElapsed / spawnDuration;
    scale = easeOutBack(t);
    spawnGlow = (1 - t) * 25;
  }

  if (body.isDeleting) {
    scale *= 1 - body.deleteProgress;
  }

  if (scale <= 0) return;

  const r = body.radius * scale;

  if (body.trail.length > 1) {
    drawTrail(ctx, body.trail, body.color, body.isStar);
  }

  ctx.save();

  if (body.isStar) {
    const gradient = ctx.createRadialGradient(
      body.position.x, body.position.y, r * 0.3,
      body.position.x, body.position.y, r * 4
    );
    gradient.addColorStop(0, 'rgba(255, 235, 138, 0.9)');
    gradient.addColorStop(0.3, 'rgba(255, 215, 0, 0.4)');
    gradient.addColorStop(0.6, 'rgba(255, 180, 0, 0.1)');
    gradient.addColorStop(1, 'rgba(255, 150, 0, 0)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(body.position.x, body.position.y, r * 4, 0, Math.PI * 2);
    ctx.fill();
  }

  if (spawnGlow > 0) {
    const glowGrad = ctx.createRadialGradient(
      body.position.x, body.position.y, r * 0.5,
      body.position.x, body.position.y, r + spawnGlow
    );
    glowGrad.addColorStop(0, hexToRgba(body.glowColor, 0.6));
    glowGrad.addColorStop(1, hexToRgba(body.glowColor, 0));
    ctx.fillStyle = glowGrad;
    ctx.beginPath();
    ctx.arc(body.position.x, body.position.y, r + spawnGlow, 0, Math.PI * 2);
    ctx.fill();
  }

  const bodyGrad = ctx.createRadialGradient(
    body.position.x - r * 0.3, body.position.y - r * 0.3, r * 0.1,
    body.position.x, body.position.y, r
  );
  bodyGrad.addColorStop(0, lightenColor(body.color, 40));
  bodyGrad.addColorStop(0.6, body.color);
  bodyGrad.addColorStop(1, darkenColor(body.color, 30));

  ctx.fillStyle = bodyGrad;
  ctx.beginPath();
  ctx.arc(body.position.x, body.position.y, r, 0, Math.PI * 2);
  ctx.fill();

  if (!body.isStar) {
    ctx.shadowColor = body.glowColor;
    ctx.shadowBlur = 8;
    ctx.fillStyle = hexToRgba(body.glowColor, 0.15);
    ctx.beginPath();
    ctx.arc(body.position.x, body.position.y, r * 1.15, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  }

  ctx.restore();
}

function drawTrail(
  ctx: CanvasRenderingContext2D,
  trail: Vec2[],
  color: string,
  isStar: boolean
): void {
  const len = trail.length;
  if (len < 2) return;

  const baseAlpha = isStar ? 0.45 : 0.3;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';

  for (let i = 1; i < len; i++) {
    const t = i / len;
    const alpha = t * baseAlpha;
    const width = t * (isStar ? 3 : 2);

    ctx.beginPath();
    ctx.strokeStyle = hexToRgba(color, alpha);
    ctx.lineWidth = width;
    ctx.moveTo(trail[i - 1].x, trail[i - 1].y);
    ctx.lineTo(trail[i].x, trail[i].y);
    ctx.stroke();
  }

  ctx.restore();
}

export function drawParticle(
  ctx: CanvasRenderingContext2D,
  p: Particle
): void {
  const alpha = p.life / p.maxLife;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = p.color;
  ctx.shadowColor = p.color;
  ctx.shadowBlur = 6;
  ctx.beginPath();
  ctx.arc(p.position.x, p.position.y, p.size * alpha, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawBackgroundStars(
  ctx: CanvasRenderingContext2D,
  stars: BackgroundStar[],
  now: number
): void {
  for (const star of stars) {
    const flicker = 0.6 + 0.4 * Math.sin(now * 0.001 * star.speed + star.phase);
    const alpha = star.baseAlpha * flicker;
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export function createExplosionParticles(
  position: Vec2,
  mass: number,
  color: string
): Particle[] {
  const particles: Particle[] = [];
  const count = Math.min(40, Math.floor(12 + mass * 0.5));

  for (let i = 0; i < count; i++) {
    const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
    const speed = 40 + Math.random() * 80 + Math.sqrt(mass) * 2;
    particles.push({
      position: { ...position },
      velocity: {
        x: Math.cos(angle) * speed,
        y: Math.sin(angle) * speed,
      },
      life: 300,
      maxLife: 300,
      size: 2 + Math.random() * 3,
      color: i % 4 === 0 ? color : '#FFFFFF',
    });
  }

  return particles;
}

export function generateBackgroundStars(
  width: number,
  height: number,
  count: number
): BackgroundStar[] {
  const stars: BackgroundStar[] = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random() * width,
      y: Math.random() * height,
      size: Math.random() * 1.2 + 0.3,
      baseAlpha: Math.random() * 0.5 + 0.2,
      phase: Math.random() * Math.PI * 2,
      speed: Math.random() * 1.5 + 0.3,
    });
  }
  return stars;
}

function easeOutBack(t: number): number {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

function lightenColor(hex: string, amount: number): string {
  const r = Math.min(255, parseInt(hex.slice(1, 3), 16) + amount);
  const g = Math.min(255, parseInt(hex.slice(3, 5), 16) + amount);
  const b = Math.min(255, parseInt(hex.slice(5, 7), 16) + amount);
  return `rgb(${r}, ${g}, ${b})`;
}

function darkenColor(hex: string, amount: number): string {
  const r = Math.max(0, parseInt(hex.slice(1, 3), 16) - amount);
  const g = Math.max(0, parseInt(hex.slice(3, 5), 16) - amount);
  const b = Math.max(0, parseInt(hex.slice(5, 7), 16) - amount);
  return `rgb(${r}, ${g}, ${b})`;
}
