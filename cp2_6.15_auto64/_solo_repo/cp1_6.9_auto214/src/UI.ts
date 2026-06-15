import Phaser from 'phaser';
import { GameScene } from './main';

export class UIManager {
  private scene: GameScene;
  private container!: Phaser.GameObjects.Container;

  private energyBarBg!: Phaser.GameObjects.Graphics;
  private energyBar!: Phaser.GameObjects.Graphics;
  private energyBarBorder!: Phaser.GameObjects.Graphics;
  private energyText!: Phaser.GameObjects.Text;
  private energyLabel!: Phaser.GameObjects.Text;

  private scoreText!: Phaser.GameObjects.Text;
  private scoreLabel!: Phaser.GameObjects.Text;
  private scorePanel!: Phaser.GameObjects.Graphics;

  private livesContainer!: Phaser.GameObjects.Container;
  private livesIcons: Phaser.GameObjects.Graphics[] = [];

  private pauseButton!: Phaser.GameObjects.Container;
  private pauseIcon!: Phaser.GameObjects.Graphics;
  private pauseBlinkTimer: number = 0;

  private pauseOverlay!: Phaser.GameObjects.Graphics;
  private pauseMenu!: Phaser.GameObjects.Container;
  private resumeBtn!: Phaser.GameObjects.Container;
  private restartBtn!: Phaser.GameObjects.Container;

  private gameOverOverlay!: Phaser.GameObjects.Graphics;
  private gameOverMenu!: Phaser.GameObjects.Container;
  private finalScoreText!: Phaser.GameObjects.Text;
  private gameOverRestartBtn!: Phaser.GameObjects.Container;

  private panelPadding: number = 16;

  constructor(scene: GameScene) {
    this.scene = scene;
    this.createUI();
  }

  private createUI(): void {
    this.container = this.scene.add.container(0, 0);
    this.container.setDepth(200);
    this.container.setScrollFactor(0);

    this.createEnergyBar();
    this.createScorePanel();
    this.createLivesDisplay();
    this.createPauseButton();
    this.createPauseMenu();
    this.createGameOverMenu();
  }

  private createGlassPanel(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    width: number,
    height: number,
    radius: number = 12
  ): void {
    graphics.clear();
    graphics.fillStyle(0x0a0a1a, 0.55);
    graphics.fillRoundedRect(x, y, width, height, radius);

    graphics.lineStyle(1.5, 0x88aaff, 0.35);
    graphics.strokeRoundedRect(x, y, width, height, radius);

    graphics.lineStyle(1, 0xaaddff, 0.15);
    graphics.strokeRoundedRect(x + 2, y + 2, width - 4, height - 4, radius - 2);
  }

  private createEnergyBar(): void {
    const x = 24;
    const y = 24;
    const width = 280;
    const height = 42;

    this.energyBarBg = this.scene.add.graphics();
    this.energyBarBg.setDepth(201);
    this.energyBarBg.setScrollFactor(0);

    this.energyBar = this.scene.add.graphics();
    this.energyBar.setDepth(202);
    this.energyBar.setScrollFactor(0);

    this.energyBarBorder = this.scene.add.graphics();
    this.energyBarBorder.setDepth(203);
    this.energyBarBorder.setScrollFactor(0);

    this.createGlassPanel(this.energyBarBg, x, y, width, height, 10);

    this.energyLabel = this.scene.add.text(x + 14, y + 5, '能量', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#88bbff',
      fontStyle: 'bold'
    });
    this.energyLabel.setDepth(204);
    this.energyLabel.setScrollFactor(0);

    this.energyText = this.scene.add.text(x + width - 60, y + 5, '0%', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '13px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    this.energyText.setDepth(204);
    this.energyText.setScrollFactor(0);
    this.energyText.setOrigin(1, 0);

    this.updateEnergy(0);
  }

  public updateEnergy(energy: number): void {
    const x = 24 + 10;
    const y = 24 + 24;
    const maxWidth = 280 - 20;
    const barHeight = 10;
    const radius = 5;

    this.energyBar.clear();
    this.energyBarBorder.clear();

    this.energyBar.fillStyle(0x1a1a3a, 0.8);
    this.energyBar.fillRoundedRect(x, y, maxWidth, barHeight, radius);

    const fillWidth = Math.max(0, (energy / 100) * maxWidth);

    if (fillWidth > 0) {
      let c1: number, c2: number, cMid: number;

      if (energy < 20) {
        c1 = 0xff3c3c; cMid = 0xff5555; c2 = 0xff6464;
      } else if (energy < 50) {
        c1 = 0xffb43c; cMid = 0xffa044; c2 = 0xff8c50;
      } else if (energy < 85) {
        c1 = 0x64b4ff; cMid = 0x50a0ff; c2 = 0x3c8cff;
      } else {
        c1 = 0x64dcff; cMid = 0x50c8ff; c2 = 0x3ca0ff;
      }

      const segW = Math.max(1, Math.floor(fillWidth / 3));

      this.energyBar.fillStyle(c1, 0.95);
      this.energyBar.fillRoundedRect(x, y, Math.min(segW + 2, fillWidth), barHeight, radius);
      if (fillWidth > segW * 2) {
        this.energyBar.fillStyle(cMid, 0.95);
        this.energyBar.fillRect(x + segW, y, segW, barHeight);
        this.energyBar.fillStyle(c2, 0.95);
        this.energyBar.fillRoundedRect(x + segW * 2, y, fillWidth - segW * 2, barHeight, radius);
      } else if (fillWidth > segW) {
        this.energyBar.fillStyle(cMid, 0.95);
        this.energyBar.fillRoundedRect(x + segW, y, fillWidth - segW, barHeight, radius);
      }

      this.energyBar.fillStyle(0xffffff, 0.28);
      this.energyBar.fillRoundedRect(x + 2, y + 1, fillWidth - 4, barHeight / 2 - 1, radius - 1);

      this.energyBarBorder.lineStyle(1.5, 0xffffff, 0.6);
      this.energyBarBorder.strokeRoundedRect(x, y, fillWidth, barHeight, radius);
    }

    if (energy >= 100) {
      this.pauseBlinkTimer += 0.016;
      const pulse = 0.7 + Math.sin(this.pauseBlinkTimer * 8) * 0.3;
      this.energyBarBorder.lineStyle(2.5, 0xffff66, pulse);
      this.energyBarBorder.strokeRoundedRect(x - 1, y - 1, maxWidth + 2, barHeight + 2, radius + 1);
    }

    this.energyText.setText(`${Math.floor(energy)}%`);

    if (energy < 20) {
      this.energyText.setColor('#ff6666');
    } else if (energy >= 100) {
      this.energyText.setColor('#ffff88');
    } else {
      this.energyText.setColor('#ffffff');
    }
  }

  private createScorePanel(): void {
    const width = this.scene.scale.width;
    const panelWidth = 180;
    const panelHeight = 52;
    const x = width - panelWidth - 24;
    const y = 24;

    this.scorePanel = this.scene.add.graphics();
    this.scorePanel.setDepth(201);
    this.scorePanel.setScrollFactor(0);
    this.createGlassPanel(this.scorePanel, x, y, panelWidth, panelHeight, 10);

    this.scoreLabel = this.scene.add.text(x + 16, y + 6, '得分', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '12px',
      color: '#88bbff',
      fontStyle: 'bold'
    });
    this.scoreLabel.setDepth(204);
    this.scoreLabel.setScrollFactor(0);

    this.scoreText = this.scene.add.text(x + panelWidth - 16, y + 26, '0', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '24px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    this.scoreText.setDepth(204);
    this.scoreText.setScrollFactor(0);
    this.scoreText.setOrigin(1, 0.5);
  }

  public updateScore(score: number): void {
    this.scoreText.setText(score.toString());
    this.scene.tweens.add({
      targets: this.scoreText,
      scale: { from: 1.3, to: 1 },
      duration: 180,
      ease: 'Cubic.easeOut'
    });
  }

  private createLivesDisplay(): void {
    this.livesContainer = this.scene.add.container(24, 80);
    this.livesContainer.setDepth(201);
    this.livesContainer.setScrollFactor(0);

    for (let i = 0; i < 3; i++) {
      const icon = this.scene.add.graphics();
      icon.x = i * 34;
      this.drawHeartIcon(icon, true);
      this.livesIcons.push(icon);
      this.livesContainer.add(icon);
    }
  }

  private drawHeartIcon(graphics: Phaser.GameObjects.Graphics, active: boolean): void {
    graphics.clear();
    const size = 12;
    const color = active ? 0xff4466 : 0x333344;
    const alpha = active ? 1 : 0.5;

    graphics.fillStyle(color, alpha);
    graphics.lineStyle(2, active ? 0xff8899 : 0x555566, alpha);

    graphics.beginPath();
    graphics.moveTo(0, size * 0.3);
    graphics.bezierCurveTo(-size, -size * 0.5, -size * 1.2, size * 0.5, 0, size * 1.1);
    graphics.bezierCurveTo(size * 1.2, size * 0.5, size, -size * 0.5, 0, size * 0.3);
    graphics.fillPath();
    graphics.strokePath();

    if (active) {
      graphics.fillStyle(0xffaabb, 0.6);
      graphics.beginPath();
      graphics.arc(-size * 0.3, 0, size * 0.2, 0, Math.PI * 2);
      graphics.fillPath();
    }
  }

  public updateLives(lives: number): void {
    this.livesIcons.forEach((icon, i) => {
      this.drawHeartIcon(icon, i < lives);
    });

    this.scene.tweens.add({
      targets: this.livesContainer,
      scale: { from: 1.2, to: 1 },
      x: { from: 34, to: 24 },
      duration: 250,
      ease: 'Cubic.easeOut'
    });
  }

  private createPauseButton(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    this.pauseButton = this.scene.add.container(width / 2, height - 40);
    this.pauseButton.setDepth(201);
    this.pauseButton.setScrollFactor(0);
    this.pauseButton.setSize(48, 48);
    this.pauseButton.setInteractive(
      new Phaser.Geom.Rectangle(-24, -24, 48, 48),
      Phaser.Geom.Rectangle.Contains
    );

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x0a0a1a, 0.55);
    bg.fillCircle(0, 0, 26);
    bg.lineStyle(1.5, 0x88aaff, 0.35);
    bg.strokeCircle(0, 0, 26);
    this.pauseButton.add(bg);

    this.pauseIcon = this.scene.add.graphics();
    this.drawPauseIcon(this.pauseIcon, 1);
    this.pauseButton.add(this.pauseIcon);

    this.pauseButton.on('pointerover', () => {
      this.scene.tweens.add({
        targets: this.pauseButton,
        scale: { from: this.pauseButton.scale, to: 1.15 },
        duration: 180,
        ease: 'Cubic.easeOut'
      });
    });

    this.pauseButton.on('pointerout', () => {
      this.scene.tweens.add({
        targets: this.pauseButton,
        scale: { from: this.pauseButton.scale, to: 1 },
        duration: 180,
        ease: 'Cubic.easeOut'
      });
    });

    this.pauseButton.on('pointerdown', () => {
      this.scene.tweens.add({
        targets: this.pauseButton,
        scale: { from: 1.15, to: 0.9 },
        duration: 100,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          this.scene.tweens.add({
            targets: this.pauseButton,
            scale: { from: 0.9, to: 1 },
            duration: 120,
            ease: 'Cubic.easeOut'
          });
          if (!this.scene.isGameOver) {
            this.scene.togglePause();
          }
        }
      });
    });
  }

  private drawPauseIcon(graphics: Phaser.GameObjects.Graphics, alpha: number): void {
    graphics.clear();
    graphics.fillStyle(0xffffff, alpha);
    graphics.fillRoundedRect(-9, -11, 6, 22, 2);
    graphics.fillRoundedRect(3, -11, 6, 22, 2);
  }

  private createPauseMenu(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    this.pauseOverlay = this.scene.add.graphics();
    this.pauseOverlay.setDepth(250);
    this.pauseOverlay.setScrollFactor(0);
    this.pauseOverlay.fillStyle(0x000000, 0.7);
    this.pauseOverlay.fillRect(0, 0, width, height);
    this.pauseOverlay.setVisible(false);

    this.pauseMenu = this.scene.add.container(width / 2, height / 2);
    this.pauseMenu.setDepth(251);
    this.pauseMenu.setScrollFactor(0);
    this.pauseMenu.setVisible(false);
    this.pauseMenu.setAlpha(0);

    const menuBg = this.scene.add.graphics();
    this.createGlassPanel(menuBg, -180, -160, 360, 320, 20);
    this.pauseMenu.add(menuBg);

    const title = this.scene.add.text(0, -110, '游戏暂停', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '32px',
      color: '#88bbff',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    this.pauseMenu.add(title);

    const subtitle = this.scene.add.text(0, -70, '按 ESC 或点击按钮继续', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#6688bb'
    });
    subtitle.setOrigin(0.5);
    this.pauseMenu.add(subtitle);

    this.resumeBtn = this.createButton('继续游戏', 0, -10, () => {
      this.scene.togglePause();
    });
    this.pauseMenu.add(this.resumeBtn);

    this.restartBtn = this.createButton('重新开始', 0, 60, () => {
      this.scene.restartGame();
    });
    this.pauseMenu.add(this.restartBtn);
  }

  private createButton(
    label: string,
    x: number,
    y: number,
    callback: () => void
  ): Phaser.GameObjects.Container {
    const container = this.scene.add.container(x, y);
    container.setSize(220, 52);

    const btnWidth = 220;
    const btnHeight = 52;
    const radius = 12;

    const bg = this.scene.add.graphics();
    bg.fillStyle(0x1a1a3a, 0.8);
    bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, radius);
    bg.lineStyle(2, 0x66aaff, 0.6);
    bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, radius);
    container.add(bg);

    const text = this.scene.add.text(0, 0, label, {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '18px',
      color: '#ffffff',
      fontStyle: 'bold'
    });
    text.setOrigin(0.5);
    container.add(text);

    container.setInteractive(
      new Phaser.Geom.Rectangle(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight),
      Phaser.Geom.Rectangle.Contains
    );

    container.on('pointerover', () => {
      this.scene.tweens.add({
        targets: container,
        scale: { from: container.scale, to: 1.06 },
        duration: 160,
        ease: 'Cubic.easeOut'
      });
      bg.clear();
      bg.fillStyle(0x2a2a5a, 0.9);
      bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, radius);
      bg.lineStyle(2.5, 0x88ccff, 0.9);
      bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, radius);
    });

    container.on('pointerout', () => {
      this.scene.tweens.add({
        targets: container,
        scale: { from: container.scale, to: 1 },
        duration: 160,
        ease: 'Cubic.easeOut'
      });
      bg.clear();
      bg.fillStyle(0x1a1a3a, 0.8);
      bg.fillRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, radius);
      bg.lineStyle(2, 0x66aaff, 0.6);
      bg.strokeRoundedRect(-btnWidth / 2, -btnHeight / 2, btnWidth, btnHeight, radius);
    });

    container.on('pointerdown', () => {
      this.scene.tweens.add({
        targets: container,
        scale: { from: 1.06, to: 0.95 },
        duration: 90,
        ease: 'Cubic.easeIn',
        onComplete: () => {
          this.scene.tweens.add({
            targets: container,
            scale: { from: 0.95, to: 1 },
            duration: 110,
            ease: 'Cubic.easeOut',
            onComplete: () => callback()
          });
        }
      });
    });

    return container;
  }

  public showPauseMenu(): void {
    this.pauseOverlay.setVisible(true);
    this.pauseMenu.setVisible(true);
    this.scene.tweens.add({
      targets: this.pauseMenu,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.9, to: 1 },
      duration: 250,
      ease: 'Cubic.easeOut'
    });
  }

  public hidePauseMenu(): void {
    this.scene.tweens.add({
      targets: this.pauseMenu,
      alpha: { from: 1, to: 0 },
      scale: { from: 1, to: 0.9 },
      duration: 200,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.pauseOverlay.setVisible(false);
        this.pauseMenu.setVisible(false);
      }
    });
  }

  private createGameOverMenu(): void {
    const width = this.scene.scale.width;
    const height = this.scene.scale.height;

    this.gameOverOverlay = this.scene.add.graphics();
    this.gameOverOverlay.setDepth(260);
    this.gameOverOverlay.setScrollFactor(0);
    this.gameOverOverlay.fillStyle(0x000000, 0.82);
    this.gameOverOverlay.fillRect(0, 0, width, height);
    this.gameOverOverlay.setVisible(false);

    this.gameOverMenu = this.scene.add.container(width / 2, height / 2);
    this.gameOverMenu.setDepth(261);
    this.gameOverMenu.setScrollFactor(0);
    this.gameOverMenu.setVisible(false);
    this.gameOverMenu.setAlpha(0);

    const menuBg = this.scene.add.graphics();
    this.createGlassPanel(menuBg, -200, -180, 400, 360, 22);
    this.gameOverMenu.add(menuBg);

    const title = this.scene.add.text(0, -120, '游戏结束', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '36px',
      color: '#ff6688',
      fontStyle: 'bold'
    });
    title.setOrigin(0.5);
    this.gameOverMenu.add(title);

    const scoreLabel = this.scene.add.text(0, -50, '最终得分', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '16px',
      color: '#88aacc',
      fontStyle: 'bold'
    });
    scoreLabel.setOrigin(0.5);
    this.gameOverMenu.add(scoreLabel);

    this.finalScoreText = this.scene.add.text(0, -5, '0', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '52px',
      color: '#ffffaa',
      fontStyle: 'bold'
    });
    this.finalScoreText.setOrigin(0.5);
    this.finalScoreText.setShadow(0, 4, 0x000000, 0.5);
    this.gameOverMenu.add(this.finalScoreText);

    const tip = this.scene.add.text(0, 55, '不要放弃，再试一次！', {
      fontFamily: 'system-ui, sans-serif',
      fontSize: '14px',
      color: '#6688aa'
    });
    tip.setOrigin(0.5);
    this.gameOverMenu.add(tip);

    this.gameOverRestartBtn = this.createButton('重新开始', 0, 105, () => {
      this.scene.restartGame();
    });
    this.gameOverMenu.add(this.gameOverRestartBtn);
  }

  public showGameOver(score: number): void {
    this.finalScoreText.setText(score.toString());
    this.gameOverOverlay.setVisible(true);
    this.gameOverMenu.setVisible(true);

    this.scene.tweens.add({
      targets: this.gameOverMenu,
      alpha: { from: 0, to: 1 },
      scale: { from: 0.85, to: 1 },
      duration: 400,
      ease: 'Cubic.easeOut',
      delay: 300
    });

    this.scene.tweens.addCounter({
      from: 0,
      to: score,
      duration: 1200,
      ease: 'Cubic.easeOut',
      delay: 400,
      onUpdate: (t) => {
        this.finalScoreText.setText(Math.floor(t.getValue() as number).toString());
      }
    });
  }

  public hideGameOver(): void {
    this.scene.tweens.add({
      targets: this.gameOverMenu,
      alpha: { from: 1, to: 0 },
      scale: { from: 1, to: 0.85 },
      duration: 200,
      ease: 'Cubic.easeIn',
      onComplete: () => {
        this.gameOverOverlay.setVisible(false);
        this.gameOverMenu.setVisible(false);
      }
    });
  }

  update(_delta: number): void {
    if (this.scene.isPaused || this.scene.isGameOver) return;

    this.pauseBlinkTimer += 0.016;
    const blink = 0.6 + Math.sin(this.pauseBlinkTimer * 3) * 0.4;
    this.pauseIcon.setAlpha(blink);

    if (this.scene.player.energy >= 100) {
      this.updateEnergy(this.scene.player.energy);
    }
  }
}
