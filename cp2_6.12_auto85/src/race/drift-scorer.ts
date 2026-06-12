import { CarState, DriftState, ScorePopup, Vec2 } from '../types';

export class DriftScorer {
  private totalScore: number = 0;
  private currentDriftScore: number = 0;
  private driftStartTime: number = 0;
  private isDrifting: boolean = false;
  private lastDriftAngle: number = 0;
  private popupCallback: ((popup: ScorePopup) => void) | null = null;
  private lastPopupTime: number = 0;
  private maxDriftAngle: number = 0;
  private scoreAccumulator: number = 0;

  constructor() {}

  update(carState: CarState, deltaTime: number): DriftState {
    const { driftAngle, isDrifting, speed } = carState;
    const now = performance.now();

    if (isDrifting) {
      if (!this.isDrifting) {
        this.driftStartTime = now;
        this.currentDriftScore = 0;
        this.maxDriftAngle = 0;
        this.scoreAccumulator = 0;
      }

      const duration = (now - this.driftStartTime) / 1000;
      const absDriftAngle = Math.abs(driftAngle);
      this.maxDriftAngle = Math.max(this.maxDriftAngle, absDriftAngle);

      const speedFactor = Math.min(Math.abs(speed) / 50, 1) + 0.5;
      const angleDegrees = absDriftAngle * (180 / Math.PI);
      const scoreIncrement = angleDegrees * deltaTime * speedFactor;

      this.currentDriftScore += scoreIncrement;
      this.scoreAccumulator += scoreIncrement;

      if (now - this.lastPopupTime > 200 && this.scoreAccumulator >= 1) {
        const popupValue = Math.floor(this.scoreAccumulator);
        this.triggerPopup(popupValue, carState.position);
        this.scoreAccumulator -= popupValue;
        this.lastPopupTime = now;
      }

      this.isDrifting = true;
      this.lastDriftAngle = driftAngle;

      return {
        isActive: true,
        startTime: this.driftStartTime,
        duration,
        currentScore: Math.floor(this.currentDriftScore),
        totalScore: Math.floor(this.totalScore),
        maxAngle: this.maxDriftAngle
      };
    } else {
      if (this.isDrifting) {
        if (this.currentDriftScore >= 1) {
          this.totalScore += this.currentDriftScore;
          if (this.scoreAccumulator >= 1) {
            this.triggerPopup(Math.floor(this.scoreAccumulator), carState.position);
          }
        }
        this.currentDriftScore = 0;
        this.scoreAccumulator = 0;
      }

      this.isDrifting = false;

      return {
        isActive: false,
        startTime: 0,
        duration: 0,
        currentScore: 0,
        totalScore: Math.floor(this.totalScore),
        maxAngle: 0
      };
    }
  }

  private triggerPopup(value: number, position: Vec2): void {
    if (this.popupCallback && value > 0) {
      const popup: ScorePopup = {
        id: `popup-${Date.now()}-${Math.random()}`,
        value,
        position: { ...position },
        createdAt: performance.now()
      };
      this.popupCallback(popup);
    }
  }

  onScorePopup(callback: (popup: ScorePopup) => void): void {
    this.popupCallback = callback;
  }

  getTotalScore(): number {
    return Math.floor(this.totalScore);
  }

  getCurrentDriftScore(): number {
    return Math.floor(this.currentDriftScore);
  }

  reset(): void {
    this.totalScore = 0;
    this.currentDriftScore = 0;
    this.driftStartTime = 0;
    this.isDrifting = false;
    this.lastDriftAngle = 0;
    this.maxDriftAngle = 0;
    this.scoreAccumulator = 0;
  }

  addScore(score: number): void {
    this.totalScore += score;
  }
}
