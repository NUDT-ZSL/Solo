import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS, UI, TRANSITION } from '../config';

export class GameOverScene extends Phaser.Scene {
  private won = false;
  private score = 0;
  private level = 0;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { level: number; won: boolean; score: number }): void {
    this.won = data.won ?? false;
    this.score = data.score ?? 0;
    this.level = data.level ?? 0;
  }

  create(): void {
    this.cameras.main.fadeIn(TRANSITION.fadeDuration, 0, 0, 0);
    this.createBackground();
    this.createResultTitle();
    this.createScoreDisplay();
    this.createButtons();
    this.createAmbientParticles();
  }

  private createBackground(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(COLORS.bgTop, COLORS.bgTop, COLORS.bgBottom, COLORS.bgBottom, 1);
    g.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    g.setDepth(0);
  }

  private createResultTitle(): void {
    const title = this.won ? '通关成功' : '挑战失败';
    const color = this.won ? '#44ffaa' : '#ff4466';
    const shadowColor = this.won ? '#22aa66' : '#aa2244';

    const text = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.28, title, {
      fontFamily: UI.fontFamily,
      fontSize: '52px',
      color,
      stroke: shadowColor,
      strokeThickness: 4,
      shadow: { color: shadowColor, blur: 20, fill: true, stroke: true },
    });
    text.setOrigin(0.5).setDepth(10).setAlpha(0);

    this.tweens.add({
      targets: text,
      alpha: 1,
      y: GAME_HEIGHT * 0.26,
      duration: 800,
      ease: 'Cubic.easeOut',
    });
  }

  private createScoreDisplay(): void {
    const container = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT * 0.48);
    container.setDepth(10).setAlpha(0);

    const bg = this.add.graphics();
    bg.fillStyle(0x0a1a3a, 0.5);
    bg.fillRoundedRect(-140, -60, 280, 120, 12);
    bg.lineStyle(1, COLORS.waterCyan, 0.3);
    bg.strokeRoundedRect(-140, -60, 280, 120, 12);

    const levelLabel = this.add.text(0, -30, `到达层数: ${this.level + 1}`, {
      fontFamily: UI.fontFamily, fontSize: UI.fontSizeMedium, color: '#88bbee',
    }).setOrigin(0.5);

    const scoreLabel = this.add.text(0, 10, `得分: ${this.score}`, {
      fontFamily: UI.fontFamily, fontSize: UI.fontSizeLarge, color: '#ffdd44',
      stroke: '#886600', strokeThickness: 2,
    }).setOrigin(0.5);

    const statusText = this.won ? '所有关卡通关!' : '再试一次吧!';
    const statusColor = this.won ? '#44ffaa' : '#ff8899';
    const statusLabel = this.add.text(0, 44, statusText, {
      fontFamily: UI.fontFamily, fontSize: UI.fontSizeSmall, color: statusColor,
    }).setOrigin(0.5);

    container.add([bg, levelLabel, scoreLabel, statusLabel]);

    this.tweens.add({
      targets: container,
      alpha: 1,
      y: GAME_HEIGHT * 0.46,
      duration: 800,
      delay: 300,
      ease: 'Cubic.easeOut',
    });
  }

  private createButtons(): void {
    const replayBg = this.add.graphics();
    replayBg.fillStyle(0x1a3a7a, 0.6);
    replayBg.fillRoundedRect(-80, -24, 160, 48, 10);
    replayBg.lineStyle(2, COLORS.waterCyan, 0.8);
    replayBg.strokeRoundedRect(-80, -24, 160, 48, 10);

    const replayLabel = this.add.text(0, 0, '重新开始', {
      fontFamily: UI.fontFamily, fontSize: UI.fontSizeMedium, color: '#aaeeff',
    }).setOrigin(0.5);

    const replayBtn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT * 0.72, [replayBg, replayLabel]);
    replayBtn.setDepth(10).setAlpha(0).setSize(160, 48).setInteractive(
      new Phaser.Geom.Rectangle(-80, -24, 160, 48),
      Phaser.Geom.Rectangle.Contains
    );

    replayBtn.on('pointerover', () => {
      this.tweens.add({ targets: replayBtn, scaleX: 1.08, scaleY: 1.08, duration: 150, ease: 'Back.easeOut' });
    });
    replayBtn.on('pointerout', () => {
      this.tweens.add({ targets: replayBtn, scaleX: 1, scaleY: 1, duration: 150, ease: 'Back.easeIn' });
    });
    replayBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(TRANSITION.fadeDuration, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MenuScene');
      });
    });

    const menuBg = this.add.graphics();
    menuBg.fillStyle(0x1a2a5a, 0.5);
    menuBg.fillRoundedRect(-80, -24, 160, 48, 10);
    menuBg.lineStyle(1, COLORS.waterPurple, 0.6);
    menuBg.strokeRoundedRect(-80, -24, 160, 48, 10);

    const menuLabel = this.add.text(0, 0, '主菜单', {
      fontFamily: UI.fontFamily, fontSize: UI.fontSizeMedium, color: '#bb99dd',
    }).setOrigin(0.5);

    const menuBtn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT * 0.82, [menuBg, menuLabel]);
    menuBtn.setDepth(10).setAlpha(0).setSize(160, 48).setInteractive(
      new Phaser.Geom.Rectangle(-80, -24, 160, 48),
      Phaser.Geom.Rectangle.Contains
    );

    menuBtn.on('pointerover', () => {
      this.tweens.add({ targets: menuBtn, scaleX: 1.08, scaleY: 1.08, duration: 150, ease: 'Back.easeOut' });
    });
    menuBtn.on('pointerout', () => {
      this.tweens.add({ targets: menuBtn, scaleX: 1, scaleY: 1, duration: 150, ease: 'Back.easeIn' });
    });
    menuBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(TRANSITION.fadeDuration, 0, 0, 0);
      this.cameras.main.once('camerafadeoutcomplete', () => {
        this.scene.start('MenuScene');
      });
    });

    this.tweens.add({ targets: replayBtn, alpha: 1, duration: 600, delay: 600, ease: 'Cubic.easeOut' });
    this.tweens.add({ targets: menuBtn, alpha: 1, duration: 600, delay: 800, ease: 'Cubic.easeOut' });
  }

  private createAmbientParticles(): void {
    const canvas = this.textures.createCanvas('goParticle', 8, 8)!;
    const ctx = canvas.getContext();
    ctx.fillStyle = '#66ccff';
    ctx.beginPath();
    ctx.arc(4, 4, 4, 0, Math.PI * 2);
    ctx.fill();
    canvas.refresh();

    const emitZone = new Phaser.Geom.Rectangle(-GAME_WIDTH / 2, -GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT);
    const emitter = this.add.particles(GAME_WIDTH / 2, GAME_HEIGHT / 2, 'goParticle', {
      speed: { min: 10, max: 30 },
      lifespan: 5000,
      quantity: 1,
      frequency: 300,
      scale: { start: 0.4, end: 0 },
      alpha: { start: 0.4, end: 0 },
      emitZone: { type: 'random', source: emitZone } as any,
      blendMode: 'ADD',
    });
    emitter.setDepth(2);
  }
}
