import { HexCoord, HexKey, HEX_SIZE } from '../types';

export const HEX_DIRS: HexCoord[] = [
  { q: 1, r: 0 },
  { q: 1, r: -1 },
  { q: 0, r: -1 },
  { q: -1, r: 0 },
  { q: -1, r: 1 },
  { q: 0, r: 1 },
];

export function hexKey(c: HexCoord): HexKey {
  return `${c.q},${c.r}`;
}

export function hexEquals(a: HexCoord, b: HexCoord): boolean {
  return a.q === b.q && a.r === b.r;
}

export function hexNeighbor(c: HexCoord, dir: number): HexCoord {
  const d = HEX_DIRS[dir];
  return { q: c.q + d.q, r: c.r + d.r };
}

export function hexDistance(a: HexCoord, b: HexCoord): number {
  return (
    (Math.abs(a.q - b.q) +
      Math.abs(a.q + a.r - b.q - b.r) +
      Math.abs(a.r - b.r)) /
    2;
}

export function hexToPixel(c: HexCoord, size: number = HEX_SIZE): { x: number; y: number } {
  const x = size * (3 / 2) * c.q;
  const y = size * ((Math.sqrt(3) / 2) * (c.q + 2 * c.r);
  return { x, y };
}

export function pixelToHex(
  px: number,
  py: number,
  size: number = HEX_SIZE
): HexCoord {
  const q = ((2 / 3) * px / size;
  const r = ((-1 / 3) * px + ((Math.sqrt(3)) / 3) * py / size;
  return hexRound({ q, r });
}

export function hexRound(c: HexCoord): HexCoord {
  const s = -c.q - c.r;
  let rq = Math.round(c.q);
  let rr = Math.round(c.r);
  const rs = Math.round(s);
  const qDiff = Math.abs(rq - c.q);
  const rDiff = Math.abs(rr - c.r);
  const sDiff = Math.abs(rs - s);
  if (qDiff > rDiff && qDiff > sDiff) {
    rq = -rr - rs;
  } else if (rDiff > sDiff) {
    rr = -rq - rs;
  }
  return { q: rq, r: rr };
}

export function getHexCorner(
  center: { x: number; y: number },
  i: number,
  size: number = HEX_SIZE
): { x: number; y: number } {
  const angleDeg = 60 * i - 30;
  const angleRad = (Math.PI / 180) * angleDeg;
  return {
    x: center.x + size * Math.cos(angleRad),
    y: center.y + size * Math.sin(angleRad),
  };
}

export function drawHexPath(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  size: number = HEX_SIZE
) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const corner = getHexCorner({ x: cx, y: cy }, i, size);
    if (i === 0) {
      ctx.moveTo(corner.x, corner.y);
    } else {
      ctx.lineTo(corner.x, corner.y);
    }
  }
  ctx.closePath();
}

export function rotateHexCoordBy60(c: HexCoord, times: number): HexCoord {
  let q = c.q;
  let r = c.r;
  let t = ((times % 6) + 6) % 6;
  for (let i = 0; i < t; i++) {
    const nq = -r;
    const nr = q + r;
    q = nq;
    r = nr;
  }
  return { q, r };
}

export function generateHexGrid(radius: number): HexCoord[] {
  const coords: HexCoord[] = [];
  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      if (Math.abs(q + r) <= radius) {
        coords.push({ q, r });
      }
    }
  }
  return coords;
}
