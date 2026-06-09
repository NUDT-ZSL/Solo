import { midiToFrequency, NOTE_C4, NOTE_C6 } from './AudioEngine';

export const WARM_COLORS = ['#FF6B6B', '#FFD93D', '#6BCB77', '#4D96FF', '#9B59B6'];
export const HEX_SIZE = 40;
export const MIN_DISTANCE = 30;
export const MAX_DISTANCE = 120;
export const DISTANCE_STEPS = 10;
export const MAX_ACTIVE_HEX = 8;

export interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  alpha: number;
  color: string;
  startTime: number;
  duration: number;
}

export interface HexagonData {
  index: number;
  angle: number;
  baseDistance: number;
  currentDistance: number;
  targetDistance: number;
  color: string;
  isActive: boolean;
  isPlaying: boolean;
  playStartTime: number;
  hoverScale: number;
  pressScale: number;
  midiNote: number;
  isDragging: boolean;
}

export class HexRing {
  public hexagons: HexagonData[] = [];
  public ripples: Ripple[] = [];
  public centerX: number = 0;
  public centerY: number = 0;
  public rotation: number = 0;
  public isRotating: boolean = false;
  public scale: number = 1;

  private hoveredIndex: number = -1;
  private draggingIndex: number = -1;

  constructor(public hexCount: number = 16) {
    this.initHexagons();
  }

  private initHexagons(): void {
    const baseDistance = 80;
    for (let i = 0; i < this.hexCount; i++) {
      const angle = (i / this.hexCount) * Math.PI * 2 - Math.PI / 2;
      const noteRange = NOTE_C6 - NOTE_C4;
      const midiNote = NOTE_C4 + Math.round((i / this.hexCount) * noteRange);
      this.hexagons.push({
        index: i,
        angle,
        baseDistance,
        currentDistance: baseDistance,
        targetDistance: baseDistance,
        color: WARM_COLORS[0],
        isActive: false,
        isPlaying: false,
        playStartTime: 0,
        hoverScale: 1,
        pressScale: 1,
        midiNote,
        isDragging: false
      });
    }
  }

  public setCenter(x: number, y: number): void {
    this.centerX = x;
    this.centerY = y;
  }

  public setScale(scale: number): void {
    this.scale = scale;
  }

  public getActiveCount(): number {
    return this.hexagons.filter(h => h.isActive).length;
  }

  public getActiveHexagons(): HexagonData[] {
    return this.hexagons.filter(h => h.isActive);
  }

  public getHexPosition(hex: HexagonData): { x: number; y: number } {
    const angle = hex.angle + this.rotation;
    const distance = hex.currentDistance * this.scale;
    return {
      x: this.centerX + Math.cos(angle) * distance,
      y: this.centerY + Math.sin(angle) * distance
    };
  }

  public getHexFrequency(hex: HexagonData): number {
    const distanceRatio = (hex.currentDistance - hex.baseDistance) / (MAX_DISTANCE - MIN_DISTANCE);
    const pitchShift = -distanceRatio * 6;
    return midiToFrequency(hex.midiNote + pitchShift);
  }

  public activateHexagon(index: number): boolean {
    const hex = this.hexagons[index];
    if (hex.isActive) {
      return false;
    }
    if (this.getActiveCount() >= MAX_ACTIVE_HEX) {
      return false;
    }
    hex.isActive = true;
    hex.color = WARM_COLORS[Math.floor(Math.random() * WARM_COLORS.length)];
    const pos = this.getHexPosition(hex);
    this.addRipple(pos.x, pos.y, hex.color);
    return true;
  }

  public deactivateHexagon(index: number): void {
    this.hexagons[index].isActive = false;
    this.hexagons[index].isPlaying = false;
    this.hexagons[index].targetDistance = this.hexagons[index].baseDistance;
  }

  public clearAll(): void {
    for (const hex of this.hexagons) {
      hex.isActive = false;
      hex.isPlaying = false;
      hex.targetDistance = hex.baseDistance;
    }
  }

  public setPlaying(index: number, playing: boolean): void {
    this.hexagons[index].isPlaying = playing;
    if (playing) {
      this.hexagons[index].playStartTime = performance.now();
    }
  }

  private addRipple(x: number, y: number, color: string): void {
    this.ripples.push({
      x,
      y,
      radius: 0,
      maxRadius: 200 * this.scale,
      alpha: 0.8,
      color,
      startTime: performance.now(),
      duration: 600
    });
  }

  public hitTest(x: number, y: number): number {
    for (let i = 0; i < this.hexagons.length; i++) {
      const hex = this.hexagons[i];
      const pos = this.getHexPosition(hex);
      const dx = x - pos.x;
      const dy = y - pos.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < HEX_SIZE * this.scale * 1.1) {
        return i;
      }
    }
    return -1;
  }

  public startDrag(index: number): boolean {
    if (index < 0 || index >= this.hexagons.length) return false;
    if (!this.hexagons[index].isActive) return false;
    this.hexagons[index].isDragging = true;
    this.draggingIndex = index;
    return true;
  }

  public updateDrag(x: number, y: number): void {
    if (this.draggingIndex < 0) return;
    const hex = this.hexagons[this.draggingIndex];
    const dx = x - this.centerX;
    const dy = y - this.centerY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const scaledMin = MIN_DISTANCE * this.scale;
    const scaledMax = MAX_DISTANCE * this.scale;
    hex.currentDistance = Math.max(scaledMin, Math.min(scaledMax, dist)) / this.scale;
    hex.targetDistance = hex.currentDistance;
  }

  public endDrag(): void {
    if (this.draggingIndex >= 0) {
      const hex = this.hexagons[this.draggingIndex];
      hex.isDragging = false;
      const stepSize = (MAX_DISTANCE - MIN_DISTANCE) / DISTANCE_STEPS;
      const steps = Math.round((hex.currentDistance - MIN_DISTANCE) / stepSize);
      hex.targetDistance = MIN_DISTANCE + steps * stepSize;
      hex.targetDistance = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, hex.targetDistance));
    }
    this.draggingIndex = -1;
  }

  public isDragging(): boolean {
    return this.draggingIndex >= 0;
  }

  public setHover(index: number): void {
    this.hoveredIndex = index;
  }

  public update(deltaTime: number, currentTime: number): void {
    if (this.isRotating) {
      this.rotation += 0.01 * deltaTime / 16;
    }

    for (const hex of this.hexagons) {
      const diff = hex.targetDistance - hex.currentDistance;
      if (Math.abs(diff) > 0.01 && !hex.isDragging) {
        hex.currentDistance += diff * 0.15;
      }

      const targetHoverScale = this.hoveredIndex === hex.index ? 1.1 : 1;
      hex.hoverScale += (targetHoverScale - hex.hoverScale) * 0.2;
      hex.pressScale += (1 - hex.pressScale) * 0.3;
    }

    this.ripples = this.ripples.filter(ripple => {
      const elapsed = currentTime - ripple.startTime;
      const progress = elapsed / ripple.duration;
      if (progress >= 1) return false;
      ripple.radius = ripple.maxRadius * progress;
      ripple.alpha = 0.8 * (1 - progress);
      return true;
    });
  }

  public draw(ctx: CanvasRenderingContext2D, currentTime: number): void {
    for (const ripple of this.ripples) {
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.strokeStyle = ripple.color;
      ctx.globalAlpha = ripple.alpha;
      ctx.lineWidth = 2;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    for (const hex of this.hexagons) {
      this.drawHexagon(ctx, hex, currentTime);
    }

    for (const hex of this.hexagons) {
      if (hex.isDragging || (hex.isActive && hex.currentDistance !== hex.baseDistance)) {
        this.drawDragLine(ctx, hex);
      }
    }
  }

  private drawHexagon(ctx: CanvasRenderingContext2D, hex: HexagonData, currentTime: number): void {
    const pos = this.getHexPosition(hex);
    const size = HEX_SIZE * this.scale * hex.hoverScale * hex.pressScale;

    if (hex.isPlaying) {
      const playElapsed = (currentTime - hex.playStartTime) / 1000;
      const pulse = 0.5 + 0.5 * Math.sin(playElapsed * Math.PI * 2);
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, size + 8 * this.scale, 0, Math.PI * 2);
      ctx.strokeStyle = hex.color;
      ctx.globalAlpha = 0.3 + 0.2 * pulse;
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.save();
    ctx.translate(pos.x, pos.y);
    ctx.rotate(hex.angle + this.rotation + Math.PI / 6);

    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const px = Math.cos(angle) * size;
      const py = Math.sin(angle) * size;
      if (i === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.closePath();

    if (hex.isActive) {
      ctx.fillStyle = hex.color;
      ctx.globalAlpha = 0.7;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = hex.color;
      ctx.lineWidth = 2;
      ctx.stroke();
    } else {
      ctx.fillStyle = '#D0D0D0';
      ctx.globalAlpha = 0.3;
      ctx.fill();
      ctx.globalAlpha = 1;
      ctx.strokeStyle = '#D0D0D0';
      ctx.globalAlpha = 0.5;
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }

    ctx.restore();
  }

  private drawDragLine(ctx: CanvasRenderingContext2D, hex: HexagonData): void {
    const pos = this.getHexPosition(hex);
    ctx.beginPath();
    ctx.setLineDash([6, 6]);
    ctx.moveTo(this.centerX, this.centerY);
    ctx.lineTo(pos.x, pos.y);
    ctx.strokeStyle = hex.color;
    ctx.globalAlpha = 0.6;
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
  }
}
