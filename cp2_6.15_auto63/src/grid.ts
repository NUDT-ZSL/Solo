import { Brick } from './brick';

export class GridManager {
  public readonly cols: number = 20;
  public readonly rows: number = 15;
  public readonly cellSize: number = 50;
  public readonly gridLineColor: string = '#e0e0e0';
  public readonly gridLineWidth: number = 1;
  public readonly snapDistance: number = 15;

  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private gridOccupancy: (string | null)[][] = [];
  private bricks: Brick[] = [];

  public offsetX: number = 0;
  public offsetY: number = 0;
  public scale: number = 1;
  public minScale: number = 0.5;
  public maxScale: number = 2;
  public scaleStep: number = 0.1;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.initGridOccupancy();
    this.resizeCanvas();
  }

  private initGridOccupancy(): void {
    this.gridOccupancy = Array(this.rows)
      .fill(null)
      .map(() => Array(this.cols).fill(null));
  }

  public resizeCanvas(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const width = this.cols * this.cellSize;
    const height = this.rows * this.cellSize;

    this.canvas.width = width;
    this.canvas.height = height;
    this.canvas.style.width = `${width}px`;
    this.canvas.style.height = `${height}px`;

    this.centerCanvas();
  }

  public centerCanvas(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const canvasWidth = this.canvas.width * this.scale;
    const canvasHeight = this.canvas.height * this.scale;

    this.offsetX = (containerRect.width - canvasWidth) / 2;
    this.offsetY = (containerRect.height - canvasHeight) / 2;

    this.canvas.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
    this.canvas.style.transformOrigin = 'top left';
  }

  public drawGrid(): void {
    const ctx = this.ctx;
    const width = this.cols * this.cellSize;
    const height = this.rows * this.cellSize;

    ctx.clearRect(0, 0, width, height);

    ctx.strokeStyle = this.gridLineColor;
    ctx.lineWidth = this.gridLineWidth;

    for (let col = 0; col <= this.cols; col++) {
      const x = col * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, height);
      ctx.stroke();
    }

    for (let row = 0; row <= this.rows; row++) {
      const y = row * this.cellSize;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();
    }
  }

  public drawBricks(): void {
    for (const brick of this.bricks) {
      brick.draw(this.ctx, this.cellSize, 0, 0, 1);
    }
  }

  public drawDropPreview(
    row: number,
    col: number,
    width: number,
    height: number,
    isValid: boolean
  ): void {
    const ctx = this.ctx;
    const x = col * this.cellSize;
    const y = row * this.cellSize;
    const w = width * this.cellSize;
    const h = height * this.cellSize;

    ctx.save();
    ctx.strokeStyle = isValid ? '#ff6f00' : '#ff5252';
    ctx.lineWidth = 2;
    ctx.setLineDash([6, 4]);
    ctx.strokeRect(x + 1, y + 1, w - 2, h - 2);
    ctx.restore();
  }

  public render(): void {
    this.drawGrid();
    this.drawBricks();
    this.drawZoomIndicator();
  }

  private drawZoomIndicator(): void {
    const ctx = this.ctx;
    const percent = Math.round(this.scale * 100);
    const text = `${percent}%`;
    const fontSize = 12;
    const paddingX = 8;
    const paddingY = 4;

    ctx.font = `${fontSize}px -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif`;
    const textMetrics = ctx.measureText(text);
    const textWidth = textMetrics.width;
    const boxWidth = textWidth + paddingX * 2;
    const boxHeight = fontSize + paddingY * 2;
    const boxX = 10;
    const boxY = 10;
    const radius = 4;

    ctx.save();
    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.beginPath();
    ctx.moveTo(boxX + radius, boxY);
    ctx.lineTo(boxX + boxWidth - radius, boxY);
    ctx.quadraticCurveTo(boxX + boxWidth, boxY, boxX + boxWidth, boxY + radius);
    ctx.lineTo(boxX + boxWidth, boxY + boxHeight - radius);
    ctx.quadraticCurveTo(boxX + boxWidth, boxY + boxHeight, boxX + boxWidth - radius, boxY + boxHeight);
    ctx.lineTo(boxX + radius, boxY + boxHeight);
    ctx.quadraticCurveTo(boxX, boxY + boxHeight, boxX, boxY + boxHeight - radius);
    ctx.lineTo(boxX, boxY + radius);
    ctx.quadraticCurveTo(boxX, boxY, boxX + radius, boxY);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = 'rgba(102, 102, 102, 0.6)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, boxX + paddingX, boxY + boxHeight / 2);
    ctx.restore();
  }

  public getGridPosition(clientX: number, clientY: number): { row: number; col: number } {
    const rect = this.canvas.getBoundingClientRect();
    const x = (clientX - rect.left) / this.scale;
    const y = (clientY - rect.top) / this.scale;

    const col = Math.floor(x / this.cellSize);
    const row = Math.floor(y / this.cellSize);

    return { row, col };
  }

  public getGridPositionPixel(clientX: number, clientY: number): { pixelX: number; pixelY: number } {
    const rect = this.canvas.getBoundingClientRect();
    const pixelX = (clientX - rect.left) / this.scale;
    const pixelY = (clientY - rect.top) / this.scale;
    return { pixelX, pixelY };
  }

  public snapToGrid(row: number, col: number): { row: number; col: number } {
    return {
      row: Math.max(0, Math.min(this.rows - 1, Math.round(row))),
      col: Math.max(0, Math.min(this.cols - 1, Math.round(col)))
    };
  }

  public snapToGridByPixel(clientX: number, clientY: number, brickWidth: number, brickHeight: number): { row: number; col: number; canPlace: boolean } {
    const container = this.canvas.parentElement;
    if (!container) {
      return { row: 0, col: 0, canPlace: false };
    }

    const containerRect = container.getBoundingClientRect();
    const containerMouseX = clientX - containerRect.left;
    const containerMouseY = clientY - containerRect.top;

    const gridOriginX = this.offsetX;
    const gridOriginY = this.offsetY;

    const gridMouseX = (containerMouseX - gridOriginX) / this.scale;
    const gridMouseY = (containerMouseY - gridOriginY) / this.scale;

    const brickPixelW = brickWidth * this.cellSize;
    const brickPixelH = brickHeight * this.cellSize;
    const anchorX = gridMouseX - brickPixelW / 2;
    const anchorY = gridMouseY - brickPixelH / 2;

    const rawColFloat = anchorX / this.cellSize;
    const rawRowFloat = anchorY / this.cellSize;

    const nearestCol = Math.round(rawColFloat);
    const nearestRow = Math.round(rawRowFloat);

    const nearestColPixel = nearestCol * this.cellSize;
    const nearestRowPixel = nearestRow * this.cellSize;

    const distToNearestColLine = Math.abs(anchorX - nearestColPixel);
    const distToNearestRowLine = Math.abs(anchorY - nearestRowPixel);

    let finalCol: number;
    let finalRow: number;

    if (distToNearestColLine <= this.snapDistance) {
      finalCol = nearestCol;
    } else {
      finalCol = Math.floor(rawColFloat);
    }

    if (distToNearestRowLine <= this.snapDistance) {
      finalRow = nearestRow;
    } else {
      finalRow = Math.floor(rawRowFloat);
    }

    const maxCol = this.cols - brickWidth;
    const maxRow = this.rows - brickHeight;
    const adjustedCol = Math.max(0, Math.min(maxCol, finalCol));
    const adjustedRow = Math.max(0, Math.min(maxRow, finalRow));

    return { row: adjustedRow, col: adjustedCol, canPlace: true };
  }

  public isInBounds(row: number, col: number, width: number, height: number): boolean {
    return row >= 0 && col >= 0 &&
           row + height <= this.rows &&
           col + width <= this.cols;
  }

  public checkCollision(
    row: number,
    col: number,
    width: number,
    height: number,
    excludeBrickId?: string
  ): boolean {
    if (!this.isInBounds(row, col, width, height)) {
      return true;
    }

    for (let r = row; r < row + height; r++) {
      for (let c = col; c < col + width; c++) {
        const occupant = this.gridOccupancy[r][c];
        if (occupant && occupant !== excludeBrickId) {
          return true;
        }
      }
    }
    return false;
  }

  public addBrick(brick: Brick): boolean {
    if (this.checkCollision(brick.row, brick.col, brick.width, brick.height)) {
      return false;
    }

    this.bricks.push(brick);
    this.occupyCells(brick);
    brick.startPlaceAnimation();
    return true;
  }

  public removeBrick(brickId: string): Brick | null {
    const index = this.bricks.findIndex(b => b.id === brickId);
    if (index === -1) return null;

    const brick = this.bricks[index];
    this.freeCells(brick);
    this.bricks.splice(index, 1);
    return brick;
  }

  public getBrickAt(row: number, col: number): Brick | null {
    for (const brick of this.bricks) {
      if (brick.containsPoint(row, col)) {
        return brick;
      }
    }
    return null;
  }

  public getBrickById(brickId: string): Brick | null {
    return this.bricks.find(b => b.id === brickId) || null;
  }

  public getAllBricks(): Brick[] {
    return [...this.bricks];
  }

  public clearAll(): void {
    this.bricks = [];
    this.initGridOccupancy();
  }

  public selectBrick(brickId: string | null): void {
    for (const brick of this.bricks) {
      brick.isSelected = brick.id === brickId;
    }
  }

  public rotateBrick(brickId: string): boolean {
    const brick = this.getBrickById(brickId);
    if (!brick) return false;

    this.freeCells(brick);
    brick.rotate();

    if (this.checkCollision(brick.row, brick.col, brick.width, brick.height, brickId)) {
      brick.rotate();
      brick.rotate();
      brick.rotate();
      this.occupyCells(brick);
      return false;
    }

    this.occupyCells(brick);
    return true;
  }

  private occupyCells(brick: Brick): void {
    for (let r = brick.row; r < brick.row + brick.height; r++) {
      for (let c = brick.col; c < brick.col + brick.width; c++) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          this.gridOccupancy[r][c] = brick.id;
        }
      }
    }
  }

  private freeCells(brick: Brick): void {
    for (let r = brick.row; r < brick.row + brick.height; r++) {
      for (let c = brick.col; c < brick.col + brick.width; c++) {
        if (r >= 0 && r < this.rows && c >= 0 && c < this.cols) {
          if (this.gridOccupancy[r][c] === brick.id) {
            this.gridOccupancy[r][c] = null;
          }
        }
      }
    }
  }

  public setScale(newScale: number, centerX?: number, centerY?: number): void {
    const clampedScale = Math.max(this.minScale, Math.min(this.maxScale, newScale));
    
    if (centerX !== undefined && centerY !== undefined) {
      const container = this.canvas.parentElement;
      if (container) {
        const rect = container.getBoundingClientRect();
        const mouseX = centerX - rect.left;
        const mouseY = centerY - rect.top;
        
        const oldScale = this.scale;
        const ratio = clampedScale / oldScale;
        
        this.offsetX = mouseX - (mouseX - this.offsetX) * ratio;
        this.offsetY = mouseY - (mouseY - this.offsetY) * ratio;
      }
    }

    this.scale = clampedScale;
    this.applyTransform();
  }

  public translate(dx: number, dy: number): void {
    this.offsetX += dx;
    this.offsetY += dy;

    this.applyBoundaryConstraints();
    this.applyTransform();
  }

  private applyBoundaryConstraints(): void {
    const container = this.canvas.parentElement;
    if (!container) return;

    const rect = container.getBoundingClientRect();
    const canvasWidth = this.canvas.width * this.scale;
    const canvasHeight = this.canvas.height * this.scale;

    const maxOffsetX = rect.width * 0.02;
    const maxOffsetY = rect.height * 0.02;
    const minOffsetX = rect.width - canvasWidth - maxOffsetX;
    const minOffsetY = rect.height - canvasHeight - maxOffsetY;

    let newOffsetX = this.offsetX;
    let newOffsetY = this.offsetY;

    if (newOffsetX > maxOffsetX) {
      const overshoot = newOffsetX - maxOffsetX;
      newOffsetX = maxOffsetX - overshoot * 0.5;
    } else if (newOffsetX < minOffsetX) {
      const overshoot = minOffsetX - newOffsetX;
      newOffsetX = minOffsetX + overshoot * 0.5;
    }

    if (newOffsetY > maxOffsetY) {
      const overshoot = newOffsetY - maxOffsetY;
      newOffsetY = maxOffsetY - overshoot * 0.5;
    } else if (newOffsetY < minOffsetY) {
      const overshoot = minOffsetY - newOffsetY;
      newOffsetY = minOffsetY + overshoot * 0.5;
    }

    this.offsetX = newOffsetX;
    this.offsetY = newOffsetY;
  }

  private applyTransform(): void {
    this.canvas.style.transform = `translate(${this.offsetX}px, ${this.offsetY}px) scale(${this.scale})`;
  }

  public startDeleteAnimation(brickId: string): boolean {
    const brick = this.getBrickById(brickId);
    if (!brick) return false;
    this.freeCells(brick);
    this.debugValidateOccupancy();
    brick.startDeleteAnimation();
    return true;
  }

  public updateAnimations(deltaTime: number): void {
    const bricksToRemove: string[] = [];

    for (const brick of this.bricks) {
      if (brick.isAnimating) {
        const shouldRemove = brick.updateAnimation(deltaTime);
        if (shouldRemove && brick.animationType === 'delete') {
          bricksToRemove.push(brick.id);
        }
      }
    }

    for (const brickId of bricksToRemove) {
      const brick = this.getBrickById(brickId);
      if (brick) {
        this.freeCells(brick);
      }
      const index = this.bricks.findIndex(b => b.id === brickId);
      if (index !== -1) {
        this.bricks.splice(index, 1);
      }
    }

    this.debugValidateOccupancy();
  }

  private debugValidateOccupancy(): void {
    const activeBrickIds = new Set(this.bricks.map(b => b.id));
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < this.cols; c++) {
        const occupant = this.gridOccupancy[r][c];
        if (occupant && !activeBrickIds.has(occupant)) {
          this.gridOccupancy[r][c] = null;
        }
      }
    }
  }

  public getCanvasSize(): { width: number; height: number } {
    return {
      width: this.cols * this.cellSize,
      height: this.rows * this.cellSize
    };
  }
}
