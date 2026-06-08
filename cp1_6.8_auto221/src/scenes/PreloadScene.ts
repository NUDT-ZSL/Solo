import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    const title = this.add.text(cx, cy - 40, '光痕迷城', {
      fontSize: '42px',
      fontFamily: '"Microsoft YaHei", sans-serif',
      color: '#a29bfe',
    }).setOrigin(0.5);

    this.tweens.add({
      targets: title,
      alpha: { from: 0, to: 1 },
      duration: 800,
      ease: 'Power2',
    });

    const subtitle = this.add.text(cx, cy + 20, '加载中...', {
      fontSize: '18px',
      fontFamily: '"Microsoft YaHei", sans-serif',
      color: '#6c5ce7',
    }).setOrigin(0.5);

    const barBg = this.add.graphics();
    barBg.fillStyle(0x1a1a2e, 1);
    barBg.fillRoundedRect(cx - 120, cy + 55, 240, 12, 6);

    const bar = this.add.graphics();

    this.load.on('progress', (value: number) => {
      bar.clear();
      bar.fillStyle(0xa29bfe, 1);
      bar.fillRoundedRect(cx - 118, cy + 57, 236 * value, 8, 4);
    });

    this.load.on('complete', () => {
      this.tweens.add({
        targets: [title, subtitle, barBg, bar],
        alpha: 0,
        duration: 400,
        ease: 'Power2',
        onComplete: () => {
          this.scene.start('GameScene', { levelId: 1 });
        },
      });
    });

    this.generateTextures();
  }

  private generateTextures(): void {
    this.createGlowBall('player', 16, 0xa29bfe, 0xffffff);
    this.createGlowBall('endpoint', 18, 0x00ff88, 0xffffff);
    this.createGlowBall('particle', 4, 0xa29bfe, 0xd0c8ff);
    this.createFootprintParticle('footprint', 6, 0x9b8cff);
    this.createPrismTexture('prism_arm', 8, 0xffffff);
    this.createPulseOrbTexture('pulse_orb', 30, 0xff6b6b);
  }

  private createGlowBall(key: string, radius: number, innerColor: number, outerColor: number): void {
    const size = radius * 4;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(innerColor, 0.1);
    g.fillCircle(size / 2, size / 2, radius * 2);
    g.fillStyle(innerColor, 0.3);
    g.fillCircle(size / 2, size / 2, radius * 1.4);
    g.fillStyle(outerColor, 0.8);
    g.fillCircle(size / 2, size / 2, radius);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(size / 2, size / 2, radius * 0.4);
    g.generateTexture(key, size, size);
    g.destroy();
  }

  private createFootprintParticle(key: string, size: number, color: number): void {
    const total = size * 3;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(color, 0.6);
    g.fillRect(total / 2 - size / 2, total / 2 - size / 2, size, size);
    g.fillStyle(0xffffff, 0.4);
    g.fillRect(total / 2 - 1, total / 2 - 1, 2, 2);
    g.generateTexture(key, total, total);
    g.destroy();
  }

  private createPrismTexture(key: string, width: number, color: number): void {
    const total = width * 3;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(color, 0.9);
    g.fillRect(total / 2 - width / 2, 0, width, total);
    g.fillStyle(0xffffff, 0.5);
    g.fillRect(total / 2 - 1, 0, 2, total);
    g.generateTexture(key, total, total);
    g.destroy();
  }

  private createPulseOrbTexture(key: string, radius: number, color: number): void {
    const size = radius * 4;
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(color, 0.08);
    g.fillCircle(size / 2, size / 2, radius * 2);
    g.fillStyle(color, 0.2);
    g.fillCircle(size / 2, size / 2, radius * 1.3);
    g.fillStyle(color, 0.5);
    g.fillCircle(size / 2, size / 2, radius);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(size / 2, size / 2, radius * 0.3);
    g.generateTexture(key, size, size);
    g.destroy();
  }
}
