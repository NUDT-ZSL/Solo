export interface ParticleOptions {
  x: number;
  y: number;
  size: number;
  color: string;
  speed: number;
  width: number;
  height: number;
}

export class Particle {
  public x: number;
  public y: number;
  public vx: number;
  public vy: number;
  public size: number;
  public color: string;
  public targetColor: string;
  public colorTransition: number;
  public baseSpeed: number;
  public width: number;
  public height: number;
  public trail: { x: number; y: number }[];
  public maxTrailLength: number;

  constructor(options: ParticleOptions) {
    this.x = options.x;
    this.y = options.y;
    this.size = options.size;
    this.color = options.color;
    this.targetColor = options.color;
    this.colorTransition = 1;
    this.baseSpeed = options.speed;
    this.width = options.width;
    this.height = options.height;

    const angle = Math.random() * Math.PI * 2;
    this.vx = Math.cos(angle) * this.baseSpeed;
    this.vy = Math.sin(angle) * this.baseSpeed;

    this.trail = [];
    this.maxTrailLength = Math.floor(8 + this.size * 2);
  }

  public setTargetColor(color: string): void {
    this.targetColor = color;
    this.colorTransition = 0;
  }

  public resize(width: number, height: number): void {
    const xRatio = width / this.width;
    const yRatio = height / this.height;
    this.x *= xRatio;
    this.y *= yRatio;
    this.width = width;
    this.height = height;
  }

  public update(
    deltaTime: number,
    mouseX: number | null,
    mouseY: number | null,
    mouseActive: boolean,
    forceStrength: number
  ): void {
    if (this.colorTransition < 1) {
      this.colorTransition = Math.min(1, this.colorTransition + deltaTime * 2);
      this.color = this.interpolateColor(this.color, this.targetColor, this.colorTransition);
    }

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.shift();
    }

    if (mouseActive && mouseX !== null && mouseY !== null) {
      const dx = this.x - mouseX;
      const dy = this.y - mouseY;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const influenceRadius = 120;

      if (dist < influenceRadius && dist > 0) {
        const force = (1 - dist / influenceRadius) * 8 * forceStrength;
        this.vx += (dx / dist) * force;
        this.vy += (dy / dist) * force;
      }
    }

    const speed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    const maxSpeed = this.baseSpeed * 4;
    if (speed > maxSpeed) {
      this.vx = (this.vx / speed) * maxSpeed;
      this.vy = (this.vy / speed) * maxSpeed;
    }

    this.vx *= 0.98;
    this.vy *= 0.98;

    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed < this.baseSpeed * 0.5) {
      const boost = (this.baseSpeed * 0.5 - currentSpeed) * 0.1;
      if (currentSpeed > 0) {
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

    if (this.x < 0) {
      this.x = 0;
      this.vx = Math.abs(this.vx);
    } else if (this.x > this.width) {
      this.x = this.width;
      this.vx = -Math.abs(this.vx);
    }

    if (this.y < 0) {
      this.y = 0;
      this.vy = Math.abs(this.vy);
    } else if (this.y > this.height) {
      this.y = this.height;
      this.vy = -Math.abs(this.vy);
    }
  }

  public applyNeighborForce(
    neighbors: Particle[],
    forceStrength: number,
    deltaTime: number
  ): void {
    if (forceStrength <= 0) return;

    const minDist = 30;
    const maxDist = 80;

    for (const neighbor of neighbors) {
      if (neighbor === this) continue;

      const dx = neighbor.x - this.x;
      const dy = neighbor.y - this.y;
      const distSq = dx * dx + dy * dy;

      if (distSq > maxDist * maxDist) continue;

      const dist = Math.sqrt(distSq);
      if (dist < 1) continue;

      let force: number;
      if (dist < minDist) {
        force = -(1 - dist / minDist) * 0.15 * forceStrength;
      } else {
        force = (1 - (dist - minDist) / (maxDist - minDist)) * 0.08 * forceStrength;
      }

      this.vx += (dx / dist) * force * deltaTime * 60;
      this.vy += (dy / dist) * force * deltaTime * 60;
    }
  }

  public render(ctx: CanvasRenderingContext2D): void {
    if (this.trail.length > 1) {
      for (let i = 1; i < this.trail.length; i++) {
        const alpha = (i / this.trail.length) * 0.4;
        const trailSize = this.size * (i / this.trail.length) * 0.6;
        ctx.beginPath();
        ctx.arc(this.trail[i].x, this.trail[i].y, trailSize, 0, Math.PI * 2);
        ctx.fillStyle = this.colorWithAlpha(this.color, alpha);
        ctx.fill();
      }
    }

    ctx.save();
    ctx.shadowBlur = 15;
    ctx.shadowColor = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color;
    ctx.fill();
    ctx.restore();
  }

  private colorWithAlpha(color: string, alpha: number): string {
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    if (color.startsWith('rgb(')) {
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (match) {
        return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
      }
    }
    if (color.startsWith('rgba(')) {
      const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
      if (match) {
        return `rgba(${match[1]}, ${match[2]}, ${match[3]}, ${alpha})`;
      }
    }
    return color;
  }

  private interpolateColor(from: string, to: string, t: number): string {
    const fromRGB = this.parseColor(from);
    const toRGB = this.parseColor(to);

    if (!fromRGB || !toRGB) return to;

    const r = Math.round(fromRGB.r + (toRGB.r - fromRGB.r) * t);
    const g = Math.round(fromRGB.g + (toRGB.g - fromRGB.g) * t);
    const b = Math.round(fromRGB.b + (toRGB.b - fromRGB.b) * t);

    return `rgb(${r}, ${g}, ${b})`;
  }

  private parseColor(color: string): { r: number; g: number; b: number } | null {
    if (color.startsWith('#')) {
      return {
        r: parseInt(color.slice(1, 3), 16),
        g: parseInt(color.slice(3, 5), 16),
        b: parseInt(color.slice(5, 7), 16)
      };
    }
    const match = color.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/);
    if (match) {
      return {
        r: parseInt(match[1]),
        g: parseInt(match[2]),
        b: parseInt(match[3])
      };
    }
    return null;
  }
}
