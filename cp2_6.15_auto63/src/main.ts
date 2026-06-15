import { GridManager } from './grid';
import { BrickLibrary } from './library';
import { Brick, BRICK_CONFIGS, BrickType, BrickData } from './brick';
import { saveAs } from 'file-saver';

interface HistoryState {
  bricks: BrickData[];
}

class LegoBuilderApp {
  private gridManager: GridManager;
  private brickLibrary: BrickLibrary;
  private canvas: HTMLCanvasElement;
  private canvasContainer: HTMLElement;

  private isDraggingFromLibrary: boolean = false;
  private currentDragType: BrickType | null = null;
  private previewRow: number = -1;
  private previewCol: number = -1;
  private previewWidth: number = 0;
  private previewHeight: number = 0;

  private isPanning: boolean = false;
  private panStartX: number = 0;
  private panStartY: number = 0;
  private panStartOffsetX: number = 0;
  private panStartOffsetY: number = 0;

  private history: HistoryState[] = [];
  private historyIndex: number = -1;
  private maxHistory: number = 50;

  private selectedBrickId: string | null = null;
  private lastFrameTime: number = 0;
  private animationFrameId: number | null = null;

  private mouseX: number = 0;
  private mouseY: number = 0;
  private isMouseOverCanvas: boolean = false;

  constructor() {
    this.canvas = document.getElementById('mainCanvas') as HTMLCanvasElement;
    this.canvasContainer = document.getElementById('canvasContainer') as HTMLElement;

    this.gridManager = new GridManager(this.canvas);
    this.brickLibrary = new BrickLibrary(
      document.getElementById('brickLibrary') as HTMLElement
    );

    this.init();
  }

  private init(): void {
    this.bindEvents();
    this.saveState();
    this.startAnimationLoop();
    this.updateButtonStates();
  }

  private bindEvents(): void {
    this.brickLibrary.setOnDragStart((type) => {
      this.isDraggingFromLibrary = true;
      this.currentDragType = type;
      const config = BRICK_CONFIGS[type];
      this.previewWidth = config.width;
      this.previewHeight = config.height;
    });

    this.brickLibrary.setOnDragEnd((type) => {
      if (this.isMouseOverCanvas && this.currentDragType) {
        this.tryPlaceBrick();
      }
      this.isDraggingFromLibrary = false;
      this.currentDragType = null;
      this.previewRow = -1;
      this.previewCol = -1;
    });

    document.addEventListener('mousemove', (e) => {
      this.mouseX = e.clientX;
      this.mouseY = e.clientY;

      if (this.isDraggingFromLibrary) {
        this.updatePreview();
      }

      if (this.isPanning) {
        const dx = e.clientX - this.panStartX;
        const dy = e.clientY - this.panStartY;
        this.gridManager.offsetX = this.panStartOffsetX + dx;
        this.gridManager.offsetY = this.panStartOffsetY + dy;
        (this.gridManager as any).applyBoundaryConstraints();
        (this.gridManager as any).applyTransform();
      }
    });

    this.canvas.addEventListener('mouseenter', () => {
      this.isMouseOverCanvas = true;
    });

    this.canvas.addEventListener('mouseleave', () => {
      this.isMouseOverCanvas = false;
      this.previewRow = -1;
      this.previewCol = -1;
    });

    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button === 1 || (e.button === 0 && e.ctrlKey)) {
        e.preventDefault();
        this.startPan(e.clientX, e.clientY);
      } else if (e.button === 0 && !this.isDraggingFromLibrary) {
          this.handleCanvasClick(e);
      }
    });

    this.canvas.addEventListener('dblclick', (e) => {
      this.handleCanvasDoubleClick(e);
    });

    document.addEventListener('mouseup', (e) => {
      if (this.isPanning) {
        this.endPan();
      }
    });

    this.canvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const delta = e.deltaY > 0 ? -this.gridManager.scaleStep : this.gridManager.scaleStep;
      const newScale = this.gridManager.scale + delta;
      this.gridManager.setScale(newScale, e.clientX, e.clientY);
    }, { passive: false });

    document.addEventListener('keydown', (e) => {
      if (e.ctrlKey && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        this.undo();
      } else if ((e.ctrlKey && e.key === 'y') || (e.ctrlKey && e.shiftKey && e.key === 'z')) {
        e.preventDefault();
        this.redo();
      } else if (e.key === 'Delete' || e.key === 'Backspace') {
        if (this.selectedBrickId) {
          this.deleteBrick(this.selectedBrickId);
        }
      } else if (e.key === 'r' || e.key === 'R') {
        if (this.selectedBrickId) {
          this.rotateSelectedBrick();
        }
      }
    });

    window.addEventListener('resize', () => {
      this.gridManager.centerCanvas();
    });

    const undoBtn = document.getElementById('undoBtn');
    const redoBtn = document.getElementById('redoBtn');

    undoBtn?.addEventListener('click', () => {
      const icon = undoBtn.querySelector('.btn-icon') as HTMLElement;
      if (icon) {
        icon.style.transition = 'none';
        icon.style.transform = 'rotate(0deg)';
        requestAnimationFrame(() => {
          icon.style.transition = 'transform 0.3s ease';
          icon.style.transform = 'rotate(-180deg)';
        });
      }
      this.undo();
    });

    redoBtn?.addEventListener('click', () => {
      const icon = redoBtn.querySelector('.btn-icon') as HTMLElement;
      if (icon) {
        icon.style.transition = 'none';
        icon.style.transform = 'rotate(0deg)';
        requestAnimationFrame(() => {
          icon.style.transition = 'transform 0.3s ease';
          icon.style.transform = 'rotate(180deg)';
        });
      }
      this.redo();
    });

    document.getElementById('clearBtn')?.addEventListener('click', () => {
      this.showClearConfirm();
    });

    document.getElementById('exportBtn')?.addEventListener('click', () => {
      this.exportSVG();
    });

    document.getElementById('cancelClearBtn')?.addEventListener('click', () => {
      this.hideClearConfirm();
    });

    document.getElementById('confirmClearBtn')?.addEventListener('click', () => {
      this.clearCanvas();
      this.hideClearConfirm();
    });
  }

  private startPan(x: number, y: number): void {
    this.isPanning = true;
    this.panStartX = x;
    this.panStartY = y;
    this.panStartOffsetX = this.gridManager.offsetX;
    this.panStartOffsetY = this.gridManager.offsetY;
    this.canvas.style.cursor = 'grabbing';
  }

  private endPan(): void {
    this.isPanning = false;
    this.canvas.style.cursor = 'default';
  }

  private handleCanvasClick(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (this.selectedBrickId) {
      const selectedBrick = this.gridManager.getBrickById(this.selectedBrickId);
      if (selectedBrick && selectedBrick.isPointOnRotateIcon(
        mouseX,
        mouseY,
        this.gridManager.cellSize,
        0,
        0,
        1
      )) {
        this.rotateSelectedBrick();
        return;
      }
    }

    const { row, col } = this.gridManager.getGridPosition(e.clientX, e.clientY);
    const brick = this.gridManager.getBrickAt(row, col);

    if (brick) {
      this.selectBrick(brick.id);
    } else {
      this.selectBrick(null);
    }
  }

  private handleCanvasDoubleClick(e: MouseEvent): void {
    const { row, col } = this.gridManager.getGridPosition(e.clientX, e.clientY);
    const brick = this.gridManager.getBrickAt(row, col);

    if (brick) {
      this.deleteBrick(brick.id);
    }
  }

  private selectBrick(brickId: string | null): void {
    this.selectedBrickId = brickId;
    this.gridManager.selectBrick(brickId);
  }

  private deleteBrick(brickId: string): void {
    const brick = this.gridManager.getBrickById(brickId);
    if (!brick) return;

    const type = brick.type;
    this.gridManager.startDeleteAnimation(brickId);
    this.selectedBrickId = null;

    setTimeout(() => {
      this.brickLibrary.incrementCount(type);
      this.saveState();
    }, 350);
  }

  private rotateSelectedBrick(): void {
    if (!this.selectedBrickId) return;

    const success = this.gridManager.rotateBrick(this.selectedBrickId);
    if (success) {
      this.saveState();
    }
  }

  private updatePreview(): void {
    if (this.currentDragType && this.isMouseOverCanvas) {
      const config = BRICK_CONFIGS[this.currentDragType];
      const snapped = this.gridManager.snapToGridByPixel(
        this.mouseX,
        this.mouseY,
        config.width,
        config.height
      );

      this.previewRow = snapped.row;
      this.previewCol = snapped.col;
    }
  }

  private tryPlaceBrick(): void {
    if (!this.currentDragType) return;
    if (this.previewRow < 0 || this.previewCol < 0) return;

    const config = BRICK_CONFIGS[this.currentDragType];
    const isValid = !this.gridManager.checkCollision(
      this.previewRow,
      this.previewCol,
      config.width,
      config.height
    );

    if (!isValid) return;

    const brick = new Brick(this.currentDragType, this.previewRow, this.previewCol);
    const success = this.gridManager.addBrick(brick);

    if (success) {
      this.brickLibrary.decrementCount(this.currentDragType);
      this.saveState();
    }
  }

  private saveState(): void {
    const bricksData = this.gridManager.getAllBricks().map(b => b.toData());

    this.history = this.history.slice(0, this.historyIndex + 1);

    this.history.push({ bricks: bricksData });

    if (this.history.length > this.maxHistory) {
      this.history.shift();
    } else {
      this.historyIndex++;
    }

    this.updateButtonStates();
  }

  private undo(): void {
    if (this.historyIndex <= 0) return;

    this.historyIndex--;
    this.restoreState(this.history[this.historyIndex]);
    this.updateButtonStates();
  }

  private redo(): void {
    if (this.historyIndex >= this.history.length - 1) return;

    this.historyIndex++;
    this.restoreState(this.history[this.historyIndex]);
    this.updateButtonStates();
  }

  private restoreState(state: HistoryState): void {
    this.gridManager.clearAll();

    for (const brickData of state.bricks) {
      const brick = Brick.fromData(brickData);
      this.gridManager.addBrick(brick);
    }

    this.selectedBrickId = null;
  }

  private updateButtonStates(): void {
    const undoBtn = document.getElementById('undoBtn') as HTMLButtonElement;
    const redoBtn = document.getElementById('redoBtn') as HTMLButtonElement;

    if (undoBtn) {
      undoBtn.disabled = this.historyIndex <= 0;
    }
    if (redoBtn) {
      redoBtn.disabled = this.historyIndex >= this.history.length - 1;
    }
  }

  private showClearConfirm(): void {
    const modal = document.getElementById('confirmModal');
    modal?.classList.add('show');
  }

  private hideClearConfirm(): void {
    const modal = document.getElementById('confirmModal');
    modal?.classList.remove('show');
  }

  private clearCanvas(): void {
    const bricks = this.gridManager.getAllBricks();
    for (const brick of bricks) {
      this.brickLibrary.incrementCount(brick.type);
    }

    this.gridManager.clearAll();
    this.selectedBrickId = null;
    this.saveState();
  }

  private exportSVG(): void {
    const canvasSize = this.gridManager.getCanvasSize();
    const cellSize = this.gridManager.cellSize;
    const bricks = this.gridManager.getAllBricks();

    let svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${canvasSize.width}" height="${canvasSize.height}" viewBox="0 0 ${canvasSize.width} ${canvasSize.height}">
  <defs>
    <style>
      .grid-line { stroke: #e0e0e0; stroke-width: 1; }
      .brick { stroke: rgba(0,0,0,0.2); stroke-width: 1; }
      .stud { fill: rgba(255,255,255,0.3); }
    </style>
  </defs>
  <rect width="100%" height="100%" fill="#ffffff"/>
`;

    for (let col = 0; col <= this.gridManager.cols; col++) {
      const x = col * cellSize;
      svgContent += `  <line class="grid-line" x1="${x}" y1="0" x2="${x}" y2="${canvasSize.height}"/>\n`;
    }
    for (let row = 0; row <= this.gridManager.rows; row++) {
      const y = row * cellSize;
      svgContent += `  <line class="grid-line" x1="0" y1="${y}" x2="${canvasSize.width}" y2="${y}"/>\n`;
    }

    for (const brick of bricks) {
      const x = brick.col * cellSize;
      const y = brick.row * cellSize;
      const w = brick.width * cellSize;
      const h = brick.height * cellSize;
      const radius = 4;

      svgContent += `  <g transform="translate(${x + w/2}, ${y + h/2}) rotate(${brick.rotation}) translate(${-w/2}, ${-h/2})">\n`;
      svgContent += `    <rect class="brick" fill="${brick.color}" x="1" y="1" width="${w-2}" height="${h-2}" rx="${radius}" ry="${radius}"/>\n`;

      const studRadius = cellSize * 0.15;
      for (let r = 0; r < brick.height; r++) {
        for (let c = 0; c < brick.width; c++) {
          const studX = cellSize / 2 + c * cellSize;
          const studY = cellSize / 2 + r * cellSize;
          svgContent += `    <circle class="stud" cx="${studX}" cy="${studY}" r="${studRadius}"/>\n`;
        }
      }

      svgContent += `  </g>\n`;
    }

    svgContent += `</svg>`;

    const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `lego_${timestamp}.svg`;
    saveAs(blob, filename);
  }

  private startAnimationLoop(): void {
    const animate = (timestamp: number) => {
      const deltaTime = this.lastFrameTime ? (timestamp - this.lastFrameTime) / 1000 : 0;
      this.lastFrameTime = timestamp;

      this.gridManager.updateAnimations(deltaTime);
      this.render();

      this.animationFrameId = requestAnimationFrame(animate);
    };

    this.animationFrameId = requestAnimationFrame(animate);
  }

  private render(): void {
    this.gridManager.render();

    if (this.isDraggingFromLibrary &&
        this.previewRow >= 0 &&
        this.previewCol >= 0 &&
        this.currentDragType) {
      const isValid = !this.gridManager.checkCollision(
        this.previewRow,
        this.previewCol,
        this.previewWidth,
        this.previewHeight
      );
      this.gridManager.drawDropPreview(
        this.previewRow,
        this.previewCol,
        this.previewWidth,
        this.previewHeight,
        isValid
      );
    }
  }

  public destroy(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }
}

window.addEventListener('DOMContentLoaded', () => {
  new LegoBuilderApp();
});
