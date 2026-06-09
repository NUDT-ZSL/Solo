import Phaser from 'phaser';

export class UIScene extends Phaser.Scene {
  private levelText!: Phaser.GameObjects.Text;
  private progressBarBg!: Phaser.GameObjects.Graphics;
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressText!: Phaser.GameObjects.Text;
  private poleIndicator!: Phaser.GameObjects.Container;
  private poleColorN!: Phaser.GameObjects.Graphics;
  private poleColorS!: Phaser.GameObjects.Graphics;
  private poleLabel!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    const width = this.scale.width;
    const height = this.scale.height;

    this.levelText = this.add.text(30, 25, '第 1 关', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      stroke: '#4a90d9',
      strokeThickness: 3
    }).setDepth(100);

    this.progressBarBg = this.add.graphics({ x: width / 2 - 150, y: 30 })
      .fillStyle(0x222244, 0.8)
      .lineStyle(2, 0x88aaff, 0.8)
      .strokeRoundedRect(0, 0, 300, 24, 4)
      .fillRoundedRect(0, 0, 300, 24, 4)
      .setDepth(100);

    this.progressBar = this.add.graphics({ x: width / 2 - 150, y: 30 })
      .setDepth(101);

    this.progressText = this.add.text(width / 2, 42, '0%', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '16px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setDepth(102);

    this.poleIndicator = this.add.container(width - 70, 50).setDepth(100);

    this.poleColorN = this.add.graphics();
    this.poleColorS = this.add.graphics();
    this.poleLabel = this.add.text(0, 28, '', {
      fontFamily: 'Microsoft YaHei, sans-serif',
      fontSize: '14px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.poleIndicator.add([this.poleColorN, this.poleColorS, this.poleLabel]);

    this.updatePoleIndicator('N');
    this.updateProgress(0);

    this.events.emit('ui-ready');
  }

  updateLevel(level: number): void {
    this.levelText.setText(`第 ${level} 关`);
  }

  updateProgress(percent: number): void {
    const clamped = Math.max(0, Math.min(100, percent));
    this.progressBar.clear();

    const barWidth = 300 * (clamped / 100);
    const gradientColors = [0x44ff88, 0x88ffaa];

    for (let i = 0; i < barWidth; i++) {
      const t = i / barWidth;
      const color = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(gradientColors[0]),
        Phaser.Display.Color.IntegerToColor(gradientColors[1]),
        1,
        t
      );
      this.progressBar
        .fillStyle(Phaser.Display.Color.GetColor(color.r, color.g, color.b), 0.9)
        .fillRect(i, 4, 1, 16);
    }

    this.progressBar
      .lineStyle(2, 0xaaffcc, 0.6)
      .strokeRoundedRect(0, 0, barWidth, 24, 4);

    this.progressText.setText(`${Math.round(clamped)}%`);
  }

  updatePoleIndicator(pole: 'N' | 'S'): void {
    this.poleColorN.clear();
    this.poleColorS.clear();

    if (pole === 'N') {
      this.poleColorN
        .fillStyle(0x4488ff, 1)
        .fillCircle(0, 0, 22)
        .lineStyle(3, 0xaaccff, 0.9)
        .strokeCircle(0, 0, 22);
      this.poleLabel.setText('N 极');
      this.poleLabel.setColor('#aaccff');
    } else {
      this.poleColorS
        .fillStyle(0xff4466, 1)
        .fillCircle(0, 0, 22)
        .lineStyle(3, 0xffaabb, 0.9)
        .strokeCircle(0, 0, 22);
      this.poleLabel.setText('S 极');
      this.poleLabel.setColor('#ffaabb');
    }
  }
}
