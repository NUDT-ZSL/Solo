import { v4 as uuidv4 } from 'uuid';
import type {
  Species,
  Coral,
  Fish,
  Plant,
  EnvironmentParams,
  EcoMetrics,
  EcoEvent,
  School,
  Symbiosis,
  Position,
  Boid,
  EcosystemState,
} from './types';

export interface CoralGrowthParams {
  lightCoefficient: number;
  currentCoefficient: number;
  nutrientCoefficient: number;
  symbiosisBonus: number;
  saturationPoint: number;
  inhibitionThreshold: number;
}

export class EcoEngine {
  private state: EcosystemState;
  private eventListeners: Set<(state: EcosystemState) => void>;
  private lastUpdate: number;
  private readonly GRID_SIZE = 20;
  private readonly MAX_PARTICLES = 5000;
  private readonly BASE_PARTICLES = 1000;
  private coralGrowthParams: CoralGrowthParams;

  constructor() {
    this.eventListeners = new Set();
    this.lastUpdate = Date.now();
    this.coralGrowthParams = {
      lightCoefficient: 0.35,
      currentCoefficient: 0.25,
      nutrientCoefficient: 0.4,
      symbiosisBonus: 1.3,
      saturationPoint: 0.7,
      inhibitionThreshold: 90,
    };
    this.state = this.initializeState();
  }

  private initializeState(): EcosystemState {
    const species = new Map<string, Species>();
    const schools = new Map<string, School>();

    const environment: EnvironmentParams = {
      lightIntensity: 0.5,
      currentSpeed: 0.5,
      nutrientLevel: 50,
      temperature: 26,
    };

    const metrics: EcoMetrics = {
      biodiversity: 0.7,
      populationDensity: 0.6,
      waterHealth: 0.8,
      coralCoverage: 0.4,
    };

    const currentField = this.generateCurrentField();
    const symbioses: Symbiosis[] = [];

    return {
      species,
      schools,
      environment,
      metrics,
      events: [],
      symbioses,
      currentField,
    };
  }

  private generateCurrentField(): Position[][] {
    const field: Position[][] = [];
    const angleOffset = Math.random() * Math.PI * 2;
    const centerX = this.GRID_SIZE / 2;
    const centerZ = this.GRID_SIZE / 2;

    for (let x = 0; x < this.GRID_SIZE; x++) {
      field[x] = [];
      for (let z = 0; z < this.GRID_SIZE; z++) {
        const dx = x - centerX;
        const dz = z - centerZ;
        const dist = Math.sqrt(dx * dx + dz * dz);
        const maxDist = this.GRID_SIZE / 2;

        const rotationAngle = Math.atan2(dz, dx) + Math.PI / 2 + angleOffset;
        const radialSpeed = 0.2 + Math.random() * 0.3;
        const distFactor = Math.min(1, dist / maxDist);

        field[x][z] = {
          x: Math.cos(rotationAngle) * radialSpeed * distFactor,
          y: (Math.random() - 0.5) * 0.1 + Math.sin(x * 0.5 + z * 0.3) * 0.05,
          z: Math.sin(rotationAngle) * radialSpeed * distFactor,
        };
      }
    }
    return field;
  }

  public getCurrentAtPosition(x: number, z: number): Position {
    const gx = Math.floor(
      Math.max(0, Math.min(this.GRID_SIZE - 1, x + this.GRID_SIZE / 2))
    );
    const gz = Math.floor(
      Math.max(0, Math.min(this.GRID_SIZE - 1, z + this.GRID_SIZE / 2))
    );
    const base = this.state.currentField[gx]?.[gz] || { x: 0, y: 0, z: 0 };
    const mult = this.state.environment.currentSpeed;
    return { x: base.x * mult, y: base.y * mult, z: base.z * mult };
  }

  public initializeSpecies(speciesData: Species[]): void {
    this.state.species.clear();
    this.state.schools.clear();

    const schoolMap = new Map<string, Fish[]>();

    speciesData.forEach((s) => {
      const id = s.id || uuidv4();
      const species = { ...s, id };
      this.state.species.set(id, species);

      if (species.speciesType === 'fish') {
        const fish = species as Fish;
        if (!schoolMap.has(fish.schoolId)) {
          schoolMap.set(fish.schoolId, []);
        }
        schoolMap.get(fish.schoolId)!.push(fish);
      }
    });

    schoolMap.forEach((fishes, schoolId) => {
      const school: School = {
        id: schoolId,
        name: fishes[0].name,
        fishIds: fishes.map((f) => f.id),
        center: this.calculateSchoolCenter(fishes),
        averageVelocity: { x: 0, y: 0, z: 0 },
        boids: fishes.map((f) => ({
          position: { ...f.position },
          velocity: {
            x: (Math.random() - 0.5) * 2,
            y: (Math.random() - 0.5) * 0.5,
            z: (Math.random() - 0.5) * 2,
          },
          acceleration: { x: 0, y: 0, z: 0 },
        })),
        color: this.getSchoolColor(fishes[0].name),
      };
      this.state.schools.set(schoolId, school);
    });

    this.initializeSymbioses();
    this.updateMetrics();
    this.notifyListeners();
  }

  private getSchoolColor(name: string): string {
    const colors: Record<string, string> = {
      小丑鱼: '#FF6B35',
      蓝唐王鱼: '#4A90D9',
      蝴蝶鱼: '#FFD93D',
      神仙鱼: '#9B59B6',
      石斑鱼: '#34495E',
    };
    return colors[name] || '#00FF88';
  }

  private initializeSymbioses(): void {
    const corals = Array.from(this.state.species.values()).filter(
      (s) => s.speciesType === 'coral'
    ) as Coral[];
    const clownfishIds = Array.from(this.state.species.values())
      .filter((s) => s.speciesType === 'fish' && s.name === '小丑鱼')
      .map((s) => s.id);

    clownfishIds.forEach((fishId, index) => {
      if (corals[index]) {
        this.state.symbioses.push({
          speciesA: fishId,
          speciesB: corals[index].id,
          type: 'mutualism',
          benefitMultiplier: 1.3,
        });
      }
    });
  }

  private calculateSchoolCenter(fishes: Fish[]): Position {
    if (fishes.length === 0) return { x: 0, y: 0, z: 0 };
    const sum = fishes.reduce(
      (acc, f) => ({
        x: acc.x + f.position.x,
        y: acc.y + f.position.y,
        z: acc.z + f.position.z,
      }),
      { x: 0, y: 0, z: 0 }
    );
    return {
      x: sum.x / fishes.length,
      y: sum.y / fishes.length,
      z: sum.z / fishes.length,
    };
  }

  public setEnvironment(params: Partial<EnvironmentParams>): void {
    this.state.environment = { ...this.state.environment, ...params };
    this.state.currentField = this.generateCurrentField();
    this.notifyListeners();
  }

  public getEnvironment(): EnvironmentParams {
    return { ...this.state.environment };
  }

  public update(deltaTime?: number): void {
    const now = Date.now();
    const dt = deltaTime ?? (now - this.lastUpdate) / 1000;
    this.lastUpdate = now;

    this.updateCorals(dt);
    this.updateFish(dt);
    this.updatePlants(dt);
    this.updateSymbiosisEffects();
    this.updateMetrics();
    this.checkCriticalEvents();
    this.notifyListeners();
  }

  private updateCorals(dt: number): void {
    const { lightIntensity, currentSpeed, nutrientLevel } = this.state.environment;
    const {
      lightCoefficient,
      currentCoefficient,
      nutrientCoefficient,
      saturationPoint,
      inhibitionThreshold,
    } = this.coralGrowthParams;

    this.state.species.forEach((s) => {
      if (s.speciesType !== 'coral') return;
      const coral = s as Coral;

      const symbiosisBonus = this.getSymbiosisBonus(coral.id);

      const lightFactor = this.calculateNonLinearFactor(
        lightIntensity,
        lightCoefficient,
        saturationPoint
      );

      const currentFactor = this.calculateNonLinearFactor(
        currentSpeed,
        currentCoefficient,
        saturationPoint
      );

      const nutrientNormalized = nutrientLevel / 100;
      let nutrientFactor: number;
      if (nutrientLevel < inhibitionThreshold) {
        nutrientFactor = this.calculateNonLinearFactor(
          nutrientNormalized,
          nutrientCoefficient,
          saturationPoint
        );
      } else {
        const excess = (nutrientLevel - inhibitionThreshold) / (100 - inhibitionThreshold);
        nutrientFactor = Math.max(0, 1 - excess * 2) * nutrientCoefficient;
      }

      const baseGrowth =
        (lightFactor + currentFactor + nutrientFactor) / 3 * symbiosisBonus;

      const densityFactor = 1 - coral.coverage * 0.3;
      const growthRate = baseGrowth * densityFactor;

      coral.age += dt;
      coral.growthRate = Math.max(0, growthRate * 0.02 * dt);
      coral.size = Math.min(3, coral.size + coral.growthRate * coral.size);
      coral.coverage = Math.min(1, coral.coverage + coral.growthRate * 0.08);

      const healthChange = (baseGrowth - 0.35) * dt * 8;
      coral.health = Math.max(0, Math.min(100, coral.health + healthChange));
    });
  }

  private calculateNonLinearFactor(
    value: number,
    coefficient: number,
    saturationPoint: number
  ): number {
    if (value <= saturationPoint) {
      const normalized = value / saturationPoint;
      return coefficient * (1 - Math.exp(-normalized * 3));
    } else {
      const excess = (value - saturationPoint) / (1 - saturationPoint);
      return coefficient * (1 - excess * 0.3);
    }
  }

  private getSymbiosisBonus(speciesId: string): number {
    const symbiosis = this.state.symbioses.find(
      (s) => s.speciesA === speciesId || s.speciesB === speciesId
    );
    return symbiosis ? symbiosis.benefitMultiplier : 1.0;
  }

  private updateFish(dt: number): void {
    this.state.schools.forEach((school) => {
      this.updateBoids(school, dt);

      school.fishIds.forEach((fishId, index) => {
        const fish = this.state.species.get(fishId) as Fish;
        if (!fish) return;

        const boid = school.boids[index];
        if (!boid) return;

        fish.position = { ...boid.position };
        fish.direction = this.normalize(boid.velocity);
        fish.age += dt;

        const speed = Math.sqrt(
          boid.velocity.x ** 2 + boid.velocity.y ** 2 + boid.velocity.z ** 2
        );
        fish.speed = speed;
      });

      const fishes = school.fishIds
        .map((id) => this.state.species.get(id) as Fish)
        .filter(Boolean);
      school.center = this.calculateSchoolCenter(fishes);

      if (school.boids.length > 0) {
        const avgVel = school.boids.reduce(
          (acc, b) => ({
            x: acc.x + b.velocity.x,
            y: acc.y + b.velocity.y,
            z: acc.z + b.velocity.z,
          }),
          { x: 0, y: 0, z: 0 }
        );
        school.averageVelocity = {
          x: avgVel.x / school.boids.length,
          y: avgVel.y / school.boids.length,
          z: avgVel.z / school.boids.length,
        };
      }
    });

    this.checkPredation();
    this.checkReproduction();
  }

  private updateBoids(school: School, dt: number): void {
    const boids = school.boids;
    const baseSpeed = 2;
    const speedMultiplier = this.state.environment.currentSpeed * 0.5 + 1;
    const maxSpeed = baseSpeed * speedMultiplier;
    const maxForce = 0.15;
    const neighborDist = 4;
    const separationDist = 1.5;
    const currentInfluence = 0.15;

    boids.forEach((boid, i) => {
      const alignment = { x: 0, y: 0, z: 0 };
      const cohesion = { x: 0, y: 0, z: 0 };
      const separation = { x: 0, y: 0, z: 0 };
      let alignmentCount = 0;
      let cohesionCount = 0;
      let separationCount = 0;

      boids.forEach((other, j) => {
        if (i === j) return;
        const dx = other.position.x - boid.position.x;
        const dy = other.position.y - boid.position.y;
        const dz = other.position.z - boid.position.z;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

        if (dist < neighborDist && dist > 0) {
          alignment.x += other.velocity.x;
          alignment.y += other.velocity.y;
          alignment.z += other.velocity.z;
          alignmentCount++;

          cohesion.x += other.position.x;
          cohesion.y += other.position.y;
          cohesion.z += other.position.z;
          cohesionCount++;

          if (dist < separationDist) {
            separation.x -= dx / dist;
            separation.y -= dy / dist;
            separation.z -= dz / dist;
            separationCount++;
          }
        }
      });

      if (alignmentCount > 0) {
        alignment.x /= alignmentCount;
        alignment.y /= alignmentCount;
        alignment.z /= alignmentCount;
        alignment.x = alignment.x * maxSpeed - boid.velocity.x;
        alignment.y = alignment.y * maxSpeed - boid.velocity.y;
        alignment.z = alignment.z * maxSpeed - boid.velocity.z;
        this.limit(alignment, maxForce);
      }

      if (cohesionCount > 0) {
        cohesion.x /= cohesionCount;
        cohesion.y /= cohesionCount;
        cohesion.z /= cohesionCount;
        const dx = cohesion.x - boid.position.x;
        const dy = cohesion.y - boid.position.y;
        const dz = cohesion.z - boid.position.z;
        cohesion.x = dx * maxSpeed - boid.velocity.x;
        cohesion.y = dy * maxSpeed - boid.velocity.y;
        cohesion.z = dz * maxSpeed - boid.velocity.z;
        this.limit(cohesion, maxForce * 0.6);
      }

      if (separationCount > 0) {
        separation.x /= separationCount;
        separation.y /= separationCount;
        separation.z /= separationCount;
        separation.x = separation.x * maxSpeed - boid.velocity.x;
        separation.y = separation.y * maxSpeed - boid.velocity.y;
        separation.z = separation.z * maxSpeed - boid.velocity.z;
        this.limit(separation, maxForce * 2);
      }

      const current = this.getCurrentAtPosition(boid.position.x, boid.position.z);

      const targetY = 3 + Math.sin(boid.position.x * 0.3 + boid.position.z * 0.2) * 2;
      const yDiff = targetY - boid.position.y;
      const verticalForce = yDiff * 0.02;

      const dtScaled = dt * 60;
      boid.acceleration.x +=
        (alignment.x * 1.0 +
          cohesion.x * 1.2 +
          separation.x * 1.8 +
          current.x * currentInfluence) *
        dtScaled;
      boid.acceleration.y +=
        (alignment.y * 0.8 +
          cohesion.y * 0.5 +
          separation.y * 1.5 +
          current.y * currentInfluence +
          verticalForce) *
        dtScaled;
      boid.acceleration.z +=
        (alignment.z * 1.0 +
          cohesion.z * 1.2 +
          separation.z * 1.8 +
          current.z * currentInfluence) *
        dtScaled;

      boid.velocity.x += boid.acceleration.x * dt;
      boid.velocity.y += boid.acceleration.y * dt;
      boid.velocity.z += boid.acceleration.z * dt;
      this.limit(boid.velocity, maxSpeed);

      boid.position.x += boid.velocity.x * dt;
      boid.position.y += boid.velocity.y * dt;
      boid.position.z += boid.velocity.z * dt;

      const horizontalBounds = 14;
      if (boid.position.x > horizontalBounds) {
        boid.position.x = -horizontalBounds;
      }
      if (boid.position.x < -horizontalBounds) {
        boid.position.x = horizontalBounds;
      }
      if (boid.position.z > horizontalBounds) {
        boid.position.z = -horizontalBounds;
      }
      if (boid.position.z < -horizontalBounds) {
        boid.position.z = horizontalBounds;
      }

      const minY = 1;
      const maxY = 9;
      if (boid.position.y < minY) {
        boid.position.y = minY;
        boid.velocity.y = Math.abs(boid.velocity.y) * 0.5;
      }
      if (boid.position.y > maxY) {
        boid.position.y = maxY;
        boid.velocity.y = -Math.abs(boid.velocity.y) * 0.5;
      }

      boid.acceleration.x = 0;
      boid.acceleration.y = 0;
      boid.acceleration.z = 0;
    });
  }

  private limit(v: Position, max: number): void {
    const mag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (mag > max) {
      v.x = (v.x / mag) * max;
      v.y = (v.y / mag) * max;
      v.z = (v.z / mag) * max;
    }
  }

  private normalize(v: Position): Position {
    const mag = Math.sqrt(v.x * v.x + v.y * v.y + v.z * v.z);
    if (mag === 0) return { x: 0, y: 0, z: 0 };
    return { x: v.x / mag, y: v.y / mag, z: v.z / mag };
  }

  private checkPredation(): void {
    const predators = Array.from(this.state.species.values()).filter(
      (s) => s.speciesType === 'fish' && (s as Fish).predator
    ) as Fish[];
    const prey = Array.from(this.state.species.values()).filter(
      (s) => s.speciesType === 'fish' && !(s as Fish).predator
    ) as Fish[];

    predators.forEach((predator) => {
      prey.forEach((preyFish) => {
        const dist = this.distance(predator.position, preyFish.position);
        if (dist < 1.5 && Math.random() < 0.002) {
          predator.health = Math.min(100, predator.health + 15);
          preyFish.health -= 40;
          if (preyFish.health <= 0) {
            this.removeSpecies(preyFish.id);
            this.addEvent(
              'alert',
              `捕食事件: ${predator.name} 捕食了 ${preyFish.name}`
            );
          }
        }
      });
    });
  }

  private checkReproduction(): void {
    this.state.schools.forEach((school) => {
      const { nutrientLevel } = this.state.environment;
      const nutrientBonus = 0.5 + nutrientLevel / 100;
      const density = school.fishIds.length / 15;
      const reproductionChance =
        0.001 * nutrientBonus * (density > 0.3 ? 1 : 0.5);

      if (
        school.fishIds.length >= 3 &&
        school.fishIds.length < 15 &&
        Math.random() < reproductionChance
      ) {
        const parentFish = this.state.species.get(school.fishIds[0]) as Fish;
        if (!parentFish) return;

        const newFish: Fish = {
          id: uuidv4(),
          name: parentFish.name,
          speciesType: 'fish',
          schoolId: school.id,
          position: {
            x: school.center.x + (Math.random() - 0.5) * 2,
            y: school.center.y + (Math.random() - 0.5) * 1,
            z: school.center.z + (Math.random() - 0.5) * 2,
          },
          health: 100,
          age: 0,
          growthRate: 0.015,
          size: parentFish.size * 0.4,
          speed: parentFish.speed * 0.7,
          direction: { x: 0, y: 0, z: 1 },
          predator: parentFish.predator,
          diet: [...parentFish.diet],
        };

        this.state.species.set(newFish.id, newFish);
        school.fishIds.push(newFish.id);
        school.boids.push({
          position: { ...newFish.position },
          velocity: {
            x: (Math.random() - 0.5) * 1.5,
            y: (Math.random() - 0.5) * 0.3,
            z: (Math.random() - 0.5) * 1.5,
          },
          acceleration: { x: 0, y: 0, z: 0 },
        });

        this.addEvent(
          'info',
          `繁殖事件: ${school.name} 种群增加，当前数量: ${school.fishIds.length}`
        );
      }
    });
  }

  private updatePlants(dt: number): void {
    const { lightIntensity, nutrientLevel } = this.state.environment;

    this.state.species.forEach((s) => {
      if (s.speciesType !== 'plant') return;
      const plant = s as Plant;

      const lightFactor = 1 - Math.exp(-lightIntensity * 2.5);
      const nutrientFactor = nutrientLevel / 100;
      const growthFactor = lightFactor * 0.6 + nutrientFactor * 0.4;

      plant.age += dt;
      plant.growthRate = growthFactor * 0.006 * dt;
      plant.height = Math.min(5, plant.height + plant.growthRate * plant.height);

      const healthChange = (growthFactor - 0.4) * dt * 4;
      plant.health = Math.max(0, Math.min(100, plant.health + healthChange));
    });
  }

  private updateSymbiosisEffects(): void {
    this.state.symbioses.forEach((symbiosis) => {
      const speciesA = this.state.species.get(symbiosis.speciesA);
      const speciesB = this.state.species.get(symbiosis.speciesB);

      if (speciesA && speciesB) {
        const dist = this.distance(speciesA.position, speciesB.position);
        if (dist < 3) {
          const healthBoost = 0.03;
          speciesA.health = Math.min(100, speciesA.health + healthBoost);
          speciesB.health = Math.min(100, speciesB.health + healthBoost);
        }
      }
    });
  }

  private distance(a: Position, b: Position): number {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const dz = a.z - b.z;
    return Math.sqrt(dx * dx + dy * dy + dz * dz);
  }

  private updateMetrics(): void {
    const speciesArray = Array.from(this.state.species.values());
    const coralCount = speciesArray.filter((s) => s.speciesType === 'coral').length;
    const fishCount = speciesArray.filter((s) => s.speciesType === 'fish').length;
    const plantCount = speciesArray.filter((s) => s.speciesType === 'plant').length;

    const speciesTypes = new Set(speciesArray.map((s) => s.name)).size;
    this.state.metrics.biodiversity = Math.min(1, speciesTypes / 18);

    const totalCount = coralCount + fishCount + plantCount;
    this.state.metrics.populationDensity = Math.min(1, totalCount / 100);

    const avgHealth =
      speciesArray.reduce((acc, s) => acc + s.health, 0) / speciesArray.length || 0;
    const { nutrientLevel } = this.state.environment;
    const nutrientHealth = 1 - Math.abs(nutrientLevel - 50) / 50;
    this.state.metrics.waterHealth =
      (avgHealth / 100) * 0.6 + Math.max(0, nutrientHealth) * 0.4;

    const corals = speciesArray.filter((s) => s.speciesType === 'coral') as Coral[];
    const avgCoverage =
      corals.reduce((acc, c) => acc + c.coverage, 0) / (corals.length || 1);
    this.state.metrics.coralCoverage = avgCoverage;
  }

  private checkCriticalEvents(): void {
    const { coralCoverage, populationDensity, waterHealth } = this.state.metrics;

    if (coralCoverage > 0.7) {
      if (!this.hasRecentEvent('prosperity', 60000)) {
        this.addEvent(
          'prosperity',
          `珊瑚礁繁荣! 覆盖率达到 ${(coralCoverage * 100).toFixed(1)}%`
        );
      }
    }

    this.state.schools.forEach((school) => {
      if (school.fishIds.length < 3) {
        if (!this.hasRecentEvent('alert', 30000, school.id)) {
          this.addEvent(
            'alert',
            `${school.name} 种群数量危急! 当前: ${school.fishIds.length}`,
            { schoolId: school.id }
          );
        }
      }
    });

    if (populationDensity < 0.2) {
      if (!this.hasRecentEvent('warning', 60000)) {
        this.addEvent('warning', '种群密度过低，生态系统面临风险');
      }
    }

    if (waterHealth < 0.4) {
      if (!this.hasRecentEvent('warning', 45000, 'waterHealth')) {
        this.addEvent('warning', '水体健康度严重下降', { metric: 'waterHealth' });
      }
    }
  }

  private hasRecentEvent(
    type: string,
    threshold: number,
    dataKey?: string
  ): boolean {
    const now = Date.now();
    return this.state.events.some(
      (e) =>
        e.type === type &&
        now - e.timestamp < threshold &&
        (!dataKey || (e.data && e.data.schoolId === dataKey) || dataKey === 'waterHealth')
    );
  }

  private addEvent(
    type: EcoEvent['type'],
    message: string,
    data?: Record<string, unknown>
  ): void {
    const event: EcoEvent = {
      id: uuidv4(),
      type,
      message,
      timestamp: Date.now(),
      data,
    };
    this.state.events.unshift(event);
    if (this.state.events.length > 50) {
      this.state.events.pop();
    }
  }

  public removeSpecies(id: string): void {
    this.state.species.delete(id);
    this.state.schools.forEach((school) => {
      const idx = school.fishIds.indexOf(id);
      if (idx !== -1) {
        school.fishIds.splice(idx, 1);
        school.boids.splice(idx, 1);
      }
    });
  }

  public getState(): EcosystemState {
    return this.state;
  }

  public getSpecies(): Map<string, Species> {
    return new Map(this.state.species);
  }

  public getSchools(): Map<string, School> {
    return new Map(this.state.schools);
  }

  public getMetrics(): EcoMetrics {
    return { ...this.state.metrics };
  }

  public getEvents(): EcoEvent[] {
    return [...this.state.events];
  }

  public getCurrentField(): Position[][] {
    return this.state.currentField.map((row) => row.map((p) => ({ ...p })));
  }

  public getParticleCount(): number {
    const base = this.BASE_PARTICLES + this.state.environment.currentSpeed * 1500;
    return Math.min(base, this.MAX_PARTICLES);
  }

  public getMaxParticles(): number {
    return this.MAX_PARTICLES;
  }

  public subscribe(listener: (state: EcosystemState) => void): () => void {
    this.eventListeners.add(listener);
    return () => this.eventListeners.delete(listener);
  }

  private notifyListeners(): void {
    this.eventListeners.forEach((listener) => listener(this.state));
  }

  public logPlayerAction(action: string, params: Record<string, unknown>): void {
    this.addEvent('info', `玩家操作: ${action}`, {
      playerAction: true,
      params,
    });
  }
}

export default EcoEngine;
