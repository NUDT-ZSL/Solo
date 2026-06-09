import * as THREE from 'three';

export interface Residue {
  index: number;
  code: string;
  name: string;
  type: 'hydrophobic' | 'hydrophilic' | 'charged' | 'special';
  typeLabel: string;
  position: THREE.Vector3;
  sphere: THREE.Mesh;
  glowMesh: THREE.Mesh;
}

export interface ProteinStructure {
  group: THREE.Group;
  residues: Residue[];
  bonds: THREE.Mesh[];
}

const AMINO_ACID_INFO: Record<string, { name: string; type: Residue['type']; typeLabel: string }> = {
  A: { name: 'ALA', type: 'hydrophobic', typeLabel: '疏水' },
  L: { name: 'LEU', type: 'hydrophobic', typeLabel: '疏水' },
  V: { name: 'VAL', type: 'hydrophobic', typeLabel: '疏水' },
  W: { name: 'TRP', type: 'hydrophobic', typeLabel: '疏水' },
  I: { name: 'ILE', type: 'hydrophobic', typeLabel: '疏水' },
  F: { name: 'PHE', type: 'hydrophobic', typeLabel: '疏水' },
  M: { name: 'MET', type: 'hydrophobic', typeLabel: '疏水' },
  S: { name: 'SER', type: 'hydrophilic', typeLabel: '亲水' },
  Y: { name: 'TYR', type: 'hydrophilic', typeLabel: '亲水' },
  Q: { name: 'GLN', type: 'hydrophilic', typeLabel: '亲水' },
  N: { name: 'ASN', type: 'hydrophilic', typeLabel: '亲水' },
  T: { name: 'THR', type: 'hydrophilic', typeLabel: '亲水' },
  K: { name: 'LYS', type: 'charged', typeLabel: '带正电' },
  R: { name: 'ARG', type: 'charged', typeLabel: '带正电' },
  H: { name: 'HIS', type: 'charged', typeLabel: '带正电' },
  D: { name: 'ASP', type: 'charged', typeLabel: '带负电' },
  E: { name: 'GLU', type: 'charged', typeLabel: '带负电' },
  P: { name: 'PRO', type: 'special', typeLabel: '特殊' },
  C: { name: 'CYS', type: 'special', typeLabel: '特殊' },
  G: { name: 'GLY', type: 'special', typeLabel: '特殊' },
};

const TYPE_COLORS: Record<Residue['type'], number> = {
  hydrophobic: 0xFF6B35,
  hydrophilic: 0x4ECDC4,
  charged: 0xFFE66D,
  special: 0x95E1D3,
};

const PARTICLE_COLORS: Record<Residue['type'], number> = {
  hydrophobic: 0x8B0000,
  hydrophilic: 0x00BFFF,
  charged: 0xFFD700,
  special: 0x95E1D3,
};

const AMINO_SEQUENCE = 'AAAAKKKKLLLLPPPPPCCCCCSSSSSSVVVVVVVVVYYYYYWWWWWWQQQQQQNNNNN';

const SPHERE_RADIUS = 8;
const BOND_RADIUS = 1.2;
const BOND_COLOR = 0xFFFFFF;
const BOND_OPACITY = 0.3;
const HELIX_RADIUS = 12;
const HELIX_PITCH = 5.4;
const RESIDUES_PER_TURN = 3.6;
const BETA_STRAND_DISTANCE = 20;
const BETA_RESIDUE_DISTANCE = 3.8;

export function getParticleColor(type: Residue['type']): number {
  return PARTICLE_COLORS[type];
}

export function getTypeColor(type: Residue['type']): number {
  return TYPE_COLORS[type];
}

function createSphere(color: number, position: THREE.Vector3): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(SPHERE_RADIUS, 32, 32);
  const material = new THREE.MeshPhongMaterial({
    color,
    shininess: 80,
    specular: 0x222222,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  return mesh;
}

function createGlowMesh(color: number, position: THREE.Vector3): THREE.Mesh {
  const geometry = new THREE.SphereGeometry(SPHERE_RADIUS * 1.15, 32, 32);
  const material = new THREE.MeshBasicMaterial({
    color: 0x00FFFF,
    transparent: true,
    opacity: 0,
    side: THREE.BackSide,
  });
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.copy(position);
  mesh.visible = false;
  return mesh;
}

function createBond(from: THREE.Vector3, to: THREE.Vector3): THREE.Mesh {
  const direction = new THREE.Vector3().subVectors(to, from);
  const length = direction.length();
  const geometry = new THREE.CylinderGeometry(BOND_RADIUS, BOND_RADIUS, length, 12);
  const material = new THREE.MeshPhongMaterial({
    color: BOND_COLOR,
    transparent: true,
    opacity: BOND_OPACITY,
    depthWrite: false,
  });
  const mesh = new THREE.Mesh(geometry, material);
  const midpoint = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  mesh.position.copy(midpoint);
  mesh.lookAt(to);
  mesh.rotateX(Math.PI / 2);
  return mesh;
}

function generateAlphaHelix(
  startIndex: number,
  residueCount: number,
  centerOffset: THREE.Vector3,
  helixAxisAngle: number = 0
): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [];
  const risePerResidue = HELIX_PITCH / RESIDUES_PER_TURN;
  const anglePerResidue = (2 * Math.PI) / RESIDUES_PER_TURN;

  const axisX = Math.cos(helixAxisAngle);
  const axisZ = Math.sin(helixAxisAngle);

  for (let i = 0; i < residueCount; i++) {
    const angle = i * anglePerResidue;
    const xLocal = HELIX_RADIUS * Math.cos(angle);
    const yLocal = i * risePerResidue;
    const zLocal = HELIX_RADIUS * Math.sin(angle);

    const rotatedX = xLocal * axisX + zLocal * axisZ;
    const rotatedZ = -xLocal * axisZ + zLocal * axisX;

    positions.push(
      new THREE.Vector3(
        centerOffset.x + rotatedX,
        centerOffset.y + yLocal - (residueCount * risePerResidue) / 2,
        centerOffset.z + rotatedZ
      )
    );
  }
  return positions;
}

function generateBetaStrand(
  startIndex: number,
  residueCount: number,
  centerOffset: THREE.Vector3,
  waveDirection: number = 1
): THREE.Vector3[] {
  const positions: THREE.Vector3[] = [];
  const points: THREE.Vector3[] = [];
  const numPoints = residueCount * 3;

  for (let i = 0; i < numPoints; i++) {
    const t = (i / (numPoints - 1) - 0.5) * (residueCount - 1) * BETA_RESIDUE_DISTANCE;
    const wave = Math.sin(i * 0.8) * 3 * waveDirection;
    points.push(new THREE.Vector3(t, wave, 0));
  }

  const curve = new THREE.CatmullRomCurve3(points);
  const curvePoints = curve.getSpacedPoints(residueCount);

  for (let i = 0; i < residueCount; i++) {
    positions.push(
      new THREE.Vector3(
        centerOffset.x + curvePoints[i].x,
        centerOffset.y + curvePoints[i].y,
        centerOffset.z + curvePoints[i].z
      )
    );
  }
  return positions;
}

function generateLoopConnection(from: THREE.Vector3, to: THREE.Vector3, steps: number): THREE.Vector3[] {
  const midPoint = new THREE.Vector3().addVectors(from, to).multiplyScalar(0.5);
  const dist = from.distanceTo(to);
  const perpendicular = new THREE.Vector3(
    (to.y - from.y) * 0.3 + 10,
    dist * 0.2,
    (from.x - to.x) * 0.3
  );
  const controlPoint = new THREE.Vector3().addVectors(midPoint, perpendicular);

  const curve = new THREE.QuadraticBezierCurve3(from.clone(), controlPoint, to.clone());
  return curve.getPoints(steps).slice(1, -1);
}

function smoothPositionsWithSpline(positions: THREE.Vector3[]): THREE.Vector3[] {
  if (positions.length < 2) return positions;
  const curve = new THREE.CatmullRomCurve3(positions, false, 'catmullrom', 0.3);
  return curve.getSpacedPoints(positions.length);
}

export function generateProteinStructure(): ProteinStructure {
  const group = new THREE.Group();
  const residues: Residue[] = [];
  const bonds: THREE.Mesh[] = [];

  const sequence = AMINO_SEQUENCE.split('');

  const segments = [
    { start: 0, end: 11, type: 'alpha', offset: new THREE.Vector3(-50, 20, 0), angle: 0 },
    { start: 12, end: 23, type: 'beta', offset: new THREE.Vector3(-10, -10, BETA_STRAND_DISTANCE / 2), wave: 1 },
    { start: 24, end: 35, type: 'alpha', offset: new THREE.Vector3(50, 20, 0), angle: Math.PI },
    { start: 36, end: 47, type: 'beta', offset: new THREE.Vector3(-10, -10, -BETA_STRAND_DISTANCE / 2), wave: -1 },
    { start: 48, end: 59, type: 'alpha', offset: new THREE.Vector3(0, 40, 25), angle: Math.PI / 2 },
  ];

  const allPositions: THREE.Vector3[] = new Array(60);

  for (const segment of segments) {
    const count = segment.end - segment.start + 1;
    let positions: THREE.Vector3[];

    if (segment.type === 'alpha') {
      positions = generateAlphaHelix(segment.start, count, segment.offset, segment.angle || 0);
    } else {
      positions = generateBetaStrand(segment.start, count, segment.offset, segment.wave || 1);
    }
    for (let i = 0; i < count; i++) {
      allPositions[segment.start + i] = positions[i];
    }
  }

  for (let i = 0; i < segments.length - 1; i++) {
    const current = segments[i];
    const next = segments[i + 1];
    const from = allPositions[current.end];
    const to = allPositions[next.start];
    const loopPoints = generateLoopConnection(from, to, 4);
    const seg1End = current.end;
    const seg2Start = next.start;
    const gap = seg2Start - seg1End - 1;
    if (gap > 0 && loopPoints.length >= gap) {
      // No actual gap in continuous sequence, just smooth transition
    }
  }

  const finalPositions = smoothPositionsWithSpline(allPositions);

  for (let i = 0; i < finalPositions.length; i++) {
    const code = sequence[i];
    const info = AMINO_ACID_INFO[code] || { name: code, type: 'hydrophobic' as const, typeLabel: '未知' };
    const color = TYPE_COLORS[info.type];

    const sphere = createSphere(color, finalPositions[i]);
    sphere.userData.residueIndex = i;
    sphere.userData.isResidue = true;

    const glowMesh = createGlowMesh(color, finalPositions[i]);
    glowMesh.userData.isGlow = true;

    group.add(sphere);
    group.add(glowMesh);

    residues.push({
      index: i,
      code,
      name: info.name,
      type: info.type,
      typeLabel: info.typeLabel,
      position: finalPositions[i].clone(),
      sphere,
      glowMesh,
    });
  }

  for (let i = 0; i < residues.length - 1; i++) {
    const bond = createBond(residues[i].position, residues[i + 1].position);
    group.add(bond);
    bonds.push(bond);
  }
  const closeBond = createBond(residues[residues.length - 1].position, residues[0].position);
  group.add(closeBond);
  bonds.push(closeBond);

  return { group, residues, bonds };
}
