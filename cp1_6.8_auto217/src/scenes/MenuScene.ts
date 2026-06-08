import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from '../main';

interface FloatingParticle {
  circle: Phaser.GameObjects.Arc;
  vx: number;
  vy: number;
}

export class MenuScene extends Phaser.Scene {
  private floatingParticles: FloatingParticle[] = [];
  private titleText!: Phaser.GameObjects.Text;
  private startButton!: Phaser.GameObjects.Container;
  private levelButtons: Phaser.GameObjects.Container[] = [];
  private selectedLevel: number = 1;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.cameras.main.fadeIn(600, 0, 0, 0);
    this.createBackgroundParticles();
    this.createTitle();
    this.createStartButton();
    this.createLevelSelect();
  }

  private createBackgroundParticles(): void {
    const colors = [0x8b5cf6, 0x06b6d4, 0xa78bfa, 0x67e8f9, 0x7c3aed];
    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const y = Phaser.Math.Between(0, GAME_HEIGHT);
      const color = Phaser.Utils.Array.GetRandom(colors);
      const radius = Phaser.Math.FloatBetween(1, 3);
      const circle = this.add.circle(x, y, radius, color, Phaser.Math.FloatBetween(0.2, 0.6));
      circle.setDepth(1);
      this.floatingParticles.push({
        circle,
        vx: Phaser.Math.FloatBetween(-0.3, 0.3),
        vy: Phaser.Math.FloatBetween(-0.3, 0.3),
      });
    }
  }

  private createTitle(): void {
    this.titleText = this.add.text(GAME_WIDTH / 2, 140, '幻光织梦', {
      fontSize: '64px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#c4b5fd',
      stroke: '#7c3aed',
      strokeThickness: 2,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#8b5cf6',
        blur: 20,
        fill: true,
        stroke: true,
      },
    });
    this.titleText.setOrigin(0.5);
    this.titleText.setDepth(10);

    this.tweens.add({
      targets: this.titleText,
      y: 130,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    const subtitle = this.add.text(GAME_WIDTH / 2, 200, 'Phantom Light Dream Weaver', {
      fontSize: '18px',
      fontFamily: '"Segoe UI", sans-serif',
      color: '#64748b',
    });
    subtitle.setOrigin(0.5);
    subtitle.setDepth(10);
  }

  private createGlassCard(width: number, height: number): Phaser.GameObjects.RenderTexture {
    const rt = this.add.renderTexture(0, 0, width, height);
    const g = this.add.graphics();
    g.fillStyle(0xffffff, 0.08);
    g.fillRoundedRect(0, 0, width, height, 12);
    g.lineStyle(1, 0xffffff, 0.15);
    g.strokeRoundedRect(0, 0, width, height, 12);
    rt.draw(g);
    g.destroy();
    return rt;
  }

  private createStartButton(): void {
    const cardWidth = 260;
    const cardHeight = 56;
    const card = this.createGlassCard(cardWidth, cardHeight);

    const text = this.add.text(cardWidth / 2, cardHeight / 2, '开始游戏', {
      fontSize: '24px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#e0e7ff',
    });
    text.setOrigin(0.5);

    this.startButton = this.add.container(GAME_WIDTH / 2, 320, [card, text]);
    this.startButton.setSize(cardWidth, cardHeight);
    this.startButton.setDepth(10);

    this.startButton.setInteractive({ useHandCursor: true });
    this.startButton.on('pointerover', () => {
      this.tweens.add({ targets: this.startButton, scaleX: 1.05, scaleY: 1.05, duration: 150 });
      text.setColor('#c4b5fd');
    });
    this.startButton.on('pointerout', () => {
      this.tweens.add({ targets: this.startButton, scaleX: 1, scaleY: 1, duration: 150 });
      text.setColor('#e0e7ff');
    });
    this.startButton.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => {
        this.scene.start('GameScene', { level: this.selectedLevel });
      });
    });
  }

  private createLevelSelect(): void {
    const label = this.add.text(GAME_WIDTH / 2, 410, '选择关卡', {
      fontSize: '20px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#94a3b8',
    });
    label.setOrigin(0.5);
    label.setDepth(10);

    const totalLevels = 5;
    const btnSize = 52;
    const gap = 16;
    const totalWidth = totalLevels * btnSize + (totalLevels - 1) * gap;
    const startX = GAME_WIDTH / 2 - totalWidth / 2;

    const levelColors = [
      { main: 0x8b5cf6, text: '#c4b5fd' },
      { main: 0x06b6d4, text: '#67e8f9' },
      { main: 0xf59e0b, text: '#fcd34d' },
      { main: 0xef4444, text: '#fca5a5' },
      { main: 0x10b981, text: '#6ee7b7' },
    ];

    for (let i = 0; i < totalLevels; i++) {
      const lx = startX + i * (btnSize + gap) + btnSize / 2;
      const color = levelColors[i];

      const bg = this.add.circle(0, 0, btnSize / 2, color.main, 0.15);
      bg.setStrokeStyle(2, color.main, i === 0 ? 0.8 : 0.3);

      const numText = this.add.text(0, 0, `${i + 1}`, {
        fontSize: '20px',
        fontFamily: '"Segoe UI", sans-serif',
        color: color.text,
      });
      numText.setOrigin(0.5);

      const container = this.add.container(lx, 470, [bg, numText]);
      container.setSize(btnSize, btnSize);
      container.setDepth(10);
      container.setInteractive({ useHandCursor: true });

      const levelNum = i + 1;
      container.on('pointerdown', () => {
        this.selectedLevel = levelNum;
        this.levelButtons.forEach((btn, idx) => {
          const bgCircle = btn.getAt(0) as Phaser.GameObjects.Arc;
          bgCircle.setStrokeStyle(2, levelColors[idx].main, idx === levelNum - 1 ? 0.8 : 0.3);
        });
      });

      container.on('pointerover', () => {
        this.tweens.add({ targets: container, scaleX: 1.1, scaleY: 1.1, duration: 120 });
      });
      container.on('pointerout', () => {
        this.tweens.add({ targets: container, scaleX: 1, scaleY: 1, duration: 120 });
      });

      this.levelButtons.push(container);
    }
  }

  update(): void {
    this.floatingParticles.forEach(p => {
      p.circle.x += p.vx;
      p.circle.y += p.vy;
      if (p.circle.x < -10) p.circle.x = GAME_WIDTH + 10;
      if (p.circle.x > GAME_WIDTH + 10) p.circle.x = -10;
      if (p.circle.y < -10) p.circle.y = GAME_HEIGHT + 10;
      if (p.circle.y > GAME_HEIGHT + 10) p.circle.y = -10;
    });
  }
}
