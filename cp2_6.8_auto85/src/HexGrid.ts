export type TerrainType = 'plain' | 'grass' | 'rock' | 'water' | 'highland';

export interface HexCoord {
  q: number;
  r: number;
}

export interface Point {
  x: number;
  y: number;
}

export interface TerrainInfo {
  color: string;
  name: string;
  moveCost: number;
  passable: boolean;
  defBonus: number;
  rangeBonus: number;
}

export const TERRAINS: Record<TerrainType, TerrainInfo> = {
  plain:    { color: '#A0AEC0', name: '平地', moveCost: 1, passable: true,  defBonus: 0, rangeBonus: 0 },
  grass:    { color: '#48BB78', name: '草地', moveCost: 1, passable: true,  defBonus: 0, rangeBonus: 0 },
  rock:     { color: '#9C4221', name: '岩石', moveCost: 2, passable: true,  defBonus: 1, rangeBonus: 0 },
  water:    { color: '#3182CE', name: '水域', moveCost: 99, passable: false, defBonus: 0, rangeBonus: 0 },
  highland: { color: '#D69E2E', name: '高地', moveCost: 1, passable: true,  defBonus: 0, rangeBonus: 1 }
};

const GRID_COLS = 20;
const GRID_ROWS = 15;
const HEX_SIZE = 20;
const HEX_BORDER = '#4A5568';
const DEFAULT_BG = '#2D3748';

const SQRT3 = Math.sqrt(3);

export class HexGrid {
  cols: number;
  rows: number;
  size: number;
  terrains: TerrainType[][];
  fadeProgress: number = 0;
  animationStartTime: number;
  hoveredHex: HexCoord | null = null;
  highlightedHexes: Set<string> = new Set();

  constructor() {
    this.cols = GRID_COLS;
    this.rows = GRID_ROWS;
    this.size = HEX_SIZE;
    this.terrains = [];
    this.animationStartTime = performance.now();

    for (let r = 0; r < this.rows; r++) {
      const row: TerrainType[] = [];
      for (let q = 0; q < this.cols; q++) {
        row.push('plain');
      }
      this.terrains.push(row);
    }
  }

  getTotalWidth(): number {
    const lastQ = this.cols - 1;
    const lastR = this.rows - 1;
    const p1 = this.hexToPixel({ q: 0, r: 0 });
    const p2 = this.hexToPixel({ q: lastQ, r: lastR });
    return Math.ceil(p2.x - p1.x + this.size * SQRT3 + 20);
  }

  getTotalHeight(): number {
    const lastR = this.rows - 1;
    const p1 = this.hexToPixel({ q: 0, r: 0 });
    const p2 = this.hexToPixel({ q: 0, r: lastR });
    return Math.ceil(p2.y - p1.y + this.size * 2 + 20);
  }

  getOffsetX(): number {
    return this.size * SQRT3 / 2 + 10;
  }

  getOffsetY(): number {
    return this.size + 10;
  }

  hexToPixel(hex: HexCoord): Point {
    const x = this.size * (SQRT3 * hex.q + SQRT3 / 2 * hex.r);
    const y = this.size * (3 / 2 * hex.r);
    return {
      x: x + this.getOffsetX(),
      y: y + this.getOffsetY()
    };
  }

  pixelToHex(point: Point): HexCoord {
    const px = point.x - this.getOffsetX();
    const py = point.y - this.getOffsetY();
    const q = (SQRT3 / 3 * px - 1 / 3 * py) / this.size;
    const r = (2 / 3 * py) / this.size;
    return this.roundHex({ q, r });
  }

  private roundHex(hex: HexCoord): HexCoord {
    const s = -hex.q - hex.r;
    let rq = Math.round(hex.q);
    let rr = Math.round(hex.r);
    const rs = Math.round(s);

    const qDiff = Math.abs(rq - hex.q);
    const rDiff = Math.abs(rr - hex.r);
    const sDiff = Math.abs(rs - s);

    if (qDiff > rDiff && qDiff > sDiff) {
      rq = -rr - rs;
    } else if (rDiff > sDiff) {
      rr = -rq - rs;
    }
    return { q: rq, r: rr };
  }

  isValid(hex: HexCoord): boolean {
    return hex.q >= 0 && hex.q < this.cols && hex.r >= 0 && hex.r < this.rows;
  }

  setTerrain(hex: HexCoord, terrain: TerrainType): void {
    if (!this.isValid(hex)) return;
    this.terrains[hex.r][hex.q] = terrain;
  }

  getTerrain(hex: HexCoord): TerrainType {
    if (!this.isValid(hex)) return 'water';
    return this.terrains[hex.r][hex.q];
  }

  getTerrainInfo(hex: HexCoord): TerrainInfo {
    return TERRAINS[this.getTerrain(hex)];
  }

  isPassable(hex: HexCoord): boolean {
    return this.isValid(hex) && this.getTerrainInfo(hex).passable;
  }

  hexDistance(a: HexCoord, b: HexCoord): number {
    return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
  }

  getNeighbors(hex: HexCoord): HexCoord[] {
    const dirs = [
      { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
      { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
    ];
    return dirs
      .map(d => ({ q: hex.q + d.q, r: hex.r + d.r }))
      .filter(h => this.isValid(h));
  }

  hexKey(hex: HexCoord): string {
    return `${hex.q},${hex.r}`;
  }

  parseKey(key: string): HexCoord {
    const [q, r] = key.split(',').map(Number);
    return { q, r };
  }

  private drawHex(ctx: CanvasRenderingContext2D, center: Point, fillColor: string, alpha: number = 1, borderAlpha: number = 1) {
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const angle = (Math.PI / 180) * (60 * i - 30);
      const hx = center.x + this.size * Math.cos(angle);
      const hy = center.y + this.size * Math.sin(angle);
      if (i === 0) ctx.moveTo(hx, hy);
      else ctx.lineTo(hx, hy);
    }
    ctx.closePath();

    if (alpha > 0) {
      ctx.fillStyle = fillColor;
      ctx.globalAlpha = alpha;
      ctx.fill();
      ctx.globalAlpha = 1;
    }

    if (borderAlpha > 0) {
      ctx.strokeStyle = HEX_BORDER;
      ctx.lineWidth = 1;
      ctx.globalAlpha = borderAlpha;
      ctx.stroke();
      ctx.globalAlpha = 1;
    }
  }

  updateAnimation(now: number): void {
    const elapsed = (now - this.animationStartTime) / 1000;
    this.fadeProgress = Math.min(1, elapsed / 0.8);
  }

  render(ctx: CanvasRenderingContext2D): void {
    for (let r = 0; r < this.rows; r++) {
      for (let q = 0; q < this.cols; q++) {
        const hex = { q, r };
        const center = this.hexToPixel(hex);
        const terrain = this.getTerrain(hex);
        const info = TERRAINS[terrain];
        const cellIndex = r * this.cols + q;
        const totalCells = this.rows * this.cols;
        const cellDelay = (cellIndex / totalCells) * 0.4;
        const cellProgress = Math.max(0, Math.min(1, (this.fadeProgress - cellDelay) / 0.6));

        let fillColor = info.color;
        let fillAlpha = cellProgress;
        let borderAlpha = cellProgress * 0.8;

        const key = this.hexKey(hex);
        if (this.highlightedHexes.has(key)) {
          fillAlpha = 1;
        }

        if (this.hoveredHex && this.hoveredHex.q === q && this.hoveredHex.r === r) {
          this.drawHex(ctx, center, fillColor, fillAlpha, borderAlpha);
          ctx.save();
          ctx.globalAlpha = 0.3;
          ctx.strokeStyle = '#F6E05E';
          ctx.lineWidth = 2;
          this.drawHex(ctx, center, '#F6E05E', 0.2, 1);
          ctx.restore();
        } else {
          this.drawHex(ctx, center, fillColor, fillAlpha, borderAlpha);
        }

        if (this.highlightedHexes.has(key)) {
          ctx.save();
          ctx.globalAlpha = 0.5;
          ctx.strokeStyle = '#F6E05E';
          ctx.lineWidth = 2;
          this.drawHex(ctx, center, '#F6E05E', 0.15, 1);
          ctx.restore();
        }
      }
    }
  }

  clearAll(): void {
    for (let r = 0; r < this.rows; r++) {
      for (let q = 0; q < this.cols; q++) {
        this.terrains[r][q] = 'plain';
      }
    }
  }

  toJSON(): TerrainType[][] {
    return this.terrains.map(row => [...row]);
  }

  fromJSON(data: TerrainType[][]): void {
    if (!data || !Array.isArray(data)) return;
    for (let r = 0; r < Math.min(data.length, this.rows); r++) {
      for (let q = 0; q < Math.min(data[r].length, this.cols); q++) {
        this.terrains[r][q] = data[r][q];
      }
    }
  }
}
