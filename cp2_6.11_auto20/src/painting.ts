import { Candle } from './candle';

type ShapeType = 'note' | 'star' | 'diamond' | 'circle' | 'triangle' | 'number';

interface HiddenShape {
  type: ShapeType;
  x: number;
  y: number;
  size: number;
  rotation: number;
  color: string;
  numberValue?: number;
}

interface ColorBlock {
  x: number;
  y: number;
  width: number;
  height: number;
  color: string;
  shape: 'rect' | 'circle' | 'curve';
  rotation: number;
}

export interface PaintingOptions {
  id: number;
  side: 'left' | 'right';
  index: number;
  x: number;
  y: number;
  width: number;
  height: number;
  scale: number;
  zDepth: number;
  rotationY?: number;
  transformA?: number;
  transformB?: number;
  transformD?: number;
}

export class Painting {
  private ctx: CanvasRenderingContext2D;
  private id: number;
  private side: 'left' | 'right';
  private index: number;
  private x: number;
  private y: number;
  private baseWidth: number;
  private baseHeight: number;
  private scale: number;
  private zDepth: number;
  private rotationY: number;
  private transformA: number;
  private transformB: number;
  private transformD: number;
  
  private isHovered: boolean;
  private hoverProgress: number;
  private targetHoverProgress: number;
  private hoverStartTime: number;
  
  private collected: boolean;
  private collectProgress: number;
  private glowProgress: number;
  
  private hiddenShape: HiddenShape;
  private colorBlocks: ColorBlock[];
  private patternSeed: number;
  
  private candle: Candle;
  private pulsePhase: number;
  private saturationBase: number;
  
  private onCollect?: (painting: Painting) => void;
  
  private static readonly FADE_IN_DURATION = 1.5;

  constructor(ctx: CanvasRenderingContext2D, options: PaintingOptions) {
    this.ctx = ctx;
    this.id = options.id;
    this.side = options.side;
    this.index = options.index;
    this.x = options.x;
    this.y = options.y;
    this.baseWidth = options.width;
    this.baseHeight = options.height;
    this.scale = options.scale;
    this.zDepth = options.zDepth;
    this.rotationY = options.rotationY || 0;
    this.transformA = options.transformA !== undefined ? options.transformA : options.scale;
    this.transformB = options.transformB !== undefined ? options.transformB : 0;
    this.transformD = options.transformD !== undefined ? options.transformD : options.scale;
    
    this.isHovered = false;
    this.hoverProgress = 0;
    this.targetHoverProgress = 0;
    this.hoverStartTime = 0;
    
    this.collected = false;
    this.collectProgress = 0;
    this.glowProgress = 0;
    
    this.patternSeed = options.id * 12345.6789;
    this.pulsePhase = Math.random() * Math.PI * 2;
    this.saturationBase = 50;
    
    this.colorBlocks = this.generateColorBlocks();
    this.hiddenShape = this.generateHiddenShape();
    
    this.candle = new Candle(
      ctx,
      this.x,
      this.y + this.baseHeight * this.scale * 0.5 + 25 * this.scale,
      this.scale * 0.8
    );
  }

  private seededRandom(seed: number): number {
    const x = Math.sin(seed) * 10000;
    return x - Math.floor(x);
  }

  private generateColorBlocks(): ColorBlock[] {
    const blocks: ColorBlock[] = [];
    const numBlocks = 5 + Math.floor(this.seededRandom(this.patternSeed) * 4);
    
    const baseColors = [
      '#4A2C1A', '#6B3A1F', '#8B4513', '#5C3D2E',
      '#704214', '#8B6914', '#3D2817', '#4E342E'
    ];
    
    for (let i = 0; i < numBlocks; i++) {
      const seed = this.patternSeed + i * 100;
      const block: ColorBlock = {
        x: this.seededRandom(seed) * 0.8 + 0.1,
        y: this.seededRandom(seed + 1) * 0.8 + 0.1,
        width: 0.2 + this.seededRandom(seed + 2) * 0.4,
        height: 0.15 + this.seededRandom(seed + 3) * 0.35,
        color: baseColors[Math.floor(this.seededRandom(seed + 4) * baseColors.length)],
        shape: this.seededRandom(seed + 5) > 0.5 ? 'rect' : 'curve',
        rotation: (this.seededRandom(seed + 6) - 0.5) * 0.5
      };
      blocks.push(block);
    }
    
    return blocks;
  }

  private generateHiddenShape(): HiddenShape {
    const seed = this.patternSeed + 999;
    const types: ShapeType[] = ['note', 'star', 'diamond', 'circle', 'triangle', 'number'];
    const type = types[Math.floor(this.seededRandom(seed) * types.length)];
    
    const colors = ['#FFB347', '#FF6D00', '#8B6914', '#CD853F', '#DAA520', '#F4A460'];
    const color = colors[Math.floor(this.seededRandom(seed + 10) * colors.length)];
    
    const shape: HiddenShape = {
      type,
      x: 0.3 + this.seededRandom(seed + 20) * 0.4,
      y: 0.3 + this.seededRandom(seed + 30) * 0.4,
      size: 0.25 + this.seededRandom(seed + 40) * 0.2,
      rotation: (this.seededRandom(seed + 50) - 0.5) * 0.3,
      color,
      numberValue: type === 'number' ? Math.floor(this.seededRandom(seed + 60) * 9) + 1 : undefined
    };
    
    return shape;
  }

  public setPosition(
    x: number,
    y: number,
    scale: number,
    rotationY?: number,
    transformA?: number,
    transformB?: number,
    transformD?: number
  ): void {
    this.x = x;
    this.y = y;
    this.scale = scale;
    if (rotationY !== undefined) {
      this.rotationY = rotationY;
    }
    if (transformA !== undefined) {
      this.transformA = transformA;
    }
    if (transformB !== undefined) {
      this.transformB = transformB;
    }
    if (transformD !== undefined) {
      this.transformD = transformD;
    }
    
    this.candle.setPosition(
      this.x,
      this.y + this.baseHeight * this.scale * 0.5 + 25 * this.scale,
      this.scale * 0.8
    );
  }

  public setHovered(hovered: boolean, currentTime?: number): void {
    if (this.isHovered !== hovered) {
      this.isHovered = hovered;
      this.targetHoverProgress = hovered ? 1 : 0;
      if (hovered) {
        this.hoverStartTime = currentTime !== undefined ? currentTime : performance.now() / 1000;
      }
    }
  }

  public isCollected(): boolean {
    return this.collected;
  }

  public getSide(): 'left' | 'right' {
    return this.side;
  }

  public getZDepth(): number {
    return this.zDepth;
  }

  public getId(): number {
    return this.id;
  }

  public setOnCollect(callback: (painting: Painting) => void): void {
    this.onCollect = callback;
  }

  public setCandleBlue(isBlue: boolean): void {
    this.candle.setBlue(isBlue);
  }

  public containsPoint(px: number, py: number): boolean {
    const w = this.baseWidth * this.scale;
    const h = this.baseHeight * this.scale;
    const left = this.x - w / 2;
    const right = this.x + w / 2;
    const top = this.y - h / 2;
    const bottom = this.y + h / 2;
    
    return px >= left && px <= right && py >= top && py <= bottom;
  }

  public hitTestShape(px: number, py: number): boolean {
    if (!this.isHovered || this.collected) return false;
    if (this.hoverProgress < 0.3) return false;
    
    const w = this.baseWidth * this.scale;
    const h = this.baseHeight * this.scale;
    
    const shapeX = this.x + (this.hiddenShape.x - 0.5) * w * 0.8;
    const shapeY = this.y + (this.hiddenShape.y - 0.5) * h * 0.8;
    const shapeSize = this.hiddenShape.size * Math.min(w, h) * 0.8;
    
    const dx = px - shapeX;
    const dy = py - shapeY;
    const distance = Math.sqrt(dx * dx + dy * dy);
    
    return distance <= shapeSize * 0.6;
  }

  public collect(): void {
    if (this.collected) return;
    
    this.collected = true;
    this.collectProgress = 0;
    this.glowProgress = 1;
    
    if (this.onCollect) {
      this.onCollect(this);
    }
  }

  public update(deltaTime: number, time: number): void {
    if (this.targetHoverProgress > this.hoverProgress) {
      const elapsed = time - this.hoverStartTime;
      const progress = Math.min(1, elapsed / Painting.FADE_IN_DURATION);
      this.hoverProgress = this.easeOutCubic(progress);
    } else if (this.hoverProgress > 0) {
      this.hoverProgress = Math.max(0, this.hoverProgress - deltaTime * 2);
    }
    
    if (this.collected) {
      this.collectProgress = Math.min(1, this.collectProgress + deltaTime * 1.5);
    }
    
    if (this.glowProgress > 0) {
      this.glowProgress = Math.max(0, this.glowProgress - deltaTime * 1.25);
    }
    
    this.pulsePhase += deltaTime * Math.PI;
    
    this.candle.update(deltaTime);
  }

  public draw(): void {
    const ctx = this.ctx;
    const w = this.baseWidth * this.scale;
    const h = this.baseHeight * this.scale;
    
    ctx.save();
    ctx.translate(this.x, this.y);
    
    const corrA = this.transformD !== 0 ? this.transformA / this.transformD : 1;
    const corrB = this.transformD !== 0 ? this.transformB / this.transformD : 0;
    ctx.transform(corrA, corrB, 0, 1, 0, 0);
    
    this.drawFrame(w, h);
    this.drawPaintingContent(w, h);
    
    if (this.hoverProgress > 0 && !this.collected) {
      this.drawHiddenShape(w, h);
    }
    
    if (this.glowProgress > 0) {
      this.drawCollectGlow(w, h);
    }
    
    if (this.collected) {
      this.drawCollectedMark(w, h);
    }
    
    ctx.restore();
    
    this.candle.draw();
  }

  private drawFrame(w: number, h: number): void {
    const ctx = this.ctx;
    const frameWidth = 12 * this.scale;
    
    const outerGradient = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    outerGradient.addColorStop(0, '#6B4F0E');
    outerGradient.addColorStop(0.3, '#B8860B');
    outerGradient.addColorStop(0.5, '#DAA520');
    outerGradient.addColorStop(0.7, '#B8860B');
    outerGradient.addColorStop(1, '#6B4F0E');
    
    ctx.fillStyle = outerGradient;
    ctx.strokeStyle = '#8B6914';
    ctx.lineWidth = 1;
    
    this.roundRect(-w / 2 - frameWidth, -h / 2 - frameWidth, w + frameWidth * 2, h + frameWidth * 2, 4 * this.scale);
    ctx.fill();
    ctx.stroke();
    
    const innerGradient = ctx.createLinearGradient(-w / 2, -h / 2, w / 2, h / 2);
    innerGradient.addColorStop(0, '#5C4033');
    innerGradient.addColorStop(0.5, '#8B6914');
    innerGradient.addColorStop(1, '#5C4033');
    
    ctx.fillStyle = innerGradient;
    ctx.fillRect(-w / 2 - frameWidth * 0.6, -h / 2 - frameWidth * 0.6, w + frameWidth * 1.2, h + frameWidth * 1.2);
    
    ctx.fillStyle = '#3D2817';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    
    if (this.hoverProgress > 0) {
      ctx.strokeStyle = `rgba(255, 215, 100, ${this.hoverProgress * 0.6})`;
      ctx.lineWidth = 2 * this.scale;
      this.roundRect(-w / 2 - frameWidth * 0.3, -h / 2 - frameWidth * 0.3, w + frameWidth * 0.6, h + frameWidth * 0.6, 3 * this.scale);
      ctx.stroke();
    }
  }

  private roundRect(x: number, y: number, w: number, h: number, r: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  private drawPaintingContent(w: number, h: number): void {
    const ctx = this.ctx;
    
    ctx.save();
    ctx.beginPath();
    ctx.rect(-w / 2, -h / 2, w, h);
    ctx.clip();
    
    const bgGradient = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
    bgGradient.addColorStop(0, '#3D2817');
    bgGradient.addColorStop(0.5, '#4E342E');
    bgGradient.addColorStop(1, '#3D2817');
    ctx.fillStyle = bgGradient;
    ctx.fillRect(-w / 2, -h / 2, w, h);
    
    const pulse = (Math.sin(this.pulsePhase) + 1) / 2;
    const saturationBoost = this.hoverProgress * pulse * 30;
    
    for (const block of this.colorBlocks) {
      const bx = (block.x - 0.5) * w * 0.9;
      const by = (block.y - 0.5) * h * 0.9;
      const bw = block.width * w * 0.8;
      const bh = block.height * h * 0.8;
      
      ctx.save();
      ctx.translate(bx, by);
      ctx.rotate(block.rotation);
      ctx.globalAlpha = 0.6 + this.hoverProgress * 0.3;
      
      const saturatedColor = this.saturateColor(block.color, saturationBoost);
      
      if (block.shape === 'rect') {
        const gradient = ctx.createLinearGradient(-bw / 2, -bh / 2, bw / 2, bh / 2);
        gradient.addColorStop(0, saturatedColor);
        gradient.addColorStop(0.5, this.lightenColor(saturatedColor, 10));
        gradient.addColorStop(1, saturatedColor);
        ctx.fillStyle = gradient;
        this.roundRect(-bw / 2, -bh / 2, bw, bh, 5 * this.scale);
        ctx.fill();
      } else {
        ctx.strokeStyle = saturatedColor;
        ctx.lineWidth = 8 * this.scale;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(-bw / 2, 0);
        ctx.bezierCurveTo(-bw / 4, -bh / 2, bw / 4, bh / 2, bw / 2, 0);
        ctx.stroke();
      }
      
      ctx.restore();
    }
    
    ctx.restore();
  }

  private saturateColor(hex: string, amount: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    
    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    
    if (max === min) return hex;
    
    const saturationFactor = 1 + amount / 100;
    const mid = (max + min) / 2;
    
    const newR = Math.round(Math.min(255, mid + (r - mid) * saturationFactor));
    const newG = Math.round(Math.min(255, mid + (g - mid) * saturationFactor));
    const newB = Math.round(Math.min(255, mid + (b - mid) * saturationFactor));
    
    return `rgb(${newR}, ${newG}, ${newB})`;
  }

  private lightenColor(color: string, amount: number): string {
    let r: number, g: number, b: number;
    
    if (color.startsWith('#')) {
      r = parseInt(color.slice(1, 3), 16);
      g = parseInt(color.slice(3, 5), 16);
      b = parseInt(color.slice(5, 7), 16);
    } else {
      const match = color.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
      if (!match) return color;
      r = parseInt(match[1]);
      g = parseInt(match[2]);
      b = parseInt(match[3]);
    }
    
    r = Math.min(255, r + amount);
    g = Math.min(255, g + amount);
    b = Math.min(255, b + amount);
    
    return `rgb(${r}, ${g}, ${b})`;
  }

  private drawHiddenShape(w: number, h: number): void {
    const ctx = this.ctx;
    const shape = this.hiddenShape;
    
    const sx = (shape.x - 0.5) * w * 0.8;
    const sy = (shape.y - 0.5) * h * 0.8;
    const size = shape.size * Math.min(w, h) * 0.8;
    
    const fadeIn = this.easeOutCubic(this.hoverProgress);
    
    ctx.save();
    ctx.translate(sx, sy);
    ctx.rotate(shape.rotation);
    ctx.globalAlpha = fadeIn * 0.9;
    
    ctx.shadowColor = shape.color;
    ctx.shadowBlur = 15 * this.scale * fadeIn;
    
    ctx.fillStyle = shape.color;
    ctx.strokeStyle = this.lightenColor(shape.color, 30);
    ctx.lineWidth = 2 * this.scale;
    
    switch (shape.type) {
      case 'circle':
        this.drawCircle(size);
        break;
      case 'triangle':
        this.drawTriangle(size);
        break;
      case 'star':
        this.drawStar(size);
        break;
      case 'diamond':
        this.drawDiamond(size);
        break;
      case 'note':
        this.drawNote(size);
        break;
      case 'number':
        this.drawNumber(size, shape.numberValue || 1);
        break;
    }
    
    ctx.restore();
  }

  private drawCircle(size: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.arc(0, 0, size / 2, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
  }

  private drawTriangle(size: number): void {
    const ctx = this.ctx;
    const h = size * 0.866;
    ctx.beginPath();
    ctx.moveTo(0, -h / 2);
    ctx.lineTo(-size / 2, h / 2);
    ctx.lineTo(size / 2, h / 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawStar(size: number): void {
    const ctx = this.ctx;
    const spikes = 5;
    const outerRadius = size / 2;
    const innerRadius = outerRadius * 0.4;
    
    ctx.beginPath();
    for (let i = 0; i < spikes * 2; i++) {
      const radius = i % 2 === 0 ? outerRadius : innerRadius;
      const angle = (i * Math.PI) / spikes - Math.PI / 2;
      const x = Math.cos(angle) * radius;
      const y = Math.sin(angle) * radius;
      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawDiamond(size: number): void {
    const ctx = this.ctx;
    ctx.beginPath();
    ctx.moveTo(0, -size / 2);
    ctx.lineTo(size / 3, 0);
    ctx.lineTo(0, size / 2);
    ctx.lineTo(-size / 3, 0);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }

  private drawNote(size: number): void {
    const ctx = this.ctx;
    
    ctx.beginPath();
    ctx.ellipse(-size * 0.15, size * 0.15, size * 0.25, size * 0.18, -0.3, 0, Math.PI * 2);
    ctx.fill();
    
    ctx.strokeStyle = ctx.fillStyle as string;
    ctx.lineWidth = size * 0.08;
    ctx.lineCap = 'round';
    
    ctx.beginPath();
    ctx.moveTo(size * 0.1, size * 0.15);
    ctx.lineTo(size * 0.1, -size * 0.35);
    ctx.stroke();
    
    ctx.beginPath();
    ctx.moveTo(size * 0.1, -size * 0.35);
    ctx.quadraticCurveTo(size * 0.4, -size * 0.3, size * 0.35, -size * 0.15);
    ctx.stroke();
  }

  private drawNumber(size: number, num: number): void {
    const ctx = this.ctx;
    ctx.font = `bold ${size * 0.8}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(num.toString(), 0, 0);
  }

  private drawCollectGlow(w: number, h: number): void {
    const ctx = this.ctx;
    const glowSize = this.glowProgress * 30 * this.scale;
    
    const gradient = ctx.createRadialGradient(0, 0, 0, 0, 0, Math.max(w, h) * 0.8);
    gradient.addColorStop(0, `rgba(255, 215, 100, ${this.glowProgress * 0.8})`);
    gradient.addColorStop(0.5, `rgba(255, 179, 71, ${this.glowProgress * 0.4})`);
    gradient.addColorStop(1, 'rgba(255, 179, 71, 0)');
    
    ctx.fillStyle = gradient;
    ctx.fillRect(-w / 2 - glowSize, -h / 2 - glowSize, w + glowSize * 2, h + glowSize * 2);
    
    ctx.strokeStyle = `rgba(255, 215, 100, ${this.glowProgress})`;
    ctx.lineWidth = 3 * this.scale * this.glowProgress;
    this.roundRect(-w / 2, -h / 2, w, h, 2 * this.scale);
    ctx.stroke();
  }

  private drawCollectedMark(w: number, h: number): void {
    const ctx = this.ctx;
    const markSize = 20 * this.scale;
    
    ctx.fillStyle = 'rgba(255, 215, 100, 0.3)';
    ctx.fillRect(-w / 2, -h / 2, w, h);
    
    ctx.fillStyle = '#FFD700';
    ctx.shadowColor = '#FFD700';
    ctx.shadowBlur = 10 * this.scale;
    ctx.font = `${markSize}px Georgia, serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('✓', 0, 0);
    ctx.shadowBlur = 0;
  }

  private easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  public getCandle(): Candle {
    return this.candle;
  }
}
