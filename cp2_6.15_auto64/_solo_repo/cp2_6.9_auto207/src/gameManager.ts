import { SandSimulator, HourglassConfig, MouseState, SandParticle } from './sandSim';

export interface SandWormSegment {
  x: number;
  y: number;
}

export interface SandWorm {
  segments: SandWormSegment[];
  targetX: number;
  targetY: number;
  phase: number;
  speed: number;
  amplitude: number;
  frequency: number;
  age: number;
  maxAge: number;
  alive: boolean;
}

export type GameState = 'playing' | 'paused' | 'won' | 'lost' | 'flipping';

export interface GameStatus {
  state: GameState;
  level: number;
  timeLeft: number;
  totalTime: number;
  sandRatio: number;
  totalSand: number;
  wormsEaten: number;
  isLastTenSeconds: boolean;
}

const LEVEL_TIME = 60;
const MIN_SAND = 3000;
const INITIAL_WORMS = 2;
const MAX_WORMS = 8;
const BASE_FLOW_SPEED = 20;
const MIN_FLOW_SPEED = 10;
const FLIP_DURATION = 0.5;
const WORM_COLOR = '#8B4513';

export class GameManager {
  state: GameState = 'playing';
  level: number = 1;
  timeLeft: number = LEVEL_TIME;
  totalTimeElapsed: number = 0;
  wormsEaten: number = 0;
  sandSim: SandSimulator;
  worms: SandWorm[] = [];
  hourglass: HourglassConfig;
  private canvasWidth: number;
  private canvasHeight: number;
  private flipProgress: number = 0;
  private flipStartRotation: number = 0;
  private flipEndRotation: number = 0;
  private flashTime: number = 0;
  private baseFlowSpeed: number = BASE_FLOW_SPEED;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.hourglass = {
      centerX: canvasWidth / 2,
      centerY: canvasHeight / 2,
      width: 240,
      height: 360,
      neckWidth: 8,
      rotation: 0
    };
    this.sandSim = new SandSimulator(this.hourglass, this.baseFlowSpeed);
    this.sandSim.initParticles(5000);
    this.spawnInitialWorms();
  }

  resize(width: number, height: number) {
    this.canvasWidth = width;
    this.canvasHeight = height;
    this.hourglass.centerX = width / 2;
    this.hourglass.centerY = height / 2;
    this.sandSim.setHourglass(this.hourglass);
  }

  private spawnInitialWorms() {
    const count = INITIAL_WORMS + this.level - 1;
    const actualCount = Math.min(count, MAX_WORMS);
    for (let i = 0; i < actualCount; i++) {
      this.spawnWorm();
    }
  }

  private spawnWorm() {
    const side = Math.floor(Math.random() * 4);
    let startX: number, startY: number;

    switch (side) {
      case 0:
        startX = Math.random() * this.canvasWidth;
        startY = -30;
        break;
      case 1:
        startX = this.canvasWidth + 30;
        startY = Math.random() * this.canvasHeight;
        break;
      case 2:
        startX = Math.random() * this.canvasWidth;
        startY = this.canvasHeight + 30;
        break;
      default:
        startX = -30;
        startY = Math.random() * this.canvasHeight;
        break;
    }

    const segmentCount = 3 + Math.floor(Math.random() * 3);
    const segments: SandWormSegment[] = [];
    for (let i = 0; i < segmentCount; i++) {
      segments.push({ x: startX, y: startY });
    }

    const neck = this.sandSim.getNeckPosition();
    this.worms.push({
      segments,
      targetX: neck.x,
      targetY: neck.y,
      phase: Math.random() * Math.PI * 2,
      speed: 0.8 + Math.random() * 0.6,
      amplitude: 15 + Math.random() * 20,
      frequency: 0.03 + Math.random() * 0.02,
      age: 0,
      maxAge: 8 + Math.random() * 6,
      alive: true
    });
  }

  update(dt: number, mouse: MouseState) {
    if (this.state === 'paused' || this.state === 'won' || this.state === 'lost') return;

    if (this.state === 'flipping') {
      this.flipProgress += dt / FLIP_DURATION;
      if (this.flipProgress >= 1) {
        this.flipProgress = 1;
        this.hourglass.rotation = this.flipEndRotation;
        this.state = 'playing';
        for (const p of this.sandSim.particles) {
          p.inTop = !p.inTop;
        }
      } else {
        const t = this.flipProgress;
        const ease = t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
        this.hourglass.rotation = this.flipStartRotation + (this.flipEndRotation - this.flipStartRotation) * ease;
      }
      this.sandSim.setHourglass(this.hourglass);
      this.sandSim.update(dt);
      return;
    }

    this.timeLeft -= dt;
    this.totalTimeElapsed += dt;
    this.sandSim.setMouseState(mouse);
    this.sandSim.update(dt);

    if (this.flashTime > 0) this.flashTime -= dt;

    this.updateWorms(dt);
    this.checkWormCollisions();

    this.maintainWormCount();

    const sandRatio = this.sandSim.getBottomSandRatio();
    if (sandRatio >= 1) {
      this.nextLevel();
      return;
    }

    if (this.timeLeft <= 0 || this.sandSim.getTotalParticles() < MIN_SAND) {
      this.state = 'lost';
    }
  }

  private updateWorms(dt: number) {
    const neck = this.sandSim.getNeckPosition();

    for (let i = this.worms.length - 1; i >= 0; i--) {
      const worm = this.worms[i];
      if (!worm.alive) {
        this.worms.splice(i, 1);
        continue;
      }

      worm.age += dt;
      if (worm.age >= worm.maxAge) {
        worm.alive = false;
        continue;
      }

      worm.targetX = neck.x + (Math.random() - 0.5) * 40;
      worm.targetY = neck.y + (Math.random() - 0.5) * 40;

      const head = worm.segments[0];
      const dx = worm.targetX - head.x;
      const dy = worm.targetY - head.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > 1) {
        const baseMoveX = (dx / dist) * worm.speed;
        const baseMoveY = (dy / dist) * worm.speed;

        worm.phase += worm.frequency;
        const perpX = -dy / dist;
        const perpY = dx / dist;
        const sineOffset = Math.sin(worm.phase) * worm.amplitude * 0.1;

        const newHeadX = head.x + baseMoveX + perpX * sineOffset;
        const newHeadY = head.y + baseMoveY + perpY * sineOffset;

        for (let s = worm.segments.length - 1; s > 0; s--) {
          const prev = worm.segments[s - 1];
          const seg = worm.segments[s];
          const segDx = prev.x - seg.x;
          const segDy = prev.y - seg.y;
          const segDist = Math.sqrt(segDx * segDx + segDy * segDy);
          if (segDist > 6) {
            seg.x = prev.x - (segDx / segDist) * 6;
            seg.y = prev.y - (segDy / segDist) * 6;
          }
        }

        head.x = newHeadX;
        head.y = newHeadY;
      }
    }
  }

  private checkWormCollisions() {
    const bottomParticles = this.sandSim.getBottomParticles();

    for (const worm of this.worms) {
      if (!worm.alive) continue;
      const head = worm.segments[0];

      for (let i = bottomParticles.length - 1; i >= 0; i--) {
        const p = bottomParticles[i];
        const dx = head.x - p.x;
        const dy = head.y - p.y;
        if (dx * dx + dy * dy < 100) {
          const eatCount = 10 + Math.floor(Math.random() * 6);
          const eaten = this.sandSim.removeParticles(eatCount);
          if (eaten > 0) {
            this.wormsEaten += eaten;
            this.flashTime = 0.15;
          }
          break;
        }
      }
    }
  }

  private maintainWormCount() {
    const desiredMin = 2;
    const desiredMax = Math.min(4 + this.level - 1, MAX_WORMS);
    const currentAlive = this.worms.filter(w => w.alive).length;

    if (currentAlive < desiredMin) {
      this.spawnWorm();
    } else if (currentAlive < desiredMax && Math.random() < 0.005) {
      this.spawnWorm();
    }
  }

  private nextLevel() {
    this.level++;
    this.timeLeft = LEVEL_TIME;
    this.baseFlowSpeed = Math.max(MIN_FLOW_SPEED, this.baseFlowSpeed * 0.9);
    this.sandSim.setBaseFlowSpeed(this.baseFlowSpeed);

    this.state = 'flipping';
    this.flipProgress = 0;
    this.flipStartRotation = this.hourglass.rotation;
    this.flipEndRotation = this.hourglass.rotation + Math.PI;

    for (const worm of this.worms) {
      worm.alive = false;
    }
    this.worms = [];
    setTimeout(() => this.spawnInitialWorms(), 600);
  }

  togglePause() {
    if (this.state === 'playing') {
      this.state = 'paused';
    } else if (this.state === 'paused') {
      this.state = 'playing';
    }
  }

  restart() {
    this.state = 'playing';
    this.level = 1;
    this.timeLeft = LEVEL_TIME;
    this.totalTimeElapsed = 0;
    this.wormsEaten = 0;
    this.baseFlowSpeed = BASE_FLOW_SPEED;
    this.hourglass.rotation = 0;
    this.sandSim.setHourglass(this.hourglass);
    this.sandSim.setBaseFlowSpeed(this.baseFlowSpeed);
    this.sandSim.initParticles(5000);
    this.worms = [];
    this.spawnInitialWorms();
  }

  isMouseOverHourglassTop(x: number, y: number): boolean {
    const { centerX, centerY, width, height, rotation } = this.hourglass;
    const cos = Math.cos(rotation);
    const sin = Math.sin(rotation);
    const dx = x - centerX;
    const dy = y - centerY;
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;

    if (localY > 0) return false;

    const progress = Math.abs(localY) / (height / 2);
    const halfWidth = (width / 2) * progress + this.hourglass.neckWidth / 2;
    return Math.abs(localX) < halfWidth + 20;
  }

  isMouseOverPauseButton(x: number, y: number): boolean {
    const btnX = this.canvasWidth - 40;
    const btnY = this.canvasHeight - 40;
    const dx = x - btnX;
    const dy = y - btnY;
    return dx * dx + dy * dy < 400;
  }

  isMouseOverReplayButton(x: number, y: number): boolean {
    if (this.state !== 'lost') return false;
    const btnX = this.canvasWidth / 2;
    const btnY = this.canvasHeight / 2 + 60;
    return x >= btnX - 60 && x <= btnX + 60 && y >= btnY - 20 && y <= btnY + 20;
  }

  getStatus(): GameStatus {
    return {
      state: this.state,
      level: this.level,
      timeLeft: Math.max(0, this.timeLeft),
      totalTime: this.totalTimeElapsed,
      sandRatio: this.sandSim.getBottomSandRatio(),
      totalSand: this.sandSim.getTotalParticles(),
      wormsEaten: this.wormsEaten,
      isLastTenSeconds: this.timeLeft <= 10 && this.state === 'playing'
    };
  }

  getFlashTime(): number {
    return this.flashTime;
  }

  getParticles(): SandParticle[] {
    return this.sandSim.particles;
  }

  getWorms(): SandWorm[] {
    return this.worms.filter(w => w.alive);
  }
}
