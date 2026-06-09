import { WebManager, Point, SilkThread, OctagonRing } from './web';
import { SpiderManager, Spider, TrailDot } from './spider';
import { UIManager, UIConfig } from './ui';
import './style.css';

interface DrawingState {
  isDrawing: boolean;
  startPoint: Point | null;
  currentPoint: Point | null;
  startTime: number;
}

const PULSE_PERIOD: number = 0.8;
const PULSE_MIN_ALPHA: number = 0.85;
const PULSE_MAX_ALPHA: number = 1.0;

class SpiderWebApp {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private webManager: WebManager;
  private spiderManager: SpiderManager;
  private uiManager: UIManager;

  private drawingState: DrawingState;
  private animationTime: number;
  private lastFrameTime: number;

  private config: UIConfig;

  constructor() {
    const canvasEl: HTMLElement | null = document.getElementById('canvas');
    if (!canvasEl) {
      throw new Error('Canvas element not found');
    }
    this.canvas = canvasEl as HTMLCanvasElement;

    const context: CanvasRenderingContext2D | null = this.canvas.getContext('2d');
    if (!context) {
      throw new Error('Could not get 2D context');
    }
    this.ctx = context;

    this.webManager = new WebManager();
    this.spiderManager = new SpiderManager({ speed: 40 });
    this.uiManager = new UIManager();

    this.config = this.uiManager.getConfig();

    this.drawingState = {
      isDrawing: false,
      startPoint: null,
      currentPoint: null,
      startTime: 0
    };

    this.animationTime = 0;
    this.lastFrameTime = performance.now();

    this.init();
  }

  private init(): void {
    this.resizeCanvas();
    this.setupEventListeners();
    this.setupUICallbacks();
    this.animate();
  }

  private resizeCanvas(): void {
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
  }

  private setupEventListeners(): void {
    window.addEventListener('resize', (): void => {
      this.resizeCanvas();
    });

    this.canvas.addEventListener('mousedown', (e: MouseEvent): void => {
      this.onMouseDown(e);
    });

    this.canvas.addEventListener('mousemove', (e: MouseEvent): void => {
      this.onMouseMove(e);
    });

    this.canvas.addEventListener('mouseup', (e: MouseEvent): void => {
      this.onMouseUp(e);
    });

    this.canvas.addEventListener('mouseleave', (e: MouseEvent): void => {
      this.onMouseUp(e);
    });

    this.canvas.addEventListener('click', (e: MouseEvent): void => {
      this.onClick(e);
    });
  }

  private setupUICallbacks(): void {
    this.uiManager.setUpdateCallback((config: UIConfig): void => {
      this.config = { ...config };
      this.spiderManager.updateSpeed(config.spiderSpeed);
    });

    this.uiManager.setResetCallback((): void => {
      this.reset();
    });
  }

  private onMouseDown(e: MouseEvent): void {
    if (e.button !== 0) {
      return;
    }

    const rect: DOMRect = this.canvas.getBoundingClientRect();
    const point: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    this.drawingState.isDrawing = true;
    this.drawingState.startPoint = point;
    this.drawingState.currentPoint = point;
    this.drawingState.startTime = performance.now();
  }

  private onMouseMove(e: MouseEvent): void {
    if (!this.drawingState.isDrawing) {
      return;
    }

    const rect: DOMRect = this.canvas.getBoundingClientRect();
    this.drawingState.currentPoint = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };
  }

  private onMouseUp(e: MouseEvent): void {
    if (!this.drawingState.isDrawing || !this.drawingState.startPoint || !this.drawingState.currentPoint) {
      this.drawingState.isDrawing = false;
      return;
    }

    const start: Point = this.drawingState.startPoint;
    const end: Point = this.drawingState.currentPoint;
    const dx: number = end.x - start.x;
    const dy: number = end.y - start.y;
    const distance: number = Math.sqrt(dx * dx + dy * dy);

    if (distance > 10) {
      this.webManager.addThread(start, end);
    }

    this.drawingState.isDrawing = false;
    this.drawingState.startPoint = null;
    this.drawingState.currentPoint = null;
  }

  private onClick(e: MouseEvent): void {
    if (this.drawingState.isDrawing) {
      return;
    }

    const rect: DOMRect = this.canvas.getBoundingClientRect();
    const point: Point = {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top
    };

    const intersection = this.webManager.findIntersection(point, 15);
    if (intersection) {
      this.webManager.addOctagonRing(intersection.point);
      this.spiderManager.addSpider(intersection.point);
    }
  }

  private reset(): void {
    this.webManager.clear();
    this.spiderManager.clear();
  }

  private animate(): void {
    const now: number = performance.now();
    const deltaTime: number = (now - this.lastFrameTime) / 1000;
    this.lastFrameTime = now;
    this.animationTime += deltaTime;

    this.update(deltaTime);
    this.render();

    requestAnimationFrame((): void => {
      this.animate();
    });
  }

  private update(deltaTime: number): void {
    this.webManager.updateRings(deltaTime);
    this.spiderManager.update(deltaTime, this.webManager);
  }

  private render(): void {
    this.ctx.fillStyle = '#0a0a0a';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    this.renderThreads();
    this.renderRings();
    this.renderDrawingThread();
    this.renderSpiders();
  }

  private renderThreads(): void {
    const threads: SilkThread[] = this.webManager.getThreads();
    for (const thread of threads) {
      this.drawSilkThread(thread);
    }
  }

  private renderRings(): void {
    const rings: OctagonRing[] = this.webManager.getRings();
    for (const ring of rings) {
      const progress: number = this.easeOutElastic(ring.animationProgress);
      for (let i: number = 0; i < ring.threads.length; i++) {
        const thread: SilkThread = ring.threads[i];
        const endX: number = ring.center.x + (thread.end.x - ring.center.x) * progress;
        const endY: number = ring.center.y + (thread.end.y - ring.center.y) * progress;

        const animatedThread: SilkThread = {
          ...thread,
          end: { x: endX, y: endY }
        };

        this.drawSilkThread(animatedThread);
      }
    }
  }

  private renderDrawingThread(): void {
    if (!this.drawingState.isDrawing || !this.drawingState.startPoint || !this.drawingState.currentPoint) {
      return;
    }

    const start: Point = this.drawingState.startPoint;
    const end: Point = this.drawingState.currentPoint;

    const direction: number = Math.atan2(end.y - start.y, end.x - start.x);
    const startHue: number = 0;
    const hueShift: number = (direction / Math.PI) * 180;
    const endHue: number = (startHue + hueShift + 180) % 360;

    const pulseAlpha: number = this.getPulseAlpha();

    this.ctx.save();
    this.ctx.lineWidth = this.config.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.globalAlpha = pulseAlpha;

    const glowAmount: number = 15 * this.config.glowIntensity;
    this.ctx.shadowBlur = glowAmount;
    this.ctx.shadowColor = `hsla(${startHue}, 80%, 65%, 0.8)`;

    const gradient: CanvasGradient = this.ctx.createLinearGradient(
      start.x, start.y, end.x, end.y
    );
    gradient.addColorStop(0, `hsl(${startHue}, 80%, 65%)`);
    gradient.addColorStop(1, `hsl(${endHue}, 80%, 65%)`);

    this.ctx.strokeStyle = gradient;
    this.ctx.beginPath();
    this.ctx.moveTo(start.x, start.y);
    this.ctx.lineTo(end.x, end.y);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private renderSpiders(): void {
    for (const spider of this.spiderManager.spiders) {
      this.renderSpiderTrail(spider);
      this.renderSpider(spider);
    }
  }

  private renderSpiderTrail(spider: Spider): void {
    for (let i: number = 0; i < spider.trail.length; i++) {
      const dot: TrailDot = spider.trail[i];
      const size: number = spider.radius * (1 - i / spider.MAX_TRAIL_DOTS) * 0.8;

      this.ctx.save();
      this.ctx.globalAlpha = dot.alpha;
      this.ctx.fillStyle = `hsla(${dot.hue}, 100%, 70%, ${dot.alpha})`;
      this.ctx.shadowBlur = 10 * this.config.glowIntensity;
      this.ctx.shadowColor = `hsla(${dot.hue}, 100%, 70%, 1)`;

      this.ctx.beginPath();
      this.ctx.arc(dot.x, dot.y, size, 0, Math.PI * 2);
      this.ctx.fill();
      this.ctx.restore();
    }
  }

  private renderSpider(spider: Spider): void {
    this.ctx.save();
    this.ctx.translate(spider.x, spider.y);

    this.ctx.shadowBlur = 20 * this.config.glowIntensity;
    this.ctx.shadowColor = '#FFD93D';

    this.ctx.fillStyle = spider.bodyColor;
    this.ctx.beginPath();
    this.ctx.arc(0, 0, spider.radius, 0, Math.PI * 2);
    this.ctx.fill();

    this.ctx.shadowBlur = 8 * this.config.glowIntensity;
    this.ctx.strokeStyle = '#FFD93D';
    this.ctx.lineWidth = 2;
    this.ctx.lineCap = 'round';

    for (let i: number = 0; i < 8; i++) {
      const baseAngle: number = (i / 8) * Math.PI * 2;
      const phaseOffset: number = i % 2 === 0 ? 0 : Math.PI;
      const swing: number = Math.sin(spider.legPhase + phaseOffset) * 0.4;

      const legStartR: number = spider.radius * 0.8;
      const legEndR: number = spider.radius * 2.2;
      const midR: number = spider.radius * 1.5;

      const startAngle: number = baseAngle + swing * 0.5;
      const midAngle: number = baseAngle + swing;
      const endAngle: number = baseAngle + swing * 0.8;

      this.ctx.beginPath();
      this.ctx.moveTo(
        Math.cos(startAngle) * legStartR,
        Math.sin(startAngle) * legStartR
      );
      this.ctx.quadraticCurveTo(
        Math.cos(midAngle) * midR,
        Math.sin(midAngle) * midR,
        Math.cos(endAngle) * legEndR,
        Math.sin(endAngle) * legEndR
      );
      this.ctx.stroke();
    }

    this.ctx.restore();
  }

  private drawSilkThread(thread: SilkThread): void {
    const pulseAlpha: number = this.getPulseAlpha();

    this.ctx.save();
    this.ctx.lineWidth = this.config.lineWidth;
    this.ctx.lineCap = 'round';
    this.ctx.globalAlpha = pulseAlpha;

    const glowAmount: number = 15 * this.config.glowIntensity;
    const midHue: number = (thread.startHue + thread.endHue) / 2;
    this.ctx.shadowBlur = glowAmount;
    this.ctx.shadowColor = `hsla(${midHue}, 80%, 65%, 0.8)`;

    const gradient: CanvasGradient = this.ctx.createLinearGradient(
      thread.start.x, thread.start.y,
      thread.end.x, thread.end.y
    );
    gradient.addColorStop(0, thread.startColor);
    gradient.addColorStop(1, thread.endColor);

    this.ctx.strokeStyle = gradient;
    this.ctx.beginPath();
    this.ctx.moveTo(thread.start.x, thread.start.y);
    this.ctx.lineTo(thread.end.x, thread.end.y);
    this.ctx.stroke();

    this.ctx.restore();
  }

  private getPulseAlpha(): number {
    const phase: number = (this.animationTime % PULSE_PERIOD) / PULSE_PERIOD;
    const sine: number = Math.sin(phase * Math.PI * 2);
    return PULSE_MIN_ALPHA + (PULSE_MAX_ALPHA - PULSE_MIN_ALPHA) * (0.5 + 0.5 * sine);
  }

  private easeOutElastic(t: number): number {
    if (t === 0 || t === 1) {
      return t;
    }
    return Math.pow(2, -10 * t) * Math.sin((t - 0.075) * (2 * Math.PI) / 0.3) + 1;
  }
}

document.addEventListener('DOMContentLoaded', (): void => {
  try {
    new SpiderWebApp();
  } catch (error) {
    console.error('Failed to initialize SpiderWebApp:', error);
  }
});
