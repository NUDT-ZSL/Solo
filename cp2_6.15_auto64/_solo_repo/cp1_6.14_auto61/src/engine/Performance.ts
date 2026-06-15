export interface Poolable {
  id: string;
  active: boolean;
  reset: () => void;
}

export class ObjectPool<T extends Poolable> {
  private pool: T[] = [];
  private factory: () => T;
  private maxSize: number;

  constructor(factory: () => T, initialSize: number = 10, maxSize: number = 100) {
    this.factory = factory;
    this.maxSize = maxSize;

    for (let i = 0; i < initialSize; i++) {
      this.pool.push(this.factory());
    }
  }

  acquire(): T {
    const obj = this.pool.find((o) => !o.active) || this.createNew();
    obj.active = true;
    return obj;
  }

  release(obj: T): void {
    obj.active = false;
    obj.reset();
  }

  releaseAll(): void {
    this.pool.forEach((obj) => {
      obj.active = false;
      obj.reset();
    });
  }

  getActiveCount(): number {
    return this.pool.filter((o) => o.active).length;
  }

  getTotalCount(): number {
    return this.pool.length;
  }

  private createNew(): T {
    if (this.pool.length >= this.maxSize) {
      const oldestInactive = this.pool.find((o) => !o.active);
      if (oldestInactive) {
        return oldestInactive;
      }
    }
    const obj = this.factory();
    if (this.pool.length < this.maxSize) {
      this.pool.push(obj);
    }
    return obj;
  }
}

export class FPSMonitor {
  private lastFrameTime: number = 0;
  private currentFPS: number = 60;
  private minFPS: number = 60;
  private maxFPS: number = 60;
  private frameCount: number = 0;
  private fpsUpdateInterval: number = 500;
  private lastFPSUpdate: number = 0;
  private frameTimeAccumulator: number = 0;

  update(currentTime: number): void {
    if (this.lastFrameTime === 0) {
      this.lastFrameTime = currentTime;
      this.lastFPSUpdate = currentTime;
      return;
    }

    const deltaTime = currentTime - this.lastFrameTime;
    this.lastFrameTime = currentTime;
    this.frameCount++;
    this.frameTimeAccumulator += deltaTime;

    if (currentTime - this.lastFPSUpdate >= this.fpsUpdateInterval) {
      this.currentFPS = Math.round(1000 / (this.frameTimeAccumulator / this.frameCount));
      this.minFPS = Math.min(this.minFPS, this.currentFPS);
      this.maxFPS = Math.max(this.maxFPS, this.currentFPS);

      this.frameCount = 0;
      this.frameTimeAccumulator = 0;
      this.lastFPSUpdate = currentTime;
    }
  }

  getFPS(): number {
    return this.currentFPS;
  }

  getMinFPS(): number {
    return this.minFPS;
  }

  getMaxFPS(): number {
    return this.maxFPS;
  }

  reset(): void {
    this.lastFrameTime = 0;
    this.currentFPS = 60;
    this.minFPS = 60;
    this.maxFPS = 60;
    this.frameCount = 0;
    this.lastFPSUpdate = 0;
    this.frameTimeAccumulator = 0;
  }

  shouldReduceQuality(): boolean {
    return this.currentFPS < 35;
  }
}
