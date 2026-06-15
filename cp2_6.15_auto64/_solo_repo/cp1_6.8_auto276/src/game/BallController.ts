export interface TrailParticle {
  x: number;
  y: number;
  life: number;
  maxLife: number;
  hue: number;
  size: number;
  vx: number;
  vy: number;
}

export interface DeathParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  hue: number;
  size: number;
}

export class BallController {
  orbitIndex: number = 0;
  angle: number = -Math.PI / 2;
  angularVelocity: number = 0;
  ballRadius: number = 8;
  friction: number = 0.985;
  alive: boolean = true;
  trail: TrailParticle[] = [];
  deathParticles: DeathParticle[] = [];
  transitionCooldown: number = 0;
  trailTimer: number = 0;
  trailInterval: number = 0.016;
  maxAngularVelocity: number = 8;
  deathTimer: number = 0;

  private centerX: number = 0;
  private centerY: number = 0;
  private orbitRadius: number = 0;

  reset(orbitIndex: number, startAngle: number, centerX: number, centerY: number, orbitRadius: number) {
    this.orbitIndex = orbitIndex;
    this.angle = startAngle;
    this.angularVelocity = 0;
    this.alive = true;
    this.trail = [];
    this.deathParticles = [];
    this.transitionCooldown = 0.3;
    this.trailTimer = 0;
    this.deathTimer = 0;
    this.centerX = centerX;
    this.centerY = centerY;
    this.orbitRadius = orbitRadius;
  }

  updateOrbit(centerX: number, centerY: number, orbitRadius: number) {
    this.centerX = centerX;
    this.centerY = centerY;
    this.orbitRadius = orbitRadius;
  }

  update(dt: number, tangentialAccel: number) {
    if (!this.alive) {
      this.updateDeathParticles(dt);
      return;
    }

    if (this.transitionCooldown > 0) {
      this.transitionCooldown -= dt;
    }

    this.angularVelocity += tangentialAccel * dt;
    this.angularVelocity *= this.friction;
    this.angularVelocity = Math.max(-this.maxAngularVelocity, Math.min(this.maxAngularVelocity, this.angularVelocity));
    this.angle += this.angularVelocity * dt;

    while (this.angle < 0) this.angle += Math.PI * 2;
    while (this.angle >= Math.PI * 2) this.angle -= Math.PI * 2;

    this.trailTimer += dt;
    if (this.trailTimer >= this.trailInterval) {
      this.trailTimer = 0;
      this.addTrailParticle();
    }

    this.trail = this.trail.filter(p => {
      p.life -= dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.95;
      p.vy *= 0.95;
      return p.life > 0;
    });
  }

  getWorldPos(): { x: number; y: number } {
    return {
      x: this.centerX + Math.cos(this.angle) * this.orbitRadius,
      y: this.centerY + Math.sin(this.angle) * this.orbitRadius,
    };
  }

  reverse() {
    this.angularVelocity *= -0.85;
  }

  die() {
    if (!this.alive) return;
    this.alive = false;
    this.deathTimer = 0;

    const pos = this.getWorldPos();
    const speed = Math.abs(this.angularVelocity) * this.orbitRadius;
    for (let i = 0; i < 60; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = 20 + Math.random() * (80 + speed * 0.3);
      this.deathParticles.push({
        x: pos.x,
        y: pos.y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 1.0 + Math.random() * 1.5,
        maxLife: 2.5,
        hue: 200 + Math.random() * 160,
        size: 1 + Math.random() * 4,
      });
    }
  }

  isDeathDone(): boolean {
    return !this.alive && this.deathParticles.length === 0;
  }

  transitionTo(newOrbitIndex: number, newOrbitRadius: number) {
    if (this.transitionCooldown > 0) return;
    this.orbitIndex = newOrbitIndex;
    this.orbitRadius = newOrbitRadius;
    this.transitionCooldown = 0.4;
  }

  private addTrailParticle() {
    const pos = this.getWorldPos();
    const speed = Math.abs(this.angularVelocity);
    const hue = 220 + speed * 20;
    this.trail.push({
      x: pos.x + (Math.random() - 0.5) * 3,
      y: pos.y + (Math.random() - 0.5) * 3,
      vx: (Math.random() - 0.5) * 8,
      vy: (Math.random() - 0.5) * 8,
      life: 0.4 + Math.random() * 0.3,
      maxLife: 0.7,
      hue: Math.min(hue, 340),
      size: 2 + speed * 0.3 + Math.random() * 2,
    });
  }

  private updateDeathParticles(dt: number) {
    this.deathTimer += dt;
    this.deathParticles = this.deathParticles.filter(p => {
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= dt * 0.6;
      return p.life > 0;
    });
  }

  render(ctx: CanvasRenderingContext2D, time: number) {
    this.renderTrail(ctx);
    if (this.alive) {
      this.renderBall(ctx, time);
    }
    this.renderDeathParticles(ctx);
  }

  private renderTrail(ctx: CanvasRenderingContext2D) {
    for (const p of this.trail) {
      const alpha = (p.life / p.maxLife) * 0.6;
      const s = p.size * (p.life / p.maxLife);
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 75%, ${alpha})`;
      ctx.shadowColor = `hsla(${p.hue}, 100%, 75%, ${alpha * 0.4})`;
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.restore();
    }
  }

  private renderBall(ctx: CanvasRenderingContext2D, time: number) {
    const pos = this.getWorldPos();
    const pulse = Math.sin(time * 6) * 0.1 + 1;
    const r = this.ballRadius * pulse;

    ctx.save();

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r + 8, 0, Math.PI * 2);
    const outerGlow = ctx.createRadialGradient(pos.x, pos.y, r, pos.x, pos.y, r + 8);
    outerGlow.addColorStop(0, 'hsla(200, 100%, 80%, 0.3)');
    outerGlow.addColorStop(1, 'transparent');
    ctx.fillStyle = outerGlow;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
    const innerGrad = ctx.createRadialGradient(pos.x - 2, pos.y - 2, 0, pos.x, pos.y, r);
    innerGrad.addColorStop(0, 'hsla(180, 100%, 95%, 0.95)');
    innerGrad.addColorStop(0.4, 'hsla(200, 100%, 80%, 0.9)');
    innerGrad.addColorStop(1, 'hsla(230, 100%, 60%, 0.8)');
    ctx.fillStyle = innerGrad;
    ctx.shadowColor = 'hsla(200, 100%, 70%, 0.8)';
    ctx.shadowBlur = 20;
    ctx.fill();

    ctx.restore();
  }

  private renderDeathParticles(ctx: CanvasRenderingContext2D) {
    for (const p of this.deathParticles) {
      const alpha = (p.life / p.maxLife) * 0.7;
      const s = p.size * Math.min(1, p.life / (p.maxLife * 0.5));
      ctx.save();
      ctx.beginPath();
      ctx.arc(p.x, p.y, s, 0, Math.PI * 2);
      ctx.fillStyle = `hsla(${p.hue}, 100%, 75%, ${alpha})`;
      ctx.shadowColor = `hsla(${p.hue}, 100%, 75%, ${alpha * 0.4})`;
      ctx.shadowBlur = 4;
      ctx.fill();
      ctx.restore();
    }
  }
}
