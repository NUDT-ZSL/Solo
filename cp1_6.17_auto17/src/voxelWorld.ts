export const WORLD_SIZE_X = 20;
export const WORLD_SIZE_Y = 10;
export const WORLD_SIZE_Z = 20;

export enum BlockType {
  AIR = 0,
  DIRT = 1,
  STONE = 2,
  GRASS = 3,
  BEDROCK = 4
}

export const BLOCK_COLORS: Record<BlockType, string> = {
  [BlockType.AIR]: '#000000',
  [BlockType.DIRT]: '#8B4513',
  [BlockType.STONE]: '#808080',
  [BlockType.GRASS]: '#4CAF50',
  [BlockType.BEDROCK]: '#333333'
};

export const BLOCK_NAMES: Record<BlockType, string> = {
  [BlockType.AIR]: '空气',
  [BlockType.DIRT]: '泥土',
  [BlockType.STONE]: '石头',
  [BlockType.GRASS]: '草地',
  [BlockType.BEDROCK]: '基岩'
};

export const BUILDABLE_BLOCK_TYPES: BlockType[] = [
  BlockType.GRASS,
  BlockType.DIRT,
  BlockType.STONE,
  BlockType.BEDROCK
];

export interface FallingBlock {
  x: number;
  y: number;
  z: number;
  targetY: number;
  type: BlockType;
  progress: number;
  trailPositions: { x: number; y: number; z: number; alpha: number }[];
}

export class VoxelWorld {
  private data: Uint8Array;
  public fallingBlocks: FallingBlock[] = [];
  private _selectedBlockType: BlockType = BlockType.DIRT;

  constructor() {
    this.data = new Uint8Array(WORLD_SIZE_X * WORLD_SIZE_Y * WORLD_SIZE_Z);
    this.initializeWorld();
  }

  public get selectedBlockType(): BlockType {
    return this._selectedBlockType;
  }

  public set selectedBlockType(type: BlockType) {
    if (type !== BlockType.AIR) {
      this._selectedBlockType = type;
    }
  }

  private getIndex(x: number, y: number, z: number): number {
    return (y * WORLD_SIZE_Z + z) * WORLD_SIZE_X + x;
  }

  private isValidPosition(x: number, y: number, z: number): boolean {
    return x >= 0 && x < WORLD_SIZE_X &&
           y >= 0 && y < WORLD_SIZE_Y &&
           z >= 0 && z < WORLD_SIZE_Z;
  }

  public getVoxel(x: number, y: number, z: number): BlockType {
    if (!this.isValidPosition(x, y, z)) {
      return BlockType.AIR;
    }
    return this.data[this.getIndex(x, y, z)] as BlockType;
  }

  public setVoxel(x: number, y: number, z: number, type: BlockType): boolean {
    if (!this.isValidPosition(x, y, z)) {
      return false;
    }
    if (this.getVoxel(x, y, z) === BlockType.BEDROCK && type !== BlockType.BEDROCK) {
      return false;
    }
    this.data[this.getIndex(x, y, z)] = type;
    return true;
  }

  private initializeWorld(): void {
    for (let x = 0; x < WORLD_SIZE_X; x++) {
      for (let z = 0; z < WORLD_SIZE_Z; z++) {
        for (let y = 0; y < WORLD_SIZE_Y; y++) {
          if (y === 0) {
            this.setVoxel(x, y, z, BlockType.BEDROCK);
          } else if (y <= 2) {
            this.setVoxel(x, y, z, BlockType.STONE);
          } else if (y <= 5) {
            this.setVoxel(x, y, z, BlockType.DIRT);
          } else if (y === 6) {
            this.setVoxel(x, y, z, BlockType.GRASS);
          } else {
            this.setVoxel(x, y, z, BlockType.AIR);
          }
        }
      }
    }
  }

  public cloneData(): BlockType[] {
    return Array.from(this.data) as BlockType[];
  }

  public applyGravity(): { updated: boolean; fallingBlocks: FallingBlock[] } {
    const fallingBlocks: FallingBlock[] = [];
    let updated = false;

    for (let x = 0; x < WORLD_SIZE_X; x++) {
      for (let z = 0; z < WORLD_SIZE_Z; z++) {
        let writePos = 0;
        const column: BlockType[] = [];

        for (let y = 0; y < WORLD_SIZE_Y; y++) {
          const block = this.getVoxel(x, y, z);
          if (block !== BlockType.AIR) {
            column.push(block);
          }
        }

        for (let y = 0; y < WORLD_SIZE_Y; y++) {
          const originalBlock = this.getVoxel(x, y, z);

          if (originalBlock !== BlockType.AIR && originalBlock !== BlockType.BEDROCK) {
            let targetY = y;
            while (targetY > 0 && this.getVoxel(x, targetY - 1, z) === BlockType.AIR) {
              targetY--;
            }

            if (targetY !== y) {
              updated = true;
              const existingFalling = this.fallingBlocks.find(
                fb => fb.x === x && fb.z === z && fb.y === y
              );

              if (!existingFalling) {
                fallingBlocks.push({
                  x,
                  y,
                  z,
                  targetY,
                  type: originalBlock,
                  progress: 0,
                  trailPositions: []
                });
              }
            }
          }

          writePos++;
        }
      }
    }

    if (updated) {
      this.fallingBlocks = fallingBlocks;
    }

    return { updated, fallingBlocks };
  }

  public updateFallingBlocks(deltaTime: number): boolean {
    const gravitySpeed = 5;
    const trailLength = 2;
    let needsUpdate = false;

    for (let i = this.fallingBlocks.length - 1; i >= 0; i--) {
      const block = this.fallingBlocks[i];
      const distance = block.y - block.targetY;
      block.progress += (deltaTime * gravitySpeed) / distance;

      const currentY = block.y - (block.y - block.targetY) * Math.min(block.progress, 1);
      block.trailPositions.unshift({ x: block.x, y: currentY, z: block.z, alpha: 0.5 });
      if (block.trailPositions.length > trailLength) {
        block.trailPositions.pop();
      }

      block.trailPositions.forEach((pos, idx) => {
        pos.alpha = 0.5 * (1 - idx / trailLength);
      });

      if (block.progress >= 1) {
        this.setVoxel(block.x, block.y, block.z, BlockType.AIR);
        this.setVoxel(block.x, block.targetY, block.z, block.type);
        this.fallingBlocks.splice(i, 1);
        needsUpdate = true;
      }
    }

    return needsUpdate;
  }

  public isFalling(x: number, y: number, z: number): boolean {
    return this.fallingBlocks.some(fb => fb.x === x && fb.y === y && fb.z === z);
  }

  public getFallingBlock(x: number, y: number, z: number): FallingBlock | undefined {
    return this.fallingBlocks.find(fb => fb.x === x && fb.y === y && fb.z === z);
  }

  public reset(): void {
    this.initializeWorld();
    this.fallingBlocks = [];
  }
}
