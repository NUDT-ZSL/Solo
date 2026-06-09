import Phaser from 'phaser';

const VERSION = '1.0.0';

export class BootScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressBox!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;
  private percentText!: Phaser.GameObjects.Text;
  private versionText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.createBackground();
    this.createProgressBar();
    this.createLoadingTexts();

    this.load.on('progress', (value: number) => {
      this.updateProgressBar(value);
      this.percentText.setText(`${Math.floor(value * 100)}%`);
    });

    this.load.on('complete', () => {
      this.percentText.setText('100%');
    });

    this.time.delayedCall(500, () => { this.load.emit('complete'); });

    this.load.start();
  }

  create(): void {
    this.time.delayedCall(800, () => {
      this.scene.start('GameScene');
    });
  }

  private createBackground(): void {
    const { width, height } = this.cameras.main;

    const gradient = this.add.graphics();
    gradient.fillGradientStyle(
      0x0a0a1f, 0x0a0a1f,
      0x1a0a2e, 0x1a0a2e,
      1
    );
    gradient.fillRect(0, 0, width, height);

    for (let i = 0; i < 150; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(0, height);
      const size = Phaser.Math.Between(1, 3);
      const alpha = Phaser.Math.FloatBetween(0.2, 0.8);

      const star = this.add.circle(x, y, size, 0xffffff, alpha);
      this.tweens.add({
        targets: star,
        alpha: Phaser.Math.FloatBetween(0.1, 0.9),
        duration: Phaser.Math.Between(2000, 5000),
        yoyo: true,
        repeat: -1
      });
    }
  }

  private createProgressBar(): void {
    const { width, height } = this.cameras.main;
    const barWidth = 400;
    const barHeight = 30;
    const barX = (width - barWidth) / 2;
    const barY = height / 2 + 20;

    this.progressBox = this.add.graphics();
    this.progressBox.fillStyle(0x222244, 0.8);
    this.progressBox.lineStyle(2, 0x8866ff, 0.8);
    this.progressBox.fillRoundedRect(barX, barY, barWidth, barHeight, 6);
    this.progressBox.strokeRoundedRect(barX, barY, barWidth, barHeight, 6);

    this.progressBar = this.add.graphics();
  }

  private createLoadingTexts(): void {
    const { width, height } = this.cameras.main;

    this.loadingText = this.add.text(width / 2, height / 2 - 20, '加载中...', {
      fontFamily: 'sans-serif',
      fontSize: '28px',
      color: '#ffffff'
    }).setOrigin(0.5);
    this.loadingText.setShadow(0, 0, 10, '#8866ff', true);

    this.percentText = this.add.text(width / 2, height / 2 + 35, '0%', {
      fontFamily: 'sans-serif',
      fontSize: '18px',
      color: '#ccbbff'
    }).setOrigin(0.5);

    this.versionText = this.add.text(width - 20, height - 20, `v${VERSION}`, {
      fontFamily: 'sans-serif',
      fontSize: '14px',
      color: '#6666aa'
    }).setOrigin(1, 1);
  }

  private updateProgressBar(value: number): void {
    const { width, height } = this.cameras.main;
    const barWidth = 400;
    const barHeight = 30;
    const barX = (width - barWidth) / 2;
    const barY = height / 2 + 20;
    const padding = 4;

    this.progressBar.clear();
    const hue = 200 + value * 100;
    this.progressBar.fillGradientStyle(
      Phaser.Display.Color.HSVToRGB(hue / 360, 0.8, 0.9).color,
      Phaser.Display.Color.HSVToRGB((hue + 60) / 360, 0.8, 0.9).color,
      Phaser.Display.Color.HSVToRGB(hue / 360, 0.8, 0.9).color,
      Phaser.Display.Color.HSVToRGB((hue + 60) / 360, 0.8, 0.9).color,
      1
    );
    this.progressBar.fillRoundedRect(
      barX + padding,
      barY + padding,
      (barWidth - padding * 2) * value,
      barHeight - padding * 2,
      4
    );
  }
}
