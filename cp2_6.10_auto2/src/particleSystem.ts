import type { Particle, Note } from './types';

export class ParticleSystem {
  private particles: Particle[] = [];
  private nextId = 0;
  public maxParticles = 500;

  update(deltaTime: number): void {
    const gravity = 400;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }

      if (p.type === 'fall') {
        p.vy += gravity * deltaTime;
      }

      if (p.rotation !== undefined && p.rotationSpeed !== undefined) {
        p.rotation += p.rotationSpeed * deltaTime;
      }

      p.x += p.vx * deltaTime;
      p.y += p.vy * deltaTime;
    }
  }

  spawnRingParticles(x: number, y: number, color: string, perfect = false): void {
    const count = perfect ? 24 : 16;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const speed = perfect ? 180 + Math.random() * 60 : 120 + Math.random() * 40;

      this.addParticle({
        id: this.nextId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: perfect ? 1.0 : 0.7,
        maxLife: perfect ? 1.0 : 0.7,
        color,
        size: perfect ? 6 : 4,
        type: 'ring'
      });
    }

    if (perfect) {
      this.spawnStarParticles(x, y, color);
    }
  }

  spawnStarParticles(x: number, y: number, color: string): void {
    const count = 8;

    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2 + Math.PI / 8;
      const speed = 250 + Math.random() * 100;

      this.addParticle({
        id: this.nextId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 1.2,
        maxLife: 1.2,
        color: '#FFD700',
        size: 8,
        type: 'star',
        rotation: angle,
        rotationSpeed: 2
      });
    }
  }

  spawnFallParticles(note: Note): void {
    const count = 5;

    for (let i = 0; i < count; i++) {
      const offsetX = (Math.random() - 0.5) * note.size;
      this.addParticle({
        id: this.nextId++,
        x: note.x + offsetX,
        y: note.y,
        vx: (Math.random() - 0.5) * 40,
        vy: -50 - Math.random() * 30,
        life: 1.5,
        maxLife: 1.5,
        color: '#555555',
        size: note.size * 0.3,
        type: 'fall'
      });
    }
  }

  spawnSparkleParticles(x: number, y: number, color: string): void {
    const count = 8;

    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 50 + Math.random() * 100;

      this.addParticle({
        id: this.nextId++,
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5 + Math.random() * 0.3,
        maxLife: 0.8,
        color,
        size: 2 + Math.random() * 3,
        type: 'sparkle'
      });
    }
  }

  private addParticle(particle: Particle): void {
    if (this.particles.length >= this.maxParticles) {
      this.particles.shift();
    }
    this.particles.push(particle);
  }

  getParticles(): Particle[] {
    return this.particles;
  }

  clear(): void {
    this.particles = [];
  }
}
