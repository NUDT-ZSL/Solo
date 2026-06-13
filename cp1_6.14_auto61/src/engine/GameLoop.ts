import { eventBus, GameEvent } from './EventBus';

export class GameLoop {
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private accumulator: number = 0;
  private fixedTimeStep: number = 1000 / 60;
  private maxFrameTime: number = 1000 / 30;

  constructor() {
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on(GameEvent.GAME_START, () => this.start());
    eventBus.on(GameEvent.GAME_OVER, () => this.stop());
    eventBus.on(GameEvent.GAME_RESTART, () => this.restart());
  }

  start(): void {
    if (this.isRunning) return;

    this.isRunning = true;
    this.isPaused = false;
    this.lastTime = performance.now();
    this.accumulator = 0;
    this.loop(this.lastTime);
  }

  stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  pause(): void {
    this.isPaused = true;
  }

  resume(): void {
    if (!this.isRunning) return;
    this.isPaused = false;
    this.lastTime = performance.now();
  }

  restart(): void {
    this.stop();
    this.start();
  }

  private loop = (currentTime: number): void => {
    if (!this.isRunning) return;

    this.animationFrameId = requestAnimationFrame(this.loop);

    if (this.isPaused) {
      this.lastTime = currentTime;
      return;
    }

    let deltaTime = currentTime - this.lastTime;
    this.lastTime = currentTime;

    if (deltaTime > this.maxFrameTime) {
      deltaTime = this.maxFrameTime;
    }

    this.accumulator += deltaTime;

    while (this.accumulator >= this.fixedTimeStep) {
      this.update(this.fixedTimeStep / 1000);
      this.accumulator -= this.fixedTimeStep;
    }

    const alpha = this.accumulator / this.fixedTimeStep;
    eventBus.emit(GameEvent.RENDER, { deltaTime: deltaTime / 1000, alpha });
  };

  private update(deltaTime: number): void {
    eventBus.emit(GameEvent.TICK, deltaTime);
  }

  getIsRunning(): boolean {
    return this.isRunning;
  }

  getIsPaused(): boolean {
    return this.isPaused;
  }
}

export const gameLoop = new GameLoop();
export default gameLoop;
