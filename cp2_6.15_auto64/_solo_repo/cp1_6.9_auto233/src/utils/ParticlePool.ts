import Phaser from 'phaser';
import { MAX_PARTICLES } from '../config/gameConfig';

export interface ParticleData {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
  alpha: number;
  scale: number;
  gravity: number;
}

export class ParticlePool {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private particles: ParticleData[];
  private pool: ParticleData[];
  private maxParticles: number;

  constructor(scene: Phaser.Scene, max: number = MAX_PARTICLES) {
    this.scene = scene;
    this.maxParticles = max;
    this.particles = [];
    this.pool = [];
    this.graphics = scene.add.graphics();
    this.graphics.setDepth(1000);
    for (let i = 0; i < this.maxParticles; i++) {
      this.pool.push({
        active: false,
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 0, color: 0xffffff,
        size: 2, alpha: 1, scale: 1, gravity: 0
      });
    }
  }

  emit(
    x: number, y: number,
    count: number,
    color: number,
    opts: {
      minSpeed?: number; maxSpeed?: number;
      minSize?: number; maxSize?: number;
      life?: number; gravity?: number;
      angleMin?: number; angleMax?: number;
      scale?: number;
    } = {}
  ): void {
    const minSpeed = opts.minSpeed ?? 30;
    const maxSpeed = opts.maxSpeed ?? 100;
    const minSize = opts.minSize ?? 2;
    const maxSize = opts.maxSize ?? 4;
    const life = opts.life ?? 0.6;
    const gravity = opts.gravity ?? 0;
    const angleMin = opts.angleMin ?? 0;
    const angleMax = opts.angleMax ?? Math.PI * 2;
    const scale = opts.scale ?? 1;
    for (let i = 0; i < count; i++) {
      const p = this.acquire();
      if (!p) break;
      p.active = true;
      p.x = x; p.y = y;
      const angle = angleMin + Math.random() * (angleMax - angleMin);
      const speed = minSpeed + Math.random() * (maxSpeed - minSpeed);
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
      p.maxLife = life;
      p.life = life;
      p.color = color;
      p.size = (minSize + Math.random() * (maxSize - minSize)) * scale;
      p.alpha = 1;
      p.scale = scale;
      p.gravity = gravity;
    }
  }

  private acquire(): ParticleData | null {
    for (let i = 0; i < this.pool.length; i++) {
      const p = this.pool[i];
      if (!p.active) {
        this.particles.push(p);
        return p;
      }
    }
    return null;
  }

  update(dt: number): void {
    this.graphics.clear();
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        p.active = false;
        this.particles.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += p.gravity * dt;
      p.alpha = Math.max(0, p.life / p.maxLife);
      this.graphics.fillStyle(p.color, p.alpha);
      this.graphics.fillCircle(p.x, p.y, p.size);
    }
  }

  clear(): void {
    for (const p of this.particles) {
      p.active = false;
    }
    this.particles = [];
    this.graphics.clear();
  }

  destroy(): void {
    this.graphics.destroy();
    this.particles = [];
    this.pool = [];
  }
}
