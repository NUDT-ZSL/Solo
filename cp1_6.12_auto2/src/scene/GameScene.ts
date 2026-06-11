import Phaser from 'phaser';
import { socketManager, Direction, Snake, Food, GameState, Position } from '../network/socketManager.js';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: number;
  size: number;
}

export class GameScene extends Phaser.Scene {
  private cellSize: number = 20;
  private gridWidth: number = 60;
  private gridHeight: number = 34;
  private offsetX: number = 0;
  private offsetY: number = 0;

  private gameState: GameState | null = null;
  private previousState: GameState | null = null;
  private interpolationTime: number = 0;
  private readonly INTERPOLATION_DELAY: number = 100;

  private snakeGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private foodGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private particles: Particle[] = [];
  private particlePool: Particle[] = [];

  private gridGraphics: Phaser.GameObjects.Graphics | null = null;
  private boostEffects: Map<string, Phaser.Time.TimerEvent> = new Map();
  private isGameRunning: boolean = false;

  private keys: { [key: string]: Phaser.Input.Keyboard.Key } = {};
  private lastDirection: Direction = 'right';

  private readonly CANVAS_WIDTH: number = 960;
  private readonly CANVAS_HEIGHT: number = 540;

  constructor() {
    super('GameScene');
  }

  init(): void {
    this.cellSize = Math.min(
      Math.floor(this.CANVAS_WIDTH / this.gridWidth),
      Math.floor(this.CANVAS_HEIGHT / this.gridHeight)
    );
    this.offsetX = (this.CANVAS_WIDTH - this.gridWidth * this.cellSize) / 2;
    this.offsetY = (this.CANVAS_HEIGHT - this.gridHeight * this.cellSize) / 2;
  }

  create(): void {
    this.createGrid();
    this.bindSocketEvents();
    this.setupInput();

    this.particlePool = [];
    for (let i = 0; i < 100; i++) {
      this.particlePool.push({
        x: 0, y: 0, vx: 0, vy: 0,
        life: 0, maxLife: 0,
        color: 0, size: 0
      });
    }

    this.game.events.on('visibilitychange', (visible: boolean) => {
      if (visible) {
        this.interpolationTime = Date.now();
      }
    });
  }

  private createGrid(): void {
    this.gridGraphics = this.add.graphics();
    this.gridGraphics.lineStyle(1, 0x1a1a2e, 0.5);

    for (let x = 0; x <= this.gridWidth; x++) {
      this.gridGraphics.beginPath();
      this.gridGraphics.moveTo(
        this.offsetX + x * this.cellSize,
        this.offsetY
      );
      this.gridGraphics.lineTo(
        this.offsetX + x * this.cellSize,
        this.offsetY + this.gridHeight * this.cellSize
      );
      this.gridGraphics.stroke();
    }

    for (let y = 0; y <= this.gridHeight; y++) {
      this.gridGraphics.beginPath();
      this.gridGraphics.moveTo(
        this.offsetX,
        this.offsetY + y * this.cellSize
      );
      this.gridGraphics.lineTo(
        this.offsetX + this.gridWidth * this.cellSize,
        this.offsetY + y * this.cellSize
      );
      this.gridGraphics.stroke();
    }

    const border = this.add.graphics();
    border.lineStyle(3, 0xa855f7, 1);
    border.strokeRect(
      this.offsetX,
      this.offsetY,
      this.gridWidth * this.cellSize,
      this.gridHeight * this.cellSize
    );
  }

  private bindSocketEvents(): void {
    socketManager.on('game_start', (data: { gameState: GameState }) => {
      this.gameState = data.gameState;
      this.previousState = JSON.parse(JSON.stringify(data.gameState));
      this.isGameRunning = true;
      this.interpolationTime = Date.now();
      this.gridWidth = data.gameState.gridSize.width;
      this.gridHeight = data.gameState.gridSize.height;
      this.init();
      this.clearAll();
    });

    socketManager.on('game_update', (data: { gameState: GameState }) => {
      if (this.gameState) {
        this.previousState = JSON.parse(JSON.stringify(this.gameState));
      }
      this.gameState = data.gameState;
      this.interpolationTime = Date.now();
    });

    socketManager.on('player_dead', (data: { snakeId: string; killerId?: string }) => {
      const snake = this.gameState?.snakes.find(s => s.id === data.snakeId);
      if (snake && snake.body.length > 0) {
        const head = snake.body[0];
        const x = this.offsetX + head.x * this.cellSize + this.cellSize / 2;
        const y = this.offsetY + head.y * this.cellSize + this.cellSize / 2;
        this.spawnDeathParticles(x, y, snake.color);
      }
    });

    socketManager.on('speed_boost', (data: { snakeId: string }) => {
      this.showBoostEffect(data.snakeId);
    });

    socketManager.on('game_over', () => {
      this.isGameRunning = false;
    });

    socketManager.on('room_left', () => {
      this.isGameRunning = false;
      this.clearAll();
    });
  }

  private setupInput(): void {
    this.keys['ArrowUp'] = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.UP);
    this.keys['ArrowDown'] = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.DOWN);
    this.keys['ArrowLeft'] = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.LEFT);
    this.keys['ArrowRight'] = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.RIGHT);
    this.keys['W'] = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.W);
    this.keys['S'] = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.S);
    this.keys['A'] = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.A);
    this.keys['D'] = this.input.keyboard.addKey(Phaser.Input.Keyboard.KeyCodes.D);

    this.input.keyboard.on('keydown', (event: KeyboardEvent) => {
      if (!this.isGameRunning) return;

      let direction: Direction | null = null;

      switch (event.key) {
        case 'ArrowUp':
        case 'w':
        case 'W':
          direction = 'up';
          break;
        case 'ArrowDown':
        case 's':
        case 'S':
          direction = 'down';
          break;
        case 'ArrowLeft':
        case 'a':
        case 'A':
          direction = 'left';
          break;
        case 'ArrowRight':
        case 'd':
        case 'D':
          direction = 'right';
          break;
      }

      if (direction && direction !== this.lastDirection) {
        const opposites: Record<Direction, Direction> = {
          up: 'down', down: 'up', left: 'right', right: 'left'
        };
        if (opposites[direction] !== this.lastDirection) {
          this.lastDirection = direction;
          socketManager.changeDirection(direction);
        }
      }
    });

    const touchStart = { x: 0, y: 0 };
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      touchStart.x = pointer.x;
      touchStart.y = pointer.y;
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (!this.isGameRunning) return;

      const dx = pointer.x - touchStart.x;
      const dy = pointer.y - touchStart.y;
      const minSwipe = 30;

      if (Math.abs(dx) < minSwipe && Math.abs(dy) < minSwipe) return;

      let direction: Direction | null = null;
      if (Math.abs(dx) > Math.abs(dy)) {
        direction = dx > 0 ? 'right' : 'left';
      } else {
        direction = dy > 0 ? 'down' : 'up';
      }

      if (direction && direction !== this.lastDirection) {
        const opposites: Record<Direction, Direction> = {
          up: 'down', down: 'up', left: 'right', right: 'left'
        };
        if (opposites[direction] !== this.lastDirection) {
          this.lastDirection = direction;
          socketManager.changeDirection(direction);
        }
      }
    });
  }

  update(_time: number, delta: number): void {
    if (!this.gameState) return;

    const now = Date.now();
    const alpha = Math.min(1, (now - this.interpolationTime) / 50);

    this.updateSnakes(alpha);
    this.updateFoods(alpha);
    this.updateParticles(delta);
  }

  private interpolatePosition(prev: Position, current: Position, alpha: number): Position {
    return {
      x: prev.x + (current.x - prev.x) * alpha,
      y: prev.y + (current.y - prev.y) * alpha,
    };
  }

  private updateSnakes(alpha: number): void {
    if (!this.gameState) return;

    const activeSnakeIds = new Set<string>();

    for (const snake of this.gameState.snakes) {
      activeSnakeIds.add(snake.id);

      if (!snake.isAlive) {
        this.removeSnakeGraphics(snake.id);
        continue;
      }

      const prevSnake = this.previousState?.snakes.find(s => s.id === snake.id);
      const body = prevSnake
        ? snake.body.map((segment, i) =>
            i < prevSnake.body.length
              ? this.interpolatePosition(prevSnake.body[i], segment, alpha)
              : segment
          )
        : snake.body;

      this.drawSnake(snake, body);
    }

    for (const [id] of this.snakeGraphics) {
      if (!activeSnakeIds.has(id)) {
        this.removeSnakeGraphics(id);
      }
    }
  }

  private drawSnake(snake: Snake, body: Position[]): void {
    let graphics = this.snakeGraphics.get(snake.id);
    if (!graphics) {
      graphics = this.add.graphics();
      this.snakeGraphics.set(snake.id, graphics);
    }

    graphics.clear();

    const color = Phaser.Display.Color.HexStringToColor(snake.color).color;
    const padding = 2;
    const size = this.cellSize - padding * 2;

    for (let i = body.length - 1; i >= 0; i--) {
      const segment = body[i];
      const x = this.offsetX + segment.x * this.cellSize + padding;
      const y = this.offsetY + segment.y * this.cellSize + padding;

      const gradient = i / Math.max(body.length - 1, 1);
      const alpha = 0.6 + gradient * 0.4;

      if (i === 0) {
        if (snake.isBoosted) {
          graphics.fillStyle(0x06b6d4, 1);
          graphics.fillRoundedRect(x - 2, y - 2, size + 4, size + 4, 4);
          
          graphics.lineStyle(2, 0x06b6d4, 0.8);
          graphics.strokeCircle(
            x + size / 2,
            y + size / 2,
            size + 4 + Math.sin(Date.now() / 100) * 3
          );
        } else {
          graphics.fillStyle(color, 1);
        }
        graphics.fillRoundedRect(x, y, size, size, 4);

        this.drawSnakeEyes(graphics, x, y, size, snake.direction, color);
      } else {
        graphics.fillStyle(color, alpha);
        graphics.fillRoundedRect(x, y, size, size, 3);
      }

      if (snake.isBoosted) {
        graphics.lineStyle(1, 0x06b6d4, 0.6);
        graphics.strokeRoundedRect(x - 1, y - 1, size + 2, size + 2, 3);
      }
    }

    if (snake.isBoosted) {
      for (let i = 1; i < Math.min(5, body.length); i++) {
        const segment = body[i];
        const trailX = this.offsetX + segment.x * this.cellSize + this.cellSize / 2;
        const trailY = this.offsetY + segment.y * this.cellSize + this.cellSize / 2;
        
        const particle = this.getParticle();
        particle.x = trailX + (Math.random() - 0.5) * 10;
        particle.y = trailY + (Math.random() - 0.5) * 10;
        particle.vx = (Math.random() - 0.5) * 2;
        particle.vy = (Math.random() - 0.5) * 2;
        particle.life = 300;
        particle.maxLife = 300;
        particle.color = 0x06b6d4;
        particle.size = 3 + Math.random() * 3;
        this.particles.push(particle);
      }
    }
  }

  private drawSnakeEyes(
    graphics: Phaser.GameObjects.Graphics,
    x: number,
    y: number,
    size: number,
    direction: Direction,
    color: number
  ): void {
    const eyeSize = Math.max(2, size / 6);
    const eyeOffset = size / 4;

    let eye1X = x + eyeOffset;
    let eye1Y = y + eyeOffset;
    let eye2X = x + size - eyeOffset;
    let eye2Y = y + eyeOffset;

    switch (direction) {
      case 'up':
        eye1Y = y + eyeOffset - 2;
        eye2Y = y + eyeOffset - 2;
        break;
      case 'down':
        eye1Y = y + size - eyeOffset + 2;
        eye2Y = y + size - eyeOffset + 2;
        break;
      case 'left':
        eye1X = x + eyeOffset - 2;
        eye2X = x + eyeOffset - 2;
        eye1Y = y + eyeOffset;
        eye2Y = y + size - eyeOffset;
        break;
      case 'right':
        eye1X = x + size - eyeOffset + 2;
        eye2X = x + size - eyeOffset + 2;
        eye1Y = y + eyeOffset;
        eye2Y = y + size - eyeOffset;
        break;
    }

    graphics.fillStyle(0xffffff, 1);
    graphics.fillCircle(eye1X, eye1Y, eyeSize);
    graphics.fillCircle(eye2X, eye2Y, eyeSize);

    graphics.fillStyle(0x000000, 1);
    graphics.fillCircle(eye1X, eye1Y, eyeSize / 2);
    graphics.fillCircle(eye2X, eye2Y, eyeSize / 2);
  }

  private updateFoods(alpha: number): void {
    if (!this.gameState) return;

    const activeFoodIds = new Set<string>();

    for (const food of this.gameState.foods) {
      activeFoodIds.add(food.id);
      this.drawFood(food);
    }

    for (const [id] of this.foodGraphics) {
      if (!activeFoodIds.has(id)) {
        this.removeFoodGraphics(id);
      }
    }
  }

  private drawFood(food: Food): void {
    let graphics = this.foodGraphics.get(food.id);
    if (!graphics) {
      graphics = this.add.graphics();
      this.foodGraphics.set(food.id, graphics);
    }

    graphics.clear();

    const x = this.offsetX + food.position.x * this.cellSize + this.cellSize / 2;
    const y = this.offsetY + food.position.y * this.cellSize + this.cellSize / 2;
    const baseSize = this.cellSize / 2 - 2;
    const pulse = 1 + Math.sin(Date.now() / 200 + food.position.x) * 0.2;
    const size = baseSize * pulse;

    const color = food.type === 'speed' ? 0x06b6d4 : 0xf43f5e;
    const glowColor = food.type === 'speed' ? 0x06b6d4 : 0xf43f5e;

    graphics.fillStyle(glowColor, 0.3);
    graphics.fillCircle(x, y, size * 1.8);

    graphics.fillStyle(glowColor, 0.5);
    graphics.fillCircle(x, y, size * 1.4);

    graphics.fillStyle(color, 1);
    graphics.fillCircle(x, y, size);

    graphics.fillStyle(0xffffff, 0.6);
    graphics.fillCircle(x - size / 3, y - size / 3, size / 3);

    if (food.type === 'speed') {
      graphics.fillStyle(0xffffff, 0.8);
      const lightningSize = size / 2;
      graphics.beginPath();
      graphics.moveTo(x, y - lightningSize);
      graphics.lineTo(x - lightningSize / 2, y);
      graphics.lineTo(x, y - lightningSize / 4);
      graphics.lineTo(x + lightningSize / 2, y + lightningSize / 2);
      graphics.lineTo(x, y - lightningSize / 4);
      graphics.closePath();
      graphics.fill();
    }
  }

  private spawnDeathParticles(x: number, y: number, colorHex: string): void {
    const color = Phaser.Display.Color.HexStringToColor(colorHex).color;
    const count = 30;

    for (let i = 0; i < count; i++) {
      const particle = this.getParticle();
      const angle = (Math.PI * 2 * i) / count + Math.random() * 0.5;
      const speed = 2 + Math.random() * 4;
      
      particle.x = x;
      particle.y = y;
      particle.vx = Math.cos(angle) * speed;
      particle.vy = Math.sin(angle) * speed;
      particle.life = 800 + Math.random() * 400;
      particle.maxLife = particle.life;
      particle.color = color;
      particle.size = 3 + Math.random() * 5;
      
      this.particles.push(particle);
    }

    this.cameras.main.shake(200, 0.005);
  }

  private getParticle(): Particle {
    if (this.particlePool.length > 0) {
      return this.particlePool.pop()!;
    }
    return { x: 0, y: 0, vx: 0, vy: 0, life: 0, maxLife: 0, color: 0, size: 0 };
  }

  private updateParticles(delta: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= delta;
      p.x += p.vx;
      p.y += p.vy;
      p.vy += 0.05;

      if (p.life <= 0) {
        this.particles.splice(i, 1);
        if (this.particlePool.length < 200) {
          this.particlePool.push(p);
        }
      }
    }

    const particleGraphics = this.add.graphics();
    for (const p of this.particles) {
      const alpha = p.life / p.maxLife;
      particleGraphics.fillStyle(p.color, alpha);
      particleGraphics.fillCircle(p.x, p.y, p.size * alpha);
    }
    particleGraphics.destroy();
  }

  private showBoostEffect(snakeId: string): void {
    if (this.boostEffects.has(snakeId)) {
      this.boostEffects.get(snakeId)?.remove(false);
    }

    const snake = this.gameState?.snakes.find(s => s.id === snakeId);
    if (snake && snakeId === socketManager.getPlayerId()) {
      this.cameras.main.flash(500, 6, 182, 212);
    }

    const timer = this.time.delayedCall(10000, () => {
      this.boostEffects.delete(snakeId);
    });
    this.boostEffects.set(snakeId, timer);
  }

  private removeSnakeGraphics(id: string): void {
    const graphics = this.snakeGraphics.get(id);
    if (graphics) {
      graphics.destroy();
      this.snakeGraphics.delete(id);
    }
  }

  private removeFoodGraphics(id: string): void {
    const graphics = this.foodGraphics.get(id);
    if (graphics) {
      graphics.destroy();
      this.foodGraphics.delete(id);
    }
  }

  private clearAll(): void {
    for (const [, graphics] of this.snakeGraphics) {
      graphics.destroy();
    }
    this.snakeGraphics.clear();

    for (const [, graphics] of this.foodGraphics) {
      graphics.destroy();
    }
    this.foodGraphics.clear();

    for (const [, timer] of this.boostEffects) {
      timer.remove(false);
    }
    this.boostEffects.clear();

    this.particles = [];
    this.gameState = null;
    this.previousState = null;
  }

  getCanvasSize(): { width: number; height: number } {
    return { width: this.CANVAS_WIDTH, height: this.CANVAS_HEIGHT };
  }
}
