import {
  type GridCell,
  type Bone,
  type ToolType,
  GRID_SIZE,
  BRUSH_POWER,
  PICKAXE_POWER,
  DINOSAUR_BONES,
  createInitialGrid,
} from './FossilData';

export interface DigResult {
  cellsAffected: GridCell[];
  bonesRevealed: string[];
  shakeIntensity: number;
  particles: { x: number; y: number; type: 'dust' | 'crack' }[];
}

export class GridEngine {
  private grid: GridCell[][] = [];
  private bones: Map<string, Bone> = new Map();
  private activeTool: ToolType = 'brush';
  private shakeOffset = { x: 0, y: 0 };
  private shakeDecay = 0.9;
  private shakeIntensity = 0;

  constructor() {
    this.initialize();
  }

  initialize(): void {
    this.grid = createInitialGrid();
    this.bones.clear();

    for (const boneTemplate of DINOSAUR_BONES) {
      const bone: Bone = {
        ...boneTemplate,
        isExcavated: false,
        isPlaced: false,
        excavateProgress: 0,
      };
      this.bones.set(bone.id, bone);
    }

    this.shakeIntensity = 0;
    this.shakeOffset = { x: 0, y: 0 };
  }

  getGrid(): GridCell[][] {
    return this.grid;
  }

  getCell(row: number, col: number): GridCell | null {
    if (row < 0 || row >= GRID_SIZE || col < 0 || col >= GRID_SIZE) {
      return null;
    }
    return this.grid[row][col];
  }

  getBone(id: string): Bone | undefined {
    return this.bones.get(id);
  }

  getAllBones(): Bone[] {
    return Array.from(this.bones.values());
  }

  getActiveTool(): ToolType {
    return this.activeTool;
  }

  setActiveTool(tool: ToolType): void {
    this.activeTool = tool;
  }

  getShakeOffset(): { x: number; y: number } {
    return this.shakeOffset;
  }

  getExcavatedCount(): number {
    let count = 0;
    for (const bone of this.bones.values()) {
      if (bone.isExcavated) count++;
    }
    return count;
  }

  getTotalBones(): number {
    return this.bones.size;
  }

  isComplete(): boolean {
    for (const bone of this.bones.values()) {
      if (!bone.isPlaced) return false;
    }
    return true;
  }

  dig(row: number, col: number): DigResult {
    const cell = this.getCell(row, col);
    if (!cell || cell.dirtRemaining <= 0) {
      return { cellsAffected: [], bonesRevealed: [], shakeIntensity: 0, particles: [] };
    }

    const power = this.activeTool === 'brush' ? BRUSH_POWER : PICKAXE_POWER;
    const cellsAffected: GridCell[] = [];
    const bonesRevealed: string[] = [];
    const particles: DigResult['particles'] = [];
    let shakeIntensity = 0;

    if (this.activeTool === 'pickaxe') {
      const affected = this.getAffectedCells(row, col, 1);
      for (const { row: r, col: c } of affected) {
        const targetCell = this.grid[r][c];
        if (targetCell.dirtRemaining > 0) {
          const removed = Math.min(power, targetCell.dirtRemaining);
          targetCell.dirtRemaining -= removed;
          targetCell.crackLevel = Math.min(targetCell.crackLevel + 1, 3);

          if (targetCell.dirtRemaining <= 0) {
            targetCell.isRevealed = true;
            targetCell.revealProgress = 1;
          }

          cellsAffected.push({ ...targetCell });
          particles.push({
            x: c,
            y: r,
            type: 'crack',
          });
        }
      }
      shakeIntensity = 4;
    } else {
      const targetCell = this.grid[row][col];
      if (targetCell.dirtRemaining > 0) {
        const removed = Math.min(power, targetCell.dirtRemaining);
        targetCell.dirtRemaining -= removed;
        targetCell.revealProgress = 1 - targetCell.dirtRemaining / targetCell.dirtThickness;

        if (targetCell.dirtRemaining <= 0) {
          targetCell.isRevealed = true;
          targetCell.revealProgress = 1;
        }

        cellsAffected.push({ ...targetCell });
        particles.push({
          x: col,
          y: row,
          type: 'dust',
        });
      }
    }

    this.shakeIntensity = shakeIntensity;

    const boneIds = new Set<string>();
    for (const affectedCell of cellsAffected) {
      if (affectedCell.boneId) {
        boneIds.add(affectedCell.boneId);
      }
    }

    for (const boneId of boneIds) {
      const bone = this.bones.get(boneId);
      if (bone && !bone.isExcavated) {
        this.updateBoneProgress(bone);
        if (bone.isExcavated) {
          bonesRevealed.push(boneId);
        }
      }
    }

    return { cellsAffected, bonesRevealed, shakeIntensity, particles };
  }

  markBonePlaced(boneId: string): void {
    const bone = this.bones.get(boneId);
    if (bone) {
      bone.isPlaced = true;
    }
  }

  updateShake(): void {
    if (this.shakeIntensity > 0.1) {
      this.shakeOffset.x = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeOffset.y = (Math.random() - 0.5) * this.shakeIntensity * 2;
      this.shakeIntensity *= this.shakeDecay;
    } else {
      this.shakeOffset.x = 0;
      this.shakeOffset.y = 0;
      this.shakeIntensity = 0;
    }
  }

  reset(): void {
    this.initialize();
  }

  private getAffectedCells(row: number, col: number, radius: number): { row: number; col: number }[] {
    const cells: { row: number; col: number }[] = [];
    for (let dr = -radius; dr <= radius; dr++) {
      for (let dc = -radius; dc <= radius; dc++) {
        if (Math.abs(dr) + Math.abs(dc) <= radius) {
          const r = row + dr;
          const c = col + dc;
          if (r >= 0 && r < GRID_SIZE && c >= 0 && c < GRID_SIZE) {
            cells.push({ row: r, col: c });
          }
        }
      }
    }
    return cells;
  }

  private updateBoneProgress(bone: Bone): void {
    let clearedCells = 0;
    for (const cellRef of bone.cells) {
      const cell = this.grid[cellRef.row][cellRef.col];
      if (cell.dirtRemaining <= 0) {
        clearedCells++;
      }
    }

    bone.excavateProgress = clearedCells / bone.cells.length;

    if (clearedCells === bone.cells.length) {
      bone.isExcavated = true;
      bone.excavateProgress = 1;
    }
  }
}
