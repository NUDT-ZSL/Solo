export type StyleType = 'minimal' | 'cyber' | 'natural';

export type ShapeType = 'circle' | 'triangle' | 'hexagon' | 'diamond' | 'ellipse' | 'teardrop';

export interface Shape {
  type: ShapeType;
  x: number;
  y: number;
  baseX: number;
  baseY: number;
  scale: number;
  baseScale: number;
  fillColor: string;
  strokeColor: string;
  rotation: number;
  rotationSpeed: number;
  rotationDirection: number;
  size: number;
  opacity: number;
  targetOpacity: number;
  wobblePhase: number;
  wobbleAmplitude: number;
  entryDelay: number;
  entryProgress: number;
  flickerPhase: number;
  flickerSpeed: number;
}

export interface RippleRing {
  radius: number;
  maxRadius: number;
  opacity: number;
}

export interface RippleEffect {
  rings: RippleRing[];
  active: boolean;
  startTime: number;
}

const COLOR_PALETTES: Record<StyleType, string[]> = {
  minimal: ['#FFFFFF', '#333333', '#666666', '#999999', '#CCCCCC', '#FF6B6B', '#4ECDC4', '#45B7D1', '#96CEB4', '#FFEAA7'],
  cyber: ['#FF00FF', '#00FFFF', '#FF0080', '#00FF80', '#8000FF', '#0080FF', '#FF40FF', '#40FFFF', '#FFFFFF', '#1a1a2e'],
  natural: ['#8B4513', '#228B22', '#F5DEB3', '#A0522D', '#6B8E23', '#D2B48C', '#556B2F', '#DEB887', '#8FBC8F', '#CD853F']
};

const SHAPE_TYPES_BY_STYLE: Record<StyleType, ShapeType[]> = {
  minimal: ['circle', 'triangle', 'hexagon', 'diamond'],
  cyber: ['circle', 'triangle', 'hexagon', 'diamond'],
  natural: ['ellipse', 'teardrop', 'circle', 'ellipse']
};

class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed;
  }

  next(): number {
    this.seed = (this.seed * 9301 + 49297) % 233280;
    return this.seed / 233280;
  }

  range(min: number, max: number): number {
    return min + this.next() * (max - min);
  }

  int(min: number, max: number): number {
    return Math.floor(this.range(min, max + 1));
  }

  pick<T>(arr: T[]): T {
    return arr[Math.floor(this.next() * arr.length)];
  }
}

function darkenColor(hex: string, percent: number): string {
  const num = parseInt(hex.replace('#', ''), 16);
  const amt = Math.round(2.55 * percent);
  const R = Math.max((num >> 16) - amt, 0);
  const G = Math.max(((num >> 8) & 0x00FF) - amt, 0);
  const B = Math.max((num & 0x0000FF) - amt, 0);
  return `#${(0x1000000 + R * 0x10000 + G * 0x100 + B).toString(16).slice(1)}`;
}

function getShapeCount(style: StyleType, rng: SeededRandom): number {
  switch (style) {
    case 'minimal':
      return rng.int(3, 5);
    case 'cyber':
      return rng.int(8, 12);
    case 'natural':
      return rng.int(5, 8);
    default:
      return 5;
  }
}

export class BadgeEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private shapes: Shape[] = [];
  private text: string = '';
  private style: StyleType = 'minimal';
  private centerX: number = 200;
  private centerY: number = 200;
  private overallRotation: number = 0;
  private overallDirection: number = 1;
  private lastDirectionChange: number = 0;
  private directionChangeInterval: number = 3000;
  private overallSpeed: number = 0.2;
  private ripple: RippleEffect = { rings: [], active: false, startTime: 0 };
  private animationStartTime: number = 0;
  private isAnimating: boolean = false;
  private entryDuration: number = 300;
  private baseSize: number = 50;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Cannot get 2D context');
    this.ctx = ctx;
    this.centerX = canvas.width / 2;
    this.centerY = canvas.height / 2;
    this.baseSize = canvas.width * 0.125;
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
    this.baseSize = width * 0.125;
  }

  generateBadge(text: string, style: StyleType): void {
    this.text = text;
    this.style = style;
    this.shapes = [];

    const cleanText = text.trim() || 'BADGE';
    let seed = 0;
    for (let i = 0; i < cleanText.length; i++) {
      seed += cleanText.charCodeAt(i) * (i + 1);
    }
    const rng = new SeededRandom(seed);

    const palette = COLOR_PALETTES[style];
    const shapeTypes = SHAPE_TYPES_BY_STYLE[style];
    const count = getShapeCount(style, rng);

    for (let i = 0; i < count; i++) {
      const charCode = cleanText.charCodeAt(i % cleanText.length);
      const charSeed = new SeededRandom(charCode * (i + 1) + seed);

      const angle = (i / count) * Math.PI * 2 + rng.range(-0.3, 0.3);
      const distance = rng.range(20, this.baseSize * 1.2);
      const offsetX = rng.range(-30, 30);
      const offsetY = rng.range(-30, 30);

      const baseX = this.centerX + Math.cos(angle) * distance + offsetX;
      const baseY = this.centerY + Math.sin(angle) * distance + offsetY;

      const scale = rng.range(0.5, 1.5);
      const size = this.baseSize * scale;

      const colorIndex = (charCode + i) % palette.length;
      const fillColor = palette[colorIndex];
      const strokeColor = darkenColor(fillColor, 30);

      const isEvenIndex = i % 2 === 0;
      const rotationSpeed = rng.range(0.5, 3);

      const shape: Shape = {
        type: charSeed.pick(shapeTypes),
        x: baseX,
        y: baseY,
        baseX,
        baseY,
        scale,
        baseScale: scale,
        fillColor,
        strokeColor,
        rotation: rng.range(0, Math.PI * 2),
        rotationSpeed,
        rotationDirection: isEvenIndex ? 1 : -1,
        size,
        opacity: 0,
        targetOpacity: style === 'natural' ? rng.range(0.6, 0.85) : 1,
        wobblePhase: rng.range(0, Math.PI * 2),
        wobbleAmplitude: rng.range(2, 4),
        entryDelay: i * 30,
        entryProgress: 0,
        flickerPhase: rng.range(0, Math.PI * 2),
        flickerSpeed: rng.range(1, 3)
      };

      this.shapes.push(shape);
    }

    this.animationStartTime = performance.now();
    this.isAnimating = true;
    this.lastDirectionChange = performance.now();
    this.overallDirection = 1;
    this.triggerRipple();
  }

  private triggerRipple(): void {
    const rings: RippleRing[] = [];
    for (let i = 0; i < 12; i++) {
      rings.push({
        radius: 0,
        maxRadius: 80 + i * 5,
        opacity: 0.3 - i * 0.02
      });
    }
    this.ripple = { rings, active: true, startTime: performance.now() };
  }

  update(deltaTime: number, currentTime: number): void {
    if (currentTime - this.lastDirectionChange > this.directionChangeInterval) {
      this.overallDirection *= -1;
      this.lastDirectionChange = currentTime;
    }

    this.overallRotation += this.overallSpeed * this.overallDirection * (deltaTime / 16.67);

    const entryElapsed = currentTime - this.animationStartTime;

    for (let i = 0; i < this.shapes.length; i++) {
      const shape = this.shapes[i];

      const effectiveDelay = Math.max(0, entryElapsed - shape.entryDelay);
      if (effectiveDelay < this.entryDuration) {
        shape.entryProgress = effectiveDelay / this.entryDuration;
        const ease = this.easeOutBack(shape.entryProgress);
        shape.opacity = shape.targetOpacity * ease;
        shape.scale = shape.baseScale * ease;

        const scatterOffset = (1 - ease) * 100;
        const angle = (i / this.shapes.length) * Math.PI * 2 + Math.PI;
        shape.x = shape.baseX + Math.cos(angle) * scatterOffset;
        shape.y = shape.baseY + Math.sin(angle) * scatterOffset;
      } else {
        shape.entryProgress = 1;
        shape.opacity = shape.targetOpacity;
        shape.scale = shape.baseScale;
        shape.x = shape.baseX;
        shape.y = shape.baseY;
      }

      shape.rotation += shape.rotationSpeed * shape.rotationDirection * (Math.PI / 180) * (deltaTime / 16.67);

      shape.wobblePhase += 0.05 * (deltaTime / 16.67);
      const wobbleY = Math.sin(shape.wobblePhase) * shape.wobbleAmplitude;
      shape.y = shape.baseY + wobbleY;

      if (this.style === 'natural') {
        shape.flickerPhase += shape.flickerSpeed * 0.02 * (deltaTime / 16.67);
        const flicker = (Math.sin(shape.flickerPhase) + 1) / 2;
        shape.opacity = shape.targetOpacity * (0.7 + flicker * 0.3);
      }
    }

    if (this.ripple.active) {
      const rippleElapsed = currentTime - this.ripple.startTime;
      const rippleDuration = 1000;
      if (rippleElapsed >= rippleDuration) {
        this.ripple.active = false;
      } else {
        const progress = rippleElapsed / rippleDuration;
        for (const ring of this.ripple.rings) {
          ring.radius = ring.maxRadius * progress;
          ring.opacity = Math.max(0, (0.3 - progress * 0.3) * (1 - progress));
        }
      }
    }

    if (entryElapsed > this.entryDuration + this.shapes.length * 30) {
      this.isAnimating = false;
    }
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  render(): void {
    const ctx = this.ctx;
    const { width, height } = this.canvas;

    ctx.clearRect(0, 0, width, height);

    ctx.save();
    ctx.translate(this.centerX, this.centerY);
    ctx.rotate(this.overallRotation * (Math.PI / 180));
    ctx.translate(-this.centerX, -this.centerY);

    const sortedShapes = [...this.shapes].sort((a, b) => a.scale - b.scale);

    for (const shape of sortedShapes) {
      if (shape.opacity <= 0) continue;

      ctx.save();
      ctx.globalAlpha = shape.opacity;

      if (this.style === 'cyber') {
        ctx.shadowColor = shape.fillColor;
        ctx.shadowBlur = 15;
      }

      ctx.translate(shape.x, shape.y);
      ctx.rotate(shape.rotation);
      ctx.scale(shape.scale, shape.scale);

      this.drawShape(shape.type, shape.size / shape.scale, shape.fillColor, shape.strokeColor);

      ctx.restore();
    }

    ctx.restore();

    if (this.ripple.active) {
      ctx.save();
      for (const ring of this.ripple.rings) {
        if (ring.opacity <= 0) continue;
        ctx.beginPath();
        ctx.arc(this.centerX, this.centerY, ring.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(255, 255, 255, ${ring.opacity})`;
        ctx.lineWidth = 2;
        ctx.stroke();
      }
      ctx.restore();
    }
  }

  private drawShape(type: ShapeType, size: number, fillColor: string, strokeColor: string): void {
    const ctx = this.ctx;
    const strokeWidth = this.style === 'cyber' ? 2 : 1.5;

    ctx.fillStyle = fillColor;
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;

    switch (type) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;

      case 'triangle': {
        const h = size * 0.866;
        ctx.beginPath();
        ctx.moveTo(0, -h / 2);
        ctx.lineTo(size / 2, h / 2);
        ctx.lineTo(-size / 2, h / 2);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'hexagon': {
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (i / 6) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(angle) * (size / 2);
          const y = Math.sin(angle) * (size / 2);
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'diamond': {
        ctx.beginPath();
        ctx.moveTo(0, -size / 2);
        ctx.lineTo(size / 2.5, 0);
        ctx.lineTo(0, size / 2);
        ctx.lineTo(-size / 2.5, 0);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'ellipse': {
        ctx.beginPath();
        ctx.ellipse(0, 0, size / 2, size / 3, 0, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
        break;
      }

      case 'teardrop': {
        ctx.beginPath();
        const w = size / 2.5;
        const h = size / 2;
        ctx.moveTo(0, -h);
        ctx.bezierCurveTo(w, -h * 0.3, w, h * 0.5, 0, h);
        ctx.bezierCurveTo(-w, h * 0.5, -w, -h * 0.3, 0, -h);
        ctx.fill();
        ctx.stroke();
        break;
      }
    }
  }

  exportPNG(): string {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 300;
    exportCanvas.height = 300;
    const exportCtx = exportCanvas.getContext('2d');
    if (!exportCtx) throw new Error('Cannot create export context');

    exportCtx.fillStyle = '#000000';
    exportCtx.fillRect(0, 0, 300, 300);

    const scale = 300 / this.canvas.width;
    exportCtx.scale(scale, scale);
    exportCtx.drawImage(this.canvas, 0, 0);

    return exportCanvas.toDataURL('image/png');
  }

  getStyle(): StyleType {
    return this.style;
  }

  getText(): string {
    return this.text;
  }
}
