import * as THREE from 'three';

export interface MazeCell {
  x: number;
  z: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
}

export type MazeColorScheme = 'indigo' | 'gold';

export class Maze {
  public readonly width: number;
  public readonly height: number;
  public grid: MazeCell[][];
  public group: THREE.Group;
  public cells: MazeCell[] = [];

  private wallMeshes: THREE.Mesh[] = [];
  private glowStripMeshes: THREE.Mesh[] = [];
  private wallMat: THREE.MeshPhysicalMaterial | null = null;
  private glowMatCache: Map<string, THREE.MeshBasicMaterial> = new Map();

  private colorStart = new THREE.Color(0x4A00E0);
  private colorEnd = new THREE.Color(0x8E2DE2);
  private winColorStart = new THREE.Color(0xFFD700);
  private winColorEnd = new THREE.Color(0xFF4500);
  private currentColorScheme: MazeColorScheme = 'indigo';
  private time = 0;
  private cycle = 30;

  constructor(width: number = 20, height: number = 20) {
    this.width = width;
    this.height = height;
    this.grid = [];
    this.group = new THREE.Group();
    this.generateDFS();
    this.buildMeshes();
  }

  private generateDFS(): void {
    this.grid = [];
    this.cells = [];
    for (let z = 0; z < this.height; z++) {
      const row: MazeCell[] = [];
      for (let x = 0; x < this.width; x++) {
        const cell: MazeCell = {
          x,
          z,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false
        };
        row.push(cell);
        this.cells.push(cell);
      }
      this.grid.push(row);
    }

    const stack: MazeCell[] = [];
    const start = this.grid[0][0];
    start.visited = true;
    stack.push(start);
    let visitedCount = 1;
    const total = this.width * this.height;

    while (visitedCount < total) {
      const current = stack[stack.length - 1];
      const neighbors = this.getUnvisitedNeighbors(current);

      if (neighbors.length === 0) {
        stack.pop();
      } else {
        const idx = Math.floor(Math.random() * neighbors.length);
        const next = neighbors[idx];
        this.removeWall(current, next.cell);
        next.cell.visited = true;
        stack.push(next.cell);
        visitedCount++;
      }
    }
  }

  public verifyConnectivity(): boolean {
    if (this.grid.length === 0) return false;
    const visited: boolean[][] = [];
    for (let z = 0; z < this.height; z++) {
      visited.push(new Array(this.width).fill(false));
    }

    const queue: [number, number][] = [[0, 0]];
    visited[0][0] = true;
    let count = 0;

    while (queue.length > 0) {
      const [x, z] = queue.shift()!;
      count++;
      const cell = this.grid[z][x];

      if (!cell.walls.top && z > 0 && !visited[z - 1][x]) {
        visited[z - 1][x] = true;
        queue.push([x, z - 1]);
      }
      if (!cell.walls.bottom && z < this.height - 1 && !visited[z + 1][x]) {
        visited[z + 1][x] = true;
        queue.push([x, z + 1]);
      }
      if (!cell.walls.left && x > 0 && !visited[z][x - 1]) {
        visited[z][x - 1] = true;
        queue.push([x - 1, z]);
      }
      if (!cell.walls.right && x < this.width - 1 && !visited[z][x + 1]) {
        visited[z][x + 1] = true;
        queue.push([x + 1, z]);
      }
    }

    return count === this.width * this.height;
  }

  private getUnvisitedNeighbors(cell: MazeCell): { cell: MazeCell; dir: string }[] {
    const neighbors: { cell: MazeCell; dir: string }[] = [];
    const { x, z } = cell;

    if (z > 0 && !this.grid[z - 1][x].visited) {
      neighbors.push({ cell: this.grid[z - 1][x], dir: 'top' });
    }
    if (x < this.width - 1 && !this.grid[z][x + 1].visited) {
      neighbors.push({ cell: this.grid[z][x + 1], dir: 'right' });
    }
    if (z < this.height - 1 && !this.grid[z + 1][x].visited) {
      neighbors.push({ cell: this.grid[z + 1][x], dir: 'bottom' });
    }
    if (x > 0 && !this.grid[z][x - 1].visited) {
      neighbors.push({ cell: this.grid[z][x - 1], dir: 'left' });
    }

    return neighbors;
  }

  private removeWall(a: MazeCell, b: MazeCell): void {
    const dx = b.x - a.x;
    const dz = b.z - a.z;

    if (dx === 1) {
      a.walls.right = false;
      b.walls.left = false;
    } else if (dx === -1) {
      a.walls.left = false;
      b.walls.right = false;
    } else if (dz === 1) {
      a.walls.bottom = false;
      b.walls.top = false;
    } else if (dz === -1) {
      a.walls.top = false;
      b.walls.bottom = false;
    }
  }

  private buildMeshes(): void {
    while (this.group.children.length > 0) {
      const child = this.group.children[0];
      this.group.remove(child);
    }
    this.wallMeshes = [];
    this.glowStripMeshes = [];

    const wallHeight = 2;
    const wallThickness = 0.1;
    const glowSize = 0.12;
    const offsetX = -this.width / 2;
    const offsetZ = -this.height / 2;

    this.wallMat = new THREE.MeshPhysicalMaterial({
      color: 0x221a40,
      transparent: true,
      opacity: 0.5,
      roughness: 0.85,
      metalness: 0.02,
      transmission: 0.25,
      thickness: 0.6,
      clearcoat: 0.3,
      clearcoatRoughness: 0.6,
      ior: 1.3,
      side: THREE.DoubleSide
    });

    const wallVertGeo = new THREE.BoxGeometry(1, wallHeight, wallThickness);
    const wallHorizGeo = new THREE.BoxGeometry(wallThickness, wallHeight, 1);
    const glowTopBotGeo = new THREE.BoxGeometry(1.02, glowSize, glowSize);
    const glowLeftRightGeo = new THREE.BoxGeometry(glowSize, glowSize, 1.02);

    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid[z][x];
        const cx = x + offsetX + 0.5;
        const cz = z + offsetZ + 0.5;

        if (cell.walls.top) {
          const wall = new THREE.Mesh(wallVertGeo, this.wallMat);
          wall.position.set(cx, wallHeight / 2, cz - 0.5 + wallThickness / 2);
          this.group.add(wall);
          this.wallMeshes.push(wall);

          const glowTop = new THREE.Mesh(glowTopBotGeo, this.getGlowMaterial(x, z, 0, true));
          glowTop.position.set(cx, wallHeight - glowSize / 2, cz - 0.5 + wallThickness / 2);
          this.group.add(glowTop);
          this.glowStripMeshes.push(glowTop);

          const glowBottom = new THREE.Mesh(glowTopBotGeo, this.getGlowMaterial(x, z, 1, false));
          glowBottom.position.set(cx, glowSize / 2, cz - 0.5 + wallThickness / 2);
          this.group.add(glowBottom);
          this.glowStripMeshes.push(glowBottom);
        }

        if (cell.walls.bottom) {
          const wall = new THREE.Mesh(wallVertGeo, this.wallMat);
          wall.position.set(cx, wallHeight / 2, cz + 0.5 - wallThickness / 2);
          this.group.add(wall);
          this.wallMeshes.push(wall);

          const glowTop = new THREE.Mesh(glowTopBotGeo, this.getGlowMaterial(x, z, 2, true));
          glowTop.position.set(cx, wallHeight - glowSize / 2, cz + 0.5 - wallThickness / 2);
          this.group.add(glowTop);
          this.glowStripMeshes.push(glowTop);

          const glowBottom = new THREE.Mesh(glowTopBotGeo, this.getGlowMaterial(x, z, 3, false));
          glowBottom.position.set(cx, glowSize / 2, cz + 0.5 - wallThickness / 2);
          this.group.add(glowBottom);
          this.glowStripMeshes.push(glowBottom);
        }

        if (cell.walls.left) {
          const wall = new THREE.Mesh(wallHorizGeo, this.wallMat);
          wall.position.set(cx - 0.5 + wallThickness / 2, wallHeight / 2, cz);
          this.group.add(wall);
          this.wallMeshes.push(wall);

          const glowTop = new THREE.Mesh(glowLeftRightGeo, this.getGlowMaterial(x, z, 4, true));
          glowTop.position.set(cx - 0.5 + wallThickness / 2, wallHeight - glowSize / 2, cz);
          this.group.add(glowTop);
          this.glowStripMeshes.push(glowTop);

          const glowBottom = new THREE.Mesh(glowLeftRightGeo, this.getGlowMaterial(x, z, 5, false));
          glowBottom.position.set(cx - 0.5 + wallThickness / 2, glowSize / 2, cz);
          this.group.add(glowBottom);
          this.glowStripMeshes.push(glowBottom);
        }

        if (cell.walls.right) {
          const wall = new THREE.Mesh(wallHorizGeo, this.wallMat);
          wall.position.set(cx + 0.5 - wallThickness / 2, wallHeight / 2, cz);
          this.group.add(wall);
          this.wallMeshes.push(wall);

          const glowTop = new THREE.Mesh(glowLeftRightGeo, this.getGlowMaterial(x, z, 6, true));
          glowTop.position.set(cx + 0.5 - wallThickness / 2, wallHeight - glowSize / 2, cz);
          this.group.add(glowTop);
          this.glowStripMeshes.push(glowTop);

          const glowBottom = new THREE.Mesh(glowLeftRightGeo, this.getGlowMaterial(x, z, 7, false));
          glowBottom.position.set(cx + 0.5 - wallThickness / 2, glowSize / 2, cz);
          this.group.add(glowBottom);
          this.glowStripMeshes.push(glowBottom);
        }
      }
    }
  }

  private getGlowColor(t: number): THREE.Color {
    const start = this.currentColorScheme === 'indigo' ? this.colorStart : this.winColorStart;
    const end = this.currentColorScheme === 'indigo' ? this.colorEnd : this.winColorEnd;
    const clampedT = Math.max(0, Math.min(1, t));
    return start.clone().lerp(end, clampedT);
  }

  private getGradientT(x: number, z: number): number {
    const nx = x / (this.width - 1);
    const nz = z / (this.height - 1);
    const diag = (nx + nz) / 2;
    const wave = Math.sin(nx * Math.PI * 1.5) * 0.08 + Math.cos(nz * Math.PI * 1.2) * 0.06;
    return Math.max(0, Math.min(1, diag + wave));
  }

  private getGlowMaterial(x: number, z: number, seed: number, isTop: boolean): THREE.MeshBasicMaterial {
    const t = this.getGradientT(x, z);
    const color = this.getGlowColor(t);
    const key = `${this.currentColorScheme}-${t.toFixed(3)}-${isTop ? 'top' : 'bot'}`;

    let mat = this.glowMatCache.get(key);
    if (!mat) {
      mat = new THREE.MeshBasicMaterial({
        color,
        transparent: true,
        opacity: isTop ? 1.0 : 0.85
      });
      this.glowMatCache.set(key, mat);
    }
    return mat;
  }

  public update(dt: number): void {
    this.time += dt;
    const phase = (this.time % this.cycle) / this.cycle;

    for (let i = 0; i < this.glowStripMeshes.length; i++) {
      const mesh = this.glowStripMeshes[i];
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const localT = ((i / this.glowStripMeshes.length) + phase) % 1;
      mat.color.copy(this.getGlowColor(localT));
    }
  }

  public setColorScheme(scheme: MazeColorScheme): void {
    this.currentColorScheme = scheme;
    this.glowMatCache.clear();
    for (let i = 0; i < this.glowStripMeshes.length; i++) {
      const mesh = this.glowStripMeshes[i];
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const localT = (i / this.glowStripMeshes.length) % 1;
      mat.color.copy(this.getGlowColor(localT));
    }
  }

  public regenerate(): void {
    this.generateDFS();
    this.glowMatCache.clear();
    this.buildMeshes();
  }

  public getRandomEmptyPositions(count: number): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const indices: number[] = [];
    for (let i = 0; i < this.width * this.height; i++) {
      indices.push(i);
    }

    for (let i = indices.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indices[i], indices[j]] = [indices[j], indices[i]];
    }

    const offsetX = -this.width / 2;
    const offsetZ = -this.height / 2;

    for (const idx of indices) {
      if (positions.length >= count) break;
      const x = idx % this.width;
      const z = Math.floor(idx / this.width);
      if (x === 0 && z === 0) continue;
      positions.push(new THREE.Vector3(
        x + offsetX + 0.5,
        0.8,
        z + offsetZ + 0.5
      ));
    }

    return positions;
  }

  public isWall(worldX: number, worldZ: number, radius: number = 0.3): boolean {
    const offsetX = -this.width / 2;
    const offsetZ = -this.height / 2;

    const gx = Math.floor(worldX - offsetX);
    const gz = Math.floor(worldZ - offsetZ);

    if (gx < 0 || gx >= this.width || gz < 0 || gz >= this.height) {
      return true;
    }

    const cell = this.grid[gz][gx];
    const cx = gx + offsetX + 0.5;
    const cz = gz + offsetZ + 0.5;

    const halfCell = 0.5;
    const wallThick = 0.05;

    if (cell.walls.top) {
      const wallZ = cz - halfCell + wallThick / 2;
      if (worldZ - radius < wallZ + wallThick / 2 && worldZ + radius > wallZ - wallThick / 2) {
        if (Math.abs(worldX - cx) < halfCell) {
          return true;
        }
      }
    }
    if (cell.walls.bottom) {
      const wallZ = cz + halfCell - wallThick / 2;
      if (worldZ - radius < wallZ + wallThick / 2 && worldZ + radius > wallZ - wallThick / 2) {
        if (Math.abs(worldX - cx) < halfCell) {
          return true;
        }
      }
    }
    if (cell.walls.left) {
      const wallX = cx - halfCell + wallThick / 2;
      if (worldX - radius < wallX + wallThick / 2 && worldX + radius > wallX - wallThick / 2) {
        if (Math.abs(worldZ - cz) < halfCell) {
          return true;
        }
      }
    }
    if (cell.walls.right) {
      const wallX = cx + halfCell - wallThick / 2;
      if (worldX - radius < wallX + wallThick / 2 && worldX + radius > wallX - wallThick / 2) {
        if (Math.abs(worldZ - cz) < halfCell) {
          return true;
        }
      }
    }

    return false;
  }

  public getCellCenter(gx: number, gz: number): THREE.Vector3 {
    const offsetX = -this.width / 2;
    const offsetZ = -this.height / 2;
    return new THREE.Vector3(
      gx + offsetX + 0.5,
      0,
      gz + offsetZ + 0.5
    );
  }

  public getStartPosition(): THREE.Vector3 {
    return this.getCellCenter(0, 0);
  }

  public getCenter(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, 0);
  }
}
