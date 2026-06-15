import type { EmotionData, Emotions, EmotionKey } from '../types';

const USER_COUNT = 16;
const UPDATE_INTERVAL = 2000;

const emotionKeys: EmotionKey[] = ['joy', 'fear', 'anger', 'surprise'];

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

function generateUserId(index: number): string {
  return `A${String(index + 1).padStart(2, '0')}`;
}

export class Simulator {
  private timerId: number | null = null;
  private callback: ((data: EmotionData[]) => void) | null = null;
  private baseValues: Emotions[] = [];
  private trends: Emotions[] = [];
  private phase: number = 0;

  constructor() {
    this.initUserStates();
  }

  private initUserStates(): void {
    for (let i = 0; i < USER_COUNT; i++) {
      this.baseValues.push({
        joy: Math.random() * 0.4 + 0.2,
        fear: Math.random() * 0.2,
        anger: Math.random() * 0.1,
        surprise: Math.random() * 0.3 + 0.1
      });
      this.trends.push({
        joy: (Math.random() - 0.5) * 0.02,
        fear: (Math.random() - 0.5) * 0.015,
        anger: (Math.random() - 0.5) * 0.01,
        surprise: (Math.random() - 0.5) * 0.02
      });
    }
  }

  private generateBatch(): EmotionData[] {
    const now = Date.now();
    const data: EmotionData[] = [];
    this.phase += 0.1;

    for (let i = 0; i < USER_COUNT; i++) {
      const base = this.baseValues[i];
      const trend = this.trends[i];

      const waveJoy = Math.sin(this.phase + i * 0.3) * 0.15;
      const waveFear = Math.cos(this.phase * 0.8 + i * 0.4) * 0.1;
      const waveAnger = Math.sin(this.phase * 0.6 + i * 0.5) * 0.08;
      const waveSurprise = Math.cos(this.phase * 1.2 + i * 0.25) * 0.12;

      const noiseJoy = (Math.random() - 0.5) * 0.1;
      const noiseFear = (Math.random() - 0.5) * 0.08;
      const noiseAnger = (Math.random() - 0.5) * 0.06;
      const noiseSurprise = (Math.random() - 0.5) * 0.1;

      const emotions: Emotions = {
        joy: clamp(base.joy + trend.joy * this.phase + waveJoy + noiseJoy, -1, 1),
        fear: clamp(base.fear + trend.fear * this.phase + waveFear + noiseFear, -1, 1),
        anger: clamp(base.anger + trend.anger * this.phase + waveAnger + noiseAnger, -1, 1),
        surprise: clamp(base.surprise + trend.surprise * this.phase + waveSurprise + noiseSurprise, -1, 1)
      };

      data.push({
        timestamp: now,
        userId: generateUserId(i),
        emotions
      });
    }

    return data;
  }

  start(callback: (data: EmotionData[]) => void): void {
    this.callback = callback;

    const initialData = this.generateBatch();
    this.callback(initialData);

    this.timerId = window.setInterval(() => {
      if (this.callback) {
        const data = this.generateBatch();
        this.callback(data);
      }
    }, UPDATE_INTERVAL);
  }

  stop(): void {
    if (this.timerId !== null) {
      clearInterval(this.timerId);
      this.timerId = null;
    }
    this.callback = null;
  }

  generateInitialHistory(minutes: number): EmotionData[][] {
    const history: EmotionData[][] = [];
    const savedPhase = this.phase;
    const savedBase = [...this.baseValues];
    const savedTrends = [...this.trends];

    for (let m = minutes; m >= 0; m--) {
      this.phase = (minutes - m) * 3;
      const batch = this.generateBatch();
      batch.forEach(d => {
        d.timestamp = Date.now() - m * 60 * 1000;
      });
      history.push(batch);
    }

    this.phase = savedPhase;
    this.baseValues = savedBase;
    this.trends = savedTrends;

    return history;
  }
}

export function getDominantEmotion(emotions: Emotions): { key: EmotionKey; value: number } {
  let maxKey: EmotionKey = 'joy';
  let maxValue = emotions.joy;

  for (const key of emotionKeys) {
    if (emotions[key] > maxValue) {
      maxValue = emotions[key];
      maxKey = key;
    }
  }

  return { key: maxKey, value: maxValue };
}

export function averageEmotions(dataList: EmotionData[]): Emotions {
  if (dataList.length === 0) {
    return { joy: 0, fear: 0, anger: 0, surprise: 0 };
  }

  const sums: Emotions = { joy: 0, fear: 0, anger: 0, surprise: 0 };

  for (const data of dataList) {
    for (const key of emotionKeys) {
      sums[key] += data.emotions[key];
    }
  }

  for (const key of emotionKeys) {
    sums[key] /= dataList.length;
  }

  return sums;
}
