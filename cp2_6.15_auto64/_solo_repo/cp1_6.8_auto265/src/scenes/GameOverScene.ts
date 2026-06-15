import Phaser from 'phaser';

export class GameOverScene extends Phaser.Scene {
  private finalLevel: number = 1;
  private totalOrbs: number = 0;
  private dissipationEmitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { level?: number; totalOrbs?: number }): void {
    this.finalLevel = data.level || 1;
    this.totalOrbs = data.totalOrbs || 0;
  }

  create(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.createBackground(w, h);
    this.createDissipationEffect(w, h);
    this.createContent(w, h);
    this.createReplayButton(w, h);
    this.createMenuButton(w, h);

    this.cameras.main.fadeIn(800, 0, 0, 0);
  }

  private createBackground(w: number, h: number): void {
    const bg = this.add.graphics();
    bg.fillGradientStyle(0x000000, 0x000000, 0x0a0a40, 0x0a0a40, 1);
    bg.fillRect(0, 0, w, h);
  }

  private createDissipationEffect(w: number, h: number): void {
    if (!this.textures.exists('particle')) return;

    for (let i = 0; i < 5; i++) {
      const x = Phaser.Math.Between(w * 0.2, w * 0.8);
      const y = Phaser.Math.Between(h * 0.2, h * 0.6);
      const emitter = this.add.particles(x, y, 'particle', {
        speed: { min: 10, max: 50 },
        lifespan: { min: 2000, max: 6000 },
        quantity: 2,
        frequency: 100,
        scale: { start: 0.8, end: 0 },
        alpha: { start: 0.6, end: 0 },
        tint: [0x60b0ff, 0xc0a0ff, 0x30e0a0],
        blendMode: 'ADD',
      });

      this.dissipationEmitters.push(emitter);

      this.time.delayedCall(5000 + i * 1000, () => {
        emitter.stop();
        this.time.delayedCall(3000, () => { emitter.destroy(); });
      });
    }
  }

  private createContent(w: number, h: number): void {
    const title = this.add.text(w / 2, h * 0.22, '探索完成', {
      fontFamily: 'Arial',
      fontSize: '42px',
      color: '#a0c0ff',
      stroke: '#4060c0',
      strokeThickness: 3,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#6080ff',
        blur: 20,
        fill: true,
      },
    }).setOrigin(0.5);

    this.tweens.add({
      targets: title,
      scaleX: 1.05,
      scaleY: 1.05,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.add.text(w / 2, h * 0.38, `到达第 ${this.finalLevel} 层`, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#80a0d0',
    }).setOrigin(0.5);

    this.add.text(w / 2, h * 0.48, `收集光球: ${this.totalOrbs}`, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffd700',
    }).setOrigin(0.5);

    const rating = this.getRating();
    this.add.text(w / 2, h * 0.58, rating, {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#c0a0ff',
    }).setOrigin(0.5);
  }

  private getRating(): string {
    if (this.finalLevel >= 10) return '✦ 传奇探索者 ✦';
    if (this.finalLevel >= 7) return '✦ 幻境行者 ✦';
    if (this.finalLevel >= 4) return '✦ 初入回廊 ✦';
    return '✦ 迷途旅人 ✦';
  }

  private createReplayButton(w: number, h: number): void {
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x2040a0, 0.6);
    btnBg.fillRoundedRect(-100, -24, 200, 48, 12);
    btnBg.lineStyle(2, 0x6090ff, 0.8);
    btnBg.strokeRoundedRect(-100, -24, 200, 48, 12);

    const btnText = this.add.text(0, 0, '再次挑战', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#c0d8ff',
    }).setOrigin(0.5);

    const btn = this.add.container(w / 2, h * 0.72, [btnBg, btnText]);
    btn.setSize(200, 48);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
      this.tweens.add({ targets: btn, scaleX: 1.08, scaleY: 1.08, duration: 150 });
      btnBg.clear();
      btnBg.fillStyle(0x3060c0, 0.8);
      btnBg.fillRoundedRect(-100, -24, 200, 48, 12);
      btnBg.lineStyle(2, 0x80b0ff, 1);
      btnBg.strokeRoundedRect(-100, -24, 200, 48, 12);
    });

    btn.on('pointerout', () => {
      this.tweens.add({ targets: btn, scaleX: 1, scaleY: 1, duration: 150 });
      btnBg.clear();
      btnBg.fillStyle(0x2040a0, 0.6);
      btnBg.fillRoundedRect(-100, -24, 200, 48, 12);
      btnBg.lineStyle(2, 0x6090ff, 0.8);
      btnBg.strokeRoundedRect(-100, -24, 200, 48, 12);
    });

    btn.on('pointerdown', () => {
      this.tweens.add({
        targets: btn,
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
  }

  private createMenuButton(w: number, h: number): void {
    const btnBg = this.add.graphics();
    btnBg.fillStyle(0x2040a0, 0.4);
    btnBg.fillRoundedRect(-80, -20, 160, 40, 10);
    btnBg.lineStyle(1, 0x6090ff, 0.5);
    btnBg.strokeRoundedRect(-80, -20, 160, 40, 10);

    const btnText = this.add.text(0, 0, '返回主菜单', {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#8090b0',
    }).setOrigin(0.5);

    const btn = this.add.container(w / 2, h * 0.84, [btnBg, btnText]);
    btn.setSize(160, 40);
    btn.setInteractive({ useHandCursor: true });

    btn.on('pointerover', () => {
      btnText.setColor('#c0d8ff');
    });

    btn.on('pointerout', () => {
      btnText.setColor('#8090b0');
    });

    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(500, 0, 0, 0);
      this.time.delayedCall(500, () => {
        this.scene.start('MenuScene');
      });
    });
  }

  update(): void {
  }
}
