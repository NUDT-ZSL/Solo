import { StringManager, HarpString } from './strings';

interface Firefly {
  x: number;
  y: number;
  vx: number;
  vy: number;
  baseSpeed: number;
  size: number;
  color: string;
  alpha: number;
  phase: number;
  phaseSpeed: number;
  wanderAngle: number;
  wanderSpeed: number;
  collidedWith: Set<number>;
  collisionCooldown: number;
}

interface BurstParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  color: string;
  life: number;
  maxLife: number;
}

interface Star {
  x: number;
  y: number;
  alpha: number;
  life: number;
  maxLife: number;
}

export class ParticleSystem {
  private particles: Firefly[] = [];
  private burstParticles: BurstParticle[] = [];
  private stars: Star[] = [];
  private stringManager: StringManager;
  private canvasWidth: number = 0;
  private canvasHeight: number = 0;
  private time: number = 0;
  private readonly maxParticles: number = 50;
  private readonly maxBurstParticles: number = 40;
  private readonly stringWidth: number = 2;

  private isBurstActive: boolean = false;
  private burstCenterX: number = 0;
  private burstCenterY: number = 0;
  private burstGatherPhase: boolean = true;
  private burstTime: number = 0;

  private strongWindActive: boolean = false;
  private strongWindTime: number = 0;

  private readonly colors = [
    '#FFE66D',
    '#FFF3B0',
    '#E0F7FA',
    '#B2EBF2',
    '#FFF8E1'
  ];

  private readonly burstColors = [
    '#FF4444',
    '#FF8C42',
    '#FFD700',
    '#44FF44'
  ];

  constructor(stringManager: StringManager) {
    this.stringManager = stringManager;
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public init(): void {
    this.particles = [];
    const count = 30 + Math.floor(Math.random() * 21);
    const actualCount = Math.min(count, this.maxParticles);
    for (let i = 0; i < actualCount; i++) {
      this.particles.push(this.createFirefly());
    }
  }

  private enforceMaxParticles(): void {
    while (this.particles.length > this.maxParticles) {
      this.particles.shift();
    }
  }

  private createFirefly(): Firefly {
    const margin = 100;
    const x = margin + Math.random() * (this.canvasWidth - margin * 2);
    const y = margin + Math.random() * (this.canvasHeight - margin * 2);
    const size = 1.5 + Math.random() * 2.5;
    const baseSpeed = 0.3 + Math.random() * 0.9;

    return {
      x,
      y,
      vx: (Math.random() - 0.5) * baseSpeed,
      vy: (Math.random() - 0.5) * baseSpeed,
      baseSpeed,
      size,
      color: this.colors[Math.floor(Math.random() * this.colors.length)],
      alpha: 0.6 + Math.random() * 0.4,
      phase: Math.random() * Math.PI * 2,
      phaseSpeed: 1 + Math.random() * 2,
      wanderAngle: Math.random() * Math.PI * 2,
      wanderSpeed: 0.5 + Math.random() * 1.5,
      collidedWith: new Set(),
      collisionCooldown: 0
    };
  }

  public setWindStrength(volume: number, threshold: number): void {
    if (volume > threshold) {
      const strength = (volume - threshold) / (100 - threshold);
      const upSpeed = strength * 3;
      this.particles.forEach(p => {
        p.vy -= upSpeed * 0.1;
      });
    }
  }

  public triggerStrongWind(): void {
    this.strongWindActive = true;
    this.strongWindTime = 1.0;
  }

  public triggerBurst(x: number, y: number): void {
    this.isBurstActive = true;
    this.burstCenterX = x;
    this.burstCenterY = y;
    this.burstGatherPhase = true;
    this.burstTime = 0;

    this.burstParticles = [];
    const burstCount = Math.min(40, this.maxBurstParticles);
    for (let i = 0; i < burstCount; i++) {
      const angle = (Math.PI * 2 * i) / burstCount + Math.random() * 0.3;
      const speed = 2 + Math.random() * 3;
      this.burstParticles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        color: this.burstColors[Math.floor(Math.random() * this.burstColors.length)],
        life: 1.0,
        maxLife: 1.0
      });
    }
  }

  private checkCollisions(): void {
    for (const particle of this.particles) {
      if (particle.collisionCooldown > 0) {
        particle.collisionCooldown -= 1 / 60;
        continue;
      }

      const particleRadius = particle.size;
      const hitThreshold = particleRadius + this.stringWidth / 2 + 2;

      for (const str of this.stringManager.strings) {
        if (str.isRemoving) continue;
        if (str.isFullyRemoved()) continue;
        if (particle.collidedWith.has(str.index)) continue;

        if (particle.y < str.topY - particleRadius || particle.y > str.bottomY + particleRadius) continue;

        const dist = Math.abs(particle.x - str.originalX);
        if (dist < hitThreshold) {
          const contactY = Math.max(str.topY, Math.min(str.bottomY, particle.y));
          const amplitude = 8 + (particle.baseSpeed / 1.2) * 7;
          str.triggerVibration(contactY, amplitude);
          particle.collidedWith.add(str.index);
          particle.collisionCooldown = 0.3;

          setTimeout(() => {
            particle.collidedWith.delete(str.index);
          }, 1000);
        }
      }
    }
  }

  private updateFireflies(deltaTime: number): void {
    for (const p of this.particles) {
      p.phase += p.phaseSpeed * deltaTime;

      p.wanderAngle += (Math.random() - 0.5) * p.wanderSpeed * deltaTime * 2;

      const wanderForce = 0.1;
      p.vx += Math.cos(p.wanderAngle) * wanderForce * deltaTime * 60;
      p.vy += Math.sin(p.wanderAngle) * wanderForce * deltaTime * 60;

      const speed = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
      if (speed > p.baseSpeed * 2) {
        p.vx = (p.vx / speed) * p.baseSpeed * 2;
        p.vy = (p.vy / speed) * p.baseSpeed * 2;
      }

      const friction = 0.98;
      p.vx *= friction;
      p.vy *= friction;

      p.x += p.vx * deltaTime * 60;
      p.y += p.vy * deltaTime * 60;

      const margin = 50;
      if (p.x < margin) {
        p.x = margin;
        p.vx = Math.abs(p.vx) * 0.5;
        p.wanderAngle = Math.PI - p.wanderAngle;
      }
      if (p.x > this.canvasWidth - margin) {
        p.x = this.canvasWidth - margin;
        p.vx = -Math.abs(p.vx) * 0.5;
        p.wanderAngle = Math.PI - p.wanderAngle;
      }
      if (p.y < margin) {
        p.y = margin;
        p.vy = Math.abs(p.vy) * 0.5;
        p.wanderAngle = -p.wanderAngle;
      }
      if (p.y > this.canvasHeight - margin) {
        p.y = this.canvasHeight - margin;
        p.vy = -Math.abs(p.vy) * 0.5;
        p.wanderAngle = -p.wanderAngle;
      }
    }
  }

  private updateBurst(deltaTime: number): void {
    if (!this.isBurstActive) return;

    this.burstTime += deltaTime;

    if (this.burstGatherPhase) {
      if (this.burstTime > 0.2) {
        this.burstGatherPhase = false;
        this.burstTime = 0;
      } else {
        const t = this.burstTime / 0.2;
        for (const p of this.particles) {
          const dx = this.burstCenterX - p.x;
          const dy = this.burstCenterY - p.y;
          p.x += dx * t * 0.1;
          p.y += dy * t * 0.1;
        }
      }
    } else {
      for (const bp of this.burstParticles) {
        bp.x += bp.vx * deltaTime * 60;
        bp.y += bp.vy * deltaTime * 60;
        bp.vy += 0.05 * deltaTime * 60;
        bp.life -= deltaTime;

        if (Math.random() < 0.1) {
          bp.color = this.burstColors[Math.floor(Math.random() * this.burstColors.length)];
        }
      }

      this.burstParticles = this.burstParticles.filter(bp => bp.life > 0);

      if (this.burstTime > 1.0) {
        this.isBurstActive = false;
        this.resetParticles();
      }
    }
  }

  private resetParticles(): void {
    for (const p of this.particles) {
      p.x = 100 + Math.random() * (this.canvasWidth - 200);
      p.y = 100 + Math.random() * (this.canvasHeight - 200);
      p.vx = (Math.random() - 0.5) * p.baseSpeed;
      p.vy = (Math.random() - 0.5) * p.baseSpeed;
      p.collidedWith.clear();
    }
  }

  private updateStrongWind(deltaTime: number): void {
    if (!this.strongWindActive) return;

    this.strongWindTime -= deltaTime;

    if (this.strongWindTime > 0) {
      const intensity = this.strongWindTime;
      for (const p of this.particles) {
        p.vx += 0.3 * intensity * deltaTime * 60;
        p.vy -= 0.2 * intensity * deltaTime * 60;
      }
    } else {
      this.strongWindActive = false;
    }
  }

  private updateStars(deltaTime: number): void {
    for (const star of this.stars) {
      star.life -= deltaTime;
      if (star.life < 0.2) {
        star.alpha = star.life / 0.2;
      }
    }

    this.stars = this.stars.filter(s => s.life > 0);

    if (Math.random() < 0.5) {
      this.stars.push({
        x: Math.random() * this.canvasWidth,
        y: Math.random() * this.canvasHeight,
        alpha: 0.8,
        life: 0.2,
        maxLife: 0.2
      });
    }
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    if (!this.isBurstActive) {
      this.updateFireflies(deltaTime);
      this.checkCollisions();
    } else {
      this.updateBurst(deltaTime);
    }

    this.updateStrongWind(deltaTime);
    this.updateStars(deltaTime);
    this.enforceMaxParticles();
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.renderStars(ctx);
    this.renderFireflies(ctx);
    if (this.isBurstActive) {
      this.renderBurst(ctx);
    }
  }

  private renderStars(ctx: CanvasRenderingContext2D): void {
    for (const star of this.stars) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 255, 255, ${star.alpha})`;
      ctx.beginPath();
      ctx.arc(star.x, star.y, 1, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderFireflies(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const glowIntensity = 0.5 + 0.5 * Math.sin(p.phase);
      const alpha = p.alpha * (0.6 + 0.4 * glowIntensity);

      const gradient = ctx.createRadialGradient(
        p.x, p.y, 0,
        p.x, p.y, p.size * 3
      );
      gradient.addColorStop(0, p.color);
      gradient.addColorStop(0.3, this.hexToRgba(p.color, alpha * 0.6));
      gradient.addColorStop(1, this.hexToRgba(p.color, 0));

      ctx.save();
      ctx.fillStyle = gradient;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 3, 0, Math.PI * 2);
      ctx.fill();

      ctx.fillStyle = '#fff';
      ctx.globalAlpha = alpha * 0.9;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderBurst(ctx: CanvasRenderingContext2D): void {
    for (const bp of this.burstParticles) {
      const alpha = bp.life / bp.maxLife;

      const gradient = ctx.createRadialGradient(
        bp.x, bp.y, 0,
        bp.x, bp.y, bp.size * 2
      );
      gradient.addColorStop(0, bp.color);
      gradient.addColorStop(1, this.hexToRgba(bp.color, 0));

      ctx.save();
      ctx.fillStyle = gradient;
      ctx.globalAlpha = alpha;
      ctx.beginPath();
      ctx.arc(bp.x, bp.y, bp.size * 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return `rgba(${r}, ${g}, ${b}, ${alpha})`;
    }
    return `rgba(255, 255, 255, ${alpha})`;
  }
}
