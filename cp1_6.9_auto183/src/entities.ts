export interface Vec2 {
  x: number;
  y: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  radius: number;
  color: string;
  hsl?: { h: number; s: number; l: number };
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  life: number;
}

export interface Archer {
  x: number;
  y: number;
  dots: { offset: Vec2; phase: number }[];
  trailTimer: number;
}

export interface Enemy {
  id: number;
  x: number;
  y: number;
  radius: number;
  speed: number;
  baseSpeed: number;
  hp: number;
  hitFlash: number;
}

export interface Arrow {
  id: number;
  x: number;
  y: number;
  bezierPoints: Vec2[];
  progress: number;
  totalLength: number;
  traveled: number;
  speed: number;
  angle: number;
  trailTimer: number;
}

export interface PathParticle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  hue: number;
}

export function createArcher(x: number, y: number): Archer {
  const dots: { offset: Vec2; phase: number }[] = [];
  const count = 10;
  for (let i = 0; i < count; i++) {
    const angle = (i / count) * Math.PI * 2;
    const r = 10 + Math.sin(i * 1.7) * 4;
    dots.push({
      offset: { x: Math.cos(angle) * r, y: Math.sin(angle) * r },
      phase: Math.random() * Math.PI * 2,
    });
  }
  return { x, y, dots, trailTimer: 0 };
}

export function createEnemy(id: number, x: number, y: number, speedMultiplier: number): Enemy {
  const baseSpeed = 50 + Math.random() * 70;
  return {
    id,
    x,
    y,
    radius: 20,
    speed: baseSpeed * speedMultiplier,
    baseSpeed,
    hp: 1,
    hitFlash: 0,
  };
}

export function createArrow(id: number, bezierPoints: Vec2[]): Arrow {
  let totalLength = 0;
  const steps = 100;
  let prev = bezierPoint(bezierPoints, 0);
  for (let i = 1; i <= steps; i++) {
    const p = bezierPoint(bezierPoints, i / steps);
    totalLength += Math.hypot(p.x - prev.x, p.y - prev.y);
    prev = p;
  }
  const start = bezierPoint(bezierPoints, 0);
  return {
    id,
    x: start.x,
    y: start.y,
    bezierPoints,
    progress: 0,
    totalLength,
    traveled: 0,
    speed: 300,
    angle: 0,
    trailTimer: 0,
  };
}

export function bezierPoint(points: Vec2[], t: number): Vec2 {
  if (points.length === 1) return points[0];
  const next: Vec2[] = [];
  for (let i = 0; i < points.length - 1; i++) {
    next.push({
      x: points[i].x + (points[i + 1].x - points[i].x) * t,
      y: points[i].y + (points[i + 1].y - points[i].y) * t,
    });
  }
  return bezierPoint(next, t);
}

export function generateBezierFromDrag(start: Vec2, current: Vec2): Vec2[] {
  const dx = current.x - start.x;
  const dy = current.y - start.y;
  const dist = Math.hypot(dx, dy);
  const midX = (start.x + current.x) / 2;
  const midY = (start.y + current.y) / 2 - Math.min(dist * 0.4, 150);
  const q1x = start.x + (midX - start.x) * 0.5;
  const q1y = start.y + (midY - start.y) * 0.5;
  const q3x = current.x + (midX - current.x) * 0.5;
  const q3y = current.y + (midY - current.y) * 0.5;
  return [start, { x: q1x, y: q1y }, { x: midX, y: midY }, { x: q3x, y: q3y }, current];
}

export function drawArcher(ctx: CanvasRenderingContext2D, archer: Archer, time: number, screenShake: { x: number; y: number }) {
  const sx = screenShake.x;
  const sy = screenShake.y;
  archer.dots.forEach((dot, i) => {
    const flicker = 0.7 + 0.3 * Math.sin(time * 0.005 + dot.phase + i);
    ctx.save();
    ctx.globalAlpha = flicker;
    ctx.fillStyle = '#ffffff';
    ctx.shadowBlur = 12;
    ctx.shadowColor = '#88ccff';
    ctx.beginPath();
    ctx.arc(archer.x + dot.offset.x + sx, archer.y + dot.offset.y + sy, 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
  ctx.save();
  ctx.strokeStyle = 'rgba(136, 204, 255, 0.6)';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(archer.x + sx, archer.y - 12 + sy);
  ctx.lineTo(archer.x - 8 + sx, archer.y + 8 + sy);
  ctx.lineTo(archer.x + 8 + sx, archer.y + 8 + sy);
  ctx.closePath();
  ctx.stroke();
  ctx.restore();
}

export function drawEnemy(ctx: CanvasRenderingContext2D, enemy: Enemy, screenShake: { x: number; y: number }) {
  const sx = screenShake.x;
  const sy = screenShake.y;
  ctx.save();
  const flash = enemy.hitFlash > 0;
  ctx.shadowBlur = 20;
  ctx.shadowColor = flash ? '#ffffff' : '#ff4444';
  ctx.fillStyle = flash ? '#ffffff' : '#ff2244';
  ctx.strokeStyle = flash ? '#ffffff' : '#ff8888';
  ctx.lineWidth = 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
    const px = enemy.x + sx + Math.cos(angle) * enemy.radius;
    const py = enemy.y + sy + Math.sin(angle) * enemy.radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

export function drawArrow(ctx: CanvasRenderingContext2D, arrow: Arrow, screenShake: { x: number; y: number }) {
  const sx = screenShake.x;
  const sy = screenShake.y;
  ctx.save();
  ctx.translate(arrow.x + sx, arrow.y + sy);
  ctx.rotate(arrow.angle);
  ctx.shadowBlur = 15;
  ctx.shadowColor = '#ffcc00';
  ctx.fillStyle = '#ffd700';
  ctx.beginPath();
  ctx.moveTo(8, 0);
  ctx.lineTo(-6, -5);
  ctx.lineTo(-6, 5);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

export function drawParticle(ctx: CanvasRenderingContext2D, p: Particle, screenShake: { x: number; y: number }) {
  const alpha = p.life / p.maxLife;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = p.color;
  ctx.shadowBlur = 8;
  ctx.shadowColor = p.color;
  ctx.beginPath();
  ctx.arc(p.x + screenShake.x, p.y + screenShake.y, p.radius * alpha, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawShockwave(ctx: CanvasRenderingContext2D, s: Shockwave, screenShake: { x: number; y: number }) {
  ctx.save();
  ctx.globalAlpha = s.alpha;
  ctx.strokeStyle = `hsl(${180 + Math.random() * 60}, 100%, 70%)`;
  ctx.lineWidth = 3;
  ctx.shadowBlur = 10;
  ctx.shadowColor = '#88ccff';
  ctx.beginPath();
  ctx.arc(s.x + screenShake.x, s.y + screenShake.y, s.radius, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();
}

export function drawPathParticle(ctx: CanvasRenderingContext2D, p: PathParticle, screenShake: { x: number; y: number }) {
  const alpha = p.life / p.maxLife;
  ctx.save();
  ctx.globalAlpha = alpha * 0.8;
  ctx.fillStyle = `hsl(${p.hue}, 100%, 70%)`;
  ctx.shadowBlur = 6;
  ctx.shadowColor = `hsl(${p.hue}, 100%, 70%)`;
  ctx.beginPath();
  ctx.arc(p.x + screenShake.x, p.y + screenShake.y, 2.5 * alpha + 1, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

export function drawBezierPreview(ctx: CanvasRenderingContext2D, points: Vec2[], screenShake: { x: number; y: number }) {
  if (points.length < 2) return;
  const sx = screenShake.x;
  const sy = screenShake.y;
  ctx.save();
  ctx.shadowBlur = 12;
  ctx.shadowColor = '#4488ff';
  ctx.strokeStyle = 'rgba(100, 180, 255, 0.7)';
  ctx.lineWidth = 2.5;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  const steps = 60;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const p = bezierPoint(points, t);
    if (i === 0) ctx.moveTo(p.x + sx, p.y + sy);
    else ctx.lineTo(p.x + sx, p.y + sy);
  }
  ctx.stroke();
  ctx.setLineDash([]);
  const dotSteps = 15;
  for (let i = 0; i <= dotSteps; i++) {
    const t = i / dotSteps;
    const p = bezierPoint(points, t);
    ctx.globalAlpha = 0.6 + 0.4 * Math.sin(t * Math.PI);
    ctx.fillStyle = '#66aaff';
    ctx.beginPath();
    ctx.arc(p.x + sx, p.y + sy, 3, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.restore();
}

export function drawStarfield(ctx: CanvasRenderingContext2D, width: number, height: number, stars: { x: number; y: number; size: number; twinkle: number }[], time: number) {
  ctx.save();
  stars.forEach((star) => {
    const alpha = 0.3 + 0.5 * Math.sin(time * 0.002 + star.twinkle);
    ctx.globalAlpha = alpha;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(star.x * width, star.y * height, star.size, 0, Math.PI * 2);
    ctx.fill();
  });
  ctx.restore();
}

export function generateStars(count: number) {
  const stars = [];
  for (let i = 0; i < count; i++) {
    stars.push({
      x: Math.random(),
      y: Math.random(),
      size: 0.5 + Math.random() * 1.5,
      twinkle: Math.random() * Math.PI * 2,
    });
  }
  return stars;
}

export function hslToHex(h: number, s: number, l: number): string {
  s /= 100;
  l /= 100;
  const k = (n: number) => (n + h / 30) % 12;
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => l - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)));
  const toHex = (x: number) => Math.round(x * 255).toString(16).padStart(2, '0');
  return `#${toHex(f(0))}${toHex(f(8))}${toHex(f(4))}`;
}
