import type { Particle, Note } from './types';

export class ParticleSystem {
  private pool: Particle[] = [];
  private activeCount = 0;
  public maxParticles = 500;
  private nextId = 0;

  constructor() {
    this.initPool();
  }

  private initPool(): void {
    for (let i = 0; i < this.maxParticles; i++) {
      this.pool.push(this.createEmptyParticle());
    }
  }

  private createEmptyParticle(): Particle {
    return {
      id: -1,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      life: 0,
      maxLife: 1,
      color: '#ffffff',
      size: 1,
      type: 'ring'
    };
  }

  private acquireParticle(): Particle | null {
    if (this.activeCount >= this.maxParticles) {
      return this.recycleOldestParticle();
    }

    const particle = this.pool[this.activeCount];
    this.activeCount++;
    return particle;
  }

  private recycleOldestParticle(): Particle | null {
    if (this.activeCount === 0) return null;

    const oldest = this.pool[0];
    oldest.life = 0;

    for (let i = 0; i < this.activeCount - 1; i++) {
      this.pool[i] = this.pool[i + 1];
    }
    this.pool[this.activeCount - 1] = oldest;

    return oldest;
  }

  update(deltaTime: number): void {
    const gravity = 500;
    let writeIndex = 0;

    for (let i = 0; i < this.activeCount; i++) {
      const p = this.pool[i];
      p.life -= deltaTime;

      if (p.life <= 0) {
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

      if (writeIndex !== i) {
        const temp = this.pool[writeIndex];
        this.pool[writeIndex] = p;
        this.pool[i] = temp;
      }
      writeIndex++;
    }

    this.activeCount = writeIndex;
  }

  spawnRingParticles(x: number, y: number, color: string, perfect = false): void {
    const count = perfect ? 28 : 18;

    for (let i = 0; i < count; i++) {
      const p = this.acquireParticle();
      if (!p) break;

      const angle = (i / count) * Math.PI * 2;
      const speed = perfect ? 200 + Math.random() * 80 : 140 + Math.random() * 50;

      p.id = this.nextId++;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = perfect ? 1.1 : 0.75;
      p.maxLife = perfect ? 1.1 : 0.75;
      p.color = color;
      p.size = perfect ? 7 : 5;
      p.type = 'ring';
      p.rotation = undefined;
      p.rotationSpeed = undefined;
    }
  }

  spawnStarParticles(x: number, y: number, color: string): void {
    const count = 10;

    for (let i = 0; i < count; i++) {
      const p = this.acquireParticle();
      if (!p) break;

      const angle = (i / count) * Math.PI * 2 + Math.PI / 10;
      const speed = 280 + Math.random() * 120;

      p.id = this.nextId++;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 1.3;
      p.maxLife = 1.3;
      p.color = '#FFD700';
      p.size = 10;
      p.type = 'star';
      p.rotation = angle;
      p.rotationSpeed = 3;
    }
  }

  spawnFallParticles(note: Note): void {
    const count = 6;

    for (let i = 0; i < count; i++) {
      const p = this.acquireParticle();
      if (!p) break;

      const offsetX = (Math.random() - 0.5) * note.size * 1.2;

      p.id = this.nextId++;
      p.x = note.x + offsetX;
      p.y = note.y;
      p.vx = (Math.random() - 0.5) * 60 - 30;
      p.vy = -80 - Math.random() * 50;
      p.life = 1.8;
      p.maxLife = 1.8;
      p.color = '#555555';
      p.size = note.size * 0.35;
      p.type = 'fall';
      p.rotation = undefined;
      p.rotationSpeed = undefined;
    }
  }

  spawnSparkleParticles(x: number, y: number, color: string): void {
    const count = 12;

    for (let i = 0; i < count; i++) {
      const p = this.acquireParticle();
      if (!p) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 60 + Math.random() * 120;

      p.id = this.nextId++;
      p.x = x;
      p.y = y;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.life = 0.5 + Math.random() * 0.4;
      p.maxLife = 0.9;
      p.color = color;
      p.size = 2 + Math.random() * 3;
      p.type = 'sparkle';
      p.rotation = undefined;
      p.rotationSpeed = undefined;
    }
  }

  getParticles(): Particle[] {
    return this.pool.slice(0, this.activeCount);
  }

  getActiveCount(): number {
    return this.activeCount;
  }

  clear(): void {
    for (let i = 0; i < this.activeCount; i++) {
      this.pool[i].life = 0;
    }
    this.activeCount = 0;
  }

  resizePool(newMax: number): void {
    if (newMax > this.maxParticles) {
      const diff = newMax - this.maxParticles;
      for (let i = 0; i < diff; i++) {
        this.pool.push(this.createEmptyParticle());
      }
    } else if (newMax < this.maxParticles && this.activeCount < newMax) {
      this.pool.length = newMax;
    }
    this.maxParticles = newMax;
  }
}
