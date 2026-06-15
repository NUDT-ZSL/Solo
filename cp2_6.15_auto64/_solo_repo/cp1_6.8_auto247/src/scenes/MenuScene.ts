import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLOR_BG_TOP, COLOR_BG_BOTTOM, COLOR_UI_TEXT } from '../config';

export class MenuScene extends Phaser.Scene {
  private bgGraphics!: Phaser.GameObjects.Graphics;
  private lightOrbs: Phaser.GameObjects.Arc[] = [];
  private titleText!: Phaser.GameObjects.Text;
  private startBtn!: Phaser.GameObjects.Container;
  private timeAccum: number = 0;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    this.bgGraphics = this.add.graphics();
    this.drawBackground();

    for (let i = 0; i < 12; i++) {
      const orb = this.add.circle(
        Phaser.Math.Between(40, GAME_WIDTH - 40),
        Phaser.Math.Between(40, GAME_HEIGHT - 40),
        Phaser.Math.Between(3, 8),
        Phaser.Math.Between(0, 1) ? 0x6644aa : 0x8866cc,
        0.4
      );
      this.lightOrbs.push(orb);
    }

    this.titleText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.3, '光痕之塔', {
      fontSize: '52px',
      fontFamily: 'Arial, sans-serif',
      color: '#ccddff',
      fontStyle: 'bold',
      stroke: '#4422aa',
      strokeThickness: 6,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#6644cc',
        blur: 20,
        fill: true,
        stroke: true,
      },
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.3 + 60, 'Tower of Light Traces', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#8899bb',
    }).setOrigin(0.5);

    const btnBg = this.add.rectangle(0, 0, 200, 56, 0x5533aa, 0.85)
      .setStrokeStyle(2, 0x8866dd);
    const btnText = this.add.text(0, 0, '开始攀登', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#eeeeff',
    }).setOrigin(0.5);

    this.startBtn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT * 0.58, [btnBg, btnText]);
    this.startBtn.setSize(200, 56);
    this.startBtn.setInteractive({ useHandCursor: true });

    this.startBtn.on('pointerover', () => {
      btnBg.setFillStyle(0x7755cc, 0.95);
      this.tweens.add({ targets: this.startBtn, scaleX: 1.05, scaleY: 1.05, duration: 150 });
    });
    this.startBtn.on('pointerout', () => {
      btnBg.setFillStyle(0x5533aa, 0.85);
      this.tweens.add({ targets: this.startBtn, scaleX: 1, scaleY: 1, duration: 150 });
    });
    this.startBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => {
        this.scene.start('GameScene');
      });
    });

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.78, '按住屏幕蓄力，松开跳跃', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#7788aa',
    }).setOrigin(0.5);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.82, '长按跳得更高更远', {
      fontSize: '14px',
      fontFamily: 'Arial, sans-serif',
      color: '#7788aa',
    }).setOrigin(0.5);

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  private drawBackground(): void {
    this.bgGraphics.clear();
    const grad = this.bgGraphics.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    grad.addColorStop(0, `#${COLOR_BG_TOP.toString(16).padStart(6, '0')}`);
    grad.addColorStop(1, `#${COLOR_BG_BOTTOM.toString(16).padStart(6, '0')}`);
    this.bgGraphics.fillStyle(grad, 1);
    this.bgGraphics.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  update(_time: number, delta: number): void {
    this.timeAccum += delta * 0.001;

    this.lightOrbs.forEach((orb, i) => {
      const angle = this.timeAccum * (0.3 + i * 0.08) + i * 1.2;
      orb.x += Math.cos(angle) * 0.5;
      orb.y += Math.sin(angle * 0.7) * 0.4;
      orb.alpha = 0.25 + Math.sin(this.timeAccum * 2 + i) * 0.2;
      if (orb.x < -20) orb.x = GAME_WIDTH + 20;
      if (orb.x > GAME_WIDTH + 20) orb.x = -20;
      if (orb.y < -20) orb.y = GAME_HEIGHT + 20;
      if (orb.y > GAME_HEIGHT + 20) orb.y = -20;
    });

    this.titleText.y = GAME_HEIGHT * 0.3 + Math.sin(this.timeAccum * 1.5) * 6;
  }
}
