import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, BG_COLOR_TOP, BG_COLOR_BOTTOM } from '../config';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    this.drawBackground();
    this.createClouds();
    this.createTitle();
    this.createStartButton();
    this.createBirdPreview();
  }

  private drawBackground() {
    const g = this.add.graphics();
    for (let y = 0; y < GAME_HEIGHT; y++) {
      const t = y / GAME_HEIGHT;
      const r = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(BG_COLOR_TOP),
        Phaser.Display.Color.IntegerToColor(BG_COLOR_BOTTOM),
        100,
        Math.round(t * 100)
      );
      g.fillStyle(Phaser.Display.Color.GetColor(r.r, r.g, r.b), 1);
      g.fillRect(0, y, GAME_WIDTH, 1);
    }
  }

  private createClouds() {
    for (let i = 0; i < 8; i++) {
      this.spawnCloud(Phaser.Math.Between(0, GAME_WIDTH), Phaser.Math.Between(40, GAME_HEIGHT - 100), true);
    }
  }

  private spawnCloud(x: number, y: number, immediate = false) {
    const w = Phaser.Math.Between(80, 160);
    const h = Phaser.Math.Between(30, 60);
    const cloud = this.add.graphics();
    cloud.setAlpha(Phaser.Math.FloatBetween(0.15, 0.35));
    cloud.fillStyle(0xffffff, 1);
    cloud.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    const s = Phaser.Math.FloatBetween(0.3, 0.8);
    cloud.setScale(s);
    cloud.setPosition(x, y);
    cloud.setDepth(1);

    const dur = Phaser.Math.Between(15000, 25000);
    const startX = immediate ? x : GAME_WIDTH + 100;
    if (!immediate) cloud.setX(startX);

    this.tweens.add({
      targets: cloud,
      x: -120,
      duration: dur,
      ease: 'Linear',
      onComplete: () => {
        cloud.destroy();
        this.spawnCloud(GAME_WIDTH + 100, Phaser.Math.Between(40, GAME_HEIGHT - 100));
      },
    });
  }

  private createTitle() {
    const title = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.22, '光翼竞速', {
      fontSize: '48px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#b06ab3',
      strokeThickness: 6,
      shadow: {
        offsetX: 0, offsetY: 4, color: '#6a0dad', blur: 10, fill: true,
      },
    }).setOrigin(0.5).setDepth(10);

    this.tweens.add({
      targets: title,
      y: title.y - 8,
      duration: 2000,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createBirdPreview() {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT * 0.42;
    const birdG = this.add.graphics().setDepth(5);
    birdG.fillStyle(0xffd700, 1);
    birdG.fillCircle(0, 0, 16);
    birdG.fillStyle(0xffffff, 0.9);
    birdG.fillCircle(6, -4, 5);
    birdG.fillStyle(0x222222, 1);
    birdG.fillCircle(7, -4, 2.5);
    birdG.fillStyle(0xffaa00, 1);
    birdG.fillTriangle(14, 0, 22, -3, 22, 3);
    birdG.fillStyle(0xffd700, 0.7);
    birdG.fillTriangle(-8, -2, -22, -14, -4, -4);
    birdG.fillTriangle(-8, 2, -22, 14, -4, 4);
    birdG.setPosition(cx, cy);

    this.tweens.add({
      targets: birdG,
      y: cy - 10,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    if (this.textures.exists('birdGlow')) {
      this.textures.remove('birdGlow');
    }
    const glowKey = 'birdGlow';
    const glowG = this.add.graphics().setDepth(4);
    glowG.fillStyle(0xffd700, 0.15);
    glowG.fillCircle(0, 0, 32);
    glowG.fillStyle(0xffd700, 0.08);
    glowG.fillCircle(0, 0, 48);
    glowG.setPosition(cx, cy);

    this.tweens.add({
      targets: glowG,
      y: cy - 10,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: glowG,
      alpha: 0.4,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });
  }

  private createStartButton() {
    const btnY = GAME_HEIGHT * 0.62;
    const btnW = 200;
    const btnH = 56;

    const btnBg = this.add.graphics().setDepth(10);
    btnBg.fillStyle(0xffffff, 0.2);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 28);
    btnBg.lineStyle(2, 0xffffff, 0.5);
    btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 28);
    btnBg.setPosition(GAME_WIDTH / 2, btnY + 30);
    btnBg.setInteractive(
      new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH),
      Phaser.Geom.Rectangle.Contains
    );

    const btnText = this.add.text(GAME_WIDTH / 2, btnY + 30, '开始飞行', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(11);

    this.tweens.add({
      targets: [btnBg, btnText],
      y: btnY,
      duration: 800,
      ease: 'Back.easeOut',
      delay: 300,
    });

    btnBg.on('pointerover', () => {
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 1.05, scaleY: 1.05, duration: 150, ease: 'Quad.easeOut' });
    });
    btnBg.on('pointerout', () => {
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 1, scaleY: 1, duration: 150, ease: 'Quad.easeOut' });
    });
    btnBg.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => {
        this.scene.start('GameScene');
      });
    });
  }
}
