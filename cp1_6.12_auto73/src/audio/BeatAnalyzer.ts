export class BeatAnalyzer {
  private bpm: number;
  private startTime: number = 0;

  constructor(bpm: number = 120) {
    this.bpm = bpm;
  }

  setBPM(bpm: number): void {
    this.bpm = bpm;
  }

  getBPM(): number {
    return this.bpm;
  }

  reset(startTime: number): void {
    this.startTime = startTime;
  }

  getBeatInterval(): number {
    return 60000 / this.bpm;
  }

  getNearestBeatTime(actionTime: number): number {
    const elapsed = actionTime - this.startTime;
    if (elapsed < 0) return this.startTime;
    const interval = this.getBeatInterval();
    const beatIndex = Math.round(elapsed / interval);
    return this.startTime + beatIndex * interval;
  }

  isOnBeat(actionTime: number, toleranceMs: number = 50): boolean {
    const nearest = this.getNearestBeatTime(actionTime);
    const diff = Math.abs(actionTime - nearest);
    return diff <= toleranceMs;
  }

  getBeatProgress(currentTime: number): number {
    const interval = this.getBeatInterval();
    const elapsed = currentTime - this.startTime;
    if (elapsed < 0) return 0;
    return (elapsed % interval) / interval;
  }

  getBeatIndex(currentTime: number): number {
    const interval = this.getBeatInterval();
    const elapsed = currentTime - this.startTime;
    if (elapsed < 0) return 0;
    return Math.floor(elapsed / interval);
  }
}
