import * as THREE from 'three';

export const CUBE_SIZE = 1;
export const CUBE_GAP = 0.05;
export const STEP = CUBE_SIZE + CUBE_GAP;

export type FaceName = 'U' | 'D' | 'L' | 'R' | 'F' | 'B';

export const FACE_COLORS: Record<FaceName, number> = {
  U: 0xffffff,
  D: 0xffd500,
  L: 0xff8c00,
  R: 0xff0000,
  F: 0x00c853,
  B: 0x2962ff
};

export interface CubeFace {
  normal: THREE.Vector3;
  color: number;
}

export interface Cubie {
  mesh: THREE.Group;
  position: THREE.Vector3;
  faces: Map<string, THREE.MeshStandardMaterial>;
}

export type Axis = 'x' | 'y' | 'z';

export interface Move {
  axis: Axis;
  layer: number;
  direction: 1 | -1;
  notation: string;
}

const FACE_NORMALS: { name: FaceName; normal: THREE.Vector3 }[] = [
  { name: 'U', normal: new THREE.Vector3(0, 1, 0) },
  { name: 'D', normal: new THREE.Vector3(0, -1, 0) },
  { name: 'R', normal: new THREE.Vector3(1, 0, 0) },
  { name: 'L', normal: new THREE.Vector3(-1, 0, 0) },
  { name: 'F', normal: new THREE.Vector3(0, 0, 1) },
  { name: 'B', normal: new THREE.Vector3(0, 0, -1) }
];

function createCubieMaterials(x: number, y: number, z: number): THREE.Material[] {
  const black = new THREE.MeshStandardMaterial({ color: 0x0a0a14, roughness: 0.5, metalness: 0.1 });
  const materials: THREE.Material[] = [
    black.clone(),
    black.clone(),
    black.clone(),
    black.clone(),
    black.clone(),
    black.clone()
  ];

  for (const face of FACE_NORMALS) {
    const coord = {
      x: face.normal.x,
      y: face.normal.y,
      z: face.normal.z
    };

    const matches =
      (coord.x === 1 && x === 1) ||
      (coord.x === -1 && x === -1) ||
      (coord.y === 1 && y === 1) ||
      (coord.y === -1 && y === -1) ||
      (coord.z === 1 && z === 1) ||
      (coord.z === -1 && z === -1);

    if (matches) {
      const colorMat = new THREE.MeshStandardMaterial({
        color: FACE_COLORS[face.name],
        roughness: 0.3,
        metalness: 0.05
      });

      let materialIndex = 0;
      if (face.normal.x === 1) materialIndex = 0;
      else if (face.normal.x === -1) materialIndex = 1;
      else if (face.normal.y === 1) materialIndex = 2;
      else if (face.normal.y === -1) materialIndex = 3;
      else if (face.normal.z === 1) materialIndex = 4;
      else if (face.normal.z === -1) materialIndex = 5;

      materials[materialIndex] = colorMat;
    }
  }

  return materials;
}

export class RubiksCube {
  public group: THREE.Group;
  public cubies: Cubie[] = [];
  public rotationGroup: THREE.Group | null = null;

  constructor() {
    this.group = new THREE.Group();
    this.createCubies();
  }

  private createCubies(): void {
    const geometry = new THREE.BoxGeometry(CUBE_SIZE, CUBE_SIZE, CUBE_SIZE);
    const edgeGeo = new THREE.EdgesGeometry(geometry);

    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          if (x === 0 && y === 0 && z === 0) continue;

          const cubieGroup = new THREE.Group();
          const materials = createCubieMaterials(x, y, z);
          const box = new THREE.Mesh(geometry, materials);

          const edges = new THREE.LineSegments(
            edgeGeo,
            new THREE.LineBasicMaterial({ color: 0x0a0a14, linewidth: 2 })
          );

          cubieGroup.add(box);
          cubieGroup.add(edges);
          cubieGroup.position.set(x * STEP, y * STEP, z * STEP);

          const faceMats = new Map<string, THREE.MeshStandardMaterial>();
          (box.material as THREE.Material[]).forEach((mat, i) => {
            if ((mat as THREE.MeshStandardMaterial).color.getHex() !== 0x0a0a14) {
              const keys = ['px', 'nx', 'py', 'ny', 'pz', 'nz'];
              faceMats.set(keys[i], mat as THREE.MeshStandardMaterial);
            }
          });

          this.cubies.push({
            mesh: cubieGroup,
            position: new THREE.Vector3(x, y, z),
            faces: faceMats
          });

          this.group.add(cubieGroup);
        }
      }
    }
  }

  public getCubiesInLayer(axis: Axis, layer: number): Cubie[] {
    return this.cubies.filter(cubie => {
      const pos = this.getSnappedPosition(cubie);
      if (axis === 'x') return Math.round(pos.x) === layer;
      if (axis === 'y') return Math.round(pos.y) === layer;
      if (axis === 'z') return Math.round(pos.z) === layer;
      return false;
    });
  }

  public getSnappedPosition(cubie: Cubie): THREE.Vector3 {
    return new THREE.Vector3(
      Math.round(cubie.mesh.position.x / STEP),
      Math.round(cubie.mesh.position.y / STEP),
      Math.round(cubie.mesh.position.z / STEP)
    );
  }

  public createRotationGroup(axis: Axis, layer: number): THREE.Group {
    this.rotationGroup = new THREE.Group();
    this.group.add(this.rotationGroup);

    const layerCubies = this.getCubiesInLayer(axis, layer);
    for (const cubie of layerCubies) {
      this.group.attach(cubie.mesh);
      this.rotationGroup.attach(cubie.mesh);
    }

    return this.rotationGroup;
  }

  public finalizeRotation(axis: Axis, layer: number): void {
    if (!this.rotationGroup) return;

    const layerCubies = this.getCubiesInLayerFromGroup(axis, layer);

    for (const cubie of layerCubies) {
      this.rotationGroup.attach(cubie.mesh);
      this.group.attach(cubie.mesh);
      this.snapCubiePosition(cubie);
    }

    this.group.remove(this.rotationGroup);
    this.rotationGroup = null;
  }

  private getCubiesInLayerFromGroup(axis: Axis, layer: number): Cubie[] {
    return this.cubies.filter(cubie => {
      const worldPos = new THREE.Vector3();
      cubie.mesh.getWorldPosition(worldPos);
      const localPos = this.group.worldToLocal(worldPos.clone());

      if (axis === 'x') return Math.abs(Math.round(localPos.x / STEP) - layer) < 0.5;
      if (axis === 'y') return Math.abs(Math.round(localPos.y / STEP) - layer) < 0.5;
      if (axis === 'z') return Math.abs(Math.round(localPos.z / STEP) - layer) < 0.5;
      return false;
    });
  }

  private snapCubiePosition(cubie: Cubie): void {
    cubie.mesh.position.x = Math.round(cubie.mesh.position.x / STEP) * STEP;
    cubie.mesh.position.y = Math.round(cubie.mesh.position.y / STEP) * STEP;
    cubie.mesh.position.z = Math.round(cubie.mesh.position.z / STEP) * STEP;

    const euler = new THREE.Euler().setFromQuaternion(cubie.mesh.quaternion);
    const snap = (v: number) => Math.round(v / (Math.PI / 2)) * (Math.PI / 2);
    cubie.mesh.rotation.set(snap(euler.x), snap(euler.y), snap(euler.z));
  }

  public static parseMoveNotation(notation: string): Move | null {
    const match = notation.match(/^([UDLRFBudlrfb])(['2])?$/);
    if (!match) return null;

    const faceChar = match[1].toUpperCase();
    const modifier = match[2] || '';

    let axis: Axis;
    let layer: number;
    let direction: 1 | -1 = 1;

    switch (faceChar) {
      case 'U': axis = 'y'; layer = 1; break;
      case 'D': axis = 'y'; layer = -1; break;
      case 'R': axis = 'x'; layer = 1; break;
      case 'L': axis = 'x'; layer = -1; break;
      case 'F': axis = 'z'; layer = 1; break;
      case 'B': axis = 'z'; layer = -1; break;
      default: return null;
    }

    if (modifier === "'") direction = -1;
    if (modifier === '2') direction = 1;

    if ((faceChar === 'D' || faceChar === 'L' || faceChar === 'B') && modifier === '') {
      direction = -1;
    } else if ((faceChar === 'D' || faceChar === 'L' || faceChar === 'B') && modifier === "'") {
      direction = 1;
    }

    return { axis, layer, direction, notation };
  }

  public static invertMove(move: Move): Move {
    if (move.notation.includes('2')) return move;
    const base = move.notation.replace("'", '');
    return {
      ...move,
      direction: (move.direction * -1) as 1 | -1,
      notation: move.notation.includes("'") ? base : base + "'"
    };
  }

  public static generateScrambleMoves(count: number = 20): Move[] {
    const faces = ['U', 'D', 'L', 'R', 'F', 'B'];
    const modifiers = ['', "'", '2'];
    const moves: Move[] = [];
    let lastFace = '';

    for (let i = 0; i < count; i++) {
      let face: string;
      do {
        face = faces[Math.floor(Math.random() * faces.length)];
      } while (face === lastFace);

      lastFace = face;
      const modifier = modifiers[Math.floor(Math.random() * modifiers.length)];
      const notation = face + modifier;
      const move = this.parseMoveNotation(notation);
      if (move) moves.push(move);
    }

    return moves;
  }

  public static generateSolveMoves(scrambleMoves: Move[]): Move[] {
    return [...scrambleMoves].reverse().map(m => this.invertMove(m));
  }

  public highlightCubie(cubie: Cubie): void {
    cubie.mesh.traverse((child) => {
      if (child instanceof THREE.LineSegments) {
        (child.material as THREE.LineBasicMaterial).color.set(0xff4444);
      }
    });
  }

  public unhighlightCubie(cubie: Cubie): void {
    cubie.mesh.traverse((child) => {
      if (child instanceof THREE.LineSegments) {
        (child.material as THREE.LineBasicMaterial).color.set(0x0a0a14);
      }
    });
  }

  public isSolved(): boolean {
    for (const face of FACE_NORMALS) {
      let faceColor: number | null = null;
      for (const cubie of this.cubies) {
        const pos = this.getSnappedPosition(cubie);
        const onFace =
          (face.normal.x === 1 && pos.x === 1) ||
          (face.normal.x === -1 && pos.x === -1) ||
          (face.normal.y === 1 && pos.y === 1) ||
          (face.normal.y === -1 && pos.y === -1) ||
          (face.normal.z === 1 && pos.z === 1) ||
          (face.normal.z === -1 && pos.z === -1);

        if (onFace) {
          const dir = face.normal;
          const cubieWorldDir = dir.clone().applyQuaternion(cubie.mesh.quaternion).normalize();
          let matKey = '';
          if (Math.abs(cubieWorldDir.x - 1) < 0.1) matKey = 'px';
          else if (Math.abs(cubieWorldDir.x + 1) < 0.1) matKey = 'nx';
          else if (Math.abs(cubieWorldDir.y - 1) < 0.1) matKey = 'py';
          else if (Math.abs(cubieWorldDir.y + 1) < 0.1) matKey = 'ny';
          else if (Math.abs(cubieWorldDir.z - 1) < 0.1) matKey = 'pz';
          else if (Math.abs(cubieWorldDir.z + 1) < 0.1) matKey = 'nz';

          const mat = cubie.faces.get(matKey);
          if (mat) {
            const color = mat.color.getHex();
            if (faceColor === null) faceColor = color;
            else if (faceColor !== color) return false;
          }
        }
      }
    }
    return true;
  }
}
