import { CarState, TrackPoint, RECORDING_INTERVAL } from '../types';

export class ReplayRecorder {
  private trackData: TrackPoint[] = [];
  private lastRecordTime: number = 0;
  private lapStartTime: number = 0;
  private isRecording: boolean = false;
  private totalScore: number = 0;
  private driftAngleSum: number = 0;
  private driftAngleCount: number = 0;

  constructor() {}

  startNewLap(): void {
    this.trackData = [];
    this.lastRecordTime = 0;
    this.lapStartTime = performance.now();
    this.isRecording = true;
    this.totalScore = 0;
    this.driftAngleSum = 0;
    this.driftAngleCount = 0;
  }

  record(carState: CarState, score: number): void {
    if (!this.isRecording) return;

    const now = performance.now();
    const elapsed = (now - this.lapStartTime) / 1000;

    if (elapsed - this.lastRecordTime >= RECORDING_INTERVAL) {
      const point: TrackPoint = {
        timestamp: elapsed,
        position: { ...carState.position },
        angle: carState.angle,
        speed: carState.speed,
        driftAngle: carState.driftAngle,
        score
      };

      this.trackData.push(point);
      this.lastRecordTime = elapsed;
      this.totalScore = score;

      if (carState.isDrifting) {
        this.driftAngleSum += Math.abs(carState.driftAngle);
        this.driftAngleCount++;
      }
    }
  }

  finishLap(): TrackPoint[] | null {
    if (!this.isRecording || this.trackData.length === 0) {
      return null;
    }

    this.isRecording = false;
    return [...this.trackData];
  }

  getTrackData(): TrackPoint[] {
    return [...this.trackData];
  }

  getLapTime(): number {
    return this.trackData.length > 0 
      ? this.trackData[this.trackData.length - 1].timestamp 
      : 0;
  }

  getTotalScore(): number {
    return this.totalScore;
  }

  getAvgDriftAngle(): number {
    return this.driftAngleCount > 0 
      ? (this.driftAngleSum / this.driftAngleCount) * (180 / Math.PI) 
      : 0;
  }

  clear(): void {
    this.trackData = [];
    this.lastRecordTime = 0;
    this.isRecording = false;
    this.totalScore = 0;
    this.driftAngleSum = 0;
    this.driftAngleCount = 0;
  }

  isActive(): boolean {
    return this.isRecording;
  }

  getPointCount(): number {
    return this.trackData.length;
  }
}
