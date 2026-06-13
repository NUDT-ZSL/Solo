import {
  GRID_SIZE,
  MOVE_SPEED,
  MAX_BLOCKS,
  gridToPixel,
  drawGrid,
  drawObstacle,
  drawSpawnPoint,
  drawTargetZone,
  drawConveyor,
  drawSorter,
  drawArm,
  drawBlock,
  drawCellHighlight,
  type GameState,
  type Level,
  type Block,
  type Direction,
} from './entities';
import {
  getNextBlockPosition,
  checkBlockTargetCollision,
  checkWinCondition,
  getBlockPixelPosition,
  getColorForTarget,
  canPlaceTool,
} from './collision';

export interface GameCallbacks {
  onWin: () => void;
  onLose: () => void;
  onStepsChange: (steps: number) => void;
  onTimeChange: (time: number) => void;
}

export class GameLoop {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private state: GameState;
  private level: Level;
  private callbacks: GameCallbacks;
  private animationId: number | null = null;
  private lastTime: number = 0;
  private gameTime: number = 0;
  private lastSecondTime: number = 0;
  private currentColorIndex: number = 0;
  private isPaused: boolean = false;

  constructor(
    canvas: HTMLCanvasElement,
    state: GameState,
    level: Level,
    callbacks: GameCallbacks
  ) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d')!;
    this.state = state;
    this.level = level;
    this.callbacks = callbacks;
    this.resizeCanvas();
  }

  private resizeCanvas(): void {
    this.canvas.width = this.level.gridSize.width * GRID_SIZE;
    this.canvas.height = this.level.gridSize.height * GRID_SIZE;
  }

  public updateLevel(level: Level, state: GameState): void {
    this.level = level;
    this.state = state;
    this.resizeCanvas();
  }

  public start(): void {
    if (this.animationId !== null) return;
    this.lastTime = performance.now();
    this.lastSecondTime = this.lastTime;
    this.gameTime = 0;
    this.isPaused = false;
    this.loop();
  }

  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }

  public pause(): void {
    this.isPaused = true;
  }

  public resume(): void {
    this.isPaused = false;
    this.lastTime = performance.now();
    this.lastSecondTime = this.lastTime;
  }

  private loop = (): void => {
    const now = performance.now();
    const deltaTime = now - this.lastTime;
    this.lastTime = now;

    if (!this.isPaused) {
      this.gameTime += deltaTime;

      if (now - this.lastSecondTime >= 1000 && this.state.isRunning) {
        this.state.timeRemaining = Math.max(0, this.state.timeRemaining - 1);
        this.callbacks.onTimeChange(this.state.timeRemaining);
        this.lastSecondTime = now;

        if (this.state.timeRemaining <= 0 && !this.state.isWon) {
          this.state.isLost = true;
          this.callbacks.onLose();
          return;
        }
      }

      this.update(deltaTime);
    }

    this.render();
    this.animationId = requestAnimationFrame(this.loop);
  };

  private update(deltaTime: number): void {
    const timeInSeconds = this.gameTime / 1000;

    this.state.arms.forEach(arm => {
      arm.rotation += arm.rotationSpeed * deltaTime * 0.06;
      if (arm.rotation >= 360) arm.rotation -= 360;
    });

    this.state.conveyors.forEach(c => {
      if (c.placementAnimation > 0) {
        c.placementAnimation = Math.max(0, c.placementAnimation - deltaTime * 0.004);
      }
    });
    this.state.sorters.forEach(s => {
      if (s.placementAnimation > 0) {
        s.placementAnimation = Math.max(0, s.placementAnimation - deltaTime * 0.004);
      }
    });
    this.state.arms.forEach(a => {
      if (a.placementAnimation > 0) {
        a.placementAnimation = Math.max(0, a.placementAnimation - deltaTime * 0.004);
      }
    });

    this.state.targetZones.forEach(z => {
      if (z.celebrateAnimation > 0) {
        z.celebrateAnimation = Math.max(0, z.celebrateAnimation - deltaTime * 0.003);
      }
    });

    if (this.state.isRunning && !this.state.isWon && !this.state.isLost) {
      if (
        this.gameTime - this.state.lastSpawnTime >= this.level.spawnInterval &&
        this.state.blocks.length < MAX_BLOCKS
      ) {
        this.spawnBlock();
        this.state.lastSpawnTime = this.gameTime;
      }

      this.updateBlocks(deltaTime);
    }

    this.state.blocks.forEach(b => {
      if (b.spawnAnimation > 0) {
        b.spawnAnimation = Math.max(0, b.spawnAnimation - deltaTime * 0.004);
      }
    });
  }

  private spawnBlock(): void {
    const color = getColorForTarget(this.state.targetZones, this.currentColorIndex);
    this.currentColorIndex++;

    const spawnPixel = gridToPixel(
      this.level.spawnPoint.x,
      this.level.spawnPoint.y
    );

    const block: Block = {
      id: this.state.blockIdCounter++,
      color,
      pos: { ...spawnPixel },
      gridPos: { ...this.level.spawnPoint },
      targetGridPos: { ...this.level.spawnPoint },
      progress: 0,
      isMoving: false,
      spawnAnimation: 1,
    };

    this.state.blocks.push(block);
  }

  private updateBlocks(deltaTime: number): void {
    const blocksToRemove: number[] = [];

    for (const block of this.state.blocks) {
      if (block.spawnAnimation > 0) continue;

      if (!block.isMoving) {
        const nextPos = getNextBlockPosition(
          block,
          this.state.conveyors,
          this.state.sorters,
          this.state.arms,
          this.level.obstacles,
          this.state.targetZones,
          this.level.spawnDirection,
          this.level.gridSize.width,
          this.level.gridSize.height
        );

        if (nextPos) {
          const targetZone = checkBlockTargetCollision(
            { ...block, gridPos: nextPos.pos },
            this.state.targetZones
          );

          if (targetZone && targetZone.filled < targetZone.required) {
            block.targetGridPos = nextPos.pos;
            block.isMoving = true;
            block.progress = 0;
          } else if (!targetZone) {
            block.targetGridPos = nextPos.pos;
            block.isMoving = true;
            block.progress = 0;
          }
        }
      } else {
        block.progress += MOVE_SPEED * deltaTime * 0.06;

        if (block.progress >= 1) {
          block.progress = 1;
          block.gridPos = { ...block.targetGridPos };
          block.isMoving = false;
          block.progress = 0;

          const targetZone = checkBlockTargetCollision(
            block,
            this.state.targetZones
          );

          if (targetZone) {
            targetZone.filled++;
            targetZone.celebrateAnimation = 1;
            blocksToRemove.push(block.id);

            if (checkWinCondition(this.state.targetZones)) {
              this.state.isWon = true;
              this.callbacks.onWin();
            }
          } else {
            const nextPos = getNextBlockPosition(
              block,
              this.state.conveyors,
              this.state.sorters,
              this.state.arms,
              this.level.obstacles,
              this.state.targetZones,
              this.level.spawnDirection,
              this.level.gridSize.width,
              this.level.gridSize.height
            );

            if (!nextPos) {
              blocksToRemove.push(block.id);
            }
          }
        }

        const pixelPos = getBlockPixelPosition(block, Math.min(block.progress, 1));
        block.pos = pixelPos;
      }
    }

    this.state.blocks = this.state.blocks.filter(
      b => !blocksToRemove.includes(b.id)
    );
  }

  private render(): void {
    const ctx = this.ctx;
    const width = this.canvas.width;
    const height = this.canvas.height;
    const timeInSeconds = this.gameTime / 1000;

    drawGrid(ctx, width, height);

    this.level.obstacles.forEach(obstacle => {
      drawObstacle(ctx, obstacle);
    });

    drawSpawnPoint(ctx, this.level.spawnPoint, this.level.spawnDirection);

    this.state.targetZones.forEach(zone => {
      drawTargetZone(ctx, zone);
    });

    this.state.conveyors.forEach(conveyor => {
      drawConveyor(ctx, conveyor);
    });

    this.state.sorters.forEach(sorter => {
      drawSorter(ctx, sorter);
    });

    this.state.arms.forEach(arm => {
      drawArm(ctx, arm, timeInSeconds);
    });

    this.state.blocks.forEach(block => {
      drawBlock(ctx, block);
    });

    if (this.state.selectedTool && this.state.hoveredCell && !this.state.isRunning) {
      const isValid = canPlaceTool(
        this.state.hoveredCell,
        this.level.gridSize.width,
        this.level.gridSize.height,
        this.state.conveyors,
        this.state.sorters,
        this.state.arms,
        this.level.obstacles,
        this.state.targetZones,
        this.level.spawnPoint
      );
      drawCellHighlight(ctx, this.state.hoveredCell, isValid, false);
    }

    if (this.state.selectedCell) {
      drawCellHighlight(ctx, this.state.selectedCell, true, true);
    }
  }

  public getState(): GameState {
    return this.state;
  }

  public getLevel(): Level {
    return this.level;
  }
}
