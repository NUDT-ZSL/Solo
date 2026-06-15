import Phaser from 'phaser';
import {
  CellState,
  BoardData,
  generateBoard,
  flipCellState,
  findLines,
} from '../utils/boardGenerator';
import {
  GAME_WIDTH,
  GAME_HEIGHT,
  DEFAULT_BOARD_SIZE,
  DEFAULT_FLUCTUATION_SPEED,
  GAME_DURATION,
  CELL_PADDING,
  COLORS,
  ANIMATION,
  SCORE_PER_LINE,
  LINE_LENGTH,
  SCENES,
} from '../utils/constants';

interface CellSprite {
  bg: Phaser.GameObjects.Graphics;
  glow: Phaser.GameObjects.Graphics;
  container: Phaser.GameObjects.Container;
  data: { row: number; col: number };
}

export class GameScene extends Phaser.Scene {
  private boardData!: BoardData;
  private cellSprites: CellSprite[][] = [];
  private cellSize: number = 0;
  private boardOffsetX: number = 0;
  private boardOffsetY: number = 0;
  private score: number = 0;
  private timeLeft: number = GAME_DURATION;
  private timerEvent!: Phaser.Time.TimerEvent;
  private fluctuationSpeed: number = DEFAULT_FLUCTUATION_SPEED;
  private boardSize: number = DEFAULT_BOARD_SIZE;
  private isProcessing: boolean = false;
  private scoreText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private gameOverOverlay!: Phaser.GameObjects.Container;
  private isGameOver: boolean = false;
  private ripples: Phaser.GameObjects.Graphics[] = [];

  constructor() {
    super({ key: SCENES.GAME });
  }

  init() {
    this.score = 0;
    this.timeLeft = GAME_DURATION;
    this.isProcessing = false;
    this.isGameOver = false;
    this.boardSize = DEFAULT_BOARD_SIZE;
    this.fluctuationSpeed = DEFAULT_FLUCTUATION_SPEED;
  }

  create() {
    this.createBackground();
    this.createHUD();
    this.initBoard();
    this.startTimer();

    this.cameras.main.fadeIn(ANIMATION.fadeInDuration, 10, 0, 16);

    this.game.events.on('reset-game', this.resetGame, this);
    this.game.events.on('board-size-changed', this.onBoardSizeChanged, this);
    this.game.events.on('fluctuation-speed-changed', this.onFluctuationSpeedChanged, this);
  }

  update(time: number, delta: number) {
    if (this.isGameOver) return;
    this.updateFluctuation(time, delta);
    this.updateRipples(delta);
  }

  private createBackground() {
    const bg = this.add.graphics();
    bg.fillGradientStyle(
      COLORS.bgTop, COLORS.bgTop,
      COLORS.bgBottom, COLORS.bgBottom,
      1
    );
    bg.fillRect(0, 0, GAME_WIDTH, GAME_HEIGHT);
    bg.setDepth(-10);
  }

  private createHUD() {
    const hudContainer = this.add.container(0, 0).setDepth(100);

    const hudBg = this.add.graphics();
    hudBg.fillStyle(0x0a0010, 0.6);
    hudBg.fillRoundedRect(16, 12, 220, 64, 10);
    hudBg.lineStyle(1, COLORS.panelBorder, 0.5);
    hudBg.strokeRoundedRect(16, 12, 220, 64, 10);
    hudContainer.add(hudBg);

    this.timerText = this.add.text(30, 20, '', {
      fontSize: '18px',
      fontFamily: 'Consolas, monospace',
      color: '#eeeeff',
    });
    hudContainer.add(this.timerText);

    this.scoreText = this.add.text(30, 46, '', {
      fontSize: '18px',
      fontFamily: 'Consolas, monospace',
      color: '#8844ff',
    });
    hudContainer.add(this.scoreText);

    this.updateHUD();
  }

  private updateHUD() {
    const seconds = Math.max(0, Math.ceil(this.timeLeft));
    this.timerText.setText(`⏱ 倒计时: ${seconds}s`);
    this.scoreText.setText(`⚡ 得分: ${this.score}`);
  }

  private initBoard() {
    this.boardData = generateBoard(this.boardSize);
    this.calculateLayout();
    this.renderBoard();
  }

  private calculateLayout() {
    const maxBoardPx = Math.min(GAME_WIDTH * 0.7, GAME_HEIGHT * 0.85);
    this.cellSize = Math.floor((maxBoardPx - CELL_PADDING * (this.boardSize + 1)) / this.boardSize);
    const totalBoardPx = this.cellSize * this.boardSize + CELL_PADDING * (this.boardSize + 1);
    this.boardOffsetX = (GAME_WIDTH - totalBoardPx) / 2;
    this.boardOffsetY = (GAME_HEIGHT - totalBoardPx) / 2;
  }

  private renderBoard() {
    this.cellSprites = [];

    for (let r = 0; r < this.boardSize; r++) {
      const row: CellSprite[] = [];
      for (let c = 0; c < this.boardSize; c++) {
        const x = this.boardOffsetX + CELL_PADDING + c * (this.cellSize + CELL_PADDING) + this.cellSize / 2;
        const y = this.boardOffsetY + CELL_PADDING + r * (this.cellSize + CELL_PADDING) + this.cellSize / 2;

        const container = this.add.container(x, y);
        container.setSize(this.cellSize, this.cellSize);
        container.setDepth(10);

        const glow = this.add.graphics();
        container.add(glow);

        const bg = this.add.graphics();
        container.add(bg);

        this.drawCell(bg, glow, this.boardData.cells[r][c].state);

        container.setInteractive(
          new Phaser.Geom.Rectangle(0, 0, this.cellSize, this.cellSize),
          Phaser.Geom.Rectangle.Contains
        );

        const rowIdx = r;
        const colIdx = c;
        container.on('pointerdown', () => this.onCellClick(rowIdx, colIdx));
        container.on('pointerover', () => {
          this.tweens.add({
            targets: container,
            scaleX: 1.08,
            scaleY: 1.08,
            duration: 100,
            ease: 'Power1',
          });
        });
        container.on('pointerout', () => {
          this.tweens.add({
            targets: container,
            scaleX: 1.0,
            scaleY: 1.0,
            duration: 100,
            ease: 'Power1',
          });
        });

        row.push({ bg, glow, container, data: { row: r, col: c } });
      }
      this.cellSprites.push(row);
    }
  }

  private drawCell(bg: Phaser.GameObjects.Graphics, glow: Phaser.GameObjects.Graphics, state: CellState) {
    bg.clear();
    glow.clear();

    const hs = this.cellSize / 2;

    if (state === CellState.Superposition) {
      glow.fillStyle(COLORS.superposition.glow, 0.25);
      glow.fillRoundedRect(-hs - 4, -hs - 4, this.cellSize + 8, this.cellSize + 8, 8);

      bg.fillGradientStyle(
        COLORS.superposition.outer, COLORS.superposition.inner,
        COLORS.superposition.inner, COLORS.superposition.outer,
        0.85
      );
      bg.fillRoundedRect(-hs, -hs, this.cellSize, this.cellSize, 6);
    } else {
      glow.fillStyle(COLORS.collapsed.glow, 0.15);
      glow.fillRoundedRect(-hs - 3, -hs - 3, this.cellSize + 6, this.cellSize + 6, 7);

      bg.fillStyle(COLORS.collapsed.inner, 0.92);
      bg.fillRoundedRect(-hs, -hs, this.cellSize, this.cellSize, 6);
    }

    bg.lineStyle(1, 0xffffff, state === CellState.Superposition ? 0.3 : 0.15);
    bg.strokeRoundedRect(-hs, -hs, this.cellSize, this.cellSize, 6);
  }

  private onCellClick(row: number, col: number) {
    if (this.isProcessing || this.isGameOver) return;

    this.isProcessing = true;
    const cell = this.boardData.cells[row][col];
    flipCellState(cell);

    const sprite = this.cellSprites[row][col];
    this.tweens.add({
      targets: sprite.container,
      scaleX: 0.8,
      scaleY: 0.8,
      duration: ANIMATION.cellFlipDuration / 2,
      ease: 'Power2',
      yoyo: true,
      onUpdate: () => {
        this.drawCell(sprite.bg, sprite.glow, cell.state);
      },
      onComplete: () => {
        this.drawCell(sprite.bg, sprite.glow, cell.state);
        this.checkAndEliminate();
      },
    });
  }

  private checkAndEliminate() {
    const lines = findLines(this.boardData, LINE_LENGTH);

    if (lines.length === 0) {
      this.isProcessing = false;
      return;
    }

    const eliminatedSet = new Set<string>();
    for (const line of lines) {
      for (const pos of line) {
        eliminatedSet.add(`${pos.row},${pos.col}`);
      }
    }

    this.score += lines.length * SCORE_PER_LINE;
    this.updateHUD();
    this.showScorePopup(lines);

    const eliminatedPositions: { row: number; col: number }[] = [];
    eliminatedSet.forEach((key) => {
      const [r, c] = key.split(',').map(Number);
      eliminatedPositions.push({ row: r, col: c });
    });

    let completed = 0;
    const total = eliminatedPositions.length;

    for (const pos of eliminatedPositions) {
      const sprite = this.cellSprites[pos.row][pos.col];
      const worldX = sprite.container.x;
      const worldY = sprite.container.y;

      this.spawnParticles(worldX, worldY);
      this.spawnRipple(worldX, worldY);

      this.tweens.add({
        targets: sprite.container,
        alpha: 0,
        scaleX: 0.3,
        scaleY: 0.3,
        duration: ANIMATION.eliminateDuration,
        ease: 'Power2',
        onComplete: () => {
          const newCell = this.boardData.cells[pos.row][pos.col];
          newCell.state = Math.random() < 0.5 ? CellState.Superposition : CellState.Collapsed;
          newCell.fluctuationPhase = Math.random() * Math.PI * 2;
          newCell.fluctuationHue = Math.random() * 360;

          sprite.container.setAlpha(1);
          sprite.container.setScale(1);
          this.drawCell(sprite.bg, sprite.glow, newCell.state);

          completed++;
          if (completed >= total) {
            this.time.delayedCall(100, () => {
              this.isProcessing = false;
              this.checkAndEliminate();
            });
          }
        },
      });
    }
  }

  private showScorePopup(lines: { row: number; col: number }[][]) {
    let avgX = 0;
    let avgY = 0;
    let count = 0;
    for (const line of lines) {
      for (const pos of line) {
        const sprite = this.cellSprites[pos.row][pos.col];
        avgX += sprite.container.x;
        avgY += sprite.container.y;
        count++;
      }
    }
    avgX /= count;
    avgY /= count;

    const popup = this.add.text(avgX, avgY, `+${lines.length * SCORE_PER_LINE}`, {
      fontSize: '28px',
      fontFamily: 'Consolas, monospace',
      color: '#ffcc00',
      stroke: '#000000',
      strokeThickness: 3,
    }).setOrigin(0.5).setDepth(200);

    this.tweens.add({
      targets: popup,
      y: popup.y + ANIMATION.scorePopupY,
      alpha: 0,
      duration: ANIMATION.scorePopupDuration,
      ease: 'Power2',
      onComplete: () => popup.destroy(),
    });
  }

  private spawnParticles(x: number, y: number) {
    for (let i = 0; i < ANIMATION.particleCount; i++) {
      const color = Phaser.Utils.Array.GetRandom(COLORS.particle);
      const particle = this.add.graphics().setDepth(50);
      particle.fillStyle(color, 0.9);
      particle.fillCircle(0, 0, Phaser.Math.Between(2, 5));
      particle.setPosition(x, y);

      const angle = Phaser.Math.FloatBetween(0, Math.PI * 2);
      const speed = Phaser.Math.FloatBetween(
        ANIMATION.particleSpeed * 0.4,
        ANIMATION.particleSpeed * 1.2
      );
      const destX = x + Math.cos(angle) * speed;
      const destY = y + Math.sin(angle) * speed;

      this.tweens.add({
        targets: particle,
        x: destX,
        y: destY,
        alpha: 0,
        scaleX: 0.2,
        scaleY: 0.2,
        duration: ANIMATION.particleLifespan,
        ease: 'Power2',
        onComplete: () => particle.destroy(),
      });
    }
  }

  private spawnRipple(x: number, y: number) {
    const ripple = this.add.graphics().setDepth(5);
    this.ripples.push(ripple);

    const rippleData = {
      x,
      y,
      radius: 0,
      alpha: 0.6,
      maxRadius: ANIMATION.rippleMaxRadius,
    };

    ripple.setData('rippleData', rippleData);

    this.tweens.add({
      targets: rippleData,
      radius: rippleData.maxRadius,
      alpha: 0,
      duration: ANIMATION.rippleDuration,
      ease: 'Power2',
      onComplete: () => {
        ripple.destroy();
        const idx = this.ripples.indexOf(ripple);
        if (idx >= 0) this.ripples.splice(idx, 1);
      },
    });
  }

  private updateRipples(_delta: number) {
    for (const ripple of this.ripples) {
      const d = ripple.getData('rippleData') as {
        x: number; y: number; radius: number; alpha: number;
      };
      if (!d) continue;
      ripple.clear();
      ripple.lineStyle(2, COLORS.ripple, d.alpha);
      ripple.strokeCircle(d.x, d.y, d.radius);
    }
  }

  private updateFluctuation(time: number, _delta: number) {
    const t = time / 1000;

    for (let r = 0; r < this.boardSize; r++) {
      for (let c = 0; c < this.boardSize; c++) {
        if (r >= this.cellSprites.length || c >= this.cellSprites[r].length) continue;
        const cell = this.boardData.cells[r][c];
        const sprite = this.cellSprites[r][c];

        if (cell.state === CellState.Superposition) {
          const pulse =
            ANIMATION.glowPulseMin +
            (ANIMATION.glowPulseMax - ANIMATION.glowPulseMin) *
              (0.5 + 0.5 * Math.sin(t * ANIMATION.glowPulseSpeed * this.fluctuationSpeed + cell.fluctuationPhase));

          sprite.glow.setAlpha(pulse);

          const hueShift = Math.sin(t * this.fluctuationSpeed * 1.5 + cell.fluctuationHue * 0.01) * 20;
          const brightness = 0.7 + 0.3 * Math.sin(t * this.fluctuationSpeed * 2 + cell.fluctuationPhase * 0.7);
          const scale = 1.0 + 0.02 * Math.sin(t * this.fluctuationSpeed * 3 + cell.fluctuationPhase);

          sprite.container.setScale(scale);

          const r_val = Math.floor(((0x44 + hueShift) / 255) * brightness * 255);
          const g_val = Math.floor(((0x22) / 255) * brightness * 255);
          const b_val = Math.floor(((0xff) / 255) * brightness * 255);
          const fluctColor = (r_val << 16) | (g_val << 8) | b_val;

          sprite.bg.clear();
          const hs = this.cellSize / 2;
          sprite.bg.fillGradientStyle(
            COLORS.superposition.outer, fluctColor,
            fluctColor, COLORS.superposition.outer,
            0.85
          );
          sprite.bg.fillRoundedRect(-hs, -hs, this.cellSize, this.cellSize, 6);
          sprite.bg.lineStyle(1, 0xffffff, 0.3);
          sprite.bg.strokeRoundedRect(-hs, -hs, this.cellSize, this.cellSize, 6);
        } else {
          sprite.glow.setAlpha(
            ANIMATION.glowPulseMin +
            0.1 * Math.sin(t * 0.5 + cell.fluctuationPhase)
          );
        }
      }
    }
  }

  private startTimer() {
    this.timeLeft = GAME_DURATION;
    this.updateHUD();

    this.timerEvent = this.time.addEvent({
      delay: 1000,
      callback: () => {
        this.timeLeft -= 1;
        this.updateHUD();
        if (this.timeLeft <= 0) {
          this.endGame();
        }
      },
      loop: true,
    });
  }

  private endGame() {
    this.isGameOver = true;
    this.timerEvent.remove();

    this.gameOverOverlay = this.add.container(GAME_WIDTH / 2, GAME_HEIGHT / 2).setDepth(300);

    const overlayBg = this.add.graphics();
    overlayBg.fillStyle(0x0a0010, 0.85);
    overlayBg.fillRect(-GAME_WIDTH / 2, -GAME_HEIGHT / 2, GAME_WIDTH, GAME_HEIGHT);
    this.gameOverOverlay.add(overlayBg);

    const panel = this.add.graphics();
    panel.fillStyle(COLORS.panelBg, 0.9);
    panel.fillRoundedRect(-160, -90, 320, 180, 16);
    panel.lineStyle(2, COLORS.panelBorder, 0.8);
    panel.strokeRoundedRect(-160, -90, 320, 180, 16);
    this.gameOverOverlay.add(panel);

    const title = this.add.text(0, -55, '时间到！', {
      fontSize: '32px',
      fontFamily: 'Consolas, monospace',
      color: '#eeeeff',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.gameOverOverlay.add(title);

    const finalScore = this.add.text(0, 0, `最终得分: ${this.score}`, {
      fontSize: '24px',
      fontFamily: 'Consolas, monospace',
      color: '#ffcc00',
      stroke: '#000000',
      strokeThickness: 2,
    }).setOrigin(0.5);
    this.gameOverOverlay.add(finalScore);

    const restartBtn = this.add.text(0, 55, '[ 重新开始 ]', {
      fontSize: '20px',
      fontFamily: 'Consolas, monospace',
      color: '#8844ff',
      stroke: '#000000',
      strokeThickness: 1,
    }).setOrigin(0.5);
    restartBtn.setInteractive({ useHandCursor: true });
    restartBtn.on('pointerdown', () => this.resetGame());
    restartBtn.on('pointerover', () => restartBtn.setColor('#bb88ff'));
    restartBtn.on('pointerout', () => restartBtn.setColor('#8844ff'));
    this.gameOverOverlay.add(restartBtn);

    this.gameOverOverlay.setAlpha(0);
    this.tweens.add({
      targets: this.gameOverOverlay,
      alpha: 1,
      duration: ANIMATION.fadeInDuration,
      ease: 'Power2',
    });
  }

  private resetGame() {
    if (this.timerEvent) this.timerEvent.remove();
    if (this.gameOverOverlay) this.gameOverOverlay.destroy();

    for (const row of this.cellSprites) {
      for (const sprite of row) {
        sprite.container.destroy();
      }
    }
    for (const ripple of this.ripples) {
      ripple.destroy();
    }
    this.ripples = [];

    this.score = 0;
    this.timeLeft = GAME_DURATION;
    this.isProcessing = false;
    this.isGameOver = false;

    this.initBoard();
    this.startTimer();
    this.updateHUD();
  }

  private clearBoard() {
    for (const row of this.cellSprites) {
      for (const sprite of row) {
        sprite.container.destroy();
      }
    }
    this.cellSprites = [];
    for (const ripple of this.ripples) {
      ripple.destroy();
    }
    this.ripples = [];
  }

  private onBoardSizeChanged(newSize: number) {
    this.boardSize = newSize;
    if (this.timerEvent) this.timerEvent.remove();
    this.clearBoard();
    this.score = 0;
    this.timeLeft = GAME_DURATION;
    this.isProcessing = false;
    this.isGameOver = false;
    if (this.gameOverOverlay) this.gameOverOverlay.destroy();
    this.initBoard();
    this.startTimer();
    this.updateHUD();
  }

  private onFluctuationSpeedChanged(newSpeed: number) {
    this.fluctuationSpeed = newSpeed;
  }
}
