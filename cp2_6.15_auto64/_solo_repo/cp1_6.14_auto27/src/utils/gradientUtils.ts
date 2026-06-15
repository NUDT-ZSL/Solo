export interface ColorStop {
  id: string;
  position: number;
  color: string;
}

export type GradientType = 'linear' | 'radial' | 'conic';

export type BlendMode = 'normal' | 'multiply' | 'screen' | 'overlay' | 'darken' | 'lighten' | 'color-dodge';

export interface GradientConfig {
  type: GradientType;
  colors: ColorStop[];
  angle: number;
  centerX: number;
  centerY: number;
  shape: 'circle' | 'ellipse';
}

export interface OverlayConfig {
  enabled: boolean;
  gradient: GradientConfig;
  blendMode: BlendMode;
  opacity: number;
}

export interface Preset {
  name: string;
  gradient: GradientConfig;
  overlay?: OverlayConfig;
}

export function createDefaultColorStops(): ColorStop[] {
  return [
    { id: '1', position: 0, color: '#ff6b6b' },
    { id: '2', position: 33, color: '#feca57' },
    { id: '3', position: 66, color: '#48dbfb' },
    { id: '4', position: 100, color: '#0abde3' }
  ];
}

export function createDefaultGradient(): GradientConfig {
  return {
    type: 'radial',
    colors: createDefaultColorStops(),
    angle: 180,
    centerX: 30,
    centerY: 40,
    shape: 'ellipse'
  };
}

export function createDefaultOverlay(): OverlayConfig {
  return {
    enabled: true,
    gradient: {
      type: 'linear',
      colors: [
        { id: '1', position: 0, color: '#6c63ff' },
        { id: '2', position: 100, color: '#00d4ff' }
      ],
      angle: 45,
      centerX: 50,
      centerY: 50,
      shape: 'circle'
    },
    blendMode: 'overlay',
    opacity: 60
  };
}

export const presets: Preset[] = [
  {
    name: '日落',
    gradient: {
      type: 'linear',
      colors: [
        { id: '1', position: 0, color: '#ff6b6b' },
        { id: '2', position: 50, color: '#feca57' },
        { id: '3', position: 100, color: '#ff9ff3' }
      ],
      angle: 180,
      centerX: 50,
      centerY: 50,
      shape: 'circle'
    },
    overlay: {
      enabled: false,
      gradient: createDefaultGradient(),
      blendMode: 'normal',
      opacity: 60
    }
  },
  {
    name: '海洋',
    gradient: {
      type: 'linear',
      colors: [
        { id: '1', position: 0, color: '#0abde3' },
        { id: '2', position: 100, color: '#006992' }
      ],
      angle: 180,
      centerX: 50,
      centerY: 50,
      shape: 'circle'
    }
  },
  {
    name: '极光',
    gradient: {
      type: 'linear',
      colors: [
        { id: '1', position: 0, color: '#a29bfe' },
        { id: '2', position: 33, color: '#6c5ce7' },
        { id: '3', position: 66, color: '#00cec9' },
        { id: '4', position: 100, color: '#55efc4' }
      ],
      angle: 135,
      centerX: 50,
      centerY: 50,
      shape: 'circle'
    },
    overlay: {
      enabled: true,
      gradient: {
        type: 'radial',
        colors: [
          { id: '1', position: 0, color: '#fd79a8' },
          { id: '2', position: 100, color: 'transparent' }
        ],
        angle: 0,
        centerX: 70,
        centerY: 30,
        shape: 'circle'
      },
      blendMode: 'screen',
      opacity: 50
    }
  },
  {
    name: '赛博朋克',
    gradient: {
      type: 'linear',
      colors: [
        { id: '1', position: 0, color: '#f368e0' },
        { id: '2', position: 50, color: '#ff6b6b' },
        { id: '3', position: 100, color: '#00d2d3' }
      ],
      angle: 45,
      centerX: 50,
      centerY: 50,
      shape: 'circle'
    },
    overlay: {
      enabled: true,
      gradient: {
        type: 'conic',
        colors: [
          { id: '1', position: 0, color: '#00d2d3' },
          { id: '2', position: 25, color: '#ff9ff3' },
          { id: '3', position: 50, color: '#feca57' },
          { id: '4', position: 75, color: '#48dbfb' },
          { id: '5', position: 100, color: '#00d2d3' }
        ],
        angle: 0,
        centerX: 50,
        centerY: 50,
        shape: 'circle'
      },
      blendMode: 'overlay',
      opacity: 40
    }
  },
  {
    name: '森林',
    gradient: {
      type: 'radial',
      colors: [
        { id: '1', position: 0, color: '#00b894' },
        { id: '2', position: 100, color: '#00695c' }
      ],
      angle: 0,
      centerX: 50,
      centerY: 50,
      shape: 'circle'
    }
  },
  {
    name: '薰衣草',
    gradient: {
      type: 'linear',
      colors: [
        { id: '1', position: 0, color: '#a29bfe' },
        { id: '2', position: 100, color: '#fd79a8' }
      ],
      angle: 160,
      centerX: 50,
      centerY: 50,
      shape: 'circle'
    }
  },
  {
    name: '火焰',
    gradient: {
      type: 'radial',
      colors: [
        { id: '1', position: 0, color: '#feca57' },
        { id: '2', position: 30, color: '#ff6b6b' },
        { id: '3', position: 100, color: '#ee5a24' }
      ],
      angle: 0,
      centerX: 50,
      centerY: 80,
      shape: 'ellipse'
    }
  },
  {
    name: '太空',
    gradient: {
      type: 'radial',
      colors: [
        { id: '1', position: 0, color: '#2d3436' },
        { id: '2', position: 50, color: '#6c5ce7' },
        { id: '3', position: 100, color: '#0984e3' }
      ],
      angle: 0,
      centerX: 30,
      centerY: 30,
      shape: 'ellipse'
    }
  },
  {
    name: '彩虹',
    gradient: {
      type: 'linear',
      colors: [
        { id: '1', position: 0, color: '#ff6b6b' },
        { id: '2', position: 16.6, color: '#feca57' },
        { id: '3', position: 33.2, color: '#48dbfb' },
        { id: '4', position: 49.8, color: '#0abde3' },
        { id: '5', position: 66.4, color: '#a29bfe' },
        { id: '6', position: 83, color: '#fd79a8' },
        { id: '7', position: 100, color: '#ff6b6b' }
      ],
      angle: 90,
      centerX: 50,
      centerY: 50,
      shape: 'circle'
    }
  },
  {
    name: '午夜',
    gradient: {
      type: 'linear',
      colors: [
        { id: '1', position: 0, color: '#0c0c1e' },
        { id: '2', position: 50, color: '#1a1a3e' },
        { id: '3', position: 100, color: '#2d1b69' }
      ],
      angle: 180,
      centerX: 50,
      centerY: 50,
      shape: 'circle'
    },
    overlay: {
      enabled: true,
      gradient: {
        type: 'radial',
        colors: [
          { id: '1', position: 0, color: '#6c63ff' },
          { id: '2', position: 100, color: 'transparent' }
        ],
        angle: 0,
        centerX: 70,
        centerY: 30,
        shape: 'circle'
      },
      blendMode: 'screen',
      opacity: 30
    }
  },
  {
    name: '蜜桃',
    gradient: {
      type: 'linear',
      colors: [
        { id: '1', position: 0, color: '#ffeaa7' },
        { id: '2', position: 100, color: '#fab1a0' }
      ],
      angle: 135,
      centerX: 50,
      centerY: 50,
      shape: 'circle'
    }
  },
  {
    name: '深海',
    gradient: {
      type: 'linear',
      colors: [
        { id: '1', position: 0, color: '#0a3d62' },
        { id: '2', position: 50, color: '#3c6382' },
        { id: '3', position: 100, color: '#60a3bc' }
      ],
      angle: 180,
      centerX: 50,
      centerY: 50,
      shape: 'circle'
    }
  }
];

export const blendModes: BlendMode[] = ['normal', 'multiply', 'screen', 'overlay', 'darken', 'lighten', 'color-dodge'];

export function generateGradientCSS(config: GradientConfig): string {
  const sortedColors = [...config.colors].sort((a, b) => a.position - b.position);
  const colorStops = sortedColors.map(s => `${s.color} ${s.position}%`).join(', ');

  switch (config.type) {
    case 'linear':
      return `linear-gradient(${config.angle}deg, ${colorStops})`;
    case 'radial':
      return `radial-gradient(${config.shape} at ${config.centerX}% ${config.centerY}%, ${colorStops})`;
    case 'conic':
      return `conic-gradient(from ${config.angle}deg at ${config.centerX}% ${config.centerY}%, ${colorStops})`;
    default:
      return '';
  }
}

export function generateFullCSS(
  baseGradient: GradientConfig,
  overlay?: OverlayConfig
): string {
  const baseCSS = generateGradientCSS(baseGradient);
  
  if (overlay?.enabled) {
    const overlayCSS = generateGradientCSS(overlay.gradient);
    return `background-image: ${overlayCSS}, ${baseCSS};
background-blend-mode: ${overlay.blendMode};
opacity: ${overlay.opacity / 100};`;
  }
  
  return `background-image: ${baseCSS};`;
}

export function generateBackgroundCSS(
  baseGradient: GradientConfig,
  overlay?: OverlayConfig
): string {
  const baseCSS = generateGradientCSS(baseGradient);
  
  if (overlay?.enabled) {
    return `${generateGradientCSS(overlay.gradient)}, ${baseCSS}`;
  }
  
  return baseCSS;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16)
      }
    : null;
}

export function generateUniqueId(): string {
  return Math.random().toString(36).substring(2, 9);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}
