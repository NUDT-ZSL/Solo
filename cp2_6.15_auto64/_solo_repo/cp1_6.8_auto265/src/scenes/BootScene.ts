import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  private progressBar!: Phaser.GameObjects.Graphics;
  private progressFill!: Phaser.GameObjects.Graphics;
  private loadingText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const w = this.cameras.main.width;
    const h = this.cameras.main.height;

    this.loadingText = this.add.text(w / 2, h / 2 - 60, '幻境回廊', {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: '#a0c0ff',
    }).setOrigin(0.5);

    const subText = this.add.text(w / 2, h / 2 - 20, '加载中...', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#6080b0',
    }).setOrigin(0.5);

    this.progressBar = this.add.graphics();
    this.progressFill = this.add.graphics();

    const barX = w / 2 - 160;
    const barY = h / 2 + 20;
    this.progressBar.lineStyle(2, 0x6080ff, 0.8);
    this.progressBar.strokeRect(barX, barY, 320, 24);

    this.load.on('progress', (value: number) => {
      this.progressFill.clear();
      this.progressFill.fillStyle(0x4080ff, 0.9);
      this.progressFill.fillRect(barX + 2, barY + 2, 316 * value, 20);
    });

    this.load.on('complete', () => {
      this.progressBar.destroy();
      this.progressFill.destroy();
      this.loadingText.destroy();
      subText.destroy();
    });

    this.generateTextures();
  }

  private generateTextures(): void {
    this.createPlayerTexture();
    this.createPhantomTexture();
    this.createOrbTexture();
    this.createPressurePlateTexture();
    this.createLightPillarTexture();
    this.createTrapTexture();
    this.createPortalTexture();
    this.createParticleTexture();
  }

  private createGraphics(): Phaser.GameObjects.Graphics {
    return this.add.graphics();
  }

  private createPlayerTexture(): void {
    const g = this.createGraphics();
    g.fillStyle(0x60b0ff, 1);
    g.fillCircle(12, 12, 12);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(12, 12, 6);
    g.generateTexture('player', 24, 24);
    g.destroy();
  }

  private createPhantomTexture(): void {
    const g = this.createGraphics();
    g.fillStyle(0xc0a0ff, 0.5);
    g.fillCircle(12, 12, 12);
    g.fillStyle(0xe0d0ff, 0.4);
    g.fillCircle(12, 12, 6);
    g.generateTexture('phantom', 24, 24);
    g.destroy();
  }

  private createOrbTexture(): void {
    const g = this.createGraphics();
    g.fillStyle(0xffd700, 1);
    g.fillCircle(8, 8, 8);
    g.fillStyle(0xffff80, 0.9);
    g.fillCircle(8, 8, 4);
    g.generateTexture('orb', 16, 16);
    g.destroy();
  }

  private createPressurePlateTexture(): void {
    const g = this.createGraphics();
    g.fillStyle(0x30e0a0, 0.7);
    g.fillRect(2, 2, 28, 28);
    g.lineStyle(2, 0x60ffc0, 0.9);
    g.strokeRect(2, 2, 28, 28);
    g.generateTexture('pressure_plate', 32, 32);
    g.destroy();
  }

  private createLightPillarTexture(): void {
    const g = this.createGraphics();
    g.fillStyle(0x4060ff, 0.6);
    g.fillRect(4, 0, 8, 32);
    g.fillStyle(0x80a0ff, 0.4);
    g.fillRect(6, 2, 4, 28);
    g.generateTexture('light_pillar', 16, 32);
    g.destroy();
  }

  private createTrapTexture(): void {
    const g = this.createGraphics();
    g.fillStyle(0xff3060, 0.7);
    g.fillRect(2, 2, 28, 28);
    g.lineStyle(2, 0xff6090, 0.9);
    g.lineBetween(6, 6, 26, 26);
    g.lineBetween(26, 6, 6, 26);
    g.generateTexture('trap', 32, 32);
    g.destroy();
  }

  private createPortalTexture(): void {
    const g = this.createGraphics();
    g.fillStyle(0x8040ff, 0.8);
    g.fillCircle(20, 20, 20);
    g.fillStyle(0xc080ff, 0.5);
    g.fillCircle(20, 20, 12);
    g.fillStyle(0xe0c0ff, 0.3);
    g.fillCircle(20, 20, 6);
    g.generateTexture('portal', 40, 40);
    g.destroy();
  }

  private createParticleTexture(): void {
    const g = this.createGraphics();
    g.fillStyle(0xffffff, 1);
    g.fillCircle(3, 3, 3);
    g.generateTexture('particle', 6, 6);
    g.destroy();
  }

  create(): void {
    this.scene.start('MenuScene');
  }
}
