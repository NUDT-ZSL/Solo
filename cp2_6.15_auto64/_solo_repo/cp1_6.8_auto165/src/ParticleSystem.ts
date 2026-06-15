export interface Particle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  alpha: number;
  hue: number;
  life: number;
  maxLife: number;
  trail: Array<{ x: number; y: number; alpha: number }>;
  collected: boolean;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private nextId = 0;
  private spawnTimer = 0;
  private spawnInterval = 0.15;
  private maxParticles = 200;
  private arenaCx: number;
  private arenaCy: number;
  private arenaRadius: number;

  constructor(cx: number, cy: number, radius: number) {
    this.arenaCx = cx;
    this.arenaCy = cy;
    this.arenaRadius = radius;
  }

  update(dt: number, attractors: Array<{ x: number; y: number; strength: number; radius: number }>) {
    this.spawnTimer += dt;
    while (this.spawnTimer >= this.spawnInterval && this.particles.length < this.maxParticles) {
      this.spawnTimer -= this.spawnInterval;
      this.spawnParticle();
    }

    for (const p of this.particles) {
      if (p.collected) continue;

      for (const a of attractors) {
        const dx = a.x - p.x;
        const dy = a.y - p.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);
        if (dist < 1) continue;
        const force = (a.strength * 800) / (distSq + 100);
        const maxForce = 600;
        const clampedForce = Math.min(force, maxForce);
        p.vx += (dx / dist) * clampedForce * dt;
        p.vy += (dy / dist) * clampedForce * dt;

        if (dist < a.radius * 0.4) {
          p.collected = true;
        }
      }

      p.vx *= 0.995;
      p.vy *= 0.995;
      p.x += p.vx * dt;
      p.y += p.vy * dt;

      const dx = p.x - this.arenaCx;
      const dy = p.y - this.arenaCy;
      const distFromCenter = Math.sqrt(dx * dx + dy * dy);
      if (distFromCenter + p.radius > this.arenaRadius) {
        const nx = dx / distFromCenter;
        const ny = dy / distFromCenter;
        p.x = this.arenaCx + nx * (this.arenaRadius - p.radius);
        p.y = this.arenaCy + ny * (this.arenaRadius - p.radius);
        const dot = p.vx * nx + p.vy * ny;
        p.vx -= 2 * dot * nx;
        p.vy -= 2 * dot * ny;
        p.vx *= 0.6;
        p.vy *= 0.6;
      }

      p.trail.push({ x: p.x, y: p.y, alpha: p.alpha });
      if (p.trail.length > 12) p.trail.shift();

      p.life -= dt;
      if (p.life <= 0) {
        p.collected = true;
      }
      p.alpha = Math.min(1, p.life / (p.maxLife * 0.3));
    }

    this.particles = this.particles.filter((p) => !p.collected || p.trail.length > 0);
    for (const p of this.particles) {
      if (p.collected) {
        p.trail.shift();
        p.radius *= 0.92;
      }
    }
    this.particles = this.particles.filter((p) => !(p.collected && p.trail.length === 0));
  }

  private spawnParticle() {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * this.arenaRadius * 0.85;
    const x = this.arenaCx + Math.cos(angle) * r;
    const y = this.arenaCy + Math.sin(angle) * r;
    const speed = 10 + Math.random() * 30;
    const moveAngle = Math.random() * Math.PI * 2;
    const maxLife = 8 + Math.random() * 7;
    this.particles.push({
      id: this.nextId++,
      x,
      y,
      vx: Math.cos(moveAngle) * speed,
      vy: Math.sin(moveAngle) * speed,
      radius: 2 + Math.random() * 3,
      alpha: 1,
      hue: 180 + Math.random() * 80,
      life: maxLife,
      maxLife,
      trail: [],
      collected: false,
    });
  }

  collectNear(x: number, y: number, radius: number): number {
    let count = 0;
    for (const p of this.particles) {
      if (p.collected) continue;
      const dx = p.x - x;
      const dy = p.y - y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius) {
        p.collected = true;
        count++;
      }
    }
    return count;
  }

  applyShockwave(cx: number, cy: number, radius: number, force: number) {
    for (const p of this.particles) {
      if (p.collected) continue;
      const dx = p.x - cx;
      const dy = p.y - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < radius && dist > 1) {
        const strength = force * (1 - dist / radius);
        p.vx += (dx / dist) * strength;
        p.vy += (dy / dist) * strength;
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const p of this.particles) {
      if (p.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(p.trail[0].x, p.trail[0].y);
        for (let i = 1; i < p.trail.length; i++) {
          ctx.lineTo(p.trail[i].x, p.trail[i].y);
        }
        ctx.strokeStyle = `hsla(${p.hue}, 100%, 70%, ${p.alpha * 0.3})`;
        ctx.lineWidth = p.radius * 0.8;
        ctx.lineCap = 'round';
        ctx.stroke();
      }

      if (!p.collected) {
        const gradient = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.radius * 3);
        gradient.addColorStop(0, `hsla(${p.hue}, 100%, 80%, ${p.alpha * 0.8})`);
        gradient.addColorStop(0.4, `hsla(${p.hue}, 100%, 60%, ${p.alpha * 0.4})`);
        gradient.addColorStop(1, `hsla(${p.hue}, 100%, 50%, 0)`);
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();

        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fillStyle = `hsla(${p.hue}, 100%, 90%, ${p.alpha})`;
        ctx.fill();
      }
    }
  }

  getParticleCount(): number {
    return this.particles.filter((p) => !p.collected).length;
  }

  reset() {
    this.particles = [];
    this.nextId = 0;
    this.spawnTimer = 0;
  }

  resize(cx: number, cy: number, radius: number) {
    this.arenaCx = cx;
    this.arenaCy = cy;
    this.arenaRadius = radius;
  }
}
