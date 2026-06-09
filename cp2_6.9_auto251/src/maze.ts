import * as THREE from 'three';

export const WALL_COLORS = [
  '#FF6B6B',
  '#FFD93D',
  '#6BCB77',
  '#4D96FF',
  '#9B59B6'
];

export const WALL_HEIGHT = 1.5;
export const WALL_THICKNESS = 0.15;
export const CELL_SIZE = 1.0;

export interface MazeCell {
  x: number;
  z: number;
  walls: { top: boolean; right: boolean; bottom: boolean; left: boolean };
  visited: boolean;
}

export interface WallData {
  mesh: THREE.Mesh;
  originalColor: THREE.Color;
  currentColor: THREE.Color;
  targetColor: THREE.Color;
  isHorizontal: boolean;
  cellX: number;
  cellZ: number;
  position: THREE.Vector3;
  baseOpacity: number;
  currentOpacity: number;
  targetOpacity: number;
  isToggled: boolean;
  toggleTimer: number;
}

export class MazeGenerator {
  public size: number;
  public cells: MazeCell[][] = [];
  public walls: WallData[] = [];
  public wallsGroup: THREE.Group;
  private scene: THREE.Scene;
  public startPos: THREE.Vector3 = new THREE.Vector3();
  public endPos: THREE.Vector3 = new THREE.Vector3();
  private toggleTimer: number = 0;

  constructor(scene: THREE.Scene, size: number = 10) {
    this.scene = scene;
    this.size = size;
    this.wallsGroup = new THREE.Group();
    this.scene.add(this.wallsGroup);
  }

  generate(): void {
    this.clear();
    this.cells = [];

    for (let x = 0; x < this.size; x++) {
      this.cells[x] = [];
      for (let z = 0; z < this.size; z++) {
        this.cells[x][z] = {
          x,
          z,
          walls: { top: true, right: true, bottom: true, left: true },
          visited: false
        };
      }
    }

    this.recursiveBacktrack(0, 0);

    this.startPos = this.cellToWorld(0, 0);
    this.endPos = this.cellToWorld(this.size - 1, this.size - 1);

    this.createWalls();
  }

  private recursiveBacktrack(x: number, z: number): void {
    this.cells[x][z].visited = true;

    const directions = this.shuffle([
      { dx: 0, dz: -1, wall: 'top', opposite: 'bottom' },
      { dx: 1, dz: 0, wall: 'right', opposite: 'left' },
      { dx: 0, dz: 1, wall: 'bottom', opposite: 'top' },
      { dx: -1, dz: 0, wall: 'left', opposite: 'right' }
    ]);

    for (const dir of directions) {
      const nx = x + dir.dx;
      const nz = z + dir.dz;

      if (nx >= 0 && nx < this.size && nz >= 0 && nz < this.size && !this.cells[nx][nz].visited) {
        this.cells[x][z].walls[dir.wall as keyof typeof this.cells[x][z].walls] = false;
        this.cells[nx][nz].walls[dir.opposite as keyof typeof this.cells[nx][nz].walls] = false;
        this.recursiveBacktrack(nx, nz);
      }
    }
  }

  private shuffle<T>(array: T[]): T[] {
    const result = [...array];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }

  private createWalls(): void {
    const offset = -(this.size * CELL_SIZE) / 2 + CELL_SIZE / 2;

    for (let x = 0; x < this.size; x++) {
      for (let z = 0; z < this.size; z++) {
        const cell = this.cells[x][z];
        const wx = offset + x * CELL_SIZE;
        const wz = offset + z * CELL_SIZE;

        if (cell.walls.top && z === 0) {
          this.addWall(wx, wz - CELL_SIZE / 2, true, x, z);
        }
        if (cell.walls.left && x === 0) {
          this.addWall(wx - CELL_SIZE / 2, wz, false, x, z);
        }
        if (cell.walls.right) {
          this.addWall(wx + CELL_SIZE / 2, wz, false, x, z);
        }
        if (cell.walls.bottom) {
          this.addWall(wx, wz + CELL_SIZE / 2, true, x, z);
        }
      }
    }
  }

  private addWall(x: number, z: number, isHorizontal: boolean, cellX: number, cellZ: number): void {
    const colorHex = WALL_COLORS[Math.floor(Math.random() * WALL_COLORS.length)];
    const originalColor = new THREE.Color(colorHex);
    const currentColor = originalColor.clone();
    const targetColor = originalColor.clone();

    const width = isHorizontal ? CELL_SIZE + WALL_THICKNESS : WALL_THICKNESS;
    const depth = isHorizontal ? WALL_THICKNESS : CELL_SIZE + WALL_THICKNESS;

    const geometry = new THREE.BoxGeometry(width, WALL_HEIGHT, depth);
    const material = new THREE.MeshStandardMaterial({
      color: currentColor,
      transparent: true,
      opacity: 0.6,
      side: THREE.DoubleSide,
      roughness: 0.3,
      metalness: 0.2
    });

    const mesh = new THREE.Mesh(geometry, material);
    mesh.position.set(x, WALL_HEIGHT / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;

    this.wallsGroup.add(mesh);

    this.walls.push({
      mesh,
      originalColor,
      currentColor,
      targetColor,
      isHorizontal,
      cellX,
      cellZ,
      position: mesh.position.clone(),
      baseOpacity: 0.6,
      currentOpacity: 0.6,
      targetOpacity: 0.6,
      isToggled: false,
      toggleTimer: 0
    });
  }

  cellToWorld(cx: number, cz: number): THREE.Vector3 {
    const offset = -(this.size * CELL_SIZE) / 2 + CELL_SIZE / 2;
    return new THREE.Vector3(offset + cx * CELL_SIZE, 0.3, offset + cz * CELL_SIZE);
  }

  worldToCell(wx: number, wz: number): { x: number; z: number } {
    const offset = -(this.size * CELL_SIZE) / 2 + CELL_SIZE / 2;
    return {
      x: Math.round((wx - offset) / CELL_SIZE),
      z: Math.round((wz - offset) / CELL_SIZE)
    };
  }

  updateWallColors(playerPos: THREE.Vector3): void {
    const highlightColor = new THREE.Color('#FFE066');

    for (const wall of this.walls) {
      const dist = wall.position.distanceTo(playerPos);

      if (dist < 1) {
        const t = dist;
        wall.targetColor.copy(highlightColor).lerp(wall.originalColor, t);
      } else if (dist < 2) {
        const t = (dist - 1);
        const lightColor = wall.originalColor.clone().offsetHSL(0, 0, 0.15);
        wall.targetColor.copy(lightColor).lerp(wall.originalColor, t);
      } else {
        wall.targetColor.copy(wall.originalColor);
      }

      wall.currentColor.lerp(wall.targetColor, 1 / 60);
      (wall.mesh.material as THREE.MeshStandardMaterial).color.copy(wall.currentColor);
    }
  }

  updateToggles(delta: number): void {
    this.toggleTimer += delta;

    for (const wall of this.walls) {
      if (wall.isToggled) {
        wall.toggleTimer -= delta;
        if (wall.toggleTimer <= 0) {
          wall.isToggled = false;
          wall.targetOpacity = wall.baseOpacity;
        }
      }

      wall.currentOpacity += (wall.targetOpacity - wall.currentOpacity) * (1 / 30);
      (wall.mesh.material as THREE.MeshStandardMaterial).opacity = wall.currentOpacity;
      wall.mesh.visible = wall.currentOpacity > 0.01;
    }

    if (this.toggleTimer >= 30) {
      this.toggleTimer = 0;
      this.toggleRandomWall();
    }
  }

  private toggleRandomWall(): void {
    const candidates = this.walls.filter(w => !w.isToggled);
    if (candidates.length === 0) return;

    const wall = candidates[Math.floor(Math.random() * candidates.length)];
    wall.isToggled = true;
    wall.toggleTimer = 5;
    wall.targetOpacity = wall.baseOpacity > 0.3 ? 0 : wall.baseOpacity;
  }

  checkCollision(position: THREE.Vector3, radius: number): boolean {
    for (const wall of this.walls) {
      if (wall.currentOpacity < 0.1) continue;

      const dx = Math.abs(position.x - wall.position.x);
      const dz = Math.abs(position.z - wall.position.z);

      const halfW = (wall.isHorizontal ? CELL_SIZE + WALL_THICKNESS : WALL_THICKNESS) / 2;
      const halfD = (wall.isHorizontal ? WALL_THICKNESS : CELL_SIZE + WALL_THICKNESS) / 2;

      if (dx < halfW + radius && dz < halfD + radius) {
        return true;
      }
    }
    return false;
  }

  fadeTransition(progress: number, isFadeOut: boolean): void {
    const opacity = isFadeOut ? 0.6 * (1 - progress) : 0.6 * progress;
    for (const wall of this.walls) {
      (wall.mesh.material as THREE.MeshStandardMaterial).opacity = opacity;
    }
  }

  clear(): void {
    for (const wall of this.walls) {
      wall.mesh.geometry.dispose();
      (wall.mesh.material as THREE.Material).dispose();
      this.wallsGroup.remove(wall.mesh);
    }
    this.walls = [];
    this.cells = [];
  }

  dispose(): void {
    this.clear();
    this.scene.remove(this.wallsGroup);
  }
}

export function hslLerp(colorA: THREE.Color, colorB: THREE.Color, t: number): THREE.Color {
  const hslA = { h: 0, s: 0, l: 0 };
  const hslB = { h: 0, s: 0, l: 0 };
  colorA.getHSL(hslA);
  colorB.getHSL(hslB);

  const h = hslA.h + (hslB.h - hslA.h) * t;
  const s = hslA.s + (hslB.s - hslA.s) * t;
  const l = hslA.l + (hslB.l - hslA.l) * t;

  return new THREE.Color().setHSL(h, s, l);
}
