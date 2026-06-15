import { Fish, FishSpecies, Ripple, FishManagerState, Food } from './types';

const TURN_DURATION = 0.3;
const RIPPLE_DURATION = 0.5;
const RIPPLE_MAX_RADIUS = 40;
const RIPPLE_MAX_ALPHA = 0.6;
const SPAWN_INTERVAL = 20;
const MAX_FISH_COUNT = 12;
const REMOVE_COUNT_WHEN_OVER = 2;
const HEALTH_DECAY_INTERVAL = 5;
const HEALTH_DECAY_AMOUNT = 1;
const LOW_HEALTH_THRESHOLD = 20;
const LOW_HEALTH_SPEED_MULTIPLIER = 0.5;
const DEATH_SINK_DURATION = 3;
const EAT_ANIMATION_DURATION = 0.2;
const EAT_DETECTION_RADIUS = 15;
const CHASE_SPEED_MULTIPLIER = 2;

export class FishManager {
  private fishes: Fish[] = [];
  private ripples: Ripple[] = [];
  private feedCount: number = 0;
  private nextFishId: number = 0;
  private canvasWidth: number;
  private canvasHeight: number;
  private lastSpawnTime: number = 0;
  private currentTime: number = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.spawnInitialFishes();
  }

  private spawnInitialFishes(): void {
    for (let i = 0; i < 6; i++) {
      this.spawnFishAtRandomPosition();
    }
  }

  private spawnFishAtRandomPosition(): Fish {
    const species: FishSpecies[] = ['clownfish', 'angelfish', 'pufferfish'];
    const randomSpecies = species[Math.floor(Math.random() * species.length)];
    const x = Math.random() * (this.canvasWidth - 100) + 50;
    const y = Math.random() * (this.canvasHeight - 150) + 50;
    return this.createFish(randomSpecies, x, y);
  }

  private spawnFishFromEdge(): Fish {
    const species: FishSpecies[] = ['clownfish', 'angelfish', 'pufferfish'];
    const randomSpecies = species[Math.floor(Math.random() * species.length)];
    const edge = Math.floor(Math.random() * 4);
    let x: number, y: number;

    switch (edge) {
      case 0:
        x = -30;
        y = Math.random() * (this.canvasHeight - 100) + 50;
        break;
      case 1:
        x = this.canvasWidth + 30;
        y = Math.random() * (this.canvasHeight - 100) + 50;
        break;
      case 2:
        x = Math.random() * (this.canvasWidth - 100) + 50;
        y = -30;
        break;
      default:
        x = Math.random() * (this.canvasWidth - 100) + 50;
        y = this.canvasHeight + 30;
        break;
    }

    return this.createFish(randomSpecies, x, y);
  }

  private createFish(species: FishSpecies, x: number, y: number): Fish {
    const baseSpeed = 15 + Math.random() * 20;
    const direction = Math.random() * Math.PI * 2;

    const fish: Fish = {
      id: this.nextFishId++,
      species,
      x,
      y,
      baseSpeed,
      currentSpeed: baseSpeed,
      direction,
      targetDirection: direction,
      turnProgress: 0,
      isTurning: false,
      pathType: Math.random() > 0.5 ? 'sine' : 'zigzag',
      pathPhase: Math.random() * Math.PI * 2,
      pathAmplitude: 20 + Math.random() * 30,
      pathFrequency: 0.5 + Math.random() * 1,
      health: 100,
      maxHealth: 100,
      isDying: false,
      deathProgress: 0,
      isEating: false,
      eatProgress: 0,
      chaseTarget: null,
      returnTarget: null,
      birthTime: this.currentTime,
      lastHealthDecay: this.currentTime
    };

    this.fishes.push(fish);
    return fish;
  }

  public resize(width: number, height: number): void {
    this.canvasWidth = width;
    this.canvasHeight = height;
  }

  public handleClick(x: number, y: number): void {
    let clickedFish: Fish | null = null;
    let minDist = Infinity;

    for (const fish of this.fishes) {
      if (fish.isDying) continue;
      const dist = Math.sqrt((fish.x - x) ** 2 + (fish.y - y) ** 2);
      if (dist < 30 && dist < minDist) {
        minDist = dist;
        clickedFish = fish;
      }
    }

    if (clickedFish) {
      clickedFish.returnTarget = { x: clickedFish.x, y: clickedFish.y };
      clickedFish.chaseTarget = { x, y };
      this.addRipple(clickedFish.x, clickedFish.y);
    }
  }

  public handleRightClick(): void {
    this.feedCount++;
  }

  private addRipple(x: number, y: number): void {
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius: RIPPLE_MAX_RADIUS,
      alpha: 0,
      maxAlpha: RIPPLE_MAX_ALPHA,
      progress: 0,
      duration: RIPPLE_DURATION
    });
  }

  private checkFoodCollision(food: Food): Fish | null {
    for (const fish of this.fishes) {
      if (fish.isDying || food.eaten) continue;
      const dist = Math.sqrt((fish.x - food.x) ** 2 + (fish.y - food.y) ** 2);
      if (dist < EAT_DETECTION_RADIUS) {
        return fish;
      }
    }
    return null;
  }

  public updateFoodInteractions(foods: Food[]): void {
    for (const food of foods) {
      if (food.eaten) continue;

      const nearestFish = this.findNearestHungryFish(food);
      if (nearestFish) {
        const dist = Math.sqrt((nearestFish.x - food.x) ** 2 + (nearestFish.y - food.y) ** 2);
        if (dist < 100) {
          nearestFish.chaseTarget = { x: food.x, y: food.y };
          nearestFish.returnTarget = null;
        }
      }

      const eatingFish = this.checkFoodCollision(food);
      if (eatingFish) {
        food.eaten = true;
        eatingFish.isEating = true;
        eatingFish.eatProgress = 0;
        eatingFish.health = Math.min(eatingFish.maxHealth, eatingFish.health + 10);
        eatingFish.chaseTarget = null;
      }
    }
  }

  private findNearestHungryFish(food: Food): Fish | null {
    let nearest: Fish | null = null;
    let minDist = Infinity;

    for (const fish of this.fishes) {
      if (fish.isDying || fish.isEating) continue;
      const dist = Math.sqrt((fish.x - food.x) ** 2 + (fish.y - food.y) ** 2);
      if (dist < minDist) {
        minDist = dist;
        nearest = fish;
      }
    }

    return nearest;
  }

  public update(deltaTime: number, currentTime: number): void {
    this.currentTime = currentTime;

    if (currentTime - this.lastSpawnTime > SPAWN_INTERVAL) {
      this.lastSpawnTime = currentTime;
      this.spawnFishFromEdge();

      if (this.fishes.length > MAX_FISH_COUNT) {
        this.fishes
          .sort((a, b) => a.birthTime - b.birthTime)
          .slice(0, REMOVE_COUNT_WHEN_OVER)
          .forEach(f => {
            f.isDying = true;
            f.deathProgress = 0;
          });
      }
    }

    this.updateFishes(deltaTime);
    this.updateRipples(deltaTime);
  }

  private updateFishes(deltaTime: number): void {
    const toRemove: number[] = [];

    for (let i = 0; i < this.fishes.length; i++) {
      const fish = this.fishes[i];

      if (this.currentTime - fish.lastHealthDecay > HEALTH_DECAY_INTERVAL && !fish.isDying) {
        fish.health -= HEALTH_DECAY_AMOUNT;
        fish.lastHealthDecay = this.currentTime;

        if (fish.health <= 0) {
          fish.health = 0;
          fish.isDying = true;
          fish.deathProgress = 0;
        }
      }

      if (fish.isDying) {
        fish.deathProgress += deltaTime / DEATH_SINK_DURATION;
        fish.y += 30 * deltaTime;
        if (fish.deathProgress >= 1) {
          toRemove.push(i);
        }
        continue;
      }

      if (fish.isEating) {
        fish.eatProgress += deltaTime / EAT_ANIMATION_DURATION;
        if (fish.eatProgress >= 1) {
          fish.isEating = false;
          fish.eatProgress = 0;
        }
      }

      const speedMultiplier = fish.health < LOW_HEALTH_THRESHOLD ? LOW_HEALTH_SPEED_MULTIPLIER : 1;
      fish.currentSpeed = fish.baseSpeed * speedMultiplier;

      if (fish.chaseTarget) {
        const dx = fish.chaseTarget.x - fish.x;
        const dy = fish.chaseTarget.y - fish.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 5) {
          if (fish.returnTarget) {
            fish.chaseTarget = fish.returnTarget;
            fish.returnTarget = null;
          } else {
            fish.chaseTarget = null;
          }
        } else {
          fish.targetDirection = Math.atan2(dy, dx);
          fish.isTurning = true;
          fish.currentSpeed = fish.baseSpeed * CHASE_SPEED_MULTIPLIER;
        }
      } else {
        fish.pathPhase += deltaTime * fish.pathFrequency;

        if (!fish.isTurning && Math.random() < 0.01) {
          fish.targetDirection = Math.random() * Math.PI * 2;
          fish.isTurning = true;
          fish.turnProgress = 0;
        }
      }

      if (fish.isTurning) {
        fish.turnProgress += deltaTime / TURN_DURATION;
        if (fish.turnProgress >= 1) {
          fish.turnProgress = 1;
          fish.isTurning = false;
          fish.direction = fish.targetDirection;
        } else {
          const t = fish.turnProgress;
          const startDir = fish.direction;
          const endDir = fish.targetDirection;
          let diff = endDir - startDir;
          while (diff > Math.PI) diff -= Math.PI * 2;
          while (diff < -Math.PI) diff += Math.PI * 2;
          fish.direction = startDir + diff * t;
        }
      }

      let pathOffset = 0;
      if (!fish.chaseTarget) {
        if (fish.pathType === 'sine') {
          pathOffset = Math.sin(fish.pathPhase) * fish.pathAmplitude;
        } else {
          pathOffset = (Math.abs(((fish.pathPhase / Math.PI) % 2) - 1) * 2 - 1) * fish.pathAmplitude;
        }
      }

      const moveSpeed = fish.currentSpeed * deltaTime;
      fish.x += Math.cos(fish.direction) * moveSpeed;
      fish.y += Math.sin(fish.direction) * moveSpeed + Math.cos(fish.direction) * pathOffset * deltaTime * 0.5;

      const margin = 30;
      if (fish.x < margin && !fish.chaseTarget) {
        fish.x = margin;
        fish.targetDirection = Math.PI - fish.direction;
        fish.isTurning = true;
        fish.turnProgress = 0;
      } else if (fish.x > this.canvasWidth - margin && !fish.chaseTarget) {
        fish.x = this.canvasWidth - margin;
        fish.targetDirection = Math.PI - fish.direction;
        fish.isTurning = true;
        fish.turnProgress = 0;
      }

      if (fish.y < margin && !fish.chaseTarget) {
        fish.y = margin;
        fish.targetDirection = -fish.direction;
        fish.isTurning = true;
        fish.turnProgress = 0;
      } else if (fish.y > this.canvasHeight - 80 && !fish.chaseTarget) {
        fish.y = this.canvasHeight - 80;
        fish.targetDirection = -fish.direction;
        fish.isTurning = true;
        fish.turnProgress = 0;
      }
    }

    for (let i = toRemove.length - 1; i >= 0; i--) {
      this.fishes.splice(toRemove[i], 1);
    }
  }

  private updateRipples(deltaTime: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      ripple.progress += deltaTime / ripple.duration;
      ripple.radius = ripple.progress * ripple.maxRadius;
      ripple.alpha = ripple.maxAlpha * (1 - ripple.progress);

      if (ripple.progress >= 1) {
        this.ripples.splice(i, 1);
      }
    }
  }

  public getState(): FishManagerState {
    return {
      fishes: [...this.fishes],
      ripples: [...this.ripples],
      feedCount: this.feedCount
    };
  }

  public getFishAtPosition(x: number, y: number): Fish | null {
    for (const fish of this.fishes) {
      if (fish.isDying) continue;
      const dist = Math.sqrt((fish.x - x) ** 2 + (fish.y - y) ** 2);
      if (dist < 25) {
        return fish;
      }
    }
    return null;
  }

  public getFeedCount(): number {
    return this.feedCount;
  }
}
