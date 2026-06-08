export type ActionType = 'attack' | 'defend' | 'counter' | 'ultimate';

export interface BeetleColors {
  body: string;
  legs: string;
  eyes: string;
}

export const PRESET_COLORS: string[] = [
  '#8B0000',
  '#1E90FF',
  '#228B22',
  '#FFD700',
  '#9932CC',
  '#FF6347',
  '#4169E1',
  '#00CED1'
];

export interface BeetleStats {
  hp: number;
  maxHp: number;
  attack: number;
  defense: number;
  speed: number;
  energy: number;
  maxEnergy: number;
}

export interface BeetleState {
  isDefending: boolean;
  isCountering: boolean;
  isHit: boolean;
  hitTimer: number;
  isDead: boolean;
  displayHp: number;
}

export class Beetle {
  name: string;
  stats: BeetleStats;
  colors: BeetleColors;
  state: BeetleState;
  position: { x: number; y: number };
  facing: 'left' | 'right';
  scale: number;

  constructor(name: string, colors: BeetleColors, position: { x: number; y: number }, facing: 'left' | 'right') {
    this.name = name;
    this.stats = {
      hp: 100,
      maxHp: 100,
      attack: Math.floor(Math.random() * 11) + 10,
      defense: Math.floor(Math.random() * 11) + 5,
      speed: Math.floor(Math.random() * 10) + 1,
      energy: 20,
      maxEnergy: 100
    };
    this.colors = colors;
    this.state = {
      isDefending: false,
      isCountering: false,
      isHit: false,
      hitTimer: 0,
      isDead: false,
      displayHp: 100
    };
    this.position = { ...position };
    this.facing = facing;
    this.scale = 1;
  }

  resetTurnState(): void {
    this.state.isDefending = false;
    this.state.isCountering = false;
  }

  takeDamage(rawDamage: number): { finalDamage: number; counterDamage: number } {
    let damage = rawDamage;
    if (this.state.isDefending) {
      damage = Math.floor(damage * 0.5);
    }
    damage = Math.max(2, damage);
    this.stats.hp = Math.max(0, this.stats.hp - damage);
    this.state.isHit = true;
    this.state.hitTimer = 0.2;

    let counterDamage = 0;
    if (this.state.isCountering) {
      counterDamage = Math.floor(rawDamage * 0.5);
    }

    if (this.stats.hp <= 0) {
      this.state.isDead = true;
    }

    return { finalDamage: damage, counterDamage };
  }

  useUltimate(): boolean {
    if (this.stats.energy < 20) return false;
    this.stats.energy -= 20;
    return true;
  }

  recoverEnergy(amount: number): void {
    this.stats.energy = Math.min(this.stats.maxEnergy, this.stats.energy + amount);
  }

  update(dt: number): void {
    if (this.state.isHit) {
      this.state.hitTimer -= dt;
      if (this.state.hitTimer <= 0) {
        this.state.isHit = false;
      }
    }

    if (this.state.displayHp > this.stats.hp) {
      const diff = this.state.displayHp - this.stats.hp;
      this.state.displayHp = Math.max(this.stats.hp, this.state.displayHp - diff * dt * 4);
    }
  }
}
