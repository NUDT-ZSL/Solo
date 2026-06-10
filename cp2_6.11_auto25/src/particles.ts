// ============================================================
// 粒子系统模块
// 技术选型：TypedArray (Float32Array) 存储所有粒子属性
// 原因：内存连续、CPU 缓存友好、无 GC 压力，4000粒子下性能更优
// 每个粒子占 16 个 float，偏移量如下：
// ============================================================

export const STRIDE = 16;

export const OFFSET = {
  X: 0,
  Y: 1,
  ORIGIN_X: 2,
  ORIGIN_Y: 3,
  VX: 4,
  VY: 5,
  COLOR_R: 6,
  COLOR_G: 7,
  COLOR_B: 8,
  BASE_COLOR_IDX: 9,
  ALPHA: 10,
  BASE_ALPHA: 11,
  RADIUS: 12,
  PHASE: 13,
  DRAG_OFFSET_X: 14,
  DRAG_OFFSET_Y: 15,
} as const;

// 渐变色序列：紫→蓝→青→金
export const GRADIENT_STOPS: Array<[number, number, number]> = [
  [155, 89, 182],   // #9B59B6 紫
  [52, 152, 219],   // #3498DB 蓝
  [26, 188, 156],   // #1ABC9C 青
  [241, 196, 15],   // #F1C40F 金
];

export interface ParticleParams {
  density: number;
  tension: number;
  colorShiftSpeed: number;
}

export interface ExplosionState {
  active: boolean;
  centerX: number;
  centerY: number;
  progress: number;
  duration: number;
}

export class ParticleSystem {
  public data: Float32Array;
  public count: number;
  public params: ParticleParams;
  public canvasWidth: number = 0;
  public canvasHeight: number = 0;
  public centerX: number = 0;
  public centerY: number = 0;
  public maxRadius: number = 0;
  public time: number = 0;
  public colorLookupTable: Uint8ClampedArray;
  public explosion: ExplosionState = {
    active: false,
    centerX: 0,
    centerY: 0,
    progress: 0,
    duration: 1.0,
  };
  public dragState = {
    active: false,
    mouseX: 0,
    mouseY: 0,
    mouseVX: 0,
    mouseVY: 0,
    radius: 120,
  };
  private _tmpColor: [number, number, number] = [0, 0, 0];

  constructor(count: number, canvasWidth: number, canvasHeight: number) {
    this.count = count;
    this.data = new Float32Array(count * STRIDE);
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    this.centerX = canvasWidth / 2;
    this.centerY = canvasHeight / 2;
    this.maxRadius = Math.sqrt(this.centerX * this.centerX + this.centerY * this.centerY);

    this.params = {
      density: 1.0,
      tension: 1.0,
      colorShiftSpeed: 0.5,
    };

    this.colorLookupTable = new Uint8ClampedArray(256 * 3);
    this._buildColorLUT();

    this._initializeGrid();
  }

  // 预计算 256 色渐变查找表，每帧直接查表，避免重复插值
  private _buildColorLUT(): void {
    for (let i = 0; i < 256; i++) {
      const t = i / 255;
      const [r, g, b] = this._sampleGradient(t);
      this.colorLookupTable[i * 3] = r;
      this.colorLookupTable[i * 3 + 1] = g;
      this.colorLookupTable[i * 3 + 2] = b;
    }
  }

  private _sampleGradient(t: number): [number, number, number] {
    const wrapped = ((t % 1) + 1) % 1;
    const numStops = GRADIENT_STOPS.length;
    const scaled = wrapped * (numStops - 1);
    const idx = Math.floor(scaled);
    const frac = scaled - idx;

    if (idx >= numStops - 1) {
      return [...GRADIENT_STOPS[numStops - 1]] as [number, number, number];
    }

    const c0 = GRADIENT_STOPS[idx];
    const c1 = GRADIENT_STOPS[idx + 1];
    return [
      c0[0] + (c1[0] - c0[0]) * frac,
      c0[1] + (c1[1] - c0[1]) * frac,
      c0[2] + (c1[2] - c0[2]) * frac,
    ];
  }

  // 距离→透明度映射：中心1.0，边缘0.3
  // 线性映射：alpha = 1.0 - (distance / maxDistance) * 0.7
  public distanceToAlpha(dist: number): number {
    const clampedDist = Math.max(0, dist);
    const ratio = Math.min(clampedDist / this.maxRadius, 1.0);
    const alpha = 1.0 - ratio * 0.7;
    return Math.max(0.3, Math.min(1.0, alpha));
  }

  // 根据经纬网格初始化粒子位置
  private _initializeGrid(): void {
    const gridCols = Math.ceil(Math.sqrt(this.count * (this.canvasWidth / this.canvasHeight)));
    const gridRows = Math.ceil(this.count / gridCols);
    const baseSpacingX = this.canvasWidth / gridCols;
    const baseSpacingY = this.canvasHeight / gridRows;

    let placed = 0;
    for (let row = 0; row < gridRows && placed < this.count; row++) {
      for (let col = 0; col < gridCols && placed < this.count; col++) {
        const idx = placed * STRIDE;
        const ox = baseSpacingX * (col + 0.5);
        const oy = baseSpacingY * (row + 0.5);

        this.data[idx + OFFSET.ORIGIN_X] = ox;
        this.data[idx + OFFSET.ORIGIN_Y] = oy;
        this.data[idx + OFFSET.X] = ox;
        this.data[idx + OFFSET.Y] = oy;
        this.data[idx + OFFSET.VX] = 0;
        this.data[idx + OFFSET.VY] = 0;

        const dist = Math.sqrt(
          (ox - this.centerX) ** 2 + (oy - this.centerY) ** 2
        );
        this.data[idx + OFFSET.BASE_ALPHA] = this.distanceToAlpha(dist);
        this.data[idx + OFFSET.ALPHA] = this.data[idx + OFFSET.BASE_ALPHA];
        this.data[idx + OFFSET.RADIUS] = 2 + Math.random() * 4;

        // 颜色索引基于位置 (col + row) 归一化
        const colorT = ((col / gridCols) + (row / gridRows) * 0.5) % 1;
        this.data[idx + OFFSET.BASE_COLOR_IDX] = colorT;

        const lutIdx = Math.floor(colorT * 255) * 3;
        this.data[idx + OFFSET.COLOR_R] = this.colorLookupTable[lutIdx];
        this.data[idx + OFFSET.COLOR_G] = this.colorLookupTable[lutIdx + 1];
        this.data[idx + OFFSET.COLOR_B] = this.colorLookupTable[lutIdx + 2];

        this.data[idx + OFFSET.PHASE] = Math.random() * Math.PI * 2;
        this.data[idx + OFFSET.DRAG_OFFSET_X] = 0;
        this.data[idx + OFFSET.DRAG_OFFSET_Y] = 0;

        placed++;
      }
    }
  }

  // 画布尺寸变化时重新映射锚点
  public resize(w: number, h: number): void {
    const scaleX = w / this.canvasWidth;
    const scaleY = h / this.canvasHeight;

    for (let i = 0; i < this.count; i++) {
      const idx = i * STRIDE;
      this.data[idx + OFFSET.ORIGIN_X] *= scaleX;
      this.data[idx + OFFSET.ORIGIN_Y] *= scaleY;
      this.data[idx + OFFSET.X] *= scaleX;
      this.data[idx + OFFSET.Y] *= scaleY;
    }

    this.canvasWidth = w;
    this.canvasHeight = h;
    this.centerX = w / 2;
    this.centerY = h / 2;
    this.maxRadius = Math.sqrt(this.centerX * this.centerX + this.centerY * this.centerY);

    for (let i = 0; i < this.count; i++) {
      const idx = i * STRIDE;
      const ox = this.data[idx + OFFSET.ORIGIN_X];
      const oy = this.data[idx + OFFSET.ORIGIN_Y];
      const dist = Math.sqrt((ox - this.centerX) ** 2 + (oy - this.centerY) ** 2);
      this.data[idx + OFFSET.BASE_ALPHA] = this.distanceToAlpha(dist);
    }
  }

  // 触发爆炸动画
  public triggerExplosion(x: number, y: number): void {
    this.explosion.active = true;
    this.explosion.centerX = x;
    this.explosion.centerY = y;
    this.explosion.progress = 0;
    this.explosion.duration = 1.0;
  }

  // 更新所有粒子状态（物理、颜色、交互）
  public update(dt: number): void {
    this.time += dt;

    const { density, tension, colorShiftSpeed } = this.params;
    const dragActive = this.dragState.active;
    const dragMX = this.dragState.mouseX;
    const dragMY = this.dragState.mouseY;
    const dragVX = this.dragState.mouseVX;
    const dragVY = this.dragState.mouseVY;
    const dragRadiusSq = this.dragState.radius * this.dragState.radius;

    const explodeActive = this.explosion.active;
    const explodeCX = this.explosion.centerX;
    const explodeCY = this.explosion.centerY;
    const explodeProgress = this.explosion.progress;
    const explodeRadiusSq = 100 * 100;

    // 弹簧常数（用于拖拽后回归）
    const springK = 0.08 * (1.0 + tension * 0.5);
    const damping = 0.82;

    for (let i = 0; i < this.count; i++) {
      const idx = i * STRIDE;
      const ox = this.data[idx + OFFSET.ORIGIN_X];
      const oy = this.data[idx + OFFSET.ORIGIN_Y];

      // === 1. 基础正弦波动（横向） ===
      const phase = this.data[idx + OFFSET.PHASE];
      const waveAmplitude = 3.0 * tension;
      const waveX = Math.sin(this.time * 0.02 * 60 + phase) * waveAmplitude;

      // === 2. 拖拽交互：粒子沿鼠标速度方向偏移 ===
      if (dragActive) {
        const dx = this.data[idx + OFFSET.X] - dragMX;
        const dy = this.data[idx + OFFSET.Y] - dragMY;
        const distSq = dx * dx + dy * dy;

        if (distSq < dragRadiusSq) {
          const dist = Math.sqrt(distSq);
          const distanceFalloff = 1.0 - dist / this.dragState.radius;
          // 偏移量与鼠标速度成正比，最大 30px
          const speed = Math.hypot(dragVX, dragVY);
          const speedFactor = Math.min(speed / 20, 1.0);
          const maxOffset = 30 * distanceFalloff * speedFactor;

          if (speed > 0.1) {
            const dirX = dragVX / speed;
            const dirY = dragVY / speed;
            this.data[idx + OFFSET.DRAG_OFFSET_X] = dirX * maxOffset;
            this.data[idx + OFFSET.DRAG_OFFSET_Y] = dirY * maxOffset;
          } else {
            this.data[idx + OFFSET.DRAG_OFFSET_X] = 0;
            this.data[idx + OFFSET.DRAG_OFFSET_Y] = 0;
          }
        }
      }

      // === 3. 拖拽偏移缓动回归（ease-out） ===
      const dragOffX = this.data[idx + OFFSET.DRAG_OFFSET_X];
      const dragOffY = this.data[idx + OFFSET.DRAG_OFFSET_Y];
      if (Math.abs(dragOffX) > 0.01 || Math.abs(dragOffY) > 0.01) {
        const decay = Math.pow(0.02, dt * 60);
        this.data[idx + OFFSET.DRAG_OFFSET_X] = dragOffX * decay;
        this.data[idx + OFFSET.DRAG_OFFSET_Y] = dragOffY * decay;
      } else if (!dragActive) {
        this.data[idx + OFFSET.DRAG_OFFSET_X] = 0;
        this.data[idx + OFFSET.DRAG_OFFSET_Y] = 0;
      }

      // === 4. 爆炸动画 ===
      let explodeX = 0;
      let explodeY = 0;
      let explodeColorFactor = 0; // 0=原色, 0.5=金, 1=白

      if (explodeActive) {
        const ex = ox - explodeCX;
        const ey = oy - explodeCY;
        const distSq = ex * ex + ey * ey;

        if (distSq < explodeRadiusSq) {
          const dist = Math.sqrt(distSq);
          const falloff = 1.0 - dist / 100;
          const dirX = dist > 0.001 ? ex / dist : (Math.random() - 0.5);
          const dirY = dist > 0.001 ? ey / dist : (Math.random() - 0.5);

          // === 三段式爆炸动画 ===
          // 阶段1: 0 ~ 0.2s  扩散：原色→白，位移 0→200px
          // 阶段2: 0.2 ~ 0.6s 聚合前段：白→金，位移 200→100px
          // 阶段3: 0.6 ~ 1.0s 聚合后段：金→原色，位移 100→0px

          if (explodeProgress < 0.2) {
            // 阶段1：扩散
            const p = explodeProgress / 0.2;
            const easeP = 1 - Math.pow(1 - p, 3);
            const explodeDist = 200 * falloff * easeP;
            explodeX = dirX * explodeDist;
            explodeY = dirY * explodeDist;
            // 颜色：原色→白 (factor 0→1)
            explodeColorFactor = easeP;
          } else if (explodeProgress < 0.6) {
            // 阶段2：聚合前段
            const p = (explodeProgress - 0.2) / 0.4;
            const easeP = 1 - Math.pow(1 - p, 3);
            const explodeDist = 200 * falloff * (1 - easeP * 0.5);
            explodeX = dirX * explodeDist;
            explodeY = dirY * explodeDist;
            // 颜色：白→金 (factor 1→0.5)
            explodeColorFactor = 1.0 - easeP * 0.5;
          } else {
            // 阶段3：聚合后段
            const p = (explodeProgress - 0.6) / 0.4;
            const easeP = 1 - Math.pow(1 - p, 3);
            const explodeDist = 100 * falloff * (1 - easeP);
            explodeX = dirX * explodeDist;
            explodeY = dirY * explodeDist;
            // 颜色：金→原色 (factor 0.5→0)
            explodeColorFactor = 0.5 * (1 - easeP);
          }
        }
      }

      // === 5. 计算目标位置 + 弹簧回归 ===
      const densityCompress = 1.0 / density;
      const targetX = ox + waveX * densityCompress + dragOffX + explodeX;
      const targetY = oy + dragOffY + explodeY;

      const curX = this.data[idx + OFFSET.X];
      const curY = this.data[idx + OFFSET.Y];

      let vx = this.data[idx + OFFSET.VX];
      let vy = this.data[idx + OFFSET.VY];

      if (dragActive && (dragOffX !== 0 || dragOffY !== 0)) {
        this.data[idx + OFFSET.X] = targetX;
        this.data[idx + OFFSET.Y] = targetY;
      } else if (explodeActive && (explodeX !== 0 || explodeY !== 0)) {
        this.data[idx + OFFSET.X] = targetX;
        this.data[idx + OFFSET.Y] = targetY;
      } else {
        // Hooke's Law 弹簧回归到锚点+波动
        const ax = (targetX - curX) * springK;
        const ay = (targetY - curY) * springK;
        vx = (vx + ax * dt * 60) * damping;
        vy = (vy + ay * dt * 60) * damping;
        this.data[idx + OFFSET.VX] = vx;
        this.data[idx + OFFSET.VY] = vy;
        this.data[idx + OFFSET.X] = curX + vx;
        this.data[idx + OFFSET.Y] = curY + vy;
      }

      // === 6. 颜色更新：随时间整体偏移 ===
      const colorT = ((this.data[idx + OFFSET.BASE_COLOR_IDX]
        + this.time * colorShiftSpeed * 0.02
        + this.params.colorShiftSpeed * 0.5
      ) % 1 + 1) % 1;

      const lutIdx = Math.floor(colorT * 255) * 3;
      let r = this.colorLookupTable[lutIdx];
      let g = this.colorLookupTable[lutIdx + 1];
      let b = this.colorLookupTable[lutIdx + 2];

      // 爆炸颜色过渡：白→金→原色
      if (explodeColorFactor > 0) {
        if (explodeColorFactor > 0.5) {
          // 白→金
          const tf = (explodeColorFactor - 0.5) * 2;
          r = 241 + (255 - 241) * tf;
          g = 196 + (255 - 196) * tf;
          b = 15 + (255 - 15) * tf;
        } else {
          // 金→原色
          const tf = explodeColorFactor * 2;
          r = r + (241 - r) * tf;
          g = g + (196 - g) * tf;
          b = b + (15 - b) * tf;
        }
      }

      this.data[idx + OFFSET.COLOR_R] = r;
      this.data[idx + OFFSET.COLOR_G] = g;
      this.data[idx + OFFSET.COLOR_B] = b;

      // === 7. 透明度随机微调（0.6~1.0）模拟丝绸光泽 ===
      const jitter = 0.6 + Math.random() * 0.4;
      this.data[idx + OFFSET.ALPHA] = this.data[idx + OFFSET.BASE_ALPHA] * jitter;
    }

    // 更新爆炸进度
    if (this.explosion.active) {
      this.explosion.progress += dt;
      if (this.explosion.progress >= this.explosion.duration) {
        this.explosion.active = false;
        this.explosion.progress = 0;
      }
    }
  }

  // 绘制所有粒子
  public render(ctx: CanvasRenderingContext2D): void {
    ctx.clearRect(0, 0, this.canvasWidth, this.canvasHeight);

    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < this.count; i++) {
      const idx = i * STRIDE;
      const x = this.data[idx + OFFSET.X];
      const y = this.data[idx + OFFSET.Y];
      const r = this.data[idx + OFFSET.COLOR_R];
      const g = this.data[idx + OFFSET.COLOR_G];
      const b = this.data[idx + OFFSET.COLOR_B];
      const a = this.data[idx + OFFSET.ALPHA];
      const radius = this.data[idx + OFFSET.RADIUS];

      ctx.beginPath();
      ctx.arc(x, y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r | 0}, ${g | 0}, ${b | 0}, ${a})`;
      ctx.fill();
    }

    ctx.globalCompositeOperation = 'source-over';
  }
}
