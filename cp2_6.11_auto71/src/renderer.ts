import type { Recipe, Ingredient } from './recipe';
import { CONSTANTS, getPalette } from './recipe';

const { ICON_SIZE, ICON_SPACING, CANVAS_HEIGHT } = CONSTANTS;

const BG_COLOR = '#F5DEB3';
const BORDER_COLOR = '#D2691E';
const TEXT_COLOR = '#8B4513';
const GRID_COLOR = 'rgba(210, 105, 30, 0.15)';

export interface EditState {
  hoveredId: string | null;
  draggingId: string | null;
  pressedId: string | null;
}

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private recipe: Recipe | null = null;
  private editState: EditState = {
    hoveredId: null,
    draggingId: null,
    pressedId: null
  };
  private animationFrameId: number | null = null;
  private lastFlashTime = 0;
  private flashDuration = 150;
  private flashInterval = 2000;
  private isFlashing = false;
  private offscreenCanvas: HTMLCanvasElement;
  private offscreenCtx: CanvasRenderingContext2D;
  private gridCanvas: HTMLCanvasElement;
  private gridCtx: CanvasRenderingContext2D;
  private gridDirty = true;
  private onUpdateCallback: (() => void) | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.ctx.imageSmoothingEnabled = false;

    this.offscreenCanvas = document.createElement('canvas');
    const offCtx = this.offscreenCanvas.getContext('2d');
    if (!offCtx) throw new Error('Failed to get offscreen context');
    this.offscreenCtx = offCtx;
    this.offscreenCtx.imageSmoothingEnabled = false;

    this.gridCanvas = document.createElement('canvas');
    const gridCtx = this.gridCanvas.getContext('2d');
    if (!gridCtx) throw new Error('Failed to get grid context');
    this.gridCtx = gridCtx;
    this.gridCtx.imageSmoothingEnabled = false;
  }

  public setOnUpdate(callback: () => void): void {
    this.onUpdateCallback = callback;
  }

  public setRecipe(recipe: Recipe): void {
    this.recipe = recipe;
    this.gridDirty = true;
    this.resizeCanvas();
  }

  public getRecipe(): Recipe | null {
    return this.recipe;
  }

  public setEditState(state: Partial<EditState>): void {
    this.editState = { ...this.editState, ...state };
  }

  public getEditState(): EditState {
    return { ...this.editState };
  }

  public resizeCanvas(width?: number, height?: number): void {
    const w = width || this.canvas.width;
    const h = height || CANVAS_HEIGHT;
    this.canvas.width = w;
    this.canvas.height = h;
    this.offscreenCanvas.width = w;
    this.offscreenCanvas.height = h;
    this.ctx.imageSmoothingEnabled = false;
    this.offscreenCtx.imageSmoothingEnabled = false;
    this.gridDirty = true;
  }

  public getIconAtPosition(x: number, y: number): Ingredient | null {
    if (!this.recipe) return null;

    const scale = this.editState.hoveredId ? 1.2 : 1;
    const hitSize = ICON_SIZE * scale * 1.5;

    for (let i = this.recipe.ingredients.length - 1; i >= 0; i--) {
      const ing = this.recipe.ingredients[i];
      const halfSize = hitSize / 2;
      if (
        x >= ing.x - halfSize &&
        x <= ing.x + halfSize &&
        y >= ing.y - halfSize &&
        y <= ing.y + halfSize
      ) {
        return ing;
      }
    }
    return null;
  }

  public updateIngredient(id: string, updates: Partial<Ingredient>): void {
    if (!this.recipe) return;
    const index = this.recipe.ingredients.findIndex(i => i.id === id);
    if (index !== -1) {
      this.recipe.ingredients[index] = {
        ...this.recipe.ingredients[index],
        ...updates
      };
    }
  }

  public snapToGrid(x: number, y: number): { x: number; y: number } {
    const gridSize = 8;
    return {
      x: Math.round(x / gridSize) * gridSize,
      y: Math.round(y / gridSize) * gridSize
    };
  }

  public startAnimation(): void {
    if (this.animationFrameId !== null) return;
    
    const animate = (timestamp: number) => {
      if (timestamp - this.lastFlashTime >= this.flashInterval && !this.isFlashing) {
        this.isFlashing = true;
        this.lastFlashTime = timestamp;
      }
      if (this.isFlashing && timestamp - this.lastFlashTime >= this.flashDuration) {
        this.isFlashing = false;
        this.lastFlashTime = timestamp;
      }

      this.render();
      this.animationFrameId = requestAnimationFrame(animate);
    };
    
    this.animationFrameId = requestAnimationFrame(animate);
  }

  public stopAnimation(): void {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  public render(): void {
    if (!this.recipe) return;

    this.offscreenCtx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    this.drawGridBackground();
    this.offscreenCtx.drawImage(this.gridCanvas, 0, 0);

    this.drawConnections();
    this.drawIcons();
    this.drawStepLabels();

    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);

    if (this.onUpdateCallback) {
      this.onUpdateCallback();
    }
  }

  private drawGridBackground(): void {
    if (!this.gridDirty) return;

    this.gridCanvas.width = this.canvas.width;
    this.gridCanvas.height = this.canvas.height;
    this.gridCtx.imageSmoothingEnabled = false;

    this.gridCtx.fillStyle = BG_COLOR;
    this.gridCtx.fillRect(0, 0, this.canvas.width, this.canvas.height);

    const gridSize = 16;
    this.gridCtx.strokeStyle = GRID_COLOR;
    this.gridCtx.lineWidth = 1;

    for (let x = 0; x <= this.canvas.width; x += gridSize) {
      this.gridCtx.beginPath();
      this.gridCtx.moveTo(x + 0.5, 0);
      this.gridCtx.lineTo(x + 0.5, this.canvas.height);
      this.gridCtx.stroke();
    }

    for (let y = 0; y <= this.canvas.height; y += gridSize) {
      this.gridCtx.beginPath();
      this.gridCtx.moveTo(0, y + 0.5);
      this.gridCtx.lineTo(this.canvas.width, y + 0.5);
      this.gridCtx.stroke();
    }

    this.gridDirty = false;
  }

  private drawConnections(): void {
    if (!this.recipe) return;

    const ingredientMap = new Map(this.recipe.ingredients.map(i => [i.id, i]));

    for (const step of this.recipe.steps) {
      const from = ingredientMap.get(step.from);
      const to = ingredientMap.get(step.to);
      if (!from || !to) continue;

      const gradient = this.offscreenCtx.createLinearGradient(from.x, from.y, to.x, to.y);
      gradient.addColorStop(0, from.color);
      gradient.addColorStop(1, to.color);

      this.offscreenCtx.strokeStyle = gradient;
      this.offscreenCtx.lineWidth = 3;
      this.offscreenCtx.lineCap = 'square';
      this.offscreenCtx.lineJoin = 'miter';

      const midY = (from.y + to.y) / 2;
      const controlOffset = Math.abs(to.x - from.x) * 0.3;

      this.offscreenCtx.beginPath();
      this.offscreenCtx.moveTo(from.x + ICON_SIZE / 2, from.y);
      
      if (Math.abs(to.y - from.y) > 10) {
        this.offscreenCtx.bezierCurveTo(
          from.x + ICON_SIZE / 2 + controlOffset, from.y,
          to.x - ICON_SIZE / 2 - controlOffset, to.y,
          to.x - ICON_SIZE / 2, to.y
        );
      } else {
        this.offscreenCtx.lineTo(to.x - ICON_SIZE / 2, to.y);
      }
      this.offscreenCtx.stroke();

      this.drawArrowHead(to.x - ICON_SIZE / 2, to.y, from.x, from.y, to.color);
    }
  }

  private drawArrowHead(x: number, y: number, fromX: number, fromY: number, color: string): void {
    const angle = Math.atan2(y - fromY, x - fromX);
    const size = 8;

    this.offscreenCtx.fillStyle = color;
    this.offscreenCtx.strokeStyle = BORDER_COLOR;
    this.offscreenCtx.lineWidth = 2;

    this.offscreenCtx.beginPath();
    this.offscreenCtx.moveTo(x, y);
    this.offscreenCtx.lineTo(
      x - size * Math.cos(angle - Math.PI / 6),
      y - size * Math.sin(angle - Math.PI / 6)
    );
    this.offscreenCtx.lineTo(
      x - size * Math.cos(angle + Math.PI / 6),
      y - size * Math.sin(angle + Math.PI / 6)
    );
    this.offscreenCtx.closePath();
    this.offscreenCtx.fill();
    this.offscreenCtx.stroke();
  }

  private drawIcons(): void {
    if (!this.recipe) return;

    for (const ingredient of this.recipe.ingredients) {
      const isHovered = this.editState.hoveredId === ingredient.id;
      const isDragging = this.editState.draggingId === ingredient.id;
      const isPressed = this.editState.pressedId === ingredient.id;
      const isFlashing = this.isFlashing && !isDragging;

      this.drawIcon(ingredient, isHovered, isDragging, isPressed, isFlashing);
    }
  }

  private drawIcon(
    ingredient: Ingredient,
    isHovered: boolean,
    isDragging: boolean,
    isPressed: boolean,
    isFlashing: boolean
  ): void {
    const scale = isHovered || isDragging ? 1.2 : 1;
    const size = ICON_SIZE * scale;
    const halfSize = size / 2;
    
    let x = ingredient.x;
    let y = ingredient.y;

    if (isPressed) {
      y += 2;
    }

    const darkenFactor = isPressed ? 0.85 : 1;
    const color = this.adjustBrightness(ingredient.color, darkenFactor);
    const borderColor = isFlashing ? '#FFFFFF' : BORDER_COLOR;
    const borderWidth = isFlashing ? 3 : 2;

    this.offscreenCtx.save();
    this.offscreenCtx.translate(x, y);

    this.offscreenCtx.fillStyle = color;
    this.offscreenCtx.strokeStyle = borderColor;
    this.offscreenCtx.lineWidth = borderWidth;

    switch (ingredient.shape) {
      case 'circle':
        this.drawPixelCircle(0, 0, halfSize, color, borderColor, borderWidth);
        break;
      case 'square':
        this.drawPixelSquare(0, 0, size, color, borderColor, borderWidth);
        break;
      case 'triangle':
        this.drawPixelTriangle(0, 0, size, color, borderColor, borderWidth);
        break;
      case 'ellipse':
        this.drawPixelEllipse(0, 0, size, size * 0.7, color, borderColor, borderWidth);
        break;
    }

    this.offscreenCtx.restore();

    this.drawLabel(ingredient.name, x, y + halfSize + 16);
  }

  private drawPixelCircle(
    x: number,
    y: number,
    radius: number,
    fillColor: string,
    borderColor: string,
    borderWidth: number
  ): void {
    const steps = 16;
    this.offscreenCtx.beginPath();
    for (let i = 0; i <= steps; i++) {
      const angle = (i / steps) * Math.PI * 2;
      const px = x + Math.round(Math.cos(angle) * radius);
      const py = y + Math.round(Math.sin(angle) * radius);
      if (i === 0) {
        this.offscreenCtx.moveTo(px, py);
      } else {
        this.offscreenCtx.lineTo(px, py);
      }
    }
    this.offscreenCtx.closePath();
    this.offscreenCtx.fillStyle = fillColor;
    this.offscreenCtx.fill();
    this.offscreenCtx.strokeStyle = borderColor;
    this.offscreenCtx.lineWidth = borderWidth;
    this.offscreenCtx.stroke();
  }

  private drawPixelSquare(
    x: number,
    y: number,
    size: number,
    fillColor: string,
    borderColor: string,
    borderWidth: number
  ): void {
    const half = size / 2;
    this.offscreenCtx.fillStyle = fillColor;
    this.offscreenCtx.fillRect(x - half, y - half, size, size);
    this.offscreenCtx.strokeStyle = borderColor;
    this.offscreenCtx.lineWidth = borderWidth;
    this.offscreenCtx.strokeRect(x - half, y - half, size, size);
  }

  private drawPixelTriangle(
    x: number,
    y: number,
    size: number,
    fillColor: string,
    borderColor: string,
    borderWidth: number
  ): void {
    const half = size / 2;
    this.offscreenCtx.beginPath();
    this.offscreenCtx.moveTo(x, y - half);
    this.offscreenCtx.lineTo(x + half, y + half);
    this.offscreenCtx.lineTo(x - half, y + half);
    this.offscreenCtx.closePath();
    this.offscreenCtx.fillStyle = fillColor;
    this.offscreenCtx.fill();
    this.offscreenCtx.strokeStyle = borderColor;
    this.offscreenCtx.lineWidth = borderWidth;
    this.offscreenCtx.stroke();
  }

  private drawPixelEllipse(
    x: number,
    y: number,
    width: number,
    height: number,
    fillColor: string,
    borderColor: string,
    borderWidth: number
  ): void {
    const halfW = width / 2;
    const halfH = height / 2;
    this.offscreenCtx.beginPath();
    this.offscreenCtx.ellipse(x, y, halfW, halfH, 0, 0, Math.PI * 2);
    this.offscreenCtx.fillStyle = fillColor;
    this.offscreenCtx.fill();
    this.offscreenCtx.strokeStyle = borderColor;
    this.offscreenCtx.lineWidth = borderWidth;
    this.offscreenCtx.stroke();
  }

  private drawLabel(text: string, x: number, y: number): void {
    this.offscreenCtx.font = '8px "Press Start 2P", monospace';
    this.offscreenCtx.textAlign = 'center';
    this.offscreenCtx.textBaseline = 'top';
    
    this.offscreenCtx.fillStyle = BG_COLOR;
    const textWidth = this.offscreenCtx.measureText(text).width;
    this.offscreenCtx.fillRect(x - textWidth / 2 - 2, y - 1, textWidth + 4, 12);
    
    this.offscreenCtx.strokeStyle = BORDER_COLOR;
    this.offscreenCtx.lineWidth = 1;
    this.offscreenCtx.strokeRect(x - textWidth / 2 - 2, y - 1, textWidth + 4, 12);

    this.offscreenCtx.fillStyle = TEXT_COLOR;
    this.offscreenCtx.fillText(text, x, y + 1);
  }

  private drawStepLabels(): void {
    if (!this.recipe) return;

    const ingredientMap = new Map(this.recipe.ingredients.map(i => [i.id, i]));
    this.offscreenCtx.font = '6px "Press Start 2P", monospace';
    this.offscreenCtx.textAlign = 'center';
    this.offscreenCtx.textBaseline = 'middle';

    for (const step of this.recipe.steps) {
      const from = ingredientMap.get(step.from);
      const to = ingredientMap.get(step.to);
      if (!from || !to) continue;

      const midX = (from.x + to.x) / 2;
      const midY = (from.y + to.y) / 2 - 20;

      this.offscreenCtx.fillStyle = BG_COLOR;
      const textWidth = this.offscreenCtx.measureText(step.action).width;
      this.offscreenCtx.fillRect(midX - textWidth / 2 - 3, midY - 5, textWidth + 6, 12);
      
      this.offscreenCtx.strokeStyle = BORDER_COLOR;
      this.offscreenCtx.lineWidth = 1;
      this.offscreenCtx.strokeRect(midX - textWidth / 2 - 3, midY - 5, textWidth + 6, 12);

      this.offscreenCtx.fillStyle = TEXT_COLOR;
      this.offscreenCtx.fillText(step.action, midX, midY + 1);
    }
  }

  private adjustBrightness(hex: string, factor: number): string {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);

    const newR = Math.max(0, Math.min(255, Math.round(r * factor)));
    const newG = Math.max(0, Math.min(255, Math.round(g * factor)));
    const newB = Math.max(0, Math.min(255, Math.round(b * factor)));

    return `#${newR.toString(16).padStart(2, '0')}${newG.toString(16).padStart(2, '0')}${newB.toString(16).padStart(2, '0')}`;
  }

  public exportPNG(): Promise<string> {
    return new Promise((resolve, reject) => {
      const startTime = performance.now();
      
      const exportCanvas = document.createElement('canvas');
      exportCanvas.width = this.canvas.width;
      exportCanvas.height = this.canvas.height;
      const exportCtx = exportCanvas.getContext('2d');
      
      if (!exportCtx) {
        reject(new Error('Failed to get export context'));
        return;
      }
      
      exportCtx.imageSmoothingEnabled = false;
      exportCtx.clearRect(0, 0, exportCanvas.width, exportCanvas.height);

      const originalEditState = { ...this.editState };
      this.editState = { hoveredId: null, draggingId: null, pressedId: null };
      
      const prevFlashState = this.isFlashing;
      this.isFlashing = false;

      const tempGridDirty = this.gridDirty;
      this.gridDirty = true;
      
      this.drawGridBackground();
      exportCtx.drawImage(this.gridCanvas, 0, 0);
      
      const ingredientMap = new Map(this.recipe!.ingredients.map(i => [i.id, i]));
      for (const step of this.recipe!.steps) {
        const from = ingredientMap.get(step.from);
        const to = ingredientMap.get(step.to);
        if (!from || !to) continue;

        const gradient = exportCtx.createLinearGradient(from.x, from.y, to.x, to.y);
        gradient.addColorStop(0, from.color);
        gradient.addColorStop(1, to.color);
        exportCtx.strokeStyle = gradient;
        exportCtx.lineWidth = 3;
        exportCtx.lineCap = 'square';

        exportCtx.beginPath();
        exportCtx.moveTo(from.x + ICON_SIZE / 2, from.y);
        exportCtx.lineTo(to.x - ICON_SIZE / 2, to.y);
        exportCtx.stroke();

        const angle = Math.atan2(to.y - from.y, to.x - from.x);
        const size = 8;
        exportCtx.fillStyle = to.color;
        exportCtx.strokeStyle = BORDER_COLOR;
        exportCtx.lineWidth = 2;
        exportCtx.beginPath();
        exportCtx.moveTo(to.x - ICON_SIZE / 2, to.y);
        exportCtx.lineTo(
          to.x - ICON_SIZE / 2 - size * Math.cos(angle - Math.PI / 6),
          to.y - size * Math.sin(angle - Math.PI / 6)
        );
        exportCtx.lineTo(
          to.x - ICON_SIZE / 2 - size * Math.cos(angle + Math.PI / 6),
          to.y - size * Math.sin(angle + Math.PI / 6)
        );
        exportCtx.closePath();
        exportCtx.fill();
        exportCtx.stroke();
      }

      for (const ingredient of this.recipe!.ingredients) {
        exportCtx.save();
        exportCtx.translate(ingredient.x, ingredient.y);
        
        const size = ICON_SIZE;
        const halfSize = size / 2;
        
        exportCtx.fillStyle = ingredient.color;
        exportCtx.strokeStyle = BORDER_COLOR;
        exportCtx.lineWidth = 2;

        switch (ingredient.shape) {
          case 'circle':
            exportCtx.beginPath();
            for (let i = 0; i <= 16; i++) {
              const a = (i / 16) * Math.PI * 2;
              const px = Math.round(Math.cos(a) * halfSize);
              const py = Math.round(Math.sin(a) * halfSize);
              if (i === 0) exportCtx.moveTo(px, py);
              else exportCtx.lineTo(px, py);
            }
            exportCtx.closePath();
            exportCtx.fill();
            exportCtx.stroke();
            break;
          case 'square':
            exportCtx.fillRect(-halfSize, -halfSize, size, size);
            exportCtx.strokeRect(-halfSize, -halfSize, size, size);
            break;
          case 'triangle':
            exportCtx.beginPath();
            exportCtx.moveTo(0, -halfSize);
            exportCtx.lineTo(halfSize, halfSize);
            exportCtx.lineTo(-halfSize, halfSize);
            exportCtx.closePath();
            exportCtx.fill();
            exportCtx.stroke();
            break;
          case 'ellipse':
            exportCtx.beginPath();
            exportCtx.ellipse(0, 0, halfSize, halfSize * 0.7, 0, 0, Math.PI * 2);
            exportCtx.fill();
            exportCtx.stroke();
            break;
        }
        exportCtx.restore();

        exportCtx.font = '8px "Press Start 2P", monospace';
        exportCtx.textAlign = 'center';
        exportCtx.textBaseline = 'top';
        const labelY = ingredient.y + halfSize + 16;
        const textWidth = exportCtx.measureText(ingredient.name).width;
        exportCtx.fillStyle = BG_COLOR;
        exportCtx.fillRect(ingredient.x - textWidth / 2 - 2, labelY - 1, textWidth + 4, 12);
        exportCtx.strokeStyle = BORDER_COLOR;
        exportCtx.lineWidth = 1;
        exportCtx.strokeRect(ingredient.x - textWidth / 2 - 2, labelY - 1, textWidth + 4, 12);
        exportCtx.fillStyle = TEXT_COLOR;
        exportCtx.fillText(ingredient.name, ingredient.x, labelY + 1);
      }

      this.editState = originalEditState;
      this.isFlashing = prevFlashState;
      this.gridDirty = tempGridDirty;

      exportCanvas.toBlob((blob) => {
        if (!blob) {
          reject(new Error('Failed to create blob'));
          return;
        }
        const url = URL.createObjectURL(blob);
        const elapsed = performance.now() - startTime;
        console.log(`PNG exported in ${elapsed.toFixed(0)}ms`);
        resolve(url);
      }, 'image/png');
    });
  }

  public getPalette(): string[] {
    return getPalette();
  }
}
