import * as THREE from 'three';

export interface CellData {
  x: number;
  z: number;
  walls: {
    north: boolean;
    south: boolean;
    east: boolean;
    west: boolean;
  };
  hasFragment: boolean;
  isExit: boolean;
  isTrap: boolean;
  visited: boolean;
}

export interface MazeData {
  size: number;
  cellSize: number;
  cells: CellData[][];
  wallHeight: number;
  fragments: { x: number; z: number }[];
  exit: { x: number; z: number } | null;
}

export const CELL_SIZE = 4;
export const WALL_HEIGHT = 3;
export const MAZE_SIZE = 5;

export class MazeGenerator {
  private size: number;
  private cellSize: number;
  private wallHeight: number;
  private scene: THREE.Scene;
  private cells: CellData[][];
  private wallMeshes: Map<string, THREE.Mesh> = new Map();
  private fragmentMeshes: THREE.Mesh[] = [];
  private exitMesh: THREE.Group | null = null;
  private groundMesh: THREE.Mesh | null = null;
  private ceilingMesh: THREE.Mesh | null = null;
  private fragments: { x: number; z: number }[] = [];
  private exit: { x: number; z: number } | null = null;
  private animatingWalls: Map<string, { mesh: THREE.Mesh; startRot: number; endRot: number; progress: number }> = new Map();
  private wallMaterial: THREE.MeshPhysicalMaterial;
  private fragmentMaterial: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, size: number = MAZE_SIZE) {
    this.scene = scene;
    this.size = size;
    this.cellSize = CELL_SIZE;
    this.wallHeight = WALL_HEIGHT;
    this.cells = [];

    this.wallMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xA0C4FF,
      metalness: 0.3,
      roughness: 0.1,
      transmission: 0.3,
      thickness: 0.5,
      transparent: true,
      opacity: 0.85,
      envMapIntensity: 1.0,
      clearcoat: 0.5,
      clearcoatRoughness: 0.2,
      side: THREE.DoubleSide
    });

    this.fragmentMaterial = new THREE.MeshStandardMaterial({
      color: 0xFFD700,
      emissive: 0xFFA500,
      emissiveIntensity: 1.5,
      metalness: 0.8,
      roughness: 0.2
    });
  }

  generate(): MazeData {
    this.cells = [];
    for (let x = 0; x < this.size; x++) {
      this.cells[x] = [];
      for (let z = 0; z < this.size; z++) {
        this.cells[x][z] = {
          x,
          z,
          walls: { north: true, south: true, east: true, west: true },
          hasFragment: false,
          isExit: false,
          isTrap: false,
          visited: false
        };
      }
    }

    this.backtrackGenerate(0, 0);
    this.placeFragmentsAndExit();
    this.createGeometry();

    return {
      size: this.size,
      cellSize: this.cellSize,
      cells: this.cells,
      wallHeight: this.wallHeight,
      fragments: [...this.fragments],
      exit: this.exit
    };
  }

  private backtrackGenerate(x: number, z: number): void {
    this.cells[x][z].visited = true;
    const directions = this.shuffleArray([
      { dx: 0, dz: -1, wall: 'north', opposite: 'south' },
      { dx: 0, dz: 1, wall: 'south', opposite: 'north' },
      { dx: 1, dz: 0, wall: 'east', opposite: 'west' },
      { dx: -1, dz: 0, wall: 'west', opposite: 'east' }
    ]);

    for (const dir of directions) {
      const nx = x + dir.dx;
      const nz = z + dir.dz;
      if (nx >= 0 && nx < this.size && nz >= 0 && nz < this.size && !this.cells[nx][nz].visited) {
        this.cells[x][z].walls[dir.wall as keyof CellData['walls']] = false;
        this.cells[nx][nz].walls[dir.opposite as keyof CellData['walls']] = false;
        this.backtrackGenerate(nx, nz);
      }
    }
  }

  private shuffleArray<T>(array: T[]): T[] {
    const arr = [...array];
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
  }

  private placeFragmentsAndExit(): void {
    this.fragments = [];
    const positions: { x: number; z: number }[] = [];

    for (let x = 0; x < this.size; x++) {
      for (let z = 0; z < this.size; z++) {
        if (x === 0 && z === 0) continue;
        positions.push({ x, z });
      }
    }

    const shuffled = this.shuffleArray(positions);

    for (let i = 0; i < 3 && i < shuffled.length; i++) {
      const pos = shuffled[i];
      this.cells[pos.x][pos.z].hasFragment = true;
      this.fragments.push(pos);
    }

    const exitPos = shuffled[shuffled.length - 1];
    if (exitPos) {
      this.cells[exitPos.x][exitPos.z].isExit = true;
      this.exit = exitPos;
    }
  }

  private createGeometry(): void {
    this.clearGeometry();
    this.createGroundAndCeiling();
    this.createAllWalls();
    this.createFragments();
    this.createExit();
  }

  private createGroundAndCeiling(): void {
    const totalSize = this.size * this.cellSize;

    const groundCanvas = document.createElement('canvas');
    groundCanvas.width = 256;
    groundCanvas.height = 256;
    const gctx = groundCanvas.getContext('2d')!;
    gctx.fillStyle = '#2D2D44';
    gctx.fillRect(0, 0, 256, 256);
    gctx.strokeStyle = '#3D3D54';
    gctx.lineWidth = 2;
    for (let i = 0; i <= 256; i += 32) {
      gctx.beginPath();
      gctx.moveTo(i, 0);
      gctx.lineTo(i, 256);
      gctx.stroke();
      gctx.beginPath();
      gctx.moveTo(0, i);
      gctx.lineTo(256, i);
      gctx.stroke();
    }
    const groundTexture = new THREE.CanvasTexture(groundCanvas);
    groundTexture.wrapS = THREE.RepeatWrapping;
    groundTexture.wrapT = THREE.RepeatWrapping;
    groundTexture.repeat.set(this.size, this.size);

    const groundMat = new THREE.MeshStandardMaterial({
      map: groundTexture,
      color: 0x2D2D44,
      roughness: 0.8,
      metalness: 0.1
    });

    const groundGeo = new THREE.PlaneGeometry(totalSize, totalSize);
    this.groundMesh = new THREE.Mesh(groundGeo, groundMat);
    this.groundMesh.rotation.x = -Math.PI / 2;
    this.groundMesh.position.set(totalSize / 2 - this.cellSize / 2, 0, totalSize / 2 - this.cellSize / 2);
    this.groundMesh.receiveShadow = true;
    this.scene.add(this.groundMesh);

    const ceilingMat = new THREE.MeshStandardMaterial({
      color: 0x1A243B,
      roughness: 0.9,
      metalness: 0.0,
      side: THREE.DoubleSide
    });
    const ceilingGeo = new THREE.PlaneGeometry(totalSize, totalSize);
    this.ceilingMesh = new THREE.Mesh(ceilingGeo, ceilingMat);
    this.ceilingMesh.rotation.x = Math.PI / 2;
    this.ceilingMesh.position.set(totalSize / 2 - this.cellSize / 2, this.wallHeight, totalSize / 2 - this.cellSize / 2);
    this.scene.add(this.ceilingMesh);
  }

  private createAllWalls(): void {
    for (let x = 0; x < this.size; x++) {
      for (let z = 0; z < this.size; z++) {
        this.createCellWalls(x, z);
      }
    }
  }

  private createCellWalls(x: number, z: number): void {
    const cell = this.cells[x][z];
    const baseX = x * this.cellSize;
    const baseZ = z * this.cellSize;

    const wallThickness = 0.15;
    const wallGeoH = new THREE.BoxGeometry(this.cellSize + wallThickness, this.wallHeight, wallThickness);
    const wallGeoV = new THREE.BoxGeometry(wallThickness, this.wallHeight, this.cellSize + wallThickness);

    if (cell.walls.north) {
      const wall = new THREE.Mesh(wallGeoH, this.wallMaterial);
      wall.position.set(baseX, this.wallHeight / 2, baseZ - this.cellSize / 2);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.scene.add(wall);
      this.wallMeshes.set(`wall_${x}_${z}_north`, wall);
    }

    if (cell.walls.south) {
      const wall = new THREE.Mesh(wallGeoH, this.wallMaterial);
      wall.position.set(baseX, this.wallHeight / 2, baseZ + this.cellSize / 2);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.scene.add(wall);
      this.wallMeshes.set(`wall_${x}_${z}_south`, wall);
    }

    if (cell.walls.east) {
      const wall = new THREE.Mesh(wallGeoV, this.wallMaterial);
      wall.position.set(baseX + this.cellSize / 2, this.wallHeight / 2, baseZ);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.scene.add(wall);
      this.wallMeshes.set(`wall_${x}_${z}_east`, wall);
    }

    if (cell.walls.west) {
      const wall = new THREE.Mesh(wallGeoV, this.wallMaterial);
      wall.position.set(baseX - this.cellSize / 2, this.wallHeight / 2, baseZ);
      wall.castShadow = true;
      wall.receiveShadow = true;
      this.scene.add(wall);
      this.wallMeshes.set(`wall_${x}_${z}_west`, wall);
    }
  }

  private createFragments(): void {
    for (const frag of this.fragments) {
      const sphereGeo = new THREE.SphereGeometry(0.3, 32, 32);
      const mesh = new THREE.Mesh(sphereGeo, this.fragmentMaterial);
      mesh.position.set(
        frag.x * this.cellSize,
        1.2,
        frag.z * this.cellSize
      );

      const light = new THREE.PointLight(0xFFD700, 1.5, 6);
      light.position.copy(mesh.position);
      this.scene.add(light);
      (mesh as any).light = light;

      this.scene.add(mesh);
      this.fragmentMeshes.push(mesh);
    }
  }

  private createExit(): void {
    if (!this.exit) return;

    this.exitMesh = new THREE.Group();

    const frameMat = new THREE.MeshStandardMaterial({
      color: 0x00FF88,
      emissive: 0x00FF88,
      emissiveIntensity: 1.0,
      transparent: true,
      opacity: 0.9
    });

    const barWidth = 0.2;
    const barHeight = 2.5;
    const barDepth = 0.2;
    const frameSize = 1.5;

    const leftBar = new THREE.Mesh(new THREE.BoxGeometry(barWidth, barHeight, barDepth), frameMat);
    leftBar.position.set(-frameSize / 2, barHeight / 2, 0);
    this.exitMesh.add(leftBar);

    const rightBar = new THREE.Mesh(new THREE.BoxGeometry(barWidth, barHeight, barDepth), frameMat);
    rightBar.position.set(frameSize / 2, barHeight / 2, 0);
    this.exitMesh.add(rightBar);

    const topBar = new THREE.Mesh(new THREE.BoxGeometry(frameSize + barWidth, barWidth, barDepth), frameMat);
    topBar.position.set(0, barHeight, 0);
    this.exitMesh.add(topBar);

    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x00FF88,
      transparent: true,
      opacity: 0.2,
      side: THREE.DoubleSide
    });
    const inner = new THREE.Mesh(new THREE.PlaneGeometry(frameSize - barWidth, barHeight - barWidth), innerMat);
    inner.position.set(0, (barHeight - barWidth) / 2, 0);
    this.exitMesh.add(inner);

    const exitLight = new THREE.PointLight(0x00FF88, 1.0, 8);
    exitLight.position.set(0, 1.5, 0);
    this.exitMesh.add(exitLight);

    (this.exitMesh as any).baseEmissive = 1.0;
    (this.exitMesh as any).pulseTime = 0;

    this.exitMesh.position.set(
      this.exit.x * this.cellSize,
      0,
      this.exit.z * this.cellSize
    );
    this.scene.add(this.exitMesh);
  }

  clearGeometry(): void {
    for (const [, mesh] of this.wallMeshes) {
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    this.wallMeshes.clear();

    for (const mesh of this.fragmentMeshes) {
      if ((mesh as any).light) {
        this.scene.remove((mesh as any).light);
      }
      this.scene.remove(mesh);
      mesh.geometry.dispose();
    }
    this.fragmentMeshes = [];

    if (this.exitMesh) {
      this.scene.remove(this.exitMesh);
      this.exitMesh.traverse((obj) => {
        if (obj instanceof THREE.Mesh) {
          obj.geometry.dispose();
        }
      });
      this.exitMesh = null;
    }

    if (this.groundMesh) {
      this.scene.remove(this.groundMesh);
      this.groundMesh.geometry.dispose();
      (this.groundMesh.material as THREE.Material).dispose();
      this.groundMesh = null;
    }
    if (this.ceilingMesh) {
      this.scene.remove(this.ceilingMesh);
      this.ceilingMesh.geometry.dispose();
      this.ceilingMesh = null;
    }

    this.animatingWalls.clear();
  }

  collectFragment(x: number, z: number): boolean {
    const idx = this.fragments.findIndex(f => f.x === x && f.z === z);
    if (idx === -1) return false;

    const meshIdx = this.fragmentMeshes.findIndex(m => {
      const gx = Math.round(m.position.x / this.cellSize);
      const gz = Math.round(m.position.z / this.cellSize);
      return gx === x && gz === z;
    });

    if (meshIdx !== -1) {
      const mesh = this.fragmentMeshes[meshIdx];
      if ((mesh as any).light) {
        this.scene.remove((mesh as any).light);
      }
      this.scene.remove(mesh);
      mesh.geometry.dispose();
      this.fragmentMeshes.splice(meshIdx, 1);
    }

    this.fragments.splice(idx, 1);
    this.cells[x][z].hasFragment = false;
    return true;
  }

  getRemainingFragments(): number {
    return this.fragments.length;
  }

  triggerReform(centerX: number, centerZ: number): void {
    const affected: { x: number; z: number }[] = [
      { x: centerX, z: centerZ },
      { x: centerX + 1, z: centerZ },
      { x: centerX - 1, z: centerZ },
      { x: centerX, z: centerZ + 1 },
      { x: centerX, z: centerZ - 1 }
    ];

    for (const pos of affected) {
      if (pos.x >= 0 && pos.x < this.size && pos.z >= 0 && pos.z < this.size) {
        this.rotateCellWalls(pos.x, pos.z);
      }
    }
  }

  private rotateCellWalls(x: number, z: number): void {
    const rotations = Math.floor(Math.random() * 4);
    if (rotations === 0) return;

    const cell = this.cells[x][z];
    for (let r = 0; r < rotations; r++) {
      const temp = cell.walls.north;
      cell.walls.north = cell.walls.west;
      cell.walls.west = cell.walls.south;
      cell.walls.south = cell.walls.east;
      cell.walls.east = temp;
    }

    this.rebuildCellWalls(x, z);
  }

  private rebuildCellWalls(x: number, z: number): void {
    const directions = ['north', 'south', 'east', 'west'];
    for (const dir of directions) {
      const key = `wall_${x}_${z}_${dir}`;
      const existing = this.wallMeshes.get(key);
      if (existing) {
        this.scene.remove(existing);
        this.wallMeshes.delete(key);
      }

      const neighbors: Record<string, { nx: number; nz: number; opp: string }> = {
        north: { nx: x, nz: z - 1, opp: 'south' },
        south: { nx: x, nz: z + 1, opp: 'north' },
        east: { nx: x + 1, nz: z, opp: 'west' },
        west: { nx: x - 1, nz: z, opp: 'east' }
      };
      const n = neighbors[dir];
      const neighborKey = `wall_${n.nx}_${n.nz}_${n.opp}`;
      const neighborWall = this.wallMeshes.get(neighborKey);
      if (neighborWall && n.nx >= 0 && n.nx < this.size && n.nz >= 0 && n.nz < this.size) {
        this.scene.remove(neighborWall);
        this.wallMeshes.delete(neighborKey);
      }
    }
    this.createCellWalls(x, z);

    const cell = this.cells[x][z];
    const neighbors: Record<string, { nx: number; nz: number; opp: string }> = {
      north: { nx: x, nz: z - 1, opp: 'south' },
      south: { nx: x, nz: z + 1, opp: 'north' },
      east: { nx: x + 1, nz: z, opp: 'west' },
      west: { nx: x - 1, nz: z, opp: 'east' }
    };
    for (const dir of directions) {
      if (!cell.walls[dir as keyof CellData['walls']]) {
        const n = neighbors[dir];
        if (n.nx >= 0 && n.nx < this.size && n.nz >= 0 && n.nz < this.size) {
          this.cells[n.nx][n.nz].walls[n.opp as keyof CellData['walls']] = false;
          const neighborKey = `wall_${n.nx}_${n.nz}_${n.opp}`;
          if (this.wallMeshes.has(neighborKey)) {
            const m = this.wallMeshes.get(neighborKey)!;
            this.scene.remove(m);
            this.wallMeshes.delete(neighborKey);
          }
        }
      }
    }
  }

  canMove(fromX: number, fromZ: number, toX: number, toZ: number): boolean {
    if (toX < 0 || toX >= this.size || toZ < 0 || toZ >= this.size) return false;

    if (toX === fromX + 1 && !this.cells[fromX][fromZ].walls.east) return true;
    if (toX === fromX - 1 && !this.cells[fromX][fromZ].walls.west) return true;
    if (toZ === fromZ + 1 && !this.cells[fromX][fromZ].walls.south) return true;
    if (toZ === fromZ - 1 && !this.cells[fromX][fromZ].walls.north) return true;

    return false;
  }

  checkWallCollision(posX: number, posZ: number, radius: number): { x: number; z: number } {
    const cellX = Math.round(posX / this.cellSize);
    const cellZ = Math.round(posZ / this.cellSize);

    const checkPositions = [
      { x: cellX, z: cellZ },
      { x: cellX + 1, z: cellZ },
      { x: cellX - 1, z: cellZ },
      { x: cellX, z: cellZ + 1 },
      { x: cellX, z: cellZ - 1 }
    ];

    let adjustedX = posX;
    let adjustedZ = posZ;

    for (const cp of checkPositions) {
      if (cp.x < 0 || cp.x >= this.size || cp.z < 0 || cp.z >= this.size) continue;
      const cell = this.cells[cp.x][cp.z];
      const cx = cp.x * this.cellSize;
      const cz = cp.z * this.cellSize;
      const halfSize = this.cellSize / 2;
      const wallT = 0.1;

      if (cell.walls.north) {
        const wallZ = cz - halfSize;
        if (Math.abs(posZ - wallZ) < radius + wallT && posX > cx - halfSize && posX < cx + halfSize) {
          adjustedZ = Math.max(adjustedZ, wallZ + radius + wallT);
        }
      }
      if (cell.walls.south) {
        const wallZ = cz + halfSize;
        if (Math.abs(posZ - wallZ) < radius + wallT && posX > cx - halfSize && posX < cx + halfSize) {
          adjustedZ = Math.min(adjustedZ, wallZ - radius - wallT);
        }
      }
      if (cell.walls.west) {
        const wallX = cx - halfSize;
        if (Math.abs(posX - wallX) < radius + wallT && posZ > cz - halfSize && posZ < cz + halfSize) {
          adjustedX = Math.max(adjustedX, wallX + radius + wallT);
        }
      }
      if (cell.walls.east) {
        const wallX = cx + halfSize;
        if (Math.abs(posX - wallX) < radius + wallT && posZ > cz - halfSize && posZ < cz + halfSize) {
          adjustedX = Math.min(adjustedX, wallX - radius - wallT);
        }
      }
    }

    return { x: adjustedX, z: adjustedZ };
  }

  update(deltaTime: number, elapsedTime: number): void {
    for (let i = this.fragmentMeshes.length - 1; i >= 0; i--) {
      const mesh = this.fragmentMeshes[i];
      mesh.rotation.y += deltaTime * 2;
      mesh.position.y = 1.2 + Math.sin(elapsedTime * 2 + i) * 0.15;
    }

    if (this.exitMesh) {
      const data = this.exitMesh as any;
      data.pulseTime += deltaTime;
      const pulse = 0.6 + 0.4 * Math.sin(data.pulseTime * Math.PI * 2);
      this.exitMesh.traverse((obj) => {
        if (obj instanceof THREE.Mesh && obj.material instanceof THREE.MeshStandardMaterial) {
          obj.material.emissiveIntensity = pulse * 1.5;
        }
      });
      this.exitMesh.rotation.y = Math.sin(elapsedTime * 0.5) * 0.1;
    }
  }

  getCells(): CellData[][] {
    return this.cells;
  }

  getSize(): number {
    return this.size;
  }

  getCellSize(): number {
    return this.cellSize;
  }

  isExitAt(x: number, z: number): boolean {
    return this.exit !== null && this.exit.x === x && this.exit.z === z;
  }

  isExitUnlocked(): boolean {
    return this.fragments.length === 0;
  }
}
