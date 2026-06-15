export enum WeaponType {
  ARROW = 'arrow',
  MAGIC = 'magic',
  AXE = 'axe'
}

export interface IWeapon {
  type: WeaponType;
  speed: number;
  gravity: number;
  trackingAngle: number;
  splashRadius: number;
  icon: string;
  name: string;
}

export interface IProjectile {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  weapon: IWeapon;
  targetId?: number;
  rotation: number;
  trail: { x: number; y: number }[];
}

export interface IParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface IEnemy {
  id: number;
  x: number;
  y: number;
  width: number;
  height: number;
  speed: number;
  health: number;
  maxHealth: number;
}

export const WEAPON_CONFIGS: Record<WeaponType, Omit<IWeapon, 'type'>> = {
  [WeaponType.ARROW]: {
    speed: 8,
    gravity: 0.02,
    trackingAngle: 0,
    splashRadius: 0,
    icon: 'arrow',
    name: '弓箭'
  },
  [WeaponType.MAGIC]: {
    speed: 12,
    gravity: 0,
    trackingAngle: 5,
    splashRadius: 0,
    icon: 'magic',
    name: '魔法球'
  },
  [WeaponType.AXE]: {
    speed: 6,
    gravity: 0.03,
    trackingAngle: 0,
    splashRadius: 60,
    icon: 'axe',
    name: '投掷斧'
  }
};
