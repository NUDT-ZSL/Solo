export type AttributeType = 'health' | 'hunger' | 'happiness';

export interface AttributeChange {
  type: AttributeType;
  value: number;
}

export interface CatState {
  name: string;
  health: number;
  hunger: number;
  happiness: number;
  isAway: boolean;
}

export class Cat {
  name: string;
  health: number;
  hunger: number;
  happiness: number;
  isAway: boolean;

  displayHealth: number;
  displayHunger: number;
  displayHappiness: number;

  healthAnimStart: number;
  hungerAnimStart: number;
  happinessAnimStart: number;

  healthAnimTimer: number;
  hungerAnimTimer: number;
  happinessAnimTimer: number;

  healthFlashTimer: number;
  hungerFlashTimer: number;
  happinessFlashTimer: number;

  healthRiseTimer: number;
  hungerRiseTimer: number;
  happinessRiseTimer: number;

  readonly MAX_VALUE: number = 100;
  readonly FLASH_DURATION: number = 300;
  readonly RISE_DURATION: number = 500;
  readonly ANIM_DURATION: number = 500;

  constructor(name: string) {
    this.name = name;
    this.health = 80;
    this.hunger = 70;
    this.happiness = 60;
    this.isAway = false;

    this.displayHealth = this.health;
    this.displayHunger = this.hunger;
    this.displayHappiness = this.happiness;

    this.healthAnimStart = this.health;
    this.hungerAnimStart = this.hunger;
    this.happinessAnimStart = this.happiness;

    this.healthAnimTimer = 0;
    this.hungerAnimTimer = 0;
    this.happinessAnimTimer = 0;

    this.healthFlashTimer = 0;
    this.hungerFlashTimer = 0;
    this.happinessFlashTimer = 0;

    this.healthRiseTimer = 0;
    this.hungerRiseTimer = 0;
    this.happinessRiseTimer = 0;
  }

  getState(): CatState {
    return {
      name: this.name,
      health: this.health,
      hunger: this.hunger,
      happiness: this.happiness,
      isAway: this.isAway,
    };
  }

  decay(): AttributeChange[] {
    if (this.isAway) return [];

    const changes: AttributeChange[] = [];

    const happinessDecay = -(Math.floor(Math.random() * 4) + 1);

    const prevHealth = this.health;
    const prevHunger = this.hunger;
    const prevHappiness = this.happiness;

    this.health = Math.max(0, this.health - 2);
    this.hunger = Math.max(0, this.hunger - 3);
    this.happiness = Math.max(0, this.happiness + happinessDecay);

    if (this.health !== prevHealth) {
      this.healthAnimStart = this.displayHealth;
      this.healthAnimTimer = this.ANIM_DURATION;
    }
    if (this.hunger !== prevHunger) {
      this.hungerAnimStart = this.displayHunger;
      this.hungerAnimTimer = this.ANIM_DURATION;
    }
    if (this.happiness !== prevHappiness) {
      this.happinessAnimStart = this.displayHappiness;
      this.happinessAnimTimer = this.ANIM_DURATION;
    }

    if (this.health < prevHealth) {
      this.healthFlashTimer = this.FLASH_DURATION;
      changes.push({ type: 'health', value: this.health - prevHealth });
    }
    if (this.hunger < prevHunger) {
      this.hungerFlashTimer = this.FLASH_DURATION;
      changes.push({ type: 'hunger', value: this.hunger - prevHunger });
    }
    if (this.happiness < prevHappiness) {
      this.happinessFlashTimer = this.FLASH_DURATION;
      changes.push({ type: 'happiness', value: this.happiness - prevHappiness });
    }

    this.checkAway();
    return changes;
  }

  applyEvent(changes: AttributeChange[]): void {
    if (this.isAway) return;

    for (const change of changes) {
      const prev = this[change.type];
      this[change.type] = Math.max(0, Math.min(this.MAX_VALUE, this[change.type] + change.value));

      if (this[change.type] !== prev) {
        switch (change.type) {
          case 'health':
            this.healthAnimStart = this.displayHealth;
            this.healthAnimTimer = this.ANIM_DURATION;
            break;
          case 'hunger':
            this.hungerAnimStart = this.displayHunger;
            this.hungerAnimTimer = this.ANIM_DURATION;
            break;
          case 'happiness':
            this.happinessAnimStart = this.displayHappiness;
            this.happinessAnimTimer = this.ANIM_DURATION;
            break;
        }
      }

      if (this[change.type] > prev) {
        switch (change.type) {
          case 'health':
            this.healthRiseTimer = this.RISE_DURATION;
            break;
          case 'hunger':
            this.hungerRiseTimer = this.RISE_DURATION;
            break;
          case 'happiness':
            this.happinessRiseTimer = this.RISE_DURATION;
            break;
        }
      }
    }

    this.checkAway();
  }

  private checkAway(): void {
    if (!this.isAway && (this.health <= 0 || this.hunger <= 0 || this.happiness <= 0)) {
      this.isAway = true;
    }
  }

  updateAnimations(deltaTime: number): void {
    if (this.healthFlashTimer > 0) this.healthFlashTimer = Math.max(0, this.healthFlashTimer - deltaTime);
    if (this.hungerFlashTimer > 0) this.hungerFlashTimer = Math.max(0, this.hungerFlashTimer - deltaTime);
    if (this.happinessFlashTimer > 0) this.happinessFlashTimer = Math.max(0, this.happinessFlashTimer - deltaTime);

    if (this.healthRiseTimer > 0) this.healthRiseTimer = Math.max(0, this.healthRiseTimer - deltaTime);
    if (this.hungerRiseTimer > 0) this.hungerRiseTimer = Math.max(0, this.hungerRiseTimer - deltaTime);
    if (this.happinessRiseTimer > 0) this.happinessRiseTimer = Math.max(0, this.happinessRiseTimer - deltaTime);

    if (this.healthAnimTimer > 0) {
      this.healthAnimTimer = Math.max(0, this.healthAnimTimer - deltaTime);
      const t = 1 - this.healthAnimTimer / this.ANIM_DURATION;
      this.displayHealth = this.healthAnimStart + (this.health - this.healthAnimStart) * t;
    } else {
      this.displayHealth = this.health;
    }

    if (this.hungerAnimTimer > 0) {
      this.hungerAnimTimer = Math.max(0, this.hungerAnimTimer - deltaTime);
      const t = 1 - this.hungerAnimTimer / this.ANIM_DURATION;
      this.displayHunger = this.hungerAnimStart + (this.hunger - this.hungerAnimStart) * t;
    } else {
      this.displayHunger = this.hunger;
    }

    if (this.happinessAnimTimer > 0) {
      this.happinessAnimTimer = Math.max(0, this.happinessAnimTimer - deltaTime);
      const t = 1 - this.happinessAnimTimer / this.ANIM_DURATION;
      this.displayHappiness = this.happinessAnimStart + (this.happiness - this.happinessAnimStart) * t;
    } else {
      this.displayHappiness = this.happiness;
    }
  }

  isFlashing(type: AttributeType): boolean {
    switch (type) {
      case 'health': return this.healthFlashTimer > 0;
      case 'hunger': return this.hungerFlashTimer > 0;
      case 'happiness': return this.happinessFlashTimer > 0;
    }
  }

  isRising(type: AttributeType): boolean {
    switch (type) {
      case 'health': return this.healthRiseTimer > 0;
      case 'hunger': return this.hungerRiseTimer > 0;
      case 'happiness': return this.happinessRiseTimer > 0;
    }
  }
}
