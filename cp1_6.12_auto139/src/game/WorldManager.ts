export enum BlockType {
  EMPTY = 0,
  GRASS = 1,
  DIRT = 2,
  STONE = 3,
  WATER = 4,
  WOOD = 5,
  SAND = 6,
}

export const BLOCK_COLORS: Record<number, string> = {
  [BlockType.EMPTY]: 'transparent',
  [BlockType.GRASS]: '#7ec850',
  [BlockType.DIRT]: '#8b5a2b',
  [BlockType.STONE]: '#808080',
  [BlockType.WATER]: '#3b82f6',
  [BlockType.WOOD]: '#a0522d',
  [BlockType.SAND]: '#f4d03f',
};

export const BLOCK_NAMES: Record<number, string> = {
  [BlockType.EMPTY]: '空',
  [BlockType.GRASS]: '草地',
  [BlockType.DIRT]: '泥土',
  [BlockType.STONE]: '石头',
  [BlockType.WATER]: '水',
  [BlockType.WOOD]: '木材',
  [BlockType.SAND]: '沙子',
};

export interface SerializedWorld {
  width: number;
  height: number;
  blocks: Record<string, number>;
  playerStart: { x: number; y: number };
}

export class WorldManager {
  private width: number;
  private height: number;
  private blocks: Map<string, number>;
  private playerStart: { x: number; y: number };
  private dirtyRegions: Set<string> = new Set();

  constructor(width: number = 40, height: number = 40) {
    this.width = width;
    this.height = height;
    this.blocks = new Map();
    this.playerStart = { x: Math.floor(width / 2), y: Math.floor(height / 2) };
  }

  getWidth(): number {
    return this.width;
  }

  getHeight(): number {
    return this.height;
  }

  getPlayerStart(): { x: number; y: number } {
    return { ...this.playerStart };
  }

  setPlayerStart(x: number, y: number): void {
    this.playerStart = { x, y };
  }

  private getKey(x: number, y: number): string {
    return `${x},${y}`;
  }

  getBlock(x: number, y: number): number {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return BlockType.STONE;
    }
    return this.blocks.get(this.getKey(x, y)) || BlockType.EMPTY;
  }

  setBlock(x: number, y: number, blockType: number): boolean {
    if (x < 0 || x >= this.width || y < 0 || y >= this.height) {
      return false;
    }
    
    const key = this.getKey(x, y);
    const currentBlock = this.blocks.get(key) || BlockType.EMPTY;
    
    if (currentBlock === blockType) {
      return false;
    }

    if (blockType === BlockType.EMPTY) {
      this.blocks.delete(key);
    } else {
      this.blocks.set(key, blockType);
    }

    this.markDirty(x, y);
    return true;
  }

  removeBlock(x: number, y: number): boolean {
    return this.setBlock(x, y, BlockType.EMPTY);
  }

  isBlockAt(x: number, y: number): boolean {
    return this.getBlock(x, y) !== BlockType.EMPTY;
  }

  isSolid(x: number, y: number): boolean {
    const block = this.getBlock(x, y);
    return block !== BlockType.EMPTY && block !== BlockType.WATER;
  }

  getBlockCount(): number {
    return this.blocks.size;
  }

  getAllBlocks(): Array<{ x: number; y: number; type: number }> {
    const blocks: Array<{ x: number; y: number; type: number }> = [];
    this.blocks.forEach((type, key) => {
      const [x, y] = key.split(',').map(Number);
      blocks.push({ x, y, type });
    });
    return blocks;
  }

  private markDirty(x: number, y: number): void {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const nx = x + dx;
        const ny = y + dy;
        if (nx >= 0 && nx < this.width && ny >= 0 && ny < this.height) {
          this.dirtyRegions.add(this.getKey(nx, ny));
        }
      }
    }
  }

  getAndClearDirtyRegions(): Set<string> {
    const regions = new Set(this.dirtyRegions);
    this.dirtyRegions.clear();
    return regions;
  }

  clear(): void {
    this.blocks.clear();
    this.dirtyRegions.clear();
    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.dirtyRegions.add(this.getKey(x, y));
      }
    }
  }

  serialize(): SerializedWorld {
    const blocks: Record<string, number> = {};
    this.blocks.forEach((type, key) => {
      blocks[key] = type;
    });

    return {
      width: this.width,
      height: this.height,
      blocks,
      playerStart: { ...this.playerStart },
    };
  }

  deserialize(data: SerializedWorld): void {
    this.width = data.width;
    this.height = data.height;
    this.blocks.clear();
    this.dirtyRegions.clear();

    Object.entries(data.blocks).forEach(([key, type]) => {
      this.blocks.set(key, type);
      const [x, y] = key.split(',').map(Number);
      this.markDirty(x, y);
    });

    this.playerStart = { ...data.playerStart };

    for (let x = 0; x < this.width; x++) {
      for (let y = 0; y < this.height; y++) {
        this.dirtyRegions.add(this.getKey(x, y));
      }
    }
  }
}
