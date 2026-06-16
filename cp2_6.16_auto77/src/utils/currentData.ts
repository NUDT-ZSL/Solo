export interface OceanCurrent {
  name: string;
  start: [number, number];
  end: [number, number];
  speedRange: [number, number];
  color: string;
}

export const oceanCurrents: OceanCurrent[] = [
  {
    name: '墨西哥湾流',
    start: [25, -80],
    end: [45, -20],
    speedRange: [0.8, 2.5],
    color: '#e63946',
  },
  {
    name: '黑潮',
    start: [15, 125],
    end: [38, 145],
    speedRange: [0.6, 2.0],
    color: '#ff6b35',
  },
  {
    name: '南极环流',
    start: [-55, -180],
    end: [-55, 180],
    speedRange: [0.3, 1.2],
    color: '#00d4ff',
  },
  {
    name: '北大西洋暖流',
    start: [40, -30],
    end: [60, 0],
    speedRange: [0.5, 1.8],
    color: '#ff6b35',
  },
  {
    name: '秘鲁寒流',
    start: [-45, -75],
    end: [-10, -80],
    speedRange: [0.2, 1.0],
    color: '#00d4ff',
  },
  {
    name: '加利福尼亚寒流',
    start: [40, -125],
    end: [20, -110],
    speedRange: [0.3, 1.1],
    color: '#00d4ff',
  },
  {
    name: '东澳大利亚暖流',
    start: [-20, 155],
    end: [-40, 150],
    speedRange: [0.4, 1.5],
    color: '#ff6b35',
  },
  {
    name: '巴西暖流',
    start: [-10, -35],
    end: [-35, -50],
    speedRange: [0.5, 1.6],
    color: '#ff6b35',
  },
  {
    name: '本格拉寒流',
    start: [-30, 15],
    end: [-10, 10],
    speedRange: [0.3, 1.2],
    color: '#00d4ff',
  },
  {
    name: '北太平洋暖流',
    start: [30, 150],
    end: [45, -130],
    speedRange: [0.4, 1.4],
    color: '#ff6b35',
  },
];

export const SPEED_COLORS = {
  slow: '#00d4ff',
  medium: '#ff6b35',
  fast: '#e63946',
} as const;

export const getSpeedColor = (speed: number): string => {
  if (speed < 0.7) return SPEED_COLORS.slow;
  if (speed < 1.5) return SPEED_COLORS.medium;
  return SPEED_COLORS.fast;
};

export const EARTH_RADIUS = 8;
export const PARTICLE_COUNT_PER_CURRENT = 200;
