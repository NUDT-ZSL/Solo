export interface RoomConfig {
  width: number;
  depth: number;
  height: number;
  wallMaterial: {
    color: string;
    roughness: number;
  };
  floorMaterial: {
    color: string;
    roughness: number;
  };
}

export interface WindowConfig {
  type: WindowType;
  label: string;
  icon: string;
  getWidth: () => number;
  getHeight: () => number;
  getDepth: () => number;
  shape: 'circle' | 'arch' | 'rectangle' | 'skylight';
}

export type WindowType = 'circle' | 'arch' | 'fullLength' | 'skylight';
export type Season = 'spring' | 'summer' | 'autumn' | 'winter';

export const ROOM_CONFIG: RoomConfig = {
  width: 8,
  depth: 6,
  height: 3.5,
  wallMaterial: {
    color: '#f0ebe3',
    roughness: 0.6,
  },
  floorMaterial: {
    color: '#8b7355',
    roughness: 0.8,
  },
};

export const WINDOW_CONFIGS: Record<WindowType, WindowConfig> = {
  circle: {
    type: 'circle',
    label: '圆窗',
    icon: '◎',
    getWidth: () => 2,
    getHeight: () => 2,
    getDepth: () => 0.3,
    shape: 'circle',
  },
  arch: {
    type: 'arch',
    label: '拱窗',
    icon: '⌒',
    getWidth: () => 1.5,
    getHeight: () => 2,
    getDepth: () => 0.3,
    shape: 'arch',
  },
  fullLength: {
    type: 'fullLength',
    label: '落地窗',
    icon: '▭',
    getWidth: () => 2,
    getHeight: () => 2.8,
    getDepth: () => 0.3,
    shape: 'rectangle',
  },
  skylight: {
    type: 'skylight',
    label: '天窗',
    icon: '◇',
    getWidth: () => 1.2,
    getHeight: () => 1.2,
    getDepth: () => 0.3,
    shape: 'skylight',
  },
};

export const SEASON_SOLAR_DATA: Record<Season, {
  maxAltitude: number;
  minAltitude: number;
  azimuthOffset: number;
  intensityMultiplier: number;
  label: string;
}> = {
  spring: {
    maxAltitude: 55,
    minAltitude: 5,
    azimuthOffset: 0,
    intensityMultiplier: 0.85,
    label: '春',
  },
  summer: {
    maxAltitude: 72,
    minAltitude: 8,
    azimuthOffset: 5,
    intensityMultiplier: 1.0,
    label: '夏',
  },
  autumn: {
    maxAltitude: 48,
    minAltitude: 3,
    azimuthOffset: -5,
    intensityMultiplier: 0.75,
    label: '秋',
  },
  winter: {
    maxAltitude: 30,
    minAltitude: 1,
    azimuthOffset: -10,
    intensityMultiplier: 0.6,
    label: '冬',
  },
};

export const WINDOW_TYPES: WindowType[] = ['circle', 'arch', 'fullLength', 'skylight'];
export const SEASONS: Season[] = ['spring', 'summer', 'autumn', 'winter'];
