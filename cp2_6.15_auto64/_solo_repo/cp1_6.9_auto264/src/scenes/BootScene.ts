import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  private bootProgress: Phaser.GameObjects.Graphics | null = null;
  private bootLogo: Phaser.GameObjects.Container | null = null;
  private bootParticles: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.createProgressBar();
    this.createBootLogo();
    this.createBootParticles();
    this.simulateLoading();
  }

  private createProgressBar(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2 + 150;

    const bgRect = this.add.rectangle(centerX, centerY, 300, 20, 0x1a1a3e, 0.8);
    bgRect.setStrokeStyle(2, 0x9c27b0, 0.8);

    this.bootProgress = this.add.graphics();
    this.bootProgress.fillStyle(0x00e5ff, 1);
    this.bootProgress.fillRect(centerX - 148, centerY - 8, 0, 16);
  }

  private createBootLogo(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2 - 80;

    this.bootLogo = this.add.container(centerX, centerY);

    const title = this.add.text(0, -20, '极光栖羽', {
      fontFamily: '"Press Start 2P", cursive',
      fontSize: '36px',
      color: '#00e5ff'
    });
    title.setOrigin(0.5);
    title.setShadow(4, 4, 'rgba(156, 39, 176, 0.8)', 0, true, true);
    title.setAlpha(0);

    const subtitle = this.add.text(0, 30, 'AURORA FEATHER', {
      fontFamily: '"Press Start 2P", cursive',
      fontSize: '16px',
      color: '#9c27b0'
    });
    subtitle.setOrigin(0.5);
    subtitle.setAlpha(0);

    this.bootLogo.add([title, subtitle]);

    this.tweens.add({
      targets: title,
      alpha: { from: 0, to: 1 },
      y: { from: -40, to: -20 },
      duration: 800,
      ease: 'Power2.easeOut',
      delay: 200
    });

    this.tweens.add({
      targets: subtitle,
      alpha: { from: 0, to: 1 },
      y: { from: 50, to: 30 },
      duration: 800,
      ease: 'Power2.easeOut',
      delay: 400
    });
  }

  private createBootParticles(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2 - 80;

    const circleGfx = this.add.graphics();
    circleGfx.fillStyle(0xffffff, 1);
    circleGfx.fillCircle(4, 4, 4);
    circleGfx.generateTexture('__AURORA_PARTICLE', 8, 8);
    circleGfx.destroy();

    this.bootParticles = this.add.particles(centerX, centerY, '__AURORA_PARTICLE', {
      quantity: 2,
      speed: { min: 20, max: 60 },
      scale: { start: 0.3, end: 0 },
      alpha: { start: 0.8, end: 0 },
      lifespan: { min: 500, max: 1000 },
      blendMode: 'ADD',
      tint: [0x00e5ff, 0x9c27b0, 0x00ff88],
      emitZone: {
        type: 'edge',
        source: new Phaser.Geom.Rectangle(-100, -30, 200, 60),
        quantity: 48,
        seamless: true
      }
    });

    this.time.addEvent({
      delay: 50,
      loop: true,
      callback: () => {
        this.bootParticles?.emitParticle();
      }
    });
  }

  private simulateLoading(): void {
    let progress = 0;
    const totalSteps = 50;
    const stepDelay = 40;

    this.time.addEvent({
      delay: stepDelay,
      repeat: totalSteps - 1,
      callback: () => {
        progress += 1 / totalSteps;
        this.updateProgress(progress);

        if (progress >= 1) {
          this.time.delayedCall(600, () => {
            this.fadeOutAndTransition();
          });
        }
      }
    });
  }

  private updateProgress(progress: number): void {
    if (!this.bootProgress) return;

    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2 + 150;

    this.bootProgress.clear();
    this.bootProgress.fillStyle(0x00e5ff, 1);
    this.bootProgress.fillRect(centerX - 148, centerY - 8, 296 * progress, 16);

    if (progress > 0.7) {
      this.bootProgress.fillStyle(0x9c27b0, 1);
      const overlap = (progress - 0.7) / 0.3;
      this.bootProgress.fillRect(
        centerX - 148 + 296 * 0.7,
        centerY - 8,
        296 * overlap,
        16
      );
    }
  }

  private fadeOutAndTransition(): void {
    const fadeOverlay = this.add.rectangle(
      this.cameras.main.width / 2,
      this.cameras.main.height / 2,
      this.cameras.main.width,
      this.cameras.main.height,
      0x0d1b2a,
      0
    );

    this.bootParticles?.stop();

    this.tweens.add({
      targets: [this.bootLogo, fadeOverlay],
      alpha: { from: 1, to: 0 },
      duration: 500,
      ease: 'Power2.easeIn',
      onUpdate: (tween) => {
        fadeOverlay.setAlpha(tween.progress);
      },
      onComplete: () => {
        this.scene.start('GameScene');
      }
    });
  }

  create(): void {}
  update(): void {}
}
