export type TileType = 0 | 1 | 2;

export interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  r: number;
  g: number;
  b: number;
}

export interface Torch {
  tileX: number;
  tileY: number;
  lit: boolean;
  lightRadius: number;
  particles: Particle[];
}

export interface ScalePickup {
  tileX: number;
  tileY: number;
  collected: boolean;
  bobPhase: number;
}

export interface Monster {
  x: number;
  y: number;
  vx: number;
  vy: number;
  active: boolean;
  aggroRange: number;
  speed: number;
  trail: Array<{ x: number; y: number; alpha: number }>;
  hitCooldown: number;
}

export interface CaveMap {
  width: number;
  height: number;
  tiles: TileType[][];
  torches: Torch[];
  scales: ScalePickup[];
  monsters: Monster[];
  exitTileX: number;
  exitTileY: number;
  startTileX: number;
  startTileY: number;
  lavaParticles: Particle[];
  explored: boolean[][];
}

const WALL: TileType = 0;
const FLOOR: TileType = 1;
const LAVA: TileType = 2;

export const TILE = 32;

function shuffle<T>(arr: T[]): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

export function generateCave(width: number, height: number, level: number): CaveMap {
  const tiles: TileType[][] = [];
  for (let y = 0; y < height; y++) {
    tiles[y] = [];
    for (let x = 0; x < width; x++) {
      if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
        tiles[y][x] = WALL;
      } else {
        tiles[y][x] = Math.random() < 0.42 ? WALL : FLOOR;
      }
    }
  }

  for (let iter = 0; iter < 5; iter++) {
    const next: TileType[][] = [];
    for (let y = 0; y < height; y++) {
      next[y] = [];
      for (let x = 0; x < width; x++) {
        if (x === 0 || y === 0 || x === width - 1 || y === height - 1) {
          next[y][x] = WALL;
          continue;
        }
        let walls = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            if (tiles[y + dy][x + dx] === WALL) walls++;
          }
        }
        next[y][x] = walls >= 5 ? WALL : FLOOR;
      }
    }
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        tiles[y][x] = next[y][x];
      }
    }
  }

  const visited: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));
  const regions: Array<{ x: number; y: number }[]> = [];

  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      if (tiles[y][x] === FLOOR && !visited[y][x]) {
        const region: Array<{ x: number; y: number }> = [];
        const queue: Array<{ x: number; y: number }> = [{ x, y }];
        visited[y][x] = true;
        while (queue.length > 0) {
          const cell = queue.shift()!;
          region.push(cell);
          for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
            const nx = cell.x + dx;
            const ny = cell.y + dy;
            if (nx >= 0 && nx < width && ny >= 0 && ny < height && !visited[ny][nx] && tiles[ny][nx] === FLOOR) {
              visited[ny][nx] = true;
              queue.push({ x: nx, y: ny });
            }
          }
        }
        regions.push(region);
      }
    }
  }

  regions.sort((a, b) => b.length - a.length);
  const mainSet = new Set<string>();
  if (regions.length > 0) {
    for (const c of regions[0]) mainSet.add(`${c.x},${c.y}`);
  }

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (tiles[y][x] === FLOOR && !mainSet.has(`${x},${y}`)) {
        tiles[y][x] = WALL;
      }
    }
  }

  const floorList = regions[0] || [];

  const lavaTarget = Math.min(10 + level * 3, Math.floor(floorList.length * 0.1));
  let lavaPlaced = 0;
  const shuffled = shuffle([...floorList]);
  for (const t of shuffled) {
    if (lavaPlaced >= lavaTarget) break;
    if (tiles[t.y][t.x] !== FLOOR) continue;
    let nearWall = false;
    for (let dy = -1; dy <= 1; dy++) {
      for (let dx = -1; dx <= 1; dx++) {
        const nx = t.x + dx;
        const ny = t.y + dy;
        if (nx >= 0 && nx < width && ny >= 0 && ny < height && tiles[ny][nx] === WALL) nearWall = true;
      }
    }
    if (nearWall || Math.random() < 0.2) {
      tiles[t.y][t.x] = LAVA;
      lavaPlaced++;
      for (const [dx, dy] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const nx = t.x + dx;
        const ny = t.y + dy;
        if (nx > 0 && nx < width - 1 && ny > 0 && ny < height - 1 && tiles[ny][nx] === FLOOR && Math.random() < 0.35) {
          tiles[ny][nx] = LAVA;
          lavaPlaced++;
        }
      }
    }
  }

  const availFloor = floorList.filter(t => tiles[t.y][t.x] === FLOOR);
  if (availFloor.length === 0) {
    return generateCave(width, height, level);
  }

  const cx = Math.floor(width / 2);
  const cy = Math.floor(height / 2);
  let startTileX = availFloor[0].x;
  let startTileY = availFloor[0].y;
  let bestDist = Infinity;
  for (const t of availFloor) {
    const d = Math.abs(t.x - cx) + Math.abs(t.y - cy);
    if (d < bestDist) {
      bestDist = d;
      startTileX = t.x;
      startTileY = t.y;
    }
  }

  let exitTileX = startTileX;
  let exitTileY = startTileY;
  let maxDist = 0;
  for (const t of availFloor) {
    const d = Math.abs(t.x - startTileX) + Math.abs(t.y - startTileY);
    if (d > maxDist) {
      maxDist = d;
      exitTileX = t.x;
      exitTileY = t.y;
    }
  }

  const used = new Set<string>();
  used.add(`${startTileX},${startTileY}`);
  used.add(`${exitTileX},${exitTileY}`);

  const torchCount = 8 + level * 2;
  const torches: Torch[] = [];
  const shuffledFloor = shuffle([...availFloor]);
  for (const t of shuffledFloor) {
    if (torches.length >= torchCount) break;
    const key = `${t.x},${t.y}`;
    if (used.has(key)) continue;
    used.add(key);
    torches.push({
      tileX: t.x,
      tileY: t.y,
      lit: false,
      lightRadius: 4 + Math.random() * 2,
      particles: [],
    });
  }

  const scaleCount = 5 + level * 2;
  const scales: ScalePickup[] = [];
  for (const t of shuffledFloor) {
    if (scales.length >= scaleCount) break;
    const key = `${t.x},${t.y}`;
    if (used.has(key)) continue;
    used.add(key);
    scales.push({
      tileX: t.x,
      tileY: t.y,
      collected: false,
      bobPhase: Math.random() * Math.PI * 2,
    });
  }

  const monsterCount = 3 + level * 2;
  const monsters: Monster[] = [];
  for (const t of shuffledFloor) {
    if (monsters.length >= monsterCount) break;
    const key = `${t.x},${t.y}`;
    const d = Math.abs(t.x - startTileX) + Math.abs(t.y - startTileY);
    if (used.has(key) || d < 6) continue;
    used.add(key);
    monsters.push({
      x: t.x * TILE + TILE / 2,
      y: t.y * TILE + TILE / 2,
      vx: 0,
      vy: 0,
      active: true,
      aggroRange: 6 * TILE,
      speed: 1.2 + level * 0.25,
      trail: [],
      hitCooldown: 0,
    });
  }

  const explored: boolean[][] = Array.from({ length: height }, () => Array(width).fill(false));

  return {
    width,
    height,
    tiles,
    torches,
    scales,
    monsters,
    exitTileX,
    exitTileY,
    startTileX,
    startTileY,
    lavaParticles: [],
    explored,
  };
}

export function updateMonsters(cave: CaveMap, px: number, py: number, dt: number) {
  for (const m of cave.monsters) {
    if (!m.active) continue;
    m.hitCooldown = Math.max(0, m.hitCooldown - dt);

    const dx = px - m.x;
    const dy = py - m.y;
    const dist = Math.sqrt(dx * dx + dy * dy);

    if (dist < m.aggroRange && dist > 0) {
      m.vx += (dx / dist) * m.speed * dt * 60 * 0.1;
      m.vy += (dy / dist) * m.speed * dt * 60 * 0.1;
    } else if (Math.random() < 0.02) {
      const a = Math.random() * Math.PI * 2;
      m.vx = Math.cos(a) * m.speed * 0.4;
      m.vy = Math.sin(a) * m.speed * 0.4;
    }

    const spd = Math.sqrt(m.vx * m.vx + m.vy * m.vy);
    if (spd > m.speed) {
      m.vx = (m.vx / spd) * m.speed;
      m.vy = (m.vy / spd) * m.speed;
    }

    const nx = m.x + m.vx * dt * 60;
    const ny = m.y + m.vy * dt * 60;
    const tx = Math.floor(nx / TILE);
    const ty = Math.floor(ny / TILE);
    if (tx >= 0 && tx < cave.width && ty >= 0 && ty < cave.height && cave.tiles[ty][tx] !== WALL) {
      m.x = nx;
      m.y = ny;
    } else {
      m.vx *= -0.5;
      m.vy *= -0.5;
    }

    m.trail.push({ x: m.x, y: m.y, alpha: 1 });
    if (m.trail.length > 10) m.trail.shift();
    for (const t of m.trail) t.alpha *= 0.88;
  }
}

export function updateParticles(particles: Particle[], dt: number) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt * 60;
    p.y += p.vy * dt * 60;
    p.life -= dt * 2;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

export function spawnTorchParticles(torch: Torch, dt: number) {
  if (!torch.lit) return;
  const count = Math.ceil(dt * 60 * 8);
  for (let i = 0; i < count; i++) {
    if (Math.random() > 0.4) continue;
    torch.particles.push({
      x: torch.tileX * TILE + TILE / 2 + (Math.random() - 0.5) * 6,
      y: torch.tileY * TILE + 6,
      vx: (Math.random() - 0.5) * 0.4,
      vy: -0.8 - Math.random() * 1.2,
      life: 0.8 + Math.random() * 0.4,
      maxLife: 1.2,
      size: 2 + Math.random() * 3,
      r: 255,
      g: Math.floor(100 + Math.random() * 80),
      b: 0,
    });
  }
  updateParticles(torch.particles, dt);
}

export function spawnLavaParticles(cave: CaveMap, dt: number) {
  const count = Math.ceil(dt * 60 * 3);
  for (let i = 0; i < count; i++) {
    if (Math.random() > 0.15) continue;
    const x = Math.floor(Math.random() * cave.width);
    const y = Math.floor(Math.random() * cave.height);
    if (cave.tiles[y][x] === LAVA) {
      cave.lavaParticles.push({
        x: x * TILE + Math.random() * TILE,
        y: y * TILE + Math.random() * TILE,
        vx: (Math.random() - 0.5) * 0.3,
        vy: -0.4 - Math.random() * 0.8,
        life: 0.6 + Math.random() * 0.4,
        maxLife: 1,
        size: 1 + Math.random() * 2,
        r: 255,
        g: Math.floor(60 + Math.random() * 60),
        b: 0,
      });
    }
  }
  updateParticles(cave.lavaParticles, dt);
}

export function isTileVisible(cave: CaveMap, tileX: number, tileY: number, px: number, py: number, dragonLightRadius: number): boolean {
  const dx = tileX * TILE + TILE / 2 - px;
  const dy = tileY * TILE + TILE / 2 - py;
  const dist = Math.sqrt(dx * dx + dy * dy);
  const tileDist = dist / TILE;

  if (tileDist < dragonLightRadius) return true;

  for (const torch of cave.torches) {
    if (!torch.lit) continue;
    const tdx = tileX - torch.tileX;
    const tdy = tileY - torch.tileY;
    if (Math.sqrt(tdx * tdx + tdy * tdy) < torch.lightRadius) return true;
  }

  return false;
}

export function revealExplored(cave: CaveMap, px: number, py: number, dragonLightRadius: number) {
  const radius = Math.ceil(dragonLightRadius) + 1;
  const tileX = Math.floor(px / TILE);
  const tileY = Math.floor(py / TILE);

  for (let dy = -radius; dy <= radius; dy++) {
    for (let dx = -radius; dx <= radius; dx++) {
      const nx = tileX + dx;
      const ny = tileY + dy;
      if (nx >= 0 && nx < cave.width && ny >= 0 && ny < cave.height) {
        if (isTileVisible(cave, nx, ny, px, py, dragonLightRadius)) {
          cave.explored[ny][nx] = true;
        }
      }
    }
  }
}
