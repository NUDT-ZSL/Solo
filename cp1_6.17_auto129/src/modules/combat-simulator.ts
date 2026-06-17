import type { Spell } from './element-combination';

export interface CombatLog {
  round: number;
  spellName: string;
  damage: number;
  remainingHp: number;
  timestamp: number;
}

export interface CombatResult {
  damage: number;
  remainingHp: number;
  isDead: boolean;
  log: CombatLog;
}

export interface CombatState {
  targetHp: number;
  maxHp: number;
  resistance: number;
  round: number;
  logs: CombatLog[];
}

const MAX_LOGS = 30;
const MAX_HP = 100;

export class CombatSimulator {
  private state: CombatState;

  constructor(initialResistance: number = 0) {
    this.state = {
      targetHp: MAX_HP,
      maxHp: MAX_HP,
      resistance: initialResistance,
      round: 0,
      logs: [],
    };
  }

  getState(): CombatState {
    return { ...this.state };
  }

  setResistance(resistance: number): void {
    this.state.resistance = Math.max(0, Math.min(50, resistance));
  }

  castSpell(spell: Spell): CombatResult {
    this.state.round++;

    const resistanceMultiplier = 1 - this.state.resistance / 100;
    const damage = Math.round(spell.baseDamage * resistanceMultiplier);

    const newHp = Math.max(0, this.state.targetHp - damage);
    const isDead = newHp <= 0;

    this.state.targetHp = newHp;

    const log: CombatLog = {
      round: this.state.round,
      spellName: spell.name,
      damage,
      remainingHp: newHp,
      timestamp: Date.now(),
    };

    this.state.logs.push(log);
    if (this.state.logs.length > MAX_LOGS) {
      this.state.logs.shift();
    }

    return {
      damage,
      remainingHp: newHp,
      isDead,
      log,
    };
  }

  resetTarget(): void {
    this.state.targetHp = this.state.maxHp;
  }

  resetAll(): void {
    this.state.targetHp = this.state.maxHp;
    this.state.round = 0;
    this.state.logs = [];
  }
}
