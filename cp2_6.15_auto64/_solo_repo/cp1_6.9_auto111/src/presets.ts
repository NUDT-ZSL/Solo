import type { Preset, TextureParams, GradientStop, TextureLayer } from './types';

const generateId = (): string => Math.random().toString(36).slice(2, 11);

const DEFAULT_STOPS = (): GradientStop[] => [
  { id: generateId(), position: 0, color: '#667eea' },
  { id: generateId(), position: 100, color: '#764ba2' }
];

export const createDefaultGradientStops = DEFAULT_STOPS;

export const createDefaultLayer = (type: TextureLayer['type']): TextureLayer => ({
  id: generateId(),
  type,
  intensity: 50,
  color: '#ffffff',
  scale: 5,
  angle: 0
});

export const defaultTextureParams: TextureParams = {
  backgroundColor: '#1a1a2e',
  layers: [
    { ...createDefaultLayer('noise'), intensity: 25, color: '#4a5568', scale: 8 },
    { ...createDefaultLayer('waves'), intensity: 30, color: '#667eea', scale: 6, angle: 15 },
    { ...createDefaultLayer('grid'), intensity: 20, color: '#e94560', scale: 4 }
  ],
  gradient: {
    enabled: true,
    type: 'linear',
    stops: DEFAULT_STOPS(),
    angle: 135,
    blendMode: 'overlay',
    opacity: 60
  }
};

export const PRESETS: Preset[] = [
  {
    id: 'deep-space',
    name: '深空星云',
    description: '深邃宇宙中的星辰与星云',
    thumbnail: '🌌',
    backgroundColor: '#0a0a1a',
    layers: [
      { id: generateId(), type: 'noise', intensity: 70, color: '#ffffff', scale: 12, angle: 0 },
      { id: generateId(), type: 'waves', intensity: 35, color: '#667eea', scale: 8, angle: 45 },
      { id: generateId(), type: 'stripes', intensity: 15, color: '#f093fb', scale: 2, angle: 90 }
    ],
    gradient: {
      enabled: true,
      type: 'radial',
      stops: [
        { id: generateId(), position: 0, color: '#4facfe' },
        { id: generateId(), position: 50, color: '#00f2fe' },
        { id: generateId(), position: 100, color: '#43e97b' }
      ],
      angle: 0,
      blendMode: 'overlay',
      opacity: 70
    }
  },
  {
    id: 'warm-wood',
    name: '温暖木纹',
    description: '自然优雅的木质纹理',
    thumbnail: '🪵',
    backgroundColor: '#8b5a2b',
    layers: [
      { id: generateId(), type: 'stripes', intensity: 65, color: '#654321', scale: 1, angle: 90 },
      { id: generateId(), type: 'waves', intensity: 45, color: '#a0522d', scale: 12, angle: 85 },
      { id: generateId(), type: 'noise', intensity: 20, color: '#d2691e', scale: 6, angle: 0 }
    ],
    gradient: {
      enabled: true,
      type: 'linear',
      stops: [
        { id: generateId(), position: 0, color: '#f5deb3' },
        { id: generateId(), position: 100, color: '#8b4513' }
      ],
      angle: 0,
      blendMode: 'soft-light',
      opacity: 50
    }
  },
  {
    id: 'cold-metal',
    name: '冷冽金属',
    description: '工业风格的金属拉丝质感',
    thumbnail: '⚙️',
    backgroundColor: '#2d3748',
    layers: [
      { id: generateId(), type: 'stripes', intensity: 45, color: '#718096', scale: 8, angle: 0 },
      { id: generateId(), type: 'noise', intensity: 55, color: '#a0aec0', scale: 2, angle: 0 },
      { id: generateId(), type: 'waves', intensity: 15, color: '#e2e8f0', scale: 3, angle: 5 }
    ],
    gradient: {
      enabled: true,
      type: 'linear',
      stops: [
        { id: generateId(), position: 0, color: '#cbd5e0' },
        { id: generateId(), position: 50, color: '#4a5568' },
        { id: generateId(), position: 100, color: '#718096' }
      ],
      angle: 180,
      blendMode: 'overlay',
      opacity: 60
    }
  },
  {
    id: 'neon-grid',
    name: '霓虹网格',
    description: '赛博朋克风格的发光网格',
    thumbnail: '🏙️',
    backgroundColor: '#0d0221',
    layers: [
      { id: generateId(), type: 'grid', intensity: 75, color: '#00ffff', scale: 6, angle: 0 },
      { id: generateId(), type: 'stripes', intensity: 30, color: '#ff00ff', scale: 3, angle: 45 },
      { id: generateId(), type: 'noise', intensity: 25, color: '#ffff00', scale: 10, angle: 0 }
    ],
    gradient: {
      enabled: true,
      type: 'linear',
      stops: [
        { id: generateId(), position: 0, color: '#ff0080' },
        { id: generateId(), position: 50, color: '#7928ca' },
        { id: generateId(), position: 100, color: '#00ffff' }
      ],
      angle: 135,
      blendMode: 'hard-light',
      opacity: 75
    }
  }
];

export const generateRandomHex = (): string => {
  const letters = '0123456789ABCDEF';
  let color = '#';
  for (let i = 0; i < 6; i++) {
    color += letters[Math.floor(Math.random() * 16)];
  }
  return color;
};

export const generateRandomParams = (): TextureParams => {
  const layerTypes: TextureLayer['type'][] = ['noise', 'stripes', 'waves', 'grid'];
  const numLayers = Math.floor(Math.random() * 3) + 2;
  const layers: TextureLayer[] = [];
  const usedTypes = new Set<TextureLayer['type']>();

  for (let i = 0; i < numLayers; i++) {
    let type: TextureLayer['type'];
    if (usedTypes.size < layerTypes.length) {
      do {
        type = layerTypes[Math.floor(Math.random() * layerTypes.length)];
      } while (usedTypes.has(type));
      usedTypes.add(type);
    } else {
      type = layerTypes[Math.floor(Math.random() * layerTypes.length)];
    }

    layers.push({
      id: generateId(),
      type,
      intensity: Math.floor(Math.random() * 60) + 25,
      color: generateRandomHex(),
      scale: Math.floor(Math.random() * 8) + 2,
      angle: Math.floor(Math.random() * 180) - 90
    });
  }

  const numStops = Math.floor(Math.random() * 3) + 2;
  const stops: GradientStop[] = [];
  for (let i = 0; i < numStops; i++) {
    stops.push({
      id: generateId(),
      position: Math.floor((100 / (numStops - 1)) * i),
      color: generateRandomHex()
    });
  }

  const blendModes: Array<'normal' | 'overlay' | 'soft-light' | 'hard-light'> = ['overlay', 'soft-light', 'hard-light'];
  const gradientTypes: Array<'linear' | 'radial'> = ['linear', 'radial'];

  return {
    backgroundColor: generateRandomHex(),
    layers,
    gradient: {
      enabled: Math.random() > 0.1,
      type: gradientTypes[Math.floor(Math.random() * gradientTypes.length)],
      stops,
      angle: Math.floor(Math.random() * 360),
      blendMode: blendModes[Math.floor(Math.random() * blendModes.length)],
      opacity: Math.floor(Math.random() * 40) + 45
    }
  };
};

export const generateId = generateId;
