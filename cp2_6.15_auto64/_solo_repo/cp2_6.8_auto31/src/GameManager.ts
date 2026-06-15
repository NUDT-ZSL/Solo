import { Ball } from './Ball';
import { Paddle } from './Paddle';

export type GameState = 'start' | 'playing' | 'paused' | 'gameover' | 'win';
export type PowerUpType = 'speed' | 'wide' | 'multiball';

export interface Brick {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  glowColor: string;
  alive: boolean;
  points: number;
  row: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  alpha: number;
  life: number;
  maxLife: number;
  size: number;
}

export interface PowerUp {
  x: number;
  y: number;
  width: number;
  height: number;
  type: PowerUpType;
  speed: number;
}

export class GameManager {
  public readonly canvas: HTMLCanvasElement;
  public readonly ctx: CanvasRenderingContext2D;
  public readonly width: number;
  public readonly height: number;

  public state: GameState = 'start';
  public score: number = 0;
  public highScore: number = 0;
  public lives: number = 3;
  public readonly maxLives: number = 3;

  public paddle: Paddle;
  public balls: Ball[] = [];
  public bricks: Brick[] = [];
  public particles: Particle[] = [];
  public powerUps: PowerUp[] = [];

  public readonly brickRows: number = 5;
  public readonly brickCols: number = 10;
  public readonly brickPadding: number = 6;
  public readonly brickTopOffset: number = 60;
  public readonly brickSideOffset: number = 30;

  public maxParticles: number = 80;
  public particleCountPerBrick: number = 8;
  private readonly powerUpDropChance: number = 0.25;
  private readonly powerUpSpeed: number;

  private readonly highScoreKey: string = 'breakout_high_score';

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');
    this.ctx = ctx;
    this.width = canvas.width;
    this.height = canvas.height;

    this.paddle = new Paddle(this.width, this.height);
    this.powerUpSpeed = this.height * 0.004;

    this.highScore = this.loadHighScore();
  }

  public startNewGame(): void {
    this.state = 'playing';
    this.score = 0;
    this.lives = this.maxLives;
    this.particles = [];
    this.powerUps = [];
    this.paddle.reset(this.width);
    this.createBricks();
    this.balls = [this.createBall()];
  }

  public pause(): void {
    if (this.state === 'playing') {
      this.state = 'paused';
    }
  }

  public resume(): void {
    if (this.state === 'paused') {
      this.state = 'playing';
    }
  }

  public togglePause(): void {
    if (this.state === 'playing') {
      this.pause();
    } else if (this.state === 'paused') {
      this.resume();
    }
  }

  public launchBall(): void {
    if (this.state === 'playing') {
      this.balls.forEach(ball => {
        if (ball.attached) ball.launch();
      });
    }
  }

  public update(deltaTime: number): void {
    if (this.state !== 'playing') return;

    this.paddle.update(deltaTime);

    const ballsToRemove: number[] = [];
    this.balls.forEach((ball, index) => {
      const alive = ball.update(deltaTime, this.paddle.x, this.paddle.width, this.paddle.y);
      if (!alive) {
        ballsToRemove.push(index);
      } else {
        ball.checkPaddleCollision({
          x: this.paddle.x,
          y: this.paddle.y,
          width: this.paddle.width,
          height: this.paddle.height
        });
        this.checkBrickCollisions(ball);
      }
    });

    ballsToRemove.reverse().forEach(i => this.balls.splice(i, 1));

    if (this.balls.length === 0) {
      this.loseLife();
    }

    this.updateParticles(deltaTime);
    this.updatePowerUps(deltaTime);

    if (this.bricks.every(b => !b.alive)) {
      this.winGame();
    }
  }

  private createBall(): Ball {
    const ball = new Ball(this.width, this.height, this.paddle.y, this.paddle.height);
    ball.maxTrailLength = 5;
    return ball;
  }

  private createBricks(): void {
    this.bricks = [];
    const totalPaddingWidth = (this.brickCols - 1) * this.brickPadding;
    const availableWidth = this.width - this.brickSideOffset * 2;
    const brickWidth = (availableWidth - totalPaddingWidth) / this.brickCols;
    const brickHeight = Math.max(18, this.height * 0.035);

    for (let row = 0; row < this.brickRows; row++) {
      const t = row / (this.brickRows - 1);
      const color = this.lerpColor('#ff0066', '#00ffcc', t);
      const glowColor = this.lerpColor('#ff0066', '#66ffe0', t);

      for (let col = 0; col < this.brickCols; col++) {
        const x = this.brickSideOffset + col * (brickWidth + this.brickPadding);
        const y = this.brickTopOffset + row * (brickHeight + this.brickPadding);
        this.bricks.push({
          x, y, width: brickWidth, height: brickHeight,
          color, glowColor,
          alive: true,
          points: (this.brickRows - row) * 10,
          row
        });
      }
    }
  }

  private lerpColor(colorA: string, colorB: string, t: number): string {
    const a = this.hexToRgb(colorA);
    const b = this.hexToRgb(colorB);
    const r = Math.round(a.r + (b.r - a.r) * t);
    const g = Math.round(a.g + (b.g - a.g) * t);
    const bl = Math.round(a.b + (b.b - a.b) * t);
    return `rgb(${r}, ${g}, ${bl})`;
  }

  private hexToRgb(hex: string): { r: number; g: number; b: number } {
    const h = hex.replace('#', '');
    return {
      r: parseInt(h.substring(0, 2), 16),
      g: parseInt(h.substring(2, 4), 16),
      b: parseInt(h.substring(4, 6), 16)
    };
  }

  private checkBrickCollisions(ball: Ball): void {
    for (const brick of this.bricks) {
      if (!brick.alive) continue;

      const closestX = Math.max(brick.x, Math.min(ball.x, brick.x + brick.width));
      const closestY = Math.max(brick.y, Math.min(ball.y, brick.y + brick.height));
      const dx = ball.x - closestX;
      const dy = ball.y - closestY;
      const distSq = dx * dx + dy * dy;

      if (distSq <= ball.radius * ball.radius) {
        brick.alive = false;
        this.score += brick.points;
        this.updateHighScore();

        this.createBrickParticles(brick);

        if (Math.random() < this.powerUpDropChance) {
          this.spawnPowerUp(brick.x + brick.width / 2, brick.y + brick.height / 2);
        }

        const overlapLeft = (ball.x + ball.radius) - brick.x;
        const overlapRight = (brick.x + brick.width) - (ball.x - ball.radius);
        const overlapTop = (ball.y + ball.radius) - brick.y;
        const overlapBottom = (brick.y + brick.height) - (ball.y - ball.radius);

        const minOverlapX = Math.min(overlapLeft, overlapRight);
        const minOverlapY = Math.min(overlapTop, overlapBottom);

        if (minOverlapX < minOverlapY) {
          ball.vx = -ball.vx;
        } else {
          ball.vy = -ball.vy;
        }

        break;
      }
    }
  }

  private createBrickParticles(brick: Brick): void {
    const centerX = brick.x + brick.width / 2;
    const centerY = brick.y + brick.height / 2;

    for (let i = 0; i < this.particleCountPerBrick; i++) {
      if (this.particles.length >= this.maxParticles) break;

      const angle = (Math.PI * 2 * i) / this.particleCountPerBrick + Math.random() * 0.3;
      const speed = 2 + Math.random() * 3;

      this.particles.push({
        x: centerX,
        y: centerY,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        color: brick.color,
        alpha: 1,
        life: 0.3,
        maxLife: 0.3,
        size: 4 + Math.random() * 4
      });
    }
  }

  private updateParticles(deltaTime: number): void {
    this.particles = this.particles.filter(p => {
      p.life -= deltaTime;
      if (p.life <= 0) return false;
      p.x += p.vx * deltaTime * 60;
      p.y += p.vy * deltaTime * 60;
      p.vy += 0.1 * deltaTime * 60;
      p.alpha = p.life / p.maxLife;
      p.size *= (1 - 0.02 * deltaTime * 60);
      return p.size > 0.5;
    });
  }

  private spawnPowerUp(x: number, y: number): void {
    const types: PowerUpType[] = ['speed', 'wide', 'multiball'];
    const type = types[Math.floor(Math.random() * types.length)];
    const size = 22;

    this.powerUps.push({
      x: x - size / 2,
      y: y - size / 2,
      width: size,
      height: size,
      type,
      speed: this.powerUpSpeed
    });
  }

  private updatePowerUps(deltaTime: number): void {
    this.powerUps = this.powerUps.filter(powerUp => {
      powerUp.y += powerUp.speed * deltaTime * 60;

      if (this.checkPowerUpPaddleCollision(powerUp)) {
        this.applyPowerUp(powerUp.type);
        return false;
      }

      return powerUp.y < this.height;
    });
  }

  private checkPowerUpPaddleCollision(powerUp: PowerUp): boolean {
    return powerUp.y + powerUp.height >= this.paddle.y &&
           powerUp.y <= this.paddle.y + this.paddle.height &&
           powerUp.x + powerUp.width >= this.paddle.x &&
           powerUp.x <= this.paddle.x + this.paddle.width;
  }

  private applyPowerUp(type: PowerUpType): void {
    switch (type) {
      case 'speed':
        this.balls.forEach(ball => ball.activateSpeedBoost(5));
        break;
      case 'wide':
        this.paddle.activateWide(5);
        break;
      case 'multiball':
        const newBalls: Ball[] = [];
        this.balls.forEach(ball => {
          if (!ball.attached) {
            newBalls.push(...ball.split());
          }
        });
        this.balls.push(...newBalls);
        break;
    }
  }

  private loseLife(): void {
    this.lives--;
    if (this.lives <= 0) {
      this.gameOver();
    } else {
      this.paddle.reset(this.width);
      this.powerUps = [];
      this.balls = [this.createBall()];
    }
  }

  private gameOver(): void {
    this.state = 'gameover';
    this.updateHighScore();
    this.saveHighScore();
  }

  private winGame(): void {
    this.state = 'win';
    this.score += this.lives * 100;
    this.updateHighScore();
    this.saveHighScore();
  }

  private updateHighScore(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
    }
  }

  private loadHighScore(): number {
    try {
      const saved = localStorage.getItem(this.highScoreKey);
      return saved ? parseInt(saved, 10) : 0;
    } catch {
      return 0;
    }
  }

  private saveHighScore(): void {
    try {
      localStorage.setItem(this.highScoreKey, String(this.highScore));
    } catch {
    }
  }

  public adaptPerformance(fps: number): void {
    if (fps < 45) {
      this.particleCountPerBrick = 4;
      this.maxParticles = 40;
      this.balls.forEach(b => { b.maxTrailLength = 2; });
    } else if (fps < 55) {
      this.particleCountPerBrick = 6;
      this.maxParticles = 60;
      this.balls.forEach(b => { b.maxTrailLength = 3; });
    } else {
      this.particleCountPerBrick = 8;
      this.maxParticles = 80;
      this.balls.forEach(b => { b.maxTrailLength = 5; });
    }
  }

  public render(): void {
    this.ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackgroundStars();
    this.drawBricks();
    this.drawPowerUps();
    this.paddle.draw(this.ctx);
    this.balls.forEach(ball => ball.draw(this.ctx));
    this.drawParticles();
  }

  private drawBackgroundStars(): void {
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    const seed = 12345;
    for (let i = 0; i < 50; i++) {
      const x = ((seed * (i + 1) * 9301 + 49297) % 233280) / 233280 * this.width;
      const y = ((seed * (i + 1) * 49297 + 9301) % 233280) / 233280 * this.height;
      const size = ((i * 7) % 3) + 1;
      this.ctx.fillRect(x, y, size, size);
    }
  }

  private drawBricks(): void {
    this.bricks.forEach(brick => {
      if (!brick.alive) return;

      this.ctx.shadowColor = brick.glowColor;
      this.ctx.shadowBlur = 12;

      const radius = 4;
      this.ctx.beginPath();
      this.ctx.roundRect(brick.x, brick.y, brick.width, brick.height, radius);

      const gradient = this.ctx.createLinearGradient(brick.x, brick.y, brick.x, brick.y + brick.height);
      gradient.addColorStop(0, brick.color);
      gradient.addColorStop(1, brick.glowColor);
      this.ctx.fillStyle = gradient;
      this.ctx.fill();

      this.ctx.shadowBlur = 0;

      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();
    });
  }

  private drawPowerUps(): void {
    this.powerUps.forEach(powerUp => {
      const centerX = powerUp.x + powerUp.width / 2;
      const centerY = powerUp.y + powerUp.height / 2;
      const radius = powerUp.width / 2;

      let color: string;
      let glowColor: string;
      let symbol: string;

      switch (powerUp.type) {
        case 'speed':
          color = '#ff3366';
          glowColor = '#ff6688';
          symbol = '⚡';
          break;
        case 'wide':
          color = '#3399ff';
          glowColor = '#66bbff';
          symbol = '▬';
          break;
        case 'multiball':
          color = '#33ff99';
          glowColor = '#66ffbb';
          symbol = '✦';
          break;
      }

      this.ctx.shadowColor = glowColor;
      this.ctx.shadowBlur = 15;

      this.ctx.beginPath();
      this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      this.ctx.fillStyle = color;
      this.ctx.fill();

      this.ctx.shadowBlur = 0;

      this.ctx.strokeStyle = 'rgba(255, 255, 255, 0.6)';
      this.ctx.lineWidth = 2;
      this.ctx.stroke();

      this.ctx.fillStyle = '#ffffff';
      this.ctx.font = 'bold 14px sans-serif';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(symbol, centerX, centerY);
    });
  }

  private drawParticles(): void {
    this.particles.forEach(p => {
      this.ctx.globalAlpha = p.alpha;
      this.ctx.fillStyle = p.color;
      this.ctx.shadowColor = p.color;
      this.ctx.shadowBlur = 5;
      this.ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    });
    this.ctx.globalAlpha = 1;
    this.ctx.shadowBlur = 0;
  }
}
