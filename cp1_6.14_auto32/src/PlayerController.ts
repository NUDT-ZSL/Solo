import { LevelElement } from './types';

export interface PlayerState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  width: number;
  height: number;
  onGround: boolean;
  jumpCount: number;
  isDead: boolean;
}

export interface CameraState {
  x: number;
  y: number;
}

export interface GameStats {
  time: number;
  deaths: number;
  completed: boolean;
  jumps: number[];
}

export type GameTickCallback = (
  player: PlayerState,
  camera: CameraState,
  stats: GameStats
) => void;

export type GameCompleteCallback = (stats: GameStats) => void;

const GRAVITY = 1500;
const RUN_SPEED = 280;
const JUMP_VELOCITY = -620;
const MAX_FALL_SPEED = 900;
const CAMERA_FOLLOW_SPEED_FACTOR = 0.5;
const PLAYER_WIDTH = 40;
const PLAYER_HEIGHT = 60;
const FALL_THRESHOLD = 1000;

export class PlayerController {
  private elements: LevelElement[];
  private player: PlayerState;
  private camera: CameraState;
  private stats: GameStats;
  private startX: number;
  private startY: number;
  private running: boolean;
  private animationId: number | null;
  private lastTime: number = 0;
  private tickCallback: GameTickCallback | null;
  private completeCallback: GameCompleteCallback | null;
  private spacePressed: boolean;
  private lastJumpX: number;

  constructor(elements: LevelElement[]) {
    this.elements = elements;
    this.animationId = null;
    this.running = false;
    this.tickCallback = null;
    this.completeCallback = null;
    this.spacePressed = false;
    this.lastJumpX = 0;

    const startPlatform = this.findStartPlatform();
    this.startX = startPlatform.x + 50;
    this.startY = startPlatform.y - PLAYER_HEIGHT;

    this.player = this.createInitialPlayer();
    this.camera = { x: 0, y: 0 };
    this.stats = { time: 0, deaths: 0, completed: false, jumps: [] };

    this.setupInputListeners();
  }

  private findStartPlatform(): LevelElement {
    const platforms = this.elements.filter(e => e.type === 'platform');
    if (platforms.length === 0) {
      return { id: 'fallback', type: 'platform', x: 0, y: 500, width: 300, height: 40, color: '#22c55e' };
    }
    return platforms.sort((a, b) => a.x - b.x)[0];
  }

  private createInitialPlayer(): PlayerState {
    return {
      x: this.startX,
      y: this.startY,
      vx: RUN_SPEED,
      vy: 0,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      onGround: false,
      jumpCount: 0,
      isDead: false,
    };
  }

  private setupInputListeners(): void {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!this.running) return;
      if (e.code === 'Space') {
        e.preventDefault();
        if (!this.spacePressed) {
          this.spacePressed = true;
          this.tryJump();
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        this.spacePressed = false;
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    this.cleanupInput = () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }

  private cleanupInput: () => void = () => {};

  private tryJump(): void {
    if (this.player.isDead || this.stats.completed) return;
    if (this.player.onGround) {
      this.player.vy = JUMP_VELOCITY;
      this.player.onGround = false;
      this.player.jumpCount++;

      const jumpBucket = Math.floor(this.player.x / 100);
      this.stats.jumps[jumpBucket] = (this.stats.jumps[jumpBucket] || 0) + 1;
    }
  }

  private rectsIntersect(
    ax: number, ay: number, aw: number, ah: number,
    bx: number, by: number, bw: number, bh: number
  ): boolean {
    return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
  }

  private resolveCollisions(prevX: number, prevY: number): void {
    for (const elem of this.elements) {
      if (elem.type === 'collectible' || elem.type === 'goal') continue;

      if (!this.rectsIntersect(
        this.player.x, this.player.y,
        this.player.width, this.player.height,
        elem.x, elem.y,
        elem.width, elem.height
      )) {
        continue;
      }

      if (elem.type === 'spike') {
        this.die();
        return;
      }

      if (elem.type === 'platform' || elem.type === 'obstacle') {
        const prevBottom = prevY + this.player.height;
        const currBottom = this.player.y + this.player.height;
        const elemTop = elem.y;

        const wasAbove = prevBottom <= elemTop + 2;
        const isNowOverlapping = currBottom > elemTop;

        if (wasAbove && isNowOverlapping && this.player.vy >= 0) {
          this.player.y = elem.y - this.player.height;
          this.player.vy = 0;
          this.player.onGround = true;
          continue;
        }

        const prevTop = prevY;
        const currTop = this.player.y;
        const elemBottom = elem.y + elem.height;
        const wasBelow = prevTop >= elemBottom - 2;

        if (wasBelow && currTop < elemBottom && this.player.vy < 0) {
          this.player.y = elemBottom;
          this.player.vy = 0;
          continue;
        }

        const prevRight = prevX + this.player.width;
        const currRight = this.player.x + this.player.width;
        const elemLeft = elem.x;
        const wasLeft = prevRight <= elemLeft + 2;

        if (wasLeft && currRight > elemLeft) {
          if (elem.type === 'obstacle') {
            this.die();
            return;
          }
          this.player.x = elem.x - this.player.width;
          continue;
        }

        const prevLeft = prevX;
        const currLeft = this.player.x;
        const elemRight = elem.x + elem.width;
        const wasRight = prevLeft >= elemRight - 2;

        if (wasRight && currLeft < elemRight) {
          if (elem.type === 'obstacle') {
            this.die();
            return;
          }
          this.player.x = elemRight;
          continue;
        }
      }
    }

    if (this.player.onGround) {
      let stillOnGround = false;
      for (const elem of this.elements) {
        if (elem.type !== 'platform' && elem.type !== 'obstacle') continue;
        if (
          this.player.x + this.player.width > elem.x &&
          this.player.x < elem.x + elem.width &&
          Math.abs(this.player.y + this.player.height - elem.y) < 3
        ) {
          stillOnGround = true;
          break;
        }
      }
      if (!stillOnGround) {
        this.player.onGround = false;
      }
    }
  }

  private die(): void {
    if (this.player.isDead) return;
    this.player.isDead = true;
    this.stats.deaths++;

    setTimeout(() => {
      this.resetPlayer();
    }, 400);
  }

  private resetPlayer(): void {
    this.player = this.createInitialPlayer();
  }

  private checkGoal(): void {
    for (const elem of this.elements) {
      if (elem.type !== 'goal') continue;
      if (this.rectsIntersect(
        this.player.x, this.player.y,
        this.player.width, this.player.height,
        elem.x, elem.y,
        elem.width, elem.height
      )) {
        this.stats.completed = true;
        if (this.completeCallback) {
          this.completeCallback({ ...this.stats });
        }
      }
    }
  }

  private gameLoop(currentTime: number): void {
    if (!this.running) return;

    if (this.lastTime === 0) {
      this.lastTime = currentTime;
    }

    let delta = (currentTime - this.lastTime) / 1000;
    if (delta > 0.05) delta = 0.05;
    this.lastTime = currentTime;

    if (!this.player.isDead && !this.stats.completed) {
      this.stats.time += delta;

      const prevX = this.player.x;
      const prevY = this.player.y;

      this.player.vy += GRAVITY * delta;
      if (this.player.vy > MAX_FALL_SPEED) {
        this.player.vy = MAX_FALL_SPEED;
      }

      this.player.x += this.player.vx * delta;
      this.player.y += this.player.vy * delta;

      this.resolveCollisions(prevX, prevY);

      if (this.player.y > FALL_THRESHOLD) {
        this.die();
      }

      this.checkGoal();

      const targetCameraX = this.player.x - 300;
      const targetCameraY = Math.max(0, this.player.y - 300);
      const maxCameraSpeed = RUN_SPEED * CAMERA_FOLLOW_SPEED_FACTOR;
      const dx = targetCameraX - this.camera.x;
      const dy = targetCameraY - this.camera.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > 0) {
        const moveAmount = Math.min(dist, maxCameraSpeed * delta);
        this.camera.x += (dx / dist) * moveAmount;
        this.camera.y += (dy / dist) * moveAmount;
      }
    }

    if (this.tickCallback) {
      this.tickCallback(
        { ...this.player },
        { ...this.camera },
        { ...this.stats, jumps: [...this.stats.jumps] }
      );
    }

    this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  public start(
    onTick: GameTickCallback,
    onComplete: GameCompleteCallback
  ): void {
    this.stop();

    this.tickCallback = onTick;
    this.completeCallback = onComplete;
    this.running = true;
    this.lastTime = 0;

    this.player = this.createInitialPlayer();
    this.camera = { x: Math.max(0, this.startX - 300), y: 0 };
    this.stats = { time: 0, deaths: 0, completed: false, jumps: [] };

    this.animationId = requestAnimationFrame((t) => this.gameLoop(t));
  }

  public stop(): void {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public destroy(): void {
    this.stop();
    this.cleanupInput();
  }

  public getPlayerState(): PlayerState {
    return { ...this.player };
  }

  public getCameraState(): CameraState {
    return { ...this.camera };
  }

  public getStats(): GameStats {
    return { ...this.stats, jumps: [...this.stats.jumps] };
  }
}
