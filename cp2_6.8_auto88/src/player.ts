import type { Obstacle } from './editor';

export interface PlayerState {
  x: number;
  y: number;
  velocityY: number;
  isJumping: boolean;
  isCrouching: boolean;
  isRunning: boolean;
  width: number;
  height: number;
  frame: number;
}

const GRAVITY = 1800;
const JUMP_VELOCITY = -700;
const RUN_SPEED = 300;
const GROUND_OFFSET = 0;
const PLAYER_WIDTH = 30;
const PLAYER_HEIGHT = 40;
const CROUCH_HEIGHT = 24;

export class Player {
  state: PlayerState;
  private groundY: number;
  private keys: Set<string> = new Set();
  private onCollisionCallback: (() => void) | null = null;
  private onFinishCallback: (() => void) | null = null;
  private isPlaying = false;
  private passedObstacles: Set<string> = new Set();

  constructor(groundY: number) {
    this.groundY = groundY;
    this.state = this.createInitialState();
    this.bindKeyboard();
  }

  private createInitialState(): PlayerState {
    return {
      x: 100,
      y: this.groundY - PLAYER_HEIGHT,
      velocityY: 0,
      isJumping: false,
      isCrouching: false,
      isRunning: false,
      width: PLAYER_WIDTH,
      height: PLAYER_HEIGHT,
      frame: 0
    };
  }

  onCollision(callback: () => void): void {
    this.onCollisionCallback = callback;
  }

  onFinish(callback: () => void): void {
    this.onFinishCallback = callback;
  }

  private bindKeyboard(): void {
    window.addEventListener('keydown', (e) => {
      if (['Space', 'KeyS'].includes(e.code)) {
        e.preventDefault();
      }
      this.keys.add(e.code);

      if (!this.isPlaying) return;

      if (e.code === 'Space' && !this.state.isJumping && !this.state.isCrouching) {
        this.jump();
      }
      if (e.code === 'KeyS' && !this.state.isJumping) {
        this.state.isCrouching = true;
        this.state.height = CROUCH_HEIGHT;
        this.state.y = this.groundY - CROUCH_HEIGHT;
      }
    });

    window.addEventListener('keyup', (e) => {
      this.keys.delete(e.code);

      if (e.code === 'KeyS' && this.state.isCrouching) {
        this.state.isCrouching = false;
        this.state.height = PLAYER_HEIGHT;
        this.state.y = this.groundY - PLAYER_HEIGHT;
      }
    });
  }

  start(): void {
    this.state = this.createInitialState();
    this.state.isRunning = true;
    this.isPlaying = true;
    this.passedObstacles.clear();
  }

  stop(): void {
    this.isPlaying = false;
    this.state.isRunning = false;
    this.state.isCrouching = false;
    this.state.height = PLAYER_HEIGHT;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  private jump(): void {
    this.state.velocityY = JUMP_VELOCITY;
    this.state.isJumping = true;
  }

  update(deltaTime: number, obstacles: Obstacle[]): { collided: boolean; finished: boolean } {
    if (!this.isPlaying) return { collided: false, finished: false };

    this.state.frame += deltaTime * 10;

    this.state.x += RUN_SPEED * deltaTime;

    if (this.state.isJumping) {
      this.state.velocityY += GRAVITY * deltaTime;
      this.state.y += this.state.velocityY * deltaTime;

      const currentHeight = this.state.isCrouching ? CROUCH_HEIGHT : PLAYER_HEIGHT;
      if (this.state.y >= this.groundY - currentHeight + GROUND_OFFSET) {
        this.state.y = this.groundY - currentHeight + GROUND_OFFSET;
        this.state.velocityY = 0;
        this.state.isJumping = false;
      }
    }

    for (const obs of obstacles) {
      if (this.passedObstacles.has(obs.id)) continue;

      const collision = this.checkCollision(obs);
      if (collision) {
        this.isPlaying = false;
        this.state.isRunning = false;
        if (this.onCollisionCallback) this.onCollisionCallback();
        return { collided: true, finished: false };
      }

      if (this.state.x > obs.x + obs.width / 2 + 50) {
        this.passedObstacles.add(obs.id);
      }
    }

    const farthestX = obstacles.length > 0
      ? Math.max(...obstacles.map(o => o.x))
      : 0;
    if (this.state.x > farthestX + 600) {
      this.isPlaying = false;
      this.state.isRunning = false;
      if (this.onFinishCallback) this.onFinishCallback();
      return { collided: false, finished: true };
    }

    return { collided: false, finished: false };
  }

  private getObstacleRect(obs: Obstacle): { x: number; y: number; w: number; h: number } {
    if (obs.type === 'platform') {
      const t = performance.now() / 1000;
      const offset = Math.sin(t * 2 + obs.x * 0.01) * 40;
      return {
        x: obs.x - obs.width / 2,
        y: obs.baseY - 120 + offset,
        w: obs.width,
        h: obs.height
      };
    }
    return {
      x: obs.x - obs.width / 2,
      y: obs.baseY - obs.height,
      w: obs.width,
      h: obs.height
    };
  }

  private checkCollision(obs: Obstacle): boolean {
    const pLeft = this.state.x - this.state.width / 2;
    const pRight = this.state.x + this.state.width / 2;
    const pTop = this.state.y;
    const pBottom = this.state.y + this.state.height;

    const rect = this.getObstacleRect(obs);
    const oLeft = rect.x;
    const oRight = rect.x + rect.w;
    const oTop = rect.y;
    const oBottom = rect.y + rect.h;

    if (pRight <= oLeft || pLeft >= oRight) return false;
    if (pBottom <= oTop || pTop >= oBottom) return false;

    if (obs.type === 'spike' && this.state.isCrouching && !this.state.isJumping) {
      return false;
    }

    if (obs.type === 'wall' && this.state.isJumping && pBottom < oTop + 15) {
      return false;
    }

    return true;
  }

  getCameraX(canvasWidth: number): number {
    const targetX = this.state.x - canvasWidth * 0.3;
    return Math.max(0, targetX);
  }

  render(ctx: CanvasRenderingContext2D, scrollX: number): void {
    const screenX = this.state.x - scrollX;
    const screenY = this.state.y;

    const bounce = this.state.isRunning && !this.state.isJumping
      ? Math.sin(this.state.frame) * 2
      : 0;

    ctx.save();
    ctx.translate(screenX, screenY + bounce);

    const bodyColor = '#3498DB';
    const hatColor = '#E74C3C';
    const skinColor = '#F5CBA7';

    if (this.state.isCrouching) {
      ctx.fillStyle = bodyColor;
      ctx.fillRect(-15, 0, 30, 16);
      ctx.fillStyle = skinColor;
      ctx.fillRect(-10, -8, 20, 10);
      ctx.fillStyle = hatColor;
      ctx.fillRect(-12, -12, 24, 5);
      ctx.fillRect(-4, -16, 8, 4);
    } else {
      ctx.fillStyle = bodyColor;
      ctx.fillRect(-12, 14, 24, 18);

      const legOffset = this.state.isRunning && !this.state.isJumping
        ? Math.sin(this.state.frame * 2) * 4
        : 0;
      ctx.fillStyle = '#2C3E50';
      ctx.fillRect(-10, 32, 8, 8 + legOffset);
      ctx.fillRect(2, 32, 8, 8 - legOffset);

      ctx.fillStyle = skinColor;
      ctx.fillRect(-10, 0, 20, 16);

      ctx.fillStyle = hatColor;
      ctx.fillRect(-12, -4, 24, 6);
      ctx.fillRect(-6, -10, 12, 8);

      ctx.fillStyle = '#000';
      ctx.fillRect(-4, 6, 3, 3);
      ctx.fillRect(2, 6, 3, 3);
    }

    ctx.restore();
  }

  renderPlatform(ctx: CanvasRenderingContext2D, obs: Obstacle, scrollX: number): void {
    const screenX = obs.x - scrollX;
    const t = performance.now() / 1000;
    const offset = Math.sin(t * 2 + obs.x * 0.01) * 40;
    const top = obs.baseY - 120 + offset;

    ctx.fillStyle = obs.color;
    ctx.fillRect(screenX - obs.width / 2, top, obs.width, obs.height);
    ctx.fillStyle = 'rgba(255,255,255,0.2)';
    ctx.fillRect(screenX - obs.width / 2, top, obs.width, 3);
  }
}
