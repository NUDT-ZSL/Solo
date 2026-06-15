import Phaser from 'phaser';

export interface HexCoord {
  q: number;
  r: number;
}

export interface HexCell {
  coord: HexCoord;
  isNode: boolean;
  owner: number | null;
  occupyingTurn: number | null;
  occupyingPlayer: number | null;
}

export class Board {
  public readonly cols: number = 6;
  public readonly rows: number = 6;
  public readonly hexRadius: number = 30;
  public readonly nodeCount: number = 8;

  public cells: Map<string, HexCell> = new Map();
  public nodeCoords: HexCoord[] = [];
  public cellGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();
  public nodeGraphics: Map<string, Phaser.GameObjects.Graphics> = new Map();

  private scene: Phaser.Scene;
  private offsetX: number = 0;
  private offsetY: number = 0;

  constructor(scene: Phaser.Scene) {
    this.scene = scene;
  }

  static coordKey(q: number, r: number): string {
    return `${q},${r}`;
  }

  static parseKey(key: string): HexCoord {
    const [q, r] = key.split(',').map(Number);
    return { q, r };
  }

  public getWidth(): number {
    return this.hexRadius * Math.sqrt(3) * (this.cols + 0.5);
  }

  public getHeight(): number {
    return this.hexRadius * 1.5 * this.rows + this.hexRadius * 0.5;
  }

  public setOffset(x: number, y: number): void {
    this.offsetX = x;
    this.offsetY = y;
  }

  public generate(): void {
    this.cells.clear();
    this.nodeCoords = [];

    for (let r = 0; r < this.rows; r++) {
      for (let q = 0; q < this.cols; q++) {
        const coord: HexCoord = { q, r };
        const key = Board.coordKey(q, r);
        this.cells.set(key, {
          coord,
          isNode: false,
          owner: null,
          occupyingTurn: null,
          occupyingPlayer: null
        });
      }
    }

    this.placeNodes();
  }

  private placeNodes(): void {
    const allKeys = Array.from(this.cells.keys());
    const shuffled = Phaser.Utils.Array.Shuffle(allKeys);
    const selected = shuffled.slice(0, this.nodeCount);

    for (const key of selected) {
      const cell = this.cells.get(key)!;
      cell.isNode = true;
      this.nodeCoords.push(cell.coord);
    }
  }

  public hexToPixel(q: number, r: number): { x: number; y: number } {
    const size = this.hexRadius;
    const x = size * Math.sqrt(3) * (q + 0.5 * (r & 1)) + this.offsetX;
    const y = size * 1.5 * r + this.offsetY;
    return { x, y };
  }

  public pixelToHex(x: number, y: number): HexCoord | null {
    const size = this.hexRadius;
    const px = x - this.offsetX;
    const py = y - this.offsetY;

    let bestQ = -1;
    let bestR = -1;
    let bestDist = Infinity;

    for (let r = 0; r < this.rows; r++) {
      for (let q = 0; q < this.cols; q++) {
        const center = this.hexToPixel(q, r);
        const dx = center.x - x;
        const dy = center.y - y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < bestDist && dist < size) {
          bestDist = dist;
          bestQ = q;
          bestR = r;
        }
      }
    }

    if (bestQ < 0 || bestR < 0) return null;
    return { q: bestQ, r: bestR };
  }

  public getNeighbors(q: number, r: number): HexCoord[] {
    const isOddRow = (r & 1) === 1;
    const evenOffsets = [
      { dq: -1, dr: -1 }, { dq: 0, dr: -1 },
      { dq: -1, dr: 0 }, { dq: 1, dr: 0 },
      { dq: -1, dr: 1 }, { dq: 0, dr: 1 }
    ];
    const oddOffsets = [
      { dq: 0, dr: -1 }, { dq: 1, dr: -1 },
      { dq: -1, dr: 0 }, { dq: 1, dr: 0 },
      { dq: 0, dr: 1 }, { dq: 1, dr: 1 }
    ];
    const offsets = isOddRow ? oddOffsets : evenOffsets;
    const neighbors: HexCoord[] = [];

    for (const off of offsets) {
      const nq = q + off.dq;
      const nr = r + off.dr;
      if (nq >= 0 && nq < this.cols && nr >= 0 && nr < this.rows) {
        neighbors.push({ q: nq, r: nr });
      }
    }
    return neighbors;
  }

  public getCellsWithinRange(q: number, r: number, range: number): HexCoord[] {
    const result: HexCoord[] = [];
    const visited: Set<string> = new Set();
    const startKey = Board.coordKey(q, r);
    const queue: { coord: HexCoord; dist: number }[] = [{ coord: { q, r }, dist: 0 }];
    visited.add(startKey);

    while (queue.length > 0) {
      const current = queue.shift()!;
      if (current.dist > 0) {
        result.push(current.coord);
      }
      if (current.dist < range) {
        const neighbors = this.getNeighbors(current.coord.q, current.coord.r);
        for (const n of neighbors) {
          const nk = Board.coordKey(n.q, n.r);
          if (!visited.has(nk)) {
            visited.add(nk);
            queue.push({ coord: n, dist: current.dist + 1 });
          }
        }
      }
    }
    return result;
  }

  public getCell(q: number, r: number): HexCell | undefined {
    return this.cells.get(Board.coordKey(q, r));
  }

  public isCellPassable(q: number, r: number, playerId: number, occupiedPositions: Set<string>): boolean {
    const cell = this.getCell(q, r);
    if (!cell) return false;
    const key = Board.coordKey(q, r);
    if (occupiedPositions.has(key)) return false;
    if (cell.owner !== null && cell.owner !== playerId) return false;
    return true;
  }

  public canStandOn(q: number, r: number, playerId: number, occupiedPositions: Set<string>): boolean {
    const cell = this.getCell(q, r);
    if (!cell) return false;
    const key = Board.coordKey(q, r);
    if (occupiedPositions.has(key)) return false;
    if (cell.isNode) return true;
    if (cell.owner === playerId) return true;
    return false;
  }

  public startCapturing(q: number, r: number, playerId: number, currentTurn: number): void {
    const cell = this.getCell(q, r);
    if (!cell || !cell.isNode || cell.owner === playerId) return;
    cell.occupyingPlayer = playerId;
    cell.occupyingTurn = currentTurn;
  }

  public processCaptures(currentTurn: number): Array<{ coord: HexCoord; playerId: number }> {
    const captured: Array<{ coord: HexCoord; playerId: number }> = [];
    for (const cell of this.cells.values()) {
      if (cell.isNode && cell.occupyingPlayer !== null && cell.occupyingTurn !== null) {
        if (currentTurn - cell.occupyingTurn >= 1) {
          cell.owner = cell.occupyingPlayer;
          captured.push({ coord: cell.coord, playerId: cell.occupyingPlayer });
          cell.occupyingPlayer = null;
          cell.occupyingTurn = null;
        }
      }
    }
    return captured;
  }

  public cancelCapture(q: number, r: number): void {
    const cell = this.getCell(q, r);
    if (!cell) return;
    cell.occupyingPlayer = null;
    cell.occupyingTurn = null;
  }

  public getNodeCountForPlayer(playerId: number): number {
    let count = 0;
    for (const cell of this.cells.values()) {
      if (cell.isNode && cell.owner === playerId) count++;
    }
    return count;
  }

  public renderBoard(): void {
    for (const [key, cell] of this.cells) {
      this.renderCell(cell);
    }
    this.renderNodes();
  }

  private renderCell(cell: HexCell): void {
    const { x, y } = this.hexToPixel(cell.coord.q, cell.coord.r);
    const key = Board.coordKey(cell.coord.q, cell.coord.r);

    if (this.cellGraphics.has(key)) {
      this.cellGraphics.get(key)!.destroy();
    }

    const g = this.scene.add.graphics();
    this.drawHex(g, x, y, this.hexRadius - 2, 0xffffff, 0.3, cell.owner);
    g.setInteractive(new Phaser.Geom.Polygon(this.getHexPoints(x, y, this.hexRadius - 2)), Phaser.Geom.Polygon.Contains);
    g.setName('cell_' + key);
    this.cellGraphics.set(key, g);
  }

  private renderNodes(): void {
    for (const nodeCoord of this.nodeCoords) {
      this.renderNode(nodeCoord);
    }
  }

  private renderNode(coord: HexCoord): void {
    const { x, y } = this.hexToPixel(coord.q, coord.r);
    const key = Board.coordKey(coord.q, coord.r);
    const cell = this.getCell(coord.q, coord.r)!;

    if (this.nodeGraphics.has(key)) {
      this.nodeGraphics.get(key)!.destroy();
    }

    const g = this.scene.add.graphics();
    this.drawNode(g, x, y, cell.owner);
    this.nodeGraphics.set(key, g);

    this.scene.tweens.add({
      targets: g,
      scale: { from: 0.9, to: 1.1 },
      alpha: { from: 0.7, to: 1 },
      duration: 750,
      yoyo: true,
      repeat: -1,
      ease: 'Sine.easeInOut'
    });
  }

  public updateNodeVisual(coord: HexCoord): void {
    this.renderNode(coord);
  }

  public updateCellVisual(coord: HexCoord): void {
    const cell = this.getCell(coord.q, coord.r);
    if (cell) this.renderCell(cell);
  }

  private drawHex(
    g: Phaser.GameObjects.Graphics,
    cx: number,
    cy: number,
    size: number,
    strokeColor: number,
    strokeAlpha: number,
    owner: number | null
  ): void {
    const points = this.getHexPoints(cx, cy, size);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      g.lineTo(points[i].x, points[i].y);
    }
    g.closePath();

    if (owner !== null) {
      const fillColor = owner === 0 ? 0xff4444 : 0x4444ff;
      g.fillStyle(fillColor, 0.15);
      g.fillPath();
    }

    g.lineStyle(2, strokeColor, strokeAlpha);
    g.strokePath();
  }

  private getHexPoints(cx: number, cy: number, size: number): Phaser.Geom.Point[] {
    const points: Phaser.Geom.Point[] = [];
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      points.push(new Phaser.Geom.Point(
        cx + size * Math.cos(angle),
        cy + size * Math.sin(angle)
      ));
    }
    return points;
  }

  private drawNode(g: Phaser.GameObjects.Graphics, x: number, y: number, owner: number | null): void {
    const radius = 12;
    const color = owner === 0 ? 0xff6666 : owner === 1 ? 0x6666ff : 0xffd700;

    for (let i = 3; i >= 0; i--) {
      const r = radius + i * 4;
      const a = 0.1 + (3 - i) * 0.15;
      g.fillStyle(color, a);
      g.fillCircle(x, y, r);
    }

    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(x, y, radius * 0.4);

    g.lineStyle(2, color, 0.9);
    g.strokeCircle(x, y, radius);
  }

  public highlightCell(coord: HexCoord, color: number, alpha: number = 0.5): Phaser.GameObjects.Graphics {
    const { x, y } = this.hexToPixel(coord.q, coord.r);
    const g = this.scene.add.graphics();
    const points = this.getHexPoints(x, y, this.hexRadius - 4);
    g.beginPath();
    g.moveTo(points[0].x, points[0].y);
    for (let i = 1; i < points.length; i++) {
      g.lineTo(points[i].x, points[i].y);
    }
    g.closePath();
    g.fillStyle(color, alpha);
    g.fillPath();
    g.setDepth(5);
    return g;
  }

  public getTotalNodes(): number {
    return this.nodeCount;
  }
}
