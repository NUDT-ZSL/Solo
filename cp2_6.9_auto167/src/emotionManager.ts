export type EmotionType = 'neutral' | 'happy' | 'sad' | 'angry' | 'calm';

export interface EmotionConfig {
  colorStart: string;
  colorEnd: string;
  primaryColor: string;
  noiseStrength: number;
  speedMultiplier: number;
  damping: number;
  sineFrequency: number;
  sineAmplitude: number;
  jitterAmount: number;
  convergeOffset: number;
  targetSpeed: number;
}

export const EMOTIONS: Record<EmotionType, EmotionConfig> = {
  neutral: {
    colorStart: '#888888',
    colorEnd: '#888888',
    primaryColor: '#888888',
    noiseStrength: 0.5,
    speedMultiplier: 1.0,
    damping: 1.0,
    sineFrequency: 0,
    sineAmplitude: 0,
    jitterAmount: 0,
    convergeOffset: 0,
    targetSpeed: 1.0,
  },
  happy: {
    colorStart: '#FFD93D',
    colorEnd: '#FF9A9E',
    primaryColor: '#FFD93D',
    noiseStrength: 0.6,
    speedMultiplier: 1.0,
    damping: 1.0,
    sineFrequency: 0.02,
    sineAmplitude: 2,
    jitterAmount: 0,
    convergeOffset: 3,
    targetSpeed: 1.0,
  },
  sad: {
    colorStart: '#6C5CE7',
    colorEnd: '#A29BFE',
    primaryColor: '#6C5CE7',
    noiseStrength: 0.3,
    speedMultiplier: 0.5,
    damping: 0.98,
    sineFrequency: 0,
    sineAmplitude: 0,
    jitterAmount: 0,
    convergeOffset: 1,
    targetSpeed: 0.5,
  },
  angry: {
    colorStart: '#FF6B6B',
    colorEnd: '#E17055',
    primaryColor: '#FF6B6B',
    noiseStrength: 1.5,
    speedMultiplier: 2.0,
    damping: 1.0,
    sineFrequency: 0,
    sineAmplitude: 0,
    jitterAmount: 4,
    convergeOffset: 6,
    targetSpeed: 2.0,
  },
  calm: {
    colorStart: '#55EFC4',
    colorEnd: '#81ECEC',
    primaryColor: '#55EFC4',
    noiseStrength: 0.2,
    speedMultiplier: 1.0,
    damping: 0.995,
    sineFrequency: 0.005,
    sineAmplitude: 0.5,
    jitterAmount: 0,
    convergeOffset: 0.5,
    targetSpeed: 0.2,
  },
};

export function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const clean = hex.replace('#', '');
  const r = parseInt(clean.substring(0, 2), 16);
  const g = parseInt(clean.substring(2, 4), 16);
  const b = parseInt(clean.substring(4, 6), 16);
  return { r, g, b };
}

export function lerpColor(
  color1: string,
  color2: string,
  t: number
): { r: number; g: number; b: number } {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return {
    r: Math.round(c1.r + (c2.r - c1.r) * t),
    g: Math.round(c1.g + (c2.g - c1.g) * t),
    b: Math.round(c1.b + (c2.b - c1.b) * t),
  };
}

export class EmotionManager {
  private currentEmotion: EmotionType = 'neutral';
  private targetEmotion: EmotionType = 'neutral';
  private transitionProgress: number = 1;
  private readonly transitionDuration: number = 1500;
  private lastUpdateTime: number = 0;

  private currentRgb = hexToRgb(EMOTIONS.neutral.colorStart);
  private targetRgb = hexToRgb(EMOTIONS.neutral.colorStart);

  public setEmotion(emotion: EmotionType): void {
    if (this.targetEmotion === emotion) return;
    this.targetEmotion = emotion;
    this.transitionProgress = 0;
    this.lastUpdateTime = performance.now();
    this.targetRgb = hexToRgb(EMOTIONS[emotion].colorStart);
  }

  public update(time: number): void {
    const dt = time - this.lastUpdateTime;
    this.lastUpdateTime = time;

    if (this.transitionProgress < 1) {
      this.transitionProgress = Math.min(
        1,
        this.transitionProgress + dt / this.transitionDuration
      );
      const t = this.easeInOutCubic(this.transitionProgress);
      const currentConfig = EMOTIONS[this.currentEmotion];
      const targetConfig = EMOTIONS[this.targetEmotion];
      this.currentRgb = lerpColor(
        currentConfig.colorStart,
        targetConfig.colorStart,
        t
      );
      if (this.transitionProgress >= 1) {
        this.currentEmotion = this.targetEmotion;
      }
    }
  }

  public getCurrentConfig(): EmotionConfig {
    const t = this.easeInOutCubic(this.transitionProgress);
    const current = EMOTIONS[this.currentEmotion];
    const target = EMOTIONS[this.targetEmotion];

    return {
      colorStart: this.getColorString(),
      colorEnd: this.lerpColorString(current.colorEnd, target.colorEnd, t),
      primaryColor: this.lerpColorString(current.primaryColor, target.primaryColor, t),
      noiseStrength: this.lerp(current.noiseStrength, target.noiseStrength, t),
      speedMultiplier: this.lerp(current.speedMultiplier, target.speedMultiplier, t),
      damping: this.lerp(current.damping, target.damping, t),
      sineFrequency: this.lerp(current.sineFrequency, target.sineFrequency, t),
      sineAmplitude: this.lerp(current.sineAmplitude, target.sineAmplitude, t),
      jitterAmount: this.lerp(current.jitterAmount, target.jitterAmount, t),
      convergeOffset: this.lerp(current.convergeOffset, target.convergeOffset, t),
      targetSpeed: this.lerp(current.targetSpeed, target.targetSpeed, t),
    };
  }

  public getColorString(): string {
    return `rgb(${this.currentRgb.r}, ${this.currentRgb.g}, ${this.currentRgb.b})`;
  }

  public getEmotion(): EmotionType {
    return this.targetEmotion;
  }

  private lerpColorString(c1: string, c2: string, t: number): string {
    const rgb = lerpColor(c1, c2, t);
    return `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`;
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private easeInOutCubic(t: number): number {
    return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
  }
}
