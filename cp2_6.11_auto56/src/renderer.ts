import {
  Game,
  GameState,
  Cell,
  TerrainHeight,
  Player,
  PieceAnimation,
  RippleEffect
} from './game';

interface TerrainColors {
  low: string;
  medium: string;
  high: string;
}

interface PlayerColors {
  inner: string;
  outer: string;
}

const TERRAIN_COLORS: TerrainColors = {
  low: '#A4D1E1',
  medium: '#C9A96E',
  high: '#8B5E3C'
};

const PLAYER_COLORS: Record<Player, PlayerColors> = {
  [Player.NONE]: { inner: '#000000', outer: '#000000' },
  [Player.PLAYER1]: { inner: '#4FC3F7', outer: '#1E88E5' },
  [Player.PLAYER2]: { inner: '#FFD54F', outer: '#F9A825' }
};

const BOARD_BORDER_COLOR = '#3A7CA5';
const BOARD_BORDER_WIDTH = 1.5;
const PIECE_DIAMETER = 28;
const PIECE_GLOW_BLUR = 6;

const MIN_CELL_SIZE = 50;
const MAX_CELL_SIZE = 80;

export class Renderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private game: Game;
  private cellSize: number = 80;
  private boardPixelSize: number = 0;
  private currentLayout: 'horizontal' | 'vertical' = 'horizontal';
  private offscreenCanvas: OffscreenCanvas;
  private offscreenCtx: OffscreenCanvasRenderingContext2D;
  private hoveredCell: { x: number; y: number } | null = null;
  private maskCanvasCache: HTMLCanvasElement | null = null;
  private frameCount: number = 0;
  private lastFpsUpdate: number = 0;

  constructor(canvas: HTMLCanvasElement, game: Game) {
    this.canvas = canvas;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) throw new Error('Failed to get canvas context');
    this.ctx = ctx;
    this.game = game;

    this.offscreenCanvas = new OffscreenCanvas(1, 1);
    const offCtx = this.offscreenCanvas.getContext('2d', { alpha: false });
    if (!offCtx) throw new Error('Failed to get offscreen context');
    this.offscreenCtx = offCtx;

    this.updateCellSize();
    this.resize();
    window.addEventListener('resize', this.handleResize.bind(this));
  }

  private handleResize(): void {
    this.updateCellSize();
    this.resize();
  }

  private calculateResponsiveCellSize(): { cellSize: number; layout: 'horizontal' | 'vertical' } {
    const screenWidth = window.innerWidth;
    const infoPanelWidth = 240;
    const gap = 24;
    const boardSize = this.game.getBoardSize();

    if (screenWidth >= 768) {
      const availableWidth = screenWidth - infoPanelWidth - gap * 3 - 48;
      const cellSizeByWidth = Math.floor(availableWidth / boardSize);

      const availableHeight = window.innerHeight - 48;
      const cellSizeByHeight = Math.floor(availableHeight / boardSize);

      let cellSize = Math.min(cellSizeByWidth, cellSizeByHeight, MAX_CELL_SIZE);
      cellSize = Math.max(cellSize, MIN_CELL_SIZE);

      cellSize = Math.round(cellSize / 5) * 5;

      return { cellSize, layout: 'horizontal' };
    } else {
      const availableWidth = Math.min(screenWidth - 32, 360);
      const cellSize = Math.floor(availableWidth / boardSize);
      const clampedSize = Math.max(Math.min(cellSize, 60), MIN_CELL_SIZE);
      return { cellSize: clampedSize, layout: 'vertical' };
    }
  }

  private updateCellSize(): void {
    const { cellSize, layout } = this.calculateResponsiveCellSize();
    this.cellSize = cellSize;
    this.currentLayout = layout;
    this.updateInfoPanelLayout();
  }

  private updateInfoPanelLayout(): void {
    const container = document.querySelector('.game-container') as HTMLElement;
    if (!container) return;

    if (this.currentLayout === 'horizontal') {
      container.style.flexDirection = 'row';
      container.style.alignItems = 'flex-start';
    } else {
      container.style.flexDirection = 'column';
      container.style.alignItems = 'center';
    }
  }

  private resize(): void {
    const boardSize = this.game.getBoardSize();
    this.boardPixelSize = boardSize * this.cellSize;

    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = this.boardPixelSize * dpr;
    this.canvas.height = this.boardPixelSize * dpr;
    this.canvas.style.width = `${this.boardPixelSize}px`;
    this.canvas.style.height = `${this.boardPixelSize}px`;
    this.ctx.scale(dpr, dpr);

    this.offscreenCanvas.width = this.boardPixelSize;
    this.offscreenCanvas.height = this.boardPixelSize;

    this.prerenderBoard();
  }

  private prerenderBoard(): void {
    const ctx = this.offscreenCtx;
    const boardSize = this.game.getBoardSize();

    ctx.clearRect(0, 0, this.boardPixelSize, this.boardPixelSize);

    for (let y = 0; y < boardSize; y++) {
      for (let x = 0; x < boardSize; x++) {
        const px = x * this.cellSize;
        const py = y * this.cellSize;

        ctx.fillStyle = TERRAIN_COLORS.medium;
        ctx.fillRect(px, py, this.cellSize, this.cellSize);

        ctx.strokeStyle = BOARD_BORDER_COLOR;
        ctx.lineWidth = BOARD_BORDER_WIDTH;
        ctx.shadowColor = BOARD_BORDER_COLOR;
        ctx.shadowBlur = 4;
        ctx.strokeRect(
          px + BOARD_BORDER_WIDTH / 2,
          py + BOARD_BORDER_WIDTH / 2,
          this.cellSize - BOARD_BORDER_WIDTH,
          this.cellSize - BOARD_BORDER_WIDTH
        );
        ctx.shadowBlur = 0;
      }
    }
  }

  setHoveredCell(cell: { x: number; y: number } | null): void {
    this.hoveredCell = cell;
  }

  screenToBoard(clientX: number, clientY: number): { x: number; y: number } | null {
    const rect = this.canvas.getBoundingClientRect();
    const x = Math.floor((clientX - rect.left) / this.cellSize);
    const y = Math.floor((clientY - rect.top) / this.cellSize);

    const boardSize = this.game.getBoardSize();
    if (x < 0 || x >= boardSize || y < 0 || y >= boardSize) return null;
    return { x, y };
  }

  render(): void {
    const state = this.game.getState();
    this.frameCount++;

    this.ctx.clearRect(0, 0, this.boardPixelSize, this.boardPixelSize);
    this.ctx.drawImage(this.offscreenCanvas, 0, 0);

    this.renderTerrain(state.board);
    this.renderGridLines(state.board);
    this.renderHoverEffect(state);
    this.renderRipples(state.ripples);
    this.renderPieces(state);
    this.renderAnimations(state.animations);
  }

  private renderTerrain(board: Cell[][]): void {
    const ctx = this.ctx;

    for (let y = 0; y < board.length; y++) {
      for (let x = 0; x < board[y].length; x++) {
        const cell = board[y][x];
        const px = x * this.cellSize;
        const py = y * this.cellSize;

        if (cell.terrainAnimDelay === 0 && cell.terrainAnimProgress < 1) {
          this.renderDissolveTerrain(cell, px, py);
        } else {
          const color = this.getTerrainColor(cell.terrain);
          ctx.fillStyle = color;
          ctx.fillRect(px + 1, py + 1, this.cellSize - 2, this.cellSize - 2);
        }
      }
    }
  }

  private renderGridLines(board: Cell[][]): void {
    const ctx = this.ctx;

    ctx.strokeStyle = BOARD_BORDER_COLOR;
    ctx.lineWidth = BOARD_BORDER_WIDTH;
    ctx.shadowColor = BOARD_BORDER_COLOR;
    ctx.shadowBlur = 4;

    for (let y = 0; y <= board.length; y++) {
      ctx.beginPath();
      ctx.moveTo(0, y * this.cellSize);
      ctx.lineTo(this.boardPixelSize, y * this.cellSize);
      ctx.stroke();
    }
    for (let x = 0; x <= board[0].length; x++) {
      ctx.beginPath();
      ctx.moveTo(x * this.cellSize, 0);
      ctx.lineTo(x * this.cellSize, this.boardPixelSize);
      ctx.stroke();
    }
    ctx.shadowBlur = 0;
  }

  private getMaskCanvas(size: number): HTMLCanvasElement {
    if (!this.maskCanvasCache ||
        this.maskCanvasCache.width !== size ||
        this.maskCanvasCache.height !== size) {
      this.maskCanvasCache = document.createElement('canvas');
      this.maskCanvasCache.width = size;
      this.maskCanvasCache.height = size;
    }
    return this.maskCanvasCache;
  }

  private renderDissolveTerrain(cell: Cell, px: number, py: number): void {
    const ctx = this.ctx;
    const progress = cell.terrainAnimProgress;

    const fromColor = this.getTerrainColor(cell.prevTerrain);
    const toColor = this.getTerrainColor(cell.terrain);

    const size = this.cellSize - 2;

    ctx.save();
    ctx.beginPath();
    ctx.rect(px + 1, py + 1, size, size);
    ctx.clip();

    ctx.fillStyle = fromColor;
    ctx.fillRect(px + 1, py + 1, size, size);

    const maskCanvas = this.getMaskCanvas(size);
    const maskCtx = maskCanvas.getContext('2d');
    if (!maskCtx) {
      ctx.restore();
      return;
    }

    maskCtx.clearRect(0, 0, size, size);

    const gradient = maskCtx.createLinearGradient(0, 0, size, size);
    const threshold = progress * 1.2 - 0.1;
    gradient.addColorStop(Math.max(0, threshold - 0.3), 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(Math.max(0, threshold - 0.1), 'rgba(0, 0, 0, 0.5)');
    gradient.addColorStop(Math.min(1, threshold + 0.1), 'rgba(0, 0, 0, 1)');
    gradient.addColorStop(Math.min(1, threshold + 0.3), 'rgba(0, 0, 0, 1)');

    maskCtx.fillStyle = gradient;
    maskCtx.fillRect(0, 0, size, size);

    const seed = cell.x * 100 + cell.y;
    for (let i = 0; i < 40; i++) {
      const pseudoRandom = ((seed * 9301 + i * 49297) % 233280) / 233280;
      const pseudoRandom2 = ((seed * 7919 + i * 6271) % 233280) / 233280;
      const rx = pseudoRandom * size;
      const ry = pseudoRandom2 * size;
      const rSize = 3 + pseudoRandom * 8;
      const noiseProgress = (progress * 1.5) - (ry / size) * 0.5;
      if (noiseProgress > pseudoRandom2) {
        maskCtx.fillStyle = `rgba(0, 0, 0, ${0.3 + pseudoRandom * 0.7})`;
        maskCtx.beginPath();
        maskCtx.arc(rx, ry, rSize, 0, Math.PI * 2);
        maskCtx.fill();
      }
    }

    ctx.globalCompositeOperation = 'source-over';
    ctx.drawImage(maskCanvas, px + 1, py + 1);
    ctx.globalCompositeOperation = 'source-in';
    ctx.fillStyle = toColor;
    ctx.fillRect(px + 1, py + 1, size, size);

    ctx.restore();
    ctx.globalAlpha = 1;
    ctx.globalCompositeOperation = 'source-over';
  }

  private getTerrainColor(terrain: TerrainHeight): string {
    switch (terrain) {
      case TerrainHeight.LOW: return TERRAIN_COLORS.low;
      case TerrainHeight.MEDIUM: return TERRAIN_COLORS.medium;
      case TerrainHeight.HIGH: return TERRAIN_COLORS.high;
    }
  }

  private renderHoverEffect(state: GameState): void {
    if (!this.hoveredCell) return;

    const cell = this.game.getCellAt(this.hoveredCell.x, this.hoveredCell.y);
    if (!cell || cell.piece !== Player.NONE) return;
    if (!state.isStarted || state.isGameOver || state.isAnimating) return;

    const ctx = this.ctx;
    const px = this.hoveredCell.x * this.cellSize;
    const py = this.hoveredCell.y * this.cellSize;
    const colors = PLAYER_COLORS[state.currentPlayer];

    ctx.save();
    ctx.globalAlpha = 0.3;

    const gradient = ctx.createRadialGradient(
      px + this.cellSize / 2, py + this.cellSize / 2, 0,
      px + this.cellSize / 2, py + this.cellSize / 2, PIECE_DIAMETER / 2
    );
    gradient.addColorStop(0, colors.inner);
    gradient.addColorStop(1, colors.outer);

    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(
      px + this.cellSize / 2,
      py + this.cellSize / 2,
      PIECE_DIAMETER / 2,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.restore();
  }

  private renderRipples(ripples: RippleEffect[]): void {
    const ctx = this.ctx;

    for (const ripple of ripples) {
      const cx = (ripple.x + 0.5) * this.cellSize;
      const cy = (ripple.y + 0.5) * this.cellSize;
      const progress = ripple.progress;
      const maxRadius = ripple.maxRadius * this.cellSize * 1.5;
      const currentRadius = progress * maxRadius;

      const alpha = (1 - progress) * 0.25;

      ctx.save();
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(cx, cy, currentRadius, 0, Math.PI * 2);
      ctx.stroke();

      if (progress < 0.7) {
        const innerAlpha = (1 - progress / 0.7) * 0.15;
        ctx.fillStyle = `rgba(255, 255, 255, ${innerAlpha})`;
        ctx.beginPath();
        ctx.arc(cx, cy, currentRadius * 0.7, 0, Math.PI * 2);
        ctx.fill();
      }

      ctx.restore();
    }
  }

  private renderPieces(state: GameState): void {
    const ctx = this.ctx;
    const animatingCells = new Set<string>();

    for (const anim of state.animations) {
      if (anim.type === 'drop' || anim.type === 'knockback' || anim.type === 'eliminate') {
        animatingCells.add(`${anim.x},${anim.y}`);
      }
    }

    for (let y = 0; y < state.board.length; y++) {
      for (let x = 0; x < state.board[y].length; x++) {
        const cell = state.board[y][x];
        if (cell.piece === Player.NONE) continue;
        if (animatingCells.has(`${x},${y}`)) continue;

        this.drawPiece(ctx, x, y, cell.piece, 1);
      }
    }
  }

  private renderAnimations(animations: PieceAnimation[]): void {
    const ctx = this.ctx;

    for (const anim of animations) {
      if (anim.type === 'drop') {
        this.renderDropAnimation(ctx, anim);
      } else if (anim.type === 'knockback') {
        this.renderKnockbackAnimation(ctx, anim);
      } else if (anim.type === 'eliminate') {
        this.renderEliminateAnimation(ctx, anim);
      }
    }
  }

  private renderDropAnimation(ctx: CanvasRenderingContext2D, anim: PieceAnimation): void {
    const progress = anim.progress;
    const easeProgress = 1 - Math.pow(1 - progress, 3);

    const currentY = anim.startY + (anim.endY - anim.startY) * easeProgress;
    const alpha = Math.min(1, progress * 2);

    const scale = 0.8 + easeProgress * 0.2;

    const cell = this.game.getCellAt(anim.endX, anim.endY);
    if (cell && cell.piece === anim.player) {
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(
        (anim.endX + 0.5) * this.cellSize,
        (currentY + 0.5) * this.cellSize
      );
      ctx.scale(scale, scale);
      this.drawPieceAtPixel(ctx, 0, 0, anim.player, alpha);
      ctx.restore();
    }
  }

  private renderKnockbackAnimation(ctx: CanvasRenderingContext2D, anim: PieceAnimation): void {
    const progress = anim.progress;
    const easeProgress = 1 - Math.pow(1 - progress, 2);

    const currentX = anim.startX + (anim.endX - anim.startX) * easeProgress;
    const currentY = anim.startY + (anim.endY - anim.startY) * easeProgress;

    const targetCell = this.game.getCellAt(anim.endX, anim.endY);
    const isEliminated = !targetCell || targetCell.piece !== anim.player;

    const alpha = isEliminated && progress > 0.7
      ? 1 - (progress - 0.7) / 0.3
      : 1;

    ctx.save();
    ctx.globalAlpha = alpha;

    this.drawPieceAtPixel(
      ctx,
      (currentX + 0.5) * this.cellSize,
      (currentY + 0.5) * this.cellSize,
      anim.player,
      1
    );

    ctx.restore();
  }

  private renderEliminateAnimation(ctx: CanvasRenderingContext2D, anim: PieceAnimation): void {
    const progress = anim.progress;
    const easeProgress = progress;

    const currentX = anim.startX + (anim.endX - anim.startX) * easeProgress;
    const currentY = anim.startY + (anim.endY - anim.startY) * easeProgress;

    const alpha = 1 - progress;

    ctx.save();
    ctx.globalAlpha = alpha;

    const scale = 1 + progress * 0.3;
    const rotation = progress * Math.PI * 0.5;

    ctx.translate(
      (currentX + 0.5) * this.cellSize,
      (currentY + 0.5) * this.cellSize
    );
    ctx.rotate(rotation);
    ctx.scale(scale, scale);

    const colors = PLAYER_COLORS[anim.player];
    ctx.strokeStyle = colors.inner;
    ctx.lineWidth = 2;
    ctx.globalAlpha = alpha * 0.5;

    for (let i = 0; i < 4; i++) {
      const angle = (i / 4) * Math.PI * 2 + rotation;
      const dist = progress * this.cellSize * 0.8;
      ctx.beginPath();
      ctx.moveTo(Math.cos(angle) * dist * 0.5, Math.sin(angle) * dist * 0.5);
      ctx.lineTo(Math.cos(angle) * dist, Math.sin(angle) * dist);
      ctx.stroke();
    }

    ctx.globalAlpha = alpha;
    this.drawPieceAtPixel(ctx, 0, 0, anim.player, 1);

    if (progress > 0.3) {
      ctx.globalAlpha = (1 - progress) * 1.5;
      const particleCount = 8;
      for (let i = 0; i < particleCount; i++) {
        const angle = (i / particleCount) * Math.PI * 2;
        const dist = (progress - 0.3) * this.cellSize * 2;
        const px = Math.cos(angle) * dist;
        const py = Math.sin(angle) * dist;

        ctx.fillStyle = colors.inner;
        ctx.beginPath();
        ctx.arc(px, py, 4 * (1 - progress), 0, Math.PI * 2);
        ctx.fill();
      }

      const flashAlpha = (1 - progress) * 0.5;
      ctx.fillStyle = `rgba(255, 255, 255, ${flashAlpha})`;
      ctx.beginPath();
      ctx.arc(0, 0, PIECE_DIAMETER * (0.5 + progress), 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  private drawPiece(
    ctx: CanvasRenderingContext2D,
    cellX: number,
    cellY: number,
    player: Player,
    alpha: number
  ): void {
    const px = (cellX + 0.5) * this.cellSize;
    const py = (cellY + 0.5) * this.cellSize;
    this.drawPieceAtPixel(ctx, px, py, player, alpha);
  }

  private drawPieceAtPixel(
    ctx: CanvasRenderingContext2D,
    px: number,
    py: number,
    player: Player,
    alpha: number
  ): void {
    if (player === Player.NONE) return;

    const colors = PLAYER_COLORS[player];
    const radius = PIECE_DIAMETER / 2;
    const scale = Math.min(1, this.cellSize / 80);
    const scaledRadius = radius * scale;

    ctx.save();

    ctx.shadowColor = colors.inner;
    ctx.shadowBlur = PIECE_GLOW_BLUR * scale;

    const gradient = ctx.createRadialGradient(px, py, 0, px, py, scaledRadius);
    gradient.addColorStop(0, colors.inner);
    gradient.addColorStop(0.7, colors.outer);
    gradient.addColorStop(1, colors.outer);

    ctx.fillStyle = gradient;
    ctx.globalAlpha = alpha;
    ctx.beginPath();
    ctx.arc(px, py, scaledRadius, 0, Math.PI * 2);
    ctx.fill();

    ctx.shadowBlur = 0;
    ctx.globalAlpha = alpha * 0.6;
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath();
    ctx.arc(
      px - scaledRadius * 0.3,
      py - scaledRadius * 0.3,
      scaledRadius * 0.25,
      0,
      Math.PI * 2
    );
    ctx.fill();

    ctx.restore();
  }

  getCellSize(): number {
    return this.cellSize;
  }

  getLayout(): 'horizontal' | 'vertical' {
    return this.currentLayout;
  }

  updateFpsDisplay(currentTime: number): void {
    if (currentTime - this.lastFpsUpdate >= 1000) {
      this.lastFpsUpdate = currentTime;
      this.frameCount = 0;
    }
  }
}
