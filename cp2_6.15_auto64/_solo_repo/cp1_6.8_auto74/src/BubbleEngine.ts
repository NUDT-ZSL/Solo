import { BubbleData, MoodColor } from './types';
import {
  BUBBLE_MIN_RADIUS,
  BUBBLE_MAX_RADIUS,
  BUBBLE_FLOAT_SPEED_MIN,
  BUBBLE_FLOAT_SPEED_MAX,
  BUBBLE_DRIFT_SPEED,
  BUBBLE_BREATH_SPEED_MIN,
  BUBBLE_BREATH_SPEED_MAX,
  BUBBLE_BREATH_AMPLITUDE,
  BUBBLE_FADE_IN_DURATION,
  BUBBLE_HOVER_SCALE,
  BUBBLE_HIT_PADDING,
} from './constants';

function easeOutCubic(t: number): number {
  return 1 - Math.pow(1 - t, 3);
}

function withAlpha(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r},${g},${b},${alpha})`;
}

let nextBubbleId = 0;

export class BubbleEngine {
  bubbles: BubbleData[] = [];
  width: number;
  height: number;

  constructor(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  resize(width: number, height: number) {
    this.width = width;
    this.height = height;
  }

  addBubble(diaryId: string, color: MoodColor, delay: number = 0): BubbleData {
    const radius =
      BUBBLE_MIN_RADIUS + Math.random() * (BUBBLE_MAX_RADIUS - BUBBLE_MIN_RADIUS);
    const bubble: BubbleData = {
      id: `bubble_${nextBubbleId++}`,
      diaryId,
      x: radius + Math.random() * (this.width - radius * 2),
      y: radius + Math.random() * (this.height - radius * 2),
      vx: (Math.random() - 0.5) * BUBBLE_DRIFT_SPEED * 2,
      vy: (Math.random() - 0.5) * BUBBLE_DRIFT_SPEED * 2,
      radius,
      color,
      opacity: 0,
      scale: 0,
      targetScale: 1,
      phase: Math.random() * Math.PI * 2,
      breathPhase: Math.random() * Math.PI * 2,
      floatAmplitude: 8 + Math.random() * 12,
      floatSpeed:
        BUBBLE_FLOAT_SPEED_MIN +
        Math.random() * (BUBBLE_FLOAT_SPEED_MAX - BUBBLE_FLOAT_SPEED_MIN),
      breathSpeed:
        BUBBLE_BREATH_SPEED_MIN +
        Math.random() * (BUBBLE_BREATH_SPEED_MAX - BUBBLE_BREATH_SPEED_MIN),
      fadeInAt: Date.now() + delay,
      hovered: false,
    };
    this.bubbles.push(bubble);
    return bubble;
  }

  getDisplayY(b: BubbleData): number {
    return b.y + Math.sin(b.phase) * b.floatAmplitude;
  }

  update(dt: number) {
    const now = Date.now();
    for (const b of this.bubbles) {
      const elapsed = now - b.fadeInAt;
      if (elapsed < 0) {
        b.opacity = 0;
        b.scale = 0;
      } else if (elapsed < BUBBLE_FADE_IN_DURATION) {
        const t = elapsed / BUBBLE_FADE_IN_DURATION;
        b.opacity = easeOutCubic(t);
      } else {
        b.opacity = 1;
      }

      b.breathPhase += b.breathSpeed * dt * 0.001;
      b.phase += b.floatSpeed * dt * 0.001;

      const breathScale = 1 + Math.sin(b.breathPhase) * BUBBLE_BREATH_AMPLITUDE;
      const hoverTarget = b.hovered ? BUBBLE_HOVER_SCALE : 1;
      const targetScale = hoverTarget * breathScale;
      b.targetScale = targetScale;
      b.scale += (b.targetScale - b.scale) * 0.08;

      b.x += b.vx;
      b.y += b.vy;

      const r = b.radius;
      if (b.x - r < 0) {
        b.x = r;
        b.vx = Math.abs(b.vx);
      }
      if (b.x + r > this.width) {
        b.x = this.width - r;
        b.vx = -Math.abs(b.vx);
      }
      if (b.y - r < 0) {
        b.y = r;
        b.vy = Math.abs(b.vy);
      }
      if (b.y + r > this.height) {
        b.y = this.height - r;
        b.vy = -Math.abs(b.vy);
      }
    }

    for (let i = 0; i < this.bubbles.length; i++) {
      for (let j = i + 1; j < this.bubbles.length; j++) {
        this.resolveCollision(this.bubbles[i], this.bubbles[j]);
      }
    }
  }

  private resolveCollision(a: BubbleData, b: BubbleData) {
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.sqrt(dx * dx + dy * dy);
    const minDist = a.radius * Math.max(a.scale, 0.01) + b.radius * Math.max(b.scale, 0.01) + BUBBLE_HIT_PADDING;

    if (dist < minDist && dist > 0.01) {
      const nx = dx / dist;
      const ny = dy / dist;
      const overlap = minDist - dist;

      a.x -= nx * overlap * 0.5;
      a.y -= ny * overlap * 0.5;
      b.x += nx * overlap * 0.5;
      b.y += ny * overlap * 0.5;

      const relVx = a.vx - b.vx;
      const relVy = a.vy - b.vy;
      const relVn = relVx * nx + relVy * ny;

      if (relVn > 0) {
        a.vx -= relVn * nx * 0.5;
        a.vy -= relVn * ny * 0.5;
        b.vx += relVn * nx * 0.5;
        b.vy += relVn * ny * 0.5;
      }
    }
  }

  hitTest(mx: number, my: number): BubbleData | null {
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      if (b.opacity < 0.3) continue;
      const displayY = this.getDisplayY(b);
      const dx = mx - b.x;
      const dy = my - displayY;
      const effectiveR = b.radius * Math.max(b.scale, 0.01);
      if (dx * dx + dy * dy <= effectiveR * effectiveR) {
        return b;
      }
    }
    return null;
  }

  render(ctx: CanvasRenderingContext2D) {
    for (const b of this.bubbles) {
      if (b.opacity <= 0) continue;
      const r = b.radius * Math.max(b.scale, 0.01);
      if (r <= 0.5) continue;

      const displayY = this.getDisplayY(b);

      ctx.save();
      ctx.globalAlpha = b.opacity * 0.75;

      ctx.shadowColor = b.color;
      ctx.shadowBlur = 20 + Math.sin(b.breathPhase) * 8;

      const gradient = ctx.createRadialGradient(
        b.x - r * 0.25,
        displayY - r * 0.25,
        r * 0.1,
        b.x,
        displayY,
        r
      );
      gradient.addColorStop(0, withAlpha(b.color, 0.95));
      gradient.addColorStop(0.5, withAlpha(b.color, 0.55));
      gradient.addColorStop(1, withAlpha(b.color, 0.12));

      ctx.beginPath();
      ctx.arc(b.x, displayY, r, 0, Math.PI * 2);
      ctx.fillStyle = gradient;
      ctx.fill();

      ctx.shadowBlur = 0;
      ctx.globalAlpha = b.opacity * 0.45;

      const highlightGrad = ctx.createRadialGradient(
        b.x - r * 0.3,
        displayY - r * 0.35,
        r * 0.05,
        b.x - r * 0.1,
        displayY - r * 0.15,
        r * 0.55
      );
      highlightGrad.addColorStop(0, 'rgba(255,255,255,0.85)');
      highlightGrad.addColorStop(1, 'rgba(255,255,255,0)');

      ctx.beginPath();
      ctx.arc(b.x, displayY, r, 0, Math.PI * 2);
      ctx.fillStyle = highlightGrad;
      ctx.fill();

      ctx.restore();
    }
  }
}
