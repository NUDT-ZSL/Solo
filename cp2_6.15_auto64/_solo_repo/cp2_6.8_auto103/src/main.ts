import { Car, Obstacle, Coin, Particle, aabbCollision, rectCircleCollision } from './entities';
import { Renderer, CANVAS_WIDTH, CANVAS_HEIGHT } from './renderer';
import { InputManager } from './input';

const ROAD_LEFT = 50;
const ROAD_RIGHT = 350;
const ROAD_WIDTH = ROAD_RIGHT - ROAD_LEFT;
const MAX_PARTICLES = 80;
const MAX_OBJECTS = 30;
const DAMPING = 0.95;
const MOVE_SPEED = 4;
const MIN_SPEED = 0;
const MAX_SPEED = 8;
const ACCELERATION = 0.3;
const BRAKE = 0.4;

class Game {
  private canvas: HTMLCanvasElement;
  private renderer: Renderer;
  private input: InputManager;

  private car: Car;
  private obstacles: Obstacle[] = [];
  private coins: Coin[] = [];
  private particles: Particle[] = [];

  private score: number = 0;
  private coinsCollected: number = 0;
  private roadSpeed: number = 2;

  private lastObstacleTime: number = 0;
  private lastCoinTime: number = 0;
  private obstacleInterval: number = 2000;
  private coinInterval: number = 3000;

  private gameOver: boolean = false;
  private flashAlpha: number = 0;
  private flashTime: number = 0;

  private speedEl: HTMLElement;
  private scoreEl: HTMLElement;
  private coinsEl: HTMLElement;
  private lastSpeed: number = -1;
  private lastScore: number = -1;
  private lastCoins: number = -1;
  private bumpSpeedTime: number = 0;
  private bumpScoreTime: number = 0;
  private bumpCoinsTime: number = 0;

  private lastTime: number = 0;
  private animationId: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.renderer = new Renderer(this.canvas);
    this.input = new InputManager();

    this.speedEl = document.getElementById('speedValue')!;
    this.scoreEl = document.getElementById('scoreValue')!;
    this.coinsEl = document.getElementById('coinsValue')!;

    this.car = new Car(
      CANVAS_WIDTH / 2 - 15,
      CANVAS_HEIGHT - 200
    );

    this.resetGame();
    this.startLoop();
  }

  private resetGame(): void {
    this.car.x = CANVAS_WIDTH / 2 - 15;
    this.car.y = CANVAS_HEIGHT - 200;
    this.car.speedY = 0;
    this.car.speedX = 0;

    this.obstacles = [];
    this.coins = [];
    this.particles = [];

    this.score = 0;
    this.coinsCollected = 0;
    this.roadSpeed = 2;

    this.lastObstacleTime = performance.now();
    this.lastCoinTime = performance.now();
    this.obstacleInterval = this.randomRange(1500, 3000);
    this.coinInterval = this.randomRange(2000, 4000);

    this.gameOver = false;
    this.flashAlpha = 0;
    this.flashTime = 0;

    this.updateDashboard(true);
  }

  private startLoop(): void {
    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    this.animationId = requestAnimationFrame(this.loop);
  }

  private loop(currentTime: number): void {
    const deltaTime = Math.min(currentTime - this.lastTime, 50);
    this.lastTime = currentTime;

    if (this.input.consumeSpace() && this.gameOver) {
      this.resetGame();
    }

    if (!this.gameOver) {
      this.update(deltaTime, currentTime);
    } else {
      this.updateFlash(deltaTime);
    }

    this.render();
    this.updateDashboard();

    this.animationId = requestAnimationFrame(this.loop);
  }

  private update(deltaTime: number, currentTime: number): void {
    if (this.input.left) {
      this.car.speedX = -MOVE_SPEED;
    } else if (this.input.right) {
      this.car.speedX = MOVE_SPEED;
    } else {
      this.car.speedX *= DAMPING;
      if (Math.abs(this.car.speedX) < 0.1) this.car.speedX = 0;
    }

    if (this.input.up) {
      this.car.speedY = Math.min(this.car.speedY + ACCELERATION, MAX_SPEED);
    } else if (this.input.down) {
      this.car.speedY = Math.max(this.car.speedY - BRAKE, 0);
    } else {
      this.car.speedY *= DAMPING;
      if (this.car.speedY < 0.1) this.car.speedY = 0;
    }

    this.roadSpeed = 2 + this.car.speedY;

    this.car.x += this.car.speedX;
    this.car.x = Math.max(ROAD_LEFT + 2, Math.min(ROAD_RIGHT - this.car.width - 2, this.car.x));

    this.score += Math.floor(this.roadSpeed * 0.1);

    if (currentTime - this.lastObstacleTime > this.obstacleInterval) {
      this.spawnObstaclePair();
      this.lastObstacleTime = currentTime;
      this.obstacleInterval = this.randomRange(1500, 3000);
    }

    if (currentTime - this.lastCoinTime > this.coinInterval) {
      this.spawnCoin();
      this.lastCoinTime = currentTime;
      this.coinInterval = this.randomRange(2000, 4000);
    }

    this.updateObstacles();
    this.updateCoins();
    this.updateParticles();
    this.spawnExhaust();
    this.checkCollisions();
  }

  private updateFlash(deltaTime: number): void {
    if (this.flashTime > 0) {
      this.flashTime -= deltaTime;
      this.flashAlpha = Math.max(0, this.flashTime / 300) * 0.5;
    } else {
      this.flashAlpha = 0;
    }
  }

  private spawnObstaclePair(): void {
    if (this.obstacles.length >= MAX_OBJECTS) return;

    const gap = 120;
    const gapX = ROAD_LEFT + 20 + Math.random() * (ROAD_WIDTH - gap - 40);

    const leftObs = new Obstacle(gapX - 40, -30);
    if (leftObs.x + leftObs.width > ROAD_LEFT) {
      leftObs.x = Math.max(ROAD_LEFT + 2, leftObs.x);
      leftObs.width = Math.min(leftObs.width, gapX - ROAD_LEFT - 2);
      if (leftObs.width >= 20) {
        this.obstacles.push(leftObs);
      }
    }

    const rightObs = new Obstacle(gapX + gap, -30);
    const maxRight = ROAD_RIGHT - 2;
    if (rightObs.x < maxRight) {
      rightObs.width = Math.min(rightObs.width, maxRight - rightObs.x);
      if (rightObs.width >= 20) {
        this.obstacles.push(rightObs);
      }
    }
  }

  private spawnCoin(): void {
    if (this.coins.length >= MAX_OBJECTS) return;

    const x = ROAD_LEFT + 30 + Math.random() * (ROAD_WIDTH - 60);
    this.coins.push(new Coin(x, -20));
  }

  private updateObstacles(): void {
    for (let i = this.obstacles.length - 1; i >= 0; i--) {
      const obs = this.obstacles[i];
      obs.y += this.roadSpeed + 2;

      if (obs.y > CANVAS_HEIGHT + 50) {
        this.obstacles.splice(i, 1);
      }
    }
  }

  private updateCoins(): void {
    for (let i = this.coins.length - 1; i >= 0; i--) {
      const coin = this.coins[i];
      coin.y += this.roadSpeed;

      if (coin.y > CANVAS_HEIGHT + 30 || !coin.active) {
        this.coins.splice(i, 1);
      }
    }
  }

  private updateParticles(): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 16;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
  }

  private spawnExhaust(): void {
    const baseCount = this.roadSpeed > 4 ? 2 : 1;
    const count = Math.floor(Math.random() * 3) + baseCount;

    for (let i = 0; i < count; i++) {
      if (this.particles.length >= MAX_PARTICLES) {
        this.particles.shift();
      }

      const isRed = Math.random() > 0.5;
      const color = isRed ? '#E53E3E' : '#ED8936';
      const size = 2 + Math.floor(Math.random() * 3);

      const particle: Particle = {
        x: this.car.x + this.car.width / 2 + (Math.random() - 0.5) * 10,
        y: this.car.y + this.car.height,
        vx: (Math.random() - 0.5) * 1.5,
        vy: 1 + Math.random() * 2 + this.roadSpeed * 0.3,
        size,
        color,
        life: 300,
        maxLife: 300
      };

      this.particles.push(particle);
    }
  }

  private spawnCoinBurst(x: number, y: number): void {
    for (let i = 0; i < 8; i++) {
      if (this.particles.length >= MAX_PARTICLES) {
        this.particles.shift();
      }

      const angle = (Math.PI * 2 * i) / 8 + Math.random() * 0.3;
      const speed = 2 + Math.random() * 2;

      const particle: Particle = {
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        size: 3,
        color: '#FFD700',
        life: 500,
        maxLife: 500
      };

      this.particles.push(particle);
    }
  }

  private checkCollisions(): void {
    for (const obs of this.obstacles) {
      if (obs.active && aabbCollision(this.car, obs)) {
        this.triggerGameOver();
        return;
      }
    }

    for (const coin of this.coins) {
      if (coin.active && !coin.collected && rectCircleCollision(this.car, coin)) {
        coin.collected = true;
        coin.active = false;
        this.coinsCollected++;
        this.score += 10;
        this.spawnCoinBurst(coin.x, coin.y);
      }
    }
  }

  private triggerGameOver(): void {
    this.gameOver = true;
    this.flashAlpha = 0.5;
    this.flashTime = 300;
  }

  private render(): void {
    this.renderer.clear();
    this.renderer.drawRoad(this.roadSpeed);

    for (const coin of this.coins) {
      this.renderer.drawCoin(coin);
    }

    for (const obs of this.obstacles) {
      this.renderer.drawObstacle(obs);
    }

    this.renderer.drawParticles(this.particles);
    this.renderer.drawCar(this.car);

    if (this.gameOver) {
      if (this.flashAlpha > 0) {
        this.renderer.drawGameOverFlash(this.flashAlpha);
      }
      this.renderer.drawGameOver(this.score);
    }
  }

  private updateDashboard(force: boolean = false): void {
    const displaySpeed = Math.floor((this.roadSpeed - 2) * (120 / 6));

    if (force || displaySpeed !== this.lastSpeed) {
      this.speedEl.textContent = String(displaySpeed);
      this.lastSpeed = displaySpeed;
      if (!force) {
        this.bumpSpeedTime = 100;
        this.speedEl.classList.add('bump');
      }
    }

    if (force || this.score !== this.lastScore) {
      this.scoreEl.textContent = String(this.score);
      this.lastScore = this.score;
      if (!force) {
        this.bumpScoreTime = 100;
        this.scoreEl.classList.add('bump');
      }
    }

    if (force || this.coinsCollected !== this.lastCoins) {
      this.coinsEl.textContent = String(this.coinsCollected);
      this.lastCoins = this.coinsCollected;
      if (!force) {
        this.bumpCoinsTime = 100;
        this.coinsEl.classList.add('bump');
      }
    }

    if (this.bumpSpeedTime > 0) {
      this.bumpSpeedTime -= 16;
      if (this.bumpSpeedTime <= 0) {
        this.speedEl.classList.remove('bump');
      }
    }
    if (this.bumpScoreTime > 0) {
      this.bumpScoreTime -= 16;
      if (this.bumpScoreTime <= 0) {
        this.scoreEl.classList.remove('bump');
      }
    }
    if (this.bumpCoinsTime > 0) {
      this.bumpCoinsTime -= 16;
      if (this.bumpCoinsTime <= 0) {
        this.coinsEl.classList.remove('bump');
      }
    }
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new Game();
});
