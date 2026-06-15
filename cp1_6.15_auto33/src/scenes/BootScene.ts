import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  private _progressBar: Phaser.GameObjects.Graphics | null = null;
  private _progressBarBg: Phaser.GameObjects.Graphics | null = null;
  private _loadingText: Phaser.GameObjects.Text | null = null;
  private _percentText: Phaser.GameObjects.Text | null = null;

  constructor() {
    super({ key: 'BootScene' });
  }

  public preload(): void {
    this._createProgressBar();

    this.load.on('progress', (value: number) => {
      this._updateProgress(value);
    });

    this.load.on('complete', () => {
      this._updateProgress(1);
    });

    this._generateTextures();
  }

  public create(): void {
    this.time.delayedCall(500, () => {
      this.scene.start('GameScene');
    });
  }

  private _createProgressBar(): void {
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;

    const bgGradient = this.add.graphics();
    bgGradient.fillGradientStyle(0x0f0a2e, 0x1e1b4b, 0x0f0a2e, 0x1e1b4b, 1);
    bgGradient.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

    this._loadingText = this.add.text(centerX, centerY - 80, '正在加载...', {
      fontSize: '28px',
      color: '#c4b5fd',
      fontStyle: 'bold'
    });
    this._loadingText.setOrigin(0.5);

    const barWidth = 400;
    const barHeight = 24;
    const barX = centerX - barWidth / 2;
    const barY = centerY - barHeight / 2;

    this._progressBarBg = this.add.graphics();
    this._progressBarBg.fillStyle(0x312e81, 1);
    this._progressBarBg.fillRoundedRect(barX - 4, barY - 4, barWidth + 8, barHeight + 8, 6);
    this._progressBarBg.fillStyle(0x1e1b4b, 1);
    this._progressBarBg.fillRoundedRect(barX, barY, barWidth, barHeight, 4);

    this._progressBar = this.add.graphics();

    this._percentText = this.add.text(centerX, centerY + 50, '0%', {
      fontSize: '20px',
      color: '#a5b4fc'
    });
    this._percentText.setOrigin(0.5);

    const title = this.add.text(centerX, centerY - 160, '塔防战争', {
      fontSize: '56px',
      color: '#fbbf24',
      fontStyle: 'bold',
      stroke: '#1e1b4b',
      strokeThickness: 6
    });
    title.setOrigin(0.5);

    const subtitle = this.add.text(centerX, centerY - 110, 'TOWER DEFENSE', {
      fontSize: '20px',
      color: '#818cf8',
      letterSpacing: 8
    });
    subtitle.setOrigin(0.5);
  }

  private _updateProgress(value: number): void {
    if (!this._progressBar) return;

    const barWidth = 400;
    const barHeight = 24;
    const centerX = this.cameras.main.width / 2;
    const centerY = this.cameras.main.height / 2;
    const barX = centerX - barWidth / 2;
    const barY = centerY - barHeight / 2;

    this._progressBar.clear();

    const fillWidth = Math.max(0, Math.min(barWidth, barWidth * value));
    this._progressBar.fillGradientStyle(0x6366f1, 0x8b5cf6, 0x6366f1, 0x8b5cf6, 1);
    this._progressBar.fillRoundedRect(barX, barY, fillWidth, barHeight, 4);

    if (this._percentText) {
      this._percentText.setText(`${Math.round(value * 100)}%`);
    }
  }

  private _generateTextures(): void {
    const _this = this;

    this.load.on('complete', () => {
      const generateTowerTexture = (
        key: string,
        color: number,
        accent: number,
        size: number
      ) => {
        const g = _this.add.graphics();
        g.fillStyle(0x1e1b4b, 0.8);
        g.fillRoundedRect(-size, -size + 4, size * 2, 10, 3);
        g.fillStyle(color, 1);
        g.fillCircle(0, 0, size);
        g.lineStyle(3, 0x0f172a, 1);
        g.strokeCircle(0, 0, size);
        g.fillStyle(accent, 0.3);
        g.fillCircle(0, -2, size * 0.45);
        g.generateTexture(key, size * 2 + 10, size * 2 + 10);
        g.destroy();
      };

      const towers = [
        { key: 'tower_arrow', color: 0x8b4513, accent: 0xdeb887, size: 20 },
        { key: 'tower_cannon', color: 0x4a4a4a, accent: 0xff6600, size: 22 },
        { key: 'tower_magic', color: 0x9333ea, accent: 0xc084fc, size: 21 },
        { key: 'tower_ice', color: 0x0ea5e9, accent: 0x7dd3fc, size: 20 },
        { key: 'tower_electric', color: 0xeab308, accent: 0xfde047, size: 21 }
      ];

      towers.forEach((t) => generateTowerTexture(t.key, t.color, t.accent, t.size));

      const enemies = [
        { key: 'enemy_normal', color: 0x4ade80, size: 14 },
        { key: 'enemy_heavy', color: 0xef4444, size: 20 },
        { key: 'enemy_fast', color: 0x3b82f6, size: 11 }
      ];

      enemies.forEach((e) => {
        const g = _this.add.graphics();
        g.fillStyle(e.color, 1);
        g.fillCircle(0, 0, e.size);
        g.lineStyle(2, 0x1e1b4b, 1);
        g.strokeCircle(0, 0, e.size);
        g.generateTexture(e.key, e.size * 2 + 4, e.size * 2 + 4);
        g.destroy();
      });
    });
  }
}
