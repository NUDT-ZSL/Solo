import {
  GRID_SIZE,
  gridToPixel,
  pixelToGrid,
  type GameState,
  type ToolType,
  type Conveyor,
  type Sorter,
  type Arm,
  type TargetZone,
  type Direction,
} from './entities';
import { LEVELS, getLevel, getTotalLevels } from './levels';
import { GameLoop } from './game-loop';
import { UIManager } from './ui';
import {
  canPlaceTool,
  getConveyorAt,
  getSorterAt,
  getArmAt,
  isSameGridPos,
} from './collision';

class Game {
  private canvas: HTMLCanvasElement;
  private gameLoop: GameLoop | null = null;
  private uiManager: UIManager;
  private state: GameState;
  private currentLevelIndex: number = 0;
  private toolIdCounter: number = 0;

  constructor() {
    this.canvas = document.getElementById('gameCanvas') as HTMLCanvasElement;

    this.state = this.createInitialState();

    this.uiManager = new UIManager({
      onToolSelect: (tool) => this.handleToolSelect(tool),
      onStart: () => this.handleStart(),
      onReset: () => this.handleReset(),
      onOverlayClose: () => this.handleOverlayClose(),
    });

    this.init();
  }

  private createInitialState(): GameState {
    const level = getLevel(this.currentLevelIndex);
    const targetZones: TargetZone[] = level.targetZones.map(z => ({
      ...z,
      celebrateAnimation: 0,
    }));

    const preplacedConveyors: Conveyor[] = (level.preplacedConveyors || []).map(c => ({
      ...c,
      placementAnimation: 0,
    }));

    return {
      currentLevel: level.id,
      isRunning: false,
      isPaused: false,
      isWon: false,
      isLost: false,
      timeRemaining: level.timeLimit,
      blocks: [],
      conveyors: preplacedConveyors,
      sorters: [],
      arms: [],
      targetZones,
      selectedTool: null,
      selectedCell: null,
      steps: 0,
      lastSpawnTime: 0,
      blockIdCounter: 0,
      toolIdCounter: preplacedConveyors.length + 1,
      availableTools: { ...level.availableTools },
      hoveredCell: null,
    };
  }

  private init(): void {
    const level = getLevel(this.currentLevelIndex);

    this.gameLoop = new GameLoop(this.canvas, this.state, level, {
      onWin: () => this.handleWin(),
      onLose: () => this.handleLose(),
      onStepsChange: (steps) => this.uiManager.updateSteps(steps),
      onTimeChange: (time) => this.uiManager.updateTime(time),
    });

    this.uiManager.updateLevelDisplay(level);
    this.uiManager.updateSteps(this.state.steps);
    this.uiManager.updateTime(this.state.timeRemaining);

    this.bindCanvasEvents();

    this.gameLoop.start();
    this.setupResponsiveLayout();
  }

  private bindCanvasEvents(): void {
    this.canvas.addEventListener('click', (e) => this.handleCanvasClick(e));
    this.canvas.addEventListener('mousemove', (e) => this.handleCanvasMouseMove(e));
    this.canvas.addEventListener('mouseleave', () => {
      this.state.hoveredCell = null;
    });
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      this.state.selectedTool = null;
      this.state.selectedCell = null;
    });

    window.addEventListener('resize', () => this.setupResponsiveLayout());
  }

  private setupResponsiveLayout(): void {
    const width = window.innerWidth;
    const sidePanel = document.querySelector('.side-panel') as HTMLElement;
    const canvasWrapper = document.querySelector('.canvas-wrapper') as HTMLElement;

    if (sidePanel && canvasWrapper) {
      if (width < 1024) {
        sidePanel.style.width = '100%';
        sidePanel.style.maxWidth = '600px';
      } else {
        sidePanel.style.width = '280px';
        sidePanel.style.maxWidth = 'none';
      }
    }
  }

  private getCanvasMousePos(e: MouseEvent): { x: number; y: number } {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  }

  private handleCanvasMouseMove(e: MouseEvent): void {
    if (this.state.isRunning) return;

    const pos = this.getCanvasMousePos(e);
    const gridPos = pixelToGrid(pos.x, pos.y);

    const level = getLevel(this.currentLevelIndex);
    if (gridPos.x >= 0 && gridPos.x < level.gridSize.width &&
        gridPos.y >= 0 && gridPos.y < level.gridSize.height) {
      this.state.hoveredCell = gridPos;
    } else {
      this.state.hoveredCell = null;
    }
  }

  private handleCanvasClick(e: MouseEvent): void {
    if (this.state.isRunning) return;

    const pos = this.getCanvasMousePos(e);
    const gridPos = pixelToGrid(pos.x, pos.y);
    const level = getLevel(this.currentLevelIndex);

    if (gridPos.x < 0 || gridPos.x >= level.gridSize.width ||
        gridPos.y < 0 || gridPos.y >= level.gridSize.height) {
      return;
    }

    if (this.state.selectedTool && this.state.availableTools[this.state.selectedTool] > 0) {
      this.placeTool(this.state.selectedTool, gridPos);
    } else {
      const existingConveyor = getConveyorAt(gridPos, this.state.conveyors);
      const existingSorter = getSorterAt(gridPos, this.state.sorters);
      const existingArm = getArmAt(gridPos, this.state.arms);

      if (existingConveyor || existingSorter || existingArm) {
        this.state.selectedCell = gridPos;
        if (existingConveyor) {
          this.rotateConveyor(existingConveyor);
        }
      } else {
        this.state.selectedCell = null;
      }
    }
  }

  private rotateConveyor(conveyor: Conveyor): void {
    const directions: Direction[] = ['right', 'down', 'left', 'up'];
    const currentIndex = directions.indexOf(conveyor.direction);
    conveyor.direction = directions[(currentIndex + 1) % 4];
  }

  private placeTool(toolType: ToolType, gridPos: { x: number; y: number }): void {
    const level = getLevel(this.currentLevelIndex);

    if (!canPlaceTool(
      gridPos,
      level.gridSize.width,
      level.gridSize.height,
      this.state.conveyors,
      this.state.sorters,
      this.state.arms,
      level.obstacles,
      this.state.targetZones,
      level.spawnPoint
    )) {
      return;
    }

    if (this.state.availableTools[toolType] <= 0) return;

    const id = this.state.toolIdCounter++;

    if (toolType === 'conveyor') {
      const conveyor: Conveyor = {
        id,
        gridPos: { ...gridPos },
        direction: 'right',
        placementAnimation: 1,
      };
      this.state.conveyors.push(conveyor);
    } else if (toolType === 'sorter') {
        const sorter: Sorter = {
          id,
          gridPos: { ...gridPos },
          colorMap: {
            red: 'up',
            yellow: 'down',
            green: 'left',
            blue: 'right',
          },
          placementAnimation: 1,
        };
        this.state.sorters.push(sorter);
      } else if (toolType === 'arm') {
          const arm: Arm = {
            id,
            gridPos: { ...gridPos },
            rotation: 0,
            rotationSpeed: 1,
            placementAnimation: 1,
          };
          this.state.arms.push(arm);
        }

    this.state.availableTools[toolType]--;
    this.state.steps++;
    this.uiManager.updateToolCounts(this.state.availableTools);
    this.uiManager.updateSteps(this.state.steps);
    this.state.selectedCell = { ...gridPos };

    setTimeout(() => {
      this.state.selectedCell = null;
    }, 200);
  }

  private handleToolSelect(tool: ToolType | null): void {
    this.state.selectedTool = tool;
    this.state.selectedCell = null;
  }

  private handleStart(): void {
    if (this.state.isRunning) return;

    const level = getLevel(this.currentLevelIndex);
    const spawnPos = level.spawnPoint;
    const firstConveyor = this.state.conveyors.find(c =>
      (c.gridPos.x === spawnPos.x + 1 && c.gridPos.y === spawnPos.y) ||
      this.state.conveyors.find(c => isSameGridPos(c.gridPos, { x: spawnPos.x + 1, y: spawnPos.y }));

    if (!firstConveyor && this.state.conveyors.length === 0) {
      alert('请先放置传送带！');
      return;
    }

    this.state.isRunning = true;
    this.state.lastSpawnTime = 0;
    this.uiManager.setRunning(true);
  }

  private handleReset(): void {
    this.resetLevel();
  }

  private resetLevel(): void {
    this.state = this.createInitialState();
    this.currentLevelIndex = this.currentLevelIndex;

    const level = getLevel(this.currentLevelIndex);

    if (this.gameLoop) {
      this.gameLoop.updateLevel(level, this.state);
    }

    this.uiManager.updateLevelDisplay(level);
    this.uiManager.updateSteps(this.state.steps);
    this.uiManager.updateTime(this.state.timeRemaining);
    this.uiManager.setRunning(false);
    this.uiManager.hideOverlay();
  }

  private handleWin(): void {
    if (this.gameLoop) {
      this.gameLoop.pause();
    }
    const hasNextLevel = this.currentLevelIndex < getTotalLevels() - 1;
    this.uiManager.showWin(this.state.currentLevel, hasNextLevel);
  }

  private handleLose(): void {
    if (this.gameLoop) {
      this.gameLoop.pause();
    }
    this.uiManager.showLose();
  }

  private handleOverlayClose(): void {
    this.uiManager.hideOverlay();

    if (this.state.isWon) {
      if (this.currentLevelIndex < getTotalLevels() - 1) {
        this.currentLevelIndex++;
        this.state = this.createInitialState();
        const level = getLevel(this.currentLevelIndex);
        if (this.gameLoop) {
          this.gameLoop.updateLevel(level, this.state);
          this.gameLoop.resume();
        }
        this.uiManager.updateLevelDisplay(level);
        this.uiManager.updateSteps(this.state.steps);
        this.uiManager.updateTime(this.state.timeRemaining);
        this.uiManager.setRunning(false);
      } else {
        this.currentLevelIndex = 0;
        this.resetLevel();
        if (this.gameLoop) {
          this.gameLoop.resume();
        }
      }
    } else if (this.state.isLost) {
      this.resetLevel();
      if (this.gameLoop) {
        this.gameLoop.resume();
      }
    }
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new Game();
});
