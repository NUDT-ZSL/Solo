import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.generateTextures();
  }

  create(): void {
    this.scene.start('GameScene');
  }

  private generateTextures(): void {
    this.createStarTexture();
    this.createPlayerStarTexture();
    this.createAsteroidTexture();
    this.createGateTexture();
    this.createGateActiveTexture();
    this.createFragmentTexture();
    this.createBlackHoleTexture();
    this.createInterferenceZoneTexture();
    this.createParticleTexture();
    this.createGlowRingTexture();
    this.createNebulaTextures();
  }

  private createStarTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffffff, 1);
    g.fillCircle(4, 4, 4);
    g.fillStyle(0xffffff, 0.4);
    g.fillCircle(4, 4, 8);
    g.generateTexture('star', 16, 16);
    g.destroy();
  }

  private createPlayerStarTexture(): void {
    const size = 64;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x3388ff, 0.15);
    g.fillCircle(size / 2, size / 2, size / 2);
    g.fillStyle(0x55aaff, 0.3);
    g.fillCircle(size / 2, size / 2, size / 3);
    g.fillStyle(0x88ccff, 0.8);
    g.fillCircle(size / 2, size / 2, size / 5);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(size / 2, size / 2, size / 10);
    g.generateTexture('playerStar', size, size);
    g.destroy();
  }

  private createAsteroidTexture(): void {
    const size = 48;
    const g = this.make.graphics({ x: 0, y: 0 });
    const points: { x: number; y: number }[] = [];
    const cx = size / 2;
    const cy = size / 2;
    const baseR = size / 2 - 4;
    for (let i = 0; i < 10; i++) {
      const angle = (i / 10) * Math.PI * 2;
      const r = baseR * (0.7 + Math.random() * 0.3);
      points.push({ x: cx + Math.cos(angle) * r, y: cy + Math.sin(angle) * r });
    }
    g.fillStyle(0x8b7355, 1);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      g.lineTo(points[i].x, points[i].y);
    }
    g.closePath();
    g.fillPath();
    g.fillStyle(0x6b5540, 1);
    g.fillCircle(cx - 5, cy - 3, 4);
    g.fillCircle(cx + 6, cy + 4, 3);
    g.fillCircle(cx - 2, cy + 7, 2);
    g.fillStyle(0xa09080, 0.5);
    g.fillCircle(cx + 2, cy - 5, 3);
    g.generateTexture('asteroid', size, size);
    g.destroy();
  }

  private createGateTexture(): void {
    const size = 80;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.lineStyle(4, 0x4466aa, 0.8);
    g.strokeCircle(size / 2, size / 2, size / 2 - 6);
    g.lineStyle(2, 0x6688cc, 0.5);
    g.strokeCircle(size / 2, size / 2, size / 2 - 14);
    g.fillStyle(0x2244aa, 0.15);
    g.fillCircle(size / 2, size / 2, size / 2 - 6);
    g.fillStyle(0x4466cc, 0.4);
    g.fillCircle(size / 2, size / 2, 8);
    g.generateTexture('gate', size, size);
    g.destroy();
  }

  private createGateActiveTexture(): void {
    const size = 80;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.lineStyle(4, 0x44ddff, 1);
    g.strokeCircle(size / 2, size / 2, size / 2 - 6);
    g.lineStyle(2, 0x66eeff, 0.7);
    g.strokeCircle(size / 2, size / 2, size / 2 - 14);
    g.fillStyle(0x22aaff, 0.3);
    g.fillCircle(size / 2, size / 2, size / 2 - 6);
    g.fillStyle(0x66eeff, 0.9);
    g.fillCircle(size / 2, size / 2, 10);
    g.generateTexture('gateActive', size, size);
    g.destroy();
  }

  private createFragmentTexture(): void {
    const size = 32;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xffdd44, 0.2);
    g.fillCircle(size / 2, size / 2, size / 2);
    g.fillStyle(0xffee66, 0.6);
    g.fillCircle(size / 2, size / 2, size / 4);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(size / 2, size / 2, 3);
    g.generateTexture('fragment', size, size);
    g.destroy();
  }

  private createBlackHoleTexture(): void {
    const size = 80;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x110022, 0.3);
    g.fillCircle(size / 2, size / 2, size / 2);
    g.fillStyle(0x000000, 0.8);
    g.fillCircle(size / 2, size / 2, size / 4);
    g.lineStyle(3, 0x6622aa, 0.4);
    g.strokeCircle(size / 2, size / 2, size / 3);
    g.generateTexture('blackHole', size, size);
    g.destroy();
  }

  private createInterferenceZoneTexture(): void {
    const size = 120;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0xff4444, 0.06);
    g.fillCircle(size / 2, size / 2, size / 2);
    g.lineStyle(1, 0xff4444, 0.2);
    g.strokeCircle(size / 2, size / 2, size / 2 - 5);
    g.lineStyle(1, 0xff6666, 0.12);
    g.strokeCircle(size / 2, size / 2, size / 3);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const x1 = size / 2 + Math.cos(angle) * 15;
      const y1 = size / 2 + Math.sin(angle) * 15;
      const x2 = size / 2 + Math.cos(angle) * (size / 2 - 8);
      const y2 = size / 2 + Math.sin(angle) * (size / 2 - 8);
      g.lineStyle(1, 0xff6666, 0.1);
      g.lineBetween(x1, y1, x2, y2);
    }
    g.generateTexture('interferenceZone', size, size);
    g.destroy();
  }

  private createParticleTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0 });
    g.fillStyle(0x88ccff, 1);
    g.fillCircle(4, 4, 4);
    g.fillStyle(0xffffff, 0.6);
    g.fillCircle(4, 4, 2);
    g.generateTexture('particle', 8, 8);
    g.destroy();
  }

  private createGlowRingTexture(): void {
    const size = 60;
    const g = this.make.graphics({ x: 0, y: 0 });
    g.lineStyle(3, 0x88ccff, 0.6);
    g.strokeCircle(size / 2, size / 2, size / 2 - 4);
    g.lineStyle(1, 0xaaddff, 0.3);
    g.strokeCircle(size / 2, size / 2, size / 2 - 10);
    g.generateTexture('glowRing', size, size);
    g.destroy();
  }

  private createNebulaTextures(): void {
    const colors = [0x3344aa, 0x662288, 0x225566];
    colors.forEach((color, idx) => {
      const size = 200;
      const g = this.make.graphics({ x: 0, y: 0 });
      g.fillStyle(color, 0.05);
      g.fillCircle(size / 2, size / 2, size / 2);
      g.fillStyle(color, 0.03);
      g.fillCircle(size / 2 - 20, size / 2 + 15, size / 3);
      g.fillStyle(color, 0.04);
      g.fillCircle(size / 2 + 30, size / 2 - 10, size / 4);
      g.generateTexture(`nebula${idx}`, size, size);
      g.destroy();
    });
  }
}
