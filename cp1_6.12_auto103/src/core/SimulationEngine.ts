import { WaveSolver, WaveSolverParams } from './WaveSolver';

export interface EnergyRipple {
  id: number;
  x: number;
  y: number;
  startTime: number;
  duration: number;
  particles: EnergyParticle[];
}

export interface EnergyParticle {
  x: number;
  y: number;
  z: number;
  vx: number;
  vy: number;
  vz: number;
  size: number;
  alpha: number;
}

export type FrameDataCallback = (
  heightMap: Float32Array,
  resolution: number,
  ripples: EnergyRippleData[]
) => void;

export interface EnergyRippleData {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  particles: EnergyParticle[];
}

export interface SimulationParams {
  resolution: number;
  waveSpeed: number;
  damping: number;
}

export class SimulationEngine {
  private solver: WaveSolver;
  private params: SimulationParams;
  private callback: FrameDataCallback | null = null;

  private ripples: EnergyRipple[] = [];
  private rippleIdCounter = 0;

  private animationFrameId: number | null = null;
  private isRunning = false;

  private lastFrameTime = 0;
  private frameCount = 0;
  private fps = 60;

  constructor(params: SimulationParams) {
    this.params = { ...params };
    this.solver = new WaveSolver({
      resolution: params.resolution,
      waveSpeed: params.waveSpeed,
      damping: params.damping
    });
  }

  public setFrameCallback(callback: FrameDataCallback): void {
    this.callback = callback;
  }

  public setParams(params: Partial<SimulationParams>): void {
    if (params.resolution !== undefined && params.resolution !== this.params.resolution) {
      this.params.resolution = params.resolution;
      this.solver.setResolution(params.resolution);
    }
    if (params.waveSpeed !== undefined) {
      this.params.waveSpeed = params.waveSpeed;
      this.solver.setWaveSpeed(params.waveSpeed);
    }
    if (params.damping !== undefined) {
      this.params.damping = params.damping;
      this.solver.setDamping(params.damping);
    }
  }

  public getParams(): SimulationParams {
    return { ...this.params };
  }

  public getFps(): number {
    return this.fps;
  }

  public addWaveSource(x: number, y: number): void {
    this.solver.addDrop(x, y, 2.0, 1.5);
  }

  public addEnergyRipple(x?: number, y?: number): void {
    const px = x ?? (Math.random() - 0.5) * 8;
    const py = y ?? (Math.random() - 0.5) * 8;

    const particles: EnergyParticle[] = [];
    for (let i = 0; i < 12; i++) {
      const angle = (i / 12) * Math.PI * 2 + Math.random() * 0.3;
      const speed = 1.5 + Math.random() * 2;
      particles.push({
        x: px,
        y: py,
        z: 0.5,
        vx: Math.cos(angle) * speed * 0.02,
        vy: Math.sin(angle) * speed * 0.02,
        vz: 0.03 + Math.random() * 0.02,
        size: 2 + Math.random() * 2,
        alpha: 1.0
      });
    }

    const ripple: EnergyRipple = {
      id: this.rippleIdCounter++,
      x: px,
      y: py,
      startTime: performance.now(),
      duration: 2000,
      particles
    };

    this.ripples.push(ripple);
  }

  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;
    this.lastFrameTime = performance.now();
    this.frameCount = 0;
    this.loop();
  }

  public stop(): void {
    this.isRunning = false;
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public reset(): void {
    this.solver.reset();
    this.ripples = [];
  }

  public dispose(): void {
    this.stop();
    this.callback = null;
  }

  private loop = (): void => {
    if (!this.isRunning) return;

    const now = performance.now();
    this.frameCount++;
    if (now - this.lastFrameTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.lastFrameTime = now;
    }

    const heightMap = this.solver.step();
    const rippleData = this.updateRipples(now);
    this.applyRipplesToSolver(rippleData);

    if (this.callback) {
      this.callback(heightMap, this.params.resolution, rippleData);
    }

    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private updateRipples(now: number): EnergyRippleData[] {
    const activeRipples: EnergyRippleData[] = [];

    this.ripples = this.ripples.filter(ripple => {
      const elapsed = now - ripple.startTime;
      if (elapsed >= ripple.duration) return false;

      const t = elapsed / ripple.duration;
      const radius = 0.5 + t * 3.5;
      const alpha = 0.8 * (1 - t);

      for (const p of ripple.particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.z += p.vz;
        p.vz -= 0.001;
        p.alpha = Math.max(0, 1 - t);
      }

      activeRipples.push({
        x: ripple.x,
        y: ripple.y,
        radius,
        alpha,
        particles: ripple.particles
      });

      return true;
    });

    return activeRipples;
  }

  private applyRipplesToSolver(rippleData: EnergyRippleData[]): void {
    for (const ripple of rippleData) {
      this.solver.addEnergyRipple(ripple.x, ripple.y, ripple.radius, 0.6, ripple.alpha);
    }
  }
}
