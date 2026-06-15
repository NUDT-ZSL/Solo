export interface Position {
  x: number;
  y: number;
}

export interface SnakeSegment {
  position: Position;
}

export interface Obstacle {
  position: Position;
  size: number;
  opacity: number;
  fading: boolean;
  fadeStartTime: number;
}

export interface Food {
  position: Position;
}

export interface Particle {
  position: Position;
  velocity: Position;
  color: string;
  radius: number;
  life: number;
  maxLife: number;
}

export interface TrailPoint {
  position: Position;
  color: string;
  life: number;
  maxLife: number;
}

export type Direction = 'up' | 'down' | 'left' | 'right';
export type GameState = 'ready' | 'playing' | 'gameover';

export const CANVAS_WIDTH = 800;
export const CANVAS_HEIGHT = 600;
export const GRID_SIZE = 40;
export const SEGMENT_RADIUS = 8;
export const INITIAL_MOVE_INTERVAL = 150;
export const MIN_MOVE_INTERVAL = 80;
export const SPEED_DECREASE = 10;
export const OBSTACLE_SIZE = 24;
export const BLINK_DURATION = 1500;
export const BLINK_COOLDOWN = 5000;

const COLOR_START = { r: 255, g: 107, b: 107 };
const COLOR_MID = { r: 255, g: 230, b: 109 };
const COLOR_END = { r: 78, g: 205, b: 196 };

export function getSegmentColor(index: number, total: number): string {
  if (total <= 1) {
    return `rgb(${COLOR_START.r}, ${COLOR_START.g}, ${COLOR_START.b})`;
  }
  const t = index / (total - 1);
  let r: number, g: number, b: number;
  if (t < 0.5) {
    const nt = t * 2;
    r = Math.round(COLOR_START.r + (COLOR_MID.r - COLOR_START.r) * nt);
    g = Math.round(COLOR_START.g + (COLOR_MID.g - COLOR_START.g) * nt);
    b = Math.round(COLOR_START.b + (COLOR_MID.b - COLOR_START.b) * nt);
  } else {
    const nt = (t - 0.5) * 2;
    r = Math.round(COLOR_MID.r + (COLOR_END.r - COLOR_MID.r) * nt);
    g = Math.round(COLOR_MID.g + (COLOR_END.g - COLOR_MID.g) * nt);
    b = Math.round(COLOR_MID.b + (COLOR_END.b - COLOR_MID.b) * nt);
  }
  return `rgb(${r}, ${g}, ${b})`;
}

export function getHslGradient(index: number, total: number): string {
  if (total <= 1) return `hsl(0, 100%, 70%)`;
  const hue = (index / (total - 1)) * 360;
  return `hsl(${hue}, 100%, 65%)`;
}

export class Game {
  snake: SnakeSegment[] = [];
  obstacles: Obstacle[] = [];
  food: Food | null = null;
  particles: Particle[] = [];
  trails: TrailPoint[] = [];
  direction: Direction = 'right';
  nextDirection: Direction = 'right';
  score = 0;
  moveInterval = INITIAL_MOVE_INTERVAL;
  lastMoveTime = 0;
  lastTrailTime = 0;
  gameState: GameState = 'ready';
  isBlinking = false;
  blinkStartTime = 0;
  lastBlinkTime = 0;
  blinkAvailable = true;
  blinkOpacity = 1;
  blinkObstacleUsed = false;
  gameOverStartTime = 0;
  shatterIndex = -1;
  private highScore = 0;
  private readonly HIGH_SCORE_KEY = 'neon_snake_high_score';

  constructor() {
    this.loadHighScore();
    this.init();
  }

  loadHighScore(): void {
    try {
      const saved = localStorage.getItem(this.HIGH_SCORE_KEY);
      if (saved) {
        this.highScore = parseInt(saved, 10) || 0;
      }
    } catch {
      this.highScore = 0;
    }
  }

  saveHighScore(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      try {
        localStorage.setItem(this.HIGH_SCORE_KEY, String(this.highScore));
      } catch {
      }
    }
  }

  getHighScore(): number {
    return this.highScore;
  }

  init(): void {
    this.snake = [];
    const startX = Math.floor(CANVAS_WIDTH / 2 / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    const startY = Math.floor(CANVAS_HEIGHT / 2 / GRID_SIZE) * GRID_SIZE + GRID_SIZE / 2;
    for (let i = 0; i < 3; i++) {
      this.snake.push({
        position: { x: startX - i * GRID_SIZE, y: startY }
      });
    }
    this.direction = 'right';
    this.nextDirection = 'right';
    this.score = 0;
    this.moveInterval = INITIAL_MOVE_INTERVAL;
    this.particles = [];
    this.trails = [];
    this.isBlinking = false;
    this.blinkAvailable = true;
    this.blinkObstacleUsed = false;
    this.gameOverStartTime = 0;
    this.shatterIndex = -1;
    this.generateObstacles();
    this.generateFood();
    this.gameState = 'playing';
    this.lastMoveTime = performance.now();
    this.lastTrailTime = performance.now();
    this.lastBlinkTime = 0;
  }

  private generateObstacles(): void {
    this.obstacles = [];
    const count = 8 + Math.floor(Math.random() * 5);
    const cols = Math.floor(CANVAS_WIDTH / GRID_SIZE);
    const rows = Math.floor(CANVAS_HEIGHT / GRID_SIZE);
    const occupied = new Set<string>();

    for (const seg of this.snake) {
      const cx = Math.floor(seg.position.x / GRID_SIZE);
      const cy = Math.floor(seg.position.y / GRID_SIZE);
      for (let dx = -2; dx <= 2; dx++) {
        for (let dy = -2; dy <= 2; dy++) {
          occupied.add(`${cx + dx},${cy + dy}`);
        }
      }
    }

    let attempts = 0;
    while (this.obstacles.length < count && attempts < 500) {
      attempts++;
      const gx = Math.floor(Math.random() * cols);
      const gy = Math.floor(Math.random() * rows);
      const key = `${gx},${gy}`;
      if (occupied.has(key)) continue;

      const px = gx * GRID_SIZE + GRID_SIZE / 2;
      const py = gy * GRID_SIZE + GRID_SIZE / 2;
      this.obstacles.push({
        position: { x: px, y: py },
        size: OBSTACLE_SIZE,
        opacity: 1,
        fading: false,
        fadeStartTime: 0
      });
      occupied.add(key);
    }
  }

  generateFood(): void {
    const cols = Math.floor(CANVAS_WIDTH / GRID_SIZE);
    const rows = Math.floor(CANVAS_HEIGHT / GRID_SIZE);
    const occupied = new Set<string>();

    for (const seg of this.snake) {
      const cx = Math.floor(seg.position.x / GRID_SIZE);
      const cy = Math.floor(seg.position.y / GRID_SIZE);
      occupied.add(`${cx},${cy}`);
    }
    for (const obs of this.obstacles) {
      const cx = Math.floor(obs.position.x / GRID_SIZE);
      const cy = Math.floor(obs.position.y / GRID_SIZE);
      occupied.add(`${cx},${cy}`);
    }

    let attempts = 0;
    while (attempts < 500) {
      attempts++;
      const gx = Math.floor(Math.random() * cols);
      const gy = Math.floor(Math.random() * rows);
      const key = `${gx},${gy}`;
      if (!occupied.has(key)) {
        this.food = {
          position: { x: gx * GRID_SIZE + GRID_SIZE / 2, y: gy * GRID_SIZE + GRID_SIZE / 2 }
        };
        return;
      }
    }
  }

  setDirection(dir: Direction): void {
    const opposite: Record<Direction, Direction> = {
      up: 'down',
      down: 'up',
      left: 'right',
      right: 'left'
    };
    if (opposite[dir] !== this.direction) {
      this.nextDirection = dir;
    }
  }

  startBlink(): void {
    const now = performance.now();
    if (this.blinkAvailable && !this.isBlinking && this.gameState === 'playing') {
      this.isBlinking = true;
      this.blinkStartTime = now;
      this.blinkObstacleUsed = false;
      this.blinkAvailable = false;
    }
  }

  private spawnEatParticles(position: Position): void {
    const directions = 6;
    for (let i = 0; i < directions; i++) {
      const angle = (i / directions) * Math.PI * 2;
      const speed = 30 / 0.4;
      this.particles.push({
        position: { x: position.x, y: position.y },
        velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
        color: '#FFD93D',
        radius: 2,
        life: 0.4,
        maxLife: 0.4
      });
    }
  }

  private spawnGameOverParticles(): void {
    for (let i = this.snake.length - 1; i >= 0; i--) {
      const seg = this.snake[i];
      const color = getSegmentColor(i, this.snake.length);
      const delay = (this.snake.length - 1 - i) * 0.08;
      setTimeout(() => {
        for (let j = 0; j < 8; j++) {
          const angle = Math.random() * Math.PI * 2;
          const speed = (20 + Math.random() * 40) / 1;
          this.particles.push({
            position: { x: seg.position.x, y: seg.position.y },
            velocity: { x: Math.cos(angle) * speed, y: Math.sin(angle) * speed },
            color,
            radius: 2 + Math.random() * 2,
            life: 1,
            maxLife: 1
          });
        }
      }, delay * 1000);
    }
  }

  update(deltaTime: number, now: number): void {
    const dt = deltaTime / 1000;

    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.position.x += p.velocity.x * dt;
      p.position.y += p.velocity.y * dt;
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
      }
    }
    if (this.particles.length > 500) {
      this.particles.splice(0, this.particles.length - 500);
    }

    for (let i = this.trails.length - 1; i >= 0; i--) {
      const t = this.trails[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.trails.splice(i, 1);
      }
    }

    for (const obs of this.obstacles) {
      if (obs.fading) {
        const elapsed = (now - obs.fadeStartTime) / 1000;
        obs.opacity = Math.max(0, 1 - elapsed / 0.5);
      }
    }
    this.obstacles = this.obstacles.filter(o => o.opacity > 0);

    if (this.isBlinking) {
      const elapsed = now - this.blinkStartTime;
      if (elapsed >= BLINK_DURATION) {
        this.isBlinking = false;
        this.blinkOpacity = 1;
        this.lastBlinkTime = now;
      } else {
        const phase = Math.floor((now - this.blinkStartTime) / 50);
        this.blinkOpacity = phase % 2 === 0 ? 1 : 0.3;
      }
    } else if (!this.blinkAvailable) {
      const elapsed = now - this.lastBlinkTime;
      if (elapsed >= BLINK_COOLDOWN) {
        this.blinkAvailable = true;
      }
    }

    if (this.gameState === 'gameover') {
      const elapsed = now - this.gameOverStartTime;
      const targetIndex = Math.floor(elapsed / 80) - 1;
      if (targetIndex > this.shatterIndex && targetIndex < this.snake.length) {
        this.shatterIndex = targetIndex;
      }
      return;
    }

    if (this.gameState !== 'playing') return;

    if (this.isBlinking && now - this.lastTrailTime > 150) {
      this.lastTrailTime = now;
      const tail = this.snake[this.snake.length - 1];
      if (tail) {
        this.trails.push({
          position: { x: tail.position.x, y: tail.position.y },
          color: getSegmentColor(this.snake.length - 1, this.snake.length),
          life: 0.6,
          maxLife: 0.6
        });
      }
    } else if (!this.isBlinking && now - this.lastTrailTime > 300) {
      this.lastTrailTime = now;
      const tail = this.snake[this.snake.length - 1];
      if (tail) {
        this.trails.push({
          position: { x: tail.position.x, y: tail.position.y },
          color: getSegmentColor(this.snake.length - 1, this.snake.length),
          life: 0.6,
          maxLife: 0.6
        });
      }
    }

    const currentInterval = this.isBlinking ? this.moveInterval / 2 : this.moveInterval;
    if (now - this.lastMoveTime < currentInterval) return;
    this.lastMoveTime = now;

    this.direction = this.nextDirection;
    const head = this.snake[0];
    let newX = head.position.x;
    let newY = head.position.y;

    switch (this.direction) {
      case 'up': newY -= GRID_SIZE; break;
      case 'down': newY += GRID_SIZE; break;
      case 'left': newX -= GRID_SIZE; break;
      case 'right': newX += GRID_SIZE; break;
    }

    if (newX < SEGMENT_RADIUS) newX = CANVAS_WIDTH - SEGMENT_RADIUS;
    if (newX > CANVAS_WIDTH - SEGMENT_RADIUS) newX = SEGMENT_RADIUS;
    if (newY < SEGMENT_RADIUS) newY = CANVAS_HEIGHT - SEGMENT_RADIUS;
    if (newY > CANVAS_HEIGHT - SEGMENT_RADIUS) newY = SEGMENT_RADIUS;

    const newHead: SnakeSegment = { position: { x: newX, y: newY } };

    for (let i = 1; i < this.snake.length; i++) {
      const seg = this.snake[i];
      if (Math.abs(seg.position.x - newX) < SEGMENT_RADIUS * 1.5 &&
          Math.abs(seg.position.y - newY) < SEGMENT_RADIUS * 1.5) {
        this.triggerGameOver(now);
        return;
      }
    }

    for (const obs of this.obstacles) {
      if (obs.fading) continue;
      const halfSize = obs.size / 2;
      if (newX > obs.position.x - halfSize - SEGMENT_RADIUS &&
          newX < obs.position.x + halfSize + SEGMENT_RADIUS &&
          newY > obs.position.y - halfSize - SEGMENT_RADIUS &&
          newY < obs.position.y + halfSize + SEGMENT_RADIUS) {
        if (this.isBlinking && !this.blinkObstacleUsed) {
          obs.fading = true;
          obs.fadeStartTime = now;
          this.blinkObstacleUsed = true;
        } else {
          this.triggerGameOver(now);
          return;
        }
      }
    }

    this.snake.unshift(newHead);

    if (this.food &&
        Math.abs(this.food.position.x - newX) < GRID_SIZE / 2 &&
        Math.abs(this.food.position.y - newY) < GRID_SIZE / 2) {
      this.score += 10;
      this.spawnEatParticles({ x: newX, y: newY });
      this.moveInterval = Math.max(MIN_MOVE_INTERVAL, this.moveInterval - SPEED_DECREASE);
      this.generateFood();
    } else {
      this.snake.pop();
    }
  }

  private triggerGameOver(now: number): void {
    this.gameState = 'gameover';
    this.gameOverStartTime = now;
    this.shatterIndex = -1;
    this.spawnGameOverParticles();
    this.saveHighScore();
  }
}
