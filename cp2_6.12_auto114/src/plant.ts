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
const SPRROUT_DURATION = 800;

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
  }

  update(deltaTime: number, currentEmotion: EmotionType, emotionValues: Record<EmotionType, number>) {
    this.age += deltaTime;

    if (this.isSprouting) {
      this.sproutProgress = Math.min(1, this.sproutProgress + deltaTime / SPRROUT_DURATION);
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
      flowerRadius: this.interpolate