import * as THREE from 'three';
import { eventBus, AppEvents, ForceFieldData, FluidType } from '../events/EventBus';
import { clamp, randomRange } from '../utils/MathUtils';

export interface ParticleState {
  positions: Float32Array;
  velocities: Float32Array;
  densities: Float32Array;
}

export class SimulationEngine {
  private particleCount: number;
  private positions: Float32Array;
  private velocities: Float32Array;
  private densities: Float32Array;

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
    minY: -5,
    maxY: 8,
    minZ: -4,
    maxZ: 4,
  };

  private particleRadius: number = 0.3;
  private restDensity: number = 1000;
  private stiffness: number = 200;
  private viscosity: number = 50;
  private dt: number = 1 / 60;
  private currentFluidType: FluidType = 'water';

  private maxVelocity: number = 20;
  private spatialHash: Map<string, number[]> = new Map();
  private cellSize: number = 0.8;

  constructor(particleCount: number = 3000) {
    this.particleCount = particleCount;
    this.positions = new Float32Array(particleCount * 3);
    this.velocities = new Float32Array(particleCount * 3);
    this.densities = new Float32Array(particleCount);

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
      this.positions[i3 + 1] = randomRange(-2, 2);
      this.positions[i3 + 2] = randomRange(-1.5, 1.5);

      this.velocities[i3] = randomRange(-0.5, 0.5);
      this.velocities[i3 + 1] = randomRange(-0.3, 0.3);
      this.velocities[i3 + 2] = randomRange(-0.2, 0.2);

      this.densities[i] = this.restDensity;
    }
  }

  private handleParamsChanged(params: any): void {
    if (params.gravity !== undefined) this.gravity = params.gravity;
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
    this.activeForceFields = this.activeForceFields.filter(
      (f) => Math.random() > 0.5 || this.activeForceFields.length < 3
    );
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
    switch (type) {
      case 'water':
        this.viscosity = 50;
        this.restDensity = 1000;
        this.stiffness = 200;
        break;
      case 'smoke':
        this.viscosity = 10;
        this.restDensity = 100;
        this.stiffness = 50;
        this.gravity = Math.abs(this.gravity) * -0.3;
        break;
      case 'fire':
        this.viscosity = 5;
        this.restDensity = 50;
        this.stiffness = 30;
        this.gravity = -Math.abs(this.gravity) * 2;
        break;
    }
  }

  public resizeParticleCount(newCount: number): void {
    newCount = Math.floor(newCount / 100) * 100;
    newCount = clamp(newCount, 100, 5000);

    if (newCount === this.particleCount) return;

    const oldCount = this.particleCount;
    const oldPositions = this.positions;
    const oldVelocities = this.velocities;
    const oldDensities = this.densities;

    this.particleCount = newCount;
    this.positions = new Float32Array(newCount * 3);
    this.velocities = new Float32Array(newCount * 3);
    this.densities = new Float32Array(newCount);

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
    }

    for (let i = copyCount; i < newCount; i++) {
      const i3 = i * 3;
      this.positions[i3] = randomRange(-10, 10);
      this.positions[i3 + 1] = randomRange(-2, 2);
      this.positions[i3 + 2] = randomRange(-1.5, 1.5);
      this.velocities[i3] = randomRange(-0.5, 0.5);
      this.velocities[i3 + 1] = randomRange(-0.3, 0.3);
      this.velocities[i3 + 2] = randomRange(-0.2, 0.2);
      this.densities[i] = this.restDensity;
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
      const key = `${cx},${cy},${cz}`;

      if (!this.spatialHash.has(key)) {
        this.spatialHash.set(key, []);
      }
      this.spatialHash.get(key)!.push(i);
    }
  }

  private getNeighbors(i: number): number[] {
    const neighbors: number[] = [];
    const cs = this.cellSize;
    const i3 = i * 3;
    const cx = Math.floor(this.positions[i3] / cs);
    const cy = Math.floor(this.positions[i3 + 1] / cs);
    const cz = Math.floor(this.positions[i3 + 2] / cs);

    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const key = `${cx + dx},${cy + dy},${cz + dz}`;
          const cell = this.spatialHash.get(key);
          if (cell) {
            for (const j of cell) {
              if (j !== i) neighbors.push(j);
            }
          }
        }
      }
    }
    return neighbors;
  }

  private computeDensityPressure(): void {
    const h = this.particleRadius * 2;
    const h2 = h * h;
    const poly6Coeff = 315 / (64 * Math.PI * Math.pow(h, 9));

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;
      let density = 0;
      const neighbors = this.getNeighbors(i);

      for (const j of neighbors) {
        const j3 = j * 3;
        const dx = this.positions[i3] - this.positions[j3];
        const dy = this.positions[i3 + 1] - this.positions[j3 + 1];
        const dz = this.positions[i3 + 2] - this.positions[j3 + 2];
        const r2 = dx * dx + dy * dy + dz * dz;

        if (r2 < h2) {
          const diff = h2 - r2;
          density += poly6Coeff * diff * diff * diff;
        }
      }

      density += poly6Coeff * h2 * h2 * h2;
      this.densities[i] = Math.max(density * 100, this.restDensity * 0.5);
    }
  }

  private computeForces(accelX: Float32Array, accelY: Float32Array, accelZ: Float32Array): void {
    const h = this.particleRadius * 2;
    const h2 = h * h;
    const spikyCoeff = -45 / (Math.PI * Math.pow(h, 6));
    const viscCoeff = 45 / (Math.PI * Math.pow(h, 6));

    for (let i = 0; i < this.particleCount; i++) {
      const i3 = i * 3;

      accelX[i] = this.wind.x * this.windStrength;
      accelY[i] = this.gravity + this.wind.y * this.windStrength;
      accelZ[i] = this.wind.z * this.windStrength;

      this.applyVortexForce(i, accelX, accelY, accelZ);
      this.applyExternalForceFields(i, accelX, accelY, accelZ);

      const neighbors = this.getNeighbors(i);
      const pressureI = this.stiffness * (this.densities[i] - this.restDensity);

      for (const j of neighbors) {
        const j3 = j * 3;
        const dx = this.positions[i3] - this.positions[j3];
        const dy = this.positions[i3 + 1] - this.positions[j3 + 1];
        const dz = this.positions[i3 + 2] - this.positions[j3 + 2];
        const r2 = dx * dx + dy * dy + dz * dz;

        if (r2 < h2 && r2 > 0.0001) {
          const r = Math.sqrt(r2);
          const diff = h - r;
          const invR = 1 / r;

          const pressureJ = this.stiffness * (this.densities[j] - this.restDensity);
          const pressureForce = -((pressureI + pressureJ) / (2 * this.densities[j])) * spikyCoeff * diff * diff;

          accelX[i] += pressureForce * dx * invR;
          accelY[i] += pressureForce * dy * invR;
          accelZ[i] += pressureForce * dz * invR;

          const viscForce = (this.viscosity / this.densities[j]) * viscCoeff * diff;
          accelX[i] += viscForce * (this.velocities[j3] - this.velocities[i3]);
          accelY[i] += viscForce * (this.velocities[j3 + 1] - this.velocities[i3 + 1]);
          accelZ[i] += viscForce * (this.velocities[j3 + 2] - this.velocities[i3 + 2]);
        }
      }
    }
  }

  private applyVortexForce(
    i: number,
    accelX: Float32Array,
    accelY: Float32Array,
    accelZ: Float32Array
  ): void {
    if (this.vortexStrength === 0) return;

    const i3 = i * 3;
    const dx = this.positions[i3] - this.vortexCenter.x;
    const dy = this.positions[i3 + 1] - this.vortexCenter.y;
    const dz = this.positions[i3 + 2] - this.vortexCenter.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < this.vortexRadius && dist > 0.1) {
      const falloff = 1 - dist / this.vortexRadius;
      const strength = this.vortexStrength * falloff * falloff;

      const tangentX = -dz;
      const tangentZ = dx;
      const tangentLen = Math.sqrt(tangentX * tangentX + tangentZ * tangentZ) || 1;

      accelX[i] += (tangentX / tangentLen) * strength;
      accelZ[i] += (tangentZ / tangentLen) * strength;
      accelY[i] += dy * strength * 0.1;
    }
  }

  private applyExternalForceFields(
    i: number,
    accelX: Float32Array,
    accelY: Float32Array,
    accelZ: Float32Array
  ): void {
    const i3 = i * 3;

    for (const field of this.activeForceFields) {
      this.applySingleForceField(i, i3, field, 1, accelX, accelY, accelZ);
    }

    for (const decaying of this.decayingForceFields) {
      const strengthFactor = 1 - decaying.currentTime / decaying.decayTime;
      this.applySingleForceField(i, i3, decaying.data, strengthFactor, accelX, accelY, accelZ);
    }
  }

  private applySingleForceField(
    i: number,
    i3: number,
    field: ForceFieldData,
    strengthFactor: number,
    accelX: Float32Array,
    accelY: Float32Array,
    accelZ: Float32Array
  ): void {
    const dx = this.positions[i3] - field.position.x;
    const dy = this.positions[i3 + 1] - field.position.y;
    const dz = this.positions[i3 + 2] - field.position.z;
    const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

    if (dist < field.radius && dist > 0.01) {
      const falloff = 1 - dist / field.radius;
      const falloff2 = falloff * falloff;
      const strength = field.strength * falloff2 * strengthFactor;

      accelX[i] += field.direction.x * strength;
      accelY[i] += field.direction.y * strength;
      accelZ[i] += field.direction.z * strength;

      const pushStrength = strength * 0.3 * falloff;
      accelX[i] -= (dx / dist) * pushStrength;
      accelY[i] -= (dy / dist) * pushStrength;
      accelZ[i] -= (dz / dist) * pushStrength;
    }
  }

  private integrate(
    accelX: Float32Array,
    accelY: Float32Array,
    accelZ: Float32Array
  ): void {
    const substeps = 2;
    const subDt = this.dt / substeps;

    for (let step = 0; step < substeps; step++) {
      for (let i = 0; i < this.particleCount; i++) {
        const i3 = i * 3;

        this.velocities[i3] += accelX[i] * subDt;
        this.velocities[i3 + 1] += accelY[i] * subDt;
        this.velocities[i3 + 2] += accelZ[i] * subDt;

        const speed2 =
          this.velocities[i3] * this.velocities[i3] +
          this.velocities[i3 + 1] * this.velocities[i3 + 1] +
          this.velocities[i3 + 2] * this.velocities[i3 + 2];

        if (speed2 > this.maxVelocity * this.maxVelocity) {
          const invSpeed = this.maxVelocity / Math.sqrt(speed2);
          this.velocities[i3] *= invSpeed;
          this.velocities[i3 + 1] *= invSpeed;
          this.velocities[i3 + 2] *= invSpeed;
        }

        const damping = 0.998;
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
    const bounce = 0.3;
    const friction = 0.9;

    if (this.positions[i3] < this.bounds.minX) {
      this.positions[i3] = this.bounds.minX;
      this.velocities[i3] = -this.velocities[i3] * bounce;
      this.velocities[i3 + 1] *= friction;
      this.velocities[i3 + 2] *= friction;
    }
    if (this.positions[i3] > this.bounds.maxX) {
      this.positions[i3] = this.bounds.maxX;
      this.velocities[i3] = -this.velocities[i3] * bounce;
      this.velocities[i3 + 1] *= friction;
      this.velocities[i3 + 2] *= friction;
    }
    if (this.positions[i3 + 1] < this.bounds.minY) {
      this.positions[i3 + 1] = this.bounds.minY;
      this.velocities[i3 + 1] = -this.velocities[i3 + 1] * bounce;
      this.velocities[i3] *= friction;
      this.velocities[i3 + 2] *= friction;
    }
    if (this.positions[i3 + 1] > this.bounds.maxY) {
      this.positions[i3 + 1] = this.bounds.maxY;
      this.velocities[i3 + 1] = -this.velocities[i3 + 1] * bounce;
      this.velocities[i3] *= friction;
      this.velocities[i3 + 2] *= friction;
    }
    if (this.positions[i3 + 2] < this.bounds.minZ) {
      this.positions[i3 + 2] = this.bounds.minZ;
      this.velocities[i3 + 2] = -this.velocities[i3 + 2] * bounce;
      this.velocities[i3] *= friction;
      this.velocities[i3 + 1] *= friction;
    }
    if (this.positions[i3 + 2] > this.bounds.maxZ) {
      this.positions[i3 + 2] = this.bounds.maxZ;
      this.velocities[i3 + 2] = -this.velocities[i3 + 2] * bounce;
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
    const clampedDt = Math.min(deltaTime, this.dt * 2);
    this.dt = clampedDt;

    this.updateDecayingForceFields(deltaTime);

    this.buildSpatialHash();

    const accelX = new Float32Array(this.particleCount);
    const accelY = new Float32Array(this.particleCount);
    const accelZ = new Float32Array(this.particleCount);

    this.computeDensityPressure();
    this.computeForces(accelX, accelY, accelZ);
    this.integrate(accelX, accelY, accelZ);

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
  }
}
