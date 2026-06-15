export interface Island {
  x: number;
  y: number;
  rx: number;
  ry: number;
  rotation: number;
}

let islands: Island[] = [];

function seededRandom(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) & 0xffffffff;
    return (s >>> 0) / 0xffffffff;
  };
}

export function generateIslands(width: number, height: number): Island[] {
  const rand = seededRandom(42);
  const count = Math.floor(rand() * 4) + 5;
  islands = [];

  for (let i = 0; i < count; i++) {
    let x: number, y: number;
    let attempts = 0;

    do {
      x = rand() * (width - 160) + 80;
      y = rand() * (height - 160) + 80;
      attempts++;
    } while (
      attempts < 50 &&
      isTooClose(x, y, islands, 120)
    );

    const rx = rand() * 20 + 20;
    const ry = rand() * 20 + 20;
    const rotation = rand() * Math.PI;

    islands.push({ x, y, rx, ry, rotation });
  }

  return islands;
}

function isTooClose(
  x: number,
  y: number,
  existing: Island[],
  minDist: number
): boolean {
  for (const island of existing) {
    const dx = x - island.x;
    const dy = y - island.y;
    if (Math.sqrt(dx * dx + dy * dy) < minDist) {
      return true;
    }
  }
  return false;
}

export function getIslands(): Island[] {
  return islands;
}

export function checkCollision(px: number, py: number): boolean {
  for (const island of islands) {
    const dx = px - island.x;
    const dy = py - island.y;
    const cos = Math.cos(-island.rotation);
    const sin = Math.sin(-island.rotation);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    const normDist =
      (localX * localX) / (island.rx * island.rx) +
      (localY * localY) / (island.ry * island.ry);
    if (normDist <= 1.0) {
      return true;
    }
  }
  return false;
}

export function getCollisionIsland(px: number, py: number): Island | null {
  for (const island of islands) {
    const dx = px - island.x;
    const dy = py - island.y;
    const cos = Math.cos(-island.rotation);
    const sin = Math.sin(-island.rotation);
    const localX = dx * cos - dy * sin;
    const localY = dx * sin + dy * cos;
    const normDist =
      (localX * localX) / (island.rx * island.rx) +
      (localY * localY) / (island.ry * island.ry);
    if (normDist <= 1.0) {
      return island;
    }
  }
  return null;
}

export function drawIslands(ctx: CanvasRenderingContext2D): void {
  for (const island of islands) {
    ctx.save();
    ctx.translate(island.x, island.y);
    ctx.rotate(island.rotation);

    ctx.fillStyle = '#4e342e';
    ctx.beginPath();
    ctx.ellipse(0, 0, island.rx, island.ry, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#5d4037';
    ctx.beginPath();
    ctx.ellipse(-island.rx * 0.15, -island.ry * 0.1, island.rx * 0.7, island.ry * 0.6, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = '#3e2723';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, island.rx, island.ry, 0, 0, Math.PI * 2);
    ctx.stroke();

    ctx.restore();
  }
}
