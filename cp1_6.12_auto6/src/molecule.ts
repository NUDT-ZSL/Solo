import * as THREE from 'three';
import type { AtomData, BondData, MoleculeData } from './data';

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewDirection;
  varying vec3 vPosition;

  void main() {
    vNormal = normalize(normalMatrix * normal);
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vViewDirection = normalize(-mvPosition.xyz);
    vPosition = position;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  uniform float uFresnelPower;
  uniform float uTime;

  varying vec3 vNormal;
  varying vec3 vViewDirection;
  varying vec3 vPosition;

  void main() {
    float fresnel = pow(1.0 - abs(dot(vNormal, vViewDirection)), uFresnelPower);
    vec3 glowColor = vec3(0.4, 0.7, 1.0);
    vec3 finalColor = uColor + fresnel * glowColor * 1.2;
    float alpha = 0.85 + fresnel * 0.15;
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

const sharedSphereGeometry = new THREE.SphereGeometry(1, 64, 64);
const sharedCylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 16);

const materialCache = new Map<string, THREE.ShaderMaterial>();

function createAtomMaterial(color: string): THREE.ShaderMaterial {
  const cacheKey = color;
  if (materialCache.has(cacheKey)) {
    return materialCache.get(cacheKey)!;
  }

  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uFresnelPower: { value: 2.5 },
      uTime: { value: 0 }
    },
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: true
  });

  materialCache.set(cacheKey, material);
  return material;
}

function createBondMaterial(): THREE.MeshBasicMaterial {
  return new THREE.MeshBasicMaterial({
    color: 0x00c8ff,
    transparent: true,
    opacity: 0.7
  });
}

export function createAtom(atomData: AtomData): THREE.Mesh {
  const material = createAtomMaterial(atomData.color);
  const mesh = new THREE.Mesh(sharedSphereGeometry, material.clone());
  mesh.scale.setScalar(atomData.radius);
  mesh.position.set(...atomData.position);
  mesh.userData = {
    type: 'atom',
    atomData,
    originalScale: atomData.radius
  };
  return mesh;
}

export function createBond(from: THREE.Vector3, to: THREE.Vector3): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  const midPoint = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);

  const material = createBondMaterial();
  const cylinder = new THREE.Mesh(sharedCylinderGeometry, material);
  cylinder.position.copy(midPoint);
  cylinder.quaternion.setFromUnitVectors(
    new THREE.Vector3(0, 1, 0),
    direction.clone().normalize()
  );
  cylinder.scale.set(0.08, length, 0.08);
  cylinder.userData = { type: 'bond' };
  return cylinder;
}

export function createSelectionRing(atom: THREE.Mesh): THREE.Mesh {
  const geometry = new THREE.RingGeometry(1, 1.15, 64);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00d4ff,
    transparent: true,
    opacity: 0.8,
    side: THREE.DoubleSide
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.position.copy(atom.position);
  ring.scale.setScalar(atom.userData.originalScale * 1.2);
  ring.userData = { type: 'selectionRing', targetAtom: atom };
  return ring;
}

export interface MoleculeGroup extends THREE.Group {
  userData: {
    type: 'molecule';
    moleculeData: MoleculeData;
    atoms: THREE.Mesh[];
    bonds: THREE.Mesh[];
  };
}

export function createMoleculeGroup(data: MoleculeData): MoleculeGroup {
  const group = new THREE.Group() as MoleculeGroup;
  const atoms: THREE.Mesh[] = [];
  const bonds: THREE.Mesh[] = [];

  data.atoms.forEach((atomData) => {
    const atom = createAtom(atomData);
    atoms.push(atom);
    group.add(atom);
  });

  data.bonds.forEach((bondData) => {
    const fromAtom = atoms[bondData.from];
    const toAtom = atoms[bondData.to];
    const bond = createBond(fromAtom.position, toAtom.position);
    bonds.push(bond);
    group.add(bond);
  });

  group.userData = {
    type: 'molecule',
    moleculeData: data,
    atoms,
    bonds
  };

  return group;
}

export function calculateCoordinationNumber(
  atoms: AtomData[],
  bonds: BondData[],
  atomIndex: number
): number {
  let count = 0;
  bonds.forEach((bond) => {
    if (bond.from === atomIndex || bond.to === atomIndex) {
      count++;
    }
  });
  return count;
}

export function getConnectedAtomIndices(
  bonds: BondData[],
  atomIndex: number
): number[] {
  const connected: number[] = [];
  bonds.forEach((bond) => {
    if (bond.from === atomIndex) {
      connected.push(bond.to);
    } else if (bond.to === atomIndex) {
      connected.push(bond.from);
    }
  });
  return connected;
}

export function calculateAngleBetweenVectors(
  posA: THREE.Vector3,
  posCenter: THREE.Vector3,
  posB: THREE.Vector3
): number {
  const vec1 = new THREE.Vector3().subVectors(posA, posCenter).normalize();
  const vec2 = new THREE.Vector3().subVectors(posB, posCenter).normalize();
  const dot = vec1.dot(vec2);
  const clampedDot = Math.max(-1, Math.min(1, dot));
  return Math.acos(clampedDot) * (180 / Math.PI);
}

export interface BondAngleInfo {
  atom1Name: string;
  atom2Name: string;
  angle: number;
}

export function calculateBondAngles(
  atoms: AtomData[],
  bonds: BondData[],
  atomIndex: number
): BondAngleInfo[] {
  const connectedIndices = getConnectedAtomIndices(bonds, atomIndex);
  const angles: BondAngleInfo[] = [];
  const centerPos = new THREE.Vector3(...atoms[atomIndex].position);

  for (let i = 0; i < connectedIndices.length; i++) {
    for (let j = i + 1; j < connectedIndices.length; j++) {
      const idx1 = connectedIndices[i];
      const idx2 = connectedIndices[j];
      const pos1 = new THREE.Vector3(...atoms[idx1].position);
      const pos2 = new THREE.Vector3(...atoms[idx2].position);
      const angle = calculateAngleBetweenVectors(pos1, centerPos, pos2);
      angles.push({
        atom1Name: atoms[idx1].name,
        atom2Name: atoms[idx2].name,
        angle: Math.round(angle * 10) / 10
      });
    }
  }

  return angles;
}

export function fadeInMolecule(
  group: MoleculeGroup,
  duration: number = 800
): Promise<void> {
  return new Promise((resolve) => {
    const startTime = performance.now();
    const allMeshes: THREE.Mesh[] = [...group.userData.atoms, ...group.userData.bonds];

    allMeshes.forEach((mesh) => {
      if (mesh.material instanceof THREE.ShaderMaterial) {
        mesh.material.uniforms.uTime.value = 0;
      }
    });

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      allMeshes.forEach((mesh) => {
        if (mesh.material instanceof THREE.ShaderMaterial) {
          mesh.material.opacity = eased;
          mesh.material.transparent = true;
        } else if (Array.isArray(mesh.material)) {
          mesh.material.forEach((mat) => {
            mat.opacity = eased * 0.7;
            mat.transparent = true;
          });
        } else {
          (mesh.material as THREE.Material).opacity = eased * 0.7;
          (mesh.material as THREE.Material).transparent = true;
        }
      });

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        resolve();
      }
    }

    requestAnimationFrame(animate);
  });
}

export function updateBondAnimation(time: number, bonds: THREE.Mesh[]): void {
  bonds.forEach((bond, index) => {
    if (bond.material instanceof THREE.MeshBasicMaterial) {
      const pulse = 0.6 + Math.sin(time * 2 + index * 0.5) * 0.1;
      bond.material.opacity = pulse;
    }
  });
}

export function updateSelectionRing(
  ring: THREE.Mesh,
  time: number,
  targetPosition: THREE.Vector3
): void {
  ring.position.copy(targetPosition);
  const pulse = 1 + Math.sin(time * 3) * 0.15;
  ring.scale.setScalar(ring.userData.targetAtom.userData.originalScale * 1.2 * pulse);
  if (ring.material instanceof THREE.MeshBasicMaterial) {
    ring.material.opacity = 0.5 + Math.sin(time * 3) * 0.3;
  }
  ring.lookAt(ring.position.x + 1, ring.position.y, ring.position.z);
}
