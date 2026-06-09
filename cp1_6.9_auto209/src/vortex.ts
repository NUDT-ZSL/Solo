import { ParticleSystem, ColorTheme, colorThemes } from './particle';

export interface VortexState {
  rotation: number;
  targetRotation: number;
  scale: number;
  targetScale: number;
  speedMultiplier: number;
  centerX: number;
  centerY: number;
  themeKey: string;
}

export interface VortexCallbacks {
  onStateChange?: (state: VortexState) => void;
}

export class Vortex {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private particleSystem: ParticleSystem;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private running: boolean = false;
  private callbacks: VortexCallbacks;

  state: VortexState = {
    rotation: 0,
    targetRotation: 0,
    scale: 1,
    targetScale: 1,
    speedMultiplier: 1,
    centerX: 0,
    centerY: 0,
    themeKey: 'fantasy',
  };

  private readonly layerCount: number = 6;
  private readonly armsPerLayer: number = 3;
  private readonly pointsPerArm: number = 150;

  constructor(canvas: HTMLCanvasElement, callbacks: VortexCallbacks = {}) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get canvas 2D context');
    this.ctx = ctx;
    this.callbacks = callbacks;
    this.particleSystem = new ParticleSystem(500, this.state.themeKey);
    this.resize();
  }

  get theme(): ColorTheme {
    return colorThemes[this.state.themeKey] || colorThemes.fantasy;
  }

  resize() {
    const dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * dpr;
    this.canvas.height = rect.height * dpr;
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.state.centerX = rect.width / 2;
    this.state.centerY = rect.height / 2;
    this.particleSystem.setCenter(this.state.centerX, this.state.centerY);
  }

  setSpeed(speed: number) {
    this.state.speedMultiplier = Math.max(0.1, Math.min(3.0, speed));
  }

  setParticleCount(count: number) {
    this.particleSystem.setMaxParticles(Math.floor(count));
  }

  setTheme(key: string) {
    this.state.themeKey = key;
    this.particleSystem.setTheme(key);
  }

  setScale(target: number) {
    this.state.targetScale = Math.max(0.3, Math.min(3.0, target));
  }

  addRotation(delta: number) {
    this.state.targetRotation += delta;
  }

  reset() {
    this.state.targetRotation = 0;
    this.state.targetScale = 1;
    this.state.speedMultiplier = 1;
    this.setTheme('fantasy');
    this.setParticleCount(500);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    this.loop();
  }

  stop() {
    this.running = false;
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  private loop = () => {
    if (!this.running) return;

    const now = performance.now();
    const dt = Math.min((now - this.lastTime) / 16.666, 3);
    this.lastTime = now;

    this.update(dt, now);
    this.render(now);

    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(dt: number, time: number) {
    const baseSpeed = 0.008 * this.state.speedMultiplier;
    this.state.targetRotation += baseSpeed * dt;

    const rotDiff = this.state.targetRotation - this.state.rotation;
    this.state.rotation += rotDiff * 0.08 * dt;

    const scaleDiff = this.state.targetScale - this.state.scale;
    this.state.scale += scaleDiff * 0.08 * dt;

    this.particleSystem.setVortexState(this.state.rotation, this.state.scale);
    this.particleSystem.update(time);

    if (this.callbacks.onStateChange) {
      this.callbacks.onStateChange({ ...this.state });
    }
  }

  private render(time: number) {
    const { ctx, canvas } = this;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    ctx.fillStyle = 'rgba(10, 0, 18, 0.15)';
    ctx.fillRect(0, 0, w, h);

    this.renderVortexRings(time);
    this.renderSpiralArms(time);
    this.renderCore(time);
    this.particleSystem.render(ctx);
    this.renderVignette();
  }

  private renderVortexRings(_time: number) {
    const { ctx } = this;
    const { centerX: cx, centerY: cy, scale, rotation } = this.state;
    const theme = this.theme;
    const maxRadius = Math.min(cx, cy) * 0.95 * scale;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = 'lighter';

    const ringCount = 12;
    for (let i = ringCount; i >= 0; i--) {
      const t = i / ringCount;
      const radius = maxRadius * (0.1 + t * 0.9);
      const lineWidth = (1 - t) * 4 + 0.5;
      const alpha = (1 - t) * 0.15 + 0.02;
      const ringRotation = rotation * (0.5 + t * 1.5);

      ctx.save();
      ctx.rotate(ringRotation);
      ctx.strokeStyle = this.interpolateColor(theme.center, theme.edge, t, alpha);
      ctx.lineWidth = lineWidth;
      ctx.beginPath();

      const segments = 80;
      for (let j = 0; j <= segments; j++) {
        const angle = (j / segments) * Math.PI * 2;
        const wobble = Math.sin(angle * 6 + rotation * 2 + i) * (1 - t) * 6;
        const r = radius + wobble;
        const x = Math.cos(angle) * r;
        const y = Math.sin(angle) * r;
        if (j === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.closePath();
      ctx.stroke();
      ctx.restore();
    }

    ctx.restore();
  }

  private renderSpiralArms(time: number) {
    const { ctx } = this;
    const { centerX: cx, centerY: cy, scale, rotation } = this.state;
    const theme = this.theme;
    const maxRadius = Math.min(cx, cy) * 0.9 * scale;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = 'lighter';

    for (let layer = 0; layer < this.layerCount; layer++) {
      const layerT = layer / (this.layerCount - 1);
      const baseArmCount = this.armsPerLayer + Math.floor(layerT * 2);
      const armWidth = (1 - layerT) * 35 + 8;
      const layerAlpha = (1 - layerT) * 0.12 + 0.04;
      const layerRotation = rotation * (0.8 + layerT * 0.8);
      const layerScale = 0.4 + layerT * 0.7;
      const spiralTurns = 2.5 + layerT * 1.5;

      for (let arm = 0; arm < baseArmCount; arm++) {
        const armOffset = (arm / baseArmCount) * Math.PI * 2;

        ctx.beginPath();
        const points: { x: number; y: number; r: number }[] = [];

        for (let i = 0; i < this.pointsPerArm; i++) {
          const t = i / (this.pointsPerArm - 1);
          const radius = t * maxRadius * layerScale;
          const angle = armOffset + t * spiralTurns * Math.PI * 2 + layerRotation;
          const pulse = Math.sin(time * 0.001 + layer + arm + t * 5) * 0.05 + 1;
          const wobble = Math.sin(t * 8 + rotation * 0.5 + arm * 2) * (1 - t) * 10;

          const r = radius * pulse + wobble;
          points.push({
            x: Math.cos(angle) * r,
            y: Math.sin(angle) * r,
            r,
          });
        }

        for (let side = -1; side <= 1; side += 2) {
          for (let i = 0; i < points.length; i++) {
            const t = i / (points.length - 1);
            const p = points[i];

            let nx: number, ny: number;
            if (i === 0) {
              const next = points[i + 1];
              const dx = next.x - p.x;
              const dy = next.y - p.y;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              nx = -dy / len;
              ny = dx / len;
            } else if (i === points.length - 1) {
              const prev = points[i - 1];
              const dx = p.x - prev.x;
              const dy = p.y - prev.y;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              nx = -dy / len;
              ny = dx / len;
            } else {
              const prev = points[i - 1];
              const next = points[i + 1];
              const dx = next.x - prev.x;
              const dy = next.y - prev.y;
              const len = Math.sqrt(dx * dx + dy * dy) || 1;
              nx = -dy / len;
              ny = dx / len;
            }

            const w = armWidth * (1 - t * 0.7);
            const x = p.x + nx * w * side * 0.5;
            const y = p.y + ny * w * side * 0.5;

            if (side === -1) {
              if (i === 0) ctx.moveTo(x, y);
              else ctx.lineTo(x, y);
            } else {
              if (i === points.length - 1) ctx.lineTo(x, y);
              else ctx.lineTo(points[points.length - 1 - i].x + nx * w * side * 0.5, points[points.length - 1 - i].y + ny * w * side * 0.5);
            }
          }
        }
        ctx.closePath();

        const colorT = 0.3 + layerT * 0.7;
        const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, maxRadius);
        grad.addColorStop(0, this.interpolateColor(theme.center, theme.edge, 0, layerAlpha * 1.5));
        grad.addColorStop(colorT, this.interpolateColor(theme.center, theme.edge, colorT, layerAlpha));
        grad.addColorStop(1, this.interpolateColor(theme.center, theme.edge, 1, layerAlpha * 0.3));
        ctx.fillStyle = grad;
        ctx.fill();
      }
    }

    ctx.restore();
  }

  private renderCore(time: number) {
    const { ctx } = this;
    const { centerX: cx, centerY: cy, scale, rotation } = this.state;
    const theme = this.theme;
    const coreSize = 40 * scale;

    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalCompositeOperation = 'lighter';

    const outerGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize * 3);
    outerGrad.addColorStop(0, this.interpolateColor(theme.center, theme.edge, 0, 0.4));
    outerGrad.addColorStop(0.3, this.interpolateColor(theme.center, theme.edge, 0.2, 0.2));
    outerGrad.addColorStop(1, this.interpolateColor(theme.center, theme.edge, 0.5, 0));
    ctx.fillStyle = outerGrad;
    ctx.beginPath();
    ctx.arc(0, 0, coreSize * 3, 0, Math.PI * 2);
    ctx.fill();

    const pulse = Math.sin(time * 0.003) * 0.15 + 1;
    const coreGrad = ctx.createRadialGradient(0, 0, 0, 0, 0, coreSize * pulse);
    coreGrad.addColorStop(0, 'rgba(255, 255, 255, 0.9)');
    coreGrad.addColorStop(0.3, this.interpolateColor(theme.center, theme.edge, 0, 0.7));
    coreGrad.addColorStop(1, this.interpolateColor(theme.center, theme.edge, 0.3, 0));
    ctx.fillStyle = coreGrad;
    ctx.beginPath();
    ctx.arc(0, 0, coreSize * pulse, 0, Math.PI * 2);
    ctx.fill();

    ctx.rotate(rotation * 3);
    for (let i = 0; i < 6; i++) {
      const angle = (i / 6) * Math.PI * 2;
      const rayLen = coreSize * 2.5 * pulse;
      const rayGrad = ctx.createLinearGradient(0, 0, Math.cos(angle) * rayLen, Math.sin(angle) * rayLen);
      rayGrad.addColorStop(0, this.interpolateColor(theme.center, theme.edge, 0, 0.6));
      rayGrad.addColorStop(1, this.interpolateColor(theme.center, theme.edge, 0.3, 0));
      ctx.strokeStyle = rayGrad;
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(angle) * rayLen, Math.sin(angle) * rayLen);
      ctx.stroke();
    }

    ctx.restore();
  }

  private renderVignette() {
    const { ctx, canvas } = this;
    const rect = canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    const grad = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.3, w / 2, h / 2, Math.max(w, h) * 0.75);
    grad.addColorStop(0, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(10, 0, 25, 0.7)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);
  }

  private interpolateColor(
    c1: [number, number, number],
    c2: [number, number, number],
    t: number,
    alpha: number
  ): string {
    const r = Math.round(c1[0] + (c2[0] - c1[0]) * t);
    const g = Math.round(c1[1] + (c2[1] - c1[1]) * t);
    const b = Math.round(c1[2] + (c2[2] - c1[2]) * t);
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }
}
