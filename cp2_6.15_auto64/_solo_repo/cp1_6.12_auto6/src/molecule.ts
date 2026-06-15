import * as THREE from 'three';
import type { AtomData, BondData, MoleculeData } from './data';

const vertexShader = `
  varying vec3 vNormal;
  varying vec3 vViewDirection;
  varying vec3 vWorldPosition;

  void main() {
    vec4 mvPosition = modelViewMatrix * vec4(position, 1.0);
    vNormal = normalize(normalMatrix * normal);
    vViewDirection = normalize(-mvPosition.xyz);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPos.xyz;
    gl_Position = projectionMatrix * mvPosition;
  }
`;

const fragmentShader = `
  uniform vec3 uColor;
  uniform float uFresnelPower;
  uniform float uTime;
  uniform float uOpacity;

  varying vec3 vNormal;
  varying vec3 vViewDirection;
  varying vec3 vWorldPosition;

  void main() {
    vec3 normal = normalize(vNormal);
    vec3 viewDir = normalize(vViewDirection);
    float fresnel = pow(1.0 - max(dot(normal, viewDir), 0.0), uFresnelPower);
    vec3 glowColor = vec3(0.3, 0.6, 1.0);
    vec3 baseColor = uColor * (1.0 - fresnel * 0.3);
    vec3 rimGlow = glowColor * fresnel * 2.5;
    vec3 finalColor = baseColor + rimGlow;
    float alpha = uOpacity * (0.7 + fresnel * 0.3);
    gl_FragColor = vec4(finalColor, alpha);
  }
`;

const sharedSphereGeometry = new THREE.SphereGeometry(1, 64, 64);
const sharedCylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 16);

const materialCache = new Map<string, THREE.ShaderMaterial>();

function createAtomMaterial(color: string): THREE.ShaderMaterial {
  const material = new THREE.ShaderMaterial({
    vertexShader,
    fragmentShader,
    uniforms: {
      uColor: { value: new THREE.Color(color) },
      uFresnelPower: { value: 3.0 },
      uTime: { value: 0 },
      uOpacity: { value: 1.0 }
    },
    transparent: true,
    side: THREE.FrontSide,
    depthWrite: false,
    depthTest: true,
    blending: THREE.AdditiveBlending
  });

  return material;
}

function createBondMaterial(): THREE.MeshPhongMaterial {
  return new THREE.MeshPhongMaterial({
    color: 0x0088aa,
    emissive: 0x00c8ff,
    emissiveIntensity: 1.2,
    transparent: true,
    opacity: 0.5,
    depthWrite: false,
    side: THREE.DoubleSide
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
  const geometry = new THREE.RingGeometry(1, 1.2, 64);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00d4ff,
    transparent: true,
    opacity: 0.0,
    side: THREE.DoubleSide,
    depthWrite: false,
    blending: THREE.AdditiveBlending
  });
  const ring = new THREE.Mesh(geometry, material);
  ring.position.copy(atom.position);
  ring.scale.setScalar(atom.userData.originalScale * 1.0);
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
  const vec1 = new THREE.Vector3().subVectors(posA, posCenter);
  const vec2 = new THREE.Vector3().subVectors(posB, posCenter);

  const len1 = vec1.length();
  const len2 = vec2.length();

  if (len1 < 1e-6 || len2 < 1e-6) {
    return 0;
  }

  vec1.normalize();
  vec2.normalize();

  let dot = vec1.dot(vec2);
  if (Number.isNaN(dot) || !Number.isFinite(dot)) {
    return 0;
  }

  dot = Math.max(-1.0, Math.min(1.0, dot));
  const angleRad = Math.acos(dot);

  if (Number.isNaN(angleRad) || !Number.isFinite(angleRad)) {
    return 0;
  }

  return angleRad * (180 / Math.PI);
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
  if (atomIndex < 0 || atomIndex >= atoms.length) {
    return [];
  }

  const connectedIndices = getConnectedAtomIndices(bonds, atomIndex);
  const angles: BondAngleInfo[] = [];
  const centerAtom = atoms[atomIndex];

  if (!centerAtom || !centerAtom.position) {
    return [];
  }

  const centerPos = new THREE.Vector3(
    Number.isFinite(centerAtom.position[0]) ? centerAtom.position[0] : 0,
    Number.isFinite(centerAtom.position[1]) ? centerAtom.position[1] : 0,
    Number.isFinite(centerAtom.position[2]) ? centerAtom.position[2] : 0
  );

  const validPositions: Array<{ idx: number; pos: THREE.Vector3; name: string }> = [];

  for (const idx of connectedIndices) {
    if (idx < 0 || idx >= atoms.length) continue;
    const atom = atoms[idx];
    if (!atom || !atom.position) continue;

    const pos = new THREE.Vector3(
      Number.isFinite(atom.position[0]) ? atom.position[0] : 0,
      Number.isFinite(atom.position[1]) ? atom.position[1] : 0,
      Number.isFinite(atom.position[2]) ? atom.position[2] : 0
    );

    const dist = pos.distanceTo(centerPos);
    if (dist < 1e-6) continue;

    validPositions.push({ idx, pos, name: atom.name });
  }

  for (let i = 0; i < validPositions.length; i++) {
    for (let j = i + 1; j < validPositions.length; j++) {
      const a = validPositions[i];
      const b = validPositions[j];
      const angle = calculateAngleBetweenVectors(a.pos, centerPos, b.pos);

      if (!Number.isFinite(angle) || angle < 0) continue;

      angles.push({
        atom1Name: a.name,
        atom2Name: b.name,
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

    function animate(currentTime: number) {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);

      allMeshes.forEach((mesh) => {
        const mats = Array.isArray(mesh.material) ? mesh.material : [mesh.material];
        mats.forEach((mat) => {
          if (mat instanceof THREE.ShaderMaterial) {
            if (mat.uniforms.uOpacity) {
              mat.uniforms.uOpacity.value = eased;
            }
            mat.opacity = eased;
          } else {
            mat.opacity = eased * 0.5;
            mat.transparent = true;
          }
        });
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
    const mats = Array.isArray(bond.material) ? bond.material : [bond.material];
    mats.forEach((mat) => {
      if (mat instanceof THREE.MeshPhongMaterial) {
        const pulse = 0.4 + Math.sin(time * 2 + index * 0.5) * 0.15;
        mat.opacity = pulse;
        mat.emissiveIntensity = 1.0 + Math.sin(time * 2 + index * 0.5) * 0.3;
      } else if (mat instanceof THREE.MeshBasicMaterial) {
        const pulse = 0.6 + Math.sin(time * 2 + index * 0.5) * 0.1;
        mat.opacity = pulse;
      }
    });
  });
}

export function updateSelectionRing(
  ring: THREE.Mesh,
  time: number,
  targetPosition: THREE.Vector3
): void {
  ring.position.copy(targetPosition);
  const pulsePhase = (Math.sin(time * 3) + 1) / 2;
  const scalePulse = 1.0 + pulsePhase * 0.6;
  ring.scale.setScalar(ring.userData.targetAtom.userData.originalScale * 1.3 * scalePulse);
  if (ring.material instanceof THREE.MeshBasicMaterial) {
    ring.material.opacity = 0.1 + pulsePhase * 0.8;
  }
  ring.lookAt(ring.position.x + 1, ring.position.y, ring.position.z);
}
