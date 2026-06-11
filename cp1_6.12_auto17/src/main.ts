import { Player } from './player';
import { EnemyManager } from './enemy';
import { Renderer } from './renderer';
import type { GameUIState } from './renderer';

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private enemyManager: EnemyManager;
  private renderer: Renderer;
  private score: number = 0;
  private isGameOver: boolean = false;
  private lastTime: number = 0;
  private isMobile: boolean;
  private autoShootTimer: number = 0;
  private readonly autoShootInterval: number = 150;

  constructor() {
    this.canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;

    this.isMobile = this.checkMobile();
    this.resizeCanvas();

    const rect = this.canvas.getBoundingClientRect();
    this.player = new Player(rect.width, rect.height);
    this.enemyManager = new EnemyManager();
    this.enemyManager.reset();
    this.renderer = new Renderer(this.ctx, rect.width, rect.height);

    this.setupEventListeners();
    this.gameLoop = this.gameLoop.bind(this);
  }

  private checkMobile(): boolean {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
      || window.innerWidth <= 768;
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();

    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);

    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;

    if (this.player && this.renderer) {
      this.player.state.x = Math.min(this.player.state.x, rect.width - this.player.state.width);
      this.player.state.y = Math.min(this.player.state.y, rect.height - this.player.state.height - 60);
      this.renderer.resize(rect.width, rect.height);
    }
  }

  private setupEventListeners(): void {
    window.addEventListener('keydown', (e) => {
      if (this.player.isShootKey(e.key) || e.code === 'Space') {
        e.preventDefault();
        if (!this.isGameOver) {
          this.player.shoot();
        }
      } else {
        this.player.setKey(e.key, true);
      }
    });

    window.addEventListener('keyup', (e) => {
      this.player.setKey(e.key, false);
    });

    this.canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      if (this.isGameOver) {
        const rect = this.canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        if (this.renderer.isRestartButtonClick(x, y, this.getUIState())) {
          this.restart();
        }
      } else {
        this.player.shoot();
      }
    });

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();

      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];

        if (this.isGameOver) {
          const x = touch.clientX - rect.left;
          const y = touch.clientY - rect.top;
          if (this.renderer.isRestartButtonClick(x, y, this.getUIState())) {
            this.restart();
            return;
          }
        }

        if (this.renderer.isShootButtonTouch(touch, rect)) {
          this.renderer.handleShootButtonTouchStart(touch, rect);
          if (!this.isGameOver) {
            this.player.shoot();
            this.autoShootTimer = this.autoShootInterval;
          }
        } else {
          this.renderer.handleJoystickTouchStart(touch, rect);
        }
      }
    }, { passive: false });

    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();

      for (let i = 0; i < e.touches.length; i++) {
        const touch = e.touches[i];
        this.renderer.handleJoystickTouchMove(touch, rect);
      }
    }, { passive: false });

    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();

      for (let i = 0; i < e.changedTouches.length; i++) {
        const touch = e.changedTouches[i];
        this.renderer.handleJoystickTouchEnd(touch);
        this.renderer.handleShootButtonTouchEnd(touch);
      }
    }, { passive: false });

    window.addEventListener('resize', () => {
      this.resizeCanvas();
    });
  }

  private getUIState(): GameUIState {
    return {
      score: this.score,
      lives: this.player.state.lives,
      fireLevel: this.player.state.fireLevel,
      isGameOver: this.isGameOver,
      isPowerUp: this.player.state.isPowerUp,
      isMobile: this.isMobile,
      canvasWidth: this.canvas.width / (window.devicePixelRatio || 1),
      canvasHeight: this.canvas.height / (window.devicePixelRatio || 1)
    };
  }

  private gameLoop(timestamp: number): void {
    const deltaTime = Math.min(timestamp - this.lastTime, 50);
    this.lastTime = timestamp;

    if (!this.isGameOver) {
      this.update(deltaTime);
    }

    this.render(deltaTime);
    requestAnimationFrame(this.gameLoop);
  }

  private update(deltaTime: number): void {
    const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
    const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);

    if (this.isMobile) {
      const dir = this.renderer.getJoystickDirection();
      if (dir.x < -0.1) this.player.keys.add('a');
      else this.player.keys.delete('a');
      if (dir.x > 0.1) this.player.keys.add('d');
      else this.player.keys.delete('d');
      if (dir.y < -0.1) this.player.keys.add('w');
      else this.player.keys.delete('w');
      if (dir.y > 0.1) this.player.keys.add('s');
      else this.player.keys.delete('s');

      if (this.renderer.shootButton.active) {
        this.autoShootTimer -= deltaTime;
        if (this.autoShootTimer <= 0) {
          this.player.shoot();
          this.autoShootTimer = this.autoShootInterval;
        }
      }
    }

    this.player.update(deltaTime, canvasWidth, canvasHeight);

    const playerHit = this.enemyManager.update(deltaTime, canvasWidth, canvasHeight);
    if (playerHit) {
      if (this.player.takeDamage()) {
        this.gameOver();
      }
    }

    this.enemyManager.checkBulletCollisions(this.player.bullets, (enemy, bulletIndex) => {
      enemy.active = false;
      this.player.bullets[bulletIndex].active = false;
      this.score += 10;
      this.renderer.createExplosion(
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height / 2
      );
      this.enemyManager.dropPowerUp(
        enemy.x + enemy.width / 2,
        enemy.y + enemy.height / 2
      );
    });

    if (this.enemyManager.checkPlayerCollision(this.player.getRect())) {
      if (this.player.takeDamage()) {
        this.gameOver();
      }
    }

    if (this.enemyManager.checkPowerUpCollision(this.player.getRect())) {
      this.player.activatePowerUp();
    }

    this.player.bullets = this.player.bullets.filter(b => b.active);
  }

  private render(deltaTime: number): void {
    this.renderer.render(
      this.player.state,
      this.player.bullets,
      this.enemyManager.enemies,
      this.enemyManager.powerUps,
      this.getUIState(),
      deltaTime
    );
  }

  private gameOver(): void {
    this.isGameOver = true;
  }

  private restart(): void {
    const canvasWidth = this.canvas.width / (window.devicePixelRatio || 1);
    const canvasHeight = this.canvas.height / (window.devicePixelRatio || 1);

    this.score = 0;
    this.isGameOver = false;
    this.player.reset(canvasWidth, canvasHeight);
    this.enemyManager.reset();
    this.renderer.reset();
    this.autoShootTimer = 0;
  }

  start(): void {
    this.lastTime = performance.now();
    requestAnimationFrame(this.gameLoop);
  }
}

window.addEventListener('load', () => {
  const game = new Game();
  game.start();
});
