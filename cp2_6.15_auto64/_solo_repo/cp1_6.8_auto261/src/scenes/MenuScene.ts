import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLOR_BLUE_PURPLE, COLOR_CYAN_GREEN } from '../config';

export class MenuScene extends Phaser.Scene {
  private particles: { gfx: Phaser.GameObjects.Graphics; vx: number; vy: number; life: number; maxLife: number }[] = [];
  private titleText!: Phaser.GameObjects.Text;
  private startBtn!: Phaser.GameObjects.Text;
  private subtitleText!: Phaser.GameObjects.Text;
  private timeAccum: number = 0;

  constructor() {
    super({ key: 'MenuScene' });
  }

  create() {
    const bg = this.add.graphics();
    const grad = bg.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    grad.addColorStop(0, '#000022');
    grad.addColorStop(1, '#000511');
    bg.fillStyle(grad);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (let i = 0; i < 60; i++) {
      this.spawnParticle();
    }

    this.titleText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.3, '幻影共鸣', {
      fontSize: '64px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#00f5d4',
      stroke: '#7b2ff7',
      strokeThickness: 4,
      shadow: {
        offsetX: 0, offsetY: 0, color: '#7b2ff7', blur: 20, fill: true, stroke: true,
      },
    }).setOrigin(0.5);

    this.subtitleText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.3 + 60, 'Phantom Resonance', {
      fontSize: '20px',
      fontFamily: '"Courier New", monospace',
      color: '#7b2ff7',
    }).setOrigin(0.5);

    this.startBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.6, '▸ 开始游戏', {
      fontSize: '32px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#ffffff',
      backgroundColor: '#7b2ff744',
      padding: { x: 30, y: 12 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.startBtn.on('pointerover', () => {
      this.startBtn.setStyle({ color: '#00f5d4', backgroundColor: '#00f5d433' });
    });
    this.startBtn.on('pointerout', () => {
      this.startBtn.setStyle({ color: '#ffffff', backgroundColor: '#7b2ff744' });
    });
    this.startBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 17);
      this.time.delayedCall(400, () => {
        this.scene.start('GameScene');
      });
    });

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.78, '空格/上键 跳跃 | 下键 闪避 | 精准击中节拍得分', {
      fontSize: '14px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#7b2ff7aa',
    }).setOrigin(0.5);

    this.cameras.main.fadeIn(600, 0, 0, 17);
  }

  private spawnParticle() {
    const gfx = this.add.graphics();
    const x = Phaser.Math.Between(0, GAME_WIDTH);
    const y = Phaser.Math.Between(0, GAME_HEIGHT);
    const size = Phaser.Math.FloatBetween(1, 3);
    const t = Math.random();
    const r = Phaser.Math.Linear(0x7b, 0x00, t);
    const g = Phaser.Math.Linear(0x2f, 0xf5, t);
    const b = Phaser.Math.Linear(0xf7, 0xd4, t);
    const color = (r << 16) | (g << 8) | b;
    gfx.fillStyle(color, 0.6);
    gfx.fillCircle(0, 0, size);
    gfx.setPosition(x, y);
    const maxLife = Phaser.Math.Between(2000, 6000);
    this.particles.push({
      gfx,
      vx: Phaser.Math.FloatBetween(-0.3, 0.3),
      vy: Phaser.Math.FloatBetween(-0.5, -0.1),
      life: maxLife,
      maxLife,
    });
  }

  update(_time: number, delta: number) {
    this.timeAccum += delta * 0.001;
    const pulse = 0.9 + Math.sin(this.timeAccum * 2) * 0.1;
    this.titleText.setScale(pulse);

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      p.gfx.x += p.vx;
      p.gfx.y += p.vy;
      const alpha = Math.max(0, (p.life / p.maxLife) * 0.6);
      p.gfx.setAlpha(alpha);
      if (p.life <= 0) {
        p.gfx.destroy();
        this.particles.splice(i, 1);
        this.spawnParticle();
      }
    }
  }
}
