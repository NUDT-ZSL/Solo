import { Player } from './player';
import { ObstacleManager } from './obstacle';
import { Scene } from './scene';
import { UI } from './ui';

interface GameState {
  score: number;
  highScore: number;
  combo: number;
  lives: number;
  speed: number;
  baseSpeed: number;
  boosted: boolean;
  boostTimer: number;
  boostDuration: number;
  gameOver: boolean;
  lastTime: number;
  deltaTime: number;
  frameCount: number;
  fps: number;
}

class Game {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private player: Player;
  private obstacleManager: ObstacleManager;
  private scene: Scene;
  private ui: UI;
  private state: GameState;
  private animationId: number = 0;
  private scoreAccumulator: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;
    this.ctx = this.canvas.getContext('2d')!;
    
    this.resizeCanvas();
    window.addEventListener('resize', () => this.resizeCanvas());
    
    this.scene = new Scene(this.canvas, this.ctx);
    this.player = new Player(this.canvas);
    this.obstacleManager = new ObstacleManager(this.canvas, this.ctx, this.scene);
    this.ui = new UI(this.canvas, this.ctx);
    
    this.state = {
      score: 0,
      highScore: this.loadHighScore(),
      combo: 0,
      lives: 3,
      speed: 200,
      baseSpeed: 200,
      boosted: false,
      boostTimer: 0,
      boostDuration: 2000,
      gameOver: false,
      lastTime: 0,
      deltaTime: 0,
      frameCount: 0,
      fps: 60,
    };
    
    window.addEventListener('gameRestart', () => this.restart());
    window.addEventListener('keydown', (e) => {
      if (e.code === 'Space' && this.state.gameOver) {
        e.preventDefault();
        this.restart();
      }
    });
  }

  private resizeCanvas(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.scale(dpr, dpr);
    this.canvas.style.width = `${rect.width}px`;
    this.canvas.style.height = `${rect.height}px`;
    
    if (this.scene) {
      this.scene.resize(rect.width, rect.height);
    }
    if (this.player) {
      this.player.resize(rect.width, rect.height);
    }
  }

  private loadHighScore(): number {
    const saved = localStorage.getItem('rhythmRunnerHighScore');
    return saved ? parseInt(saved, 10) : 0;
  }

  private saveHighScore(): void {
    if (this.state.score > this.state.highScore) {
      this.state.highScore = this.state.score;
      localStorage.setItem('rhythmRunnerHighScore', this.state.highScore.toString());
    }
  }

  start(): void {
    this.state.lastTime = performance.now();
    this.gameLoop();
  }

  private gameLoop = (): void => {
    const currentTime = performance.now();
    this.state.deltaTime = Math.min(currentTime - this.state.lastTime, 33.33);
    this.state.lastTime = currentTime;
    
    this.state.frameCount++;
    
    if (!this.state.gameOver) {
      this.update(this.state.deltaTime, currentTime);
    }
    
    this.render();
    
    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private update(deltaTime: number, currentTime: number): void {
    if (this.state.boosted) {
      this.state.boostTimer -= deltaTime;
      if (this.state.boostTimer <= 0) {
        this.state.boosted = false;
        this.state.speed = this.state.baseSpeed;
      }
    }
    
    const speedMultiplier = 1 + Math.min(this.state.score / 2000, 0.5);
    const currentSpeed = this.state.speed * speedMultiplier;
    
    this.scene.update(deltaTime, currentTime, currentSpeed, this.state.score);
    this.player.update(deltaTime, currentTime);
    this.obstacleManager.update(deltaTime, currentSpeed, currentTime);
    
    const playerBox = this.player.getCollisionBox();
    const playerLane = this.player.getLane();
    const isJumping = this.player.isInAir();
    
    const collisionResult = this.obstacleManager.checkPlayerCollision(
      playerBox,
      playerLane,
      isJumping
    );
    
    if (collisionResult.hit) {
      this.handleCollision();
    }
    
    if (collisionResult.boost) {
      this.activateBoost();
    }
    
    if (collisionResult.scoreGain > 0) {
      this.addScore(collisionResult.scoreGain);
      if (!collisionResult.hit) {
        this.state.combo++;
      }
    }
    
    this.scoreAccumulator += deltaTime;
    if (this.scoreAccumulator >= 100) {
      const distanceScore = Math.floor(this.scoreAccumulator / 100);
      this.addScore(distanceScore);
      this.scoreAccumulator = this.scoreAccumulator % 100;
    }
    
    this.ui.update(deltaTime, {
      score: this.state.score,
      highScore: this.state.highScore,
      combo: this.state.combo,
      lives: this.state.lives,
      gameOver: this.state.gameOver,
      boosted: this.state.boosted,
      boostIntensity: this.state.boosted 
        ? Math.min(1, this.state.boostTimer / 500) 
        : 0,
    });
  }

  private handleCollision(): void {
    this.state.lives--;
    this.state.combo = 0;
    this.ui.onLifeLost(this.state.lives);
    
    if (this.state.lives <= 0) {
      this.endGame();
    }
  }

  private activateBoost(): void {
    this.state.boosted = true;
    this.state.boostTimer = this.state.boostDuration;
    this.state.speed = 350;
  }

  private addScore(points: number): void {
    const comboMultiplier = 1 + Math.min(this.state.combo * 0.1, 2);
    this.state.score += Math.floor(points * comboMultiplier);
  }

  private endGame(): void {
    this.state.gameOver = true;
    this.saveHighScore();
    this.ui.update(0, {
      score: this.state.score,
      highScore: this.state.highScore,
      gameOver: true,
    });
  }

  private render(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);
    
    this.scene.renderBackground();
    this.scene.renderTrack();
    this.obstacleManager.render();
    this.player.render(this.ctx);
    this.scene.renderBoostVignette(
      this.state.boosted,
      this.state.boosted 
        ? Math.min(1, this.state.boostTimer / 500) 
        : 0
    );
    this.ui.render();
  }

  private restart(): void {
    this.state.score = 0;
    this.state.combo = 0;
    this.state.lives = 3;
    this.state.speed = this.state.baseSpeed;
    this.state.boosted = false;
    this.state.boostTimer = 0;
    this.state.gameOver = false;
    this.scoreAccumulator = 0;
    
    this.player.reset();
    this.obstacleManager.reset();
    this.ui.reset();
    
    this.state.lastTime = performance.now();
  }

  destroy(): void {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const game = new Game();
  game.start();
});
