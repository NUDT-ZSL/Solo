// ============================================================
// 应用入口
// 职责：
//   1. 初始化 Canvas、Loom 织机系统
//   2. 绑定参数控制面板滑块
//   3. 主循环 (requestAnimationFrame)
//   4. 响应式布局处理
//   5. 视觉反馈（光线流动、环形光晕、帧率监控）
// ============================================================

import { Loom } from './loom';

interface UIReferences {
  canvas: HTMLCanvasElement;
  container: HTMLElement;
  fpsCounter: HTMLElement;
  densitySlider: HTMLInputElement;
  tensionSlider: HTMLInputElement;
  shiftSlider: HTMLInputElement;
  densityValue: HTMLElement;
  tensionValue: HTMLElement;
  shiftValue: HTMLElement;
  lightRail: HTMLElement;
  panel: HTMLElement;
}

class App {
  private ui: UIReferences;
  private loom: Loom;
  private ctx: CanvasRenderingContext2D;
  private _rafId: number = 0;
  private _lastTime: number = 0;
  private _fpsFrames: number = 0;
  private _fpsAccum: number = 0;
  private _lightRailAnimationId: number | null = null;
  private _isNarrow: boolean = false;

  constructor() {
    const canvas = document.getElementById('loom-canvas') as HTMLCanvasElement;
    if (!canvas) throw new Error('Canvas element not found');

    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context not available');

    this.ui = {
      canvas,
      container: document.getElementById('canvas-container') as HTMLElement,
      fpsCounter: document.getElementById('fps-counter') as HTMLElement,
      densitySlider: document.getElementById('density-slider') as HTMLInputElement,
      tensionSlider: document.getElementById('tension-slider') as HTMLInputElement,
      shiftSlider: document.getElementById('shift-slider') as HTMLInputElement,
      densityValue: document.getElementById('density-value') as HTMLElement,
      tensionValue: document.getElementById('tension-value') as HTMLElement,
      shiftValue: document.getElementById('shift-value') as HTMLElement,
      lightRail: document.getElementById('light-rail') as HTMLElement,
      panel: document.getElementById('control-panel') as HTMLElement,
    };

    this.ctx = ctx;

    // 检查窄屏
    this._isNarrow = window.innerWidth < 800;

    // 初始化尺寸
    this._resizeCanvas();

    // 创建织机
    this.loom = new Loom(canvas.width, canvas.height);
    this.loom.bind(
      canvas,
      (x, y) => this._handleExplosionVisual(x, y),
      (diff) => this._triggerLightRail(diff)
    );

    // 绑定 UI
    this._bindControls();

    // 响应式
    window.addEventListener('resize', this._handleResize);
  }

  private _resizeCanvas(): void {
    const { canvas, container } = this.ui;
    const rect = container.getBoundingClientRect();

    const dpr = window.devicePixelRatio || 1;
    const cssWidth = rect.width;
    const cssHeight = rect.height;
    const bufferWidth = Math.max(1, Math.floor(cssWidth * dpr));
    const bufferHeight = Math.max(1, Math.floor(cssHeight * dpr));

    canvas.style.width = cssWidth + 'px';
    canvas.style.height = cssHeight + 'px';
    canvas.width = bufferWidth;
    canvas.height = bufferHeight;

    this.ctx.setTransform(1, 0, 0, 1, 0, 0);

    if (this.loom) {
      this.loom.resize(bufferWidth, bufferHeight);
    }
  }

  private _handleResize = (): void => {
    this._isNarrow = window.innerWidth < 800;
    this._resizeCanvas();
  };

  private _bindControls(): void {
    const { densitySlider, tensionSlider, shiftSlider,
            densityValue, tensionValue, shiftValue } = this.ui;

    densitySlider.addEventListener('input', () => {
      const val = parseFloat(densitySlider.value);
      densityValue.textContent = val.toFixed(1);
      this.loom.updateParam('density', val);
    });

    tensionSlider.addEventListener('input', () => {
      const val = parseFloat(tensionSlider.value);
      tensionValue.textContent = val.toFixed(1);
      this.loom.updateParam('tension', val);
    });

    shiftSlider.addEventListener('input', () => {
      const val = parseFloat(shiftSlider.value);
      shiftValue.textContent = val.toFixed(2);
      this.loom.updateParam('colorShiftSpeed', val);
    });
  }

  // 参数变化 → 光线流动动画
  private _triggerLightRail(normalizedDiff: number): void {
    const { lightRail } = this.ui;

    // 速度：变化幅度>0.2 → 快（400ms），否则按比例延长
    const durationMs = normalizedDiff > 0.2 ? 400 : 400 + (1 - normalizedDiff) * 600;

    if (this._lightRailAnimationId !== null) {
      cancelAnimationFrame(this._lightRailAnimationId);
    }

    lightRail.style.transition = 'none';
    lightRail.style.transform = 'translateY(-100%)';
    lightRail.style.opacity = '1';

    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / durationMs, 1);
      // ease-out
      const eased = 1 - Math.pow(1 - t, 3);
      const translateY = -100 + eased * 200;
      lightRail.style.transform = `translateY(${translateY}%)`;

      if (t < 1) {
        this._lightRailAnimationId = requestAnimationFrame(animate);
      } else {
        lightRail.style.opacity = '0';
        this._lightRailAnimationId = null;
      }
    };

    this._lightRailAnimationId = requestAnimationFrame(animate);
  }

  // 爆炸 → 环形光晕动画
  private _handleExplosionVisual(canvasX: number, canvasY: number): void {
    const { canvas } = this.ui;
    const rect = canvas.getBoundingClientRect();

    const scaleX = rect.width / canvas.width;
    const scaleY = rect.height / canvas.height;

    const clientX = rect.left + canvasX * scaleX;
    const clientY = rect.top + canvasY * scaleY;

    const halo = document.createElement('div');
    halo.className = 'halo';
    halo.style.position = 'fixed';
    halo.style.left = clientX + 'px';
    halo.style.top = clientY + 'px';
    halo.style.zIndex = '15';
    document.body.appendChild(halo);

    setTimeout(() => halo.remove(), 550);
  }

  // 主循环
  private _loop = (now: number): void => {
    if (this._lastTime === 0) this._lastTime = now;
    const dt = Math.min((now - this._lastTime) / 1000, 0.05);
    this._lastTime = now;

    // FPS 计算
    this._fpsFrames++;
    this._fpsAccum += dt;
    if (this._fpsAccum >= 0.5) {
      const fps = Math.round(this._fpsFrames / this._fpsAccum);
      this._updateFpsDisplay(fps);
      this._fpsFrames = 0;
      this._fpsAccum = 0;
    }

    // 更新 & 渲染
    this.loom.update(dt);
    this.loom.render(this.ctx);

    this._rafId = requestAnimationFrame(this._loop);
  };

  private _updateFpsDisplay(fps: number): void {
    const { fpsCounter } = this.ui;
    fpsCounter.textContent = `FPS: ${fps}`;

    fpsCounter.classList.remove('low', 'critical');
    if (fps < 20) {
      fpsCounter.classList.add('critical');
    } else if (fps < 30) {
      fpsCounter.classList.add('low');
    }
  }

  public start(): void {
    this._lastTime = 0;
    this._rafId = requestAnimationFrame(this._loop);
  }

  public stop(): void {
    if (this._rafId) cancelAnimationFrame(this._rafId);
    if (this._lightRailAnimationId !== null) {
      cancelAnimationFrame(this._lightRailAnimationId);
    }
    window.removeEventListener('resize', this._handleResize);
    this.loom.destroy();
  }
}

// 启动
document.addEventListener('DOMContentLoaded', () => {
  const app = new App();
  app.start();
});
