import { Board, CellPosition } from './board.js';

export interface MoveAnimation {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  startTime: number;
  duration: number;
}

export interface TrailBand {
  x: number;
  y: number;
  timestamp: number;
}

export interface GlowEffect {
  x: number;
  y: number;
  startTime: number;
  duration: number;
}

export class Piece {
  id: string;
  playerId: 1 | 2;
  row: number;
  col: number;
  isSelected: boolean;
  moveAnimation: MoveAnimation | null = null;
  trailBands: TrailBand[] = [];
  glowEffects: GlowEffect[] = [];

  constructor(id: string, playerId: 1 | 2, row: number, col: number) {
    this.id = id;
    this.playerId = playerId;
    this.row = row;
    this.col = col;
    this.isSelected = false;
  }

  getColor(): string {
    return this.playerId === 1 ? '#00D4FF' : '#FF6B35';
  }

  getRGB(): string {
    return this.playerId === 1 ? '0, 212, 255' : '255, 107, 53';
  }

  getCurrentPosition(board: Board): { x: number; y: number } {
    if (this.moveAnimation) {
      const now = Date.now();
      const elapsed = now - this.moveAnimation.startTime;
      const progress = Math.min(1, elapsed / this.moveAnimation.duration);
      const eased = this.easeOutCubic(progress);
      
      const from = board.cellToScreen(this.moveAnimation.fromRow, this.moveAnimation.fromCol);
      const to = board.cellToScreen(this.moveAnimation.toRow, this.moveAnimation.toCol);
      
      return {
        x: from.x + (to.x - from.x) * eased,
        y: from.y + (to.y - from.y) * eased,
      };
    }
    return board.cellToScreen(this.row, this.col);
  }

  easeOutCubic(t: number): number {
    return 1 - Math.pow(1 - t, 3);
  }

  select(): void {
    this.isSelected = true;
  }

  deselect(): void {
    this.isSelected = false;
  }

  getReachableCells(board: Board): CellPosition[] {
    const reachable: CellPosition[] = [];
    const directions = [
      { dr: -1, dc: 0 },
      { dr: 1, dc: 0 },
      { dr: 0, dc: -1 },
      { dr: 0, dc: 1 },
      { dr: -1, dc: -1 },
      { dr: -1, dc: 1 },
      { dr: 1, dc: -1 },
      { dr: 1, dc: 1 },
    ];

    for (const dir of directions) {
      for (let step = 1; step <= board.size; step++) {
        const r = this.row + dir.dr * step;
        const c = this.col + dir.dc * step;
        if (r >= 0 && r < board.size && c >= 0 && c < board.size) {
          reachable.push({ row: r, col: c });
        } else {
          break;
        }
      }
    }

    return reachable;
  }

  move(toRow: number, toCol: number): void {
    this.moveAnimation = {
      fromRow: this.row,
      fromCol: this.col,
      toRow,
      toCol,
      startTime: Date.now(),
      duration: 300,
    };
    
    this.glowEffects.push({
      x: toRow,
      y: toCol,
      startTime: Date.now(),
      duration: 300,
    });
    
    setTimeout(() => {
      this.row = toRow;
      this.col = toCol;
      this.moveAnimation = null;
    }, 300);
  }

  addTrailBand(x: number, y: number): void {
    this.trailBands.push({ x, y, timestamp: Date.now() });
  }

  update(board: Board): void {
    const now = Date.now();
    
    if (this.moveAnimation) {
      const pos = this.getCurrentPosition(board);
      this.addTrailBand(pos.x, pos.y);
    }
    
    this.trailBands = this.trailBands.filter(tb => now - tb.timestamp < 2000);
    this.glowEffects = this.glowEffects.filter(ge => now - ge.startTime < ge.duration);
  }

  renderReachableCells(ctx: CanvasRenderingContext2D, board: Board, time: number): void {
    if (!this.isSelected) return;
    
    const reachable = this.getReachableCells(board);
    const pulsePhase = (time % 500) / 500;
    
    for (const cell of reachable) {
      const pos = board.cellToScreen(cell.row, cell.col);
      const radius = board.layout.cellSize * 0.35;
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius * (0.5 + pulsePhase * 0.5), 0, Math.PI * 2);
      ctx.fillStyle = `rgba(0, 255, 136, ${0.25 * (1 - pulsePhase)})`;
      ctx.fill();
      
      ctx.strokeStyle = 'rgba(0, 255, 136, 0.4)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
      ctx.restore();
    }
  }

  renderTrailBands(ctx: CanvasRenderingContext2D, board: Board): void {
    const now = Date.now();
    
    for (let i = 0; i < this.trailBands.length; i++) {
      const tb = this.trailBands[i];
      const age = now - tb.timestamp;
      if (age > 2000) continue;
      
      const alpha = Math.max(0, 0.8 - (age / 2000) * 0.8);
      const size = 8 * board.layout.scale * (1 - age / 2000 * 0.5);
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(tb.x, tb.y, size / 2, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.getRGB()}, ${alpha})`;
      ctx.shadowColor = `rgba(${this.getRGB()}, ${alpha})`;
      ctx.shadowBlur = 12;
      ctx.fill();
      ctx.restore();
      
      if (i > 0) {
        const prevTb = this.trailBands[i - 1];
        const prevAge = now - prevTb.timestamp;
        const prevAlpha = Math.max(0, 0.8 - (prevAge / 2000) * 0.8);
        
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(prevTb.x, prevTb.y);
        ctx.lineTo(tb.x, tb.y);
        ctx.strokeStyle = `rgba(${this.getRGB()}, ${(alpha + prevAlpha) / 2})`;
        ctx.lineWidth = 4 * board.layout.scale;
        ctx.lineCap = 'round';
        ctx.shadowColor = `rgba(${this.getRGB()}, ${(alpha + prevAlpha) / 2})`;
        ctx.shadowBlur = 8;
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  renderGlowEffects(ctx: CanvasRenderingContext2D, board: Board): void {
    const now = Date.now();
    
    for (const ge of this.glowEffects) {
      const elapsed = now - ge.startTime;
      const progress = elapsed / ge.duration;
      if (progress > 1) continue;
      
      const pos = board.cellToScreen(ge.x, ge.y);
      const maxRadius = board.layout.cellSize * 2.5;
      const radius = maxRadius * progress;
      const alpha = 0.6 * (1 - progress);
      
      for (let r = 1; r <= 2; r++) {
        const ringPos = board.cellToScreen(ge.x, ge.y);
        const ringRadius = board.layout.cellSize * r * (1 + progress);
        const ringAlpha = alpha * (1 - r * 0.3);
        
        ctx.save();
        ctx.beginPath();
        ctx.arc(ringPos.x, ringPos.y, ringRadius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(${this.getRGB()}, ${ringAlpha})`;
        ctx.lineWidth = 2;
        ctx.shadowColor = `rgba(${this.getRGB()}, ${ringAlpha})`;
        ctx.shadowBlur = 15;
        ctx.stroke();
        ctx.restore();
      }
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.getRGB()}, ${alpha * 0.3})`;
      ctx.fill();
      ctx.restore();
    }
  }

  render(ctx: CanvasRenderingContext2D, board: Board): void {
    const pos = this.getCurrentPosition(board);
    const baseRadius = 10 * board.layout.scale;
    let radius = baseRadius;
    const time = Date.now();
    
    if (this.isSelected) {
      const pulse = Math.sin(time * 0.0094) * 0.5 + 0.5;
      radius = baseRadius * (1.3 + pulse * 0.15);
      
      ctx.save();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, radius * 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${this.getRGB()}, ${0.15 + pulse * 0.1})`;
      ctx.fill();
      ctx.restore();
    }
    
    this.renderTrailBands(ctx, board);
    this.renderGlowEffects(ctx, board);
    
    ctx.save();
    const gradient = ctx.createRadialGradient(pos.x, pos.y, 0, pos.x, pos.y, radius * 1.5);
    gradient.addColorStop(0, this.getColor());
    gradient.addColorStop(0.6, `rgba(${this.getRGB()}, 0.8)`);
    gradient.addColorStop(1, `rgba(${this.getRGB()}, 0)`);
    
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius * 1.5, 0, Math.PI * 2);
    ctx.fillStyle = gradient;
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(pos.x, pos.y, radius, 0, Math.PI * 2);
    ctx.fillStyle = this.getColor();
    ctx.shadowColor = this.getColor();
    ctx.shadowBlur = 20 * board.layout.scale;
    ctx.fill();
    
    ctx.beginPath();
    ctx.arc(pos.x - radius * 0.3, pos.y - radius * 0.3, radius * 0.3, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
    ctx.fill();
    ctx.restore();
  }
}

export class PieceManager {
  pieces: Piece[] = [];
  selectedPiece: Piece | null = null;

  init(board: Board): void {
    this.pieces = [
      new Piece('p1_1', 1, 0, 0),
      new Piece('p1_2', 1, 0, board.size - 1),
      new Piece('p1_3', 1, board.size - 1, 0),
      new Piece('p1_4', 1, board.size - 1, board.size - 1),
      new Piece('p2_1', 2, 0, Math.floor(board.size / 2)),
      new Piece('p2_2', 2, board.size - 1, Math.floor(board.size / 2)),
      new Piece('p2_3', 2, Math.floor(board.size / 2), 0),
      new Piece('p2_4', 2, Math.floor(board.size / 2), board.size - 1),
    ];
    
    for (const piece of this.pieces) {
      const cell = board.getCell(piece.row, piece.col);
      if (cell) {
        cell.owner = piece.playerId;
      }
    }
  }

  getPieceAt(row: number, col: number): Piece | null {
    return this.pieces.find(p => p.row === row && p.col === col && !p.moveAnimation) || null;
  }

  getPieceById(id: string): Piece | null {
    return this.pieces.find(p => p.id === id) || null;
  }

  getPiecesForPlayer(playerId: 1 | 2): Piece[] {
    return this.pieces.filter(p => p.playerId === playerId);
  }

  selectPiece(piece: Piece | null): void {
    if (this.selectedPiece) {
      this.selectedPiece.deselect();
    }
    this.selectedPiece = piece;
    if (piece) {
      piece.select();
    }
  }

  update(board: Board): void {
    for (const piece of this.pieces) {
      piece.update(board);
    }
  }

  render(ctx: CanvasRenderingContext2D, board: Board): void {
    const time = Date.now();
    
    for (const piece of this.pieces) {
      if (piece !== this.selectedPiece) {
        piece.render(ctx, board);
      }
    }
    
    if (this.selectedPiece) {
      this.selectedPiece.renderReachableCells(ctx, board, time);
      this.selectedPiece.render(ctx, board);
    }
  }
}
