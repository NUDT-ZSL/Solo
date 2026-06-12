export type BuildingType = 'empty' | 'residential' | 'commercial' | 'industrial' | 'road';

export type BuildingState = 'normal' | 'ruin' | 'repairing' | 'constructing';

export type EventType = 'earthquake' | 'celebration' | 'prosperity';

export interface Building {
  type: BuildingType;
  state: BuildingState;
  level: number;
  constructProgress: number;
  repairProgress: number;
  x: number;
  y: number;
  height: number;
  windowsLit: boolean;
}

export interface Vehicle {
  id: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  color: string;
  speed: number;
  path: { x: number; y: number }[];
  pathIndex: number;
}

export interface GameStats {
  population: number;
  tax: number;
  satisfaction: number;
  energy: number;
  maxEnergy: number;
}

type SaveCallback = (data: unknown) => void;
type LoadCallback = (data: unknown) => void;

const GRID_SIZE = 30;
const DAY_CYCLE_SECONDS = 30;
const VEHICLE_UPDATE_INTERVAL = 0.1;
const VEHICLE_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c', '#e67e22'];

export class CityEngine {
  private grid: Building[][] = [];
  private vehicles: Vehicle[] = [];
  private stats: GameStats = {
    population: 0,
    tax: 0,
    satisfaction: 70,
    energy: 100,
    maxEnergy: 100,
  };
  private timeOfDay = 6;
  private vehicleIdCounter = 0;
  private vehicleAccumulator = 0;
  private populationAccumulator = 0;
  private taxAccumulator = 0;
  private saveCallback: SaveCallback | null = null;
  private loadCallback: LoadCallback | null = null;
  private eventActive: EventType | null = null;
  private eventTimer = 0;

  constructor() {
    this.initGrid();
  }

  initGrid(): void {
    this.grid = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      const row: Building[] = [];
      for (let x = 0; x < GRID_SIZE; x++) {
        row.push(this.createEmptyBuilding(x, y));
      }
      this.grid.push(row);
    }
  }

  private createEmptyBuilding(x: number, y: number): Building {
    return {
      type: 'empty',
      state: 'normal',
      level: 0,
      constructProgress: 0,
      repairProgress: 0,
      x,
      y,
      height: 0,
      windowsLit: false,
    };
  }

  buildAt(x: number, y: number, type: BuildingType): boolean {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
    if (this.grid[y][x].type !== 'empty') return false;

    const building: Building = {
      type,
      state: 'constructing',
      level: 1,
      constructProgress: 0,
      repairProgress: 0,
      x,
      y,
      height: this.getBuildingHeight(type),
      windowsLit: false,
    };
    this.grid[y][x] = building;
    return true;
  }

  private getBuildingHeight(type: BuildingType): number {
    switch (type) {
      case 'residential': return 3;
      case 'commercial': return 4;
      case 'industrial': return 2;
      case 'road': return 0;
      default: return 0;
    }
  }

  upgradeRoad(x: number, y: number): boolean {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
    const building = this.grid[y][x];
    if (building.type !== 'road') return false;
    if (building.level >= 2) return false;

    building.level = 2;
    building.height = 1;
    return true;
  }

  repairBuilding(x: number, y: number): boolean {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return false;
    const building = this.grid[y][x];
    if (building.state !== 'ruin') return false;

    building.state = 'repairing';
    building.repairProgress = 0;
    return true;
  }

  update(deltaTime: number): void {
    this.updateDayNightCycle(deltaTime);
    this.updateBuildings(deltaTime);
    this.updateVehicles(deltaTime);
    this.updateStats(deltaTime);
    this.updateEvent(deltaTime);
    this.updateWindowsLit();
  }

  private updateDayNightCycle(deltaTime: number): void {
    const hoursPerSecond = 24 / DAY_CYCLE_SECONDS;
    this.timeOfDay = (this.timeOfDay + deltaTime * hoursPerSecond) % 24;
  }

  private updateBuildings(deltaTime: number): void {
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const building = this.grid[y][x];
        if (building.state === 'constructing') {
          building.constructProgress += deltaTime * 0.5;
          if (building.constructProgress >= 1) {
            building.constructProgress = 1;
            building.state = 'normal';
          }
        } else if (building.state === 'repairing') {
          building.repairProgress += deltaTime * 0.3;
          if (building.repairProgress >= 1) {
            building.repairProgress = 1;
            building.state = 'normal';
          }
        }
      }
    }
  }

  private updateVehicles(deltaTime: number): void {
    this.vehicleAccumulator += deltaTime;

    if (this.vehicleAccumulator >= VEHICLE_UPDATE_INTERVAL) {
      this.vehicleAccumulator = 0;
      this.spawnVehicles();
      this.moveVehicles();
      this.cleanupVehicles();
    }
  }

  private getRoadPositions(): { x: number; y: number }[] {
    const roads: { x: number; y: number }[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.grid[y][x].type === 'road' && this.grid[y][x].state === 'normal') {
          roads.push({ x, y });
        }
      }
    }
    return roads;
  }

  private spawnVehicles(): void {
    const roads = this.getRoadPositions();
    if (roads.length < 2) return;
    if (this.vehicles.length >= 50) return;

    if (Math.random() < 0.3) {
      const startIdx = Math.floor(Math.random() * roads.length);
      let endIdx = Math.floor(Math.random() * roads.length);
      while (endIdx === startIdx) {
        endIdx = Math.floor(Math.random() * roads.length);
      }

      const start = roads[startIdx];
      const end = roads[endIdx];
      const path = this.bfsPath(start.x, start.y, end.x, end.y);

      if (path.length > 0) {
        const color = VEHICLE_COLORS[Math.floor(Math.random() * VEHICLE_COLORS.length)];
        const vehicle: Vehicle = {
          id: this.vehicleIdCounter++,
          x: start.x,
          y: start.y,
          targetX: end.x,
          targetY: end.y,
          color,
          speed: 1 + Math.random() * 0.5,
          path,
          pathIndex: 0,
        };
        this.vehicles.push(vehicle);
      }
    }
  }

  private bfsPath(startX: number, startY: number, endX: number, endY: number): { x: number; y: number }[] {
    if (startX === endX && startY === endY) return [];

    const visited = new Set<string>();
    const queue: { x: number; y: number; path: { x: number; y: number }[] }[] = [];
    const key = (x: number, y: number) => `${x},${y}`;

    queue.push({ x: startX, y: startY, path: [{ x: startX, y: startY }] });
    visited.add(key(startX, startY));

    const directions = [
      { dx: 0, dy: -1 },
      { dx: 0, dy: 1 },
      { dx: -1, dy: 0 },
      { dx: 1, dy: 0 },
    ];

    while (queue.length > 0) {
      const current = queue.shift()!;

      for (const dir of directions) {
        const nx = current.x + dir.dx;
        const ny = current.y + dir.dy;
        const nKey = key(nx, ny);

        if (nx < 0 || nx >= GRID_SIZE || ny < 0 || ny >= GRID_SIZE) continue;
        if (visited.has(nKey)) continue;
        if (this.grid[ny][nx].type !== 'road') continue;
        if (this.grid[ny][nx].state !== 'normal') continue;

        const newPath = [...current.path, { x: nx, y: ny }];

        if (nx === endX && ny === endY) {
          return newPath;
        }

        visited.add(nKey);
        queue.push({ x: nx, y: ny, path: newPath });
      }
    }

    return [];
  }

  private moveVehicles(): void {
    for (const vehicle of this.vehicles) {
      if (vehicle.pathIndex < vehicle.path.length - 1) {
        vehicle.pathIndex++;
        vehicle.x = vehicle.path[vehicle.pathIndex].x;
        vehicle.y = vehicle.path[vehicle.pathIndex].y;
      }
    }
  }

  private cleanupVehicles(): void {
    this.vehicles = this.vehicles.filter(
      (v) => v.pathIndex < v.path.length - 1
    );
  }

  getCongestedRoads(): { x: number; y: number; count: number }[] {
    const roadCounts = new Map<string, { x: number; y: number; count: number }>();

    for (const vehicle of this.vehicles) {
      const key = `${vehicle.x},${vehicle.y}`;
      if (!roadCounts.has(key)) {
        roadCounts.set(key, { x: vehicle.x, y: vehicle.y, count: 0 });
      }
      roadCounts.get(key)!.count++;
    }

    return Array.from(roadCounts.values()).filter((r) => r.count > 5);
  }

  private updateStats(deltaTime: number): void {
    const residentialCount = this.countBuildingType('residential', 'normal');
    const commercialCount = this.countBuildingType('commercial', 'normal');
    const industrialCount = this.countBuildingType('industrial', 'normal');
    const totalBuildings = residentialCount + commercialCount + industrialCount;

    this.populationAccumulator += deltaTime;
    if (this.populationAccumulator >= 1) {
      this.populationAccumulator -= 1;
      if (residentialCount > 0) {
        const growth = Math.min(10, Math.max(1, Math.floor(residentialCount * 0.5)));
        this.stats.population += growth;
      }
    }

    this.taxAccumulator += deltaTime;
    if (this.taxAccumulator >= 1) {
      this.taxAccumulator -= 1;
      this.stats.tax += residentialCount * 0.1;
    }

    const energyConsumption = industrialCount * 2 + commercialCount * 1 + residentialCount * 0.5;
    this.stats.maxEnergy = Math.max(100, industrialCount * 10 + commercialCount * 5);
    this.stats.energy = this.stats.maxEnergy - energyConsumption;
    if (this.stats.energy < 0) this.stats.energy = 0;

    const congestedRoads = this.getCongestedRoads().length;
    const trafficPenalty = congestedRoads * 2;
    const residentialRatio = totalBuildings > 0 ? residentialCount / totalBuildings : 0;
    const satisfactionBonus = residentialRatio * 20;
    const randomFactor = (Math.random() - 0.5) * 5;

    this.stats.satisfaction = Math.max(
      0,
      Math.min(100, 70 - trafficPenalty + satisfactionBonus + randomFactor)
    );
  }

  private countBuildingType(type: BuildingType, state: BuildingState): number {
    let count = 0;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        if (this.grid[y][x].type === type && this.grid[y][x].state === state) {
          count++;
        }
      }
    }
    return count;
  }

  private updateEvent(deltaTime: number): void {
    if (this.eventActive) {
      this.eventTimer -= deltaTime;
      if (this.eventTimer <= 0) {
        this.eventActive = null;
      }
    } else {
      if (Math.random() < 0.0001) {
        const events: EventType[] = ['earthquake', 'celebration', 'prosperity'];
        const event = events[Math.floor(Math.random() * events.length)];
        this.triggerEvent(event);
      }
    }
  }

  triggerEvent(type: EventType): void {
    this.eventActive = type;

    switch (type) {
      case 'earthquake':
        this.eventTimer = 5;
        this.triggerEarthquake();
        break;
      case 'celebration':
        this.eventTimer = 10;
        this.triggerCelebration();
        break;
      case 'prosperity':
        this.eventTimer = 30;
        this.triggerProsperity();
        break;
    }
  }

  private triggerEarthquake(): void {
    const buildings: { x: number; y: number }[] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const b = this.grid[y][x];
        if (b.type !== 'empty' && b.type !== 'road' && b.state === 'normal') {
          buildings.push({ x, y });
        }
      }
    }

    const count = Math.min(buildings.length, 5 + Math.floor(Math.random() * 4));
    for (let i = 0; i < count; i++) {
      const idx = Math.floor(Math.random() * buildings.length);
      const pos = buildings.splice(idx, 1)[0];
      this.grid[pos.y][pos.x].state = 'ruin';
    }
  }

  private triggerCelebration(): void {
    this.stats.satisfaction = Math.min(100, this.stats.satisfaction + 15);
  }

  private triggerProsperity(): void {
    this.stats.tax += 50;
    this.stats.satisfaction = Math.min(100, this.stats.satisfaction + 10);
  }

  private updateWindowsLit(): void {
    const isNight = this.timeOfDay < 6 || this.timeOfDay >= 18;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const building = this.grid[y][x];
        if (building.state === 'normal' && building.type !== 'empty' && building.type !== 'road') {
          building.windowsLit = isNight;
        } else {
          building.windowsLit = false;
        }
      }
    }
  }

  getGrid(): Building[][] {
    return this.grid;
  }

  getVehicles(): Vehicle[] {
    return this.vehicles;
  }

  getStats(): GameStats {
    return { ...this.stats };
  }

  getTimeOfDay(): number {
    return this.timeOfDay;
  }

  getSunAngle(): number {
    const normalizedTime = (this.timeOfDay - 6) / 12;
    const angle = normalizedTime * Math.PI;
    return Math.max(0, Math.min(Math.PI, angle));
  }

  getCurrentEvent(): EventType | null {
    return this.eventActive;
  }

  onSave(callback: SaveCallback): void {
    this.saveCallback = callback;
  }

  onLoad(callback: LoadCallback): void {
    this.loadCallback = callback;
  }

  save(): void {
    if (!this.saveCallback) return;

    const data = {
      grid: this.grid,
      stats: this.stats,
      timeOfDay: this.timeOfDay,
      vehicles: this.vehicles,
      vehicleIdCounter: this.vehicleIdCounter,
    };
    this.saveCallback(data);
  }

  load(data: unknown): void {
    if (!this.loadCallback) return;

    if (this.isSaveData(data)) {
      this.grid = data.grid;
      this.stats = data.stats;
      this.timeOfDay = data.timeOfDay;
      this.vehicles = data.vehicles;
      this.vehicleIdCounter = data.vehicleIdCounter;
    }
    this.loadCallback(data);
  }

  private isSaveData(data: unknown): data is {
    grid: Building[][];
    stats: GameStats;
    timeOfDay: number;
    vehicles: Vehicle[];
    vehicleIdCounter: number;
  } {
    if (typeof data !== 'object' || data === null) return false;
    const d = data as Record<string, unknown>;
    return (
      Array.isArray(d.grid) &&
      typeof d.stats === 'object' &&
      d.stats !== null &&
      typeof d.timeOfDay === 'number' &&
      Array.isArray(d.vehicles) &&
      typeof d.vehicleIdCounter === 'number'
    );
  }

  getGridSize(): number {
    return GRID_SIZE;
  }
}
