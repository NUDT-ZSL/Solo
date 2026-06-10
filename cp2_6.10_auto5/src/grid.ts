import type {
  Cell,
  Ripple,
  ColorBurst,
  InteractionData,
  TrailParticle,
} from './types';

const HEX_SIZE = 22;
const HEX_WIDTH = HEX_SIZE * Math.sqrt(3);
const HEX_HEIGHT = HEX_SIZE * 2;
const ROW_SPACING = HEX_HEIGHT * 0.68;
const COL_SPACING = HEX_WIDTH * 0.82;

const BROWNIAN_AMPLITUDE = 1.5;
const WAVE_AMPLITUDE = 2.8;
const WAVE_FREQUENCY = 0.0035;

const IDLE_TIMEOUT = 3000;
const IDLE_FACTOR_MIN = 0.2;

const TRAIL_LIFETIME = 500;
const EXPLODE_DURATION = 1500;

const PULSE_DURATION_MIN = 300;
const PULSE_DURATION_MAX = 1500;
const PULSE_PEAK_RATIO = 0.25;

const COLOR_RISE_DURATION = 300;
const COLOR_FALL_DURATION = 1000;

export class GridManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cells: Cell[] = [];
  private ripples: Ripple[] = [];
  private colorBursts: ColorBurst[] = [];
  private trailParticles: TrailParticle[] = [];
  private width: number = 0;
  private height: number = 0;
  private lastInteractionTime: number = 0;
  private isIdle: boolean = false;
  private idleFactor: number = 1;
  private idleTransitionStart: number = 0;
  private hexPath: Path2D | null = null;
  private glowCanvas: HTMLCanvasElement | null = null;
  private glowCtx: CanvasRenderingContext2D | null = null;
  private time: number = 0;
  private cols: number = 0;
  private rows: number = 0;
  private frame: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.createGlowCache();
    this.resize();
    this.precomputeHexPath();
  }

  private createGlowCache(): void {
    this.glowCanvas = document.createElement('canvas');
    const size = HEX_SIZE * 2.2;
    this.glowCanvas.width = size;
    this.glowCanvas.height = size;
    this.glowCtx = this.glowCanvas.getContext('2d')!;
    const gctx = this.glowCtx;
    const cx = size / 2;
    const cy = size / 2;
    const r = HEX_SIZE * 1.8;
    const grad = gctx.createRadialGradient(cx, cy, 0, cx, cy, r);
    grad.addColorStop(0, 'rgba(255, 255, 255, 0.95)');
    grad.addColorStop(0.4, 'rgba(255, 255, 255, 0.55)');
    grad.addColorStop(0.75, 'rgba(255, 255, 255, 0.18)');
    grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
    gctx.fillStyle = grad;
    gctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = cx + Math.cos(angle) * HEX_SIZE * 1.15;
      const y = cy + Math.sin(angle) * HEX_SIZE * 1.15;
      if (i === 0) gctx.moveTo(x, y);
      else gctx.lineTo(x, y);
    }
    gctx.closePath();
    gctx.fill();
  }

  resize(): void {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.width = window.innerWidth;
    this.height = window.innerHeight;
    this.canvas.width = this.width * dpr;
    this.canvas.height = this.height * dpr;
    this.canvas.style.width = this.width + 'px';
    this.canvas.style.height = this.height + 'px';
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    this.initializeGrid();
  }

  private precomputeHexPath(): void {
    this.hexPath = new Path2D();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = Math.cos(angle) * HEX_SIZE;
      const y = Math.sin(angle) * HEX_SIZE;
      if (i === 0) this.hexPath.moveTo(x, y);
      else this.hexPath.lineTo(x, y);
    }
    this.hexPath.closePath();
  }

  private initializeGrid(): void {
    this.cells = [];
    this.trailParticles = [];
    this.cols = Math.ceil(this.width / COL_SPACING) + 2;
    this.rows = Math.ceil(this.height / ROW_SPACING) + 2;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const offsetX = row % 2 === 1 ? COL_SPACING / 2 : 0;
        const baseX = col * COL_SPACING + offsetX - COL_SPACING * 0.5;
        const baseY = row * ROW_SPACING - HEX_SIZE * 0.5;

        const nx = col / this.cols;
        const ny = row / this.rows;
        const gradientT = nx * 0.6 + ny * 0.4;

        const baseHue = this.lerpHue(222, 12, gradientT);
        const satBase = this.lerp(48, 58, gradientT);
        const lightBase = this.lerp(24, 30, gradientT);

        this.cells.push({
          baseX,
          baseY,
          baseHue,
          baseSaturation: satBase,
          baseLightness: lightBase,
          size: HEX_SIZE,
          brownianPhase: Math.random() * Math.PI * 2,
          brownianSpeed: 0.25 + Math.random() * 0.35,
          displacementPulses: [],
          colorPulses: [],
          isExploding: false,
          explodeStartTime: 0,
          explodeDirectionX: 0,
          explodeDirectionY: 0,
          explodeDistance: 0,
          cachedX: baseX,
          cachedY: baseY,
          cachedHue: baseHue,
          cachedSaturation: satBase,
          cachedLightness: lightBase,
        });
      }
    }
  }

  handleInteraction(data: InteractionData): void {
    this.lastInteractionTime = data.timestamp;
    if (this.isIdle) {
      this.isIdle = false;
      this.idleTransitionStart = data.timestamp;
    }

    switch (data.type) {
      case 'move':
        this.handleMouseMove(data);
        break;
      case 'down':
        this.handleMouseDown(data);
        break;
      case 'up':
        this.handleMouseUp(data);
        break;
    }
  }

  private handleMouseMove(data: InteractionData): void {
    const speed = data.speed;
    if (speed < 0.5) return;

    const influenceRadius = 90 + Math.min(speed * 3.5, 150);
    const radiusSq = influenceRadius * influenceRadius;

    let hueShift = 0;
    const signX = Math.abs(data.velocityX) > 0.01 ? Math.sign(data.velocityX) : 0;
    const signY = Math.abs(data.velocityY) > 0.01 ? Math.sign(data.velocityY) : 0;

    if (signX < 0) hueShift = 200;
    else if (signX > 0) hueShift = 355;
    else if (signY < 0) hueShift = 285;
    else if (signY > 0) hueShift = 130;

    const dirX = data.velocityX / (speed || 1);
    const dirY = data.velocityY / (speed || 1);
    const pushBase = Math.min(speed * 0.15, 5.5);
    const pulseDur = this.clamp(400 + speed * 2, PULSE_DURATION_MIN, PULSE_DURATION_MAX);

    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      const cx = cell.cachedX;
      const cy = cell.cachedY;
      const dx = cx - data.x;
      const dy = cy - data.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < radiusSq) {
        const dist = Math.sqrt(distSq);
        const falloff = 1 - dist / influenceRadius;
        const falloffSq = falloff * falloff;
        const strength = pushBase * falloffSq;

        cell.displacementPulses.push({
          dx: dirX * strength,
          dy: dirY * strength,
          startTime: data.timestamp,
          duration: pulseDur,
          peakRatio: PULSE_PEAK_RATIO,
        });

        if (hueShift !== 0 && falloffSq > 0.15) {
          const intensity = falloffSq;
          const newHue = (hueShift + (Math.random() - 0.5) * 25 + 360) % 360;
          cell.colorPulses.push({
            targetHue: newHue,
            targetSaturation: Math.min(cell.baseSaturation + 45 * intensity, 95),
            targetLightness: Math.min(cell.baseLightness + 30 * intensity, 65),
            startTime: data.timestamp,
            riseDuration: COLOR_RISE_DURATION,
            fallDuration: Math.max(COLOR_FALL_DURATION * intensity + 300, 400),
            startHue: cell.cachedHue,
            startSaturation: cell.cachedSaturation,
            startLightness: cell.cachedLightness,
          });
        }

        if (cell.displacementPulses.length > 5) {
          cell.displacementPulses.splice(0, cell.displacementPulses.length - 5);
        }
        if (cell.colorPulses.length > 4) {
          cell.colorPulses.splice(0, cell.colorPulses.length - 4);
        }
      }
    }
  }

  private handleMouseDown(data: InteractionData): void {
    this.ripples.push({
      x: data.x,
      y: data.y,
      radius: 0,
      maxRadius: 320,
      speed: 420,
      strength: 1,
      startTime: data.timestamp,
      active: true,
      triggered: new Set<number>(),
    });
  }

  private handleMouseUp(data: InteractionData): void {
    this.colorBursts.push({
      x: data.x,
      y: data.y,
      startTime: data.timestamp,
      duration: EXPLODE_DURATION,
      active: true,
    });

    const burstRadius = 70;
    const radiusSq = burstRadius * burstRadius;

    const vividHues = [200, 285, 325, 135, 170, 50];

    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      const dx = cell.baseX - data.x;
      const dy = cell.baseY - data.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < radiusSq) {
        const dist = Math.sqrt(distSq);
        const falloff = 1 - dist / burstRadius;
        const falloffSq = falloff * falloff;

        const angle = Math.random() * Math.PI * 2;
        const power = 70 + Math.random() * 120;

        cell.isExploding = true;
        cell.explodeStartTime = data.timestamp;
        cell.explodeDirectionX = Math.cos(angle);
        cell.explodeDirectionY = Math.sin(angle);
        cell.explodeDistance = power * falloffSq;

        const burstHue = vividHues[Math.floor(Math.random() * vividHues.length)];

        cell.colorPulses.push({
          targetHue: burstHue,
          targetSaturation: 100,
          targetLightness: 62,
          startTime: data.timestamp,
          riseDuration: COLOR_RISE_DURATION,
          fallDuration: EXPLODE_DURATION,
          startHue: cell.cachedHue,
          startSaturation: cell.cachedSaturation,
          startLightness: cell.cachedLightness,
        });

        const trailCount = Math.floor(5 + falloffSq * 10);
        for (let t = 0; t < trailCount; t++) {
          const spread = (Math.random() - 0.5) * 0.8;
          const tAngle = angle + spread;
          const speed = 2 + Math.random() * 4;
          this.trailParticles.push({
            x: cell.cachedX,
            y: cell.cachedY,
            vx: Math.cos(tAngle) * speed * falloffSq,
            vy: Math.sin(tAngle) * speed * falloffSq,
            hue: burstHue + (Math.random() - 0.5) * 30,
            saturation: 95 + Math.random() * 5,
            lightness: 68 + Math.random() * 20,
            birthTime: data.timestamp + t * 15,
            lifetime: TRAIL_LIFETIME + Math.random() * 200,
            size: HEX_SIZE * (0.4 + Math.random() * 0.6) * falloffSq,
          });
        }

        if (this.trailParticles.length > 1000) {
          this.trailParticles.splice(0, this.trailParticles.length - 1000);
        }
      }
    }
  }

  update(deltaTime: number, now: number): void {
    this.time += deltaTime;
    this.frame++;

    if (now - this.lastInteractionTime > IDLE_TIMEOUT && !this.isIdle) {
      this.isIdle = true;
      this.idleTransitionStart = now;
    }

    if (this.isIdle) {
      const t = Math.min((now - this.idleTransitionStart) / 2000, 1);
      this.idleFactor = this.lerp(1, IDLE_FACTOR_MIN, this.easeInOut(t));
    } else {
      const t = Math.min((now - this.idleTransitionStart) / 500, 1);
      this.idleFactor = this.lerp(this.idleFactor, 1, this.easeInOut(t));
    }

    this.updateRipples(now);
    this.updateColorBursts(now);
    this.updateTrailParticles(deltaTime, now);
    this.updateCells(now);
  }

  private updateRipples(now: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      if (!ripple.active) {
        this.ripples.splice(i, 1);
        continue;
      }

      const elapsed = now - ripple.startTime;
      ripple.radius = (elapsed / 1000) * ripple.speed;
      const ageFactor = 1 - ripple.radius / ripple.maxRadius;

      if (ripple.radius >= ripple.maxRadius || ageFactor <= 0) {
        ripple.active = false;
        continue;
      }

      const ringWidth = 30;
      const innerRadius = Math.max(0, ripple.radius - ringWidth);
      const outerRadius = ripple.radius + ringWidth;
      const innerSq = innerRadius * innerRadius;
      const outerSq = outerRadius * outerRadius;

      for (let j = 0; j < this.cells.length; j++) {
        if (ripple.triggered.has(j)) continue;

        const cell = this.cells[j];
        const dx = cell.baseX - ripple.x;
        const dy = cell.baseY - ripple.y;
        const distSq = dx * dx + dy * dy;

        if (distSq > innerSq && distSq < outerSq) {
          const dist = Math.sqrt(distSq);
          const ringDist = dist - ripple.radius;
          const ringFalloff = 1 - Math.abs(ringDist) / ringWidth;
          if (ringFalloff <= 0) continue;

          ripple.triggered.add(j);

          const strength = ageFactor * ringFalloff * ringFalloff;
          const nx = dx / dist;
          const ny = dy / dist;
          const pulseStrength = 8 * strength + 4;

          cell.displacementPulses.push({
            dx: nx * pulseStrength,
            dy: ny * pulseStrength,
            startTime: now,
            duration: 900,
            peakRatio: PULSE_PEAK_RATIO,
          });

          const rippleHue = (280 + ringDist * 1.5 + 360) % 360;
          cell.colorPulses.push({
            targetHue: rippleHue,
            targetSaturation: Math.min(cell.baseSaturation + 40 * strength, 90),
            targetLightness: Math.min(cell.baseLightness + 28 * strength, 58),
            startTime: now,
            riseDuration: COLOR_RISE_DURATION,
            fallDuration: 900,
            startHue: cell.cachedHue,
            startSaturation: cell.cachedSaturation,
            startLightness: cell.cachedLightness,
          });

          if (cell.displacementPulses.length > 6) {
            cell.displacementPulses.splice(0, cell.displacementPulses.length - 6);
          }
          if (cell.colorPulses.length > 5) {
            cell.colorPulses.splice(0, cell.colorPulses.length - 5);
          }
        }
      }
    }
  }

  private updateColorBursts(now: number): void {
    for (let i = this.colorBursts.length - 1; i >= 0; i--) {
      const burst = this.colorBursts[i];
      if (!burst.active || now - burst.startTime > burst.duration) {
        burst.active = false;
        this.colorBursts.splice(i, 1);
      }
    }
  }

  private updateTrailParticles(dt: number, now: number): void {
    const deltaFactor = dt / 16.67;
    for (let i = this.trailParticles.length - 1; i >= 0; i--) {
      const p = this.trailParticles[i];
      const age = now - p.birthTime;
      if (age > p.lifetime || age < 0) {
        this.trailParticles.splice(i, 1);
        continue;
      }
      p.vx *= 0.96;
      p.vy *= 0.96;
      p.x += p.vx * deltaFactor;
      p.y += p.vy * deltaFactor;
    }
  }

  private updateCells(now: number): void {
    const timeSec = this.time / 1000;

    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];

      const waveX = Math.sin(timeSec * 1.1 + cell.baseX * WAVE_FREQUENCY + cell.brownianPhase) * WAVE_AMPLITUDE;
      const waveY = Math.cos(timeSec * 0.85 + cell.baseY * WAVE_FREQUENCY + cell.brownianPhase * 1.3) * WAVE_AMPLITUDE;

      const brownX = Math.sin(timeSec * cell.brownianSpeed * 2 + cell.brownianPhase) * BROWNIAN_AMPLITUDE * this.idleFactor;
      const brownY = Math.cos(timeSec * cell.brownianSpeed * 1.7 + cell.brownianPhase * 1.5) * BROWNIAN_AMPLITUDE * this.idleFactor;

      let offsetX = waveX + brownX;
      let offsetY = waveY + brownY;

      for (let p = cell.displacementPulses.length - 1; p >= 0; p--) {
        const pulse = cell.displacementPulses[p];
        const elapsed = now - pulse.startTime;
        if (elapsed > pulse.duration || elapsed < 0) {
          cell.displacementPulses.splice(p, 1);
          continue;
        }
        const t = elapsed / pulse.duration;
        const peakT = pulse.peakRatio;
        let pulseEase: number;
        if (t < peakT) {
          const localT = t / peakT;
          pulseEase = this.easeOut(localT);
        } else {
          const localT = (t - peakT) / (1 - peakT);
          pulseEase = 1 - this.easeInOut(localT);
        }
        offsetX += pulse.dx * pulseEase;
        offsetY += pulse.dy * pulseEase;
      }

      if (cell.isExploding) {
        const elapsed = now - cell.explodeStartTime;
        const t = Math.min(elapsed / EXPLODE_DURATION, 1);

        if (t < 0.32) {
          const explodeT = t / 0.32;
          const explodeEase = this.easeOut(explodeT);
          offsetX += cell.explodeDirectionX * cell.explodeDistance * explodeEase;
          offsetY += cell.explodeDirectionY * cell.explodeDistance * explodeEase;
        } else {
          const returnT = (t - 0.32) / 0.68;
          const returnEase = this.easeInOut(returnT);
          const currentDist = cell.explodeDistance * (1 - returnEase);
          offsetX += cell.explodeDirectionX * currentDist;
          offsetY += cell.explodeDirectionY * currentDist;
        }

        if (t >= 1) {
          cell.isExploding = false;
        }
      }

      cell.cachedX = cell.baseX + offsetX;
      cell.cachedY = cell.baseY + offsetY;

      let finalHue = cell.baseHue;
      let finalSat = cell.baseSaturation;
      let finalLight = cell.baseLightness;

      let maxPulseIntensity = 0;

      for (let p = cell.colorPulses.length - 1; p >= 0; p--) {
        const pulse = cell.colorPulses[p];
        const age = now - pulse.startTime;

        if (age < 0) continue;

        const totalDur = pulse.riseDuration + pulse.fallDuration;
        if (age > totalDur) {
          cell.colorPulses.splice(p, 1);
          continue;
        }

        let intensity: number;
        let pulseHue: number;
        let pulseSat: number;
        let pulseLight: number;

        if (age < pulse.riseDuration) {
          const t = age / pulse.riseDuration;
          const ease = this.easeOut(t);
          intensity = ease;
          pulseHue = this.lerpHue(pulse.startHue, pulse.targetHue, ease);
          pulseSat = this.lerp(pulse.startSaturation, pulse.targetSaturation, ease);
          pulseLight = this.lerp(pulse.startLightness, pulse.targetLightness, ease);
        } else {
          const t = (age - pulse.riseDuration) / pulse.fallDuration;
          const ease = this.easeInOut(t);
          intensity = 1 - ease;
          pulseHue = this.lerpHue(pulse.targetHue, cell.baseHue, ease);
          pulseSat = this.lerp(pulse.targetSaturation, cell.baseSaturation, ease);
          pulseLight = this.lerp(pulse.targetLightness, cell.baseLightness, ease);
        }

        if (intensity > maxPulseIntensity) {
          maxPulseIntensity = intensity;
          finalHue = pulseHue;
          finalSat = pulseSat;
          finalLight = pulseLight;
        }
      }

      cell.cachedHue = finalHue;
      cell.cachedSaturation = finalSat;
      cell.cachedLightness = finalLight;
    }
  }

  render(_now: number): void {
    const ctx = this.ctx;
    const w = this.width;
    const h = this.height;

    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, w, h);

    ctx.globalCompositeOperation = 'lighter';

    this.renderTrails(ctx);
    this.renderHexagons(ctx);
    this.renderRippleRings(ctx);

    ctx.globalCompositeOperation = 'source-over';
  }

  private renderTrails(ctx: CanvasRenderingContext2D): void {
    if (this.trailParticles.length === 0) return;
    const now = performance.now();

    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < this.trailParticles.length; i++) {
      const p = this.trailParticles[i];
      const age = now - p.birthTime;
      if (age < 0 || age > p.lifetime) continue;

      const lifeRatio = 1 - age / p.lifetime;
      const alpha = lifeRatio * lifeRatio * 0.85;
      const size = p.size * (0.4 + lifeRatio * 0.6);

      if (p.x < -size || p.x > this.width + size ||
          p.y < -size || p.y > this.height + size) continue;

      ctx.globalAlpha = alpha;
      ctx.fillStyle = `hsl(${p.hue}, ${p.saturation}%, ${p.lightness}%)`;
      ctx.beginPath();
      ctx.arc(p.x, p.y, size, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.globalAlpha = 1;
  }

  private renderHexagons(ctx: CanvasRenderingContext2D): void {
    if (!this.hexPath) return;

    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      const x = cell.cachedX;
      const y = cell.cachedY;

      if (x < -HEX_SIZE * 2 || x > this.width + HEX_SIZE * 2 ||
          y < -HEX_SIZE * 2 || y > this.height + HEX_SIZE * 2) {
        continue;
      }

      ctx.save();
      ctx.translate(x, y);
      ctx.globalAlpha = 0.75;

      const hue = cell.cachedHue;
      const sat = cell.cachedSaturation;
      const light = cell.cachedLightness;

      ctx.fillStyle = `hsl(${hue}, ${sat}%, ${light}%)`;
      ctx.fill(this.hexPath);

      ctx.globalAlpha = 0.5;
      ctx.fillStyle = `hsl(${hue}, ${sat}%, ${Math.min(light + 25, 85)}%)`;
      ctx.beginPath();
      for (let j = 0; j < 6; j++) {
        const angle = (Math.PI / 3) * j - Math.PI / 6;
        const px = Math.cos(angle) * HEX_SIZE * 0.6;
        const py = Math.sin(angle) * HEX_SIZE * 0.6;
        if (j === 0) ctx.moveTo(px, py);
        else ctx.lineTo(px, py);
      }
      ctx.closePath();
      ctx.fill();

      ctx.restore();
    }
  }

  private renderRippleRings(ctx: CanvasRenderingContext2D): void {
    for (let i = 0; i < this.ripples.length; i++) {
      const ripple = this.ripples[i];
      if (!ripple.active) continue;

      const ageFactor = 1 - ripple.radius / ripple.maxRadius;
      if (ageFactor <= 0) continue;

      const ringWidth = 8 + ageFactor * 10;
      const gradient = ctx.createRadialGradient(
        ripple.x, ripple.y, Math.max(0, ripple.radius - ringWidth),
        ripple.x, ripple.y, ripple.radius + ringWidth
      );
      gradient.addColorStop(0, 'hsla(280, 80%, 60%, 0)');
      gradient.addColorStop(0.5, `hsla(290, 95%, 70%, ${ageFactor * 0.6})`);
      gradient.addColorStop(1, 'hsla(300, 80%, 60%, 0)');

      ctx.globalCompositeOperation = 'lighter';
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius + ringWidth, 0, Math.PI * 2);
      ctx.arc(ripple.x, ripple.y, Math.max(0, ripple.radius - ringWidth), 0, Math.PI * 2, true);
      ctx.fill();
    }
  }

  private easeInOut(t: number): number {
    return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;
  }

  private easeOut(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private lerp(a: number, b: number, t: number): number {
    return a + (b - a) * t;
  }

  private lerpHue(a: number, b: number, t: number): number {
    let diff = b - a;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return (a + diff * t + 360) % 360;
  }

  private clamp(v: number, min: number, max: number): number {
    return Math.max(min, Math.min(max, v));
  }

  getCellCount(): number {
    return this.cells.length;
  }

  getTrailCount(): number {
    return this.trailParticles.length;
  }
}
