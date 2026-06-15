export enum ClimateMode {
  SUMMER = 'summer',
  WINTER = 'winter',
  THUNDERSTORM = 'thunderstorm'
}

export interface SensorData {
  position: { x: number; y: number; z: number };
  velocity: { x: number; y: number; z: number };
  temperature: number;
  humidity: number;
}

export interface ModeConfig {
  name: string;
  label: string;
  tempRange: [number, number];
  humidityRange: [number, number];
  velocityScale: number;
  distribution: 'sphere' | 'disk' | 'column';
  biasY: number;
}

export const MODE_CONFIGS: Record<ClimateMode, ModeConfig> = {
  [ClimateMode.SUMMER]: {
    name: 'summer',
    label: '夏季高温',
    tempRange: [30, 45],
    humidityRange: [40, 80],
    velocityScale: 0.8,
    distribution: 'sphere',
    biasY: 15
  },
  [ClimateMode.WINTER]: {
    name: 'winter',
    label: '冬季寒流',
    tempRange: [-10, 10],
    humidityRange: [20, 50],
    velocityScale: 1.0,
    distribution: 'disk',
    biasY: -15
  },
  [ClimateMode.THUNDERSTORM]: {
    name: 'thunderstorm',
    label: '雷暴',
    tempRange: [15, 30],
    humidityRange: [70, 100],
    velocityScale: 2.0,
    distribution: 'column',
    biasY: 0
  }
};

export class SensorDataSimulator {
  private mode: ClimateMode = ClimateMode.SUMMER;
  private intervalId: number | null = null;
  private callbacks: ((data: SensorData[]) => void)[] = [];
  private readonly BATCH_SIZE = 50;
  private readonly INTERVAL = 200;
  private readonly SPACE_RANGE = 50;

  constructor() {}

  public subscribe(callback: (data: SensorData[]) => void): void {
    this.callbacks.push(callback);
  }

  public unsubscribe(callback: (data: SensorData[]) => void): void {
    this.callbacks = this.callbacks.filter(cb => cb !== callback);
  }

  public setMode(mode: ClimateMode): void {
    this.mode = mode;
  }

  public getMode(): ClimateMode {
    return this.mode;
  }

  public start(): void {
    if (this.intervalId !== null) return;
    this.intervalId = window.setInterval(() => {
      const data = this.generateBatch();
      this.callbacks.forEach(cb => cb(data));
    }, this.INTERVAL);
  }

  public stop(): void {
    if (this.intervalId !== null) {
      window.clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private generateBatch(): SensorData[] {
    const batch: SensorData[] = [];
    for (let i = 0; i < this.BATCH_SIZE; i++) {
      batch.push(this.generateSingle());
    }
    return batch;
  }

  private generateSingle(): SensorData {
    const config = MODE_CONFIGS[this.mode];
    const position = this.generatePosition(config);
    const velocity = this.generateVelocity(config);
    const temperature = this.randomRange(config.tempRange[0], config.tempRange[1]);
    const humidity = this.randomRange(config.humidityRange[0], config.humidityRange[1]);

    return {
      position,
      velocity,
      temperature,
      humidity
    };
  }

  private generatePosition(config: ModeConfig): { x: number; y: number; z: number } {
    const range = this.SPACE_RANGE;
    
    switch (config.distribution) {
      case 'sphere': {
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        const r = range * Math.cbrt(Math.random());
        return {
          x: r * Math.sin(phi) * Math.cos(theta),
          y: r * Math.sin(phi) * Math.sin(theta) + config.biasY,
          z: r * Math.cos(phi)
        };
      }
      case 'disk': {
        const theta = Math.random() * Math.PI * 2;
        const r = range * Math.sqrt(Math.random());
        return {
          x: r * Math.cos(theta),
          y: (Math.random() - 0.5) * 20 + config.biasY,
          z: r * Math.sin(theta)
        };
      }
      case 'column': {
        const theta = Math.random() * Math.PI * 2;
        const r = range * 0.6 * Math.sqrt(Math.random());
        return {
          x: r * Math.cos(theta),
          y: (Math.random() - 0.5) * range * 1.5 + config.biasY,
          z: r * Math.sin(theta)
        };
      }
    }
  }

  private generateVelocity(config: ModeConfig): { x: number; y: number; z: number } {
    const scale = config.velocityScale;
    
    switch (config.distribution) {
      case 'sphere':
        return {
          x: (Math.random() - 0.5) * 2 * scale,
          y: (Math.random() - 0.5) * 2 * scale,
          z: (Math.random() - 0.5) * 2 * scale
        };
      case 'disk':
        return {
          x: (Math.random() - 0.5) * 3 * scale,
          y: (Math.random() - 0.5) * 0.5 * scale,
          z: (Math.random() - 0.5) * 3 * scale
        };
      case 'column':
        return {
          x: (Math.random() - 0.5) * 1 * scale,
          y: (Math.random() > 0.5 ? 1 : -1) * (3 + Math.random() * 3) * scale,
          z: (Math.random() - 0.5) * 1 * scale
        };
    }
  }

  private randomRange(min: number, max: number): number {
    return min + Math.random() * (max - min);
  }
}
