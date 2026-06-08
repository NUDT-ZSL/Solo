import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT } from './main';

export class PreloadScene extends Phaser.Scene {
  constructor() {
    super({ key: 'PreloadScene' });
  }

  preload(): void {
    const cx = GAME_WIDTH / 2;
    const cy = GAME_HEIGHT / 2;

    const barBg = this.add.graphics();
    barBg.fillStyle(0x1a0a2e, 0.8);
    barBg.fillRoundedRect(cx - 160, cy - 12, 320, 24, 6);

    const barFill = this.add.graphics();
    const progressText = this.add.text(cx, cy - 40, '蚀月虫潮', {
      fontSize: '28px',
      fontFamily: 'serif',
      color: '#c084fc',
    }).setOrigin(0.5);

    this.load.on('progress', (value: number) => {
      barFill.clear();
      barFill.fillStyle(0x9333ea, 1);
      barFill.fillRoundedRect(cx - 156, cy - 8, 312 * value, 16, 4);
      progressText.setText(`蚀月虫潮  ${Math.floor(value * 100)}%`);
    });

    this.generateTextures();
  }

  create(): void {
    this.scene.start('GameScene');
  }

  private generateTextures(): void {
    this.genAncientBug();
    this.genWorkerBug();
    this.genSpikeBug();
    this.genShieldBug();
    this.genPlagueBug();
    this.genCreepNode();
    this.genMoonCore();
    this.genEnemyHive();
    this.genEnemyUnit();
    this.genProjectile();
    this.genParticle();
    this.genCrater();
    this.genHighland();
    this.genMiniMap();
    this.genBtnFrame();
  }

  private genAncientBug(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x4a1a6b, 1);
    g.fillEllipse(32, 32, 64, 48);
    g.fillStyle(0x7c3aed, 1);
    g.fillEllipse(32, 20, 36, 24);
    g.fillStyle(0xc084fc, 0.9);
    g.fillCircle(22, 16, 5);
    g.fillCircle(42, 16, 5);
    g.fillStyle(0x22c55e, 1);
    g.fillCircle(22, 16, 2);
    g.fillCircle(42, 16, 2);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const lx = 32 + Math.cos(angle) * 30;
      const ly = 36 + Math.sin(angle) * 16;
      g.lineStyle(2, 0x7c3aed, 0.7);
      g.lineBetween(32, 32, lx, ly);
      g.fillStyle(0xc084fc, 0.5);
      g.fillCircle(lx, ly, 3);
    }
    g.generateTexture('ancient_bug', 64, 64);
    g.destroy();
  }

  private genWorkerBug(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x6b21a8, 0.8);
    g.fillEllipse(12, 12, 24, 18);
    g.fillStyle(0xc084fc, 0.6);
    g.fillCircle(12, 8, 4);
    g.generateTexture('worker_bug', 24, 24);
    g.destroy();
  }

  private genSpikeBug(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x6b21a8, 0.7);
    g.fillEllipse(14, 14, 28, 20);
    g.lineStyle(2, 0xc084fc, 0.8);
    g.lineBetween(14, 4, 8, -2);
    g.lineBetween(14, 4, 20, -2);
    g.fillStyle(0xef4444, 0.8);
    g.fillCircle(14, 8, 3);
    g.generateTexture('spike_bug', 28, 28);
    g.destroy();
  }

  private genShieldBug(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x581c87, 0.85);
    g.fillRoundedRect(2, 2, 28, 28, 6);
    g.fillStyle(0xa855f7, 0.6);
    g.fillRoundedRect(6, 6, 20, 20, 4);
    g.fillStyle(0xc084fc, 0.9);
    g.fillCircle(16, 12, 4);
    g.generateTexture('shield_bug', 32, 32);
    g.destroy();
  }

  private genPlagueBug(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x365314, 0.75);
    g.fillEllipse(14, 14, 28, 22);
    g.fillStyle(0x84cc16, 0.6);
    g.fillCircle(14, 14, 10);
    g.fillStyle(0x22c55e, 0.8);
    g.fillCircle(14, 10, 4);
    g.generateTexture('plague_bug', 28, 28);
    g.destroy();
  }

  private genCreepNode(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x991b1b, 0.9);
    g.fillCircle(20, 20, 20);
    g.fillStyle(0xc026d3, 0.5);
    g.fillCircle(20, 20, 14);
    g.fillStyle(0xe879f9, 0.4);
    g.fillCircle(20, 20, 8);
    g.generateTexture('creep_node', 40, 40);
    g.destroy();
  }

  private genMoonCore(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xf0abfc, 0.3);
    g.fillCircle(32, 32, 32);
    g.fillStyle(0xd946ef, 0.5);
    g.fillCircle(32, 32, 22);
    g.fillStyle(0xe879f9, 0.7);
    g.fillCircle(32, 32, 14);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(32, 32, 6);
    g.generateTexture('moon_core', 64, 64);
    g.destroy();
  }

  private genEnemyHive(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x450a0a, 1);
    g.fillCircle(32, 32, 32);
    g.fillStyle(0x7f1d1d, 1);
    g.fillCircle(32, 32, 24);
    g.fillStyle(0xef4444, 0.6);
    g.fillCircle(32, 32, 14);
    g.fillStyle(0xfca5a5, 0.8);
    g.fillCircle(32, 32, 6);
    g.generateTexture('enemy_hive', 64, 64);
    g.destroy();
  }

  private genEnemyUnit(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x991b1b, 0.85);
    g.fillEllipse(12, 12, 24, 18);
    g.fillStyle(0xef4444, 0.8);
    g.fillCircle(12, 8, 4);
    g.generateTexture('enemy_unit', 24, 24);
    g.destroy();
  }

  private genProjectile(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xc084fc, 1);
    g.fillCircle(4, 4, 4);
    g.generateTexture('projectile', 8, 8);
    g.destroy();
  }

  private genParticle(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0xffffff, 0.8);
    g.fillCircle(3, 3, 3);
    g.generateTexture('particle', 6, 6);
    g.destroy();
  }

  private genCrater(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x0f0520, 0.8);
    g.fillCircle(24, 24, 24);
    g.lineStyle(2, 0x1a0a2e, 0.5);
    g.strokeCircle(24, 24, 22);
    g.generateTexture('crater', 48, 48);
    g.destroy();
  }

  private genHighland(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x3b1d6e, 0.4);
    g.fillRoundedRect(0, 0, 64, 64, 8);
    g.lineStyle(1, 0x7c3aed, 0.3);
    g.strokeRoundedRect(0, 0, 64, 64, 8);
    g.generateTexture('highland', 64, 64);
    g.destroy();
  }

  private genMiniMap(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x0a0010, 0.7);
    g.fillRoundedRect(0, 0, 160, 120, 6);
    g.lineStyle(1, 0x7c3aed, 0.6);
    g.strokeRoundedRect(0, 0, 160, 120, 6);
    g.generateTexture('minimap_bg', 160, 120);
    g.destroy();
  }

  private genBtnFrame(): void {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    g.fillStyle(0x1e1b4b, 0.6);
    g.fillRoundedRect(0, 0, 56, 56, 8);
    g.lineStyle(2, 0x7c3aed, 0.5);
    g.strokeRoundedRect(0, 0, 56, 56, 8);
    g.generateTexture('btn_frame', 56, 56);
    g.destroy();
  }
}
