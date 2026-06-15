import Phaser from 'phaser';
import { Engine, PlayerType } from './Engine';

interface Bubble {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  speedY: number;
  wobble: number;
  wobbleSpeed: number;
}

interface TrophyParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
}

export class UIModule {
  private scene: Phaser.Scene;
  private engine: Engine;

  private turnText!: Phaser.GameObjects.Text;
  private timerText!: Phaser.GameObjects.Text;
  private playerScoreText!: Phaser.GameObjects.Text;
  private aiScoreText!: Phaser.GameObjects.Text;
  private turnIndicator!: Phaser.GameObjects.Text;
  private helpText!: Phaser.GameObjects.Text;
  private actionButtons: { endTurn: Phaser.GameObjects.Text; splitBtn: Phaser.GameObjects.Text | null } = { endTurn: null as any, splitBtn: null };

  private bubbles: Bubble[] = [];
  private bubbleGraphics!: Phaser.GameObjects.Graphics;
  private trophyGraphics!: Phaser.GameObjects.Graphics;
  private trophyParticles: TrophyParticle[] = [];
  private hoverIndicator!: Phaser.GameObjects.Graphics;
  private selectedHalo!: Phaser.GameObjects.Graphics;
  private ghostCircle!: Phaser.GameObjects.Graphics;
  private movableCells!: Phaser.GameObjects.Graphics;

  private cellSize = 64;
  private boardOriginX = 0;
  private boardOriginY = 0;

  private selectedHaloTween: Phaser.Tweens.Tween | null = null;
  private haloAlpha = 0;

  private currentHoverCell: { x: number; y: number } | null = null;

  constructor(scene: Phaser.Scene, engine: Engine, cellSize: number, boardOriginX: number, boardOriginY: number) {
    this.scene = scene;
    this.engine = engine;
    this.cellSize = cellSize;
    this.boardOriginX = boardOriginX;
    this.boardOriginY = boardOriginY;
  }

  create(): void {
    this.createBackgroundDecor();
    this.createBubbles();
    this.createTopHUD();
    this.createScoreDisplay();
    this.createTurnIndicator();
    this.createHelpText();
    this.createIndicators();
    this.createActionButtons();
  }

  private createBackgroundDecor(): void {
    const bg = this.scene.add.graphics();
    for (let i = 50; i >= 0; i--) {
      const t = i / 50;
      const r = 800 * t;
      const alpha = 0.08 * (1 - t);
      bg.fillStyle(i % 2 === 0 ? 0x1B2838 : 0x0B0F19, alpha);
      bg.fillCircle(640, 360, r);
    }
    bg.fillStyle(0x0B0F19, 0.4);
    bg.fillRect(0, 0, 1280, 720);
    bg.setDepth(-100);

    this.bubbleGraphics = this.scene.add.graphics();
    this.trophyGraphics = this.scene.add.graphics();
  }

  private createBubbles(): void {
    for (let i = 0; i < 24; i++) {
      this.bubbles.push({
        x: Math.random() * 1280,
        y: 720 + Math.random() * 100,
        radius: 3 + Math.random() * 5,
        alpha: 0.1 + Math.random() * 0.2,
        speedY: 0.3 + Math.random() * 0.5,
        wobble: Math.random() * Math.PI * 2,
        wobbleSpeed: 0.01 + Math.random() * 0.02
      });
    }
  }

  private createTopHUD(): void {
    const hudBg = this.scene.add.graphics();
    hudBg.fillStyle(0x0B0F19, 0.7);
    hudBg.fillRoundedRect(440, 10, 400, 50, 12);
    hudBg.lineStyle(1, 0x4A6A8A, 0.4);
    hudBg.strokeRoundedRect(440, 10, 400, 50, 12);

    this.turnText = this.scene.add.text(640, 28, '', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#5dade2',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.timerText = this.scene.add.text(640, 52, '', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#87CEEB',
      fontStyle: 'bold'
    }).setOrigin(0.5);
  }

  private createScoreDisplay(): void {
    this.drawTrophy(1150, 620, '#5dade2', true);
    this.drawTrophy(1210, 620, '#e74c3c', false);

    this.playerScoreText = this.scene.add.text(1150, 665, '0', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#5dade2',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    this.aiScoreText = this.scene.add.text(1210, 665, '0', {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#e74c3c',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const playerLabel = this.scene.add.text(1150, 690, '玩家', {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#87CEEB'
    }).setOrigin(0.5);

    const aiLabel = this.scene.add.text(1210, 690, 'AI', {
      fontFamily: 'Arial',
      fontSize: '11px',
      color: '#e74c3c'
    }).setOrigin(0.5);
  }

  private drawTrophy(x: number, y: number, color: string, isPlayer: boolean): void {
    const graphics = this.scene.add.graphics();
    const c = parseInt(color.replace('#', ''), 16);

    graphics.lineStyle(2, c, 0.9);
    graphics.fillStyle(c, 0.15);

    graphics.fillRoundedRect(x - 14, y - 20, 28, 28, 4);
    graphics.strokeRoundedRect(x - 14, y - 20, 28, 28, 4);

    graphics.fillTriangle(x - 20, y - 10, x - 14, y - 10, x - 14, y + 2);
    graphics.strokeTriangle(x - 20, y - 10, x - 14, y - 10, x - 14, y + 2);

    graphics.fillTriangle(x + 14, y - 10, x + 20, y - 10, x + 14, y + 2);
    graphics.strokeTriangle(x + 14, y - 10, x + 20, y - 10, x + 14, y + 2);

    graphics.fillStyle(c, 0.3);
    graphics.fillRoundedRect(x - 10, y + 8, 20, 4, 2);
    graphics.fillRoundedRect(x - 6, y + 12, 12, 4, 2);

    graphics.fillStyle(c, 0.8);
    graphics.fillCircle(x, y - 6, 3);
  }

  private emitTrophyParticles(x: number, y: number, color: string): void {
    const c = parseInt(color.replace('#', ''), 16);
    for (let i = 0; i < 15; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 2;
      this.trophyParticles.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - 1,
        life: 1,
        maxLife: 1,
        color: c
      });
    }
  }

  private createTurnIndicator(): void {
    this.turnIndicator = this.scene.add.text(640, 75, '', {
      fontFamily: 'Arial',
      fontSize: '14px',
      color: '#ffffff'
    }).setOrigin(0.5);
  }

  private createHelpText(): void {
    this.helpText = this.scene.add.text(640, 700, '', {
      fontFamily: 'Arial',
      fontSize: '12px',
      color: '#4A6A8A',
      align: 'center'
    }).setOrigin(0.5);
    this.helpText.setText('【点击选中水球 → 点击蓝圈移动 → 相邻友方融合 → 右键/按钮分裂】');
  }

  private createIndicators(): void {
    this.hoverIndicator = this.scene.add.graphics();
    this.selectedHalo = this.scene.add.graphics();
    this.ghostCircle = this.scene.add.graphics();
    this.movableCells = this.scene.add.graphics();
  }

  private createActionButtons(): void {
    const endTurnBtn = this.scene.add.graphics();
    endTurnBtn.fillStyle(0x1a5276, 0.8);
    endTurnBtn.fillRoundedRect(50, 660, 140, 40, 8);
    endTurnBtn.lineStyle(2, 0x5dade2, 0.6);
    endTurnBtn.strokeRoundedRect(50, 660, 140, 40, 8);

    this.actionButtons.endTurn = this.scene.add.text(120, 680, '结束回合', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#87CEEB',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.actionButtons.endTurn.on('pointerdown', () => {
      if (this.engine.state.currentTurn === 'player') {
        this.engine.endTurn();
      }
    });

    endTurnBtn.setInteractive(new Phaser.Geom.Rectangle(50, 660, 140, 40), Phaser.Geom.Rectangle.Contains);
    endTurnBtn.on('pointerdown', () => {
      if (this.engine.state.currentTurn === 'player') {
        this.engine.endTurn();
      }
    });

    const splitBtnBg = this.scene.add.graphics();
    splitBtnBg.fillStyle(0x2ecc71, 0.7);
    splitBtnBg.fillRoundedRect(50, 610, 140, 40, 8);
    splitBtnBg.lineStyle(2, 0x58d68d, 0.6);
    splitBtnBg.strokeRoundedRect(50, 610, 140, 40, 8);

    this.actionButtons.splitBtn = this.scene.add.text(120, 630, '分裂选中', {
      fontFamily: 'Arial',
      fontSize: '16px',
      color: '#a9dfbf',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    this.actionButtons.splitBtn.on('pointerdown', () => {
      const selectedId = this.engine.state.selectedPieceId;
      if (selectedId && this.engine.canSplitPiece(selectedId)) {
        this.engine.splitPiece(selectedId);
      }
    });

    splitBtnBg.setInteractive(new Phaser.Geom.Rectangle(50, 610, 140, 40), Phaser.Geom.Rectangle.Contains);
    splitBtnBg.on('pointerdown', () => {
      const selectedId = this.engine.state.selectedPieceId;
      if (selectedId && this.engine.canSplitPiece(selectedId)) {
        this.engine.splitPiece(selectedId);
      }
    });
  }

  gridToWorld(gridX: number, gridY: number): { x: number; y: number } {
    return {
      x: this.boardOriginX + gridX * this.cellSize + this.cellSize / 2,
      y: this.boardOriginY + gridY * this.cellSize + this.cellSize / 2
    };
  }

  worldToGrid(worldX: number, worldY: number): { x: number; y: number } {
    return {
      x: Math.floor((worldX - this.boardOriginX) / this.cellSize),
      y: Math.floor((worldY - this.boardOriginY) / this.cellSize)
    };
  }

  update(deltaTime: number, turnTimeLeft: number): void {
    this.updateTurnHUD(turnTimeLeft);
    this.updateScore();
    this.updateBubbles(deltaTime);
    this.updateTrophyParticles(deltaTime);
    this.updateIndicators();
    this.updateTurnIndicator();
  }

  private updateTurnHUD(timeLeft: number): void {
    this.turnText.setText(`第 ${this.engine.state.turnNumber} 回合`);
    const seconds = Math.max(0, Math.ceil(timeLeft));
    this.timerText.setText(`⏱ ${seconds}s`);

    if (seconds <= 5) {
      this.timerText.setColor('#ff6b6b');
    } else {
      this.timerText.setColor('#87CEEB');
    }
  }

  private updateScore(): void {
    const prevPlayerScore = parseInt(this.playerScoreText.text);
    const prevAiScore = parseInt(this.aiScoreText.text);

    this.playerScoreText.setText(String(this.engine.state.scores.player));
    this.aiScoreText.setText(String(this.engine.state.scores.ai));

    if (this.engine.state.scores.player > prevPlayerScore) {
      this.emitTrophyParticles(1150, 620, '#5dade2');
    }
    if (this.engine.state.scores.ai > prevAiScore) {
      this.emitTrophyParticles(1210, 620, '#e74c3c');
    }
  }

  private updateBubbles(deltaTime: number): void {
    this.bubbleGraphics.clear();

    for (const bubble of this.bubbles) {
      bubble.wobble += bubble.wobbleSpeed * deltaTime * 60;
      bubble.y -= bubble.speedY * deltaTime * 60;
      bubble.x += Math.sin(bubble.wobble) * 0.5;

      if (bubble.y < -20) {
        bubble.y = 740;
        bubble.x = Math.random() * 1280;
      }

      this.bubbleGraphics.fillStyle(0xffffff, bubble.alpha);
      this.bubbleGraphics.fillCircle(bubble.x, bubble.y, bubble.radius);
      this.bubbleGraphics.lineStyle(1, 0x5dade2, bubble.alpha * 0.5);
      this.bubbleGraphics.strokeCircle(bubble.x, bubble.y, bubble.radius);
    }
  }

  private updateTrophyParticles(deltaTime: number): void {
    this.trophyGraphics.clear();

    for (let i = this.trophyParticles.length - 1; i >= 0; i--) {
      const p = this.trophyParticles[i];
      p.x += p.vx * deltaTime * 60;
      p.y += p.vy * deltaTime * 60;
      p.vy += 0.1 * deltaTime * 60;
      p.life -= deltaTime;

      if (p.life <= 0) {
        this.trophyParticles.splice(i, 1);
        continue;
      }

      const alpha = p.life / p.maxLife;
      this.trophyGraphics.fillStyle(p.color, alpha);
      this.trophyGraphics.fillCircle(p.x, p.y, 2 + alpha * 2);
    }
  }

  private updateIndicators(): void {
    this.hoverIndicator.clear();
    this.selectedHalo.clear();
    this.movableCells.clear();

    if (this.currentHoverCell) {
      const { x, y } = this.gridToWorld(this.currentHoverCell.x, this.currentHoverCell.y);
      this.hoverIndicator.lineStyle(2, 0x87CEEB, 0.4);
      this.hoverIndicator.strokeRect(
        this.boardOriginX + this.currentHoverCell.x * this.cellSize + 2,
        this.boardOriginY + this.currentHoverCell.y * this.cellSize + 2,
        this.cellSize - 4,
        this.cellSize - 4
      );
    }

    if (this.engine.state.selectedPieceId) {
      const selected = this.engine.state.pieces.find(p => p.id === this.engine.state.selectedPieceId);
      if (selected) {
        const pos = this.gridToWorld(selected.gridX, selected.gridY);
        this.haloAlpha = (Math.sin(Date.now() * 0.006) + 1) * 0.3 + 0.2;

        this.selectedHalo.lineStyle(3, 0x5dade2, this.haloAlpha);
        this.selectedHalo.strokeCircle(pos.x, pos.y, selected.radius + 8);
        this.selectedHalo.lineStyle(1, 0x87CEEB, this.haloAlpha * 0.5);
        this.selectedHalo.strokeCircle(pos.x, pos.y, selected.radius + 12);

        const movableCells = this.engine.getMovableCells(selected.id);
        for (const cell of movableCells) {
          const cp = this.gridToWorld(cell.x, cell.y);
          const occupant = this.engine.getPieceAt(cell.x, cell.y);
          if (occupant && occupant.owner === selected.owner) {
            this.movableCells.lineStyle(2, 0xf39c12, 0.6);
            this.movableCells.strokeCircle(cp.x, cp.y, 24);
            this.movableCells.fillStyle(0xf39c12, 0.1);
            this.movableCells.fillCircle(cp.x, cp.y, 24);
          } else {
            this.movableCells.lineStyle(2, 0x5dade2, 0.5);
            this.movableCells.strokeCircle(cp.x, cp.y, 18);
            this.movableCells.fillStyle(0x5dade2, 0.08);
            this.movableCells.fillCircle(cp.x, cp.y, 18);
          }
        }
      }
    }

    const splitBtn = this.actionButtons.splitBtn;
    if (splitBtn) {
      const canSplit = this.engine.state.selectedPieceId && this.engine.canSplitPiece(this.engine.state.selectedPieceId);
      splitBtn.setAlpha(canSplit ? 1 : 0.4);
    }
  }

  private updateTurnIndicator(): void {
    const isPlayerTurn = this.engine.state.currentTurn === 'player';
    this.turnIndicator.setText(isPlayerTurn ? '◆ 你的回合 ◆' : '◇ AI思考中 ◇');
    this.turnIndicator.setColor(isPlayerTurn ? '#5dade2' : '#e74c3c');
  }

  setHoverCell(cell: { x: number; y: number } | null): void {
    this.currentHoverCell = cell;
  }

  showGhostCircle(worldX: number, worldY: number, radius: number): void {
    this.ghostCircle.clear();
    this.ghostCircle.lineStyle(2, 0x87CEEB, 0.4);
    this.ghostCircle.setDashPattern([6, 4]);
    this.ghostCircle.strokeCircle(worldX, worldY, radius);
    this.ghostCircle.setDashPattern([]);
  }

  clearGhostCircle(): void {
    this.ghostCircle.clear();
  }

  showGameOver(winner: PlayerType, isMatch: boolean, onRestart: () => void): void {
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.75);
    overlay.fillRect(0, 0, 1280, 720);

    const panel = this.scene.add.graphics();
    panel.fillStyle(0x0B0F19, 0.95);
    panel.fillRoundedRect(390, 200, 500, 320, 16);
    panel.lineStyle(2, 0x4A6A8A, 0.5);
    panel.strokeRoundedRect(390, 200, 500, 320, 16);

    const titleText = isMatch ? '🏆 赛局结束！' : '本轮结束';
    const title = this.scene.add.text(640, 260, titleText, {
      fontFamily: 'Arial',
      fontSize: '32px',
      color: winner === 'player' ? '#5dade2' : '#e74c3c',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const winnerText = winner === 'player' ? '🎉 玩家获胜！' : '💀 AI获胜...';
    const winLabel = this.scene.add.text(640, 320, winnerText, {
      fontFamily: 'Arial',
      fontSize: '24px',
      color: '#ffffff'
    }).setOrigin(0.5);

    const scoreText = `当前比分  玩家 ${this.engine.state.scores.player} : ${this.engine.state.scores.ai} AI`;
    this.scene.add.text(640, 370, scoreText, {
      fontFamily: 'Arial',
      fontSize: '18px',
      color: '#87CEEB'
    }).setOrigin(0.5);

    const btnText = isMatch ? '重新开始赛局' : '开始下一轮';
    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(winner === 'player' ? 0x1a5276 : 0x922b21, 0.9);
    btnBg.fillRoundedRect(540, 420, 200, 56, 10);
    btnBg.lineStyle(2, winner === 'player' ? 0x5dade2 : 0xe74c3c, 0.7);
    btnBg.strokeRoundedRect(540, 420, 200, 56, 10);

    const btnLabel = this.scene.add.text(640, 448, btnText, {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btnBg.setInteractive(new Phaser.Geom.Rectangle(540, 420, 200, 56), Phaser.Geom.Rectangle.Contains);
    btnBg.on('pointerdown', () => {
      overlay.destroy();
      panel.destroy();
      title.destroy();
      winLabel.destroy();
      btnBg.destroy();
      btnLabel.destroy();
      onRestart();
    });
    btnLabel.on('pointerdown', () => {
      overlay.destroy();
      panel.destroy();
      title.destroy();
      winLabel.destroy();
      btnBg.destroy();
      btnLabel.destroy();
      onRestart();
    });
  }

  showMatchStart(onStart: () => void): void {
    const overlay = this.scene.add.graphics();
    overlay.fillStyle(0x000000, 0.85);
    overlay.fillRect(0, 0, 1280, 720);

    const title = this.scene.add.text(640, 250, '🌊 潮汐棋局 🌊', {
      fontFamily: 'Arial',
      fontSize: '56px',
      color: '#5dade2',
      fontStyle: 'bold'
    }).setOrigin(0.5);

    const subtitle = this.scene.add.text(640, 320, 'Tidal Chessboard', {
      fontFamily: 'Arial',
      fontSize: '20px',
      color: '#4A6A8A'
    }).setOrigin(0.5);

    const rules = [
      '▸ 点击水球选中，蓝色虚线圈为可移动位置',
      '▸ 移动到相邻友方水球上触发融合（变大，步数减半）',
      '▸ 点击「分裂选中」或右键将水球分裂（变小，步数翻倍）',
      '▸ 潮汐每10秒淹没边缘格子，水球受损缩小直至破碎',
      '▸ 先消灭对方全部水球者获胜，先得3分赢得赛局'
    ];

    rules.forEach((r, i) => {
      this.scene.add.text(640, 380 + i * 32, r, {
        fontFamily: 'Arial',
        fontSize: '14px',
        color: '#87CEEB'
      }).setOrigin(0.5);
    });

    const btnBg = this.scene.add.graphics();
    btnBg.fillStyle(0x1a5276, 0.9);
    btnBg.fillRoundedRect(540, 560, 200, 60, 12);
    btnBg.lineStyle(2, 0x5dade2, 0.8);
    btnBg.strokeRoundedRect(540, 560, 200, 60, 12);

    const btnLabel = this.scene.add.text(640, 590, '▶ 开始赛局', {
      fontFamily: 'Arial',
      fontSize: '22px',
      color: '#ffffff',
      fontStyle: 'bold'
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });

    btnBg.setInteractive(new Phaser.Geom.Rectangle(540, 560, 200, 60), Phaser.Geom.Rectangle.Contains);
    const startHandler = () => {
      overlay.destroy();
      title.destroy();
      subtitle.destroy();
      btnBg.destroy();
      btnLabel.destroy();
      onStart();
    };
    btnBg.on('pointerdown', startHandler);
    btnLabel.on('pointerdown', startHandler);
  }
}
