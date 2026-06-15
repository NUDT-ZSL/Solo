import { Star, lerpColor, mixColors } from './star';
import { ConnectionManager } from './connection';
import { ParticleSystem } from './particle';

export class Orchestrator {
  stars: Star[];
  connections: ConnectionManager;
  particles: ParticleSystem;
  maxDensity: number;
  decayTime: number;
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.stars = [];
    this.connections = new ConnectionManager();
    this.particles = new ParticleSystem();
    this.maxDensity = 50;
    this.decayTime = 10;
    this.width = width;
    this.height = height;
  }

  resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
  }

  spawnNote(_note: number, velocity: number, x?: number, y?: number): void {
    if (this.stars.length >= this.maxDensity) {
      let oldestIdx = 0;
      let oldestAge = this.stars[0]?.age ?? 0;
      for (let i = 1; i < this.stars.length; i++) {
        if (this.stars[i].age > oldestAge) {
          oldestAge = this.stars[i].age;
          oldestIdx = i;
        }
      }
      this.stars[oldestIdx].decaying = true;
    }

    const spawnX = x ?? Math.random() * this.width * 0.6 + this.width * 0.2;
    const spawnY = y ?? Math.random() * this.height * 0.6 + this.height * 0.2;

    const angle = Math.random() * Math.PI * 2;
    const speed = 120 + Math.random() * 60;
    const vx = Math.cos(angle) * speed;
    const vy = Math.sin(angle) * speed;

    const color = lerpColor(velocity);
    const lifetime = this.decayTime - 2 + Math.random() * 4;
    const trailLen = 8 + Math.floor(Math.random() * 5);

    const star = new Star(spawnX, spawnY, vx, vy, color, lifetime, trailLen);
    this.stars.push(star);
  }

  update(dt: number): void {
    for (const star of this.stars) {
      star.update(dt);
    }

    const prevLen = this.stars.length;
    this.stars = this.stars.filter((s) => s.alive);

    this.checkCollisions();

    this.connections.update(dt);

    this.particles.update(dt);
  }

  private checkCollisions(): void {
    const len = this.stars.length;
    const fused = new Set<number>();

    for (let i = 0; i < len; i++) {
      if (fused.has(i)) continue;
      for (let j = i + 1; j < len; j++) {
        if (fused.has(j)) continue;

        const a = this.stars[i];
        const b = this.stars[j];
        const dx = a.x - b.x;
        const dy = a.y - b.y;
        const distSq = dx * dx + dy * dy;

        if (distSq < 100) {
          fused.add(j);

          const fusionX = (a.x + b.x) / 2;
          const fusionY = (a.y + b.y) / 2;
          a.x = fusionX;
          a.y = fusionY;
          a.vx = ((a.vx + b.vx) / 2) * 0.7;
          a.vy = ((a.vy + b.vy) / 2) * 0.7;
          a.color = mixColors(a.color, b.color);
          a.radius = Math.min(a.radius * 2, 12);
          a.trailLength = Math.round(a.trailLength * 1.5);
          a.lifetime = Math.max(a.lifetime, a.age + this.decayTime * 0.5);
          a.decaying = false;
          a.brightness = 1;

          this.particles.spawnBurst(fusionX, fusionY);
        } else if (distSq < 900) {
          this.connections.add(a, b);
        }
      }
    }

    if (fused.size > 0) {
      this.stars = this.stars.filter((_, idx) => !fused.has(idx));
    }
  }

  draw(ctx: CanvasRenderingContext2D): void {
    this.connections.draw(ctx);

    const drawCount = this.stars.length;
    for (let i = 0; i < drawCount; i++) {
      this.stars[i].draw(ctx);
    }

    this.particles.draw(ctx);
  }

  setDensity(value: number): void {
    this.maxDensity = value;
  }

  setDecayTime(value: number): void {
    this.decayTime = value;
  }

  reset(): void {
    this.stars = [];
    this.connections.reset();
    this.particles.reset();
  }
}
