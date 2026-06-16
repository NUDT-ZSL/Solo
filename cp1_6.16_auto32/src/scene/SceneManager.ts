import * as THREE from 'three';
import type { Coral, Fish, Plant, Position } from '../ecosystem/types';

export interface BreathingParams {
  phase: number;
  period: number;
  amplitude: number;
  baseScale: number;
}

export class SceneManager {
  private coralBreathingData: Map<string, BreathingParams>;
  private readonly MAX_PARTICLES = 5000;
  private particleCount: number = 1000;
  private performanceMode: 'high' | 'medium' | 'low' = 'high';
  private fpsHistory: number[] = [];
  private lastFrameTime: number = 0;

  constructor() {
    this.coralBreathingData = new Map();
  }

  public generateCoralBreathingParams(baseScale: number): BreathingParams {
    return {
      phase: Math.random() * Math.PI * 2,
      period: 3 + Math.random() * 2,
      amplitude: 0.05,
      baseScale,
    };
  }

  public getCoralBreathingScale(coralId: string, time: number): number {
    const params = this.coralBreathingData.get(coralId);
    if (!params) return 1;
    return (
      params.baseScale +
      Math.sin(time * (Math.PI * 2 / params.period) + params.phase) *
        params.amplitude *
        params.baseScale
    );
  }

  public setCoralBreathingParams(coralId: string, params: BreathingParams): void {
    this.coralBreathingData.set(coralId, params);
  }

  public getMaxParticles(): number {
    return this.MAX_PARTICLES;
  }

  public getParticleCount(): number {
    return this.particleCount;
  }

  public setParticleCount(count: number): void {
    this.particleCount = Math.min(count, this.MAX_PARTICLES);
  }

  public getPerformanceMode(): string {
    return this.performanceMode;
  }

  public updatePerformance(fps: number): void {
    this.fpsHistory.push(fps);
    if (this.fpsHistory.length > 60) {
      this.fpsHistory.shift();
    }

    const avgFps =
      this.fpsHistory.reduce((a, b) => a + b, 0) / this.fpsHistory.length;

    if (avgFps < 25 && this.performanceMode !== 'low') {
      this.performanceMode = 'low';
      this.particleCount = Math.floor(this.MAX_PARTICLES * 0.3);
    } else if (avgFps < 35 && this.performanceMode === 'high') {
      this.performanceMode = 'medium';
      this.particleCount = Math.floor(this.MAX_PARTICLES * 0.6);
    } else if (avgFps > 55 && this.performanceMode !== 'high') {
      this.performanceMode = 'high';
      this.particleCount = this.MAX_PARTICLES;
    }
  }

  public getMemoryUsage(): number {
    if (typeof performance !== 'undefined' && (performance as any).memory) {
      return (performance as any).memory.usedJSHeapSize / (1024 * 1024);
    }
    return 0;
  }

  public isMemoryUnderLimit(): boolean {
    const usage = this.getMemoryUsage();
    return usage < 150;
  }

  public createSandTexture(): THREE.Texture {
    const canvas = document.createElement('canvas');
    canvas.width = 256;
    canvas.height = 256;
    const ctx = canvas.getContext('2d')!;

    const gradient = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
    gradient.addColorStop(0, '#E8C89E');
    gradient.addColorStop(0.5, '#D5A76A');
    gradient.addColorStop(1, '#C4956A');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, 256, 256);

    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * 256;
      const y = Math.random() * 256;
      const brightness = 180 + Math.random() * 50;
      ctx.fillStyle = `rgba(${brightness}, ${brightness * 0.8}, ${brightness * 0.6}, ${
        Math.random() * 0.3
      })`;
      ctx.fillRect(x, y, 1 + Math.random() * 2, 1 + Math.random() * 2);
    }

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(4, 4);
    return texture;
  }

  public static interpolateEaseOut(
    start: number,
    end: number,
    t: number,
    duration: number
  ): number {
    const progress = Math.min(t / duration, 1);
    const eased = 1 - Math.pow(1 - progress, 3);
    return start + (end - start) * eased;
  }

  public dispose(): void {
    this.coralBreathingData.clear();
    this.fpsHistory = [];
  }
}

export default SceneManager;
