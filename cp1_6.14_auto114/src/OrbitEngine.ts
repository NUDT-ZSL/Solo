import * as THREE from 'three';
import { eventBus } from './EventBus';
import type { PlanetData, PlanetPosition, TimeUpdatePayload } from './types';

const SECONDS_PER_DAY = 86400;
const SECONDS_PER_HOUR = 3600;
const SECONDS_PER_MINUTE = 60;

export class OrbitEngine {
  private planets: PlanetData[];
  private timeScale: number = 1;
  private paused: boolean = false;
  private elapsedTime: number = 0;
  private lastTime: number = 0;
  private animationFrameId: number | null = null;
  private lastTimeUpdate: number = 0;
  private timeUpdateInterval: number = 1;

  constructor(planets: PlanetData[]) {
    this.planets = planets;
  }

  setTimeScale(scale: number): void {
    this.timeScale = Math.max(0.1, Math.min(100, scale));
  }

  getTimeScale(): number {
    return this.timeScale;
  }

  togglePause(): boolean {
    this.paused = !this.paused;
    if (!this.paused) {
      this.lastTime = performance.now();
    }
    return this.paused;
  }

  isPaused(): boolean {
    return this.paused;
  }

  getElapsedTime(): number {
    return this.elapsedTime;
  }

  start(): void {
    this.lastTime = performance.now();
    this.animate();
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private animate = (): void => {
    this.animationFrameId = requestAnimationFrame(this.animate);

    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;

    if (!this.paused) {
      this.elapsedTime += deltaTime * this.timeScale;
      this.emitPositions();

      if (this.elapsedTime - this.lastTimeUpdate >= this.timeUpdateInterval) {
        this.lastTimeUpdate = this.elapsedTime;
        this.emitTimeUpdate();
      }
    }
  };

  private emitPositions(): void {
    const positions: PlanetPosition[] = this.planets.map((planet) => ({
      name: planet.name,
      position: this.calculatePosition(planet)
    }));
    eventBus.emit('update', positions);
  }

  private emitTimeUpdate(): void {
    const payload: TimeUpdatePayload = {
      elapsed: this.elapsedTime,
      formatted: this.formatTime(this.elapsedTime)
    };
    eventBus.emit('timeUpdate', payload);
  }

  private formatTime(seconds: number): string {
    const days = Math.floor(seconds / SECONDS_PER_DAY);
    const hours = Math.floor((seconds % SECONDS_PER_DAY) / SECONDS_PER_HOUR);
    const minutes = Math.floor((seconds % SECONDS_PER_HOUR) / SECONDS_PER_MINUTE);
    return `模拟运行：${days}天 ${hours}小时 ${minutes}分`;
  }

  calculatePosition(planet: PlanetData): THREE.Vector3 {
    const { semiMajorAxis, eccentricity, orbitalPeriod, initialPhase } = planet.orbitParams;
    const t = this.elapsedTime;

    const meanAnomaly = (2 * Math.PI * t) / orbitalPeriod + initialPhase;
    const eccentricAnomaly = this.solveKeplerEquation(meanAnomaly, eccentricity);

    const trueAnomaly = 2 * Math.atan2(
      Math.sqrt(1 + eccentricity) * Math.sin(eccentricAnomaly / 2),
      Math.sqrt(1 - eccentricity) * Math.cos(eccentricAnomaly / 2)
    );

    const distance = semiMajorAxis * (1 - eccentricity * Math.cos(eccentricAnomaly));

    const x = distance * Math.cos(trueAnomaly);
    const z = distance * Math.sin(trueAnomaly);

    return new THREE.Vector3(x, 0, z);
  }

  private solveKeplerEquation(meanAnomaly: number, eccentricity: number): number {
    let eccentricAnomaly = meanAnomaly;
    const epsilon = 1e-6;
    const maxIterations = 100;

    for (let i = 0; i < maxIterations; i++) {
      const f = eccentricAnomaly - eccentricity * Math.sin(eccentricAnomaly) - meanAnomaly;
      const fPrime = 1 - eccentricity * Math.cos(eccentricAnomaly);
      const delta = f / fPrime;
      eccentricAnomaly -= delta;

      if (Math.abs(delta) < epsilon) {
        break;
      }
    }

    return eccentricAnomaly;
  }
}
