export type SeasonName = 'spring' | 'summer' | 'autumn' | 'winter';

export interface SeasonConfig {
  name: string;
  canopyColor: string;
  groundColor: string;
  skyColor: string;
  ambientIntensity: number;
  particleColors: string[];
  grassColor: string;
}

function shadeColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max(0, Math.min(255, (num >> 16) + amt));
  const G = Math.max(0, Math.min(255, ((num >> 8) & 0x00ff) + amt));
  const B = Math.max(0, Math.min(255, (num & 0x0000ff) + amt));
  return '#' + ((1 << 24) + (R << 16) + (G << 8) + B).toString(16).slice(1);
}

function generateParticleVariants(base: string, count = 8): string[] {
  const variants: string[] = [];
  const step = 40 / count;
  for (let i = 0; i < count; i++) {
    variants.push(shadeColor(base, -20 + i * step));
  }
  return variants;
}

export const SEASON_CONFIGS: Record<SeasonName, SeasonConfig> = {
  spring: {
    name: '春季',
    canopyColor: '#7ec850',
    groundColor: '#8bbf5f',
    skyColor: '#87ceeb',
    ambientIntensity: 0.7,
    particleColors: generateParticleVariants('#7ec850'),
    grassColor: '#7ec850',
  },
  summer: {
    name: '夏季',
    canopyColor: '#2d8a4e',
    groundColor: '#3a7d44',
    skyColor: '#4a90d9',
    ambientIntensity: 0.9,
    particleColors: generateParticleVariants('#2d8a4e'),
    grassColor: '#2d8a4e',
  },
  autumn: {
    name: '秋季',
    canopyColor: '#d97706',
    groundColor: '#a0522d',
    skyColor: '#f5a623',
    ambientIntensity: 0.6,
    particleColors: generateParticleVariants('#d97706'),
    grassColor: '#a67c52',
  },
  winter: {
    name: '冬季',
    canopyColor: '#6b7280',
    groundColor: '#e5e7eb',
    skyColor: '#d1d5db',
    ambientIntensity: 0.4,
    particleColors: generateParticleVariants('#6b7280'),
    grassColor: '#8b7355',
  },
};

export const SEASON_ORDER: SeasonName[] = ['spring', 'summer', 'autumn', 'winter'];

export const TOTAL_PARTICLES = 20 * 200;
export const TREE_COUNT = 20;
export const PARTICLES_PER_TREE = 200;
