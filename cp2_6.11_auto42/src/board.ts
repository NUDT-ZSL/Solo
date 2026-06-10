export type CellOwner = 0 | 1 | 2;
export type CellPosition = { row: number; col: number };

export interface Cell {
  row: number;
  col: number;
  owner: CellOwner;
  isFlashing: boolean;
  flashStartTime: number;
}

export interface Trail {
  id: string;
  playerId: 1 | 2;
  fromRow: number;
  fromCol: number;
  toRow: number;
  toCol: number;
  timestamp: number;
}

export interface CrossingPoint {
  row: number;
  col: number;
  trail1Id: string;
  trail2Id: string;
  timestamp: number;
}

export interface LayoutConfig {
  cellSize: number;
  cellGap: number;
  offsetX: number;
  offsetY: number;
  isMobile: boolean;
  scale: number;
}

export class Board {
  readonly size = 8;
  cells: Cell[][] = [];
  trails: Trail[] = [];
  crossings: CrossingPoint[] = [];
  layout: LayoutConfig;

  constructor() {
    this.layout = this.calculateLayout();
    this.generateBoard();
  }

  calculateLayout(): LayoutConfig {
    const width = window.innerWidth;
    const height = window.innerHeight;
    const isMobile = width <= 768 && window.matchMedia("(orientation: portrait)").matches;
    const scale = isMobile ? 0.5 : 1;
    const cellSize = 48 * scale;
    const cellGap = 3 * scale;
    const totalWidth = this.size * cellSize + (this.size - 1) * cellGap;
    const totalHeight = this.size * cellSize + (this.size - 1) * cellGap;
    
    let offsetX: number;
    let offsetY: number;
    
    if (isMobile) {
      offsetX = (width - totalWidth) / 2;
      offsetY = (height - totalHeight) / 2;
    } else {
      const logPanelWidth = 280;
      const availableWidth = width - logPanelWidth - 40;
      const availableHeight = height - 40;
      offsetX = logPanelWidth + 20 + (availableWidth - totalWidth) / 2;
      offsetY = 20 + (availableHeight - totalHeight) / 2;
    }
    
    return { cellSize, cellGap, offsetX, offsetY, isMobile, scale };
  }

  updateLayout(): void {
    this.layout = this.calculateLayout();
  }

  generateBoard(): void {
    this.cells = [];
    for (let row = 0; row < this.size; row++) {
      const rowCells: Cell[] = [];
      for (let col = 0; col < this.size; col++) {
        rowCells.push({
          row,
          col,
          owner: 0,
          isFlashing: false,
          flashStartTime: 0,
        });
      }
      this.cells.push(rowCells);
    }
  }

  getCell(row: number, col: number): Cell | null {
    if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
      return this.cells[row][col];
    }
    return null;
  }

  cellToScreen(row: number, col: number): { x: number; y: number } {
    const { cellSize, cellGap, offsetX, offsetY } = this.layout;
    const x = offsetX + col * (cellSize + cellGap) + cellSize / 2;
    const y = offsetY + row * (cellSize + cellGap) + cellSize / 2;
    return { x, y };
  }

  screenToCell(x: number, y: number): CellPosition | null {
    const { cellSize, cellGap, offsetX, offsetY } = this.layout;
    const col = Math.floor((x - offsetX) / (cellSize + cellGap));
    const row = Math.floor((y - offsetY) / (cellSize + cellGap));
    
    if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
      const cellX = offsetX + col * (cellSize + cellGap);
      const cellY = offsetY + row * (cellSize + cellGap);
      if (x >= cellX && x < cellX + cellSize && y >= cellY && y < cellY + cellSize) {
        return { row, col };
      }
    }
    return null;
  }

  getDiamondCorners(row: number, col: number): { x: number; y: number }[] {
    const { cellSize, offsetX, offsetY, cellGap } = this.layout;
    const centerX = offsetX + col * (cellSize + cellGap) + cellSize / 2;
    const centerY = offsetY + row * (cellSize + cellGap) + cellSize / 2;
    const halfSize = cellSize / 2;
    
    return [
      { x: centerX, y: centerY - halfSize },
      { x: centerX + halfSize, y: centerY },
      { x: centerX, y: centerY + halfSize },
      { x: centerX - halfSize, y: centerY },
    ];
  }

  addTrail(playerId: 1 | 2, fromRow: number, fromCol: number, toRow: number, toCol: number): Trail {
    const trail: Trail = {
      id: `trail_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      playerId,
      fromRow,
      fromCol,
      toRow,
      toCol,
      timestamp: Date.now(),
    };
    this.trails.push(trail);
    
    const dr = toRow - fromRow;
    const dc = toCol - fromCol;
    const steps = Math.max(Math.abs(dr), Math.abs(dc));
    
    for (let i = 0; i <= steps; i++) {
      const r = fromRow + Math.round((dr * i) / steps);
      const c = fromCol + Math.round((dc * i) / steps);
      const cell = this.getCell(r, c);
      if (cell && cell.owner === 0) {
        cell.owner = playerId;
      }
    }
    
    return trail;
  }

  doLinesIntersect(
    p1: CellPosition, p2: CellPosition,
    p3: CellPosition, p4: CellPosition
  ): CellPosition | null {
    const d1 = (p2.col - p1.col) * (p3.row - p1.row) - (p2.row - p1.row) * (p3.col - p1.col);
    const d2 = (p2.col - p1.col) * (p4.row - p1.row) - (p2.row - p1.row) * (p4.col - p1.col);
    const d3 = (p4.col - p3.col) * (p1.row - p3.row) - (p4.row - p3.row) * (p1.col - p3.col);
    const d4 = (p4.col - p3.col) * (p2.row - p3.row) - (p4.row - p3.row) * (p2.col - p3.col);

    if (((d1 > 0 && d2 < 0) || (d1 < 0 && d2 > 0)) &&
        ((d3 > 0 && d4 < 0) || (d3 < 0 && d4 > 0))) {
      const denom = (p2.row - p1.row) * (p4.col - p3.col) - (p2.col - p1.col) * (p4.row - p3.row);
      if (Math.abs(denom) < 0.0001) return null;
      
      const t = ((p1.col - p3.col) * (p4.row - p3.row) - (p1.row - p3.row) * (p4.col - p3.col)) / denom;
      
      const row = Math.round(p1.row + t * (p2.row - p1.row));
      const col = Math.round(p1.col + t * (p2.col - p1.col));
      
      if (row >= 0 && row < this.size && col >= 0 && col < this.size) {
        return { row, col };
      }
    }
    
    return null;
  }

  detectCrossings(newTrail: Trail): CrossingPoint[] {
    const newCrossings: CrossingPoint[] = [];
    const p1: CellPosition = { row: newTrail.fromRow, col: newTrail.fromCol };
    const p2: CellPosition = { row: newTrail.toRow, col: newTrail.toCol };

    for (const trail of this.trails) {
      if (trail.id === newTrail.id) continue;
      if (trail.playerId === newTrail.playerId) continue;
      
      const p3: CellPosition = { row: trail.fromRow, col: trail.fromCol };
      const p4: CellPosition = { row: trail.toRow, col: trail.toCol };
      
      const intersection = this.doLinesIntersect(p1, p2, p3, p4);
      if (intersection) {
        const crossing: CrossingPoint = {
          row: intersection.row,
          col: intersection.col,
          trail1Id: newTrail.id,
          trail2Id: trail.id,
          timestamp: Date.now(),
        };
        newCrossings.push(crossing);
        this.crossings.push(crossing);
      }
    }

    return newCrossings;
  }

  startFlashArea(centerRow: number, centerCol: number, radius: number): void {
    for (let r = centerRow - radius; r <= centerRow + radius; r++) {
      for (let c = centerCol - radius; c <= centerCol + radius; c++) {
        const cell = this.getCell(r, c);
        if (cell) {
          cell.isFlashing = true;
          cell.flashStartTime = Date.now();
        }
      }
    }
  }

  updateFlash(): void {
    const now = Date.now();
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const cell = this.cells[r][c];
        if (cell.isFlashing && now - cell.flashStartTime > 500) {
          cell.isFlashing = false;
        }
      }
    }
  }

  resetArea(centerRow: number, centerCol: number, radius: number): void {
    for (let r = centerRow - radius; r <= centerRow + radius; r++) {
      for (let c = centerCol - radius; c <= centerCol + radius; c++) {
        const cell = this.getCell(r, c);
        if (cell) {
          cell.owner = 0;
        }
      }
    }
  }

  floodFill(startRow: number, startCol: number, playerId: 1 | 2, visited: boolean[][]): Set<string> {
    const region = new Set<string>();
    const queue: CellPosition[] = [{ row: startRow, col: startCol }];
    
    while (queue.length > 0) {
      const pos = queue.shift()!;
      const key = `${pos.row},${pos.col}`;
      
      if (pos.row < 0 || pos.row >= this.size || pos.col < 0 || pos.col >= this.size) continue;
      if (visited[pos.row][pos.col]) continue;
      
      const cell = this.cells[pos.row][pos.col];
      if (cell.owner !== playerId) continue;
      
      visited[pos.row][pos.col] = true;
      region.add(key);
      
      queue.push({ row: pos.row - 1, col: pos.col });
      queue.push({ row: pos.row + 1, col: pos.col });
      queue.push({ row: pos.row, col: pos.col - 1 });
      queue.push({ row: pos.row, col: pos.col + 1 });
    }
    
    return region;
  }

  isEnclosed(region: Set<string>, playerId: 1 | 2): boolean {
    if (region.size === 0) return false;
    
    for (const key of region) {
      const [row, col] = key.split(',').map(Number);
      if (row === 0 || row === this.size - 1 || col === 0 || col === this.size - 1) {
        return false;
      }
    }
    
    const checked = new Set<string>();
    for (const key of region) {
      const [row, col] = key.split(',').map(Number);
      const neighbors = [
        { row: row - 1, col },
        { row: row + 1, col },
        { row, col: col - 1 },
        { row, col: col + 1 },
      ];
      
      for (const n of neighbors) {
        const nKey = `${n.row},${n.col}`;
        if (region.has(nKey) || checked.has(nKey)) continue;
        
        if (n.row < 0 || n.row >= this.size || n.col < 0 || n.col >= this.size) continue;
        
        const cell = this.cells[n.row][n.col];
        if (cell.owner === 0) {
          const canReachEdge = this.canReachEdge(n.row, n.col, playerId, new Set(), region);
          if (!canReachEdge) {
            return true;
          }
          checked.add(nKey);
        }
      }
    }
    
    return false;
  }

  canReachEdge(row: number, col: number, playerId: 1 | 2, visited: Set<string>, region: Set<string>): boolean {
    const key = `${row},${col}`;
    if (visited.has(key) || region.has(key)) return false;
    if (row < 0 || row >= this.size || col < 0 || col >= this.size) return true;
    
    const cell = this.cells[row][col];
    if (cell.owner === playerId) return false;
    
    visited.add(key);
    
    return (
      this.canReachEdge(row - 1, col, playerId, visited, region) ||
      this.canReachEdge(row + 1, col, playerId, visited, region) ||
      this.canReachEdge(row, col - 1, playerId, visited, region) ||
      this.canReachEdge(row, col + 1, playerId, visited, region)
    );
  }

  calculateEnclosedArea(playerId: 1 | 2): number {
    const visited: boolean[][] = Array(this.size).fill(null).map(() => Array(this.size).fill(false));
    let totalEnclosed = 0;
    
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.cells[r][c].owner === playerId && !visited[r][c]) {
          const region = this.floodFill(r, c, playerId, visited);
          if (this.isEnclosed(region, playerId)) {
            const emptyVisited = new Set<string>();
            for (const key of region) {
              const [row, col] = key.split(',').map(Number);
              const neighbors = [
                { row: row - 1, col },
                { row: row + 1, col },
                { row, col: col - 1 },
                { row, col: col + 1 },
              ];
              for (const n of neighbors) {
                const nKey = `${n.row},${n.col}`;
                if (n.row >= 0 && n.row < this.size && n.col >= 0 && n.col < this.size) {
                  const cell = this.cells[n.row][n.col];
                  if (cell.owner === 0 && !region.has(nKey) && !emptyVisited.has(nKey)) {
                    const canReachEdge = this.canReachEdge(n.row, n.col, playerId, new Set(), region);
                    if (!canReachEdge) {
                      this.countEnclosedEmpty(n.row, n.col, playerId, emptyVisited, region);
                    }
                  }
                }
              }
            }
            totalEnclosed += region.size + emptyVisited.size;
          }
        }
      }
    }
    
    return totalEnclosed;
  }

  countEnclosedEmpty(row: number, col: number, playerId: 1 | 2, visited: Set<string>, region: Set<string>): void {
    const stack: CellPosition[] = [{ row, col }];
    
    while (stack.length > 0) {
      const pos = stack.pop()!;
      const key = `${pos.row},${pos.col}`;
      
      if (pos.row < 0 || pos.row >= this.size || pos.col < 0 || pos.col >= this.size) continue;
      if (visited.has(key) || region.has(key)) continue;
      
      const cell = this.cells[pos.row][pos.col];
      if (cell.owner === playerId) continue;
      
      visited.add(key);
      
      stack.push({ row: pos.row - 1, col: pos.col });
      stack.push({ row: pos.row + 1, col: pos.col });
      stack.push({ row: pos.row, col: pos.col - 1 });
      stack.push({ row: pos.row, col: pos.col + 1 });
    }
  }

  calculateTotalOwnedCells(playerId: 1 | 2): number {
    let count = 0;
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        if (this.cells[r][c].owner === playerId) {
          count++;
        }
      }
    }
    return count + this.calculateEnclosedArea(playerId);
  }

  checkVictory(): 1 | 2 | null {
    const totalCells = this.size * this.size;
    const threshold = totalCells * 0.51;
    
    const player1Area = this.calculateTotalOwnedCells(1);
    const player2Area = this.calculateTotalOwnedCells(2);
    
    if (player1Area >= threshold) return 1;
    if (player2Area >= threshold) return 2;
    
    return null;
  }

  render(ctx: CanvasRenderingContext2D): void {
    const { cellSize } = this.layout;
    
    for (let r = 0; r < this.size; r++) {
      for (let c = 0; c < this.size; c++) {
        const corners = this.getDiamondCorners(r, c);
        const cell = this.cells[r][c];
        
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(corners[0].x, corners[0].y);
        for (let i = 1; i < corners.length; i++) {
          ctx.lineTo(corners[i].x, corners[i].y);
        }
        ctx.closePath();
        
        if (cell.owner === 1) {
          ctx.fillStyle = 'rgba(0, 212, 255, 0.15)';
        } else if (cell.owner === 2) {
          ctx.fillStyle = 'rgba(255, 107, 53, 0.15)';
        } else {
          ctx.fillStyle = 'rgba(255, 255, 255, 0.02)';
        }
        ctx.fill();
        
        if (cell.isFlashing) {
          const flashElapsed = Date.now() - cell.flashStartTime;
          const flashPhase = Math.floor((flashElapsed / 1000) * 8) % 2;
          if (flashPhase === 0) {
            ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
            ctx.fill();
          }
        }
        
        ctx.shadowColor = 'rgba(255, 255, 255, 0.5)';
        ctx.shadowBlur = 8;
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.125)';
        ctx.lineWidth = 1;
        ctx.stroke();
        ctx.restore();
      }
    }
    
    this.renderTrails(ctx);
  }

  renderTrails(ctx: CanvasRenderingContext2D): void {
    const now = Date.now();
    
    for (const trail of this.trails) {
      const age = now - trail.timestamp;
      if (age > 2000) continue;
      
      const alpha = Math.max(0, 0.8 - (age / 2000) * 0.8);
      const color = trail.playerId === 1 ? '0, 212, 255' : '255, 107, 53';
      
      const from = this.cellToScreen(trail.fromRow, trail.fromCol);
      const to = this.cellToScreen(trail.toRow, trail.toCol);
      
      ctx.save();
      ctx.strokeStyle = `rgba(${color}, ${alpha})`;
      ctx.lineWidth = 3 * this.layout.scale;
      ctx.lineCap = 'round';
      ctx.shadowColor = `rgba(${color}, ${alpha})`;
      ctx.shadowBlur = 10;
      
      ctx.beginPath();
      ctx.moveTo(from.x, from.y);
      ctx.lineTo(to.x, to.y);
      ctx.stroke();
      ctx.restore();
    }
  }
}
