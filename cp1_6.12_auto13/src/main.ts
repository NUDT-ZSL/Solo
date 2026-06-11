import { Player } from './player';
import { SceneManager } from './scene';
import { ObstacleManager } from './obstacle';
import { UIManager } from './ui';

const BASE_SPEED = 300;
const MAX_SPEED = 800;
const SPEED_INCREMENT = 0.015;

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private container: HTMLElement;
  private width: number = 0;
  private height: number = 0;
  private dpr: number;

  private player: Player;
  private scene: SceneManager;
  private obstacleManager: ObstacleManager;
  private ui: UIManager;

  private isRunning: boolean = false;
  private isGameOver: boolean = false;
  private isStarted: boolean = false;
  private score: number = 0;
  private scrollSpeed: number = BASE_SPEED;
  private groundY: number = 0;

  private lastTime: number = 0;
  private animationId: number | null = null;

  private screenShake: number = 0;
  private screenFlash: number = 0;

  private startHint: HTMLElement | null;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.container = document.getElementById('game-container') as HTMLElement;
    this.startHint = document.getElementById('start-hint');

    const ctx = this.canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Canvas 2D context not supported');
    }
    this.ctx = ctx;

    this.dpr = Math.min(window.devicePixelRatio || 1, 2);

    this.resize();

    this.groundY = Math.floor(this.height * 0.75);

    this.player = new Player(Math.floor(this.width * 0.2), this.groundY);
    this.scene = new SceneManager(this.width, this.height, this.groundY);
    this.obstacleManager = new ObstacleManager(this.width, this.height, this.groundY);
    this.ui = new UIManager(this.width, this.height);

    this.ui.setRestartCallback(() => this.restart());

    this.bindEvents();
    this.render();
  }

  private bindEvents(): void {
    window.addEventListener('resize', () => this.resize());

    window.addEventListener('keydown', (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'ArrowUp') {
        e.preventDefault();
        this.handleJump();
      }
    });

    const handlePointerDown = (clientX: number, clientY: number) => {
      const rect = this.canvas.getBoundingClientRect();
      const x = (clientX - rect.left) * (this.width / rect.width);
      const y = (clientY - rect.top) * (this.height / rect.height);

      if (this.isGameOver) {
        if (!this.ui.handleClick(x, y)) {
          this.restart();
        }
      } else {
        this.handleJump();
      }
    };

    this.canvas.addEventListener('mousedown', (e: MouseEvent) => {
      e.preventDefault();
      handlePointerDown(e.clientX, e.clientY);
    });

    this.canvas.addEventListener(
      'touchstart',
      (e: TouchEvent) => {
        e.preventDefault();
        if (e.touches.length > 0) {
          handlePointerDown(e.touches[0].clientX, e.touches[0].clientY);
        }
      },
      { passive: false }
    );
  }

  private handleJump(): void {
    if (this.isGameOver) {
      this.restart();
      return;
    }

    if (!this.isStarted) {
      this.start();
      return;
    }

    this.player.jump();
  }

  private start(): void {
    this.isStarted = true;
    this.isRunning = true;
    this.isGameOver = false;
    this.score = 0;
    this.scrollSpeed = BASE_SPEED;
    this.ui.setStarted(true);
    this.ui.setGameOver(false, 0);

    if (this.startHint) {
      this.startHint.style.display = 'none';
    }

    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private restart(): void {
    this.score = 0;
    this.scrollSpeed = BASE_SPEED;
    this.isGameOver = false;
    this.isRunning = true;
    this.screenShake = 0;
    this.screenFlash = 0;

    this.groundY = Math.floor(this.height * 0.75);
    this.player.reset(Math.floor(this.width * 0.2), this.groundY);
    this.obstacleManager.reset();
    this.ui.setGameOver(false, 0);

    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  private resize(): void {
    const rect = this.container.getBoundingClientRect();
    this.width = Math.floor(rect.width);
    this.height = Math.floor(rect.height);

    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';

    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    this.groundY = Math.floor(this.height * 0.75);

    if (this.scene) this.scene.resize(this.width, this.height, this.groundY);
    if (this.obstacleManager)
      this.obstacleManager.resize(this.width, this.height, this.groundY);
    if (this.player) this.player.reset(Math.floor(this.width * 0.2), this.groundY);
    if (this.ui) this.ui.resize(this.width, this.height);
  }

  private loop(currentTime: number): void {
    if (!this.isRunning) {
      return;
    }

    const deltaTime = Math.min(currentTime - this.lastTime, 50);
    this.lastTime = currentTime;

    this.update(deltaTime);
    this.render();

    if (this.isRunning) {
      this.animationId = requestAnimationFrame((t) => this.loop(t));
    }
  }

  private update(deltaTime: number): void {
    if (this.isGameOver) {
      if (this.screenShake > 0) {
        this.screenShake -= deltaTime * 0.05;
        if (this.screenShake < 0) this.screenShake = 0;
      }
      if (this.screenFlash > 0) {
        this.screenFlash -= deltaTime * 0.003;
        if (this.screenFlash < 0) this.screenFlash = 0;
      }
      return;
    }

    const speedProgress = Math.min((this.scrollSpeed - BASE_SPEED) / (MAX_SPEED - BASE_SPEED), 1);
    this.scrollSpeed = BASE_SPEED + speedProgress * (MAX_SPEED - BASE_SPEED);
    this.scrollSpeed += SPEED_INCREMENT * deltaTime;
    if (this.scrollSpeed > MAX_SPEED) this.scrollSpeed = MAX_SPEED;

    this.score += Math.floor(this.scrollSpeed * deltaTime * 0.0005);

    this.scene.update(this.scrollSpeed, deltaTime);
    this.player.update(this.scrollSpeed, deltaTime, this.groundY);

    const playerBounds = this.player.getBounds();
    const collided = this.obstacleManager.update(
      this.scrollSpeed,
      deltaTime,
      this.score,
      playerBounds
    );

    this.ui.setScore(this.score);

    if (collided) {
      this.gameOver();
    }
  }

  private gameOver(): void {
    this.isGameOver = true;
    this.isRunning = false;
    this.screenShake = 15;
    this.screenFlash = 1;
    this.ui.setGameOver(true, this.score);

    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }

    this.render();
    this.shakeLoop();
  }

  private shakeLoop(): void {
    if (this.screenShake > 0 || this.screenFlash > 0) {
      this.screenShake -= 16 * 0.05;
      if (this.screenShake < 0) this.screenShake = 0;
      this.screenFlash -= 16 * 0.003;
      if (this.screenFlash < 0) this.screenFlash = 0;
      this.render();
      requestAnimationFrame(() => this.shakeLoop());
    }
  }

  private render(): void {
    const ctx = this.ctx;

    let shakeX = 0;
    let shakeY = 0;
    if (this.screenShake > 0) {
      shakeX = (Math.random() - 0.5) * this.screenShake * 2;
      shakeY = (Math.random() - 0.5) * this.screenShake * 2;
    }

    ctx.save();
    ctx.translate(shakeX, shakeY);

    this.scene.render(ctx);
    this.obstacleManager.render(ctx);

    if (this.isStarted || this.isGameOver) {
      this.player.render(ctx);
    }

    ctx.restore();

    if (this.screenFlash > 0) {
      ctx.save();
      ctx.fillStyle = `rgba(255, 0, 64, ${this.screenFlash * 0.5})`;
      ctx.fillRect(0, 0, this.width, this.height);
      ctx.restore();
    }

    if (this.isStarted || this.isGameOver) {
      this.ui.render(ctx);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
