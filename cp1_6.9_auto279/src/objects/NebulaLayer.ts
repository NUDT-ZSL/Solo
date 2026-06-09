import Phaser from 'phaser';
import { CONFIG } from '../config/GameConfig';

interface NebulaParticle {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  color: number;
  speed: number;
  angle: number;
  orbitRadius: number;
  centerX: number;
  centerY: number;
  phase: number;
}

export class NebulaLayer {
  private scene: Phaser.Scene;
  private graphics: Phaser.GameObjects.Graphics;
  private particles: NebulaParticle[] = [];
  private time: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.graphics = scene.add.graphics().setDepth(0);
    this.generateParticles();
  }

  private generateParticles(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const colors = [0x8844cc, 0x4488ff, 0xcc66ff, 0x66aaff, 0x9966dd];

    for (let i = 0; i < CONFIG.NEBULA.PARTICLE_COUNT; i++) {
      const r = Phaser.Math.FloatBetween(CONFIG.NEBULA.PARTICLE_MIN_SIZE, CONFIG.NEBULA.PARTICLE_MAX_SIZE);
      const alpha = Phaser.Math.FloatBetween(CONFIG.NEBULA.MIN_ALPHA, CONFIG.NEBULA.MAX_ALPHA);
      const cx = Phaser.Math.FloatBetween(0, w);
      const cy = Phaser.Math.FloatBetween(0, h);
      const orbitR = Phaser.Math.FloatBetween(20, 100);

      this.particles.push({
        x: cx,
        y: cy,
        radius: r,
        alpha: alpha,
        color: colors[Phaser.Math.Between(0, colors.length - 1)],
        speed: Phaser.Math.FloatBetween(0.005, 0.02),
        angle: Phaser.Math.FloatBetween(0, Math.PI * 2),
        orbitRadius: orbitR,
        centerX: cx,
        centerY: cy,
        phase: Phaser.Math.FloatBetween(0, Math.PI * 2)
      });
    }
  }

  update(delta: number): void {
    this.time += delta;
    this.graphics.clear();

    for (const p of this.particles) {
      p.angle += p.speed * (delta / 16);

      const drift = Math.sin(this.time * CONFIG.NEBULA.ROTATION_SPEED + p.phase);
      p.x = p.centerX + Math.cos(p.angle) * p.orbitRadius * 0.3 + drift * 5;
      p.y = p.centerY + Math.sin(p.angle) * p.orbitRadius * 0.3;

      const twinkle = 0.7 + 0.3 * Math.sin(this.time * 0.002 + p.phase);
      const a = p.alpha * twinkle;

      this.graphics.fillStyle(p.color, a * 0.5);
      this.graphics.fillCircle(p.x, p.y, p.radius * 1.5);
      this.graphics.fillStyle(p.color, a);
      this.graphics.fillCircle(p.x, p.y, p.radius);
    }
  }

  resize(): void {
    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    for (const p of this.particles) {
      p.centerX = Phaser.Math.Clamp(p.centerX, 0, w);
      p.centerY = Phaser.Math.Clamp(p.centerY, 0, h);
    }
  }

  destroy(): void {
    this.graphics.destroy();
    this.particles = [];
  }
}
