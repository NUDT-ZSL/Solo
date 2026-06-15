import { LevelGenerator, type LevelData } from './LevelGenerator';
import { Player } from './Player';
import { Renderer } from './Renderer';

export type GameState = 'menu' | 'playing' | 'gameover' | 'win';

const VIEW_WIDTH = 900;
const VIEW_HEIGHT = 600;
const LEVEL_WIDTH = 2000;
const LEVEL_HEIGHT = 600;
const GAME_TIME = 120;
const INITIAL_LIVES = 3;
const COIN_SCORE = 10;

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private renderer: Renderer;

  private gameState: GameState = 'menu';
  private levelData!: LevelData;
  private player!: Player;
  private cameraX: number = 0;

  private score: number = 0;
  private lives: number = INITIAL_LIVES;
  private levelNum: number = 1;
  private countdown: number = GAME_TIME;
  private countdownTimer: number = 0;

  private input = {
    left: false,
    right: false,
    jump: false,
  };

  private lastTime: number = 0;
  private gameTime: number = 0;
  private animationId: number | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.renderer = new Renderer(this.ctx, VIEW_WIDTH, VIEW_HEIGHT);

    this.setupInputHandlers();
  }

  private setupInputHandlers(): void {
    window.addEventListener('keydown', (e) => this.handleKeyDown(e));
    window.addEventListener('keyup', (e) => this.handleKeyUp(e));
  }

  private handleKeyDown(e: KeyboardEvent): void {
    if (this.gameState !== 'playing') return;

    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.input.left = true;
        e.preventDefault();
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.input.right = true;
        e.preventDefault();
        break;
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
        this.input.jump = true;
        e.preventDefault();
        break;
    }
  }

  private handleKeyUp(e: KeyboardEvent): void {
    switch (e.code) {
      case 'ArrowLeft':
      case 'KeyA':
        this.input.left = false;
        break;
      case 'ArrowRight':
      case 'KeyD':
        this.input.right = false;
        break;
      case 'Space':
      case 'ArrowUp':
      case 'KeyW':
        this.input.jump = false;
        break;
    }
  }

  start(): void {
    this.gameState = 'playing';
    this.score = 0;
    this.lives = INITIAL_LIVES;
    this.levelNum = 1;
    this.resetCountdown();
    this.gameTime = 0;
    this.cameraX = 0;

    this.resetInput();

    this.generateLevel();
    this.spawnPlayer();
    this.startLoop();
  }

  restart(): void {
    this.start();
  }

  private resetCountdown(): void {
    this.countdown = GAME_TIME;
    this.countdownTimer = 0;
  }

  private resetInput(): void {
    this.input.left = false;
    this.input.right = false;
    this.input.jump = false;
  }

  private generateLevel(): void {
    const seed = Date.now() + this.levelNum * 1000;
    const generator = new LevelGenerator(seed);
    this.levelData = generator.generate();
  }

  private spawnPlayer(): void {
    const startX = 50;
    const startY = LEVEL_HEIGHT - 80 - 30 - 10;
    if (!this.player) {
      this.player = new Player(startX, startY);
    } else {
      this.player.reset(startX, startY);
    }
  }

  private startLoop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
    }
    this.lastTime = performance.now();
    this.animationId = requestAnimationFrame(this.loop.bind(this));
  }

  private loop(currentTime: number): void {
    const dt = Math.min((currentTime - this.lastTime) / 1000, 1 / 30);
    this.lastTime = currentTime;

    if (this.gameState === 'playing') {
      this.update(dt);
    }

    this.render();

    this.animationId = requestAnimationFrame(this.loop.bind(this));
  }

  private update(dt: number): void {
    if (this.gameState !== 'playing') return;

    this.gameTime += dt;

    this.countdownTimer += dt;
    if (this.countdownTimer >= 1) {
      this.countdownTimer -= 1;
      this.countdown--;
      if (this.countdown <= 0) {
        this.countdown = 0;
        this.gameOver();
        return;
      }
    }

    this.player.update(dt, this.input, this.levelData.platforms, LEVEL_WIDTH, LEVEL_HEIGHT);

    this.updateCamera();

    if (this.player.checkSpikeCollision(this.levelData.spikes)) {
      this.loseLife();
      return;
    }

    const coinsCollected = this.player.checkCoinCollision(this.levelData.coins);
    if (coinsCollected > 0) {
      this.score += coinsCollected * COIN_SCORE;
    }

    if (this.player.checkPortalCollision(this.levelData.portal)) {
      this.win();
      return;
    }

    if (this.player.y > LEVEL_HEIGHT + 100) {
      this.loseLife();
    }
  }

  private updateCamera(): void {
    const targetX = this.player.x + this.player.width / 2 - VIEW_WIDTH / 2;
    this.cameraX = Math.max(0, Math.min(LEVEL_WIDTH - VIEW_WIDTH, targetX));
  }

  private loseLife(): void {
    this.lives--;
    this.resetInput();

    if (this.lives <= 0) {
      this.gameOver();
    } else {
      this.spawnPlayer();
    }
  }

  private gameOver(): void {
    this.gameState = 'gameover';
    this.notifyEndScreen(false);
  }

  private win(): void {
    this.gameState = 'win';
    this.score += this.countdown * 5;
    this.notifyEndScreen(true);
  }

  private notifyEndScreen(win: boolean): void {
    const endScreen = document.getElementById('end-screen');
    const endTitle = document.getElementById('end-title');
    const endScore = document.getElementById('end-score');

    if (endScreen) endScreen.style.display = 'flex';
    if (endTitle) endTitle.textContent = win ? '恭喜通关！' : '游戏结束';
    if (endScore) endScore.textContent = `总分：${this.score}`;
  }

  private render(): void {
    if (!this.levelData || !this.player) {
      this.renderPlaceholder();
      return;
    }

    this.renderer.render(
      this.levelData,
      this.player,
      this.cameraX,
      this.gameTime,
      this.score,
      this.lives,
      this.levelNum,
      this.countdown
    );
  }

  private renderPlaceholder(): void {
    const gradient = this.ctx.createLinearGradient(0, 0, 0, VIEW_HEIGHT);
    gradient.addColorStop(0, '#1e3a5f');
    gradient.addColorStop(1, '#60a5fa');
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, VIEW_WIDTH, VIEW_HEIGHT);
  }

  getState(): GameState {
    return this.gameState;
  }

  getScore(): number {
    return this.score;
  }
}
