export interface TrailPoint {
  x: number;
  y: number;
  alpha: number;
}

export class Bird {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number = 14;
  trail: TrailPoint[] = [];
  maxTrailLength: number = 24;
  energy: number = 0;
  maxEnergy: number = 100;
  hp: number = 3;
  maxHp: number = 3;
  invincibleTimer: number = 0;
  pulsePhase: number = 0;
  shockwaveCooldown: number = 0;
  readonly shockwaveCooldownMax: number = 0.25;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
  }

  update(dt: number, arenaCx: number, arenaCy: number, arenaR: number) {
    const lerpSpeed = 6;
    this.x += (this.targetX - this.x) * lerpSpeed * dt;
    this.y += (this.targetY - this.y) * lerpSpeed * dt;

    const dx = this.x - arenaCx;
    const dy = this.y - arenaCy;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const maxDist = arenaR - this.radius - 5;
    if (dist > maxDist) {
      this.x = arenaCx + (dx / dist) * maxDist;
      this.y = arenaCy + (dy / dist) * maxDist;
    }

    this.trail.unshift({ x: this.x, y: this.y, alpha: 1 });
    if (this.trail.length > this.maxTrailLength) {
      this.trail.pop();
    }
    for (let i = 0; i < this.trail.length; i++) {
      this.trail[i].alpha = 1 - i / this.maxTrailLength;
    }

    if (this.invincibleTimer > 0) {
      this.invincibleTimer -= dt;
    }
    if (this.shockwaveCooldown > 0) {
      this.shockwaveCooldown -= dt;
    }

    this.pulsePhase += dt * 3;
  }

  render(ctx: CanvasRenderingContext2D) {
    for (let i = this.trail.length - 1; i >= 0; i--) {
      const t = this.trail[i];
      const ratio = 1 - i / this.maxTrailLength;
      const trailRadius = this.radius * ratio * 0.7;
      if (trailRadius < 1) continue;
      const grad = ctx.createRadialGradient(t.x, t.y, 0, t.x, t.y, trailRadius);
      grad.addColorStop(0, `rgba(255,248,231,${t.alpha * 0.45})`);
      grad.addColorStop(0.6, `rgba(255,210,130,${t.alpha * 0.2})`);
      grad.addColorStop(1, `rgba(255,180,80,0)`);
      ctx.beginPath();
      ctx.arc(t.x, t.y, trailRadius, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();
    }

    const pulseSize = Math.sin(this.pulsePhase) * 2;
    const glowRadius = this.radius + 12 + pulseSize;

    const outerGlow = ctx.createRadialGradient(
      this.x, this.y, this.radius * 0.3,
      this.x, this.y, glowRadius
    );
    outerGlow.addColorStop(0, 'rgba(255,248,231,0.7)');
    outerGlow.addColorStop(0.35, 'rgba(255,220,150,0.35)');
    outerGlow.addColorStop(0.7, 'rgba(255,180,80,0.08)');
    outerGlow.addColorStop(1, 'rgba(255,160,60,0)');
    ctx.beginPath();
    ctx.arc(this.x, this.y, glowRadius, 0, Math.PI * 2);
    ctx.fillStyle = outerGlow;
    ctx.fill();

    const bodyGrad = ctx.createRadialGradient(
      this.x - this.radius * 0.25, this.y - this.radius * 0.25, 0,
      this.x, this.y, this.radius + pulseSize * 0.3
    );
    bodyGrad.addColorStop(0, '#ffffff');
    bodyGrad.addColorStop(0.4, '#fff8e7');
    bodyGrad.addColorStop(0.8, '#ffe4a0');
    bodyGrad.addColorStop(1, '#ffd070');
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius + pulseSize * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = bodyGrad;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(this.x - this.radius * 0.2, this.y - this.radius * 0.2, this.radius * 0.35, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.6)';
    ctx.fill();

    if (this.invincibleTimer > 0 && Math.sin(this.invincibleTimer * 20) > 0) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.radius + 6, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }

  canFire(): boolean {
    return this.shockwaveCooldown <= 0;
  }

  fire() {
    this.shockwaveCooldown = this.shockwaveCooldownMax;
  }

  setTarget(x: number, y: number) {
    this.targetX = x;
    this.targetY = y;
  }

  addEnergy(amount: number) {
    this.energy = Math.min(this.maxEnergy, this.energy + amount);
  }

  takeDamage(): boolean {
    if (this.invincibleTimer <= 0) {
      this.hp--;
      this.invincibleTimer = 1.5;
      return true;
    }
    return false;
  }

  isUltimateReady(): boolean {
    return this.energy >= this.maxEnergy;
  }

  useUltimate(): boolean {
    if (this.energy >= this.maxEnergy) {
      this.energy = 0;
      return true;
    }
    return false;
  }

  reset(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.energy = 0;
    this.hp = this.maxHp;
    this.invincibleTimer = 0;
    this.shockwaveCooldown = 0;
    this.trail = [];
    this.pulsePhase = 0;
  }
}
