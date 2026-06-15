import { eventBus } from './EventBus';

export interface EnvironmentState {
  lightAngle: number;
  windSpeed: number;
  particleDensity: number;
}

const MAX_PARTICLES = 1000;
const BASE_PARTICLES = 200;

class EnvironmentController {
  private state: EnvironmentState = {
    lightAngle: 45,
    windSpeed: 2.5,
    particleDensity: 1,
  };

  private animationFrameId: number | null = null;
  private lastTime: number = 0;
  private updateCount: number = 0;
  private debugLogInterval: number = 300;

  constructor() {
    console.log('[EnvironmentController] 初始化完成，初始状态:', this.state);
  }

  start(): void {
    if (this.animationFrameId !== null) return;
    this.lastTime = performance.now();
    this.updateCount = 0;
    this.tick();
    console.log('[EnvironmentController] 启动更新循环 (60fps目标)');
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
      console.log('[EnvironmentController] 停止更新循环');
    }
  }

  private tick = (): void => {
    const now = performance.now();
    const delta = now - this.lastTime;
    
    if (delta >= 1000 / 60) {
      this.lastTime = now;
      this.updateCount++;
      
      if (this.updateCount % this.debugLogInterval === 0) {
        console.log('[EnvironmentController] 定期状态检查 - 更新次数:', this.updateCount, '状态:', { ...this.state });
      }
    }
    
    this.animationFrameId = requestAnimationFrame(this.tick);
  };

  getMaxParticles(): number {
    return Math.min(MAX_PARTICLES, Math.floor(BASE_PARTICLES * this.state.particleDensity));
  }

  getState(): EnvironmentState {
    return { ...this.state };
  }

  setLightAngle(angle: number): void {
    const oldAngle = this.state.lightAngle;
    this.state.lightAngle = Math.max(0, Math.min(360, angle));
    
    if (oldAngle !== this.state.lightAngle) {
      const hueShift = (this.state.lightAngle / 360) * 180;
      console.log(
        `[EnvironmentController] 光照角度变化: ${oldAngle.toFixed(1)}° → ${this.state.lightAngle.toFixed(1)}°, ` +
        `HSV色相偏移量: ${hueShift.toFixed(1)}° (饱和度: 0.7, 亮度: 0.9)`
      );
      eventBus.emit('environment:update', { ...this.state });
    }
  }

  setWindSpeed(speed: number): void {
    const oldSpeed = this.state.windSpeed;
    this.state.windSpeed = Math.max(0, Math.min(10, speed));
    
    if (oldSpeed !== this.state.windSpeed) {
      const amplitude = this.state.windSpeed * 0.1;
      console.log(
        `[EnvironmentController] 风速变化: ${oldSpeed.toFixed(1)} → ${this.state.windSpeed.toFixed(1)}, ` +
        `粒子偏移振幅: ${amplitude.toFixed(2)} (频率: 2Hz)`
      );
      eventBus.emit('environment:update', { ...this.state });
    }
  }

  setParticleDensity(density: number): void {
    const oldDensity = this.state.particleDensity;
    this.state.particleDensity = Math.max(1, Math.min(5, Math.floor(density)));
    
    if (oldDensity !== this.state.particleDensity) {
      const maxParticles = this.getMaxParticles();
      console.log(
        `[EnvironmentController] 粒子密度变化: ${oldDensity} → ${this.state.particleDensity}, ` +
        `最大粒子数: ${maxParticles} (上限: ${MAX_PARTICLES})`
      );
      eventBus.emit('environment:update', { ...this.state });
      eventBus.emit('particles:densityChange', {
        oldDensity,
        newDensity: this.state.particleDensity,
        targetCount: maxParticles,
      });
    }
  }

  triggerBloom(): void {
    console.log('[EnvironmentController] 触发绽放动画');
    eventBus.emit('bloom:start');
  }

  destroy(): void {
    this.stop();
    console.log('[EnvironmentController] 销毁完成');
  }
}

export const environmentController = new EnvironmentController();
export default EnvironmentController;
