import type { EventBus, VoxelGrid, MaterialChangedData, VoxelsUpdatedData } from './eventBus';

export const GRID_SIZE = 10;
export const MAX_UNDO_STEPS = 50;

export interface OperationEntry {
  type: 'add' | 'remove' | 'replace';
  x: number;
  y: number;
  z: number;
  prevMaterial: number;
  newMaterial: number;
}

export interface MaterialDef {
  id: number;
  name: string;
  color: string;
  hex: number;
  transparent?: boolean;
  opacity?: number;
}

export const MATERIALS: MaterialDef[] = [
  { id: 0, name: '泥土 Dirt', color: '#8B4513', hex: 0x8b4513 },
  { id: 1, name: '石头 Stone', color: '#808080', hex: 0x808080 },
  { id: 2, name: '木头 Wood', color: '#A0522D', hex: 0xa0522d },
  { id: 3, name: '玻璃 Glass', color: '#87CEEB', hex: 0x87ceeb, transparent: true, opacity: 0.6 },
  { id: 4, name: '草皮 Grass', color: '#228B22', hex: 0x228b22 },
  { id: 5, name: '沙子 Sand', color: '#F4A460', hex: 0xf4a460 },
  { id: 6, name: '砖块 Brick', color: '#B22222', hex: 0xb22222 },
  { id: 7, name: '铁锭 Iron', color: '#C0C0C0', hex: 0xc0c0c0 },
  { id: 8, name: '金块 Gold', color: '#FFD700', hex: 0xffd700 },
  { id: 9, name: '钻石 Diamond', color: '#00CED1', hex: 0x00ced1, transparent: true, opacity: 0.85 },
  { id: 10, name: '黑曜石 Obsidian', color: '#2F1B41', hex: 0x2f1b41 },
  { id: 11, name: '雪块 Snow', color: '#FFFAFA', hex: 0xfffafa },
];

function createEmptyGrid(): VoxelGrid {
  const grid: VoxelGrid = [];
  for (let x = 0; x < GRID_SIZE; x++) {
    grid[x] = [];
    for (let y = 0; y < GRID_SIZE; y++) {
      grid[x][y] = [];
      for (let z = 0; z < GRID_SIZE; z++) {
        grid[x][y][z] = -1;
      }
    }
  }
  return grid;
}

function cloneGrid(grid: VoxelGrid): VoxelGrid {
  return grid.map((plane) => plane.map((row) => row.slice()));
}

export class VoxelEngine {
  private grid: VoxelGrid = createEmptyGrid();
  private voxelCount: number = 0;
  private currentMaterialId: number = 0;

  private undoStack: (OperationEntry | OperationEntry[])[] = [];
  private redoStack: (OperationEntry | OperationEntry[])[] = [];
  private batchOpen: boolean = false;
  private batchOps: OperationEntry[] = [];

  constructor(private bus: EventBus) {
    this.bus.on('materialChanged', this.handleMaterialChanged.bind(this));
    this.bus.on('undo', this.undo.bind(this));
    this.bus.on('redo', this.redo.bind(this));
    this.bus.on('clearAll', this.clearAll.bind(this));
  }

  private handleMaterialChanged(data: MaterialChangedData): void {
    if (data.materialId >= 0 && data.materialId < MATERIALS.length) {
      this.currentMaterialId = data.materialId;
    }
  }

  public getCurrentMaterialId(): number {
    return this.currentMaterialId;
  }

  public getGrid(): VoxelGrid {
    return this.grid;
  }

  public getVoxelCount(): number {
    return this.voxelCount;
  }

  public inBounds(x: number, y: number, z: number): boolean {
    return x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE && z >= 0 && z < GRID_SIZE;
  }

  public getVoxel(x: number, y: number, z: number): number {
    if (!this.inBounds(x, y, z)) return -1;
    return this.grid[x][y][z];
  }

  public startBatch(): void {
    this.batchOpen = true;
    this.batchOps = [];
  }

  public endBatch(): void {
    if (!this.batchOpen) return;
    this.batchOpen = false;
    if (this.batchOps.length > 0) {
      this.pushUndo(this.batchOps);
      this.redoStack = [];
    }
    this.batchOps = [];
    this.emitUpdate();
  }

  private pushUndo(entry: OperationEntry | OperationEntry[]): void {
    this.undoStack.push(entry);
    while (this.undoStack.length > MAX_UNDO_STEPS) {
      this.undoStack.shift();
    }
  }

  private pushOp(op: OperationEntry): void {
    if (this.batchOpen) {
      this.batchOps.push(op);
    } else {
      this.pushUndo(op);
      this.redoStack = [];
    }
  }

  public setVoxel(x: number, y: number, z: number, materialId: number): boolean {
    if (!this.inBounds(x, y, z)) return false;
    const prev = this.grid[x][y][z];
    if (prev === materialId) return false;
    this.grid[x][y][z] = materialId;
    if (prev === -1 && materialId !== -1) this.voxelCount++;
    else if (prev !== -1 && materialId === -1) this.voxelCount--;
    let type: OperationEntry['type'];
    if (prev === -1) type = 'add';
    else if (materialId === -1) type = 'remove';
    else type = 'replace';
    this.pushOp({ type, x, y, z, prevMaterial: prev, newMaterial: materialId });
    if (!this.batchOpen) this.emitUpdate();
    return true;
  }

  public addVoxel(x: number, y: number, z: number): boolean {
    return this.setVoxel(x, y, z, this.currentMaterialId);
  }

  public removeVoxel(x: number, y: number, z: number): boolean {
    if (!this.inBounds(x, y, z)) return false;
    if (this.grid[x][y][z] === -1) return false;
    return this.setVoxel(x, y, z, -1);
  }

  public replaceVoxel(x: number, y: number, z: number): boolean {
    if (!this.inBounds(x, y, z)) return false;
    if (this.grid[x][y][z] === -1) return false;
    return this.setVoxel(x, y, z, this.currentMaterialId);
  }

  private applyEntryReverse(entry: OperationEntry): void {
    this.grid[entry.x][entry.y][entry.z] = entry.prevMaterial;
    if (entry.newMaterial === -1 && entry.prevMaterial !== -1) this.voxelCount++;
    else if (entry.newMaterial !== -1 && entry.prevMaterial === -1) this.voxelCount--;
  }

  private applyEntryForward(entry: OperationEntry): void {
    this.grid[entry.x][entry.y][entry.z] = entry.newMaterial;
    if (entry.prevMaterial === -1 && entry.newMaterial !== -1) this.voxelCount++;
    else if (entry.prevMaterial !== -1 && entry.newMaterial === -1) this.voxelCount--;
  }

  public undo(): void {
    if (this.undoStack.length === 0) return;
    const top = this.undoStack.pop()!;
    const arr = Array.isArray(top) ? top : [top];
    for (let i = arr.length - 1; i >= 0; i--) this.applyEntryReverse(arr[i]);
    this.redoStack.push(top);
    this.emitUpdate();
  }

  public redo(): void {
    if (this.redoStack.length === 0) return;
    const top = this.redoStack.pop()!;
    const arr = Array.isArray(top) ? top : [top];
    for (const e of arr) this.applyEntryForward(e);
    this.undoStack.push(top);
    this.emitUpdate();
  }

  public clearAll(): void {
    if (this.voxelCount === 0) return;
    const ops: OperationEntry[] = [];
    for (let x = 0; x < GRID_SIZE; x++) {
      for (let y = 0; y < GRID_SIZE; y++) {
        for (let z = 0; z < GRID_SIZE; z++) {
          const prev = this.grid[x][y][z];
          if (prev !== -1) {
            ops.push({ type: 'remove', x, y, z, prevMaterial: prev, newMaterial: -1 });
            this.grid[x][y][z] = -1;
          }
        }
      }
    }
    this.voxelCount = 0;
    if (ops.length > 0) {
      this.pushUndo(ops as unknown as OperationEntry);
      this.redoStack = [];
    }
    this.emitUpdate();
  }

  private emitUpdate(): void {
    const data: VoxelsUpdatedData = {
      grid: cloneGrid(this.grid),
      count: this.voxelCount,
    };
    this.bus.emit('voxelsUpdated', data);
  }

  public reset(): void {
    this.grid = createEmptyGrid();
    this.voxelCount = 0;
    this.undoStack = [];
    this.redoStack = [];
    this.emitUpdate();
  }
}

export function getMaterialById(id: number): MaterialDef | undefined {
  return MATERIALS.find((m) => m.id === id);
}
