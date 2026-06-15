import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, UI, TRANSITION } from '../config';

export class MenuScene extends Phaser.Scene {
  private titleText!: Phaser.GameObjects.Text;
  private startBtn!: Phaser.GameObjects.Container;
  private particles!: Phaser.GameObjects.Particles.ParticleEmitter;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.createBackground();
    this.createWaterLines();
    this.createTitle();
    this.createStartButton();
    this.createAmbientParticles();
    this.tweenEntrance();
  }

  private createBackground(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(COLORS.bgTop, COLORS.bgTop, COLORS.bgBottom, COLORS.bgBottom, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.setDepth(0);
  }

  private createWaterLines(): void {
    const g = this.add.graphics();
    g.setDepth(1);
    g.setAlpha(0.3);
    const lineCount = 12;
    for (let i = 0; i < lineCount; i++) {
      const y = (GAME_HEIGHT / (lineCount + 1)) * (i + 1);
      const color = i % 2 === 0 ? COLORS.waterBlue : COLORS.waterPurple;
      g.lineStyle(1, color, 0.5);
      g.beginPath();
      g.moveTo(0, y);
      for (let x = 0; x <= GAME_WIDTH; x += 20) {
        const offsetY = Math.sin((x + this.time.now * 0.001) * 0.02 + i) * 8;
        g.lineTo(x, y + offsetY);
      }
      g.strokePath();
    }
    this.time.addEvent({
      delay: 33,
      loop: true,
      callback: () => {
        g.clear();
        for (let i = 0; i < lineCount; i++) {
          const y = (GAME_HEIGHT / (lineCount + 1)) * (i + 1);
          const color = i % 2 === 0 ? COLORS.waterBlue : COLORS.waterPurple;
          g.lineStyle(1, color, 0.5);
          g.beginPath();
          g.moveTo(0, y);
          for (let x = 0; x <= GAME_WIDTH; x += 20) {
            const offsetY = Math.sin((x + this.time.now * 0.001) * 0.02 + i) * 8;
            g.lineTo(x, y + offsetY);
          }
          g.strokePath();
        }
      },
    });
  }

  private createTitle(): void {
    this.titleText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.32, '潮汐回廊', {
      fontFamily: UI.fontFamily,
      fontSize: '56px',
      color: '#66ccff',
      stroke: '#2244aa',
      strokeThickness: 4,
      shadow: { color: '#4488ff', blur: 20, fill: true, stroke: true },
    });
    this.titleText.setOrigin(0.5).setDepth(10).setAlpha(0);
  }

  private createStartButton(): void {
    const bg = this.add.graphics();
    bg.fillStyle(0x1a3a7a, 0.6);
    bg.fillRoundedRect(-90, -28, 180, 56, 12);
    bg.lineStyle(2, COLORS.waterCyan, 0.8);
    bg.strokeRoundedRect(-90, -28, 180, 56, 12);

    const label = this.add.text(0, 0, '开始探索', {
      fontFamily: UI.fontFamily,
      fontSize: UI.fontSizeLarge,
      color: '#aaeeff',
    });
    label.setOrigin(0.5);

    this.startBtn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT * 0.58, [bg, label]);
    this.startBtn.setDepth(10).setAlpha(0).setSize(180, 56).setInteractive(
      new Phaser.Geom.Rectangle(-90, -28, 180, 56),
      Phaser.Geom.Rectangle.Contains
    );

    this.startBtn.on('pointerover', () => {
      this.tweens.add({ targets: this.startBtn, scaleX: 1.08, scaleY: 1.08, duration: 150, ease: 'Back.easeOut' });
    });
    this.startBtn.on('pointerout', () => {
      this.tweens.add({ targets: this.startBtn, scaleX: 1, scaleY: 1, duration: 150, ease: 'Back.easeIn' });
    });
    this.startBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(TRANSITION.fadeDuration, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('GameScene', { level: 0 });
      });
    });
  }

  private createAmbientParticles(): void {
    const canvas = this.textures.createCanvas('menuParticle', 8, 8)!;
    const ctx = canvas.getContext();
    ctx.fillStyle = '#66ccff';
    ctx.beginPath();
    ctx.arc(4, 4, 4, 0, Math.PI * 2);
    ctx.fill();
    canvas.refresh();

    const emitZone = new Phaser.Geom.Rectangle(-GAME_WIDTH / 2, -GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT);
    const emitter = this.add.particles(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'menuParticle', {
      speed: { min: 10, max: 40 },
      lifespan: 4000,
      quantity: 1,
      frequency: 200,
      scale: { start: 0.5, end: 0 },
      alpha: { start: 0.6, end: 0 },
      emitZone: { type: 'random', source: emitZone } as any,
      blendMode: 'ADD',
    });
    emitter.setDepth(2);
    this.particles = emitter;
  }

  private tweenEntrance(): void {
    this.tweens.add({
      targets: this.titleText,
      alpha: 1,
      y: GAME_HEIGHT * 0.3,
      duration: 1200,
      ease: 'Cubic.easeOut',
    });
    this.tweens.add({
      targets: this.startBtn,
      alpha: 1,
      y: GAME_HEIGHT * 0.56,
      duration: 1000,
      delay: 400,
      ease: 'Cubic.easeOut',
    });
  }
}
