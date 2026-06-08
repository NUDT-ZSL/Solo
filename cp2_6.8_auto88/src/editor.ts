export type ObstacleType = 'wall' | 'spike' | 'platform';
export type ToolType = ObstacleType | 'beat' | null;

export interface Obstacle {
  id: string;
  type: ObstacleType;
  x: number;
  baseY: number;
  width: number;
  height: number;
  color: string;
}

export interface Beat {
  id: string;
  x: number;
  time: number;
}

export interface Level {
  id: string;
  name: string;
  obstacles: Obstacle[];
  beats: Beat[];
  createdAt: number;
}

export interface LevelSnapshot {
  obstacles: Obstacle[];
  beats: Beat[];
}

const GRID_SIZE = 50;
const CANVAS_WIDTH = 1200;
const CANVAS_HEIGHT = 600;
const GROUND_Y = 520;
const MAX_HISTORY = 10;

const OBSTACLE_CONFIG: Record<ObstacleType, { width: number; height: number; color: string }> = {
  wall: { width: 40, height: 30, color: '#E74C3C' },
  spike: { width: 40, height: 20, color: '#F39C12' },
  platform: { width: 80, height: 20, color: '#3498DB' }
};

export class Editor {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private timelineCanvas: HTMLCanvasElement;
  private timelineCtx: CanvasRenderingContext2D;

  obstacles: Obstacle[] = [];
  beats: Beat[] = [];
  selectedTool: ToolType = null;

  private undoStack: LevelSnapshot[] = [];
  private redoStack: LevelSnapshot[] = [];

  private scrollX = 0;
  private mouseX = 0;
  private mouseY = 0;
  private isDraggingScroll = false;
  private dragStartX = 0;
  private scrollStartX = 0;

  private onChangeCallback: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement, timelineCanvas: HTMLCanvasElement) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.timelineCanvas = timelineCanvas;
    this.timelineCtx = timelineCanvas.getContext('2d')!;
    this.bindEvents();
  }

  onChange(callback: () => void): void {
    this.onChangeCallback = callback;
  }

  private notifyChange(): void {
    if (this.onChangeCallback) this.onChangeCallback();
  }

  private snapToGrid(value: number): number {
    return Math.round(value / GRID_SIZE) * GRID_SIZE;
  }

  private generateId(): string {
    return Math.random().toString(36).substring(2, 10);
  }

  saveSnapshot(): void {
    const snapshot: LevelSnapshot = {
      obstacles: JSON.parse(JSON.stringify(this.obstacles)),
      beats: JSON.parse(JSON.stringify(this.beats))
    };
    this.undoStack.push(snapshot);
    if (this.undoStack.length > MAX_HISTORY) {
      this.undoStack.shift();
    }
    this.redoStack = [];
    this.notifyChange();
  }

  undo(): boolean {
    if (this.undoStack.length === 0) return false;
    const current: LevelSnapshot = {
      obstacles: JSON.parse(JSON.stringify(this.obstacles)),
      beats: JSON.parse(JSON.stringify(this.beats))
    };
    this.redoStack.push(current);
    const prev = this.undoStack.pop()!;
    this.obstacles = prev.obstacles;
    this.beats = prev.beats;
    this.notifyChange();
    return true;
  }

  redo(): boolean {
    if (this.redoStack.length === 0) return false;
    const current: LevelSnapshot = {
      obstacles: JSON.parse(JSON.stringify(this.obstacles)),
      beats: JSON.parse(JSON.stringify(this.beats))
    };
    this.undoStack.push(current);
    const next = this.redoStack.pop()!;
    this.obstacles = next.obstacles;
    this.beats = next.beats;
    this.notifyChange();
    return true;
  }

  getUndoCount(): number {
    return this.undoStack.length;
  }

  getRedoCount(): number {
    return this.redoStack.length;
  }

  setTool(tool: ToolType): void {
    this.selectedTool = tool;
    this.canvas.classList.toggle('tool-active', tool !== null);
    this.notifyChange();
  }

  private bindEvents(): void {
    this.canvas.addEventListener('mousedown', (e) => this.onCanvasMouseDown(e));
    this.canvas.addEventListener('mousemove', (e) => this.onCanvasMouseMove(e));
    this.canvas.addEventListener('mouseup', (e) => this.onCanvasMouseUp(e));
    this.canvas.addEventListener('mouseleave', () => { this.isDraggingScroll = false; });
    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    this.timelineCanvas.addEventListener('click', (e) => this.onTimelineClick(e));
  }

  private getCanvasMouse(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX + this.scrollX,
      y: (e.clientY - rect.top) * scaleY
    };
  }

  private onCanvasMouseDown(e: MouseEvent): void {
    if (e.button === 1 || e.shiftKey) {
      this.isDraggingScroll = true;
      this.dragStartX = e.clientX;
      this.scrollStartX = this.scrollX;
      return;
    }

    if (e.button === 2) {
      const pos = this.getCanvasMouse(e);
      this.deleteAt(pos.x, pos.y);
      return;
    }

    if (e.button !== 0) return;

    const pos = this.getCanvasMouse(e);

    if (this.selectedTool === 'wall' || this.selectedTool === 'spike' || this.selectedTool === 'platform') {
      this.placeObstacle(this.selectedTool, pos.x);
    } else if (this.selectedTool === 'beat') {
      this.placeBeat(pos.x);
    } else {
      this.deleteAt(pos.x, pos.y);
    }
  }

  private onCanvasMouseMove(e: MouseEvent): void {
    if (this.isDraggingScroll) {
      const delta = e.clientX - this.dragStartX;
      this.scrollX = Math.max(0, this.scrollStartX - delta);
      return;
    }

    const pos = this.getCanvasMouse(e);
    this.mouseX = pos.x;
    this.mouseY = pos.y;
  }

  private onCanvasMouseUp(_e: MouseEvent): void {
    this.isDraggingScroll = false;
  }

  private onTimelineClick(e: MouseEvent): void {
    if (this.selectedTool !== 'beat') return;
    const rect = this.timelineCanvas.getBoundingClientRect();
    const scaleX = this.timelineCanvas.width / rect.width;
    const x = (e.clientX - rect.left) * scaleX + this.scrollX;
    this.placeBeat(x);
  }

  private placeObstacle(type: ObstacleType, worldX: number): void {
    const snappedX = this.snapToGrid(worldX);
    if (snappedX < GRID_SIZE) return;

    const existing = this.obstacles.find(o => Math.abs(o.x - snappedX) < 10);
    if (existing) return;

    const config = OBSTACLE_CONFIG[type];
    this.saveSnapshot();
    this.obstacles.push({
      id: this.generateId(),
      type,
      x: snappedX,
      baseY: GROUND_Y,
      width: config.width,
      height: config.height,
      color: config.color
    });
    this.notifyChange();
  }

  private placeBeat(worldX: number): void {
    const snappedX = this.snapToGrid(worldX);
    if (snappedX < GRID_SIZE) return;

    const existing = this.beats.find(b => Math.abs(b.x - snappedX) < 10);
    if (existing) return;

    this.saveSnapshot();
    this.beats.push({
      id: this.generateId(),
      x: snappedX,
      time: 0
    });
    this.notifyChange();
  }

  private deleteAt(x: number, _y: number): void {
    const obstacleIdx = this.obstacles.findIndex(o =>
      x >= o.x - o.width / 2 - 5 && x <= o.x + o.width / 2 + 5
    );
    if (obstacleIdx !== -1) {
      this.saveSnapshot();
      this.obstacles.splice(obstacleIdx, 1);
      this.notifyChange();
      return;
    }

    const beatIdx = this.beats.findIndex(b => Math.abs(b.x - x) < 15);
    if (beatIdx !== -1) {
      this.saveSnapshot();
      this.beats.splice(beatIdx, 1);
      this.notifyChange();
    }
  }

  getScrollX(): number {
    return this.scrollX;
  }

  setScrollX(x: number): void {
    this.scrollX = x;
  }

  clear(): void {
    this.saveSnapshot();
    this.obstacles = [];
    this.beats = [];
    this.scrollX = 0;
    this.notifyChange();
  }

  loadLevel(level: Level): void {
    this.saveSnapshot();
    this.obstacles = JSON.parse(JSON.stringify(level.obstacles));
    this.beats = JSON.parse(JSON.stringify(level.beats));
    this.scrollX = 0;
    this.notifyChange();
  }

  getLevelData(name: string): Level {
    return {
      id: this.generateId(),
      name,
      obstacles: JSON.parse(JSON.stringify(this.obstacles)),
      beats: JSON.parse(JSON.stringify(this.beats)),
      createdAt: Date.now()
    };
  }

  getGroundY(): number {
    return GROUND_Y;
  }

  getGridSize(): number {
    return GRID_SIZE;
  }

  render(): void {
    const ctx = this.ctx;
    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.fillStyle = '#2A2A2E';
    ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    ctx.strokeStyle = '#3D3D42';
    ctx.lineWidth = 1;
    const startX = -(this.scrollX % GRID_SIZE);
    for (let x = startX; x < CANVAS_WIDTH; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, CANVAS_HEIGHT);
      ctx.stroke();
    }
    for (let y = 0; y < CANVAS_HEIGHT; y += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(CANVAS_WIDTH, y);
      ctx.stroke();
    }

    ctx.strokeStyle = '#555';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(0, GROUND_Y);
    ctx.lineTo(CANVAS_WIDTH, GROUND_Y);
    ctx.stroke();

    for (const obs of this.obstacles) {
      const screenX = obs.x - this.scrollX;
      if (screenX < -100 || screenX > CANVAS_WIDTH + 100) continue;
      this.renderObstacle(obs, screenX);
    }

    for (const beat of this.beats) {
      const screenX = beat.x - this.scrollX;
      if (screenX < -20 || screenX > CANVAS_WIDTH + 20) continue;
      ctx.strokeStyle = 'rgba(155, 89, 182, 0.3)';
      ctx.lineWidth = 2;
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(screenX, 0);
      ctx.lineTo(screenX, GROUND_Y);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    if (this.selectedTool && this.mouseX > 0) {
      const snappedX = this.snapToGrid(this.mouseX);
      const screenX = snappedX - this.scrollX;

      if (this.selectedTool === 'wall' || this.selectedTool === 'spike' || this.selectedTool === 'platform') {
        const config = OBSTACLE_CONFIG[this.selectedTool];
        ctx.globalAlpha = 0.5;
        this.renderObstacle({
          id: 'preview',
          type: this.selectedTool,
          x: snappedX,
          baseY: GROUND_Y,
          width: config.width,
          height: config.height,
          color: config.color
        }, screenX);
        ctx.globalAlpha = 1;
      } else if (this.selectedTool === 'beat') {
        ctx.strokeStyle = 'rgba(155, 89, 182, 0.5)';
        ctx.lineWidth = 2;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.moveTo(screenX, 0);
        ctx.lineTo(screenX, GROUND_Y);
        ctx.stroke();
        ctx.setLineDash([]);
      }
    }

    this.renderTimeline();
  }

  private renderObstacle(obs: Obstacle, screenX: number): void {
    const ctx = this.ctx;
    const left = screenX - obs.width / 2;
    const top = obs.baseY - obs.height;

    if (obs.type === 'spike') {
      ctx.fillStyle = obs.color;
      const spikes = 4;
      const spikeWidth = obs.width / spikes;
      ctx.beginPath();
      for (let i = 0; i < spikes; i++) {
        const sx = left + i * spikeWidth;
        ctx.moveTo(sx, obs.baseY);
        ctx.lineTo(sx + spikeWidth / 2, top);
        ctx.lineTo(sx + spikeWidth, obs.baseY);
      }
      ctx.closePath();
      ctx.fill();
    } else if (obs.type === 'platform') {
      ctx.fillStyle = obs.color;
      ctx.fillRect(left, top, obs.width, obs.height);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(left, top, obs.width, 3);
    } else {
      ctx.fillStyle = obs.color;
      ctx.fillRect(left, top, obs.width, obs.height);
      ctx.fillStyle = 'rgba(0,0,0,0.2)';
      ctx.fillRect(left, top + obs.height - 4, obs.width, 4);
    }
  }

  private renderTimeline(): void {
    const ctx = this.timelineCtx;
    const W = this.timelineCanvas.width;
    const H = this.timelineCanvas.height;

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = '#1E1E22';
    ctx.fillRect(0, 0, W, H);

    ctx.strokeStyle = '#3D3D42';
    ctx.lineWidth = 1;
    const startX = -(this.scrollX % GRID_SIZE);
    for (let x = startX; x < W; x += GRID_SIZE) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, H);
      ctx.stroke();
    }

    for (const beat of this.beats) {
      const screenX = beat.x - this.scrollX;
      if (screenX < -20 || screenX > W + 20) continue;
      ctx.strokeStyle = '#9B59B6';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(screenX, 5);
      ctx.lineTo(screenX, H - 5);
      ctx.stroke();
    }
  }
}
