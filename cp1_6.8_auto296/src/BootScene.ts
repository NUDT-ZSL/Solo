import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLORS } from './config';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const bg = this.add.graphics();
    bg.fillGradientStyle(COLORS.BG_TOP, COLORS.BG_TOP, COLORS.BG_BOTTOM, COLORS.BG_BOTTOM, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    const title = this.add.text(cx, cy - 60, '磁暴行者', {
      fontSize: '52px',
      fontFamily: 'Arial, sans-serif',
      color: '#a29bfe',
      fontStyle: 'bold',
      stroke: '#6c5ce7',
      strokeThickness: 4,
    }).setOrigin(0.5);

    const subtitle = this.add.text(cx, cy + 10, 'MAGNETIC STORM WALKER', {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#636e72',
    }).setOrigin(0.5);

    const startText = this.add.text(cx, cy + 80, '点击或按任意键开始', {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      color: '#dfe6e9',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: startText,
      alpha: 0.3,
      duration: 800,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.tweens.add({
      targets: title,
      scaleX: 1.03,
      scaleY: 1.03,
      duration: 1200,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut',
    });

    this.input.keyboard.once('keydown', () => this.startGame());
    this.input.once('pointerdown', () => this.startGame());
  }

  private startGame(): void {
    this.scene.start('GameScene');
  }
}
