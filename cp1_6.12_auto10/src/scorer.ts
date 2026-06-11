export type Judgment = 'Perfect' | 'Good' | 'Miss';

export interface ScoreResult {
  judgment: Judgment;
  offset: number;
  accuracy: number;
  combo: number;
  totalHits: number;
  perfectCount: number;
  goodCount: number;
  missCount: number;
}

export interface RoundRecord {
  roundIndex: number;
  accuracy: number;
  timestamp: number;
}

const PERFECT_WINDOW = 50;
const GOOD_WINDOW = 100;

export class Scorer {
  private beatTimestamps: number[] = [];
  private usedBeats: Set<number> = new Set();
  private combo: number = 0;
  private maxCombo: number = 0;
  private totalHits: number = 0;
  private perfectCount: number = 0;
  private goodCount: number = 0;
  private missCount: number = 0;
  private history: RoundRecord[] = [];
  private roundIndex: number = 0;

  addBeatTime(timestamp: number): void {
    this.beatTimestamps.push(timestamp);
  }

  judgeHit(hitTime: number): ScoreResult {
    let bestOffset = Infinity;
    let bestIndex = -1;

    for (let i = 0; i < this.beatTimestamps.length; i++) {
      if (this.usedBeats.has(i)) continue;
      const offset = Math.abs(hitTime - this.beatTimestamps[i]);
      if (offset < bestOffset) {
        bestOffset = offset;
        bestIndex = i;
      }
    }

    let judgment: Judgment;
    if (bestOffset <= PERFECT_WINDOW && bestIndex >= 0) {
      judgment = 'Perfect';
      this.perfectCount++;
      this.combo++;
      this.usedBeats.add(bestIndex);
    } else if (bestOffset <= GOOD_WINDOW && bestIndex >= 0) {
      judgment = 'Good';
      this.goodCount++;
      this.combo++;
      this.usedBeats.add(bestIndex);
    } else {
      judgment = 'Miss';
      this.missCount++;
      this.combo = 0;
    }

    this.totalHits++;
    if (this.combo > this.maxCombo) this.maxCombo = this.combo;

    return {
      judgment,
      offset: bestOffset,
      accuracy: this.calculateAccuracy(),
      combo: this.combo,
      totalHits: this.totalHits,
      perfectCount: this.perfectCount,
      goodCount: this.goodCount,
      missCount: this.missCount,
    };
  }

  private calculateAccuracy(): number {
    if (this.totalHits === 0) return 0;
    const score = this.perfectCount * 100 + this.goodCount * 60 + this.missCount * 0;
    return Math.round(score / this.totalHits);
  }

  finishRound(): RoundRecord {
    const record: RoundRecord = {
      roundIndex: this.roundIndex,
      accuracy: this.calculateAccuracy(),
      timestamp: Date.now(),
    };
    this.history.push(record);
    if (this.history.length > 10) {
      this.history = this.history.slice(-10);
    }
    this.roundIndex++;
    return record;
  }

  getHistory(): RoundRecord[] {
    return this.history;
  }

  reset(): void {
    this.beatTimestamps = [];
    this.usedBeats = new Set();
    this.combo = 0;
    this.maxCombo = 0;
    this.totalHits = 0;
    this.perfectCount = 0;
    this.goodCount = 0;
    this.missCount = 0;
  }
}
