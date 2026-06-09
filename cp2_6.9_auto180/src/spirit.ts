import { GemType, GEM_CONFIGS } from './elementGem';

interface HSL {
  h: number;
  s: number;
  l: number;
}

interface OrbitParticle {
  radius: number;
  angle: number;
  speed: number;
  size: number;
  phase: number;
}

interface Tentacle {
  length: number;
  baseAngle: number;
  phase: number;
  opacity: number;
  targetOpacity: number;
}

interface FloatingText {
  text: string;
  x: number;
  y: number;
  startY: number;
  progress: number;
  duration: number;
}

interface Bubble {
  x: number;
  y: number;
  radius: number;
  progress: number;
  duration: number;
  pattern: string;
  popping: boolean;
  popProgress: number;
  popDuration: number;
  particles: { x: number; y: number; vx: number; vy: number; size: number; alpha: number }[];
}

const COLOR_TRANSITION_DURATION = 1.5;
const TENTACLE_TRANSITION_DURATION = 0.3;
const BREATH_PERIOD = 2;
const BREATH_AMPLITUDE = 0.05;
const WANDER_MIN_SPEED = 0.5;
const WANDER_MAX_SPEED = 1.5;
const WANDER_DIR_CHANGE_MIN = 2;
const WANDER_DIR_CHANGE_MAX = 4;
const BOUNCE_DURATION = 0.3;
const BUBBLE_INTERVAL = 5;
const FLOATING_TEXT_DURATION = 1;
const FLOATING_TEXT_DISTANCE = 60;

const BASE_COLOR = '#AAAAAA';

function hexToHsl(hex: string): HSL {
  const h = hex.replace('#', '');
  const r = parseInt(h.substring(0, 2), 16) / 255;
  const g = parseInt(h.substring(2, 4), 16) / 255;
  const b = parseInt(h.substring(4, 6), 16) / 255;

  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  let hue = 0, sat = 0, light = (max + min) / 2;

  if (max !== min) {
    const d = max - min;
    sat = light > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: hue = ((g - b) / d + (g < b ? 6 : 0)) / 6; break;
      case g: hue = ((b - r) / d + 2) / 6; break;
      case b: hue = ((r - g) / d + 4) / 6; break;
    }
  }
  return { h: hue * 360, s: sat * 100, l: light * 100 };
}

function hslToHex(h: number, s: number, l: number): string {
  h /= 360;
  s /= 100;
  l /= 100;
  let r: number, g: number, b: number;

  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p: number, q: number, t: number) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1 / 6) return p + (q - p) * 6 * t;
      if (t < 1 / 2) return q;
      if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1 / 3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1 / 3);
  }
  return '#' + [r, g, b].map(v => Math.round(v * 255).toString(16).padStart(2, '0')).join('');
}

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

export class Spirit {
  public x: number;
  public y: number;
  public baseRadius: number;
  public radius: number;

  private canvasWidth: number = 0;
  private canvasHeight: number = 0;

  private currentHsl: HSL;
  private targetHsl: HSL;
  private colorProgress: number = 1;

  private tentacles: Tentacle[] = [];
  private tentacleCount: number = 4;
  private tentacleTargetCount: number = 4;
  private tentacleTransitionProgress: number = 1;
  private tentaclePrevCount: number = 4;

  private emotion: number = 50;

  private breathPhase: number = 0;

  private vx: number = 0;
  private vy: number = 0;
  private wanderDirectionTimer: number = 0;
  private wanderDirectionDuration: number = 3;
  private bounceTimer: number = 0;

  private orbitParticles: OrbitParticle[] = [];

  private floatingTexts: FloatingText[] = [];
  private bubbles: Bubble[] = [];
  private bubbleTimer: number = 0;

  private absorbedGemTypes: Set<GemType> = new Set();

  constructor(x: number, y: number) {
    this.x = x;
    this.y = y;
    this.baseRadius = 50;
    this.radius = this.baseRadius;

    const baseHsl = hexToHsl(BASE_COLOR);
    this.currentHsl = { ...baseHsl };
    this.targetHsl = { ...baseHsl };

    for (let i = 0; i < 6; i++) {
      this.tentacles.push({
        length: 20 + Math.random() * 30,
        baseAngle: 0,
        phase: Math.random() * Math.PI * 2,
        opacity: i < 4 ? 1 : 0,
        targetOpacity: i < 4 ? 1 : 0
      });
    }
    this.updateTentacleAngles();

    const count = 6 + Math.floor(Math.random() * 5);
    for (let i = 0; i < count; i++) {
      this.orbitParticles.push({
        radius: 20 + Math.random() * 20,
        angle: Math.random() * Math.PI * 2,
        speed: 0.02 + Math.random() * 0.03,
        size: 1 + Math.random() * 2,
        phase: Math.random() * Math.PI * 2
      });
    }

    this.wanderDirectionDuration = WANDER_DIR_CHANGE_MIN + Math.random() * (WANDER_DIR_CHANGE_MAX - WANDER_DIR_CHANGE_MIN);
    this.setRandomWanderDirection();
  }

  public resize(width: number, height: number): void {
    const oldW = this.canvasWidth;
    const oldH = this.canvasHeight;
    this.canvasWidth = width;
    this.canvasHeight = height;
    if (oldW > 0 && oldH > 0) {
      this.x = this.x * width / oldW;
      this.y = this.y * height / oldH;
    }
    this.x = Math.max(this.radius + 10, Math.min(width - this.radius - 170, this.x));
    this.y = Math.max(this.radius + 10, Math.min(height - this.radius - 120, this.y));
  }

  private setRandomWanderDirection(): void {
    const angle = Math.random() * Math.PI * 2;
    const speed = WANDER_MIN_SPEED + Math.random() * (WANDER_MAX_SPEED - WANDER_MIN_SPEED);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
  }

  private updateTentacleAngles(): void {
    for (let i = 0; i < this.tentacles.length; i++) {
      this.tentacles[i].baseAngle = (i / this.tentacles.length) * Math.PI * 2 - Math.PI / 2;
    }
  }

  public getEmotion(): number { return this.emotion; }
  public getTentacleCount(): number { return Math.round(this.tentacleCount); }
  public getRadius(): number { return this.radius; }

  public getColorHex(): string {
    return hslToHex(this.currentHsl.h, this.currentHsl.s, this.currentHsl.l);
  }

  public absorbGem(gemType: GemType): void {
    const config = GEM_CONFIGS[gemType];

    const gemHsl = hexToHsl(config.color);
    this.targetHsl = { ...gemHsl };
    this.colorProgress = 0;

    this.tentaclePrevCount = this.tentacleCount;
    this.tentacleTargetCount = Math.max(1, Math.min(6, this.tentacleTargetCount + config.tentacleDelta));
    this.tentacleTransitionProgress = 0;

    const oldEmotion = this.emotion;
    this.emotion = Math.max(0, Math.min(100, this.emotion + config.emotionDelta));
    const delta = this.emotion - oldEmotion;
    if (delta !== 0) {
      this.floatingTexts.push({
        text: delta > 0 ? `+${delta}` : `${delta}`,
        x: this.x,
        y: this.y - this.radius - 10,
        startY: this.y - this.radius - 10,
        progress: 0,
        duration: FLOATING_TEXT_DURATION
      });
    }

    this.absorbedGemTypes.add(gemType);
    setTimeout(() => {
      const slot = this.getSlot(gemType);
      if (slot) { slot.x = slot.baseX; slot.y = slot.baseY; }
    }, 0);
  }

  private getSlot(_type: GemType): any {
    return null;
  }

  public update(dt: number): void {
    this.breathPhase += (Math.PI * 2 / BREATH_PERIOD) * dt;
    this.radius = this.baseRadius * (1 + BREATH_AMPLITUDE * Math.sin(this.breathPhase));

    if (this.colorProgress < 1) {
      this.colorProgress = Math.min(1, this.colorProgress + dt / COLOR_TRANSITION_DURATION);
      const t = easeOutCubic(this.colorProgress);
      this.currentHsl.h = this.lerpHue(this.currentHsl.h, this.targetHsl.h, t);
      this.currentHsl.s = this.currentHsl.s + (this.targetHsl.s - this.currentHsl.s) * t;
      this.currentHsl.l = this.currentHsl.l + (this.targetHsl.l - this.currentHsl.l) * t;
    }

    if (this.tentacleTransitionProgress < 1) {
      this.tentacleTransitionProgress = Math.min(1, this.tentacleTransitionProgress + dt / TENTACLE_TRANSITION_DURATION);
      const t = this.tentacleTransitionProgress;
      this.tentacleCount = this.tentaclePrevCount + (this.tentacleTargetCount - this.tentaclePrevCount) * t;

      const dispCount = Math.ceil(this.tentacleCount);
      for (let i = 0; i < this.tentacles.length; i++) {
        if (i < dispCount) {
          this.tentacles[i].targetOpacity = Math.min(1, this.tentacleCount - i);
        } else {
          this.tentacles[i].targetOpacity = 0;
        }
      }
    }

    for (const tent of this.tentacles) {
      const diff = tent.targetOpacity - tent.opacity;
      tent.opacity += diff * Math.min(1, dt / TENTACLE_TRANSITION_DURATION);
      const emotionFactor = 0.5 + (this.emotion / 100) * 1.5;
      tent.phase += (Math.PI * 2 / 1.5) * dt * emotionFactor;
    }

    this.wanderDirectionTimer += dt;
    if (this.wanderDirectionTimer >= this.wanderDirectionDuration) {
      this.wanderDirectionTimer = 0;
      this.wanderDirectionDuration = WANDER_DIR_CHANGE_MIN + Math.random() * (WANDER_DIR_CHANGE_MAX - WANDER_DIR_CHANGE_MIN);
      this.setRandomWanderDirection();
    }

    if (this.bounceTimer > 0) {
      this.bounceTimer -= dt;
    }

    this.x += this.vx;
    this.y += this.vy;

    const margin = this.radius + 5;
    const rightBound = this.canvasWidth - 170;
    const bottomBound = this.canvasHeight - 110;

    if (this.x < margin) {
      this.x = margin;
      this.vx = -this.vx * 0.7;
      this.bounceTimer = BOUNCE_DURATION;
    }
    if (this.x > rightBound) {
      this.x = rightBound;
      this.vx = -this.vx * 0.7;
      this.bounceTimer = BOUNCE_DURATION;
    }
    if (this.y < margin) {
      this.y = margin;
      this.vy = -this.vy * 0.7;
      this.bounceTimer = BOUNCE_DURATION;
    }
    if (this.y > bottomBound) {
      this.y = bottomBound;
      this.vy = -this.vy * 0.7;
      this.bounceTimer = BOUNCE_DURATION;
    }

    for (const p of this.orbitParticles) {
      p.angle += p.speed;
      p.phase += dt * 2;
    }

    for (let i = this.floatingTexts.length - 1; i >= 0; i--) {
      this.floatingTexts[i].progress += dt;
      if (this.floatingTexts[i].progress >= this.floatingTexts[i].duration) {
        this.floatingTexts.splice(i, 1);
      }
    }

    this.bubbleTimer += dt;
    if (this.bubbleTimer >= BUBBLE_INTERVAL) {
      this.bubbleTimer = 0;
      this.spawnBubble();
    }

    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      if (!b.popping) {
        b.progress += dt;
        if (b.progress >= b.duration) {
          b.popping = true;
          b.popProgress = 0;
          for (let j = 0; j < 4; j++) {
            const a = (j / 4) * Math.PI * 2;
            b.particles.push({
              x: b.x,
              y: b.y,
              vx: Math.cos(a) * 40,
              vy: Math.sin(a) * 40,
              size: 3 + Math.random() * 2,
              alpha: 1
            });
          }
        }
      } else {
        b.popProgress += dt;
        for (const p of b.particles) {
          p.x += p.vx * dt;
          p.y += p.vy * dt;
          p.alpha = Math.max(0, 1 - b.popProgress / b.popDuration);
        }
        if (b.popProgress >= b.popDuration) {
          this.bubbles.splice(i, 1);
        }
      }
    }
  }

  private lerpHue(a: number, b: number, t: number): number {
    let diff = b - a;
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;
    return (a + diff * t + 360) % 360;
  }

  private spawnBubble(): void {
    const pattern = this.determineBubblePattern();
    this.bubbles.push({
      x: this.x + (Math.random() - 0.5) * 40,
      y: this.y - this.radius - 20,
      radius: 30 + Math.random() * 20,
      progress: 0,
      duration: 2,
      pattern,
      popping: false,
      popProgress: 0,
      popDuration: 0.3,
      particles: []
    });
  }

  private determineBubblePattern(): string {
    const tc = this.tentacleTargetCount;
    if (this.absorbedGemTypes.has('light') && this.absorbedGemTypes.has('wind')) return '⚡';
    if (tc >= 6) return '★';
    if (tc <= 1) return '💧';
    if (this.emotion > 70) return '☺';
    if (this.emotion < 30) return '☹';
    return ['✨', '·', '✦', '❋'][Math.floor(Math.random() * 4)];
  }

  public render(ctx: CanvasRenderingContext2D): void {
    this.renderOrbitParticles(ctx);
    this.renderTentacles(ctx);
    this.renderBody(ctx);
    this.renderBubbles(ctx);
    this.renderFloatingTexts(ctx);
  }

  private renderOrbitParticles(ctx: CanvasRenderingContext2D): void {
    const baseColor = this.currentHsl;
    const lightColor = hslToHex(baseColor.h, baseColor.s, Math.min(95, baseColor.l + 20));

    for (const p of this.orbitParticles) {
      const alpha = 0.4 + 0.2 * (0.5 + 0.5 * Math.sin(p.phase));
      const px = this.x + Math.cos(p.angle) * p.radius;
      const py = this.y + Math.sin(p.angle) * p.radius;

      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = lightColor;
      ctx.shadowColor = lightColor;
      ctx.shadowBlur = 8;
      ctx.beginPath();
      ctx.arc(px, py, p.size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  private renderTentacles(ctx: CanvasRenderingContext2D): void {
    const color = this.currentHsl;
    const tentacleColor = `hsla(${color.h}, ${color.s}%, ${Math.min(80, color.l + 10)}%, `;

    for (let i = 0; i < this.tentacles.length; i++) {
      const tent = this.tentacles[i];
      if (tent.opacity <= 0.01) continue;

      const swing = 0.3 * Math.sin(tent.phase);
      const ang = tent.baseAngle + swing;
      const length = tent.length;

      const x1 = this.x + Math.cos(ang) * this.radius * 0.8;
      const y1 = this.y + Math.sin(ang) * this.radius * 0.8;

      const midAng = ang + swing * 0.5;
      const cx = this.x + Math.cos(midAng) * (this.radius + length * 0.6);
      const cy = this.y + Math.sin(midAng) * (this.radius + length * 0.6);

      const tipAng = ang + swing;
      const x2 = this.x + Math.cos(tipAng) * (this.radius + length);
      const y2 = this.y + Math.sin(tipAng) * (this.radius + length);

      ctx.save();
      ctx.strokeStyle = tentacleColor + (tent.opacity * 0.6) + ')';
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cx, cy, x2, y2);
      ctx.stroke();
      ctx.restore();
    }
  }

  private renderBody(ctx: CanvasRenderingContext2D): void {
    const color = this.currentHsl;
    const glowColor = `hsla(${color.h}, ${color.s}%, ${color.l}%, 0.4)`;
    const mainColor = `hsl(${color.h}, ${color.s}%, ${color.l}%)`;
    const highlightColor = `hsl(${color.h}, ${color.s}%, ${Math.min(95, color.l + 25)}%)`;

    ctx.save();
    ctx.shadowColor = mainColor;
    ctx.shadowBlur = 30;

    const grad = ctx.createRadialGradient(
      this.x - this.radius * 0.3, this.y - this.radius * 0.3, 0,
      this.x, this.y, this.radius
    );
    grad.addColorStop(0, highlightColor);
    grad.addColorStop(0.5, mainColor);
    grad.addColorStop(1, glowColor);

    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();
    ctx.restore();

    ctx.save();
    ctx.beginPath();
    ctx.arc(this.x - this.radius * 0.25, this.y - this.radius * 0.25, this.radius * 0.2, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.fill();
    ctx.restore();
  }

  private renderBubbles(ctx: CanvasRenderingContext2D): void {
    for (const b of this.bubbles) {
      if (!b.popping) {
        const lifeRatio = b.progress / b.duration;
        const alpha = lifeRatio < 0.1 ? lifeRatio / 0.1 : (lifeRatio > 0.9 ? (1 - lifeRatio) / 0.1 : 1);
        const floatY = -15 * lifeRatio;

        ctx.save();
        ctx.globalAlpha = alpha * 0.9;
        ctx.strokeStyle = 'rgba(255,255,255,0.6)';
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        ctx.arc(b.x, b.y + floatY, b.radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();

        ctx.fillStyle = 'rgba(255,255,255,0.9)';
        ctx.font = `${Math.round(b.radius * 0.9)}px sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(b.pattern, b.x, b.y + floatY);
        ctx.restore();
      } else {
        for (const p of b.particles) {
          if (p.alpha <= 0) continue;
          ctx.save();
          ctx.globalAlpha = p.alpha;
          ctx.fillStyle = 'rgba(255,255,255,0.9)';
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - b.popProgress / b.popDuration), 0, Math.PI * 2);
          ctx.fill();
          ctx.restore();
        }
      }
    }
  }

  private renderFloatingTexts(ctx: CanvasRenderingContext2D): void {
    for (const t of this.floatingTexts) {
      const ratio = t.progress / t.duration;
      const alpha = 1 - ratio;
      const y = t.startY - FLOATING_TEXT_DISTANCE * ratio;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#FFFFFF';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.shadowColor = '#000';
      ctx.shadowBlur = 4;
      ctx.fillText(t.text, t.x, y);
      ctx.restore();
    }
  }
}
