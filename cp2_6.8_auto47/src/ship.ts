export interface EnergySlots {
  weapon: number;
  shield: number;
  engine: number;
}

export type SlotKey = keyof EnergySlots;

export const TOTAL_ENERGY = 150;
export const SLOT_MIN = 10;
export const SLOT_MAX = 80;
export const BASE_ATTACK_INTERVAL = 1.5;
export const ENGINE_SPEED_BONUS = 0.02;

export interface TweenTarget {
  slots: EnergySlots;
  startTime: number;
  duration: number;
  startSlots: EnergySlots;
}

export class Ship {
  public name: string;
  public hp: number;
  public maxHp: number;
  public slots: EnergySlots;
  public shieldFlashUntil: number = 0;
  public shieldFlashFrequency: number = 0;
  public tween: TweenTarget | null = null;
  public isPlayer: boolean;

  constructor(name: string, slots: EnergySlots, isPlayer: boolean = false, maxHp: number = 500) {
    this.name = name;
    this.slots = { ...slots };
    this.maxHp = maxHp;
    this.hp = maxHp;
    this.isPlayer = isPlayer;
  }

  public getAttackPower(): number {
    return this.slots.weapon;
  }

  public getShieldReduction(): number {
    return this.slots.shield / (this.slots.shield + 20);
  }

  public getAttackInterval(): number {
    return Math.max(0.3, BASE_ATTACK_INTERVAL - ENGINE_SPEED_BONUS * this.slots.engine);
  }

  public takeDamage(rawDamage: number, now: number): number {
    const reduction = this.getShieldReduction();
    const actualDamage = Math.round(rawDamage * (1 - reduction));
    this.hp = Math.max(0, this.hp - actualDamage);
    this.shieldFlashUntil = now + 500;
    this.shieldFlashFrequency = Math.min(1, this.shieldFlashFrequency + 0.3);
    return actualDamage;
  }

  public setSlot(key: SlotKey, value: number): void {
    const clamped = Math.max(SLOT_MIN, Math.min(SLOT_MAX, value));
    const otherKeys: SlotKey[] = (['weapon', 'shield', 'engine'] as SlotKey[]).filter(k => k !== key);
    let delta = clamped - this.slots[key];

    this.slots[key] = clamped;

    if (delta > 0) {
      const othersTotal = this.slots[otherKeys[0]] + this.slots[otherKeys[1]];
      if (othersTotal - delta < SLOT_MIN * 2) {
        delta = othersTotal - SLOT_MIN * 2;
        this.slots[key] = TOTAL_ENERGY - SLOT_MIN * 2;
      }
      const ratio0 = this.slots[otherKeys[0]] / othersTotal;
      this.slots[otherKeys[0]] = Math.round(this.slots[otherKeys[0]] - delta * ratio0);
      this.slots[otherKeys[1]] = Math.round(this.slots[otherKeys[1]] - delta * (1 - ratio0));
    } else if (delta < 0) {
      const absDelta = Math.abs(delta);
      const ratio0 = (SLOT_MAX - this.slots[otherKeys[0]]);
      const ratio1 = (SLOT_MAX - this.slots[otherKeys[1]]);
      const totalRoom = ratio0 + ratio1;
      if (totalRoom < absDelta) {
        this.slots[otherKeys[0]] = SLOT_MAX;
        this.slots[otherKeys[1]] = SLOT_MAX;
        this.slots[key] = TOTAL_ENERGY - SLOT_MAX * 2;
      } else {
        this.slots[otherKeys[0]] = Math.round(this.slots[otherKeys[0]] + absDelta * (ratio0 / totalRoom));
        this.slots[otherKeys[1]] = Math.round(this.slots[otherKeys[1]] + absDelta * (ratio1 / totalRoom));
      }
    }

    this.normalize();
  }

  public normalize(): void {
    const sum = this.slots.weapon + this.slots.shield + this.slots.engine;
    if (sum !== TOTAL_ENERGY) {
      const diff = TOTAL_ENERGY - sum;
      if (this.slots.engine + diff >= SLOT_MIN && this.slots.engine + diff <= SLOT_MAX) {
        this.slots.engine += diff;
      } else if (this.slots.shield + diff >= SLOT_MIN && this.slots.shield + diff <= SLOT_MAX) {
        this.slots.shield += diff;
      } else {
        this.slots.weapon += diff;
      }
    }
  }

  public startTween(target: EnergySlots, now: number, duration: number = 500): void {
    this.tween = {
      slots: { ...target },
      startTime: now,
      duration,
      startSlots: { ...this.slots },
    };
  }

  public updateTween(now: number): boolean {
    if (!this.tween) return false;
    const elapsed = now - this.tween.startTime;
    if (elapsed >= this.tween.duration) {
      this.slots = { ...this.tween.slots };
      this.normalize();
      this.tween = null;
      return true;
    }
    const t = elapsed / this.tween.duration;
    const easeOut = 1 - Math.pow(1 - t, 3);
    this.slots.weapon = Math.round(this.tween.startSlots.weapon + (this.tween.slots.weapon - this.tween.startSlots.weapon) * easeOut);
    this.slots.shield = Math.round(this.tween.startSlots.shield + (this.tween.slots.shield - this.tween.startSlots.shield) * easeOut);
    this.slots.engine = Math.round(this.tween.startSlots.engine + (this.tween.slots.engine - this.tween.startSlots.engine) * easeOut);
    this.normalize();
    return false;
  }

  public reset(): void {
    if (this.isPlayer) {
      this.slots = { weapon: 50, shield: 50, engine: 50 };
    } else {
      this.slots = { weapon: 45, shield: 60, engine: 45 };
    }
    this.hp = this.maxHp;
    this.tween = null;
    this.shieldFlashUntil = 0;
    this.shieldFlashFrequency = 0;
  }
}
