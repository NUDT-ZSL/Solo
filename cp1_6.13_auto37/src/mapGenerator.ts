import { HexCoord, HexCell, Owner } from './types';

const HEX_SIZE = 40;
const GRID_RADIUS = 3;

export function generateHexGrid(): HexCell[] {
  const cells: HexCell[] = [];
  
  for (let q = -GRID_RADIUS; q <= GRID_RADIUS; q++) {
    const r1 = Math.max(-GRID_RADIUS, -q - GRID_RADIUS);
    const r2 = Math.min(GRID_RADIUS, -q + GRID_RADIUS);
    for (let r = r1; r <= r2; r++) {
      const coord: HexCoord = { q, r };
      const owner = getInitialOwner(coord);
      
      cells.push({
        coord,
        owner,
        tower: null,
        isHighlighted: false,
        isPlaceable: false,
        animation: null,
      });
    }
  }
  
  return cells;
}

function getInitialOwner(coord: HexCoord): Owner {
  const player1Positions: HexCoord[] = [
    { q: -3, r: 0 },
    { q: 0, r: -3 },
    { q: 3, r: -3 },
  ];
  
  const player2Positions: HexCoord[] = [
    { q: 3, r: 0 },
    { q: 0, r: 3 },
    { q: -3, r: 3 },
  ];
  
  if (player1Positions.some(p => p.q === coord.q && p.r === coord.r)) {
    return 1;
  }
  
  if (player2Positions.some(p => p.q === coord.q && p.r === coord.r)) {
    return 2;
  }
  
  return null;
}

export function hexToPixel(coord: HexCoord, centerX: number, centerY: number): { x: number; y: number } {
  const x = HEX_SIZE * (3 / 2 * coord.q);
  const y = HEX_SIZE * (Math.sqrt(3) / 2 * coord.q + Math.sqrt(3) * coord.r);
  return { x: x + centerX, y: y + centerY };
}

export function getHexCorners(centerX: number, centerY: number, size: number): { x: number; y: number }[] {
  const corners: { x: number; y: number }[] = [];
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 6;
    corners.push({
      x: centerX + size * Math.cos(angle),
      y: centerY + size * Math.sin(angle),
    });
  }
  return corners;
}

export function getAdjacentHexes(coord: HexCoord): HexCoord[] {
  const directions: HexCoord[] = [
    { q: 1, r: 0 }, { q: 1, r: -1 }, { q: 0, r: -1 },
    { q: -1, r: 0 }, { q: -1, r: 1 }, { q: 0, r: 1 },
  ];
  return directions.map(d => ({ q: coord.q + d.q, r: coord.r + d.r }));
}

export function getHexDistance(a: HexCoord, b: HexCoord): number {
  return (Math.abs(a.q - b.q) + Math.abs(a.q + a.r - b.q - b.r) + Math.abs(a.r - b.r)) / 2;
}

export function getHexesWithinDistance(coord: HexCoord, distance: number, allCells: HexCell[]): HexCell[] {
  return allCells.filter(cell => getHexDistance(coord, cell.coord) <= distance);
}

export function findCell(cells: HexCell[], coord: HexCoord): HexCell | undefined {
  return cells.find(c => c.coord.q === coord.q && c.coord.r === coord.r);
}

export function pixelToHex(
  x: number,
  y: number,
  centerX: number,
  centerY: number
): HexCoord {
  const px = x - centerX;
  const py = y - centerY;
  
  const q = (2 / 3 * px) / HEX_SIZE;
  const r = (-1 / 3 * px + Math.sqrt(3) / 3 * py) / HEX_SIZE;
  
  return hexRound({ q, r });
}

function hexRound(coord: { q: number; r: number }): HexCoord {
  const s = -coord.q - coord.r;
  let rq = Math.round(coord.q);
  let rr = Math.round(coord.r);
  let rs = Math.round(s);
  
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

export function isValidHex(coord: HexCoord): boolean {
  return getHexDistance(coord, { q: 0, r: 0 }) <= GRID_RADIUS;
}

export { HEX_SIZE, GRID_RADIUS };
