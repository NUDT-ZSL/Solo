export type PieceType = 'pawn' | 'knight' | 'bishop' | 'rook' | 'queen' | 'king';
export type Player = 'player' | 'ai';

export interface Piece {
  type: PieceType;
  owner: Player;
  vitality: number;
  row: number;
  col: number;
  id: string;
}

export interface Move {
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  captured?: Piece;
}

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  color: string;
  size: number;
}

export interface CapturedAnimation {
  piece: Piece;
  startX: number;
  startY: number;
  endX: number;
  endY: number;
  progress: number;
  rotation: number;
}

export interface SelectedInfo {
  piece: Piece;
  time: number;
}

export const PIECE_VALUES: Record<PieceType, number> = {
  pawn: 1,
  knight: 3,
  bishop: 3,
  rook: 5,
  queen: 9,
  king: 100
};

export const PIECE_SYMBOLS: Record<PieceType, string> = {
  pawn: '♟',
  knight: '♞',
  bishop: '♝',
  rook: '♜',
  queen: '♛',
  king: '♚'
};

export class GameEngine {
  board: (Piece | null)[][] = [];
  dragonBreath: boolean[][] = [];
  turn: Player = 'player';
  turnCount: number = 1;
  selected: SelectedInfo | null = null;
  legalMoves: Move[] = [];
  playerCaptured: Piece[] = [];
  aiCaptured: Piece[] = [];
  particles: Particle[] = [];
  capturedAnimations: CapturedAnimation[] = [];
  aiThinking: boolean = false;
  aiThinkStartTime: number = 0;
  gameOver: boolean = false;
  winner: Player | null = null;
  pendingAIMove: Move | null = null;

  private pieceIdCounter = 0;

  constructor() {
    this.initBoard();
    this.initDragonBreath();
  }

  private genId(): string {
    return `p_${this.pieceIdCounter++}`;
  }

  initBoard(): void {
    this.board = Array.from({ length: 8 }, () => Array(8).fill(null));
    const backRow: PieceType[] = ['rook', 'knight', 'bishop', 'queen', 'king', 'bishop', 'knight', 'rook'];

    for (let col = 0; col < 8; col++) {
      this.board[0][col] = {
        type: backRow[col], owner: 'ai', vitality: 5, row: 0, col, id: this.genId()
      };
      this.board[1][col] = {
        type: 'pawn', owner: 'ai', vitality: 5, row: 1, col, id: this.genId()
      };
      this.board[6][col] = {
        type: 'pawn', owner: 'player', vitality: 5, row: 6, col, id: this.genId()
      };
      this.board[7][col] = {
        type: backRow[col], owner: 'player', vitality: 5, row: 7, col, id: this.genId()
      };
    }
  }

  initDragonBreath(): void {
    this.dragonBreath = Array.from({ length: 8 }, () => Array(8).fill(false));
    const maxCells = 32;
    let count = 0;
    while (count < maxCells) {
      for (let r = 2; r <= 5; r++) {
        for (let c = 0; c < 8; c++) {
          if (!this.dragonBreath[r][c] && Math.random() < 0.5) {
            this.dragonBreath[r][c] = true;
            count++;
            if (count >= maxCells) return;
          }
        }
      }
    }
  }

  inBounds(r: number, c: number): boolean {
    return r >= 0 && r < 8 && c >= 0 && c < 8;
  }

  getLegalMoves(piece: Piece): Move[] {
    const moves: Move[] = [];
    const { row, col, type, owner } = piece;

    const addCaptureOrMove = (tr: number, tc: number): boolean => {
      if (!this.inBounds(tr, tc)) return false;
      const target = this.board[tr][tc];
      if (!target) {
        moves.push({ fromRow: row, fromCol: col, toRow: tr, toCol: tc });
        return true;
      } else if (target.owner !== owner) {
        moves.push({ fromRow: row, fromCol: col, toRow: tr, toCol: tc, captured: target });
        return false;
      }
      return false;
    };

    switch (type) {
      case 'pawn': {
        const dir = owner === 'player' ? -1 : 1;
        const startRow = owner === 'player' ? 6 : 1;
        if (this.inBounds(row + dir, col) && !this.board[row + dir][col]) {
          moves.push({ fromRow: row, fromCol: col, toRow: row + dir, toCol: col });
          if (row === startRow && !this.board[row + 2 * dir][col]) {
            moves.push({ fromRow: row, fromCol: col, toRow: row + 2 * dir, toCol: col });
          }
        }
        for (const dc of [-1, 1]) {
          const tr = row + dir, tc = col + dc;
          if (this.inBounds(tr, tc)) {
            const target = this.board[tr][tc];
            if (target && target.owner !== owner) {
              moves.push({ fromRow: row, fromCol: col, toRow: tr, toCol: tc, captured: target });
            }
          }
        }
        break;
      }
      case 'knight': {
        const deltas = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
        for (const [dr, dc] of deltas) {
          addCaptureOrMove(row + dr, col + dc);
        }
        break;
      }
      case 'bishop': {
        for (const [dr, dc] of [[-1, -1], [-1, 1], [1, -1], [1, 1]]) {
          let tr = row + dr, tc = col + dc;
          while (this.inBounds(tr, tc)) {
            if (!addCaptureOrMove(tr, tc)) break;
            tr += dr; tc += dc;
          }
        }
        break;
      }
      case 'rook': {
        for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
          let tr = row + dr, tc = col + dc;
          while (this.inBounds(tr, tc)) {
            if (!addCaptureOrMove(tr, tc)) break;
            tr += dr; tc += dc;
          }
        }
        break;
      }
      case 'queen': {
        for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
          let tr = row + dr, tc = col + dc;
          while (this.inBounds(tr, tc)) {
            if (!addCaptureOrMove(tr, tc)) break;
            tr += dr; tc += dc;
          }
        }
        break;
      }
      case 'king': {
        for (const [dr, dc] of [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]]) {
          addCaptureOrMove(row + dr, col + dc);
        }
        break;
      }
    }

    return moves;
  }

  getAllMoves(player: Player): Move[] {
    const all: Move[] = [];
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.owner === player) {
          all.push(...this.getLegalMoves(p));
        }
      }
    }
    return all;
  }

  selectPiece(row: number, col: number, now: number): boolean {
    if (this.gameOver || this.turn !== 'player' || this.aiThinking) return false;
    const piece = this.board[row][col];
    if (piece && piece.owner === 'player') {
      this.selected = { piece, time: now };
      this.legalMoves = this.getLegalMoves(piece);
      return true;
    }
    return false;
  }

  tryMove(row: number, col: number): boolean {
    if (!this.selected) return false;
    const move = this.legalMoves.find(m => m.toRow === row && m.toCol === col);
    if (!move) return false;
    this.executeMove(move, this.selected.piece);
    this.selected = null;
    this.legalMoves = [];
    return true;
  }

  executeMove(move: Move, piece: Piece): void {
    const { toRow, toCol } = move;

    if (move.captured) {
      const cap = move.captured;
      this.capturedAnimations.push({
        piece: cap,
        startX: cap.col,
        startY: cap.row,
        endX: cap.owner === 'player' ? 8.3 : 8.3,
        endY: cap.owner === 'player' ? -0.3 : 8.3,
        progress: 0,
        rotation: 0
      });
      if (cap.owner === 'player') {
        this.playerCaptured.push(cap);
      } else {
        this.aiCaptured.push(cap);
      }
      this.board[cap.row][cap.col] = null;
    }

    this.board[piece.row][piece.col] = null;
    piece.row = toRow;
    piece.col = toCol;
    this.board[toRow][toCol] = piece;

    if (this.dragonBreath[toRow][toCol]) {
      piece.vitality -= 1;
      if (piece.vitality <= 0) {
        this.spawnDeathParticles(toRow, toCol);
        this.board[toRow][toCol] = null;
      }
    }

    this.checkGameOver();
    if (this.gameOver) return;

    this.turn = this.turn === 'player' ? 'ai' : 'player';
    if (this.turn === 'player') this.turnCount++;

    if (this.turn === 'ai') {
      this.aiThinking = true;
      this.aiThinkStartTime = performance.now();
    }
  }

  spawnDeathParticles(row: number, col: number): void {
    for (let i = 0; i < 20; i++) {
      const angle = (Math.PI * 2 * i) / 20 + Math.random() * 0.5;
      const speed = 2 + Math.random() * 3;
      this.particles.push({
        x: col,
        y: row,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed,
        life: 0.5,
        maxLife: 0.5,
        color: Math.random() < 0.5 ? '#FF4500' : '#FF8C00',
        size: 3 + Math.random() * 4
      });
    }
  }

  checkGameOver(): void {
    let playerKing = false, aiKing = false;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.type === 'king') {
          if (p.owner === 'player') playerKing = true;
          else aiKing = true;
        }
      }
    }
    if (!playerKing) { this.gameOver = true; this.winner = 'ai'; }
    else if (!aiKing) { this.gameOver = true; this.winner = 'player'; }
  }

  computeAIMove(): Move | null {
    const moves = this.getAllMoves('ai');
    if (moves.length === 0) return null;

    let best: Move | null = null;
    let bestScore = -Infinity;

    for (const m of moves) {
      let score = 0;
      if (m.captured) score = PIECE_VALUES[m.captured.type];
      score += Math.random() * 0.01;
      if (score > bestScore) {
        bestScore = score;
        best = m;
      }
    }

    if (!best) return moves[Math.floor(Math.random() * moves.length)];
    if (!best.captured) {
      const noCapture = moves.filter(m => !m.captured);
      return noCapture[Math.floor(Math.random() * noCapture.length)] || best;
    }
    return best;
  }

  tickAI(now: number): void {
    if (!this.aiThinking || this.gameOver) return;
    if (now - this.aiThinkStartTime >= 800) {
      const move = this.pendingAIMove || this.computeAIMove();
      this.pendingAIMove = null;
      if (move) {
        const piece = this.board[move.fromRow][move.fromCol];
        if (piece) this.executeMove(move, piece);
      }
      this.aiThinking = false;
    } else if (!this.pendingAIMove) {
      this.pendingAIMove = this.computeAIMove();
    }
  }

  updateParticles(dt: number): void {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 2 * dt;
      p.life -= dt;
      if (p.life <= 0) this.particles.splice(i, 1);
    }
  }

  updateCapturedAnimations(dt: number): void {
    const dur = 0.3;
    for (let i = this.capturedAnimations.length - 1; i >= 0; i--) {
      const a = this.capturedAnimations[i];
      a.progress += dt / dur;
      a.rotation = a.progress * Math.PI * 2;
      if (a.progress >= 1) this.capturedAnimations.splice(i, 1);
    }
  }

  getTotalVitality(player: Player): number {
    let total = 0;
    for (let r = 0; r < 8; r++) {
      for (let c = 0; c < 8; c++) {
        const p = this.board[r][c];
        if (p && p.owner === player) total += p.vitality;
      }
    }
    return total;
  }

  resign(): void {
    this.gameOver = true;
    this.winner = 'ai';
  }

  reset(): void {
    this.pieceIdCounter = 0;
    this.turn = 'player';
    this.turnCount = 1;
    this.selected = null;
    this.legalMoves = [];
    this.playerCaptured = [];
    this.aiCaptured = [];
    this.particles = [];
    this.capturedAnimations = [];
    this.aiThinking = false;
    this.gameOver = false;
    this.winner = null;
    this.pendingAIMove = null;
    this.initBoard();
    this.initDragonBreath();
  }
}
