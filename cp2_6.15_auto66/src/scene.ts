interface TrackSegment {
  z: number;
  active: boolean;
}

interface ColorRGB {
  r: number;
  g: number;
  b: number;
}

export class Scene {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private trackWidth: number = 600;
  private trackSegments: TrackSegment[] = [];
  private segmentPool: TrackSegment[] = [];
  private segmentCount: number = 30;
  private segmentSpacing: number = 50;
  private scrollOffset: number = 0;
  
  private backgroundColors: ColorRGB[] = [
    { r: 13, g: 27, b: 42 },
    { r: 26, g: 35, b: 126 },
    { r: 74, g: 20, b: 140 },
    { r: 123, g: 31, b: 162 },
    { r: 183, g: 28, b: 129 },
    { r: 216, g: 27, b: 96 },
    { r: 244, g: 67, b: 54 },
    { r: 255, g: 152, b: 0 },
    { r: 255, g: 193, b: 7 },
    { r: 205, g: 220, b: 57 },
  ];
  
  private currentColorIndex: number = 0;
  private targetColorIndex: number = 1;
  private colorTransitionProgress: number = 0;
  private colorTransitionDuration: number = 2000;
  private colorTransitionStart: number = 0;
  private isTransitioning: boolean = false;
  private lastScoreThreshold: number = 0;
  
  private trackColorStart: string = '#00d4ff';
  private trackColorEnd: string = '#7b2ff7';
  private focalLength: number = 500;
  private horizonY: number = 0;

  constructor(canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D) {
    this.canvas = canvas;
    this.ctx = ctx;
    this.horizonY = canvas.height * 0.4;
    this.initializeTrackSegments();
  }

  private initializeTrackSegments(): void {
    for (let i = 0; i < this.segmentCount; i++) {
      const segment = this.acquireSegment();
      segment.z = i * this.segmentSpacing;
      segment.active = true;
      this.trackSegments.push(segment);
    }
  }

  private acquireSegment(): TrackSegment {
    if (this.segmentPool.length > 0) {
      const seg = this.segmentPool.pop()!;
      seg.active = true;
      return seg;
    }
    return { z: 0, active: true };
  }

  private releaseSegment(segment: TrackSegment): void {
    segment.active = false;
    segment.z = 0;
    this.segmentPool.push(segment);
  }

  private hexToRgb(hex: string): ColorRGB {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? {
          r: parseInt(result[1], 16),
          g: parseInt(result[2], 16),
          b: parseInt(result[3], 16),
        }
      : { r: 0, g: 0, b: 0 };
  }

  private lerpColor(c1: ColorRGB, c2: ColorRGB, t: number): ColorRGB {
    const easeT = t < 0.5
      ? 2 * t * t
      : 1 - Math.pow(-2 * t + 2, 2) / 2;
    return {
      r: Math.round(c1.r + (c2.r - c1.r) * easeT),
      g: Math.round(c1.g + (c2.g - c1.g) * easeT),
      b: Math.round(c1.b + (c2.b - c1.b) * easeT),
    };
  }

  private rgbToString(color: ColorRGB): string {
    return `rgb(${color.r}, ${color.g}, ${color.b})`;
  }

  update(deltaTime: number, currentTime: number, speed: number, score: number): void {
    this.scrollOffset += speed * deltaTime * 0.001;
    
    for (const segment of this.trackSegments) {
      segment.z -= speed * deltaTime * 0.001;
    }
    
    while (this.trackSegments.length > 0 && this.trackSegments[0].z < -this.segmentSpacing) {
      const removed = this.trackSegments.shift()!;
      this.releaseSegment(removed);
    }
    
    const lastSegment = this.trackSegments[this.trackSegments.length - 1];
    while (lastSegment && lastSegment.z < this.segmentCount * this.segmentSpacing) {
      const newSegment = this.acquireSegment();
      newSegment.z = lastSegment.z + this.segmentSpacing;
      this.trackSegments.push(newSegment);
    }

    const currentThreshold = Math.floor(score / 100) * 100;
    if (currentThreshold > this.lastScoreThreshold && !this.isTransitioning) {
      this.lastScoreThreshold = currentThreshold;
      this.startColorTransition(currentTime);
    }

    if (this.isTransitioning) {
      const elapsed = currentTime - this.colorTransitionStart;
      this.colorTransitionProgress = Math.min(elapsed / this.colorTransitionDuration, 1);
      
      if (this.colorTransitionProgress >= 1) {
        this.isTransitioning = false;
        this.currentColorIndex = this.targetColorIndex;
        this.targetColorIndex = (this.targetColorIndex + 1) % this.backgroundColors.length;
      }
    }
  }

  private startColorTransition(currentTime: number): void {
    this.isTransitioning = true;
    this.colorTransitionStart = currentTime;
    this.colorTransitionProgress = 0;
  }

  getCurrentBackgroundColor(): string {
    const currentColor = this.backgroundColors[this.currentColorIndex];
    const targetColor = this.backgroundColors[this.targetColorIndex];
    
    if (this.isTransitioning) {
      const interpolated = this.lerpColor(currentColor, targetColor, this.colorTransitionProgress);
      return this.rgbToString(interpolated);
    }
    
    return this.rgbToString(currentColor);
  }

  project3D(x: number, y: number, z: number): { x: number; y: number; scale: number } {
    const centerX = this.canvas.width / 2;
    const scale = this.focalLength / (this.focalLength + z);
    const screenX = centerX + (x - centerX) * scale;
    const screenY = this.horizonY + (y - this.horizonY) * scale;
    return { x: screenX, y: screenY, scale };
  }

  renderBackground(): void {
    const bgColor = this.getCurrentBackgroundColor();
    const rgb = this.hexToRgb(bgColor);
    
    const gradient = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
    gradient.addColorStop(0, `rgb(${Math.max(0, rgb.r - 20)}, ${Math.max(0, rgb.g - 20)}, ${Math.max(0, rgb.b - 20)})`);
    gradient.addColorStop(0.5, bgColor);
    gradient.addColorStop(1, `rgb(${Math.max(0, rgb.r - 40)}, ${Math.max(0, rgb.g - 40)}, ${Math.max(0, rgb.b - 40)})`);
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  renderTrack(): void {
    const centerX = this.canvas.width / 2;
    const halfWidth = this.trackWidth / 2;

    this.ctx.save();
    
    for (let i = this.trackSegments.length - 1; i >= 0; i--) {
      const segment = this.trackSegments[i];
      const z = segment.z;
      
      const nearTop = this.project3D(centerX - halfWidth, 0, z);
      const nearBottom = this.project3D(centerX + halfWidth, 0, z);
      const farTop = this.project3D(centerX - halfWidth, 0, z + this.segmentSpacing);
      const farBottom = this.project3D(centerX + halfWidth, 0, z + this.segmentSpacing);

      const depthAlpha = Math.min(1, (this.segmentCount * this.segmentSpacing - z) / (this.segmentCount * this.segmentSpacing) + 0.3);
      
      this.ctx.fillStyle = `rgba(20, 20, 40, ${depthAlpha * 0.8})`;
      this.ctx.beginPath();
      this.ctx.moveTo(farTop.x, farTop.y);
      this.ctx.lineTo(farBottom.x, farBottom.y);
      this.ctx.lineTo(nearBottom.x, nearBottom.y);
      this.ctx.lineTo(nearTop.x, nearTop.y);
      this.ctx.closePath();
      this.ctx.fill();

      const lineProgress = z / (this.segmentCount * this.segmentSpacing);
      const lineColor = this.interpolateTrackColor(lineProgress);
      
      this.ctx.strokeStyle = lineColor;
      this.ctx.lineWidth = 3 * nearTop.scale;
      this.ctx.shadowColor = lineColor;
      this.ctx.shadowBlur = 10 * nearTop.scale;
      
      this.ctx.beginPath();
      this.ctx.moveTo(farTop.x, farTop.y);
      this.ctx.lineTo(nearTop.x, nearTop.y);
      this.ctx.stroke();
      
      this.ctx.beginPath();
      this.ctx.moveTo(farBottom.x, farBottom.y);
      this.ctx.lineTo(nearBottom.x, nearBottom.y);
      this.ctx.stroke();
    }

    this.ctx.shadowBlur = 0;
    this.ctx.restore();
  }

  private interpolateTrackColor(t: number): string {
    const c1 = this.hexToRgb(this.trackColorStart);
    const c2 = this.hexToRgb(this.trackColorEnd);
    const interpolated = this.lerpColor(c1, c2, t);
    return this.rgbToString(interpolated);
  }

  renderBoostVignette(active: boolean, intensity: number = 0): void {
    if (!active || intensity <= 0) return;
    
    const gradient = this.ctx.createRadialGradient(
      this.canvas.width / 2,
      this.canvas.height / 2,
      Math.min(this.canvas.width, this.canvas.height) * 0.3,
      this.canvas.width / 2,
      this.canvas.height / 2,
      Math.max(this.canvas.width, this.canvas.height) * 0.7
    );
    
    gradient.addColorStop(0, 'rgba(30, 136, 229, 0)');
    gradient.addColorStop(1, `rgba(30, 136, 229, ${Math.min(0.4, intensity * 0.4)})`);
    
    this.ctx.fillStyle = gradient;
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
  }

  getTrackWidth(): number {
    return this.trackWidth;
  }

  getLaneX(lane: number): number {
    const centerX = this.canvas.width / 2;
    const laneWidth = this.trackWidth / 3;
    return centerX + lane * laneWidth;
  }

  resize(_width: number, height: number): void {
    this.horizonY = height * 0.4;
  }

  getScrollOffset(): number {
    return this.scrollOffset;
  }
}
