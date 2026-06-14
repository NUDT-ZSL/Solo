import * as THREE from 'three';
import EventBus from './eventBus';

export interface Building {
  position: THREE.Vector3;
  width: number;
  depth: number;
  height: number;
  color: number;
  isHeatSource: boolean;
}

export interface StreamLine {
  positions: THREE.Vector3[];
  velocities: THREE.Vector3[];
  life: number;
  maxLife: number;
}

export interface SimulationParams {
  heatSourceIntensity: number;
  vortexDensity: number;
  displayMode: 'heatmap' | 'streamlines' | 'both';
}

export class SimulationModule {
  private eventBus: EventBus;

  public gridSize: number = 50;
  public gridResolution: number = 50;
  public heatGrid: Float32Array;

  public buildings: Building[] = [];
  public streamLines: StreamLine[] = [];

  public params: SimulationParams = {
    heatSourceIntensity: 50,
    vortexDensity: 150,
    displayMode: 'both',
  };

  private time: number = 0;
  private lastUpdateTime: number = 0;
  private updateInterval: number = 1 / 30;

  constructor(eventBus: EventBus) {
    this.eventBus = eventBus;
    this.heatGrid = new Float32Array(this.gridResolution * this.gridResolution);
  }

  public initialize(): void {
    this.generateBuildings();
    this.generateStreamLines();
    this.updateHeatGrid();
    this.setupEventListeners();
  }

  public start(): void {
    this.broadcastSimulationData();
  }

  private setupEventListeners(): void {
    this.eventBus.on('params:changed', (params: Partial<SimulationParams>) => {
      this.updateParams(params);
    });
  }

  public updateParams(params: Partial<SimulationParams>): void {
    const oldDensity = this.params.vortexDensity;
    this.params = { ...this.params, ...params };

    if (params.vortexDensity !== undefined && params.vortexDensity !== oldDensity) {
      this.updateStreamLineCount();
    }

    this.updateHeatGrid();
    this.broadcastSimulationData();
  }

  private generateBuildings(): void {
    const numBuildings = 25;
    const colorStart = new THREE.Color(0xd4a373);
    const colorEnd = new THREE.Color(0xa47148);

    for (let i = 0; i < numBuildings; i++) {
      const x = (Math.random() - 0.5) * this.gridSize * 0.8;
      const z = (Math.random() - 0.5) * this.gridSize * 0.8;
      const width = 3 + Math.random() * 6;
      const depth = 3 + Math.random() * 6;
      const height = 3 + Math.random() * 27;
      const t = Math.random();
      const color = new THREE.Color().lerpColors(colorStart, colorEnd, t);

      this.buildings.push({
        position: new THREE.Vector3(x, height / 2, z),
        width,
        depth,
        height,
        color: color.getHex(),
        isHeatSource: Math.random() > 0.3,
      });
    }
  }

  private generateStreamLines(): void {
    this.streamLines = [];
    const count = Math.floor(this.params.vortexDensity);

    for (let i = 0; i < count; i++) {
      const positions: THREE.Vector3[] = [];
      const velocities: THREE.Vector3[] = [];
      const startPos = new THREE.Vector3(
        (Math.random() - 0.5) * this.gridSize * 0.9,
        2 + Math.random() * 15,
        (Math.random() - 0.5) * this.gridSize * 0.9
      );

      for (let j = 0; j < 20; j++) {
        positions.push(startPos.clone());
        velocities.push(new THREE.Vector3(0, 0, 0));
      }

      this.streamLines.push({
        positions,
        velocities,
        life: Math.random() * 5,
        maxLife: 5 + Math.random() * 5,
      });
    }
  }

  private updateStreamLineCount(): void {
    const targetCount = Math.floor(this.params.vortexDensity);
    const currentCount = this.streamLines.length;

    if (targetCount > currentCount) {
      for (let i = currentCount; i < targetCount; i++) {
        const positions: THREE.Vector3[] = [];
        const velocities: THREE.Vector3[] = [];
        const startPos = new THREE.Vector3(
          (Math.random() - 0.5) * this.gridSize * 0.9,
          2 + Math.random() * 15,
          (Math.random() - 0.5) * this.gridSize * 0.9
        );

        for (let j = 0; j < 20; j++) {
          positions.push(startPos.clone());
          velocities.push(new THREE.Vector3(0, 0, 0));
        }

        this.streamLines.push({
          positions,
          velocities,
          life: Math.random() * 5,
          maxLife: 5 + Math.random() * 5,
        });
      }
    } else if (targetCount < currentCount) {
      this.streamLines = this.streamLines.slice(0, targetCount);
    }
  }

  private updateHeatGrid(): void {
    const intensity = this.params.heatSourceIntensity / 50;
    const cellSize = this.gridSize / this.gridResolution;

    for (let i = 0; i < this.heatGrid.length; i++) {
      this.heatGrid[i] = 0.1;
    }

    for (const building of this.buildings) {
      if (!building.isHeatSource) continue;

      const gridX = Math.floor((building.position.x + this.gridSize / 2) / cellSize);
      const gridZ = Math.floor((building.position.z + this.gridSize / 2) / cellSize);
      const heatStrength = (building.height / 30) * intensity * 0.8;
      const radius = 5 + building.height / 5;
      const gridRadius = Math.ceil(radius / cellSize);

      for (let dz = -gridRadius; dz <= gridRadius; dz++) {
        for (let dx = -gridRadius; dx <= gridRadius; dx++) {
          const gx = gridX + dx;
          const gz = gridZ + dz;

          if (gx < 0 || gx >= this.gridResolution || gz < 0 || gz >= this.gridResolution) continue;

          const dist = Math.sqrt(dx * dx + dz * dz) * cellSize;
          if (dist > radius) continue;

          const falloff = 1 - dist / radius;
          const idx = gz * this.gridResolution + gx;
          this.heatGrid[idx] += heatStrength * falloff * falloff;
        }
      }
    }

    this.diffuseHeat(3);

    for (let i = 0; i < this.heatGrid.length; i++) {
      this.heatGrid[i] = Math.min(1, Math.max(0, this.heatGrid[i]));
    }
  }

  private diffuseHeat(iterations: number): void {
    const temp = new Float32Array(this.heatGrid.length);
    const diff = 0.2;

    for (let iter = 0; iter < iterations; iter++) {
      temp.set(this.heatGrid);

      for (let z = 1; z < this.gridResolution - 1; z++) {
        for (let x = 1; x < this.gridResolution - 1; x++) {
          const idx = z * this.gridResolution + x;
          const neighbors =
            temp[idx - 1] +
            temp[idx + 1] +
            temp[idx - this.gridResolution] +
            temp[idx + this.gridResolution];
          this.heatGrid[idx] = temp[idx] + diff * (neighbors / 4 - temp[idx]);
        }
      }
    }
  }

  private updateStreamLines(deltaTime: number): void {
    const speedMultiplier = 0.5 + (this.params.vortexDensity / 300) * 1.5;
    const halfSize = this.gridSize / 2;

    for (const line of this.streamLines) {
      line.life += deltaTime;

      if (line.life >= line.maxLife) {
        line.life = 0;
        const startPos = new THREE.Vector3(
          (Math.random() - 0.5) * this.gridSize * 0.9,
          2 + Math.random() * 15,
          (Math.random() - 0.5) * this.gridSize * 0.9
        );
        for (let i = 0; i < line.positions.length; i++) {
          line.positions[i].copy(startPos);
          line.velocities[i].set(0, 0, 0);
        }
        continue;
      }

      for (let i = line.positions.length - 1; i > 0; i--) {
        line.positions[i].copy(line.positions[i - 1]);
      }

      const head = line.positions[0];
      const velocity = this.getFlowVelocity(head, speedMultiplier);
      head.add(velocity.clone().multiplyScalar(deltaTime));

      if (head.x > halfSize) head.x = -halfSize;
      if (head.x < -halfSize) head.x = halfSize;
      if (head.z > halfSize) head.z = -halfSize;
      if (head.z < -halfSize) head.z = halfSize;
      if (head.y < 1) head.y = 1;
      if (head.y > 30) head.y = 30;
    }
  }

  private getFlowVelocity(position: THREE.Vector3, multiplier: number): THREE.Vector3 {
    const time = this.time;
    const x = position.x;
    const y = position.y;
    const z = position.z;

    const vortex1 = new THREE.Vector2(-15, -15);
    const vortex2 = new THREE.Vector2(15, 15);
    const vortex3 = new THREE.Vector2(0, 20);
    const vortex4 = new THREE.Vector2(-20, 10);

    let vx = 0;
    let vz = 0;

    vx += this.vortexContribution(new THREE.Vector2(x, z), vortex1, 8, true).x;
    vz += this.vortexContribution(new THREE.Vector2(x, z), vortex1, 8, true).y;

    vx += this.vortexContribution(new THREE.Vector2(x, z), vortex2, 6, false).x;
    vz += this.vortexContribution(new THREE.Vector2(x, z), vortex2, 6, false).y;

    vx += this.vortexContribution(new THREE.Vector2(x, z), vortex3, 5, true).x;
    vz += this.vortexContribution(new THREE.Vector2(x, z), vortex3, 5, true).y;

    vx += this.vortexContribution(new THREE.Vector2(x, z), vortex4, 7, false).x;
    vz += this.vortexContribution(new THREE.Vector2(x, z), vortex4, 7, false).y;

    const heatLift = this.getHeatAtPosition(x, z) * 2;
    const vy = heatLift + Math.sin(time * 0.5 + y * 0.2) * 0.3;

    vx += Math.sin(time * 0.3 + z * 0.1) * 0.5;
    vz += Math.cos(time * 0.25 + x * 0.1) * 0.5;

    return new THREE.Vector3(vx * multiplier, vy * multiplier, vz * multiplier);
  }

  private vortexContribution(
    point: THREE.Vector2,
    center: THREE.Vector2,
    strength: number,
    clockwise: boolean
  ): THREE.Vector2 {
    const dx = point.x - center.x;
    const dy = point.y - center.y;
    const distSq = dx * dx + dy * dy;
    const dist = Math.sqrt(distSq);

    if (dist < 1) return new THREE.Vector2(0, 0);

    const factor = strength / (distSq * 0.1 + dist);
    const direction = clockwise ? 1 : -1;

    return new THREE.Vector2(-dy * factor * direction, dx * factor * direction);
  }

  private getHeatAtPosition(x: number, z: number): number {
    const cellSize = this.gridSize / this.gridResolution;
    const gx = Math.floor((x + this.gridSize / 2) / cellSize);
    const gz = Math.floor((z + this.gridSize / 2) / cellSize);

    if (gx < 0 || gx >= this.gridResolution || gz < 0 || gz >= this.gridResolution) {
      return 0;
    }

    return this.heatGrid[gz * this.gridResolution + gx];
  }

  public getTemperatureAtPosition(x: number, z: number): number {
    const heat = this.getHeatAtPosition(x, z);
    const baseTemp = 20;
    const maxTempDelta = 25;
    return baseTemp + heat * maxTempDelta;
  }

  public update(deltaTime: number): void {
    this.time += deltaTime;

    this.updateStreamLines(deltaTime);

    if (this.time - this.lastUpdateTime >= this.updateInterval) {
      this.lastUpdateTime = this.time;
      this.eventBus.emit('simulation:streamlinesUpdated', this.streamLines);
    }
  }

  private broadcastSimulationData(): void {
    this.eventBus.emit('simulation:heatGridUpdated', {
      heatGrid: this.heatGrid,
      gridSize: this.gridSize,
      gridResolution: this.gridResolution,
    });
    this.eventBus.emit('simulation:buildingsUpdated', this.buildings);
    this.eventBus.emit('simulation:streamlinesUpdated', this.streamLines);
    this.eventBus.emit('simulation:paramsUpdated', this.params);
  }

  public getGridSize(): number {
    return this.gridSize;
  }

  public getGridResolution(): number {
    return this.gridResolution;
  }
}

export default SimulationModule;
