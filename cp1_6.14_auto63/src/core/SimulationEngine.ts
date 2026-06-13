import * as THREE from 'three';
import { eventBus, AppEvents, ForceFieldData, FluidType } from '../events/EventBus';
import { clamp, randomRange, lerp } from '../utils/MathUtils';

export interface ParticleState {
  positions: Float32Array;
  velocities: Float32Array;
  densities: Float32Array;
}

interface FluidPhysicsParams {
  particleMass: number;
  restDensity: number;
  stiffness: number;
  viscosity: number;
  surfaceTension: number;
  gravityScale: number;
  buoyancy: number;
  damping: number;
}

const FLUID_PRESETS: Record<FluidType, FluidPhysicsParams> = {
  water: {
    particleMass: 1.0,
    restDensity: 1000,
    stiffness: 800,
    viscosity: 250,
    surfaceTension: 0.5,
    gravityScale: 1.0,
    buoyancy: 0.0,
    damping: 0.998,
  },
  smoke: {
    particleMass: 0.15,
    restDensity: 80,
    stiffness: 120,
    viscosity: 40,
    surfaceTension: 0,
    gravityScale: -0.15,
    buoyancy: 1.5,
    damping: 0.992,
  },
  fire: {
    particleMass: 0.08,
    restDensity: 40,
    stiffness: 60,
    viscosity: 15,
    surfaceTension: 0,
    gravityScale: -2.2,
    buoyancy: 3.0,
    damping: 0.985,
  },
};

export class SimulationEngine {
  private particleCount: number;
  private positions: Float32Array;
  private velocities: Float32Array;
  private densities: Float32Array;
  private pressures: Float32Array;
  private colorFieldGradX: Float32Array;
  private colorFieldGradY: Float32Array;
  private colorFieldGradZ: Float32Array;
  private colorFieldLaplacian: Float32Array;

  private baseGravity: number = -9.8;
  private gravity: number = -9.8;
  private wind: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private windStrength: number = 0;
  private vortexRadius: number = 5;
  private vortexStrength: number = 0;
  private vortexCenter: THREE.Vector3 = new THREE.Vector3(0, 5, 0);

  private activeForceFields: ForceFieldData[] = [];
  private decayingForceFields: { data: ForceFieldData; decayTime: number; currentTime: number }[] = [];
  private forceFieldDecayDuration: number = 0.3;

  private bounds = {
    minX: -12,
    maxX: 12,
    minY: -4,
    maxY: 10,
    minZ: -3,
    maxZ: 3,
  };

  private smoothingRadius: number = 0.8;
  private cellSize: number = 0.8;

  private currentParams: FluidPhysicsParams;
  private targetParams: FluidPhysicsParams;
  private paramsTransitionProgress: number = 1;
  private paramsTransitionDuration: number = 0.5;
  private currentFluidType: FluidType = 'water';

  private maxVelocity: number = 25;
  private spatialHash: Map<string, number[]> = new Map();
  private dt: number = 1 / 60;

  private accelX: Float32Array;
  private accelY: Float32Array;
  private accelZ: Float32Array;
  private neighborCache: number[][];
  private neighborCountCache: Int32Array;

  constructor(particleCount: number = 3000) {
    this.particleCount = particleCount;
    this.positions = new Float32Array(particleCount * 3);
    this.velocities = new Float32Array(particleCount * 3);
    this.densities = new Float32Array(particleCount);
    this.pressures = new Float32Array(particleCount);
    this.colorFieldGradX = new Float32Array(particleCount);
    this.colorFieldGradY = new Float32Array(particleCount);
    this.colorFieldGradZ = new Float32Array(particleCount);
    this.colorFieldLaplacian = new Float32Array(particleCount);

    this.currentParams = { ...FLUID_PRESETS.water };
    this.targetParams = { ...FLUID_PRESETS.water };

    this.accelX = new Float32Array(particleCount);
    this.accelY = new Float32Array(particleCount);
    this.accelZ = new Float32Array(particleCount);
    this.neighborCache = new Array(particleCount).fill(null).map(() => []);
    this.neighborCountCache = new Int32Array(particleCount);

    this.gravity = this.baseGravity * this.currentParams.gravityScale;

    this.initializeParticles();
    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on(AppEvents.SIMULATION_PARAMS_CHANGED, this.handleParamsChanged.bind(this));
    eventBus.on(AppEvents.FORCE_FIELD_APPLIED, this.handleForceFieldApplied.bind(this));
    eventBus.on(AppEvents.FORCE_FIELD_RELEASED, this.handleForceFieldReleased.bind(this));
    eventBus.on(AppEvents.FLUID_TYPE_CHANGED, this.handleFluidTypeChanged.bind(this));
  }

  private initializeParticles(): void {
    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      this.positions[i3] = randomRange(-10, 10);
      this.positions[i3 + 1] = randomRange(-1, 1);
      this.positions[i3 + 2] = randomRange(-1.5, 1.5);

      this.velocities[i3] = randomRange(-0.1, 0.1);
      this.velocities[i3 + 1] = randomRange(-0.05, 0.05);
      this.velocities[i3 + 2] = randomRange(-0.05, 0.05);

      this.densities[i] = this.currentParams.restDensity;
      this.pressures[i] = 0;
    }
  }

  private handleParamsChanged(params: any): void {
    if (params.gravity !== undefined) {
      this.baseGravity = params.gravity;
      this.gravity = this.baseGravity * this.currentParams.gravityScale;
    }
    if (params.windX !== undefined) this.wind.x = params.windX;
    if (params.windY !== undefined) this.wind.y = params.windY;
    if (params.windZ !== undefined) this.wind.z = params.windZ;
    if (params.windStrength !== undefined) this.windStrength = params.windStrength;
    if (params.vortexRadius !== undefined) this.vortexRadius = params.vortexRadius;
    if (params.vortexStrength !== undefined) this.vortexStrength = params.vortexStrength;

    if (params.particleCount !== undefined && params.particleCount !== this.particleCount) {
      this.resizeParticleCount(params.particleCount);
    }
  }

  private handleForceFieldApplied(data: ForceFieldData): void {
    if (this.activeForceFields.length >= 5) {
      this.activeForceFields.shift();
    }
    this.activeForceFields.push(data);
  }

  private handleForceFieldReleased(): void {
    for (const field of this.activeForceFields) {
      this.decayingForceFields.push({
        data: field,
        decayTime: this.forceFieldDecayDuration,
        currentTime: 0,
      });
    }
    this.activeForceFields = [];
  }

  private handleFluidTypeChanged(type: FluidType): void {
    this.currentFluidType = type;
    this.currentParams = { ...this.currentParams };
    this.targetParams = { ...FLUID_PRESETS[type] };
    this.paramsTransitionProgress = 0;
  }

  private updateParamsTransition(deltaTime: number): void {
    if (this.paramsTransitionProgress >= 1) return;

    this.paramsTransitionProgress = Math.min(
      1,
      this.paramsTransitionProgress + deltaTime / this.paramsTransitionDuration
    );
    const t = this.paramsTransitionProgress;
    const smoothT = t * t * (3 - 2 * t);

    this.currentParams.particleMass = lerp(this.currentParams.particleMass, this.targetParams.particleMass, smoothT);
    this.currentParams.restDensity = lerp(this.currentParams.restDensity, this.targetParams.restDensity, smoothT);
    this.currentParams.stiffness = lerp(this.currentParams.stiffness, this.targetParams.stiffness, smoothT);
    this.currentParams.viscosity = lerp(this.currentParams.viscosity, this.targetParams.viscosity, smoothT);
    this.currentParams.surfaceTension = lerp(this.currentParams.surfaceTension, this.targetParams.surfaceTension, smoothT);
    this.currentParams.gravityScale = lerp(this.currentParams.gravityScale, this.targetParams.gravityScale, smoothT);
    this.currentParams.buoyancy = lerp(this.currentParams.buoyancy, this.targetParams.buoyancy, smoothT);
    this.currentParams.damping = lerp(this.currentParams.damping, this.targetParams.damping, smoothT);

    this.gravity = this.baseGravity * this.currentParams.gravityScale;
  }

  public resizeParticleCount(newCount: number): void {
    newCount = Math.floor(newCount / 100) * 100;
    newCount = clamp(newCount, 100, 5000);

    if (newCount === this.particleCount) return;

    const oldCount = this.particleCount;
    const oldPositions = this.positions;
    const oldVelocities = this.velocities;
    const oldDensities = this.densities;
    const oldPressures = this.pressures;

    this.particleCount = newCount;
    this.positions = new Float32Array(newCount * 3);
    this.velocities = new Float32Array(newCount * 3);
    this.densities = new Float32Array(newCount);
    this.pressures = new Float32Array(newCount);
    this.colorFieldGradX = new Float32Array(newCount);
    this.colorFieldGradY = new Float32Array(newCount);
    this.colorFieldGradZ = new Float32Array(newCount);
    this.colorFieldLaplacian = new Float32Array(newCount);
    this.accelX = new Float32Array(newCount);
    this.accelY = new Float32Array(newCount);
    this.accelZ = new Float32Array(newCount);
    this.neighborCache = new Array(newCount).fill(null).map(() => []);
    this.neighborCountCache = new Int32Array(newCount);

    const copyCount = Math.min(oldCount, newCount);
    for (let i = 0; i < copyCount; i++) {
      const i3 = i * 3;
      const oldI3 = i * 3;
      this.positions[i3] = oldPositions[oldI3];
      this.positions[i3 + 1] = oldPositions[oldI3 + 1];
      this.positions[i3 + 2] = oldPositions[oldI3 + 2];
      this.velocities[i3] = oldVelocities[oldI3];
      this.velocities[i3 + 1] = oldVelocities[oldI3 + 1];
      this.velocities[i3 + 2] = oldVelocities[oldI3 + 2];
      this.densities[i] = oldDensities[i];
      this.pressures[i] = oldPressures[i];
    }

    for (let i = copyCount; i < newCount; i++) {
      const i3 = i * 3;
      this.positions[i3] = randomRange(-10, 10);
      this.positions[i3 + 1] = randomRange(-1, 1);
      this.positions[i3 + 2] = randomRange(-1.5, 1.5);
      this.velocities[i3] = randomRange(-0.1, 0.1);
      this.velocities[i3 + 1] = randomRange(-0.05, 0.05);
      this.velocities[i3 + 2] = randomRange(-0.05, 0.05);
      this.densities[i] = this.currentParams.restDensity;
      this.pressures[i] = 0;
    }

    eventBus.emit(AppEvents.PARTICLE_COUNT_CHANGED, newCount);
  }

  private buildSpatialHash(): void {
    this.spatialHash.clear();
    const cs = this.cellSize;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const cx = Math.floor(this.positions[i3] / cs);
      const cy = Math.floor(this.positions[i3 + 1] / cs);
      const cz = Math.floor(this.positions[i3 + 2] / cs);
      const key = (cx * 73856093) ^ (cy * 19349663) ^ (cz * 83492791);

      if (!this.spatialHash.has(key as unknown as string)) {
        this.spatialHash.set(key as unknown as string, []);
      }
      this.spatialHash.get(key as unknown as string)!.push(i);
    }
  }

  private findNeighbors(): void {
    const cs = this.cellSize;
    const h = this.smoothingRadius;
    const h2 = h * h;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      const cx = Math.floor(this.positions[i3] / cs);
      const cy = Math.floor(this.positions[i3 + 1] / cs);
      const cz = Math.floor(this.positions[i3 + 2] / cs);

      const neighbors = this.neighborCache[i];
      let count = 0;

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          for (let dz = -1; dz <= 1; dz++) {
            const key = ((cx + dx) * 73856093) ^ ((cy + dy) * 19349663) ^ ((cz + dz) * 83492791);
            const cell = this.spatialHash.get(key as unknown as string);
            if (!cell) continue;

            for (let k = 0; k < cell.length; k++) {
              const j = cell[k];
              if (j === i) continue;

              const j3 = j * 3;
              const rx = this.positions[i3] - this.positions[j3];
              const ry = this.positions[i3 + 1] - this.positions[j3 + 1];
              const rz = this.positions[i3 + 2] - this.positions[j3 + 2];
              const r2 = rx * rx + ry * ry + rz * rz;

              if (r2 < h2 && r2 > 1e-6) {
                if (count >= neighbors.length) {
                  neighbors.push(j);
                } else {
                  neighbors[count] = j;
                }
                count++;
              }
            }
          }
        }
      }
      this.neighborCountCache[i] = count;
    }
  }

  private computeDensityPressure(): void {
    const h = this.smoothingRadius;
    const h2 = h * h;
    const h9 = Math.pow(h, 9);
    const poly6 = 315.0 / (64.0 * Math.PI * h9);
    const mass = this.currentParams.particleMass;
    const restDensity = this.currentParams.restDensity;
    const stiffness = this.currentParams.stiffness;
    const mass2 = mass * mass;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      let density = mass * poly6 * h2 * h2 * h2;

      const neighbors = this.neighborCache[i];
      const nCount = this.neighborCountCache[i];

      for (let k = 0; k < nCount; k++) {
        const j = neighbors[k];
        const j3 = j * 3;
        const rx = this.positions[i3] - this.positions[j3];
        const ry = this.positions[i3 + 1] - this.positions[j3 + 1];
        const rz = this.positions[i3 + 2] - this.positions[j3 + 2];
        const r2 = rx * rx + ry * ry + rz * rz;

        const diff = h2 - r2;
        density += mass * poly6 * diff * diff * diff;
      }

      this.densities[i] = Math.max(density, restDensity * 0.2);

      const densityRatio = this.densities[i] / restDensity;
      this.pressures[i] = stiffness * (densityRatio * densityRatio * densityRatio - 1) * restDensity;
      if (this.pressures[i] < 0) this.pressures[i] = 0;
    }

    if (this.currentParams.surfaceTension > 0.001) {
      this.computeColorField(poly6, h, h2, mass2);
    }
  }

  private computeColorField(poly6: number, h: number, h2: number, mass2: number): void {
    const poly6GradCoeff = -945.0 / (32.0 * Math.PI * Math.pow(h, 9));
    const poly6LapCoeff = -945.0 / (32.0 * Math.PI * Math.pow(h, 9));

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      let gradX = 0;
      let gradY = 0;
      let gradZ = 0;
      let laplacian = 0;

      const cSelf = poly6 * h2 * h2 * h2;
      gradX += mass2 * poly6GradCoeff * this.positions[i3] * 0;
      gradY += mass2 * poly6GradCoeff * this.positions[i3 + 1] * 0;
      gradZ += mass2 * poly6GradCoeff * this.positions[i3 + 2] * 0;
      laplacian += mass2 * poly6LapCoeff * (h2 * 6);

      const neighbors = this.neighborCache[i];
      const nCount = this.neighborCountCache[i];

      for (let k = 0; k < nCount; k++) {
        const j = neighbors[k];
        const j3 = j * 3;
        const rx = this.positions[i3] - this.positions[j3];
        const ry = this.positions[i3 + 1] - this.positions[j3 + 1];
        const rz = this.positions[i3 + 2] - this.positions[j3 + 2];
        const r2 = rx * rx + ry * ry + rz * rz;
        const diff = h2 - r2;

        const gradW = mass2 * poly6GradCoeff * diff * diff;
        gradX += gradW * rx;
        gradY += gradW * ry;
        gradZ += gradW * rz;

        laplacian += mass2 * poly6LapCoeff * diff * (3 * h2 - 7 * r2);
      }

      this.colorFieldGradX[i] = gradX;
      this.colorFieldGradY[i] = gradY;
      this.colorFieldGradZ[i] = gradZ;
      this.colorFieldLaplacian[i] = laplacian;
    }
  }

  private computeForces(): void {
    const h = this.smoothingRadius;
    const h2 = h * h;
    const h6 = Math.pow(h, 6);
    const spikyGrad = -45.0 / (Math.PI * h6);
    const viscLap = 45.0 / (Math.PI * h6);
    const mass = this.currentParams.particleMass;
    const sigma = this.currentParams.surfaceTension;

    const ax = this.accelX;
    const ay = this.accelY;
    const az = this.accelZ;

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      ax[i] = this.wind.x * this.windStrength;
      ay[i] = this.gravity + this.wind.y * this.windStrength;
      az[i] = this.wind.z * this.windStrength;

      const rhoI = this.densities[i];
      const pI = this.pressures[i];

      this.applyVortexForce(i, i3, ax, ay, az);
      this.applyExternalForceFields(i, i3, ax, ay, az);

      const buoyancy = this.currentParams.buoyancy;
      if (buoyancy !== 0) {
        const heightFactor = clamp((this.positions[i3 + 1] + 4) / 14, 0, 1);
        ay[i] += buoyancy * heightFactor;
      }

      const neighbors = this.neighborCache[i];
      const nCount = this.neighborCountCache[i];

      for (let k = 0; k < nCount; k++) {
        const j = neighbors[k];
        const j3 = j * 3;

        const rx = this.positions[i3] - this.positions[j3];
        const ry = this.positions[i3 + 1] - this.positions[j3 + 1];
        const rz = this.positions[i3 + 2] - this.positions[j3 + 2];
        const r2 = rx * rx + ry * ry + rz * rz;
        const r = Math.sqrt(r2);
        const diff = h - r;
        const diff2 = diff * diff;
        const invR = 1.0 / r;

        const pJ = this.pressures[j];
        const rhoJ = this.densities[j];

        const pressureTerm = -mass * (pI + pJ) / (2.0 * rhoJ) * spikyGrad * diff2;
        ax[i] += pressureTerm * rx * invR;
        ay[i] += pressureTerm * ry * invR;
        az[i] += pressureTerm * rz * invR;

        const viscTerm = this.currentParams.viscosity * mass / rhoJ * viscLap * diff;
        ax[i] += viscTerm * (this.velocities[j3] - this.velocities[i3]);
        ay[i] += viscTerm * (this.velocities[j3 + 1] - this.velocities[i3 + 1]);
        az[i] += viscTerm * (this.velocities[j3 + 2] - this.velocities[i3 + 2]);
      }

      if (sigma > 0.001) {
        const gradLen2 = this.colorFieldGradX[i] * this.colorFieldGradX[i]
          + this.colorFieldGradY[i] * this.colorFieldGradY[i]
          + this.colorFieldGradZ[i] * this.colorFieldGradZ[i];
        const gradLen = Math.sqrt(gradLen2);

        if (gradLen > 1e-6) {
          const kappa = -this.colorFieldLaplacian[i] / gradLen;
          const fST = sigma * kappa / rhoI;
          ax[i] += fST * this.colorFieldGradX[i] / gradLen;
          ay[i] += fST * this.colorFieldGradY[i] / gradLen;
          az[i] += fST * this.colorFieldGradZ[i] / gradLen;
        }
      }
    }
  }

  private applyVortexForce(
    i: number,
    i3: number,
    ax: Float32Array,
    ay: Float32Array,
    az: Float32Array
  ): void {
    if (this.vortexStrength === 0) return;

    const dx = this.positions[i3] - this.vortexCenter.x;
    const dy = this.positions[i3 + 1] - this.vortexCenter.y;
    const dz = this.positions[i3 + 2] - this.vortexCenter.z;
    const dist2 = dx * dx + dy * dy + dz * dz;
    const radius2 = this.vortexRadius * this.vortexRadius;

    if (dist2 < radius2 && dist2 > 0.01) {
      const dist = Math.sqrt(dist2);
      const t = 1 - dist / this.vortexRadius;
      const falloff = t * t;
      const strength = this.vortexStrength * falloff;

      const invDist = 1 / dist;
      const tx = -dz * invDist;
      const tz = dx * invDist;

      ax[i] += tx * strength;
      ay[i] += dy * strength * 0.05;
      az[i] += tz * strength;
    }
  }

  private applyExternalForceFields(
    i: number,
    i3: number,
    ax: Float32Array,
    ay: Float32Array,
    az: Float32Array
  ): void {
    for (let f = 0; f < this.activeForceFields.length; f++) {
      this.applySingleForceField(i, i3, this.activeForceFields[f], 1, ax, ay, az);
    }

    for (let f = 0; f < this.decayingForceFields.length; f++) {
      const decaying = this.decayingForceFields[f];
      const strengthFactor = 1 - decaying.currentTime / decaying.decayTime;
      this.applySingleForceField(i, i3, decaying.data, strengthFactor, ax, ay, az);
    }
  }

  private applySingleForceField(
    i: number,
    i3: number,
    field: ForceFieldData,
    strengthFactor: number,
    ax: Float32Array,
    ay: Float32Array,
    az: Float32Array
  ): void {
    const dx = this.positions[i3] - field.position.x;
    const dy = this.positions[i3 + 1] - field.position.y;
    const dz = this.positions[i3 + 2] - field.position.z;
    const dist2 = dx * dx + dy * dy + dz * dz;
    const radius2 = field.radius * field.radius;

    if (dist2 < radius2 && dist2 > 0.0001) {
      const dist = Math.sqrt(dist2);
      const t = 1 - dist / field.radius;
      const falloff = t * t;
      const strength = field.strength * falloff * strengthFactor;

      ax[i] += field.direction.x * strength;
      ay[i] += field.direction.y * strength;
      az[i] += field.direction.z * strength;

      const push = strength * 0.25 * t;
      const invR = 1 / dist;
      ax[i] -= dx * invR * push;
      ay[i] -= dy * invR * push;
      az[i] -= dz * invR * push;
    }
  }

  private xsphSmoothing(): void {
    const h = this.smoothingRadius;
    const h2 = h * h;
    const poly6 = 315.0 / (64.0 * Math.PI * Math.pow(h, 9));
    const epsilon = 0.15;

    const newVx = new Float32Array(this.particleCount);
    const newVy = new Float32Array(this.particleCount);
    const newVz = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      let sumVx = 0;
      let sumVy = 0;
      let sumVz = 0;
      let sumW = poly6 * h2 * h2 * h2;

      sumVx += this.velocities[i3] * sumW;
      sumVy += this.velocities[i3 + 1] * sumW;
      sumVz += this.velocities[i3 + 2] * sumW;

      const neighbors = this.neighborCache[i];
      const nCount = this.neighborCountCache[i];

      for (let k = 0; k < nCount; k++) {
        const j = neighbors[k];
        const j3 = j * 3;
        const rx = this.positions[i3] - this.positions[j3];
        const ry = this.positions[i3 + 1] - this.positions[j3 + 1];
        const rz = this.positions[i3 + 2] - this.positions[j3 + 2];
        const r2 = rx * rx + ry * ry + rz * rz;
        const diff = h2 - r2;
        const w = poly6 * diff * diff * diff;

        sumVx += this.velocities[j3] * w;
        sumVy += this.velocities[j3 + 1] * w;
        sumVz += this.velocities[j3 + 2] * w;
        sumW += w;
      }

      if (sumW > 1e-6) {
        newVx[i] = this.velocities[i3] + epsilon * (sumVx / sumW - this.velocities[i3]);
        newVy[i] = this.velocities[i3 + 1] + epsilon * (sumVy / sumW - this.velocities[i3 + 1]);
        newVz[i] = this.velocities[i3 + 2] + epsilon * (sumVz / sumW - this.velocities[i3 + 2]);
      } else {
        newVx[i] = this.velocities[i3];
        newVy[i] = this.velocities[i3 + 1];
        newVz[i] = this.velocities[i3 + 2];
      }
    }

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      this.velocities[i3] = newVx[i];
      this.velocities[i3 + 1] = newVy[i];
      this.velocities[i3 + 2] = newVz[i];
    }
  }

  private integrate(): void {
    const substeps = 1;
    const subDt = this.dt / substeps;
    const damping = this.currentParams.damping;
    const maxV2 = this.maxVelocity * this.maxVelocity;

    for (let step = 0; step < substeps; step++) {
      for (let i = 0; i < this.particleCount; i++) {
        const i3 = i * 3;

        this.velocities[i3] += this.accelX[i] * subDt;
        this.velocities[i3 + 1] += this.accelY[i] * subDt;
        this.velocities[i3 + 2] += this.accelZ[i] * subDt;

        const v2 =
          this.velocities[i3] * this.velocities[i3] +
          this.velocities[i3 + 1] * this.velocities[i3 + 1] +
          this.velocities[i3 + 2] * this.velocities[i3 + 2];

        if (v2 > maxV2) {
          const s = this.maxVelocity / Math.sqrt(v2);
          this.velocities[i3] *= s;
          this.velocities[i3 + 1] *= s;
          this.velocities[i3 + 2] *= s;
        }

        this.velocities[i3] *= damping;
        this.velocities[i3 + 1] *= damping;
        this.velocities[i3 + 2] *= damping;

        this.positions[i3] += this.velocities[i3] * subDt;
        this.positions[i3 + 1] += this.velocities[i3 + 1] * subDt;
        this.positions[i3 + 2] += this.velocities[i3 + 2] * subDt;

        this.enforceBoundary(i, i3);
      }
    }
  }

  private enforceBoundary(i: number, i3: number): void {
    const bounce = 0.25;
    const friction = 0.92;

    if (this.positions[i3] < this.bounds.minX) {
      this.positions[i3] = this.bounds.minX;
      if (this.velocities[i3] < 0) this.velocities[i3] = -this.velocities[i3] * bounce;
      this.velocities[i3 + 1] *= friction;
      this.velocities[i3 + 2] *= friction;
    }
    if (this.positions[i3] > this.bounds.maxX) {
      this.positions[i3] = this.bounds.maxX;
      if (this.velocities[i3] > 0) this.velocities[i3] = -this.velocities[i3] * bounce;
      this.velocities[i3 + 1] *= friction;
      this.velocities[i3 + 2] *= friction;
    }
    if (this.positions[i3 + 1] < this.bounds.minY) {
      this.positions[i3 + 1] = this.bounds.minY;
      if (this.velocities[i3 + 1] < 0) this.velocities[i3 + 1] = -this.velocities[i3 + 1] * bounce;
      this.velocities[i3] *= friction;
      this.velocities[i3 + 2] *= friction;
    }
    if (this.positions[i3 + 1] > this.bounds.maxY) {
      this.positions[i3 + 1] = this.bounds.maxY;
      if (this.velocities[i3 + 1] > 0) this.velocities[i3 + 1] = -this.velocities[i3 + 1] * bounce;
      this.velocities[i3] *= friction;
      this.velocities[i3 + 2] *= friction;
    }
    if (this.positions[i3 + 2] < this.bounds.minZ) {
      this.positions[i3 + 2] = this.bounds.minZ;
      if (this.velocities[i3 + 2] < 0) this.velocities[i3 + 2] = -this.velocities[i3 + 2] * bounce;
      this.velocities[i3] *= friction;
      this.velocities[i3 + 1] *= friction;
    }
    if (this.positions[i3 + 2] > this.bounds.maxZ) {
      this.positions[i3 + 2] = this.bounds.maxZ;
      if (this.velocities[i3 + 2] > 0) this.velocities[i3 + 2] = -this.velocities[i3 + 2] * bounce;
      this.velocities[i3] *= friction;
      this.velocities[i3 + 1] *= friction;
    }
  }

  private updateDecayingForceFields(deltaTime: number): void {
    for (let i = this.decayingForceFields.length - 1; i >= 0; i--) {
      this.decayingForceFields[i].currentTime += deltaTime;
      if (this.decayingForceFields[i].currentTime >= this.decayingForceFields[i].decayTime) {
        this.decayingForceFields.splice(i, 1);
      }
    }
  }

  public step(deltaTime: number): ParticleState {
    this.dt = Math.min(deltaTime, 0.033);

    this.updateParamsTransition(deltaTime);
    this.updateDecayingForceFields(deltaTime);

    this.buildSpatialHash();
    this.findNeighbors();
    this.computeDensityPressure();
    this.computeForces();
    this.integrate();

    if (this.currentParams.viscosity > 80) {
      this.xsphSmoothing();
    }

    return {
      positions: this.positions,
      velocities: this.velocities,
      densities: this.densities,
    };
  }

  public getPositions(): Float32Array {
    return this.positions;
  }

  public getVelocities(): Float32Array {
    return this.velocities;
  }

  public getParticleCount(): number {
    return this.particleCount;
  }

  public setParticleCount(count: number): void {
    this.resizeParticleCount(count);
  }

  public reset(): void {
    this.initializeParticles();
    this.activeForceFields = [];
    this.decayingForceFields = [];
    this.paramsTransitionProgress = 1;
  }
}
