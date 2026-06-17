import Fish from '../entities/Fish';
import Predator from '../entities/Predator';
import Algae from '../entities/Algae';

export type EcosystemEventType = 'population_boom' | 'endangered';

export interface EcosystemEvent {
  type: EcosystemEventType;
  species: 'fish' | 'predator' | 'algae';
  timestamp: number;
}

export interface EcosystemStats {
  fishCount: number;
  predatorCount: number;
  algaeCount: number;
  stabilityScore: number;
  events: EcosystemEvent[];
}

export type StatsUpdateCallback = (stats: EcosystemStats) => void;
export type SpawnPositionCallback = () => { x: number; y: number };

export default class Ecosystem {
  fishList: Fish[];
  predatorList: Predator[];
  algaeList: Algae[];
  canvasWidth: number;
  canvasHeight: number;
  sandHeight: number;
  private lastTime: number;
  private statsCallback: StatsUpdateCallback | null;
  private spawnPositionCallback: SpawnPositionCallback | null;
  private currentGroupID: number;
  private eventTimestamps: Map<string, number>;
  private boomFlashActive: boolean;
  private boomFlashTimer: number;

  static readonly MAX_POPULATION = 200;
  static readonly ENDANGERED_THRESHOLD = 5;
  static readonly BOOM_FLASH_DURATION = 0.2;
  static readonly IDEAL_RATIO = { fish: 5, predator: 1, algae: 10 };

  constructor(canvasWidth: number, canvasHeight: number, sandHeight: number) {
    this.fishList = [];
    this.predatorList = [];
    this.algaeList = [];
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.sandHeight = sandHeight;
    this.lastTime = performance.now();
    this.statsCallback = null;
    this.spawnPositionCallback = null;
    this.currentGroupID = 0;
    this.eventTimestamps = new Map();
    this.boomFlashActive = false;
    this.boomFlashTimer = 0;
  }

  setStatsCallback(callback: StatsUpdateCallback): void {
    this.statsCallback = callback;
  }

  setSpawnPositionCallback(callback: SpawnPositionCallback): void {
    this.spawnPositionCallback = callback;
  }

  getRandomPosition(): { x: number; y: number } {
    return {
      x: Math.random() * (this.canvasWidth - 100) + 50,
      y: Math.random() * (this.canvasHeight - this.sandHeight - 100) + 50
    };
  }

  spawnFish(count: number = 5): void {
    const spawnPos = this.spawnPositionCallback?.() || { x: 0, y: 0 };
    const groupID = this.currentGroupID++;
    const groupSize = Math.floor(Math.random() * 6) + 5;
    
    for (let i = 0; i < count; i++) {
      const target = this.getRandomPosition();
      const fish = new Fish(spawnPos.x, spawnPos.y, groupID + Math.floor(i / groupSize));
      fish.startSpawning(spawnPos.x, spawnPos.y, target.x, target.y);
      this.fishList.push(fish);
    }
  }

  spawnPredator(count: number = 5): void {
    const spawnPos = this.spawnPositionCallback?.() || { x: 0, y: 0 };
    
    for (let i = 0; i < count; i++) {
      const target = this.getRandomPosition();
      const predator = new Predator(spawnPos.x, spawnPos.y);
      predator.startSpawning(spawnPos.x, spawnPos.y, target.x, target.y);
      this.predatorList.push(predator);
    }
  }

  spawnAlgae(count: number = 5): void {
    const spawnPos = this.spawnPositionCallback?.() || { x: 0, y: 0 };
    
    for (let i = 0; i < count; i++) {
      const target = this.getRandomPosition();
      const algae = new Algae(spawnPos.x, spawnPos.y);
      algae.startSpawning(spawnPos.x, spawnPos.y, target.x, target.y);
      this.algaeList.push(algae);
    }
  }

  reset(): void {
    this.fishList = [];
    this.predatorList = [];
    this.algaeList = [];
    this.currentGroupID = 0;
    this.eventTimestamps.clear();
    this.boomFlashActive = false;
    this.boomFlashTimer = 0;
    this.notifyStatsUpdate([]);
  }

  update(): void {
    const now = performance.now();
    const deltaTime = (now - this.lastTime) / 1000;
    this.lastTime = now;

    for (const fish of this.fishList) {
      fish.move(this.fishList, this.canvasWidth, this.canvasHeight, this.sandHeight);
      fish.eat(this.algaeList, deltaTime);
    }

    for (const predator of this.predatorList) {
      predator.move(this.fishList, this.canvasWidth, this.canvasHeight, this.sandHeight);
      predator.eatFish(this.fishList);
    }

    const newAlgae: Algae[] = [];
    for (const algae of this.algaeList) {
      algae.grow(deltaTime);
      const offspring = algae.reproduce(this.canvasWidth, this.canvasHeight, this.sandHeight);
      if (offspring && this.algaeList.length + newAlgae.length < Ecosystem.MAX_POPULATION) {
        newAlgae.push(offspring);
      }
    }
    this.algaeList.push(...newAlgae);

    const events = this.detectEvents();
    this.updateEndangeredStatus();

    if (this.boomFlashActive) {
      this.boomFlashTimer -= deltaTime;
      if (this.boomFlashTimer <= 0) {
        this.boomFlashActive = false;
      }
    }

    this.notifyStatsUpdate(events);
  }

  private detectEvents(): EcosystemEvent[] {
    const events: EcosystemEvent[] = [];
    const now = Date.now();

    if (this.fishList.length > Ecosystem.MAX_POPULATION && !this.isEventCooldown('boom_fish')) {
      events.push({ type: 'population_boom', species: 'fish', timestamp: now });
      this.eventTimestamps.set('boom_fish', now);
      this.triggerBoomFlash();
    }
    if (this.predatorList.length > Ecosystem.MAX_POPULATION && !this.isEventCooldown('boom_predator')) {
      events.push({ type: 'population_boom', species: 'predator', timestamp: now });
      this.eventTimestamps.set('boom_predator', now);
      this.triggerBoomFlash();
    }
    if (this.algaeList.length > Ecosystem.MAX_POPULATION && !this.isEventCooldown('boom_algae')) {
      events.push({ type: 'population_boom', species: 'algae', timestamp: now });
      this.eventTimestamps.set('boom_algae', now);
      this.triggerBoomFlash();
    }

    if (this.fishList.length > 0 && this.fishList.length <= Ecosystem.ENDANGERED_THRESHOLD) {
      events.push({ type: 'endangered', species: 'fish', timestamp: now });
    }
    if (this.predatorList.length > 0 && this.predatorList.length <= Ecosystem.ENDANGERED_THRESHOLD) {
      events.push({ type: 'endangered', species: 'predator', timestamp: now });
    }
    if (this.algaeList.length > 0 && this.algaeList.length <= Ecosystem.ENDANGERED_THRESHOLD) {
      events.push({ type: 'endangered', species: 'algae', timestamp: now });
    }

    return events;
  }

  private isEventCooldown(eventKey: string): boolean {
    const lastTime = this.eventTimestamps.get(eventKey);
    if (!lastTime) return false;
    return Date.now() - lastTime < 5000;
  }

  private triggerBoomFlash(): void {
    this.boomFlashActive = true;
    this.boomFlashTimer = Ecosystem.BOOM_FLASH_DURATION;
  }

  private updateEndangeredStatus(): void {
    for (const fish of this.fishList) {
      fish.isEndangered = this.fishList.length <= Ecosystem.ENDANGERED_THRESHOLD;
    }
    for (const predator of this.predatorList) {
      predator.isEndangered = this.predatorList.length <= Ecosystem.ENDANGERED_THRESHOLD;
    }
    for (const algae of this.algaeList) {
      algae.isEndangered = this.algaeList.length <= Ecosystem.ENDANGERED_THRESHOLD;
    }
  }

  calculateStabilityScore(): number {
    const total = this.fishList.length + this.predatorList.length + this.algaeList.length;
    if (total === 0) return 100;

    const idealTotal = Ecosystem.IDEAL_RATIO.fish + Ecosystem.IDEAL_RATIO.predator + Ecosystem.IDEAL_RATIO.algae;
    
    const actualFishRatio = this.fishList.length / total;
    const actualPredatorRatio = this.predatorList.length / total;
    const actualAlgaeRatio = this.algaeList.length / total;

    const idealFishRatio = Ecosystem.IDEAL_RATIO.fish / idealTotal;
    const idealPredatorRatio = Ecosystem.IDEAL_RATIO.predator / idealTotal;
    const idealAlgaeRatio = Ecosystem.IDEAL_RATIO.algae / idealTotal;

    const fishDeviation = Math.abs(actualFishRatio - idealFishRatio);
    const predatorDeviation = Math.abs(actualPredatorRatio - idealPredatorRatio);
    const algaeDeviation = Math.abs(actualAlgaeRatio - idealAlgaeRatio);

    const totalDeviation = fishDeviation * 2 + predatorDeviation * 3 + algaeDeviation * 1.5;
    const score = Math.max(0, 100 - totalDeviation * 100);

    return Math.round(score);
  }

  private notifyStatsUpdate(events: EcosystemEvent[]): void {
    if (this.statsCallback) {
      this.statsCallback({
        fishCount: this.fishList.length,
        predatorCount: this.predatorList.length,
        algaeCount: this.algaeList.length,
        stabilityScore: this.calculateStabilityScore(),
        events
      });
    }
  }

  isBoomFlashActive(): boolean {
    return this.boomFlashActive;
  }

  draw(ctx: CanvasRenderingContext2D): void {
    for (const algae of this.algaeList) {
      algae.draw(ctx);
    }

    for (const fish of this.fishList) {
      fish.draw(ctx);
    }

    for (const predator of this.predatorList) {
      predator.draw(ctx);
    }
  }
}
