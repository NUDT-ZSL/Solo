export enum ParticleType {
  Empty = 0,
  Sand = 1,
  Water = 2,
  Wood = 3
}

export const GRID_WIDTH = 500;
export const GRID_HEIGHT = 500;

export const PARTICLE_COLORS: Record<ParticleType, number> = {
  [ParticleType.Empty]: 0x000000,
  [ParticleType.Sand]: 0xE8C561,
  [ParticleType.Water]: 0x4A9BE8,
  [ParticleType.Wood]: 0x8B5A2B
};

export const PARTICLE_CSS_COLORS: Record<ParticleType, string> = {
  [ParticleType.Empty]: '#000000',
  [ParticleType.Sand]: '#E8C561',
  [ParticleType.Water]: '#4A9BE8',
  [ParticleType.Wood]: '#8B5A2B'
};

export const MAX_PARTICLES_PER_FRAME = 5;
export const WATER_SPREAD_FACTOR = 0.5;
export const WOOD_CRUSH_THRESHOLD = 15;

export const CANVAS_PADDING = 30;
export const CANVAS_BORDER_WIDTH = 2;

export const BUTTON_SIZE = 60;
export const BUTTON_OPACITY_DEFAULT = 0.6;
export const BUTTON_OPACITY_SELECTED = 1.0;

export const PARTICLE_TYPE_LABELS: Record<ParticleType, string> = {
  [ParticleType.Empty]: '空',
  [ParticleType.Sand]: '沙',
  [ParticleType.Water]: '水',
  [ParticleType.Wood]: '木材'
};

export const ERASER_LABEL = '清除';
