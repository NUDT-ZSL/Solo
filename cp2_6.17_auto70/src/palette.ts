export class ColorPicker {
  private container: HTMLElement;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private size: number;
  private hue: number = 0;
  private saturation: number = 1;
  private lightness: number = 0.5;
  private isDraggingHue: boolean = false;
  private isDraggingSL: boolean = false;
  private onColorChange: (color: string) => void;
  private hueRadius: number;
  private slSize: number;
  private slCenterX: number;
  private slCenterY: number;

  constructor(container: HTMLElement, onColorChange: (color: string) => void) {
    this.container = container;
    this.onColorChange = onColorChange;
    this.size = 200;
    this.hueRadius = this.size / 2;
    this.slSize = this.size * 0.6;
    this.slCenterX = this.size / 2;
    this.slCenterY = this.size / 2;

    this.canvas = document.createElement('canvas');
    this.canvas.width = this.size;
    this.canvas.height = this.size;
    this.canvas.style.cursor = 'crosshair';
    this.ctx = this.canvas.getContext('2d')!;

    this.container.appendChild(this.canvas);

    this.draw();
    this.bindEvents();
  }

  private draw(): void {
    const ctx = this.ctx;
    const centerX = this.size / 2;
    const centerY = this.size / 2;
    const outerRadius = this.size / 2 - 2;
    const innerRadius = this.size * 0.35;

    ctx.clearRect(0, 0, this.size, this.size);

    this.drawHueRing(centerX, centerY, outerRadius, innerRadius);
    this.drawSLTriangle(centerX, centerY, innerRadius * 0.85);
    this.drawHueSelector(centerX, centerY, outerRadius, innerRadius);
    this.drawSLSelector();
  }

  private drawHueRing(cx: number, cy: number, outerR: number, innerR: number): void {
    const ctx = this.ctx;
    const segments = 360;

    for (let i = 0; i < segments; i++) {
      const startAngle = (i / segments) * Math.PI * 2 - Math.PI / 2;
      const endAngle = ((i + 1) / segments) * Math.PI * 2 - Math.PI / 2;

      ctx.beginPath();
      ctx.arc(cx, cy, outerR, startAngle, endAngle);
      ctx.arc(cx, cy, innerR, endAngle, startAngle, true);
      ctx.closePath();

      const hue = i;
      ctx.fillStyle = `hsl(${hue}, 100%, 50%)`;
      ctx.fill();
    }
  }

  private drawSLTriangle(cx: number, cy: number, size: number): void {
    const ctx = this.ctx;

    const topAngle = -Math.PI / 2;
    const leftAngle = -Math.PI / 2 + (Math.PI * 2) / 3;
    const rightAngle = -Math.PI / 2 - (Math.PI * 2) / 3;

    const top = {
      x: cx + Math.cos(topAngle) * size,
      y: cy + Math.sin(topAngle) * size
    };
    const left = {
      x: cx + Math.cos(leftAngle) * size,
      y: cy + Math.sin(leftAngle) * size
    };
    const right = {
      x: cx + Math.cos(rightAngle) * size,
      y: cy + Math.sin(rightAngle) * size
    };

    const hueColor = `hsl(${this.hue}, 100%, 50%)`;

    const grad = ctx.createLinearGradient(top.x, top.y, left.x, left.y);
    grad.addColorStop(0, hueColor);
    grad.addColorStop(1, '#ffffff');

    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.closePath();

    ctx.fillStyle = grad;
    ctx.fill();

    const grad2 = ctx.createLinearGradient(top.x, top.y, right.x, right.y);
    grad2.addColorStop(0, 'rgba(0,0,0,0)');
    grad2.addColorStop(1, '#000000');

    ctx.beginPath();
    ctx.moveTo(top.x, top.y);
    ctx.lineTo(left.x, left.y);
    ctx.lineTo(right.x, right.y);
    ctx.closePath();

    ctx.fillStyle = grad2;
    ctx.fill();
  }

  private drawHueSelector(cx: number, cy: number, outerR: number, innerR: number): void {
    const ctx = this.ctx;
    const angle = (this.hue / 360) * Math.PI * 2 - Math.PI / 2;
    const midR = (outerR + innerR) / 2;

    const x = cx + Math.cos(angle) * midR;
    const y = cy + Math.sin(angle) * midR;

    ctx.beginPath();
    ctx.arc(x, y, 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(x, y, 10, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(0,0,0,0.3)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }

  private drawSLSelector(): void {
    const ctx = this.ctx;
    const size = this.size * 0.35;

    const slPos = this.slToTriangle(this.saturation, this.lightness, size);

    ctx.beginPath();
    ctx.arc(this.slCenterX + slPos.x, this.slCenterY + slPos.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = '#ffffff';
    ctx.fill();
    ctx.strokeStyle = 'rgba(0,0,0,0.5)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }

  private slToTriangle(s: number, l: number, size: number): { x: number; y: number } {
    const topAngle = -Math.PI / 2;
    const leftAngle = -Math.PI / 2 + (Math.PI * 2) / 3;
    const rightAngle = -Math.PI / 2 - (Math.PI * 2) / 3;

    const top = { x: Math.cos(topAngle) * size, y: Math.sin(topAngle) * size };
    const left = { x: Math.cos(leftAngle) * size, y: Math.sin(leftAngle) * size };
    const right = { x: Math.cos(rightAngle) * size, y: Math.sin(rightAngle) * size };

    const x = left.x + (right.x - left.x) * s + (top.x - (left.x + (right.x - left.x) * s)) * (1 - l);
    const y = left.y + (right.y - left.y) * s + (top.y - (left.y + (right.y - left.y) * s)) * (1 - l);

    return { x, y };
  }

  private triangleToSL(px: number, py: number, size: number): { s: number; l: number } {
    const topAngle = -Math.PI / 2;
    const leftAngle = -Math.PI / 2 + (Math.PI * 2) / 3;
    const rightAngle = -Math.PI / 2 - (Math.PI * 2) / 3;

    const top = { x: Math.cos(topAngle) * size, y: Math.sin(topAngle) * size };
    const left = { x: Math.cos(leftAngle) * size, y: Math.sin(leftAngle) * size };
    const right = { x: Math.cos(rightAngle) * size, y: Math.sin(rightAngle) * size };

    const dx = right.x - left.x;
    const dy = right.y - left.y;
    const len = Math.sqrt(dx * dx + dy * dy);

    const nx = -dy / len;
    const ny = dx / len;

    const baseDist = (px - left.x) * nx + (py - left.y) * ny;
    const topDist = (top.x - left.x) * nx + (top.y - left.y) * ny;
    const l = 1 - baseDist / topDist;

    const projX = px - nx * baseDist;
    const projY = py - ny * baseDist;

    const s = Math.sqrt((projX - left.x) ** 2 + (projY - left.y) ** 2) / len;

    return {
      s: Math.max(0, Math.min(1, s)),
      l: Math.max(0, Math.min(1, l))
    };
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', this.onMouseDown.bind(this));
    document.addEventListener('mousemove', this.onMouseMove.bind(this));
    document.addEventListener('mouseup', this.onMouseUp.bind(this));

    this.canvas.addEventListener('touchstart', this.onTouchStart.bind(this));
    document.addEventListener('touchmove', this.onTouchMove.bind(this));
    document.addEventListener('touchend', this.onTouchEnd.bind(this));
  }

  private getMousePos(e: MouseEvent | Touch): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) * (this.canvas.width / rect.width),
      y: (e.clientY - rect.top) * (this.canvas.height / rect.height)
    };
  }

  private isPointInHueRing(x: number, y: number): boolean {
    const cx = this.size / 2;
    const cy = this.size / 2;
    const dist = Math.sqrt((x - cx) ** 2 + (y - cy) ** 2);
    const outerR = this.size / 2 - 2;
    const innerR = this.size * 0.35;
    return dist >= innerR && dist <= outerR;
  }

  private isPointInTriangle(x: number, y: number): boolean {
    const cx = this.size / 2;
    const cy = this.size / 2;
    const size = this.size * 0.35;

    const topAngle = -Math.PI / 2;
    const leftAngle = -Math.PI / 2 + (Math.PI * 2) / 3;
    const rightAngle = -Math.PI / 2 - (Math.PI * 2) / 3;

    const top = { x: cx + Math.cos(topAngle) * size, y: cy + Math.sin(topAngle) * size };
    const left = { x: cx + Math.cos(leftAngle) * size, y: cy + Math.sin(leftAngle) * size };
    const right = { x: cx + Math.cos(rightAngle) * size, y: cy + Math.sin(rightAngle) * size };

    const d1 = this.sign(x, y, top.x, top.y, left.x, left.y);
    const d2 = this.sign(x, y, left.x, left.y, right.x, right.y);
    const d3 = this.sign(x, y, right.x, right.y, top.x, top.y);

    const hasNeg = d1 < 0 || d2 < 0 || d3 < 0;
    const hasPos = d1 > 0 || d2 > 0 || d3 > 0;

    return !(hasNeg && hasPos);
  }

  private sign(x1: number, y1: number, x2: number, y2: number, x3: number, y3: number): number {
    return (x1 - x3) * (y2 - y3) - (x2 - x3) * (y1 - y3);
  }

  private onMouseDown(e: MouseEvent): void {
    const pos = this.getMousePos(e);

    if (this.isPointInHueRing(pos.x, pos.y)) {
      this.isDraggingHue = true;
      this.updateHue(pos.x, pos.y);
    } else if (this.isPointInTriangle(pos.x, pos.y)) {
      this.isDraggingSL = true;
      this.updateSL(pos.x, pos.y);
    }
  }

  private onMouseMove(e: MouseEvent): void {
    const pos = this.getMousePos(e);

    if (this.isDraggingHue) {
      this.updateHue(pos.x, pos.y);
    } else if (this.isDraggingSL) {
      this.updateSL(pos.x, pos.y);
    }
  }

  private onMouseUp(): void {
    this.isDraggingHue = false;
    this.isDraggingSL = false;
  }

  private onTouchStart(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      const pos = this.getMousePos(e.touches[0]);

      if (this.isPointInHueRing(pos.x, pos.y)) {
        this.isDraggingHue = true;
        this.updateHue(pos.x, pos.y);
      } else if (this.isPointInTriangle(pos.x, pos.y)) {
        this.isDraggingSL = true;
        this.updateSL(pos.x, pos.y);
      }
    }
  }

  private onTouchMove(e: TouchEvent): void {
    e.preventDefault();
    if (e.touches.length === 1) {
      const pos = this.getMousePos(e.touches[0]);

      if (this.isDraggingHue) {
        this.updateHue(pos.x, pos.y);
      } else if (this.isDraggingSL) {
        this.updateSL(pos.x, pos.y);
      }
    }
  }

  private onTouchEnd(): void {
    this.isDraggingHue = false;
    this.isDraggingSL = false;
  }

  private updateHue(x: number, y: number): void {
    const cx = this.size / 2;
    const cy = this.size / 2;
    let angle = Math.atan2(y - cy, x - cx) + Math.PI / 2;
    if (angle < 0) angle += Math.PI * 2;
    this.hue = (angle / (Math.PI * 2)) * 360;

    this.draw();
    this.emitColor();
  }

  private updateSL(x: number, y: number): void {
    const size = this.size * 0.35;
    const sl = this.triangleToSL(x - this.slCenterX, y - this.slCenterY, size);
    this.saturation = sl.s;
    this.lightness = sl.l;

    this.draw();
    this.emitColor();
  }

  private emitColor(): void {
    const color = this.getColorHex();
    this.onColorChange(color);
  }

  public getColorHex(): string {
    const h = this.hue;
    const s = this.saturation;
    const l = this.lightness;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs(((h / 60) % 2) - 1));
    const m = l - c / 2;

    let r1 = 0, g1 = 0, b1 = 0;

    if (h < 60) {
      r1 = c; g1 = x; b1 = 0;
    } else if (h < 120) {
      r1 = x; g1 = c; b1 = 0;
    } else if (h < 180) {
      r1 = 0; g1 = c; b1 = x;
    } else if (h < 240) {
      r1 = 0; g1 = x; b1 = c;
    } else if (h < 300) {
      r1 = x; g1 = 0; b1 = c;
    } else {
      r1 = c; g1 = 0; b1 = x;
    }

    const r = Math.round((r1 + m) * 255);
    const g = Math.round((g1 + m) * 255);
    const b = Math.round((b1 + m) * 255);

    return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
  }

  public setColor(hex: string): void {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (!result) return;

    const r = parseInt(result[1], 16) / 255;
    const g = parseInt(result[2], 16) / 255;
    const b = parseInt(result[3], 16) / 255;

    const max = Math.max(r, g, b);
    const min = Math.min(r, g, b);
    let h = 0, s = 0;
    const l = (max + min) / 2;

    if (max !== min) {
      const d = max - min;
      s = l > 0.5 ? d / (2 - max - min) : d / (max + min);

      switch (max) {
        case r:
          h = ((g - b) / d + (g < b ? 6 : 0)) / 6;
          break;
        case g:
          h = ((b - r) / d + 2) / 6;
          break;
        case b:
          h = ((r - g) / d + 4) / 6;
          break;
      }
    }

    this.hue = h * 360;
    this.saturation = s;
    this.lightness = l;

    this.draw();
  }

  public getCanvas(): HTMLCanvasElement {
    return this.canvas;
  }
}
