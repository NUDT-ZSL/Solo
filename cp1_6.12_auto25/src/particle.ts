export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface TrailPoint {
  x: number;
  y: number;
}

export interface ParticleOptions {
  x: number;
  y: number;
  size: number;
  color: RGB;
  speed: number;
  width: number;
  height: number;
  fadeIn?: boolean;
  trailLength?: number;
}

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public size: number;
  public baseSize: number;
  public color: RGB;
  public targetColor: RGB;
  public colorTransition: number;
  public baseSpeed: number;
  public width: number;
  public height: number;
  public alpha: number;
  public targetAlpha: number;

  public restX: number;
  public restY: number;
  public restUpdateTimer: number;

  public gridX: number = 0;
  public gridY: number = 0;

  public trail: TrailPoint[] = [];
  public trailLength: number;
  public trailEnabled: boolean = true;

  public markedForDeletion: boolean = false;

  private static colorCache: Map<string, string> = new Map();

  constructor(options: ParticleOptions) {
    this.x = options.x;
    this.y = options.y;
    this.size = options.size;
    this.baseSize = options.size;
    this.color = { ...options.color };
    this.targetColor = { ...options.color };
    this.colorTransition = 1;
    this.baseSpeed = options.speed;
    this.width = options.width;
    this.height = options.height;
    this.trailLength = options.trailLength || 8;

    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.baseSpeed;
    this.vy = Math.sin(angle) * this.baseSpeed;

    this.alpha = options.fadeIn ? 0 : 1;
    this.targetAlpha = 1;

    this.restX = this.x;
    this.restY = this.y;
    this.restUpdateTimer = Math.random() * 120;

    for (let i = 0; i < this.trailLength; i++) {
      this.trail.push({ x: this.x, y: this.y });
    }
  }

  public setTargetColor(color: RGB): void {
    this.targetColor = { ...color };
    this.colorTransition = 0;
  }

  public setTrailLength(length: number): void {
    this.trailLength = Math.max(0, Math.min(20, length));
    while (this.trail.length < this.trailLength) {
      this.trail.unshift({ x: this.x, y: this.y });
    }
    while (this.trail.length > this.trailLength) {
      this.trail.shift();
    }
  }

  public setTrailEnabled(enabled: boolean): void {
    this.trailEnabled = enabled;
  }

  public resize(width: number, height: number): void {
    const xRatio = width / this.width;
    const yRatio = height / this.height;
    this.x *= xRatio;
    this.y *= yRatio;
    this.restX *= xRatio;
    this.restY *= yRatio;
    for (const point of this.trail) {
      point.x *= xRatio;
      point.y *= yRatio;
    }
    this.width = width;
    this.height = height;
  }

  public update(
    deltaTime: number,
    mouseX: number | null,
    mouseY: number | null,
    mouseVelX: number,
    mouseVelY: number,
    mouseActive: boolean,
    forceStrength: number,
    gridCellSize: number
  ): void {
    this.gridX = Math.floor(this.x / gridCellSize);
    this.gridY = Math.floor(this.y / gridCellSize);

    if (this.colorTransition < 1) {
      this.colorTransition = Math.min(1, this.colorTransition + deltaTime * 2);
      const t = this.colorTransition;
      this.color.r = this.color.r + (this.targetColor.r - this.color.r) * t;
      this.color.g = this.color.g + (this.targetColor.g - this.color.g) * t;
      this.color.b = this.color.b + (this.targetColor.b - this.color.b) * t;
    }

    if (this.alpha < this.targetAlpha) {
      this.alpha = Math.min(this.targetAlpha, this.alpha + deltaTime * 1.5);
    } else if (this.alpha > this.targetAlpha) {
      this.alpha = Math.max(this.targetAlpha, this.alpha - deltaTime * 1.5);
      if (this.alpha <= 0.01 && this.targetAlpha === 0) {
        this.markedForDeletion = true;
      }
    }

    if (mouseActive && mouseX !== null && mouseY !== null) {
      const dx = this.x - mouseX;
      const dy = this.y - mouseY;
      const distSq = dx * dx + dy * dy;
      const innerRadius = 50;
      const outerRadius = 160;
      const outerRadiusSq = outerRadius * outerRadius;
      const innerRadiusSq = innerRadius * innerRadius;

      if (distSq < outerRadiusSq && distSq > 0.01) {
        const dist = Math.sqrt(distSq);
        let forceFactor: number;

        if (distSq < innerRadiusSq) {
          forceFactor = 1;
        } else {
          forceFactor = 1 - (dist - innerRadius) / (outerRadius - innerRadius);
          forceFactor = forceFactor * forceFactor;
        }

        const repelForce = 10 * forceStrength * forceFactor;
        const nx = dx / dist;
        const ny = dy / dist;

        this.vx += nx * repelForce * deltaTime * 60;
        this.vy += ny * repelForce * deltaTime * 60;

        if (mouseVelX !== 0 || mouseVelY !== 0) {
          const mouseSpeedSq = mouseVelX * mouseVelX + mouseVelY * mouseVelY;
          if (mouseSpeedSq > 0.25) {
            const mouseSpeed = Math.sqrt(mouseSpeedSq);
            const tangentFactor = 0.25 * forceStrength * forceFactor;
            const tx = -ny;
            const ty = nx;
            const dir = (mouseVelX * tx + mouseVelY * ty) > 0 ? 1 : -1;
            this.vx += tx * dir * tangentFactor * mouseSpeed * deltaTime * 60;
            this.vy += ty * dir * tangentFactor * mouseSpeed * deltaTime * 60;
          }
        }
      }
    }

    this.restUpdateTimer -= deltaTime * 60;
    if (this.restUpdateTimer <= 0) {
      this.restX = this.x + (Math.random() - 0.5) * 60;
      this.restY = this.y + (Math.random() - 0.5) * 60;
      this.restX = Math.max(0, Math.min(this.width, this.restX));
      this.restY = Math.max(0, Math.min(this.height, this.restY));
      this.restUpdateTimer = 120 + Math.random() * 60;
    }

    const springK = 0.002 * forceStrength;
    const restDx = this.restX - this.x;
    const restDy = this.restY - this.y;
    this.vx += restDx * springK * deltaTime * 60;
    this.vy += restDy * springK * deltaTime * 60;

    const speedSq = this.vx * this.vx + this.vy * this.vy;
    const maxSpeed = this.baseSpeed * 5;
    const maxSpeedSq = maxSpeed * maxSpeed;
    if (speedSq > maxSpeedSq) {
      const speed = Math.sqrt(speedSq);
      const ratio = maxSpeed / speed;
      this.vx *= ratio;
      this.vy *= ratio;
    }

    this.vx *= 0.98;
    this.vy *= 0.98;

    const currentSpeedSq = this.vx * this.vx + this.vy * this.vy;
    const minSpeed = this.baseSpeed * 0.25;
    const minSpeedSq = minSpeed * minSpeed;
    if (currentSpeedSq < minSpeedSq) {
      const currentSpeed = Math.sqrt(currentSpeedSq);
      if (currentSpeed > 0.001) {
        const boost = (minSpeed - currentSpeed) * 0.05;
        this.vx += (this.vx / currentSpeed) * boost;
        this.vy += (this.vy / currentSpeed) * boost;
      } else {
        const angle = Math.random() * Math.PI * 2;
        this.vx = Math.cos(angle) * this.baseSpeed;
        this.vy = Math.sin(angle) * this.baseSpeed;
      }
    }

    this.x += this.vx * deltaTime * 60;
    this.y += this.vy * deltaTime * 60;

    if (this.x < this.size) {
      this.x = this.size;
      this.vx = Math.abs(this.vx) * 0.8;
    } else if (this.x > this.width - this.size) {
      this.x = this.width - this.size;
      this.vx = -Math.abs(this.vx) * 0.8;
    }

    if (this.y < this.size) {
      this.y = this.size;
      this.vy = Math.abs(this.vy) * 0.8;
    } else if (this.y > this.height - this.size) {
      this.y = this.height - this.size;
      this.vy = -Math.abs(this.vy) * 0.8;
    }

    if (this.trailEnabled && this.trailLength > 0) {
      this.trail.shift();
      this.trail.push({ x: this.x, y: this.y });
    }
  }

  public applyNeighborForce(
    neighbors: Particle[],
    forceStrength: number,
    deltaTime: number
  ): void {
    if (forceStrength <= 0 || neighbors.length === 0) return;

    const minDist = 20;
    const maxDist = 55;
    const minDistSq = minDist * minDist;
    const maxDistSq = maxDist * maxDist;

    const repelStrength = 0.15 * forceStrength;
    const attractStrength = 0.04 * forceStrength;
    const dt = deltaTime * 60;

    for (let i = 0; i < neighbors.length; i++) {
      const neighbor = neighbors[i];
      if (neighbor === this) continue;

      const dx = neighbor.x - this.x;
      const dy = neighbor.y - this.y;
      const distSq = dx * dx + dy * dy;

      if (distSq > maxDistSq || distSq < 0.01) continue;

      const dist = Math.sqrt(distSq);
      const nx = dx / dist;
      const ny = dy / dist;

      let force: number;
      if (distSq < minDistSq) {
        force = -(1 - dist / minDist) * repelStrength;
      } else {
        const t = (dist - minDist) / (maxDist - minDist);
        force = (1 - t) * (1 - t) * attractStrength;
      }

      this.vx += nx * force * dt;
      this.vy += ny * force * dt;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.alpha <= 0.01) return;

    if (this.trailEnabled && this.trailLength > 0 && this.trail.length >= 2) {
      this.renderTrail(ctx);
    }

    const size = this.size;
    const glowSize = size * 1.4;
    const glowAlpha = this.alpha * 0.12;

    ctx.fillStyle = this.getColorString(this.color, glowAlpha);
    ctx.beginPath();
    ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = this.getColorString(this.color, this.alpha);
    ctx.beginPath();
    ctx.arc(this.x, this.y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  public renderTrailOnly(ctx: CanvasRenderingContext2D): void {
    if (this.alpha <= 0.01 || !this.trailEnabled || this.trailLength <= 0) return;
    const trailLen = this.trail.length;
    if (trailLen < 2) return;

    const baseAlpha = this.alpha * 0.35;
    const baseSize = this.size * 0.6;

    for (let i = 1; i < trailLen; i++) {
      const t = i / trailLen;
      const alpha = baseAlpha * t;
      const size = baseSize * t + 0.5;
      const point = this.trail[i];

      ctx.fillStyle = this.getColorString(this.color, alpha);
      ctx.beginPath();
      ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  public renderGlowOnly(ctx: CanvasRenderingContext2D): void {
    if (this.alpha <= 0.01) return;
    const size = this.size;
    const glowSize = size * 1.4;
    const glowAlpha = this.alpha * 0.12;
    ctx.fillStyle = this.getColorString(this.color, glowAlpha);
    ctx.beginPath();
    ctx.arc(this.x, this.y, glowSize, 0, Math.PI * 2);
    ctx.fill();
  }

  public renderCoreOnly(ctx: CanvasRenderingContext2D): void {
    if (this.alpha <= 0.01) return;
    ctx.fillStyle = this.getColorString(this.color, this.alpha);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
  }

  private getColorString(rgb: RGB, alpha: number): string {
    const key = `${rgb.r | 0},${rgb.g | 0},${rgb.b | 0},${alpha.toFixed(2)}`;
    let cached = Particle.colorCache.get(key);
    if (!cached) {
      cached = `rgba(${rgb.r | 0}, ${rgb.g | 0}, ${rgb.b | 0}, ${alpha})`;
      if (Particle.colorCache.size > 1000) {
        Particle.colorCache.clear();
      }
      Particle.colorCache.set(key, cached);
    }
    return cached;
  }

  public static parseHexColor(hex: string): RGB {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return { r, g, b };
  }
}

export function createGlowTexture(size: number): HTMLCanvasElement {
  const canvas = document.createElement('canvas');
  canvas.width = size * 2;
  canvas.height = size * 2;
  const ctx = canvas.getContext('2d')!;

  const gradient = ctx.createRadialGradient(size, size, 0, size, size, size);
  gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
  gradient.addColorStop(0.2, 'rgba(255, 255, 255, 0.6)');
  gradient.addColorStop(0.4, 'rgba(255, 255, 255, 0.2)');
  gradient.addColorStop(0.7, 'rgba(255, 255, 255, 0.05)');
  gradient.addColorStop(1, 'rgba(255, 255, 255, 0)');

  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, size * 2, size * 2);

  return canvas;
}
