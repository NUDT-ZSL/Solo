import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLOR_CYAN_GREEN, COLOR_BLUE_PURPLE, COLOR_WARM_PINK, COLOR_GOLD } from '../config';

interface GameOverData {
  score: number;
  maxCombo: number;
}

interface BurstParticle {
  gfx: Phaser.GameObjects.Graphics;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
}

export class GameOverScene extends Phaser.Scene {
  private particles: BurstParticle[] = [];
  private score = 0;
  private maxCombo = 0;
  private displayedScore = 0;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  create(data: GameOverData) {
    this.score = data.score || 0;
    this.maxCombo = data.maxCombo || 0;
    this.displayedScore = 0;
    this.particles = [];

    const bg = this.add.graphics();
    const grad = bg.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    grad.addColorStop(0, '#000022');
    grad.addColorStop(1, '#000511');
    bg.fillStyle(grad);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);

    for (let i = 0; i < 40; i++) {
      this.spawnBurst(Phaser.Math.Between(100, GAME_WIDTH - 100), Phaser.Math.Between(100, GAME_HEIGHT - 100));
    }

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.2, '游戏结束', {
      fontSize: '48px',
      fontFamily: '"Microsoft YaHei", "PingFang SC", sans-serif',
      color: '#ff006e',
      stroke: '#7b2ff7',
      strokeThickness: 3,
      shadow: { offsetX: 0, offsetY: 0, color: '#7b2ff7', blur: 15, fill: true, stroke: true },
    }).setOrigin(0.5);

    const scoreLabel = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.38, '0', {
      fontSize: '56px',
      fontFamily: '"Courier New", monospace',
      color: '#00f5d4',
      stroke: '#7b2ff7',
      strokeThickness: 2,
    }).setOrigin(0.5);

    this.tweens.add({
      targets: this,
      displayedScore: this.score,
      duration: 1500,
      ease: 'Power2',
      onUpdate: () => {
        scoreLabel.setText(Math.floor(this.displayedScore).toString());
      },
    });

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.52, `最高连击: ${this.maxCombo}`, {
      fontSize: '24px',
      fontFamily: '"Courier New", monospace',
      color: '#ffbe0b',
    }).setOrigin(0.5);

    const grade = this.getGrade();
    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.62, grade, {
      fontSize: '40px',
      fontFamily: '"Courier New", monospace',
      color: this.getGradeColor(grade),
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);

    const replayBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.78, '▸ 再来一次', {
      fontSize: '28px',
      fontFamily: '"Microsoft YaHei", sans-serif',
      color: '#00f5d4',
      backgroundColor: '#00f5d422',
      padding: { x: 24, y: 10 },
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    replayBtn.on('pointerover', () => {
      replayBtn.setStyle({ color: '#ffffff', backgroundColor: '#00f5d444' });
    });
    replayBtn.on('pointerout', () => {
      replayBtn.setStyle({ color: '#00f5d4', backgroundColor: '#00f5d422' });
    });
    replayBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 17);
      this.time.delayedCall(300, () => {
        this.scene.start('GameScene');
      });
    });

    const menuBtn = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.88, '返回主菜单', {
      fontSize: '20px',
      fontFamily: '"Microsoft YaHei", sans-serif',
      color: '#7b2ff7',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    menuBtn.on('pointerover', () => {
      menuBtn.setStyle({ color: '#00f5d4' });
    });
    menuBtn.on('pointerout', () => {
      menuBtn.setStyle({ color: '#7b2ff7' });
    });
    menuBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 17);
      this.time.delayedCall(300, () => {
        this.scene.start('MenuScene');
      });
    });

    this.cameras.main.fadeIn(500, 0, 0, 17);
  }

  private getGrade(): string {
    if (this.score >= 5000) return 'S+';
    if (this.score >= 3000) return 'S';
    if (this.score >= 2000) return 'A';
    if (this.score >= 1000) return 'B';
    if (this.score >= 500) return 'C';
    return 'D';
  }

  private getGradeColor(grade: string): string {
    switch (grade) {
      case 'S+': return '#ff006e';
      case 'S': return '#ffbe0b';
      case 'A': return '#00f5d4';
      case 'B': return '#00bbf9';
      default: return '#7b2ff7';
    }
  }

  private spawnBurst(x: number, y: number) {
    const colors = [COLOR_CYAN_GREEN, COLOR_BLUE_PURPLE, COLOR_WARM_PINK, COLOR_GOLD];
    const color = Phaser.Utils.Array.GetRandom(colors);

    for (let i = 0; i < 6; i++) {
      const gfx = this.add.graphics();
      gfx.fillStyle(color, 0.8);
      const size = Phaser.Math.FloatBetween(2, 5);
      gfx.fillCircle(0, 0, size);
      gfx.setPosition(x, y);
      const angle = Math.random() * Math.PI * 2;
      const speed = Phaser.Math.FloatBetween(40, 120);
      const maxLife = Phaser.Math.FloatBetween(1500, 3500);
      this.particles.push({
        gfx,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: maxLife,
        maxLife,
      });
    }
  }

  update(_time: number, delta: number) {
    const dt = delta / 1000;
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      p.gfx.x += p.vx * dt;
      p.gfx.y += p.vy * dt;
      p.vy += 30 * dt;
      const alpha = Math.max(0, p.life / p.maxLife) * 0.7;
      p.gfx.setAlpha(alpha);
      if (p.life <= 0) {
        p.gfx.destroy();
        this.particles.splice(i, 1);
      }
    }
  }
}
