export interface Color {
  r: number;
  g: number;
  b: number;
}

export interface TrailPoint {
  x: number;
  y: number;
}

let trailGlowCache: Record<string, HTMLCanvasElement> = {};

function getGlowSprite(color: Color): HTMLCanvasElement {
  const key = `${color.r}_${color.g}_${color.b}`;
  if (trailGlowCache[key]) return trailGlowCache[key];

  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const gctx = canvas.getContext('2d')!;
  const cx = 32;
  const cy = 32;

  const grad = gctx.createRadialGradient(cx, cy, 0, cx, cy, 30);
  grad.addColorStop(0, `rgba(${Math.min(255, color.r + 60)},${Math.min(255, color.g + 60)},${Math.min(255, color.b + 60)},1)`);
  grad.addColorStop(0.35, `rgba(${color.r},${color.g},${color.b},0.5)`);
  grad.addColorStop(1, `rgba(${color.r},${color.g},${color.b},0)`);
  gctx.fillStyle = grad;
  gctx.fillRect(0, 0, 64, 64);

  trailGlowCache[key] = canvas;
  return canvas;
}

export function clearGlowCache(): void {
  trailGlowCache = {};
}

export class Star {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: Color;
  radius: number;
  brightness: number;
  lifetime: number;
  age: number;
  decaying: boolean;
  trail: TrailPoint[];
  trailLength: number;
  alive: boolean;

  constructor(
    x: number,
    y: number,
    vx: number,
    vy: number,
    color: Color,
    lifetime: number,
    trailLength: number = 10
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.radius = 4;
    this.brightness = 1.0;
    this.lifetime = lifetime;
    this.age = 0;
    this.decaying = false;
    this.trail = [];
    this.trailLength = trailLength;
    this.alive = true;
  }

  update(dt: number): boolean {
    if (!this.alive) return false;

    this.age += dt;

    if (this.age >= this.lifetime && !this.decaying) {
      this.decaying = true;
    }

    if (this.decaying) {
      this.brightness -= 0.02;
      if (this.brightness <= 0.001) {
        this.brightness = 0;
        this.alive = false;
        return false;
      }
      const decayRatio = this.brightness;
      const currentTrailLen = Math.max(2, Math.round(this.trailLength * decayRatio));
      if (this.trail.length > currentTrailLen) {
        this.trail.splice(0, this.trail.length - currentTrailLen);
      }
    }

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.trailLength) {
      this.trail.shift();
    }

    this.x += this.vx * dt;
    this.y += this.vy * dt;

    return true;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    if (!this.alive) return;

    const alpha = this.brightness;
    const glowSprite = getGlowSprite(this.color);

    const trailLen = this.trail.length;
    if (trailLen > 1) {
      for (let i = 0; i < trailLen; i++) {
        const distFromHead = trailLen - 1 - i;
        const t = distFromHead / (trailLen - 1);

        const point = this.trail[i];
        const blockAlpha = t * alpha;
        const blockRadius = 1 + 3 * t;

        const grayFactor = 1 - t;
        const r = Math.round(this.color.r * t + 160 * grayFactor);
        const g = Math.round(this.color.g * t + 160 * grayFactor);
        const b = Math.round(this.color.b * t + 170 * grayFactor);

        const drawSize = blockRadius * 6;
        if (drawSize > 0.5) {
          ctx.globalAlpha = blockAlpha;
          ctx.drawImage(
            glowSprite,
            point.x - drawSize / 2,
            point.y - drawSize / 2,
            drawSize,
            drawSize
          );
        }
        if (blockRadius > 0.3) {
          ctx.globalAlpha = blockAlpha;
          ctx.beginPath();
          ctx.arc(point.x, point.y, blockRadius, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(${r},${g},${b},${blockAlpha.toFixed(3)})`;
          ctx.fill();
        }
      }
    }
    ctx.globalAlpha = 1;

    const glowRadius = this.radius * 3.5 * alpha;
    if (glowRadius > 0.2) {
      const drawGlowSize = glowRadius * 2;
      ctx.globalAlpha = alpha;
      ctx.drawImage(
        glowSprite,
        this.x - drawGlowSize / 2,
        this.y - drawGlowSize / 2,
        drawGlowSize,
        drawGlowSize,
      );
      ctx.globalAlpha = 1;
    }

    if (this.radius * alpha > 0.3) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, Math.max(0.5, this.radius * alpha), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${Math.min(255, this.color.r + 80)},${Math.min(255, this.color.g + 80)},${Math.min(255, this.color.b + 80)},${alpha.toFixed(3)})`;
      ctx.fill();
    }
  }
}

export function lerpColor(velocity: number): Color {
  const v = Math.max(0, Math.min(1, velocity));
  const from: Color = { r: 0, g: 212, b: 255 };
  const to: Color = { r: 255, g: 107, b: 53 };
  return {
    r: Math.round(from.r + (to.r - from.r) * v),
    g: Math.round(from.g + (to.g - from.g) * v),
    b: Math.round(from.b + (to.b - from.b) * v),
  };
}

export function mixColors(a: Color, b: Color): Color {
  return {
    r: Math.round((a.r + b.r) / 2),
    g: Math.round((a.g + b.g) / 2),
    b: Math.round((a.b + b.b) / 2),
  };
}
