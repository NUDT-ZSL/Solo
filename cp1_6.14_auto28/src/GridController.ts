export interface Voxel {
  x: number;
  y: number;
  z: number;
  color: string;
}

interface HistoryState {
  added: Voxel[];
  removed: Voxel[];
}

export class GridController {
  public readonly size = 32;
  private grid: Map<string, string> = new Map();
  private undoStack: HistoryState[] = [];
  private redoStack: HistoryState[] = [];
  private maxHistory = 50;
  private currentBatch: HistoryState | null = null;
  private listeners: Set<() => void> = new Set();

  private key(x: number, y: number, z: number): string {
    return `${x},${y},${z}`;
  }

  public inBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && x < this.size && y >= 0 && y < this.size && z >= 0 && z < this.size;
  }

  public getVoxel(x: number, y: number, z: number): string | null {
    return this.grid.get(this.key(x, y, z)) || null;
  }

  public getAllVoxels(): Voxel[] {
    const result: Voxel[] = [];
    for (const [k, color] of this.grid) {
      const [x, y, z] = k.split(',').map(Number);
      result.push({ x, y, z, color });
    }
    return result;
  }

  public beginBatch(): void {
    if (!this.currentBatch) {
      this.currentBatch = { added: [], removed: [] };
    }
  }

  public endBatch(): void {
    if (this.currentBatch && (this.currentBatch.added.length > 0 || this.currentBatch.removed.length > 0)) {
      this.undoStack.push(this.currentBatch);
      if (this.undoStack.length > this.maxHistory) {
        this.undoStack.shift();
      }
      this.redoStack = [];
      this.notifyListeners();
    }
    this.currentBatch = null;
  }

  public setVoxel(x: number, y: number, z: number, color: string): boolean {
    if (!this.inBounds(x, y, z)) return false;
    const k = this.key(x, y, z);
    const existing = this.grid.get(k);
    if (existing === color) return false;
    if (this.currentBatch) {
      if (existing) {
        if (!this.currentBatch.removed.find(v => v.x === x && v.y === y && v.z === z)) {
          this.currentBatch.removed.push({ x, y, z, color: existing });
        }
        const addIdx = this.currentBatch.added.findIndex(v => v.x === x && v.y === y && v.z === z);
        if (addIdx !== -1) this.currentBatch.added.splice(addIdx, 1);
      }
      this.currentBatch.added.push({ x, y, z, color });
    }
    this.grid.set(k, color);
    return true;
  }

  public removeVoxel(x: number, y: number, z: number): boolean {
    const k = this.key(x, y, z);
    const color = this.grid.get(k);
    if (!color) return false;
    if (this.currentBatch) {
      if (!this.currentBatch.removed.find(v => v.x === x && v.y === y && v.z === z)) {
        this.currentBatch.removed.push({ x, y, z, color });
      }
      const addIdx = this.currentBatch.added.findIndex(v => v.x === x && v.y === y && v.z === z);
      if (addIdx !== -1) this.currentBatch.added.splice(addIdx, 1);
    }
    this.grid.delete(k);
    return true;
  }

  public undo(): HistoryState | null {
    if (this.undoStack.length === 0) return null;
    const state = this.undoStack.pop()!;
    for (const v of state.added) {
      this.grid.delete(this.key(v.x, v.y, v.z));
    }
    for (const v of state.removed) {
      this.grid.set(this.key(v.x, v.y, v.z), v.color);
    }
    this.redoStack.push(state);
    this.notifyListeners();
    return state;
  }

  public redo(): HistoryState | null {
    if (this.redoStack.length === 0) return null;
    const state = this.redoStack.pop()!;
    for (const v of state.added) {
      this.grid.set(this.key(v.x, v.y, v.z), v.color);
    }
    for (const v of state.removed) {
      this.grid.delete(this.key(v.x, v.y, v.z));
    }
    this.undoStack.push(state);
    this.notifyListeners();
    return state;
  }

  public canUndo(): boolean {
    return this.undoStack.length > 0;
  }

  public canRedo(): boolean {
    return this.redoStack.length > 0;
  }

  public subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  private notifyListeners(): void {
    for (const l of this.listeners) l();
  }

  public clear(): void {
    this.grid.clear();
    this.undoStack = [];
    this.redoStack = [];
    this.notifyListeners();
  }

  public exportOBJ(): string {
    const voxels = this.getAllVoxels();
    const vertices: string[] = [];
    const faces: string[] = [];
    const MAX_VERTICES = 50000;
    let vIdx = 1;
    let stopEarly = false;

    const cornerOffsets = [
      [0, 0, 0], [1, 0, 0], [1, 1, 0], [0, 1, 0],
      [0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]
    ];

    const faceIndices = [
      [0, 3, 2, 1],
      [4, 5, 6, 7],
      [0, 1, 5, 4],
      [2, 3, 7, 6],
      [1, 2, 6, 5],
      [0, 4, 7, 3]
    ];

    const isExposed = (x: number, y: number, z: number, dx: number, dy: number, dz: number): boolean => {
      return !this.inBounds(x + dx, y + dy, z + dz) || !this.grid.has(this.key(x + dx, y + dy, z + dz));
    };

    const faceDirs = [
      [0, 0, -1], [0, 0, 1], [0, -1, 0], [0, 1, 0], [1, 0, 0], [-1, 0, 0]
    ];

    for (const voxel of voxels) {
      if (stopEarly) break;
      const { x, y, z, color } = voxel;
      const r = parseInt(color.slice(1, 3), 16) / 255;
      const g = parseInt(color.slice(3, 5), 16) / 255;
      const b = parseInt(color.slice(5, 7), 16) / 255;

      for (let fi = 0; fi < 6; fi++) {
        if (stopEarly) break;
        const [fdx, fdy, fdz] = faceDirs[fi];
        if (!isExposed(x, y, z, fdx, fdy, fdz)) continue;

        if (vIdx + 3 > MAX_VERTICES) {
          stopEarly = true;
          break;
        }

        for (const ci of faceIndices[fi]) {
          const [ox, oy, oz] = cornerOffsets[ci];
          vertices.push(`v ${x + ox} ${y + oy} ${z + oz} ${r.toFixed(4)} ${g.toFixed(4)} ${b.toFixed(4)}`);
        }
        faces.push(`f ${vIdx} ${vIdx + 1} ${vIdx + 2} ${vIdx + 3}`);
        vIdx += 4;
      }
    }

    const header = stopEarly
      ? `# VoxelFlow OBJ Export (truncated to ${MAX_VERTICES} vertices)\n# Generated by VoxelFlow\n\n`
      : `# VoxelFlow OBJ Export\n# Generated by VoxelFlow\n\n`;

    return `${header}${vertices.join('\n')}\n\n${faces.join('\n')}\n`;
  }
}
