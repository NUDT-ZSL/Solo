import Phaser from 'phaser';
import { COLOR_THEME, GAME_CONFIG } from '../config';

export class MenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private startBtn!: Phaser.GameObjects.Container;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private timeElapsed: number = 0;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.timeElapsed = 0;
    this.createBackground();
    this.createFloatingParticles();
    this.createTitle();
    this.createSubtitle();
    this.createStartButton();
    this.createDecorations();
    this.animateEntrance();
  }

  update(_time: number, delta: number): void {
    this.timeElapsed += delta;
    this.updateBackground();
    this.updateTitleAnimation();
  }

  private createBackground(): void {
    this.bgGraphics = this.add.graphics();
    this.updateBackground();
  }

  private updateBackground(): void {
    const g = this.bgGraphics;
    g.clear();
    const w = GAME_CONFIG.width;
    const h = GAME_CONFIG.height;

    g.fillGradientStyle(
      COLOR_THEME.bgTop, COLOR_THEME.bgTop,
      COLOR_THEME.bgBottom, COLOR_THEME.bgBottom, 1
    );
    g.fillRect(0, 0, w, h);

    const pulse = Math.sin(this.timeElapsed * 0.001) * 0.5 + 0.5;
    g.lineStyle(1, COLOR_THEME.wallGlow, 0.03 + pulse * 0.02);
    for (let i = 0; i < 20; i++) {
      const offset = Math.sin(this.timeElapsed * 0.0005 + i * 0.5) * 20;
      g.lineBetween(0, i * 35 + offset, w, i * 35 + offset);
    }
  }

  private createFloatingParticles(): void {
    const particleGfx = this.add.graphics();
    particleGfx.fillStyle(COLOR_THEME.playerGlow, 1);
    particleGfx.fillCircle(4, 4, 4);
    particleGfx.generateTexture('menuParticle', 8, 8);
    particleGfx.destroy();

    this.particles = this.add.particles(w() / 2, h() / 2, 'menuParticle', {
      speed: { min: 20, max: 60 },
      lifespan: 6000,
      quantity: 1,
      scale: { start: 0.6, end: 0 },
      alpha: { start: 0.4, end: 0 },
      blendMode: 'ADD',
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(-w() / 2, -h() / 2, w(), h()),
      },
    });
  }

  private createTitle(): void {
    this.titleText = this.add.text(w() / 2, h() * 0.28, '幻象迷宫', {
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: '56px',
      fontStyle: 'bold',
      color: COLOR_THEME.textPrimary,
      stroke: COLOR_THEME.textSecondary,
      strokeThickness: 4,
      shadow: {
        offsetX: 0, offsetY: 0,
        color: COLOR_THEME.textSecondary,
        blur: 20, stroke: true, fill: true,
      },
    }).setOrigin(0.5).setAlpha(0);
  }

  private createSubtitle(): void {
    this.subtitleText = this.add.text(w() / 2, h() * 0.38, 'PHANTOM  MAZE', {
      fontFamily: '"Courier New", monospace',
      fontSize: '18px',
      letterSpacing: 12,
      color: COLOR_THEME.textSecondary,
      shadow: {
        offsetX: 0, offsetY: 0,
        color: COLOR_THEME.wallGlow,
        blur: 10, stroke: true, fill: true,
      },
    }).setOrigin(0.5).setAlpha(0);
  }

  private createStartButton(): void {
    const btnW = 220;
    const btnH = 56;
    const btnX = w() / 2;
    const btnY = h() * 0.58;

    const bg = this.add.graphics();
    this.drawButtonBg(bg, btnW, btnH, 1.0);

    const glow = this.add.graphics();
    this.drawButtonGlow(glow, btnW, btnH);

    const label = this.add.text(0, 0, '开始探索', {
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: '22px',
      color: COLOR_THEME.textPrimary,
      shadow: {
        offsetX: 0, offsetY: 0,
        color: COLOR_THEME.playerGlow,
        blur: 8, stroke: true, fill: true,
      },
    }).setOrigin(0.5);

    this.startBtn = this.add.container(btnX, btnY, [glow, bg, label]);
    this.startBtn.setAlpha(0);
    this.startBtn.setSize(btnW, btnH);
    this.startBtn.setInteractive({ useHandCursor: true });

    this.startBtn.on('pointerover', () => {
      this.tweens.add({
        targets: this.startBtn,
        scaleX: 1.08, scaleY: 1.08,
        duration: 200, ease: 'Back.easeOut',
      });
    });

    this.startBtn.on('pointerout', () => {
      this.tweens.add({
        targets: this.startBtn,
        scaleX: 1.0, scaleY: 1.0,
        duration: 200, ease: 'Back.easeIn',
      });
    });

    this.startBtn.on('pointerdown', () => {
      this.tweens.add({
        targets: this.startBtn,
        scaleX: 0.92, scaleY: 0.92,
        duration: 80, yoyo: true,
        onComplete: () => {
          this.cameras.main.fadeOut(400, 0x0a, 0x06, 0x12);
          this.time.delayedCall(400, () => {
            this.scene.start('GameScene');
          });
        },
      });
    });

    this.tweens.add({
      targets: glow,
      alpha: { from: 0.3, to: 0.8 },
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private drawButtonBg(g: Phaser.GameObjects.Graphics, bw: number, bh: number, alpha: number): void {
    g.clear();
    g.fillStyle(COLOR_THEME.panelBg, alpha * COLOR_THEME.panelAlpha);
    g.fillRoundedRect(-bw / 2, -bh / 2, bw, bh, 12);
    g.lineStyle(2, COLOR_THEME.wallSecondary, 0.7);
    g.strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, 12);
  }

  private drawButtonGlow(g: Phaser.GameObjects.Graphics, bw: number, bh: number): void {
    g.clear();
    g.lineStyle(4, COLOR_THEME.wallGlow, 0.4);
    g.strokeRoundedRect(-bw / 2 - 2, -bh / 2 - 2, bw + 4, bh + 4, 14);
  }

  private createDecorations(): void {
    const decoGfx = this.add.graphics();
    decoGfx.lineStyle(1, COLOR_THEME.wallPrimary, 0.15);

    for (let i = 0; i < 6; i++) {
      const cx = Phaser.Math.Between(50, w() - 50);
      const cy = Phaser.Math.Between(50, h() - 50);
      const r = Phaser.Math.Between(30, 80);
      decoGfx.strokeCircle(cx, cy, r);
    }
    decoGfx.setAlpha(0);

    this.tweens.add({
      targets: decoGfx,
      alpha: 1,
      duration: 2000,
      delay: 800,
    });
  }

  private animateEntrance(): void {
    this.tweens.add({
      targets: this.titleText,
      alpha: 1,
      y: this.titleText.y - 10,
      duration: 1000,
      ease: 'Back.easeOut',
    });

    this.tweens.add({
      targets: this.subtitleText,
      alpha: 1,
      y: this.subtitleText.y - 5,
      duration: 800,
      delay: 300,
      ease: 'Back.easeOut',
    });

    this.tweens.add({
      targets: this.startBtn,
      alpha: 1,
      duration: 600,
      delay: 700,
      ease: 'Quad.easeOut',
    });
  }

  private updateTitleAnimation(): void {
    const glow = Math.sin(this.timeElapsed * 0.002) * 0.15 + 0.85;
    this.titleText.setAlpha(glow);
  }
}

function w(): number {
  return GAME_CONFIG.width;
}
function h(): number {
  return GAME_CONFIG.height;
}
