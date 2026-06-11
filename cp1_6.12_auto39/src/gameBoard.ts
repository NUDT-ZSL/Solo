const GRID_SIZE = 5;
const CELL_GAP = 10;
const BOUNCE_DURATION = 200;
const SHAKE_DURATION = 320;

interface CellState {
  letter: string;
  selected: boolean;
  selectOrder: number;
  bounceProgress: number;
  shakeProgress: number;
  glowPulse: number;
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
  private activePointerId: number | null = null;
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
  private interactive = true;

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

  setInteractive(enabled: boolean): void {
    this.interactive = enabled;
    if (!enabled) {
      this.isDragging = false;
      this.activePointerId = null;
      this.clearSelection();
    }
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
          shakeProgress: 0,
          glowPulse: Math.random()
        });
      }
      this.cells.push(row);
    }
    this.selectedPath = [];
    this.isDragging = false;
    this.activePointerId = null;
  }

  updateSize(): void {
    this.dpr = window.devicePixelRatio || 1;
    const rect = this.canvas.getBoundingClientRect();
    this.canvas.width = Math.floor(rect.width * this.dpr);
    this.canvas.height = Math.floor(rect.height * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);

    const isMobile = rect.width < 768;
    const maxBoardWidth = isMobile ? rect.width - 32 : Math.min(rect.width * 0.48, 540);
    const maxBoardHeight = isMobile ? rect.height * 0.44 : rect.height - 180;
    const boardSize = Math.min(maxBoardWidth, maxBoardHeight);
    this.cellSize = (boardSize - CELL_GAP * (GRID_SIZE + 1)) / GRID_SIZE;

    const totalBoardSize = this.cellSize * GRID_SIZE + CELL_GAP * (GRID_SIZE + 1);
    this.boardX = Math.floor((rect.width - totalBoardSize) / 2);
    this.boardY = isMobile
      ? Math.floor(rect.height * 0.28 + (rect.height * 0.42 - totalBoardSize) / 2)
      : Math.floor((rect.height - totalBoardSize) / 2 + 20);

    if (!this.starsInitialized) {
      this.initStars(rect.width, rect.height);
      this.starsInitialized = true;
    }
  }

  private initStars(w: number, h: number): void {
    this.stars = [];
    const count = Math.floor((w * h) / 5000);
    for (let i = 0; i < count; i++) {
      this.stars.push({
        x: Math.random() * w,
        y: Math.random() * h,
        size: Math.random() * 2 + 0.3,
        alpha: Math.random() * 0.7 + 0.2,
        twinkleSpeed: Math.random() * 2 + 0.5,
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
    const getPos = (e: PointerEvent): { x: number; y: number } => {
      const rect = this.canvas.getBoundingClientRect();
      return { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };

    const handleStart = (e: PointerEvent): void => {
      if (!this.interactive || this.isDragging) return;
      const p = getPos(e);
      const cell = this.getCellAt(p.x, p.y);
      if (cell) {
        e.preventDefault();
        this.isDragging = true;
        this.activePointerId = e.pointerId;
        try { this.canvas.setPointerCapture(e.pointerId); } catch { /* noop - synthetic events may fail */ }
        this.selectCell(cell.row, cell.col);
      }
    };

    const handleMove = (e: PointerEvent): void => {
      const p = getPos(e);
      this.hoveredCell = this.getCellAt(p.x, p.y);

      if (this.isDragging && e.pointerId === this.activePointerId) {
        const cell = this.getCellAt(p.x, p.y);
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

    const handleEnd = (e: PointerEvent): void => {
      if (this.isDragging && e.pointerId === this.activePointerId) {
        this.isDragging = false;
        this.activePointerId = null;
        try { this.canvas.releasePointerCapture(e.pointerId); } catch { /* noop */ }
        this.submitWord();
      }
    };

    this.canvas.addEventListener('pointerdown', handleStart);
    this.canvas.addEventListener('pointermove', handleMove);
    this.canvas.addEventListener('pointerup', handleEnd);
    this.canvas.addEventListener('pointercancel', handleEnd);
    this.canvas.addEventListener('pointerleave', handleEnd);

    this.canvas.style.touchAction = 'none';
  }

  private getCellAt(x: number, y: number): { row: number; col: number } | null {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        const bx = this.boardX + CELL_GAP + c * (this.cellSize + CELL_GAP);
        const by = this.boardY + CELL_GAP + r * (this.cellSize + CELL_GAP);
        const pad = this.cellSize * 0.1;
        if (x >= bx - pad && x <= bx + this.cellSize + pad &&
            y >= by - pad && y <= by + this.cellSize + pad) {
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
    this.drawBoardGlow();
    this.drawPath();
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
        cell.glowPulse = (cell.glowPulse + delta * 0.0008) % 1;
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
    const grad = ctx.createRadialGradient(w * 0.3, h * 0.2, 50, w * 0.5, h * 0.5, Math.max(w, h) * 0.8);
    grad.addColorStop(0, '#1a245a');
    grad.addColorStop(0.5, '#0f1540');
    grad.addColorStop(1, '#060820');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, w, h);

    const nebulaGrad = ctx.createRadialGradient(w * 0.7, h * 0.3, 0, w * 0.7, h * 0.3, w * 0.5);
    nebulaGrad.addColorStop(0, 'rgba(100, 80, 200, 0.15)');
    nebulaGrad.addColorStop(0.5, 'rgba(60, 100, 180, 0.05)');
    nebulaGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = nebulaGrad;
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

  private drawBoardGlow(): void {
    const ctx = this.ctx;
    const totalSize = this.cellSize * GRID_SIZE + CELL_GAP * (GRID_SIZE + 1);
    const cx = this.boardX + totalSize / 2;
    const cy = this.boardY + totalSize / 2;
    const radius = totalSize * 0.7;

    const glowGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
    glowGrad.addColorStop(0, 'rgba(79, 195, 247, 0.08)');
    glowGrad.addColorStop(0.6, 'rgba(79, 120, 247, 0.04)');
    glowGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = glowGrad;
    ctx.fillRect(this.boardX - radius, this.boardY - radius, totalSize + radius * 2, totalSize + radius * 2);
  }

  private drawBoard(time: number): void {
    for (let r = 0; r < GRID_SIZE; r++) {
      for (let c = 0; c < GRID_SIZE; c++) {
        this.drawCell(r, c, time);
      }
    }
  }

  private drawPath(): void {
    if (this.selectedPath.length < 2) return;
    const ctx = this.ctx;

    ctx.save();
    ctx.lineWidth = Math.max(4, this.cellSize * 0.1);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';

    ctx.strokeStyle = 'rgba(79, 195, 247, 0.35)';
    ctx.lineWidth = Math.max(8, this.cellSize * 0.18);
    ctx.beginPath();
    for (let i = 0; i < this.selectedPath.length; i++) {
      const p = this.selectedPath[i];
      const center = this.getCellCenter(p.row, p.col);
      if (i === 0) ctx.moveTo(center.x, center.y);
      else ctx.lineTo(center.x, center.y);
    }
    ctx.stroke();

    ctx.strokeStyle = 'rgba(79, 195, 247, 0.9)';
    ctx.lineWidth = Math.max(3, this.cellSize * 0.07);
    ctx.beginPath();
    for (let i = 0; i < this.selectedPath.length; i++) {
      const p = this.selectedPath[i];
      const center = this.getCellCenter(p.row, p.col);
      if (i === 0) ctx.moveTo(center.x, center.y);
      else ctx.lineTo(center.x, center.y);
    }
    ctx.stroke();
    ctx.restore();
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
    let offsetY = 0;
    let scale = 1;

    if (cell.bounceProgress > 0 && cell.bounceProgress <= 1) {
      scale = 1 + this.easeOutBack(cell.bounceProgress) * 0.2;
    }
    if (cell.shakeProgress > 0 && cell.shakeProgress < 1) {
      const shakeIntensity = 8;
      offsetX = Math.sin(cell.shakeProgress * Math.PI * 10) * shakeIntensity * (1 - cell.shakeProgress);
      offsetY = Math.sin(cell.shakeProgress * Math.PI * 13 + 1) * 3 * (1 - cell.shakeProgress);
    }

    const cx = bx + size / 2 + offsetX;
    const cy = by + size / 2 + offsetY;
    const drawSize = size * scale;
    const radius = drawSize * 0.22;

    ctx.save();
    ctx.translate(cx, cy);

    const isHovered = this.hoveredCell?.row === row && this.hoveredCell?.col === col;
    const pulse = 0.5 + 0.5 * Math.sin(time * 0.003 + cell.glowPulse * Math.PI * 2);

    let glowAlpha: number;
    let glowColor: string;

    if (cell.selected) {
      glowAlpha = 0.6 + 0.3 * pulse;
      glowColor = `rgba(79, 195, 247, ${glowAlpha})`;
    } else if (cell.shakeProgress > 0 && cell.shakeProgress < 1) {
      glowAlpha = 0.7 * (1 - cell.shakeProgress);
      glowColor = `rgba(239, 83, 80, ${glowAlpha})`;
    } else if (isHovered) {
      glowAlpha = 0.45;
      glowColor = `rgba(100, 180, 255, ${glowAlpha})`;
    } else {
      glowAlpha = 0.18 + 0.08 * pulse;
      glowColor = `rgba(100, 140, 220, ${glowAlpha})`;
    }

    ctx.shadowColor = glowColor;
    ctx.shadowBlur = cell.selected ? 28 : isHovered ? 20 : 14;

    const bgGrad = ctx.createLinearGradient(-drawSize / 2, -drawSize / 2, drawSize / 2, drawSize / 2);
    if (cell.selected) {
      bgGrad.addColorStop(0, 'rgba(79, 195, 247, 0.5)');
      bgGrad.addColorStop(0.5, 'rgba(50, 120, 220, 0.45)');
      bgGrad.addColorStop(1, 'rgba(30, 80, 180, 0.5)');
    } else if (cell.shakeProgress > 0 && cell.shakeProgress < 1) {
      bgGrad.addColorStop(0, 'rgba(239, 83, 80, 0.55)');
      bgGrad.addColorStop(1, 'rgba(170, 40, 40, 0.55)');
    } else {
      bgGrad.addColorStop(0, 'rgba(45, 65, 130, 0.9)');
      bgGrad.addColorStop(0.5, 'rgba(30, 45, 100, 0.88)');
      bgGrad.addColorStop(1, 'rgba(20, 30, 75, 0.92)');
    }
    ctx.fillStyle = bgGrad;
    this.roundRect(ctx, -drawSize / 2, -drawSize / 2, drawSize, drawSize, radius);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.strokeStyle = cell.selected
      ? 'rgba(150, 220, 255, 0.75)'
      : isHovered
        ? 'rgba(120, 180, 255, 0.55)'
        : 'rgba(90, 120, 190, 0.35)';
    ctx.lineWidth = cell.selected ? 2 : 1.2;
    this.roundRect(ctx, -drawSize / 2, -drawSize / 2, drawSize, drawSize, radius);
    ctx.stroke();

    const innerGrad = ctx.createLinearGradient(-drawSize / 2 + 4, -drawSize / 2 + 4, drawSize / 2 - 4, drawSize / 2 - 4);
    innerGrad.addColorStop(0, 'rgba(255, 255, 255, 0.06)');
    innerGrad.addColorStop(1, 'rgba(0, 0, 0, 0.08)');
    ctx.fillStyle = innerGrad;
    this.roundRect(ctx, -drawSize / 2 + 3, -drawSize / 2 + 3, drawSize - 6, drawSize - 6, radius - 3);
    ctx.fill();

    ctx.fillStyle = cell.selected ? '#ffffff' : '#d6dfff';
    ctx.font = `900 ${Math.floor(drawSize * 0.5)}px 'Orbitron', sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = cell.selected ? 'rgba(79, 195, 247, 0.9)' : 'rgba(0,0,0,0.4)';
    ctx.shadowBlur = cell.selected ? 14 : 5;
    ctx.fillText(cell.letter, 0, 1);

    if (cell.selected && cell.selectOrder >= 0) {
      ctx.shadowBlur = 0;
      const badgeR = drawSize * 0.16;
      const bx = drawSize * 0.3;
      const by = -drawSize * 0.3;
      ctx.fillStyle = 'rgba(255, 215, 0, 0.95)';
      ctx.beginPath();
      ctx.arc(bx, by, badgeR, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = '#0a0e27';
      ctx.font = `bold ${Math.floor(drawSize * 0.22)}px 'Nunito', sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(String(cell.selectOrder + 1), bx, by + 1);
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

  getCellSize(): number {
    return this.cellSize;
  }
}
