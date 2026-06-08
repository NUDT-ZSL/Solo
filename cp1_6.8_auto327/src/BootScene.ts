import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    const progressBar = this.add.graphics();
    const progressBox = this.add.graphics();
    progressBox.fillStyle(0x1a0a2e, 0.8);
    progressBox.fillRect(cx - 160, cy - 25, 320, 50);

    const loadingText = this.add.text(cx, cy - 50, '蚀月虫潮', {
      fontSize: '28px',
      fontFamily: 'serif',
      color: '#c9a030',
    });
    loadingText.setOrigin(0.5);

    const percentText = this.add.text(cx, cy, '0%', {
      fontSize: '18px',
      fontFamily: 'monospace',
      color: '#e0d0ff',
    });
    percentText.setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      progressBar.clear();
      progressBar.fillStyle(0x9b30ff, 1);
      progressBar.fillRect(cx - 150, cy - 15, 300 * value, 30);
      percentText.setText(`${Math.round(value * 100)}%`);
    });

    this.load.on('complete', () => {
      progressBar.destroy();
      progressBox.destroy();
      loadingText.destroy();
      percentText.destroy();
    });

    this.generateTextures();
  }

  create(): void {
    this.scene.start('GameScene');
  }

  private generateTextures(): void {
    this.createPixelTexture('ancient_worm', 48, 48, (g) => {
      g.fillStyle(0x6b1fa0);
      g.fillRect(8, 12, 32, 28);
      g.fillStyle(0x9030c0);
      g.fillRect(12, 8, 24, 8);
      g.fillStyle(0xff00ff, 0.6);
      g.fillRect(14, 14, 6, 6);
      g.fillRect(28, 14, 6, 6);
      g.fillStyle(0xc060e0);
      g.fillRect(4, 20, 8, 12);
      g.fillRect(36, 20, 8, 12);
    });

    this.createPixelTexture('spike_bug', 20, 20, (g) => {
      g.fillStyle(0xff4040);
      g.fillRect(4, 4, 12, 12);
      g.fillStyle(0xff8080);
      g.fillRect(2, 8, 4, 4);
      g.fillStyle(0xff2020, 0.8);
      g.fillRect(14, 2, 6, 2);
    });

    this.createPixelTexture('shield_bug', 24, 24, (g) => {
      g.fillStyle(0x2060ff);
      g.fillRect(4, 4, 16, 16);
      g.fillStyle(0x4090ff);
      g.fillRect(2, 2, 20, 4);
      g.fillRect(2, 2, 4, 20);
      g.fillStyle(0x1030aa);
      g.fillRect(8, 8, 8, 8);
    });

    this.createPixelTexture('plague_bug', 18, 18, (g) => {
      g.fillStyle(0x20cc40);
      g.fillRect(3, 3, 12, 12);
      g.fillStyle(0x40ff60, 0.6);
      g.fillRect(0, 6, 18, 6);
      g.fillRect(6, 0, 6, 18);
    });

    this.createPixelTexture('worker_bug', 14, 14, (g) => {
      g.fillStyle(0xc09020);
      g.fillRect(2, 2, 10, 10);
      g.fillStyle(0xe0b040);
      g.fillRect(4, 4, 6, 6);
    });

    this.createPixelTexture('enemy_bug', 20, 20, (g) => {
      g.fillStyle(0xcc2030);
      g.fillRect(4, 4, 12, 12);
      g.fillStyle(0xff4050, 0.7);
      g.fillRect(2, 6, 16, 8);
      g.fillStyle(0x901020);
      g.fillRect(8, 8, 4, 4);
    });

    this.createPixelTexture('enemy_nest', 64, 64, (g) => {
      g.fillStyle(0x801020);
      g.fillRect(8, 16, 48, 40);
      g.fillStyle(0xa02030);
      g.fillRect(16, 8, 32, 16);
      g.fillStyle(0xff2040, 0.5);
      g.fillRect(24, 24, 16, 16);
      g.fillStyle(0x601018);
      g.fillRect(4, 40, 12, 16);
      g.fillRect(48, 40, 12, 16);
    });

    this.createPixelTexture('creep_node', 28, 28, (g) => {
      g.fillStyle(0x801060, 0.7);
      g.fillCircle(14, 14, 12);
      g.fillStyle(0xb020a0, 0.5);
      g.fillCircle(14, 14, 6);
    });

    this.createPixelTexture('moon_core', 40, 40, (g) => {
      g.fillStyle(0xffd700, 0.8);
      g.fillCircle(20, 20, 16);
      g.fillStyle(0xffffff, 0.4);
      g.fillCircle(20, 20, 8);
    });

    this.createPixelTexture('projectile', 6, 6, (g) => {
      g.fillStyle(0xff6060);
      g.fillRect(0, 0, 6, 6);
    });

    this.createPixelTexture('aoe_ring', 64, 64, (g) => {
      g.lineStyle(2, 0x20ff40, 0.6);
      g.strokeCircle(32, 32, 28);
    });
  }

  private createPixelTexture(
    key: string,
    w: number,
    h: number,
    draw: (g: Phaser.GameObjects.Graphics) => void,
  ): void {
    const g = this.add.graphics();
    draw(g);
    g.generateTexture(key, w, h);
    g.destroy();
  }
}
