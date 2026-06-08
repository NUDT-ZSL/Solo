import Phaser from 'phaser';

export class MenuScene extends Phaser.Scene {
  private bgParticles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private titleText!: Phaser.GameObjects.Text;
  private startBtn!: Phaser.GameObjects.Container;
  private elapsedTime: number = 0;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.createBackground(w, h);
    this.createBackgroundParticles(w, h);
    this.createTitle(w, h);
    this.createStartButton(w, h);
    this.createFloatingLines(w, h);
  }

  private createBackground(w: number, h: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x000000, 0x000000, 0x0a0a40, 0x0a0a40, 1);
    bg.fillRect(0, 0, w, h);
  }

  private createBackgroundParticles(w: number, h: number): void {
    if (this.textures.exists('particle')) {
      this.bgParticles = this.add.particles(w / 2, h / 2, 'particle', {
        speed: { min: 10, max: 40 },
        lifespan: { min: 4000, max: 8000 },
        quantity: 1,
        frequency: 200,
        scale: { start: 0.6, end: 0 },
        alpha: { start: 0.4, end: 0 },
        emitZone: {
          type: 'random' as const,
          source: new Phaser.Geom.Rectangle(-w / 2, -h / 2, w, h),
          quantity: 1,
        } as any,
        blendMode: 'ADD',
      });
    }
  }

  private createTitle(w: number, h: number): void {
    this.titleText = this.add.text(w / 2, h * 0.28, '幻境回廊', {
      fontFamily: 'Arial',
      fontSize: '56px',
      color: '#a0c0ff',
      stroke: '#4060c0',
      strokeThickness: 4,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#6080ff',
        blur: 20,
        fill: true,
        stroke: true,
      },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: this.titleText,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(w / 2, h * 0.38, 'Phantom Corridor', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#6080b0',
    }).setOrigin(0.5);
  }

  private createStartButton(w: number, h: number): void {
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x2040a0, 0.6);
    btnBg.fillRoundedRect(-100, -24, 200, 48, 12);
    btnBg.lineStyle(2, 0x6090ff, 0.8);
    btnBg.strokeRoundedRect(-100, -24, 200, 48, 12);

    const btnText = this.add.text(0, 0, '开始探索', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#c0d8ff',
    }).setOrigin(0.5);

    this.startBtn = this.add.container(w / 2, h * 0.58, [btnBg, btnText]);
    this.startBtn.setSize(200, 48);
    this.startBtn.setInteractive({ useHandCursor: true });

    this.startBtn.on('pointerover', () => {
      this.tweens.add({
        targets: this.startBtn,
        scaleX: 1.1,
        scaleY: 1.1,
        duration: 150,
        ease: 'Back.easeOut',
      });
      btnBg.clear();
      btnBg.fillStyle(0x3060c0, 0.8);
      btnBg.fillRoundedRect(-100, -24, 200, 48, 12);
      btnBg.lineStyle(2, 0x80b0ff, 1);
      btnBg.strokeRoundedRect(-100, -24, 200, 48, 12);
    });

    this.startBtn.on('pointerout', () => {
      this.tweens.add({
        targets: this.startBtn,
        scaleX: 1,
        scaleY: 1,
        duration: 150,
        ease: 'Back.easeIn',
      });
      btnBg.clear();
      btnBg.fillStyle(0x2040a0, 0.6);
      btnBg.fillRoundedRect(-100, -24, 200, 48, 12);
      btnBg.lineStyle(2, 0x6090ff, 0.8);
      btnBg.strokeRoundedRect(-100, -24, 200, 48, 12);
    });

    this.startBtn.on('pointerdown', () => {
      this.tweens.add({
        targets: this.startBtn,
        scaleX: 0.95,
        scaleY: 0.95,
        duration: 80,
        yoyo: true,
        onComplete: () => {
          this.cameras.main.fadeOut(500, 0, 0, 0);
          this.time.delayedCall(500, () => {
            this.scene.start('GameScene', { level: 1 });
          });
        },
      });
    });

    this.tweens.add({
      targets: this.startBtn,
      y: this.startBtn.y + 4,
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createFloatingLines(w: number, h: number): void {
    for (let i = 0; i < 8; i++) {
      const line = this.add.graphics();
      const startX = Phaser.Math.Between(0, w);
      const startY = Phaser.Math.Between(0, h);
      const color = Phaser.Math.Between(0x4040a0, 0x20c0a0);

      line.lineStyle(1, color, 0.3);
      line.lineBetween(startX, startY, startX + Phaser.Math.Between(-100, 100), startY + Phaser.Math.Between(-100, 100));

      this.tweens.add({
        targets: line,
        alpha: { from: 0.3, to: 0.1 },
        duration: Phaser.Math.Between(2000, 5000),
        yoyo: true,
        repeat: -1,
      });
    }
  }

  update(_time: number, delta: number): void {
    this.elapsedTime += delta * 0.001;
    if (this.titleText) {
      const colors = ['#4060c0', '#5040d0', '#6030e0', '#7020f0', '#8040ff'];
      const colorIdx = Math.floor(this.elapsedTime * 2) % colors.length;
      this.titleText.setShadowColor(colors[colorIdx]);
    }
  }
}
