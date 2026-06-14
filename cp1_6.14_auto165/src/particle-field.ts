import { ShipState } from './ship-controller';

export interface FieldParticle {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  vx: number;
  vy: number;
  radius: number;
  color: { r: number; g: number; b: number };
  alpha: number;
  densityWeight: number;
}

const FIELD_PARTICLE_COUNT = 1200;
const PERTURB_RADIUS = 120;
const PERTURB_STRENGTH = 0.15;
const TOTAL_PARTICLE_LIMIT = 2000;

export class ParticleField {
  private width: number;
  private height: number;
  public particles: FieldParticle[] = [];

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
    this.initParticles();
  }

  private initParticles(): void {
    const colors = [
      { r: 10, g: 10, b: 46 },
      { r: 59, g: 7, b: 100 },
      { r: 112, g: 26, b: 117 },
      { r: 147, g: 51, b: 234 },
      { r: 168, g: 85, b: 247 }
    ];

    this.particles = [];
    for (let i = 0; i < FIELD_PARTICLE_COUNT; i++) {
      const x = Math.random() * this.width;
      const y = Math.random() * this.height;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push({
        x,
        y,
        baseX: x,
        baseY: y,
        vx: 0,
        vy: 0,
        radius: 2 + Math.random() * 4,
        color,
        alpha: 0.15 + Math.random() * 0.35,
        densityWeight: Math.random()
      });
    }
  }

  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    for (const p of this.particles) {
      if (p.x > this.width) {
        p.x = Math.random() * this.width;
        p.baseX = p.x;
      }
      if (p.y > this.height) {
        p.y = Math.random() * this.height;
        p.baseY = p.y;
      }
    }
  }

  public perturb(ship: ShipState, engineParticleCount: number = 0): void {
    const totalParticles = this.particles.length + engineParticleCount;
    if (totalParticles > TOTAL_PARTICLE_LIMIT) return;

    const shipX = ship.x;
    const shipY = ship.y;
    const shipAngle = ship.angle;
    const shipSpeed = ship.speed;

    if (shipSpeed < 0.3) return;

    const dirX = Math.cos(shipAngle);
    const dirY = Math.sin(shipAngle);
    const rightX = -dirY;
    const rightY = dirX;

    const frontOffset = 25;
    const frontX = shipX + dirX * frontOffset;
    const frontY = shipY + dirY * frontOffset;

    const speedFactor = shipSpeed / ship.maxSpeed;

    for (const p of this.particles) {
      const dx = p.x - frontX;
      const dy = p.y - frontY;
      const distSq = dx * dx + dy * dy;
      const radiusSq = PERTURB_RADIUS * PERTURB_RADIUS;

      if (distSq < radiusSq) {
        const dist = Math.sqrt(distSq);
        const falloff = 1 - dist / PERTURB_RADIUS;
        const falloffSq = falloff * falloff;

        const nx = dist > 0 ? dx / dist : 0;
        const ny = dist > 0 ? dy / dist : 0;

        const sideDot = nx * rightX + ny * rightY;
        const forwardDot = nx * dirX + ny * dirY;

        let pushSideX: number;
        let pushSideY: number;

        if (sideDot >= 0) {
          pushSideX = rightX;
          pushSideY = rightY;
        } else {
          pushSideX = -rightX;
          pushSideY = -rightY;
        }

        const sideBias = Math.abs(sideDot) * 0.5 + 0.5;
        const forwardPush = Math.max(0, -forwardDot) * 0.3;

        const strength = PERTURB_STRENGTH * falloffSq * speedFactor * sideBias;

        const sidePushX = pushSideX * strength * 60;
        const sidePushY = pushSideY * strength * 60;

        const forwardPushX = dirX * forwardPush * strength * 30;
        const forwardPushY = dirY * forwardPush * strength * 30;

        p.vx += sidePushX + forwardPushX;
        p.vy += sidePushY + forwardPushY;
      }
    }
  }

  public update(deltaTime: number): void {
    for (const p of this.particles) {
      p.vx *= 0.92;
      p.vy *= 0.92;

      p.x += p.vx * deltaTime * 60;
      p.y += p.vy * deltaTime * 60;

      const returnForce = 0.015;
      p.vx += (p.baseX - p.x) * returnForce;
      p.vy += (p.baseY - p.y) * returnForce;

      if (p.x < -50) {
        p.x = this.width + 50;
        p.baseX = p.x;
        p.vx = 0;
      }
      if (p.x > this.width + 50) {
        p.x = -50;
        p.baseX = p.x;
        p.vx = 0;
      }
      if (p.y < -50) {
        p.y = this.height + 50;
        p.baseY = p.y;
        p.vy = 0;
      }
      if (p.y > this.height + 50) {
        p.y = -50;
        p.baseY = p.y;
        p.vy = 0;
      }
    }
  }

  public getLocalDensity(x: number, y: number, radius: number = 100): number {
    let weightSum = 0;
    const radiusSq = radius * radius;

    for (const p of this.particles) {
      const dx = p.x - x;
      const dy = p.y - y;
      const distSq = dx * dx + dy * dy;
      if (distSq < radiusSq) {
        const dist = Math.sqrt(distSq);
        const falloff = 1 - dist / radius;
        weightSum += p.alpha * p.densityWeight * falloff;
      }
    }

    return Math.min(1, weightSum / 3);
  }

  public render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 2.5);
      gradient.addColorStop(0, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha})`);
      gradient.addColorStop(0.6, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, ${p.alpha * 0.4})`);
      gradient.addColorStop(1, `rgba(${p.color.r}, ${p.color.g}, ${p.color.b}, 0)`);
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius * 2.5, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  public getTotalCount(): number {
    return this.particles.length;
  }

  public getMaxParticleLimit(): number {
    return TOTAL_PARTICLE_LIMIT;
  }

  public getFieldParticleCount(): number {
    return FIELD_PARTICLE_COUNT;
  }
}
