export type BrickType = 'square2x2' | 'rect2x4' | 'flat1x2' | 'small1x1';

export interface BrickConfig {
  type: BrickType;
  color: string;
  width: number;
  height: number;
  name: string;
}

export const BRICK_CONFIGS: Record<BrickType, BrickConfig> = {
  square2x2: { type: 'square2x2', color: '#ff5252', width: 2, height: 2, name: '2x2正方形' },
  rect2x4: { type: 'rect2x4', color: '#448aff', width: 4, height: 2, name: '2x4长方形' },
  flat1x2: { type: 'flat1x2', color: '#69f0ae', width: 2, height: 1, name: '1x2扁条' },
  small1x1: { type: 'small1x1', color: '#b388ff', width: 1, height: 1, name: '1x1小方块' }
};

export interface BrickData {
  id: string;
  type: BrickType;
  row: number;
  col: number;
  width: number;
  height: number;
  color: string;
  rotation: number;
}

let brickIdCounter = 0;

export class Brick {
  public id: string;
  public type: BrickType;
  public color: string;
  public row: number;
  public col: number;
  public width: number;
  public height: number;
  public rotation: number = 0;
  public isSelected: boolean = false;
  public isAnimating: boolean = false;
  public animationProgress: number = 0;
  public animationType: 'place' | 'delete' | null = null;
  public scale: number = 1;
  public opacity: number = 1;
  public deleteRotation: number = 0;

  constructor(type: BrickType, row: number, col: number) {
    const config = BRICK_CONFIGS[type];
    this.id = `brick_${++brickIdCounter}_${Date.now()}`;
    this.type = type;
    this.color = config.color;
    this.width = config.width;
    this.height = config.height;
    this.row = row;
    this.col = col;
  }

  public static fromData(data: BrickData): Brick {
    const brick = new Brick(data.type, data.row, data.col);
    brick.id = data.id;
    brick.width = data.width;
    brick.height = data.height;
    brick.color = data.color;
    brick.rotation = data.rotation;
    return brick;
  }

  public toData(): BrickData {
    return {
      id: this.id,
      type: this.type,
      row: this.row,
      col: this.col,
      width: this.width,
      height: this.height,
      color: this.color,
      rotation: this.rotation
    };
  }

  public rotate(): void {
    const temp = this.width;
    this.width = this.height;
    this.height = temp;
    this.rotation = (this.rotation + 90) % 360;
  }

  public containsPoint(gridRow: number, gridCol: number): boolean {
    return gridRow >= this.row && gridRow < this.row + this.height &&
           gridCol >= this.col && gridCol < this.col + this.width;
  }

  public draw(
    ctx: CanvasRenderingContext2D,
    cellSize: number,
    offsetX: number = 0,
    offsetY: number = 0,
    scale: number = 1
  ): void {
    const x = offsetX + this.col * cellSize * scale;
    const y = offsetY + this.row * cellSize * scale;
    const w = this.width * cellSize * scale * this.scale;
    const h = this.height * cellSize * scale * this.scale;
    const radius = 4 * scale;
    const borderWidth = this.isSelected ? 3 * scale : 1 * scale;

    ctx.save();
    ctx.globalAlpha = this.opacity;

    const centerX = x + w / 2;
    const centerY = y + h / 2;
    ctx.translate(centerX, centerY);
    ctx.rotate((this.deleteRotation * Math.PI) / 180);
    ctx.translate(-centerX, -centerY);

    ctx.fillStyle = this.color;
    ctx.beginPath();
    this.roundRect(ctx, x + borderWidth, y + borderWidth, w - borderWidth * 2, h - borderWidth * 2, radius);
    ctx.fill();

    ctx.strokeStyle = this.isSelected ? '#ff6f00' : 'rgba(0,0,0,0.2)';
    ctx.lineWidth = borderWidth;
    ctx.stroke();

    this.drawStuds(ctx, x, y, w, h, cellSize * scale);

    if (this.isSelected) {
      this.drawRotateIcon(ctx, x, y, w, h, scale);
    }

    ctx.restore();
  }

  private drawStuds(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    cellSize: number
  ): void {
    const studRadius = cellSize * 0.15;
    const studSpacing = cellSize;
    const startX = x + cellSize / 2;
    const startY = y + cellSize / 2;

    ctx.fillStyle = 'rgba(255,255,255,0.3)';
    for (let row = 0; row < this.height; row++) {
      for (let col = 0; col < this.width; col++) {
        const studX = startX + col * studSpacing;
        const studY = startY + row * studSpacing;
        ctx.beginPath();
        ctx.arc(studX, studY, studRadius, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private drawRotateIcon(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number,
    scale: number
  ): void {
    const iconSize = 12 * scale;
    const iconX = x + w - iconSize / 2;
    const iconY = y - iconSize / 2;

    ctx.fillStyle = '#ff6f00';
    ctx.beginPath();
    ctx.arc(iconX, iconY, iconSize / 2, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#fff';
    ctx.font = `${8 * scale}px Arial`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('↻', iconX, iconY);
  }

  private roundRect(
    ctx: CanvasRenderingContext2D,
    x: number, y: number, w: number, h: number, r: number
  ): void {
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

  public startPlaceAnimation(): void {
    this.isAnimating = true;
    this.animationType = 'place';
    this.animationProgress = 0;
    this.scale = 1.1;
  }

  public startDeleteAnimation(): void {
    this.isAnimating = true;
    this.animationType = 'delete';
    this.animationProgress = 0;
    this.opacity = 1;
    this.deleteRotation = 0;
  }

  public updateAnimation(deltaTime: number): boolean {
    if (!this.isAnimating) return false;

    this.animationProgress += deltaTime;

    if (this.animationType === 'place') {
      const duration = 0.2;
      const t = Math.min(this.animationProgress / duration, 1);
      const springT = this.springEaseOut(t);
      this.scale = 1 + 0.1 * (1 - springT);

      if (t >= 1) {
        this.isAnimating = false;
        this.animationType = null;
        this.scale = 1;
      }
    } else if (this.animationType === 'delete') {
      const duration = 0.3;
      const t = Math.min(this.animationProgress / duration, 1);
      this.opacity = 1 - t;
      this.deleteRotation = 90 * t;

      if (t >= 1) {
        this.isAnimating = false;
        this.animationType = null;
        return true;
      }
    }

    return false;
  }

  private springEaseOut(t: number): number {
    const c4 = (2 * Math.PI) / 3;
    return t === 0 ? 0 : t === 1 ? 1 :
      Math.pow(2, -10 * t) * Math.sin((t * 10 - 0.75) * c4) + 1;
  }

  public isPointOnRotateIcon(
    mouseX: number, mouseY: number,
    cellSize: number, offsetX: number, offsetY: number, scale: number
  ): boolean {
    if (!this.isSelected) return false;
    const x = offsetX + this.col * cellSize * scale;
    const y = offsetY + this.row * cellSize * scale;
    const w = this.width * cellSize * scale;
    const iconSize = 12 * scale;
    const iconX = x + w - iconSize / 2;
    const iconY = y - iconSize / 2;
    const dist = Math.sqrt((mouseX - iconX) ** 2 + (mouseY - iconY) ** 2);
    return dist <= iconSize / 2;
  }
}
