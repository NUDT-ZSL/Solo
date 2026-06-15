export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  life: number;
  maxLife: number;
  color: { r: number; g: number; b: number };
  type: 'burst' | 'vortex' | 'victory';
  angle?: number;
  angularSpeed?: number;
  radius?: number;
  centerX?: number;
  centerY?: number;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private maxParticles = 100;

  update(deltaTime: number): void {
    const dt = deltaTime / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;

      if (p.type === 'burst') {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        p.vx *= 0.98;
        p.vy *= 0.98;
      } else if (p.type === 'vortex' && p.centerX !== undefined && p.centerY !== undefined) {
        p.angle = (p.angle || 0) + (p.angularSpeed || 0) * dt;
        p.radius = (p.radius || 0) * 0.95;
        p.x = p.centerX + Math.cos(p.angle) * p.radius;
        p.y = p.centerY + Math.sin(p.angle) * p.radius;
      } else if (p.type === 'victory') {
        p.x += p.vx * dt;
        p.y += p.vy * dt - 50 * dt;
        p.vx *= 0.99;
      }

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  spawnBurst(x: number, y: number): void {
    const count = 30;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.3;
      const speed = 60 + Math.random() * 80;
      this.particles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 2 + Math.random() * 3,
        life: 1000,
        maxLife: 1000,
        color: { r: 255, g: 215, b: 0 },
        type: 'burst'
      });
    }
  }

  spawnVortex(x: number, y: number): void {
    const count = 25;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = (Math.PI * 2 * i) / count;
      const radius = 40 + Math.random() * 20;
      this.particles.push({
        x: x + Math.cos(angle) * radius,
        y: y + Math.sin(angle) * radius,
        vx: 0,
        vy: 0,
        size: 3 + Math.random() * 2,
        life: 500,
        maxLife: 500,
        color: { r: 180, g: 100, b: 255 },
        type: 'vortex',
        angle,
        angularSpeed: (Math.random() > 0.5 ? 1 : -1) * (8 + Math.random() * 4),
        radius,
        centerX: x,
        centerY: y
      });
    }
  }

  spawnVictory(x: number, y: number): void {
    const count = 50;
    for (let i = 0; i < count; i++) {
      if (this.particles.length >= this.maxParticles) break;
      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 60;
      this.particles.push({
        x: x + (Math.random() - 0.5) * 20,
        y: y + (Math.random() - 0.5) * 20,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 30,
        size: 2 + Math.random() * 4,
        life: 2000 + Math.random() * 1500,
        maxLife: 3500,
        color: { r: 255, g: 220 + Math.floor(Math.random() * 35), b: 100 },
        type: 'victory'
      });
    }
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  clear(): void {
    this.particles = [];
  }
}
