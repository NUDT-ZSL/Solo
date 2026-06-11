import Phaser from 'phaser';
import { GameSettings, GameTheme } from '../types/gameTypes';

export class GameOverScene extends Phaser.Scene {
  private settings: GameSettings;
  private finalScore: number = 0;
  private maxCombo: number = 0;
  private unlockedThemes: GameTheme[] = [];

  constructor() {
    super('GameOverScene');
    this.settings = {
      musicVolume: 70,
      scrollSpeed: 1.0,
      jumpSensitivity: 'standard'
    };
  }

  init(data: {
    score: number;
    maxCombo: number;
    unlockedThemes: GameTheme[];
    settings: GameSettings;
  }): void {
    this.finalScore = data.score;
    this.maxCombo = data.maxCombo;
    this.unlockedThemes = data.unlockedThemes;
    this.settings = data.settings;
  }

  create(): void {
    const { width, height } = this.scale;
    const isMobile = width < 768;

    this.cameras.main.setBackgroundColor('#0A051A');

    this.cameras.main.fadeIn(500, 0, 0, 0);

    const titleY = height * 0.15;
    const title = this.add.text(width / 2, titleY, '游戏结束', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: isMobile ? '28px' : '42px',
      color: '#FF3366',
      stroke: '#880022',
      strokeThickness: 3
    }).setOrigin(0.5);

    this.tweens.add({
      targets: title,
      alpha: { from: 0.5, to: 1 },
      scale: { from: 0.8, to: 1 },
      duration: 800,
      ease: 'Back.out'
    });

    const panelX = width / 2;
    const panelY = height * 0.35;
    const panelWidth = isMobile ? width - 60 : 450;
    const panelHeight = isMobile ? 280 : 320;

    const panel = this.add.graphics();
    panel.fillStyle(0x1A0A2E, 0.9);
    panel.fillRoundedRect(panelX - panelWidth / 2, panelY, panelWidth, panelHeight, 15);
    panel.lineStyle(2, 0xFF00FF, 0.6);
    panel.strokeRoundedRect(panelX - panelWidth / 2, panelY, panelWidth, panelHeight, 15);

    panel.setAlpha(0);
    this.tweens.add({
      targets: panel,
      alpha: 1,
      duration: 600,
      delay: 300,
      ease: 'Quad.out'
    });

    let currentY = panelY + 40;

    const scoreLabel = this.add.text(panelX, currentY, '最终得分', {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: isMobile ? '14px' : '16px',
      color: '#888888'
    }).setOrigin(0.5).setAlpha(0);

    currentY += isMobile ? 35 : 45;

    const scoreValue = this.add.text(panelX, currentY, this.finalScore.toString(), {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: isMobile ? '32px' : '40px',
      color: '#00FFFF',
      stroke: '#0088FF',
      strokeThickness: 2
    }).setOrigin(0.5).setAlpha(0);

    currentY += isMobile ? 50 : 60;

    const comboLabel = this.add.text(panelX, currentY, `最高连击: ${this.maxCombo}`, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: isMobile ? '12px' : '14px',
      color: '#FF00FF'
    }).setOrigin(0.5).setAlpha(0);

    currentY += isMobile ? 35 : 45;

    const themeStatus = this.unlockedThemes.length >= 3 ? '所有主题已解锁！' :
                        `已解锁主题: ${this.unlockedThemes.length}/3`;
    const themeText = this.add.text(panelX, currentY, themeStatus, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: isMobile ? '10px' : '12px',
      color: this.unlockedThemes.length >= 3 ? '#FFD700' : '#888888'
    }).setOrigin(0.5).setAlpha(0);

    const textElements = [scoreLabel, scoreValue, comboLabel, themeText];
    textElements.forEach((elem, i) => {
      this.tweens.add({
        targets: elem,
        alpha: 1,
        y: elem.y + 10,
        duration: 500,
        delay: 500 + i * 150,
        ease: 'Quad.out'
      });
    });

    const btnY = panelY + panelHeight + (isMobile ? 50 : 70);
    const btnWidth = isMobile ? 160 : 220;
    const btnHeight = isMobile ? 45 : 55;

    const retryBtn = this.createNeonButton(
      width / 2 - (isMobile ? 0 : btnWidth / 2 - 20),
      btnY,
      btnWidth,
      btnHeight,
      '再来一次',
      0x00FFFF
    );
    retryBtn.setInteractive({ useHandCursor: true });
    retryBtn.on('pointerdown', () => {
      this.buttonPressEffect(retryBtn);
      this.time.delayedCall(200, () => {
        this.scene.start('BeatScene', { settings: this.settings });
      });
    });

    const menuBtn = this.createNeonButton(
      width / 2 + (isMobile ? 0 : btnWidth / 2 + 20),
      btnY + (isMobile ? 60 : 0),
      btnWidth,
      btnHeight,
      '返回菜单',
      0xFF00FF
    );
    menuBtn.setInteractive({ useHandCursor: true });
    menuBtn.on('pointerdown', () => {
      this.buttonPressEffect(menuBtn);
      this.time.delayedCall(200, () => {
        this.scene.start('MenuScene', { settings: this.settings });
      });
    });

    [retryBtn, menuBtn].forEach((btn, i) => {
      btn.setAlpha(0);
      this.tweens.add({
        targets: btn,
        alpha: 1,
        y: btn.y + 10,
        duration: 500,
        delay: 1000 + i * 100,
        ease: 'Quad.out'
      });
    });

    this.addConfettiEffect();
  }

  private addConfettiEffect(): void {
    const { width, height } = this.scale;

    const colors = [0x00FFFF, 0xFF00FF, 0xFFD700, 0x00FF88, 0xFF6600];

    for (let i = 0; i < 50; i++) {
      const x = Phaser.Math.Between(0, width);
      const y = Phaser.Math.Between(-100, -50);
      const color = Phaser.Utils.Array.GetRandom(colors);
      const size = Phaser.Math.Between(4, 8);
      const speed = Phaser.Math.Between(50, 150);
      const rotationSpeed = Phaser.Math.Between(-5, 5);

      const particle = this.add.rectangle(x, y, size, size, color, 0.8);

      this.tweens.add({
        targets: particle,
        y: height + 50,
        x: x + Phaser.Math.Between(-100, 100),
        angle: rotationSpeed * 360,
        duration: 3000 + Math.random() * 2000,
        delay: Math.random() * 1000,
        repeat: -1,
        ease: 'Linear'
      });
    }
  }

  private createNeonButton(x: number, y: number, w: number, h: number, text: string, color: number): Phaser.GameObjects.Container {
    const container = this.add.container(x, y);

    const bg = this.add.rectangle(0, 0, w, h, 0x1A0A2E, 0.9)
      .setStrokeStyle(2, color, 1);

    const glow = this.add.rectangle(0, 0, w + 4, h + 4, color, 0.2);

    const label = this.add.text(0, 0, text, {
      fontFamily: '"Press Start 2P", monospace',
      fontSize: h * 0.32,
      color: '#' + color.toString(16).padStart(6, '0')
    }).setOrigin(0.5);

    container.add([glow, bg, label]);

    let glowTween: Phaser.Tweens.Tween | null = null;

    container.on('pointerover', () => {
      if (glowTween) glowTween.remove();
      glowTween = this.tweens.add({
        targets: glow,
        scale: { from: 1, to: 1.1 },
        alpha: { from: 0.3, to: 0.7 },
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
      glow.setScale(1);
      glow.setAlpha(0.2);
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
  }
}
