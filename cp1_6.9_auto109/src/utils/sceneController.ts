export type SceneId = 'default' | 'dawn' | 'aurora';

export interface RGB {
  r: number;
  g: number;
  b: number;
}

export interface RGBA extends RGB {
  a: number;
}

export interface SceneConfig {
  id: SceneId;
  name: string;
  particleColorCenter: RGB;
  particleColorEdge: RGBA;
  textureHueMin: number;
  textureHueMax: number;
  brightnessMultiplier: number;
  whiteParticleRatio: number;
  burstColor: string;
}

export interface RenderParams {
  particleColorCenter: RGB;
  particleColorEdge: RGBA;
  textureHueMin: number;
  textureHueMax: number;
  brightnessMultiplier: number;
  whiteParticleRatio: number;
}

const DEFAULT_CONFIG: SceneConfig = {
  id: 'default',
  name: '默认',
  particleColorCenter: { r: 255, g: 255, b: 255 },
  particleColorEdge: { r: 100, g: 150, b: 255, a: 0.2 },
  textureHueMin: 200,
  textureHueMax: 260,
  brightnessMultiplier: 1.0,
  whiteParticleRatio: 0,
  burstColor: 'rgba(100, 150, 255, 0.9)',
};

const DAWN_CONFIG: SceneConfig = {
  id: 'dawn',
  name: '晨曦',
  particleColorCenter: hexToRgb('#FFA500'),
  particleColorEdge: hexToRgba('#FF4500', 0.2),
  textureHueMin: 0,
  textureHueMax: 30,
  brightnessMultiplier: 1.2,
  whiteParticleRatio: 0,
  burstColor: 'rgba(255, 140, 0, 0.9)',
};

const AURORA_CONFIG: SceneConfig = {
  id: 'aurora',
  name: '极光',
  particleColorCenter: hexToRgb('#00FF7F'),
  particleColorEdge: hexToRgba('#8A2BE2', 0.2),
  textureHueMin: 120,
  textureHueMax: 240,
  brightnessMultiplier: 1.0,
  whiteParticleRatio: 0.15,
  burstColor: 'rgba(0, 255, 127, 0.9)',
};

const SCENES: Record<SceneId, SceneConfig> = {
  default: DEFAULT_CONFIG,
  dawn: DAWN_CONFIG,
  aurora: AURORA_CONFIG,
};

export const TRANSITION_DURATION = 4000;
export const BURST_DURATION = 800;

export function hexToRgb(hex: string): RGB {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return { r, g, b };
}

export function hexToRgba(hex: string, a: number): RGBA {
  const rgb = hexToRgb(hex);
  return { ...rgb, a };
}

export function rgbToString(rgb: RGB, alpha = 1): string {
  return `rgba(${Math.round(rgb.r)}, ${Math.round(rgb.g)}, ${Math.round(rgb.b)}, ${alpha})`;
}

export function rgbaToString(rgba: RGBA): string {
  return `rgba(${Math.round(rgba.r)}, ${Math.round(rgba.g)}, ${Math.round(rgba.b)}, ${rgba.a})`;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpRgb(a: RGB, b: RGB, t: number): RGB {
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
  };
}

export function lerpRgba(a: RGBA, b: RGBA, t: number): RGBA {
  return {
    r: lerp(a.r, b.r, t),
    g: lerp(a.g, b.g, t),
    b: lerp(a.b, b.b, t),
    a: lerp(a.a, b.a, t),
  };
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class SceneController {
  private currentScene: SceneConfig;
  private fromScene: SceneConfig | null = null;
  private toScene: SceneConfig | null = null;
  private transitionStartTime = 0;
  private isTransitioning = false;
  private onBurst: ((color: string) => void) | null = null;
  private onSceneChange: ((id: SceneId) => void) | null = null;

  constructor(initialScene: SceneId = 'default') {
    this.currentScene = SCENES[initialScene];
  }

  setBurstCallback(cb: (color: string) => void) {
    this.onBurst = cb;
  }

  setSceneChangeCallback(cb: (id: SceneId) => void) {
    this.onSceneChange = cb;
  }

  getCurrentSceneId(): SceneId {
    return this.currentScene.id;
  }

  getSceneConfig(id: SceneId): SceneConfig {
    return SCENES[id];
  }

  switchScene(targetId: SceneId): void {
    if (targetId === this.currentScene.id && !this.isTransitioning) return;

    const targetScene = SCENES[targetId];
    const currentRendered = this.getRenderParams();

    this.fromScene = {
      ...this.currentScene,
      particleColorCenter: currentRendered.particleColorCenter,
      particleColorEdge: currentRendered.particleColorEdge,
      textureHueMin: currentRendered.textureHueMin,
      textureHueMax: currentRendered.textureHueMax,
      brightnessMultiplier: currentRendered.brightnessMultiplier,
      whiteParticleRatio: currentRendered.whiteParticleRatio,
    };
    this.toScene = targetScene;
    this.transitionStartTime = performance.now();
    this.isTransitioning = true;
    this.currentScene = targetScene;

    if (this.onBurst) {
      this.onBurst(targetScene.burstColor);
    }

    if (this.onSceneChange) {
      this.onSceneChange(targetId);
    }
  }

  getRenderParams(now: number = performance.now()): RenderParams {
    if (!this.isTransitioning || !this.fromScene || !this.toScene) {
      return {
        particleColorCenter: this.currentScene.particleColorCenter,
        particleColorEdge: this.currentScene.particleColorEdge,
        textureHueMin: this.currentScene.textureHueMin,
        textureHueMax: this.currentScene.textureHueMax,
        brightnessMultiplier: this.currentScene.brightnessMultiplier,
        whiteParticleRatio: this.currentScene.whiteParticleRatio,
      };
    }

    const elapsed = now - this.transitionStartTime;
    const rawT = Math.min(elapsed / TRANSITION_DURATION, 1);
    const t = easeInOutCubic(rawT);

    if (rawT >= 1) {
      this.isTransitioning = false;
      this.fromScene = null;
      this.toScene = null;
      return {
        particleColorCenter: this.currentScene.particleColorCenter,
        particleColorEdge: this.currentScene.particleColorEdge,
        textureHueMin: this.currentScene.textureHueMin,
        textureHueMax: this.currentScene.textureHueMax,
        brightnessMultiplier: this.currentScene.brightnessMultiplier,
        whiteParticleRatio: this.currentScene.whiteParticleRatio,
      };
    }

    return {
      particleColorCenter: lerpRgb(this.fromScene.particleColorCenter, this.toScene.particleColorCenter, t),
      particleColorEdge: lerpRgba(this.fromScene.particleColorEdge, this.toScene.particleColorEdge, t),
      textureHueMin: lerp(this.fromScene.textureHueMin, this.toScene.textureHueMin, t),
      textureHueMax: lerp(this.fromScene.textureHueMax, this.toScene.textureHueMax, t),
      brightnessMultiplier: lerp(this.fromScene.brightnessMultiplier, this.toScene.brightnessMultiplier, t),
      whiteParticleRatio: lerp(this.fromScene.whiteParticleRatio, this.toScene.whiteParticleRatio, t),
    };
  }

  isInTransition(): boolean {
    return this.isTransitioning;
  }
}
