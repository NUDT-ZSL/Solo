import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './main';

export class BootScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private promptText!: Phaser.GameObjects.Text;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private titleGlow!: Phaser.GameObjects.Ellipse;
  private timeElapsed: number = 0;

  constructor() {
    super({ key: 'BootScene' });
  }

  create(): void {
    this.timeElapsed = 0;

    const bg = this.add.graphics();
    bg.fillGradientStyle(0x0a0a0a, 0x0a0a0a, 0x1a1a2e, 0x1a1a2e, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    this.createAmbientParticles();

    this.titleGlow = this.add.ellipse(
      GAME_WIDTH / 2,
      GAME_HEIGHT / 2 - 40,
      500, 200,
      0x4a2080,
      0.08
    );

    this.titleText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 - 60, '暗影回响', {
      fontSize: '72px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#c8b8ff',
      stroke: '#2a1a4e',
      strokeThickness: 4,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#6a3aaa',
        blur: 20,
        fill: true,
        stroke: true,
      },
    }).setOrigin(0.5);

    this.subtitleText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 10, 'SHADOW ECHO', {
      fontSize: '24px',
      fontFamily: '"Consolas", monospace',
      color: '#7a6aaa',
      letterSpacing: 12,
    }).setOrigin(0.5);

    this.promptText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT / 2 + 120, '按任意键开始', {
      fontSize: '20px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#8888aa',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: this.titleGlow,
      scaleX: 1.15,
      scaleY: 1.15,
      alpha: 0.12,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: this.promptText,
      alpha: 0.3,
      duration: 1000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.input.keyboard!.once('keydown', () => {
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.time.delayedCall(800, () => {
        this.scene.start('GameScene');
      });
    });

    this.input.once('pointerdown', () => {
      this.cameras.main.fadeOut(800, 0, 0, 0);
      this.time.delayedCall(800, () => {
        this.scene.start('GameScene');
      });
    });
  }

  private createAmbientParticles(): void {
    const particleGfx = this.add.graphics();
    particleGfx.fillStyle(0x8866cc, 1);
    particleGfx.fillCircle(2, 2, 2);
    particleGfx.generateTexture('bootParticle', 4, 4);
    particleGfx.destroy();

    this.particles = this.add.particles(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'bootParticle', {
      speed: { min: 5, max: 20 },
      lifespan: 8000,
      quantity: 1,
      frequency: 200,
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.5, end: 0 },
      blendMode: 'ADD',
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(-GAME_WIDTH / 2, -GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT),
      },
    });
  }

  update(_time: number, delta: number): void {
    this.timeElapsed += delta;
    const glowAlpha = 0.06 + Math.sin(this.timeElapsed / 1000) * 0.04;
    this.titleGlow.setAlpha(glowAlpha);
  }
}
