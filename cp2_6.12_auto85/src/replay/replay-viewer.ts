import { TrackPoint, Vec2, TrackData, MODE_COLORS, ControlMode } from '../types';

export class ReplayViewer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private trackData: TrackPoint[] = [];
  private trackGeometry: TrackData | null = null;
  private _isPlaying: boolean = false;
  private currentTime: number = 0;
  private duration: number = 0;
  private playbackSpeed: number = 1.5;
  private lastFrameTime: number = 0;
  private currentIndex: number = 0;
  private drawnIndex: number = -1;
  private scale: number = 1;
  private offset: Vec2 = { x: 0, y: 0 };
  private carColor: string = MODE_COLORS.advanced;
  private onTimeUpdate: ((time: number, duration: number) => void) | null = null;
  private onPointUpdate: ((point: TrackPoint | null) => void) | null = null;
  private onPlaybackEnd: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    window.addEventListener('resize', () => this.resize());
  }

  setTrackGeometry(track: TrackData): void {
    this.trackGeometry = track;
    this.resize();
  }

  setCarColor(mode: ControlMode): void {
    this.carColor = MODE_COLORS[mode];
  }

  private resize(): void {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    
    this.ctx.scale(dpr, dpr);
    
    const minDim = Math.min(rect.width, rect.height);
    this.scale = minDim / 60;
    this.offset = {
      x: rect.width / 2,
      y: rect.height / 2
    };
  }

  private worldToScreen(point: Vec2): Vec2 {
    return {
      x: this.offset.x + point.x * this.scale,
      y: this.offset.y + point.y * this.scale
    };
  }

  loadTrackData(trackData: TrackPoint[]): void {
    this.trackData = trackData;
    this.duration = trackData.length > 0 ? trackData[trackData.length - 1].timestamp : 0;
    this.currentTime = 0;
    this.currentIndex = 0;
    this.drawnIndex = -1;
    this._isPlaying = false;
  }

  play(speed: number = 1.5): void {
    if (this.trackData.length === 0) return;
    
    this.playbackSpeed = speed;
    this._isPlaying = true;
    this.lastFrameTime = performance.now();
    
    if (this.currentTime >= this.duration) {
      this.currentTime = 0;
      this.currentIndex = 0;
      this.drawnIndex = -1;
    }
  }

  pause(): void {
    this._isPlaying = false;
  }

  toggle(): void {
    if (this._isPlaying) {
      this.pause();
    } else {
      this.play(this.playbackSpeed);
    }
  }

  seek(time: number): void {
    this.currentTime = Math.max(0, Math.min(time, this.duration));
    this.currentIndex = this.findIndexForTime(this.currentTime);
    this.drawnIndex = -1;
    
    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.currentTime, this.duration);
    }
    
    if (this.onPointUpdate) {
      this.onPointUpdate(this.getCurrentPoint());
    }
  }

  private findIndexForTime(time: number): number {
    let left = 0;
    let right = this.trackData.length - 1;
    
    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (this.trackData[mid].timestamp === time) {
        return mid;
      } else if (this.trackData[mid].timestamp < time) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }
    
    return Math.max(0, right);
  }

  getCurrentTime(): number {
    return this.currentTime;
  }

  getDuration(): number {
    return this.duration;
  }

  isPlaying(): boolean {
    return this._isPlaying;
  }

  getCurrentPoint(): TrackPoint | null {
    if (this.trackData.length === 0) return null;
    
    const idx = Math.min(this.currentIndex, this.trackData.length - 1);
    return { ...this.trackData[idx] };
  }

  getTrackData(): TrackPoint[] {
    return [...this.trackData];
  }

  setOnTimeUpdate(callback: (time: number, duration: number) => void): void {
    this.onTimeUpdate = callback;
  }

  setOnPointUpdate(callback: (point: TrackPoint | null) => void): void {
    this.onPointUpdate = callback;
  }

  setOnPlaybackEnd(callback: () => void): void {
    this.onPlaybackEnd = callback;
  }

  update(deltaTime: number): void {
    if (!this._isPlaying || this.trackData.length === 0) return;

    this.currentTime += deltaTime * this.playbackSpeed;

    if (this.currentTime >= this.duration) {
      this.currentTime = this.duration;
      this.currentIndex = this.trackData.length - 1;
      this._isPlaying = false;
      
      if (this.onPlaybackEnd) {
        this.onPlaybackEnd();
      }
    } else {
      while (
        this.currentIndex < this.trackData.length - 1 &&
        this.trackData[this.currentIndex + 1].timestamp <= this.currentTime
      ) {
        this.currentIndex++;
      }
    }

    if (this.onTimeUpdate) {
      this.onTimeUpdate(this.currentTime, this.duration);
    }

    if (this.onPointUpdate) {
      this.onPointUpdate(this.getCurrentPoint());
    }
  }

  render(): void {
    const rect = this.canvas.getBoundingClientRect();
    this.ctx.clearRect(0, 0, rect.width, rect.height);

    this.ctx.fillStyle = '#16213e';
    this.ctx.fillRect(0, 0, rect.width, rect.height);

    if (this.trackGeometry) {
      this.renderTrack();
    }

    this.renderTrail();
    this.renderCar();
  }

  private renderTrack(): void {
    if (!this.trackGeometry) return;

    const ctx = this.ctx;
    ctx.save();
    ctx.globalAlpha = 0.3;

    ctx.beginPath();
    this.drawBezierCurve(this.trackGeometry.outerCurve.controlPoints);
    this.drawBezierCurve(this.trackGeometry.innerCurve.controlPoints, true);
    ctx.closePath();
    ctx.fillStyle = '#333333';
    ctx.fill();

    ctx.save();
    ctx.strokeStyle = '#ff0000';
    ctx.lineWidth = 0.4 * this.scale;
    ctx.globalAlpha = 0.2;
    ctx.beginPath();
    this.drawBezierCurve(this.trackGeometry.innerCurve.controlPoints);
    ctx.stroke();
    ctx.beginPath();
    this.drawBezierCurve(this.trackGeometry.outerCurve.controlPoints);
    ctx.stroke();
    ctx.restore();

    ctx.save();
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.15 * this.scale;
    ctx.globalAlpha = 0.3;
    ctx.setLineDash([1 * this.scale, 1 * this.scale]);
    ctx.beginPath();
    for (let i = 0; i < this.trackGeometry.centerLine.length; i++) {
      const p = this.worldToScreen(this.trackGeometry.centerLine[i]);
      if (i === 0) {
        ctx.moveTo(p.x, p.y);
      } else {
        ctx.lineTo(p.x, p.y);
      }
    }
    ctx.closePath();
    ctx.stroke();
    ctx.restore();

    ctx.restore();
  }

  private drawBezierCurve(points: Vec2[], reverse: boolean = false): void {
    const ctx = this.ctx;
    const pts = reverse ? [...points].reverse() : points;
    
    for (let i = 0; i < pts.length; i += 3) {
      const p0 = this.worldToScreen(pts[i]);
      const p1 = this.worldToScreen(pts[(i + 1) % pts.length]);
      const p2 = this.worldToScreen(pts[(i + 2) % pts.length]);
      const p3 = this.worldToScreen(pts[(i + 3) % pts.length]);

      if (i === 0 && !reverse) {
        ctx.moveTo(p0.x, p0.y);
      }
      ctx.bezierCurveTo(p1.x, p1.y, p2.x, p2.y, p3.x, p3.y);
    }
  }

  private renderTrail(): void {
    if (this.trackData.length < 2 || this.currentIndex < 1) return;

    const ctx = this.ctx;
    ctx.save();

    const endIdx = this._isPlaying ? this.currentIndex : this.currentIndex;
    
    for (let i = 1; i <= endIdx && i < this.trackData.length; i++) {
      const p1 = this.trackData[i - 1];
      const p2 = this.trackData[i];
      const s1 = this.worldToScreen(p1.position);
      const s2 = this.worldToScreen(p2.position);

      const driftMag = Math.abs(p2.driftAngle);
      const t = Math.min(driftMag / 0.8, 1);
      
      const gradient = ctx.createLinearGradient(s1.x, s1.y, s2.x, s2.y);
      const r = Math.floor(50 + t * 200);
      const g = Math.floor(100 - t * 80);
      const b = Math.floor(200 - t * 150);
      
      gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.5)`);
      gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.5)`);

      ctx.beginPath();
      ctx.strokeStyle = gradient;
      ctx.lineWidth = 0.2 * this.scale;
      ctx.lineCap = 'round';
      ctx.moveTo(s1.x, s1.y);
      ctx.lineTo(s2.x, s2.y);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderCar(): void {
    const point = this.getCurrentPoint();
    if (!point) return;

    const ctx = this.ctx;
    const screenPos = this.worldToScreen(point.position);
    const effectiveAngle = point.angle + point.driftAngle * 0.3;

    ctx.save();
    ctx.translate(screenPos.x, screenPos.y);
    ctx.rotate(effectiveAngle);

    const bodyWidth = 0.8 * this.scale;
    const bodyLength = 1.2 * this.scale;

    ctx.fillStyle = this.carColor;
    ctx.beginPath();
    ctx.roundRect(-bodyLength / 2, -bodyWidth / 2, bodyLength, bodyWidth, 0.15 * this.scale);
    ctx.fill();

    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 0.05 * this.scale;
    ctx.stroke();

    const cockpitWidth = 0.4 * this.scale;
    const cockpitLength = 0.5 * this.scale;
    ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
    ctx.beginPath();
    ctx.ellipse(0.1 * this.scale, 0, cockpitLength / 2, cockpitWidth / 2, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  renderMiniTrack(canvas: HTMLCanvasElement, trackData: TrackPoint[]): void {
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    ctx.scale(dpr, dpr);

    const minScale = Math.min(rect.width, rect.height) / 60;
    const centerOffset = { x: rect.width / 2, y: rect.height / 2 };

    const toScreen = (p: Vec2): Vec2 => ({
      x: centerOffset.x + p.x * minScale,
      y: centerOffset.y + p.y * minScale
    });

    ctx.fillStyle = '#16213e';
    ctx.fillRect(0, 0, rect.width, rect.height);

    if (this.trackGeometry) {
      ctx.save();
      ctx.globalAlpha = 0.3;
      ctx.strokeStyle = '#666';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 0; i < this.trackGeometry.centerLine.length; i++) {
        const p = toScreen(this.trackGeometry.centerLine[i]);
        if (i === 0) {
          ctx.moveTo(p.x, p.y);
        } else {
          ctx.lineTo(p.x, p.y);
        }
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    if (trackData.length > 1) {
      ctx.save();
      ctx.lineCap = 'round';
      ctx.lineWidth = 2;

      for (let i = 1; i < trackData.length; i++) {
        const p1 = toScreen(trackData[i - 1].position);
        const p2 = toScreen(trackData[i].position);
        const driftMag = Math.abs(trackData[i].driftAngle);
        const t = Math.min(driftMag / 0.8, 1);
        const r = Math.floor(50 + t * 200);
        const g = Math.floor(100 - t * 80);
        const b = Math.floor(200 - t * 150);

        ctx.beginPath();
        ctx.strokeStyle = `rgba(${r}, ${g}, ${b}, 0.8)`;
        ctx.moveTo(p1.x, p1.y);
        ctx.lineTo(p2.x, p2.y);
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  reset(): void {
    this.trackData = [];
    this.currentTime = 0;
    this.duration = 0;
    this.currentIndex = 0;
    this.drawnIndex = -1;
    this._isPlaying = false;
  }

  getPlaybackSpeed(): number {
    return this.playbackSpeed;
  }
}
