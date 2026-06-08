import { BrickManager, Brick } from './BrickManager';
import { ParticleSystem } from './ParticleSystem';

type GameState = 'menu' | 'playing' | 'gameover';

interface Paddle {
  x: number;
  y: number;
  width: number;
  height: number;
  flashTimer: number;
}

interface Ball {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  speed: number;
}

interface BgDot {
  x: number;
  y: number;
  size: number;
  speed: number;
  alpha: number;
}

const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 600;
const PADDLE_WIDTH = 100;
const PADDLE_HEIGHT = 12;
const PADDLE_BOTTOM = 20;
const PADDLE_KEY_SPEED = 8;
const BALL_RADIUS = 6;
const BALL_SPEED = 420;
const BG_DOT_COUNT = 20;
const NEON_COLORS = ['#FF3366', '#FF9933', '#FFD700', '#33FF99', '#3399FF', '#9933FF'];

export class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private paddle: Paddle;
  private ball: Ball;
  private gameState: GameState;
  private score: number;
  private lives: number;

  private brickManager: BrickManager;
  private particleSystem: ParticleSystem;

  private bgDots: BgDot[] = [];
  private keys: { left: boolean; right: boolean } = { left: false, right: false };
  private mouseX: number = CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2;
  private useMouse: boolean = true;

  private lastTime: number = 0;
  private fpsTimer: number = 0;
  private fpsFrames: number = 0;
  private currentFps: number = 0;
  private gameOverTimer: number = 0;
  private gameOverFlash: boolean = false;

  private animationId: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;

    this.brickManager = new BrickManager();
    this.particleSystem = new ParticleSystem();

    this.paddle = {
      x: CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2,
      y: CANVAS_HEIGHT - PADDLE_BOTTOM - PADDLE_HEIGHT,
      width: PADDLE_WIDTH,
      height: PADDLE_HEIGHT,
      flashTimer: 0
    };

    this.ball = {
      x: CANVAS_WIDTH / 2,
      y: this.paddle.y - BALL_RADIUS - 2,
      vx: 0,
      vy: 0,
      radius: BALL_RADIUS,
      speed: BALL_SPEED
    };

    this.gameState = 'menu';
    this.score = 0;
    this.lives = 3;

    this.initBgDots();
    this.bindEvents();
  }

  private initBgDots(): void {
    this.bgDots = [];
    for (let i = 0; i < BG_DOT_COUNT; i++) {
      this.bgDots.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: 2 + Math.random() * 2,
        speed: 8 + Math.random() * 12,
        alpha: 0.3
      });
    }
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousemove', (e) => {
      const rect = this.canvas.getBoundingClientRect();
      this.mouseX = (e.clientX - rect.left) * (CANVAS_WIDTH / rect.width) - PADDLE_WIDTH / 2;
      this.mouseX = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, this.mouseX));
      this.useMouse = true;
    });

    window.addEventListener('keydown', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.keys.left = true;
        this.useMouse = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.keys.right = true;
        this.useMouse = false;
      }
    });

    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'a' || e.key === 'A') {
        this.keys.left = false;
      }
      if (e.key === 'ArrowRight' || e.key === 'd' || e.key === 'D') {
        this.keys.right = false;
      }
    });
  }

  start(): void {
    this.gameState = 'playing';
    this.score = 0;
    this.lives = 3;
    this.brickManager.generateBricks(false);
    this.particleSystem.clear();
    this.resetBall();
    this.resetPaddle();
    this.lastTime = performance.now();
    this.loop();
  }

  reset(): void {
    this.gameState = 'playing';
    this.score = 0;
    this.lives = 3;
    this.brickManager.generateBricks(false);
    this.particleSystem.clear();
    this.resetBall();
    this.resetPaddle();
  }

  private resetBall(): void {
    const angle = -Math.PI / 4;
    this.ball.x = CANVAS_WIDTH / 2;
    this.ball.y = this.paddle.y - BALL_RADIUS - 2;
    this.ball.vx = Math.cos(angle) * BALL_SPEED;
    this.ball.vy = Math.sin(angle) * BALL_SPEED;
    this.ball.speed = BALL_SPEED;
  }

  private resetPaddle(): void {
    this.paddle.x = CANVAS_WIDTH / 2 - PADDLE_WIDTH / 2;
    this.paddle.flashTimer = 0;
  }

  private loop = (): void => {
    this.animationId = requestAnimationFrame(this.loop);
    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 1000, 0.05);
    this.lastTime = now;

    this.fpsTimer += dt;
    this.fpsFrames++;
    if (this.fpsTimer >= 0.5) {
      this.currentFps = Math.round(this.fpsFrames / this.fpsTimer);
      this.fpsTimer = 0;
      this.fpsFrames = 0;
    }

    if (this.gameState === 'playing') {
      this.update(dt);
    }
    this.render();
  };

  stop(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }

  private update(dt: number): void {
    this.updateBgDots(dt);
    this.updatePaddle(dt);
    this.updateBall(dt);
    this.brickManager.update(dt);
    this.particleSystem.update(dt);

    if (this.brickManager.isAllCleared()) {
      this.score += 500;
      this.particleSystem.burst(CANVAS_WIDTH / 2, CANVAS_HEIGHT / 2, 50, NEON_COLORS);
      this.brickManager.generateBricks(true);
    }
  }

  private updateBgDots(dt: number): void {
    for (const dot of this.bgDots) {
      dot.y -= dot.speed * dt;
      if (dot.y < -5) {
        dot.y = CANVAS_HEIGHT + 5;
        dot.x = Math.random() * CANVAS_WIDTH;
      }
    }
  }

  private updatePaddle(_dt: number): void {
    if (this.useMouse) {
      this.paddle.x = this.mouseX;
    } else {
      if (this.keys.left) {
        this.paddle.x -= PADDLE_KEY_SPEED;
      }
      if (this.keys.right) {
        this.paddle.x += PADDLE_KEY_SPEED;
      }
    }
    this.paddle.x = Math.max(0, Math.min(CANVAS_WIDTH - PADDLE_WIDTH, this.paddle.x));

    if (this.paddle.flashTimer > 0) {
      this.paddle.flashTimer -= _dt;
    }
  }

  private updateBall(dt: number): void {
    this.ball.x += this.ball.vx * dt;
    this.ball.y += this.ball.vy * dt;

    if (this.ball.x - this.ball.radius <= 0) {
      this.ball.x = this.ball.radius;
      this.ball.vx = -this.ball.vx;
    }
    if (this.ball.x + this.ball.radius >= CANVAS_WIDTH) {
      this.ball.x = CANVAS_WIDTH - this.ball.radius;
      this.ball.vx = -this.ball.vx;
    }
    if (this.ball.y - this.ball.radius <= 0) {
      this.ball.y = this.ball.radius;
      this.ball.vy = -this.ball.vy;
    }

    this.checkPaddleCollision();
    this.checkBrickCollision();

    if (this.ball.y - this.ball.radius > CANVAS_HEIGHT) {
      this.lives--;
      if (this.lives <= 0) {
        this.gameState = 'gameover';
        this.gameOverTimer = 0;
        const finalScoreEl = document.getElementById('final-score');
        if (finalScoreEl) finalScoreEl.textContent = String(this.score);
        const menuScreen = document.getElementById('menu-screen');
        const gameoverScreen = document.getElementById('gameover-screen');
        if (menuScreen) menuScreen.classList.remove('active');
        if (gameoverScreen) gameoverScreen.classList.add('active');
      } else {
        this.resetBall();
        this.resetPaddle();
      }
    }
  }

  private checkPaddleCollision(): void {
    const ballLeft = this.ball.x - this.ball.radius;
    const ballRight = this.ball.x + this.ball.radius;
    const ballBottom = this.ball.y + this.ball.radius;
    const ballTop = this.ball.y - this.ball.radius;

    const paddleLeft = this.paddle.x;
    const paddleRight = this.paddle.x + this.paddle.width;
    const paddleTop = this.paddle.y;
    const paddleBottom = this.paddle.y + this.paddle.height;

    if (ballRight >= paddleLeft && ballLeft <= paddleRight &&
        ballBottom >= paddleTop && ballTop <= paddleBottom && this.ball.vy > 0) {
      this.ball.y = paddleTop - this.ball.radius;
      const hitPoint = (this.ball.x - this.paddle.x) / this.paddle.width;
      const angle = (hitPoint - 0.5) * (Math.PI / 3) * 2;
      const clampedAngle = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, angle));
      this.ball.vx = Math.sin(clampedAngle) * this.ball.speed;
      this.ball.vy = -Math.cos(clampedAngle) * this.ball.speed;
      this.paddle.flashTimer = 0.1;
    }
  }

  private checkBrickCollision(): void {
    const bricks = this.brickManager.getActiveBricks();
    for (const brick of bricks) {
      if (this.ballBrickCollision(brick)) {
        this.brickManager.destroyBrick(brick);
        this.score += 10;
        this.particleSystem.emit(
          brick.x + brick.width / 2,
          brick.y + brick.height / 2,
          6,
          { colors: [brick.color], minSpeed: 100, maxSpeed: 200, minSize: 3, maxSize: 5, life: 0.6 }
        );
        break;
      }
    }
  }

  private ballBrickCollision(brick: Brick): boolean {
    const closestX = Math.max(brick.x, Math.min(this.ball.x, brick.x + brick.width));
    const closestY = Math.max(brick.y, Math.min(this.ball.y, brick.y + brick.height));
    const dx = this.ball.x - closestX;
    const dy = this.ball.y - closestY;
    const distance = Math.sqrt(dx * dx + dy * dy);

    if (distance < this.ball.radius) {
      const overlapX = this.ball.radius - Math.abs(dx);
      const overlapY = this.ball.radius - Math.abs(dy);

      if (overlapX < overlapY) {
        this.ball.vx = -this.ball.vx;
      } else {
        this.ball.vy = -this.ball.vy;
      }
      return true;
    }
    return false;
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    this.renderBackground();
    this.renderBgDots();

    if (this.gameState === 'playing' || this.gameState === 'gameover') {
      this.brickManager.render(ctx);
      this.renderPaddle();
      this.renderBall();
      this.particleSystem.render(ctx);
      this.renderHUD();
    }

    if (this.gameState === 'gameover') {
      this.renderGameOver();
    }
  }

  private renderBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createLinearGradient(0, 0, 0, CANVAS_HEIGHT);
    gradient.addColorStop(0, '#1A0A2E');
    gradient.addColorStop(1, '#0F0C29');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
  }

  private renderBgDots(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.fillStyle = '#9F7AEA';
    ctx.globalAlpha = 0.3;
    for (const dot of this.bgDots) {
      ctx.beginPath();
      ctx.arc(dot.x, dot.y, dot.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private renderPaddle(): void {
    const ctx = this.ctx;
    ctx.save();

    const gradient = ctx.createLinearGradient(this.paddle.x, 0, this.paddle.x + this.paddle.width, 0);
    gradient.addColorStop(0, '#00D4FF');
    gradient.addColorStop(1, '#9F7AEA');

    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00D4FF';

    if (this.paddle.flashTimer > 0) {
      ctx.fillStyle = '#FFFFFF';
    } else {
      ctx.fillStyle = gradient;
    }

    ctx.fillRect(this.paddle.x, this.paddle.y, this.paddle.width, this.paddle.height);
    ctx.restore();
  }

  private renderBall(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.shadowBlur = 8;
    ctx.shadowColor = '#00D4FF';
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(this.ball.x, this.ball.y, this.ball.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }

  private renderHUD(): void {
    const ctx = this.ctx;
    ctx.save();
    ctx.font = '16px "Segoe UI", sans-serif';
    ctx.textAlign = 'left';
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('SCORE: ', 20, 30);
    ctx.fillStyle = '#FFD700';
    ctx.fillText(String(this.score), 90, 30);
    ctx.fillStyle = '#FFFFFF';
    ctx.fillText('LIVES: ', 20, 54);
    ctx.fillStyle = '#FF6B6B';
    const hearts = '♥'.repeat(Math.max(0, this.lives));
    ctx.fillText(hearts, 85, 54);

    ctx.textAlign = 'right';
    ctx.font = '12px "Segoe UI", sans-serif';
    ctx.fillStyle = '#666666';
    ctx.fillText(`FPS: ${this.currentFps}`, CANVAS_WIDTH - 20, 24);
    ctx.restore();
  }

  private renderGameOver(): void {
    this.gameOverTimer += 1 / 60;
    if (this.gameOverTimer >= 0.3) {
      this.gameOverTimer = 0;
      this.gameOverFlash = !this.gameOverFlash;
    }

    if (this.gameOverFlash) {
      const ctx = this.ctx;
      ctx.save();
      ctx.font = 'bold 24px "Segoe UI", sans-serif';
      ctx.textAlign = 'center';
      ctx.fillStyle = '#FF3366';
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#FF3366';
      ctx.fillText('GAME OVER', CANVAS_WIDTH / 2, CANVAS_HEIGHT - 40);
      ctx.restore();
    }
  }
}
