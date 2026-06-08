export type TimeEffectType = 'accelerate' | 'decelerate' | 'reverse';

export interface TimeEffectZone {
  x: number;
  y: number;
  radius: number;
  type: TimeEffectType;
  strength: number;
  remaining: number;
  maxDuration: number;
}

export class TimeManager {
  private globalSpeed: number = 1.0;
  private zones: TimeEffectZone[] = [];
  private cooldownDuration: number = 2000;
  private cooldowns: Map<string, number> = new Map();
  private elapsed: number = 0;

  get globalTimeSpeed(): number {
    return this.globalSpeed;
  }

  setGlobalSpeed(speed: number): void {
    this.globalSpeed = Phaser.Math.Clamp(speed, 0.1, 3.0);
  }

  get cooldownTime(): number {
    return this.cooldownDuration;
  }

  setCooldownTime(ms: number): void {
    this.cooldownDuration = Phaser.Math.Clamp(ms, 500, 10000);
  }

  addZone(zone: TimeEffectZone): void {
    this.zones.push(zone);
  }

  canPlace(key: string): boolean {
    const last = this.cooldowns.get(key) ?? 0;
    return this.elapsed - last >= this.cooldownDuration;
  }

  recordPlacement(key: string): void {
    this.cooldowns.set(key, this.elapsed);
  }

  getCooldownProgress(key: string): number {
    const last = this.cooldowns.get(key) ?? 0;
    const diff = this.elapsed - last;
    return Phaser.Math.Clamp(diff / this.cooldownDuration, 0, 1);
  }

  getLocalSpeed(x: number, y: number): number {
    let speed = this.globalSpeed;

    for (const zone of this.zones) {
      const dx = x - zone.x;
      const dy = y - zone.y;
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist < zone.radius) {
        const falloff = 1 - dist / zone.radius;
        const factor = 1 + (zone.strength - 1) * falloff;

        if (zone.type === 'accelerate') {
          speed *= factor;
        } else if (zone.type === 'decelerate') {
          speed /= factor;
        } else if (zone.type === 'reverse') {
          speed = -this.globalSpeed * zone.strength * falloff;
        }
      }
    }

    return speed;
  }

  isReversedAt(x: number, y: number): boolean {
    for (const zone of this.zones) {
      if (zone.type !== 'reverse') continue;
      const dx = x - zone.x;
      const dy = y - zone.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < zone.radius) return true;
    }
    return false;
  }

  update(delta: number): void {
    this.elapsed += delta;

    for (const zone of this.zones) {
      const localSpeed = this.globalSpeed;
      zone.remaining -= delta * localSpeed;
    }

    this.zones = this.zones.filter(z => z.remaining > 0);
  }

  getActiveZones(): readonly TimeEffectZone[] {
    return this.zones;
  }

  getElapsed(): number {
    return this.elapsed;
  }
}
