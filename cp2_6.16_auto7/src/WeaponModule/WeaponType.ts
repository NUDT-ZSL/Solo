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

export const WEAPON_CONSTANTS = {
  ARROW_SPEED: 8,
  ARROW_GRAVITY: 0.02,
  ARROW_TRACKING: 0,
  ARROW_SPLASH: 0,
  MAGIC_SPEED: 12,
  MAGIC_GRAVITY: 0,
  MAGIC_TRACKING: 5,
  MAGIC_SPLASH: 0,
  AXE_SPEED: 6,
  AXE_GRAVITY: 0.03,
  AXE_TRACKING: 0,
  AXE_SPLASH: 60
} as const;

export const PARTICLE_CONSTANTS = {
  START_COLOR: { r: 255, g: 170, b: 0 },
  END_COLOR: { r: 255, g: 51, b: 0 },
  COUNT: 8,
  MIN_RADIUS: 3,
  MAX_RADIUS: 6,
  LIFE_FRAMES: 36,
  LIFE_SECONDS: 0.6
} as const;

export const PLAYER_CONSTANTS = {
  RADIUS: 20,
  INTERPOLATION: 0.15,
  COLOR: '#ffd700',
  STROKE_COLOR: '#ffd700',
  STROKE_WIDTH: 2
} as const;

export const ENEMY_CONSTANTS = {
  WIDTH: 40,
  HEIGHT: 40,
  COLOR: '#2ecc71',
  STROKE_COLOR: '#00ff88',
  STROKE_WIDTH: 1
} as const;

export const UI_CONSTANTS = {
  AIM_LINE_COLOR: '#ff5252',
  AIM_LINE_WIDTH: 2,
  TOOLBAR_BG: 'rgba(30,30,30,0.9)',
  TOOLBAR_RADIUS: 16,
  TOOLBAR_HEIGHT: 80,
  TOOLBAR_WIDTH_PERCENT: 0.6,
  SELECTED_BORDER: '#ffd700',
  UNSELECTED_BORDER: '#888888',
  BUTTON_WIDTH: 50,
  BUTTON_HEIGHT: 50,
  BUTTON_RADIUS: 8,
  TRANSITION_MS: 150,
  BG_COLOR: '#1a1a2e',
  MAP_COLOR: '#2d2d44',
  MAP_RADIUS: 8,
  MIN_MAP_WIDTH: 600,
  SCORE_FONT_SIZE: 24,
  SCORE_SCALE_AMOUNT: 0.3,
  ANIMATION_DURATION_FRAMES: 30
} as const;
