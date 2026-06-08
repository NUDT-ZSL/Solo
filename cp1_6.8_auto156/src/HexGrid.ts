import { type AxialCoord, type HexNode, type NoteData } from './types';

const SQRT3 = Math.sqrt(3);

export class HexGrid {
  private hexSize: number;
  private cols: number;
  private rows: number;
  private offsetX: number;
  private offsetY: number;
  private nodes: Map<string, HexNode> = new Map();
  private canvasWidth: number;
  private canvasHeight: number;

  constructor(
    hexSize: number,
    cols: number,
    rows: number,
    canvasWidth: number,
    canvasHeight: number
  ) {
    this.hexSize = hexSize;
    this.cols = cols;
    this.rows = rows;
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;

    const gridWidth = hexSize * (1.5 * (cols - 1) + 2);
    const gridHeight = hexSize * SQRT3 * (rows + 0.5);
    this.offsetX = (canvasWidth - gridWidth) / 2 + hexSize;
    this.offsetY = (canvasHeight - gridHeight) / 2 + hexSize * SQRT3 * 0.5;

    this.generate();
  }

  private key(q: number, r: number): string {
    return `${q},${r}`;
  }

  generate(): void {
    this.nodes.clear();
    for (let q = 0; q < this.cols; q++) {
      for (let r = 0; r < this.rows; r++) {
        const raw = this.axialToPixelRaw(q, r);
        this.nodes.set(this.key(q, r), {
          coord: { q, r },
          pixel: { x: raw.x + this.offsetX, y: raw.y + this.offsetY },
          note: null,
          active: false,
          pulseIntensity: 0,
          hoverIntensity: 0,
          scale: 1,
        });
      }
    }
  }

  private axialToPixelRaw(q: number, r: number): { x: number; y: number } {
    const x = this.hexSize * 1.5 * q;
    const y = this.hexSize * SQRT3 * (r + q * 0.5);
    return { x, y };
  }

  axialToPixel(q: number, r: number): { x: number; y: number } {
    const raw = this.axialToPixelRaw(q, r);
    return { x: raw.x + this.offsetX, y: raw.y + this.offsetY };
  }

  pixelToAxial(px: number, py: number): AxialCoord | null {
    const x = px - this.offsetX;
    const y = py - this.offsetY;
    const q = ((2 / 3) * x) / this.hexSize;
    const r = ((-1 / 3) * x + (SQRT3 / 3) * y) / this.hexSize;
    const rounded = this.hexRound(q, r);
    if (rounded && this.nodes.has(this.key(rounded.q, rounded.r))) {
      return rounded;
    }
    return null;
  }

  private hexRound(q: number, r: number): AxialCoord {
    const s = -q - r;
    let rq = Math.round(q);
    let rr = Math.round(r);
    const rs = Math.round(s);
    const dq = Math.abs(rq - q);
    const dr = Math.abs(rr - r);
    const ds = Math.abs(rs - s);
    if (dq > dr && dq > ds) {
      rq = -rr - rs;
    } else if (dr > ds) {
      rr = -rq - rs;
    }
    return { q: rq, r: rr };
  }

  getNode(coord: AxialCoord): HexNode | undefined {
    return this.nodes.get(this.key(coord.q, coord.r));
  }

  getAllNodes(): HexNode[] {
    return Array.from(this.nodes.values());
  }

  placeNote(coord: AxialCoord, note: NoteData): boolean {
    const node = this.nodes.get(this.key(coord.q, coord.r));
    if (!node || node.note !== null) return false;
    node.note = note;
    node.scale = 0;
    return true;
  }

  removeNote(coord: AxialCoord): NoteData | null {
    const node = this.nodes.get(this.key(coord.q, coord.r));
    if (!node || node.note === null) return null;
    const note = node.note;
    node.note = null;
    node.active = false;
    node.pulseIntensity = 0;
    return note;
  }

  getNeighbors(coord: AxialCoord): AxialCoord[] {
    const dirs: [number, number][] = [
      [1, 0], [-1, 0], [0, 1], [0, -1], [1, -1], [-1, 1],
    ];
    const result: AxialCoord[] = [];
    for (const [dq, dr] of dirs) {
      const nq = coord.q + dq;
      const nr = coord.r + dr;
      if (this.nodes.has(this.key(nq, nr))) {
        result.push({ q: nq, r: nr });
      }
    }
    return result;
  }

  getOccupiedNodes(): HexNode[] {
    return this.getAllNodes().filter((n) => n.note !== null);
  }

  getConnections(): { from: AxialCoord; to: AxialCoord }[] {
    const connections: { from: AxialCoord; to: AxialCoord }[] = [];
    const visited = new Set<string>();
    for (const node of this.getOccupiedNodes()) {
      const neighbors = this.getNeighbors(node.coord);
      for (const nb of neighbors) {
        const nbNode = this.nodes.get(this.key(nb.q, nb.r));
        if (nbNode && nbNode.note !== null) {
          const k1 = this.key(node.coord.q, node.coord.r) + '>' + this.key(nb.q, nb.r);
          const k2 = this.key(nb.q, nb.r) + '>' + this.key(node.coord.q, node.coord.r);
          if (!visited.has(k1) && !visited.has(k2)) {
            visited.add(k1);
            visited.add(k2);
            connections.push({ from: node.coord, to: nb });
          }
        }
      }
    }
    return connections;
  }

  getPlaybackSequence(): HexNode[] {
    return this.getOccupiedNodes().sort((a, b) => {
      if (a.coord.q !== b.coord.q) return a.coord.q - b.coord.q;
      return a.coord.r - b.coord.r;
    });
  }

  getHexSize(): number {
    return this.hexSize;
  }

  drawHexOutline(
    ctx: CanvasRenderingContext2D,
    cx: number,
    cy: number,
    size: number
  ): void {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i);
      const x = cx + size * Math.cos(angle);
      const y = cy + size * Math.sin(angle);
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.closePath();
  }

  resize(canvasWidth: number, canvasHeight: number): void {
    this.canvasWidth = canvasWidth;
    this.canvasHeight = canvasHeight;
    const gridWidth = this.hexSize * (1.5 * (this.cols - 1) + 2);
    const gridHeight = this.hexSize * SQRT3 * (this.rows + 0.5);
    this.offsetX = (canvasWidth - gridWidth) / 2 + this.hexSize;
    this.offsetY = (canvasHeight - gridHeight) / 2 + this.hexSize * SQRT3 * 0.5;

    for (const node of this.nodes.values()) {
      const raw = this.axialToPixelRaw(node.coord.q, node.coord.r);
      node.pixel.x = raw.x + this.offsetX;
      node.pixel.y = raw.y + this.offsetY;
    }
  }

  clear(): void {
    for (const node of this.nodes.values()) {
      node.note = null;
      node.active = false;
      node.pulseIntensity = 0;
      node.scale = 1;
    }
  }
}
