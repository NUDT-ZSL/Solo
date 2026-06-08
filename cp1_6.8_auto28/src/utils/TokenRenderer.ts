import { Totem, FrequencyBands } from '@/types';

interface TotemAnimState {
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  rotation: number;
  rotationSpeed: number;
  floatOffset: number;
  floatSpeed: number;
  floatAmplitude: number;
  scale: number;
  targetScale: number;
  glowIntensity: number;
  targetGlow: number;
}

export class TokenRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private animStates: Map<string, TotemAnimState> = new Map();
  private animationId: number = 0;
  private time: number = 0;
  private hoveredId: string | null = null;
  private onTotemClick: ((id: string) => void) | null = null;
  private onTotemHover: ((id: string | null) => void) | null = null;
  private totems: Totem[] = [];
  private width = 0;
  private height = 0;

  init(canvas: HTMLCanvasElement): void {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.resize();
    this.startLoop();
  }

  destroy(): void {
    cancelAnimationFrame(this.animationId);
    this.animStates.clear();
  }

  resize(): void {
    if (!this.canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.width = rect.width;
    this.height = rect.height;
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx?.scale(dpr, dpr);
  }

  setTotems(totems: Totem[]): void {
    this.totems = totems;
    const existing = new Set(this.animStates.keys());

    for (const totem of totems) {
      if (!this.animStates.has(totem.id)) {
        this.animStates.set(totem.id, {
          x: totem.position.x * this.width,
          y: totem.position.y * this.height,
          baseX: totem.position.x * this.width,
          baseY: totem.position.y * this.height,
          rotation: totem.rotation,
          rotationSpeed: (Math.random() - 0.5) * 0.008,
          floatOffset: Math.random() * Math.PI * 2,
          floatSpeed: 0.3 + Math.random() * 0.5,
          floatAmplitude: 5 + Math.random() * 10,
          scale: 0,
          targetScale: 1,
          glowIntensity: 0,
          targetGlow: 0,
        });
      } else {
        const state = this.animStates.get(totem.id)!;
        state.baseX = totem.position.x * this.width;
        state.baseY = totem.position.y * this.height;
      }
      existing.delete(totem.id);
    }

    for (const id of existing) {
      this.animStates.delete(id);
    }
  }

  setHoveredId(id: string | null): void {
    this.hoveredId = id;
    for (const [tid, state] of this.animStates) {
      state.targetScale = tid === id ? 1.2 : 1;
      state.targetGlow = tid === id ? 1 : 0;
    }
  }

  setCallbacks(
    onClick: (id: string) => void,
    onHover: (id: string | null) => void
  ): void {
    this.onTotemClick = onClick;
    this.onTotemHover = onHover;
  }

  handleMouseMove(e: React.MouseEvent<HTMLCanvasElement>): void {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    let found: string | null = null;
    for (const totem of this.totems) {
      const state = this.animStates.get(totem.id);
      if (!state) continue;
      const dx = mx - state.x;
      const dy = my - state.y;
      if (dx * dx + dy * dy < 50 * 50 * state.scale * state.scale) {
        found = totem.id;
        break;
      }
    }

    if (found !== this.hoveredId) {
      this.setHoveredId(found);
      this.onTotemHover?.(found);
    }

    this.canvas.style.cursor = found ? 'pointer' : 'default';
  }

  handleClick(e: React.MouseEvent<HTMLCanvasElement>): void {
    if (!this.canvas) return;
    const rect = this.canvas.getBoundingClientRect();
    const mx = e.clientX - rect.left;
    const my = e.clientY - rect.top;

    for (const totem of this.totems) {
      const state = this.animStates.get(totem.id);
      if (!state) continue;
      const dx = mx - state.x;
      const dy = my - state.y;
      if (dx * dx + dy * dy < 50 * 50 * state.scale * state.scale) {
        this.onTotemClick?.(totem.id);
        return;
      }
    }
  }

  private startLoop(): void {
    const loop = () => {
      this.time += 0.016;
      this.update();
      this.render();
      this.animationId = requestAnimationFrame(loop);
    };
    loop();
  }

  private update(): void {
    for (const [id, state] of this.animStates) {
      state.rotation += state.rotationSpeed;
      state.x = state.baseX + Math.sin(this.time * state.floatSpeed + state.floatOffset) * state.floatAmplitude;
      state.y = state.baseY + Math.cos(this.time * state.floatSpeed * 0.7 + state.floatOffset) * state.floatAmplitude * 0.6;

      state.scale += (state.targetScale - state.scale) * 0.08;
      state.glowIntensity += (state.targetGlow - state.glowIntensity) * 0.1;
    }
  }

  private render(): void {
    if (!this.ctx || !this.canvas) return;
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.clearRect(0, 0, w, h);

    const bgGrad = ctx.createRadialGradient(w / 2, h / 2, 0, w / 2, h / 2, w * 0.7);
    bgGrad.addColorStop(0, '#0f0a2e');
    bgGrad.addColorStop(0.5, '#0a0a1a');
    bgGrad.addColorStop(1, '#050510');
    ctx.fillStyle = bgGrad;
    ctx.fillRect(0, 0, w, h);

    this.drawGrid(ctx, w, h);

    for (const totem of this.totems) {
      const state = this.animStates.get(totem.id);
      if (!state) continue;
      this.drawTotem(ctx, totem, state);
    }
  }

  private drawGrid(ctx: CanvasRenderingContext2D, w: number, h: number): void {
    ctx.strokeStyle = 'rgba(0, 212, 255, 0.04)';
    ctx.lineWidth = 0.5;
    const gridSize = 60;
    for (let x = 0; x < w; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, h);
      ctx.stroke();
    }
    for (let y = 0; y < h; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
      ctx.stroke();
    }
  }

  private drawTotem(ctx: CanvasRenderingContext2D, totem: Totem, state: TotemAnimState): void {
    ctx.save();
    ctx.translate(state.x, state.y);
    ctx.rotate(state.rotation);
    ctx.scale(state.scale, state.scale);

    const size = 45;

    if (state.glowIntensity > 0.01) {
      const glowSize = size * 2.5;
      const glow = ctx.createRadialGradient(0, 0, size * 0.5, 0, 0, glowSize);
      glow.addColorStop(0, this.colorWithAlpha(totem.colorPrimary, 0.3 * state.glowIntensity));
      glow.addColorStop(1, this.colorWithAlpha(totem.colorPrimary, 0));
      ctx.fillStyle = glow;
      ctx.beginPath();
      ctx.arc(0, 0, glowSize, 0, Math.PI * 2);
      ctx.fill();
    }

    this.drawTotemShape(ctx, totem, size);

    ctx.restore();
  }

  private drawTotemShape(ctx: CanvasRenderingContext2D, totem: Totem, size: number): void {
    const waveform = totem.waveform;
    const bands = totem.frequencyBands;
    const points = waveform.length;

    ctx.beginPath();

    for (let i = 0; i < points; i++) {
      const angle = (i / points) * Math.PI * 2 - Math.PI / 2;
      const amplitude = waveform[i];
      const r = size * 0.3 + amplitude * size * 0.7;
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        const prevAngle = ((i - 1) / points) * Math.PI * 2 - Math.PI / 2;
        const prevAmp = waveform[i - 1];
        const prevR = size * 0.3 + prevAmp * size * 0.7;
        const prevX = Math.cos(prevAngle) * prevR;
        const prevY = Math.sin(prevAngle) * prevR;
        const cpAngle = ((i - 0.5) / points) * Math.PI * 2 - Math.PI / 2;
        const cpAmp = (amplitude + prevAmp) / 2;
        const cpR = size * 0.3 + cpAmp * size * 0.7;
        const cpx = Math.cos(cpAngle) * cpR;
        const cpy = Math.sin(cpAngle) * cpR;
        ctx.quadraticCurveTo(cpx, cpy, x, y);
      }
    }

    ctx.closePath();

    const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, size);
    if (totem.mergedFrom && totem.mergedFrom.length > 0) {
      grad.addColorStop(0, this.colorWithAlpha(totem.colorPrimary, 0.9));
      grad.addColorStop(0.5, this.colorWithAlpha(totem.colorSecondary, 0.7));
      grad.addColorStop(1, this.colorWithAlpha(totem.colorPrimary, 0.4));
    } else {
      grad.addColorStop(0, this.colorWithAlpha(totem.colorPrimary, 0.9));
      grad.addColorStop(0.7, this.colorWithAlpha(totem.colorPrimary, 0.5));
      grad.addColorStop(1, this.colorWithAlpha(totem.colorSecondary, 0.3));
    }
    ctx.fillStyle = grad;
    ctx.fill();

    ctx.strokeStyle = totem.colorPrimary;
    ctx.lineWidth = 1.5;
    ctx.shadowColor = totem.colorPrimary;
    ctx.shadowBlur = 8;
    ctx.stroke();
    ctx.shadowBlur = 0;

    this.drawInnerPattern(ctx, bands, size);
  }

  private drawInnerPattern(ctx: CanvasRenderingContext2D, bands: FrequencyBands, size: number): void {
    ctx.save();
    ctx.globalAlpha = 0.3;

    const innerSize = size * 0.25;
    const sides = Math.round(3 + bands.mid * 5);
    ctx.beginPath();
    for (let i = 0; i <= sides; i++) {
      const angle = (i / sides) * Math.PI * 2;
      const r = innerSize * (0.8 + bands.high * 0.4);
      const x = Math.cos(angle) * r;
      const y = Math.sin(angle) * r;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.lineWidth = 0.8;
    ctx.stroke();

    ctx.restore();
  }

  drawStaticTotem(
    canvas: HTMLCanvasElement,
    totem: Totem,
    width: number,
    height: number
  ): void {
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);
    ctx.translate(width / 2, height / 2);

    this.drawTotemShape(ctx, totem, Math.min(width, height) * 0.4);
  }

  drawWaveform(
    canvas: HTMLCanvasElement,
    waveform: number[],
    color: string,
    width: number,
    height: number
  ): void {
    const ctx = canvas.getContext('2d')!;
    const dpr = window.devicePixelRatio || 1;
    canvas.width = width * dpr;
    canvas.height = height * dpr;
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    ctx.scale(dpr, dpr);

    ctx.clearRect(0, 0, width, height);

    const mid = height / 2;
    const step = width / waveform.length;

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 2;
    ctx.shadowColor = color;
    ctx.shadowBlur = 6;

    for (let i = 0; i < waveform.length; i++) {
      const x = i * step;
      const y = mid - waveform[i] * mid * 0.8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.globalAlpha = 0.4;
    for (let i = 0; i < waveform.length; i++) {
      const x = i * step;
      const y = mid + waveform[i] * mid * 0.8;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
    ctx.shadowBlur = 0;
  }

  private colorWithAlpha(color: string, alpha: number): string {
    if (color.startsWith('rgb(')) {
      return color.replace('rgb(', 'rgba(').replace(')', `,${alpha})`);
    }
    if (color.startsWith('#')) {
      const r = parseInt(color.slice(1, 3), 16);
      const g = parseInt(color.slice(3, 5), 16);
      const b = parseInt(color.slice(5, 7), 16);
      return `rgba(${r},${g},${b},${alpha})`;
    }
    return color;
  }

  static mapBandsToColor(bands: FrequencyBands): string {
    const { low, high } = bands;
    const hue = 280 * high + 30 * low;
    return `hsl(${hue}, 90%, 60%)`;
  }
}
