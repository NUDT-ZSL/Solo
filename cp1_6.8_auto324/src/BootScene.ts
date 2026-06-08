import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    this.createLoadingBar();
    this.generateTextures();
  }

  private createLoadingBar(): void {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    const bg = this.add.graphics();
    bg.fillStyle(0x0a0a1a, 1);
    bg.fillRect(0, 0, this.cameras.main.width, this.cameras.main.height);

    const title = this.add.text(cx, cy - 80, '星轨编织者', {
      fontSize: '36px',
      fontFamily: 'serif',
      color: '#c8b8ff',
      stroke: '#6a3fcf',
      strokeThickness: 2,
    }).setOrigin(0.5);

    const barBg = this.add.graphics();
    barBg.fillStyle(0x1a1a3a, 1);
    barBg.fillRect(cx - 150, cy, 300, 20);

    const barFill = this.add.graphics();

    this.load.on('progress', (value: number) => {
      barFill.clear();
      barFill.fillStyle(0x8b5cf6, 1);
      barFill.fillRect(cx - 148, cy + 2, 296 * value, 16);
    });

    this.load.on('complete', () => {
      bg.destroy();
      title.destroy();
      barBg.destroy();
      barFill.destroy();
    });
  }

  private generateTextures(): void {
    this.generateStarTexture();
    this.generateAsteroidTexture();
    this.generateGateTexture();
    this.generateFragmentTexture();
    this.generateBlackholeTexture();
    this.generateNebulaTexture();
    this.generateParticleTexture();
    this.generateInterferenceZoneTexture();
  }

  private generateStarTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const size = 64;
    const r = size / 2;

    g.fillStyle(0x1a1a3a, 0.3);
    g.fillCircle(r, r, r);

    g.fillStyle(0x6a3fcf, 0.4);
    g.fillCircle(r, r, r * 0.7);

    g.fillStyle(0xc8b8ff, 0.8);
    g.fillCircle(r, r, r * 0.4);

    g.fillStyle(0xffffff, 1);
    g.fillCircle(r, r, r * 0.15);

    g.generateTexture('star', size, size);
    g.destroy();
  }

  private generateAsteroidTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const size = 48;
    const r = size / 2;

    g.fillStyle(0x4a3a2a, 1);
    g.fillCircle(r, r, r * 0.85);

    g.fillStyle(0x6b5a48, 1);
    g.fillCircle(r - 3, r - 3, r * 0.65);

    g.fillStyle(0x3a2a1a, 1);
    g.fillCircle(r + 5, r + 4, r * 0.25);
    g.fillCircle(r - 6, r + 6, r * 0.18);
    g.fillCircle(r + 2, r - 7, r * 0.15);

    g.fillStyle(0x5a4a38, 0.6);
    g.fillCircle(r - 4, r + 2, r * 0.12);
    g.fillCircle(r + 7, r - 3, r * 0.1);

    g.generateTexture('asteroid', size, size);
    g.destroy();
  }

  private generateGateTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const w = 80;
    const h = 100;

    g.lineStyle(3, 0x8b5cf6, 0.8);
    g.strokeEllipse(w / 2, h / 2, w * 0.8, h * 0.9);

    g.lineStyle(2, 0xc8b8ff, 0.5);
    g.strokeEllipse(w / 2, h / 2, w * 0.6, h * 0.7);

    g.fillStyle(0x2a1a4a, 0.3);
    g.fillEllipse(w / 2, h / 2, w * 0.5, h * 0.6);

    g.generateTexture('gate', w, h);
    g.destroy();

    const g2 = this.make.graphics({ x: 0, y: 0, add: false });
    g2.lineStyle(3, 0x22c55e, 0.9);
    g2.strokeEllipse(w / 2, h / 2, w * 0.8, h * 0.9);

    g2.lineStyle(2, 0x86efac, 0.6);
    g2.strokeEllipse(w / 2, h / 2, w * 0.6, h * 0.7);

    g2.fillStyle(0x1a4a2a, 0.4);
    g2.fillEllipse(w / 2, h / 2, w * 0.5, h * 0.6);

    g2.generateTexture('gate_active', w, h);
    g2.destroy();
  }

  private generateFragmentTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const size = 32;
    const r = size / 2;

    g.fillStyle(0xffd700, 0.3);
    g.fillCircle(r, r, r);

    g.fillStyle(0xffea70, 0.6);
    g.fillCircle(r, r, r * 0.6);

    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(r, r, r * 0.25);

    g.generateTexture('fragment', size, size);
    g.destroy();
  }

  private generateBlackholeTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const size = 96;
    const r = size / 2;

    g.fillStyle(0x0a0014, 0.9);
    g.fillCircle(r, r, r * 0.9);

    g.lineStyle(2, 0x4a0080, 0.5);
    g.strokeCircle(r, r, r * 0.85);

    g.lineStyle(2, 0x6a00bf, 0.3);
    g.strokeCircle(r, r, r * 0.65);

    g.lineStyle(1, 0x8b00ff, 0.2);
    g.strokeCircle(r, r, r * 0.45);

    g.fillStyle(0x000000, 1);
    g.fillCircle(r, r, r * 0.3);

    g.generateTexture('blackhole', size, size);
    g.destroy();
  }

  private generateNebulaTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const w = 256;
    const h = 256;

    g.fillStyle(0x3b1f8e, 0.08);
    g.fillEllipse(w / 2, h / 2, w * 0.9, h * 0.7);

    g.fillStyle(0x5b21b6, 0.06);
    g.fillEllipse(w / 2 - 30, h / 2 + 20, w * 0.6, h * 0.5);

    g.fillStyle(0x7c3aed, 0.05);
    g.fillEllipse(w / 2 + 40, h / 2 - 10, w * 0.5, h * 0.4);

    g.fillStyle(0x4c1d95, 0.04);
    g.fillEllipse(w / 2 + 10, h / 2 + 30, w * 0.7, h * 0.45);

    g.generateTexture('nebula', w, h);
    g.destroy();
  }

  private generateParticleTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const size = 8;

    g.fillStyle(0xc8b8ff, 0.8);
    g.fillCircle(size / 2, size / 2, size / 2);

    g.generateTexture('particle', size, size);
    g.destroy();
  }

  private generateInterferenceZoneTexture(): void {
    const g = this.make.graphics({ x: 0, y: 0, add: false });
    const size = 160;
    const r = size / 2;

    g.fillStyle(0xff2266, 0.06);
    g.fillCircle(r, r, r);

    g.lineStyle(1, 0xff4488, 0.15);
    g.strokeCircle(r, r, r * 0.9);
    g.strokeCircle(r, r, r * 0.7);
    g.strokeCircle(r, r, r * 0.5);

    g.lineStyle(1, 0xff6699, 0.1);
    for (let i = 0; i < 8; i++) {
      const angle = (Math.PI * 2 * i) / 8;
      g.lineBetween(
        r + Math.cos(angle) * r * 0.2,
        r + Math.sin(angle) * r * 0.2,
        r + Math.cos(angle) * r * 0.85,
        r + Math.sin(angle) * r * 0.85
      );
    }

    g.generateTexture('interference', size, size);
    g.destroy();
  }

  create(): void {
    this.scene.start('GameScene');
  }
}
