import Phaser from 'phaser';

export class BootScene extends Phaser.Scene {
  private loadingBar!: Phaser.GameObjects.Graphics;
  private progressBar!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'BootScene' });
  }

  preload(): void {
    const cx = this.cameras.main.width / 2;
    const cy = this.cameras.main.height / 2;

    this.loadingBar = this.add.graphics();
    this.progressBar = this.add.graphics();

    this.loadingBar.fillStyle(0x1a0a2e, 0.8);
    this.loadingBar.fillRect(cx - 160, cy - 10, 320, 20);
    this.loadingBar.lineStyle(2, 0x9b59b6, 0.6);
    this.loadingBar.strokeRect(cx - 160, cy - 10, 320, 20);

    this.titleText = this.add.text(cx, cy - 60, '咒语编织者', {
      fontSize: '42px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#d4a6ff',
      fontStyle: 'bold',
      stroke: '#2d0a4e',
      strokeThickness: 4,
    }).setOrigin(0.5);

    this.subtitleText = this.add.text(cx, cy - 20, 'Spell Weaver', {
      fontSize: '18px',
      fontFamily: 'Georgia, serif',
      color: '#8e6aad',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      this.progressBar.clear();
      this.progressBar.fillStyle(0x9b59b6, 1);
      this.progressBar.fillRect(cx - 158, cy - 8, 316 * value, 16);

      this.progressBar.fillStyle(0xd4a6ff, 0.4);
      this.progressBar.fillRect(cx - 158, cy - 8, 316 * value, 6);
    });

    this.load.on('complete', () => {
      this.loadingBar.destroy();
      this.progressBar.destroy();
    });

    this.generateTextures();
  }

  private generateTextures(): void {
    this.createRuneGlow('fire_rune', 0xff6b35);
    this.createRuneGlow('ice_rune', 0x4fc3f7);
    this.createRuneGlow('lightning_rune', 0xbb86fc);

    this.createTowerTexture('fire_tower', 0xff6b35);
    this.createTowerTexture('ice_tower', 0x4fc3f7);
    this.createTowerTexture('lightning_tower', 0xbb86fc);

    this.createEnemyTexture('enemy_normal', 0x8bc34a);
    this.createEnemyTexture('enemy_fast', 0xffeb3b);
    this.createEnemyTexture('enemy_tank', 0xff5252);
    this.createEnemyTexture('enemy_boss', 0xe040fb);

    this.createProjectileTexture('proj_fire', 0xff6b35);
    this.createProjectileTexture('proj_ice', 0x4fc3f7);
    this.createProjectileTexture('proj_lightning', 0xbb86fc);

    this.createParticleTexture('particle_fire', 0xff6b35);
    this.createParticleTexture('particle_ice', 0x4fc3f7);
    this.createParticleTexture('particle_lightning', 0xbb86fc);
    this.createParticleTexture('particle_death', 0xe040fb);
    this.createParticleTexture('particle_gold', 0xffd700);
  }

  private createRuneGlow(key: string, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(color, 0.3);
    g.fillCircle(24, 24, 24);
    g.fillStyle(color, 0.6);
    g.fillCircle(24, 24, 16);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(24, 24, 6);
    g.generateTexture(key, 48, 48);
    g.destroy();
  }

  private createTowerTexture(key: string, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(0x1a0a2e, 1);
    g.fillRect(0, 8, 40, 40);
    g.lineStyle(2, color, 1);
    g.strokeRect(0, 8, 40, 40);
    g.fillStyle(color, 0.8);
    g.fillRect(8, 16, 24, 24);
    g.fillStyle(0xffffff, 0.6);
    g.fillRect(16, 24, 8, 8);
    g.fillStyle(color, 0.4);
    g.fillCircle(20, 8, 10);
    g.generateTexture(key, 40, 48);
    g.destroy();
  }

  private createEnemyTexture(key: string, color: number): void {
    const g = this.add.graphics();
    const isBoss = key.includes('boss');
    const size = isBoss ? 48 : 32;
    g.fillStyle(color, 0.9);
    g.fillCircle(size / 2, size / 2, size / 2 - 2);
    g.fillStyle(0x0a0012, 0.7);
    g.fillCircle(size / 2 - 4, size / 2 - 2, 3);
    g.fillCircle(size / 2 + 4, size / 2 - 2, 3);
    g.lineStyle(2, color, 0.5);
    g.strokeCircle(size / 2, size / 2, size / 2 - 2);
    if (isBoss) {
      g.fillStyle(0xff5252, 0.8);
      g.fillCircle(size / 2 - 6, size / 2 + 6, 4);
      g.fillCircle(size / 2 + 6, size / 2 + 6, 4);
      g.fillStyle(0xffffff, 0.6);
      g.fillRect(size / 2 - 12, size / 2 + 2, 24, 2);
    }
    g.generateTexture(key, size, size);
    g.destroy();
  }

  private createProjectileTexture(key: string, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(6, 6, 6);
    g.fillStyle(0xffffff, 0.7);
    g.fillCircle(6, 6, 3);
    g.generateTexture(key, 12, 12);
    g.destroy();
  }

  private createParticleTexture(key: string, color: number): void {
    const g = this.add.graphics();
    g.fillStyle(color, 1);
    g.fillCircle(4, 4, 4);
    g.fillStyle(0xffffff, 0.5);
    g.fillCircle(4, 4, 2);
    g.generateTexture(key, 8, 8);
    g.destroy();
  }

  create(): void {
    this.tweens.add({
      targets: this.titleText,
      alpha: 0,
      y: this.titleText.y - 20,
      duration: 600,
      ease: 'Power2',
      delay: 400,
    });

    this.tweens.add({
      targets: this.subtitleText,
      alpha: 0,
      y: this.subtitleText.y - 20,
      duration: 600,
      ease: 'Power2',
      delay: 500,
      onComplete: () => {
        this.cameras.main.fadeOut(400, 10, 0, 18);
        this.time.delayedCall(500, () => {
          this.scene.start('GameScene');
        });
      },
    });
  }
}
