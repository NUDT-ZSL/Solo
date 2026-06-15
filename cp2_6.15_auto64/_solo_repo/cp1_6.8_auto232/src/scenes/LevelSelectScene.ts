import Phaser from 'phaser';
import { LEVELS, GAME_WIDTH, GAME_HEIGHT, COLORS } from '../config';

export class LevelSelectScene extends Phaser.Scene {
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private starParticles!: Phaser.GameObjects.Graphics;
  private stars: { x: number; y: number; size: number; twinkle: number; phase: number }[] = [];
  private panelAlpha: number = 0;

  constructor() {
    super({ key: 'LevelSelectScene' });
  }

  create(): void {
    this.drawBackground();
    this.createStars();
    this.createUI();
    this.fadeIn();
  }

  private drawBackground(): void {
    this.bgGraphics = this.add.graphics();
    for (let y = 0; y < GAME_HEIGHT; y++) {
      const t = y / GAME_HEIGHT;
      const r = Math.floor(Phaser.Math.Linear((COLORS.bgTop >> 16) & 0xff, (COLORS.bgBottom >> 16) & 0xff, t));
      const g = Math.floor(Phaser.Math.Linear((COLORS.bgTop >> 8) & 0xff, (COLORS.bgBottom >> 8) & 0xff, t));
      const b = Math.floor(Phaser.Math.Linear(COLORS.bgTop & 0xff, COLORS.bgBottom & 0xff, t));
      this.bgGraphics.fillStyle((r << 16) | (g << 8) | b, 1);
      this.bgGraphics.fillRect(0, y, GAME_WIDTH, 1);
    }
  }

  private createStars(): void {
    this.starParticles = this.add.graphics();
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Phaser.Math.Between(0, GAME_WIDTH),
        y: Phaser.Math.Between(0, GAME_HEIGHT),
        size: Math.random() * 2 + 0.5,
        twinkle: Math.random() * 0.02 + 0.005,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  private createUI(): void {
    const title = this.add.text(GAME_WIDTH / 2, 80, '星 轨 密 语', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '52px',
      color: '#c0c0ff',
      fontStyle: 'bold',
      stroke: '#4400aa',
      strokeThickness: 4,
    });
    title.setOrigin(0.5);
    title.setAlpha(0);

    const subtitle = this.add.text(GAME_WIDTH / 2, 140, '操控引力波 · 穿越星轨 · 激活传送门', {
      fontFamily: '"Microsoft YaHei", sans-serif',
      fontSize: '18px',
      color: '#8888cc',
    });
    subtitle.setOrigin(0.5);
    subtitle.setAlpha(0);

    const startX = GAME_WIDTH / 2 - ((LEVELS.length - 1) * 180) / 2;

    for (let i = 0; i < LEVELS.length; i++) {
      const level = LEVELS[i];
      const cx = startX + i * 180;
      const cy = 340;

      const card = this.add.graphics();
      card.fillStyle(0x0d0d30, 0.7);
      card.fillRoundedRect(cx - 70, cy - 80, 140, 160, 12);
      card.lineStyle(2, 0x4466aa, 0.6);
      card.strokeRoundedRect(cx - 70, cy - 80, 140, 160, 12);
      card.setAlpha(0);

      const orbit = this.add.graphics();
      orbit.lineStyle(1, 0x6a0dad, 0.4);
      orbit.strokeCircle(cx, cy - 10, 30);
      orbit.fillStyle(0x4488ff, 0.7);
      orbit.fillCircle(cx + 30, cy - 10, 5);
      orbit.setAlpha(0);

      const numText = this.add.text(cx, cy - 10, `${level.id}`, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '32px',
        color: '#aabbff',
        fontStyle: 'bold',
      });
      numText.setOrigin(0.5);
      numText.setAlpha(0);

      const nameText = this.add.text(cx, cy + 40, level.name, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '14px',
        color: '#8899cc',
      });
      nameText.setOrigin(0.5);
      nameText.setAlpha(0);

      const stepsText = this.add.text(cx, cy + 65, `${level.maxSteps} 步`, {
        fontFamily: '"Microsoft YaHei", sans-serif',
        fontSize: '12px',
        color: '#667799',
      });
      stepsText.setOrigin(0.5);
      stepsText.setAlpha(0);

      const hitArea = this.add.rectangle(cx, cy, 140, 160, 0x000000, 0);
      hitArea.setInteractive({ useHandCursor: true });
      hitArea.setAlpha(0);

      hitArea.on('pointerover', () => {
        this.tweens.add({ targets: card, alpha: 1, scaleX: 1.05, scaleY: 1.05, duration: 200 });
        this.tweens.add({ targets: [numText, nameText, stepsText, orbit], alpha: 1, duration: 200 });
      });

      hitArea.on('pointerout', () => {
        this.tweens.add({ targets: card, alpha: 0.85, scaleX: 1, scaleY: 1, duration: 200 });
      });

      hitArea.on('pointerdown', () => {
        this.cameras.main.fadeOut(400, 0, 0, 0);
        this.time.delayedCall(400, () => {
          this.scene.start('GameScene', { levelId: level.id });
        });
      });

      this.tweens.add({
        targets: [card, orbit, numText, nameText, stepsText, hitArea],
        alpha: 0.85,
        duration: 600,
        delay: 400 + i * 150,
        ease: 'Power2',
      });
    }

    this.tweens.add({ targets: title, alpha: 1, duration: 800, delay: 200, ease: 'Power2' });
    this.tweens.add({ targets: subtitle, alpha: 1, duration: 800, delay: 400, ease: 'Power2' });
  }

  private fadeIn(): void {
    this.cameras.main.fadeIn(600, 0, 0, 0);
  }

  update(_time: number, delta: number): void {
    this.starParticles.clear();
    this.starParticles.setBlendMode(Phaser.BlendModes.ADD);

    for (const star of this.stars) {
      star.phase += star.twinkle * delta;
      const alpha = 0.3 + 0.7 * (0.5 + 0.5 * Math.sin(star.phase));
      this.starParticles.fillStyle(0xccccff, alpha);
      this.starParticles.fillCircle(star.x, star.y, star.size);
    }
  }
}
