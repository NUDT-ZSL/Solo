/// <reference types="vite/client" />

import { StrokeManager, type Point } from './stroke';
import { ButterflyManager } from './butterfly';

const MOBILE_BREAKPOINT = 768;
const SEAL_COUNT_MIN = 8;
const SEAL_COUNT_MAX = 12;

interface CanvasEnv {
  canvas: HTMLCanvasElement;
  ctx: CanvasRenderingContext2D;
  width: number;
  height: number;
  dpr: number;
  isMobile: boolean;
}

function createCanvasEnv(canvas: HTMLCanvasElement): CanvasEnv {
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Canvas 2D context not supported');
  const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
  const dpr = Math.min(window.devicePixelRatio || 1, isMobile ? 2 : 2);
  return { canvas, ctx, width: 0, height: 0, dpr, isMobile };
}

function resizeCanvas(env: CanvasEnv): void {
  const rect = env.canvas.getBoundingClientRect();
  env.width = rect.width;
  env.height = rect.height;
  env.canvas.width = Math.round(rect.width * env.dpr);
  env.canvas.height = Math.round(rect.height * env.dpr);
  env.ctx.setTransform(env.dpr, 0, 0, env.dpr, 0, 0);
  env.isMobile = window.innerWidth < MOBILE_BREAKPOINT;
}

function generateSeals(): void {
  const layer = document.getElementById('sealLayer');
  if (!layer) return;
  layer.innerHTML = '';
  const count = Math.floor(Math.random() * (SEAL_COUNT_MAX - SEAL_COUNT_MIN + 1)) + SEAL_COUNT_MIN;
  const layerRect = layer.getBoundingClientRect();
  for (let i = 0; i < count; i++) {
    const seal = document.createElement('div');
    seal.className = 'seal';
    const diameter = Math.random() * 20 + 20;
    const maxX = Math.max(layerRect.width - diameter - 10, 10);
    const maxY = Math.max(layerRect.height - diameter - 10, 10);
    const left = Math.random() * maxX + 5;
    const top = Math.random() * maxY + 5;
    seal.style.width = `${diameter}px`;
    seal.style.height = `${diameter}px`;
    seal.style.left = `${left}px`;
    seal.style.top = `${top}px`;
    layer.appendChild(seal);
  }
}

class App {
  private env: CanvasEnv;
  private strokeManager: StrokeManager;
  private butterflyManager: ButterflyManager;
  private statsEls: {
    butterfly: HTMLElement;
    length: HTMLElement;
    time: HTMLElement;
  };
  private isDrawing: boolean = false;
  private totalDrawTimeMs: number = 0;
  private strokeStartTs: number | null = null;
  private lastFrameTs: number = 0;
  private rafId: number | null = null;
  private _boundHandlers: Record<string, EventListener> = {};

  constructor() {
    const canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('#mainCanvas not found');
    this.env = createCanvasEnv(canvas);

    this.strokeManager = new StrokeManager();
    this.butterflyManager = new ButterflyManager();

    const bEl = document.getElementById('statButterfly');
    const lEl = document.getElementById('statLength');
    const tEl = document.getElementById('statTime');
    if (!bEl || !lEl || !tEl) throw new Error('stats elements not found');
    this.statsEls = { butterfly: bEl, length: lEl, time: tEl };

    this.strokeManager.setButterflyTriggerCallback((pt) => this.onButterflyTrigger(pt));
    console.log('[Main] 初始化完成，蝴蝶触发回调已绑定');
  }

  private onButterflyTrigger(pt: Point): void {
    console.log(`[Main] 收到蝴蝶触发请求: pos=(${pt.x.toFixed(1)},${pt.y.toFixed(1)}), velocity=${pt.velocity.toFixed(2)}, color=${pt.color}`);
    try {
      this.butterflyManager.spawn({
        x: pt.x,
        y: pt.y,
        strokeColor: pt.color,
        strokeVelocity: pt.velocity
      });
      console.log(`[Main] 蝴蝶spawn调用成功，当前数量: ${this.butterflyManager.getCount()}`);
    } catch (e) {
      console.error('[Main] 蝴蝶spawn出错:', e);
    }
  }

  start(): void {
    this.applyResponsiveScales();
    resizeCanvas(this.env);
    generateSeals();
    this.bindEvents();
    this.lastFrameTs = performance.now();
    this.rafId = requestAnimationFrame(this.loop);
  }

  private applyResponsiveScales(): void {
    const isMobile = window.innerWidth < MOBILE_BREAKPOINT;
    this.butterflyManager.setSizeScale(isMobile ? 0.5 : 1);
    this.strokeManager.setTipBaseRadius(isMobile ? 2 : 4);
  }

  private bindEvents(): void {
    const canvas = this.env.canvas;

    const getLocalPos = (clientX: number, clientY: number) => {
      const rect = canvas.getBoundingClientRect();
      return { x: clientX - rect.left, y: clientY - rect.top };
    };

    this._boundHandlers.mousedown = (e) => {
      const ev = e as MouseEvent;
      if (ev.button !== 0) return;
      this.beginDraw(getLocalPos(ev.clientX, ev.clientY));
    };
    this._boundHandlers.mousemove = (e) => {
      const ev = e as MouseEvent;
      if (!this.isDrawing) return;
      this.moveDraw(getLocalPos(ev.clientX, ev.clientY));
    };
    this._boundHandlers.mouseup = () => this.endDraw();
    this._boundHandlers.mouseleave = () => { if (this.isDrawing) this.endDraw(); };

    this._boundHandlers.touchstart = (e) => {
      const ev = e as TouchEvent;
      ev.preventDefault();
      if (ev.touches.length !== 1) return;
      const t = ev.touches[0];
      this.beginDraw(getLocalPos(t.clientX, t.clientY));
    };
    this._boundHandlers.touchmove = (e) => {
      const ev = e as TouchEvent;
      ev.preventDefault();
      if (!this.isDrawing || ev.touches.length !== 1) return;
      const t = ev.touches[0];
      this.moveDraw(getLocalPos(t.clientX, t.clientY));
    };
    this._boundHandlers.touchend = (e) => {
      const ev = e as TouchEvent;
      ev.preventDefault();
      this.endDraw();
    };
    this._boundHandlers.touchcancel = () => this.endDraw();

    canvas.addEventListener('mousedown', this._boundHandlers.mousedown);
    window.addEventListener('mousemove', this._boundHandlers.mousemove);
    window.addEventListener('mouseup', this._boundHandlers.mouseup);
    canvas.addEventListener('mouseleave', this._boundHandlers.mouseleave);
    canvas.addEventListener('touchstart', this._boundHandlers.touchstart, { passive: false });
    canvas.addEventListener('touchmove', this._boundHandlers.touchmove, { passive: false });
    canvas.addEventListener('touchend', this._boundHandlers.touchend, { passive: false });
    canvas.addEventListener('touchcancel', this._boundHandlers.touchcancel, { passive: false });

    this._boundHandlers.resize = () => {
      this.applyResponsiveScales();
      resizeCanvas(this.env);
      generateSeals();
    };
    window.addEventListener('resize', this._boundHandlers.resize);
  }

  private beginDraw(pos: { x: number; y: number }): void {
    this.isDrawing = true;
    this.strokeStartTs = performance.now();
    this.strokeManager.beginDrawing();
    this.strokeManager.addPoint(pos.x, pos.y);
  }

  private moveDraw(pos: { x: number; y: number }): void {
    this.strokeManager.addPoint(pos.x, pos.y);
  }

  private endDraw(): void {
    if (!this.isDrawing) return;
    this.isDrawing = false;
    console.log('[Main] 结束绘制，触发扩散蝴蝶');

    if (this.strokeStartTs !== null) {
      this.totalDrawTimeMs += performance.now() - this.strokeStartTs;
      this.strokeStartTs = null;
    }

    const result = this.strokeManager.endStroke();
    const lastPoint = result.lastPoint;
    console.log(`[Main] 最后轨迹点: ${lastPoint ? `(${lastPoint.x.toFixed(1)},${lastPoint.y.toFixed(1)})` : '无'}, 段长度: ${result.length.toFixed(1)}px`);

    if (lastPoint) {
      const count = Math.floor(Math.random() * 3) + 3;
      console.log(`[Main] 生成 ${count} 只扩散蝴蝶`);
      for (let i = 0; i < count; i++) {
        const angle = Math.random() * Math.PI * 2;
        const radius = Math.random() * 50 + 30;
        this.butterflyManager.spawn({
          x: lastPoint.x,
          y: lastPoint.y,
          strokeColor: lastPoint.color,
          strokeVelocity: lastPoint.velocity,
          isSpread: true,
          spreadTarget: {
            x: lastPoint.x + Math.cos(angle) * radius,
            y: lastPoint.y + Math.sin(angle) * radius
          },
          spreadDuration: 2000
        });
      }
    }
  }

  private loop = (ts: number): void => {
    const delta = Math.min(ts - this.lastFrameTs, 50);
    this.lastFrameTs = ts;

    if (!this.isDrawing) {
      this.strokeManager.updateTipFade(delta);
    } else if (this.strokeStartTs !== null) {
      this.totalDrawTimeMs += delta;
      this.strokeStartTs = ts;
    }

    this.butterflyManager.update(delta, ts);

    const ctx = this.env.ctx;
    ctx.clearRect(0, 0, this.env.width, this.env.height);

    this.strokeManager.render(ctx);
    this.butterflyManager.render(ctx);

    this.updateStats();

    this.rafId = requestAnimationFrame(this.loop);
  };

  private updateStats(): void {
    this.statsEls.butterfly.textContent = String(this.butterflyManager.getCount());
    this.statsEls.length.textContent = String(Math.round(this.strokeManager.getTotalLength()));
    this.statsEls.time.textContent = (this.totalDrawTimeMs / 1000).toFixed(1);
  }

  stop(): void {
    if (this.rafId !== null) cancelAnimationFrame(this.rafId);
    this.rafId = null;
    const canvas = this.env.canvas;
    canvas.removeEventListener('mousedown', this._boundHandlers.mousedown);
    window.removeEventListener('mousemove', this._boundHandlers.mousemove);
    window.removeEventListener('mouseup', this._boundHandlers.mouseup);
    canvas.removeEventListener('mouseleave', this._boundHandlers.mouseleave);
    canvas.removeEventListener('touchstart', this._boundHandlers.touchstart);
    canvas.removeEventListener('touchmove', this._boundHandlers.touchmove);
    canvas.removeEventListener('touchend', this._boundHandlers.touchend);
    canvas.removeEventListener('touchcancel', this._boundHandlers.touchcancel);
    window.removeEventListener('resize', this._boundHandlers.resize);
  }
}

const app = new App();
app.start();

if (import.meta.hot) {
  import.meta.hot.dispose(() => {
    app.stop();
  });
}
