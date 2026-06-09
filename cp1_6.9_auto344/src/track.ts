export interface Track {
  id: number;
  name: string;
  color: string;
  baseY: number;
  currentY: number;
  offsetX: number;
  speedMultiplier: number;
  alpha: number;
  brightnessTimer: number;
}

export interface TrackSystemState {
  tracks: Track[];
  baseSpeed: number;
  currentSpeed: number;
  difficultyLevel: number;
  triggerZoneX: number;
  triggerZoneRadius: number;
}

const TRACK_COLORS = ['#8B5CF6', '#10B981', '#3B82F6'];
const TRACK_NAMES = ['紫罗兰', '翡翠', '天蓝'];
const BASE_SPEED = 100;
const TRIGGER_ZONE_RADIUS = 30;

export class TrackSystem {
  private state: TrackSystemState;
  private canvasWidth: number;
  private canvasHeight: number;
  private shakeTime: number = 0;

  constructor(canvasWidth: number, canvasHeight: number) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.state = {
      tracks: [],
      baseSpeed: BASE_SPEED,
      currentSpeed: BASE_SPEED,
      difficultyLevel: 1,
      triggerZoneX: canvasWidth - 120,
      triggerZoneRadius: TRIGGER_ZONE_RADIUS
    };
    this.initTracks();
  }

  private initTracks(): void {
    const trackCount = 3;
    const spacing = this.canvasHeight / (trackCount + 1);
    for (let i = 0; i < trackCount; i++) {
      this.state.tracks.push({
        id: i,
        name: TRACK_NAMES[i],
        color: TRACK_COLORS[i],
        baseY: spacing * (i + 1),
        currentY: spacing * (i + 1),
        offsetX: 0,
        speedMultiplier: 1.0,
        alpha: 0.7,
        brightnessTimer: 0
      });
    }
  }

  public resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.state.triggerZoneX = canvasWidth - 120;
    const trackCount = 3;
    const spacing = canvasHeight / (trackCount + 1);
    this.state.tracks.forEach((track, i) => {
      track.baseY = spacing * (i + 1);
      track.currentY = spacing * (i + 1);
    });
  }

  public setDifficultyLevel(level: number): void {
    const clampedLevel = Math.min(Math.max(level, 1), 10);
    this.state.difficultyLevel = clampedLevel;
    this.state.currentSpeed = this.state.baseSpeed * (1 + (clampedLevel - 1) * 0.1);
  }

  public getDifficultyLevel(): number {
    return this.state.difficultyLevel;
  }

  public getSpeed(): number {
    return this.state.currentSpeed;
  }

  public getState(): TrackSystemState {
    return this.state;
  }

  public getTracks(): Track[] {
    return this.state.tracks;
  }

  public getTriggerZoneX(): number {
    return this.state.triggerZoneX;
  }

  public getTriggerZoneRadius(): number {
    return this.state.triggerZoneRadius;
  }

  public brightenTrack(trackId: number): void {
    const track = this.state.tracks[trackId];
    if (track) {
      track.brightnessTimer = 0.2;
    }
  }

  public update(deltaTime: number): void {
    this.shakeTime += deltaTime;
    const shakeEnabled = this.state.difficultyLevel >= 3;

    this.state.tracks.forEach((track, index) => {
      track.offsetX += this.state.currentSpeed * deltaTime;
      if (track.offsetX >= 80) {
        track.offsetX -= 80;
      }

      if (shakeEnabled) {
        const shakePhase = this.shakeTime * Math.PI * 2 * 0.5 + index * 0.7;
        const shakeAmount = Math.sin(shakePhase) * 5;
        track.currentY = track.baseY + shakeAmount;
      } else {
        track.currentY = track.baseY;
      }

      if (track.brightnessTimer > 0) {
        track.brightnessTimer -= deltaTime;
        track.alpha = track.brightnessTimer > 0 ? 1.0 : 0.7;
      } else {
        track.alpha = 0.7;
      }
    });
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.state.tracks.forEach(track => {
      ctx.save();
      ctx.globalAlpha = track.alpha;
      ctx.strokeStyle = track.color;
      ctx.lineWidth = 4;
      ctx.shadowColor = track.color;
      ctx.shadowBlur = track.brightnessTimer > 0 ? 20 : 10;

      ctx.beginPath();
      const startX = -track.offsetX;
      ctx.moveTo(startX, track.currentY);
      for (let x = startX; x <= this.canvasWidth + 80; x += 40) {
        ctx.lineTo(x, track.currentY);
      }
      ctx.stroke();

      ctx.setLineDash([20, 60]);
      ctx.lineDashOffset = -track.offsetX;
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.3)';
      ctx.lineWidth = 2;
      ctx.shadowBlur = 0;
      ctx.beginPath();
      ctx.moveTo(startX, track.currentY);
      for (let x = startX; x <= this.canvasWidth + 80; x += 40) {
        ctx.lineTo(x, track.currentY);
      }
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.restore();
    });

    this.renderTriggerZone(ctx);
  }

  private renderTriggerZone(ctx: CanvasRenderingContext2D): void {
    this.state.tracks.forEach(track => {
      ctx.save();
      ctx.strokeStyle = track.color;
      ctx.lineWidth = 3;
      ctx.globalAlpha = 0.8;
      ctx.shadowColor = track.color;
      ctx.shadowBlur = 15;
      ctx.beginPath();
      ctx.arc(this.state.triggerZoneX, track.currentY, this.state.triggerZoneRadius, 0, Math.PI * 2);
      ctx.stroke();

      ctx.globalAlpha = 0.15;
      ctx.fillStyle = track.color;
      ctx.beginPath();
      ctx.arc(this.state.triggerZoneX, track.currentY, this.state.triggerZoneRadius - 8, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }
}
