export enum RuneType {
  FIRE = 'fire',
  WATER = 'water',
  WIND = 'wind',
  EARTH = 'earth',
  LIGHT = 'light',
  DARK = 'dark'
}

export const RUNE_CONFIG: Record<RuneType, { name: string; color: string; symbol: string }> = {
  [RuneType.FIRE]: { name: '火', color: '#FF4500', symbol: '🔥' },
  [RuneType.WATER]: { name: '水', color: '#1E90FF', symbol: '💧' },
  [RuneType.WIND]: { name: '风', color: '#32CD32', symbol: '🌪' },
  [RuneType.EARTH]: { name: '土', color: '#8B4513', symbol: '🪨' },
  [RuneType.LIGHT]: { name: '光', color: '#FFD700', symbol: '✨' },
  [RuneType.DARK]: { name: '暗', color: '#9400D3', symbol: '🌑' }
};

export function getRuneLevelColor(level: number): string {
  const colors = ['#FF4500', '#FF6347', '#FF7F50', '#FFA07A', '#FFDAB9'];
  return colors[Math.min(level - 1, colors.length - 1)];
}

export interface Rune {
  id: number;
  type: RuneType;
  level: number;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  scale: number;
  targetScale: number;
  isDragging: boolean;
  isFlying: boolean;
  flyProgress: number;
  flyStartX: number;
  flyStartY: number;
  flyEndX: number;
  flyEndY: number;
  flashCount: number;
  flashTimer: number;
  isInSlot: boolean;
  slotIndex: number | null;
  animationTime: number;
}

export enum SpiritType {
  FIRE_SPIRIT = 'fire_spirit',
  WATER_SPIRIT = 'water_spirit',
  WIND_SPIRIT = 'wind_spirit',
  EARTH_SPIRIT = 'earth_spirit'
}

export const SPIRIT_CONFIG: Record<SpiritType, {
  name: string;
  typeName: string;
  color: string;
  gradientStart: string;
  gradientEnd: string;
  skill: string;
  skillDesc: string;
  stars: number;
}> = {
  [SpiritType.FIRE_SPIRIT]: {
    name: '红焰',
    typeName: '火精灵',
    color: '#FF4500',
    gradientStart: '#FF6347',
    gradientEnd: '#8B0000',
    skill: '烈焰风暴',
    skillDesc: '召唤炽热火焰风暴，对范围内敌人造成持续灼烧伤害。',
    stars: 3
  },
  [SpiritType.WATER_SPIRIT]: {
    name: '蓝波',
    typeName: '水精灵',
    color: '#1E90FF',
    gradientStart: '#00BFFF',
    gradientEnd: '#00008B',
    skill: '潮汐之怒',
    skillDesc: '操控海洋之力掀起巨浪，冰冻并冲击敌方目标。',
    stars: 3
  },
  [SpiritType.WIND_SPIRIT]: {
    name: '翠羽',
    typeName: '风精灵',
    color: '#32CD32',
    gradientStart: '#7CFC00',
    gradientEnd: '#006400',
    skill: '旋风斩击',
    skillDesc: '化身利刃旋风，以极快速度切割穿透敌人。',
    stars: 3
  },
  [SpiritType.EARTH_SPIRIT]: {
    name: '岩甲',
    typeName: '土精灵',
    color: '#8B4513',
    gradientStart: '#D2691E',
    gradientEnd: '#3E2723',
    skill: '山崩地裂',
    skillDesc: '凝聚大地力量引发地震，召唤巨岩碾压敌人。',
    stars: 3
  }
};

export interface Spirit {
  id: number;
  type: SpiritType;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  opacity: number;
  rotation: number;
  scale: number;
  isSummoning: boolean;
  summonProgress: number;
  animationFrame: number;
  animationTime: number;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  color: string;
  life: number;
  maxLife: number;
}

export interface Slot {
  x: number;
  y: number;
  width: number;
  height: number;
  rune: Rune | null;
}

export const SPIRIT_TYPE_MAP: Record<RuneType, SpiritType> = {
  [RuneType.FIRE]: SpiritType.FIRE_SPIRIT,
  [RuneType.WATER]: SpiritType.WATER_SPIRIT,
  [RuneType.WIND]: SpiritType.WIND_SPIRIT,
  [RuneType.EARTH]: SpiritType.EARTH_SPIRIT,
  [RuneType.LIGHT]: SpiritType.FIRE_SPIRIT,
  [RuneType.DARK]: SpiritType.EARTH_SPIRIT
};
