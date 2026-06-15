import { BlockType } from './block';
import { LevelManager, CELL_SIZE } from './level';

export type PlayerStatus = 'idle' | 'running' | 'success' | 'failed';

export interface PlayerState {
  gridX: number;
  gridY: number;
  pixelX: number;
  pixelY: number;
  direction: number;
  status: PlayerStatus;
  glowing: boolean;
  flashing: boolean;
  flashOn: boolean;
  trail: { x: number; y: number }[];
  currentBlockIndex: number;
}

export class Player {
  private state: PlayerState;
  private levelManager: LevelManager;
  private instructionQueue: BlockType[] = [];
  private instructionIndex: number = 0;
  private lastStepTime: number = 0;
  private flashStartTime: number = 0;
  private flashCount: number = 0;
  private gridOffsetX: number = 0;
  private gridOffsetY: number = 0;

  constructor(levelManager: LevelManager) {
    this.levelManager = levelManager;
    this.state = {
      gridX: 0,
      gridY: 0,
      pixelX: 0,
      pixelY: 0,
      direction: 0,
      status: 'idle',
      glowing: false,
      flashing: false,
      flashOn: false,
      trail: [],
      currentBlockIndex: -1
    };
    this.resetToStart();
  }

  setGridOffset(ox: number, oy: number): void {
    this.gridOffsetX = ox;
    this.gridOffsetY = oy;
    this.updatePixelPosition();
  }

  resetToStart(): void {
    const level = this.levelManager.getCurrentLevel();
    this.state.gridX = level.startX;
    this.state.gridY = level.startY;
    this.state.direction = level.startDir;
    this.state.status = 'idle';
    this.state.glowing = false;
    this.state.flashing = false;
    this.state.flashOn = false;
    this.state.trail = [];
    this.state.currentBlockIndex = -1;
    this.instructionQueue = [];
    this.instructionIndex = 0;
    this.updatePixelPosition();
    this.state.trail.push({ x: this.state.pixelX, y: this.state.pixelY });
  }

  private updatePixelPosition(): void {
    this.state.pixelX = this.gridOffsetX + this.state.gridX * CELL_SIZE + CELL_SIZE / 2;
    this.state.pixelY = this.gridOffsetY + this.state.gridY * CELL_SIZE + CELL_SIZE / 2;
  }

  getState(): PlayerState {
    return { ...this.state, trail: [...this.state.trail] };
  }

  run(instructions: BlockType[]): void {
    if (instructions.length === 0) return;
    this.resetToStart();
    this.instructionQueue = instructions;
    this.instructionIndex = 0;
    this.state.status = 'running';
    this.state.glowing = true;
    this.lastStepTime = performance.now();
  }

  update(now: number): void {
    if (this.state.status === 'running') {
      if (now - this.lastStepTime >= 500) {
        if (this.instructionIndex < this.instructionQueue.length) {
          this.executeInstruction(this.instructionQueue[this.instructionIndex]);
          this.state.currentBlockIndex = this.instructionIndex;
          this.instructionIndex++;
          this.lastStepTime = now;
        } else {
          this.state.glowing = false;
          if (this.levelManager.isEnd(this.state.gridX, this.state.gridY)) {
            this.state.status = 'success';
          } else {
            this.startFlash(now);
          }
        }
      }
    }

    if (this.state.flashing) {
      const elapsed = now - this.flashStartTime;
      const phase = Math.floor(elapsed / 200);
      if (phase >= 6) {
        this.state.flashing = false;
        this.state.flashOn = false;
      } else {
        this.state.flashOn = phase % 2 === 0;
      }
    }
  }

  private startFlash(now: number): void {
    this.state.status = 'failed';
    this.state.flashing = true;
    this.state.flashOn = true;
    this.flashStartTime = now;
    this.flashCount = 0;
  }

  private executeInstruction(instr: BlockType): void {
    switch (instr) {
      case 'forward':
        this.moveForward();
        break;
      case 'left':
        this.turnLeft();
        break;
      case 'right':
        this.turnRight();
        break;
    }
  }

  private moveForward(): void {
    const dx = [1, 0, -1, 0][this.state.direction];
    const dy = [0, 1, 0, -1][this.state.direction];
    const newX = this.state.gridX + dx;
    const newY = this.state.gridY + dy;

    if (this.levelManager.isObstacle(newX, newY)) {
      this.startFlash(performance.now());
      this.state.glowing = false;
      return;
    }

    this.state.gridX = newX;
    this.state.gridY = newY;
    this.updatePixelPosition();
    this.state.trail.push({ x: this.state.pixelX, y: this.state.pixelY });

    if (this.levelManager.isEnd(this.state.gridX, this.state.gridY)) {
      this.state.status = 'success';
      this.state.glowing = false;
    }
  }

  private turnLeft(): void {
    this.state.direction = (this.state.direction + 3) % 4;
  }

  private turnRight(): void {
    this.state.direction = (this.state.direction + 1) % 4;
  }

  isRunning(): boolean {
    return this.state.status === 'running';
  }

  isSuccess(): boolean {
    return this.state.status === 'success';
  }

  isFailed(): boolean {
    return this.state.status === 'failed';
  }

  isFinished(): boolean {
    return this.state.status === 'success' || this.state.status === 'failed';
  }
}
