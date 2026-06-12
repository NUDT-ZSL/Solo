import type { EpicycleConfig, TracePoint, EpicycleState, PlaybackSpeed } from './types';

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

export class EpicycleSystem {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private epicycles: EpicycleConfig[] = [];
  private tracePoints: TracePoint[] = [];
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

  private onTraceUpdate?: () => void;

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

  setOnTraceUpdate(callback: () => void) {
    this.onTraceUpdate = callback;
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
      const dx = e.clientX - this.dragStartX;
      const dy = e.clientY - this.dragStartY;
      this.offsetX = this.lastOffsetX + dx;
      this.offsetY = this.lastOffsetY + dy;
    }
  };

  private handleMouseUp = () => {
    this.isDragging = false;
    this.canvas.style.cursor = this.isDragging ? 'grabbing' : 'grab';
  };

  private handleWheel = (e: WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? 0.9 : 1.1;
    const newZoom = Math.max(0.5, Math.min(3, this.zoom * delta));
    this.zoom = newZoom;
  };

  resize = () => {
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = window.innerWidth * dpr;
    this.canvas.height = window.innerHeight * dpr;
    this.canvas.style.width = window.innerWidth + 'px';
    this.canvas.style.height = window.innerHeight + 'px';
    this.ctx.scale(dpr, dpr);
  };

  setEpicycles(configs: EpicycleConfig[]) {
    this.epicycles = configs;
    this.clearTrace();
  }

  addEpicycle(config: EpicycleConfig) {
    if (this.epicycles.length < 8) {
      this.epicycles.push(config);
      this.clearTrace();
    }
  }

  removeEpicycle(id: string) {
    const index = this.epicycles.findIndex((e) => e.id === id);
    if (index > -1) {
      this.epicycles.splice(index, 1);
      this.clearTrace();
    }
  }

  updateEpicycle(id: string, updates: Partial<EpicycleConfig>) {
    const epicycle = this.epicycles.find((e) => e.id === id);
    if (epicycle) {
      Object.assign(epicycle, updates);
      this.clearTrace();
    }
  }

  clearTrace() {
    this.tracePoints = [];
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
  }

  getZoom(): number {
    return this.zoom;
  }

  private computeEpicycleStates(): { states: EpicycleState[]; endX: number; endY: number } {
    const states: EpicycleState[] = [];
    let currentX = 0;
    let currentY = 0;

    for (const epicycle of this.epicycles) {
      const angle = epicycle.phase + this.time * epicycle.angularVelocity;
      const x = currentX + Math.cos(angle) * epicycle.radius;
      const y = currentY + Math.sin(angle) * epicycle.radius;
      states.push({ x, y, angle });
      currentX = x;
      currentY = y;
    }

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

  private drawBackground() {
    this.ctx.fillStyle = '#1a1a2e';
    this.ctx.fillRect(0, 0, window.innerWidth, window.innerHeight);
  }

  private drawEpicycles(states: EpicycleState[]) {
    let prevX = 0;
    let prevY = 0;

    for (let i = 0; i < this.epicycles.length; i++) {
      const epicycle = this.epicycles[i];
      const state = states[i];
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

      const t = i / this.tracePoints.length;
      const hue = (t * 300) % 360;

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

      const t = i / this.tracePoints.length;
      const hue = (t * 300) % 360;

      this.ctx.beginPath();
      this.ctx.moveTo(s1.x, s1.y);
      this.ctx.lineTo(s2.x, s2.y);
      this.ctx.strokeStyle = `hsla(${hue}, 80%, 60%, 0.3)`;
      this.ctx.lineWidth = lineWidth * 3;
      this.ctx.stroke();
    }
  }

  private drawLabels(states: EpicycleState[]) {
    const scale = 1 / this.zoom;
    this.ctx.save();
    this.ctx.font = `${12 * scale}px Inter, sans-serif`;
    this.ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    this.ctx.textAlign = 'left';

    for (let i = 0; i < this.epicycles.length; i++) {
      const epicycle = this.epicycles[i];
      const state = states[i];
      const screen = this.worldToScreen(state.x, state.y);

      const angleDeg = ((state.angle % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2);
      const label = `r:${epicycle.radius.toFixed(0)} θ:${angleDeg.toFixed(1)}°`;

      this.ctx.fillText(label, screen.x + 10 * scale, screen.y - 10 * scale);
    }

    this.ctx.restore();
  }

  private animate = (timestamp: number) => {
    if (this.lastTimestamp === 0) {
      this.lastTimestamp = timestamp;
    }

    const deltaTime = (timestamp - this.lastTimestamp) / 1000;
    this.lastTimestamp = timestamp;

    if (this.isPlaying) {
      this.time += deltaTime * this.playbackSpeed;

      const { endX, endY } = this.computeEpicycleStates();

      this.tracePoints.push({
        x: endX,
        y: endY,
        time: this.time,
      });

      if (this.tracePoints.length > MAX_TRACE_POINTS) {
        this.tracePoints.shift();
      }

      if (this.onTraceUpdate) {
        this.onTraceUpdate();
      }
    }

    this.drawBackground();
    const { states } = this.computeEpicycleStates();
    this.drawTrace();
    this.drawEpicycles(states);
    this.drawLabels(states);

    this.animationId = requestAnimationFrame(this.animate);
  };

  start() {
    if (this.animationId === null) {
      this.lastTimestamp = 0;
      this.animationId = requestAnimationFrame(this.animate);
    }
  }

  stop() {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  exportSVG(): string {
    const { states } = this.computeEpicycleStates();
    const tracePoints = this.tracePoints;

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

    const toSvgX = (x: number) => x - minX + padding;
    const toSvgY = (y: number) => y - minY + padding;

    let pathD = '';
    if (tracePoints.length > 0) {
      pathD = `M ${toSvgX(tracePoints[0].x)} ${toSvgY(tracePoints[0].y)}`;
      for (let i = 1; i < tracePoints.length; i++) {
        pathD += ` L ${toSvgX(tracePoints[i].x)} ${toSvgY(tracePoints[i].y)}`;
      }
    }

    let epicycleElements = '';
    let prevX = 0;
    let prevY = 0;

    for (let i = 0; i < this.epicycles.length; i++) {
      const epicycle = this.epicycles[i];
      const state = states[i];
      const cx = toSvgX(prevX);
      const cy = toSvgY(prevY);
      const ex = toSvgX(state.x);
      const ey = toSvgY(state.y);

      epicycleElements += `
        <circle cx="${cx}" cy="${cy}" r="${epicycle.radius}" fill="none" stroke="${epicycle.color}" stroke-opacity="0.25" stroke-width="1"/>
        <line x1="${cx}" y1="${cy}" x2="${ex}" y2="${ey}" stroke="${epicycle.color}" stroke-opacity="0.6" stroke-width="1.5"/>
        <circle cx="${ex}" cy="${ey}" r="4" fill="${epicycle.color}"/>
      `;

      prevX = state.x;
      prevY = state.y;
    }

    const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#1a1a2e"/>
  <path d="${pathD}" fill="none" stroke="url(#traceGradient)" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
  <defs>
    <linearGradient id="traceGradient" x1="0%" y1="0%" x2="100%" y2="0%">
      <stop offset="0%" stop-color="#00f5d4"/>
      <stop offset="50%" stop-color="#b5179e"/>
      <stop offset="100%" stop-color="#f72585"/>
    </linearGradient>
  </defs>
  ${epicycleElements}
</svg>`;

    return svgContent;
  }

  getEpicycleColors(): string[] {
    return EPICYCLE_COLORS;
  }

  getEpicycleCount(): number {
    return this.epicycles.length;
  }
}
