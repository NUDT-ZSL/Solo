import { Game, GameEvent, Piece, HexCoord } from './core';
import { Renderer } from './renderer';
import { InputHandler, InputAction } from './input';

class GameApp {
  game: Game;
  renderer: Renderer;
  input: InputHandler;
  canvas: HTMLCanvasElement;
  selectedPiece: Piece | null = null;
  lastTime: number = 0;
  rafId: number = 0;
  private typingTimers: Map<string, number> = new Map();

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    if (!this.canvas) throw new Error('Canvas not found');

    this.game = new Game();
    this.renderer = new Renderer(this.canvas, this.game);

    const originX = this.canvas.width / 2;
    const originY = this.canvas.height / 2;
    this.input = new InputHandler(this.canvas, this.game, originX, originY);

    this.game.turnManager.onEvents((events: GameEvent[]) => {
      this.renderer.handleEvents(events);
      this.updateUI();
      this.checkGameOver();
    });

    this.input.onAction((action: InputAction) => {
      this.handleInputAction(action);
    });

    const restartBtn = document.getElementById('restartBtn');
    if (restartBtn) {
      restartBtn.addEventListener('click', () => this.restartGame());
    }

    this.setupKeyboard();
  }

  private setupKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        this.cancelSelection();
      } else if (e.key === ' ' || e.key === 'Enter') {
        if (!this.game.gameOver) {
          this.endTurn();
        }
      }
    });
  }

  private handleInputAction(action: InputAction): void {
    switch (action.type) {
      case 'selectPiece':
        this.selectPiece(action.piece);
        break;
      case 'move':
        this.movePiece(action.pieceId, action.to);
        break;
      case 'attack':
        this.attackPiece(action.pieceId, action.target);
        break;
      case 'cancel':
        this.cancelSelection();
        break;
      case 'hover':
        this.renderer.setHover(action.hex);
        break;
    }
  }

  private selectPiece(piece: Piece): void {
    this.selectedPiece = piece;
    const movable = this.game.getMovableHexes(piece);
    const attackable = this.game.getAttackableHexes(piece);
    this.renderer.setSelection(piece.id, movable, attackable);
  }

  private cancelSelection(): void {
    this.selectedPiece = null;
    this.input.clearSelection();
    this.renderer.clearSelection();
  }

  private movePiece(pieceId: string, to: HexCoord): void {
    const events = this.game.movePiece(pieceId, to);
    if (events.length > 0) {
      this.selectedPiece = null;
      this.input.clearSelection();
      const piece = this.game.pieces.get(pieceId);
      if (piece && (!piece.hasMoved || !piece.hasAttacked)) {
        this.selectPiece(piece);
      } else {
        this.renderer.clearSelection();
      }
    }
  }

  private attackPiece(pieceId: string, target: HexCoord): void {
    const events = this.game.attackPiece(pieceId, target);
    if (events.length > 0) {
      this.selectedPiece = null;
      this.input.clearSelection();
      this.renderer.clearSelection();
    }
  }

  private endTurn(): void {
    this.cancelSelection();
    this.game.endTurn();
  }

  private animateValue(element: HTMLElement, targetValue: number): void {
    const key = element.id;
    const existing = this.typingTimers.get(key);
    if (existing) {
      clearInterval(existing);
    }
    element.textContent = '';
    const str = String(targetValue);
    let i = 0;
    const timer = window.setInterval(() => {
      if (i < str.length) {
        element.textContent = element.textContent + str[i];
        i++;
      } else {
        clearInterval(timer);
        this.typingTimers.delete(key);
      }
    }, 50);
    this.typingTimers.set(key, timer);
  }

  private updateUI(): void {
    const state = this.game.getState();
    const p1Pieces = document.getElementById('p1Pieces') as HTMLElement;
    const p1AP = document.getElementById('p1AP') as HTMLElement;
    const p1Altars = document.getElementById('p1Altars') as HTMLElement;
    const p2Pieces = document.getElementById('p2Pieces') as HTMLElement;
    const p2AP = document.getElementById('p2AP') as HTMLElement;
    const p2Altars = document.getElementById('p2Altars') as HTMLElement;
    const panel1 = document.getElementById('panel1') as HTMLElement;
    const panel2 = document.getElementById('panel2') as HTMLElement;

    const p1Count = Array.from(state.pieces.values()).filter(p => p.faction === 'player1').length;
    const p2Count = Array.from(state.pieces.values()).filter(p => p.faction === 'player2').length;

    this.animateValue(p1Pieces, p1Count);
    this.animateValue(p1AP, state.actionPoints.player1);
    this.animateValue(p1Altars, state.altarCount.player1);
    this.animateValue(p2Pieces, p2Count);
    this.animateValue(p2AP, state.actionPoints.player2);
    this.animateValue(p2Altars, state.altarCount.player2);

    if (state.currentFaction === 'player1') {
      panel1.classList.add('panel-active');
      panel2.classList.remove('panel-active');
    } else {
      panel1.classList.remove('panel-active');
      panel2.classList.add('panel-active');
    }
  }

  private checkGameOver(): void {
    if (this.game.gameOver && this.game.winner) {
      setTimeout(() => {
        const overlay = document.getElementById('gameOverOverlay') as HTMLElement;
        const resultText = document.getElementById('resultText') as HTMLElement;
        if (this.game.winner === 'player1') {
          resultText.textContent = '玩家 I 胜 利';
        } else {
          resultText.textContent = '玩家 II 胜 利';
        }
        overlay.classList.add('visible');
      }, 1500);
    }
  }

  private restartGame(): void {
    const overlay = document.getElementById('gameOverOverlay') as HTMLElement;
    overlay.classList.remove('visible');
    this.game.startNewGame();
    this.selectedPiece = null;
    this.input.clearSelection();
    this.renderer.clearSelection();
    this.renderer.animations = [];
    this.updateUI();
  }

  private loop = (time: number): void => {
    if (!this.lastTime) this.lastTime = time;
    const dt = Math.min(0.05, (time - this.lastTime) / 1000);
    this.lastTime = time;

    this.renderer.update(dt);
    this.renderer.render();

    this.rafId = requestAnimationFrame(this.loop);
  };

  start(): void {
    this.game.startNewGame();
    this.updateUI();
    this.rafId = requestAnimationFrame(this.loop);
  }

  stop(): void {
    cancelAnimationFrame(this.rafId);
  }
}

const app = new GameApp();
app.start();
