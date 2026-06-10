import * as THREE from 'three';

export interface MazeCell {
  x: number;
  z: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
}

export class Maze {
  public width: number;
  public height: number;
  public grid: MazeCell[][];
  public group: THREE.Group;
  public cells: MazeCell[] = [];
  private wallMeshes: THREE.Mesh[] = [];
  private glowStrips: THREE.Mesh[] = [];
  private colorStart = new THREE.Color(0x4A00E0);
  private colorEnd = new THREE.Color(0x8E2DE2);
  private winColorStart = new THREE.Color(0xFFD700);
  private winColorEnd = new THREE.Color(0xFF4500);
  private isWinMode = false;
  private time = 0;

  constructor(width: number = 20, height: number = 20) {
    this.width = width;
    this.height = height;
    this.grid = [];
    this.group = new THREE.Group();
    this.generate();
    this.buildMeshes();
  }

  private generate(): void {
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

    while (stack.length > 0) {
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
      }
    }
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
    this.glowStrips = [];

    const wallHeight = 2;
    const wallThickness = 0.08;
    const offsetX = -this.width / 2;
    const offsetZ = -this.height / 2;

    const wallMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a1a3e,
      transparent: true,
      opacity: 0.55,
      roughness: 0.7,
      metalness: 0.1,
      transmission: 0.2,
      thickness: 0.5,
      side: THREE.DoubleSide
    });

    const topGeo = new THREE.BoxGeometry(1, wallThickness, wallThickness);
    const bottomGeo = new THREE.BoxGeometry(1, wallThickness, wallThickness);
    const leftGeo = new THREE.BoxGeometry(wallThickness, wallThickness, 1);
    const rightGeo = new THREE.BoxGeometry(wallThickness, wallThickness, 1);
    const wallVerticalGeo = new THREE.BoxGeometry(1, wallHeight, wallThickness);
    const wallHorizontalGeo = new THREE.BoxGeometry(wallThickness, wallHeight, 1);

    for (let z = 0; z < this.height; z++) {
      for (let x = 0; x < this.width; x++) {
        const cell = this.grid[z][x];
        const cx = x + offsetX + 0.5;
        const cz = z + offsetZ + 0.5;

        if (cell.walls.top) {
          const wall = new THREE.Mesh(wallVerticalGeo, wallMat);
          wall.position.set(cx, wallHeight / 2, cz - 0.5 + wallThickness / 2);
          this.group.add(wall);
          this.wallMeshes.push(wall);

          const glowTop = new THREE.Mesh(topGeo, this.createGlowMaterial(x, z, 0));
          glowTop.position.set(cx, wallHeight - wallThickness / 2, cz - 0.5 + wallThickness / 2);
          this.group.add(glowTop);
          this.glowStrips.push(glowTop);

          const glowBottom = new THREE.Mesh(bottomGeo, this.createGlowMaterial(x, z, 1));
          glowBottom.position.set(cx, wallThickness / 2, cz - 0.5 + wallThickness / 2);
          this.group.add(glowBottom);
          this.glowStrips.push(glowBottom);
        }

        if (cell.walls.bottom) {
          const wall = new THREE.Mesh(wallVerticalGeo, wallMat);
          wall.position.set(cx, wallHeight / 2, cz + 0.5 - wallThickness / 2);
          this.group.add(wall);
          this.wallMeshes.push(wall);

          const glowTop = new THREE.Mesh(topGeo, this.createGlowMaterial(x, z, 2));
          glowTop.position.set(cx, wallHeight - wallThickness / 2, cz + 0.5 - wallThickness / 2);
          this.group.add(glowTop);
          this.glowStrips.push(glowTop);

          const glowBottom = new THREE.Mesh(bottomGeo, this.createGlowMaterial(x, z, 3));
          glowBottom.position.set(cx, wallThickness / 2, cz + 0.5 - wallThickness / 2);
          this.group.add(glowBottom);
          this.glowStrips.push(glowBottom);
        }

        if (cell.walls.left) {
          const wall = new THREE.Mesh(wallHorizontalGeo, wallMat);
          wall.position.set(cx - 0.5 + wallThickness / 2, wallHeight / 2, cz);
          this.group.add(wall);
          this.wallMeshes.push(wall);

          const glowTop = new THREE.Mesh(leftGeo, this.createGlowMaterial(x, z, 4));
          glowTop.position.set(cx - 0.5 + wallThickness / 2, wallHeight - wallThickness / 2, cz);
          this.group.add(glowTop);
          this.glowStrips.push(glowTop);

          const glowBottom = new THREE.Mesh(rightGeo, this.createGlowMaterial(x, z, 5));
          glowBottom.position.set(cx - 0.5 + wallThickness / 2, wallThickness / 2, cz);
          this.group.add(glowBottom);
          this.glowStrips.push(glowBottom);
        }

        if (cell.walls.right) {
          const wall = new THREE.Mesh(wallHorizontalGeo, wallMat);
          wall.position.set(cx + 0.5 - wallThickness / 2, wallHeight / 2, cz);
          this.group.add(wall);
          this.wallMeshes.push(wall);

          const glowTop = new THREE.Mesh(leftGeo, this.createGlowMaterial(x, z, 6));
          glowTop.position.set(cx + 0.5 - wallThickness / 2, wallHeight - wallThickness / 2, cz);
          this.group.add(glowTop);
          this.glowStrips.push(glowTop);

          const glowBottom = new THREE.Mesh(rightGeo, this.createGlowMaterial(x, z, 7));
          glowBottom.position.set(cx + 0.5 - wallThickness / 2, wallThickness / 2, cz);
          this.group.add(glowBottom);
          this.glowStrips.push(glowBottom);
        }
      }
    }
  }

  private createGlowMaterial(x: number, z: number, seed: number): THREE.MeshBasicMaterial {
    const t = ((x + z * this.width + seed * 0.123) % (this.width * this.height)) / (this.width * this.height);
    const color = this.colorStart.clone().lerp(this.colorEnd, t);
    return new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0.9
    });
  }

  public update(dt: number): void {
    this.time += dt;
    const cycle = 30;
    const phase = (this.time % cycle) / cycle;
    const start = this.isWinMode ? this.winColorStart : this.colorStart;
    const end = this.isWinMode ? this.winColorEnd : this.colorEnd;

    this.glowStrips.forEach((mesh, i) => {
      const mat = mesh.material as THREE.MeshBasicMaterial;
      const localT = (i / this.glowStrips.length + phase) % 1;
      mat.color.copy(start).lerp(end, localT);
    });
  }

  public setWinMode(win: boolean): void {
    this.isWinMode = win;
  }

  public regenerate(): void {
    this.generate();
    this.buildMeshes();
  }

  public getRandomEmptyPositions(count: number): THREE.Vector3[] {
    const positions: THREE.Vector3[] = [];
    const used = new Set<string>();
    const offsetX = -this.width / 2;
    const offsetZ = -this.height / 2;

    while (positions.length < count) {
      const x = Math.floor(Math.random() * this.width);
      const z = Math.floor(Math.random() * this.height);
      const key = `${x},${z}`;
      if (!used.has(key) && !(x === 0 && z === 0)) {
        used.add(key);
        positions.push(new THREE.Vector3(
          x + offsetX + 0.5,
          0.8,
          z + offsetZ + 0.5
        ));
      }
    }
    return positions;
  }

  public isWall(worldX: number, worldZ: number, radius: number = 0.25): boolean {
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
    const half = 0.5 - radius;

    if (cell.walls.top && worldZ < cz - half + 0.04) return true;
    if (cell.walls.bottom && worldZ > cz + half - 0.04) return true;
    if (cell.walls.left && worldX < cx - half + 0.04) return true;
    if (cell.walls.right && worldX > cx + half - 0.04) return true;

    return false;
  }

  public getCenter(): THREE.Vector3 {
    return new THREE.Vector3(0, 0, 0);
  }
}
