import type { Cell, Ripple, ColorBurst, InteractionData } from './types';

const HEX_SIZE = 26;
const HEX_WIDTH = HEX_SIZE * Math.sqrt(3);
const HEX_HEIGHT = HEX_SIZE * 2;
const ROW_SPACING = HEX_HEIGHT * 0.75;
const COL_SPACING = HEX_WIDTH;

const SPRING_STIFFNESS = 0.06;
const SPRING_DAMPING = 0.86;
const BROWNIAN_AMPLITUDE = 1.2;
const WAVE_AMPLITUDE = 2.5;
const WAVE_FREQUENCY = 0.004;

const IDLE_TIMEOUT = 3000;
const IDLE_DAMPING_FACTOR = 0.2;

const TRAIL_LIFETIME = 500;
const EXPLODE_DURATION = 1500;
const COLOR_TRANSITION_FAST = 300;
const COLOR_TRANSITION_NORMAL = 800;
const COLOR_TRANSITION_SLOW = 1500;

export class GridManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private cells: Cell[] = [];
  private ripples: Ripple[] = [];
  private colorBursts: ColorBurst[] = [];
  private width: number = 0;
  private height: number = 0;
  private lastInteractionTime: number = 0;
  private isIdle: boolean = false;
  private idleFactor: number = 1;
  private hexPath: Path2D | null = null;
  private time: number = 0;
  private cols: number = 0;
  private rows: number = 0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d', { alpha: false })!;
    this.resize();
    this.precomputeHexPath();
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
    this.cols = Math.ceil(this.width / COL_SPACING) + 2;
    this.rows = Math.ceil(this.height / ROW_SPACING) + 2;

    for (let row = 0; row < this.rows; row++) {
      for (let col = 0; col < this.cols; col++) {
        const offsetX = row % 2 === 1 ? COL_SPACING / 2 : 0;
        const baseX = col * COL_SPACING + offsetX - COL_SPACING;
        const baseY = row * ROW_SPACING - HEX_SIZE;

        const nx = col / this.cols;
        const ny = row / this.rows;
        const gradientT = nx * 0.6 + ny * 0.4;

        const baseHue = this.lerpHue(220, 15, gradientT);
        const satBase = this.lerp(45, 55, gradientT);
        const lightBase = this.lerp(22, 28, gradientT);

        this.cells.push({
          baseX,
          baseY,
          currentX: baseX,
          currentY: baseY,
          velocityX: 0,
          velocityY: 0,
          baseHue,
          targetHue: baseHue,
          currentHue: baseHue,
          baseSaturation: satBase,
          targetSaturation: satBase,
          currentSaturation: satBase,
          baseLightness: lightBase,
          targetLightness: lightBase,
          currentLightness: lightBase,
          hueTransitionStart: 0,
          hueTransitionEnd: 0,
          satTransitionStart: 0,
          satTransitionEnd: 0,
          lightTransitionStart: 0,
          lightTransitionEnd: 0,
          size: HEX_SIZE,
          brownianPhase: Math.random() * Math.PI * 2,
          brownianSpeed: 0.3 + Math.random() * 0.4,
          trail: [],
          isExploding: false,
          explodeStartTime: 0,
          explodeDirectionX: 0,
          explodeDirectionY: 0,
          explodeDistance: 0,
        });
      }
    }
  }

  handleInteraction(data: InteractionData): void {
    this.lastInteractionTime = data.timestamp;
    this.isIdle = false;
    this.idleFactor = 1;

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

    const influenceRadius = 80 + Math.min(speed * 3, 120);
    const radiusSq = influenceRadius * influenceRadius;

    let hueShift = 0;
    const dirX = Math.abs(data.velocityX) > 0.01 ? Math.sign(data.velocityX) : 0;
    const dirY = Math.abs(data.velocityY) > 0.01 ? Math.sign(data.velocityY) : 0;

    if (dirX < 0) hueShift = 200;
    else if (dirX > 0) hueShift = 350;
    else if (dirY < 0) hueShift = 290;
    else if (dirY > 0) hueShift = 130;

    const pushFactor = Math.min(speed * 0.08, 3);
    const dirNormX = data.velocityX / (speed || 1);
    const dirNormY = data.velocityY / (speed || 1);

    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      const dx = cell.currentX - data.x;
      const dy = cell.currentY - data.y;
      const distSq = dx * dx + dy * dy;

      if (distSq < radiusSq) {
        const dist = Math.sqrt(distSq);
        const falloff = 1 - dist / influenceRadius;
        const falloffSq = falloff * falloff;

        const pushStrength = pushFactor * falloffSq;
        const perpX = -dirNormY;
        const perpY = dirNormX;
        const spread = (Math.random() - 0.5) * 0.6;

        cell.velocityX += (dirNormX + perpX * spread) * pushStrength;
        cell.velocityY += (dirNormY + perpY * spread) * pushStrength;

        if (hueShift !== 0) {
          const intensity = falloffSq;
          const newHue = (hueShift + (Math.random() - 0.5) * 20 + 360) % 360;
          const transitionDur = COLOR_TRANSITION_FAST + intensity * COLOR_TRANSITION_NORMAL;
          this.setHueTransition(cell, newHue, transitionDur, data.timestamp);
          this.setSatTransition(cell, 90 * intensity + cell.baseSaturation * (1 - intensity), COLOR_TRANSITION_FAST, data.timestamp);
          this.setLightTransition(cell, 55 * intensity + cell.baseLightness * (1 - intensity), COLOR_TRANSITION_FAST, data.timestamp);
        }
      }
    }
  }

  private handleMouseDown(data: InteractionData): void {
    this.ripples.push({
      x: data.x,
      y: data.y,
      radius: 0,
      maxRadius: 250,
      speed: 380,
      strength: 1,
      startTime: data.timestamp,
      active: true,
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

    const burstRadius = 50;
    const radiusSq = burstRadius * burstRadius;

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
        const power = 40 + Math.random() * 80;

        cell.isExploding = true;
        cell.explodeStartTime = data.timestamp;
        cell.explodeDirectionX = Math.cos(angle);
        cell.explodeDirectionY = Math.sin(angle);
        cell.explodeDistance = power * falloffSq;

        cell.velocityX = Math.cos(angle) * 8 * falloffSq;
        cell.velocityY = Math.sin(angle) * 8 * falloffSq;

        const vividHues = [200, 290, 330, 130, 170];
        const burstHue = vividHues[Math.floor(Math.random() * vividHues.length)];
        this.setHueTransition(cell, burstHue, COLOR_TRANSITION_FAST, data.timestamp);
        this.setSatTransition(cell, 100, COLOR_TRANSITION_FAST, data.timestamp);
        this.setLightTransition(cell, 60, COLOR_TRANSITION_FAST, data.timestamp);

        for (let t = 0; t < 3; t++) {
          cell.trail.push({
            x: cell.currentX,
            y: cell.currentY,
            hue: burstHue,
            saturation: 100,
            lightness: 70,
            alpha: 0.9,
            birthTime: data.timestamp,
            lifetime: TRAIL_LIFETIME,
          });
        }
      }
    }
  }

  private setHueTransition(cell: Cell, target: number, duration: number, now: number): void {
    cell.targetHue = target;
    cell.hueTransitionStart = now;
    cell.hueTransitionEnd = now + duration;
  }

  private setSatTransition(cell: Cell, target: number, duration: number, now: number): void {
    cell.targetSaturation = target;
    cell.satTransitionStart = now;
    cell.satTransitionEnd = now + duration;
  }

  private setLightTransition(cell: Cell, target: number, duration: number, now: number): void {
    cell.targetLightness = target;
    cell.lightTransitionStart = now;
    cell.lightTransitionEnd = now + duration;
  }

  update(deltaTime: number, now: number): void {
    this.time += deltaTime;
    const dt = Math.min(deltaTime / 16.67, 3);

    if (now - this.lastInteractionTime > IDLE_TIMEOUT) {
      this.isIdle = true;
      this.idleFactor = Math.max(this.idleFactor - dt * 0.015, IDLE_DAMPING_FACTOR);
    }

    this.updateRipples(dt, now);
    this.updateColorBursts(dt, now);
    this.updateCells(dt, now);
  }

  private updateRipples(dt: number, now: number): void {
    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const ripple = this.ripples[i];
      if (!ripple.active) {
        this.ripples.splice(i, 1);
        continue;
      }

      ripple.radius += ripple.speed * dt * 0.06;
      const ringWidth = 25;
      const ageFactor = 1 - ripple.radius / ripple.maxRadius;

      if (ripple.radius >= ripple.maxRadius) {
        ripple.active = false;
        continue;
      }

      const rippleStrength = ripple.strength * ageFactor;
      const innerRadius = ripple.radius - ringWidth;
      const outerRadius = ripple.radius + ringWidth;
      const innerSq = innerRadius * innerRadius;
      const outerSq = outerRadius * outerRadius;

      for (let j = 0; j < this.cells.length; j++) {
        const cell = this.cells[j];
        const dx = cell.baseX - ripple.x;
        const dy = cell.baseY - ripple.y;
        const distSq = dx * dx + dy * dy;

        if (distSq > innerSq && distSq < outerSq) {
          const dist = Math.sqrt(distSq);
          const ringDist = dist - ripple.radius;
          const ringFalloff = 1 - Math.abs(ringDist) / ringWidth;
          if (ringFalloff <= 0) continue;

          const strength = rippleStrength * ringFalloff * ringFalloff;
          const nx = dx / dist;
          const ny = dy / dist;

          cell.velocityX += nx * strength * 5;
          cell.velocityY += ny * strength * 5;

          const rippleHue = (280 + ringDist * 2 + 360) % 360;
          this.setHueTransition(cell, rippleHue, COLOR_TRANSITION_NORMAL, now);
          this.setSatTransition(cell, cell.baseSaturation + 35 * strength, COLOR_TRANSITION_FAST, now);
          this.setLightTransition(cell, cell.baseLightness + 25 * strength, COLOR_TRANSITION_FAST, now);
        }
      }
    }
  }

  private updateColorBursts(_dt: number, now: number): void {
    for (let i = this.colorBursts.length - 1; i >= 0; i--) {
      const burst = this.colorBursts[i];
      if (!burst.active || now - burst.startTime > burst.duration) {
        burst.active = false;
        this.colorBursts.splice(i, 1);
      }
    }
  }

  private updateCells(dt: number, now: number): void {
    const globalDamping = this.isIdle ? (1 - (1 - this.idleFactor) * 0.5) : 1;

    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      const timeSec = this.time / 1000;

      const waveX = Math.sin(timeSec * 1.2 + cell.baseX * WAVE_FREQUENCY + cell.brownianPhase) * WAVE_AMPLITUDE;
      const waveY = Math.cos(timeSec * 0.9 + cell.baseY * WAVE_FREQUENCY + cell.brownianPhase * 1.3) * WAVE_AMPLITUDE;

      const brownX = Math.sin(timeSec * cell.brownianSpeed * 2 + cell.brownianPhase) * BROWNIAN_AMPLITUDE * this.idleFactor;
      const brownY = Math.cos(timeSec * cell.brownianSpeed * 1.7 + cell.brownianPhase * 1.5) * BROWNIAN_AMPLITUDE * this.idleFactor;

      let targetX = cell.baseX + waveX + brownX;
      let targetY = cell.baseY + waveY + brownY;

      if (cell.isExploding) {
        const elapsed = now - cell.explodeStartTime;
        const t = Math.min(elapsed / EXPLODE_DURATION, 1);

        if (t < 0.35) {
          const explodeT = t / 0.35;
          const explodeEase = this.easeOut(explodeT);
          targetX += cell.explodeDirectionX * cell.explodeDistance * explodeEase;
          targetY += cell.explodeDirectionY * cell.explodeDistance * explodeEase;
        } else {
          const returnT = (t - 0.35) / 0.65;
          const returnEase = this.easeInOut(returnT);
          const peakDist = cell.explodeDistance;
          const currentDist = peakDist * (1 - returnEase);
          targetX += cell.explodeDirectionX * currentDist;
          targetY += cell.explodeDirectionY * currentDist;
        }

        if (t >= 1) {
          cell.isExploding = false;
          this.setHueTransition(cell, cell.baseHue, COLOR_TRANSITION_SLOW, now);
          this.setSatTransition(cell, cell.baseSaturation, COLOR_TRANSITION_SLOW, now);
          this.setLightTransition(cell, cell.baseLightness, COLOR_TRANSITION_SLOW, now);
        }
      }

      cell.velocityX *= SPRING_DAMPING;
      cell.velocityY *= SPRING_DAMPING;

      const forceX = (targetX - cell.currentX) * SPRING_STIFFNESS;
      const forceY = (targetY - cell.currentY) * SPRING_STIFFNESS;
      cell.velocityX += forceX * dt;
      cell.velocityY += forceY * dt;

      cell.velocityX *= globalDamping;
      cell.velocityY *= globalDamping;

      cell.currentX += cell.velocityX * dt;
      cell.currentY += cell.velocityY * dt;

      this.updateColorTransitions(cell, now);

      if (cell.trail.length > 0) {
        const shouldAddTrail = cell.isExploding || (Math.abs(cell.velocityX) + Math.abs(cell.velocityY) > 2.5);
        if (shouldAddTrail && now % 3 < 2) {
          cell.trail.push({
            x: cell.currentX,
            y: cell.currentY,
            hue: cell.currentHue,
            saturation: cell.currentSaturation,
            lightness: cell.currentLightness + 10,
            alpha: 0.7,
            birthTime: now,
            lifetime: TRAIL_LIFETIME,
          });
        }

        for (let t = cell.trail.length - 1; t >= 0; t--) {
          const tp = cell.trail[t];
          const life = now - tp.birthTime;
          if (life > tp.lifetime) {
            cell.trail.splice(t, 1);
          } else {
            tp.alpha = 0.7 * (1 - life / tp.lifetime);
          }
        }

        if (cell.trail.length > 12) {
          cell.trail.splice(0, cell.trail.length - 12);
        }
      }
    }
  }

  private updateColorTransitions(cell: Cell, now: number): void {
    if (now < cell.hueTransitionEnd) {
      const t = Math.min((now - cell.hueTransitionStart) / (cell.hueTransitionEnd - cell.hueTransitionStart), 1);
      const ease = this.easeInOut(t);
      cell.currentHue = this.lerpHue(cell.currentHue, cell.targetHue, ease * 0.15);
    } else if (!cell.isExploding) {
      cell.currentHue = this.lerpHue(cell.currentHue, cell.baseHue, 0.01);
    }

    if (now < cell.satTransitionEnd) {
      const t = Math.min((now - cell.satTransitionStart) / (cell.satTransitionEnd - cell.satTransitionStart), 1);
      const ease = this.easeInOut(t);
      cell.currentSaturation = this.lerp(cell.currentSaturation, cell.targetSaturation, ease * 0.2);
    } else if (!cell.isExploding) {
      cell.currentSaturation = this.lerp(cell.currentSaturation, cell.baseSaturation, 0.015);
    }

    if (now < cell.lightTransitionEnd) {
      const t = Math.min((now - cell.lightTransitionStart) / (cell.lightTransitionEnd - cell.lightTransitionStart), 1);
      const ease = this.easeInOut(t);
      cell.currentLightness = this.lerp(cell.currentLightness, cell.targetLightness, ease * 0.2);
    } else if (!cell.isExploding) {
      cell.currentLightness = this.lerp(cell.currentLightness, cell.baseLightness, 0.015);
    }
  }

  render(_now: number): void {
    const ctx = this.ctx;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, this.width, this.height);

    ctx.globalCompositeOperation = 'lighter';

    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      if (cell.currentX < -HEX_SIZE * 2 || cell.currentX > this.width + HEX_SIZE * 2 ||
          cell.currentY < -HEX_SIZE * 2 || cell.currentY > this.height + HEX_SIZE * 2) {
        continue;
      }

      if (cell.trail.length > 1) {
        ctx.beginPath();
        ctx.moveTo(cell.trail[0].x, cell.trail[0].y);
        for (let t = 1; t < cell.trail.length; t++) {
          ctx.lineTo(cell.trail[t].x, cell.trail[t].y);
        }
        const last = cell.trail[cell.trail.length - 1];
        ctx.strokeStyle = `hsla(${last.hue}, ${last.saturation}%, ${last.lightness}%, ${last.alpha * 0.5})`;
        ctx.lineWidth = HEX_SIZE * 0.6;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.stroke();
      }
    }

    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      if (cell.currentX < -HEX_SIZE * 2 || cell.currentX > this.width + HEX_SIZE * 2 ||
          cell.currentY < -HEX_SIZE * 2 || cell.currentY > this.height + HEX_SIZE * 2) {
        continue;
      }

      ctx.save();
      ctx.translate(cell.currentX, cell.currentY);

      const hue = cell.currentHue;
      const sat = cell.currentSaturation;
      const light = cell.currentLightness;

      const gradient = ctx.createRadialGradient(0, 0, HEX_SIZE * 0.1, 0, 0, HEX_SIZE);
      gradient.addColorStop(0, `hsla(${hue}, ${sat}%, ${Math.min(light + 15, 85)}%, 0.95)`);
      gradient.addColorStop(0.5, `hsla(${hue}, ${sat}%, ${light}%, 0.85)`);
      gradient.addColorStop(1, `hsla(${hue}, ${Math.max(sat - 10, 0)}%, ${Math.max(light - 12, 5)}%, 0.7)`);

      ctx.fillStyle = gradient;
      ctx.fill(this.hexPath!);

      ctx.restore();
    }

    ctx.globalCompositeOperation = 'source-over';

    for (let i = 0; i < this.ripples.length; i++) {
      const ripple = this.ripples[i];
      if (!ripple.active) continue;
      const ageFactor = 1 - ripple.radius / ripple.maxRadius;
      if (ageFactor <= 0) continue;

      ctx.beginPath();
      ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
      ctx.strokeStyle = `hsla(280, 90%, 65%, ${ageFactor * 0.4})`;
      ctx.lineWidth = 3 * ageFactor + 1;
      ctx.stroke();
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

  getCellCount(): number {
    return this.cells.length;
  }
}
