import Phaser from 'phaser';
import TileManager, { TileData } from './TileManager';

type GameState = 'ready' | 'playing' | 'gameover';

const FULCRUM_X = 400;
const FULCRUM_Y = 300;

export default class GameScene extends Phaser.Scene {
  private gameState: GameState = 'ready';
  private tileManager!: TileManager;

  private leverBody!: MatterJS.BodyType;
  private leverSprite!: Phaser.GameObjects.Graphics;
  private leftTrayBody!: MatterJS.BodyType;
  private rightTrayBody!: MatterJS.BodyType;
  private leftTraySprite!: Phaser.GameObjects.Graphics;
  private rightTraySprite!: Phaser.GameObjects.Graphics;
  private fulcrumBase!: Phaser.GameObjects.Graphics;

  private score = 0;
  private level = 1;
  private balanceAngle = 0;
  private balancedTime = 0;
  private scoreTimer = 0;
  private imbalanceTimer = 0;
  private consecutivePulses = 0;
  private isPulseActive = false;
  private pulseForce = 0;
  private pulseDirection: 'left' | 'right' | null = null;
  private pulseActiveTime = 0;
  private isContinuousBalanceMode = false;
  private scoreRate = 2;

  private bgParticles: Phaser.GameObjects.Arc[] = [];
  private brightness = 1;
  private cacheWarningShown = false;

  private scoreText!: Phaser.GameObjects.Text;
  private levelText!: Phaser.GameObjects.Text;
  private balanceBarBg!: Phaser.GameObjects.Graphics;
  private balanceBar!: Phaser.GameObjects.Graphics;
  private balanceIndicator!: Phaser.GameObjects.Graphics;
  private balanceStatusText!: Phaser.GameObjects.Text;
  private pulseInfoText!: Phaser.GameObjects.Text;
  private cacheWarning!: Phaser.GameObjects.Text;

  private readyContainer!: Phaser.GameObjects.Container;
  private startButton!: Phaser.GameObjects.Container;
  private startButtonGlow!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;

  private gameOverContainer!: Phaser.GameObjects.Container;
  private finalScoreText!: Phaser.GameObjects.Text;
  private highestLevelText!: Phaser.GameObjects.Text;
  private replayButton!: Phaser.GameObjects.Container;
  private imbalanceFlash!: Phaser.GameObjects.Graphics;
  private pulseWarningArrow!: Phaser.GameObjects.Graphics;

  private draggingTile: TileData | null = null;
  private dragOffsetX = 0;
  private dragOffsetY = 0;
  private scoreDisplayedFinalScore = 0;
  private brightnessOverlay!: Phaser.GameObjects.Graphics;

  constructor() {
    super('GameScene');
  }

  create(): void {
    this.brightnessOverlay = this.add.graphics();
    this.brightnessOverlay.setDepth(9999);
    this.brightnessOverlay.setScrollFactor(0);
    this.updateBrightnessOverlay();

    this.tileManager = new TileManager(this);
    this.tileManager.setRecycledFullCallback(() => this.onRecycledFull());

    this.createBalance();
    this.createUI();
    this.createReadyScreen();
    this.createGameOverScreen();
    this.setupInput();
    this.scheduleNextPulse();
  }

  private getLevelTheme(): number[] {
    if (this.level <= 3) {
      return [0xff6b35, 0xf7931e, 0xff4500];
    } else if (this.level <= 6) {
      return [0x00CED1, 0x0088cc, 0x00bfff];
    } else if (this.level <= 9) {
      return [0x00ff7f, 0x32cd32, 0x228b22];
    } else {
      const hue = (this.time.now / 50) % 360;
      const c1 = Phaser.Display.Color.HSVToRGB(hue / 360, 0.8, 0.8).color;
      const c2 = Phaser.Display.Color.HSVToRGB(((hue + 60) % 360) / 360, 0.8, 0.8).color;
      return [c1, c2, c1];
    }
  }

  private createBalance(): void {
    const fulcrumPin = this.matter.add.circle(FULCRUM_X, FULCRUM_Y, 15, {
      isStatic: true,
      friction: 1,
      collisionFilter: { category: 0x0001, mask: 0 }
    });

    this.leverBody = this.matter.add.rectangle(FULCRUM_X, FULCRUM_Y, 350, 12, {
      chamfer: { radius: 4 },
      density: 0.002,
      friction: 0.5,
      frictionAir: 0.01,
      collisionFilter: { category: 0x0001, mask: 0x0002 }
    });

    this.matter.add.constraint(fulcrumPin, this.leverBody, 0, 0.999, {
      pointA: { x: 0, y: 0 },
      pointB: { x: 0, y: 0 },
      stiffness: 1,
      damping: 0.1,
      angularStiffness: 0
    });

    const trayOffset = 160;

    this.leftTrayBody = this.matter.add.rectangle(FULCRUM_X - trayOffset, FULCRUM_Y + 40, 100, 12, {
      chamfer: { radius: 4 },
      density: 0.003,
      friction: 0.8,
      collisionFilter: { category: 0x0001, mask: 0x0002 }
    });

    this.rightTrayBody = this.matter.add.rectangle(FULCRUM_X + trayOffset, FULCRUM_Y + 40, 100, 12, {
      chamfer: { radius: 4 },
      density: 0.003,
      friction: 0.8,
      collisionFilter: { category: 0x0001, mask: 0x0002 }
    });

    this.matter.add.constraint(this.leverBody, this.leftTrayBody, 40, 0.9, {
      pointA: { x: -trayOffset + 20, y: 0 },
      pointB: { x: -30, y: 0 },
      stiffness: 0.98,
      damping: 0.05
    });

    this.matter.add.constraint(this.leverBody, this.leftTrayBody, 40, 0.9, {
      pointA: { x: -trayOffset - 20, y: 0 },
      pointB: { x: 30, y: 0 },
      stiffness: 0.98,
      damping: 0.05
    });

    this.matter.add.constraint(this.leverBody, this.rightTrayBody, 40, 0.9, {
      pointA: { x: trayOffset - 20, y: 0 },
      pointB: { x: -30, y: 0 },
      stiffness: 0.98,
      damping: 0.05
    });

    this.matter.add.constraint(this.leverBody, this.rightTrayBody, 40, 0.9, {
      pointA: { x: trayOffset + 20, y: 0 },
      pointB: { x: 30, y: 0 },
      stiffness: 0.98,
      damping: 0.05
    });

    this.fulcrumBase = this.add.graphics();
    this.leverSprite = this.add.graphics();
    this.leftTraySprite = this.add.graphics();
    this.rightTraySprite = this.add.graphics();
    this.pulseWarningArrow = this.add.graphics();
    this.pulseWarningArrow.setVisible(false);
    this.imbalanceFlash = this.add.graphics();
    this.imbalanceFlash.setVisible(false);
  }

  private createUI(): void {
    const scorePanel = this.add.graphics();
    scorePanel.fillStyle(0x000000, 0.4);
    scorePanel.fillRoundedRect(20, 20, 180, 80, 10);
    scorePanel.lineStyle(2, 0x00CED1, 0.5);
    scorePanel.strokeRoundedRect(20, 20, 180, 80, 10);

    this.scoreText = this.add.text(30, 32, '分数: 0', {
      fontFamily: 'Courier New',
      fontSize: '22px',
      color: '#FFA500'
    }).setShadow(2, 2, '#000', 0, true);

    this.levelText = this.add.text(30, 65, '等级: 1', {
      fontFamily: 'Courier New',
      fontSize: '20px',
      color: '#00CED1'
    }).setShadow(2, 2, '#000', 0, true);

    const rightPanel = this.add.graphics();
    rightPanel.fillStyle(0x000000, 0.4);
    rightPanel.fillRoundedRect(800, 20, 180, 80, 10);
    rightPanel.lineStyle(2, 0xFFA500, 0.5);
    rightPanel.strokeRoundedRect(800, 20, 180, 80, 10);

    this.add.text(810, 28, '平衡状态', {
      fontFamily: 'Courier New',
      fontSize: '16px',
      color: '#ffffff'
    }).setOrigin(0, 0).setShadow(2, 2, '#000', 0, true);

    this.balanceBarBg = this.add.graphics();
    this.balanceBar = this.add.graphics();
    this.balanceIndicator = this.add.graphics();

    this.cacheWarning = this.add.text(500, 660, '', {
      fontFamily: 'Courier New',
      fontSize: '18px',
      color: '#ff6b6b'
    }).setOrigin(0.5).setShadow(2, 2, '#000', 0, true).setVisible(false);

    this.balanceStatusText = this.add.text(500, 90, '', {
      fontFamily: 'Courier New',
      fontSize: '18px',
      color: '#FFD700'
    }).setOrigin(0.5).setShadow(2, 2, '#000', 0, true);

    this.pulseInfoText = this.add.text(500, 620, '', {
      fontFamily: 'Courier New',
      fontSize: '16px',
      color: '#FF69B4'
    }).setOrigin(0.5).setShadow(2, 2, '#000', 0, true).setVisible(false);
  }

  private createReadyScreen(): void {
    this.readyContainer = this.add.container(500, 350);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.75);
    bg.fillRect(-500, -350, 1000, 700);

    this.titleText = this.add.text(0, -120, '失衡天平', {
      fontFamily: 'Courier New',
      fontSize: '64px',
      color: '#FFD700',
      fontStyle: 'bold'
    }).setOrigin(0.5).setShadow(4, 4, '#000', 0, true);

    const subtitle = this.add.text(0, -40, '维持平衡 抵御脉冲', {
      fontFamily: 'Courier New',
      fontSize: '24px',
      color: '#00CED1'
    }).setOrigin(0.5).setShadow(2, 2, '#000', 0, true);

    const hint1 = this.add.text(0, 0, '点击托盘上方放置方块 拖拽方块移除', {
      fontFamily: 'Courier New',
      fontSize: '16px',
      color: '#aaaaaa'
    }).setOrigin(0.5).setShadow(1, 1, '#000', 0, true);

    this.startButton = this.add.container(0, 100);
    this.startButtonGlow = this.add.graphics();
    this.startButtonGlow.fillStyle(0xFFA500, 1);
    this.startButtonGlow.fillCircle(0, 0, 50);
    this.startButtonGlow.lineStyle(4, 0xFFD700, 1);
    this.startButtonGlow.strokeCircle(0, 0, 50);

    const startText = this.add.text(0, 0, '开始', {
      fontFamily: 'Courier New',
      fontSize: '28px',
      color: '#1a1a2e',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.startButton.add([this.startButtonGlow, startText]);
    this.startButton.setSize(100, 100);
    this.startButton.setInteractive(
      new Phaser.Geom.Circle(0, 0, 50),
      Phaser.Geom.Circle.Contains
    );

    this.startButton.on('pointerover', () => {
      this.tweens.add({
        targets: this.startButton,
        scaleX: 1.1,
        scaleY: 1.1,
        rotation: Math.PI,
        duration: 300,
        ease: 'Sine.easeInOut'
      });
    });

    this.startButton.on('pointerout', () => {
      this.tweens.add({
        targets: this.startButton,
        scaleX: 1,
        scaleY: 1,
        rotation: 0,
        duration: 300,
        ease: 'Sine.easeInOut'
      });
    });

    this.startButton.on('pointerdown', () => {
      const halo = this.add.graphics();
      this.tweens.addCounter({
        from: 0, to: 1, duration: 600,
        onUpdate: (t) => {
          const haloProgress = t.getValue() || 0;
          halo.clear();
          halo.lineStyle(6 - haloProgress * 6, 0xFFD700, 1 - haloProgress);
          halo.strokeCircle(500, 450, 50 + haloProgress * 100);
        },
        onComplete: () => halo.destroy()
      });
      this.startGame();
    });

    this.readyContainer.add([bg, this.titleText, subtitle, hint1, this.startButton]);
  }

  private createGameOverScreen(): void {
    this.gameOverContainer = this.add.container(500, 350);
    this.gameOverContainer.setVisible(false);

    const bg = this.add.graphics();
    bg.fillStyle(0x000000, 0.85);
    bg.fillRect(-500, -350, 1000, 700);

    const gameOverTitle = this.add.text(0, -150, '游戏结束', {
      fontFamily: 'Courier New',
      fontSize: '56px',
      color: '#ff6b6b',
      fontStyle: 'bold'
    }).setOrigin(0.5).setShadow(4, 4, '#000', 0, true);

    this.finalScoreText = this.add.text(0, -50, '最终分数: 0', {
      fontFamily: 'Courier New',
      fontSize: '36px',
      color: '#FFD700'
    }).setOrigin(0.5).setShadow(3, 3, '#000', 0, true);

    this.highestLevelText = this.add.text(0, 0, '最高等级: 1', {
      fontFamily: 'Courier New',
      fontSize: '28px',
      color: '#00CED1'
    }).setOrigin(0.5).setShadow(2, 2, '#000', 0, true);

    this.replayButton = this.add.container(0, 100);
    this.replayButton.setVisible(false);
    this.replayButton.setAlpha(0);

    const replayBg = this.add.graphics();
    replayBg.fillStyle(0x00CED1, 1);
    replayBg.fillRoundedRect(-80, -30, 160, 60, 12);
    replayBg.lineStyle(3, 0xFFFFFF, 0.8);
    replayBg.strokeRoundedRect(-80, -30, 160, 60, 12);

    const replayText = this.add.text(0, 0, '重新开始', {
      fontFamily: 'Courier New',
      fontSize: '24px',
      color: '#1a1a2e',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.replayButton.add([replayBg, replayText]);
    this.replayButton.setSize(160, 60);
    this.replayButton.setInteractive(
      new Phaser.Geom.Rectangle(-80, -30, 160, 60),
      Phaser.Geom.Rectangle.Contains
    );

    this.replayButton.on('pointerover', () => {
      this.tweens.add({ targets: this.replayButton, scaleX: 1.08, scaleY: 1.08, duration: 200, ease: 'Sine.easeInOut' });
    });

    this.replayButton.on('pointerout', () => {
      this.tweens.add({ targets: this.replayButton, scaleX: 1, scaleY: 1, duration: 200, ease: 'Sine.easeInOut' });
    });

    this.replayButton.on('pointerdown', () => {
      this.restartGame();
    });

    this.gameOverContainer.add([bg, gameOverTitle, this.finalScoreText, this.highestLevelText, this.replayButton]);
  }

  private setupInput(): void {
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.gameState !== 'playing') return;

      const tile = this.tileManager.getTileAtPointer(pointer);
      if (tile) {
        this.draggingTile = tile;
        this.dragOffsetX = tile.sprite.x - pointer.x;
        this.dragOffsetY = tile.sprite.y - pointer.y;
        tile.sprite.setStatic(true);
        tile.isOnTray = false;
      } else {
        if (pointer.y < 480 && pointer.y > 80) {
          const tile = this.tileManager.spawnTile(pointer.x, pointer.y);
          if (tile) {
            this.tileManager.createGravityWave(pointer.x, pointer.y);
          }
        }
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.draggingTile && this.gameState === 'playing') {
        this.draggingTile.sprite.setPosition(
          pointer.x + this.dragOffsetX,
          pointer.y + this.dragOffsetY
        );
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.draggingTile && this.gameState === 'playing') {
        const inGame = this.draggingTile;
        if (
          inGame.sprite.y > 600 ||
          inGame.sprite.y < 60 ||
          inGame.sprite.x < 80 ||
          inGame.sprite.x > 920 ||
          inGame.sprite.y > 520
        ) {
          this.tileManager.removeTile(inGame, true);
        } else {
          inGame.sprite.setStatic(false);
          inGame.sprite.setVelocity(0, 0);
          inGame.sprite.setAngularVelocity(0);
        }
        this.draggingTile = null;
      }
    });

    this.input.keyboard!.on('keydown-C', () => {
      if (this.cacheWarningShown) {
        this.clearCacheWarning();
      }
    });
  }

  private startGame(): void {
    this.gameState = 'playing';
    this.readyContainer.setVisible(false);
    this.score = 0;
    this.level = 1;
    this.balancedTime = 0;
    this.scoreTimer = 0;
    this.imbalanceTimer = 0;
    this.consecutivePulses = 0;
    this.isContinuousBalanceMode = false;
    this.brightness = 1;
    this.cacheWarningShown = false;
    this.scoreRate = 2;
    this.updateScoreDisplay();
    this.updateLevelDisplay();
    this.updateBackgroundParticles();
    this.balanceStatusText.setText('');
    this.scheduleNextPulse();
  }

  private restartGame(): void {
    this.gameOverContainer.setVisible(false);

    this.tileManager.getActiveTiles().slice().forEach(tile => {
      this.tileManager.removeTile(tile, false);
    });
    this.tileManager.clearRecycled();

    const matter = this.matter;
    matter.body.setPosition(this.leverBody, { x: FULCRUM_X, y: FULCRUM_Y });
    matter.body.setAngle(this.leverBody, 0);
    matter.body.setVelocity(this.leverBody, { x: 0, y: 0 });
    matter.body.setAngularVelocity(this.leverBody, 0);

    matter.body.setPosition(this.leftTrayBody, { x: FULCRUM_X - 160, y: FULCRUM_Y + 40 });
    matter.body.setAngle(this.leftTrayBody, 0);
    matter.body.setVelocity(this.leftTrayBody, { x: 0, y: 0 });
    matter.body.setAngularVelocity(this.leftTrayBody, 0);

    matter.body.setPosition(this.rightTrayBody, { x: FULCRUM_X + 160, y: FULCRUM_Y + 40 });
    matter.body.setAngle(this.rightTrayBody, 0);
    matter.body.setVelocity(this.rightTrayBody, { x: 0, y: 0 });
    matter.body.setAngularVelocity(this.rightTrayBody, 0);

    this.startGame();
  }

  private scheduleNextPulse(): void {
    const delay = Phaser.Math.Between(8000, 12000);
    this.time.delayedCall(delay, () => {
      if (this.gameState === 'playing') {
        this.showPulseWarning();
      }
    });
  }

  private showPulseWarning(): void {
    this.pulseDirection = Math.random() < 0.5 ? 'left' : 'right';
    this.pulseForce = Phaser.Math.Between(2, 6);
    this.pulseWarningArrow.setVisible(true);
    this.pulseInfoText.setVisible(true);
    this.pulseInfoText.setText('脉冲预警: ' + (this.pulseDirection === 'left' ? '← 左侧' : '右侧 →'));

    const startTime = this.time.now;
    const warnEvent = this.time.addEvent({
      delay: 16,
      loop: true,
      callback: () => {
        const elapsed = this.time.now - startTime;
        const alpha = 0.3 + 0.5 * Math.abs(Math.sin(elapsed / 100));
        this.pulseWarningArrow.clear();
        const arrowX = this.pulseDirection === 'left' ? 200 : 800;
        const arrowDir = this.pulseDirection === 'left' ? 1 : -1;
        this.pulseWarningArrow.lineStyle(6, 0xFF69B4, alpha);
        this.pulseWarningArrow.beginPath();
        this.pulseWarningArrow.moveTo(arrowX, 430);
        this.pulseWarningArrow.lineTo(arrowX + arrowDir * 60, 400);
        this.pulseWarningArrow.moveTo(arrowX, 430);
        this.pulseWarningArrow.lineTo(arrowX + arrowDir * 60, 460);
        this.pulseWarningArrow.moveTo(arrowX, 430);
        this.pulseWarningArrow.lineTo(arrowX + arrowDir * 60, 430);
        this.pulseWarningArrow.strokePath();
        if (elapsed >= 1000 || this.gameState !== 'playing') {
          warnEvent.remove(false);
          this.pulseWarningArrow.clear();
          this.pulseWarningArrow.setVisible(false);
          if (this.gameState === 'playing') {
            this.activatePulse();
          }
        }
      }
    });
  }

  private activatePulse(): void {
    this.isPulseActive = true;
    this.pulseActiveTime = 1500;
    this.pulseInfoText.setText('脉冲激活!');
  }

  private onPulseComplete(): void {
    this.isPulseActive = false;
    this.consecutivePulses++;
    this.score += 50;
    this.updateScoreDisplay();
    this.updateLevelDisplay();

    if (this.consecutivePulses >= 5 && !this.isContinuousBalanceMode) {
      this.isContinuousBalanceMode = true;
      this.scoreRate = 4;
      this.balanceStatusText.setText('★ 持续平衡模式 ★ 得分翻倍!');
    }

    this.time.delayedCall(1500, () => {
      this.pulseInfoText.setVisible(false);
    });

    this.scheduleNextPulse();
  }

  private onRecycledFull(): void {
    if (!this.cacheWarningShown) {
      this.cacheWarningShown = true;
      this.brightness = 0.9;
      this.cacheWarning.setVisible(true);
      this.cacheWarning.setText('⚠ 按 C 清理缓存 - 回收池已满');
    }
  }

  private clearCacheWarning(): void {
    this.tileManager.clearRecycled();
    this.cacheWarningShown = false;
    this.brightness = 1;
    this.cacheWarning.setVisible(false);
  }

  private updateScoreDisplay(): void {
    this.scoreText.setText('分数: ' + Math.floor(this.score));
  }

  private updateLevelDisplay(): void {
    const newLevel = Math.floor(this.score / 200) + 1;
    if (newLevel > this.level) {
      this.level = newLevel;
      this.levelText.setText('等级: ' + this.level);
      this.updateBackgroundParticles();
    }
  }

  private updateBackgroundParticles(): void {
    const targetCount = Math.min(this.level * 10, 100);

    this.bgParticles.forEach(p => p.destroy());
    this.bgParticles = [];

    for (let i = 0; i < targetCount; i++) {
      const theme = this.getLevelTheme();
      const color = theme[i % theme.length];
      const particle = this.add.circle(
        Phaser.Math.Between(0, 1000),
        Phaser.Math.Between(0, 700),
        Phaser.Math.Between(2, 6),
        color,
        0.5
      );
      (particle as any).vx = Phaser.Math.FloatBetween(-0.5, 0.5);
      (particle as any).vy = Phaser.Math.FloatBetween(-0.3, 0.3);
      this.bgParticles.push(particle);
    }
  }

  private updateBalanceBar(): void {
    const barX = 810;
    const barY = 58;
    const barWidth = 160;
    const barHeight = 20;

    this.balanceBarBg.clear();
    this.balanceBarBg.fillStyle(0x333333, 0.8);
    this.balanceBarBg.fillRoundedRect(barX, barY, barWidth, barHeight, 10);

    this.balanceBar.clear();
    const absAngle = Math.min(Math.abs(this.balanceAngleDeg), 45);
    const fillWidth = (absAngle / 45) * (barWidth / 2);
    const centerX = barX + barWidth / 2;

    const t = absAngle / 45;
    const r = Math.floor(Phaser.Math.Linear(0, 255, t));
    const g = Math.floor(Phaser.Math.Linear(255, 0, t));
    const b = 0;
    const barColor = Phaser.Display.Color.GetColor(r, g, b);

    if (this.balanceAngleDeg >= 0) {
      this.balanceBar.fillStyle(barColor, 1);
      this.balanceBar.fillRoundedRect(centerX, barY, fillWidth, barHeight, 10);
    } else {
      this.balanceBar.fillStyle(barColor, 1);
      this.balanceBar.fillRoundedRect(centerX - fillWidth, barY, fillWidth, barHeight, 10);
    }

    this.balanceIndicator.clear();
    this.balanceIndicator.fillStyle(0xffffff, 1);
    this.balanceIndicator.fillRect(centerX - 1, barY - 2, 2, barHeight + 4);
  }

  private get balanceAngleDeg(): number {
    return Phaser.Math.RadToDeg(this.balanceAngle);
  }

  update(_time: number, delta: number): void {
    if (this.gameState !== 'playing') return;

    this.balanceAngle = this.leverBody.angle;
    const absAngle = Math.abs(this.balanceAngleDeg);

    if (this.isPulseActive) {
      this.pulseActiveTime -= delta;
      const forceSign = this.pulseDirection === 'left' ? -1 : 1;
      const force = this.pulseForce * 0.015;

      if (this.pulseDirection === 'left') {
        this.matter.body.applyForce(
          this.leftTrayBody,
          { x: this.leftTrayBody.position.x, y: this.leftTrayBody.position.y },
          { x: force * forceSign, y: 0 }
        );
      } else {
        this.matter.body.applyForce(
          this.rightTrayBody,
          { x: this.rightTrayBody.position.x, y: this.rightTrayBody.position.y },
          { x: force * forceSign, y: 0 }
        );
      }

      if (this.pulseActiveTime <= 0) {
        this.onPulseComplete();
      }
    }

    if (absAngle <= 5) {
      this.balancedTime += delta;
      this.scoreTimer += delta;
      const interval = this.isContinuousBalanceMode ? 250 : 500;
      if (this.scoreTimer >= interval) {
        this.scoreTimer = 0;
        this.score += this.isContinuousBalanceMode ? 2 : 1;
        this.updateScoreDisplay();
        this.updateLevelDisplay();
      }
    } else {
      this.balancedTime = 0;
    }

    if (absAngle > 45) {
      this.imbalanceTimer += delta;
      this.showImbalanceWarning();
      this.game.loop.targetFps = 30;
      if (this.imbalanceTimer >= 3000) {
        this.endGame();
      }
    } else {
      this.imbalanceTimer = 0;
      this.imbalanceFlash.setVisible(false);
      this.game.loop.targetFps = 60;
    }

    this.tileManager.updateActiveTiles(delta);
    this.tileManager.updateTileStackLevels(
      this.leftTrayBody.position.y,
      this.rightTrayBody.position.y,
      this.leftTrayBody.position.x,
      this.rightTrayBody.position.x
    );

    this.updateBalanceGraphics();
    this.updateBalanceBar();

    this.bgParticles.forEach(p => {
      p.x += (p as any).vx || 0;
      p.y += (p as any).vy || 0;
      if (p.x < 0) p.x = 1000;
      if (p.x > 1000) p.x = 0;
      if (p.y < 0) p.y = 700;
      if (p.y > 700) p.y = 0;
    });

    this.cameras.main;
    this.updateBrightnessOverlay();
  }

  private showImbalanceWarning(): void {
    this.imbalanceFlash.setVisible(true);
    const alpha = 0.3 + 0.4 * Math.abs(Math.sin(this.time.now / 100));
    this.imbalanceFlash.clear();
    this.imbalanceFlash.lineStyle(16, 0xff0000, alpha);
    this.imbalanceFlash.strokeRect(0, 0, 1000, 700);
  }

  private updateBalanceGraphics(): void {
    const theme = this.getLevelTheme();
    const leverMainColor = theme[0];
    const leverEdgeColor = this.isContinuousBalanceMode ? 0xFFD700 : theme[1];

    this.fulcrumBase.clear();
    this.fulcrumBase.fillStyle(0x00ced1);
    this.fulcrumBase.fillTriangle(
      FULCRUM_X - 30, FULCRUM_Y + 130,
      FULCRUM_X + 30, FULCRUM_Y + 130,
      FULCRUM_X, FULCRUM_Y + 40
    );
    this.fulcrumBase.lineStyle(3, 0x00ced1, 0.9);
    this.fulcrumBase.strokeTriangle(
      FULCRUM_X - 30, FULCRUM_Y + 130,
      FULCRUM_X + 30, FULCRUM_Y + 130,
      FULCRUM_X, FULCRUM_Y + 40
    );
    this.fulcrumBase.fillStyle(0xFFD700, 1);
    this.fulcrumBase.fillCircle(FULCRUM_X, FULCRUM_Y, 14);
    this.fulcrumBase.lineStyle(2, 0xffffff, 0.7);
    this.fulcrumBase.strokeCircle(FULCRUM_X, FULCRUM_Y, 14);

    this.leverSprite.clear();
    const lx = this.leverBody.position.x;
    const ly = this.leverBody.position.y;
    const langle = this.leverBody.angle;
    this.leverSprite.save();
    this.leverSprite.translateCanvas(lx, ly);
    this.leverSprite.rotateCanvas(langle);
    this.leverSprite.fillStyle(leverMainColor, 1);
    this.leverSprite.lineStyle(3, leverEdgeColor, 0.9);
    this.leverSprite.fillRoundedRect(-175, -6, 350, 12, 4);
    this.leverSprite.strokeRoundedRect(-175, -6, 350, 12, 4);
    if (this.isContinuousBalanceMode) {
      this.leverSprite.lineStyle(2, 0xFFFFFF, 0.6);
      this.leverSprite.strokeRoundedRect(-173, -4, 346, 8, 3);
    }
    this.leverSprite.restore();

    this.leftTraySprite.clear();
    const ltx = this.leftTrayBody.position.x;
    const lty = this.leftTrayBody.position.y;
    const ltangle = this.leftTrayBody.angle;
    this.leftTraySprite.save();
    this.leftTraySprite.translateCanvas(ltx, lty);
    this.leftTraySprite.rotateCanvas(ltangle);
    this.leftTraySprite.fillStyle(0x00ced1, 1);
    this.leftTraySprite.lineStyle(2, 0x00ced1, 0.9);
    this.leftTraySprite.fillRoundedRect(-50, -6, 100, 12, 4);
    this.leftTraySprite.strokeRoundedRect(-50, -6, 100, 12, 4);
    this.leftTraySprite.restore();

    this.rightTraySprite.clear();
    const rtx = this.rightTrayBody.position.x;
    const rty = this.rightTrayBody.position.y;
    const rtangle = this.rightTrayBody.angle;
    this.rightTraySprite.save();
    this.rightTraySprite.translateCanvas(rtx, rty);
    this.rightTraySprite.rotateCanvas(rtangle);
    this.rightTraySprite.fillStyle(0xFFA500, 1);
    this.rightTraySprite.lineStyle(2, 0xFFA500, 0.9);
    this.rightTraySprite.fillRoundedRect(-50, -6, 100, 12, 4);
    this.rightTraySprite.strokeRoundedRect(-50, -6, 100, 12, 4);
    this.rightTraySprite.restore();
  }

  private endGame(): void {
    this.gameState = 'gameover';
    this.gameOverContainer.setVisible(true);
    this.highestLevelText.setText('最高等级: ' + this.level);
    this.balanceStatusText.setText('');
    this.pulseInfoText.setVisible(false);
    this.imbalanceFlash.setVisible(false);

    this.tweens.addCounter({
      from: 0,
      to: this.score,
      duration: 1500,
      ease: 'Cubic.Out',
      onUpdate: (tween) => {
        this.scoreDisplayedFinalScore = Math.floor(tween.getValue() || 0);
        this.finalScoreText.setText('最终分数: ' + this.scoreDisplayedFinalScore);
      },
      onComplete: () => {
        this.replayButton.setVisible(true);
        this.tweens.add({
          targets: this.replayButton,
          alpha: 1,
          duration: 500,
          ease: 'Cubic.Out'
        });
      }
    });
  }

  private updateBrightnessOverlay(): void {
    this.brightnessOverlay.clear();
    const darkness = 1 - this.brightness;
    if (darkness > 0) {
      this.brightnessOverlay.fillStyle(0x000000, darkness);
      this.brightnessOverlay.fillRect(0, 0, 1000, 700);
    }
  }
}
