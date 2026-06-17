export interface BeatState {
  currentBeat: number;
  beatProgress: number;
  isBeat: boolean;
  lastBeatTime: number;
  nextBeatTime: number;
  bpm: number;
  beatInterval: number;
}

export interface HitAccuracy {
  accuracy: 'perfect' | 'good' | 'miss';
  timeOffset: number;
  score: number;
}

const DEFAULT_BPM = 120;
const PERFECT_WINDOW = 0.05;
const GOOD_WINDOW = 0.15;

export class BeatAnalyzer {
  private bpm: number;
  private beatInterval: number;
  private startTime: number;
  private beatCount: number;
  private lastBeatTime: number;
  private beatEventListeners: Array<(beat: number) => void>;

  constructor(bpm: number = DEFAULT_BPM) {
    this.bpm = bpm;
    this.beatInterval = 60000 / bpm;
    this.startTime = 0;
    this.beatCount = 0;
    this.lastBeatTime = 0;
    this.beatEventListeners = [];
  }

  start(time: number): void {
    this.startTime = time;
    this.beatCount = 0;
    this.lastBeatTime = time;
  }

  reset(time: number): void {
    this.startTime = time;
    this.beatCount = 0;
    this.lastBeatTime = time;
  }

  update(currentTime: number): BeatState {
    const elapsed = currentTime - this.startTime;
    const currentBeat = Math.floor(elapsed / this.beatInterval);
    const beatProgress = (elapsed % this.beatInterval) / this.beatInterval;
    const isBeat = currentBeat > this.beatCount;

    if (isBeat) {
      this.beatCount = currentBeat;
      this.lastBeatTime = this.startTime + currentBeat * this.beatInterval;
      this.notifyBeatListeners(currentBeat);
    }

    return {
      currentBeat: this.beatCount,
      beatProgress,
      isBeat,
      lastBeatTime: this.lastBeatTime,
      nextBeatTime: this.lastBeatTime + this.beatInterval,
      bpm: this.bpm,
      beatInterval: this.beatInterval,
    };
  }

  getBeatTimestamps(startTime: number, count: number): number[] {
    const timestamps: number[] = [];
    for (let i = 0; i < count; i++) {
      timestamps.push(startTime + i * this.beatInterval);
    }
    return timestamps;
  }

  evaluateAccuracy(actionTime: number, currentTime: number): HitAccuracy {
    const elapsed = currentTime - this.startTime;
    const nearestBeatTime = Math.round(elapsed / this.beatInterval) * this.beatInterval;
    const timeOffset = Math.abs(actionTime - (this.startTime + nearestBeatTime));

    if (timeOffset <= PERFECT_WINDOW * 1000) {
      return { accuracy: 'perfect', timeOffset, score: 100 };
    } else if (timeOffset <= GOOD_WINDOW * 1000) {
      return { accuracy: 'good', timeOffset, score: 50 };
    } else {
      return { accuracy: 'miss', timeOffset, score: 0 };
    }
  }

  isNearBeat(currentTime: number, window: number = PERFECT_WINDOW): boolean {
    const elapsed = currentTime - this.startTime;
    const progress = (elapsed % this.beatInterval) / this.beatInterval;
    return progress < window || progress > (1 - window);
  }

  onBeat(callback: (beat: number) => void): () => void {
    this.beatEventListeners.push(callback);
    return () => {
      this.beatEventListeners = this.beatEventListeners.filter((cb) => cb !== callback);
    };
  }

  private notifyBeatListeners(beat: number): void {
    this.beatEventListeners.forEach((cb) => cb(beat));
  }

  getBeatInterval(): number {
    return this.beatInterval;
  }

  getBPM(): number {
    return this.bpm;
  }

  setBPM(bpm: number): void {
    this.bpm = bpm;
    this.beatInterval = 60000 / bpm;
  }
}

export function createBeatAnalyzer(bpm: number = DEFAULT_BPM): BeatAnalyzer {
  return new BeatAnalyzer(bpm);
}

export function generateBeatPattern(bpm: number, duration: number): number[] {
  const beatInterval = 60000 / bpm;
  const beats: number[] = [];
  let time = 0;
  while (time < duration) {
    beats.push(time);
    time += beatInterval;
  }
  return beats;
}
