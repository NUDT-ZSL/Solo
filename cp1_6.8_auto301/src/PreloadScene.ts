import Phaser from 'phaser';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    this.createLoadingBar();
    this.generateTextures();
  }

  private createLoadingBar(): void {
    const cx = this.cameras.main.centerX;
    const cy = this.cameras.main.centerY;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a2e, 1);
    bg.fillRect(cx - 160, cy - 12, 320, 24);

    const bar = this.add.graphics();
    this.load.on('progress', (value: number) => {
      bar.clear();
      bar.fillStyle(0x4466ff, 1);
      bar.fillRect(cx - 156, cy - 8, 312 * value, 16);
    });

    const title = this.add.text(cx, cy - 50, '深渊回响', {
      fontSize: '32px',
      color: '#6688ff',
      fontFamily: 'serif',
    }).setOrigin(0.5);
  }

  private generateTextures(): void {
    this.createPlayerTexture();
    this.createSoundWaveTexture();
    this.createCrystalTexture();
    this.createSpiritTexture();
    this.createWallTexture();
    this.createParticleTexture();
    this.createMinimapDotTexture();
    this.createWaveTrailTexture();
  }

  private createPlayerTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x3355cc, 1);
    g.fillEllipse(16, 20, 24, 28);
    g.fillStyle(0x5588ee, 1);
    g.fillEllipse(16, 16, 18, 20);
    g.fillStyle(0xaaccff, 1);
    g.fillCircle(10, 12, 4);
    g.fillCircle(22, 12, 4);
    g.fillStyle(0x1133aa, 1);
    g.fillCircle(10, 12, 2);
    g.fillCircle(22, 12, 2);
    g.generateTexture('player', 32, 36);
    g.destroy();
  }

  private createSoundWaveTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x4488ff, 1);
    g.fillCircle(8, 8, 7);
    g.fillStyle(0x88bbff, 1);
    g.fillCircle(8, 8, 4);
    g.fillStyle(0xccddff, 1);
    g.fillCircle(8, 8, 2);
    g.generateTexture('soundwave', 16, 16);
    g.destroy();
  }

  private createCrystalTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x1a1a3a, 1);
    g.fillRect(0, 8, 28, 20);
    g.fillStyle(0x0d0d28, 1);
    g.fillTriangle(14, 0, 0, 12, 28, 12);
    g.fillTriangle(14, 28, 0, 16, 28, 16);
    g.lineStyle(1, 0x4444aa, 0.6);
    g.strokeRect(0, 8, 28, 20);
    g.generateTexture('crystal', 28, 28);
    g.destroy();
  }

  private createSpiritTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x4466ff, 0.3);
    g.fillCircle(12, 12, 12);
    g.fillStyle(0x6688ff, 0.5);
    g.fillCircle(12, 12, 8);
    g.fillStyle(0xaaccff, 0.9);
    g.fillCircle(12, 12, 5);
    g.fillStyle(0xccddff, 1);
    g.fillCircle(12, 12, 3);
    g.generateTexture('spirit', 24, 24);
    g.destroy();
  }

  private createWallTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x0a0a30, 1);
    g.fillRect(0, 0, 32, 32);
    g.fillStyle(0x0f0f40, 1);
    g.fillRect(1, 1, 30, 30);
    g.fillStyle(0x141450, 0.4);
    g.fillRect(2, 2, 14, 14);
    g.fillRect(18, 18, 12, 12);
    g.generateTexture('wall', 32, 32);
    g.destroy();
  }

  private createParticleTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x6644cc, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('particle', 8, 8);
    g.destroy();
  }

  private createMinimapDotTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x66aaff, 1);
    g.fillCircle(3, 3, 3);
    g.generateTexture('minimap_dot', 6, 6);
    g.destroy();
  }

  private createWaveTrailTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    g.fillStyle(0x4488ff, 0.5);
    g.fillCircle(4, 4, 4);
    g.generateTexture('wave_trail', 8, 8);
    g.destroy();
  }

  create(): void {
    this.cameras.main.fadeIn(500, 0, 0, 0);
    this.time.delayedCall(600, () => {
      this.scene.start('GameScene');
    });
  }
}
