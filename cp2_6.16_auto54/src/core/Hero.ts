import { Position, HeroStats } from '../types';

let heroIdCounter = 0;

export class Hero {
  public id: string;
  public name: string;
  public emoji: string;
  public star: number;
  public atk: number;
  public hp: number;
  public maxHp: number;
  public range: number;
  public speed: number;
  public pos: Position | null;
  public isEnemy: boolean;
  public cost: number;
  public lastAttackTime: number = 0;
  public lastMoveTime: number = 0;

  constructor(stats: HeroStats, pos: Position | null = null) {
    this.id = `hero_${++heroIdCounter}`;
    this.name = stats.name;
    this.emoji = stats.emoji;
    this.star = 1;
    this.atk = stats.baseAtk;
    this.hp = stats.baseHp;
    this.maxHp = stats.baseHp;
    this.range = stats.range;
    this.speed = stats.speed;
    this.pos = pos;
    this.isEnemy = stats.isEnemy || false;
    this.cost = stats.cost;
  }

  attack(target: Hero): number {
    if (!this.isInRange(target)) {
      return 0;
    }
    const damage = this.atk;
    target.takeDamage(damage);
    return damage;
  }

  takeDamage(damage: number): void {
    this.hp = Math.max(0, this.hp - damage);
  }

  isInRange(target: Hero): boolean {
    if (!this.pos || !target.pos) return false;
    const distance = this.getDistance(target.pos);
    return distance <= this.range;
  }

  getDistance(targetPos: Position): number {
    if (!this.pos) return Infinity;
    const dx = Math.abs(this.pos.x - targetPos.x);
    const dy = Math.abs(this.pos.y - targetPos.y);
    return Math.max(dx, dy);
  }

  moveToward(targetPos: Position): Position {
    if (!this.pos) return targetPos;
    let newX = this.pos.x;
    let newY = this.pos.y;

    if (this.pos.x < targetPos.x) newX++;
    else if (this.pos.x > targetPos.x) newX--;

    if (this.pos.y < targetPos.y) newY++;
    else if (this.pos.y > targetPos.y) newY--;

    return { x: newX, y: newY };
  }

  upgrade(): void {
    this.star++;
    this.atk = Math.floor(this.atk * 1.5);
    this.maxHp = Math.floor(this.maxHp * 1.5);
    this.hp = this.maxHp;
  }

  isAlive(): boolean {
    return this.hp > 0;
  }

  clone(): Hero {
    const cloned = new Hero({
      name: this.name,
      emoji: this.emoji,
      cost: this.cost,
      baseAtk: this.atk,
      baseHp: this.maxHp,
      range: this.range,
      speed: this.speed,
      isEnemy: this.isEnemy,
    }, this.pos ? { ...this.pos } : null);
    cloned.id = this.id;
    cloned.star = this.star;
    cloned.hp = this.hp;
    cloned.lastAttackTime = this.lastAttackTime;
    cloned.lastMoveTime = this.lastMoveTime;
    return cloned;
  }
}
