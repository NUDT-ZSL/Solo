export type PixelColor = string | null;
export type FrameData = PixelColor[][];

export interface FrameEditorState {
  frames: FrameData[];
  currentFrameIndex: number;
  brushColor: string;
  brushSize: number;
  isEraser: boolean;
}

const GRID_SIZE = 16;

function createEmptyFrame(): FrameData {
  return Array.from({ length: GRID_SIZE }, () =>
    Array.from({ length: GRID_SIZE }, () => null)
  );
}

function cloneFrame(frame: FrameData): FrameData {
  return frame.map((row) => [...row]);
}

export { GRID_SIZE, createEmptyFrame, cloneFrame };

interface HistoryEntry {
  frameIndex: number;
  frame: FrameData;
}

export class FrameEditor {
  private frames: FrameData[] = [];
  private currentFrameIndex: number = 0;
  private brushColor: string = '#ffffff';
  private brushSize: number = 1;
  private isEraser: boolean = false;
  private undoStack: HistoryEntry[] = [];
  private redoStack: HistoryEntry[] = [];
  private maxHistory: number = 50;
  private onChangeCallbacks: Set<() => void> = new Set();

  constructor() {
    this.frames = [createEmptyFrame()];
  }

  subscribe(callback: () => void): () => void {
    this.onChangeCallbacks.add(callback);
    return () => this.onChangeCallbacks.delete(callback);
  }

  private notify() {
    this.onChangeCallbacks.forEach((cb) => cb());
  }

  getState(): FrameEditorState {
    return {
      frames: this.frames.map(cloneFrame),
      currentFrameIndex: this.currentFrameIndex,
      brushColor: this.brushColor,
      brushSize: this.brushSize,
      isEraser: this.isEraser,
    };
  }

  getFrames(): FrameData[] {
    return this.frames;
  }

  getCurrentFrame(): FrameData {
    return this.frames[this.currentFrameIndex];
  }

  getCurrentFrameIndex(): number {
    return this.currentFrameIndex;
  }

  getFrameCount(): number {
    return this.frames.length;
  }

  getBrushColor(): string {
    return this.brushColor;
  }

  getBrushSize(): number {
    return this.brushSize;
  }

  getIsEraser(): boolean {
    return this.isEraser;
  }

  setBrushColor(color: string) {
    this.brushColor = color;
    this.isEraser = false;
    this.notify();
  }

  setBrushSize(size: number) {
    this.brushSize = Math.max(1, Math.min(3, size));
    this.notify();
  }

  setEraser(on: boolean) {
    this.isEraser = on;
    this.notify();
  }

  setCurrentFrame(index: number) {
    if (index >= 0 && index < this.frames.length) {
      this.currentFrameIndex = index;
      this.notify();
    }
  }

  private pushUndo() {
    this.undoStack.push({
      frameIndex: this.currentFrameIndex,
      frame: cloneFrame(this.frames[this.currentFrameIndex]),
    });
    if (this.undoStack.length > this.maxHistory) {
      this.undoStack.shift();
    }
    this.redoStack = [];
  }

  paint(x: number, y: number) {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;
    this.pushUndo();
    const frame = this.frames[this.currentFrameIndex];
    const color = this.isEraser ? null : this.brushColor;
    const half = Math.floor(this.brushSize / 2);
    for (let dy = -half; dy <= half; dy++) {
      for (let dx = -half; dx <= half; dx++) {
        const px = x + dx;
        const py = y + dy;
        if (px >= 0 && px < GRID_SIZE && py >= 0 && py < GRID_SIZE) {
          frame[py][px] = color;
        }
      }
    }
    this.notify();
  }

  fill(x: number, y: number) {
    if (x < 0 || x >= GRID_SIZE || y < 0 || y >= GRID_SIZE) return;
    this.pushUndo();
    const frame = this.frames[this.currentFrameIndex];
    const targetColor = frame[y][x];
    const fillColor = this.isEraser ? null : this.brushColor;
    if (targetColor === fillColor) return;
    const stack: [number, number][] = [[x, y]];
    const visited = new Set<string>();
    while (stack.length > 0) {
      const [cx, cy] = stack.pop()!;
      const key = `${cx},${cy}`;
      if (visited.has(key)) continue;
      if (cx < 0 || cx >= GRID_SIZE || cy < 0 || cy >= GRID_SIZE) continue;
      if (frame[cy][cx] !== targetColor) continue;
      visited.add(key);
      frame[cy][cx] = fillColor;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
    this.notify();
  }

  addFrame(afterIndex?: number) {
    const newFrame = createEmptyFrame();
    const idx = afterIndex !== undefined ? afterIndex + 1 : this.frames.length;
    this.frames.splice(idx, 0, newFrame);
    this.currentFrameIndex = idx;
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  cloneFrame(index?: number) {
    const idx = index !== undefined ? index : this.currentFrameIndex;
    if (idx < 0 || idx >= this.frames.length) return;
    const cloned = cloneFrame(this.frames[idx]);
    this.frames.splice(idx + 1, 0, cloned);
    this.currentFrameIndex = idx + 1;
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  deleteFrame(index?: number) {
    const idx = index !== undefined ? index : this.currentFrameIndex;
    if (this.frames.length <= 1) return;
    if (idx < 0 || idx >= this.frames.length) return;
    this.frames.splice(idx, 1);
    if (this.currentFrameIndex >= this.frames.length) {
      this.currentFrameIndex = this.frames.length - 1;
    }
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  moveFrame(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    if (fromIndex < 0 || fromIndex >= this.frames.length) return;
    if (toIndex < 0 || toIndex >= this.frames.length) return;
    const [frame] = this.frames.splice(fromIndex, 1);
    this.frames.splice(toIndex, 0, frame);
    if (this.currentFrameIndex === fromIndex) {
      this.currentFrameIndex = toIndex;
    } else if (
      fromIndex < this.currentFrameIndex &&
      toIndex >= this.currentFrameIndex
    ) {
      this.currentFrameIndex--;
    } else if (
      fromIndex > this.currentFrameIndex &&
      toIndex <= this.currentFrameIndex
    ) {
      this.currentFrameIndex++;
    }
    this.undoStack = [];
    this.redoStack = [];
    this.notify();
  }

  clearCurrentFrame() {
    this.pushUndo();
    this.frames[this.currentFrameIndex] = createEmptyFrame();
    this.notify();
  }

  undo() {
    if (this.undoStack.length === 0) return;
    const entry = this.undoStack.pop()!;
    this.redoStack.push({
      frameIndex: entry.frameIndex,
      frame: cloneFrame(this.frames[entry.frameIndex]),
    });
    this.frames[entry.frameIndex] = entry.frame;
    this.currentFrameIndex = entry.frameIndex;
    this.notify();
  }

  redo() {
    if (this.redoStack.length === 0) return;
    const entry = this.redoStack.pop()!;
    this.undoStack.push({
      frameIndex: entry.frameIndex,
      frame: cloneFrame(this.frames[entry.frameIndex]),
    });
    this.frames[entry.frameIndex] = entry.frame;
    this.currentFrameIndex = entry.frameIndex;
    this.notify();
  }

  canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  renderFrameToCanvas(
    frame: FrameData,
    canvas: HTMLCanvasElement,
    pixelSize: number
  ) {
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = GRID_SIZE * pixelSize;
    canvas.height = GRID_SIZE * pixelSize;
    ctx.imageSmoothingEnabled = false;
    for (let y = 0; y < GRID_SIZE; y++) {
      for (let x = 0; x < GRID_SIZE; x++) {
        const color = frame[y][x];
        ctx.fillStyle = color || '#1a1a2e';
        ctx.fillRect(x * pixelSize, y * pixelSize, pixelSize, pixelSize);
      }
    }
  }

  renderThumbnail(frame: FrameData, canvas: HTMLCanvasElement) {
    const size = 4;
    this.renderFrameToCanvas(frame, canvas, size);
  }
}
