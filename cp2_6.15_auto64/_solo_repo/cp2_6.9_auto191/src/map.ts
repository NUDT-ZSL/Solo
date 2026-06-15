export const TILE_SIZE = 20;
export const MAP_COLS = 30;
export const MAP_ROWS = 20;

const W = 1;
const F = 0;

export const mapData: number[][] = [
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
  [W,F,F,F,F,F,W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
  [W,F,W,W,F,F,W,F,W,W,W,W,F,W,W,W,W,W,W,W,W,F,W,W,W,W,W,F,F,W],
  [W,F,W,F,F,F,F,F,F,F,F,W,F,F,F,F,F,F,F,F,W,F,F,F,F,F,W,F,F,W],
  [W,F,W,F,W,W,W,W,W,W,F,W,F,W,W,W,F,W,W,F,W,W,W,W,W,F,W,F,F,W],
  [W,F,F,F,W,F,F,F,F,W,F,F,F,W,F,F,F,W,F,F,F,F,F,F,W,F,F,F,F,W],
  [W,W,W,F,W,F,W,W,F,W,W,W,W,W,F,W,F,W,F,W,W,W,W,F,W,W,W,W,F,W],
  [W,F,F,F,F,F,W,F,F,F,F,F,F,F,F,W,F,W,F,W,F,F,F,F,F,F,F,W,F,W],
  [W,F,W,W,W,W,W,F,W,W,W,W,W,W,F,W,F,W,F,W,F,W,W,W,W,W,F,W,F,W],
  [W,F,W,F,F,F,F,F,W,F,F,F,F,F,F,F,F,F,F,W,F,W,F,F,F,F,F,F,F,W],
  [W,F,W,F,W,W,W,W,W,F,W,W,W,W,W,W,W,W,F,W,F,W,F,W,W,W,W,W,W,W],
  [W,F,F,F,W,F,F,F,F,F,W,F,F,F,F,F,F,W,F,F,F,W,F,F,F,F,F,F,F,W],
  [W,W,W,F,W,F,W,W,W,W,W,F,W,W,W,W,F,W,W,W,W,W,W,W,W,W,W,F,F,W],
  [W,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,F,W,F,W],
  [W,F,W,W,W,W,W,W,W,F,W,W,W,W,F,W,W,W,W,W,W,W,W,F,W,W,F,W,F,W],
  [W,F,W,F,F,F,F,F,W,F,F,F,F,W,F,F,F,F,F,F,F,F,W,F,F,W,F,W,F,W],
  [W,F,W,F,W,W,W,F,W,W,W,W,F,W,F,W,W,W,W,W,W,F,W,F,W,W,F,W,F,W],
  [W,F,F,F,W,F,F,F,F,F,F,F,F,F,F,W,F,F,F,F,F,F,F,F,F,F,F,F,F,W],
  [W,F,W,W,W,F,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,F,W],
  [W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W,W],
];

export function drawMap(ctx: CanvasRenderingContext2D): void {
  for (let y = 0; y < MAP_ROWS; y++) {
    for (let x = 0; x < MAP_COLS; x++) {
      const tile = mapData[y][x];
      ctx.fillStyle = tile === W ? '#4A4A4A' : '#B0B0B0';
      ctx.fillRect(x * TILE_SIZE, y * TILE_SIZE, TILE_SIZE, TILE_SIZE);
    }
  }
}

export function isWall(gridX: number, gridY: number): boolean {
  if (gridX < 0 || gridX >= MAP_COLS || gridY < 0 || gridY >= MAP_ROWS) {
    return true;
  }
  return mapData[gridY][gridX] === W;
}

export function isWallPixel(px: number, py: number, padding: number = 0): boolean {
  const corners = [
    [px + padding, py + padding],
    [px + TILE_SIZE - 1 - padding, py + padding],
    [px + padding, py + TILE_SIZE - 1 - padding],
    [px + TILE_SIZE - 1 - padding, py + TILE_SIZE - 1 - padding],
  ];
  for (const [cx, cy] of corners) {
    const gx = Math.floor(cx / TILE_SIZE);
    const gy = Math.floor(cy / TILE_SIZE);
    if (isWall(gx, gy)) return true;
  }
  return false;
}
