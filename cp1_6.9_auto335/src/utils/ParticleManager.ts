import Phaser from 'phaser';

export class ParticleManager {
  private scene: Phaser.Scene;
  private maxParticles: number = 200;
  private currentParticleCount: number = 0;
  private fpsLow: boolean = false;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  createJumpTrail(x: number, y: number): void {
    const count = this.fpsLow ? 5 : 10;
    for (let i = 0; i < count; i++) {
      if (this.currentParticleCount >= this.maxParticles) break;

      const angle = Math.random() * Math.PI * 2;
      const speed = 20 + Math.random() * 30;
      const particle = this.scene.add.circle(x, y, 2, 0xffd54f);
      particle.setAlpha(0.6);
      particle.setDepth(5);

      const startHue = 45;
      const endHue = 30;
      const hue = startHue + (endHue - startHue) * (i / count);

      this.scene.tweens.add({
        targets: particle,
        x: x + Math.cos(angle) * speed * 0.5,
        y: y + Math.sin(angle) * speed * 0.5 - 10,
        alpha: 0,
        scale: 0.5,
        duration: 400 + Math.random() * 200,
        ease: 'Cubic.Out',
        onUpdate: (tween) => {
          const progress = tween.progress;
          const color = Phaser.Display.Color.HSVToRGB(hue / 360, 1, 1 - progress * 0.5);
          particle.setFillStyle(color.color);
        },
        onComplete: () => {
          particle.destroy();
          this.currentParticleCount--;
        }
      });
      this.currentParticleCount++;
    }
  }

  createAfterimage(x: number, y: number, texture: string): void {
    if (this.currentParticleCount >= this.maxParticles) return;

    const ghost = this.scene.add.image(x, y, texture);
    ghost.setTint(0x80deea);
    ghost.setAlpha(0.3);
    ghost.setDepth(3);

    this.scene.tweens.add({
      targets: ghost,
      alpha: 0,
      scale: 0.9,
      duration: 1000,
      ease: 'Cubic.Out',
      onComplete: () => {
        ghost.destroy();
        this.currentParticleCount--;
      }
    });
    this.currentParticleCount++;
  }

  createDustParticles(width: number, height: number): Phaser.GameObjects.Arc[] {
    const particles: Phaser.GameObjects.Arc[] = [];
    const count = this.fpsLow ? 25 : 50;

    for (let i = 0; i < count; i++) {
      const x = Math.random() * width;
      const y = Math.random() * height;
      const size = 1 + Math.random() * 2;
      const alpha = 0.1 + Math.random() * 0.2;
      const particle = this.scene.add.circle(x, y, size, 0xd7ccc8, alpha);
      particle.setDepth(1);

      const baseSpeed = 5;
      const vx = (Math.random() - 0.5) * baseSpeed;
      const vy = (Math.random() - 0.5) * baseSpeed;

      this.scene.tweens.add({
        targets: particle,
        x: x + vx * 10,
        y: y + vy * 10,
        duration: 2000 + Math.random() * 2000,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.easeInOut'
      });

      particles.push(particle);
      this.currentParticleCount++;
    }
    return particles;
  }

  createRepairPulse(x: number, y: number): void {
    const pulse = this.scene.add.circle(x, y, 5, 0x43a047, 0.8);
    pulse.setDepth(8);

    this.scene.tweens.add({
      targets: pulse,
      radius: 30,
      alpha: 0,
      duration: 400,
      ease: 'Cubic.Out',
      onComplete: () => {
        pulse.destroy();
        this.currentParticleCount--;
      }
    });
    this.currentParticleCount++;
  }

  createGoldShard(x: number, y: number, texture: string): void {
    if (this.currentParticleCount >= this.maxParticles) return;

    const shard = this.scene.add.image(x, y, texture);
    shard.setDepth(9);
    shard.setDisplaySize(8, 8);

    const angle = Math.random() * Math.PI * 2;
    const speed = 60;
    const targetX = x + Math.cos(angle) * speed * 2;
    const targetY = y + Math.sin(angle) * speed * 2 - 30;

    this.scene.tweens.add({
      targets: shard,
      x: targetX,
      y: targetY,
      angle: 360 * (Math.random() > 0.5 ? 1 : -1),
      alpha: 0,
      scale: 0.5,
      duration: 1500,
      ease: 'Cubic.Out',
      onComplete: () => {
        shard.destroy();
        this.currentParticleCount--;
      }
    });
    this.currentParticleCount++;
  }

  createTimeShiftVignette(isAccelerate: boolean, onComplete: () => void): void {
    const color = isAccelerate ? 0xffd54f : 0x4fc3f7;
    const graphics = this.scene.add.graphics();
    graphics.setDepth(20);
    graphics.setScrollFactor(0);

    const w = this.scene.scale.width;
    const h = this.scene.scale.height;
    const thickness = 80;

    graphics.fillStyle(color, 0.5);
    graphics.fillRect(0, 0, w, thickness);
    graphics.fillRect(0, h - thickness, w, thickness);
    graphics.fillRect(0, 0, thickness, h);
    graphics.fillRect(w - thickness, 0, thickness, h);

    this.scene.tweens.add({
      targets: graphics,
      alpha: 0,
      duration: 500,
      ease: 'Cubic.Out',
      onComplete: () => {
        graphics.destroy();
        onComplete();
      }
    });
  }

  setFpsLow(low: boolean): void {
    this.fpsLow = low;
  }

  getParticleCount(): number {
    return this.currentParticleCount;
  }
}
