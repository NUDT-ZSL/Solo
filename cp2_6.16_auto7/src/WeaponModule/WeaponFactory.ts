import { eventBus } from '../shared/EventBus';
import {
  WeaponType,
  IWeapon,
  IProjectile,
  WEAPON_CONFIGS
} from './WeaponType';

export class WeaponFactory {
  private currentWeapon: IWeapon;
  private projectileIdCounter = 0;

  constructor(initialWeapon: WeaponType = WeaponType.ARROW) {
    this.currentWeapon = this.createWeapon(initialWeapon);
  }

  createWeapon(type: WeaponType): IWeapon {
    const config = WEAPON_CONFIGS[type];
    return {
      type,
      ...config
    };
  }

  setCurrentWeapon(type: WeaponType): void {
    this.currentWeapon = this.createWeapon(type);
    eventBus.emit('weapon:switch', { weapon: this.currentWeapon });
  }

  getCurrentWeapon(): IWeapon {
    return this.currentWeapon;
  }

  fire(
    startX: number,
    startY: number,
    targetX: number,
    targetY: number,
    targetId?: number
  ): IProjectile {
    const dx = targetX - startX;
    const dy = targetY - startY;
    const distance = Math.sqrt(dx * dx + dy * dy) || 1;
    const speed = this.currentWeapon.speed;

    const projectile: IProjectile = {
      id: ++this.projectileIdCounter,
      x: startX,
      y: startY,
      vx: (dx / distance) * speed,
      vy: (dy / distance) * speed,
      weapon: this.currentWeapon,
      targetId,
      rotation: Math.atan2(dy, dx),
      trail: []
    };

    eventBus.emit('weapon:fire', { projectile });
    return projectile;
  }

  updateProjectile(projectile: IProjectile, enemies: { id: number; x: number; y: number }[]): void {
    projectile.trail.push({ x: projectile.x, y: projectile.y });
    if (projectile.trail.length > 20) {
      projectile.trail.shift();
    }

    if (projectile.weapon.trackingAngle > 0 && projectile.targetId !== undefined) {
      const target = enemies.find((e) => e.id === projectile.targetId);
      if (target) {
        const dx = target.x - projectile.x;
        const dy = target.y - projectile.y;
        const targetAngle = Math.atan2(dy, dx);
        let currentAngle = Math.atan2(projectile.vy, projectile.vx);
        let angleDiff = targetAngle - currentAngle;

        while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
        while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

        const trackingRad = (projectile.weapon.trackingAngle * Math.PI) / 180;
        if (Math.abs(angleDiff) > trackingRad) {
          angleDiff = Math.sign(angleDiff) * trackingRad;
        }

        currentAngle += angleDiff;
        const speed = Math.sqrt(projectile.vx ** 2 + projectile.vy ** 2);
        projectile.vx = Math.cos(currentAngle) * speed;
        projectile.vy = Math.sin(currentAngle) * speed;
      }
    }

    projectile.vy += projectile.weapon.gravity;
    projectile.x += projectile.vx;
    projectile.y += projectile.vy;
    projectile.rotation = Math.atan2(projectile.vy, projectile.vx);
  }
}
