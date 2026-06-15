import * as Phaser from 'phaser';
import {
  COLORS,
  PLAYER_MAX_HEALTH,
  GAME_WIDTH,
  GAME_HEIGHT
} from '../config/Constants';

export class HUD {
  private scene: Phaser.Scene;
  private healthBarBg: Phaser.GameObjects.Graphics;
  private healthBarFill: Phaser.GameObjects.Graphics;
  private healthBarBorder: Phaser.GameObjects.Graphics;
  private healthText: Phaser.GameObjects.Text;
  private scoreBox: Phaser.GameObjects.Graphics;
  private scoreText: Phaser.GameObjects.Text;
  private skillBox: Phaser.GameObjects.Graphics;
  private skillFill: Phaser.GameObjects.Graphics;
  private skillText: Phaser.GameObjects.Text;
  private score: number;
  private shakeTimer: number;
  private container: Phaser.GameObjects.Container;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
    this.score = 0;
    this.shakeTimer = 0;
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(10000);

    this.createHealthBar();
    this.createScoreDisplay();
    this.createSkillIndicator();
    this.startShakeAnimation();
  }

  private createHealthBar(): void {
    const x = 16;
    const y = 16;
    const w = 160;
    const h = 20;

    this.healthBarBg = this.scene.add.graphics();
    this.healthBarBg.fillStyle(COLORS.HEALTH_BG, 1);
    this.healthBarBg.fillRect(x, y, w, h);
    this.container.add(this.healthBarBg);

    this.healthBarFill = this.scene.add.graphics();
    this.healthBarFill.fillStyle(COLORS.HEALTH_FILL, 1);
    this.healthBarFill.fillRect(x, y, w, h);
    this.container.add(this.healthBarFill);

    this.healthBarBorder = this.scene.add.graphics();
    this.healthBarBorder.lineStyle(2, COLORS.UI_BORDER, 1);
    this.healthBarBorder.strokeRect(x, y, w, h);
    this.container.add(this.healthBarBorder);

    this.healthText = this.scene.add.text(
      x + w / 2, y + h / 2,
      `${PLAYER_MAX_HEALTH}/${PLAYER_MAX_HEALTH}`,
      {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: `#${COLORS.UI_TEXT.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold'
      }
    );
    this.healthText.setOrigin(0.5);
    this.container.add(this.healthText);
  }

  private createScoreDisplay(): void {
    const x = GAME_WIDTH - 16 - 120;
    const y = 16;
    const w = 120;
    const h = 24;

    this.scoreBox = this.scene.add.graphics();
    this.scoreBox.fillStyle(COLORS.UI_BG, 0.85);
    this.scoreBox.fillRect(x, y, w, h);
    this.scoreBox.lineStyle(2, COLORS.UI_BORDER, 1);
    this.scoreBox.strokeRect(x, y, w, h);
    this.container.add(this.scoreBox);

    this.scoreText = this.scene.add.text(
      x + w / 2, y + h / 2,
      `分数: ${this.score}`,
      {
        fontFamily: 'monospace',
        fontSize: '13px',
        color: `#${COLORS.UI_TEXT.toString(16).padStart(6, '0')}`,
        fontStyle: 'bold'
      }
    );
    this.scoreText.setOrigin(0.5);
    this.container.add(this.scoreText);
  }

  private createSkillIndicator(): void {
    const w = 140;
    const h = 20;
    const x = (GAME_WIDTH - w) / 2;
    const y = GAME_HEIGHT - 32;

    this.skillBox = this.scene.add.graphics();
    this.skillBox.fillStyle(COLORS.UI_BG, 0.85);
    this.skillBox.fillRect(x, y, w, h);
    this.skillBox.lineStyle(2, COLORS.UI_BORDER, 1);
    this.skillBox.strokeRect(x, y, w, h);
    this.container.add(this.skillBox);

    this.skillFill = this.scene.add.graphics();
    this.skillFill.fillStyle(COLORS.SKILL_READY, 1);
    this.skillFill.fillRect(x, y, w, h);
    this.container.add(this.skillFill);

    this.skillText = this.scene.add.text(
      x + w / 2, y + h / 2,
      '攻击 [左键]',
      {
        fontFamily: 'monospace',
        fontSize: '11px',
        color: '#000000',
        fontStyle: 'bold'
      }
    );
    this.skillText.setOrigin(0.5);
    this.container.add(this.skillText);
  }

  private startShakeAnimation(): void {
    this.scene.time.addEvent({
      delay: 100,
      loop: true,
      callback: () => {
        this.shakeTimer += 100;
        const sx = Math.sin(this.shakeTimer / 180) * 0.8;
        const sy = Math.cos(this.shakeTimer / 220) * 0.8;
        this.container.x = sx;
        this.container.y = sy;
      }
    });
  }

  updateHealth(health: number): void {
    const clampedHealth = Math.max(0, Math.min(PLAYER_MAX_HEALTH, health));
    const x = 16;
    const y = 16;
    const maxW = 160;
    const h = 20;
    const w = (clampedHealth / PLAYER_MAX_HEALTH) * maxW;

    this.healthBarFill.clear();
    let fillColor = COLORS.HEALTH_FILL;
    if (clampedHealth < 30) fillColor = 0xff0000;
    else if (clampedHealth < 60) fillColor = 0xff9900;
    this.healthBarFill.fillStyle(fillColor, 1);
    this.healthBarFill.fillRect(x, y, w, h);

    this.healthText.setText(`${clampedHealth}/${PLAYER_MAX_HEALTH}`);

    this.scene.tweens.add({
      targets: this.healthBarFill,
      scaleX: 1.05,
      yoyo: true,
      duration: 150,
      onComplete: () => this.healthBarFill.setScale(1)
    });
  }

  addScore(points: number): void {
    const oldScore = this.score;
    this.score += points;
    this.scoreText.setText(`分数: ${this.score}`);

    this.scene.tweens.add({
      targets: this.scoreText,
      scale: 1.3,
      duration: 100,
      yoyo: true,
      onComplete: () => this.scoreText.setScale(1)
    });
  }

  updateSkillCooldown(progress: number): void {
    const w = 140;
    const h = 20;
    const x = (GAME_WIDTH - w) / 2;
    const y = GAME_HEIGHT - 32;
    const p = Math.max(0, Math.min(1, progress));
    const fillW = p * w;

    this.skillFill.clear();
    if (p >= 1) {
      this.skillFill.fillStyle(COLORS.SKILL_READY, 1);
      this.skillText.setColor('#000000');
    } else {
      this.skillFill.fillStyle(COLORS.SKILL_COOLDOWN, 1);
      this.skillText.setColor(`#${COLORS.UI_TEXT.toString(16).padStart(6, '0')}`);
    }
    this.skillFill.fillRect(x, y, fillW, h);
  }

  getScore(): number { return this.score; }

  destroy(): void {
    this.container.destroy();
  }
}
