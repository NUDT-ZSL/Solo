export interface ColorTheme {
  name: string;
  bottomColor: [number, number, number];
  topColor: [number, number, number];
  glowColor: [number, number, number];
  buttonColor: [number, number, number];
  particleWarm: [number, number, number][];
}

export const THEMES: ColorTheme[] = [
  {
    name: '幻彩',
    bottomColor: [70, 10, 130],
    topColor: [255, 80, 180],
    glowColor: [255, 150, 220],
    buttonColor: [255, 100, 200],
    particleWarm: [
      [255, 120, 180],
      [255, 180, 100],
      [255, 80, 200],
      [200, 120, 255],
      [255, 200, 150],
    ],
  },
  {
    name: '极光',
    bottomColor: [10, 60, 120],
    topColor: [80, 255, 200],
    glowColor: [150, 255, 220],
    buttonColor: [80, 200, 180],
    particleWarm: [
      [80, 255, 200],
      [120, 200, 255],
      [180, 150, 255],
      [100, 255, 180],
      [60, 220, 255],
    ],
  },
  {
    name: '熔岩',
    bottomColor: [120, 20, 10],
    topColor: [255, 180, 40],
    glowColor: [255, 200, 120],
    buttonColor: [255, 120, 60],
    particleWarm: [
      [255, 150, 50],
      [255, 80, 40],
      [255, 200, 80],
      [255, 60, 30],
      [255, 220, 120],
    ],
  },
  {
    name: '冰晶',
    bottomColor: [20, 60, 120],
    topColor: [220, 240, 255],
    glowColor: [200, 230, 255],
    buttonColor: [180, 220, 255],
    particleWarm: [
      [200, 230, 255],
      [180, 210, 255],
      [220, 250, 255],
      [150, 200, 255],
      [240, 250, 255],
    ],
  },
];

const lerp = (a: number, b: number, t: number): number => a + (b - a) * t;

const lerpColor = (
  a: [number, number, number],
  b: [number, number, number],
  t: number
): [number, number, number] => [
  Math.round(lerp(a[0], b[0], t)),
  Math.round(lerp(a[1], b[1], t)),
  Math.round(lerp(a[2], b[2], t)),
];

interface Pulse {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  age: number;
  duration: number;
  triggered: Set<number>;
}

export class WaveRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private width: number = 0;
  private height: number = 0;
  private time: number = 0;
  private flowSpeed: number = 0.5;
  private targetFlowSpeed: number = 0.5;
  private viewAngle: number = 0;
  private targetViewAngle: number = 0;
  private stars: { x: number; y: number; size: number; alpha: number; twinkle: number }[] = [];
  private currentTheme: ColorTheme;
  private nextTheme: ColorTheme;
  private themeBlend: number = 1;
  private blendingTheme: boolean = false;
  private pulses: Pulse[] = [];
  private amplitudeBoost: Map<number, { amount: number; decay: number }> = new Map();
  private segmentCount: number = 200;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('无法获取Canvas 2D上下文');
    this.ctx = ctx;
    this.currentTheme = THEMES[0];
    this.nextTheme = THEMES[0];
    this.resize();
    this.initStars();
  }

  public resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  private initStars(): void {
    this.stars = [];
    const count = 120;
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random(),
        y: Math.random(),
        size: Math.random() * 1.5 + 0.5,
        alpha: Math.random() * 0.5 + 0.2,
        twinkle: Math.random() * Math.PI * 2,
      });
    }
  }

  public setTheme(index: number, button: HTMLElement): void {
    this.nextTheme = THEMES[index % THEMES.length];
    this.blendingTheme = true;
    this.themeBlend = 0;
    const bc = this.nextTheme.buttonColor;
    button.style.boxShadow = `0 0 20px rgba(${bc[0]}, ${bc[1]}, ${bc[2]}, 0.5)`;
  }

  public getThemeButtonColor(): [number, number, number] {
    return lerpColor(
      this.currentTheme.buttonColor,
      this.nextTheme.buttonColor,
      this.themeBlend
    );
  }

  public setFlowSpeed(speed: number): void {
    this.targetFlowSpeed = speed;
  }

  public setViewAngle(angle: number): void {
    this.targetViewAngle = Math.max(-30, Math.min(30, angle));
  }

  public triggerPulse(x: number, y: number): void {
    const maxRadius = Math.max(this.width, this.height);
    this.pulses.push({
      x,
      y,
      radius: 0,
      maxRadius,
      age: 0,
      duration: 1000,
      triggered: new Set(),
    });
  }

  private getEffectiveTheme(): ColorTheme {
    if (!this.blendingTheme) return this.currentTheme;
    const t = this.themeBlend;
    const c = this.currentTheme;
    const n = this.nextTheme;
    return {
      name: n.name,
      bottomColor: lerpColor(c.bottomColor, n.bottomColor, t),
      topColor: lerpColor(c.topColor, n.topColor, t),
      glowColor: lerpColor(c.glowColor, n.glowColor, t),
      buttonColor: lerpColor(c.buttonColor, n.buttonColor, t),
      particleWarm: t < 0.5 ? c.particleWarm : n.particleWarm,
    };
  }

  public sampleWaveColor(yRatio: number): [number, number, number] {
    const theme = this.getEffectiveTheme();
    return lerpColor(theme.bottomColor, theme.topColor, Math.max(0, Math.min(1, yRatio)));
  }

  public getRandomWarmColor(): [number, number, number] {
    const theme = this.getEffectiveTheme();
    return theme.particleWarm[Math.floor(Math.random() * theme.particleWarm.length)];
  }

  private computeWave(baseValue: number, time: number, depth: number): number {
    const depthFactor = 1 / (1 + depth * 0.3);
    const freq = 0.015 + depth * 0.003;
    let v = 0;
    v += Math.sin(baseValue * freq * 1 + time * 0.0008 * this.flowSpeed) * 1.0;
    v += Math.sin(baseValue * freq * 2.3 + time * 0.0012 * this.flowSpeed) * 0.5;
    v += Math.sin(baseValue * freq * 4.1 + time * 0.0018 * this.flowSpeed) * 0.25;
    v += Math.sin(baseValue * freq * 7.7 + time * 0.0025 * this.flowSpeed) * 0.12;
    return v * depthFactor;
  }

  private updatePulses(dt: number): void {
    for (let i = this.pulses.length - 1; i >= 0; i--) {
      const p = this.pulses[i];
      p.age += dt;
      const progress = p.age / p.duration;
      p.radius = p.maxRadius * progress;

      if (progress >= 1) {
        this.pulses.splice(i, 1);
      }
    }

    for (const [seg, data] of this.amplitudeBoost) {
      data.decay -= dt;
      if (data.decay <= 0) {
        this.amplitudeBoost.delete(seg);
      }
    }
  }

  private getAmplitudeBoost(segmentIndex: number): number {
    const data = this.amplitudeBoost.get(segmentIndex);
    if (!data) return 0;
    return data.amount * Math.max(0, data.decay / 500);
  }

  private checkPulseCollision(pulse: Pulse, segIndex: number, wx: number, wy: number): void {
    if (pulse.triggered.has(segIndex)) return;
    const dx = wx - pulse.x;
    const dy = wy - pulse.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist <= pulse.radius) {
      pulse.triggered.add(segIndex);
      const existing = this.amplitudeBoost.get(segIndex);
      const newAmount = 0.5;
      this.amplitudeBoost.set(segIndex, {
        amount: existing ? Math.max(existing.amount, newAmount) : newAmount,
        decay: 500,
      });
    }
  }

  public getPulseSpawnPoints(): { x: number; y: number; color: [number, number, number] }[] {
    const points: { x: number; y: number; color: [number, number, number] }[] = [];
    const wallHeight = this.height * 0.6;
    const wallTop = (this.height - wallHeight) / 2;
    const theme = this.getEffectiveTheme();

    for (const p of this.pulses) {
      const progress = p.age / p.duration;
      if (progress < 0.05 || progress > 0.8) continue;

      for (let side = -1; side <= 1; side += 2) {
        for (let layer = 0; layer < 5; layer++) {
          const depth = layer * 0.15;
          const perspective = 1 / (1 + depth * 2.5);
          const offsetX = this.viewAngle * (this.width * 0.008) * (1 - perspective);
          const baseX = side === -1
            ? this.width * 0.08 * perspective + offsetX
            : this.width - this.width * 0.08 * perspective + offsetX;

          const wx = baseX + side * Math.cos(p.age * 0.001 + layer) * 10;
          const wy = wallTop + wallHeight * 0.5 + Math.sin(p.age * 0.002 + layer) * 20;

          const dx = wx - p.x;
          const dy = wy - p.y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          const ringWidth = 60;

          if (Math.abs(dist - p.radius) < ringWidth) {
            for (let i = 0; i < 2; i++) {
              const yRatio = 0.5 + (Math.random() - 0.5) * 0.4;
              points.push({
                x: wx + (Math.random() - 0.5) * 40,
                y: wy + (Math.random() - 0.5) * 60,
                color: lerpColor(theme.bottomColor, theme.topColor, yRatio),
              });
            }
          }
        }
      }
    }
    return points;
  }

  public update(dt: number): void {
    this.time += dt;
    this.flowSpeed += (this.targetFlowSpeed - this.flowSpeed) * 0.08;
    this.viewAngle += (this.targetViewAngle - this.viewAngle) * (1 - Math.exp(-dt / 300));

    if (this.blendingTheme) {
      this.themeBlend += dt / 1000;
      if (this.themeBlend >= 1) {
        this.themeBlend = 1;
        this.currentTheme = this.nextTheme;
        this.blendingTheme = false;
      }
    }

    this.updatePulses(dt);

    for (const s of this.stars) {
      s.twinkle += dt * 0.003;
    }
  }

  public render(): void {
    const ctx = this.ctx;
    const theme = this.getEffectiveTheme();

    ctx.clearRect(0, 0, this.width, this.height);

    const bgGrad = ctx.createLinearGradient(0, 0, 0, this.height);
    bgGrad.addColorStop(0, 'rgba(5, 0, 26, 1)');
    bgGrad.addColorStop(0.4, 'rgba(0, 0, 10, 1)');
    bgGrad.addColorStop(1, 'rgba(10, 0, 16, 1)');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, this.width, this.height);

    this.renderStars();
    this.renderFloorCeiling(theme);
    this.renderWalls(theme);
    this.renderPulses();
  }

  private renderStars(): void {
    const ctx = this.ctx;
    for (const s of this.stars) {
      const sx = s.x * this.width;
      const sy = s.y * this.height * 0.5;
      const alpha = s.alpha * (0.6 + 0.4 * Math.sin(s.twinkle));
      ctx.beginPath();
      ctx.arc(sx, sy, s.size, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha * 0.8})`;
      ctx.fill();
    }
  }

  private renderFloorCeiling(theme: ColorTheme): void {
    const ctx = this.ctx;
    const wallHeight = this.height * 0.6;
    const wallTop = (this.height - wallHeight) / 2;
    const wallBottom = wallTop + wallHeight;
    const horizon = this.height * 0.45;

    const floorGrad = ctx.createLinearGradient(0, wallBottom, 0, this.height);
    floorGrad.addColorStop(0, `rgba(${theme.bottomColor[0] * 0.4}, ${theme.bottomColor[1] * 0.4}, ${theme.bottomColor[2] * 0.6}, 0.6)`);
    floorGrad.addColorStop(1, 'rgba(0, 0, 0, 1)');
    ctx.fillStyle = floorGrad;
    ctx.fillRect(0, wallBottom, this.width, this.height - wallBottom);

    const ceilGrad = ctx.createLinearGradient(0, 0, 0, wallTop);
    ceilGrad.addColorStop(0, 'rgba(0, 0, 0, 1)');
    ceilGrad.addColorStop(1, `rgba(${theme.bottomColor[0] * 0.3}, ${theme.bottomColor[1] * 0.3}, ${theme.bottomColor[2] * 0.5}, 0.5)`);
    ctx.fillStyle = ceilGrad;
    ctx.fillRect(0, 0, this.width, wallTop);

    ctx.strokeStyle = `rgba(${theme.glowColor[0]}, ${theme.glowColor[1]}, ${theme.glowColor[2]}, 0.08)`;
    ctx.lineWidth = 1;
    for (let i = 0; i < 8; i++) {
      const depth = (i + (this.time * this.flowSpeed * 0.00005) % 1) / 8;
      const perspective = 1 / (1 + depth * 4);
      const offsetX = this.viewAngle * (this.width * 0.008) * (1 - perspective);
      const y = wallBottom + (this.height - wallBottom) * (1 - perspective) * 0.9;
      const leftX = this.width * (0.5 - 0.5 * perspective) + offsetX;
      const rightX = this.width * (0.5 + 0.5 * perspective) + offsetX;
      ctx.beginPath();
      ctx.moveTo(leftX, y);
      ctx.lineTo(rightX, y);
      ctx.stroke();
    }

    ctx.fillStyle = `rgba(${theme.glowColor[0]}, ${theme.glowColor[1]}, ${theme.glowColor[2]}, 0.06)`;
    for (const s of this.stars.slice(0, 50)) {
      const sx = s.x * this.width;
      const sy = wallTop + (s.y * (this.height - wallHeight)) * 0.9 + wallHeight * 0.05;
      const alpha = s.alpha * 0.3 * (0.5 + 0.5 * Math.sin(s.twinkle));
      ctx.beginPath();
      ctx.arc(sx, sy, s.size * 0.8, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fill();
    }

    void horizon;
  }

  private renderWalls(theme: ColorTheme): void {
    const ctx = this.ctx;
    const wallHeight = this.height * 0.6;
    const amplitude = wallHeight * 0.12;
    const layers = 8;
    const segs = this.segmentCount;

    for (let layer = layers - 1; layer >= 0; layer--) {
      const depth = layer / layers;
      const perspective = 1 / (1 + depth * 3);
      const alpha = (1 - depth) * 0.85;
      const offsetX = this.viewAngle * (this.width * 0.008) * (1 - perspective);
      const layerWallWidth = this.width * 0.42 * perspective;
      const layerAmplitude = amplitude * perspective;
      const layerWallTop = this.height * 0.5 - wallHeight * 0.5 * perspective;
      const layerWallHeight = wallHeight * perspective;

      for (const side of [-1, 1] as const) {
        const baseX = side === -1
          ? this.width * 0.5 - layerWallWidth + offsetX
          : this.width * 0.5 + layerWallWidth + offsetX;

        ctx.beginPath();
        const baseY = layerWallTop + layerWallHeight;
        ctx.moveTo(baseX, baseY);

        const timeOffset = depth * 12000 + this.time * this.flowSpeed;
        const points: { x: number; y: number; seg: number }[] = [];

        for (let i = 0; i <= segs; i++) {
          const t = i / segs;
          const progress = t * layerWallHeight;
          const y = baseY - progress;
          const baseWave = this.computeWave(i + depth * 100, timeOffset - t * 2000, depth);
          const boost = this.getAmplitudeBoost(Math.floor(t * 100) * (layer + 1)) * layerAmplitude;
          const waveX = baseWave * (layerAmplitude + boost) * side;
          const x = baseX + waveX + side * Math.sin(t * Math.PI) * layerWallWidth * 0.02;

          if (i > 0) {
            ctx.lineTo(x, y);
          }
          points.push({ x, y, seg: Math.floor(t * 100) });
        }

        const topY = layerWallTop;
        ctx.lineTo(baseX, topY);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, baseY, 0, topY);
        const bc = theme.bottomColor;
        const tc = theme.topColor;
        grad.addColorStop(0, `rgba(${bc[0]}, ${bc[1]}, ${bc[2]}, ${alpha * 0.9})`);
        grad.addColorStop(0.5, `rgba(${Math.round((bc[0] + tc[0]) / 2)}, ${Math.round((bc[1] + tc[1]) / 2)}, ${Math.round((bc[2] + tc[2]) / 2)}, ${alpha * 0.95})`);
        grad.addColorStop(1, `rgba(${tc[0]}, ${tc[1]}, ${tc[2]}, ${alpha})`);
        ctx.fillStyle = grad;
        ctx.fill();

        ctx.strokeStyle = `rgba(${theme.glowColor[0]}, ${theme.glowColor[1]}, ${theme.glowColor[2]}, ${alpha * 0.3})`;
        ctx.lineWidth = 1 * perspective;
        ctx.stroke();

        const lastIdx = points.length - 1;
        if (lastIdx > 0) {
          const gc = theme.glowColor;
          ctx.beginPath();
          ctx.moveTo(points[lastIdx].x, points[lastIdx].y);
          for (let i = lastIdx - 1; i >= 0; i--) {
            ctx.lineTo(points[i].x, points[i].y);
          }
          const glowGrad = ctx.createLinearGradient(0, topY - 20 * perspective, 0, topY + 20 * perspective);
          glowGrad.addColorStop(0, `rgba(${gc[0]}, ${gc[1]}, ${gc[2]}, 0)`);
          glowGrad.addColorStop(0.5, `rgba(${gc[0]}, ${gc[1]}, ${gc[2]}, ${alpha * 0.7})`);
          glowGrad.addColorStop(1, `rgba(${gc[0]}, ${gc[1]}, ${gc[2]}, 0)`);
          ctx.strokeStyle = glowGrad;
          ctx.lineWidth = 8 * perspective;
          ctx.stroke();
        }

        for (const pulse of this.pulses) {
          for (let pi = 0; pi < points.length; pi += 5) {
            this.checkPulseCollision(pulse, points[pi].seg * (layer + 1), points[pi].x, points[pi].y);
          }
        }
      }
    }
  }

  private renderPulses(): void {
    const ctx = this.ctx;
    for (const p of this.pulses) {
      const progress = p.age / p.duration;
      const alpha = (1 - progress) * 0.4;
      const theme = this.getEffectiveTheme();
      const gc = theme.glowColor;

      for (let r = 0; r < 3; r++) {
        const ringRadius = p.radius - r * 8;
        if (ringRadius <= 0) continue;
        const ringAlpha = alpha * (1 - r * 0.25);

        ctx.beginPath();
        ctx.arc(p.x, p.y, ringRadius, 0, Math.PI * 2);
        const ringGrad = ctx.createRadialGradient(p.x, p.y, ringRadius - 20, p.x, p.y, ringRadius + 20);
        ringGrad.addColorStop(0, `rgba(${gc[0]}, ${gc[1]}, ${gc[2]}, 0)`);
        ringGrad.addColorStop(0.5, `rgba(${gc[0]}, ${gc[1]}, ${gc[2]}, ${ringAlpha})`);
        ringGrad.addColorStop(1, `rgba(${gc[0]}, ${gc[1]}, ${gc[2]}, 0)`);
        ctx.strokeStyle = ringGrad;
        ctx.lineWidth = 20;
        ctx.stroke();
      }

      ctx.beginPath();
      ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha * 0.6})`;
      ctx.lineWidth = 2;
      ctx.stroke();
    }
  }
}
