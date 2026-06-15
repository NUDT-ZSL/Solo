import Phaser from 'phaser';
import { COLOR_THEME, GAME_CONFIG } from '../config';

export class GameOverScene extends Phaser.Scene {
  private timeMs: number = 0;
  private level: number = 1;
  private phantomPhase: number = 0;
  private timeElapsed: number = 0;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { time: number; level: number; phantomPhase: number }): void {
    this.timeMs = data.time || 0;
    this.level = data.level || 1;
    this.phantomPhase = data.phantomPhase || 0;
    this.timeElapsed = 0;
  }

  create(): void {
    this.createBackground();
    this.createVictoryParticles();
    this.createTitle();
    this.createStats();
    this.createReplayButton();
    this.createBackButton();
    this.animateEntrance();
  }

  update(_time: number, delta: number): void {
    this.timeElapsed += delta;
  }

  private createBackground(): void {
    const g = this.add.graphics();
    g.fillGradientStyle(
      COLOR_THEME.bgTop, COLOR_THEME.bgTop,
      COLOR_THEME.bgBottom, COLOR_THEME.bgBottom, 1
    );
    g.fillRect(0, 0, GAME_CONFIG.width, GAME_CONFIG.height);

    g.lineStyle(1, COLOR_THEME.exitColor, 0.04);
    for (let i = 0; i < 40; i++) {
      const y = i * 20;
      g.lineBetween(0, y, GAME_CONFIG.width, y);
    }
  }

  private createVictoryParticles(): void {
    const particleGfx = this.add.graphics();
    particleGfx.fillStyle(COLOR_THEME.exitColor, 1);
    particleGfx.fillCircle(4, 4, 4);
    particleGfx.generateTexture('victoryParticle', 8, 8);
    particleGfx.destroy();

    this.add.particles(GAME_CONFIG.width / 2, GAME_CONFIG.height * 0.3, 'victoryParticle', {
      speed: { min: 30, max: 80 },
      lifespan: 4000,
      quantity: 2,
      scale: { start: 0.8, end: 0 },
      alpha: { start: 0.6, end: 0 },
      blendMode: 'ADD',
      emitZone: {
        type: 'random',
        source: new Phaser.Geom.Rectangle(-150, -30, 300, 60),
      },
    });
  }

  private createTitle(): void {
    this.add.text(GAME_CONFIG.width / 2, GAME_CONFIG.height * 0.22, '通关成功', {
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: '48px',
      fontStyle: 'bold',
      color: COLOR_THEME.textPrimary,
      stroke: COLOR_THEME.textSecondary,
      strokeThickness: 3,
      shadow: {
        offsetX: 0, offsetY: 0,
        color: COLOR_THEME.exitColor,
        blur: 25, stroke: true, fill: true,
      },
    })
      .setOrigin(0.5)
      .setAlpha(0);
  }

  private createStats(): void {
    const totalSec = Math.floor(this.timeMs / 1000);
    const min = Math.floor(totalSec / 60);
    const sec = totalSec % 60;
    const timeStr = `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;

    const statsContainer = this.add.container(GAME_CONFIG.width / 2, GAME_CONFIG.height * 0.44);
    statsContainer.setAlpha(0);

    const panelW = 260;
    const panelH = 120;
    const panelBg = this.add.graphics();
    panelBg.fillStyle(COLOR_THEME.panelBg, COLOR_THEME.panelAlpha);
    panelBg.fillRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 10);
    panelBg.lineStyle(1, COLOR_THEME.wallSecondary, 0.25);
    panelBg.strokeRoundedRect(-panelW / 2, -panelH / 2, panelW, panelH, 10);
    statsContainer.add(panelBg);

    const statStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: '"Courier New", monospace',
      fontSize: '16px',
      color: COLOR_THEME.textPrimary,
    };
    const labelStyle: Phaser.Types.GameObjects.Text.TextStyle = {
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: '13px',
      color: COLOR_THEME.textSecondary,
    };

    const stats = [
      { label: '通关用时', value: timeStr, y: -35 },
      { label: '到达层级', value: `${this.level}`, y: 0 },
      { label: '幻象变化', value: `${this.phantomPhase} 次`, y: 35 },
    ];

    stats.forEach((s) => {
      const label = this.add.text(-80, s.y, s.label, labelStyle).setOrigin(0, 0.5);
      const val = this.add.text(80, s.y, s.value, statStyle).setOrigin(1, 0.5);
      statsContainer.add([label, val]);
    });
  }

  private createReplayButton(): void {
    const btnW = 200;
    const btnH = 50;
    const btnX = GAME_CONFIG.width / 2;
    const btnY = GAME_CONFIG.height * 0.68;

    const bg = this.add.graphics();
    bg.fillStyle(COLOR_THEME.panelBg, COLOR_THEME.panelAlpha);
    bg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);
    bg.lineStyle(2, COLOR_THEME.exitColor, 0.6);
    bg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 10);

    const label = this.add.text(0, 0, '再次挑战', {
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: '20px',
      color: COLOR_THEME.textPrimary,
      shadow: {
        offsetX: 0, offsetY: 0,
        color: COLOR_THEME.exitColor,
        blur: 8, stroke: true, fill: true,
      },
    }).setOrigin(0.5);

    const btn = this.add.container(btnX, btnY, [bg, label]);
    btn.setSize(btnW, btnH);
    btn.setInteractive({ useHandCursor: true });
    btn.setAlpha(0);

    btn.on('pointerover', () => {
      this.tweens.add({
        targets: btn,
        scaleX: 1.06, scaleY: 1.06,
        duration: 180, ease: 'Back.easeOut',
      });
    });

    btn.on('pointerout', () => {
      this.tweens.add({
        targets: btn,
        scaleX: 1, scaleY: 1,
        duration: 180, ease: 'Back.easeIn',
      });
    });

    btn.on('pointerdown', () => {
      this.tweens.add({
        targets: btn,
        scaleX: 0.94, scaleY: 0.94,
        duration: 80, yoyo: true,
        onComplete: () => {
          this.cameras.main.fadeOut(300, 0x0a, 0x06, 0x12);
          this.time.delayedCall(300, () => {
            this.scene.start('GameScene');
          });
        },
      });
    });
  }

  private createBackButton(): void {
    const btn = this.add.text(GAME_CONFIG.width / 2, GAME_CONFIG.height * 0.80, '返回主菜单', {
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      fontSize: '15px',
      color: COLOR_THEME.textSecondary,
    })
      .setOrigin(0.5)
      .setInteractive({ useHandCursor: true })
      .setAlpha(0);

    btn.on('pointerover', () => btn.setColor(COLOR_THEME.textPrimary));
    btn.on('pointerout', () => btn.setColor(COLOR_THEME.textSecondary));

    btn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0x0a, 0x06, 0x12);
      this.time.delayedCall(300, () => {
        this.scene.start('MenuScene');
      });
    });
  }

  private animateEntrance(): void {
    this.cameras.main.fadeIn(400, 0x0a, 0x06, 0x12);

    this.tweens.add({
      targets: this.children.list.filter(c => c instanceof Phaser.GameObjects.Text && c.alpha === 0),
      alpha: 1,
      y: '-=8',
      duration: 700,
      delay: this.tweens.stagger(150),
      ease: 'Back.easeOut',
    });

    this.tweens.add({
      targets: this.children.list.filter(c => c instanceof Phaser.GameObjects.Container && c.alpha === 0),
      alpha: 1,
      duration: 500,
      delay: 400,
      ease: 'Quad.easeOut',
    });
  }
}
