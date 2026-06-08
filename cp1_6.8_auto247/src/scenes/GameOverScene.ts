import Phaser from 'phaser';
import { GAME_WIDTH, GAME_HEIGHT, COLOR_PLAYER, COLOR_PLAYER_GLOW, COLOR_BG_TOP, COLOR_BG_BOTTOM } from '../config';

export class GameOverScene extends Phaser.Scene {
  private finalScore: number = 0;
  private finalLayer: number = 0;

  constructor() {
    super({ key: 'GameOverScene' });
  }

  init(data: { score?: number; layer?: number }): void {
    this.finalScore = data.score ?? 0;
    this.finalLayer = data.layer ?? 0;
  }

  create(): void {
    const bg = this.add.graphics();
    const grad = bg.createLinearGradient(0, 0, 0, GAME_HEIGHT);
    grad.addColorStop(0, `#${COLOR_BG_TOP.toString(16).padStart(6, '0')}`);
    grad.addColorStop(1, `#${COLOR_BG_BOTTOM.toString(16).padStart(6, '0')}`);
    bg.fillStyle(grad, 1);
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.setDepth(-10);

    this.spawnExplosionParticles();

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.22, '坠落了...', {
      fontSize: '40px',
      fontFamily: 'Arial, sans-serif',
      color: '#ff6688',
      fontStyle: 'bold',
      stroke: '#440022',
      strokeThickness: 5,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#ff2244',
        blur: 15,
        fill: true,
      },
    }).setOrigin(0.5).setDepth(10);

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.36, `最终得分`, {
      fontSize: '18px',
      fontFamily: 'Arial, sans-serif',
      color: '#9988aa',
    }).setOrigin(0.5).setDepth(10);

    const scoreText = this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.44, `${this.finalScore}`, {
      fontSize: '56px',
      fontFamily: 'Arial, sans-serif',
      color: '#ddccff',
      fontStyle: 'bold',
      stroke: '#5533aa',
      strokeThickness: 4,
      shadow: {
        offsetX: 0,
        offsetY: 0,
        color: '#7744cc',
        blur: 20,
        fill: true,
      },
    }).setOrigin(0.5).setDepth(10);

    this.tweens.add({
      targets: scoreText,
      scaleX: 1.1,
      scaleY: 1.1,
      duration: 600,
      yoyo: true,
      ease: 'Sine.easeInOut',
      repeat: -1,
    });

    this.add.text(GAME_WIDTH / 2, GAME_HEIGHT * 0.54, `到达第 ${this.finalLayer} 层`, {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#8877aa',
    }).setOrigin(0.5).setDepth(10);

    const retryBtnBg = this.add.rectangle(0, 0, 200, 56, 0x5533aa, 0.85)
      .setStrokeStyle(2, 0x8866dd);
    const retryBtnText = this.add.text(0, 0, '再次攀登', {
      fontSize: '24px',
      fontFamily: 'Arial, sans-serif',
      color: '#eeeeff',
    }).setOrigin(0.5);

    const retryBtn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT * 0.68, [retryBtnBg, retryBtnText]);
    retryBtn.setSize(200, 56);
    retryBtn.setInteractive({ useHandCursor: true });
    retryBtn.setDepth(20);

    retryBtn.on('pointerover', () => {
      retryBtnBg.setFillStyle(0x7755cc, 0.95);
      this.tweens.add({ targets: retryBtn, scaleX: 1.05, scaleY: 1.05, duration: 150 });
    });
    retryBtn.on('pointerout', () => {
      retryBtnBg.setFillStyle(0x5533aa, 0.85);
      this.tweens.add({ targets: retryBtn, scaleX: 1, scaleY: 1, duration: 150 });
    });
    retryBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => {
        this.scene.start('GameScene');
      });
    });

    const menuBtnBg = this.add.rectangle(0, 0, 160, 44, 0x332255, 0.7)
      .setStrokeStyle(1, 0x665588, 0.5);
    const menuBtnText = this.add.text(0, 0, '返回主菜单', {
      fontSize: '16px',
      fontFamily: 'Arial, sans-serif',
      color: '#aaaacc',
    }).setOrigin(0.5);

    const menuBtn = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT * 0.78, [menuBtnBg, menuBtnText]);
    menuBtn.setSize(160, 44);
    menuBtn.setInteractive({ useHandCursor: true });
    menuBtn.setDepth(20);

    menuBtn.on('pointerover', () => {
      menuBtnBg.setFillStyle(0x443377, 0.85);
    });
    menuBtn.on('pointerout', () => {
      menuBtnBg.setFillStyle(0x332255, 0.7);
    });
    menuBtn.on('pointerdown', () => {
      this.cameras.main.fadeOut(400, 0, 0, 0);
      this.time.delayedCall(400, () => {
        this.scene.start('MenuScene');
      });
    });

    this.cameras.main.fadeIn(500, 0, 0, 0);
  }

  private spawnExplosionParticles(): void {
    const texture = this.make.graphics({ x: 0, y: 0 }, false);
    texture.fillStyle(0xffffff, 1);
    texture.fillCircle(4, 4, 4);
    texture.generateTexture('overParticle', 8, 8);
    texture.destroy();

    const particles = this.add.particles('overParticle');

    const emitters: Phaser.GameObjects.Particles.ParticleEmitter[] = [];

    const colors = [0xff4466, 0xff8844, 0xffaa33, COLOR_PLAYER, COLOR_PLAYER_GLOW, 0xffffff];

    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * 360;
      const rad = Phaser.Math.DegToRad(angle);
      const emitter = particles.createEmitter({
        x: GAME_WIDTH / 2,
        y: GAME_HEIGHT * 0.3,
        speed: { min: 60, max: 180 },
        angle: { min: angle - 30, max: angle + 30 },
        scale: { start: 1.0, end: 0 },
        lifespan: { min: 600, max: 1200 },
        quantity: 8,
        blendMode: Phaser.BlendModes.ADD,
        tint: colors[i],
        maxParticles: 30,
        emitting: false,
        gravityY: 50,
      });
      emitters.push(emitter);
    }

    emitters.forEach(e => e.explode(8));

    this.tweens.addCounter({
      from: 1,
      to: 0,
      duration: 1500,
      onUpdate: (tween) => {
        particles.setAlpha(tween.getValue());
      },
      onComplete: () => {
        particles.destroy();
      },
    });

    particles.setDepth(5);
  }
}
