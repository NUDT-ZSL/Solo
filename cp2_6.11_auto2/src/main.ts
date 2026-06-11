import { Board, GRID_SIZE, getPlayerColor, type WinInfo } from './board';
import { PlayerController, type PlayerMode } from './player';
import { EffectSystem, type Particle } from './effect';

type GameState = 'idle' | 'playing' | 'resetting' | 'gameOver' | 'matchOver';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private board: Board;
  private playerController: PlayerController;
  private effectSystem: EffectSystem;
  private state: GameState;
  private lastTime: number = 0;
  private animationId: number = 0;
  private scores: { player1: number; player2: number };
  private cellSize: number = 0;
  private boardOffsetX: number = 0;
  private boardOffsetY: number = 0;
  private padding: number = 20;
  private gridGap: number = 8;

  private turnDotElement: HTMLElement;
  private turnTextElement: HTMLElement;
  private player1ScoreElement: HTMLElement;
  private player2ScoreElement: HTMLElement;
  private modeToggleElement: HTMLButtonElement;
  private resetBtnElement: HTMLButtonElement;
  private gameResultElement: HTMLElement;
  private resultTextElement: HTMLElement;

  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;


  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;

    this.board = new Board();
    this.playerController = new PlayerController(this.board, 'pvp');
    this.effectSystem = new EffectSystem();
    this.state = 'playing';
    this.scores = { player1: 0, player2: 0 };

    this.turnDotElement = document.getElementById('turnDot') as HTMLElement;
    this.turnTextElement = document.getElementById('turnText') as HTMLElement;
    this.player1ScoreElement = document.getElementById('player1Score') as HTMLElement;
    this.player2ScoreElement = document.getElementById('player2Score') as HTMLElement;
    this.modeToggleElement = document.getElementById('modeToggle') as HTMLButtonElement;
    this.resetBtnElement = document.getElementById('resetBtn') as HTMLButtonElement;
    this.gameResultElement = document.getElementById('gameResult') as HTMLElement;
    this.resultTextElement = document.getElementById('resultText') as HTMLElement;

    this.resizeCanvas();
    this.bindEvents();
    this.updateUI();
    this.startGameLoop();
  }

  private resizeCanvas(): void {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    
    const displaySize = rect.width;
    this.cellSize = (displaySize - this.padding * 2 - this.gridGap * 2) / GRID_SIZE;
    this.boardOffsetX = this.padding;
    this.boardOffsetY = this.padding;
  }

  private bindEvents(): void {
    this.canvas.addEventListener('click', (e) => this.handleClick(e));
    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const touch = e.touches[0];
      this.handleClick(touch);
    }, { passive: false });

    this.modeToggleElement.addEventListener('click', () => this.toggleMode());
    this.resetBtnElement.addEventListener('click', () => this.resetGame());
    window.addEventListener('resize', () => this.resizeCanvas());
  }

  private handleClick(e: MouseEvent | Touch): void {
    if (this.state !== 'playing') return;
    if (this.playerController.isAiTurn()) return;

    const rect = this.canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const boardWidth = GRID_SIZE * this.cellSize + (GRID_SIZE - 1) * this.gridGap;
    const boardHeight = GRID_SIZE * this.cellSize + (GRID_SIZE - 1) * this.gridGap;

    if (x < this.boardOffsetX || x > this.boardOffsetX + boardWidth ||
        y < this.boardOffsetY || y > this.boardOffsetY + boardHeight) {
      return;
    }

    const offsetX = x - this.boardOffsetX;
    const offsetY = y - this.boardOffsetY;
    const cellWithGap = this.cellSize + this.gridGap;
    const col = Math.floor(offsetX / cellWithGap);
    const row = Math.floor(offsetY / cellWithGap);

    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) return;

    const cellInnerX = offsetX - col * cellWithGap;
    const cellInnerY = offsetY - row * cellWithGap;
    if (cellInnerX < 0 || cellInnerX > this.cellSize || cellInnerY < 0 || cellInnerY > this.cellSize) {
      return;
    }

    this.processMove(row, col);
  }

  private processMove(row: number, col: number): void {
    if (this.board.getCell(row, col) !== null) return;

    const success = this.playerController.handlePlayerMove(row, col);
    if (!success) return;

    this.effectSystem.startPieceAnimation(row, col);

    setTimeout(() => {
      this.handlePostMove();
    }, 200);
  }

  private handlePostMove(): void {
    const result = this.checkGameResult();
    if (result) {
      this.handleGameResult(result);
      return;
    }

    this.triggerReset(() => {
      const resultAfterReset = this.checkGameResult();
      if (resultAfterReset) {
        this.handleGameResult(resultAfterReset);
        return;
      }

      this.finishTurn();
    });
  }

  private finishTurn(): void {
    this.playerController.switchTurn();
    this.updateUI();

    if (this.playerController.isAiTurn() && this.state === 'playing') {
      this.playerController.scheduleAiMove((row, col) => {
        this.processAiMove(row, col);
      });
    }
  }

  private processAiMove(row: number, col: number): void {
    if (this.state !== 'playing') return;
    if (this.board.getCell(row, col) !== null) return;

    const success = this.playerController.handleAiMove(row, col);
    if (!success) return;

    this.effectSystem.startPieceAnimation(row, col);

    setTimeout(() => {
      this.handlePostMove();
    }, 200);
  }

  private checkGameResult(): WinInfo | 'draw' | null {
    const winInfo = this.board.checkWin();
    if (winInfo) return winInfo;
    if (this.board.isFull()) return 'draw';
    return null;
  }

  private handleGameResult(result: WinInfo | 'draw'): void {
    this.state = 'gameOver';

    if (result !== 'draw') {
      this.effectSystem.startVictoryGlow(result.line);
      if (result.winner === 'player1') {
        this.scores.player1++;
      } else {
        this.scores.player2++;
      }
      this.updateScoreUI();

      if (this.scores.player1 >= 2 || this.scores.player2 >= 2) {
        this.state = 'matchOver';
        this.showMatchResult(result.winner);
        return;
      }
    }

    this.showRoundResult(result);
  }

  private showRoundResult(result: WinInfo | 'draw'): void {
    let text = '';
    if (result === 'draw') {
      text = '平局！';
    } else {
      text = `${this.playerController.getPlayerName(result.winner)} 获胜！`;
    }
    this.resultTextElement.textContent = text;
    this.gameResultElement.classList.remove('hidden');

    setTimeout(() => {
      if (this.state === 'gameOver') {
        this.startNewRound();
      }
    }, 2000);
  }

  private showMatchResult(winner: 'player1' | 'player2'): void {
    const name = this.playerController.getPlayerName(winner);
    this.resultTextElement.textContent = `${name} 最终获胜！`;
    this.gameResultElement.classList.remove('hidden');
  }

  private startNewRound(): void {
    this.gameResultElement.classList.add('hidden');
    this.board.resetBoard();
    this.effectSystem.clearAll();
    this.playerController.resetTurn();
    this.state = 'playing';
    this.updateUI();
  }

  private triggerReset(callback: () => void): void {
    this.state = 'resetting';

    const rect = this.canvas.getBoundingClientRect();
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    this.effectSystem.spawnBurstParticles(centerX, centerY, 40);

    this.effectSystem.startBoardFadeOut();

    const FADE_DURATION = 300;

    setTimeout(() => {
      this.board.shuffle();
      this.effectSystem.clearPieceAnimations();
      this.effectSystem.startBoardFadeIn();

      setTimeout(() => {
        this.state = 'playing';
        callback();
      }, FADE_DURATION);
    }, FADE_DURATION);
  }

  private toggleMode(): void {
    const newMode: PlayerMode = this.playerController.getMode() === 'pvp' ? 'pve' : 'pvp';
    this.playerController.setMode(newMode);
    this.modeToggleElement.textContent = newMode === 'pvp' ? '双人对战' : '人机对战';
    this.resetGame();
  }

  private resetGame(): void {
    this.board.resetBoard();
    this.effectSystem.clearAll();
    this.playerController.resetTurn();
    this.scores = { player1: 0, player2: 0 };
    this.state = 'playing';
    this.gameResultElement.classList.add('hidden');
    this.updateUI();
    this.updateScoreUI();
  }

  private updateUI(): void {
    const currentPlayer = this.playerController.getCurrentPlayer();
    this.turnDotElement.className = `turn-dot ${currentPlayer}`;
    this.turnTextElement.textContent = `${this.playerController.getPlayerName(currentPlayer)} 回合`;
  }

  private updateScoreUI(): void {
    this.player1ScoreElement.textContent = String(this.scores.player1);
    this.player2ScoreElement.textContent = String(this.scores.player2);
  }

  private startGameLoop(): void {
    this.lastTime = performance.now();
    const loop = (time: number) => {
      const deltaTime = Math.min(time - this.lastTime, 50);
      this.lastTime = time;

      this.updateFPS(deltaTime);
      this.effectSystem.update(deltaTime);
      this.render();

      this.animationId = requestAnimationFrame(loop);
    };
    this.animationId = requestAnimationFrame(loop);
  }

  private updateFPS(deltaTime: number): void {
    this.frameCount++;
    this.fpsUpdateTime += deltaTime;
    if (this.fpsUpdateTime >= 1000) {
      Math.round(this.frameCount * 1000 / this.fpsUpdateTime);
      this.frameCount = 0;
      this.fpsUpdateTime = 0;
    }
  }

  private render(): void {
    const rect = this.canvas.getBoundingClientRect();
    const width = rect.width;
    const height = rect.height;

    this.ctx.clearRect(0, 0, width, height);

    this.drawBackground(width, height);
    this.drawBoard(width, height);
    this.drawPieces();
    this.drawVictoryGlow();
    this.drawParticles();
    this.drawFPS(width, height);
  }

  private drawBackground(width: number, height: number): void {
    const gradient = this.ctx.createRadialGradient(
      width / 2, height / 2, 0,
      width / 2, height / 2, Math.max(width, height) / 1.5
    );
    gradient.addColorStop(0, 'rgba(74, 59, 26, 0.3)');
    gradient.addColorStop(1, 'rgba(13, 13, 13, 0.1)');
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, width, height);
  }

  private drawBoard(_width: number, _height: number): void {
    const boardOpacity = this.effectSystem.getBoardOpacity();

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const x = this.boardOffsetX + col * (this.cellSize + this.gridGap);
        const y = this.boardOffsetY + row * (this.cellSize + this.gridGap);

        this.ctx.save();
        this.ctx.globalAlpha = 0.7 * boardOpacity;
        
        this.ctx.fillStyle = '#2A1F0D';
        this.ctx.beginPath();
        this.roundRect(x, y, this.cellSize, this.cellSize, 8);
        this.ctx.fill();

        this.ctx.globalAlpha = boardOpacity;
        this.ctx.shadowColor = '#D4AF37';
        this.ctx.shadowBlur = 10;
        this.ctx.strokeStyle = '#D4AF37';
        this.ctx.lineWidth = 2;
        this.ctx.beginPath();
        this.roundRect(x, y, this.cellSize, this.cellSize, 8);
        this.ctx.stroke();

        this.ctx.restore();
      }
    }
  }

  private drawPieces(): void {
    const boardOpacity = this.effectSystem.getBoardOpacity();
    const state = this.board.getState();

    for (let row = 0; row < GRID_SIZE; row++) {
      for (let col = 0; col < GRID_SIZE; col++) {
        const piece = state[row][col];
        if (!piece) continue;

        const scale = this.effectSystem.getPieceScale(row, col);
        const x = this.boardOffsetX + col * (this.cellSize + this.gridGap) + this.cellSize / 2;
        const y = this.boardOffsetY + row * (this.cellSize + this.gridGap) + this.cellSize / 2;
        const radius = 30 * scale;

        this.ctx.save();
        this.ctx.globalAlpha = boardOpacity;

        this.ctx.shadowColor = getPlayerColor(piece);
        this.ctx.shadowBlur = 15;

        this.ctx.fillStyle = getPlayerColor(piece);
        this.ctx.beginPath();
        this.ctx.arc(x, y, radius, 0, Math.PI * 2);
        this.ctx.fill();

        this.ctx.restore();
      }
    }
  }

  private drawVictoryGlow(): void {
    const glow = this.effectSystem.getVictoryGlow();
    if (glow.intensity <= 0 || !glow.line) return;

    const firstCell = glow.line[0];
    const lastCell = glow.line[2];
    
    const x1 = this.boardOffsetX + firstCell[1] * (this.cellSize + this.gridGap) + this.cellSize / 2;
    const y1 = this.boardOffsetY + firstCell[0] * (this.cellSize + this.gridGap) + this.cellSize / 2;
    const x2 = this.boardOffsetX + lastCell[1] * (this.cellSize + this.gridGap) + this.cellSize / 2;
    const y2 = this.boardOffsetY + lastCell[0] * (this.cellSize + this.gridGap) + this.cellSize / 2;

    const winInfo = this.board.checkWin();
    if (!winInfo) return;

    this.ctx.save();
    this.ctx.globalAlpha = glow.intensity * 0.6;
    this.ctx.strokeStyle = getPlayerColor(winInfo.winner);
    this.ctx.lineWidth = 6;
    this.ctx.lineCap = 'round';
    this.ctx.shadowColor = getPlayerColor(winInfo.winner);
    this.ctx.shadowBlur = 20;
    this.ctx.beginPath();
    this.ctx.moveTo(x1, y1);
    this.ctx.lineTo(x2, y2);
    this.ctx.stroke();
    this.ctx.restore();
  }

  private drawParticles(): void {
    const particles: Particle[] = this.effectSystem.getParticles();
    for (const p of particles) {
      const alpha = p.life / p.maxLife;
      this.ctx.save();
      this.ctx.globalAlpha = alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 5;
      this.ctx.beginPath();
      this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private drawFPS(_width: number, _height: number): void {
    return;
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    this.ctx.moveTo(x + r, y);
    this.ctx.lineTo(x + w - r, y);
    this.ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    this.ctx.lineTo(x + w, y + h - r);
    this.ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    this.ctx.lineTo(x + r, y + h);
    this.ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    this.ctx.lineTo(x, y + r);
    this.ctx.quadraticCurveTo(x, y, x + r, y);
  }

  destroy(): void {
    cancelAnimationFrame(this.animationId);
    this.playerController.clearAiTimer();
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
