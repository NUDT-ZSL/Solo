export interface GeometryParams {
  speed: number;
  scale: number;
  symmetry: number;
  color: string;
}

interface AnimatedValue {
  current: number;
  target: number;
  from: number;
  startTime: number;
  duration: number;
  easing: (t: number) => number;
}

interface HSL {
  h: number;
  s: number;
  l: number;
}

export class GeometryEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private dpr: number = 1;

  private baseAngle: number = 0;
  private lastTimestamp: number = 0;
  private animationFrameId: number | null = null;

  private speedAnim: AnimatedValue;
  private scaleAnim: AnimatedValue;
  private colorAnim: {
    current: HSL;
    target: HSL;
    from: HSL;
    startTime: number;
    duration: number;
  };
  private symmetryAnim: {
    oldSymmetry: number;
    newSymmetry: number;
    phase: 'out' | 'in' | 'idle';
    startTime: number;
    duration: number;
    fadeScale: number;
    fadeAlpha: number;
  };

  private mouseOffset: number = 0;
  private mouseTargetOffset: number = 0;
  private isDragging: boolean = false;
  private mouseReturnAnim: {
    active: boolean;
    startTime: number;
    duration: number;
    startOffset: number;
  } = { active: false, startTime: 0, duration: 500, startOffset: 0 };

  private params: GeometryParams;

  constructor(canvas: HTMLCanvasElement, initialParams: GeometryParams) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.params = { ...initialParams };

    const initialColor = this.hexToHsl(initialParams.color);

    this.speedAnim = {
      current: initialParams.speed,
      target: initialParams.speed,
      from: initialParams.speed,
      startTime: 0,
      duration: 200,
      easing: this.easeOut.bind(this)
    };

    this.scaleAnim = {
      current: initialParams.scale,
      target: initialParams.scale,
      from: initialParams.scale,
      startTime: 0,
      duration: 200,
      easing: this.easeOut.bind(this)
    };

    this.colorAnim = {
      current: { ...initialColor },
      target: { ...initialColor },
      from: { ...initialColor },
      startTime: 0,
      duration: 400
    };

    this.symmetryAnim = {
      oldSymmetry: initialParams.symmetry,
      newSymmetry: initialParams.symmetry,
      phase: 'idle',
      startTime: 0,
      duration: 300,
      fadeScale: 1,
      fadeAlpha: 1
    };

    this.resize();
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private cubicBezier(t: number): number {
    const p1 = 0.25, p2 = 0.1, p3 = 0.25, p4 = 1;
    const cx = 3 * p1;
    const bx = 3 * (p3 - p1) - cx;
    const ax = 1 - cx - bx;
    const cy = 3 * p2;
    const by = 3 * (p4 - p2) - cy;
    const ay = 1 - cy - by;

    function sampleCurveX(t: number): number {
      return ((ax * t + bx) * t + cx) * t;
    }
    function sampleCurveY(t: number): number {
      return ((ay * t + by) * t + cy) * t;
    }
    function sampleCurveDerivativeX(t: number): number {
      return (3 * ax * t + 2 * bx) * t + cx;
    }
    function solveCurveX(x: number): number {
      let t2 = x;
      for (let i = 0; i < 8; i++) {
        const x2 = sampleCurveX(t2) - x;
        if (Math.abs(x2) < 1e-6) return t2;
        const d2 = sampleCurveDerivativeX(t2);
        if (Math.abs(d2) < 1e-6) break;
        t2 = t2 - x2 / d2;
      }
      let t0 = 0, t1 = 1;
      t2 = x;
      if (t2 < t0) return t0;
      if (t2 > t1) return t1;
      while (t0 < t1) {
        const x2 = sampleCurveX(t2);
        if (Math.abs(x2 - x) < 1e-6) return t2;
        if (x > x2) t0 = t2;
        else t1 = t2;
        t2 = (t1 - t0) * 0.5 + t0;
      }
      return t2;
    }
    return sampleCurveY(solveCurveX(t));
  }

  private elasticOut(t: number): number {
    if (t === 0) return 0;
    if (t === 1) return 1;
    const p = 0.3;
    return Math.pow(2, -10 * t) * Math.sin((t - p / 4) * (2 * Math.PI) / p) + 1;
  }

  private hexToHsl(hex: string): HSL {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return { h: 0, s: 0, l: 0 };
    let r = parseInt(result[1], 16) / 255;
    let g = parseInt(result[2], 16) / 255;
    let b = parseInt(result[3], 16) / 255;
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;
    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
      switch (max) {
        case r: h = (g - b) / d + (g < b ? 6 : 0); break;
        case g: h = (b - r) / d + 2; break;
        case b: h = (r - g) / d + 4; break;
      }
      h /= 6;
    }
    return { h: h * 360, s: s * 100, l: l * 100 };
  }

  private hslToString(hsl: HSL, alpha: number = 1): string {
    return `hsla(${hsl.h}, ${hsl.s}%, ${hsl.l}%, ${alpha})`;
  }

  setSpeed(speed: number): void {
    this.speedAnim.from = this.speedAnim.current;
    this.speedAnim.target = speed;
    this.speedAnim.startTime = performance.now();
    this.params.speed = speed;
  }

  setScale(scale: number): void {
    this.scaleAnim.from = this.scaleAnim.current;
    this.scaleAnim.target = scale;
    this.scaleAnim.startTime = performance.now();
    this.params.scale = scale;
  }

  setSymmetry(symmetry: number): void {
    if (symmetry === this.params.symmetry && this.symmetryAnim.phase === 'idle') return;
    this.symmetryAnim.oldSymmetry = this.params.symmetry;
    this.symmetryAnim.newSymmetry = symmetry;
    this.symmetryAnim.phase = 'out';
    this.symmetryAnim.startTime = performance.now();
    this.symmetryAnim.fadeScale = 1;
    this.symmetryAnim.fadeAlpha = 1;
    this.params.symmetry = symmetry;
  }

  setColor(color: string): void {
    const newHsl = this.hexToHsl(color);
    this.colorAnim.from = { ...this.colorAnim.current };
    this.colorAnim.target = { h: newHsl.h, s: this.colorAnim.from.s, l: this.colorAnim.from.l };
    this.colorAnim.startTime = performance.now();
    this.params.color = color;
  }

  setMouseOffset(offset: number): void {
    this.mouseTargetOffset = Math.max(-45, Math.min(45, offset));
    this.mouseReturnAnim.active = false;
  }

  startDragging(): void {
    this.isDragging = true;
    this.mouseReturnAnim.active = false;
  }

  stopDragging(): void {
    this.isDragging = false;
    this.mouseReturnAnim.active = true;
    this.mouseReturnAnim.startTime = performance.now();
    this.mouseReturnAnim.startOffset = this.mouseOffset;
  }

  resize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = this.width * this.dpr;
    this.canvas.height = this.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
  }

  start(): void {
    this.lastTimestamp = performance.now();
    this.loop(this.lastTimestamp);
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop(timestamp: number): void {
    const deltaTime = timestamp - this.lastTimestamp;
    this.lastTimestamp = timestamp;
    this.update(timestamp, deltaTime);
    this.render();
    this.animationFrameId = requestAnimationFrame((t) => this.loop(t));
  }

  private update(timestamp: number, deltaTime: number): void {
    const now = timestamp;

    let speedProgress = Math.min(1, (now - this.speedAnim.startTime) / this.speedAnim.duration);
    if (speedProgress < 1) {
      this.speedAnim.current = this.speedAnim.from + (this.speedAnim.target - this.speedAnim.from) * this.speedAnim.easing(speedProgress);
    } else {
      this.speedAnim.current = this.speedAnim.target;
    }

    let scaleProgress = Math.min(1, (now - this.scaleAnim.startTime) / this.scaleAnim.duration);
    if (scaleProgress < 1) {
      this.scaleAnim.current = this.scaleAnim.from + (this.scaleAnim.target - this.scaleAnim.from) * this.scaleAnim.easing(scaleProgress);
    } else {
      this.scaleAnim.current = this.scaleAnim.target;
    }

    let colorProgress = Math.min(1, (now - this.colorAnim.startTime) / this.colorAnim.duration);
    if (colorProgress < 1) {
      const t = this.cubicBezier(colorProgress);
      let hDiff = this.colorAnim.target.h - this.colorAnim.from.h;
      if (hDiff > 180) hDiff -= 360;
      if (hDiff < -180) hDiff += 360;
      this.colorAnim.current.h = (this.colorAnim.from.h + hDiff * t + 360) % 360;
      this.colorAnim.current.s = this.colorAnim.from.s + (this.colorAnim.target.s - this.colorAnim.from.s) * t;
      this.colorAnim.current.l = this.colorAnim.from.l + (this.colorAnim.target.l - this.colorAnim.from.l) * t;
    } else {
      this.colorAnim.current = { ...this.colorAnim.target };
    }

    if (this.symmetryAnim.phase !== 'idle') {
      const halfDuration = this.symmetryAnim.duration / 2;
      const elapsed = now - this.symmetryAnim.startTime;
      if (this.symmetryAnim.phase === 'out') {
        const t = Math.min(1, elapsed / halfDuration);
        const eased = this.easeOut(t);
        this.symmetryAnim.fadeScale = 1 - eased;
        this.symmetryAnim.fadeAlpha = 1 - eased;
        if (t >= 1) {
          this.symmetryAnim.phase = 'in';
          this.symmetryAnim.startTime = now;
        }
      } else if (this.symmetryAnim.phase === 'in') {
        const t = Math.min(1, elapsed / halfDuration);
        const eased = this.easeOut(t);
        this.symmetryAnim.fadeScale = eased;
        this.symmetryAnim.fadeAlpha = eased;
        if (t >= 1) {
          this.symmetryAnim.phase = 'idle';
          this.symmetryAnim.fadeScale = 1;
          this.symmetryAnim.fadeAlpha = 1;
        }
      }
    }

    this.baseAngle += (this.speedAnim.current * deltaTime * 0.001) * (Math.PI * 2) / 3;

    if (this.isDragging) {
      this.mouseOffset += (this.mouseTargetOffset - this.mouseOffset) * 0.15;
    } else if (this.mouseReturnAnim.active) {
      const t = Math.min(1, (now - this.mouseReturnAnim.startTime) / this.mouseReturnAnim.duration);
      const eased = this.elasticOut(t);
      this.mouseOffset = this.mouseReturnAnim.startOffset * (1 - eased);
      if (t >= 1) {
        this.mouseReturnAnim.active = false;
        this.mouseOffset = 0;
        this.mouseTargetOffset = 0;
      }
    } else {
      this.mouseOffset *= 0.95;
    }
  }

  private render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, this.width, this.height);

    this.drawBackground();

    const centerX = this.width / 2;
    const centerY = this.height / 2;
    const baseRadius = 120 * this.scaleAnim.current;

    let symmetry: number;
    let drawScale: number;
    let drawAlpha: number;

    if (this.symmetryAnim.phase === 'idle' || this.symmetryAnim.phase === 'in') {
      symmetry = this.symmetryAnim.newSymmetry;
      drawScale = this.symmetryAnim.fadeScale;
      drawAlpha = this.symmetryAnim.fadeAlpha;
    } else {
      symmetry = this.symmetryAnim.oldSymmetry;
      drawScale = this.symmetryAnim.fadeScale;
      drawAlpha = this.symmetryAnim.fadeAlpha;
    }

    if (drawAlpha <= 0) return;

    const totalRotation = this.baseAngle + (this.mouseOffset * Math.PI / 180);

    this.drawStarPattern(centerX, centerY, baseRadius * drawScale, symmetry, totalRotation, drawAlpha);
  }

  private drawBackground(): void {
    const ctx = this.ctx;
    const gradient = ctx.createRadialGradient(
      this.width / 2, this.height / 2, 0,
      this.width / 2, this.height / 2, Math.max(this.width, this.height) / 1.2
    );
    gradient.addColorStop(0, '#1a1a3e');
    gradient.addColorStop(1, '#0d0d1d');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, this.width, this.height);
  }

  private drawStarPattern(
    cx: number,
    cy: number,
    radius: number,
    symmetry: number,
    rotation: number,
    alpha: number
  ): void {
    const ctx = this.ctx;
    const baseColor = this.colorAnim.current;

    for (let i = 0; i < symmetry; i++) {
      const angle1 = rotation + (i / symmetry) * Math.PI * 2;
      const angle2 = rotation + ((i + 1) / symmetry) * Math.PI * 2;
      const angleMid = rotation + ((i + 0.5) / symmetry) * Math.PI * 2;

      const innerRadius = radius * 0.5;
      const midRadius = radius * 0.8;

      const x1 = cx + Math.cos(angle1) * radius;
      const y1 = cy + Math.sin(angle1) * radius;
      const x2 = cx + Math.cos(angle2) * radius;
      const y2 = cy + Math.sin(angle2) * radius;
      const xMidOuter = cx + Math.cos(angleMid) * midRadius;
      const yMidOuter = cy + Math.sin(angleMid) * midRadius;
      const xMidInner = cx + Math.cos(angleMid) * innerRadius;
      const yMidInner = cy + Math.sin(angleMid) * innerRadius;
      const xC = cx;
      const yC = cy;

      const colorOffset = (i / symmetry) * 40;
      const triangleColor1: HSL = {
        h: (baseColor.h + colorOffset + 360) % 360,
        s: baseColor.s,
        l: Math.min(85, baseColor.l + 15)
      };
      const triangleColor2: HSL = {
        h: (baseColor.h - colorOffset + 360) % 360,
        s: baseColor.s,
        l: Math.max(25, baseColor.l - 10)
      };

      this.drawTriangle(ctx, xC, yC, x1, y1, xMidOuter, yMidOuter, triangleColor1, alpha);
      this.drawTriangle(ctx, xC, yC, xMidOuter, yMidOuter, x2, y2, triangleColor2, alpha);
      this.drawTriangle(ctx, xC, yC, x1, y1, xMidInner, yMidInner, triangleColor2, alpha * 0.7);
      this.drawTriangle(ctx, xC, yC, xMidInner, yMidInner, x2, y2, triangleColor1, alpha * 0.7);
    }

    const coreColor: HSL = {
      h: baseColor.h,
      s: baseColor.s,
      l: Math.min(90, baseColor.l + 25)
    };
    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.15, 0, Math.PI * 2);
    ctx.fillStyle = this.hslToString(coreColor, alpha * 0.9);
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, radius * 0.08, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
    ctx.fill();
  }

  private drawTriangle(
    ctx: CanvasRenderingContext2D,
    x1: number, y1: number,
    x2: number, y2: number,
    x3: number, y3: number,
    color: HSL,
    alpha: number
  ): void {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.lineTo(x3, y3);
    ctx.closePath();

    const gradient = ctx.createLinearGradient(x1, y1, x3, y3);
    gradient.addColorStop(0, this.hslToString(color, alpha * 0.95));
    gradient.addColorStop(1, this.hslToString({ h: color.h, s: color.s, l: Math.max(15, color.l - 20) }, alpha * 0.7));
    ctx.fillStyle = gradient;
    ctx.fill();

    ctx.strokeStyle = this.hslToString({ h: color.h, s: color.s, l: Math.min(95, color.l + 10) }, alpha * 0.3);
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}
