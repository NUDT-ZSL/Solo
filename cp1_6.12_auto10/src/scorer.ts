export type Judgment = 'Perfect' | 'Good' | 'Miss';

export interface HitResult {
  judgment: Judgment;
  offsetMs: number;
  beatIndex: number | null;
  accuracy: number;
  combo: number;
  maxCombo: number;
  totalHits: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
  throttled: boolean;
  hitTimestamp: number;
}

export interface RoundRecord {
  roundIndex: number;
  accuracy: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
  maxCombo: number;
  totalExpectedBeats: number;
  totalHits: number;
  timestamp: number;
}

export interface ScorerOptions {
  perfectWindowMs: number;
  goodWindowMs: number;
  debounceMs: number;
}

export const DEFAULT_SCORER_OPTIONS: ScorerOptions = {
  perfectWindowMs: 50,
  goodWindowMs: 100,
  debounceMs: 75,
};

export interface ScorerStats {
  accuracy: number;
  combo: number;
  maxCombo: number;
  totalHits: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
}

export interface ScorerCallbacks {
  onHit?: (result: HitResult) => void;
  onRoundEnd?: (record: RoundRecord) => void;
  onStatsChange?: (stats: ScorerStats) => void;
}

export class Scorer {
  private options: ScorerOptions;
  private callbacks: ScorerCallbacks = {};

  private scheduledBeats: Array<{
    index: number;
    scheduledTime: number;
    matched: boolean;
    matchDeadline: number;
  }> = [];

  private lastHitTime: number = -Infinity;

  private combo: number = 0;
  private maxCombo: number = 0;
  private totalHits: number = 0;
  private perfectCount: number = 0;
  private goodCount: number = 0;
  private missCount: number = 0;
  private expectedBeats: number = 0;

  private history: RoundRecord[] = [];
  private roundIndex: number = 0;

  constructor(options: Partial<ScorerOptions> = {}) {
    this.options = { ...DEFAULT_SCORER_OPTIONS, ...options };
  }

  setCallbacks(cbs: ScorerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...cbs };
  }

  updateOptions(partial: Partial<ScorerOptions>): void {
    this.options = { ...this.options, ...partial };
  }

  registerBeat(index: number, scheduledTimeMs: number): void {
    const last = this.scheduledBeats[this.scheduledBeats.length - 1];
    if (last && last.index >= index) return;
    this.scheduledBeats.push({
      index,
      scheduledTime: scheduledTimeMs,
      matched: false,
      matchDeadline: scheduledTimeMs + this.options.goodWindowMs,
    });
    this.expectedBeats++;
  }

  submitHit(hitTimeMs: number): HitResult {
    const sinceLast = hitTimeMs - this.lastHitTime;
    if (sinceLast < this.options.debounceMs) {
      const result: HitResult = {
        judgment: 'Miss',
        offsetMs: sinceLast,
        beatIndex: null,
        accuracy: this.calculateAccuracy(),
        combo: this.combo,
        maxCombo: this.maxCombo,
        totalHits: this.totalHits,
        perfectCount: this.perfectCount,
        goodCount: this.goodCount,
        missCount: this.missCount,
        throttled: true,
        hitTimestamp: hitTimeMs,
      };
      return result;
    }
    this.lastHitTime = hitTimeMs;
    this.totalHits++;

    let bestIdx = -1;
    let bestOffset = Infinity;

    const { goodWindowMs, perfectWindowMs } = this.options;

    for (let i = 0; i < this.scheduledBeats.length; i++) {
      const b = this.scheduledBeats[i];
      if (b.matched) continue;
      if (hitTimeMs > b.matchDeadline + 120) continue;
      const offset = hitTimeMs - b.scheduledTime;
      const absOffset = Math.abs(offset);
      if (absOffset > goodWindowMs) continue;
      if (absOffset < bestOffset) {
        bestOffset = absOffset;
        bestIdx = i;
      }
    }

    let judgment: Judgment;
    let matchedBeatIndex: number | null = null;

    if (bestIdx >= 0 && bestOffset <= perfectWindowMs) {
      judgment = 'Perfect';
      matchedBeatIndex = this.scheduledBeats[bestIdx].index;
      this.scheduledBeats[bestIdx].matched = true;
      this.perfectCount++;
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    } else if (bestIdx >= 0 && bestOffset <= goodWindowMs) {
      judgment = 'Good';
      matchedBeatIndex = this.scheduledBeats[bestIdx].index;
      this.scheduledBeats[bestIdx].matched = true;
      this.goodCount++;
      this.combo++;
      if (this.combo > this.maxCombo) this.maxCombo = this.combo;
    } else {
      judgment = 'Miss';
      this.missCount++;
      this.combo = 0;
    }

    const accuracy = this.calculateAccuracy();
    const result: HitResult = {
      judgment,
      offsetMs: bestIdx >= 0 ? bestOffset : -1,
      beatIndex: matchedBeatIndex,
      accuracy,
      combo: this.combo,
      maxCombo: this.maxCombo,
      totalHits: this.totalHits,
      perfectCount: this.perfectCount,
      goodCount: this.goodCount,
      missCount: this.missCount,
      throttled: false,
      hitTimestamp: hitTimeMs,
    };

    if (this.callbacks.onHit) {
      try {
        this.callbacks.onHit(result);
      } catch (e) {
        console.error('onHit callback error:', e);
      }
    }
    if (this.callbacks.onStatsChange) {
      this.callbacks.onStatsChange({
        accuracy,
        combo: this.combo,
        maxCombo: this.maxCombo,
        totalHits: this.totalHits,
        perfectCount: this.perfectCount,
        goodCount: this.goodCount,
        missCount: this.missCount,
      });
    }
    return result;
  }

  private calculateAccuracy(): number {
    if (this.totalHits === 0) return 0;
    const weighted =
      this.perfectCount * 100 + this.goodCount * 60 + this.missCount * 0;
    return Math.min(100, Math.round(weighted / this.totalHits));
  }

  endRoundAndRecord(): RoundRecord {
    for (let i = 0; i < this.scheduledBeats.length; i++) {
      const b = this.scheduledBeats[i];
      if (!b.matched) {
        this.missCount++;
        this.combo = 0;
        this.totalHits++;
      }
    }

    const finalAccuracy = this.calculateAccuracy();
    const record: RoundRecord = {
      roundIndex: this.roundIndex,
      accuracy: finalAccuracy,
      perfectCount: this.perfectCount,
      goodCount: this.goodCount,
      missCount: this.missCount,
      maxCombo: this.maxCombo,
      totalExpectedBeats: this.expectedBeats,
      totalHits: this.totalHits,
      timestamp: Date.now(),
    };
    this.history.push(record);
    if (this.history.length > 10) {
      this.history = this.history.slice(-10);
    }
    this.roundIndex++;

    if (this.callbacks.onRoundEnd) {
      try {
        this.callbacks.onRoundEnd(record);
      } catch (e) {
        console.error('onRoundEnd callback error:', e);
      }
    }
    return record;
  }

  getHistory(): RoundRecord[] {
    return [...this.history];
  }

  getStats(): ScorerStats {
    return {
      accuracy: this.calculateAccuracy(),
      combo: this.combo,
      maxCombo: this.maxCombo,
      totalHits: this.totalHits,
      perfectCount: this.perfectCount,
      goodCount: this.goodCount,
      missCount: this.missCount,
    };
  }

  resetRound(): void {
    this.scheduledBeats = [];
    this.lastHitTime = -Infinity;
    this.combo = 0;
    this.maxCombo = 0;
    this.totalHits = 0;
    this.perfectCount = 0;
    this.goodCount = 0;
    this.missCount = 0;
    this.expectedBeats = 0;
  }
}
