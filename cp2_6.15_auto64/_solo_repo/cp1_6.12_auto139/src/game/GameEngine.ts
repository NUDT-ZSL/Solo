import { WorldManager, BLOCK_COLORS, BlockType } from './WorldManager';
import { PlayerController, PlayerState } from './PlayerController';

export interface EngineStats {
  fps: number;
  blockCount: number;
  mouseGridX: number;
  mouseGridY: number;
}

export class GameEngine {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private world: WorldManager;
  private player: PlayerController;
  private cellSize: number;
  private gridWidth: number;
  private gridHeight: number;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private fps: number = 0;
  private frameCount: number = 0;
  private fpsUpdateTime: number = 0;
  private showGrid: boolean = true;
  private currentBlock: number = BlockType.GRASS;
  private mouseGridX: number = -1;
  private mouseGridY: number = -1;
  private isMouseDown: boolean = false;
  private mouseButton: number = 0;
  private needsFullRedraw: boolean = true;
  private statsCallback: ((stats: EngineStats) => void) | null = null;

  constructor(
    canvas: HTMLCanvasElement,
    world: WorldManager,
    player: PlayerController,
    cellSize: number = 32
  ) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      throw new Error('Failed to get 2D context');
    }
    this.ctx = ctx;
    this.world = world;
    this.player = player;
    this.cellSize = cellSize;
    this.gridWidth = world.getWidth();
    this.gridHeight = world.getHeight();

    this.canvas.width = this.gridWidth * this.cellSize;
    this.canvas.height = this.gridHeight * this.cellSize;

    this.ctx.imageSmoothingEnabled = false;
  }

  setStatsCallback(callback: (stats: EngineStats) => void): void {
    this.statsCallback = callback;
  }

  setCurrentBlock(blockType: number): void {
    this.currentBlock = blockType;
  }

  getCurrentBlock(): number {
    return this.currentBlock;
  }

  setShowGrid(show: boolean): void {
    if (this.showGrid !== show) {
      this.showGrid = show;
      this.needsFullRedraw = true;
    }
  }

  getShowGrid(): boolean {
    return this.showGrid;
  }

  getWorld(): WorldManager {
    return this.world;
  }

  getPlayer(): PlayerController {
    return this.player;
  }

  handleMouseMove(clientX: number, clientY: number): void {
    const rect = this.canvas.getBoundingClientRect();
    const scaleX = this.canvas.width / rect.width;
    const scaleY = this.canvas.height / rect.height;
    
    const x = (clientX - rect.left) * scaleX;
    const y = (clientY - rect.top) * scaleY;
    
    this.mouseGridX = Math.floor(x / this.cellSize);
    this.mouseGridY = Math.floor(y / this.cellSize);

    if (this.isMouseDown) {
      this.handleBlockAction();
    }
  }

  handleMouseDown(button: number, clientX: number, clientY: number): void {
    this.isMouseDown = true;
    this.mouseButton = button;
    this.handleMouseMove(clientX, clientY);
    this.handleBlockAction();
  }

  handleMouseUp(): void {
    this.isMouseDown = false;
  }

  handleMouseLeave(): void {
    this.isMouseDown = false;
    this.mouseGridX = -1;
    this.mouseGridY = -1;
  }

  handleKeyDown(key: string): void {
    this.player.handleKeyDown(key);
    
    const num = parseInt(key, 10);
    if (num >= 1 && num <= 6) {
      this.currentBlock = num;
    }
  }

  handleKeyUp(key: string): void {
    this.player.handleKeyUp(key);
  }

  private handleBlockAction(): void {
    if (this.mouseGridX < 0 || this.mouseGridX >= this.gridWidth ||
        this.mouseGridY < 0 || this.mouseGridY >= this.gridHeight) {
      return;
    }

    if (this.mouseButton === 0) {
      this.world.setBlock(this.mouseGridX, this.mouseGridY, this.currentBlock);
    } else if (this.mouseButton === 2) {
      this.world.removeBlock(this.mouseGridX, this.mouseGridY);
    }
  }

  start(): void {
    this.lastTime = performance.now();
    this.needsFullRedraw = true;
    this.gameLoop();
  }

  stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  requestFullRedraw(): void {
    this.needsFullRedraw = true;
  }

  private gameLoop = (): void => {
    const currentTime = performance.now();
    const deltaTime = Math.min((currentTime - this.lastTime) / 1000, 1 / 30);
    this.lastTime = currentTime;

    this.frameCount++;
    if (currentTime - this.fpsUpdateTime >= 1000) {
      this.fps = this.frameCount;
      this.frameCount = 0;
      this.fpsUpdateTime = currentTime;
    }

    this.player.update(deltaTime);
    this.render();

    if (this.statsCallback) {
      this.statsCallback({
        fps: this.fps,
        blockCount: this.world.getBlockCount(),
        mouseGridX: this.mouseGridX,
        mouseGridY: this.mouseGridY,
      });
    }

    this.animationId = requestAnimationFrame(this.gameLoop);
  };

  private render(): void {
    const dirtyRegions = this.world.getAndClearDirtyRegions();
    
    if (this.needsFullRedraw) {
      this.renderFull();
      this.needsFullRedraw = false;
    } else if (dirtyRegions.size > 0) {
      this.renderDirtyRegions(dirtyRegions);
    }

    this.renderPlayer();
    this.renderMouseHighlight();
  }

  private renderFull(): void {
    this.ctx.fillStyle = '#1e1e2e';
    this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    for (let y = 0; y < this.gridHeight; y++) {
      for (let x = 0; x < this.gridWidth; x++) {
        this.renderCell(x, y);
      }
    }

    if (this.showGrid) {
      this.renderGrid();
    }
  }

  private renderDirtyRegions(dirtyRegions: Set<string>): void {
    dirtyRegions.forEach((key) => {
      const [x, y] = key.split(',').map(Number);
      this.clearCell(x, y);
      this.renderCell(x, y);
    });

    if (this.showGrid) {
      dirtyRegions.forEach((key) => {
        const [x, y] = key.split(',').map(Number);
        this.renderGridCell(x, y);
      });
    }
  }

  private clearCell(x: number, y: number): void {
    const px = x * this.cellSize;
    const py = y * this.cellSize;
    this.ctx.fillStyle = '#1e1e2e';
    this.ctx.fillRect(px, py, this.cellSize, this.cellSize);
  }

  private renderCell(x: number, y: number): void {
    const block = this.world.getBlock(x, y);
    if (block === BlockType.EMPTY) {
      return;
    }

    const px = x * this.cellSize;
    const py = y * this.cellSize;

    this.ctx.fillStyle = BLOCK_COLORS[block] || '#ffffff';
    this.ctx.fillRect(px, py, this.cellSize, this.cellSize);

    this.ctx.strokeStyle = '#00000044';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(px + 0.5, py + 0.5, this.cellSize - 1, this.cellSize - 1);

    if (block === BlockType.GRASS) {
      this.ctx.fillStyle = '#5a9c39';
      this.ctx.fillRect(px, py, this.cellSize, 4);
      this.ctx.fillStyle = '#6ab04c';
      for (let i = 0; i < 3; i++) {
        const gx = px + 4 + i * 10;
        this.ctx.fillRect(gx, py - 2, 2, 4);
      }
    } else if (block === BlockType.WATER) {
      this.ctx.fillStyle = '#60a5fa';
      const waveOffset = Math.sin((x + y + Date.now() / 500) * 0.5) * 2;
      this.ctx.fillRect(px, py + 4 + waveOffset, this.cellSize, 2);
      this.ctx.fillRect(px, py + 12 - waveOffset, this.cellSize, 1);
    } else if (block === BlockType.STONE) {
      this.ctx.fillStyle = '#6b6b6b';
      this.ctx.fillRect(px + 4, py + 4, 8, 8);
      this.ctx.fillRect(px + 18, py + 14, 10, 10);
      this.ctx.fillRect(px + 8, py + 20, 6, 6);
    } else if (block === BlockType.WOOD) {
      this.ctx.fillStyle = '#8b4513';
      this.ctx.fillRect(px, py + 8, this.cellSize, 2);
      this.ctx.fillRect(px, py + 20, this.cellSize, 2);
      for (let i = 0; i < 4; i++) {
        this.ctx.fillRect(px + 4 + i * 8, py + 2, 2, 4);
        this.ctx.fillRect(px + 2 + i * 8, py + 24, 2, 4);
      }
    } else if (block === BlockType.SAND) {
      this.ctx.fillStyle = '#d4ac0d';
      this.ctx.fillRect(px + 2, py + 6, 3, 3);
      this.ctx.fillRect(px + 12, py + 14, 2, 2);
      this.ctx.fillRect(px + 22, py + 8, 3, 3);
      this.ctx.fillRect(px + 8, py + 24, 2, 2);
      this.ctx.fillRect(px + 20, py + 22, 3, 3);
    }
  }

  private renderGrid(): void {
    this.ctx.strokeStyle = '#2d2d3f';
    this.ctx.lineWidth = 1;

    for (let x = 0; x <= this.gridWidth; x++) {
      const px = x * this.cellSize + 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(px, 0);
      this.ctx.lineTo(px, this.canvas.height);
      this.ctx.stroke();
    }

    for (let y = 0; y <= this.gridHeight; y++) {
      const py = y * this.cellSize + 0.5;
      this.ctx.beginPath();
      this.ctx.moveTo(0, py);
      this.ctx.lineTo(this.canvas.width, py);
      this.ctx.stroke();
    }
  }

  private renderGridCell(x: number, y: number): void {
    const px = x * this.cellSize;
    const py = y * this.cellSize;
    
    this.ctx.strokeStyle = '#2d2d3f';
    this.ctx.lineWidth = 1;
    this.ctx.strokeRect(px + 0.5, py + 0.5, this.cellSize, this.cellSize);
  }

  private renderPlayer(): void {
    const playerState = this.player.getState();
    const size = 16;
    const squash = playerState.squash;
    
    const drawWidth = size * (2 - squash);
    const drawHeight = size * squash;
    const offsetX = (size - drawWidth) / 2;
    const offsetY = size - drawHeight;

    let px = playerState.x + offsetX;
    let py = playerState.y + offsetY + playerState.velocityY;

    this.clearPlayerArea(playerState);

    this.ctx.save();
    
    if (!playerState.facingRight) {
      this.ctx.translate(px + drawWidth, py);
      this.ctx.scale(-1, 1);
      px = 0;
      py = 0;
    }

    this.ctx.fillStyle = '#1e40af';
    this.ctx.fillRect(px + 2, py + 6, drawWidth - 4, drawHeight - 10);

    this.ctx.fillStyle = '#fcd34d';
    this.ctx.fillRect(px + 3, py, drawWidth - 6, 8);

    this.ctx.fillStyle = '#000000';
    this.ctx.fillRect(px + 4, py + 3, 2, 2);
    this.ctx.fillRect(px + drawWidth - 6, py + 3, 2, 2);

    this.ctx.fillStyle = '#78350f';
    this.ctx.fillRect(px + 2, py + drawHeight - 6, (drawWidth - 4) / 2, 6);
    this.ctx.fillRect(px + drawWidth / 2, py + drawHeight - 6, (drawWidth - 4) / 2, 6);

    if (playerState.isJumping) {
      this.ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      this.ctx.fillRect(px + 2, py + drawHeight - 2, drawWidth - 4, 2);
    }

    this.ctx.restore();
  }

  private clearPlayerArea(playerState: PlayerState): void {
    const size = 16;
    const px = playerState.x - 2;
    const py = playerState.y + playerState.velocityY - 2;
    const clearSize = size + 4;

    const startX = Math.floor(px / this.cellSize);
    const startY = Math.floor(py / this.cellSize);
    const endX = Math.floor((px + clearSize) / this.cellSize);
    const endY = Math.floor((py + clearSize) / this.cellSize);

    for (let y = startY; y <= endY; y++) {
      for (let x = startX; x <= endX; x++) {
        if (x >= 0 && x < this.gridWidth && y >= 0 && y < this.gridHeight) {
          this.clearCell(x, y);
          this.renderCell(x, y);
          if (this.showGrid) {
            this.renderGridCell(x, y);
          }
        }
      }
    }
  }

  private renderMouseHighlight(): void {
    if (this.mouseGridX < 0 || this.mouseGridX >= this.gridWidth ||
        this.mouseGridY < 0 || this.mouseGridY >= this.gridHeight) {
      return;
    }

    const px = this.mouseGridX * this.cellSize;
    const py = this.mouseGridY * this.cellSize;

    this.ctx.strokeStyle = '#ffffff';
    this.ctx.lineWidth = 2;
    this.ctx.strokeRect(px + 1, py + 1, this.cellSize - 2, this.cellSize - 2);

    if (this.mouseButton === 0) {
      this.ctx.fillStyle = BLOCK_COLORS[this.currentBlock] + '44';
      this.ctx.fillRect(px + 2, py + 2, this.cellSize - 4, this.cellSize - 4);
    }
  }
}
