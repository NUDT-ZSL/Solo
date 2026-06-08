import * as THREE from 'three';

export type Face = 'U' | 'D' | 'F' | 'B' | 'L' | 'R';
export type Direction = 'cw' | 'ccw';

export interface RotationStep {
  face: Face;
  direction: Direction;
  double?: boolean;
}

export interface Cubie {
  mesh: THREE.Group;
  position: [number, number, number];
}

const FACE_COLORS: Record<Face, number> = {
  U: 0xffffff,
  D: 0xffd700,
  F: 0x32cd32,
  B: 0x1e90ff,
  L: 0xff8c00,
  R: 0xff4444,
};

const CUBIE_SIZE = 1;
const GAP = 0.05;

export class Cube3D {
  public group: THREE.Group;
  public cubies: Cubie[] = [];
  private cubieGeo: THREE.BoxGeometry;
  private faceMaterials: Record<Face, THREE.MeshStandardMaterial>;
  private innerMaterial: THREE.MeshStandardMaterial;

  constructor() {
    this.group = new THREE.Group();
    this.cubieGeo = new THREE.BoxGeometry(CUBIE_SIZE - GAP, CUBIE_SIZE - GAP, CUBIE_SIZE - GAP);
    this.faceMaterials = {
      U: new THREE.MeshStandardMaterial({ color: FACE_COLORS.U, roughness: 0.5, metalness: 0.1 }),
      D: new THREE.MeshStandardMaterial({ color: FACE_COLORS.D, roughness: 0.5, metalness: 0.1 }),
      F: new THREE.MeshStandardMaterial({ color: FACE_COLORS.F, roughness: 0.5, metalness: 0.1 }),
      B: new THREE.MeshStandardMaterial({ color: FACE_COLORS.B, roughness: 0.5, metalness: 0.1 }),
      L: new THREE.MeshStandardMaterial({ color: FACE_COLORS.L, roughness: 0.5, metalness: 0.1 }),
      R: new THREE.MeshStandardMaterial({ color: FACE_COLORS.R, roughness: 0.5, metalness: 0.1 }),
    };
    this.innerMaterial = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    this.buildCubies();
  }

  private buildCubies() {
    for (let x = -1; x <= 1; x++) {
      for (let y = -1; y <= 1; y++) {
        for (let z = -1; z <= 1; z++) {
          const cubieGroup = new THREE.Group();
          const materials: THREE.MeshStandardMaterial[] = [
            x === 1 ? this.faceMaterials.R : this.innerMaterial,
            x === -1 ? this.faceMaterials.L : this.innerMaterial,
            y === 1 ? this.faceMaterials.U : this.innerMaterial,
            y === -1 ? this.faceMaterials.D : this.innerMaterial,
            z === 1 ? this.faceMaterials.F : this.innerMaterial,
            z === -1 ? this.faceMaterials.B : this.innerMaterial,
          ];
          const mesh = new THREE.Mesh(this.cubieGeo, materials);
          mesh.castShadow = true;
          mesh.receiveShadow = true;

          const blackEdgeGeo = new THREE.BoxGeometry(CUBIE_SIZE - GAP + 0.02, CUBIE_SIZE - GAP + 0.02, CUBIE_SIZE - GAP + 0.02);
          const blackEdgeMat = new THREE.MeshBasicMaterial({ color: 0x000000, side: THREE.BackSide });
          const blackEdge = new THREE.Mesh(blackEdgeGeo, blackEdgeMat);
          cubieGroup.add(blackEdge);
          cubieGroup.add(mesh);

          cubieGroup.position.set(x, y, z);
          this.group.add(cubieGroup);
          this.cubies.push({ mesh: cubieGroup, position: [x, y, z] });
        }
      }
    }
  }

  public getLayerCubies(face: Face): Cubie[] {
    switch (face) {
      case 'U': return this.cubies.filter(c => Math.round(c.mesh.position.y) === 1);
      case 'D': return this.cubies.filter(c => Math.round(c.mesh.position.y) === -1);
      case 'R': return this.cubies.filter(c => Math.round(c.mesh.position.x) === 1);
      case 'L': return this.cubies.filter(c => Math.round(c.mesh.position.x) === -1);
      case 'F': return this.cubies.filter(c => Math.round(c.mesh.position.z) === 1);
      case 'B': return this.cubies.filter(c => Math.round(c.mesh.position.z) === -1);
    }
  }

  public getAxisForFace(face: Face): 'x' | 'y' | 'z' {
    if (face === 'U' || face === 'D') return 'y';
    if (face === 'L' || face === 'R') return 'x';
    return 'z';
  }

  public getAngleForStep(step: RotationStep): number {
    const base = step.double ? Math.PI : Math.PI / 2;
    const dir = step.direction === 'cw' ? 1 : -1;
    let sign = 1;
    if (step.face === 'D' || step.face === 'L' || step.face === 'B') sign = -1;
    return base * dir * sign;
  }

  public snapCubiePositions() {
    for (const cubie of this.cubies) {
      cubie.mesh.position.set(
        Math.round(cubie.mesh.position.x),
        Math.round(cubie.mesh.position.y),
        Math.round(cubie.mesh.position.z)
      );
      cubie.mesh.rotation.set(
        Math.round(cubie.mesh.rotation.x / (Math.PI / 2)) * (Math.PI / 2),
        Math.round(cubie.mesh.rotation.y / (Math.PI / 2)) * (Math.PI / 2),
        Math.round(cubie.mesh.rotation.z / (Math.PI / 2)) * (Math.PI / 2)
      );
    }
  }

  public generateShuffleSteps(count: number = 20): RotationStep[] {
    const faces: Face[] = ['U', 'D', 'F', 'B', 'L', 'R'];
    const dirs: Direction[] = ['cw', 'ccw'];
    const steps: RotationStep[] = [];
    let lastFace: Face | null = null;
    for (let i = 0; i < count; i++) {
      let face: Face;
      do {
        face = faces[Math.floor(Math.random() * faces.length)];
      } while (face === lastFace);
      lastFace = face;
      const direction = dirs[Math.floor(Math.random() * dirs.length)];
      steps.push({ face, direction });
    }
    return steps;
  }

  public invertStep(step: RotationStep): RotationStep {
    return {
      face: step.face,
      direction: step.direction === 'cw' ? 'ccw' : 'cw',
      double: step.double,
    };
  }

  public generateSolveSteps(shuffleSteps: RotationStep[]): RotationStep[] {
    return [...shuffleSteps].reverse().map(s => this.invertStep(s));
  }

  public static stepToFormula(step: RotationStep): string {
    let s = step.face;
    if (step.double) s += '2';
    else if (step.direction === 'ccw') s += "'";
    return s;
  }

  public static stepsToFormula(steps: RotationStep[]): string {
    return steps.map(s => Cube3D.stepToFormula(s)).join(' ');
  }

  public dispose() {
    this.cubieGeo.dispose();
    Object.values(this.faceMaterials).forEach(m => m.dispose());
    this.innerMaterial.dispose();
  }
}
