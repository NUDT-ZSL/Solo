export type ModuleType = 'conveyor_straight' | 'conveyor_curve' | 'arm' | 'saw' | 'hammer' | 'furnace' | 'input' | 'output';
export type Direction = 'up' | 'down' | 'left' | 'right';
export type ItemType = 'coal' | 'gold' | 'iron' | 'gear';

export interface Position {
  x: number;
  y: number;
}

export const GRID_COLS = 16;
export const GRID_ROWS = 12;
export let CELL_SIZE = 60;

export function setCellSize(size: number): void {
  CELL_SIZE = size;
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 15);
}

export function getDirectionVector(dir: Direction): Position {
  switch (dir) {
    case 'up': return { x: 0, y: -1 };
    case 'down': return { x: 0, y: 1 };
    case 'left': return { x: -1, y: 0 };
    case 'right': return { x: 1, y: 0 };
  }
}

export function getOppositeDirection(dir: Direction): Direction {
  switch (dir) {
    case 'up': return 'down';
    case 'down': return 'up';
    case 'left': return 'right';
    case 'right': return 'left';
  }
}

export abstract class BaseModule {
  id: string;
  type: ModuleType;
  gridX: number;
  gridY: number;
  isDeleting: boolean = false;
  deleteFlashCount: number = 0;
  deleteFlashTimer: number = 0;
  isHighlighted: boolean = false;
  highlightColor: string = '#00FF00';

  constructor(type: ModuleType, gridX: number, gridY: number) {
    this.id = generateId();
    this.type = type;
    this.gridX = gridX;
    this.gridY = gridY;
  }

  getCenterX(): number {
    return this.gridX * CELL_SIZE + CELL_SIZE / 2;
  }

  getCenterY(): number {
    return this.gridY * CELL_SIZE + CELL_SIZE / 2;
  }

  abstract render(ctx: CanvasRenderingContext2D): void;
  abstract update(dt: number): void;

  protected renderBase(ctx: CanvasRenderingContext2D, flash: boolean = false): void {
    const x = this.gridX * CELL_SIZE;
    const y = this.gridY * CELL_SIZE;
    const size = CELL_SIZE;
    const padding = 4;

    if (this.isHighlighted || this.isDeleting) {
      ctx.save();
      if (this.isDeleting) {
        ctx.globalAlpha = this.deleteFlashCount % 2 === 0 ? 1 : 0.3;
        ctx.fillStyle = '#FF0000';
      } else {
        ctx.globalAlpha = 0.3;
        ctx.fillStyle = this.highlightColor;
      }
      ctx.fillRect(x + 2, y + 2, size - 4, size - 4);
      ctx.restore();
    }

    ctx.save();
    const gradient = ctx.createLinearGradient(x, y, x + size, y + size);
    gradient.addColorStop(0, flash ? '#7C6053' : '#5C4033');
    gradient.addColorStop(1, flash ? '#6A4738' : '#4A3728');
    
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.roundRect(x + padding, y + padding, size - padding * 2, size - padding * 2, 6);
    ctx.fill();

    ctx.strokeStyle = '#B87333';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();
  }

  toJSON(): Record<string, unknown> {
    return {
      id: this.id,
      type: this.type,
      gridX: this.gridX,
      gridY: this.gridY
    };
  }
}

export class ConveyorModule extends BaseModule {
  direction: Direction;
  isCurve: boolean;

  constructor(type: 'conveyor_straight' | 'conveyor_curve', gridX: number, gridY: number, direction: Direction = 'right') {
    super(type, gridX, gridY);
    this.direction = direction;
    this.isCurve = type === 'conveyor_curve';
  }

  update(_dt: number): void {}

  render(ctx: CanvasRenderingContext2D): void {
    this.renderBase(ctx);
    const cx = this.getCenterX();
    const cy = this.getCenterY();
    const size = CELL_SIZE;

    ctx.save();
    ctx.translate(cx, cy);

    let rotation = 0;
    switch (this.direction) {
      case 'right': rotation = 0; break;
      case 'down': rotation = Math.PI / 2; break;
      case 'left': rotation = Math.PI; break;
      case 'up': rotation = -Math.PI / 2; break;
    }
    ctx.rotate(rotation);

    if (this.isCurve) {
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 6;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.arc(-size / 4, -size / 4, size / 2.5, 0, Math.PI / 2);
      ctx.stroke();

      ctx.strokeStyle = '#808080';
      ctx.lineWidth = 2;
      for (let i = 0; i < 5; i++) {
        const angle = (Math.PI / 2) * (i / 4);
        const r1 = size / 2.5 - 4;
        const r2 = size / 2.5 + 4;
        ctx.beginPath();
        ctx.moveTo(
          -size / 4 + Math.cos(angle) * r1,
          -size / 4 + Math.sin(angle) * r1
        );
        ctx.lineTo(
          -size / 4 + Math.cos(angle) * r2,
          -size / 4 + Math.sin(angle) * r2
        );
        ctx.stroke();
      }
    } else {
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(-size / 2 + 6, 0);
      ctx.lineTo(size / 2 - 6, 0);
      ctx.stroke();

      ctx.strokeStyle = '#808080';
      ctx.lineWidth = 2;
      for (let i = -3; i <= 3; i++) {
        ctx.beginPath();
        ctx.moveTo(i * 8, -10);
        ctx.lineTo(i * 8, 10);
        ctx.stroke();
      }

      ctx.fillStyle = '#D4AF37';
      ctx.beginPath();
      ctx.moveTo(size / 2 - 8, 0);
      ctx.lineTo(size / 2 - 16, -6);
      ctx.lineTo(size / 2 - 16, 6);
      ctx.closePath();
      ctx.fill();
    }

    ctx.restore();
  }

  toJSON(): Record<string, unknown> {
    const json = super.toJSON();
    json.direction = this.direction;
    return json;
  }
}

export class ArmModule extends BaseModule {
  targetAngle: number = 90;
  currentAngle: number = 0;
  isGrabbing: boolean = false;
  grabTimer: number = 0;
  armProgress: number = 0;

  constructor(gridX: number, gridY: number) {
    super('arm', gridX, gridY);
  }

  update(dt: number): void {
    if (this.isGrabbing) {
      this.grabTimer += dt;
      this.armProgress = Math.min(1, this.grabTimer / 2.0);
      const startAngle = this.currentAngle;
      const endAngle = this.targetAngle;
      this.currentAngle = startAngle + (endAngle - startAngle) * (this.armProgress < 0.5 ? this.armProgress * 2 : (1 - this.armProgress) * 2);
      
      if (this.grabTimer >= 2.0) {
        this.isGrabbing = false;
        this.grabTimer = 0;
        this.armProgress = 0;
        this.currentAngle = 0;
      }
    }
  }

  startGrab(): void {
    if (!this.isGrabbing) {
      this.isGrabbing = true;
      this.grabTimer = 0;
      this.armProgress = 0;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderBase(ctx);
    const cx = this.getCenterX();
    const cy = this.getCenterY();
    const size = CELL_SIZE;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = '#808080';
    ctx.beginPath();
    ctx.arc(0, 0, size / 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.save();
    ctx.rotate((this.currentAngle * Math.PI) / 180);
    
    ctx.fillStyle = '#606060';
    ctx.strokeStyle = '#B87333';
    ctx.lineWidth = 2;
    
    const armLength = size / 2.2;
    const armWidth = 8;
    
    ctx.fillRect(-armWidth / 2, -armWidth / 2, armLength, armWidth);
    ctx.strokeRect(-armWidth / 2, -armWidth / 2, armLength, armWidth);

    ctx.fillStyle = '#D4AF37';
    ctx.beginPath();
    ctx.arc(armLength, 0, 6, 0, Math.PI * 2);
    ctx.fill();

    if (this.isGrabbing && this.armProgress > 0.3 && this.armProgress < 0.8) {
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.moveTo(armLength - 4, -4);
      ctx.lineTo(armLength - 12, -10);
      ctx.moveTo(armLength + 4, -4);
      ctx.lineTo(armLength + 12, -10);
      ctx.stroke();
    }

    ctx.restore();

    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 10px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.targetAngle}°`, 0, size / 2 - 6);

    ctx.restore();
  }

  toJSON(): Record<string, unknown> {
    const json = super.toJSON();
    json.targetAngle = this.targetAngle;
    return json;
  }
}

export class ProcessorModule extends BaseModule {
  processTime: number = 3;
  processing: boolean = false;
  processProgress: number = 0;
  iconRotation: number = 0;
  currentItemId: string | null = null;
  resultItemType: ItemType = 'iron';

  constructor(type: 'saw' | 'hammer' | 'furnace', gridX: number, gridY: number) {
    super(type, gridX, gridY);
    switch (type) {
      case 'saw': this.resultItemType = 'gold'; break;
      case 'hammer': this.resultItemType = 'gear'; break;
      case 'furnace': this.resultItemType = 'iron'; break;
    }
  }

  update(dt: number): void {
    if (this.processing) {
      this.processProgress += dt / this.processTime;
      this.iconRotation += dt * Math.PI * 1.5;
      if (this.processProgress >= 1) {
        this.processing = false;
        this.processProgress = 0;
      }
    }
  }

  startProcessing(itemId: string): void {
    if (!this.processing) {
      this.processing = true;
      this.processProgress = 0;
      this.currentItemId = itemId;
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    this.renderBase(ctx);
    const cx = this.getCenterX();
    const cy = this.getCenterY();
    const size = CELL_SIZE;

    ctx.save();
    ctx.translate(cx, cy);

    if (this.processing) {
      ctx.save();
      ctx.rotate(this.iconRotation);
      this.renderProcessorIcon(ctx, size);
      ctx.restore();
    } else {
      this.renderProcessorIcon(ctx, size);
    }

    if (this.processing) {
      ctx.strokeStyle = '#D4AF37';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(0, 0, size / 2 - 8, -Math.PI / 2, -Math.PI / 2 + this.processProgress * Math.PI * 2);
      ctx.stroke();
    }

    ctx.fillStyle = this.processing ? '#FF6600' : '#D4AF37';
    ctx.font = 'bold 9px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.processTime}s`, 0, size / 2 - 4);

    ctx.restore();
  }

  private renderProcessorIcon(ctx: CanvasRenderingContext2D, size: number): void {
    ctx.strokeStyle = '#D4AF37';
    ctx.fillStyle = '#C0C0C0';
    ctx.lineWidth = 2;

    switch (this.type) {
      case 'saw':
        ctx.beginPath();
        for (let i = 0; i < 16; i++) {
          const angle = (i / 16) * Math.PI * 2;
          const r = i % 2 === 0 ? size / 4 : size / 5;
          const x = Math.cos(angle) * r;
          const y = Math.sin(angle) * r;
          if (i === 0) ctx.moveTo(x, y);
          else ctx.lineTo(x, y);
        }
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
        
        ctx.fillStyle = '#4A3728';
        ctx.beginPath();
        ctx.arc(0, 0, size / 12, 0, Math.PI * 2);
        ctx.fill();
        break;

      case 'hammer':
        ctx.fillStyle = '#808080';
        ctx.fillRect(-size / 6, -size / 4, size / 3, size / 6);
        ctx.strokeRect(-size / 6, -size / 4, size / 3, size / 6);
        
        ctx.fillStyle = '#B87333';
        ctx.fillRect(-size / 20, 0, size / 10, size / 3);
        ctx.strokeRect(-size / 20, 0, size / 10, size / 3);
        break;

      case 'furnace':
        ctx.fillStyle = '#606060';
        ctx.fillRect(-size / 4, -size / 4, size / 2, size / 2);
        ctx.strokeRect(-size / 4, -size / 4, size / 2, size / 2);
        
        ctx.fillStyle = this.processing ? '#FF4400' : '#4A3728';
        ctx.fillRect(-size / 6, -size / 6, size / 3, size / 3);
        ctx.strokeRect(-size / 6, -size / 6, size / 3, size / 3);

        if (this.processing) {
          ctx.fillStyle = '#FF8800';
          for (let i = 0; i < 3; i++) {
            ctx.beginPath();
            ctx.arc((i - 1) * 5, 0, 3, 0, Math.PI * 2);
            ctx.fill();
          }
        }
        break;
    }
  }

  toJSON(): Record<string, unknown> {
    const json = super.toJSON();
    json.processTime = this.processTime;
    return json;
  }
}

export class InputModule extends BaseModule {
  spawnTimer: number = 0;
  spawnInterval: number = 3;

  constructor(gridX: number, gridY: number) {
    super('input', gridX, gridY);
  }

  update(_dt: number): void {}

  render(ctx: CanvasRenderingContext2D): void {
    this.renderBase(ctx);
    const cx = this.getCenterX();
    const cy = this.getCenterY();
    const size = CELL_SIZE;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = '#4A3728';
    ctx.strokeStyle = '#B87333';
    ctx.lineWidth = 2;
    
    ctx.beginPath();
    ctx.moveTo(-size / 3, -size / 3);
    ctx.lineTo(size / 3, -size / 3);
    ctx.lineTo(size / 4, size / 4);
    ctx.lineTo(-size / 4, size / 4);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#606060';
    ctx.fillRect(-size / 4, size / 4, size / 2, 6);
    ctx.strokeRect(-size / 4, size / 4, size / 2, 6);

    ctx.fillStyle = '#8B4513';
    for (let i = 0; i < 4; i++) {
      const px = (Math.random() - 0.5) * size / 2;
      const py = (Math.random() - 0.5) * size / 3;
      ctx.beginPath();
      ctx.ellipse(px, py, 5, 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 9px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('煤斗', 0, size / 2 - 4);

    ctx.restore();
  }

  toJSON(): Record<string, unknown> {
    return super.toJSON();
  }
}

export class OutputModule extends BaseModule {
  receivedCount: number = 0;

  constructor(gridX: number, gridY: number) {
    super('output', gridX, gridY);
  }

  update(_dt: number): void {}

  render(ctx: CanvasRenderingContext2D): void {
    this.renderBase(ctx);
    const cx = this.getCenterX();
    const cy = this.getCenterY();
    const size = CELL_SIZE;

    ctx.save();
    ctx.translate(cx, cy);

    ctx.fillStyle = '#8B4513';
    ctx.strokeStyle = '#D4AF37';
    ctx.lineWidth = 2;
    
    ctx.fillRect(-size / 3, -size / 4, size / 1.5, size / 2);
    ctx.strokeRect(-size / 3, -size / 4, size / 1.5, size / 2);

    ctx.strokeStyle = '#B87333';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(0, -size / 4);
    ctx.lineTo(0, size / 4);
    ctx.moveTo(-size / 3, 0);
    ctx.lineTo(size / 3, 0);
    ctx.stroke();

    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 14px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText('📦', 0, 4);

    ctx.fillStyle = '#D4AF37';
    ctx.font = 'bold 9px Courier New';
    ctx.textAlign = 'center';
    ctx.fillText(`${this.receivedCount}`, 0, size / 2 - 4);

    ctx.restore();
  }

  toJSON(): Record<string, unknown> {
    return super.toJSON();
  }
}

export class Item {
  id: string;
  type: ItemType;
  x: number;
  y: number;
  direction: Direction;
  speed: number = 2;
  paused: boolean = false;
  pauseTimer: number = 0;
  processing: boolean = false;
  currentProcessorId: string | null = null;
  birthTime: number = Date.now();

  constructor(type: ItemType, x: number, y: number, direction: Direction = 'right') {
    this.id = generateId();
    this.type = type;
    this.x = x;
    this.y = y;
    this.direction = direction;
  }

  getColor(): string {
    switch (this.type) {
      case 'coal': return '#8B4513';
      case 'gold': return '#FFD700';
      case 'iron': return '#C0C0C0';
      case 'gear': return '#B87333';
    }
  }

  render(ctx: CanvasRenderingContext2D): void {
    ctx.save();
    ctx.translate(this.x, this.y);

    const sizeScale = this.type === 'coal' ? 1 : 1.2;
    const width = 8 * sizeScale;
    const height = 6 * sizeScale;

    ctx.fillStyle = this.getColor();
    ctx.strokeStyle = this.type === 'coal' ? '#5C3317' : '#808080';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.ellipse(0, 0, width, height, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();

    if (this.type !== 'coal') {
      ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
      ctx.beginPath();
      ctx.ellipse(-width / 3, -height / 3, width / 3, height / 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    if (this.processing) {
      ctx.strokeStyle = '#FF6600';
      ctx.lineWidth = 2;
      ctx.setLineDash([2, 2]);
      ctx.beginPath();
      ctx.arc(0, 0, width + 4, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }
}

export function createModuleFromJSON(data: Record<string, unknown>): BaseModule | null {
  const type = data.type as ModuleType;
  const gridX = data.gridX as number;
  const gridY = data.gridY as number;

  switch (type) {
    case 'conveyor_straight':
    case 'conveyor_curve': {
      const conveyor = new ConveyorModule(type, gridX, gridY, data.direction as Direction || 'right');
      conveyor.id = data.id as string;
      return conveyor;
    }
    case 'arm': {
      const arm = new ArmModule(gridX, gridY);
      arm.targetAngle = data.targetAngle as number || 90;
      arm.id = data.id as string;
      return arm;
    }
    case 'saw':
    case 'hammer':
    case 'furnace': {
      const processor = new ProcessorModule(type, gridX, gridY);
      processor.processTime = data.processTime as number || 3;
      processor.id = data.id as string;
      return processor;
    }
    case 'input': {
      const input = new InputModule(gridX, gridY);
      input.id = data.id as string;
      return input;
    }
    case 'output': {
      const output = new OutputModule(gridX, gridY);
      output.id = data.id as string;
      return output;
    }
    default:
      return null;
  }
}
