export interface BlackHole {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  mass: number;
  age: number;
  maxAge: number;
  state: 'growing' | 'active' | 'collapsing' | 'exploding';
  collapseTimer: number;
  explosionTimer: number;
  explosionRadius: number;
  maxExplosionRadius: number;
  collectedParticles: number;
  rotation: number;
  spiralParticles: Array<{
    angle: number;
    dist: number;
    speed: number;
    size: number;
    hue: number;
  }>;
}

export interface Shockwave {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  force: number;
}

export class BlackHoleManager {
  private blackHoles: BlackHole[] = [];
  private shockwaves: Shockwave[] = [];
  private nextId = 0;
  private arenaCx: number;
  private arenaCy: number;
  private arenaRadius: number;
  private onScoreCallback: ((count: number) => void) | null = null;

  constructor(cx: number, cy: number, radius: number) {
    this.arenaCx = cx;
    this.arenaCy = cy;
    this.arenaRadius = radius;
  }

  onScore(cb: (count: number) => void) {
    this.onScoreCallback = cb;
  }

  createBlackHole(x: number, y: number, vx: number, vy: number): BlackHole {
    const bh: BlackHole = {
      id: this.nextId++,
      x,
      y,
      vx,
      vy,
      radius: 8,
      mass: 5,
      age: 0,
      maxAge: 3.5 + Math.random() * 1.5,
      state: 'growing',
      collapseTimer: 0,
      explosionTimer: 0,
      explosionRadius: 0,
      maxExplosionRadius: 120,
      collectedParticles: 0,
      rotation: 0,
      spiralParticles: [],
    };
    for (let i = 0; i < 20; i++) {
      bh.spiralParticles.push({
        angle: Math.random() * Math.PI * 2,
        dist: 30 + Math.random() * 50,
        speed: 1.5 + Math.random() * 2,
        size: 1 + Math.random() * 2,
        hue: 260 + Math.random() * 40,
      });
    }
    this.blackHoles.push(bh);
    return bh;
  }

  update(dt: number): { attractors: Array<{ x: number; y: number; strength: number; radius: number }>; shockwaves: Shockwave[] } {
    const attractors: Array<{ x: number; y: number; strength: number; radius: number }> = [];

    for (const bh of this.blackHoles) {
      bh.age += dt;
      bh.rotation += dt * 2;

      switch (bh.state) {
        case 'growing':
          bh.radius = Math.min(20, bh.radius + dt * 30);
          bh.mass = bh.radius * 0.5;
          if (bh.age > 0.3) bh.state = 'active';
          attractors.push({ x: bh.x, y: bh.y, strength: bh.mass, radius: bh.radius });
          break;

        case 'active':
          attractors.push({ x: bh.x, y: bh.y, strength: bh.mass, radius: bh.radius });
          bh.radius = 20 + Math.sin(bh.age * 3) * 2;

          if (bh.age >= bh.maxAge) {
            bh.state = 'collapsing';
            bh.collapseTimer = 0;
          }
          break;

        case 'collapsing':
          bh.collapseTimer += dt;
          const collapseDuration = 0.8;
          const t = bh.collapseTimer / collapseDuration;
          bh.radius = 20 * (1 - t * 0.8);
          bh.mass = bh.radius * 0.5;

          for (const sp of bh.spiralParticles) {
            sp.dist = Math.max(2, sp.dist - dt * sp.speed * 60);
            sp.angle += dt * sp.speed * 4;
          }

          attractors.push({ x: bh.x, y: bh.y, strength: bh.mass * 3, radius: bh.radius });

          if (bh.collapseTimer >= collapseDuration) {
            bh.state = 'exploding';
            bh.explosionTimer = 0;
            bh.explosionRadius = 5;

            if (this.onScoreCallback) {
              this.onScoreCallback(bh.collectedParticles + 5);
            }

            this.shockwaves.push({
              x: bh.x,
              y: bh.y,
              radius: 10,
              maxRadius: bh.maxExplosionRadius,
              alpha: 1,
              force: 400 + bh.collectedParticles * 15,
            });
          }
          break;

        case 'exploding':
          bh.explosionTimer += dt;
          bh.explosionRadius += dt * 300;
          bh.radius = Math.max(0, bh.radius - dt * 80);
          if (bh.explosionTimer > 0.6) {
            bh.radius = 0;
          }
          break;
      }

      bh.x += bh.vx * dt;
      bh.y += bh.vy * dt;
      bh.vx *= 0.98;
      bh.vy *= 0.98;

      const dx = bh.x - this.arenaCx;
      const dy = bh.y - this.arenaCy;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);
      if (distFromCenter + bh.radius > this.arenaRadius - 5) {
        const nx = dx / distFromCenter;
        const ny = dy / distFromCenter;
        bh.x = this.arenaCx + nx * (this.arenaRadius - bh.radius - 5);
        bh.y = this.arenaCy + ny * (this.arenaRadius - bh.radius - 5);
        const dot = bh.vx * nx + bh.vy * ny;
        bh.vx -= 2 * dot * nx;
        bh.vy -= 2 * dot * ny;
        bh.vx *= 0.5;
        bh.vy *= 0.5;
      }
    }

    for (const sw of this.shockwaves) {
      sw.radius += dt * 350;
      sw.alpha = Math.max(0, 1 - sw.radius / sw.maxRadius);
    }

    for (const bh of this.blackHoles) {
      if (bh.state === 'active' || bh.state === 'growing') {
        for (const sw of this.shockwaves) {
          const dx = bh.x - sw.x;
          const dy = bh.y - sw.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (Math.abs(dist - sw.radius) < 40) {
            const strength = sw.force * sw.alpha * dt;
            bh.vx += (dx / dist) * strength * 0.5;
            bh.vy += (dy / dist) * strength * 0.5;
          }
        }
      }
    }

    this.shockwaves = this.shockwaves.filter((sw) => sw.alpha > 0.01);
    this.blackHoles = this.blackHoles.filter((bh) => {
      if (bh.state === 'exploding' && bh.explosionTimer > 0.8) return false;
      return true;
    });

    return { attractors, shockwaves: this.shockwaves };
  }

  collectNear(x: number, y: number, radius: number): number {
    let total = 0;
    for (const bh of this.blackHoles) {
      if (bh.state === 'exploding') continue;
      const dx = x - bh.x;
      const dy = y - bh.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius + bh.radius) {
        bh.collectedParticles++;
        total++;
      }
    }
    return total;
  }

  getBlackHoles(): BlackHole[] {
    return this.blackHoles;
  }

  getShockwaves(): Shockwave[] {
    return this.shockwaves;
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const bh of this.blackHoles) {
      ctx.save();
      ctx.translate(bh.x, bh.y);

      if (bh.state !== 'exploding') {
        const attractRadius = bh.radius * 4;
        const gradient = ctx.createRadialGradient(0, 0, bh.radius * 0.3, 0, 0, attractRadius);
        gradient.addColorStop(0, 'rgba(80, 0, 160, 0.4)');
        gradient.addColorStop(0.5, 'rgba(60, 0, 120, 0.15)');
        gradient.addColorStop(1, 'rgba(40, 0, 80, 0)');
        ctx.beginPath();
        ctx.arc(0, 0, attractRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        for (const sp of bh.spiralParticles) {
          const px = Math.cos(sp.angle + bh.rotation) * sp.dist;
          const py = Math.sin(sp.angle + bh.rotation) * sp.dist;
          const spiralAlpha = bh.state === 'collapsing' ? 1 : 0.6;
          ctx.beginPath();
          ctx.arc(px, py, sp.size, 0, Math.PI * 2);
          ctx.fillStyle = `hsla(${sp.hue}, 100%, 75%, ${spiralAlpha})`;
          ctx.fill();
        }

        const coreGradient = ctx.createRadialGradient(0, 0, 0, 0, 0, bh.radius);
        coreGradient.addColorStop(0, 'rgba(120, 40, 200, 1)');
        coreGradient.addColorStop(0.6, 'rgba(60, 0, 140, 0.9)');
        coreGradient.addColorStop(1, 'rgba(30, 0, 80, 0.7)');
        ctx.beginPath();
        ctx.arc(0, 0, bh.radius, 0, Math.PI * 2);
        ctx.fillStyle = coreGradient;
        ctx.fill();

        const ringGradient = ctx.createRadialGradient(0, 0, bh.radius - 2, 0, 0, bh.radius + 4);
        ringGradient.addColorStop(0, 'rgba(140, 80, 255, 0)');
        ringGradient.addColorStop(0.5, 'rgba(140, 80, 255, 0.6)');
        ringGradient.addColorStop(1, 'rgba(140, 80, 255, 0)');
        ctx.beginPath();
        ctx.arc(0, 0, bh.radius + 2, 0, Math.PI * 2);
        ctx.strokeStyle = 'rgba(160, 100, 255, 0.8)';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (bh.state === 'exploding') {
        const t = bh.explosionTimer / 0.8;
        const flashAlpha = Math.max(0, 1 - t * 2);
        if (flashAlpha > 0) {
          const flashGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, 30 * (1 - t));
          flashGrad.addColorStop(0, `rgba(200, 160, 255, ${flashAlpha})`);
          flashGrad.addColorStop(1, `rgba(120, 40, 200, 0)`);
          ctx.beginPath();
          ctx.arc(0, 0, 30 * (1 - t), 0, Math.PI * 2);
          ctx.fillStyle = flashGrad;
          ctx.fill();
        }

        const burstCount = 12;
        for (let i = 0; i < burstCount; i++) {
          const angle = (i / burstCount) * Math.PI * 2 + bh.rotation;
          const burstDist = bh.explosionRadius * 0.5 * t;
          const bx = Math.cos(angle) * burstDist;
          const by = Math.sin(angle) * burstDist;
          const burstAlpha = Math.max(0, 1 - t * 1.5);
          ctx.beginPath();
          ctx.arc(bx, by, 2 * (1 - t), 0, Math.PI * 2);
          ctx.fillStyle = `rgba(180, 120, 255, ${burstAlpha})`;
          ctx.fill();
        }
      }

      ctx.restore();
    }

    for (const sw of this.shockwaves) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(140, 100, 255, ${sw.alpha * 0.8})`;
      ctx.lineWidth = 3 * sw.alpha + 1;
      ctx.stroke();

      const innerGrad = ctx.createRadialGradient(
        sw.x, sw.y, sw.radius - 10,
        sw.x, sw.y, sw.radius + 10
      );
      innerGrad.addColorStop(0, `rgba(180, 140, 255, 0)`);
      innerGrad.addColorStop(0.5, `rgba(180, 140, 255, ${sw.alpha * 0.3})`);
      innerGrad.addColorStop(1, `rgba(180, 140, 255, 0)`);
      ctx.beginPath();
      ctx.arc(sw.x, sw.y, sw.radius, 0, Math.PI * 2);
      ctx.strokeStyle = innerGrad;
      ctx.lineWidth = 20 * sw.alpha;
      ctx.stroke();
      ctx.restore();
    }
  }

  reset() {
    this.blackHoles = [];
    this.shockwaves = [];
    this.nextId = 0;
  }

  resize(cx: number, cy: number, radius: number) {
    this.arenaCx = cx;
    this.arenaCy = cy;
    this.arenaRadius = radius;
  }
}
