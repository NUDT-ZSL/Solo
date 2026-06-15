export interface HexCoord {
  q: number;
  r: number;
}

export type TerrainType = 'plain' | 'highland' | 'energy_pool';

export interface HexCell {
  coord: HexCoord;
  terrain: TerrainType;
  hasTower: boolean;
  towerId?: string;
  pixelX: number;
  pixelY: number;
}

export const HEX_DIRECTIONS: HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function hexKey(coord: HexCoord): string {
  return `${coord.q},${coord.r}`;
}

export function parseHexKey(key: string): HexCoord {
  const [q, r] = key.split(',').map(Number);
  return { q, r };
}

export function hexToPixel(
  q: number,
  r: number,
  hexWidth: number,
  offsetX = 0,
  offsetY = 0
): { x: number; y: number } {
  const size = hexWidth / 2;
  const x = size * (3 / 2) * q + offsetX;
  const y = size * Math.sqrt(3) * (r + q / 2) + offsetY;
  return { x, y };
}

export function pixelToHex(
  px: number,
  py: number,
  hexWidth: number,
  offsetX = 0,
  offsetY = 0
): HexCoord {
  const size = hexWidth / 2;
  const x = px - offsetX;
  const y = py - offsetY;
  const q = ((2 / 3) * x) / size;
  const r = ((-1 / 3) * x + (Math.sqrt(3) / 3) * y) / size;
  return hexRound({ q, r });
}

export function hexRound(coord: { q: number; r: number }): HexCoord {
  const s = -coord.q - coord.r;
  let rq = Math.round(coord.q);
  let rr = Math.round(coord.r);
  const rs = Math.round(s);
  const qDiff = Math.abs(rq - coord.q);
  const rDiff = Math.abs(rr - coord.r);
  const sDiff = Math.abs(rs - s);
  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }
  return { q: rq, r: rr };
}

export function getNeighbors(coord: HexCoord): HexCoord[] {
  return HEX_DIRECTIONS.map((d) => ({
    q: coord.q + d.q,
    r: coord.r + d.r,
  }));
}

export function isAdjacent(a: HexCoord, b: HexCoord): boolean {
  const dq = b.q - a.q;
  const dr = b.r - a.r;
  return HEX_DIRECTIONS.some((d) => d.q === dq && d.r === dr);
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  return (
    (Math.abs(a.q - b.q) +
      Math.abs(a.q + a.r - b.q - b.r) +
      Math.abs(a.r - b.r)) /
    2
  );
}

export function drawHex(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  hexWidth: number,
  fill: string,
  stroke: string,
  lineWidth: number
): void {
  const size = hexWidth / 2;
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i + Math.PI / 6;
    const hx = x + size * Math.cos(angle);
    const hy = y + size * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(hx, hy);
    } else {
      ctx.lineTo(hx, hy);
    }
  }
  ctx.closePath();
  if (fill) {
    ctx.fillStyle = fill;
    ctx.fill();
  }
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = lineWidth;
    ctx.stroke();
  }
}

export function isPointInHex(
  px: number,
  py: number,
  cx: number,
  cy: number,
  hexWidth: number
): boolean {
  const size = hexWidth / 2;
  const dx = Math.abs(px - cx) / size;
  const dy = Math.abs(py - cy) / size;
  return dy <= Math.sqrt(3) / 2 && dx + dy / Math.sqrt(3) <= 1;
}

function randomTerrain(): TerrainType {
  const r = Math.random();
  if (r < 0.65) return 'plain';
  if (r < 0.85) return 'highland';
  return 'energy_pool';
}

export function generateGrid(
  size: number,
  hexWidth: number,
  offsetX: number,
  offsetY: number
): HexCell[][] {
  const grid: HexCell[][] = [];
  for (let q = 0; q < size; q++) {
    grid[q] = [];
    for (let r = 0; r < size; r++) {
      const coord: HexCoord = { q, r };
      const { x, y } = hexToPixel(q, r, hexWidth, offsetX, offsetY);
      let terrain = randomTerrain();
      const isBottomCenter =
        q === Math.floor(size / 2) && r === size - 1;
      if (isBottomCenter) {
        terrain = 'plain';
      }
      grid[q][r] = {
        coord,
        terrain,
        hasTower: false,
        pixelX: x,
        pixelY: y,
      };
    }
  }
  return grid;
}

export function findCellByCoord(
  grid: HexCell[][],
  coord: HexCoord
): HexCell | null {
  if (
    coord.q >= 0 &&
    coord.q < grid.length &&
    coord.r >= 0 &&
    coord.r < (grid[0]?.length ?? 0)
  ) {
    return grid[coord.q][coord.r];
  }
  return null;
}

export function findCellByPixel(
  grid: HexCell[][],
  px: number,
  py: number,
  hexWidth: number
): HexCell | null {
  for (const row of grid) {
    for (const cell of row) {
      if (isPointInHex(px, py, cell.pixelX, cell.pixelY, hexWidth)) {
        return cell;
      }
    }
  }
  return null;
}

export function recalculateGridPixels(
  grid: HexCell[][],
  hexWidth: number,
  offsetX: number,
  offsetY: number
): void {
  for (const row of grid) {
    for (const cell of row) {
      const { x, y } = hexToPixel(
        cell.coord.q,
        cell.coord.r,
        hexWidth,
        offsetX,
        offsetY
      );
      cell.pixelX = x;
      cell.pixelY = y;
    }
  }
}

export function generateEnemyPath(
  hexWidth: number,
  gridSize: number,
  offsetX: number,
  offsetY: number
): { x: number; y: number }[] {
  const path: { x: number; y: number }[] = [];
  const size = hexWidth / 2;
  const mid = Math.floor(gridSize / 2);

  const waypoints: HexCoord[] = [
    { q: mid, r: -2 },
    { q: mid, r: 0 },
    { q: mid + 2, r: 0 },
    { q: mid + 2, r: 2 },
    { q: mid - 1, r: 3 },
    { q: mid - 1, r: 5 },
    { q: mid + 1, r: 5 },
    { q: mid + 1, r: gridSize - 1 },
    { q: mid, r: gridSize + 1 },
  ];

  for (const wp of waypoints) {
    const { x, y } = hexToPixel(wp.q, wp.r, hexWidth, offsetX, offsetY);
    path.push({ x, y });
  }

  return path;
}

export function getTerrainFillStyle(
  terrain: TerrainType,
  time: number
): string {
  switch (terrain) {
    case 'plain':
      return '#2A3355';
    case 'highland':
      return '#5C4033';
    case 'energy_pool': {
      const pulse = 0.4 + 0.15 * Math.sin((time / 1000) * Math.PI);
      return `rgba(0, 191, 255, ${pulse.toFixed(3)})`;
    }
  }
}

export function drawTerrainPattern(
  ctx: CanvasRenderingContext2D,
  cell: HexCell,
  hexWidth: number,
  time: number
): void {
  if (cell.terrain === 'highland') {
    ctx.save();
    drawHex(
      ctx,
      cell.pixelX,
      cell.pixelY,
      hexWidth * 0.92,
      '',
      'rgba(0,0,0,0)',
      0
    );
    ctx.clip();
    ctx.strokeStyle = 'rgba(255, 200, 150, 0.18)';
    ctx.lineWidth = 1.5;
    const spacing = 8;
    const size = hexWidth;
    for (let i = -size; i < size * 2; i += spacing) {
      ctx.beginPath();
      ctx.moveTo(cell.pixelX - size + i, cell.pixelY - size);
      ctx.lineTo(cell.pixelX - size / 2 + i, cell.pixelY + size);
      ctx.stroke();
    }
    ctx.restore();
  } else if (cell.terrain === 'energy_pool') {
    const pulse = 0.5 + 0.3 * Math.sin((time / 1000) * Math.PI);
    const grad = ctx.createRadialGradient(
      cell.pixelX,
      cell.pixelY,
      2,
      cell.pixelX,
      cell.pixelY,
      hexWidth * 0.4
    );
    grad.addColorStop(0, `rgba(180, 240, 255, ${0.55 * pulse})`);
    grad.addColorStop(0.6, `rgba(0, 191, 255, ${0.35 * pulse})`);
    grad.addColorStop(1, 'rgba(0, 80, 160, 0)');
    ctx.fillStyle = grad;
    drawHex(
      ctx,
      cell.pixelX,
      cell.pixelY,
      hexWidth * 0.92,
      '',
      'rgba(0,0,0,0)',
      0
    );
    ctx.fill();
  }
}
