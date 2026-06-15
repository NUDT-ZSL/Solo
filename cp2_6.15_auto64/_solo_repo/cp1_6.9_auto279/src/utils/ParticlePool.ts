import Phaser from 'phaser';
import { CONFIG } from '../config/GameConfig';

interface ActiveParticle {
  particle: Phaser.GameObjects.Graphics;
  createdAt: number;
  duration: number;
}

export class ParticlePool {
  private scene: Phaser.Scene;
  private particles: ActiveParticle[] = [];
  private maxParticles: number = CONFIG.PARTICLE_LIMIT;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  private recycleOldestIfNeeded(): void {
    while (this.particles.length >= this.maxParticles) {
      const oldest = this.particles.shift();
      if (oldest) {
        oldest.particle.destroy();
      }
    }
  }

  emitStarBurst(x: number, y: number): void {
    const count = Phaser.Math.Between(CONFIG.STAR.PARTICLE_MIN, CONFIG.STAR.PARTICLE_MAX);
    for (let i = 0; i < count; i++) {
      this.recycleOldestIfNeeded();

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.FloatBetween(60, 150);
      const size = Phaser.Math.FloatBetween(CONFIG.STAR.PARTICLE_MIN_SIZE, CONFIG.STAR.PARTICLE_MAX_SIZE);
      const duration = CONFIG.STAR.PARTICLE_DURATION;

      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0xffd700, 1);
      graphics.fillCircle(0, 0, size);
      graphics.setPosition(x, y);
      graphics.setDepth(10);

      const startX = x;
      const startY = y;
      const endX = x + Math.cos(angle) * speed * 2;
      const endY = y + Math.sin(angle) * speed * 2;
      const createdAt = this.scene.time.now;

      const particle: ActiveParticle = { particle: graphics, createdAt, duration };
      this.particles.push(particle);

      this.scene.tweens.add({
        targets: graphics,
        x: endX,
        y: endY,
        alpha: 0,
        scale: 0.3,
        duration: duration,
        ease: 'Cubic.easeOut',
        onComplete: () => {
          graphics.destroy();
          const idx = this.particles.indexOf(particle);
          if (idx !== -1) this.particles.splice(idx, 1);
        }
      });
    }
  }

  emitVoidShockwave(x: number, y: number): void {
    this.recycleOldestIfNeeded();

    const graphics = this.scene.add.graphics();
    graphics.setPosition(x, y);
    graphics.setDepth(9);
    const createdAt = this.scene.time.now;
    const duration = CONFIG.VOID.SHOCK_DURATION;

    const particle: ActiveParticle = { particle: graphics, createdAt, duration };
    this.particles.push(particle);

    this.scene.tweens.add({
      targets: graphics,
      duration: duration,
      ease: 'Linear',
      onUpdate: (tween) => {
        const progress = tween.progress;
        const radius = Phaser.Math.Linear(10, 60, progress);
        const alpha = Phaser.Math.Linear(0.7, 0, progress);
        graphics.clear();
        graphics.lineStyle(3, 0x9932cc, alpha);
        graphics.strokeCircle(0, 0, radius);
        graphics.lineStyle(2, 0x9932cc, alpha * 0.5);
        graphics.strokeCircle(0, 0, radius * 0.7);
      },
      onComplete: () => {
        graphics.destroy();
        const idx = this.particles.indexOf(particle);
        if (idx !== -1) this.particles.splice(idx, 1);
      }
    });
  }

  emitCompensationStars(x: number, y: number, count: number): void {
    for (let i = 0; i < count; i++) {
      this.recycleOldestIfNeeded();

      const graphics = this.scene.add.graphics();
      graphics.fillStyle(0xffd700, 1);
      graphics.fillCircle(0, 0, 6);
      graphics.setPosition(x, y);
      graphics.setDepth(8);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const dist = Phaser.Math.FloatBetween(40, 80);
      const targetX = x + Math.cos(angle) * dist;
      const targetY = y + Math.sin(angle) * dist;
      const createdAt = this.scene.time.now;
      const duration = 600;

      const particle: ActiveParticle = { particle: graphics, createdAt, duration };
      this.particles.push(particle);

      this.scene.tweens.add({
        targets: graphics,
        x: targetX,
        y: targetY,
        scale: { from: 1.5, to: 0.5 },
        duration: duration,
        ease: 'Back.easeOut',
        yoyo: true,
        hold: 200,
        onComplete: () => {
          graphics.destroy();
          const idx = this.particles.indexOf(particle);
          if (idx !== -1) this.particles.splice(idx, 1);
        }
      });
    }
  }

  getActiveCount(): number {
    return this.particles.length;
  }

  clear(): void {
    this.particles.forEach(p => p.particle.destroy());
    this.particles.length = 0;
  }
}
