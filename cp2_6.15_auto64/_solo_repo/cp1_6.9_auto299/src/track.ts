export interface Track {
  index: number;
  y: number;
  xStart: number;
  xEnd: number;
}

export interface SwitchAnimation {
  fromTrack: number;
  toTrack: number;
  fromY: number;
  toY: number;
  progress: number;
  duration: number;
  elapsed: number;
}

const easeOutCubic = (t: number): number => 1 - Math.pow(1 - t, 3);

export class TrackSystem {
  tracks: Track[] = [];
  trackCount: number = 7;
  trackSpacing: number = 60;
  canvasWidth: number;
  canvasHeight: number;
  paddingY: number = 100;
  isMobile: boolean;

  switchAnimation: SwitchAnimation | null = null;
  trailLines: { fromX: number; fromY: number; toX: number; toY: number; life: number; maxLife: number }[] = [];

  constructor(canvasWidth: number, canvasHeight: number, isMobile: boolean) {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.isMobile = isMobile;
    if (isMobile) {
      this.trackSpacing = 30;
      this.trackCount = 7;
    }
    this.generateTracks();
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.generateTracks();
  }

  generateTracks(): void {
    this.tracks = [];
    const totalHeight = (this.trackCount - 1) * this.trackSpacing;
    const startY = (this.canvasHeight - totalHeight) / 2;

    for (let i = 0; i < this.trackCount; i++) {
      this.tracks.push({
        index: i,
        y: startY + i * this.trackSpacing,
        xStart: 0,
        xEnd: this.canvasWidth
      });
    }
  }

  getTrackY(trackIndex: number): number {
    const clamped = Math.max(0, Math.min(this.trackCount - 1, trackIndex));
    return this.tracks[clamped].y;
  }

  getTrackCount(): number {
    return this.trackCount;
  }

  startSwitch(fromTrack: number, toTrack: number): void {
    if (fromTrack === toTrack) return;
    const clampedTo = Math.max(0, Math.min(this.trackCount - 1, toTrack));
    this.switchAnimation = {
      fromTrack,
      toTrack: clampedTo,
      fromY: this.getTrackY(fromTrack),
      toY: this.getTrackY(clampedTo),
      progress: 0,
      duration: 0.3,
      elapsed: 0
    };
  }

  isSwitching(): boolean {
    return this.switchAnimation !== null;
  }

  getCurrentTrack(): number {
    if (this.switchAnimation) {
      return this.switchAnimation.toTrack;
    }
    return 0;
  }

  update(dt: number): void {
    if (this.switchAnimation) {
      this.switchAnimation.elapsed += dt;
      this.switchAnimation.progress = Math.min(1, this.switchAnimation.elapsed / this.switchAnimation.duration);

      const prevProgress = this.switchAnimation.progress;

      if (this.switchAnimation.progress >= 1) {
        this.switchAnimation = null;
      }
    }

    for (let i = this.trailLines.length - 1; i >= 0; i--) {
      this.trailLines[i].life -= dt;
      if (this.trailLines[i].life <= 0) {
        this.trailLines.splice(i, 1);
      }
    }
  }

  getInterpolatedY(playerTrack: number): number {
    if (this.switchAnimation) {
      const t = easeOutCubic(this.switchAnimation.progress);
      return this.switchAnimation.fromY + (this.switchAnimation.toY - this.switchAnimation.fromY) * t;
    }
    return this.getTrackY(playerTrack);
  }

  addTrailLine(fromX: number, fromY: number, toX: number, toY: number): void {
    this.trailLines.push({
      fromX, fromY, toX, toY,
      life: 0.3,
      maxLife: 0.3
    });
  }

  trySwitchByDelta(playerTrack: number, deltaY: number): { switched: boolean; newTrack: number; fromY: number; toY: number } {
    if (this.isSwitching()) {
      return { switched: false, newTrack: playerTrack, fromY: 0, toY: 0 };
    }

    const threshold = this.trackSpacing * 0.5;
    let trackChange = 0;

    if (deltaY > threshold) {
      trackChange = Math.floor(deltaY / this.trackSpacing);
    } else if (deltaY < -threshold) {
      trackChange = Math.ceil(deltaY / this.trackSpacing);
    }

    if (trackChange !== 0) {
      const newTrack = Math.max(0, Math.min(this.trackCount - 1, playerTrack + trackChange));
      if (newTrack !== playerTrack) {
        const fromY = this.getTrackY(playerTrack);
        const toY = this.getTrackY(newTrack);
        return { switched: true, newTrack, fromY, toY };
      }
    }

    return { switched: false, newTrack: playerTrack, fromY: 0, toY: 0 };
  }

  render(ctx: CanvasRenderingContext2D, scrollOffset: number): void {
    ctx.save();

    for (const track of this.tracks) {
      const gradient = ctx.createLinearGradient(track.xStart, track.y, track.xEnd, track.y);
      gradient.addColorStop(0, 'rgba(0, 255, 255, 0.05)');
      gradient.addColorStop(0.5, 'rgba(0, 255, 255, 0.4)');
      gradient.addColorStop(1, 'rgba(0, 255, 255, 0.05)');

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 2;
      ctx.shadowColor = 'rgba(0, 255, 255, 0.8)';
      ctx.shadowBlur = 12;

      ctx.beginPath();
      ctx.moveTo(track.xStart, track.y);

      const dashLength = 30;
      const gapLength = 20;
      const totalPattern = dashLength + gapLength;
      const offset = scrollOffset % totalPattern;

      let x = track.xStart - offset;
      let drawDash = true;

      while (x < track.xEnd) {
        const segmentEnd = Math.min(x + (drawDash ? dashLength : gapLength), track.xEnd);
        if (drawDash) {
          ctx.lineTo(segmentEnd, track.y);
        } else {
          ctx.moveTo(segmentEnd, track.y);
        }
        x = segmentEnd;
        drawDash = !drawDash;
      }
      ctx.stroke();
    }

    ctx.shadowBlur = 0;

    for (const trail of this.trailLines) {
      const alpha = trail.life / trail.maxLife;
      const gradient = ctx.createLinearGradient(trail.fromX, trail.fromY, trail.toX, trail.toY);
      gradient.addColorStop(0, `rgba(100, 200, 255, ${alpha * 0.2})`);
      gradient.addColorStop(0.5, `rgba(150, 220, 255, ${alpha * 0.9})`);
      gradient.addColorStop(1, `rgba(100, 200, 255, ${alpha * 0.2})`);

      ctx.strokeStyle = gradient;
      ctx.lineWidth = 3;
      ctx.shadowColor = `rgba(100, 200, 255, ${alpha})`;
      ctx.shadowBlur = 10;

      ctx.beginPath();
      ctx.moveTo(trail.fromX, trail.fromY);
      ctx.lineTo(trail.toX, trail.toY);
      ctx.stroke();
    }

    ctx.restore();
  }
}
