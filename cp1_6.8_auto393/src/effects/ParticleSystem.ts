export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  alpha: number;
  type: 'ink' | 'light' | 'splash' | 'trail' | 'gold' | 'shield' | 'ripple';
  gravity: number;
  friction: number;
  rotation: number;
  rotationSpeed: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles: number = 800;

  emitInkBurst(x: number, y: number, count: number = 12, direction: number = 0): void {
    for (let i = 0; i < count; i++) {
      const angle = direction + (Math.random() - 0.5) * Math.PI * 0.8;
      const speed = 2 + Math.random() * 5;
      this.addParticle({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        size: 2 + Math.random() * 4,
        color: `rgba(20,20,20,`,
        alpha: 0.8 + Math.random() * 0.2,
        type: 'ink',
        gravity: 1.5,
        friction: 0.96,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 3,
      });
    }
  }

  emitLightPoints(x: number, y: number, count: number = 6): void {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const dist = 20 + Math.random() * 30;
      this.addParticle({
        x: x + Math.cos(angle) * dist,
        y: y + Math.sin(angle) * dist,
        vx: Math.cos(angle) * 0.3,
        vy: Math.sin(angle) * 0.3,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1.0,
        size: 1.5 + Math.random() * 2,
        color: 'rgba(255,255,255,',
        alpha: 0.7 + Math.random() * 0.3,
        type: 'light',
        gravity: 0,
        friction: 0.99,
        rotation: angle,
        rotationSpeed: 2 + Math.random() * 2,
      });
    }
  }

  emitSwordTrail(x: number, y: number, facing: number): void {
    this.addParticle({
      x: x + (Math.random() - 0.5) * 8,
      y: y + (Math.random() - 0.5) * 8,
      vx: -facing * (1 + Math.random() * 2),
      vy: (Math.random() - 0.5) * 1.5,
      life: 0.2 + Math.random() * 0.2,
      maxLife: 0.4,
      size: 3 + Math.random() * 5,
      color: 'rgba(80,140,255,',
      alpha: 0.5 + Math.random() * 0.3,
      type: 'trail',
      gravity: 0,
      friction: 0.98,
      rotation: 0,
      rotationSpeed: 0,
    });
  }

  emitSplashFan(x: number, y: number, facing: number, count: number = 20): void {
    for (let i = 0; i < count; i++) {
      const spread = (Math.random() - 0.5) * Math.PI * 0.6;
      const angle = facing + spread;
      const speed = 4 + Math.random() * 8;
      this.addParticle({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 2,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1.0,
        size: 4 + Math.random() * 8,
        color: `rgba(${60 + Math.random() * 40},${100 + Math.random() * 60},${200 + Math.random() * 55},`,
        alpha: 0.9,
        type: 'splash',
        gravity: 2,
        friction: 0.95,
        rotation: Math.random() * Math.PI * 2,
        rotationSpeed: (Math.random() - 0.5) * 5,
      });
    }
  }

  emitGoldHalo(x: number, y: number, width: number, height: number): void {
    const side = Math.random() < 0.5 ? 0 : 1;
    for (let i = 0; i < 5; i++) {
      const px = side === 0
        ? x + Math.random() * 30
        : x + width - Math.random() * 30;
      const py = y + Math.random() * height;
      this.addParticle({
        x: px,
        y: py,
        vx: (Math.random() - 0.5) * 1,
        vy: -0.5 - Math.random() * 1,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1.0,
        size: 3 + Math.random() * 5,
        color: 'rgba(255,200,50,',
        alpha: 0.4 + Math.random() * 0.3,
        type: 'gold',
        gravity: -0.3,
        friction: 0.99,
        rotation: 0,
        rotationSpeed: 0,
      });
    }
  }

  emitShieldBurst(x: number, y: number): void {
    for (let i = 0; i < 16; i++) {
      const angle = (Math.PI * 2 * i) / 16;
      const speed = 3 + Math.random() * 3;
      this.addParticle({
        x: x,
        y: y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.3 + Math.random() * 0.3,
        maxLife: 0.6,
        size: 2 + Math.random() * 3,
        color: 'rgba(255,215,0,',
        alpha: 0.8 + Math.random() * 0.2,
        type: 'shield',
        gravity: 0,
        friction: 0.94,
        rotation: angle,
        rotationSpeed: 0,
      });
    }
  }

  emitRipple(x: number, y: number): void {
    this.addParticle({
      x: x,
      y: y,
      vx: 0,
      vy: 0,
      life: 1.2,
      maxLife: 1.2,
      size: 10,
      color: 'rgba(100,160,255,',
      alpha: 0.6,
      type: 'ripple',
      gravity: 0,
      friction: 1,
      rotation: 0,
      rotationSpeed: 0,
    });
  }

  private addParticle(p: Particle): void {
    if (this.particles.length >= this.maxParticles) {
      const oldest = this.particles.findIndex(pp => pp.life <= 0);
      if (oldest >= 0) {
        this.particles[oldest] = p;
      }
    } else {
      this.particles.push(p);
    }
  }

  update(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt * 60;
      p.vx *= p.friction;
      p.vy *= p.friction;
      p.x += p.vx;
      p.y += p.vy;
      p.rotation += p.rotationSpeed * dt;
      p.alpha = Math.max(0, (p.life / p.maxLife) * (p.type === 'ripple' ? 1 : 0.9));
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      ctx.save();
      const alphaStr = `${p.alpha})`;
      switch (p.type) {
        case 'ink': {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color + alphaStr;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'light': {
          const orbitAngle = p.rotation;
          const orbitDist = 20 + (1 - p.life / p.maxLife) * 40;
          const lx = p.x + Math.cos(orbitAngle) * orbitDist * 0.3;
          const ly = p.y + Math.sin(orbitAngle) * orbitDist * 0.3;
          ctx.fillStyle = p.color + alphaStr;
          ctx.shadowColor = 'rgba(255,255,255,0.8)';
          ctx.shadowBlur = 8;
          ctx.beginPath();
          ctx.arc(lx, ly, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'trail': {
          ctx.fillStyle = p.color + alphaStr;
          ctx.shadowColor = 'rgba(80,140,255,0.5)';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.ellipse(p.x, p.y, p.size, p.size * 0.4, Math.atan2(p.vy, p.vx), 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'splash': {
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rotation);
          ctx.fillStyle = p.color + alphaStr;
          ctx.shadowColor = 'rgba(100,150,255,0.4)';
          ctx.shadowBlur = 6;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size * 1.2, p.size * 0.5, 0, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'gold': {
          ctx.fillStyle = p.color + alphaStr;
          ctx.shadowColor = 'rgba(255,200,50,0.5)';
          ctx.shadowBlur = 12;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'shield': {
          ctx.fillStyle = p.color + alphaStr;
          ctx.shadowColor = 'rgba(255,215,0,0.6)';
          ctx.shadowBlur = 10;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
          ctx.fill();
          break;
        }
        case 'ripple': {
          const progress = 1 - p.life / p.maxLife;
          const radius = progress * 400;
          const rippleAlpha = p.alpha * (1 - progress);
          ctx.strokeStyle = p.color + rippleAlpha + ')';
          ctx.lineWidth = 3 - progress * 2;
          ctx.beginPath();
          ctx.arc(p.x, p.y, radius, 0, Math.PI * 2);
          ctx.stroke();
          break;
        }
      }
      ctx.restore();
    }
  }

  clear(): void {
    this.particles.length = 0;
  }

  get count(): number {
    return this.particles.length;
  }
}
