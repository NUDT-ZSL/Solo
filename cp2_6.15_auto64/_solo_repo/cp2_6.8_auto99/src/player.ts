import { Maze, CELL_SIZE } from './maze';

export const PLAYER_COLOR = '#F6E05E';
export const PLAYER_SIZE = 16;
export const MAX_HEALTH = 5;
export const MOVE_COOLDOWN = 1 / 60;

export type PlayerEvent = 'trap' | 'exit' | 'death' | 'move';

export class Player {
  public x: number;
  public y: number;
  public health: number;
  public maze: Maze;
  public onEvent: ((event: PlayerEvent, data?: unknown) => void) | null = null;

  private moveCooldown: number = 0;
  private shakeTime: number = 0;
  private shakeIntensity: number = 5;
  private shakeAxis: 'x' | 'y' = 'x';
  private flashTime: number = 0;
  private flashDuration: number = 0.2;
  private rotation: number = 0;
  private isRotating: boolean = false;
  private rotationSpeed: number = 0;
  private rotationTime: number = 0;
  private triggeredTraps: Set<string> = new Set();

  constructor(maze: Maze) {
    this.maze = maze;
    this.x = 0;
    this.y = 0;
    this.health = MAX_HEALTH;
  }

  public reset(): void {
    this.x = 0;
    this.y = 0;
    this.health = MAX_HEALTH;
    this.moveCooldown = 0;
    this.shakeTime = 0;
    this.flashTime = 0;
    this.rotation = 0;
    this.isRotating = false;
    this.triggeredTraps.clear();
  }

  public handleInput(keys: Set<string>): void {
    if (this.moveCooldown > 0 || this.isRotating) return;
    if (this.health <= 0) return;

    let direction: 'up' | 'down' | 'left' | 'right' | null = null;

    if (keys.has('ArrowUp') || keys.has('KeyW')) direction = 'up';
    else if (keys.has('ArrowDown') || keys.has('KeyS')) direction = 'down';
    else if (keys.has('ArrowLeft') || keys.has('KeyA')) direction = 'left';
    else if (keys.has('ArrowRight') || keys.has('KeyD')) direction = 'right';

    if (direction) {
      this.tryMove(direction);
      this.moveCooldown = MOVE_COOLDOWN;
    }
  }

  private tryMove(direction: 'up' | 'down' | 'left' | 'right'): void {
    if (this.maze.canMove(this.x, this.y, direction)) {
      switch (direction) {
        case 'up':
          this.y--;
          break;
        case 'down':
          this.y++;
          break;
        case 'left':
          this.x--;
          break;
        case 'right':
          this.x++;
          break;
      }

      if (this.onEvent) this.onEvent('move');
      this.checkCurrentCell();
    } else {
      this.shakeAxis = direction === 'left' || direction === 'right' ? 'x' : 'y';
      this.shakeTime = 0.15;
      this.flashTime = this.flashDuration;
    }
  }

  private checkCurrentCell(): void {
    const trapKey = `${this.x},${this.y}`;

    if (this.maze.isTrap(this.x, this.y) && !this.triggeredTraps.has(trapKey)) {
      this.triggeredTraps.add(trapKey);
      this.health--;
      if (this.onEvent) this.onEvent('trap');

      if (this.health <= 0) {
        if (this.onEvent) this.onEvent('death');
      }
    }

    if (this.maze.isExit(this.x, this.y)) {
      this.startRotation();
      if (this.onEvent) this.onEvent('exit');
    }
  }

  private startRotation(): void {
    this.isRotating = true;
    this.rotationTime = 0;
    this.rotationSpeed = (Math.PI * 2) / 0.6;
  }

  public update(deltaTime: number): void {
    if (this.moveCooldown > 0) {
      this.moveCooldown -= deltaTime;
    }
    if (this.shakeTime > 0) {
      this.shakeTime -= deltaTime;
    }
    if (this.flashTime > 0) {
      this.flashTime -= deltaTime;
    }
    if (this.isRotating) {
      this.rotationTime += deltaTime;
      this.rotation += this.rotationSpeed * deltaTime;
      if (this.rotationTime >= 1.8) {
        this.isRotating = false;
        this.rotation = 0;
      }
    }
  }

  public getShakeOffset(): { x: number; y: number } {
    if (this.shakeTime <= 0) return { x: 0, y: 0 };

    const progress = this.shakeTime / 0.15;
    const offset = Math.sin(this.shakeTime * 60) * this.shakeIntensity * progress;

    if (this.shakeAxis === 'x') {
      return { x: offset, y: 0 };
    } else {
      return { x: 0, y: offset };
    }
  }

  public isFlashing(): boolean {
    return this.flashTime > 0;
  }

  public getRotation(): number {
    return this.rotation;
  }

  public render(ctx: CanvasRenderingContext2D, offsetX: number, offsetY: number): void {
    const cellCenterX = offsetX + this.x * CELL_SIZE + CELL_SIZE / 2;
    const cellCenterY = offsetY + this.y * CELL_SIZE + CELL_SIZE / 2;

    const shakeOffset = this.getShakeOffset();
    const drawX = cellCenterX + shakeOffset.x;
    const drawY = cellCenterY + shakeOffset.y;

    ctx.save();
    ctx.translate(drawX, drawY);

    if (this.isRotating) {
      ctx.rotate(this.rotation);
    }

    if (this.isFlashing()) {
      const flashProgress = this.flashTime / this.flashDuration;
      const r = Math.floor(246 * (1 - flashProgress) + 229 * flashProgress);
      const g = Math.floor(224 * (1 - flashProgress) + 62 * flashProgress);
      const b = Math.floor(94 * (1 - flashProgress) + 62 * flashProgress);
      ctx.fillStyle = `rgb(${r}, ${g}, ${b})`;
    } else {
      ctx.fillStyle = PLAYER_COLOR;
    }

    ctx.shadowColor = PLAYER_COLOR;
    ctx.shadowBlur = 6;

    const halfSize = PLAYER_SIZE / 2;
    ctx.fillRect(-halfSize, -halfSize, PLAYER_SIZE, PLAYER_SIZE);

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1A202C';
    const eyeSize = 3;
    const eyeY = -3;
    ctx.fillRect(-4, eyeY, eyeSize, eyeSize);
    ctx.fillRect(1, eyeY, eyeSize, eyeSize);

    ctx.fillRect(-3, 3, 6, 2);

    ctx.restore();
  }
}
