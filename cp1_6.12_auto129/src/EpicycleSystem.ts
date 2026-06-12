import type {
  EpicycleConfig,
  TracePoint,
  EpicycleState,
  PlaybackSpeed,
  PerformanceMetrics,
  EpicycleSystemAPI,
} from './types';

const EPICYCLE_COLORS = [
  '#00f5d4',
  '#f72585',
  '#4cc9f0',
  '#ffbe0b',
  '#90e0ef',
  '#b5179e',
  '#06d6a0',
  '#ff006e',
];

const MAX_TRACE_POINTS = 5000;

const HUE_START = 180;
const HUE_END = 320;

export class EpicycleSystem implements EpicycleSystemAPI {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  private epicycleConfigs: EpicycleConfig[] = [];
  private epicycleStates: EpicycleState[] = [];
  private tracePoints: TracePoint[] = [];
  private totalArcLength: number = 0;

  private time: number = 0;
  private isPlaying: boolean = true;
  private playbackSpeed: PlaybackSpeed = 1;

  private animationId: number | null = null;
  private lastTimestamp: number = 0;

  private offsetX: number = 0;
  private offsetY: number = 0;
  private zoom: number = 1;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private lastOffsetX: number = 0;
  private lastOffsetY: number = 0;

  private fps: number = 0;
  private frameTime: number = 0;
  private drawTime: number = 0;
  private fpsFrameCount: number = 0;
  private fpsLastTime: number = 0;

  private zoomChangeCallback?: (zoom: number) => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    this.resize();
    this.setupEventListeners();
  }

  onZoomChange(callback: (zoom: number) => void) {
    this.zoomChangeCallback = callback;
  }

  private setupEventListeners() {
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());
    this.canvas.addEventListener('mousedown', this.handleMouseDown);
    this.canvas.addEventListener('mousemove', this.handleMouseMove);
    this.canvas.addEventListener('mouseup', this.handleMouseUp);
    this.canvas.addEventListener('mouseleave', this.handleMouseUp);
    this.canvas.addEventListener('wheel', this.handleWheel, { passive: false });
    window.addEventListener('resize', this.resize);
  }

  private handleMouseDown = (e: MouseEvent) => {
    if (e.button === 2) {
      this.isDragging = true;
      this.dragStartX = e.clientX;
      this.dragStartY = e.clientY;
      this.lastOffsetX = this.offsetX;
      this.lastOffsetY = this.offsetY;
      this.canvas.style.cursor = 'grabbing';
    }
  };

  private handleMouseMove = (e: MouseEvent) => {
    if (this.isDragging) {
      this.offsetX = this.lastOffsetX + (e.clientX - this.dragStartX);
      this.offsetY = this.lastOffsetY + (e.clientY - this.dragStartY);
    }
  };

  private handleMouseUp = () => {
    if (this.isDragging) {
      this.isDragging = false;
      this.canvas.style.cursor = 'grab';
    }
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, this.zoom * delta));
    this.zoom = newZoom;
    if (this.zoomChangeCallback) {
      this.zoomChangeCallback(this.zoom);
    }
  };

  resize = () => {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  };

  setConfig(configs: EpicycleConfig[]) {
    this.epicycleConfigs = configs.map((c) => ({ ...c }));
    this.clearTrace();
  }

  getConfig(): EpicycleConfig[] {
    return this.epicycleConfigs.map((c) => ({ ...c }));
  }

  addTracePoint(point: TracePoint) {
    if (this.tracePoints.length > 0) {
      const last = this.tracePoints[this.tracePoints.length - 1];
      const dx = point.x - last.x;
      const dy = point.y - last.y;
      this.totalArcLength += Math.sqrt(dx * dx + dy * dy);
    }
    point.arcLength = this.totalArcLength;
    this.tracePoints.push(point);

    if (this.tracePoints.length > MAX_TRACE_POINTS) {
      const removed = this.tracePoints.shift();
      if (removed && this.tracePoints.length > 0) {
        this.totalArcLength -= this.tracePoints[this.tracePoints.length - 1].arcLength - removed.arcLength;
      }
    }
  }

  clearTrace() {
    this.tracePoints = [];
    this.totalArcLength = 0;
    this.time = 0;
  }

  togglePlay() {
    this.isPlaying = !this.isPlaying;
  }

  setPlaybackSpeed(speed: PlaybackSpeed) {
    this.playbackSpeed = speed;
  }

  getPlaybackSpeed(): PlaybackSpeed {
    return this.playbackSpeed;
  }

  getIsPlaying(): boolean {
    return this.isPlaying;
  }

  resetView() {
    this.offsetX = 0;
    this.offsetY = 0;
    this.zoom = 1;
    this.clearTrace();
    if (this.zoomChangeCallback) {
      this.zoomChangeCallback(this.zoom);
    }
  }

  getZoom(): number {
    return this.zoom;
  }

  getEpicycleStates(): EpicycleState[] {
    return this.epicycleStates.map((s) => ({ ...s }));
  }

  getTracePoints(): TracePoint[] {
    return this.tracePoints.map((p) => ({ ...p }));
  }

  getPerformanceMetrics(): PerformanceMetrics {
    return {
      fps: this.fps,
      frameTime: this.frameTime,
      drawTime: this.drawTime,
    };
  }

  private computeStates() {
    const states: EpicycleState[] = [];
    let currentX = 0;
    let currentY = 0;

    for (const epicycle of this.epicycleConfigs) {
      const angle = epicycle.phase + this.time * epicycle.angularVelocity;
      const x = currentX + Math.cos(angle) * epicycle.radius;
      const y = currentY + Math.sin(angle) * epicycle.radius;
      states.push({ x, y, angle });
      currentX = x;
      currentY = y;
    }

    this.epicycleStates = states;
    return { states, endX: currentX, endY: currentY };
  }

  private worldToScreen(x: number, y: number): { x: number; y: number } {
    const centerX = window.innerWidth / 2 + this.offsetX;
    const centerY = window.innerHeight / 2 + this.offsetY;
    return {
      x: centerX + x * this.zoom,
      y: centerY + y * this.zoom,
    };
  }

  private getLineWidth(): number {
    if (this.zoom > 1.5) return 3;
    if (this.zoom < 0.8) return 1;
    return 2;
  }

  private getHueForPoint(arcLength: number): number {
    if (this.totalArcLength === 0) return HUE_START;
    const t = arcLength / this.totalArcLength;
    return HUE_START + t * (HUE_END - HUE_START);
  }

  private drawBackground() {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }

  private drawEpicycles() {
    let prevX = 0;
    let prevY = 0;

    for (let i = 0; i < this.epicycleConfigs.length; i++) {
      const epicycle = this.epicycleConfigs[i];
      const state = this.epicycleStates[i];
      const centerScreen = this.worldToScreen(prevX, prevY);
      const endScreen = this.worldToScreen(state.x, state.y);
      const radiusScreen = epicycle.radius * this.zoom;

      this.ctx.beginPath();
      this.ctx.arc(centerScreen.x, centerScreen.y, radiusScreen, 0, Math.PI * 2);
      this.ctx.strokeStyle = epicycle.color + '40';
      this.ctx.lineWidth = 1;
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.moveTo(centerScreen.x, centerScreen.y);
      this.ctx.lineTo(endScreen.x, endScreen.y);
      this.ctx.strokeStyle = epicycle.color + '99';
      this.ctx.lineWidth = 1.5;
      this.ctx.stroke();

      this.ctx.beginPath();
      this.ctx.arc(endScreen.x, endScreen.y, 6, 0, Math.PI * 2);
      this.ctx.fillStyle = epicycle.color;
      this.ctx.fill();

      prevX = state.x;
      prevY = state.y;
    }
  }

  private drawTrace() {
    if (this.tracePoints.length < 2) return;

    const lineWidth = this.getLineWidth();

    this.ctx.save();
    this.ctx.shadowColor = 'rgba(0, 245, 212, 0.5)';
    this.ctx.shadowBlur = 10;

    for (let i = 1; i < this.tracePoints.length; i++) {
      const p1 = this.tracePoints[i - 1];
      const p2 = this.tracePoints[i];
      const s1 = this.worldToScreen(p1.x, p1.y);
      const s2 = this.worldToScreen(p2.x, p2.y);

      const hue = this.getHueForPoint(p2.arcLength);

      this.ctx.beginPath();
      this.ctx.moveTo(s1.x, s1.y);
      this.ctx.lineTo(s2.x, s2.y);
      this.ctx.strokeStyle = `hsla(${hue}, 80%, 60%, 0.9)`;
      this.ctx.lineWidth = lineWidth;
      this.ctx.stroke();
    }

    this.ctx.restore();

    for (let i = 1; i < this.tracePoints.length; i++) {
      const p1 = this.tracePoints[i - 1];
      const p2 = this.tracePoints[i];
      const s1 = this.worldToScreen(p1.x, p1.y);
      const s2 = this.worldToScreen(p2.x, p2.y);

      const hue = this.getHueForPoint(p2.arcLength);

      this.ctx.beginPath();
      this.ctx.moveTo(s1.x, s1.y);
      this.ctx.lineTo(s2.x, s2.y);
      this.ctx.strokeStyle = `hsla(${hue}, 80%, 60%, 0.25)`;
      this.ctx.lineWidth = lineWidth * 3;
      this.ctx.stroke();
    }
  }

  private drawLabels() {
    const scale = 1 / this.zoom;
    this.ctx.save();
    this.ctx.font = `${12 * scale}px Inter, sans-serif`;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.textAlign = 'left';
    this.ctx.textBaseline = 'alphabetic';

    for (let i = 0; i < this.epicycleConfigs.length; i++) {
      const epicycle = this.epicycleConfigs[i];
      const state = this.epicycleStates[i];
      const screen = this.worldToScreen(state.x, state.y);

      const angleDeg = ((state.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const label = `r:${epicycle.radius.toFixed(0)} θ:${angleDeg.toFixed(1)}°`;

      this.ctx.save();
      this.ctx.translate(screen.x + 10 * scale, screen.y - 10 * scale);
      this.ctx.scale(scale, scale);
      this.ctx.fillText(label, 0, 0);
      this.ctx.restore();
    }

    this.ctx.restore();
  }

  private updateFPS(timestamp: number) {
    if (this.fpsLastTime === 0) {
      this.fpsLastTime = timestamp;
    }

    this.fpsFrameCount++;
    const elapsed = timestamp - this.fpsLastTime;

    if (elapsed >= 1000) {
      this.fps = Math.round((this.fpsFrameCount * 1000) / elapsed);
      this.frameTime = elapsed / this.fpsFrameCount;
      this.fpsFrameCount = 0;
      this.fpsLastTime = timestamp;
    }
  }

  private animate = (timestamp: number) => {
    const frameStart = performance.now();

    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
    }

    const deltaTime = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    if (this.isPlaying) {
      this.time += deltaTime * this.playbackSpeed;

      const { endX, endY } = this.computeStates();

      this.addTracePoint({
        x: endX,
        y: endY,
        time: this.time,
        arcLength: 0,
      });
    } else {
      this.computeStates();
    }

    this.drawBackground();
    this.drawTrace();
    this.drawEpicycles();
    this.drawLabels();

    this.drawTime = performance.now() - frameStart;
    this.updateFPS(timestamp);

    this.animationId = requestAnimationFrame(this.animate);
  };

  start() {
    if (this.animationId === null) {
      this.lastTimestamp = 0;
      this.fpsLastTime = 0;
      this.fpsFrameCount = 0;
      this.computeStates();
      this.animationId = requestAnimationFrame(this.animate);
    }
  }

  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private getBezierControlPoints(points: TracePoint[]): string {
    if (points.length < 2) return '';

    let d = `M ${points[0].x.toFixed(2)} ${points[0].y.toFixed(2)}`;

    for (let i = 1; i < points.length; i++) {
      const p0 = points[i - 1];
      const p1 = points[i];

      const midX = (p0.x + p1.x) / 2;
      const midY = (p0.y + p1.y) / 2;

      const cp1x = (p0.x + midX) / 2;
      const cp1y = p0.y;
      const cp2x = (p1.x + midX) / 2;
      const cp2y = p1.y;

      d += ` C ${cp1x.toFixed(2)} ${cp1y.toFixed(2)}, ${cp2x.toFixed(2)} ${cp2y.toFixed(2)}, ${p1.x.toFixed(2)} ${p1.y.toFixed(2)}`;
    }

    return d;
  }

  exportSVG(): string {
    const tracePoints = this.tracePoints;
    const states = this.epicycleStates;

    const padding = 50;
    let minX = Infinity,
      maxX = -Infinity,
      minY = Infinity,
      maxY = -Infinity;

    for (const p of tracePoints) {
      minX = Math.min(minX, p.x);
      maxX = Math.max(maxX, p.x);
      minY = Math.min(minY, p.y);
      maxY = Math.max(maxY, p.y);
    }

    for (const s of states) {
      minX = Math.min(minX, s.x);
      maxX = Math.max(maxX, s.x);
      minY = Math.min(minY, s.y);
      maxY = Math.max(maxY, s.y);
    }

    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    const offsetX = padding - minX;
    const offsetY = padding - minY;

    const toSvgX = (x: number) => (x + offsetX).toFixed(2);
    const toSvgY = (y: number) => (y + offsetY).toFixed(2);

    const svgTracePoints = tracePoints.map(p => ({
      ...p,
      x: p.x + offsetX,
      y: p.y + offsetY,
    }));

    const bezierPath = this.getBezierControlPoints(svgTracePoints);

    let epicycleElements = '';
    let epicycleControlPoints = '';
    let prevX = 0;
    let prevY = 0;

    for (let i = 0; i < this.epicycleConfigs.length; i++) {
      const epicycle = this.epicycleConfigs[i];
      const state = states[i];
      const cx = toSvgX(prevX);
      const cy = toSvgY(prevY);
      const ex = toSvgX(state.x);
      const ey = toSvgY(state.y);

      epicycleElements += `
        <circle cx="${cx}" cy="${cy}" r="${epicycle.radius.toFixed(2)}" fill="none" stroke="${epicycle.color}" stroke-opacity="0.25" stroke-width="1"/>
        <line x1="${cx}" y1="${cy}" x2="${ex}" y2="${ey}" stroke="${epicycle.color}" stroke-opacity="0.6" stroke-width="1.5"/>
        <circle cx="${ex}" cy="${ey}" r="4" fill="${epicycle.color}"/>
      `;

      epicycleControlPoints += `
        <!-- Control point for epicycle ${i + 1}: (${ex}, ${ey}) radius: ${epicycle.radius.toFixed(2)} angle: ${(state.angle * 180 / Math.PI).toFixed(2)}deg -->
      `;

      prevX = state.x;
      prevY = state.y;
    }

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width.toFixed(0)}" height="${height.toFixed(0)}" viewBox="0 0 ${width.toFixed(0)} ${height.toFixed(0)}">
  <defs>
    <linearGradient id="traceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00f5d4"/>
      <stop offset="50%" stop-color="#b5179e"/>
      <stop offset="100%" stop-color="#f72585"/>
    </linearGradient>
  </defs>
  <rect width="${width.toFixed(0)}" height="${height.toFixed(0)}" fill="#1a1a2e"/>
  
  <!-- Trace path with cubic Bezier curves -->
  <path d="${bezierPath}" fill="none" stroke="url(#traceGradient)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  
  <!-- Epicycle elements -->
  ${epicycleElements}
  
  <!-- Control points metadata -->
  ${epicycleControlPoints}
  
  <!-- Total epicycles: ${this.epicycleConfigs.length} -->
  <!-- Total trace points: ${tracePoints.length} -->
  <!-- Total arc length: ${this.totalArcLength.toFixed(2)} -->
</svg>`;

    return svgContent;
  }

  getEpicycleColors(): string[] {
    return [...EPICYCLE_COLORS];
  }

  getEpicycleCount(): number {
    return this.epicycleConfigs.length;
  }

  measureRedrawTime(): number {
    const start = performance.now();
    this.drawBackground();
    this.drawTrace();
    this.drawEpicycles();
    this.drawLabels();
    return performance.now() - start;
  }
}
