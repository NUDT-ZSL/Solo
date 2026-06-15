import {
  Paddle,
  Ball,
  GameState,
  createPaddle,
  createBall,
  createInitialState,
  updatePaddlePosition,
  updatePaddleGlow,
  checkPaddleCollision,
  handlePaddleCollision,
  updateBall,
  handleScore,
  renderBackground,
  renderPaddle,
  renderBall,
  renderScores,
  getBallSpeed,
  resetBall,
  resetPaddles
} from './game';
import { AIController } from './ai';
import { ParticleSystem } from './particles';

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 500;
const PADDLE_SPEED = 6;
const FLASH_DURATION = 100;

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private leftPaddle: Paddle;
  private rightPaddle: Paddle;
  private ball: Ball;
  private state: GameState;
  private aiController: AIController;
  private particleSystem: ParticleSystem;

  private keys: Set<string> = new Set();
  private lastTime = 0;
  private animationId: number | null = null;

  private flashOverlay: HTMLDivElement;
  private winOverlay: HTMLDivElement;
  private winText: HTMLSpanElement;
  private restartBtnOverlay: HTMLButtonElement;
  private modeSwitch: HTMLDivElement;
  private modeLabel: HTMLSpanElement;
  private aiSpeedSlider: HTMLInputElement;
  private aiSpeedLabel: HTMLSpanElement;
  private speedDisplay: HTMLSpanElement;
  private resetBtn: HTMLButtonElement;

  private flashTimeout: number | null = null;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    const ctx = this.canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;

    this.flashOverlay = document.getElementById('flashOverlay') as HTMLDivElement;
    this.winOverlay = document.getElementById('winOverlay') as HTMLDivElement;
    this.winText = document.getElementById('winText') as HTMLSpanElement;
    this.restartBtnOverlay = document.getElementById('restartBtnOverlay') as HTMLButtonElement;
    this.modeSwitch = document.getElementById('modeSwitch') as HTMLDivElement;
    this.modeLabel = document.getElementById('modeLabel') as HTMLSpanElement;
    this.aiSpeedSlider = document.getElementById('aiSpeedSlider') as HTMLInputElement;
    this.aiSpeedLabel = document.getElementById('aiSpeedLabel') as HTMLSpanElement;
    this.speedDisplay = document.getElementById('speedDisplay') as HTMLSpanElement;
    this.resetBtn = document.getElementById('resetBtn') as HTMLButtonElement;

    this.leftPaddle = createPaddle(20, CANVAS_HEIGHT);
    this.rightPaddle = createPaddle(CANVAS_WIDTH - 20 - 12, CANVAS_HEIGHT);
    this.ball = createBall(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.state = createInitialState();
    this.aiController = new AIController('medium');
    this.particleSystem = new ParticleSystem();

    this.setupEventListeners();
    this.handleResize();
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      this.keys.add(e.key.toLowerCase());

      if (this.state.winner) {
        this.resetGame();
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.key.toLowerCase());
    });

    this.modeSwitch.addEventListener('click', () => {
      this.toggleMode();
    });

    this.aiSpeedSlider.addEventListener('input', () => {
      this.updateAISpeed();
    });

    this.resetBtn.addEventListener('click', () => {
      this.resetGame();
    });

    this.restartBtnOverlay.addEventListener('click', () => {
      this.resetGame();
    });

    window.addEventListener('resize', () => {
      this.handleResize();
    });
  }

  private handleResize(): void {
    if (window.innerWidth < 900) {
      this.canvas.style.width = '640px';
      this.canvas.style.height = '400px';
    } else {
      this.canvas.style.width = '800px';
      this.canvas.style.height = '500px';
    }
  }

  private toggleMode(): void {
    if (this.state.mode === 'single') {
      this.state.mode = 'double';
      this.modeSwitch.classList.remove('active');
      this.modeLabel.textContent = '双人';
    } else {
      this.state.mode = 'single';
      this.modeSwitch.classList.add('active');
      this.modeLabel.textContent = '单人';
    }
    this.resetGame();
  }

  private updateAISpeed(): void {
    const value = parseInt(this.aiSpeedSlider.value, 10);
    if (value === 1) {
      this.aiController.setSpeedByValue(2);
      this.aiSpeedLabel.textContent = '慢';
    } else if (value === 2) {
      this.aiController.setSpeedByValue(4);
      this.aiSpeedLabel.textContent = '中';
    } else if (value === 3) {
      this.aiController.setSpeedByValue(6);
      this.aiSpeedLabel.textContent = '快';
    }
  }

  private resetGame(): void {
    this.state = createInitialState();
    resetPaddles(this.leftPaddle, this.rightPaddle, CANVAS_HEIGHT);
    this.ball = createBall(CANVAS_WIDTH, CANVAS_HEIGHT);
    this.particleSystem.clear();
    this.hideWinOverlay();
    this.speedDisplay.textContent = getBallSpeed(this.ball).toFixed(1);
  }

  private triggerFlash(): void {
    this.flashOverlay.classList.add('active');
    if (this.flashTimeout) {
      clearTimeout(this.flashTimeout);
    }
    this.flashTimeout = window.setTimeout(() => {
      this.flashOverlay.classList.remove('active');
    }, FLASH_DURATION);
  }

  private showWinOverlay(winner: 'left' | 'right'): void {
    const winnerLabel = this.state.mode === 'double'
      ? (winner === 'left' ? 'Player 1' : 'Player 2')
      : (winner === 'left' ? 'AI' : 'Player');
    this.winText.textContent = `${winnerLabel} Wins!!`;
    this.winOverlay.classList.add('active');
    this.restartBtnOverlay.classList.add('active');
  }

  private hideWinOverlay(): void {
    this.winOverlay.classList.remove('active');
    this.restartBtnOverlay.classList.remove('active');
  }

  private update(deltaTime: number): void {
    if (this.state.winner) return;

    updatePaddleGlow(this.leftPaddle, deltaTime);
    updatePaddleGlow(this.rightPaddle, deltaTime);

    if (this.state.mode === 'single') {
      this.aiController.update(this.leftPaddle, this.ball, CANVAS_HEIGHT);
    } else {
      if (this.keys.has('w')) {
        updatePaddlePosition(this.leftPaddle, -1, PADDLE_SPEED, CANVAS_HEIGHT);
      }
      if (this.keys.has('s')) {
        updatePaddlePosition(this.leftPaddle, 1, PADDLE_SPEED, CANVAS_HEIGHT);
      }
    }

    if (this.keys.has('arrowup')) {
      updatePaddlePosition(this.rightPaddle, -1, PADDLE_SPEED, CANVAS_HEIGHT);
    }
    if (this.keys.has('arrowdown')) {
      updatePaddlePosition(this.rightPaddle, 1, PADDLE_SPEED, CANVAS_HEIGHT);
    }

    if (checkPaddleCollision(this.ball, this.leftPaddle, true)) {
      const pos = handlePaddleCollision(this.ball, this.leftPaddle, true);
      this.particleSystem.emit(pos.collisionX, pos.collisionY);
      this.triggerFlash();
    }
    if (checkPaddleCollision(this.ball, this.rightPaddle, false)) {
      const pos = handlePaddleCollision(this.ball, this.rightPaddle, false);
      this.particleSystem.emit(pos.collisionX, pos.collisionY);
      this.triggerFlash();
    }

    const scored = updateBall(this.ball, CANVAS_WIDTH, CANVAS_HEIGHT);
    if (scored) {
      const winner = handleScore(this.state, scored);
      this.speedDisplay.textContent = getBallSpeed(this.ball).toFixed(1);

      if (winner) {
        this.showWinOverlay(winner);
      } else {
        const direction: -1 | 1 = scored === 'left' ? 1 : -1;
        resetBall(this.ball, CANVAS_WIDTH, CANVAS_HEIGHT, direction);
        this.speedDisplay.textContent = getBallSpeed(this.ball).toFixed(1);
      }
    }

    this.particleSystem.update(deltaTime);
  }

  private render(): void {
    renderBackground(this.ctx, CANVAS_WIDTH, CANVAS_HEIGHT);
    renderScores(this.ctx, this.state, CANVAS_WIDTH);
    renderPaddle(this.ctx, this.leftPaddle);
    renderPaddle(this.ctx, this.rightPaddle);
    renderBall(this.ctx, this.ball);
    this.particleSystem.render(this.ctx);
  }

  private loop = (timestamp: number): void => {
    if (this.lastTime === 0) {
      this.lastTime = timestamp;
    }

    const deltaTime = Math.min((timestamp - this.lastTime) / 1000, 0.05);
    this.lastTime = timestamp;

    this.update(deltaTime);
    this.render();

    this.animationId = requestAnimationFrame(this.loop);
  };

  public start(): void {
    if (this.animationId === null) {
      this.lastTime = 0;
      this.animationId = requestAnimationFrame(this.loop);
    }
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
