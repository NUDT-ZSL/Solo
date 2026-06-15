import { Board, WinLine } from './board';
import { PlayerController, GameState } from './player';
import { EffectManager, COLORS } from './effect';

const BOARD_SIZE = 3;
const CELL_SIZE = 100;
const CELL_GAP = 8;
const PIECE_RADIUS = 30;
const PADDING = 40;
const TITLE_HEIGHT = 80;
const INFO_HEIGHT = 70;
const RESET_HIDE_DURATION = 0.3;
const RESET_REVEAL_DURATION = 0.05;
const PLACEMENT_DURATION = 0.2;
const AI_DELAY = 0.5;

type FullGameState = GameState | 'checking';

export class Game {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  board: Board;
  players: PlayerController;
  effects: EffectManager;
  gameState: FullGameState = 'idle';
  scores = { p1: 0, p2: 0, draws: 0 };
  winLine: WinLine | null = null;
  winner: 1 | 2 | 0 | null = null;
  stateTimer = 0;
  aiDelayTimer = 0;
  lastTime = 0;
  hoverCell: [number, number] | null = null;
  boardPixelSize = 0;
  boardOffsetX = 0;
  boardOffsetY = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.board = new Board();
    this.players = new PlayerController(this.board);
    this.effects = new EffectManager();
    this.setupCanvas();
    this.bindEvents();
    this.startGame();
  }

  setupCanvas(): void {
    const container = this.canvas.parentElement;
    if (!container) return;
    const maxW = Math.min(500, window.innerWidth - 32);
    const totalW = maxW;
    const totalH = TITLE_HEIGHT + INFO_HEIGHT + maxW + 80;
    this.canvas.width = totalW;
    this.canvas.height = totalH;
    this.canvas.style.width = totalW + 'px';
    this.canvas.style.height = totalH + 'px';
    this.boardPixelSize = maxW - PADDING * 2;
    this.boardOffsetX = PADDING;
    this.boardOffsetY = TITLE_HEIGHT + INFO_HEIGHT + PADDING / 2;
  }

  getCellFromPixel(x: number, y: number): [number, number] | null {
    const cs = (this.boardPixelSize - CELL_GAP * 2) / BOARD_SIZE;
    const relX = x - this.boardOffsetX;
    const relY = y - this.boardOffsetY;
    if (relX < 0 || relX >= this.boardPixelSize || relY < 0 || relY >= this.boardPixelSize) {
      return null;
    }
    const cellTotal = cs + CELL_GAP;
    const col = Math.floor(relX / cellTotal);
    const row = Math.floor(relY / cellTotal);
    if (col >= BOARD_SIZE || row >= BOARD_SIZE) return null;
    const cx = col * cellTotal;
    const cy = row * cellTotal;
    if (relX - cx >= cs || relY - cy >= cs) return null;
    return [row, col];
  }

  bindEvents(): void {
    this.canvas.addEventListener('click', (e) => {
      if (!this.players.canInteract()) return;
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      const cell = this.getCellFromPixel(x, y);
      if (cell && this.gameState === 'playing') {
        if (this.players.handleClick(cell[0], cell[1])) {
          this.effects.createPlacementAnim(cell[0], cell[1]);
          this.transitionToPlacing();
        }
      }
    });

    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (e.clientX - rect.left) * (this.canvas.width / rect.width);
      const y = (e.clientY - rect.top) * (this.canvas.height / rect.height);
      this.hoverCell = this.getCellFromPixel(x, y);
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.hoverCell = null;
    });

    window.addEventListener('resize', () => this.setupCanvas());
  }

  bindResetButton(btn: HTMLButtonElement): void {
    btn.addEventListener('click', () => {
      this.resetMatch();
    });
  }

  bindModeToggle(checkbox: HTMLInputElement): void {
    checkbox.addEventListener('change', () => {
      this.players.setMode(2, checkbox.checked ? 'ai' : 'human');
      this.resetMatch();
    });
  }

  startGame(): void {
    this.gameState = 'playing';
    this.players.gameState = 'playing';
    this.lastTime = performance.now();
    requestAnimationFrame((t) => this.loop(t));
  }

  transitionToPlacing(): void {
    this.gameState = 'placing';
    this.players.gameState = 'placing';
    this.stateTimer = PLACEMENT_DURATION;
  }

  transitionToResettingHide(): void {
    this.gameState = 'resetting_hide';
    this.players.gameState = 'resetting_hide';
    this.board.isHidden = true;
    this.stateTimer = RESET_HIDE_DURATION;
    const cx = this.boardOffsetX + this.boardPixelSize / 2;
    const cy = this.boardOffsetY + this.boardPixelSize / 2;
    this.effects.createResetParticles(cx, cy);
  }

  transitionToResettingReveal(): void {
    if (this.gameState !== 'resetting_hide') return;
    this.board.shufflePieces();
    this.board.isHidden = false;
    this.gameState = 'resetting_reveal';
    this.players.gameState = 'resetting_reveal';
    this.stateTimer = RESET_REVEAL_DURATION;
  }

  transitionToChecking(): void {
    if (this.gameState !== 'resetting_reveal') return;
    this.gameState = 'checking';
    this.players.gameState = 'playing';
  }

  checkGameEnd(): boolean {
    const result = this.board.checkWinner();
    if (result.winner) {
      this.winner = result.winner;
      this.winLine = result.line;
      this.effects.setVictory(result.line);
      if (result.winner === 1) this.scores.p1++;
      else this.scores.p2++;
      this.gameState = 'gameOver';
      this.players.gameState = 'gameOver';
      return true;
    }
    if (this.board.isFull()) {
      this.winner = 0;
      this.winLine = null;
      this.scores.draws++;
      this.gameState = 'gameOver';
      this.players.gameState = 'gameOver';
      return true;
    }
    return false;
  }

  continuePlaying(): void {
    this.players.switchTurn();
    this.gameState = 'playing';
    this.players.gameState = 'playing';
    if (this.players.getCurrentMode() === 'ai') {
      this.aiDelayTimer = AI_DELAY;
    }
  }

  resetMatch(): void {
    this.board.reset();
    this.players.resetRound();
    this.effects.clear();
    this.winLine = null;
    this.winner = null;
    this.gameState = 'playing';
    this.players.gameState = 'playing';
    this.stateTimer = 0;
    this.aiDelayTimer = 0;
  }

  update(dt: number): void {
    this.effects.update(dt);

    switch (this.gameState) {
      case 'placing':
        this.stateTimer = Math.max(0, this.stateTimer - dt);
        if (this.stateTimer <= 0) {
          this.transitionToResettingHide();
        }
        break;
      case 'resetting_hide':
        this.stateTimer = Math.max(0, this.stateTimer - dt);
        if (this.stateTimer <= 0) {
          this.transitionToResettingReveal();
        }
        break;
      case 'resetting_reveal':
        this.stateTimer = Math.max(0, this.stateTimer - dt);
        if (this.stateTimer <= 0) {
          this.transitionToChecking();
        }
        break;
      case 'checking':
        if (!this.checkGameEnd()) {
          this.continuePlaying();
        }
        break;
      case 'playing':
        if (this.players.getCurrentMode() === 'ai' && this.players.canPlaceNow()) {
          this.aiDelayTimer = Math.max(0, this.aiDelayTimer - dt);
          if (this.aiDelayTimer <= 0) {
            const move = this.players.getAIMove();
            if (move) {
              if (this.board.placePiece(move[0], move[1], this.players.currentPlayer)) {
                this.effects.createPlacementAnim(move[0], move[1]);
                this.transitionToPlacing();
              }
            }
          }
        }
        break;
    }
  }

  getCellCenter(row: number, col: number): { x: number; y: number } {
    const cs = (this.boardPixelSize - CELL_GAP * 2) / BOARD_SIZE;
    const cellTotal = cs + CELL_GAP;
    const x = this.boardOffsetX + col * cellTotal + cs / 2;
    const y = this.boardOffsetY + row * cellTotal + cs / 2;
    return { x, y };
  }

  render(): void {
    const { ctx, canvas } = this;
    const w = canvas.width;
    const h = canvas.height;

    const grad = ctx.createRadialGradient(w / 2, h / 2, 50, w / 2, h / 2, Math.max(w, h));
    grad.addColorStop(0, COLORS.GOLD_DARK);
    grad.addColorStop(1, COLORS.BG);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    this.drawTitle();
    this.drawInfoBar();
    this.drawBoard();
    this.drawPieces();
    this.drawHoverPreview();
    this.effects.renderParticles(ctx);
    this.drawWinLine();
  }

  drawTitle(): void {
    const { ctx, canvas } = this;
    ctx.save();
    ctx.font = "42px 'Ma Shan Zheng', 'Zhi Mang Xing', cursive, serif";
    ctx.fillStyle = COLORS.GOLD;
    ctx.shadowColor = COLORS.GOLD;
    ctx.shadowBlur = 15;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('熵变棋局', canvas.width / 2, TITLE_HEIGHT / 2 + 8);
    ctx.restore();
  }

  drawInfoBar(): void {
    const { ctx, canvas } = this;
    const y = TITLE_HEIGHT + INFO_HEIGHT / 2;

    ctx.save();
    ctx.font = "16px 'Noto Sans SC', sans-serif";
    ctx.textBaseline = 'middle';

    const dotR = 7;
    const pulse = 0.7 + 0.3 * Math.sin(performance.now() / 300);
    ctx.textAlign = 'left';
    ctx.fillStyle = '#fff';
    ctx.fillText('当前回合', 20, y);
    const dotColor = this.players.currentPlayer === 1 ? COLORS.PLAYER1 : COLORS.PLAYER2;
    ctx.fillStyle = dotColor;
    ctx.shadowColor = dotColor;
    ctx.shadowBlur = 10 * pulse;
    ctx.beginPath();
    ctx.arc(100, y, dotR * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#fff';
    ctx.fillText(this.players.currentPlayer === 1 ? '玩家1 (冰蓝)' : '玩家2 (橙红)', 118, y);

    ctx.textAlign = 'right';
    ctx.fillStyle = COLORS.GOLD;
    ctx.font = "bold 16px 'Noto Sans SC', sans-serif";
    const scoreText = `${this.scores.p1} : ${this.scores.p2}`;
    ctx.fillText(scoreText, canvas.width - 20, y);
    ctx.font = "12px 'Noto Sans SC', sans-serif";
    ctx.fillStyle = '#aaa';
    ctx.fillText('三局两胜', canvas.width - 20, y + 22);
    ctx.restore();
  }

  drawBoard(): void {
    const { ctx } = this;
    const cs = (this.boardPixelSize - CELL_GAP * 2) / BOARD_SIZE;
    const cellTotal = cs + CELL_GAP;

    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const x = this.boardOffsetX + c * cellTotal;
        const y = this.boardOffsetY + r * cellTotal;

        ctx.save();
        ctx.shadowColor = COLORS.GOLD;
        ctx.shadowBlur = 6;
        ctx.strokeStyle = COLORS.GOLD;
        ctx.lineWidth = 2;
        ctx.fillStyle = COLORS.CELL_BG;
        this.roundRect(ctx, x, y, cs, cs, 8);
        ctx.fill();
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  drawPieces(): void {
    if (this.board.isHidden) return;
    const { ctx } = this;
    for (let r = 0; r < BOARD_SIZE; r++) {
      for (let c = 0; c < BOARD_SIZE; c++) {
        const cell = this.board.getCell(r, c);
        if (cell !== 0) {
          const center = this.getCellCenter(r, c);
          const scale = this.effects.getPlacementScale(r, c);
          const radius = PIECE_RADIUS * scale;
          const color = cell === 1 ? COLORS.PLAYER1 : COLORS.PLAYER2;
          ctx.save();
          ctx.shadowColor = color;
          ctx.shadowBlur = 15;
          ctx.fillStyle = color;
          ctx.beginPath();
          ctx.arc(center.x, center.y, radius, 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }

  drawHoverPreview(): void {
    if (this.gameState !== 'playing') return;
    if (this.players.getCurrentMode() !== 'human') return;
    if (!this.hoverCell) return;
    const [r, c] = this.hoverCell;
    if (this.board.getCell(r, c) !== 0) return;
    const { ctx } = this;
    const center = this.getCellCenter(r, c);
    const color = this.players.currentPlayer === 1 ? COLORS.PLAYER1 : COLORS.PLAYER2;
    ctx.save();
    ctx.globalAlpha = 0.3;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(center.x, center.y, PIECE_RADIUS, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  drawWinLine(): void {
    if (!this.winLine) return;
    const { ctx } = this;
    const [start, , end] = this.winLine;
    const s = this.getCellCenter(start[0], start[1]);
    const e = this.getCellCenter(end[0], end[1]);
    const flash = 0.5 + 0.5 * Math.sin(performance.now() / 200);
    ctx.save();
    ctx.shadowColor = COLORS.GOLD;
    ctx.shadowBlur = 25 * flash;
    ctx.strokeStyle = COLORS.GOLD;
    ctx.lineWidth = 5;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(s.x, s.y);
    ctx.lineTo(e.x, e.y);
    ctx.stroke();
    ctx.restore();
  }

  roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  loop(time: number): void {
    const dt = Math.min(0.05, (time - this.lastTime) / 1000);
    this.lastTime = time;
    this.update(dt);
    this.render();
    requestAnimationFrame((t) => this.loop(t));
  }
}

window.addEventListener('DOMContentLoaded', () => {
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
  const resetBtn = document.getElementById('reset-btn') as HTMLButtonElement;
  const aiToggle = document.getElementById('ai-toggle') as HTMLInputElement;

  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }

  const game = new Game(canvas);
  if (resetBtn) game.bindResetButton(resetBtn);
  if (aiToggle) game.bindModeToggle(aiToggle);
});
