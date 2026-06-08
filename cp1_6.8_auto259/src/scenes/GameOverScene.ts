import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, BG_COLOR_TOP, BG_COLOR_BOTTOM, SKINS } from '../config';

export class GameOverScene extends Phaser.Scene {
  private score = 0;
  private highScore = 0;
  private lightPoints = 0;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { score: number; highScore: number; lightPoints: number }) {
    this.score = data.score || 0;
    this.highScore = data.highScore || 0;
    this.lightPoints = data.lightPoints || 0;
  }

  create() {
    this.drawBackground();
    this.emitFeatherParticles();
    this.createGlassPanel();
    this.cameras.main.fadeIn(300);
  }

  private drawBackground() {
    const g = this.add.graphics().setDepth(0);
    for (let y = 0; y < GAME_HEIGHT; y++) {
      const t = y / GAME_HEIGHT;
      const r = Phaser.Display.Color.Interpolate.ColorWithColor(
        Phaser.Display.Color.IntegerToColor(BG_COLOR_TOP),
        Phaser.Display.Color.IntegerToColor(BG_COLOR_BOTTOM),
        100,
        Math.round(t * 100)
      );
      g.fillStyle(Phaser.Display.Color.GetColor(r.r, r.g, r.b), 0.6);
      g.fillRect(0, y, GAME_WIDTH, 1);
    }

    const overlay = this.add.graphics().setDepth(1);
    overlay.fillStyle(0x000000, 0.25);
    overlay.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
  }

  private emitFeatherParticles() {
    const skin = SKINS[this.resolveSkinIndex()];
    for (let i = 0; i < 30; i++) {
      const x = Phaser.Math.Between(0, GAME_WIDTH);
      const startY = Phaser.Math.Between(-40, -10);
      const color = Phaser.Math.RND.pick([skin.color, 0xffffff, skin.trail, 0xffd700]);
      const size = Phaser.Math.Between(2, 6);
      const p = this.add.circle(x, startY, size, color, Phaser.Math.FloatBetween(0.5, 0.9)).setDepth(2);

      const drift = Phaser.Math.Between(-30, 30);
      const dur = Phaser.Math.Between(3000, 6000);
      const delay = Phaser.Math.Between(0, 2000);

      this.tweens.add({
        targets: p,
        y: GAME_HEIGHT + 20,
        x: x + drift,
        angle: Phaser.Math.Between(90, 360),
        alpha: 0,
        duration: dur,
        delay: delay,
        ease: 'Sine.easeIn',
        onComplete: () => p.destroy(),
      });

      this.tweens.add({
        targets: p,
        x: x + drift + Phaser.Math.Between(-15, 15),
        duration: Phaser.Math.Between(800, 1500),
        yoyo: true,
        repeat: Math.ceil(dur / 1000),
        ease: 'Sine.easeInOut',
      });
    }
  }

  private createGlassPanel() {
    const panelW = 300;
    const panelH = 300;
    const panelX = (GAME_WIDTH - panelW) / 2;
    const panelY = (GAME_HEIGHT - panelH) / 2;

    const panel = this.add.graphics().setDepth(10);
    panel.fillStyle(0xffffff, 0.12);
    panel.fillRoundedRect(panelX, panelY, panelW, panelH, 24);
    panel.lineStyle(1.5, 0xffffff, 0.25);
    panel.strokeRoundedRect(panelX, panelY, panelW, panelH, 24);

    this.tweens.add({
      targets: panel,
      alpha: { from: 0, to: 1 },
      scaleX: { from: 0.85, to: 1 },
      scaleY: { from: 0.85, to: 1 },
      duration: 500,
      ease: 'Back.easeOut',
    });

    const title = this.add.text(GAME_WIDTH / 2, panelY + 40, '飞行结束', {
      fontSize: '30px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
      stroke: '#6a0dad',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(11).setAlpha(0);

    this.tweens.add({
      targets: title,
      alpha: 1,
      y: panelY + 44,
      duration: 400,
      delay: 200,
      ease: 'Quad.easeOut',
    });

    const scoreLabel = this.add.text(GAME_WIDTH / 2, panelY + 95, `${this.score}`, {
      fontSize: '48px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffd700',
      stroke: '#b8860b',
      strokeThickness: 2,
    }).setOrigin(0.5).setDepth(11).setAlpha(0);

    this.tweens.add({
      targets: scoreLabel,
      alpha: 1,
      duration: 400,
      delay: 400,
      ease: 'Quad.easeOut',
    });

    const hsText = this.add.text(GAME_WIDTH / 2, panelY + 140, `最高分 ${this.highScore}`, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#dda0dd',
    }).setOrigin(0.5).setDepth(11).setAlpha(0);

    this.tweens.add({
      targets: hsText,
      alpha: 1,
      duration: 400,
      delay: 500,
      ease: 'Quad.easeOut',
    });

    const lpText = this.add.text(GAME_WIDTH / 2, panelY + 170, `✦ 光点 ${this.lightPoints}`, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#ffec80',
    }).setOrigin(0.5).setDepth(11).setAlpha(0);

    this.tweens.add({
      targets: lpText,
      alpha: 1,
      duration: 400,
      delay: 550,
      ease: 'Quad.easeOut',
    });

    const btnW = 180;
    const btnH = 50;
    const btnX = GAME_WIDTH / 2;
    const btnY = panelY + 240;

    const btnBg = this.add.graphics().setDepth(11);
    btnBg.fillStyle(0xffffff, 0.18);
    btnBg.fillRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 25);
    btnBg.lineStyle(1.5, 0xffffff, 0.35);
    btnBg.strokeRoundedRect(-btnW / 2, -btnH / 2, btnW, btnH, 25);
    btnBg.setPosition(btnX, btnY);
    btnBg.setAlpha(0);
    btnBg.setInteractive(
      new Phaser.Geom.Rectangle(-btnW / 2, -btnH / 2, btnW, btnH),
      Phaser.Geom.Rectangle.Contains
    );

    const btnText = this.add.text(btnX, btnY, '再飞一次', {
      fontSize: '22px',
      fontFamily: 'Arial, sans-serif',
      fontStyle: 'bold',
      color: '#ffffff',
    }).setOrigin(0.5).setDepth(12).setAlpha(0);

    this.tweens.add({
      targets: [btnBg, btnText],
      alpha: 1,
      duration: 400,
      delay: 700,
      ease: 'Quad.easeOut',
    });

    this.tweens.add({
      targets: [btnBg, btnText],
      scaleX: { from: 0.5, to: 1 },
      scaleY: { from: 0.5, to: 1 },
      duration: 600,
      delay: 700,
      ease: 'Back.easeOut',
    });

    btnBg.on('pointerover', () => {
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 1.06, scaleY: 1.06, duration: 120, ease: 'Quad.easeOut' });
    });
    btnBg.on('pointerout', () => {
      this.tweens.add({ targets: [btnBg, btnText], scaleX: 1, scaleY: 1, duration: 120, ease: 'Quad.easeOut' });
    });
    btnBg.on('pointerdown', () => {
      this.cameras.main.fadeOut(300, 0, 0, 0);
      this.time.delayedCall(300, () => {
        this.scene.start('GameScene');
      });
    });
  }

  private resolveSkinIndex(): number {
    let idx = 0;
    for (let i = SKINS.length - 1; i >= 0; i--) {
      if (this.lightPoints >= SKINS[i].unlockAt) {
        idx = i;
        break;
      }
    }
    return idx;
  }
}
