export interface HexCell {
  q: number;
  r: number;
  x: number;
  y: number;
  hasFlower: boolean;
  flower: Flower | null;
}

export interface Flower {
  id: number;
  x: number;
  y: number;
  owner: 'player' | 'enemy' | 'neutral';
  hp: number;
  maxHp: number;
  pulsePhase: number;
  pulseDuration: number;
  energyTimer: number;
  crackAnim: number;
}

export const HEX_SIZE = 24;
export const HEX_EDGE = 2;

export function axialToPixel(q: number, r: number, size: number = HEX_SIZE): { x: number; y: number } {
  const x = size * (3 / 2 * q);
  const y = size * (Math.sqrt(3) / 2 * q + Math.sqrt(3) * r);
  return { x, y };
}

export function pixelToAxial(x: number, y: number, size: number = HEX_SIZE): { q: number; r: number } {
  const q = (2 / 3 * x) / size;
  const r = (-1 / 3 * x + Math.sqrt(3) / 3 * y) / size;
  return hexRound(q, r);
}

export function hexRound(q: number, r: number): { q: number; r: number } {
  const s = -q - r;
  let rq = Math.round(q);
  let rr = Math.round(r);
  const rs = Math.round(s);
  const qDiff = Math.abs(rq - q);
  const rDiff = Math.abs(rr - r);
  const sDiff = Math.abs(rs - s);
  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }
  return { q: rq, r: rr };
}

export function drawHexagon(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  size: number,
  fill: string,
  stroke: string | null = null,
  lineWidth: number = 2
) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    const px = x + size * Math.cos(angle);
    const py = y + size * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

export class Grid {
  cols: number;
  rows: number;
  cells: HexCell[];
  flowers: Flower[];
  width: number;
  height: number;
  offsetX: number;
  offsetY: number;
  private flowerIdCounter: number;

  constructor(cols: number = 20, rows: number = 15) {
    this.cols = cols;
    this.rows = rows;
    this.cells = [];
    this.flowers = [];
    this.flowerIdCounter = 0;

    const lastCol = axialToPixel(cols - 1, 0);
    const lastRow = axialToPixel(0, rows - 1);
    this.width = lastCol.x + HEX_SIZE * Math.sqrt(3);
    this.height = lastRow.y + HEX_SIZE * 2;
    this.offsetX = 0;
    this.offsetY = 0;

    this.generate();
  }

  setOffset(offX: number, offY: number) {
    this.offsetX = offX;
    this.offsetY = offY;
    for (const cell of this.cells) {
      cell.x += offX;
      cell.y += offY;
    }
    for (const flower of this.flowers) {
      flower.x += offX;
      flower.y += offY;
    }
  }

  generate() {
    this.cells = [];
    this.flowers = [];

    for (let q = 0; q < this.cols; q++) {
      const rOffset = Math.floor(q / 2);
      for (let r = -rOffset; r < this.rows - rOffset; r++) {
        const pixel = axialToPixel(q, r);
        const jitterX = (Math.random() - 0.5) * 3;
        const jitterY = (Math.random() - 0.5) * 3;
        this.cells.push({
          q,
          r,
          x: pixel.x + jitterX,
          y: pixel.y + jitterY,
          hasFlower: false,
          flower: null
        });
      }
    }

    this.placeFlowers(15);
  }

  placeFlowers(count: number) {
    const availableCells = [...this.cells].filter(cell => {
      const distFromCore = Math.hypot(cell.x - 80, cell.y - (this.height - 80));
      return distFromCore > 150;
    });

    for (let i = 0; i < count && availableCells.length > 0; i++) {
      const idx = Math.floor(Math.random() * availableCells.length);
      const cell = availableCells.splice(idx, 1)[0];
      cell.hasFlower = true;
      const flower: Flower = {
        id: this.flowerIdCounter++,
        x: cell.x,
        y: cell.y,
        owner: 'neutral',
        hp: 10,
        maxHp: 10,
        pulsePhase: Math.random() * Math.PI * 2,
        pulseDuration: 2.5,
        energyTimer: 0,
        crackAnim: 0
      };
      cell.flower = flower;
      this.flowers.push(flower);
    }
  }

  getNeighbors(q: number, r: number): HexCell[] {
    const directions = [
      { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
      { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 }
    ];
    const neighbors: HexCell[] = [];
    for (const dir of directions) {
      const nq = q + dir.q;
      const nr = r + dir.r;
      const cell = this.cells.find(c => c.q === nq && c.r === nr);
      if (cell) neighbors.push(cell);
    }
    return neighbors;
  }

  getCellAt(x: number, y: number): HexCell | null {
    let closest: HexCell | null = null;
    let closestDist = Infinity;
    for (const cell of this.cells) {
      const dist = Math.hypot(cell.x - x, cell.y - y);
      if (dist < closestDist && dist < HEX_SIZE * 1.2) {
        closestDist = dist;
        closest = cell;
      }
    }
    return closest;
  }

  getRandomEdgeCell(): HexCell {
    const edge = Math.floor(Math.random() * 4);
    let candidates: HexCell[];
    switch (edge) {
      case 0:
        candidates = this.cells.filter(c => c.y < HEX_SIZE * 2);
        break;
      case 1:
        candidates = this.cells.filter(c => c.y > this.height - HEX_SIZE * 2);
        break;
      case 2:
        candidates = this.cells.filter(c => c.x < HEX_SIZE * 2);
        break;
      default:
        candidates = this.cells.filter(c => c.x > this.width - HEX_SIZE * 2);
        break;
    }
    return candidates[Math.floor(Math.random() * candidates.length)] || this.cells[0];
  }

  update(dt: number, onEnergy: (owner: 'player' | 'enemy') => void) {
    for (const flower of this.flowers) {
      flower.pulsePhase += (dt / flower.pulseDuration) * Math.PI * 2;
      if (flower.crackAnim > 0) {
        flower.crackAnim = Math.max(0, flower.crackAnim - dt * 2);
      }
      if (flower.owner !== 'neutral') {
        flower.energyTimer += dt;
        if (flower.energyTimer >= 3) {
          flower.energyTimer = 0;
          onEnergy(flower.owner);
        }
      }
    }
  }

  render(ctx: CanvasRenderingContext2D) {
    for (let i = 0; i < this.cells.length; i++) {
      const cell = this.cells[i];
      const t = (cell.q + cell.r * 0.5) / (this.cols + this.rows * 0.5);
      const r = Math.floor(0x2D + (0x1F - 0x2D) * t);
      const g = Math.floor(0x4A + (0x33 - 0x4A) * t);
      const b = Math.floor(0x2D + (0x1F - 0x2D) * t);
      drawHexagon(ctx, cell.x, cell.y, HEX_SIZE - HEX_EDGE, `rgb(${r},${g},${b})`, '#1A2E1A', HEX_EDGE);
    }

    for (const flower of this.flowers) {
      this.renderFlower(ctx, flower);
    }
  }

  renderFlower(ctx: CanvasRenderingContext2D, flower: Flower) {
    const pulse = 0.6 + 0.4 * (0.5 + 0.5 * Math.sin(flower.pulsePhase));
    let centerColor: string, glowColor: string;
    if (flower.owner === 'player') {
      centerColor = '#9B59B6';
      glowColor = '#BB6BD9';
    } else if (flower.owner === 'enemy') {
      centerColor = '#E74C3C';
      glowColor = '#FF6B6B';
    } else {
      centerColor = '#FFD700';
      glowColor = '#FFAA00';
    }

    const glowRadius = 24 * pulse;
    const gradient = ctx.createRadialGradient(flower.x, flower.y, 0, flower.x, flower.y, glowRadius);
    gradient.addColorStop(0, glowColor + Math.floor(120 * pulse).toString(16).padStart(2, '0'));
    gradient.addColorStop(1, glowColor + '00');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(flower.x, flower.y, glowRadius, 0, Math.PI * 2);
    ctx.fill();

    drawHexagon(ctx, flower.x, flower.y, 8, centerColor, '#FFFFFF40', 1.5);

    if (flower.hp < flower.maxHp) {
      const hpRatio = flower.hp / flower.maxHp;
      ctx.strokeStyle = '#E74C3C';
      ctx.lineWidth = 2;
      const cracks = 3;
      for (let i = 0; i < cracks; i++) {
        const angle = (i / cracks) * Math.PI * 2 + flower.crackAnim;
        const len = 6 * (1 - hpRatio);
        ctx.beginPath();
        ctx.moveTo(flower.x, flower.y);
        ctx.lineTo(flower.x + Math.cos(angle) * len, flower.y + Math.sin(angle) * len);
        ctx.stroke();
      }
    }
  }

  reset() {
    this.flowerIdCounter = 0;
    this.generate();
  }
}
