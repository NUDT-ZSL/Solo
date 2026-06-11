export type StyleType = 'minimal' | 'cyber' | 'nature';

type ShapeType = 'circle' | 'triangle' | 'hexagon' | 'diamond' | 'ellipse' | 'waterdrop';

interface GeometricShape {
  type: ShapeType;
  x: number;
  y: number;
  finalX: number;
  finalY: number;
  scale: number;
  rotation: number;
  rotationSpeed: number;
  rotationDirection: number;
  fillColor: string;
  strokeColor: string;
  opacity: number;
  finalOpacity: number;
  charIndex: number;
  size: number;
  wobblePhase: number;
  wobbleSpeed: number;
  flickerPhase: number;
  flickerSpeed: number;
}

interface Ripple {
  x: number;
  y: number;
  radius: number;
  maxRadius: number;
  opacity: number;
  startTime: number;
  duration: number;
  index: number;
}

interface ColorPalette {
  colors: string[];
  accentColor: string;
  strokeDarkenAmount: number;
}

const MINIMAL_PALETTE: ColorPalette = {
  colors: ['#FFFFFF', '#E0E0E0', '#A0A0A0', '#707070', '#404040'],
  accentColor: '#FF6B6B',
  strokeDarkenAmount: 0.3
};

const CYBER_PALETTE: ColorPalette = {
  colors: ['#FF00FF', '#00FFFF', '#FF0080', '#00FF80', '#8000FF', '#0080FF'],
  accentColor: '#FF00FF',
  strokeDarkenAmount: 0.3
};

const NATURE_PALETTE: ColorPalette = {
  colors: ['#8B4513', '#228B22', '#F5DEB3', '#6B8E23', '#D2B48C', '#8FBC8F'],
  accentColor: '#228B22',
  strokeDarkenAmount: 0.3
};

const COMPLEMENTARY_PALETTES: string[][] = [
  ['#FF6B6B', '#4ECDC4'],
  ['#FF8E53', '#A8E6CF'],
  ['#FFD93D', '#6BCB77'],
  ['#C56CF0', '#FF9F43'],
  ['#FF6B9D', '#C44569'],
  ['#54A0FF', '#5F27CD'],
  ['#1DD1A1', '#00D2D3'],
  ['#FECA57', '#FF9FF3'],
  ['#48DBFB', '#8854D0'],
  ['#FF6348', '#1E90FF']
];

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

function darkenColor(hex: string, amount: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);

  const newR = Math.max(0, Math.floor(r * (1 - amount)));
  const newG = Math.max(0, Math.floor(g * (1 - amount)));
  const newB = Math.max(0, Math.floor(b * (1 - amount)));

  return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
}

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export class BadgeEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private shapes: GeometricShape[] = [];
  private ripples: Ripple[] = [];
  private text: string = '';
  private style: StyleType = 'minimal';
  private globalRotationDirection: number = 1;
  private lastGlobalRotationChange: number = 0;
  private animationFrameId: number | null = null;
  private generationStartTime: number = 0;
  private generationDuration: number = 300;
  private isGenerating: boolean = false;
  private centerX: number = 200;
  private centerY: number = 200;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('无法获取Canvas 2D上下文');
    }
    this.ctx = ctx;
    this.lastGlobalRotationChange = performance.now();
  }

  setStyle(style: StyleType): void {
    this.style = style;
    if (this.text) {
      this.generate(this.text);
    }
  }

  getStyle(): StyleType {
    return this.style;
  }

  generate(text: string): void {
    this.text = text.trim();
    if (!this.text) {
      this.shapes = [];
      return;
    }

    this.isGenerating = true;
    this.generationStartTime = performance.now();

    let seed = 0;
    for (let i = 0; i < this.text.length; i++) {
      seed = (seed * 31 + this.text.charCodeAt(i)) >>> 0;
    }

    const shapeCount = this.getShapeCount();
    const palette = this.getPalette();

    this.shapes = [];
    const availableChars = this.text.replace(/\s/g, '');
    const charCount = Math.max(availableChars.length, 1);

    for (let i = 0; i < shapeCount; i++) {
      const charIndex = i % charCount;
      const charCode = availableChars.charCodeAt(charIndex);
      const shapeRandom = new SeededRandom(seed + i * 1000 + charCode);

      const type = this.getShapeType(shapeRandom);
      const offsetX = shapeRandom.range(-30, 30);
      const offsetY = shapeRandom.range(-30, 30);
      const scale = shapeRandom.range(0.5, 1.5);
      const baseSize = 30 + (charCode % 30);

      let fillColor: string;
      if (this.style === 'minimal') {
        const useAccent = shapeRandom.next() < 0.2;
        fillColor = useAccent ? palette.accentColor : shapeRandom.pick(palette.colors);
      } else if (this.style === 'cyber') {
        fillColor = shapeRandom.pick(palette.colors);
      } else {
        fillColor = shapeRandom.pick(palette.colors);
      }

      const complementaryIndex = charCode % COMPLEMENTARY_PALETTES.length;
      if (this.style === 'minimal' && shapeRandom.next() < 0.3) {
        const complementaryPair = COMPLEMENTARY_PALETTES[complementaryIndex];
        fillColor = shapeRandom.pick(complementaryPair);
      }

      const isEvenIndex = i % 2 === 0;
      const rotationSpeed = 0.5 + (charCode % 25) / 10;

      const startX = this.centerX + shapeRandom.range(-200, 200);
      const startY = this.centerY + shapeRandom.range(-200, 200);

      this.shapes.push({
        type,
        x: startX,
        y: startY,
        finalX: this.centerX + offsetX,
        finalY: this.centerY + offsetY,
        scale,
        rotation: shapeRandom.range(0, Math.PI * 2),
        rotationSpeed: rotationSpeed * (Math.PI / 180),
        rotationDirection: isEvenIndex ? 1 : -1,
        fillColor,
        strokeColor: darkenColor(fillColor, palette.strokeDarkenAmount),
        opacity: 0,
        finalOpacity: this.style === 'nature' ? 0.75 : 1,
        charIndex,
        size: baseSize,
        wobblePhase: shapeRandom.range(0, Math.PI * 2),
        wobbleSpeed: 0.05 + shapeRandom.range(0, 0.03),
        flickerPhase: shapeRandom.range(0, Math.PI * 2),
        flickerSpeed: 0.02 + shapeRandom.range(0, 0.02)
      });
    }

    this.triggerRipples();
  }

  private getShapeCount(): number {
    switch (this.style) {
      case 'minimal':
        return 3 + (this.text.length % 3);
      case 'cyber':
        return 8 + (this.text.length % 5);
      case 'nature':
        return 5 + (this.text.length % 4);
      default:
        return 5;
    }
  }

  private getPalette(): ColorPalette {
    switch (this.style) {
      case 'minimal':
        return MINIMAL_PALETTE;
      case 'cyber':
        return CYBER_PALETTE;
      case 'nature':
        return NATURE_PALETTE;
      default:
        return MINIMAL_PALETTE;
    }
  }

  private getShapeType(random: SeededRandom): ShapeType {
    switch (this.style) {
      case 'nature':
        return random.pick(['ellipse', 'waterdrop', 'circle', 'ellipse'] as ShapeType[]);
      case 'cyber':
        return random.pick(['hexagon', 'triangle', 'diamond', 'circle', 'hexagon'] as ShapeType[]);
      case 'minimal':
      default:
        return random.pick(['circle', 'triangle', 'hexagon', 'diamond'] as ShapeType[]);
    }
  }

  private triggerRipples(): void {
    this.ripples = [];
    const now = performance.now();
    for (let i = 0; i < 12; i++) {
      this.ripples.push({
        x: this.centerX,
        y: this.centerY,
        radius: 0,
        maxRadius: 80,
        opacity: 0,
        startTime: now + i * 30,
        duration: 1000,
        index: i
      });
    }
  }

  start(): void {
    if (this.animationFrameId === null) {
      this.loop();
    }
  }

  stop(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  private loop = (): void => {
    this.update();
    this.render();
    this.animationFrameId = requestAnimationFrame(this.loop);
  };

  private update(): void {
    const now = performance.now();

    if (now - this.lastGlobalRotationChange > 3000) {
      this.globalRotationDirection *= -1;
      this.lastGlobalRotationChange = now;
    }

    const generationProgress = this.isGenerating
      ? Math.min(1, (now - this.generationStartTime) / this.generationDuration)
      : 1;

    if (generationProgress >= 1) {
      this.isGenerating = false;
    }

    const easeProgress = this.easeOutCubic(generationProgress);

    for (const shape of this.shapes) {
      shape.x = shape.finalX + (shape.x - shape.finalX) * (1 - easeProgress);
      shape.y = shape.finalY + (shape.y - shape.finalY) * (1 - easeProgress);
      shape.opacity = shape.finalOpacity * easeProgress;

      shape.rotation += shape.rotationSpeed * shape.rotationDirection * this.globalRotationDirection;
      shape.wobblePhase += shape.wobbleSpeed;

      if (this.style === 'nature') {
        shape.flickerPhase += shape.flickerSpeed;
        shape.opacity = shape.finalOpacity * (0.6 + 0.4 * Math.sin(shape.flickerPhase));
      }
    }

    for (const ripple of this.ripples) {
      if (now >= ripple.startTime) {
        const rippleProgress = Math.min(1, (now - ripple.startTime) / ripple.duration);
        ripple.radius = ripple.maxRadius * rippleProgress;
        ripple.opacity = 0.3 * (1 - rippleProgress);
      }
    }

    this.ripples = this.ripples.filter(r => r.opacity > 0.01);
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  private render(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    if (this.style === 'cyber') {
      this.ctx.fillStyle = '#000000';
      this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);
    }

    for (const ripple of this.ripples) {
      if (ripple.opacity > 0) {
        this.ctx.beginPath();
        this.ctx.arc(ripple.x, ripple.y, ripple.radius, 0, Math.PI * 2);
        this.ctx.strokeStyle = hexToRgba(
          this.style === 'cyber' ? '#FF00FF' : this.style === 'nature' ? '#228B22' : '#FFFFFF',
          ripple.opacity
        );
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
      }
    }

    for (const shape of this.shapes) {
      this.drawShape(shape);
    }
  }

  private drawShape(shape: GeometricShape): void {
    const ctx = this.ctx;
    const wobbleY = Math.sin(shape.wobblePhase) * 3;

    ctx.save();
    ctx.translate(shape.x, shape.y + wobbleY);
    ctx.rotate(shape.rotation);
    ctx.scale(shape.scale, shape.scale);
    ctx.globalAlpha = shape.opacity;

    if (this.style === 'cyber') {
      ctx.shadowColor = shape.fillColor;
      ctx.shadowBlur = 15;
    }

    ctx.beginPath();

    switch (shape.type) {
      case 'circle':
        ctx.arc(0, 0, shape.size / 2, 0, Math.PI * 2);
        break;
      case 'triangle':
        this.drawTriangle(ctx, shape.size);
        break;
      case 'hexagon':
        this.drawHexagon(ctx, shape.size);
        break;
      case 'diamond':
        this.drawDiamond(ctx, shape.size);
        break;
      case 'ellipse':
        ctx.ellipse(0, 0, shape.size / 2, shape.size / 3, 0, 0, Math.PI * 2);
        break;
      case 'waterdrop':
        this.drawWaterdrop(ctx, shape.size);
        break;
    }

    ctx.closePath();
    ctx.fillStyle = shape.fillColor;
    ctx.fill();

    ctx.lineWidth = this.style === 'cyber' ? 2 : 1.5;
    ctx.strokeStyle = shape.strokeColor;
    ctx.stroke();

    ctx.restore();
  }

  private drawTriangle(ctx: CanvasRenderingContext2D, size: number): void {
    const r = size / 2;
    ctx.moveTo(0, -r);
    ctx.lineTo(r * Math.sin(Math.PI / 3), r * Math.cos(Math.PI / 3));
    ctx.lineTo(-r * Math.sin(Math.PI / 3), r * Math.cos(Math.PI / 3));
  }

  private drawHexagon(ctx: CanvasRenderingContext2D, size: number): void {
    const r = size / 2;
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 3) * i - Math.PI / 6;
      const x = r * Math.cos(angle);
      const y = r * Math.sin(angle);
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
  }

  private drawDiamond(ctx: CanvasRenderingContext2D, size: number): void {
    const r = size / 2;
    ctx.moveTo(0, -r);
    ctx.lineTo(r * 0.7, 0);
    ctx.lineTo(0, r);
    ctx.lineTo(-r * 0.7, 0);
  }

  private drawWaterdrop(ctx: CanvasRenderingContext2D, size: number): void {
    const r = size / 2;
    ctx.moveTo(0, -r);
    ctx.bezierCurveTo(r * 0.8, -r * 0.3, r * 0.6, r * 0.6, 0, r * 0.8);
    ctx.bezierCurveTo(-r * 0.6, r * 0.6, -r * 0.8, -r * 0.3, 0, -r);
  }

  exportPNG(): Blob {
    const exportCanvas = document.createElement('canvas');
    exportCanvas.width = 300;
    exportCanvas.height = 300;
    const exportCtx = exportCanvas.getContext('2d');

    if (!exportCtx) {
      throw new Error('无法创建导出画布上下文');
    }

    if (this.style === 'cyber') {
      exportCtx.fillStyle = '#000000';
      exportCtx.fillRect(0, 0, 300, 300);
    }

    exportCtx.drawImage(this.canvas, 0, 0, this.canvas.width, this.canvas.height, 0, 0, 300, 300);

    const dataUrl = exportCanvas.toDataURL('image/png');
    const byteString = atob(dataUrl.split(',')[1]);
    const mimeString = dataUrl.split(',')[0].split(':')[1].split(';')[0];
    const ab = new ArrayBuffer(byteString.length);
    const ia = new Uint8Array(ab);

    for (let i = 0; i < byteString.length; i++) {
      ia[i] = byteString.charCodeAt(i);
    }

    return new Blob([ab], { type: mimeString });
  }

  resize(width: number, height: number): void {
    this.canvas.width = width;
    this.canvas.height = height;
    this.centerX = width / 2;
    this.centerY = height / 2;
  }
}
