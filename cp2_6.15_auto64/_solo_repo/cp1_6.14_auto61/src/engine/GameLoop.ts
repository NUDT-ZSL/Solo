import { eventBus, GameEvent } from './EventBus';
import { FPSMonitor } from './Performance';

export class GameLoop {
  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private isRunning: boolean = false;
  private isPaused: boolean = false;
  private accumulator: number = 0;
  private fixedTimeStep: number = 1000 / 60;
  private maxFrameTime: number = 1000 / 30;
  private fpsMonitor: FPSMonitor;
  private lowQualityMode: boolean = false;

  constructor() {
    this.fpsMonitor = new FPSMonitor();
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
    this.fpsMonitor.reset();
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
    this.fpsMonitor.update(currentTime);

    const newLowQuality = this.fpsMonitor.shouldReduceQuality();
    if (newLowQuality !== this.lowQualityMode) {
      this.lowQualityMode = newLowQuality;
      eventBus.emit('quality_change', { lowQuality: this.lowQualityMode });
    }

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

    const maxSteps = this.lowQualityMode ? 2 : 3;
    let steps = 0;
    while (this.accumulator >= this.fixedTimeStep && steps < maxSteps) {
      this.update(this.fixedTimeStep / 1000);
      this.accumulator -= this.fixedTimeStep;
      steps++;
    }

    const alpha = this.accumulator / this.fixedTimeStep;
    eventBus.emit(GameEvent.RENDER, {
      deltaTime: deltaTime / 1000,
      alpha,
      lowQuality: this.lowQualityMode,
    });
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

  getFPS(): number {
    return this.fpsMonitor.getFPS();
  }

  getLowQualityMode(): boolean {
    return this.lowQualityMode;
  }
}

export const gameLoop = new GameLoop();
export default gameLoop;
