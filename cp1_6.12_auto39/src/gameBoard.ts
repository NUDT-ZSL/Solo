const GRID_SIZE = 5;
const CELL_GAP = 8;
const BOUNCE_DURATION = 200;
const SHAKE_DURATION = 300;

interface CellState {
  letter: string;
  selected: boolean;
  selectOrder: number;
  bounceProgress: number;
  shakeProgress: number;
}

interface Star {
  x: number;
  y: number;
  size: number;
  alpha: number;
  twinkleSpeed: number;
  phase: number;
}

export type WordSubmitCallback = (word: string) => { valid: boolean; score: number };

export class GameBoard {
  private cells: CellState[][] = [];
  private selectedPath: { row: number; col: number }[] = [];
  private isDragging = false;
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private boardX = 0;
  private boardY = 0;
  private cellSize = 60;
  private dpr = 1;
  private onWordSubmit?: WordSubmitCallback;
  private lastTime = 0;
  private stars: Star[] = [];
  private starsInitialized = false;
  private hoveredCell: { row: number; col: number } | null = null;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Failed to get 2D context');
    this.ctx = ctx;
    this.initEmptyCells();
    this.setupEventListeners();
    this.updateSize();
  }

  setOnWordSubmit(cb: WordSubmitCallback): void {
    this.onWordSubmit = cb;
  }

  reset(letters: string[][]): void {
    this.cells = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const row: CellState[] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        row.push({
          letter: (letters[r]?.[c] || 'A').toUpperCase(),
          selected: false,
          selectOrder: -1,
          bounceProgress: 0,
          shakeProgress: 0
        });
      }
      this.cells.push(row);
    }
    this.selectedPath = [];
    this.isDragging = false;
  }

  updateSize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = rect.width * this.dpr;
    this.canvas.height = rect.height * this.dpr;
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const isMobile = rect.width < 768;
    const maxBoardWidth = isMobile ? rect.width - 32 : Math.min(rect.width * 0.45, 520);
    const maxBoardHeight = isMobile ? rect.height * 0.42 : rect.height - 160;
    const boardSize = Math.min(maxBoardWidth, maxBoardHeight);
    this.cellSize = (boardSize - CELL_GAP * (GRID_SIZE + 1)) / GRID_SIZE;

    const totalBoardSize = this.cellSize * GRID_SIZE + CELL_GAP * (GRID_SIZE + 1);
    this.boardX = (rect.width - totalBoardSize) / 2;
    this.boardY = isMobile
      ? rect.height * 0.26 + (rect.height * 0.42 - totalBoardSize) / 2
      : (rect.height - totalBoardSize) / 2 + 10;

    if (!this.starsInitialized) {
      this.initStars(rect.width, rect.height);
      this.starsInitialized = true;
    }
  }

  private initStars(w: number, h: number): void {
    this.stars = [];
    const count = Math.floor((w * h) / 6000);
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 1.8 + 0.3,
        alpha: Math.random() * 0.6 + 0.2,
        twinkleSpeed: Math.random() * 1.5 + 0.5,
        phase: Math.random() * Math.PI * 2
      });
    }
  }

  private initEmptyCells(): void {
    const letters: string[][] = [];
    for (let r = 0; r < GRID_SIZE; r++) {
      const row: string[] = [];
      for (let c = 0; c < GRID_SIZE; c++) {
        row.push(String.fromCharCode(65 + Math.floor(Math.random() * 26)));
      }
      letters.push(row);
    }
    this.reset(letters);
  }

  private setupEventListeners(): void {
    const getPos = (e: MouseEvent | Touch): { x: number; y: number } => {
      const rect = this.canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleStart = (x: number, y: number): void => {
      const cell = this.getCellAt(x, y);
      if (cell) {
        this.isDragging = true;
        this.selectCell(cell.row, cell.col);
      }
    };

    const handleMove = (x: number, y: number): void => {
      this.hoveredCell = this.getCellAt(x, y);
      if (this.isDragging) {
        const cell = this.getCellAt(x, y);
        if (cell) {
          if (this.selectedPath.length >= 2) {
            const prev = this.selectedPath[this.selectedPath.length - 2];
            if (prev.row === cell.row && prev.col === cell.col) {
              this.deselectLast();
              return;
            }
          }
          if (this.isAdjacentToLast(cell.row, cell.col) && !this.isCellSelected(cell.row, cell.col)) {
            this.selectCell(cell.row, cell.col);
          }
        }
      }
    };

    const handleEnd = (): void => {
      if (this.isDragging) {
        this.isDragging = false;
        this.submitWord();
      }
    };

    this.canvas.addEventListener('mousedown', (e) => {
      e.preventDefault();
      const p = getPos(e);
      handleStart(p.x, p.y);
    });
    this.canvas.addEventListener('mousemove', (e) => {
      const p = getPos(e);
      handleMove(p.x, p.y);
    });
    window.addEventListener('mouseup', handleEnd);

    this.canvas.addEventListener('touchstart', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const p = getPos(e.touches[0]);
        handleStart(p.x, p.y);
      }
    }, { passive: false });
    this.canvas.addEventListener('touchmove', (e) => {
      e.preventDefault();
      if (e.touches.length > 0) {
        const p = getPos(e.touches[0]);
        handleMove(p.x, p.y);
      }
    }, { passive: false });
    this.canvas.addEventListener('touchend', (e) => {
      e.preventDefault();
      handleEnd();
    }, { passive: false });
  }

  private getCellAt(x: number, y: number): { row: number; col: number } | null {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const bx = this.boardX + CELL_GAP + c * (this.cellSize + CELL_GAP);
        const by = this.boardY + CELL_GAP + r * (this.cellSize + CELL_GAP);
        if (x >= bx && x <= bx + this.cellSize && y >= by && y <= by + this.cellSize) {
          return { row: r, col: c };
        }
      }
    }
    return null;
  }

  private isCellSelected(row: number, col: number): boolean {
    return this.selectedPath.some((p) => p.row === row && p.col === col);
  }

  private isAdjacentToLast(row: number, col: number): boolean {
    if (this.selectedPath.length === 0) return true;
    const last = this.selectedPath[this.selectedPath.length - 1];
    const dr = Math.abs(row - last.row);
    const dc = Math.abs(col - last.col);
    return dr <= 1 && dc <= 1 && !(dr === 0 && dc === 0);
  }

  private selectCell(row: number, col: number): void {
    const cell = this.cells[row][col];
    cell.selected = true;
    cell.selectOrder = this.selectedPath.length;
    cell.bounceProgress = 0.001;
    this.selectedPath.push({ row, col });
  }

  private deselectLast(): void {
    const last = this.selectedPath.pop();
    if (last) {
      const cell = this.cells[last.row][last.col];
      cell.selected = false;
      cell.selectOrder = -1;
    }
  }

  private clearSelection(): void {
    for (const p of this.selectedPath) {
      this.cells[p.row][p.col].selected = false;
      this.cells[p.row][p.col].selectOrder = -1;
    }
    this.selectedPath = [];
  }

  private triggerShake(): void {
    for (const p of this.selectedPath) {
      this.cells[p.row][p.col].shakeProgress = 0.001;
    }
  }

  private submitWord(): void {
    if (this.selectedPath.length < 2) {
      this.clearSelection();
      return;
    }
    const word = this.selectedPath.map((p) => this.cells[p.row][p.col].letter).join('');
    if (this.onWordSubmit) {
      const result = this.onWordSubmit(word);
      if (result.valid) {
        this.clearSelection();
      } else {
        this.triggerShake();
        setTimeout(() => this.clearSelection(), SHAKE_DURATION);
      }
    } else {
      this.clearSelection();
    }
  }

  render(time: number): void {
    const delta = this.lastTime ? Math.min(time - this.lastTime, 50) : 16;
    this.lastTime = time;

    const rect = this.canvas.getBoundingClientRect();
    const w = rect.width;
    const h = rect.height;

    this.updateAnimations(delta);
    this.drawBackground(w, h, time);
    this.drawBoard(time);
  }

  private updateAnimations(delta: number): void {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const cell = this.cells[r][c];
        if (cell.bounceProgress > 0 && cell.bounceProgress < 1) {
          cell.bounceProgress = Math.min(1, cell.bounceProgress + delta / BOUNCE_DURATION);
        }
        if (cell.shakeProgress > 0 && cell.shakeProgress < 1) {
          cell.shakeProgress = Math.min(1, cell.shakeProgress + delta / SHAKE_DURATION);
        }
      }
    }
  }

  private easeOutBack(t: number): number {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  }

  private drawBackground(w: number, h: number, time: number): void {
    const ctx = this.ctx;
    const grad = ctx.createLinearGradient(0, 0, 0, h);
    grad.addColorStop(0, '#0a0e27');
    grad.addColorStop(1, '#1a1f4a');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    for (const star of this.stars) {
      const twinkle = 0.5 + 0.5 * Math.sin(time * 0.001 * star.twinkleSpeed + star.phase);
      ctx.globalAlpha = star.alpha * twinkle;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  private drawBoard(time: number): void {
    const ctx = this.ctx;
    this.drawPath();

    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        this.drawCell(r, c, time);
      }
    }
  }

  private drawPath(): void {
    if (this.selectedPath.length < 2) return;
    const ctx = this.ctx;
    ctx.lineWidth = Math.max(3, this.cellSize * 0.08);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(79, 195, 247, 0.75)';
    ctx.beginPath();
    for (let i = 0; i < this.selectedPath.length; i++) {
      const p = this.selectedPath[i];
      const center = this.getCellCenter(p.row, p.col);
      if (i === 0) ctx.moveTo(center.x, center.y);
      else ctx.lineTo(center.x, center.y);
    }
    ctx.stroke();
  }

  private getCellCenter(row: number, col: number): { x: number; y: number } {
    const bx = this.boardX + CELL_GAP + col * (this.cellSize + CELL_GAP) + this.cellSize / 2;
    const by = this.boardY + CELL_GAP + row * (this.cellSize + CELL_GAP) + this.cellSize / 2;
    return { x: bx, y: by };
  }

  private drawCell(row: number, col: number, time: number): void {
    const ctx = this.ctx;
    const cell = this.cells[row][col];
    const bx = this.boardX + CELL_GAP + col * (this.cellSize + CELL_GAP);
    const by = this.boardY + CELL_GAP + row * (this.cellSize + CELL_GAP);
    const size = this.cellSize;

    let offsetX = 0;
    let scale = 1;

    if (cell.bounceProgress > 0 && cell.bounceProgress <= 1) {
      scale = 1 + this.easeOutBack(cell.bounceProgress) * 0.15;
    }
    if (cell.shakeProgress > 0 && cell.shakeProgress < 1) {
      offsetX = Math.sin(cell.shakeProgress * Math.PI * 8) * 6 * (1 - cell.shakeProgress);
    }

    const cx = bx + size / 2 + offsetX;
    const cy = by + size / 2;
    const drawSize = size * scale;
    const radius = drawSize * 0.2;

    ctx.save();
    ctx.translate(cx, cy);

    const glowColor = cell.selected
      ? `rgba(79, 195, 247, ${0.5 + 0.3 * Math.sin(time * 0.004)})`
      : cell.shakeProgress > 0 && cell.shakeProgress < 1
        ? `rgba(239, 83, 80, ${0.6 * (1 - cell.shakeProgress)})`
        : this.hoveredCell?.row === row && this.hoveredCell?.col === col
          ? 'rgba(79, 195, 247, 0.3)'
          : 'rgba(100, 140, 220, 0.2)';

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = cell.selected ? 25 : 12;

    const bgGrad = ctx.createLinearGradient(-drawSize / 2, -drawSize / 2, drawSize / 2, drawSize / 2);
    if (cell.selected) {
      bgGrad.addColorStop(0, 'rgba(79, 195, 247, 0.45)');
      bgGrad.addColorStop(1, 'rgba(55, 100, 200, 0.45)');
    } else if (cell.shakeProgress > 0 && cell.shakeProgress < 1) {
      bgGrad.addColorStop(0, 'rgba(239, 83, 80, 0.5)');
      bgGrad.addColorStop(1, 'rgba(180, 50, 50, 0.5)');
    } else {
      bgGrad.addColorStop(0, 'rgba(40, 55, 110, 0.85)');
      bgGrad.addColorStop(1, 'rgba(25, 35, 80, 0.85)');
    }
    ctx.fillStyle = bgGrad;
    this.roundRect(ctx, -drawSize / 2, -drawSize / 2, drawSize, drawSize, radius);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = cell.selected ? 'rgba(140, 220, 255, 0.7)' : 'rgba(90, 120, 200, 0.35)';
    ctx.lineWidth = 1.5;
    this.roundRect(ctx, -drawSize / 2, -drawSize / 2, drawSize, drawSize, radius);
    ctx.stroke();

    ctx.fillStyle = cell.selected ? '#ffffff' : '#cfd8ff';
    ctx.font = `bold ${Math.floor(drawSize * 0.52)}px 'Orbitron', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = cell.selected ? 'rgba(79, 195, 247, 0.8)' : 'rgba(0,0,0,0.3)';
    ctx.shadowBlur = cell.selected ? 10 : 4;
    ctx.fillText(cell.letter, 0, 2);

    if (cell.selected && cell.selectOrder >= 0) {
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255, 215, 0, 0.95)';
      ctx.font = `bold ${Math.floor(drawSize * 0.2)}px 'Nunito', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(cell.selectOrder + 1), drawSize * 0.32, -drawSize * 0.32);
    }

    ctx.restore();
  }

  private roundRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number): void {
    ctx.beginPath();
    ctx.moveTo(x + r, y);
    ctx.lineTo(x + w - r, y);
    ctx.quadraticCurveTo(x + w, y, x + w, y + r);
    ctx.lineTo(x + w, y + h - r);
    ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
    ctx.lineTo(x + r, y + h);
    ctx.quadraticCurveTo(x, y + h, x, y + h - r);
    ctx.lineTo(x, y + r);
    ctx.quadraticCurveTo(x, y, x + r, y);
    ctx.closePath();
  }

  getCurrentWord(): string {
    return this.selectedPath.map((p) => this.cells[p.row][p.col].letter).join('');
  }

  getBoardBounds(): { x: number; y: number; width: number; height: number } {
    const total = this.cellSize * GRID_SIZE + CELL_GAP * (GRID_SIZE + 1);
    return { x: this.boardX, y: this.boardY, width: total, height: total };
  }
}
