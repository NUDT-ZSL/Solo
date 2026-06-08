export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
}

export interface LightOrb {
  x: number;
  y: number;
  collected: boolean;
  glowPhase: number;
  rotationAngle: number;
  radius: number;
}

export class LightSystem {
  orbs: LightOrb[];
  particles: Particle[];
  collectedCount: number;
  score: number;
  orbsForTeleport: number;
  teleportCharges: number;

  constructor(orbPositions: { x: number; y: number }[]) {
    this.orbs = orbPositions.map((pos) => ({
      x: pos.x,
      y: pos.y,
      collected: false,
      glowPhase: Math.random() * Math.PI * 2,
      rotationAngle: 0,
      radius: 6,
    }));
    this.particles = [];
    this.collectedCount = 0;
    this.score = 0;
    this.orbsForTeleport = 5;
    this.teleportCharges = 0;
  }

  update(dt: number): void {
    for (const orb of this.orbs) {
      if (orb.collected) continue;
      orb.glowPhase += dt * 2.5;
      orb.rotationAngle += dt * 1.2;
    }

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.98;
      p.vy *= 0.98;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  checkCollection(px: number, py: number, playerRadius: number): boolean {
    let collected = false;
    for (const orb of this.orbs) {
      if (orb.collected) continue;
      const dx = orb.x - px;
      const dy = orb.y - py;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < playerRadius + orb.radius + 4) {
        orb.collected = true;
        this.collectedCount++;
        this.score += 100;
        this.spawnCollectionParticles(orb.x, orb.y);
        collected = true;

        if (this.collectedCount % this.orbsForTeleport === 0) {
          this.teleportCharges++;
        }
      }
    }
    return collected;
  }

  useTeleportCharge(): boolean {
    if (this.teleportCharges > 0) {
      this.teleportCharges--;
      return true;
    }
    return false;
  }

  spawnCollectionParticles(x: number, y: number): void {
    const count = 20;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 60 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.5,
        maxLife: 1,
        size: 2 + Math.random() * 3,
        color: Math.random() > 0.5 ? '#FFD700' : '#FFA500',
      });
    }
  }

  spawnTeleportParticles(x: number, y: number): void {
    const count = 30;
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 * i) / count;
      const speed = 100 + Math.random() * 120;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.4 + Math.random() * 0.4,
        maxLife: 0.8,
        size: 2 + Math.random() * 4,
        color: Math.random() > 0.3 ? '#00FFFF' : '#7B68EE',
      });
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderOrbs(ctx);
    this.renderParticles(ctx);
  }

  private renderOrbs(ctx: CanvasRenderingContext2D): void {
    for (const orb of this.orbs) {
      if (orb.collected) continue;

      const glowIntensity = 0.6 + 0.4 * Math.sin(orb.glowPhase);
      const outerRadius = orb.radius + 10 * glowIntensity;

      const outerGlow = ctx.createRadialGradient(
        orb.x, orb.y, orb.radius * 0.3,
        orb.x, orb.y, outerRadius
      );
      outerGlow.addColorStop(0, `rgba(255, 215, 0, ${0.8 * glowIntensity})`);
      outerGlow.addColorStop(0.3, `rgba(255, 200, 50, ${0.4 * glowIntensity})`);
      outerGlow.addColorStop(0.7, `rgba(255, 180, 0, ${0.15 * glowIntensity})`);
      outerGlow.addColorStop(1, 'rgba(255, 165, 0, 0)');

      ctx.beginPath();
      ctx.arc(orb.x, orb.y, outerRadius, 0, Math.PI * 2);
      ctx.fillStyle = outerGlow;
      ctx.fill();

      ctx.save();
      ctx.translate(orb.x, orb.y);
      ctx.rotate(orb.rotationAngle);

      const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, orb.radius);
      coreGradient.addColorStop(0, '#FFFFFF');
      coreGradient.addColorStop(0.3, '#FFE566');
      coreGradient.addColorStop(0.7, '#FFD700');
      coreGradient.addColorStop(1, '#FFA500');

      ctx.beginPath();
      ctx.arc(0, 0, orb.radius, 0, Math.PI * 2);
      ctx.fillStyle = coreGradient;
      ctx.fill();

      ctx.beginPath();
      ctx.moveTo(-orb.radius * 0.5, -orb.radius * 0.3);
      ctx.lineTo(orb.radius * 0.5, -orb.radius * 0.3);
      ctx.lineTo(0, orb.radius * 0.5);
      ctx.closePath();
      ctx.fillStyle = `rgba(255, 255, 255, ${0.3 * glowIntensity})`;
      ctx.fill();

      ctx.restore();
    }
  }

  private renderParticles(ctx: CanvasRenderingContext2D): void {
    for (const p of this.particles) {
      const lifeRatio = p.life / p.maxLife;
      const alpha = lifeRatio;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * lifeRatio, 0, Math.PI * 2);
      ctx.fillStyle = p.color;
      ctx.globalAlpha = alpha;
      ctx.fill();

      const glowGrad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size * lifeRatio * 2);
      glowGrad.addColorStop(0, p.color);
      glowGrad.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * lifeRatio * 2, 0, Math.PI * 2);
      ctx.fillStyle = glowGrad;
      ctx.globalAlpha = alpha * 0.3;
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }
}
