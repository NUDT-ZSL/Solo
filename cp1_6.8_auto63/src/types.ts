export type TreeType = 'pine' | 'oak' | 'cherry';
export type AnimalType = 'squirrel' | 'butterfly' | 'bird';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export interface TreeData {
  id: number;
  type: TreeType;
  x: number;
  y: number;
  growth: number;
  maxHeight: number;
  swayPhase: number;
  swaySpeed: number;
  age: number;
  leafParticles: LeafParticle[];
  leafSpawnTimer: number;
}

export interface AnimalData {
  id: number;
  type: AnimalType;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  speed: number;
  animPhase: number;
  animSpeed: number;
  targetTreeId: number | null;
  idle: boolean;
  idleTimer: number;
  direction: number;
}

export interface LeafParticle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  alpha: number;
  color: string;
  size: number;
  rotation: number;
  rotationSpeed: number;
  life: number;
  maxLife: number;
}

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  speed: number;
}

export interface ForestStats {
  treeCount: number;
  animalCount: number;
  season: Season;
}

export const SEASON_ORDER: Season[] = ['spring', 'summer', 'autumn', 'winter'];

export const SEASON_COLORS: Record<Season, Record<TreeType, { trunk: string; foliage: string[] }>> = {
  spring: {
    pine: { trunk: '#5D4037', foliage: ['#2E7D32', '#388E3C', '#43A047'] },
    oak: { trunk: '#4E342E', foliage: ['#66BB6A', '#81C784', '#A5D6A7'] },
    cherry: { trunk: '#5D4037', foliage: ['#F48FB1', '#F06292', '#EC407A'] },
  },
  summer: {
    pine: { trunk: '#4E342E', foliage: ['#1B5E20', '#2E7D32', '#388E3C'] },
    oak: { trunk: '#3E2723', foliage: ['#2E7D32', '#388E3C', '#43A047'] },
    cherry: { trunk: '#4E342E', foliage: ['#4CAF50', '#66BB6A', '#81C784'] },
  },
  autumn: {
    pine: { trunk: '#5D4037', foliage: ['#33691E', '#558B2F', '#689F38'] },
    oak: { trunk: '#4E342E', foliage: ['#FF8F00', '#F57F17', '#E65100'] },
    cherry: { trunk: '#5D4037', foliage: ['#FF6D00', '#E65100', '#BF360C'] },
  },
  winter: {
    pine: { trunk: '#6D4C41', foliage: ['#37474F', '#455A64', '#546E7A'] },
    oak: { trunk: '#5D4037', foliage: ['#795548', '#8D6E63', '#A1887F'] },
    cherry: { trunk: '#6D4C41', foliage: ['#8D6E63', '#A1887F', '#BCAAA4'] },
  },
};

export const LEAF_COLORS: Record<Season, Record<TreeType, string[]>> = {
  spring: {
    pine: ['#43A047', '#66BB6A', '#81C784'],
    oak: ['#81C784', '#A5D6A7', '#C8E6C9'],
    cherry: ['#F48FB1', '#F8BBD0', '#FCE4EC'],
  },
  summer: {
    pine: ['#2E7D32', '#388E3C', '#43A047'],
    oak: ['#388E3C', '#43A047', '#66BB6A'],
    cherry: ['#66BB6A', '#81C784', '#A5D6A7'],
  },
  autumn: {
    pine: ['#558B2F', '#689F38', '#7CB342'],
    oak: ['#FF8F00', '#FFA000', '#FFB300'],
    cherry: ['#FF6D00', '#FF8F00', '#FFA000'],
  },
  winter: {
    pine: ['#546E7A', '#607D8B', '#78909C'],
    oak: ['#8D6E63', '#A1887F', '#BCAAA4'],
    cherry: ['#A1887F', '#BCAAA4', '#D7CCC8'],
  },
};

export const BG_GRADIENTS: Record<Season, [string, string]> = {
  spring: ['#0D2818', '#1A4D2E'],
  summer: ['#0A1F0A', '#1B5E20'],
  autumn: ['#1A0F00', '#3E2723'],
  winter: ['#1A237E', '#0D1B2A'],
};

export const ANIMAL_COLORS: Record<AnimalType, { body: string; accent: string }> = {
  squirrel: { body: '#8D6E63', accent: '#D7CCC8' },
  butterfly: { body: '#CE93D8', accent: '#F48FB1' },
  bird: { body: '#64B5F6', accent: '#E3F2FD' },
};

export const TREE_ANIMAL_AFFINITY: Record<TreeType, AnimalType> = {
  pine: 'squirrel',
  oak: 'squirrel',
  cherry: 'butterfly',
};
