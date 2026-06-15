export type BlockType = 'forward' | 'left' | 'right' | 'loop';

export interface BlockInstance {
  id: string;
  type: BlockType;
  x: number;
  y: number;
  targetX: number;
  targetY: number;
  loopCount: number;
  slotIndex: number | null;
  isDragging: boolean;
  animating: boolean;
  animStartTime: number;
  animStartX: number;
  animStartY: number;
}

export const BLOCK_WIDTH = 180;
export const BLOCK_HEIGHT = 60;
export const MAX_BLOCKS = 8;
export const SLOT_GAP = 10;

export class BlockManager {
  public blocks: BlockInstance[] = [];
  public slots: (BlockInstance | null)[] = [];
  public draggedBlock: BlockInstance | null = null;
  public dragOffsetX: number = 0;
  public dragOffsetY: number = 0;
  public hoveredBlockId: string | null = null;

  private slotStartX: number = 0;
  private slotStartY: number = 0;

  constructor() {
    this.slots = new Array(MAX_BLOCKS).fill(null);
  }

  setSlotArea(x: number, y: number): void {
    this.slotStartX = x + 20;
    this.slotStartY = y + 20;
  }

  getSlotPosition(index: number): { x: number; y: number } {
    return {
      x: this.slotStartX,
      y: this.slotStartY + index * (BLOCK_HEIGHT + SLOT_GAP)
    };
  }

  getSlotAtPosition(mouseX: number, mouseY: number): number {
    for (let i = 0; i < MAX_BLOCKS; i++) {
      const pos = this.getSlotPosition(i);
      if (
        mouseX >= pos.x &&
        mouseX <= pos.x + BLOCK_WIDTH &&
        mouseY >= pos.y &&
        mouseY <= pos.y + BLOCK_HEIGHT
      ) {
        return i;
      }
    }
    return -1;
  }

  getNearestSlot(mouseX: number, mouseY: number): number {
    const pos = this.getSlotPosition(0);
    if (
      mouseX < pos.x - 20 ||
      mouseX > pos.x + BLOCK_WIDTH + 20 ||
      mouseY < pos.y - 30 ||
      mouseY > pos.y + MAX_BLOCKS * (BLOCK_HEIGHT + SLOT_GAP) + 30
    ) {
      return -1;
    }

    const localY = mouseY - pos.y;
    const slotHeight = BLOCK_HEIGHT + SLOT_GAP;
    let index = Math.floor((localY + SLOT_GAP / 2) / slotHeight);
    index = Math.max(0, Math.min(MAX_BLOCKS - 1, index));
    return index;
  }

  createBlock(type: BlockType, x: number, y: number): BlockInstance {
    return {
      id: 'block_' + Math.random().toString(36).substr(2, 9),
      type,
      x,
      y,
      targetX: x,
      targetY: y,
      loopCount: 2,
      slotIndex: null,
      isDragging: false,
      animating: false,
      animStartTime: 0,
      animStartX: x,
      animStartY: y
    };
  }

  startDrag(block: BlockInstance, mouseX: number, mouseY: number): void {
    this.draggedBlock = block;
    this.dragOffsetX = mouseX - block.x;
    this.dragOffsetY = mouseY - block.y;
    block.isDragging = true;

    if (block.slotIndex !== null) {
      this.slots[block.slotIndex] = null;
      block.slotIndex = null;
    }
  }

  updateDrag(mouseX: number, mouseY: number): void {
    if (this.draggedBlock) {
      this.draggedBlock.x = mouseX - this.dragOffsetX;
      this.draggedBlock.y = mouseY - this.dragOffsetY;
    }
  }

  endDrag(mouseX: number, mouseY: number): void {
    if (!this.draggedBlock) return;

    const block = this.draggedBlock;
    block.isDragging = false;

    const nearestSlot = this.getNearestSlot(mouseX, mouseY);

    if (nearestSlot >= 0) {
      const existing = this.slots[nearestSlot];
      if (existing) {
        const emptySlot = this.slots.findIndex(s => s === null);
        if (emptySlot >= 0 && emptySlot !== nearestSlot) {
          this.placeBlockInSlot(existing, emptySlot);
        }
      }
      this.placeBlockInSlot(block, nearestSlot);
    } else {
      this.blocks = this.blocks.filter(b => b.id !== block.id);
    }

    this.draggedBlock = null;
  }

  placeBlockInSlot(block: BlockInstance, slotIndex: number): void {
    const pos = this.getSlotPosition(slotIndex);
    block.targetX = pos.x;
    block.targetY = pos.y;
    block.slotIndex = slotIndex;
    block.animating = true;
    block.animStartTime = performance.now();
    block.animStartX = block.x;
    block.animStartY = block.y;
    this.slots[slotIndex] = block;
  }

  animateBlocks(now: number): void {
    for (const block of this.blocks) {
      if (block.animating && !block.isDragging) {
        const elapsed = (now - block.animStartTime) / 200;
        if (elapsed >= 1) {
          block.x = block.targetX;
          block.y = block.targetY;
          block.animating = false;
        } else {
          const spring = 0.3;
          const damping = 0.7;
          const t = elapsed * 6;
          const ease = 1 - Math.exp(-t * damping) * Math.cos(t * spring);
          block.x = block.animStartX + (block.targetX - block.animStartX) * ease;
          block.y = block.animStartY + (block.targetY - block.animStartY) * ease;
        }
      }
    }
  }

  getLibraryBlocks(): { type: BlockType; x: number; y: number; width: number; height: number }[] {
    const libX = window.innerWidth - 220 + 15;
    const startY = 80 + 50;
    const spacing = 75;
    return [
      { type: 'forward', x: libX, y: startY, width: BLOCK_WIDTH - 30, height: BLOCK_HEIGHT },
      { type: 'left', x: libX, y: startY + spacing, width: BLOCK_WIDTH - 30, height: BLOCK_HEIGHT },
      { type: 'right', x: libX, y: startY + spacing * 2, width: BLOCK_WIDTH - 30, height: BLOCK_HEIGHT },
      { type: 'loop', x: libX, y: startY + spacing * 3, width: BLOCK_WIDTH - 30, height: BLOCK_HEIGHT + 10 }
    ];
  }

  getBlockAtLibrary(mouseX: number, mouseY: number): BlockType | null {
    const blocks = this.getLibraryBlocks();
    for (const b of blocks) {
      if (
        mouseX >= b.x &&
        mouseX <= b.x + b.width &&
        mouseY >= b.y &&
        mouseY <= b.y + b.height
      ) {
        return b.type;
      }
    }
    return null;
  }

  getBlockOnCanvas(mouseX: number, mouseY: number): BlockInstance | null {
    for (let i = this.blocks.length - 1; i >= 0; i--) {
      const block = this.blocks[i];
      if (
        mouseX >= block.x &&
        mouseX <= block.x + BLOCK_WIDTH &&
        mouseY >= block.y &&
        mouseY <= block.y + BLOCK_HEIGHT
      ) {
        return block;
      }
    }
    return null;
  }

  handleLibraryClick(mouseX: number, mouseY: number): BlockInstance | null {
    const type = this.getBlockAtLibrary(mouseX, mouseY);
    if (!type) return null;

    const emptySlot = this.slots.findIndex(s => s === null);
    if (emptySlot < 0) return null;

    const block = this.createBlock(type, mouseX - BLOCK_WIDTH / 2, mouseY - BLOCK_HEIGHT / 2);
    this.blocks.push(block);
    this.placeBlockInSlot(block, emptySlot);
    return block;
  }

  handleLoopClick(block: BlockInstance, mouseX: number, mouseY: number): boolean {
    if (block.type !== 'loop') return false;
    const numX = block.x + BLOCK_WIDTH / 2;
    const numY = block.y + BLOCK_HEIGHT / 2 + 14;
    const dist = Math.sqrt((mouseX - numX) ** 2 + (mouseY - numY) ** 2);
    if (dist < 20) {
      block.loopCount = block.loopCount >= 5 ? 1 : block.loopCount + 1;
      return true;
    }
    return false;
  }

  clearBlocks(): void {
    this.blocks = [];
    this.slots = new Array(MAX_BLOCKS).fill(null);
    this.draggedBlock = null;
  }

  getExecutableBlocks(): BlockType[] {
    const result: BlockType[] = [];
    for (const block of this.slots) {
      if (!block) continue;
      if (block.type === 'loop') {
        for (let i = 0; i < block.loopCount; i++) {
          result.push('forward');
        }
      } else {
        result.push(block.type);
      }
    }
    return result;
  }
}
