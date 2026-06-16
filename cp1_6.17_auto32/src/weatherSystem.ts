export type SystemType = 'coldFront' | 'warmFront' | 'stationaryFront' | 'extratropicalCyclone' | 'anticyclone';

export interface ParticleData {
  positions: Float32Array;
  colors: Float32Array;
  velocities: Float32Array;
  sizes: Float32Array;
  alphas: Float32Array;
}

export interface SystemParams {
  tempDiff: number;
  humidity: number;
  windSpeed: number;
}

export interface SystemInfo {
  name: string;
  nameCN: string;
  particleCount: number;
  duration: number;
}

export const SYSTEM_INFO: Record<SystemType, SystemInfo> = {
  coldFront: { name: 'Cold Front', nameCN: '冷锋', particleCount: 4000, duration: 30 },
  warmFront: { name: 'Warm Front', nameCN: '暖锋', particleCount: 4000, duration: 30 },
  stationaryFront: { name: 'Stationary Front', nameCN: '静止锋', particleCount: 3500, duration: 30 },
  extratropicalCyclone: { name: 'Extratropical Cyclone', nameCN: '温带气旋', particleCount: 5000, duration: 30 },
  anticyclone: { name: 'Anticyclone', nameCN: '反气旋', particleCount: 5000, duration: 30 }
};

export const TRAIL_COUNT = 4;

const LOW_COLOR = { r: 0x4F / 255, g: 0xC3 / 255, b: 0xF7 / 255 };
const HIGH_COLOR = { r: 1.0, g: 1.0, b: 1.0 };
const MID_BLUE = { r: 0x81 / 255, g: 0xD4 / 255, b: 0xFA / 255 };
const WIND_WHITE = { r: 1.0, g: 1.0, b: 1.0 };
const HUMID_CLOUD = { r: 0xBB / 255, g: 0xDE / 255, b: 0xFB / 255 };

function lerp3(a: { r: number; g: number; b: number }, b: { r: number; g: number; b: number }, t: number): [number, number, number] {
  const clamped = Math.max(0, Math.min(1, t));
  return [
    a.r + (b.r - a.r) * clamped,
    a.g + (b.g - a.g) * clamped,
    a.b + (b.b - a.b) * clamped
  ];
}

function normalizeHeight(y: number): number {
  return Math.max(0, Math.min(1, y / 8));
}

export class WeatherSystem {
  private systemType: SystemType;
  private params: SystemParams;
  private targetParams: SystemParams;
  private particleData: ParticleData;
  private trailData: ParticleData;
  private particleCount: number;
  private basePositions: Float32Array;
  private phaseOffsets: Float32Array;
  private positionHistory: Float32Array[];
  private historyIndex: number;
  private smoothedParams: SystemParams;

  constructor(systemType: SystemType = 'coldFront') {
    this.systemType = systemType;
    this.params = { tempDiff: 0, humidity: 60, windSpeed: 5 };
    this.targetParams = { ...this.params };
    this.smoothedParams = { ...this.params };
    this.particleCount = SYSTEM_INFO[systemType].particleCount;
    this.particleData = this.createEmptyData(this.particleCount);
    this.trailData = this.createEmptyData(this.particleCount * TRAIL_COUNT);
    this.basePositions = new Float32Array(this.particleCount * 3);
    this.phaseOffsets = new Float32Array(this.particleCount);
    this.positionHistory = [];
    for (let h = 0; h < TRAIL_COUNT; h++) {
      this.positionHistory.push(new Float32Array(this.particleCount * 3));
    }
    this.historyIndex = 0;
    this.initSystem();
  }

  private createEmptyData(count: number): ParticleData {
    return {
      positions: new Float32Array(count * 3),
      colors: new Float32Array(count * 3),
      velocities: new Float32Array(count * 3),
      sizes: new Float32Array(count),
      alphas: new Float32Array(count)
    };
  }

  private initSystem(): void {
    for (let i = 0; i < this.particleCount; i++) {
      this.phaseOffsets[i] = Math.random() * Math.PI * 2;
    }
    this.generateBasePositions();
    this.applySystemMotion(0, 0.016);
    for (let h = 0; h < TRAIL_COUNT; h++) {
      this.positionHistory[h].set(this.particleData.positions);
    }
    this.updateColorsAndSizes();
    this.updateTrailData();
  }

  private generateBasePositions(): void {
    const count = this.particleCount;
    switch (this.systemType) {
      case 'coldFront':
        this.generateColdFrontBase(count);
        break;
      case 'warmFront':
        this.generateWarmFrontBase(count);
        break;
      case 'stationaryFront':
        this.generateStationaryFrontBase(count);
        break;
      case 'extratropicalCyclone':
        this.generateCycloneBase(count);
        break;
      case 'anticyclone':
        this.generateAnticycloneBase(count);
        break;
    }
  }

  private generateColdFrontBase(count: number): void {
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const isCold = i < count * 0.45;
      const x = (Math.random() - 0.5) * 16;
      const z = (Math.random() - 0.5) * 12;
      let y: number;
      if (isCold) {
        const frontX = -1 + x * 0.1;
        y = Math.random() * Math.max(0.1, 2 - (x - frontX) * 0.5);
      } else {
        const frontX = 1 + x * 0.1;
        y = 1 + Math.random() * 6 + Math.max(0, (x - frontX) * 0.8);
      }
      this.basePositions[idx] = x;
      this.basePositions[idx + 1] = Math.max(0.05, y);
      this.basePositions[idx + 2] = z;
    }
  }

  private generateWarmFrontBase(count: number): void {
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const isWarm = i < count * 0.55;
      const x = (Math.random() - 0.5) * 16;
      const z = (Math.random() - 0.5) * 12;
      let y: number;
      if (isWarm) {
        const frontX = -2 + x * 0.15;
        y = 0.5 + Math.random() * 5 + Math.max(0, (x - frontX) * 0.4);
      } else {
        y = Math.random() * 2.5;
      }
      this.basePositions[idx] = x;
      this.basePositions[idx + 1] = Math.max(0.05, y);
      this.basePositions[idx + 2] = z;
    }
  }

  private generateStationaryFrontBase(count: number): void {
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const isNorth = i < count * 0.5;
      const x = (Math.random() - 0.5) * 14;
      const z = (Math.random() - 0.5) * 12;
      let y: number;
      if (isNorth) {
        y = 1 + Math.random() * 4 + Math.sin(x * 0.5) * 0.8;
      } else {
        y = 0.3 + Math.random() * 3 + Math.sin(x * 0.5 + 1) * 0.6;
      }
      this.basePositions[idx] = x;
      this.basePositions[idx + 1] = Math.max(0.05, y);
      this.basePositions[idx + 2] = z;
    }
  }

  private generateCycloneBase(count: number): void {
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const r = Math.pow(Math.random(), 0.6) * 7;
      const theta = Math.random() * Math.PI * 2;
      const y = Math.pow(Math.random(), 0.7) * 7;
      const rAtY = r * (1 - y * 0.08);
      this.basePositions[idx] = Math.cos(theta) * rAtY;
      this.basePositions[idx + 1] = Math.max(0.05, y);
      this.basePositions[idx + 2] = Math.sin(theta) * rAtY;
    }
  }

  private generateAnticycloneBase(count: number): void {
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const r = Math.pow(Math.random(), 0.5) * 7;
      const theta = Math.random() * Math.PI * 2;
      const y = 0.5 + (1 - Math.pow(Math.random(), 0.6)) * 6.5;
      const rAtY = r * (1 + (y - 3) * 0.04);
      this.basePositions[idx] = Math.cos(theta) * rAtY;
      this.basePositions[idx + 1] = Math.max(0.05, y);
      this.basePositions[idx + 2] = Math.sin(theta) * rAtY;
    }
  }

  public updateParams(tempDiff: number, humidity: number, windSpeed: number): void {
    this.targetParams = { tempDiff, humidity, windSpeed };
  }

  private interpolateParams(dt: number): void {
    const speed = 2.0;
    const factor = 1 - Math.exp(-speed * dt);
    this.params.tempDiff += (this.targetParams.tempDiff - this.params.tempDiff) * factor;
    this.params.humidity += (this.targetParams.humidity - this.params.humidity) * factor;
    this.params.windSpeed += (this.targetParams.windSpeed - this.params.windSpeed) * factor;

    const smoothSpeed = 4.0;
    const sf = 1 - Math.exp(-smoothSpeed * dt);
    this.smoothedParams.tempDiff += (this.params.tempDiff - this.smoothedParams.tempDiff) * sf;
    this.smoothedParams.humidity += (this.params.humidity - this.smoothedParams.humidity) * sf;
    this.smoothedParams.windSpeed += (this.params.windSpeed - this.smoothedParams.windSpeed) * sf;
  }

  public update(time: number, dt: number): void {
    this.interpolateParams(dt);
    this.pushHistory();
    this.applySystemMotion(time, dt);
    this.updateColorsAndSizes();
    this.updateTrailData();
  }

  private pushHistory(): void {
    this.historyIndex = (this.historyIndex + 1) % TRAIL_COUNT;
    this.positionHistory[this.historyIndex].set(this.particleData.positions);
  }

  private getHistoryPosition(particleIdx: number, trailOffset: number): [number, number, number] {
    const histIdx = (this.historyIndex - trailOffset + TRAIL_COUNT) % TRAIL_COUNT;
    const buffer = this.positionHistory[histIdx];
    const i3 = particleIdx * 3;
    return [buffer[i3], buffer[i3 + 1], buffer[i3 + 2]];
  }

  public getSlope(): number {
    const normalized = (this.params.tempDiff + 10) / 20;
    return 15 + normalized * 30;
  }

  private applySystemMotion(time: number, dt: number): void {
    const windFactor = this.smoothedParams.windSpeed / 5;
    const tempDiffNorm = (this.smoothedParams.tempDiff + 10) / 20;
    const wedgeStrength = 1.0 + tempDiffNorm * 0.8;
    const liftStrength = 1.0 + tempDiffNorm * 0.7;
    const slopeDeg = this.getSlope();
    const slopeRad = (slopeDeg * Math.PI) / 180;

    for (let i = 0; i < this.particleCount; i++) {
      const idx = i * 3;
      const bx = this.basePositions[idx];
      const by = this.basePositions[idx + 1];
      const bz = this.basePositions[idx + 2];
      const phase = this.phaseOffsets[i];

      let x = bx, y = by, z = bz;
      const t = time + phase;

      switch (this.systemType) {
        case 'coldFront':
          this.applyColdFrontMotion(i, bx, by, bz, t, windFactor, slopeRad, wedgeStrength, liftStrength, idx);
          break;
        case 'warmFront':
          this.applyWarmFrontMotion(i, bx, by, bz, t, windFactor, slopeRad, liftStrength, idx);
          break;
        case 'stationaryFront':
          this.applyStationaryFrontMotion(i, bx, by, bz, t, windFactor, idx);
          break;
        case 'extratropicalCyclone':
          this.applyCycloneMotion(bx, by, bz, t, windFactor, tempDiffNorm, idx);
          break;
        case 'anticyclone':
          this.applyAnticycloneMotion(bx, by, bz, t, windFactor, idx);
          break;
      }

      this.particleData.velocities[idx] = (this.particleData.positions[idx] - x) / Math.max(dt, 0.001);
      this.particleData.velocities[idx + 1] = (this.particleData.positions[idx + 1] - y) / Math.max(dt, 0.001);
      this.particleData.velocities[idx + 2] = (this.particleData.positions[idx + 2] - z) / Math.max(dt, 0.001);
    }
  }

  private applyColdFrontMotion(i: number, bx: number, by: number, bz: number, t: number, windFactor: number, slopeRad: number, wedgeStrength: number, liftStrength: number, idx: number): void {
    const isCold = i < this.particleCount * 0.45;
    const advance = Math.sin(t * 0.3) * 0.5 + t * 0.05 * windFactor;
    if (isCold) {
      const frontX = advance;
      const localX = bx - frontX * 2;
      const wedgeY = Math.max(0, -localX) * Math.tan(slopeRad) * 0.6 * wedgeStrength;
      this.particleData.positions[idx] = bx - advance * 0.8;
      this.particleData.positions[idx + 1] = Math.max(0.05, Math.min(by, wedgeY + 0.3));
      this.particleData.positions[idx + 2] = bz + Math.sin(t * 0.5 + i * 0.01) * 0.15 * windFactor;
    } else {
      const lift = Math.max(0, bx + advance * 0.5) * Math.tan(slopeRad) * 1.2 * liftStrength;
      this.particleData.positions[idx] = bx + advance * 0.4 + Math.sin(t * 0.4) * 0.2;
      this.particleData.positions[idx + 1] = Math.max(0.05, by + lift + Math.sin(t * 0.6 + i * 0.02) * 0.25);
      this.particleData.positions[idx + 2] = bz + Math.sin(t * 0.35 + i * 0.015) * 0.2 * windFactor;
    }
  }

  private applyWarmFrontMotion(i: number, bx: number, by: number, bz: number, t: number, windFactor: number, slopeRad: number, liftStrength: number, idx: number): void {
    const isWarm = i < this.particleCount * 0.55;
    const advance = Math.sin(t * 0.25) * 0.4 + t * 0.04 * windFactor;
    if (isWarm) {
      const climb = Math.max(0, bx + advance * 1.5) * Math.tan(slopeRad) * 0.5 * liftStrength;
      this.particleData.positions[idx] = bx + advance * 0.6 + Math.sin(t * 0.3) * 0.15;
      this.particleData.positions[idx + 1] = Math.max(0.05, by + climb + Math.sin(t * 0.5 + i * 0.02) * 0.2);
      this.particleData.positions[idx + 2] = bz + Math.sin(t * 0.4 + i * 0.01) * 0.2 * windFactor;
    } else {
      this.particleData.positions[idx] = bx - advance * 0.5;
      this.particleData.positions[idx + 1] = Math.max(0.05, by + Math.sin(t * 0.3 + i * 0.01) * 0.1);
      this.particleData.positions[idx + 2] = bz + Math.sin(t * 0.25) * 0.1 * windFactor;
    }
  }

  private applyStationaryFrontMotion(i: number, bx: number, by: number, bz: number, t: number, windFactor: number, idx: number): void {
    const isNorth = i < this.particleCount * 0.5;
    const osc = Math.sin(t * 0.4) * 0.8;
    if (isNorth) {
      this.particleData.positions[idx] = bx + osc * 0.3 + Math.sin(t * 0.25 + i * 0.01) * 0.2;
      this.particleData.positions[idx + 1] = Math.max(0.05, by + Math.sin(t * 0.5 + i * 0.02) * 0.15);
      this.particleData.positions[idx + 2] = bz + Math.sin(t * 0.3) * 0.15 * windFactor;
    } else {
      this.particleData.positions[idx] = bx - osc * 0.3 + Math.sin(t * 0.3 + i * 0.015) * 0.2;
      this.particleData.positions[idx + 1] = Math.max(0.05, by + Math.sin(t * 0.45 + i * 0.025) * 0.15);
      this.particleData.positions[idx + 2] = bz - Math.sin(t * 0.35) * 0.15 * windFactor;
    }
  }

  private applyCycloneMotion(bx: number, by: number, bz: number, t: number, windFactor: number, tempDiffNorm: number, idx: number): void {
    const r = Math.sqrt(bx * bx + bz * bz);
    const baseTheta = Math.atan2(bz, bx);
    const heightFactor = 1 - by * 0.07;
    const convergenceBoost = 1.0 + (windFactor - 1.0) * 0.15;
    const tempRotationBoost = 1.0 + tempDiffNorm * 0.3;
    const rotationSpeed = (0.6 + (7 - Math.min(r, 7)) * 0.08) * windFactor * tempRotationBoost;
    const theta = baseTheta + t * rotationSpeed * heightFactor;
    const convergence = 1 - (1 - heightFactor) * 0.4 * convergenceBoost;
    const rNew = r * convergence;
    const liftSpeed = 0.08 * windFactor * (1 + tempDiffNorm * 0.4);
    const lift = by + t * liftSpeed * (1 - r / 8);
    this.particleData.positions[idx] = Math.cos(theta) * rNew + Math.sin(t * 0.7) * 0.1;
    this.particleData.positions[idx + 1] = Math.max(0.05, Math.min(7.5, lift + Math.sin(t * 0.5) * 0.15));
    this.particleData.positions[idx + 2] = Math.sin(theta) * rNew + Math.cos(t * 0.6) * 0.1;
  }

  private applyAnticycloneMotion(bx: number, by: number, bz: number, t: number, windFactor: number, idx: number): void {
    const r = Math.sqrt(bx * bx + bz * bz);
    const baseTheta = Math.atan2(bz, bx);
    const heightFactor = 1 - (7 - by) * 0.05;
    const divergenceBoost = 1.0 + (windFactor - 1.0) * 0.12;
    const rotationSpeed = -(0.5 + (7 - Math.min(r, 7)) * 0.06) * windFactor;
    const theta = baseTheta + t * rotationSpeed * heightFactor;
    const divergence = 1 + (1 - heightFactor) * 0.3 * divergenceBoost;
    const rNew = r * divergence;
    const sink = by - t * 0.06 * windFactor * (1 - r / 8);
    this.particleData.positions[idx] = Math.cos(theta) * rNew + Math.sin(t * 0.6) * 0.1;
    this.particleData.positions[idx + 1] = Math.max(0.05, Math.min(7.5, sink + Math.cos(t * 0.55) * 0.15));
    this.particleData.positions[idx + 2] = Math.sin(theta) * rNew + Math.sin(t * 0.65) * 0.1;
  }

  private updateColorsAndSizes(): void {
    const humidityFactor = this.smoothedParams.humidity / 100;
    const windFactor = this.smoothedParams.windSpeed / 10;
    const windStrength = windFactor;

    for (let i = 0; i < this.particleCount; i++) {
      const pIdx = i * 3;
      const y = this.particleData.positions[pIdx + 1];
      const heightT = normalizeHeight(y);

      let r: number, g: number, b: number;

      if (heightT < 0.3) {
        const lowT = heightT / 0.3;
        const [lr, lg, lb] = lerp3(LOW_COLOR, MID_BLUE, lowT);
        const windT = Math.min(1, windStrength * 1.8);
        r = lr + (WIND_WHITE.r - lr) * windT * (1 - lowT * 0.5);
        g = lg + (WIND_WHITE.g - lg) * windT * (1 - lowT * 0.5);
        b = lb + (WIND_WHITE.b - lb) * windT * (1 - lowT * 0.3);
      } else if (heightT < 0.65) {
        const midT = (heightT - 0.3) / 0.35;
        let [mr, mg, mb] = lerp3(MID_BLUE, HUMID_CLOUD, midT * 0.6);
        const humidBoost = humidityFactor * 0.4;
        const [hr, hg, hb] = lerp3({ r: mr, g: mg, b: mb }, HUMID_CLOUD, humidBoost);
        r = hr; g = hg; b = hb;
      } else {
        const highT = (heightT - 0.65) / 0.35;
        let [hr, hg, hb] = lerp3(HUMID_CLOUD, HIGH_COLOR, highT);
        const humidTurb = Math.sin(i * 0.137 + heightT * 10) * 0.5 + 0.5;
        const extraCloud = humidityFactor * humidTurb * 0.15;
        r = Math.min(1, hr + extraCloud);
        g = Math.min(1, hg + extraCloud);
        b = Math.min(1, hb + extraCloud * 0.8);
      }

      const velMag = Math.sqrt(
        this.particleData.velocities[pIdx] ** 2 +
        this.particleData.velocities[pIdx + 1] ** 2 +
        this.particleData.velocities[pIdx + 2] ** 2
      );
      const motionWhite = Math.min(1, velMag * 0.05) * windFactor * 0.35;
      r = Math.min(1, r + motionWhite);
      g = Math.min(1, g + motionWhite);
      b = Math.min(1, b + motionWhite);

      this.particleData.colors[pIdx] = r;
      this.particleData.colors[pIdx + 1] = g;
      this.particleData.colors[pIdx + 2] = b;

      const baseSize = 1.0 + heightT * 2.0;
      const humidityBoost = humidityFactor * 0.5 * Math.max(0, 1 - heightT * 0.5);
      const windBoost = windStrength * 0.4 * (1 - heightT * 0.7);
      this.particleData.sizes[i] = Math.min(3.0, baseSize + humidityBoost + windBoost);
      this.particleData.alphas[i] = 0.85 + (1 - heightT * 0.3) * 0.15;
    }
  }

  private updateTrailData(): void {
    const windFactor = this.smoothedParams.windSpeed;
    const trailLen = 1 + (windFactor - 1) / 9 * TRAIL_COUNT;
    const effectiveTrail = Math.min(TRAIL_COUNT, Math.max(1, Math.round(trailLen)));

    for (let i = 0; i < this.particleCount; i++) {
      const mainIdx = i * 3;
      const mr = this.particleData.colors[mainIdx];
      const mg = this.particleData.colors[mainIdx + 1];
      const mb = this.particleData.colors[mainIdx + 2];
      const mainSize = this.particleData.sizes[i];

      for (let t = 0; t < TRAIL_COUNT; t++) {
        const trailIdx = i * TRAIL_COUNT + t;
        const trail3 = trailIdx * 3;

        if (t < effectiveTrail) {
          const [hx, hy, hz] = this.getHistoryPosition(i, t + 1);
          this.trailData.positions[trail3] = hx;
          this.trailData.positions[trail3 + 1] = hy;
          this.trailData.positions[trail3 + 2] = hz;

          const alphaT = (t + 1) / (effectiveTrail + 1);
          const fadeFactor = 1 - alphaT;
          this.trailData.colors[trail3] = mr;
          this.trailData.colors[trail3 + 1] = mg;
          this.trailData.colors[trail3 + 2] = mb;
          this.trailData.sizes[trailIdx] = mainSize * (0.9 - alphaT * 0.5);
          this.trailData.alphas[trailIdx] = this.particleData.alphas[i] * fadeFactor * 0.85;
        } else {
          this.trailData.alphas[trailIdx] = 0;
          this.trailData.sizes[trailIdx] = 0;
        }
      }
    }
  }

  public getParticleData(): ParticleData {
    return this.particleData;
  }

  public getTrailData(): ParticleData {
    return this.trailData;
  }

  public getTrailCountPerParticle(): number {
    return TRAIL_COUNT;
  }

  public getTotalParticleCount(): number {
    const windFactor = this.smoothedParams.windSpeed;
    const trailLen = 1 + (windFactor - 1) / 9 * TRAIL_COUNT;
    const effectiveTrail = Math.min(TRAIL_COUNT, Math.max(1, Math.round(trailLen)));
    return this.particleCount * (1 + effectiveTrail);
  }

  public getParticleCount(): number {
    return this.particleCount;
  }

  public getSystemType(): SystemType {
    return this.systemType;
  }

  public getParams(): SystemParams {
    return { ...this.params };
  }

  public setSystemType(systemType: SystemType): void {
    this.systemType = systemType;
    this.particleCount = SYSTEM_INFO[systemType].particleCount;
    this.particleData = this.createEmptyData(this.particleCount);
    this.trailData = this.createEmptyData(this.particleCount * TRAIL_COUNT);
    this.basePositions = new Float32Array(this.particleCount * 3);
    this.phaseOffsets = new Float32Array(this.particleCount);
    this.positionHistory = [];
    for (let h = 0; h < TRAIL_COUNT; h++) {
      this.positionHistory.push(new Float32Array(this.particleCount * 3));
    }
    this.historyIndex = 0;
    this.initSystem();
  }
}
