import { eventBus } from '../shared/EventBus';
import { WeaponFactory } from '../WeaponModule/WeaponFactory';
import { WeaponType } from '../WeaponModule/WeaponType';

export class Player {
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  radius: number;
  health: number;
  maxHealth: number;
  score: number;
  scoreAnimation: number;
  healthAnimation: number;
  gameOver: boolean;
  private weaponFactory: WeaponFactory;
  private readonly INTERPOLATION = 0.15;

  constructor(
    x: number,
    y: number,
    weaponFactory: WeaponFactory
  ) {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.radius = 20;
    this.health = 5;
    this.maxHealth = 5;
    this.score = 0;
    this.scoreAnimation = 0;
    this.healthAnimation = 0;
    this.gameOver = false;
    this.weaponFactory = weaponFactory;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    eventBus.on('enemy:death', () => {
      this.score += 10;
      this.scoreAnimation = 1;
      eventBus.emit('player:score', { score: this.score });
    });

    eventBus.on('player:damage', (data: unknown) => {
      const { damage } = data as { damage: number };
      this.health -= damage;
      this.healthAnimation = 1;

      if (this.health <= 0) {
        this.health = 0;
        this.gameOver = true;
        eventBus.emit('game:over', { finalScore: this.score });
      }
    });
  }

  setTargetPosition(x: number, y: number): void {
    this.targetX = x;
    this.targetY = y;
  }

  switchWeapon(type: WeaponType): void {
    this.weaponFactory.setCurrentWeapon(type);
  }

  getCurrentWeapon() {
    return this.weaponFactory.getCurrentWeapon();
  }

  fire(startX: number, startY: number, targetX: number, targetY: number, targetId?: number): void {
    if (this.gameOver) return;
    this.weaponFactory.fire(startX, startY, targetX, targetY, targetId);
  }

  update(): void {
    this.x += (this.targetX - this.x) * this.INTERPOLATION;
    this.y += (this.targetY - this.y) * this.INTERPOLATION;

    if (this.scoreAnimation > 0) {
      this.scoreAnimation -= 0.033;
      if (this.scoreAnimation < 0) this.scoreAnimation = 0;
    }

    if (this.healthAnimation > 0) {
      this.healthAnimation -= 0.033;
      if (this.healthAnimation < 0) this.healthAnimation = 0;
    }
  }

  containsPoint(px: number, py: number): boolean {
    const dx = px - this.x;
    const dy = py - this.y;
    return dx * dx + dy * dy <= this.radius * this.radius;
  }

  reset(x: number, y: number): void {
    this.x = x;
    this.y = y;
    this.targetX = x;
    this.targetY = y;
    this.health = this.maxHealth;
    this.score = 0;
    this.scoreAnimation = 0;
    this.healthAnimation = 0;
    this.gameOver = false;
    this.weaponFactory.setCurrentWeapon(WeaponType.ARROW);
    eventBus.emit('player:score', { score: 0 });
  }
}
