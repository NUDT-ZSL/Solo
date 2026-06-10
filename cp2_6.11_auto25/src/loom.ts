// ============================================================
// 织机逻辑模块
// 职责：
//   1. 经纬网格约束（通过粒子锚点系统实现，见 particles.ts）
//   2. 用户交互事件（点击、拖拽）响应
//   3. 参数变化反馈（面板光线流动动画）
// 技术选型：
//   - 拖拽检测使用简单距离平方比较（避免开方）
//   - 参数变化用 diff 值驱动光线动画速度
//   - 点击 vs 拖拽通过鼠标移动距离阈值区分
// ============================================================

import { ParticleSystem } from './particles';

export interface LoomConfig {
  particleCount: number;
  dragRadius: number;
  explosionRadius: number;
  explosionDuration: number;
}

export const DEFAULT_LOOM_CONFIG: LoomConfig = {
  particleCount: 4000,
  dragRadius: 120,
  explosionRadius: 100,
  explosionDuration: 1.0,
};

export interface LoomParams {
  density: number;
  tension: number;
  colorShiftSpeed: number;
}

export class Loom {
  public particles: ParticleSystem;
  public config: LoomConfig;
  public params: LoomParams;
  private _isDragging: boolean = false;
  private _dragStartX: number = 0;
  private _dragStartY: number = 0;
  private _lastMouseX: number = 0;
  private _lastMouseY: number = 0;
  private _clickThreshold: number = 5;
  private _canvas: HTMLCanvasElement | null = null;
  private _onExplosion: ((x: number, y: number) => void) | null = null;
  private _onParamChange: ((diff: number) => void) | null = null;
  private _prevParams: LoomParams;

  constructor(
    canvasWidth: number,
    canvasHeight: number,
    config: Partial<LoomConfig> = {}
  ) {
    this.config = { ...DEFAULT_LOOM_CONFIG, ...config };
    this.params = {
      density: 1.0,
      tension: 1.0,
      colorShiftSpeed: 0.5,
    };
    this._prevParams = { ...this.params };

    this.particles = new ParticleSystem(
      this.config.particleCount,
      canvasWidth,
      canvasHeight
    );
    this.particles.dragState.radius = this.config.dragRadius;
    this.particles.params = this.params;
  }

  // 绑定 Canvas 和事件回调
  public bind(
    canvas: HTMLCanvasElement,
    onExplosion: (x: number, y: number) => void,
    onParamChange: (diff: number) => void
  ): void {
    this._canvas = canvas;
    this._onExplosion = onExplosion;
    this._onParamChange = onParamChange;
    this._attachEvents();
  }

  // 事件绑定
  private _attachEvents(): void {
    if (!this._canvas) return;
    const canvas = this._canvas;

    canvas.addEventListener('mousedown', this._handleMouseDown);
    canvas.addEventListener('mousemove', this._handleMouseMove);
    canvas.addEventListener('mouseup', this._handleMouseUp);
    canvas.addEventListener('mouseleave', this._handleMouseUp);

    canvas.addEventListener('touchstart', this._handleTouchStart, { passive: false });
    canvas.addEventListener('touchmove', this._handleTouchMove, { passive: false });
    canvas.addEventListener('touchend', this._handleTouchEnd);
  }

  // 坐标转换：页面坐标 → Canvas 坐标
  private _toCanvasCoord(clientX: number, clientY: number): { x: number; y: number } {
    if (!this._canvas) return { x: 0, y: 0 };
    const rect = this._canvas.getBoundingClientRect();
    const scaleX = this._canvas.width / rect.width;
    const scaleY = this._canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY,
    };
  }

  private _handleMouseDown = (e: MouseEvent): void => {
    e.preventDefault();
    const pos = this._toCanvasCoord(e.clientX, e.clientY);
    this._beginInteraction(pos.x, pos.y);
  };

  private _handleMouseMove = (e: MouseEvent): void => {
    const pos = this._toCanvasCoord(e.clientX, e.clientY);
    this._updateInteraction(pos.x, pos.y);
  };

  private _handleMouseUp = (e: MouseEvent): void => {
    const pos = this._toCanvasCoord(e.clientX, e.clientY);
    this._endInteraction(pos.x, pos.y);
  };

  private _handleTouchStart = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const t = e.touches[0];
    const pos = this._toCanvasCoord(t.clientX, t.clientY);
    this._beginInteraction(pos.x, pos.y);
  };

  private _handleTouchMove = (e: TouchEvent): void => {
    e.preventDefault();
    if (e.touches.length === 0) return;
    const t = e.touches[0];
    const pos = this._toCanvasCoord(t.clientX, t.clientY);
    this._updateInteraction(pos.x, pos.y);
  };

  private _handleTouchEnd = (e: TouchEvent): void => {
    if (e.changedTouches.length === 0) return;
    const t = e.changedTouches[0];
    const pos = this._toCanvasCoord(t.clientX, t.clientY);
    this._endInteraction(pos.x, pos.y);
  };

  // 统一的交互开始
  private _beginInteraction(x: number, y: number): void {
    this._isDragging = false;
    this._dragStartX = x;
    this._dragStartY = y;
    this._lastMouseX = x;
    this._lastMouseY = y;
    this.particles.dragState.mouseX = x;
    this.particles.dragState.mouseY = y;
    this.particles.dragState.mouseVX = 0;
    this.particles.dragState.mouseVY = 0;
  }

  // 统一的交互更新
  private _updateInteraction(x: number, y: number): void {
    const moveDX = x - this._dragStartX;
    const moveDY = y - this._dragStartY;
    const moveDistSq = moveDX * moveDX + moveDY * moveDY;

    // 超过阈值判定为拖拽
    if (!this._isDragging && moveDistSq > this._clickThreshold * this._clickThreshold) {
      this._isDragging = true;
      this.particles.dragState.active = true;
    }

    if (this._isDragging) {
      const vx = x - this._lastMouseX;
      const vy = y - this._lastMouseY;
      this.particles.dragState.mouseX = x;
      this.particles.dragState.mouseY = y;
      this.particles.dragState.mouseVX = vx;
      this.particles.dragState.mouseVY = vy;
    }

    this._lastMouseX = x;
    this._lastMouseY = y;
  }

  // 统一的交互结束
  private _endInteraction(x: number, y: number): void {
    if (!this._isDragging) {
      // 点击 → 触发爆炸
      this.particles.triggerExplosion(x, y);
      if (this._onExplosion) {
        this._onExplosion(x, y);
      }
    } else {
      // 结束拖拽 → 粒子开始回归
      this.particles.dragState.active = false;
      this.particles.dragState.mouseVX = 0;
      this.particles.dragState.mouseVY = 0;
    }
    this._isDragging = false;
  }

  // 更新参数（由滑块调用）
  public updateParam(key: keyof LoomParams, value: number): void {
    const oldValue = this.params[key];
    this.params[key] = value;
    this.particles.params = this.params;

    // 计算变化幅度
    const diff = Math.abs(value - oldValue);
    const range = this._getParamRange(key);
    const normalizedDiff = range > 0 ? diff / range : 0;

    if (this._onParamChange && normalizedDiff > 0) {
      this._onParamChange(normalizedDiff);
    }

    this._prevParams = { ...this.params };
  }

  private _getParamRange(key: keyof LoomParams): number {
    switch (key) {
      case 'density': return 1.5 - 0.3;
      case 'tension': return 2.0 - 0.5;
      case 'colorShiftSpeed': return 1.0 - 0.0;
    }
  }

  // 每帧更新
  public update(dt: number): void {
    this.particles.update(dt);
  }

  // 渲染
  public render(ctx: CanvasRenderingContext2D): void {
    this.particles.render(ctx);
  }

  // 画布尺寸变化
  public resize(w: number, h: number): void {
    this.particles.resize(w, h);
  }

  // 清理事件监听
  public destroy(): void {
    if (!this._canvas) return;
    this._canvas.removeEventListener('mousedown', this._handleMouseDown);
    this._canvas.removeEventListener('mousemove', this._handleMouseMove);
    this._canvas.removeEventListener('mouseup', this._handleMouseUp);
    this._canvas.removeEventListener('mouseleave', this._handleMouseUp);
    this._canvas.removeEventListener('touchstart', this._handleTouchStart);
    this._canvas.removeEventListener('touchmove', this._handleTouchMove);
    this._canvas.removeEventListener('touchend', this._handleTouchEnd);
  }
}
