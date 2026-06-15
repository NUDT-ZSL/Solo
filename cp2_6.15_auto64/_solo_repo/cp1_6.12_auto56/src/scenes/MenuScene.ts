import Phaser from 'phaser';
import { GameSettings, DEFAULT_SETTINGS } from '../types/gameTypes';

export class MenuScene extends Phaser.Scene {
  private settings: GameSettings;

  constructor() {
    super('MenuScene');
    this.settings = { ...DEFAULT_SETTINGS };
  }

  init(data: { settings?: GameSettings }): void {
    if (data.settings) {
      this.settings = { ...data.settings };
    }
  }

  create(): void {
    const { width, height } = this.scale;
    const isMobile = width < 768;

    this.cameras.main.setBackgroundColor('#1A0A2E');

    this.addBackgroundParticles();

    const titleY = height * 0.25;
    const title = this.add.text(width / 2, titleY, 'BEAT\nBOUNCE', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: isMobile ? '32px' : '48px',
      color: '#00FFFF',
      align: 'center',
      stroke: '#FF00FF',
      strokeThickness: 3
    }).setOrigin(0.5);

    this.tweens.add({
      targets: title,
      scale: { from: 1, to: 1.05 },
      duration: 1500,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.inOut'
    });

    const subtitleY = titleY + (isMobile ? 100 : 130);
    this.add.text(width / 2, subtitleY, '节奏跑酷', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: isMobile ? '14px' : '18px',
      color: '#FF00FF'
    }).setOrigin(0.5);

    const startBtnY = height * 0.55;
    const startBtn = this.createNeonButton(width / 2, startBtnY, isMobile ? 180 : 250, isMobile ? 50 : 60, '开始游戏', 0x00FFFF);
    startBtn.setInteractive({ useHandCursor: true });
    startBtn.on('pointerdown', () => {
      this.buttonPressEffect(startBtn);
      this.time.delayedCall(200, () => {
        this.scene.start('BeatScene', { settings: this.settings });
      });
    });

    const settingsBtnY = startBtnY + (isMobile ? 80 : 100);
    const settingsBtn = this.createNeonButton(width / 2, settingsBtnY, isMobile ? 180 : 250, isMobile ? 50 : 60, '设置', 0xFF00FF);
    settingsBtn.setInteractive({ useHandCursor: true });
    settingsBtn.on('pointerdown', () => {
      this.buttonPressEffect(settingsBtn);
      this.time.delayedCall(200, () => {
        this.scene.start('SettingsScene', { settings: this.settings });
      });
    });

    const hintY = height - (isMobile ? 60 : 80);
    this.add.text(width / 2, hintY, '空格 / 点击跳跃  A/D 或 ← → 变道', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: isMobile ? '10px' : '12px',
      color: '#888888',
      align: 'center'
    }).setOrigin(0.5);
  }

  private addBackgroundParticles(): void {
    const { width, height } = this.scale;

    const particles = this.add.particles(0, 0, undefined, {
      speed: { min: 10, max: 30 },
      angle: { min: 0, max: 360 },
      scale: { start: 2, end: 0 },
      alpha: { start: 0.8, end: 0 },
      tint: [0x00FFFF, 0xFF00FF],
      blendMode: 'ADD',
      lifespan: 3000,
      frequency: 200,
      quantity: 1,
      x: { min: 0, max: width },
      y: { min: 0, max: height }
    });

    particles.setDepth(-1);
  }

  private createNeonButton(x: number, y: number, w: number, h: number, text: string, color: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, w, h, 0x1A0A2E, 0.8)
      .setStrokeStyle(2, color, 1);

    const glow = this.add.rectangle(0, 0, w + 4, h + 4, color, 0.2)
      .setAlpha(0.5);

    const label = this.add.text(0, 0, text, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: h * 0.35,
      color: '#' + color.toString(16).padStart(6, '0')
    }).setOrigin(0.5);

    container.add([glow, bg, label]);

    let glowTween: Phaser.Tweens.Tween | null = null;

    container.on('pointerover', () => {
      glow.setAlpha(1);
      if (glowTween) glowTween.remove();
      glowTween = this.tweens.add({
        targets: glow,
        scale: { from: 1, to: 1.1 },
        alpha: { from: 0.5, to: 0.8 },
        duration: 500,
        yoyo: true,
        repeat: -1,
        ease: 'Sine.inOut'
      });
    });

    container.on('pointerout', () => {
      if (glowTween) {
        glowTween.remove();
        glowTween = null;
      }
      glow.setAlpha(0.5);
      glow.setScale(1);
    });

    return container;
  }

  private buttonPressEffect(button: Phaser.GameObjects.Container): void {
    this.tweens.add({
      targets: button,
      scale: { from: 1, to: 0.95 },
      duration: 100,
      yoyo: true,
      ease: 'Quad.easeOut'
    });

    this.cameras.main.flash(50, 255, 255, 255, false);
  }
}
