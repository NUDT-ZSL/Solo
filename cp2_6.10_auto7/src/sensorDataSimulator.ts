export interface SensorData {
  id: number;
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  temperature: number;
  humidity: number;
  timestamp: number;
}

export type ClimateMode = 'summer' | 'winter' | 'storm';

export interface ClimateParams {
  tempMin: number;
  tempMax: number;
  humidityMin: number;
  humidityMax: number;
  speedMultiplier: number;
  spreadX: number;
  spreadY: number;
  spreadZ: number;
  baseVX: number;
  baseVY: number;
  baseVZ: number;
  turbulence: number;
}

export const CLIMATE_PROFILES: Record<ClimateMode, ClimateParams> = {
  summer: {
    tempMin: 28,
    tempMax: 45,
    humidityMin: 40,
    humidityMax: 85,
    speedMultiplier: 0.6,
    spreadX: 50,
    spreadY: 30,
    spreadZ: 50,
    baseVX: 0.3,
    baseVY: 0.15,
    baseVZ: 0.2,
    turbulence: 0.3
  },
  winter: {
    tempMin: -10,
    tempMax: 8,
    humidityMin: 20,
    humidityMax: 60,
    speedMultiplier: 0.4,
    spreadX: 45,
    spreadY: 40,
    spreadZ: 45,
    baseVX: -0.2,
    baseVY: -0.25,
    baseVZ: -0.1,
    turbulence: 0.5
  },
  storm: {
    tempMin: 10,
    tempMax: 28,
    humidityMin: 70,
    humidityMax: 100,
    speedMultiplier: 1.8,
    spreadX: 60,
    spreadY: 50,
    spreadZ: 60,
    baseVX: 1.2,
    baseVY: -0.8,
    baseVZ: 0.6,
    turbulence: 1.5
  }
};

export class SensorDataSimulator {
  private currentMode: ClimateMode = 'summer';
  private targetMode: ClimateMode = 'summer';
  private transitionProgress: number = 1;
  private transitionDuration: number = 1000;
  private transitionStart: number = 0;
  private dataIdCounter: number = 0;
  private batchSize: number;
  private listeners: Array<(data: SensorData[]) => void> = [];
  private intervalId: number | null = null;

  constructor(batchSize: number = 80) {
    this.batchSize = batchSize;
  }

  public setMode(mode: ClimateMode): void {
    if (this.targetMode === mode && this.transitionProgress >= 1) return;
    this.targetMode = mode;
    this.transitionProgress = 0;
    this.transitionStart = performance.now();
  }

  public getCurrentMode(): ClimateMode {
    return this.currentMode;
  }

  public getTargetMode(): ClimateMode {
    return this.targetMode;
  }

  public getTransitionProgress(): number {
    return this.transitionProgress;
  }

  public isTransitioning(): boolean {
    return this.transitionProgress < 1;
  }

  public getInterpolatedParams(): ClimateParams {
    this.updateTransition();
    return this.interpolateParams(
      CLIMATE_PROFILES[this.currentMode],
      CLIMATE_PROFILES[this.targetMode],
      this.easeInOutCubic(this.transitionProgress)
    );
  }

  private updateTransition(): void {
    if (this.transitionProgress >= 1) {
      this.currentMode = this.targetMode;
      this.transitionProgress = 1;
      return;
    }
    const elapsed = performance.now() - this.transitionStart;
    this.transitionProgress = Math.min(1, elapsed / this.transitionDuration);
    if (this.transitionProgress >= 1) {
      this.currentMode = this.targetMode;
    }
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }

  private interpolateParams(a: ClimateParams, b: ClimateParams, t: number): ClimateParams {
    return {
      tempMin: this.lerp(a.tempMin, b.tempMin, t),
      tempMax: this.lerp(a.tempMax, b.tempMax, t),
      humidityMin: this.lerp(a.humidityMin, b.humidityMin, t),
      humidityMax: this.lerp(a.humidityMax, b.humidityMax, t),
      speedMultiplier: this.lerp(a.speedMultiplier, b.speedMultiplier, t),
      spreadX: this.lerp(a.spreadX, b.spreadX, t),
      spreadY: this.lerp(a.spreadY, b.spreadY, t),
      spreadZ: this.lerp(a.spreadZ, b.spreadZ, t),
      baseVX: this.lerp(a.baseVX, b.baseVX, t),
      baseVY: this.lerp(a.baseVY, b.baseVY, t),
      baseVZ: this.lerp(a.baseVZ, b.baseVZ, t),
      turbulence: this.lerp(a.turbulence, b.turbulence, t)
    };
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private generateSingleData(params: ClimateParams): SensorData {
    const id = ++this.dataIdCounter;
    const angle = Math.random() * Math.PI * 2;
    const radius = Math.random() * 10;
    const x = Math.cos(angle) * radius + (Math.random() - 0.5) * params.spreadX;
    const y = Math.sin(angle) * radius * 0.5 + (Math.random() - 0.5) * params.spreadY;
    const z = Math.sin(angle) * radius + (Math.random() - 0.5) * params.spreadZ;
    const turbulenceX = (Math.random() - 0.5) * params.turbulence;
    const turbulenceY = (Math.random() - 0.5) * params.turbulence;
    const turbulenceZ = (Math.random() - 0.5) * params.turbulence;
    const vx = (params.baseVX + turbulenceX) * params.speedMultiplier;
    const vy = (params.baseVY + turbulenceY) * params.speedMultiplier;
    const vz = (params.baseVZ + turbulenceZ) * params.speedMultiplier;
    const temperature = this.lerp(params.tempMin, params.tempMax, Math.pow(Math.random(), 0.7));
    const humidity = this.lerp(params.humidityMin, params.humidityMax, Math.random());
    return {
      id,
      x,
      y,
      z,
      vx,
      vy,
      vz,
      temperature,
      humidity,
      timestamp: performance.now()
    };
  }

  public generateBatch(): SensorData[] {
    const params = this.getInterpolatedParams();
    const data: SensorData[] = [];
    for (let i = 0; i < this.batchSize; i++) {
      data.push(this.generateSingleData(params));
    }
    return data;
  }

  public start(intervalMs: number = 200): void {
    if (this.intervalId !== null) return;
    this.intervalId = window.setInterval(() => {
      const batch = this.generateBatch();
      this.notifyListeners(batch);
    }, intervalMs);
  }

  public stop(): void {
    if (this.intervalId !== null) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  public onData(callback: (data: SensorData[]) => void): () => void {
    this.listeners.push(callback);
    return () => {
      const idx = this.listeners.indexOf(callback);
      if (idx !== -1) this.listeners.splice(idx, 1);
    };
  }

  private notifyListeners(data: SensorData[]): void {
    for (const listener of this.listeners) {
      try {
        listener(data);
      } catch (e) {
        console.error('Listener error:', e);
      }
    }
  }
}
