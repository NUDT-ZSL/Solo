export type EmotionType = 'happy' | 'sad' | 'angry' | 'calm';

export interface PlantState {
  stemHeight: number;
  stemWidth: number;
  leafSize: number;
  leafRoundness: number;
  leafSerrations: number;
  leafBendAngle: number;
  flowerRadius: number;
  flowerColor: string;
  flowerOpenness: number;
  flowerTiltAngle: number;
  flowerSpikiness: number;
}

export interface PlantEmotionConfig {
  stemHeight: number;
  leafSize: number;
  leafRoundness: number;
  leafSerrations: number;
  leafBendAngle: number;
  flowerRadius: number;
  flowerColor: string;
  flowerOpenness: number;
  flowerTiltAngle: number;
  flowerSpikiness: number;
}

const EMOTION_CONFIGS: Record<EmotionType, PlantEmotionConfig> = {
  happy: {
    stemHeight: 90,
    leafSize: 28,
    leafRoundness: 1,
    leafSerrations: 0,
    leafBendAngle: 0,
    flowerRadius: 18,
    flowerColor: '#ffcc00',
    flowerOpenness: 1,
    flowerTiltAngle: 0,
    flowerSpikiness: 0,
  },
  sad: {
    stemHeight: 70,
    leafSize: 24,
    leafRoundness: 0.5,
    leafSerrations: 0,
    leafBendAngle: 20,
    flowerRadius: 14,
    flowerColor: '#6633cc',
    flowerOpenness: 0.3,
    flowerTiltAngle: 15,
    flowerSpikiness: 0,
  },
  angry: {
    stemHeight: 85,
    leafSize: 26,
    leafRoundness: 0.3,
    leafSerrations: 8,
    leafBendAngle: -10,
    flowerRadius: 10,
    flowerColor: '#cc0000',
    flowerOpenness: 0.8,
    flowerTiltAngle: 0,
    flowerSpikiness: 1,
  },
  calm: {
    stemHeight: 80,
    leafSize: 25,
    leafRoundness: 0.8,
    leafSerrations: 0,
    leafBendAngle: 0,
    flowerRadius: 16,
    flowerColor: '#cc99ff',
    flowerOpenness: 0.5,
    flowerTiltAngle: 0,
    flowerSpikiness: 0,
  },
};

const BASE_STATE: PlantState = {
  stemHeight: 75,
  stemWidth: 4,
  leafSize: 25,
  leafRoundness: 0.7,
  leafSerrations: 0,
  leafBendAngle: 0,
  flowerRadius: 15,
  flowerColor: '#228B22',
  flowerOpenness: 0.6,
  flowerTiltAngle: 0,
  flowerSpikiness: 0,
};

const TWEEN_DURATION = 1500;
const LIFECYCLE_DURATION = 60000;
const WITHER_DURATION = 1500;
const SPROUT_DURATION = 800;

function hexToRgb(hex: string): { r: number; g: number; b: number } {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return result
    ? {
        r: parseInt(result[1], 16),
        g: parseInt(result[2], 16),
        b: parseInt(result[3], 16),
      }
    : { r: 34, g: 139, b: 34 };
}

function rgbToHex(r: number, g: number, b: number): string {
  return (
    '#' +
    [r, g, b]
      .map((x) => {
        const hex = Math.round(Math.max(0, Math.min(255, x))).toString(16);
        return hex.length === 1 ? '0' + hex : hex;
      })
      .join('')
  );
}

function interpolateColor(color1: string, color2: string, t: number): string {
  const c1 = hexToRgb(color1);
  const c2 = hexToRgb(color2);
  return rgbToHex(
    c1.r + (c2.r - c1.r) * t,
    c1.g + (c2.g - c1.g) * t,
    c1.b + (c2.b - c1.b) * t
  );
}

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

export class Plant {
  x: number;
  y: number;
  currentState: PlantState;
  targetState: PlantState;
  tweenStartState: PlantState | null = null;
  tweenProgress = 0;
  isTweening = false;
  tweenStartTime = 0;

  age = 0;
  isWithering = false;
  witherProgress = 0;
  isSprouting = true;
  sproutProgress = 0;
  isWatered = false;
  waterFlashProgress = 0;
  isPruning = false;
  pruneShakeProgress = 0;
  shakeOffset = 0;

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.currentState = { ...BASE_STATE };
    this.targetState = { ...BASE_STATE };
    this.age = LIFECYCLE_DURATION * 0.3 * Math.random();
  }

  update(deltaTime: number, currentEmotion: EmotionType, emotionValues: Record<EmotionType, number>) {
    this.age += deltaTime;

    if (this.isSprouting) {
      this.sproutProgress = Math.min(1, this.sproutProgress + deltaTime / SPROUT_DURATION);
      if (this.sproutProgress >= 1) {
        this.isSprouting = false;
      }
    }

    if (!this.isWithering && !this.isSprouting && this.age >= LIFECYCLE_DURATION) {
      this.isWithering = true;
      this.witherProgress = 0;
    }

    if (this.isWithering) {
      this.witherProgress = Math.min(1, this.witherProgress + deltaTime / WITHER_DURATION);
      if (this.witherProgress >= 1) {
        this.respawn();
      }
    }

    if (this.isWatered) {
      this.waterFlashProgress = Math.max(0, this.waterFlashProgress - deltaTime / 300);
      if (this.waterFlashProgress <= 0) {
        this.isWatered = false;
      }
    }

    if (this.isPruning) {
      this.pruneShakeProgress = Math.max(0, this.pruneShakeProgress - deltaTime / 500);
      this.shakeOffset = Math.sin(Date.now() / 20) * 3 * this.pruneShakeProgress;
      if (this.pruneShakeProgress <= 0) {
        this.isPruning = false;
        this.shakeOffset = 0;
      }
    }

    if (!this.isWithering && !this.isSprouting) {
      this.calculateTargetState(currentEmotion, emotionValues);

      if (!this.isTweening) {
        const needsTween = this.needsTween();
        if (needsTween) {
          this.startTween();
        }
      }

      if (this.isTweening) {
        this.updateTween(deltaTime);
      }
    }
  }

  private calculateTargetState(currentEmotion: EmotionType, emotionValues: Record<EmotionType, number>) {
    const emotions: EmotionType[] = ['happy', 'sad', 'angry', 'calm'];
    let totalWeight = 0;
    const weights: Record<EmotionType, number> = { happy: 0, sad: 0, angry: 0, calm: 0 };

    for (const emotion of emotions) {
      weights[emotion] = emotionValues[emotion] / 100;
      totalWeight += weights[emotion];
    }

    if (totalWeight === 0) {
      this.targetState = { ...BASE_STATE };
      return;
    }

    for (const emotion of emotions) {
      weights[emotion] /= totalWeight;
    }

    this.targetState = {
      stemHeight: this.interpolate('stemHeight', weights),
      stemWidth: 4,
      leafSize: this.interpolate('leafSize', weights),
      leafRoundness: this.interpolate('leafRoundness', weights),
      leafSerrations: this.interpolate('leafSerrations', weights),
      leafBendAngle: this.interpolate('leafBendAngle', weights),
      flowerRadius: this.interpolate('flowerRadius', weights),
      flowerColor: this.interpolateColor(weights),
      flowerOpenness: this.interpolate('flowerOpenness', weights),
      flowerTiltAngle: this.interpolate('flowerTiltAngle', weights),
      flowerSpikiness: this.interpolate('flowerSpikiness', weights),
    };
  }

  private interpolate(key: keyof PlantEmotionConfig, weights: Record<EmotionType, number>): number {
    const emotions: EmotionType[] = ['happy', 'sad', 'angry', 'calm'];
    let result = 0;
    for (const emotion of emotions) {
      result += (EMOTION_CONFIGS[emotion][key] as number) * weights[emotion];
    }
    return result;
  }

  private interpolateColor(weights: Record<EmotionType, number>): string {
    const emotions: EmotionType[] = ['happy', 'sad', 'angry', 'calm'];
    let r = 0,
      g = 0,
      b = 0;
    for (const emotion of emotions) {
      const rgb = hexToRgb(EMOTION_CONFIGS[emotion].flowerColor);
      r += rgb.r * weights[emotion];
      g += rgb.g * weights[emotion];
      b += rgb.b * weights[emotion];
    }
    return rgbToHex(r, g, b);
  }

  private needsTween(): boolean {
    const keys: (keyof PlantState)[] = [
      'stemHeight',
      'leafSize',
      'leafRoundness',
      'leafSerrations',
      'leafBendAngle',
      'flowerRadius',
      'flowerOpenness',
      'flowerTiltAngle',
      'flowerSpikiness',
    ];
    for (const key of keys) {
      if (Math.abs((this.currentState[key] as number) - (this.targetState[key] as number)) > 0.01) {
        return true;
      }
    }
    return this.currentState.flowerColor !== this.targetState.flowerColor;
  }

  private startTween() {
    this.tweenStartState = { ...this.currentState };
    this.tweenProgress = 0;
    this.isTweening = true;
    this.tweenStartTime = Date.now();
  }

  private updateTween(deltaTime: number) {
    this.tweenProgress += deltaTime / TWEEN_DURATION;
    if (this.tweenProgress >= 1) {
      this.tweenProgress = 1;
      this.isTweening = false;
      this.currentState = { ...this.targetState };
      this.tweenStartState = null;
      return;
    }

    if (!this.tweenStartState) return;

    const t = easeInOutCubic(this.tweenProgress);
    const start = this.tweenStartState;
    const target = this.targetState;

    this.currentState.stemHeight = start.stemHeight + (target.stemHeight - start.stemHeight) * t;
    this.currentState.leafSize = start.leafSize + (target.leafSize - start.leafSize) * t;
    this.currentState.leafRoundness = start.leafRoundness + (target.leafRoundness - start.leafRoundness) * t;
    this.currentState.leafSerrations = start.leafSerrations + (target.leafSerrations - start.leafSerrations) * t;
    this.currentState.leafBendAngle = start.leafBendAngle + (target.leafBendAngle - start.leafBendAngle) * t;
    this.currentState.flowerRadius = start.flowerRadius + (target.flowerRadius - start.flowerRadius) * t;
    this.currentState.flowerOpenness = start.flowerOpenness + (target.flowerOpenness - start.flowerOpenness) * t;
    this.currentState.flowerTiltAngle = start.flowerTiltAngle + (target.flowerTiltAngle - start.flowerTiltAngle) * t;
    this.currentState.flowerSpikiness = start.flowerSpikiness + (target.flowerSpikiness - start.flowerSpikiness) * t;
    this.currentState.flowerColor = interpolateColor(start.flowerColor, target.flowerColor, t);
  }

  private respawn() {
    this.age = 0;
    this.isWithering = false;
    this.witherProgress = 0;
    this.isSprouting = true;
    this.sproutProgress = 0;
    this.currentState = { ...BASE_STATE };
    this.targetState = { ...BASE_STATE };
    this.tweenStartState = null;
    this.isTweening = false;
    this.tweenProgress = 0;
  }

  water() {
    this.isWatered = true;
    this.waterFlashProgress = 1;
    this.age = Math.max(0, this.age - 10000);
  }

  prune() {
    this.isPruning = true;
    this.pruneShakeProgress = 1;
    const reduction = 30;
    this.currentState.stemHeight = Math.max(30, this.currentState.stemHeight - reduction);
    if (this.tweenStartState) {
      this.tweenStartState.stemHeight = this.currentState.stemHeight;
    }
    this.targetState.stemHeight = Math.max(this.targetState.stemHeight - reduction, 30);
  }

  getRenderState() {
    let opacity = 1;
    let scaleY = 1;
    let colorOverride: string | null = null;

    if (this.isSprouting) {
      scaleY = easeInOutCubic(this.sproutProgress);
      opacity = this.sproutProgress;
    }

    if (this.isWithering) {
      opacity = 0.3 + 0.7 * (1 - this.witherProgress);
      colorOverride = interpolateColor(this.currentState.flowerColor, '#8B4513', this.witherProgress);
    }

    return {
      state: this.currentState,
      opacity,
      scaleY,
      colorOverride,
      waterFlash: this.waterFlashProgress,
      shakeOffset: this.shakeOffset,
    };
  }

  containsPoint(px: number, py: number): boolean {
    const dx = Math.abs(px - this.x);
    const stemTop = this.y - this.currentState.stemHeight;
    const dy = py >= stemTop && py <= this.y + 20;
    return dx < this.currentState.leafSize + this.currentState.flowerRadius + 10 && dy;
  }
}
