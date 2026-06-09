import Phaser from 'phaser';
import { CONFIG } from '../config/GameConfig';
import {
  GameEvents,
  ScoreUpdateData,
  ComboUpdateData,
  GameOverData
} from '../events/EventBus';
import { GameScene } from './GameScene';

export class UIScene extends Phaser.Scene {
  private scoreText!: Phaser.GameObjects.Text;
  private comboText!: Phaser.GameObjects.Text;
  private comboMultiplierText!: Phaser.GameObjects.Text;
  private comboProgressBar!: Phaser.GameObjects.Graphics;
  private pauseButton!: Phaser.GameObjects.Container;
  private pauseIcon!: Phaser.GameObjects.Graphics;

  private gameOverPanel!: Phaser.GameObjects.Container;
  private gameOverMask!: Phaser.GameObjects.Graphics;
  private finalScoreText!: Phaser.GameObjects.Text;
  private highScoreText!: Phaser.GameObjects.Text;
  private totalStarsText!: Phaser.GameObjects.Text;
  private playTimeText!: Phaser.GameObjects.Text;
  private restartButton!: Phaser.GameObjects.Container;

  private pausePanel!: Phaser.GameObjects.Container;
  private pauseMask!: Phaser.GameObjects.Graphics;
  private resumeButton!: Phaser.GameObjects.Container;

  private floatingTexts: Phaser.GameObjects.Text[] = [];

  private currentScore: number = 0;
  private currentMultiplier: number = CONFIG.COMBO.BASE_MULTIPLIER;
  private currentComboStars: number = 0;

  private isPaused: boolean = false;
  private baseScale: number = 1;

  constructor() {
    super({ key: 'UIScene' });
  }

  create(): void {
    this.baseScale = Math.max(0.7, Math.min(1, this.scale.width / 1280));

    this.createHUD();
    this.createPausePanel();
    this.createGameOverPanel();
    this.setupEventListeners();

    this.scale.on('resize', this.handleResize, this);
    this.events.on('shutdown', this.cleanup, this);
  }

  private createHUD(): void {
    const w = this.scale.width;
    const scale = this.baseScale;
    const pad = 20 * scale;

    const cardW = 220 * scale;
    const cardH = 80 * scale;
    const scoreCard = this.add.graphics();
    this.renderCard(scoreCard, pad, pad, cardW, cardH, 0x222244, 0.5);

    const fontSize = Math.max(CONFIG.UI.MIN_FONT_SIZE, 28 * scale);
    this.scoreText = this.add.text(
      pad + cardW / 2,
      pad + cardH / 2,
      '0',
      {
        fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
        fontSize: `${fontSize}px`,
        color: '#ffffff',
        fontStyle: 'bold',
        stroke: '#000000',
        strokeThickness: 2
      }
    ).setOrigin(0.5).setDepth(200).setScrollFactor(0);

    const labelSize = Math.max(CONFIG.UI.MIN_FONT_SIZE, 14 * scale);
    this.add.text(
      pad + cardW / 2,
      pad + 14 * scale,
      '得分 SCORE',
      {
        fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
        fontSize: `${labelSize}px`,
        color: '#88ddff',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setDepth(200).setScrollFactor(0);

    const comboX = w - pad;
    const comboCardW = 200 * scale;
    const comboCardH = 90 * scale;
    const comboCard = this.add.graphics();
    this.renderCard(comboCard, comboX - comboCardW, pad, comboCardW, comboCardH, 0x222244, 0.5);

    const comboLabelSize = Math.max(CONFIG.UI.MIN_FONT_SIZE, 14 * scale);
    this.add.text(
      comboX - comboCardW / 2,
      pad + 14 * scale,
      '连击 COMBO',
      {
        fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
        fontSize: `${comboLabelSize}px`,
        color: '#ffdd88',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setDepth(200).setScrollFactor(0);

    const multiSize = Math.max(CONFIG.UI.MIN_FONT_SIZE, 22 * scale);
    this.comboMultiplierText = this.add.text(
      comboX - comboCardW / 2 - comboCardW * 0.25,
      pad + comboCardH / 2 + 4 * scale,
      `${CONFIG.COMBO.BASE_MULTIPLIER}x`,
      {
        fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
        fontSize: `${multiSize}px`,
        color: '#ffd700',
        fontStyle: 'bold'
      }
    ).setOrigin(0.5).setDepth(200).setScrollFactor(0);

    const comboTextSize = Math.max(CONFIG.UI.MIN_FONT_SIZE, 14 * scale);
    this.comboText = this.add.text(
      comboX - comboCardW / 2 + comboCardW * 0.2,
      pad + comboCardH / 2 + 4 * scale,
      '0/10',
      {
        fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
        fontSize: `${comboTextSize}px`,
        color: '#cccccc'
      }
    ).setOrigin(0.5).setDepth(200).setScrollFactor(0);

    this.comboProgressBar = this.add.graphics().setDepth(200).setScrollFactor(0);
    this.renderComboProgress(comboX - comboCardW + 16 * scale, pad + comboCardH - 14 * scale, comboCardW - 32 * scale, 6 * scale);

    this.createPauseButton();
  }

  private renderCard(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    w: number,
    h: number,
    fillColor: number,
    fillAlpha: number
  ): void {
    const r = 12 * this.baseScale;
    graphics.setScrollFactor(0).setDepth(199);
    graphics.fillStyle(fillColor, fillAlpha);
    graphics.lineStyle(1, 0xffffff, 0.15);
    graphics.fillRoundedRect(x, y, w, h, r);
    graphics.strokeRoundedRect(x, y, w, h, r);
  }

  private renderComboProgress(x: number, y: number, w: number, h: number): void {
    this.comboProgressBar.clear();
    const progress = this.currentComboStars / CONFIG.COMBO.STARS_PER_LEVEL;
    this.comboProgressBar.fillStyle(0x333355, 0.8);
    this.comboProgressBar.fillRoundedRect(x, y, w, h, h / 2);

    const progressW = Math.max(0, Math.min(1, progress)) * w;
    if (progressW > 0) {
      const hue = 40 + (1 - progress) * 100;
      const color = Phaser.Display.Color.HSVToRGB(hue / 360, 0.9, 1).color;
      this.comboProgressBar.fillStyle(color, 1);
      this.comboProgressBar.fillRoundedRect(x, y, progressW, h, h / 2);
    }
  }

  private createPauseButton(): void {
    const w = this.scale.width;
    const pad = 20 * this.baseScale;
    const size = Math.max(CONFIG.UI.MIN_BUTTON_SIZE, 46 * this.baseScale);

    this.pauseButton = this.add.container(w / 2, pad + size / 2).setDepth(201).setScrollFactor(0);
    this.pauseButton.setSize(size, size);

    const bg = this.add.graphics();
    const r = 10 * this.baseScale;
    bg.fillStyle(0x334466, 0.6);
    bg.lineStyle(1, 0xffffff, 0.2);
    bg.fillRoundedRect(-size / 2, -size / 2, size, size, r);
    bg.strokeRoundedRect(-size / 2, -size / 2, size, size, r);

    this.pauseIcon = this.add.graphics();
    const barW = 5 * this.baseScale;
    const barH = 18 * this.baseScale;
    const gap = 6 * this.baseScale;
    this.renderPauseIcon(true);

    this.pauseButton.add([bg, this.pauseIcon]);
    this.pauseButton.setInteractive({ useHandCursor: true });

    this.pauseButton.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x4466aa, 0.8);
      bg.lineStyle(2, 0x66ccff, 0.6);
      bg.fillRoundedRect(-size / 2, -size / 2, size, size, r);
      bg.strokeRoundedRect(-size / 2, -size / 2, size, size, r);
    });

    this.pauseButton.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x334466, 0.6);
      bg.lineStyle(1, 0xffffff, 0.2);
      bg.fillRoundedRect(-size / 2, -size / 2, size, size, r);
      bg.strokeRoundedRect(-size / 2, -size / 2, size, size, r);
    });

    this.pauseButton.on('pointerdown', () => {
      this.togglePause();
    });
  }

  private renderPauseIcon(isPause: boolean): void {
    this.pauseIcon.clear();
    const size = Math.max(CONFIG.UI.MIN_BUTTON_SIZE, 46 * this.baseScale);
    const barW = 5 * this.baseScale;
    const barH = 18 * this.baseScale;
    const gap = 6 * this.baseScale;

    if (isPause) {
      this.pauseIcon.fillStyle(0xffffff, 0.9);
      this.pauseIcon.fillRect(-gap / 2 - barW, -barH / 2, barW, barH);
      this.pauseIcon.fillRect(gap / 2, -barH / 2, barW, barH);
    } else {
      this.pauseIcon.fillStyle(0xffffff, 0.9);
      this.pauseIcon.beginPath();
      this.pauseIcon.moveTo(-barW, -barH / 2);
      this.pauseIcon.lineTo(barW, 0);
      this.pauseIcon.lineTo(-barW, barH / 2);
      this.pauseIcon.closePath();
      this.pauseIcon.fillPath();
    }
  }

  private createPausePanel(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    this.pauseMask = this.add.graphics().setDepth(300).setScrollFactor(0);
    this.pauseMask.fillStyle(0x000000, 0.6);
    this.pauseMask.fillRect(0, 0, w, h);
    this.pauseMask.setVisible(false);

    this.pausePanel = this.add.container(w / 2, h / 2).setDepth(301).setScrollFactor(0);
    const panelW = 320 * this.baseScale;
    const panelH = 260 * this.baseScale;
    const panelBg = this.add.graphics();
    this.renderCard(panelBg, -panelW / 2, -panelH / 2, panelW, panelH, 0x1a1a3a, 0.9);

    const titleSize = Math.max(CONFIG.UI.MIN_FONT_SIZE, 28 * this.baseScale);
    const title = this.add.text(0, -panelH / 2 + 45 * this.baseScale, '游戏暂停', {
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      fontSize: `${titleSize}px`,
      color: '#88ddff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const infoSize = Math.max(CONFIG.UI.MIN_FONT_SIZE, 18 * this.baseScale);
    const hint = this.add.text(0, 0, '点击继续按钮恢复游戏', {
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      fontSize: `${infoSize}px`,
      color: '#aaaaaa'
    }).setOrigin(0.5);

    const btnW = 180 * this.baseScale;
    const btnH = Math.max(CONFIG.UI.MIN_BUTTON_SIZE, 50 * this.baseScale);
    this.resumeButton = this.createButton(
      0,
      panelH / 2 - 60 * this.baseScale,
      btnW,
      btnH,
      '继续游戏',
      '#88ddff',
      () => this.togglePause()
    );

    this.pausePanel.add([panelBg, title, hint, this.resumeButton]);
    this.pausePanel.setVisible(false);
  }

  private createGameOverPanel(): void {
    const w = this.scale.width;
    const h = this.scale.height;

    this.gameOverMask = this.add.graphics().setDepth(400).setScrollFactor(0);
    this.gameOverMask.fillStyle(0x000000, 0.75);
    this.gameOverMask.fillRect(0, 0, w, h);
    this.gameOverMask.setVisible(false);

    this.gameOverPanel = this.add.container(w / 2, h / 2).setDepth(401).setScrollFactor(0);
    const panelW = 400 * this.baseScale;
    const panelH = 480 * this.baseScale;
    const panelBg = this.add.graphics();
    this.renderCard(panelBg, -panelW / 2, -panelH / 2, panelW, panelH, 0x14142a, 0.95);

    const titleSize = Math.max(CONFIG.UI.MIN_FONT_SIZE, 32 * this.baseScale);
    const title = this.add.text(0, -panelH / 2 + 50 * this.baseScale, '旅程结束', {
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      fontSize: `${titleSize}px`,
      color: '#ffaa66',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const subTitle = this.add.text(0, -panelH / 2 + 85 * this.baseScale, '星座待下次修复...', {
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      fontSize: `${Math.max(CONFIG.UI.MIN_FONT_SIZE, 16 * this.baseScale)}px`,
      color: '#8888aa'
    }).setOrigin(0.5);

    const dataStartY = -panelH / 2 + 130 * this.baseScale;
    const labelSize = Math.max(CONFIG.UI.MIN_FONT_SIZE, 16 * this.baseScale);
    const valueSize = Math.max(CONFIG.UI.MIN_FONT_SIZE, 24 * this.baseScale);

    const finalScoreLabel = this.add.text(0, dataStartY, '本次得分', {
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      fontSize: `${labelSize}px`,
      color: '#88aadd'
    }).setOrigin(0.5);

    this.finalScoreText = this.add.text(0, dataStartY + 32 * this.baseScale, '0', {
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      fontSize: `${valueSize}px`,
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const highScoreLabel = this.add.text(0, dataStartY + 75 * this.baseScale, '最高纪录', {
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      fontSize: `${labelSize}px`,
      color: '#ffdd66'
    }).setOrigin(0.5);

    this.highScoreText = this.add.text(0, dataStartY + 107 * this.baseScale, '0', {
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      fontSize: `${valueSize}px`,
      color: '#ffd700',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.totalStarsText = this.add.text(0, dataStartY + 155 * this.baseScale, '', {
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      fontSize: `${Math.max(CONFIG.UI.MIN_FONT_SIZE, 16 * this.baseScale)}px`,
      color: '#aaccdd'
    }).setOrigin(0.5);

    this.playTimeText = this.add.text(0, dataStartY + 185 * this.baseScale, '', {
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      fontSize: `${Math.max(CONFIG.UI.MIN_FONT_SIZE, 16 * this.baseScale)}px`,
      color: '#aaccdd'
    }).setOrigin(0.5);

    const btnW = 200 * this.baseScale;
    const btnH = Math.max(CONFIG.UI.MIN_BUTTON_SIZE, 56 * this.baseScale);
    this.restartButton = this.createButton(
      0,
      panelH / 2 - 70 * this.baseScale,
      btnW,
      btnH,
      '再来一次',
      '#66ffaa',
      () => this.restartGame()
    );

    this.gameOverPanel.add([
      panelBg,
      title,
      subTitle,
      finalScoreLabel,
      this.finalScoreText,
      highScoreLabel,
      this.highScoreText,
      this.totalStarsText,
      this.playTimeText,
      this.restartButton
    ]);
    this.gameOverPanel.setVisible(false);
  }

  private createButton(
    x: number,
    y: number,
    w: number,
    h: number,
    text: string,
    hoverColor: string,
    onClick: () => void
  ): Phaser.GameObjects.Container {
    const container = this.add.container(x, y).setScrollFactor(0);
    const r = 10 * this.baseScale;

    const bg = this.add.graphics();
    bg.fillStyle(0x334466, 0.8);
    bg.lineStyle(1, 0xffffff, 0.2);
    bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);

    const glow = this.add.graphics();
    glow.lineStyle(2, parseInt(hoverColor.replace('#', ''), 16), 0);
    glow.strokeRoundedRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2, r + 1);

    const btnText = this.add.text(0, 0, text, {
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      fontSize: `${Math.max(CONFIG.UI.MIN_FONT_SIZE, 18 * this.baseScale)}px`,
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    container.setSize(w, h);
    container.setInteractive({ useHandCursor: true });

    container.on('pointerover', () => {
      bg.clear();
      bg.fillStyle(0x446699, 0.9);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
      glow.clear();
      glow.lineStyle(3, parseInt(hoverColor.replace('#', ''), 16), 0.8);
      glow.strokeRoundedRect(-w / 2 - 2, -h / 2 - 2, w + 4, h + 4, r + 2);
    });

    container.on('pointerout', () => {
      bg.clear();
      bg.fillStyle(0x334466, 0.8);
      bg.lineStyle(1, 0xffffff, 0.2);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
      bg.strokeRoundedRect(-w / 2, -h / 2, w, h, r);
      glow.clear();
      glow.lineStyle(2, parseInt(hoverColor.replace('#', ''), 16), 0);
      glow.strokeRoundedRect(-w / 2 - 1, -h / 2 - 1, w + 2, h + 2, r + 1);
    });

    container.on('pointerdown', () => {
      bg.clear();
      bg.fillStyle(0x223355, 1);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
      onClick();
    });

    container.on('pointerup', () => {
      bg.clear();
      bg.fillStyle(0x446699, 0.9);
      bg.fillRoundedRect(-w / 2, -h / 2, w, h, r);
    });

    container.add([bg, glow, btnText]);
    return container;
  }

  private setupEventListeners(): void {
    this.game.events.on(GameEvents.SCORE_UPDATE, this.handleScoreUpdate, this);
    this.game.events.on(GameEvents.COMBO_UPDATE, this.handleComboUpdate, this);
    this.game.events.on(GameEvents.GAME_OVER, this.handleGameOver, this);
    this.game.events.on(GameEvents.COMBO_LEVEL_UP, this.handleComboLevelUp, this);
  }

  private handleScoreUpdate(data: ScoreUpdateData): void {
    this.currentScore = data.score;
    this.scoreText.setText(data.score.toString());

    this.tweens.add({
      targets: this.scoreText,
      scale: { from: 1.3, to: 1 },
      duration: 200,
      ease: 'Back.easeOut'
    });

    this.showFloatingText(
      data.x,
      data.y,
      data.delta > 0 ? `+${data.delta}` : `${data.delta}`,
      data.delta > 0 ? '#66ff99' : '#ff6666'
    );
  }

  private handleComboUpdate(data: ComboUpdateData): void {
    this.currentMultiplier = data.multiplier;
    this.currentComboStars = data.collectedStars;

    this.comboMultiplierText.setText(`${data.multiplier}x`);
    this.comboText.setText(`${data.collectedStars}/${CONFIG.COMBO.STARS_PER_LEVEL}`);

    const hue = data.multiplier >= CONFIG.COMBO.MAX_MULTIPLIER
      ? 40
      : 180 - (data.multiplier - 1) * 80;
    const colorObj = Phaser.Display.Color.HSVToRGB(hue / 360, 0.9, 1) as { r: number; g: number; b: number };
    const hexColor = Phaser.Display.Color.RGBToString(colorObj.r, colorObj.g, colorObj.b);
    this.comboMultiplierText.setColor(hexColor);

    const w = this.scale.width;
    const pad = 20 * this.baseScale;
    const comboCardW = 200 * this.baseScale;
    this.renderComboProgress(
      w - comboCardW - pad + 16 * this.baseScale,
      pad + 90 * this.baseScale - 14 * this.baseScale,
      comboCardW - 32 * this.baseScale,
      6 * this.baseScale
    );
  }

  private handleComboLevelUp(data: { multiplier: number }): void {
    this.tweens.add({
      targets: this.comboMultiplierText,
      scale: { from: 2, to: 1 },
      duration: 500,
      ease: 'Elastic.easeOut'
    });
  }

  private handleGameOver(data: GameOverData): void {
    this.gameOverMask.setVisible(true);
    this.gameOverPanel.setVisible(true);

    this.finalScoreText.setText(data.finalScore.toString());
    this.highScoreText.setText(data.highScore.toString());
    this.totalStarsText.setText(`收集星尘：${data.totalStars} 个`);

    const totalSec = Math.floor(data.playTime / 1000);
    const mins = Math.floor(totalSec / 60);
    const secs = totalSec % 60;
    this.playTimeText.setText(`游戏时长：${mins}:${secs.toString().padStart(2, '0')}`);

    this.gameOverPanel.setScale(0.5);
    this.gameOverPanel.setAlpha(0);
    this.tweens.add({
      targets: this.gameOverPanel,
      scale: 1,
      alpha: 1,
      duration: 500,
      ease: 'Back.easeOut'
    });

    this.gameOverMask.setAlpha(0);
    this.tweens.add({
      targets: this.gameOverMask,
      alpha: 0.75,
      duration: 400,
      ease: 'Linear'
    });
  }

  private showFloatingText(x: number, y: number, text: string, color: string): void {
    const size = Math.max(CONFIG.UI.MIN_FONT_SIZE, 20 * this.baseScale);
    const floatText = this.add.text(x, y, text, {
      fontFamily: 'Segoe UI, Microsoft YaHei, sans-serif',
      fontSize: `${size}px`,
      color: color,
      fontStyle: 'bold',
      stroke: '#000000',
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(250).setScrollFactor(0);

    this.floatingTexts.push(floatText);

    this.tweens.add({
      targets: floatText,
      y: y - 60,
      alpha: 0,
      scale: { from: 1.2, to: 0.8 },
      duration: CONFIG.UI.FLOAT_DURATION,
      ease: 'Cubic.easeOut',
      onComplete: () => {
        floatText.destroy();
        const idx = this.floatingTexts.indexOf(floatText);
        if (idx !== -1) this.floatingTexts.splice(idx, 1);
      }
    });
  }

  private togglePause(): void {
    this.isPaused = !this.isPaused;
    this.renderPauseIcon(!this.isPaused);

    const gameScene = this.scene.get('GameScene') as GameScene;
    gameScene.setPaused(this.isPaused);

    this.pauseMask.setVisible(this.isPaused);
    this.pausePanel.setVisible(this.isPaused);

    if (this.isPaused) {
      this.pausePanel.setScale(0.8);
      this.pausePanel.setAlpha(0);
      this.tweens.add({
        targets: this.pausePanel,
        scale: 1,
        alpha: 1,
        duration: 300,
        ease: 'Back.easeOut'
      });
    }

    this.game.events.emit(this.isPaused ? GameEvents.GAME_PAUSE : GameEvents.GAME_RESUME);
  }

  private restartGame(): void {
    this.gameOverPanel.setVisible(false);
    this.gameOverMask.setVisible(false);
    this.pausePanel.setVisible(false);
    this.pauseMask.setVisible(false);
    this.isPaused = false;
    this.renderPauseIcon(true);

    this.currentScore = 0;
    this.currentMultiplier = CONFIG.COMBO.BASE_MULTIPLIER;
    this.currentComboStars = 0;

    this.scoreText.setText('0');
    this.comboMultiplierText.setText(`${CONFIG.COMBO.BASE_MULTIPLIER}x`);
    this.comboText.setText(`0/${CONFIG.COMBO.STARS_PER_LEVEL}`);
    const w = this.scale.width;
    const pad = 20 * this.baseScale;
    const comboCardW = 200 * this.baseScale;
    this.renderComboProgress(
      w - comboCardW - pad + 16 * this.baseScale,
      pad + 90 * this.baseScale - 14 * this.baseScale,
      comboCardW - 32 * this.baseScale,
      6 * this.baseScale
    );

    const gameScene = this.scene.get('GameScene') as GameScene;
    gameScene.restartGame();
  }

  private handleResize(): void {
    // 简单处理：不做复杂重排，实际产品可进一步完善
  }

  private cleanup(): void {
    this.game.events.off(GameEvents.SCORE_UPDATE, this.handleScoreUpdate, this);
    this.game.events.off(GameEvents.COMBO_UPDATE, this.handleComboUpdate, this);
    this.game.events.off(GameEvents.GAME_OVER, this.handleGameOver, this);
    this.game.events.off(GameEvents.COMBO_LEVEL_UP, this.handleComboLevelUp, this);
    this.floatingTexts.forEach(t => t.destroy());
    this.floatingTexts = [];
  }
}
